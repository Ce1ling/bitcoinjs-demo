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
  test('should be tx hex', () => {
    const tx = utxo.join()
    console.log('tx vSize:', tx.virtualSize())
    console.log('tx hex:', tx.toHex())
    expect(tx.toHex()).toBe(
      '02000000000103d47818d11e4b97705037a41d26b1c9eb4f139af21aaaa479f51303ee031f31c20000000000ffffffffd47818d11e4b97705037a41d26b1c9eb4f139af21aaaa479f51303ee031f31c20100000000ffffffffd47818d11e4b97705037a41d26b1c9eb4f139af21aaaa479f51303ee031f31c20200000000ffffffff015348000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf72014062645857fd2224db3a7455543c484cad66cece589f1877d63ef61bc9383387fae5c044583ad3a3d7870e0a21a45e20799e424ad0f8c6c37fb2a9d77acbcaea6e0140b495e075e9ee2ea7c10678ff37bbeb07bbeacb222472badd77c50ccebb2198a51b289e3e8ec3a2664f1fcc886703369ee94b5b6fe61c0558f2fdad4ea4a55eee0140ef92e0d84faa5063980167077456099f941bb4d48ee5cdb621830f6c792e411a53c5f0474057da006bf593abca6b52841257cfea7a368d94ce0ef63d8c1bb4a400000000'
    )
  })
})
