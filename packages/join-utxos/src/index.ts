import { bitcoin, ECPair, toXOnly, type UTXO } from 'bitcoinjs-demo'
import { ECPairInterface } from 'ecpair'

interface Options {
  wif: string
  network: keyof typeof bitcoin.networks
  feeRate: number
  utxos: UTXO[]
}

export class JoinUtxos {
  wif!: Options['wif']
  network!: Options['network']
  feeRate!: Options['feeRate']
  utxos!: Options['utxos']

  bitcoinNetwork: bitcoin.networks.Network
  keypair: ECPairInterface
  payment: bitcoin.payments.Payment
  psbt: bitcoin.Psbt

  constructor(opts: Options) {
    Object.assign(this, opts)
    this.bitcoinNetwork = bitcoin.networks[this.network]
    this.keypair = ECPair.fromWIF(this.wif, this.bitcoinNetwork)
    this.payment = bitcoin.payments.p2tr({
      internalPubkey: this.xPubkey,
      network: this.bitcoinNetwork,
    })
    this.psbt = new bitcoin.Psbt({
      network: this.bitcoinNetwork,
      maximumFeeRate: this.feeRate,
    })
  }

  get xPubkey() {
    return toXOnly(this.keypair.publicKey)
  }

  get tweakedXPubkey() {
    return this.keypair.tweak(
      bitcoin.crypto.taggedHash('TapTweak', this.xPubkey)
    )
  }

  join() {
    if (this.utxos.length <= 0) throw new Error('No utxos to join')

    const totalAmount = this.utxos.reduce((acc, utxo) => acc + utxo.value, 0)
    const outputAmount = totalAmount - this.feeRate
    if (outputAmount <= 0) {
      throw new Error('Not enough balance to pay the tx fee')
    }

    this.utxos.forEach((utxo) => {
      this.psbt.addInput({
        hash: utxo.hash,
        index: utxo.index,
        tapInternalKey: this.xPubkey,
        witnessUtxo: {
          script: this.payment.output!,
          value: utxo.value,
        },
      })
    })
    this.psbt.addOutput({
      address: this.payment.address!,
      value: outputAmount,
    })

    return this.psbt
      .signAllInputs(this.tweakedXPubkey)
      .finalizeAllInputs()
      .extractTransaction()
  }
}
