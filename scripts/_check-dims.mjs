import { readFileSync } from "node:fs";
const files = process.argv.slice(2);
for (const f of files) {
  const b = readFileSync(f);
  let w, h;
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } else if (b.slice(8, 12).toString() === "WEBP") {
    const c = b.slice(12, 16).toString();
    if (c === "VP8X") { w = (b.readUIntLE(24, 3) & 0xffffff) + 1; h = (b.readUIntLE(27, 3) & 0xffffff) + 1; }
    else if (c === "VP8L") { const n = b.readUInt32LE(21); w = (n & 0x3fff) + 1; h = ((n >> 14) & 0x3fff) + 1; }
    else if (c === "VP8 ") { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
  } else if (b[0] === 0x89) { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
  console.log(f.split(/[\\/]/).pop().padEnd(40), `${w}x${h}`, (w / h).toFixed(2));
}
