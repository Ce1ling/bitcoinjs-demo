import { describe, expect, test } from '@jest/globals'
import { RBF } from '.'

describe('RBF', () => {
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

  test('should throw an error if `replaceFeeRate` is not higher than `feeRate`', () => {
    expect(
      () =>
        new RBF({
          network: 'testnet',
          wif: '',
          toAddress: '',
          amount: 0,
          feeRate: 154,
          replaceFeeRate: 154,
          utxo: {
            txid: '',
            vout: 0,
            value: 0,
          },
        })
    ).toThrow('`replaceFeeRate` must be higher than `feeRate`')
  })

  // https://mempool.space/testnet/tx/5b7b41c661dd42fdb880331a8ce0a079f8b99e9289459248dcaada5174712a9f
  test('should be init tx hex', () => {
    const tx = rbf.initTx()
    // use unisat wallet to send, such as: `unisat.pushTx(hex)`
    console.log('init tx hex', tx.toHex())
    expect(tx.toHex()).toBe(
      '02000000000101c00122806154685660e7d06c2e79af7966cf50df86d68e1fd3403e5db08b88410100000000fdffffff0222020000000000002251201a34acd999b3c699820cfea671dfd9c79ca4aa76024005b6bce2f7fe832a5fe69a7a0a0000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf720140d763c4641e9abb0c35d6bbdd4e4f78aa8940577e04343a6f85240a56b4282c79d55fedaed130d2b7df00a48298b783b15c9ad1cb7e1e592d1440524f2a5b113e00000000'
    )
  })

  // https://mempool.space/testnet/tx/e829697a2852850c2e675e9e864620da4fb8d3db2e54f488b56426f3c9d204fe
  test('should be replace tx hex', () => {
    const tx = rbf.replaceTx()
    // use unisat wallet to send, such as: `unisat.pushTx(hex)`
    console.log('replace tx hex', tx.toHex())
    expect(tx.toHex()).toBe(
      '02000000000101c00122806154685660e7d06c2e79af7966cf50df86d68e1fd3403e5db08b88410100000000fdffffff0222020000000000002251201a34acd999b3c699820cfea671dfd9c79ca4aa76024005b6bce2f7fe832a5fe6bcc6090000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf7201404267484779ebbea42a6de5aa8f622b9738495a9cb6d85b4866dbcb97a81aa2adadf0faa09e49e8303d8b1618408919ed870e324d93dddfa885315aee2ce86bc300000000'
    )
  })
})
