// pages/_app.js
import Head from 'next/head';
import '../styles/globals.css';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

require('@solana/wallet-adapter-react-ui/styles.css');

function MyApp({ Component, pageProps }) {
  // — Solana wallet/network setup
  const network  = WalletAdapterNetwork.Testnet;           // switch to MainnetBeta when live
  const endpoint = clusterApiUrl(network);
  const wallets  = [new PhantomWalletAdapter()];

  return (
    <>
      <Head>
        {/* Primary SEO */}
        <title>Million Dollar SOL Page | Your Brand, Your Space</title>
        <meta name="description" content="Buy your own pixels on Solana—$1 per pixel. Build your brand, your space, your place in internet history."/>
        <meta name="keywords"    content="Solana, pixel art, blockchain, buy pixels, million dollar page"/>
        <meta name="author"      content="The Million Dollar Sol Page"/>
        <meta name="viewport"    content="width=device-width, initial-scale=1"/>

        {/* Open Graph */}
        <meta property="og:title"       content="Million Dollar SOL Page"/>
        <meta property="og:description" content="Buy your own pixels on Solana—$1 per pixel. Build your brand, your space, your place in internet history."/>
        <meta property="og:image"       content="http://themilliondollarsolpage.com/og-image.png"/>
        <meta property="og:url"         content="http://themilliondollarsolpage.com"/>
        <meta property="og:type"        content="website"/>

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image"/>
        <meta name="twitter:title"       content="Million Dollar SOL Page"/>
        <meta name="twitter:description" content="Buy your own pixels on Solana—$1 per pixel. Build your brand, your space, your place in internet history."/>
        <meta name="twitter:image"       content="http://themilliondollarsolpage.com/og-image.png"/>

        {/* Canonical URL */}
        <link rel="canonical" href="http://themilliondollarsolpage.com"/>

        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Million Dollar SOL Page",
              url: "http://themilliondollarsolpage.com",
              potentialAction: {
                "@type": "SearchAction",
                target: "http://themilliondollarsolpage.com/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>

      {/* Wallet providers */}
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Component {...pageProps} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </>
  );
}

export default MyApp;