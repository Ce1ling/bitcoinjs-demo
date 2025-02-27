import { bitcoin, ECPair, toXOnly } from '@/packages/core/src'

const network = bitcoin.networks.bitcoin
const keypair = ECPair.fromWIF('xxx', network)
const xPubkey = toXOnly(keypair.publicKey)
const tweakKey = keypair.tweak(bitcoin.crypto.taggedHash('TapTweak', xPubkey))
const payment = bitcoin.payments.p2tr({
  network: network,
  internalPubkey: xPubkey,
})
const psbt = new bitcoin.Psbt({
  network: network,
})
psbt
  .addInput({
    hash: 'xxx',
    index: 0,
    tapInternalKey: xPubkey,
    witnessUtxo: {
      value: 10560,
      script: payment.output!,
    },
  })

  .addOutput({
    script: Buffer.from([bitcoin.opcodes.OP_RETURN]),
    value: 1,
  })
  .addOutput({
    address: payment.address!,
    value: 10560 - 1 - 137,
  })
const tx = psbt
  .setInputSequence(0, 0xfffffffd)
  .signAllInputs(tweakKey)
  .finalizeAllInputs()
  .extractTransaction()
  .toHex()

console.log('tx', tx)
