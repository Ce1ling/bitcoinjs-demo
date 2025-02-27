import { describe, test, expect } from '@jest/globals'
import { wallet, AddressType } from '@unisat/wallet-sdk'
import { NetworkType } from '@unisat/wallet-sdk/lib/network'
import { toXOnly, ECPair, bitcoin } from '@bitcoinjs-demo/core'

import { Rune } from '.'

describe('runes', () => {
  const keyring = ECPair.fromWIF(
    'cP5qpxwUrhB2pfGELF9NSfP16hUtMAithVmasdc6UeYLTMxWHteR',
    bitcoin.networks.testnet
  )
  const localWallet = new wallet.LocalWallet(
    'cP5qpxwUrhB2pfGELF9NSfP16hUtMAithVmasdc6UeYLTMxWHteR',
    AddressType.P2TR,
    NetworkType.TESTNET
  )
  const rune = new Rune({
    name: 'RUNERUNERUNE',
    amount: 100000000,
    cap: 100000000,
    network: 'testnet',
    feeRate: 443,
    pubkey: localWallet.pubkey,
  })

  test('Should be taproot pubkey & address', () => {
    expect(rune.xPubkey.toString('hex')).toEqual(
      '6a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d39'
    )
    expect(rune.xPubkey).toEqual(
      toXOnly(Buffer.from(localWallet.pubkey, 'hex'))
    )
    expect(rune.payment?.address).toEqual(
      'tb1pagakxe22c92q5msgh9v7zznjjry4ylgatyuyyu9qq3mrwk804aeqvwc26h'
    )
  })

  test('Should be psbt', async () => {
    const psbt = rune.etch({
      hash: '5b11ecf35c31a4c91ad7bae2c9e578200fc5d478a083878390015c1ad7f280a2',
      index: 0,
      value: 18515,
    })
    console.log('unsigned psbt hex', psbt.toHex())

    const tx = psbt
      .signAllInputs(
        keyring.tweak(bitcoin.crypto.taggedHash('TapTweak', rune.xPubkey))
      )
      .finalizeAllInputs()
      .extractTransaction()

    console.log('signed tx hex', tx.toHex())
  })
})
