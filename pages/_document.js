// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.png" type="image/png" />

        {/* Google Fonts: Press Start 2P */}
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
        {/* Wallet adapter styles */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/@solana/wallet-adapter-react-ui/styles.css"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}