import { bitcoin, ECPair, toXOnly, UTXO } from '@bitcoinjs-demo/core'
import { ECPairInterface } from 'ecpair'
import { createRuneScript } from './utils/script'

interface Options {
  name: string
  amount: number
  cap: number
  symbol?: string
  premine?: number
  dicimals?: number // divibility
  startHeight?: number
  endHeight?: number
  startOffset?: number
  endOffset?: number

  pubkey: string
  network: keyof typeof bitcoin.networks
  feeRate: number
}

interface Edict {
  id: {
    block: number
    tx: number
  }
  amount: number
  output: number
}

export class Rune {
  name!: Options['name']
  amount!: Options['amount']
  cap!: Options['cap']
  symbol!: Options['symbol']
  premine!: Options['premine']
  dicimals!: Options['dicimals']
  startHeight!: Options['startHeight']
  endHeight!: Options['endHeight']
  startOffset!: Options['startOffset']
  endOffset!: Options['endOffset']

  pubkey!: Options['pubkey']
  network!: Options['network']
  feeRate!: Options['feeRate']
  bitcoinNetwork: bitcoin.Network

  psbt?: bitcoin.Psbt
  payment: bitcoin.Payment

  constructor(opts: Options) {
    Object.assign(this, opts)
    this.bitcoinNetwork = bitcoin.networks[opts.network]
    this.payment = bitcoin.payments.p2tr({
      network: this.bitcoinNetwork,
      internalPubkey: this.xPubkey,
    })
  }

  get xPubkey() {
    return toXOnly(Buffer.from(this.pubkey, 'hex'))
  }

  private createPsbt() {
    this.psbt = new bitcoin.Psbt({
      network: this.bitcoinNetwork,
      maximumFeeRate: this.feeRate,
    })
    return this.psbt
  }

  private createTransaction(utxo: UTXO) {
    const utxoDust = 546

    this.psbt
      ?.addInput({
        hash: utxo.hash,
        index: utxo.index,
        tapInternalKey: this.xPubkey,
        witnessUtxo: {
          value: utxo.value,
          script: this.payment!.output!,
        },
      })
      // rune output
      .addOutput({
        address: this.payment!.address!,
        value: utxoDust,
      })
      // rune OP_RETURN output
      .addOutput({
        script: createRuneScript(),
        value: 0,
      })
      // change output
      .addOutput({
        address: this.payment!.address!,
        value: utxo.value - utxoDust - this.feeRate,
      })
      .setInputSequence(0, 0xfffffffd)
  }

  etch(utxo: UTXO) {
    this.createPsbt()
    this.createTransaction(utxo)

    return this.psbt!
  }

  mint() {}

  transfer(opts: { edicts: Edict[]; pointer: number }) {}

  // Send the rune to `OP_RETURN` output to burn it.
  burn() {}
}
