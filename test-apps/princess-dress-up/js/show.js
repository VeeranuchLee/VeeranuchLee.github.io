// Show time, the photo card and the fashion show (PLAN.md 3.2 and 3.4).
//
// Show time: ~4 s, plays once. Stage, a sweeping spotlight, falling sparkles, the
// mid-way transformation glitter over the dress fabric, one gentle twirl, a fanfare, a
// single soft white fade (never a strobe), then the photo card is taken and flies to
// the album. Taps do nothing until the card is taken.
import { drawLook, drawStage, fitDoll, drawDressMask } from './art.js';
import { matchedTheme } from './look.js';
import { play } from './sound.js';

const reducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};

function sizeCanvas(canvas) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, dpr };
}

function off(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function star(ctx, x, y, r, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath();
}

function sparkle(ctx, x, y, r) {
  // a four-point twinkle: reads as light, not a sticker
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

// One scene = stage + doll sprite at a fit, with particles. Shared by Show time and the
// fashion show.
class Scene {
  constructor(data, look, w, h) {
    this.data = data; this.look = look; this.w = w; this.h = h;
    const fit = fitDoll(data, w, h, Math.min(w, h) * 0.06);
    this.fit = fit;
    this.feetY = fit.oy + data.rig.feetY * fit.s;
    this.stage = off(w, h);
    drawStage(this.stage.getContext('2d'), data, look.stage, w, h, this.feetY, fit.s);
    this.doll = off(w, h);
    drawLook(this.doll.getContext('2d'), data, look, fit.ox, fit.oy, fit.s, { stage: false });
    this.mask = off(w, h);
    drawDressMask(this.mask.getContext('2d'), data, look, fit.ox, fit.oy, fit.s);
    this.glitter = off(w, h);
    this.cx = fit.ox + 600 * fit.s;
    this.particles = [];
    this.rand = Math.random;
  }
  spawn(n, rm) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: this.rand() * this.w, y: -20 - this.rand() * this.h * 0.4,
        vy: (rm ? 0.03 : 0.08 + this.rand() * 0.14) * this.h / 1000, r: (4 + this.rand() * 9) * this.w / 800,
        hue: ['#FFFFFF', '#FFF4C9', '#FFD6E7', '#DDF0FF'][Math.floor(this.rand() * 4)], tw: this.rand() * 6,
      });
    }
  }
  draw(ctx, t, { spot = null, glitter = 0, twirl = 0, burst = 0, flash = 0, dim = 0.18, starsCrown = 0, dt = 16 } = {}) {
    const { w, h } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.stage, 0, 0);
    if (spot !== null) {
      ctx.fillStyle = `rgba(30, 10, 50, ${dim})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(spot, h * 0.55, 0, spot, h * 0.55, h * 0.5);
      g.addColorStop(0, 'rgba(255, 246, 216, 0.55)');
      g.addColorStop(1, 'rgba(255, 246, 216, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    // doll (and her glitter) through the twirl transform
    const sx = Math.cos(twirl * Math.PI * 2);
    ctx.translate(this.cx, 0); ctx.scale(Math.abs(sx) < 0.06 ? 0.06 * Math.sign(sx || 1) : sx, 1); ctx.translate(-this.cx, 0);
    ctx.drawImage(this.doll, 0, 0);
    if (glitter > 0) {
      const gctx = this.glitter.getContext('2d');
      gctx.globalCompositeOperation = 'source-over';
      gctx.clearRect(0, 0, w, h);
      gctx.drawImage(this.mask, 0, 0);
      gctx.globalCompositeOperation = 'source-in';
      gctx.fillStyle = 'rgba(255,255,255,0.25)';
      gctx.fillRect(0, 0, w, h);
      gctx.fillStyle = '#FFFFFF';
      const n = 260;
      for (let i = 0; i < n; i++) {
        const px = ((i * 7919) % 1000) / 1000 * w, py = ((i * 104729) % 1000) / 1000 * h;
        const tw = 0.5 + 0.5 * Math.sin(t / 90 + i);
        sparkle(gctx, px, py, (2 + (i % 4) * 2.2) * tw * w / 900);
      }
      ctx.globalAlpha = glitter;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.glitter, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (burst > 0) {
      const by = this.fit.oy + 1050 * this.fit.s;
      const g = ctx.createRadialGradient(this.cx, by, 0, this.cx, by, h * 0.55 * burst + 1);
      g.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - burst)})`);
      g.addColorStop(0.6, `rgba(255,214,231,${0.35 * (1 - burst)})`);
      g.addColorStop(1, 'rgba(255,214,231,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (starsCrown > 0) {
      const cy = this.fit.oy + 150 * this.fit.s, r = 230 * this.fit.s;
      ctx.fillStyle = '#FFE08A'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
      ctx.globalAlpha = starsCrown;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        star(ctx, this.cx + r * Math.cos(a), cy + r * 0.45 * Math.sin(a), 20 * this.fit.s * 2, t / 900);
        ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // falling sparkles
    for (const p of this.particles) {
      p.y += p.vy * dt;
      if (p.y > h + 20) { p.y = -20; p.x = this.rand() * w; }
      ctx.fillStyle = p.hue;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t / 160 + p.tw);
      sparkle(ctx, p.x, p.y, p.r);
    }
    ctx.globalAlpha = 1;
    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }
}

// ---------- the photo card ----------
function dateText(t) {
  try { return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function drawCard(ctx, data, entry, w, h) {
  const look = entry.look;
  const doll = data.dolls.find((d) => d.id === look.doll) || data.dolls[0];
  const u = w / 300;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  // sparkly frame
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#F9B8D3'); g.addColorStop(0.5, '#DCC6F5'); g.addColorStop(1, '#FFE08A');
  roundRect(ctx, 0, 0, w, h, 18 * u); ctx.fillStyle = g; ctx.fill();
  const pad = 14 * u, footer = 56 * u;
  const iw = w - pad * 2, ih = h - pad * 2 - footer;
  ctx.save();
  roundRect(ctx, pad, pad, iw, ih, 12 * u); ctx.clip();
  ctx.translate(pad, pad);
  const fit = fitDoll(data, iw, ih, 4 * u);
  drawStage(ctx, data, look.stage, iw, ih, fit.oy + data.rig.feetY * fit.s, fit.s);
  drawLook(ctx, data, look, fit.ox, fit.oy, fit.s, { stage: false, thumb: w < 400 });
  ctx.restore();
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3 * u;
  roundRect(ctx, pad, pad, iw, ih, 12 * u); ctx.stroke();
  // frame twinkles
  ctx.fillStyle = '#FFFFFF';
  const rnd = (i) => ((i * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 26; i++) {
    const side = i % 4, k = rnd(i + 3);
    const x = side === 0 ? k * w : side === 1 ? w - pad / 2 : side === 2 ? k * w : pad / 2;
    const y = side === 0 ? pad / 2 : side === 1 ? k * (h - footer) : side === 2 ? h - footer + 6 * u : k * (h - footer);
    ctx.globalAlpha = 0.7 + rnd(i) * 0.3;
    sparkle(ctx, x, y, (3 + rnd(i + 9) * 4) * u);
  }
  ctx.globalAlpha = 1;
  // name and date
  ctx.fillStyle = '#5A2E62';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${22 * u}px ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif`;
  ctx.fillText(doll.name, w / 2, h - footer + 22 * u);
  ctx.font = `500 ${13 * u}px ui-rounded, "Trebuchet MS", system-ui, sans-serif`;
  const theme = matchedTheme(data, look);
  ctx.fillText(theme ? `Full coord!  ${dateText(entry.t)}` : dateText(entry.t), w / 2, h - footer + 44 * u);
  ctx.fillStyle = '#FFE08A'; ctx.strokeStyle = '#B98A2B'; ctx.lineWidth = 1.5 * u;
  star(ctx, w / 2 - 70 * u, h - footer + 22 * u, 9 * u); ctx.fill(); ctx.stroke();
  star(ctx, w / 2 + 70 * u, h - footer + 22 * u, 9 * u); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- Show time ----------
// opts: { makeCard: bool, flyTo: () => {x, y} in CSS px, onCard(entry), onTaken(), entry }
export function runShowTime(canvas, data, look, opts = {}) {
  const { w, h, dpr } = sizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const rm = reducedMotion();
  const scene = new Scene(data, look, w, h);
  scene.spawn(rm ? 14 : 46, rm);
  const full = !!matchedTheme(data, look);
  const entry = opts.entry || { id: `c${Date.now().toString(36)}`, t: Date.now(), look: JSON.parse(JSON.stringify(look)) };
  const cw = Math.min(w * 0.5, h * 0.42), ch = cw * 1.5;
  const card = off(cw, ch);
  let cardMade = false, taken = false, last = performance.now(), start = last;
  let raf = 0, stopped = false;
  const T = { spotEnd: 1700, gl0: 1500, gl1: 2600, tw0: 2200, tw1: 3000, flash: 3200, card: 3350, fly0: 3800, fly1: 4300 };
  play('fanfare');
  return new Promise((resolve) => {
    const frame = (now) => {
      if (stopped) return;
      const t = now - start, dt = Math.min(48, now - last);
      last = now;
      const spot = rm ? w / 2 : t < T.spotEnd ? w * (0.15 + 0.7 * (t / T.spotEnd)) : w / 2 + Math.sin((t - T.spotEnd) / 900) * w * 0.08;
      const glitter = t < T.gl0 ? 0 : t < T.gl1 ? Math.sin(((t - T.gl0) / (T.gl1 - T.gl0)) * Math.PI) : 0;
      const burst = t > 1900 && t < 2700 ? (t - 1900) / 800 : 0;
      const twirl = rm ? 0 : t > T.tw0 && t < T.tw1 ? (1 - Math.cos(((t - T.tw0) / (T.tw1 - T.tw0)) * Math.PI)) / 2 : 0;
      // single soft white fade: up over 180 ms, down over 500 ms; never repeats
      const ft = t - T.flash;
      const peak = rm ? 0.35 : 0.72;
      const flash = ft < 0 ? 0 : ft < 180 ? (ft / 180) * peak : ft < 680 ? peak * (1 - (ft - 180) / 500) : 0;
      scene.draw(ctx, t, { spot, glitter, burst, twirl, flash, starsCrown: full && t > 2600 ? Math.min(1, (t - 2600) / 400) : 0, dt });
      if (opts.noCard) {
        if (t >= T.flash + 700) taken = true;
      } else if (t >= T.flash && !cardMade) {
        cardMade = true;
        play('click');
        drawCard(card.getContext('2d'), data, entry, card.width, card.height);
        if (opts.onCard) opts.onCard(entry);
      }
      if (cardMade && !taken) {
        // the card appears, then flies to the album corner
        let x = (w - cw) / 2, y = (h - ch) / 2, sc = 1, a = 1;
        if (t < T.fly0) { const k = Math.min(1, (t - T.card) / 300); sc = 1.15 - 0.15 * Math.max(0, k); a = Math.max(0, k); }
        else {
          const k = Math.min(1, (t - T.fly0) / (T.fly1 - T.fly0));
          const e = k * k * (3 - 2 * k);
          const dest = opts.flyTo ? opts.flyTo() : { x: w / dpr - 60, y: 60 };
          const dx = dest.x * dpr - w / 2, dy = dest.y * dpr - h / 2;
          if (rm) { a = 1 - e; } else { x += dx * e; y += dy * e; sc = 1 - 0.85 * e; }
          if (k >= 1) { taken = true; if (opts.onTaken) opts.onTaken(entry); }
        }
        if (!taken) {
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(sc, sc); ctx.rotate(rm ? 0 : -0.04);
          ctx.shadowColor = 'rgba(60,20,70,0.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
          ctx.drawImage(card, -cw / 2, -ch / 2);
          ctx.restore();
        }
      }
      if (taken) {
        stopped = true;
        cancelAnimationFrame(raf);
        // leave the finished stage on screen, sparkles still, until a tap
        scene.draw(ctx, t, { spot: w / 2, starsCrown: full ? 1 : 0, dt: 0 });
        resolve(entry);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}

// ---------- the fashion show ----------
// Every saved look in turn on its stage, ~4 s each, until stop() is called.
export function runFashionShow(canvas, data, entries) {
  const { w, h } = sizeCanvas(canvas);
  const ctx = canvas.getContext('2d');
  const rm = reducedMotion();
  const PER = 4000;
  let scene = null, prev = null, start = performance.now(), last = start, stopped = false, raf = 0, idx = -1;
  const buf = off(w, h);
  const make = (k) => { const s = new Scene(data, entries[k % entries.length].look, w, h); s.spawn(rm ? 10 : 30, rm); return s; };
  const frame = (now) => {
    if (stopped) return;
    const t = now - start, dt = Math.min(48, now - last);
    last = now;
    const k = Math.floor(t / PER);
    if (k !== idx) { prev = scene; idx = k; scene = make(k); if (k > 0) play('wear'); }
    const lt = t - k * PER;
    const twirl = rm ? 0 : lt > 1600 && lt < 2400 ? (1 - Math.cos(((lt - 1600) / 800) * Math.PI)) / 2 : 0;
    scene.draw(ctx, t, { spot: rm ? w / 2 : w / 2 + Math.sin(t / 700) * w * 0.18, twirl, dt });
    if (prev && lt < 500) {
      // cross-fade from the previous look
      prev.draw(buf.getContext('2d'), t, { spot: w / 2, dt: 0 });
      ctx.globalAlpha = 1 - lt / 500;
      ctx.drawImage(buf, 0, 0);
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
