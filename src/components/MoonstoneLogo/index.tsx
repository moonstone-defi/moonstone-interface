import React from 'react'
import Image from '../Image'

/**
 * Renders an image by sequentially trying a list of URIs, and then eventually a fallback triangle alert
 */
const MoonstoneLogo = () => {
  return (
    <>
      <div className="mt-4 mb-4 sm:hidden"></div>
      <div className="flex justify items-center mt-8 mb-12 hidden sm:block" style={{ minHeight: 40 }}>
        <Image src="/logo.png" alt="Solarbeam" width={666} height={307} />
      </div>
    </>
  )
}

export default MoonstoneLogo
