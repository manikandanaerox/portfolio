import * as THREE from "three";

/* Procedural textures for the launch: concrete deck, ground, smoke puff. */

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const grain = (g: CanvasRenderingContext2D, w: number, h: number, amp: number, fn?: (x: number, y: number) => number) => {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const x = (i / 4) % w, y = Math.floor(i / 4 / w);
    const n = (Math.random() - 0.5) * amp * (fn ? fn(x, y) : 1);
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
};

/** Concrete deck: slabs with joints and stains. */
export function concrete() {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = "#6c6e70";
  g.fillRect(0, 0, S, S);
  grain(g, S, S, 26);
  for (let i = 0; i < 40; i++) {
    const r = 20 + Math.random() * 90;
    const gr = g.createRadialGradient(Math.random() * S, Math.random() * S, 0, Math.random() * S, Math.random() * S, r);
    gr.addColorStop(0, "rgba(30,30,30,0.18)");
    gr.addColorStop(1, "rgba(30,30,30,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, S, S);
  }
  g.strokeStyle = "rgba(25,25,25,0.6)";
  g.lineWidth = 2;
  for (let k = 0; k <= S; k += S / 4) {
    g.beginPath();
    g.moveTo(k, 0);
    g.lineTo(k, S);
    g.moveTo(0, k);
    g.lineTo(S, k);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Scrubland around the pad. */
export function ground() {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = "#4a4d44";
  g.fillRect(0, 0, S, S);
  grain(g, S, S, 40);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(${30 + Math.random() * 30},${34 + Math.random() * 30},${26 + Math.random() * 20},0.35)`;
    const r = 2 + Math.random() * 14;
    g.beginPath();
    g.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Soft billowing smoke puff (fbm value noise in a radial falloff), as an alpha texture. */
export function puff() {
  const s = 128;
  const [c, g] = canvas(s, s);
  const img = g.createImageData(s, s);
  const grid = (n: number) => {
    const a = new Float32Array((n + 1) * (n + 1));
    for (let i = 0; i < a.length; i++) a[i] = Math.random();
    return (x: number, y: number) => {
      const fx = x * n, fy = y * n;
      const ix = Math.floor(fx), iy = Math.floor(fy);
      const tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => a[Math.min(n, j) * (n + 1) + Math.min(n, i)];
      return (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy;
    };
  };
  const octaves = [grid(4), grid(8), grid(16), grid(32)];
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const u = x / s, v = y / s;
      const r = Math.hypot(u - 0.5, v - 0.5) * 2;
      let n = 0, amp = 0.5;
      for (const o of octaves) {
        n += o(u, v) * amp;
        amp *= 0.5;
      }
      const a = Math.max(0, 1 - r) ** 1.4 * THREE.MathUtils.smoothstep(n, 0.25, 0.75);
      const i = (y * s + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(Math.min(1, a * 1.6) * 255);
    }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}
