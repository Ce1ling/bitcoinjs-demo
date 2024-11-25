import {
  getDummyP2TRInput,
  toXOnly,
  type InputType,
  type Output,
  type UTXO,
} from '@sadoprotocol/ordit-sdk'
import type { Tapleaf } from 'bitcoinjs-lib/src/types'
import {
  MAXIMUM_FEE,
  MINIMUM_AMOUNT_IN_SATS,
} from '@sadoprotocol/ordit-sdk/dist/constants'
import { bitcoin } from 'bitcoinjs-demo'

import { createInscriptionScript, createRecoveryScript } from './utils/witness'
import { getVirtualSize } from './utils/fee'

interface Options {
  // 需要交互的网络
  network: keyof typeof bitcoin.networks
  // BRC20 的类型, `text/plain`, `application/json` 等
  type: string
  // BRC20 的具体内容, 比如 `JSON.stringify({ p: 'brc-20', op: 'deploy', ticker: 'BRCD' })`
  content: string
  // 使用的钱包的公钥
  fromPubkey: string
  // 需要发送到的地址
  toAddress: string
  // 发送的 sats 的数量，不能小于 600
  postage: number
  // 交易费率 sat/vB
  feeRate: number
  // 是否开启 RBF, 可选
  enableRbf?: boolean
  // 是否开启自动调整, 有 API 才可用, 可选
  autoAdjustment?: boolean
}

type UTXORequired = Pick<UTXO, 'txid' | 'n' | 'sats'>

export class BRC20 {
  network!: Options['network']
  type!: Options['type']
  content!: Options['content']
  fromPubkey!: Options['fromPubkey']
  toAddress!: Options['toAddress']
  postage!: Options['postage']
  feeRate!: Options['feeRate']
  enableRbf: Options['enableRbf']
  autoAdjustment: Options['autoAdjustment']

  payment!: bitcoin.Payment
  taprootTree: [Tapleaf, Tapleaf] | [] = []
  inscriptionScript!: Buffer
  recoveryScript!: Buffer
  redeem!: { output: Buffer; redeemVersion: number }
  fee: number = 0

  psbt!: bitcoin.Psbt
  utxo!: UTXORequired
  inputs: InputType[] = []
  outputs: Output[] = []

  inputAmount: number = 0
  outputAmount: number = 0
  changeAmount: number = 0
  networkFee: number = 0

  // 我们默认开启 RBF 功能, 关闭自动调整
  constructor({ enableRbf = true, autoAdjustment = false, ...opts }: Options) {
    // 一些语言需要一直 `this.xxx = xxx` 来初始化赋值
    // 而 JS 可以直接 `Object.assign` 来一次性全部赋值
    Object.assign(this, { ...opts, enableRbf, autoAdjustment })
  }

  // taproot 专用的公钥
  get xPubkey() {
    return toXOnly(Buffer.from(this.fromPubkey, 'hex'))
  }

  get commitAddress() {
    return this.payment.address!
  }

  get commitFee() {
    return this.networkFee + this.outputAmount
  }

  // 创建 taproot tree，包含 inscriptionScript 和 recoveryScript
  private createTaprootTree() {
    this.inscriptionScript = createInscriptionScript({
      xPubkey: this.xPubkey,
      content: this.content,
      type: this.type,
    })
    this.recoveryScript = createRecoveryScript(this.xPubkey)
    this.taprootTree = [
      { output: this.inscriptionScript },
      { output: this.recoveryScript },
    ]
    return this.taprootTree
  }

  // 创建 redeem 赎回脚本
  private createRedeemScript() {
    this.redeem = {
      // 实际上就是 inscriptionScript
      output: this.inscriptionScript,
      redeemVersion: 192,
    }
    return this.redeem
  }

  // 创建并初始化 psbt
  private createPsbt() {
    this.psbt = new bitcoin.Psbt({
      network: bitcoin.networks[this.network],
    })
    this.psbt.setMaximumFeeRate(this.feeRate)
  }

  // 添加初始输入和输出
  private initInputOutput(utxo: UTXORequired) {
    this.utxo = utxo
    // 添加初始 taproot 输入
    this.inputs = [
      {
        type: 'taproot',
        hash: utxo.txid,
        index: utxo.n,
        tapInternalKey: this.xPubkey,
        witnessUtxo: {
          script: this.payment.output!,
          value: utxo.sats,
        },
        tapLeafScript: [
          {
            leafVersion: this.payment.redeemVersion!,
            script: this.payment.redeem!.output!,
            controlBlock:
              this.payment.witness![this.payment.witness!.length - 1]!,
          },
        ],
      },
    ]
    // 添加初始输出，输出给目标地址，发送 postage 数量的 sats
    this.outputs = [
      {
        address: this.toAddress,
        value: this.postage,
      },
    ]
  }

  // 创建并计算输入金额
  private createInputAmount() {
    this.inputAmount = 0
  }

  // 创建并计算输出金额
  private createOutputAmount() {
    const amount = this.outputs.reduce((acc, { value }) => (acc += value), 0)
    // 输出 sats 不能小于最小 sats
    if (amount < MINIMUM_AMOUNT_IN_SATS) {
      throw new Error(
        `"postage" must be greater than ${MINIMUM_AMOUNT_IN_SATS}`
      )
    }
    this.outputAmount = Math.floor(amount)
    return this.outputAmount
  }

  // 创建并计算找零金额
  private createChangeAmount() {
    // 如果不调整，是不需要这个来计算找零的，其他地方会找零的
    if (!this.autoAdjustment) return
    const amount = Math.floor(
      this.inputAmount - this.outputAmount - this.networkFee
    )
    // 找零为负数肯定有问题，抛出错误
    if (amount < 0) throw new Error('Insufficient balance')
    this.changeAmount = amount

    return this.changeAmount
  }

  // 添加所有输入到 PSBT
  private addInputs() {
    this.inputs.forEach((input, i) => {
      this.psbt.addInput(input)
      // 是否开启 RBF 功能, 详情参见 https://bitcoin.heapup.tech/technical/transaction/speed#rbf
      this.psbt.setInputSequence(i, this.enableRbf ? 0xfffffffd : 0xffffffff)
    })
  }

  // 添加所有输出到 PSBT
  private addOutputs() {
    this.outputs.forEach((output) => this.psbt.addOutput(output))
    // 如果可以找零，就添加一笔找零输出
    if (this.changeAmount >= MINIMUM_AMOUNT_IN_SATS) {
      this.psbt.addOutput({
        address: this.payment.address!,
        value: this.changeAmount,
      })
    }
  }

  // 创建并计算整个 PSBT 的网络费用
  private createNetworkFee() {
    const vSize = getVirtualSize(
      this.psbt,
      this.network === 'bitcoin' ? 'mainnet' : this.network,
      this.payment.witness
    )
    const networkFee = vSize * this.feeRate
    if (networkFee > MAXIMUM_FEE) {
      throw new Error(
        `The network fee is too high, max fee is ${MAXIMUM_FEE} sats`
      )
    }
    this.networkFee = networkFee
    return this.networkFee
  }

  // 创建一笔 PSBT 交易
  private createTransaction(utxo: UTXORequired) {
    this.createPsbt()
    this.initInputOutput(utxo)

    this.createInputAmount()
    this.createOutputAmount()
    this.createChangeAmount()

    this.addInputs()
    this.addOutputs()

    this.createNetworkFee()
  }

  commit() {
    this.payment = bitcoin.payments.p2tr({
      network: bitcoin.networks[this.network],
      // taproot 专用公钥
      internalPubkey: this.xPubkey,
      // taproot tree
      scriptTree: this.createTaprootTree(),
      // redeem 脚本
      redeem: this.createRedeemScript(),
    })
    this.createTransaction(getDummyP2TRInput())

    return {
      address: this.commitAddress,
      fee: this.commitFee,
    }
  }

  reveal(utxo: UTXORequired) {
    this.createTransaction(utxo)
    return {
      hex: this.psbt.toHex(),
      base64: this.psbt.toBase64(),
      buffer: this.psbt.toBuffer(),
    }
  }
}
