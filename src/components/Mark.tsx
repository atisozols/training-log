// Copenhagen app mark: black eight-point star on a full-bleed yellow tile.
// Full-bleed so iOS/Android can apply their own corner mask.
function starPoints(size: number, outer: number, inner: number) {
  const c = size / 2;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((-90 + i * 22.5) * Math.PI) / 180;
    pts.push(`${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

export function Mark({ px, maskable = false }: { px: number; maskable?: boolean }) {
  // maskable icons keep the star inside the 80% safe zone
  const outer = px * (maskable ? 0.27 : 0.345);
  const inner = outer * 0.145;
  return (
    <div style={{ width: px, height: px, background: "#EDE65B", display: "flex" }}>
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
        <polygon points={starPoints(px, outer, inner)} fill="#000000" />
      </svg>
    </div>
  );
}
