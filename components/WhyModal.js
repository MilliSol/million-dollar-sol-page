// components/WhyModal.js
import React from 'react';

export default function WhyModule({ onClose }) {
  return (
    <div style={{
      fontFamily: 'Press Start 2P, monospace',
      color: '#111',
      lineHeight: 1.4,
      padding: '0.25rem 0.5rem'
    }}>
      <h2 style={{ marginTop: 0, color: '#9945FF', fontSize: '1rem' }}>
        Why buy pixels?
      </h2>

      <p style={{ margin: '0.4rem 0 1rem', fontSize: '0.9rem', color: '#222' }}>
        Forever ad space for a tiny one-off payment — exposure, scarcity, and the chance for big profits when the canvas is fully sold out.
        Want in? Grab a block now and keep it forever. Connect your wallet, select the blocks you want and put on whatever you like!
      </p>

      <h3 style={{ margin: '0.8rem 0 0.35rem', fontSize: '0.9rem', color: '#111' }}>
      Why it’s powerful
      </h3>
      <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.85rem', color: '#222' }}>
        <li><strong>Permanent presence:</strong> your adspace stays on the canvas forever — update it later as needed.</li>
        <li><strong>Scarcity:</strong> price rises with every block sold, so early buyers get the best price.</li>
        <li><strong>Built-in hype:</strong> every completed horizontal line of 100 blocks triggers a live $1,000 giveaway — attention for the canvas grows over time.</li>
        <li><strong>Future marketplace:</strong> once the full canvas is sold, pixels can be put on the market — early buyers can benefit from secondary value.</li>
      </ul>

      <h3 style={{ margin: '0.8rem 0 0.35rem', fontSize: '0.9rem', color: '#111' }}>
        What you can promote
      </h3>
      <ul style={{ margin: '0', paddingLeft: '1rem', fontSize: '0.85rem', color: '#222' }}>
        <li>Memecoins, NFT projects, or tokens</li>
        <li>Your company, store or product</li>
        <li>Social media, event pages or other projects</li>
      </ul>

      <h3 style={{ margin: '0.8rem 0 0.35rem', fontSize: '0.9rem', color: '#111' }}>
        Pricing & timing
      </h3>
      <p style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: '#222' }}>
        The starting price is intentionally low. For every single block sold the price increases by <strong>$0.02</strong>.
        That means: the earlier you buy, the cheaper each block will be.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
      </div>
    </div>
  );
}