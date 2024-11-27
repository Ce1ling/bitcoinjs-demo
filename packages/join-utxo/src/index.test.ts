import { describe, test, expect } from '@jest/globals'

import { JoinUtxo } from '.'

describe('JoinUtxo', () => {
  const utxo = new JoinUtxo({
    wif: 'cP5qpxwUrhB2pfGELF9NSfP16hUtMAithVmasdc6UeYLTMxWHteR',
    network: 'testnet',
    feeRate: 226,
    utxos: [
      {
        hash: 'c2311f03ee0313f579a4aa1af29a134febc9b1261da4375070974b1ed11878d4',
        index: 0,
        value: 6247,
      },
      {
        hash: 'c2311f03ee0313f579a4aa1af29a134febc9b1261da4375070974b1ed11878d4',
        index: 1,
        value: 6247,
      },
      {
        hash: 'c2311f03ee0313f579a4aa1af29a134febc9b1261da4375070974b1ed11878d4',
        index: 2,
        value: 6247,
      },
    ],
  })

  test('should be a p2tr address', () => {
    expect(utxo.payment.address).toBe(
      'tb1pagakxe22c92q5msgh9v7zznjjry4ylgatyuyyu9qq3mrwk804aeqvwc26h'
    )
  })

  // https://mempool.space/testnet4/tx/5b11ecf35c31a4c91ad7bae2c9e578200fc5d478a083878390015c1ad7f280a2
  test('join tx hex', () => {
    const tx = utxo.join()
    console.log('tx vSize:', tx.virtualSize())
    console.log('tx hex:', tx.toHex())
    expect(tx.toHex()).toBe('')
  })
})
