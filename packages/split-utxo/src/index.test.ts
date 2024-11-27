import { describe, test, expect } from '@jest/globals'

import { SplitUtxo } from '.'

describe('SplitUtxo', () => {
  const utxo = new SplitUtxo({
    wif: 'cP5qpxwUrhB2pfGELF9NSfP16hUtMAithVmasdc6UeYLTMxWHteR',
    network: 'testnet',
    feeRate: 300,
    utxo: {
      hash: 'd6245908d7c6e0f8b1acc4ba276124911003263a1ebe7ecd7b5576c15bcfde99',
      index: 0,
      value: 25288,
    },
  })

  test('should be a p2tr address', () => {
    expect(utxo.payment.address).toBe(
      'tb1pagakxe22c92q5msgh9v7zznjjry4ylgatyuyyu9qq3mrwk804aeqvwc26h'
    )
  })

  // https://mempool.space/testnet4/tx/c2311f03ee0313f579a4aa1af29a134febc9b1261da4375070974b1ed11878d4
  test('biuld split tx hex', () => {
    const psbt = utxo.split(4)
    console.log('tx vSize:', psbt.virtualSize())
    console.log('tx hex:', psbt.toHex())
    expect(psbt.toHex()).toBe(
      '0200000000010199decf5bc176557bcd7ebe1e3a26031091246127bac4acb1f8e0c6d7085924d60000000000fdffffff046718000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf726718000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf726718000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf726718000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf720140496720af9c395d9461332413d94cdfcbfa2d313863a35ede575faf5354ad86bdc41abf7255c528ebc1fd09c9b8169bd603db5ecdfe91e7e620429cca2f3cf06300000000'
    )
  })
})
