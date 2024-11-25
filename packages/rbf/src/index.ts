import { bitcoin, ECPair, toXOnly } from 'bitcoinjs-demo'
import { ECPairInterface } from 'ecpair'

interface Options {
  network: keyof typeof bitcoin.networks
  // Sender wallet import format
  wif: string
  // Receiver address
  toAddress: string
  // Send amount
  amount: number
  // Initial fee rate
  feeRate: number
  // Fee rate for replacing the transaction
  replaceFeeRate: number
  // UTXO to be spent
  utxo: UTXO
}

interface UTXO {
  txid: string
  vout: number
  value: number
}

// TODO: feeRate is the rate per bytes, not the total fee for the transaction.
export class RBF {
  network!: Options['network']
  wif!: Options['wif']
  toAddress!: Options['toAddress']
  amount!: Options['amount']
  feeRate!: Options['feeRate']
  replaceFeeRate!: Options['replaceFeeRate']
  utxo!: Options['utxo']

  keypair: ECPairInterface
  payment: bitcoin.Payment

  constructor(opts: Options) {
    // TODO: Check `replaceFeeRate`, must be higher than the `feeRate`
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

  private createTransaction(feeRate: number) {
    const psbt = new bitcoin.Psbt({
      network: bitcoin.networks[this.network],
    })

    psbt.setMaximumFeeRate(feeRate)
    psbt
      .addInput({
        hash: this.utxo.txid,
        index: this.utxo.vout,
        witnessUtxo: {
          value: this.utxo.value,
          script: this.payment.output!,
        },
        tapInternalKey: this.xPubkey,
      })
      .addOutput({
        address: this.toAddress,
        value: this.amount,
      })
      // Change output
      .addOutput({
        address: this.payment.address!,
        value: this.utxo.value - this.amount - feeRate,
      })
      // Enable RBF
      .setInputSequence(0, 0xfffffffd)

    return psbt
      .signAllInputs(this.tweakSigner)
      .finalizeAllInputs()
      .extractTransaction()
  }

  sendTx() {
    return this.createTransaction(this.feeRate)
  }

  replaceTx() {
    return this.createTransaction(this.replaceFeeRate)
  }
}
