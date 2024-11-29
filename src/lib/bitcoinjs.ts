import * as bitcoin from 'bitcoinjs-lib'
import * as ecpair from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'

const MAXIMUM_SCRIPT_ELEMENT_SIZE = 520

bitcoin.initEccLib(ecc)
const ECPair = ecpair.ECPairFactory(ecc)

export { bitcoin, ecpair, ecc, ECPair, toXOnly }

export function OP_PUSH(data: number | string | Buffer) {
  if (typeof data === 'number') return data
  const buff = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')
  if (buff.byteLength > MAXIMUM_SCRIPT_ELEMENT_SIZE) {
    throw new Error('Data is too large to push.')
  }

  return Buffer.concat([buff])
}
