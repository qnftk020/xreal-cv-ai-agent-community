/* 장면 엔진: 1주차 원본 「LLM 작동 원리 애니메이션」에서 옮겼다. 각 주차의 scenes.js가 scene({...})으로 장면을 등록한다. */
'use strict';
/* 장면 엔진: 모든 상태는 시간 t의 순수 함수다. update(t)를 부르면 그 순간의 그림이 된다. */
const NS = 'http://www.w3.org/2000/svg';
const SCENES = [];
function scene(def) { SCENES.push(def); }
function mk(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (v !== undefined && v !== null) e.setAttribute(k, v); }
  if (parent) parent.appendChild(e);
  return e;
}
const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const prog = (t, t0, t1) => (t <= t0 ? 0 : t >= t1 ? 1 : (t - t0) / (t1 - t0));
const MINFS = 10.5;
const node = (g, x, y, w, h) => ({ g, x, y, w, h, cx: x + w / 2, cy: y + h / 2, t: [x + w / 2, y], b: [x + w / 2, y + h], l: [x, y + h / 2], r: [x + w, y + h / 2] });

class Scene {
  constructor(svg, dur) {
    this.svg = svg; this.dur = dur; this.tr = []; this.fits = []; this.iv = [];
    this.root = mk('g', null, svg); this.top = mk('g', null, svg);
  }
  update(t) { for (const f of this.tr) f(t); }

  /* ---------- 그리기 ---------- */
  text(x, y, str, o = {}) {
    const fs = Math.max(MINFS, o.fs || 13);
    const t = mk('text', { x, y, 'font-size': fs, 'font-weight': o.fw || 500, 'text-anchor': o.anchor || 'middle', class: 'tx' + (o.cls ? ' ' + o.cls : '') }, o.parent || this.root);
    t.textContent = str;
    if (o.maxw) this.fits.push([t, o.maxw, fs]);
    return t;
  }
  rich(x, y, parts, o = {}) {
    const fs = Math.max(MINFS, o.fs || 13);
    const t = mk('text', { x, y, 'font-size': fs, 'font-weight': o.fw || 500, 'text-anchor': o.anchor || 'middle', class: 'tx' }, o.parent || this.root);
    parts.forEach(p => { const s = mk('tspan', { class: p[1] || null, 'font-weight': p[2] || null }, t); s.textContent = p[0]; });
    if (o.maxw) this.fits.push([t, o.maxw, fs]);
    return t;
  }
  lines(x, y, arr, o = {}) {
    const lh = o.lh || (o.fs || 13) * 1.55;
    return arr.map((s, i) => this.text(x, y + i * lh, s, Object.assign({ anchor: 'start' }, o)));
  }
  box(x, y, w, h, label, o = {}) {
    const g = mk('g', { class: 'bx' + (o.cls ? ' ' + o.cls : '') }, o.parent || this.root);
    mk('rect', { x, y, width: w, height: h, rx: o.rx || 0 }, g);
    const n = node(g, x, y, w, h);
    const fs = o.fs || 15, sfs = o.sfs || 11.5, pad = o.pad == null ? 8 : o.pad;
    const rows = [];
    if (label !== undefined && label !== '') String(label).split('\n').forEach(s => rows.push([s, fs, o.fw || 700, 'lb' + (o.mono ? ' mono' : '')]));
    if (o.sub) String(o.sub).split('\n').forEach(s => rows.push([s, sfs, 500, 'sb']));
    const hs = rows.map(r => r[1] * 1.3);
    let yy = n.cy - hs.reduce((a, b) => a + b, 0) / 2;
    const anchor = o.anchor || 'middle';
    const ax = anchor === 'start' ? x + pad + 2 : x + w / 2;
    n.tx = rows.map((r, i) => { const t = this.text(ax, yy + hs[i] / 2, r[0], { fs: r[1], fw: r[2], cls: r[3], anchor, parent: g, maxw: w - pad * 2 }); yy += hs[i]; return t; });
    return n;
  }
  /* 머리글과 여러 줄 본문이 있는 문서형 상자 */
  doc(x, y, w, h, head, rows, o = {}) {
    const n = this.box(x, y, w, h, '', o);
    const fs = o.fs || 12, lh = o.lh || fs * 1.6, px = x + 12;
    let yy = y + 18;
    if (head) { n.head = this.text(px, yy, head, { fs: 11, fw: 700, cls: 'sub', anchor: 'start', parent: n.g, maxw: w - 24 }); yy += o.gap || 26; }
    n.rows = rows.map((r, i) => {
      const s = typeof r === 'string' ? { t: r } : r;
      const tn = this.text(px + (s.ind || 0), yy + i * lh, s.t, { fs: s.fs || fs, fw: s.fw || 500, cls: s.cls, anchor: 'start', parent: n.g, maxw: w - 24 - (s.ind || 0) });
      if (s.mono) tn.classList.add('mono');
      return tn;
    });
    return n;
  }
  circ(cx, cy, r, label, o = {}) {
    const g = mk('g', { class: 'bx' + (o.cls ? ' ' + o.cls : '') }, o.parent || this.root);
    mk('circle', { cx, cy, r }, g);
    const n = node(g, cx - r, cy - r, 2 * r, 2 * r);
    n.tx = [this.text(cx, cy, label, { fs: o.fs || 15, fw: 700, cls: 'lb', parent: g })];
    return n;
  }
  wire(pts, o = {}) {
    const d = 'M' + pts.map(p => p[0] + ',' + p[1]).join(' L');
    return mk('path', { d, class: 'wr' + (o.arrow === false ? '' : ' ar') + (o.cls ? ' ' + o.cls : '') }, o.parent || this.root);
  }
  path(d, o = {}) { return mk('path', { d, class: 'wr' + (o.arrow === false ? '' : ' ar') + (o.cls ? ' ' + o.cls : '') }, o.parent || this.root); }
  hv(a, b, o = {}) { const m = o.mx !== undefined ? o.mx : (a[0] + b[0]) / 2; return this.wire(a[1] === b[1] ? [a, b] : [a, [m, a[1]], [m, b[1]], b], o); }
  vh(a, b, o = {}) { const m = o.my !== undefined ? o.my : (a[1] + b[1]) / 2; return this.wire(a[0] === b[0] ? [a, b] : [a, [a[0], m], [b[0], m], b], o); }
  hL(a, b, o = {}) { return this.wire([a, [b[0], a[1]], b], o); }
  vL(a, b, o = {}) { return this.wire([a, [a[0], b[1]], b], o); }
  rect(x, y, w, h, cls, parent) { return mk('rect', { x, y, width: w, height: h, class: cls || '' }, parent || this.root); }
  line(x1, y1, x2, y2, cls, parent) { return mk('line', { x1, y1, x2, y2, class: cls || 'rule' }, parent || this.root); }
  group(cls, parent) { return mk('g', { class: cls || '' }, parent || this.root); }
  cells(x, y, n, size, gap, cls, parent) { const out = []; for (let i = 0; i < n; i++) out.push(this.rect(x + i * (size + gap), y, size, size, 'cell' + (cls ? ' ' + cls : ''), parent)); return out; }
  /* 결과 상자가 나타나기 전 자리를 점선으로 비워 둔다 */
  slot(ns) { [].concat(ns).forEach(n => { const r = mk('rect', { x: n.x, y: n.y, width: n.w, height: n.h, class: 'slot' }); n.g.parentNode.insertBefore(r, n.g); }); }
  xmark(cx, cy, s) { const g = mk('g', null, this.top); const h = s / 2; this.line(cx - h, cy - h, cx + h, cy + h, 'xm', g); this.line(cx - h, cy + h, cx + h, cy - h, 'xm', g); return g; }
  img(x, y, w, h, kind) {
    const g = mk('g', null, this.root);
    mk('rect', { x, y, width: w, height: h, class: 'icon' }, g);
    if (kind === 'xray') {
      mk('ellipse', { cx: x + w * 0.33, cy: y + h * 0.53, rx: w * 0.15, ry: h * 0.3, class: 'icon-l' }, g);
      mk('ellipse', { cx: x + w * 0.67, cy: y + h * 0.53, rx: w * 0.15, ry: h * 0.3, class: 'icon-l' }, g);
      mk('path', { d: `M${x + w / 2},${y + h * 0.14} V${y + h * 0.88}`, class: 'icon-l' }, g);
    } else if (kind === 'cat') {
      const cx = x + w / 2, cy = y + h * 0.58, r = Math.min(w, h) * 0.26;
      mk('path', { d: `M${cx - r * 0.95},${cy - r * 0.4} L${cx - r * 0.78},${cy - r * 1.4} L${cx - r * 0.2},${cy - r * 0.93} Z M${cx + r * 0.95},${cy - r * 0.4} L${cx + r * 0.78},${cy - r * 1.4} L${cx + r * 0.2},${cy - r * 0.93} Z`, class: 'icon-l' }, g);
      mk('circle', { cx, cy, r, class: 'icon-l' }, g);
      mk('circle', { cx: cx - r * 0.38, cy: cy - r * 0.1, r: Math.max(1.2, r * 0.1), class: 'icon-d' }, g);
      mk('circle', { cx: cx + r * 0.38, cy: cy - r * 0.1, r: Math.max(1.2, r * 0.1), class: 'icon-d' }, g);
    } else {
      mk('circle', { cx: x + w * 0.72, cy: y + h * 0.3, r: Math.min(w, h) * 0.1, class: 'icon-l' }, g);
      mk('path', { d: `M${x + w * 0.1},${y + h * 0.84} L${x + w * 0.38},${y + h * 0.46} L${x + w * 0.57},${y + h * 0.7} L${x + w * 0.71},${y + h * 0.56} L${x + w * 0.9},${y + h * 0.84} Z`, class: 'icon-l' }, g);
    }
    return node(g, x, y, w, h);
  }

  /* ---------- 시간축 ---------- */
  /* 한 요소의 같은 클래스에 여러 시간 창이 겹쳐도 하나라도 켜져 있으면 켠다 */
  _win(e, name, t0, t1, invert, rec = true) {
    e.__w = e.__w || {};
    let list = e.__w[name];
    if (!list) {
      list = e.__w[name] = [];
      let s;
      this.tr.push(t => {
        let v = false;
        for (const w of list) if (t >= w[0] && t < w[1]) { v = true; break; }
        if (v !== s) { s = v; e.classList.toggle(name, invert ? !v : v); }
      });
    }
    list.push([t0, t1]);
    if (rec) { if (t0 > 0.05) this.iv.push([t0, t0 + 0.3, 0]); if (t1 < this.dur) this.iv.push([t1, t1 + 0.3, 0]); }
  }
  _toggle(ns, name, t0, t1, invert) {
    [].concat(ns).forEach(n => { const e = n && (n.g || n); if (e) this._win(e, name, t0, t1, invert); });
  }
  hl(ns, t0, t1 = 1e9) { this._toggle(ns, 'on', t0, t1); }
  cls(ns, name, t0, t1 = 1e9) { this._toggle(ns, name, t0, t1); }
  vis(ns, t0, t1 = 1e9) { [].concat(ns).forEach(n => { const e = n.g || n; e.classList.add('fade', 'hid'); }); this._toggle(ns, 'hid', t0, t1, true); }
  dot(p, t0, t1, o = {}) {
    const c = mk('circle', { r: o.r || 6, class: 'dt' }, this.top);
    c.style.display = 'none';
    let L = null;
    if (o.lit !== false) this._win(p, 'on', t0, t1 + 0.3, false, false);
    this.iv.push([t0, t1, 1]);
    this.tr.push(t => {
      if (t < t0 || t >= t1) { if (c.style.display !== 'none') c.style.display = 'none'; return; }
      if (L === null) L = p.getTotalLength();
      let k = ease((t - t0) / (t1 - t0));
      const q = p.getPointAtLength(k * L);
      c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1));
      if (o.shrink) { c.setAttribute('r', ((o.r || 6) * (1 - k * o.shrink[0])).toFixed(2)); c.style.opacity = (1 - k * o.shrink[1]).toFixed(2); }
      if (c.style.display === 'none') c.style.display = '';
    });
    return c;
  }
  bar(x, y, w, h, t0, t1, o = {}) {
    const r = this.rect(x, y, 0, h, 'br' + (o.cls ? ' ' + o.cls : ''), o.parent);
    this.iv.push([t0, t1, 1]);
    this.tr.push(t => r.setAttribute('width', (w * ease(prog(t, t0, t1))).toFixed(1)));
    return r;
  }
  vbar(x, base, w, h, t0, t1, o = {}) {
    const r = this.rect(x, base, w, 0, 'br' + (o.cls ? ' ' + o.cls : ''), o.parent);
    this.iv.push([t0, t1, 1]);
    this.tr.push(t => { const hh = h * ease(prog(t, t0, t1)); r.setAttribute('y', (base - hh).toFixed(1)); r.setAttribute('height', hh.toFixed(1)); });
    return r;
  }
  type(tn, t0, t1) {
    const ch = [...tn.textContent];
    tn.__full = tn.textContent;
    this.iv.push([t0, t1, 1]);
    this.tr.push(t => { const n = Math.round(ch.length * prog(t, t0, t1)); const s = ch.slice(0, n).join(''); if (tn.textContent !== s) tn.textContent = s; });
  }
  num(tn, a, b, t0, t1, fmt) {
    fmt = fmt || (v => v.toFixed(2));
    this.iv.push([t0, t1, 1]);
    this.tr.push(t => { const s = fmt(a + (b - a) * ease(prog(t, t0, t1))); if (tn.textContent !== s) tn.textContent = s; });
  }
  draw(p, t0, t1) {
    let L = null;
    this.iv.push([t0, t1, 1]);
    this.tr.push(t => {
      if (L === null) { L = p.getTotalLength(); p.style.strokeDasharray = L + ' ' + L; }
      const k = ease(prog(t, t0, t1));
      p.style.strokeDashoffset = (L * (1 - k)).toFixed(1);
      p.classList.toggle('nomk', k < 0.97);
    });
  }
  at(f) { this.tr.push(f); }
  /* at()으로 만든 움직임은 여기서 시간 구간을 알려 준다 */
  motion(t0, t1) { this.iv.push([t0, t1, 1]); }
  /* 동작 경계: 움직이는 점·막대·글자가 하나도 진행 중이 아닌 순간만 고르고, 0.45초 안으로 붙은 경계는 하나로 합친다 */
  cue(list) { this.cues = list; }
  steps() {
    if (this.cues) return this.cues.filter(c => c > 0 && c <= this.dur).sort((x, y) => x - y);
    const iv = this.iv.filter(v => v[0] < this.dur), mv = iv.filter(v => v[2]);
    const cand = [...new Set(iv.map(v => Math.round(Math.min(v[1], this.dur) * 100) / 100))].sort((a, b) => a - b);
    const ok = cand.filter(c => c > 0.1 && !mv.some(v => v[0] + 0.02 < c && c < v[1] - 0.02));
    const out = [];
    for (const c of ok) { if (out.length && c - out[out.length - 1] < 0.45) out[out.length - 1] = c; else out.push(c); }
    return out;
  }
  fit() {
    for (const [t, maxw, fs] of this.fits) {
      const cur = t.textContent; if (t.__full) t.textContent = t.__full;
      t.setAttribute('font-size', fs);
      let len = 0; try { len = t.getComputedTextLength(); } catch (e) { len = 0; }
      if (t.__full) t.textContent = cur;
      if (len > maxw && len > 0) t.setAttribute('font-size', Math.max(8, fs * maxw / len).toFixed(2));
    }
  }
}

