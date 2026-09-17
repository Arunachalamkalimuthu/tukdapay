/**
 * An SVG path for a QR symbol's dark modules: one rectangle per horizontal run, one unit per
 * module, so it scales crisply to any size. `data` is row by row, `size` × `size` entries.
 */
export function modulesToPath(size: number, data: ArrayLike<number>): string {
  let path = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) x++;
      const run = x - start;
      path += `M${start} ${y}h${run}v1h-${run}z`;
    }
  }
  return path;
}
