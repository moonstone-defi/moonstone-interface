import { ChainId, computePairAddress, Currency, CurrencyAmount, Pair, Token } from '../sdk'

import IUniswapV2PairABI from '@sushiswap/core/abi/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { useContext, useMemo } from 'react'
import { useMultipleContractSingleData } from '../state/multicall/hooks'
import { STONE_ADDRESS, FACTORY_ADDRESS, MASTERCHEF_ADDRESS, STONE_VAULT_ADDRESS } from '../constants'
import { useActiveWeb3React } from '../hooks/useActiveWeb3React'
import { PriceContext } from '../contexts/priceContext'
import { POOLS, TokenInfo } from '../constants/farms'
import { concat } from 'lodash'
import { VAULTS } from '../constants/vaults'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID,
}

export function useV2Pairs(currencies: [Currency | undefined, Currency | undefined][]): [PairState, Pair | null][] {
  const tokens = useMemo(
    () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
    [currencies]
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        return tokenA &&
          tokenB &&
          tokenA.chainId === tokenB.chainId &&
          !tokenA.equals(tokenB) &&
          FACTORY_ADDRESS[tokenA.chainId]
          ? computePairAddress({
              factoryAddress: FACTORY_ADDRESS[tokenA.chainId],
              tokenA,
              tokenB,
            })
          : undefined
      }),
    [tokens]
  )

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

  return useMemo(() => {
    return results.map((result, i) => {
      const { result: reserves, loading } = result
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (loading) return [PairState.LOADING, null]
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
      if (!reserves) return [PairState.NOT_EXISTS, null]
      const { reserve0, reserve1 } = reserves
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return [
        PairState.EXISTS,
        new Pair(
          CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
          CurrencyAmount.fromRawAmount(token1, reserve1.toString())
        ),
      ]
    })
  }, [results, tokens])
}

export interface TVLInfo {
  id?: string
  lpToken: string
  tvl: number
  lpPrice: number
}

export function useVaultTVL(): TVLInfo[] {
  const { chainId } = useActiveWeb3React()
  const priceData = useContext(PriceContext)
  const stonePrice = priceData?.['stone']
  const movrPrice = priceData?.['movr']
  const ribPrice = priceData?.['rib']

  const farmingPools = Object.keys(VAULTS[ChainId.MOONRIVER]).map((key) => {
    return { ...VAULTS[ChainId.MOONRIVER][key] }
  })

  const singlePools = farmingPools.filter((r) => !r.token1)
  const singleAddresses = singlePools.map((r) => r.lpToken)
  const lpPools = farmingPools.filter((r) => !!r.token1)
  const pairAddresses = lpPools.map((r) => r.lpToken)

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')
  const totalSupply = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'totalSupply')
  const farmBalance = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'balanceOf', [
    STONE_VAULT_ADDRESS[ChainId.MOONRIVER],
  ])
  const farmBalanceSingle = useMultipleContractSingleData(singleAddresses, PAIR_INTERFACE, 'balanceOf', [
    STONE_VAULT_ADDRESS[ChainId.MOONRIVER],
  ])

  return useMemo(() => {
    function isKnownToken(token: TokenInfo) {
      return (
        token.id.toLowerCase() == STONE_ADDRESS[chainId].toLowerCase() ||
        token.symbol == 'WMOVR' ||
        token.symbol == 'MOVR' ||
        token.symbol == 'USDC' ||
        token.symbol == 'BUSD'
      )
    }

    function getPrice(token: TokenInfo) {
      if (token.id.toLowerCase() == STONE_ADDRESS[chainId].toLowerCase()) {
        return stonePrice
      }
      if (token.symbol == 'WMOVR' || token.symbol == 'MOVR') {
        return movrPrice
      }
      if (token.symbol == 'RIB' || token.symbol == 'RIB') {
        return ribPrice
      }
      if (token.symbol == 'USDC' || token.symbol == 'BUSD') {
        return 1
      }
      return 0
    }

    const lpTVL = results.map((result, i) => {
      const { result: reserves, loading } = result

      let { token0, token1, lpToken } = lpPools[i]

     /*  token0 = token0.id.toLowerCase() < token1.id.toLowerCase() ? token0 : token1
      token1 = token0.id.toLowerCase() < token1.id.toLowerCase() ? token1 : token0
 */
      if (loading) return { lpToken, tvl: 0, lpPrice: 0, id: '0' }
      if (!reserves) return { lpToken, tvl: 0, lpPrice: 0, id: '0' }

      const { reserve0, reserve1 } = reserves

      const lpTotalSupply = totalSupply[i]?.result?.[0]

      const farmLpRatio = farmBalance[i]?.result?.[0] / lpTotalSupply

      const token0price = getPrice(token0)
      const token1price = getPrice(token1)

      const token0total = Number(Number(token0price * (Number(reserve0) / 10 ** token0?.decimals)).toString())
      const token1total = Number(Number(token1price * (Number(reserve1) / 10 ** token1?.decimals)).toString())

      let lpTotalPrice = Number(token0total + token1total)

      if (isKnownToken(token0)) {
        lpTotalPrice = token0total // * 2
      } else if (isKnownToken(token1)) {
        lpTotalPrice = token1total // * 2
      }

      const lpPrice = lpTotalPrice / (lpTotalSupply / 10 ** 18)
      const tvl = lpTotalPrice * farmLpRatio

      return {
        lpToken,
        tvl,
        lpPrice,
        id: '0',
      }
    })

    const singleTVL = farmBalanceSingle.map((result, i) => {
      const { result: balance, loading } = result

      const { token0, lpToken } = singlePools[i]

      if (loading) return { lpToken, tvl: 0, lpPrice: 0, id: '0' }
      if (!balance) return { lpToken, tvl: 0, lpPrice: 0, id: '0' }

      const token0price = getPrice(token0)

      const token0total = Number(Number(token0price * (Number(balance) / 10 ** token0?.decimals)).toString())

      const lpPrice = token0price
      const tvl = token0total

      return {
        lpToken,
        tvl,
        lpPrice,
        id: i.toString(),
      }
    })

    return concat(singleTVL, lpTVL)
  }, [
    results,
    farmBalanceSingle,
    chainId,
    stonePrice,
    movrPrice,
    ribPrice,
    totalSupply,
    farmBalance,
    lpPools,
    singlePools,
  ])
}

/////////////////////////////////////////////////////////////////////////////
export function useFarmBalance(lpToken){
  const farmBalance = useMultipleContractSingleData([lpToken], PAIR_INTERFACE, 'balanceOf', [
    MASTERCHEF_ADDRESS[ChainId.MOONRIVER],
  ])
  return Number(farmBalance[0].result)
}

////////////////7
export function useTVL(): TVLInfo[] {
  const { chainId } = useActiveWeb3React()
  const priceData = useContext(PriceContext)
  const stonePrice = priceData?.['stone']
  const movrPrice = priceData?.['movr']
  const ribPrice = priceData?.['rib']

  const farmingPools = Object.keys(POOLS[ChainId.MOONRIVER]).map((key) => {
    return { ...POOLS[ChainId.MOONRIVER][key], lpToken: key }
  })

  const singlePools = farmingPools.filter((r) => !r.token1)
  const singleAddresses = singlePools.map((r) => r.lpToken)
  const lpPools = farmingPools.filter((r) => !!r.token1)
  const pairAddresses = lpPools.map((r) => r.lpToken)

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')
  const totalSupply = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'totalSupply')
  const farmBalance = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'balanceOf', [
    MASTERCHEF_ADDRESS[ChainId.MOONRIVER],
  ])
  const farmBalanceSingle = useMultipleContractSingleData(singleAddresses, PAIR_INTERFACE, 'balanceOf', [
    MASTERCHEF_ADDRESS[ChainId.MOONRIVER],
  ])

  return useMemo(() => {
    function isKnownToken(token: TokenInfo) {
      return (
        token.id.toLowerCase() == STONE_ADDRESS[chainId].toLowerCase() ||
        token.symbol == 'WMOVR' ||
        token.symbol == 'MOVR' ||
        token.symbol == 'USDC' ||
        token.symbol == 'BUSD'
      )
    }

    function getPrice(token: TokenInfo) {
      if (token.id.toLowerCase() == STONE_ADDRESS[chainId].toLowerCase()) {
        return stonePrice
      }
      if (token.symbol == 'WMOVR' || token.symbol == 'MOVR') {
        return movrPrice
      }
      if (token.symbol == 'USDC' || token.symbol == 'BUSD') {
        return 1
      }
      return 0
    }

    const lpTVL = results.map((result, i) => {
      const { result: reserves, loading } = result

      let { token0, token1, lpToken } = lpPools[i]

      const token0x = token0.id.toLowerCase() == "STONE" ? token0 : token1
      const token1x = token0.id.toLowerCase() == "STONE" ? token1 : token0

      if (loading) return { lpToken, tvl: 0, lpPrice: 0 }
      if (!reserves) return { lpToken, tvl: 0, lpPrice: 0 }

      const { reserve0, reserve1 } = reserves

      const lpTotalSupply = totalSupply[i]?.result?.[0]

      const farmLpRatio = farmBalance[i]?.result?.[0] / lpTotalSupply

      const token0price = getPrice(token0x)
      const token1price = getPrice(token1x)

      const token0total = Number(Number(token0price * (Number(reserve0) / 10 ** token0x?.decimals)).toString())
      const token1total = Number(Number(token1price * (Number(reserve1) / 10 ** token1x?.decimals)).toString())

      let lpTotalPrice = Number(token0total + token1total)
      
      console.log("OK",token0x, token1x, lpTotalPrice, Number(lpTotalSupply) / 10 **18, Number(reserve0) * 10**18,Number(reserve1) * 10**18)
      
    /*   if (isKnownToken(token0)) {
        lpTotalPrice = token0total * 2
      } else if (isKnownToken(token1)) {
        lpTotalPrice = token1total * 2
      }
 */
      const lpPrice = lpTotalPrice / (lpTotalSupply / 10 ** 18)
      console.log("lpPrice", lpPrice, lpTotalPrice , (lpTotalSupply / 10 ** 18))
      const tvl = lpTotalPrice * farmLpRatio
      console.log("TVL TEST",lpToken,
      tvl,
      lpPrice )
      return {
        lpToken,
        tvl,
        lpPrice,
      }
    })

    const singleTVL = farmBalanceSingle.map((result, i) => {
      const { result: balance, loading } = result

      const { token0, lpToken } = singlePools[i]

      if (loading) return { lpToken, tvl: 0, lpPrice: 0 }
      if (!balance) return { lpToken, tvl: 0, lpPrice: 0 }

      const token0price = getPrice(token0)

      const token0total = Number(Number(token0price * (Number(balance) / 10 ** token0?.decimals)).toString())

      const lpPrice = token0price
      const tvl = token0total

      return {
        lpToken,
        tvl,
        lpPrice,
      }
    })

    return concat(singleTVL, lpTVL)
  }, [
    results,
    farmBalanceSingle,
    chainId,
    stonePrice,
    movrPrice,
    ribPrice,
    totalSupply,
    farmBalance,
    lpPools,
    singlePools,
  ])
}

//////////////////////////////////////////////////////////////
export function useV2PairsWithPrice(
  currencies: [Currency | undefined, Currency | undefined][]
): [PairState, Pair | null, number][] {
  const { chainId } = useActiveWeb3React()

  const tokens = useMemo(
    () => currencies.map(([currencyA, currencyB]) => [currencyA?.wrapped, currencyB?.wrapped]),
    [currencies]
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        return tokenA &&
          tokenB &&
          tokenA.chainId === tokenB.chainId &&
          !tokenA.equals(tokenB) &&
          FACTORY_ADDRESS[tokenA.chainId]
          ? computePairAddress({
              factoryAddress: FACTORY_ADDRESS[tokenA.chainId],
              tokenA,
              tokenB,
            })
          : undefined
      }),
    [tokens]
  )

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')
  const totalSupply = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'totalSupply')

  const priceData = useContext(PriceContext)
  const stonePrice = priceData?.['stone']
  const movrPrice = priceData?.['movr']
  const ribPrice = priceData?.['rib']

  return useMemo(() => {
    function isKnownToken(token: Token) {
      return (
        token.address.toLowerCase() == STONE_ADDRESS[chainId].toLowerCase() ||
        token.symbol == 'WMOVR' ||
        token.symbol == 'MOVR' ||
        token.symbol == 'RIB' ||
        token.symbol == 'USDC' ||
        token.symbol == 'BUSD'
      )
    }

    function getPrice(token: Token) {
      if (token.address.toLowerCase() == STONE_ADDRESS[chainId].toLowerCase()) {
        return stonePrice
      }
      if (token.symbol == 'WMOVR' || token.symbol == 'MOVR') {
        return movrPrice
      }
      if (token.symbol == 'RIB' || token.symbol == 'RIB') {
        return ribPrice
      }
      if (token.symbol == 'USDC' || token.symbol == 'BUSD') {
        return 1
      }
      return 0
    }

    return results.map((result, i) => {
      const { result: reserves, loading } = result
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (loading) return [PairState.LOADING, null, 0]
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null, 0]
      if (!reserves) return [PairState.NOT_EXISTS, null, 0]
      const { reserve0, reserve1 } = reserves
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]

      const lpTotalSupply = totalSupply[i]?.result?.[0]

      const token0price = getPrice(token0)
      const token1price = getPrice(token1)

      const token0total = Number(Number(token0price * (Number(reserve0) / 10 ** token0?.decimals)).toString())
      const token1total = Number(Number(token1price * (Number(reserve1) / 10 ** token1?.decimals)).toString())

      let lpTotalPrice = Number(token0total + token1total)

      if (isKnownToken(token0)) {
        lpTotalPrice = token0total * 2
      } else if (isKnownToken(token1)) {
        lpTotalPrice = token1total * 2
      }

      const lpPrice = lpTotalPrice / (lpTotalSupply / 10 ** 18)

      return [
        PairState.EXISTS,
        new Pair(
          CurrencyAmount.fromRawAmount(token0, reserve0.toString()),
          CurrencyAmount.fromRawAmount(token1, reserve1.toString())
        ),
        lpPrice,
      ]
    })
  }, [results, chainId, stonePrice, movrPrice, ribPrice, tokens, totalSupply])
}

export function useV2Pair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  const inputs: [[Currency | undefined, Currency | undefined]] = useMemo(() => [[tokenA, tokenB]], [tokenA, tokenB])
  return useV2Pairs(inputs)[0]
}
