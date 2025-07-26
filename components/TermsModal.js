// components/TermsModal.js
import React from 'react';

export default function TermsModal({ onClose }) {
  return (
    <div>
      <h2>Terms &amp; Conditions</h2>
      <div style={{ padding: '1rem', color: '#111', fontSize: '14px', lineHeight: 1.4 }}>
        <p><strong>All purchases are final and non-refundable</strong> once confirmed on Solana Mainnet.</p>
        <p>Replacing your image, url or other info will be possible in the future for a fixed fee. The blocks you bought will be linked to your walletaddress</p>

        <h3>Content Guidelines</h3>
        <ul>
          <li>We may remove scam or fraudulent content.</li>
          <li>Explicit porn, hate symbols, or illegal content will be removed. You keep ownership of the blocks you bought.</li>
          <li>By uploading, you grant us a license to display your content.</li>
          <li>Copyright disputes? Contact us so we can investigate and remove if necessary.</li>
          <li>If your content is removed because one of the reasons above, you will keep ownership of the blocks you bought. Contact us for replacement of the removed content.</li>
        </ul>

        <h3>Blockchain &amp; Privacy</h3>
        <p>This runs on <strong>Solana Mainnet</strong>. All transactions are public.</p>
        <p>We only store your wallet address to track ownership. Everything is visible on-chain.</p>
      </div>
    </div>
  );
}