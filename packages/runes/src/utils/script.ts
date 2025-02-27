import { bitcoin, OP_PUSH } from '@bitcoinjs-demo/core'

export const createRuneScript = () => {
  return bitcoin.script.compile([
    bitcoin.opcodes.OP_RETURN,
    bitcoin.opcodes.OP_13,
    OP_PUSH(
      JSON.stringify({
        edicts: [],
        etching: {
          divisibility: '0',
          premine: '0',
          rune: '6402364363415443603228541259936211926',
          spacers: '2184',
          symbol: '128165',
          turbo: 'true',
          terms: {
            cap: '2100000',
            amount: '1000',
            height: ['null', 'null'],
            offset: ['null', 'null'],
          },
        },
        mint: 'null',
        pointer: 0,
      })
    ),
  ])
}
