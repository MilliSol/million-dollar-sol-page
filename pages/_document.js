// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon(s) */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon-192.png" />

        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

        {/* Wallet adapter CSS is loaded in _app (require), but keeping this won't harm if you prefer link */}
        {/* <link rel="stylesheet" href="https://unpkg.com/@solana/wallet-adapter-react-ui/styles.css" /> */}

        {/* Theme color (optional) */}
        <meta name="theme-color" content="#9945FF" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}