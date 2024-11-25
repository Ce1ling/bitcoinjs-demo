import { describe, test } from '@jest/globals'
import { RBF } from '.'

describe('rbf', () => {
  const rbf = new RBF({
    network: 'testnet',
    wif: 'cP5qpxwUrhB2pfGELF9NSfP16hUtMAithVmasdc6UeYLTMxWHteR',
    toAddress: 'tb1prg62ekvek0rfnqsvl6n8rh7ec7w2f2nkqfqqtd4uutmlaqe2tlnqvaaul0',
    amount: 546,
    feeRate: 154,
    replaceFeeRate: 300 * 154,
    utxo: {
      txid: '41888bb05d3e40d31f8ed686df50cf6679af792e6cd0e76056685461802201c0',
      vout: 1,
      value: 687446,
    },
  })

  // https://mempool.space/testnet/tx/5b7b41c661dd42fdb880331a8ce0a079f8b99e9289459248dcaada5174712a9f
  test('rbf send', () => {
    const tx = rbf.sendTx()
    console.log('send tx', tx.toHex())
  })

  // https://mempool.space/testnet/tx/e829697a2852850c2e675e9e864620da4fb8d3db2e54f488b56426f3c9d204fe
  test('rbf replace', () => {
    const tx = rbf.replaceTx()
    console.log('replace tx', tx.toHex())
  })
})
