// components/InstructionsModal.js
import React from 'react';

// Hergebruik de MiniCanvas helper
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

export default function InstructionsModal({ onClose }) {
  const lShape = [
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 0, row: 1 }, { col: 0, row: 2 },
  ];
  const snakeShape = [
    { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    { col: 2, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 2 },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Upload Instructions &amp; Tips</h2>
      <div style={{ padding: '1rem', color: '#111', fontSize: '14px', lineHeight: 1.4 }}>
        <h3>1. Match image size</h3>
        <p>
          For the best result upload an image exactly the size of your blocks. E.g. 2×2 → 20×20 px.
          We strongly advise you to use an image with the same size or at least same aspect ratio as the selected blocks.
          Uploading an image with another size and/or aspect ratio may distort the image on our canvas.          
        </p>

        <h3>2. Irregular shapes</h3>
        <p>Your image spans the full bounding box but only shows on purchased blocks as shown below:</p>
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
          <li>.png/.jpg/.gif (animated GIFs will loop)</li>
          <li>Max size: 5 MB</li>
          <li>For the best result, juse an editor to crop/resize your image</li>
        </ul>

        <h3>4. Public visibility</h3>
        <p>
          Your upload is public (within seconds) on the canvas and on-chain. We advise you to not include personal info.
        </p>
      </div>
    </div>
  );
}