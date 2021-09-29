import { ChainId } from '../sdk'

export type TokenInfo = {
  id: string
  name: string
  symbol: string
  decimals?: number
}

type PairInfo = {
  id: number
  token0: TokenInfo
  token1?: TokenInfo
  name?: string
  symbol?: string
}

type AddressMap = {
  [chainId: number]: {
    [address: string]: PairInfo
  }
}

export const POOLS: AddressMap = {
  [ChainId.MOONRIVER]: {
    '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B': {
      id: 0,
      token0: {
        id: '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B',
        name: 'Moonstone Token',
        symbol: 'STONE',
        decimals: 18,
      },
    },
    '0x4eBc0aDF587D8E61c7a97387c5B6b21DaD1234Ad': {
      id: 1,
      token0: {
        id: '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B',
        name: 'Moonstone Token',
        symbol: 'STONE',
        decimals: 18,
      },
      token1: {
        id: '0x98878B06940aE243284CA214f92Bb71a2b032B8A',
        name: 'Moonriver',
        symbol: 'MOVR',
        decimals: 18,
      },
      name: 'SOLAR',
      symbol: 'SLP',
    },
    '0x1F858954cad3B632EDc4AFA62792d96f36B9904C': {
      id: 2,
      token0: {
        id: '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B',
        name: 'Moonstone Token',
        symbol: 'STONE',
        decimals: 18,
      },
      token1: {
        id: '0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
      },
      name: 'SOLAR',
      symbol: 'SLP',
    },
    '0xCA522d4c47f73c75bb2b8683D04eF367D8d4D05a': {
      id: 3,
      token0: {
        id: '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B',
        name: 'Moonstone Token',
        symbol: 'STONE',
        decimals: 18,
      },
      token1: {
        id: '0xB497c3E9D27Ba6b1fea9F1b941d8C79E66cfC9d6',
        name: 'MOON',
        symbol: 'MOON',
        decimals: 18,
      },
      name: 'MOONSWAP',
      symbol: 'MLP',
    },
    '0xF4EBa3019f0202762cB90C5d08F971ae0eE2a734': {
      id: 4,
      token0: {
        id: '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B',
        name: 'Moonstone Token',
        symbol: 'STONE',
        decimals: 18,
      },
      token1: {
        id: '0x63F2ADf5f76F00d48fe2CBef19000AF13Bb8de82',
        name: 'Freeriver Token',
        symbol: 'FREE',
        decimals: 18,
      },
      name: 'FREERIVER',
      symbol: 'FLP',
    },
  },
}
