import { AddressFormats, getScriptType } from '@sadoprotocol/ordit-sdk'
import type { Network } from '@sadoprotocol/ordit-sdk/dist/config/types'

import { bitcoin } from '../lib/bitcoinjs'

export const getVirtualSize = (
  psbt: bitcoin.Psbt,
  network: Network,
  witness: Buffer[] = []
) => {
  const { baseSize, witnessSize } = getBaseSize(psbt, network, witness)
  // 计算 sat/wu, 详情参见 https://bitcoin.heapup.tech/technical/transaction/fee#satwu
  const weight = baseSize * 3 + (baseSize + witnessSize)

  // 计算 sat/vbyte, 详情参见 https://bitcoin.heapup.tech/technical/transaction/fee#satvbyte
  return Math.ceil(weight / 4)
}

const getBaseSize = (
  psbt: bitcoin.Psbt,
  network: Network,
  witness: Buffer[] = []
) => {
  const { inputTypes, outputTypes } = getScriptTypes(psbt, network)
  const { inputVBytes, outputVBytes } = getScriptVBytes(inputTypes, outputTypes)
  const hasTaproot = inputTypes.includes('taproot')

  const witnessSize =
    inputVBytes.witness + (hasTaproot ? getWitnessSize(witness) : 0)
  const witnessHeaderSize = 2

  return {
    baseSize: inputVBytes.input + inputVBytes.txHeader + outputVBytes,
    witnessSize: witness.length
      ? witnessSize
      : witnessSize > 0
      ? witnessHeaderSize + witnessSize
      : 0,
  }
}

// 直接使用 ordit-sdk 的 getScriptType 就可以
export const getScriptTypes = (psbt: bitcoin.Psbt, network: Network) => {
  const inputTypes = psbt.data.inputs.map((i) => {
    if (!i.witnessUtxo?.script) throw new Error('Invalid script')
    return getScriptType(i.witnessUtxo.script, network).format
  })
  const outputTypes = psbt.txOutputs.map(
    (o) => getScriptType(o.script, network).format
  )
  return {
    inputTypes,
    outputTypes,
  }
}

// 获取每个输入输出脚本的 vBytes
export const getScriptVBytes = (
  inputTypes: AddressFormats[],
  outputTypes: AddressFormats[]
) => {
  const inputVBytes = inputTypes.reduce(
    (acc, type) => {
      const { input, txHeader, witness } = getBaseSizeByType(type)
      acc.input += input
      acc.txHeader += txHeader
      acc.witness += witness
      return acc
    },
    {
      input: 0,
      witness: 0,
      txHeader: 0,
    }
  )
  const outputVBytes = outputTypes.reduce((acc, type) => {
    const { output } = getBaseSizeByType(type)
    acc += output
    return acc
  }, 0)

  return {
    inputVBytes,
    outputVBytes,
  }
}

// 获取每种脚本的基本大小
export const getBaseSizeByType = (type: AddressFormats) => {
  switch (type) {
    case 'taproot':
      return { input: 42, output: 43, txHeader: 10.5, witness: 66 } // witness size is different for non-default sigHash
    case 'segwit':
      return { input: 41, output: 31, txHeader: 10.5, witness: 105 }
    case 'nested-segwit':
      return { input: 64, output: 32, txHeader: 10, witness: 105 }
    case 'legacy':
      return { input: 148, output: 34, txHeader: 10, witness: 0 }
    default:
      throw new Error('Invalid address type')
  }
}

const getWitnessSize = (witness: Buffer[]) => {
  if (!witness.length) return 0
  return witness.reduce((acc, witness) => (acc += witness.byteLength), 0)
}
