// pages/terms.js
import React, { useState } from 'react';

// Inline MiniCanvas: niet-klikbaar, toont alleen een vaste vorm
function MiniCanvas({ shape, cellSize = 20, padding = 2, color = '#9945FF' }) {
  const cols = shape.map((b) => b.col);
  const rows = shape.map((b) => b.row);
  const minCol = Math.min(...cols);
  const minRow = Math.min(...rows);
  const maxCol = Math.max(...cols);
  const maxRow = Math.max(...rows);
  const width  = (maxCol - minCol + 1) * cellSize;
  const height = (maxRow - minRow + 1) * cellSize;
  const key = (b) => `${b.col}-${b.row}`;
  const setOf = new Set(shape.map(key));

  return (
    <div
      style={{
        width: width + padding * 2,
        height: height + padding * 2,
        padding,
        background: '#f0f0f0',
        display: 'grid',
        gridTemplateColumns: `repeat(${maxCol - minCol + 1}, ${cellSize}px)`,
        gridTemplateRows:    `repeat(${maxRow - minRow + 1}, ${cellSize}px)`,
        gap: '1px',
        margin: '0.5rem 0',
      }}
    >
      {Array.from({ length: maxRow - minRow + 1 }).flatMap((_, r) =>
        Array.from({ length: maxCol - minCol + 1 }).map((_, c) => {
          const globalCol = minCol + c;
          const globalRow = minRow + r;
          const filled = setOf.has(`${globalCol}-${globalRow}`);
          return (
            <div
              key={`${c},${r}`}
              style={{
                width: cellSize,
                height: cellSize,
                background: filled ? color : '#ffffff',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          );
        })
      )}
    </div>
  );
}

export default function TermsPage({ defaultTab = 'terms' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const lShape = [
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 0, row: 1 }, { col: 0, row: 2 },
  ];
  const snakeShape = [
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 2, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 2 },
  ];

  const tabButtonStyle = (isActive) => ({
    flex: 1,
    padding: '0.5rem',
    background: isActive ? '#14F195' : '#555',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'Press Start 2P, monospace',
  });

  const contentStyle = {
    padding: '1rem',
    color: '#111',
    fontSize: '14px',
    lineHeight: 1.4,
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Tab-buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('terms')}
          style={tabButtonStyle(activeTab === 'terms')}
        >
          Terms & Conditions
        </button>
        <button
          onClick={() => setActiveTab('instructions')}
          style={tabButtonStyle(activeTab === 'instructions')}
        >
          Upload Instructions
        </button>
      </div>

      {/* Content */}
      {activeTab === 'terms' && (
        <div style={contentStyle}>
          <h2 style={{ marginTop: 0 }}>Terms & Conditions</h2>
          <p><strong>All purchases are final and non-refundable</strong> once confirmed on Solana Mainnet.</p>
          <p>Replacing your image/info will be possible later for a fixed fee.</p>

          <h3>Content Guidelines</h3>
          <ul>
            <li>We may remove scam or fraudulent content. You may resubmit once for free.</li>
            <li>Explicit porn, hate symbols, or illegal content will be removed. You keep ownership and can replace.</li>
            <li>By uploading, you grant us a license to display your content.</li>
            <li>Copyright disputes? Contact us for one-time replacement.</li>
          </ul>

          <h3>Blockchain & Privacy</h3>
          <p>This runs on <strong>Solana Mainnet</strong>. All transactions are public.</p>
          <p>We only store your wallet address to track ownership. Everything is visible on-chain.</p>
        </div>
      )}

      {activeTab === 'instructions' && (
        <div style={contentStyle}>
          <h2 style={{ marginTop: 0 }}>Upload Instructions & Tips</h2>

          <h3>1. Match image size</h3>
          <p>Upload an image exactly the size of your blocks. E.g. 2×2 → 20×20 px. Otherwise it may distort.</p>

          <h3>2. Irregular shapes</h3>
          <p>Your image spans the full bounding box but only shows on purchased blocks:</p>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <strong>L-Shape Example</strong>
              <MiniCanvas shape={lShape} cellSize={10} color="#9945FF" />
              <p>Recommended: <strong>30×30 px</strong></p>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <strong>Snake-Shape Example</strong>
              <MiniCanvas shape={snakeShape} cellSize={10} color="#9945FF" />
              <p>Recommended: <strong>40×30 px</strong></p>
            </div>
          </div>

          <h3>3. Supported formats</h3>
          <ul>
            <li>.png, .jpg, .gif (animated GIFs loop)</li>
            <li>Max size: 5 MB</li>
            <li>Use an editor (Photopea) to crop/resize</li>
          </ul>

          <h3>4. Public visibility</h3>
          <p>Your upload is public on the grid and on-chain. Do not include personal info.</p>
        </div>
      )}
    </div>
  );
}