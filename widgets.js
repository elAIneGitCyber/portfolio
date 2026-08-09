/* widgets.js — <live-chart kind="line|bars|gauge"> and <vision-feed mode="detect|segment|anomaly"> */
(function () {
  if (customElements.get('live-chart')) return;
  const css = (name, fb) => {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fb;
  };
  function theme() {
    return { ink: css('--ink', '#161a1e'), muted: css('--muted', '#68727d'), line: css('--line', '#e6eaee'), accent: css('--accent', '#0d94b4'), panel: css('--panel', '#fff'), good: css('--good', '#3fae6a'), bad: css('--bad', '#d95f4c') };
  }
  class BaseCanvas extends HTMLElement {
    connectedCallback() {
      if (this._c) return;
      this.style.display = 'block'; this.style.position = 'relative';
      this.style.width = '100%'; this.style.height = '100%';
      this._c = document.createElement('canvas');
      this._c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      this.appendChild(this._c);
      this._x = this._c.getContext('2d');
      this._ro = new ResizeObserver(() => this._size());
      this._ro.observe(this);
      this._vis = true;
      this._io = new IntersectionObserver((en) => { this._vis = en[0].isIntersecting; });
      this._io.observe(this);
      this._size();
      this._setup && this._setup();
      this._t0 = performance.now();
      const loop = (now) => {
        this._raf = requestAnimationFrame(loop);
        if (!this._vis || !this._w) return;
        this._draw((now - this._t0) / 1000, now);
      };
      this._raf = requestAnimationFrame(loop);
    }
    _size() {
      const d = Math.min(devicePixelRatio, 2);
      this._w = this.clientWidth; this._h = this.clientHeight;
      this._c.width = this._w * d; this._c.height = this._h * d;
      this._x.setTransform(d, 0, 0, d, 0, 0);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect(); if (this._io) this._io.disconnect();
      this.innerHTML = ''; this._c = null;
    }
  }

  class LiveChart extends BaseCanvas {
    _setup() {
      this._kind = this.getAttribute('kind') || 'line';
      if (this._kind === 'line') {
        this._data = [];
        for (let i = 0; i < 80; i++) this._data.push(this._gen(i));
        this._i = 80; this._lastPush = 0;
      } else if (this._kind === 'bars') {
        this._rows = [
          { n: 'PRESS-01', v: 86, t: 86 }, { n: 'FORGE-02', v: 91, t: 91 }, { n: 'CNC-03', v: 74, t: 74 },
          { n: 'LATHE-04', v: 88, t: 88 }, { n: 'INSPECT-05', v: 95, t: 95 }, { n: 'CONVEY-06', v: 81, t: 81 },
        ];
        this._lastT = 0;
      } else { this._val = 82.4; this._tgt = 82.4; this._lastT = 0; }
    }
    _gen(i) {
      const idle = Math.floor(i / 34) % 3 === 2 && i % 34 < 7;
      return (idle ? 13 : 38) + 8 * Math.sin(i * 0.32) + 4 * Math.sin(i * 0.11 + 2) + Math.random() * 3.4;
    }
    _draw(t, now) {
      const th = theme(), x = this._x, W = this._w, H = this._h;
      x.clearRect(0, 0, W, H);
      x.font = '10px "IBM Plex Mono", monospace';
      if (this._kind === 'line') {
        if (now - this._lastPush > 700) { this._lastPush = now; this._data.push(this._gen(this._i++)); this._data.shift(); }
        const P = { l: 38, r: 14, t: 12, b: 22 }, iw = W - P.l - P.r, ih = H - P.t - P.b;
        const max = 64;
        x.strokeStyle = th.line; x.fillStyle = th.muted; x.lineWidth = 1;
        for (let gvl = 0; gvl <= 60; gvl += 20) {
          const y = P.t + ih - (gvl / max) * ih;
          x.beginPath(); x.moveTo(P.l, y); x.lineTo(W - P.r, y); x.stroke();
          x.fillText(gvl + '', P.l - 26, y + 3);
        }
        x.fillText('kW', 6, P.t + 4);
        const pts = this._data.map((v, i) => [P.l + (i / (this._data.length - 1)) * iw, P.t + ih - (Math.min(v, max) / max) * ih]);
        const grad = x.createLinearGradient(0, P.t, 0, P.t + ih);
        grad.addColorStop(0, th.accent + '55'); grad.addColorStop(1, th.accent + '00');
        x.beginPath(); x.moveTo(pts[0][0], P.t + ih);
        pts.forEach((p) => x.lineTo(p[0], p[1]));
        x.lineTo(pts[pts.length - 1][0], P.t + ih); x.closePath();
        x.fillStyle = grad; x.fill();
        x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
        x.strokeStyle = th.accent; x.lineWidth = 1.8; x.stroke();
        const lp = pts[pts.length - 1];
        x.fillStyle = th.accent; x.beginPath(); x.arc(lp[0], lp[1], 3.2, 0, 7); x.fill();
        x.fillStyle = th.ink; x.font = '600 11px "IBM Plex Mono",monospace';
        const lastV = this._data[this._data.length - 1].toFixed(1);
        x.fillText(lastV + ' kW', Math.min(lp[0] - 20, W - 70), lp[1] - 10);
        x.fillStyle = th.muted; x.font = '10px "IBM Plex Mono",monospace';
        x.fillText('LIVE FEED · CT SENSORS · 1s', P.l, H - 7);
      } else if (this._kind === 'bars') {
        if (now - this._lastT > 2600) { this._lastT = now; this._rows.forEach((r) => { r.t = clamp2(r.t + (Math.random() * 14 - 7), 58, 97); }); }
        const rows = this._rows, rh = H / rows.length;
        rows.forEach((r, i) => {
          r.v += (r.t - r.v) * 0.04;
          const y = i * rh + rh / 2;
          x.fillStyle = th.muted; x.font = '10px "IBM Plex Mono",monospace';
          x.fillText(r.n, 0, y + 3);
          const bx = 76, bw = W - bx - 44;
          x.fillStyle = th.line; rRect(x, bx, y - 3.5, bw, 7, 3.5); x.fill();
          x.fillStyle = r.v < 70 ? th.bad : th.accent;
          rRect(x, bx, y - 3.5, bw * (r.v / 100), 7, 3.5); x.fill();
          x.fillStyle = th.ink; x.font = '600 10px "IBM Plex Mono",monospace';
          x.fillText(r.v.toFixed(0) + '%', W - 34, y + 3);
        });
      } else {
        if (now - this._lastT > 3000) { this._lastT = now; this._tgt = clamp2(this._tgt + (Math.random() * 5 - 2.5), 75, 90); }
        this._val += (this._tgt - this._val) * 0.03;
        const cx = W / 2, cy = H / 2 + 4, r = Math.min(W, H) / 2 - 16;
        const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
        x.lineWidth = 8; x.lineCap = 'round';
        x.strokeStyle = th.line;
        x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke();
        x.strokeStyle = th.accent;
        x.beginPath(); x.arc(cx, cy, r, a0, a0 + (a1 - a0) * (this._val / 100)); x.stroke();
        x.fillStyle = th.ink; x.font = '600 20px "Space Grotesk",sans-serif'; x.textAlign = 'center';
        x.fillText(this._val.toFixed(1) + '%', cx, cy + 2);
        x.fillStyle = th.muted; x.font = '8.5px "IBM Plex Mono",monospace';
        x.fillText('OEE', cx, cy + 16);
        x.fillText('AVAILABILITY', cx, cy + r + 4);
        x.textAlign = 'start';
      }
    }
  }
  const clamp2 = (v, a, b) => Math.min(b, Math.max(a, v));
  const rRect = (x, a, b, w, h, r) => { x.beginPath(); x.roundRect(a, b, Math.max(w, 0.01), h, r); };

  class VisionFeed extends BaseCanvas {
    _setup() {
      this._parts = []; this._lastSpawn = 0; this._stats = { total: 0, ng: 0 }; this._lastStat = 0;
    }
    _draw(t, now) {
      const x = this._x, W = this._w, H = this._h;
      const mode = this.getAttribute('mode') || 'detect';
      // camera-feed background (always dark)
      x.fillStyle = '#0c0f13'; x.fillRect(0, 0, W, H);
      // conveyor
      const cy = H * 0.58;
      x.strokeStyle = '#232a33'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, cy - 52); x.lineTo(W, cy - 52); x.stroke();
      x.beginPath(); x.moveTo(0, cy + 52); x.lineTo(W, cy + 52); x.stroke();
      x.strokeStyle = '#1a2027'; x.lineWidth = 1;
      const off = (t * 60) % 34;
      for (let bx = -34 + off; bx < W; bx += 34) {
        x.beginPath(); x.moveTo(bx, cy - 52); x.lineTo(bx - 12, cy + 52); x.stroke();
      }
      // spawn
      if (now - this._lastSpawn > 1500) {
        this._lastSpawn = now;
        this._parts.push({ x: -40, y: cy + (Math.random() * 20 - 10), r: 24 + Math.random() * 6, ng: Math.random() < 0.18, s: 0.9 + Math.random() * 0.08, a: Math.random() * 6 });
      }
      // parts
      for (const p of this._parts) {
        p.x += 62 * (1 / 60) * 2.1;
        x.save(); x.translate(p.x, p.y); x.rotate(p.a);
        x.fillStyle = '#1b222b'; x.strokeStyle = '#39434f'; x.lineWidth = 2;
        x.beginPath(); x.arc(0, 0, p.r, 0, 7); x.fill(); x.stroke();
        x.fillStyle = '#0c0f13'; x.beginPath(); x.arc(0, 0, p.r * 0.42, 0, 7); x.fill();
        x.strokeStyle = '#2a323c'; x.beginPath(); x.arc(0, 0, p.r * 0.72, 0, 7); x.stroke();
        if (p.ng) { x.fillStyle = '#3a2724'; x.beginPath(); x.ellipse(p.r * 0.55, -p.r * 0.3, 6, 3.4, 0.6, 0, 7); x.fill(); }
        x.restore();
        // overlays
        const col = p.ng ? '#f27a68' : '#4ade80';
        const label = p.ng ? 'NG ' + (0.88 + p.s * 0.05).toFixed(2) : 'OK ' + (0.9 + p.s * 0.09).toFixed(2);
        if (mode === 'detect') {
          const b = p.r + 9;
          x.strokeStyle = col; x.lineWidth = 1.5;
          corner(x, p.x - b, p.y - b, b * 2, 10);
          x.fillStyle = col; x.font = '600 10px "IBM Plex Mono",monospace';
          x.fillText(label, p.x - b, p.y - b - 6);
        } else if (mode === 'segment') {
          x.save(); x.translate(p.x, p.y); x.rotate(p.a);
          x.fillStyle = col + '3d'; x.strokeStyle = col; x.lineWidth = 1.5;
          x.beginPath(); x.arc(0, 0, p.r, 0, 7); x.arc(0, 0, p.r * 0.42, 0, 7, true); x.fill('evenodd'); 
          x.beginPath(); x.arc(0, 0, p.r, 0, 7); x.stroke();
          x.restore();
          x.fillStyle = col; x.font = '600 10px "IBM Plex Mono",monospace';
          x.fillText((p.ng ? 'ring · defect' : 'ring · clean'), p.x - p.r, p.y - p.r - 8);
        } else { // anomaly
          if (p.ng) {
            const gx = p.x + p.r * 0.5, gy = p.y - p.r * 0.28;
            const rg = x.createRadialGradient(gx, gy, 2, gx, gy, 26);
            rg.addColorStop(0, '#ff5a4addd'.slice(0, 9)); rg.addColorStop(0, '#ff5a4add'); rg.addColorStop(1, '#ff5a4a00');
            x.fillStyle = rg; x.beginPath(); x.arc(gx, gy, 26, 0, 7); x.fill();
            x.fillStyle = '#f27a68'; x.font = '600 10px "IBM Plex Mono",monospace';
            x.fillText('ANOMALY 0.93', p.x - p.r, p.y - p.r - 8);
          } else {
            x.fillStyle = '#5b8a6d'; x.font = '10px "IBM Plex Mono",monospace';
            x.fillText('AE 0.04', p.x - p.r, p.y - p.r - 8);
          }
        }
        if (p.x - p.r > W && !p.counted) {
          p.counted = true; this._stats.total++; if (p.ng) this._stats.ng++;
          this.dispatchEvent(new CustomEvent('vision-stats', { bubbles: true, composed: true, detail: Object.assign({}, this._stats) }));
        }
      }
      this._parts = this._parts.filter((p) => p.x - p.r < W + 60);
      // grid overlay for anomaly mode
      if (mode === 'anomaly') {
        x.strokeStyle = '#ffffff08'; x.lineWidth = 1;
        for (let gx = 0; gx < W; gx += 40) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
        for (let gy = 0; gy < H; gy += 40) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
      }
      // HUD
      x.fillStyle = '#93a4b5'; x.font = '10px "IBM Plex Mono",monospace';
      x.fillText('CAM-01 · FORGE LINE · ' + mode.toUpperCase(), 12, 18);
      x.fillText('24 FPS', W - 92, 18);
      x.fillStyle = (t % 1.2) < 0.7 ? '#f25a4a' : '#5a2622';
      x.beginPath(); x.arc(W - 106, 14.5, 3.4, 0, 7); x.fill();
      x.fillStyle = '#5c6a78';
      x.fillText('JETSON NANO · TENSORRT', 12, H - 12);
      // subtle noise
      x.fillStyle = '#ffffff06';
      for (let i = 0; i < 26; i++) x.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }
  }
  function corner(x, a, b, s, l) {
    const pts = [[a, b], [a + s, b], [a, b + s], [a + s, b + s]];
    x.beginPath();
    x.moveTo(a, b + l); x.lineTo(a, b); x.lineTo(a + l, b);
    x.moveTo(a + s - l, b); x.lineTo(a + s, b); x.lineTo(a + s, b + l);
    x.moveTo(a + s, b + s - l); x.lineTo(a + s, b + s); x.lineTo(a + s - l, b + s);
    x.moveTo(a + l, b + s); x.lineTo(a, b + s); x.lineTo(a, b + s - l);
    x.stroke();
  }
  customElements.define('live-chart', LiveChart);
  customElements.define('vision-feed', VisionFeed);
})();
