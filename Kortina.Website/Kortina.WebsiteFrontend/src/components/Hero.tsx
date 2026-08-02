import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './Hero.css';
const TITLE = 'KORTINA';
const FONT_SIZE = 20;
const LINE_HEIGHT = 24;
const CHAR_WIDTH = 12;
const SURFACE_STEP = 8;
const ATTRACT_PAD = 64;
const FIELD_WORDS = ['orbit', 'space', 'nova', 'pulse', 'drift', 'signal', 'vector', 'gravity', 'nebula', 'quantum', 'light', 'field', 'wave', 'echo', 'flux', 'particle', 'star', 'void', 'cosmos', 'motion', 'inertia', 'force', 'trail', 'glow', 'phase', 'matrix', 'node', 'spark', 'arc', 'beam', 'core', 'lens', 'atlas', 'horizon', 'silent', 'orbiting', 'stellar', 'radiant', 'kinetic', 'soft', 'slow', 'near', 'far', 'open', 'form', 'shape', 'letter', 'word', 'title', 'hero', 'canvas', 'frame', 'pixel', 'line', 'curve', 'path', 'silence', 'ether', 'dust', 'halo', 'ring', 'axis', 'spin', 'tide'];
type Point = {
  x: number;
  y: number;
};
type Role = 'attach' | 'clear' | 'ambient';
type Particle = {
  el: HTMLSpanElement;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
  delay: number;
  role: Role;
};
function nextFieldChar(state: {
  wordIndex: number;
  charInWord: number;
  row: number;
  col: number;
}) {
  let {
    wordIndex,
    charInWord,
    row,
    col
  } = state;
  let current = FIELD_WORDS[wordIndex];
  if (charInWord >= current.length) {
    wordIndex = (wordIndex + 1 + (row + col) % 3) % FIELD_WORDS.length;
    current = FIELD_WORDS[wordIndex];
    charInWord = 0;
    if ((row + col) % 11 === 0) {
      return {
        char: ' ',
        wordIndex,
        charInWord: 0
      };
    }
  }
  return {
    char: current[charInWord],
    wordIndex,
    charInWord: charInWord + 1
  };
}
function sampleTitleField(width: number, height: number, title: string) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true
  });
  if (!ctx) {
    return {
      surface: [] as Point[],
      solid: new Uint8Array(0),
      bounds: {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0
      }
    };
  }
  const fontSize = Math.min(width * 0.2, height * 0.34, 190);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${fontSize}px system-ui, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = `${Math.round(fontSize * 0.04)}px`;
  ctx.fillText(title, width / 2, height / 2);
  const {
    data
  } = ctx.getImageData(0, 0, width, height);
  const solid = new Uint8Array(width * height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 24) continue;
      solid[y * width + x] = 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const padX = Math.round(fontSize * 0.1);
  const padY = Math.round(fontSize * 0.14);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(width - 1, maxX + padX);
  maxY = Math.min(height - 1, maxY + padY);
  const surface: Point[] = [];
  for (let y = minY; y <= maxY; y += SURFACE_STEP) {
    for (let x = minX; x <= maxX; x += SURFACE_STEP) {
      if (!solid[y * width + x]) continue;
      surface.push({
        x: x + (Math.random() - 0.5) * 1.5,
        y: y + (Math.random() - 0.5) * 1.5
      });
    }
  }
  return {
    surface,
    solid,
    bounds: {
      minX,
      minY,
      maxX,
      maxY
    }
  };
}
function isSolidAt(x: number, y: number, solid: Uint8Array, width: number, height: number) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return false;
  return solid[py * width + px] === 1;
}
function buildSurfaceIndex(points: Point[], cellSize: number) {
  const map = new Map<string, number[]>();
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i];
    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
    const bucket = map.get(key);
    if (bucket) bucket.push(i);else map.set(key, [i]);
  }
  const nearest = (x: number, y: number, taken: Uint8Array) => {
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    let best = -1;
    let bestD = Number.POSITIVE_INFINITY;
    for (let ring = 0; ring <= 8; ring += 1) {
      for (let oy = -ring; oy <= ring; oy += 1) {
        for (let ox = -ring; ox <= ring; ox += 1) {
          if (ring > 0 && Math.max(Math.abs(ox), Math.abs(oy)) !== ring) continue;
          const bucket = map.get(`${cx + ox},${cy + oy}`);
          if (!bucket) continue;
          for (let k = 0; k < bucket.length; k += 1) {
            const idx = bucket[k];
            if (taken[idx]) continue;
            const p = points[idx];
            const dx = x - p.x;
            const dy = y - p.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = idx;
            }
          }
        }
      }
      if (best >= 0 && ring >= 1) break;
    }
    return best;
  };
  return {
    nearest
  };
}
export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);
  const builtSizeRef = useRef({
    width: 0,
    height: 0
  });
  useEffect(() => {
    const root = rootRef.current;
    const field = fieldRef.current;
    if (!root || !field) return;
    let disposed = false;
    let resizeTimer: number | undefined;
    const build = () => {
      if (disposed) return;
      const rect = root.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width < 10 || height < 10) return;
      const prev = builtSizeRef.current;
      if (Math.abs(prev.width - width) < 10 && Math.abs(prev.height - height) < 10 && field.childElementCount > 0) {
        return;
      }
      builtSizeRef.current = {
        width,
        height
      };
      tweenRef.current?.kill();
      field.replaceChildren();
      const {
        surface,
        solid,
        bounds
      } = sampleTitleField(width, height, TITLE);
      if (!surface.length) return;
      const surfaceIndex = buildSurfaceIndex(surface, SURFACE_STEP * 2);
      const taken = new Uint8Array(surface.length);
      const cols = Math.ceil(width / CHAR_WIDTH) + 1;
      const rows = Math.ceil(height / LINE_HEIGHT) + 1;
      const diagonalMax = width + height;
      const cells: Array<{
        char: string;
        x: number;
        y: number;
        cx: number;
        cy: number;
      }> = [];
      let wordIndex = 0;
      let charInWord = 0;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const next = nextFieldChar({
            wordIndex,
            charInWord,
            row,
            col
          });
          wordIndex = next.wordIndex;
          charInWord = next.charInWord;
          if (next.char === ' ') continue;
          const x = col * CHAR_WIDTH;
          const y = row * LINE_HEIGHT;
          cells.push({
            char: next.char,
            x,
            y,
            cx: x + CHAR_WIDTH / 2,
            cy: y + LINE_HEIGHT / 2
          });
        }
      }
      const candidates = cells.map((c, i) => {
        const inBand = c.cx > bounds.minX - ATTRACT_PAD && c.cx < bounds.maxX + ATTRACT_PAD && c.cy > bounds.minY - ATTRACT_PAD && c.cy < bounds.maxY + ATTRACT_PAD;
        if (!inBand) return null;
        const mx = (bounds.minX + bounds.maxX) / 2;
        const my = (bounds.minY + bounds.maxY) / 2;
        const d = (c.cx - mx) ** 2 + (c.cy - my) ** 2;
        return {
          i,
          d,
          cx: c.cx,
          cy: c.cy
        };
      }).filter((v): v is {
        i: number;
        d: number;
        cx: number;
        cy: number;
      } => v !== null).sort((a, b) => a.d - b.d);
      const attachMap = new Map<number, Point>();
      for (const item of candidates) {
        const idx = surfaceIndex.nearest(item.cx, item.cy, taken);
        if (idx < 0) continue;
        const p = surface[idx];
        const dist = Math.hypot(item.cx - p.x, item.cy - p.y);
        if (dist > ATTRACT_PAD * 1.35 && attachMap.size > surface.length * 0.55) continue;
        taken[idx] = 1;
        attachMap.set(item.i, p);
        if (attachMap.size >= surface.length) break;
      }
      if (attachMap.size < surface.length) {
        const leftovers = cells.map((c, i) => ({
          i,
          cx: c.cx,
          cy: c.cy
        })).filter(c => !attachMap.has(c.i)).sort((a, b) => {
          const mx = (bounds.minX + bounds.maxX) / 2;
          const my = (bounds.minY + bounds.maxY) / 2;
          return (a.cx - mx) ** 2 + (a.cy - my) ** 2 - ((b.cx - mx) ** 2 + (b.cy - my) ** 2);
        });
        for (const item of leftovers) {
          const idx = surfaceIndex.nearest(item.cx, item.cy, taken);
          if (idx < 0) break;
          taken[idx] = 1;
          attachMap.set(item.i, surface[idx]);
          if (attachMap.size >= surface.length) break;
        }
      }
      const fragment = document.createDocumentFragment();
      const particles: Particle[] = [];
      cells.forEach((cell, i) => {
        const el = document.createElement('span');
        el.className = 'hero-char';
        el.textContent = cell.char;
        el.style.left = `${cell.x}px`;
        el.style.top = `${cell.y}px`;
        const delay = (cell.cx + cell.cy) / diagonalMax * 3.5 + Math.random() * 0.3;
        const attach = attachMap.get(i);
        let role: Role = 'ambient';
        let targetX = (Math.random() - 0.5) * 12;
        let targetY = (Math.random() - 0.5) * 12;
        if (attach) {
          role = 'attach';
          targetX = attach.x - cell.cx;
          targetY = attach.y - cell.cy;
          el.classList.add('is-attached');
        } else {
          const insideTitleBox = cell.cx >= bounds.minX && cell.cx <= bounds.maxX && cell.cy >= bounds.minY && cell.cy <= bounds.maxY;
          const onSolid = isSolidAt(cell.cx, cell.cy, solid, width, height);
          if (insideTitleBox && !onSolid) {
            role = 'clear';
            const mx = (bounds.minX + bounds.maxX) / 2;
            const my = (bounds.minY + bounds.maxY) / 2;
            const awayX = cell.cx - mx;
            const awayY = cell.cy - my;
            const len = Math.hypot(awayX, awayY) || 1;
            targetX = awayX / len * 34 + (Math.random() - 0.5) * 10;
            targetY = awayY / len * 28 + (Math.random() - 0.5) * 10;
            el.classList.add('is-clearing');
          } else {
            el.classList.add('is-ambient');
            el.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 14}px`);
            el.style.setProperty('--drift-y', `${(Math.random() - 0.5) * 14}px`);
            el.style.setProperty('--drift-dur', `${5 + Math.random() * 5}s`);
            el.style.setProperty('--drift-delay', `${Math.random() * 4}s`);
          }
        }
        fragment.appendChild(el);
        particles.push({
          el,
          homeX: cell.x,
          homeY: cell.y,
          targetX,
          targetY,
          delay,
          role
        });
      });
      field.appendChild(fragment);
      const tl = gsap.timeline({
        defaults: {
          overwrite: 'auto'
        }
      });
      tweenRef.current = tl;
      particles.forEach(p => {
        if (p.role === 'attach') {
          const sideX = p.targetX * -0.1 + (Math.random() - 0.5) * 18;
          const sideY = p.targetY * -0.1 + (Math.random() - 0.5) * 18;
          gsap.set(p.el, {
            x: 0,
            y: 0,
            opacity: 0.5
          });
          tl.to(p.el, {
            x: sideX,
            y: sideY,
            opacity: 0.78,
            duration: 1.2 + Math.random() * 0.5,
            ease: 'power1.out'
          }, p.delay);
          tl.to(p.el, {
            x: p.targetX,
            y: p.targetY,
            opacity: 1,
            duration: 2.9 + Math.random() * 1.1,
            ease: 'power2.inOut'
          }, p.delay + 1.0);
          tl.to(p.el, {
            x: `+=${(Math.random() - 0.5) * 3}`,
            y: `+=${(Math.random() - 0.5) * 3}`,
            duration: 3 + Math.random() * 1.8,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
          }, p.delay + 4.1);
          return;
        }
        if (p.role === 'clear') {
          gsap.set(p.el, {
            x: 0,
            y: 0,
            opacity: 0.24
          });
          tl.to(p.el, {
            x: p.targetX * 0.4 + (Math.random() - 0.5) * 8,
            y: p.targetY * 0.4 + (Math.random() - 0.5) * 8,
            opacity: 0.18,
            duration: 1.15 + Math.random() * 0.45,
            ease: 'power1.out'
          }, p.delay * 0.55);
          tl.to(p.el, {
            x: p.targetX,
            y: p.targetY,
            opacity: 0.14,
            duration: 2.1 + Math.random() * 0.8,
            ease: 'power2.inOut'
          }, p.delay * 0.55 + 0.85);
          tl.to(p.el, {
            x: `+=${(Math.random() - 0.5) * 7}`,
            y: `+=${(Math.random() - 0.5) * 7}`,
            duration: 3.8 + Math.random() * 2,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1
          }, p.delay * 0.55 + 3.1);
        }
      });
    };
    const frame = requestAnimationFrame(build);
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 120);
    });
    ro.observe(root);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      ro.disconnect();
      tweenRef.current?.kill();
    };
  }, []);
  return <section className="hero-section" ref={rootRef} aria-label="Hero">
      {}
      <h1 className="hero-title">{TITLE}</h1>
      <div className="hero-field" ref={fieldRef} aria-hidden="true" style={{
      fontSize: FONT_SIZE,
      lineHeight: `${LINE_HEIGHT}px`
    }} />
    </section>;
}