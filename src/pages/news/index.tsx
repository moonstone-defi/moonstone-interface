/* eslint-disable @next/next/link-passhref */
import { useActiveWeb3React, useFuse } from '../../hooks'

import FarmList from '../../features/farm/FarmList'
import Head from 'next/head'
import React, { useContext, useState } from 'react'
import MoonstoneLogo from '../../components/MoonstoneLogo'
import S00n from '../../components/S00n'

export default function News(): JSX.Element {
  const BgStyle =  { 
    background: "url(images/s00n.jpg) no-repeat center center fixed",
    backgroundSize: "cover",
    backgroundPosition: "center", /* Center the image */
    marginLeft: "auto",
    marginRight: "auto",
    position: "relative",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#cccccc",
    backgroundImage: "radial-gradient(darkgreen, black)",
    
  }

  return (
    <div >
      <Head>
        <title>News | Moonstone</title>
        <meta key="description" name="description" content="News MOONSTONE" />
      </Head>
    <MoonstoneLogo />
      </div >
  )
}
