import { bitcoin } from '@bitcoinjs-demo/core'

export const main = async () => {
  console.log('Hello bitcoinjs-lib')
  console.log('OP_RETURN:', bitcoin.opcodes.OP_RETURN)
}

main()
