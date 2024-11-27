import { bitcoin, ECPair, toXOnly, type UTXO } from 'bitcoinjs-demo'
import { ECPairInterface } from 'ecpair'

interface Options {
  wif: string
  network: keyof typeof bitcoin.networks
  utxo: UTXO
  feeRate: number
  feeUtxos?: UTXO[]
}

export class SplitUtxo {
  wif!: Options['wif']
  network!: Options['network']
  utxo!: Options['utxo']
  feeRate!: Options['feeRate']
  feeUtxos?: Options['feeUtxos']

  bitcoinNetwork: bitcoin.networks.Network
  keypair: ECPairInterface
  payment: bitcoin.payments.Payment

  constructor(opts: Options) {
    Object.assign(this, opts)
    this.bitcoinNetwork = bitcoin.networks[this.network]
    this.keypair = ECPair.fromWIF(this.wif, this.bitcoinNetwork)
    this.payment = bitcoin.payments.p2tr({
      internalPubkey: this.xPubkey,
      network: this.bitcoinNetwork,
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

  // TODO: support use `feeUtxos` to pay the tx fee.
  split(n: number) {
    const psbt = new bitcoin.Psbt({
      network: this.bitcoinNetwork,
      maximumFeeRate: this.feeRate,
    })
    // Minus the transaction fee
    const totalValue = this.utxo.value - this.feeRate

    // Check if the total value is less than the minimum value
    if (totalValue <= 0) {
      throw new Error(
        `The UTXO does not have enough balance to pay the transaction fee, Please: \n- Reduce the "feeRate"\n- Add "feeUtxos"`
      )
    }

    psbt.addInput({
      hash: this.utxo.hash,
      index: this.utxo.index,
      tapInternalKey: this.xPubkey,
      witnessUtxo: {
        value: this.utxo.value,
        script: this.payment.output!,
      },
    })
    // enable RBF
    psbt.setInputSequence(0, 0xfffffffd)

    // Split UTXO
    for (let i = 0; i < n; i++) {
      psbt.addOutput({
        address: this.payment.address!,
        value: Math.floor(totalValue / n),
      })
    }

    return psbt
      .signAllInputs(this.tweakedXPubkey)
      .finalizeAllInputs()
      .extractTransaction()
  }
}
