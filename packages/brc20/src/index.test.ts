import { describe, test, expect } from '@jest/globals'
import { Ordit } from '@sadoprotocol/ordit-sdk'

import { BRC20 } from '.'

// 钱包直接使用 Ordit 提供的，不需要自己写一套
const wallet = new Ordit({
  network: 'testnet',
  // 公开钱包，请不要当自己的钱包用
  bip39:
    'armed carpet then ketchup monkey junior share december grunt arrest century enroll',
})
wallet.setDefaultAddress('taproot')

const brc20Params = {
  network: 'testnet' as const,
  type: 'text/plain',
  content: JSON.stringify({
    p: 'brc-20',
    op: 'deploy',
    // tick 要通过 https://testnet.unisat.io/brc20/<tick>
    // 来查看这个 BRC20 是否被部署过了，二次部署索引器是不认的
    tick: 'BRCD',
    max: '123456789',
    lim: '123',
  }),
  // 填 600 就可以了, 就是 600 sats
  postage: 600,
  // 通过 https://mempool.space/zh/testnet 来查看当前费率情况然后填写
  feeRate: 100,
}

describe('BRC20', () => {
  const brc20 = new BRC20({
    network: brc20Params.network,
    type: brc20Params.type,
    content: brc20Params.content,
    fromPubkey: wallet.publicKey,
    toAddress: wallet.selectedAddress!,
    postage: brc20Params.postage,
    feeRate: brc20Params.feeRate,
  })

  test('传入的参数应该被正确初始化', () => {
    expect(brc20.network).toBe(brc20Params.network)
    expect(brc20.type).toBe(brc20Params.type)
    expect(brc20.content).toBe(brc20Params.content)
    expect(brc20.fromPubkey).toBe(
      '036a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d39'
    )
    expect(brc20.toAddress).toBe(
      'tb1pagakxe22c92q5msgh9v7zznjjry4ylgatyuyyu9qq3mrwk804aeqvwc26h'
    )
    expect(brc20.postage).toBe(brc20Params.postage)
    expect(brc20.feeRate).toBe(brc20Params.feeRate)
    expect(brc20.enableRbf).toBe(true)
  })

  const { address, fee } = brc20.commit()
  test('commit 方法应该返回正确的 address 和 fee', () => {
    console.log('commit', address, fee)
    // address 受上面的 brc20Params 和 wallet 影响，
    // 改了 brc20Params 和 wallet 就会影响 address，所以改了就以 console.log 为准。
    expect(address).toBe(
      'tb1pqw75f70qashackk9ncc22pm39vj204c2zgfhk4n9ck9l8l5k8vds3pffv8'
    )
    // fee 受上面的 brc20Params 的 feeRate 影响，
    // 改了 feeRate 就会影响 fee，所以改了就以 console.log 为准
    expect(fee).toBe(16700)
  })

  // 这里是未签名的 reveal 交易的 hex，不可广播
  const { hex } = brc20.reveal({
    // commit tx 的 txid
    txid: '9a83050add4b7052821d41e2bcbc51d436aef5af08ffac84c05c01551797bc16',
    // commit tx 的 vout 索引
    n: 0,
    // commit tx 支付的 sats，其实就是 commit 方法算出来的金额
    sats: fee,
  })
  test('reveal 方法应该返回正确的未签名的交易 hex', () => {
    console.log('reveal hex', hex)
    expect(hex).toBe(
      '70736274ff01005e020000000116bc971755015cc084acff08aff5ae36d451bcbce2411d8252704bdd0a05839a0000000000fdffffff015802000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf72000000000001012b3c4100000000000022512003bd44f9e0ec2fdc5ac59e30a507712b24a7d70a12137b5665c58bf3fe963b1b4215c06a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d391840c3d3a4180f874f0ab5a09530780cbb3571bec0bc9c2aff11c9a078aabc8a81206a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d39ac0063036f726401010a746578742f706c61696e00487b2270223a226272632d3230222c226f70223a226465706c6f79222c227469636b223a2242524344222c226d6178223a22313233343536373839222c226c696d223a22313233227d68c00117206a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d390000'
    )
  })

  test('Ordit 钱包签名后应该是正确的可广播的交易 hex', () => {
    // 使用钱包签名 reveal 交易，然后就可以广播了
    const signedHex = wallet.signPsbt(hex, { isRevealTx: true })
    console.log('signed reveal hex', signedHex)
    expect(signedHex).toBe(
      '0200000000010116bc971755015cc084acff08aff5ae36d451bcbce2411d8252704bdd0a05839a0000000000fdffffff015802000000000000225120ea3b63654ac1540a6e08b959e10a7290c9527d1d59384270a004763758efaf72034008c39a75094d0133b5f26558b2793c4861de07a890bfabed20d210a654bcf4a4eb4e1c0615a157a4f5c73821f7db31113466d2bf1cc129f809c607949ac3ae0a80206a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d39ac0063036f726401010a746578742f706c61696e00487b2270223a226272632d3230222c226f70223a226465706c6f79222c227469636b223a2242524344222c226d6178223a22313233343536373839222c226c696d223a22313233227d6841c06a32895bb8c094c7d50ad7645184e0f402c3e1e93a9460ec3dbe1604bc633d391840c3d3a4180f874f0ab5a09530780cbb3571bec0bc9c2aff11c9a078aabc8a00000000'
    )
  })
})
