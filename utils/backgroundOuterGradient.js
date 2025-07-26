// utils/backgroundOuterGradient.js

/**
 * Genereert een 1×N blokken‐tile (N*cellSize px breed, cellSize hoog) waarin:
 * - De middelste 102 blokken (102*cellSize = 1020px) paars (#9945FF) zijn
 * - De blokken er omheen per 10px stap oplopen in kleur van paars naar groen
 */
export function generateOuterGradient(cellSize = 10) {
  const widthPx = Math.ceil(window.innerWidth / cellSize) * cellSize;
  const cols = widthPx / cellSize;

  const bandCols = 1020 / cellSize;            // 1020px band
  const startIdx = Math.floor((cols - bandCols) / 2);
  const endIdx = startIdx + bandCols;          // exclusief

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = cellSize;
  const ctx = canvas.getContext('2d');

  // Kleurwaarden van paars en groen
  const purple = { r: 0x99, g: 0x45, b: 0xff };
  const green  = { r: 0x14, g: 0xf1, b: 0x95 };

  for (let i = 0; i < cols; i++) {
    let color;
    if (i >= startIdx && i < endIdx) {
      // In de band: exact paars
      color = purple;
    } else {
      // Buiten de band: bepaal t van 0 (paars dichtbij band) → 1 (groen aan uiterste rand)
      let t;
      if (i < startIdx) {
        t = 1 - (i / startIdx);
      } else {
        t = (i - endIdx) / (cols - endIdx);
      }
      // lineaire interpolatie per kanaal
      color = {
        r: Math.round(purple.r + (green.r - purple.r) * t),
        g: Math.round(purple.g + (green.g - purple.g) * t),
        b: Math.round(purple.b + (green.b - purple.b) * t),
      };
    }
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.fillRect(i * cellSize, 0, cellSize, cellSize);
  }

  return canvas.toDataURL();
}