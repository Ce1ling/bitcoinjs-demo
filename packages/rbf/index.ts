import { ECPairInterface } from 'ecpair'
import { bitcoin, ECPair, toXOnly } from '../../src'

interface Options {
  network: keyof typeof bitcoin.networks
  wif: string
  toAddress: string
  sats: number
  feeRate: number
  replaceFeeRate: number
}

interface UTXO {
  txid: string
  vout: number
  value: number
}

export class RBF {
  network: Options['network']
  wif: Options['wif']
  toAddress: Options['toAddress']
  sats: Options['sats']
  feeRate: Options['feeRate']
  replaceFeeRate: Options['replaceFeeRate']

  keypair: ECPairInterface
  payment: bitcoin.Payment

  constructor(opts: Options) {
    Object.assign(this, opts)
    this.keypair = ECPair.fromWIF(this.wif, bitcoin.networks[this.network])
    this.payment = bitcoin.payments.p2tr({
      network: bitcoin.networks[this.network],
      internalPubkey: this.xPubkey,
    })
  }

  get xPubkey() {
    return toXOnly(this.keypair.publicKey)
  }

  get tweakSigner() {
    return this.keypair.tweak(
      bitcoin.crypto.taggedHash('TapTweak', this.xPubkey)
    )
  }

  private createPsbt() {
    return new bitcoin.Psbt({
      network: bitcoin.networks[this.network],
    })
  }

  sendTx(utxo: UTXO) {
    const psbt = this.createPsbt()
    psbt.setMaximumFeeRate(this.feeRate)
    psbt
      .addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          value: utxo.value,
          script: this.payment.output!,
        },
        tapInternalKey: this.xPubkey,
      })
      .addOutput({
        address: this.toAddress,
        value: this.sats,
      })
      // Change output
      .addOutput({
        address: this.payment.address!,
        value: utxo.value - this.sats - this.feeRate,
      })
    // enable RBF
    psbt.setInputSequence(0, 0xfffffffd)

    return psbt
      .signAllInputs(this.tweakSigner)
      .finalizeAllInputs()
      .extractTransaction()
  }

  replaceTx(utxo: UTXO) {
    const psbt = this.createPsbt()

    psbt.setMaximumFeeRate(this.replaceFeeRate)
    psbt
      .addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          value: utxo.value,
          script: this.payment.output!,
        },
        tapInternalKey: this.xPubkey,
      })
      .addOutput({
        address: this.toAddress,
        value: this.sats,
      })
      // Change output
      .addOutput({
        address: this.payment.address!,
        value: utxo.value - this.sats - this.replaceFeeRate,
      })
    // enable RBF
    psbt.setInputSequence(0, 0xfffffffd)

    return psbt
      .signAllInputs(this.tweakSigner)
      .finalizeAllInputs()
      .extractTransaction()
  }
}
