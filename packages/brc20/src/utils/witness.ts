import { MAXIMUM_SCRIPT_ELEMENT_SIZE } from '@sadoprotocol/ordit-sdk/dist/constants'

import { bitcoin, OP_PUSH } from '../lib/bitcoinjs'

export const createBrc20BaseElements = (
  chunks: Buffer | bitcoin.payments.Stack,
  xPubkey?: Buffer,
  type?: string
) => [
  ...(xPubkey ? [xPubkey, bitcoin.opcodes.OP_CHECKSIG] : []),
  bitcoin.opcodes.OP_FALSE,
  bitcoin.opcodes.OP_IF,
  OP_PUSH('ord'),
  OP_PUSH(1),
  OP_PUSH(1),
  ...(type ? [OP_PUSH(type)] : []),
  bitcoin.opcodes.OP_0,
  ...chunks,
  bitcoin.opcodes.OP_ENDIF,
]

export const createBrc20MetaElements = <T = any>(meta: T) => {
  if (typeof meta !== 'object') return [] as (number | Buffer)[]

  return createBrc20BaseElements(
    chunkContent(JSON.stringify(meta)).map(OP_PUSH),
    undefined,
    'application/json;charset=utf-8'
  )
}

// 大内容分块函数
const chunkContent = (str: string, encoding: BufferEncoding = 'utf8') => {
  const contentBuffer = Buffer.from(str, encoding)
  const chunks: Buffer[] = []
  let chunkedBytes = 0

  while (chunkedBytes < contentBuffer.byteLength) {
    const chunk = contentBuffer.subarray(
      chunkedBytes,
      // 最多只能 `MAXIMUM_SCRIPT_ELEMENT_SIZE` 字节
      chunkedBytes + MAXIMUM_SCRIPT_ELEMENT_SIZE
    )
    chunkedBytes += chunk.byteLength
    chunks.push(chunk)
  }

  return chunks
}

export const createInscriptionScript = ({
  xPubkey,
  content,
  type,
  meta,
}: {
  xPubkey: Buffer
  content: string
  type: string
  meta?: any
}) => {
  const contentElements = chunkContent(
    content,
    type.includes('text') ? 'utf-8' : 'base64'
  ).map(OP_PUSH)

  return bitcoin.script.compile([
    ...createBrc20BaseElements(contentElements, xPubkey, type),
    ...createBrc20MetaElements(meta),
  ])
}

// RecoveryScript 只需要检查公钥即可
export const createRecoveryScript = (xPubkey: Buffer) => {
  return bitcoin.script.compile([xPubkey, bitcoin.opcodes.OP_CHECKSIG])
}
