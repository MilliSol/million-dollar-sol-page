// utils/backgroundGrid.js
const SHAPES = [
  [[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],
  [[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1]],
  [[1,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[1,1],[2,1]]
];

export function generateShapeBackground(width = window.innerWidth, height = window.innerHeight, cellSize = 10) {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  const ctx = canvas.getContext('2d');

  // 1) Vul alles met éénduidige lichte achtergrond
  const baseGray = 230;
  ctx.fillStyle = `rgb(${baseGray},${baseGray},${baseGray})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const occupied = Array(rows).fill().map(() => Array(cols).fill(false));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (occupied[y][x] || Math.random() > 0.2) continue;
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const flip = Math.random() < 0.5;
      const rotated = shape.map(([sx, sy]) => flip ? [sy, sx] : [sx, sy]);
      // check passen
      if (!rotated.every(([sx, sy]) => {
        const nx = x + sx, ny = y + sy;
        return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !occupied[ny][nx];
      })) continue;
      // teken met **random** grijstint per shape-cel
      rotated.forEach(([sx, sy]) => {
        const gray = Math.floor(Math.random() * 15 + 200); // 200–215
        ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
        ctx.fillRect((x+sx)*cellSize, (y+sy)*cellSize, cellSize, cellSize);
        occupied[y+sy][x+sx] = true;
      });
    }
  }

  return canvas.toDataURL();
}