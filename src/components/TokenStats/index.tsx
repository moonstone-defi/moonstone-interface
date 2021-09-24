import React, { useContext } from 'react'
import Image from 'next/image'
import { formatNumberScale } from '../../functions/format'
import { useTokenStatsModalToggle } from '../../state/application/hooks'
import { useWeb3React } from '@web3-react/core'
import TokenStatsModal from '../../modals/TokenStatsModal'
import { ChainId } from '../../sdk'
import { PriceContext } from '../../contexts/priceContext'

const supportedTokens = {
  MOVR: {
    name: 'Moonriver',
    symbol: 'MOVR',
    icon: '/images/tokens/movr.png',
  },
  STONE: {
    name: 'Moonstone Token',
    symbol: 'STONE',
    icon: '/images/tokens/stone.png',
    address: {
      [ChainId.MOONRIVER]: '0xFdA2c94589f0A24BaD5f4b900929119f6269c41B',
    },
  },
}

interface TokenStatsProps {
  token: string
}

function TokenStatusInner({ token }) {
  const toggleModal = useTokenStatsModalToggle(token)

  const priceData = useContext(PriceContext)

  return (
    <div className="flex pl-2" onClick={toggleModal}>
      {token.icon && (
        <Image
          src={token['icon']}
          alt={token['symbol']}
          width="24px"
          height="24px"
          objectFit="contain"
          className="rounded-md"
        />
      )}
      <div className="px-3 py-2 text-primary text-bold">
        {formatNumberScale(priceData?.[token.symbol.toLowerCase()], true, 3)}
      </div>
    </div>
  )
}

export default function TokenStats({ token, ...rest }: TokenStatsProps) {
  const selectedToken = supportedTokens[token]

  return (
    <>
      <TokenStatusInner token={selectedToken} />
      <TokenStatsModal token={selectedToken} />
    </>
  )
}
