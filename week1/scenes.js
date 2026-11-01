/* 원본 「LLM 작동 원리 애니메이션」의 장면 엔진과 32개 장면 정의를 그대로 옮겼다. */
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

/* 언어 모델: 5, 6, 7, 8, 10쪽 */
scene({
  sec: 'lm', page: 5, kind: '구조도', title: 'n-gram 언어 모델', dur: 6,
  cap: '앞의 두 단어만 문맥으로 잘라 말뭉치에서 센 횟수로 다음 단어의 확률을 구한다. 그보다 앞의 단어는 계산에 쓰지 않는다(마르코프 가정).',
  build(S) {
    S.cue([0.95, 1.55, 3.45, 4.6]);
    const ws = [['나는', 70, '보지 않음', 1], ['어제', 70, '보지 않음', 1], ['학교에서', 100, '문맥 w(t−2)', 0], ['밥을', 80, '문맥 w(t−1)', 0], ['?', 80, '예측할 w(t)', 0]];
    let x = 92; const B = [];
    ws.forEach(w => { B.push(S.box(x, 40, w[1], 44, w[0], { cls: w[3] ? 'muted' : '' })); S.text(x + w[1] / 2, 100, w[2], { fs: 11.5, cls: w[3] ? 'sub' : '' }); x += w[1] + 14; });
    const win = S.rect(252, 30, 210, 62, 'win');
    const wl = S.text(357, 16, '트라이그램(n = 3): 앞의 두 단어만 본다', { fs: 12, fw: 700, cls: 'acc' });
    S.vis([win, wl], 0.4); S.hl([B[2], B[3]], 0.4, 3.4);
    const f = S.text(320, 140, 'P(w | 학교에서, 밥을) = C(학교에서 밥을 w) ÷ C(학교에서 밥을)', { fs: 13.5, fw: 700, maxw: 600 });
    S.vis(f, 1.0);
    const rows = [['먹었다', 0.6, 60], ['샀다', 0.25, 25], ['치웠다', 0.15, 15]];
    const bars = [], labs = [];
    rows.forEach((r, i) => {
      const y = 176 + i * 40, t0 = 1.6 + i * 0.4;
      labs.push(S.text(150, y + 12, r[0], { fs: 14, fw: 700, anchor: 'end' }));
      S.rect(162, y, 300, 24, 'track');
      bars.push(S.bar(162, y, 300 * r[1], 24, t0, t0 + 0.8));
      S.vis(S.text(472, y + 12, r[1].toFixed(2) + '  (' + r[2] + ' ÷ 100)', { fs: 12.5, fw: 700, anchor: 'start' }), t0 + 0.8);
    });
    S.vis(S.text(320, 314, 'C(·)는 말뭉치에서 그 단어열이 나온 횟수 · 수치는 예시 값', { fs: 11.5, cls: 'sub' }), 1.6);
    S.cls(bars[0], 'acc', 3.5); S.cls(labs[0], 'acc', 3.5);
    const p = S.wire([[576, 188], [606, 188], [606, 62], [550, 62]], { cls: 'inv' });
    S.dot(p, 3.6, 4.3);
    S.vis(S.box(468, 40, 80, 44, '먹었다', { cls: 'solid', fs: 14 }), 4.3);
  }
});

scene({
  sec: 'lm', page: 6, kind: '구조도', title: '신경망 언어 모델 NPLM', dur: 6.5,
  cap: '앞의 세 단어를 같은 행렬 C에서 특징 벡터로 꺼내 이어 붙이고, tanh 은닉층과 softmax를 거쳐 다음 단어의 확률을 낸다. C와 신경망 가중치를 함께 학습하므로 비슷한 문맥에 쓰이는 단어는 비슷한 벡터를 갖게 된다.',
  build(S) {
    S.cue([1.55, 2.5, 3.55, 4.55, 5.3]);
    const words = [['나는', 'w(t−3)'], ['학교에서', 'w(t−2)'], ['밥을', 'w(t−1)']], ys = [72, 152, 232];
    const ins = words.map((w, i) => S.box(16, ys[i] - 22, 90, 44, w[0], { sub: w[1], fs: 14 }));
    const C = S.box(134, 40, 80, 224, '행렬 C', { sub: '|V| × m\n세 단어가 공유', fs: 15, sfs: 11 });
    const look = ins.map((n, i) => S.wire([n.r, [134, ys[i]]]));
    ys.forEach(y => S.wire([[214, y], [232, y]], { arrow: false }));
    const vecs = ys.map(y => S.cells(234, y - 6, 4, 12, 2, 'f'));
    S.text(336, 58, 'x · 길이 3m', { fs: 11.5, fw: 700 });
    const cc = []; for (let i = 0; i < 12; i++) cc.push(S.rect(330, 72 + i * 14, 12, 12, 'cell f'));
    const gy = [99, 155, 211];
    const cw = ys.map((y, i) => S.hv([290, y], [328, gy[i]], { mx: 310 }));
    const H = S.box(372, 132, 90, 46, '은닉층', { sub: 'tanh(d + Hx)', fs: 14 });
    const SM = S.box(490, 132, 92, 46, 'softmax', { sub: '|V|개 단어 확률', fs: 14 });
    const w1 = S.wire([[342, 155], [372, 155]]);
    const w2 = S.wire([H.r, SM.l]);
    const Wd = S.wire([[342, 80], [536, 80], [536, 132]], { cls: 'dash thin' });
    S.text(440, 69, '직접 연결 W (선택)', { fs: 11, cls: 'sub' });
    const out = S.box(490, 222, 92, 40, '먹었다', { cls: 'solid', fs: 14 }); S.slot(out);
    const w3 = S.wire([SM.b, [536, 222]]);
    S.text(320, 322, 'y = b + Wx + U·tanh(d + Hx),   P(w(t) | 앞 단어들) = softmax(y)', { fs: 13, fw: 700, maxw: 600 });
    ins.forEach((n, i) => { S.hl(n, 0.2 + i * 0.2, 0.9 + i * 0.2); S.dot(look[i], 0.2 + i * 0.2, 0.7 + i * 0.2); });
    S.hl(C, 0.5, 1.6);
    vecs.forEach((v, i) => S.vis(v, 1.0 + i * 0.2));
    cw.forEach((p, i) => S.dot(p, 1.6 + i * 0.1, 2.2 + i * 0.1));
    [0, 1, 2].forEach(g => S.vis(cc.slice(g * 4, g * 4 + 4), 2.0 + g * 0.15));
    S.dot(w1, 2.6, 3.0); S.hl(H, 2.9, 3.7);
    S.dot(Wd, 2.6, 3.5, { r: 4 });
    S.dot(w2, 3.6, 4.0); S.hl(SM, 3.9, 4.8);
    S.dot(w3, 4.6, 5.0); S.vis(out, 5.0);
  }
});

scene({
  sec: 'lm', page: 7, kind: '구조도', title: '순환 신경망 RNN', dur: 7,
  cap: '은닉 상태를 다음 시점으로 넘기며 단어를 하나씩 읽고 다음 단어를 예측한다. 학습 때 오차를 시간을 거슬러 보내면 같은 가중치가 거듭 곱해져, 먼 과거로 갈수록 기울기가 0에 가까워진다.',
  build(S) {
    S.cue([1.23, 2.18, 3.13, 4.08, 6.2]);
    const xs = [104, 234, 364, 494], inW = ['나는', '오늘', '밥을', '먹었다'], outW = ['오늘', '밥을', '먹었다', '.'];
    S.text(46, 175, 'h0', { fs: 13, fw: 700 });
    const hw = [S.wire([[62, 175], [104, 175]])];
    const cells = xs.map(x => S.box(x, 150, 90, 50, '셀', { sub: '같은 가중치', fs: 15 }));
    for (let i = 0; i < 3; i++) { hw.push(S.wire([[xs[i] + 90, 175], [xs[i + 1], 175]])); S.text(xs[i] + 110, 162, 'h' + (i + 1), { fs: 11.5, cls: 'sub' }); }
    hw.push(S.wire([[584, 175], [620, 175]])); S.text(604, 162, 'h4', { fs: 11.5, cls: 'sub' });
    const ins = xs.map((x, i) => S.box(x, 262, 90, 34, inW[i], { fs: 14 }));
    const iw = xs.map(x => S.wire([[x + 45, 262], [x + 45, 200]]));
    const outs = xs.map((x, i) => S.box(x, 64, 90, 34, outW[i], { fs: 14 })); S.slot(outs);
    const ow = xs.map(x => S.wire([[x + 45, 150], [x + 45, 98]]));
    S.text(52, 81, '예측', { fs: 11.5, cls: 'sub' }); S.text(52, 279, '입력', { fs: 11.5, cls: 'sub' });
    S.text(320, 332, 'h(t) = tanh(W_h·h(t−1) + W_x·x(t) + b)', { fs: 12.5, fw: 700 });
    S.dot(hw[0], 0.05, 0.35);
    for (let k = 0; k < 4; k++) {
      const b = 0.3 + k * 0.95;
      S.hl(ins[k], b, b + 0.6); S.dot(iw[k], b, b + 0.35); S.hl(cells[k], b + 0.3, b + 0.95);
      S.dot(ow[k], b + 0.45, b + 0.75); S.vis(outs[k], b + 0.75); S.dot(hw[k + 1], b + 0.55, b + 0.9);
    }
    const back = S.wire([[539, 175], [149, 175]], { cls: 'inv', arrow: false });
    S.dot(back, 4.4, 6.2, { r: 7, shrink: [0.75, 0.8], lit: false });
    S.vis(S.text(320, 26, '역전파: 같은 가중치가 거듭 곱해져 먼 과거로 갈수록 기울기가 작아진다', { fs: 12, fw: 700, cls: 'acc', maxw: 600 }), 4.3);
  }
});

scene({
  sec: 'lm', page: 8, kind: '구조도', title: 'LSTM 셀', dur: 6.5,
  cap: '망각 게이트가 이전 셀 상태에서 지울 양을, 입력 게이트와 후보 값이 더할 양을 정한다. 셀 상태는 곱하기와 더하기만 거쳐 흐르므로 먼 과거의 정보와 기울기가 잘 전달되고, 갱신된 셀 상태는 tanh와 출력 게이트를 거쳐 h(t)가 된다.',
  build(S) {
    S.cue([0.85, 2.45, 3.33, 3.75, 4.5]);
    S.text(40, 24, '셀 상태 c: 곱하기와 더하기만 거쳐 다음 시점으로 흐른다', { fs: 12, cls: 'sub', anchor: 'start' });
    S.text(32, 70, 'c(t−1)', { fs: 13, fw: 700 });
    const c1 = S.wire([[58, 70], [167, 70]]);
    const fx = S.circ(180, 70, 13, '×');
    const c2 = S.wire([[193, 70], [287, 70]]);
    const pl = S.circ(300, 70, 13, '+');
    const c3 = S.wire([[313, 70], [560, 70]]);
    S.text(584, 70, 'c(t)', { fs: 13, fw: 700 });
    const G = [['f(t)', 'σ · 망각', 146], ['i(t)', 'σ · 입력', 230], ['c̃(t)', 'tanh · 후보', 306], ['o(t)', 'σ · 출력', 404]]
      .map(g => S.box(g[2], 196, 68, 44, g[0], { sub: g[1], fs: 15, sfs: 11 }));
    const ix = S.circ(300, 140, 12, '×');
    const fUp = S.wire([[180, 196], [180, 83]]);
    const iUp = S.wire([[264, 196], [264, 140], [288, 140]]);
    const cUp = S.wire([[340, 196], [340, 140], [312, 140]]);
    const ixUp = S.wire([[300, 128], [300, 83]]);
    const tUp = S.wire([[500, 70], [500, 123]]);
    const th = S.circ(500, 138, 15, 'tanh', { fs: 11 });
    const tDn = S.wire([[500, 153], [500, 206]]);
    const ox = S.circ(500, 218, 12, '×');
    const oR = S.wire([[472, 218], [488, 218]]);
    const hOut = S.wire([[500, 230], [500, 300], [560, 300]]);
    S.text(584, 300, 'h(t)', { fs: 13, fw: 700 });
    S.box(30, 282, 100, 36, 'h(t−1), x(t)', { fs: 13 });
    S.wire([[130, 300], [438, 300]], { arrow: false });
    const gx = [180, 264, 340, 438];
    gx.forEach(x => S.wire([[x, 300], [x, 240]]));
    const bus = gx.map(x => S.wire([[130, 300], [x, 300], [x, 240]], { cls: 'inv' }));
    S.dot(c1, 0.1, 0.7);
    bus.forEach(p => S.dot(p, 0.2, 0.8, { r: 4.5 }));
    S.hl(G[0], 0.75, 1.4); S.hl([G[1], G[2]], 0.75, 1.8); S.hl(G[3], 0.75, 1.2); S.hl(G[3], 3.2, 3.8);
    S.dot(fUp, 0.9, 1.3); S.hl(fx, 1.25, 1.7);
    S.dot(c2, 1.6, 2.1);
    S.dot(iUp, 1.2, 1.7); S.dot(cUp, 1.2, 1.7); S.hl(ix, 1.65, 2.1);
    S.dot(ixUp, 1.9, 2.2); S.hl(pl, 2.15, 2.6);
    S.dot(c3, 2.5, 3.3);
    S.dot(tUp, 2.95, 3.25); S.hl(th, 3.2, 3.6);
    S.dot(tDn, 3.4, 3.7); S.dot(oR, 3.35, 3.7); S.hl(ox, 3.65, 4.1);
    S.dot(hOut, 3.9, 4.5);
  }
});

scene({
  sec: 'lm', page: 10, kind: '구조도', title: 'word2vec의 CBOW와 skip-gram', dur: 6.5,
  cap: 'CBOW는 주변 네 단어 벡터의 평균으로 가운데 단어를 맞히고, skip-gram은 가운데 단어 하나로 주변 단어를 각각 맞힌다. 목적은 예측 자체보다 학습이 끝난 뒤 남는 단어 벡터다.',
  build(S) {
    S.cue([1.1, 2.2, 3.55, 5.15]);
    S.text(164, 22, 'CBOW · 주변 단어로 가운데 단어', { fs: 13, fw: 800, maxw: 296 });
    S.text(476, 22, 'skip-gram · 가운데 단어로 주변 단어', { fs: 13, fw: 800, maxw: 296 });
    S.line(320, 40, 320, 262, 'rule');
    const ctx = ['작은', '고양이가', '조용히', '잔다'], ys = [70, 115, 160, 205];
    const L = ctx.map((w, i) => S.box(24, ys[i], 86, 32, w, { fs: 14 }));
    const P1 = S.box(148, 128, 78, 52, '투영층', { sub: '네 벡터 평균', fs: 14, sfs: 10.5 });
    const O1 = S.box(244, 134, 70, 40, '?', { fs: 15 });
    const O1s = S.box(244, 134, 70, 40, '소파에서', { cls: 'solid', fs: 14 });
    const lw = L.map(n => S.hv(n.r, [148, 154], { mx: 129 }));
    const pw1 = S.wire([P1.r, O1.l]);
    const I2 = S.box(334, 134, 70, 40, '소파에서', { fs: 14 });
    const P2 = S.box(424, 128, 78, 52, '투영층', { sub: '가운데 단어 벡터', fs: 14, sfs: 10.5 });
    const R = ctx.map((w, i) => S.box(528, ys[i], 86, 32, '?', { fs: 14 }));
    const Rs = ctx.map((w, i) => S.box(528, ys[i], 86, 32, w, { cls: 'solid', fs: 14 }));
    const iw2 = S.wire([I2.r, P2.l]);
    const rw = R.map(n => S.hv(P2.r, n.l, { mx: 515 }));
    S.rich(320, 292, [['작은 고양이가 '], ['소파에서', 'acc', '800'], [' 조용히 잔다']], { fs: 15, fw: 700 });
    S.text(320, 318, '창 크기 2: 가운데 단어의 앞뒤 두 단어가 주변 단어', { fs: 11.5, cls: 'sub' });
    S.hl(L, 0.2, 1.2); lw.forEach((p, i) => S.dot(p, 0.3 + i * 0.05, 0.9 + i * 0.05));
    S.hl(P1, 0.85, 1.7); S.dot(pw1, 1.5, 1.9); S.vis(O1s, 1.9);
    S.hl(I2, 3.0, 3.8); S.dot(iw2, 3.1, 3.5); S.hl(P2, 3.45, 4.3);
    rw.forEach((p, i) => S.dot(p, 4.0 + i * 0.05, 4.6 + i * 0.05));
    Rs.forEach((n, i) => S.vis(n, 4.6 + i * 0.08));
  }
});

/* 어텐션: 12, 13, 14, 15쪽 */
scene({
  sec: 'att', page: 12, kind: '개념도', title: 'seq2seq의 병목과 어텐션', dur: 7,
  cap: 'seq2seq는 입력 문장 전체를 벡터 하나로 압축한 뒤 번역을 만든다. 어텐션은 출력 단어마다 입력의 모든 위치를 다시 보고, 어순이 달라도 관련 있는 단어(rice와 밥을)에 큰 가중치를 준다.',
  build(S) {
    S.cue([1.25, 3.0, 4.2, 5.25, 5.9]);
    S.text(20, 22, 'seq2seq: 입력 전체를 벡터 하나로 압축', { fs: 12.5, fw: 800, anchor: 'start' });
    S.text(133, 46, '인코더 LSTM', { fs: 11, cls: 'sub' }); S.text(483, 46, '디코더 LSTM', { fs: 11, cls: 'sub' });
    const enc = ['나는', '밥을', '먹었다'].map((w, i) => S.box(20 + i * 80, 60, 66, 34, w, { fs: 13.5 }));
    const ew = [S.wire([enc[0].r, enc[1].l]), S.wire([enc[1].r, enc[2].l])];
    const vec = S.box(270, 60, 74, 34, '벡터 1개', { cls: 'solid', fs: 12.5 });
    S.text(307, 46, '병목', { fs: 11.5, fw: 800, cls: 'acc' });
    const ev = S.wire([enc[2].r, vec.l]);
    const dec = ['I', 'ate', 'rice'].map((w, i) => S.box(370 + i * 80, 60, 66, 34, w, { fs: 14 }));
    const dw = [S.wire([vec.r, dec[0].l]), S.wire([dec[0].r, dec[1].l]), S.wire([dec[1].r, dec[2].l])];
    S.text(307, 118, '모든 정보를 벡터 하나에서 꺼내야 한다', { fs: 11.5, cls: 'sub' });
    S.line(16, 146, 624, 146, 'rule');
    S.hl(enc[0], 0.1, 0.5); S.dot(ew[0], 0.2, 0.5); S.hl(enc[1], 0.45, 0.85); S.dot(ew[1], 0.55, 0.85);
    S.hl(enc[2], 0.8, 1.15); S.dot(ev, 0.9, 1.2); S.hl(vec, 1.15, 1.7);
    dec.forEach((d, i) => { S.dot(dw[i], 1.4 + i * 0.5, 1.7 + i * 0.5); S.vis(d.tx, 1.7 + i * 0.5); });

    S.text(20, 170, '어텐션: 출력 단어마다 입력의 모든 위치를 다시 본다', { fs: 12.5, fw: 800, anchor: 'start' });
    const dx = [150, 270, 390];
    const D = ['I', 'ate', 'rice'].map((w, i) => S.box(dx[i], 196, 70, 34, w, { fs: 14 }));
    const E = ['나는', '밥을', '먹었다'].map((w, i) => S.box(dx[i], 292, 70, 34, w, { fs: 13.5 }));
    ['h1', 'h2', 'h3'].forEach((h, i) => S.text(dx[i] + 35, 340, h, { fs: 10.5, cls: 'sub' }));
    S.text(66, 213, '디코더', { fs: 11.5, cls: 'sub' }); S.text(66, 309, '인코더 상태', { fs: 11.5, cls: 'sub' });
    const A = [[0.8, 0.1, 0.1], [0.1, 0.15, 0.75], [0.05, 0.85, 0.1]];
    const win = [[3.2, 4.2], [4.25, 5.25], [5.3, 7.1]];
    A.forEach((row, s) => {
      row.forEach((a, i) => {
        const l = S.line(dx[s] + 35, 230, dx[i] + 35, 292, 'att');
        l.setAttribute('stroke-width', (1 + a * 7).toFixed(1)); l.setAttribute('stroke-opacity', (0.25 + 0.75 * a).toFixed(2));
        S.vis(l, win[s][0], win[s][1]);
      });
      S.hl(D[s], win[s][0], win[s][1]);
      S.hl(E[row.indexOf(Math.max(...row))], win[s][0] + 0.2, win[s][1]);
    });
    S.text(556, 196, '가중치 (예시)', { fs: 11.5, fw: 800 });
    const bars = [], vals = [];
    ['나는', '밥을', '먹었다'].forEach((n, i) => {
      const y = 216 + i * 30;
      S.text(512, y + 8, n, { fs: 12, fw: 700, anchor: 'end' });
      S.rect(520, y, 80, 16, 'track');
      bars.push(S.rect(520, y, 0, 16, 'br acc'));
      vals.push(S.text(606, y + 8, '', { fs: 11.5, fw: 700, anchor: 'start' }));
    });
    win.forEach(w => S.motion(w[0], w[0] + 0.35));
    S.at(t => {
      let s = -1; for (let k = 0; k < 3; k++) if (t >= win[k][0]) s = k;
      for (let i = 0; i < 3; i++) {
        let w = 0, v = '';
        if (s >= 0) { const k = ease(prog(t, win[s][0], win[s][0] + 0.35)); const pr = s > 0 ? A[s - 1][i] : 0; w = 80 * (pr + (A[s][i] - pr) * k); v = A[s][i].toFixed(2); }
        bars[i].setAttribute('width', w.toFixed(1));
        if (vals[i].textContent !== v) vals[i].textContent = v;
      }
    });
  }
});

scene({
  sec: 'att', page: 13, kind: '그림 3', title: '셀프 어텐션의 계산', dur: 7,
  cap: '‘지쳐서’의 쿼리가 모든 토큰의 키와 내적해 점수를 만들고, softmax로 합이 1인 가중치를 얻는다. 그 가중치로 값(V)을 더하면 주체인 ‘동물은’의 정보가 담긴 새 표현이 된다.',
  build(S) {
    S.cue([0.95, 1.95, 3.58, 5.45]);
    const P = ['X 임베딩', 'Q · K · V', 'QKᵀ / √dₖ', 'softmax', '가중치 × V'].map((s, i) => S.box(20 + i * 124, 18, 96, 34, s, { fs: 13 }));
    const pw = [0, 1, 2, 3].map(i => S.wire([P[i].r, P[i + 1].l]));
    const toks = [['그', 82, 40], ['동물은', 134, 66], ['너무', 212, 50], ['지쳐서', 274, 66], ['길을', 352, 50], ['건너지', 414, 66], ['않았다', 492, 66]];
    const W = [0.05, 0.55, 0.06, 0.12, 0.04, 0.08, 0.1];
    const T = toks.map((t, i) => S.box(t[1], 270, t[2], 32, t[0], { fs: 14, cls: i === 3 ? 'solid' : '' }));
    const qx = T[3].cx;
    const arcs = T.map((n, i) => {
      if (i === 3) return null;
      const dx = Math.abs(n.cx - qx), cy = 262 - (dx * 0.32 + 16);
      return S.path(`M${qx},268 Q${(qx + n.cx) / 2},${cy} ${n.cx},268`, { cls: 'thin' });
    });
    const base = 262;
    T.forEach((n, i) => S.vbar(n.cx - 13, base, 26, W[i] * 200, 2.2 + i * 0.06, 3.2 + i * 0.06, { cls: i === 1 ? 'acc' : '' }));
    T.forEach((n, i) => S.vis(S.text(n.cx, base - W[i] * 200 - 10, W[i].toFixed(2), { fs: 11.5, fw: 700, cls: i === 1 ? 'acc' : '' }), 3.0 + i * 0.06));
    const out = S.box(qx - 64, 318, 128, 32, '지쳐서′ (새 표현)', { cls: 'solid', fs: 13 });
    const vp = T.map(n => S.wire([[n.cx, 302], [qx, 318]], { cls: 'inv', arrow: false }));
    S.vis(S.text(320, 74, '가중치 합 = 1 · 수치는 예시 값', { fs: 11.5, cls: 'sub' }), 3.0);
    S.vis(S.text(320, 96, '‘동물은’에 가장 큰 가중치: 누가 지쳤는지가 새 표현에 담긴다', { fs: 12, fw: 700, cls: 'acc', maxw: 600 }), 5.1);
    S.hl(P[0], 0.2, 0.8); S.dot(pw[0], 0.5, 0.9); S.hl(P[1], 0.8, 1.3); S.dot(pw[1], 1.0, 1.3);
    S.hl(P[2], 1.3, 2.2); S.dot(pw[2], 2.0, 2.3); S.hl(P[3], 2.2, 3.8); S.dot(pw[3], 3.6, 3.9); S.hl(P[4], 3.9, 5.1);
    S.hl(T[3], 0.9, 1.7);
    arcs.forEach(a => { if (!a) return; S.draw(a, 1.0, 1.6); S.vis(a, 1.0, 2.3); });
    vp.forEach((p, i) => S.dot(p, 4.0, 4.7, { r: 2 + W[i] * 12, lit: false }));
    S.vis(out, 4.7);
  }
});

scene({
  sec: 'att', page: 14, kind: '구조도', title: 'Transformer', dur: 7,
  cap: '인코더가 입력 문장을 여섯 층에 걸쳐 문맥이 반영된 표현으로 바꾸면, 디코더는 마스크드 셀프 어텐션으로 지금까지 만든 토큰만 보고 교차 어텐션으로 인코더 출력을 참조해 다음 토큰을 낸다. 낸 토큰은 다시 디코더 입력으로 들어간다.',
  build(S) {
    S.cue([2.15, 3.12, 4.42, 5.45, 6.6]);
    const ef = S.rect(50, 160, 200, 130, 'frame');
    S.text(44, 223, '× N', { fs: 13, fw: 800, anchor: 'end' }); S.text(44, 241, 'N = 6', { fs: 10.5, cls: 'sub', anchor: 'end' });
    S.wire([[150, 300], [150, 166]], { arrow: false });
    const eIn = S.box(60, 300, 180, 28, '입력 임베딩 + 위치 인코딩', { fs: 12 });
    const eA = S.box(70, 252, 160, 28, '멀티헤드 셀프 어텐션', { fs: 12.5 });
    const eN1 = S.box(70, 230, 160, 14, 'Add & Norm', { fs: 9.5, cls: 'thin' });
    const eF = S.box(70, 198, 160, 26, '피드포워드', { fs: 12.5 });
    const eN2 = S.box(70, 176, 160, 14, 'Add & Norm', { fs: 9.5, cls: 'thin' });
    S.text(150, 344, '나는 밥을 먹었다', { fs: 11.5, cls: 'sub' });
    const kv = S.wire([[150, 166], [150, 140], [330, 140], [330, 210], [360, 210]]);
    S.text(240, 129, '인코더 출력 (K, V)', { fs: 11, cls: 'sub' });
    const df = S.rect(350, 108, 220, 182, 'frame');
    S.text(578, 199, '× N', { fs: 13, fw: 800, anchor: 'start' });
    S.wire([[460, 300], [460, 40]], { arrow: false });
    const dIn = S.box(360, 300, 200, 28, '출력 임베딩 + 위치 인코딩', { fs: 12 });
    const dM = S.box(370, 252, 180, 28, '마스크드 셀프 어텐션', { fs: 12.5 });
    const dN1 = S.box(370, 230, 180, 14, 'Add & Norm', { fs: 9.5, cls: 'thin' });
    const dC = S.box(370, 198, 180, 26, '교차 어텐션', { fs: 12.5 });
    const dN2 = S.box(370, 176, 180, 14, 'Add & Norm', { fs: 9.5, cls: 'thin' });
    const dF = S.box(370, 144, 180, 26, '피드포워드', { fs: 12.5 });
    const dN3 = S.box(370, 122, 180, 14, 'Add & Norm', { fs: 9.5, cls: 'thin' });
    const lin = S.box(390, 78, 140, 22, 'Linear', { fs: 12 });
    const sm = S.box(390, 50, 140, 22, 'Softmax', { fs: 12 });
    const out = S.box(410, 14, 100, 26, 'rice', { cls: 'solid', fs: 14 }); S.slot(out);
    S.text(400, 27, '다음 토큰', { fs: 11, cls: 'sub', anchor: 'end' });
    const tk1 = S.text(460, 344, '<s> I ate', { fs: 11.5, cls: 'sub' });
    const tk2 = S.text(460, 344, '<s> I ate rice', { fs: 11.5, fw: 700 });
    const fb = S.wire([[510, 27], [616, 27], [616, 314], [560, 314]], { cls: 'dash' });
    const seg = (x, a, b) => S.wire([[x, a], [x, b]], { cls: 'inv', arrow: false });
    const es = [seg(150, 314, 266), seg(150, 266, 237), seg(150, 237, 211), seg(150, 211, 183)];
    const dys = [314, 266, 237, 211, 183, 157, 129, 89, 61, 27];
    const ds = []; for (let i = 0; i < dys.length - 1; i++) ds.push(seg(460, dys[i], dys[i + 1]));
    const q = { lit: false };
    S.hl(eIn, 0.1, 0.6); S.dot(es[0], 0.3, 0.6, q); S.hl(eA, 0.55, 0.95);
    S.dot(es[1], 0.9, 1.1, q); S.hl(eN1, 1.05, 1.3);
    S.dot(es[2], 1.25, 1.45, q); S.hl(eF, 1.4, 1.8);
    S.dot(es[3], 1.75, 1.95, q); S.hl(eN2, 1.9, 2.15);
    S.hl(ef, 2.1, 2.5); S.dot(kv, 2.4, 3.1);
    S.hl(dIn, 1.2, 1.7); S.dot(ds[0], 1.5, 1.8, q); S.hl(dM, 1.75, 2.3);
    S.dot(ds[1], 2.2, 2.4, q); S.hl(dN1, 2.35, 2.6);
    S.dot(ds[2], 2.9, 3.1, q); S.hl(dC, 3.05, 3.6);
    S.dot(ds[3], 3.5, 3.7, q); S.hl(dN2, 3.65, 3.9);
    S.dot(ds[4], 3.75, 3.95, q); S.hl(dF, 3.9, 4.3);
    S.dot(ds[5], 4.2, 4.4, q); S.hl(dN3, 4.35, 4.6);
    S.dot(ds[6], 4.45, 4.7, q); S.hl(lin, 4.65, 4.95);
    S.dot(ds[7], 4.85, 5.05, q); S.hl(sm, 5.0, 5.35);
    S.dot(ds[8], 5.2, 5.4, q); S.vis(out, 5.35); S.hl(df, 3.0, 3.6);
    S.dot(fb, 5.6, 6.3); S.vis(tk1, 0, 6.3); S.vis(tk2, 6.3);
  }
});

scene({
  sec: 'att', page: 15, kind: '그림 4', title: '트랜스포머의 세 갈래', dur: 6.6,
  cap: '같은 트랜스포머 블록이라도 어텐션 마스크와 학습 목표가 갈래를 나눈다. BERT는 앞뒤를 모두 보고 가려진 단어를 맞히고, GPT는 앞쪽만 보고 다음 토큰을 예측하며, T5는 모든 과제를 텍스트에서 텍스트로 바꾸는 문제로 푼다.',
  build(S) {
    S.cue([1.25, 2.1, 3.25, 4.1, 5.15, 6.3]);
    S.line(216, 16, 216, 340, 'rule'); S.line(424, 16, 424, 340, 'rule');
    const heads = [['BERT', '인코더 전용 · 양방향', 112], ['GPT', '디코더 전용 · 인과', 320], ['T5', '인코더-디코더', 528]];
    const H = heads.map(h => { const t = S.text(h[2], 26, h[0], { fs: 17, fw: 800 }); S.text(h[2], 46, h[1], { fs: 11.5, cls: 'sub' }); return t; });
    const grid = (x, y, n, cs, gap, mask) => {
      const out = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.push({ cell: S.rect(x + c * (cs + gap), y + r * (cs + gap), cs, cs, 'cell' + (mask(r, c) ? '' : ' e')), r, c, on: mask(r, c) });
      return out;
    };
    const gB = grid(68, 66, 4, 20, 3, () => true);
    const gG = grid(276, 66, 4, 20, 3, (r, c) => c <= r);
    const gE = grid(452, 72, 3, 18, 3, () => true);
    const gD = grid(546, 72, 3, 18, 3, (r, c) => c <= r);
    const cross = S.wire([[517, 102], [543, 102]]);
    S.text(482, 146, '인코더', { fs: 10.5, cls: 'sub' }); S.text(576, 146, '디코더', { fs: 10.5, cls: 'sub' });
    S.text(112, 170, '행: 보는 토큰 · 열: 보이는 토큰', { fs: 10, cls: 'sub' });
    S.text(320, 170, '위쪽 삼각형은 가린다', { fs: 10, cls: 'sub' });
    const ex = [['나는 [MASK]를 먹었다', 13.5, '밥', '가린 단어 맞히기 (MLM)', 112], ['나는 밥을', 13.5, '먹었다', '다음 토큰 예측', 320], ['translate English to German:\nThat is good.', 10.5, 'Das ist gut.', '모든 과제를 텍스트에서 텍스트로', 528]];
    const IN = ex.map(e => S.box(e[4] - 92, 194, 184, 36, e[0], { fs: e[1], fw: 600 }));
    const OUT = ex.map(e => S.box(e[4] - 60, 270, 120, 32, e[2], { cls: 'solid', fs: 14 })); S.slot(OUT);
    ex.forEach(e => S.text(e[4], 320, e[3], { fs: 11, cls: 'sub', maxw: 196 }));
    const W = IN.map((n, i) => S.wire([n.b, OUT[i].t]));
    S.cls(H[0], 'acc', 0.2, 2.1);
    [0, 1, 2, 3].forEach(r => S.cls(gB.filter(g => g.r === r).map(g => g.cell), 'f', 0.3 + r * 0.22));
    S.hl(IN[0], 0.2, 1.6); S.dot(W[0], 1.3, 1.7); S.vis(OUT[0], 1.75);
    S.cls(H[1], 'acc', 2.2, 4.1);
    [0, 1, 2, 3].forEach(r => S.cls(gG.filter(g => g.r === r && g.on).map(g => g.cell), 'f', 2.3 + r * 0.22));
    S.hl(IN[1], 2.2, 3.6); S.dot(W[1], 3.3, 3.7); S.vis(OUT[1], 3.75);
    S.cls(H[2], 'acc', 4.2, 6.3);
    [0, 1, 2].forEach(r => S.cls(gE.filter(g => g.r === r).map(g => g.cell), 'f', 4.3 + r * 0.15));
    [0, 1, 2].forEach(r => S.cls(gD.filter(g => g.r === r && g.on).map(g => g.cell), 'f', 4.75 + r * 0.15));
    S.dot(cross, 5.2, 5.5);
    S.hl(IN[2], 4.2, 5.9); S.dot(W[2], 5.55, 5.95); S.vis(OUT[2], 6.0);
  }
});

/* 프롬프트 방법론 1: 19~27쪽 */
scene({
  sec: 'pr', page: 19, kind: '방법론', title: 'Zero-shot 프롬프팅', dur: 5.4,
  cap: '예시 없이 과제와 출력 조건만 말로 지시한다. 판단 기준과 출력 형식을 분명히 적을수록 모델이 임의로 해석할 여지가 줄어든다.',
  build(S) {
    S.cue([2.1, 2.88, 3.6]);
    const P = S.doc(24, 74, 262, 196, '프롬프트', ['다음 환자 후기의 감정을 긍정, 중립, 부정', '중 하나로 분류하세요.', '한 단어로만 답하세요.', { t: '후기: 대기 시간은 길었지만 선생님', fw: 700 }, { t: '설명이 정말 친절했어요.', fw: 700 }], { fs: 12.5, lh: 24 });
    S.box(220, 82, 58, 22, '예시 0개', { cls: 'tagb', fs: 11 });
    const L = S.box(330, 147, 80, 50, 'LLM', { cls: 'solid', fs: 16 });
    const O = S.box(456, 147, 150, 50, '');
    S.text(531, 134, '출력', { fs: 11.5, cls: 'sub' });
    const Os = S.box(456, 147, 150, 50, '긍정', { cls: 'solid', fs: 17 });
    const w1 = S.wire([[286, 172], L.l]), w2 = S.wire([L.r, O.l]);
    P.rows.forEach((r, i) => S.type(r, 0.2 + i * 0.35, 0.55 + i * 0.35));
    S.dot(w1, 2.2, 2.6); S.hl(L, 2.55, 3.1); S.dot(w2, 2.9, 3.3); S.vis(Os, 3.3);
  }
});

scene({
  sec: 'pr', page: 20, kind: '방법론', title: 'Few-shot 프롬프팅', dur: 6,
  cap: '입력과 출력 예시 몇 쌍을 프롬프트에 넣으면 모델이 같은 형식과 기준으로 답한다. 가중치는 그대로이고 예시만으로 과제를 배우는 인컨텍스트 학습이다.',
  build(S) {
    S.cue([2.3, 3.28, 4.4]);
    S.box(16, 28, 322, 304, '');
    S.text(28, 46, '프롬프트', { fs: 11, fw: 700, cls: 'sub', anchor: 'start' });
    S.box(270, 36, 58, 22, '예시 3개', { cls: 'tagb', fs: 11 });
    const ex = [['접수부터 진료까지 10분도 안 걸렸어요.', '긍정'], ['주차가 불편했고 안내도 없었어요.', '부정'], ['평범한 진료였습니다.', '중립']];
    const rows = ex.map((e, i) => {
      const y = 70 + i * 52, g = S.group('');
      S.box(26, y, 302, 40, '', { cls: 'ghost', parent: g });
      S.text(38, y + 20, e[0], { fs: 12, anchor: 'start', parent: g, maxw: 220 });
      S.box(266, y + 8, 52, 24, e[1], { fs: 12, parent: g });
      return g;
    });
    const qg = S.group('');
    S.box(26, 236, 302, 64, '', { cls: 'dash', parent: qg });
    S.text(38, 256, '대기 시간은 길었지만 설명이', { fs: 12, fw: 700, anchor: 'start', parent: qg });
    S.text(38, 278, '정말 친절했어요.', { fs: 12, fw: 700, anchor: 'start', parent: qg });
    S.box(266, 256, 52, 24, '?', { fs: 13, parent: qg });
    const qa = S.box(266, 256, 52, 24, '긍정', { cls: 'solid', fs: 12 });
    const L = S.box(376, 155, 80, 50, 'LLM', { cls: 'solid', fs: 16 });
    const O = S.box(496, 155, 124, 50, '');
    const Os = S.box(496, 155, 124, 50, '긍정', { cls: 'solid', fs: 17 });
    S.text(558, 142, '출력', { fs: 11.5, cls: 'sub' });
    const w1 = S.wire([[338, 180], L.l]), w2 = S.wire([L.r, O.l]);
    const note = S.text(416, 226, '가중치는 그대로', { fs: 11.5, cls: 'sub' });
    rows.forEach((g, i) => S.vis(g, 0.2 + i * 0.55)); S.vis(qg, 1.85);
    S.dot(w1, 2.5, 2.9); S.hl(L, 2.85, 3.4); S.vis(note, 3.1); S.dot(w2, 3.3, 3.7); S.vis(Os, 3.7); S.vis(qa, 4.1);
  }
});

scene({
  sec: 'pr', page: 21, kind: '방법론', title: '역할·페르소나 부여', dur: 6.2,
  cap: '시스템 프롬프트에 준 역할이 답의 어휘 수준과 관점, 깊이를 정한다. 역할이 없는 전문 지식을 만들어 주지는 않으므로 오답 비용이 큰 의료 영역에서는 근거 확인이 따로 필요하다.',
  build(S) {
    S.cue([1.28, 2.45, 4.5, 5.3]);
    const sys = S.doc(16, 28, 240, 86, '시스템 프롬프트', [{ t: '역할: 10년 차 소아응급의학과 전문의', fw: 700 }, '보호자가 이해할 쉬운 말, 세 문장 이내'], { fs: 12, lh: 21, gap: 24 });
    const usr = S.doc(16, 138, 240, 108, '사용자 질문', ['아이가 열이 39도인데 해열제를 먹이고', '1시간이 지나도 안 떨어져요.', '바로 응급실에 가야 하나요?'], { fs: 12, lh: 21, gap: 24 });
    const L = S.box(292, 148, 80, 50, 'LLM', { cls: 'solid', fs: 16 });
    const badge = S.box(284, 112, 108, 24, '역할: 전문의', { cls: 'tagb', fs: 11.5 });
    const w1 = S.hv([256, 71], [292, 163], { mx: 274 }), w2 = S.hv([256, 192], [292, 183], { mx: 274 });
    S.box(404, 52, 220, 232, '');
    S.text(416, 70, '답변', { fs: 11, fw: 700, cls: 'sub', anchor: 'start' });
    const sent = [['해열제는 효과가 나기까지 시간이', '걸리고 다 안 떨어질 수도 있어요.'], ['처지거나 숨쉬기 힘들어하거나', '소변이 줄면 바로 응급실로 오세요.'], ['그렇지 않으면 수분을 주며 지켜보고', '걱정되면 진료를 받으세요.']];
    const sg = sent.map((s, i) => { const g = S.group(''); s.forEach((ln, j) => S.text(416, 100 + i * 52 + j * 19, ln, { fs: 11.5, anchor: 'start', parent: g, maxw: 196 })); return g; });
    const tags = S.group('');
    S.box(416, 252, 60, 22, '쉬운 말', { cls: 'tagb', fs: 11, parent: tags });
    S.box(484, 252, 60, 22, '세 문장', { cls: 'tagb', fs: 11, parent: tags });
    const w3 = S.wire([L.r, [404, 173]]);
    const note = S.text(16, 300, '역할은 말투와 관점을 바꿀 뿐, 없는 전문 지식을 만들지 않는다', { fs: 11.5, cls: 'sub', anchor: 'start' });
    S.hl(sys, 0.2, 1.0); S.dot(w1, 0.5, 1.0); S.vis(badge, 1.05);
    S.hl(usr, 1.3, 2.1); S.dot(w2, 1.6, 2.1); S.hl(L, 2.05, 2.7); S.dot(w3, 2.5, 2.9);
    sg.forEach((g, i) => S.vis(g, 3.0 + i * 0.5)); S.vis(tags, 4.6); S.vis(note, 5.0);
  }
});

scene({
  sec: 'pr', page: 22, kind: '방법론', title: '구분자·태그와 출력 형식', dur: 6.2,
  cap: '지시, 데이터, 출력 형식을 태그로 나누면 어디까지가 지시이고 어디부터가 데이터인지 분명해진다. 정해진 JSON 형식으로 받으면 결과를 프로그램에서 바로 읽을 수 있다.',
  build(S) {
    S.cue([2.25, 3.05, 4.95, 5.3]);
    S.box(16, 22, 286, 316, '');
    S.text(28, 40, '프롬프트', { fs: 11, fw: 700, cls: 'sub', anchor: 'start' });
    const blk = (y, h, tag, rows, mono) => {
      const n = S.box(28, y, 262, h, '', { cls: 'thin' });
      S.text(38, y + 14, tag, { fs: 11, fw: 700, cls: 'acc mono', anchor: 'start', parent: n.g });
      rows.forEach((r, i) => { const t = S.text(38, y + 38 + i * 20, r, { fs: mono ? 11 : 12, anchor: 'start', parent: n.g, maxw: 242 }); if (mono) t.classList.add('mono'); });
      return n;
    };
    const b1 = blk(54, 84, '<instructions>', ['투약 정보를 JSON으로만 추출하세요.', '기록에 없는 값은 null로 둡니다.']);
    const b2 = blk(150, 64, '<record>', ['아세트아미노펜 500mg 1일 3회, 5일분 처방']);
    const b3 = blk(226, 100, '<format>', ['{"drug": str, "dose": str,', ' "freq": str, "days": int}'], true);
    const L = S.box(334, 155, 80, 50, 'LLM', { cls: 'solid', fs: 16 });
    const w1 = S.wire([[302, 180], L.l]);
    S.box(440, 66, 184, 226, '');
    S.text(452, 84, '출력 (JSON)', { fs: 11, fw: 700, cls: 'sub', anchor: 'start' });
    const js = [['{', 452], ['"drug": "아세트아미노펜",', 466], ['"dose": "500mg",', 466], ['"freq": "1일 3회",', 466], ['"days": 5', 466], ['}', 452]];
    const jt = js.map((j, i) => { const t = S.text(j[1], 112 + i * 22, j[0], { fs: 11.5, anchor: 'start', maxw: 150 }); t.classList.add('mono'); return t; });
    const ok = S.box(452, 254, 74, 22, '파싱 가능', { cls: 'tagb', fs: 11 });
    const w2 = S.wire([L.r, [440, 180]]);
    S.hl(b1, 0.2, 0.9); S.hl(b2, 0.9, 1.6); S.hl(b3, 1.6, 2.3);
    S.dot(w1, 2.3, 2.7); S.hl(L, 2.65, 3.2); S.dot(w2, 3.1, 3.5);
    jt.forEach((t, i) => S.vis(t, 3.5 + i * 0.24)); S.vis(ok, 5.0);
  }
});

scene({
  sec: 'pr', page: 23, kind: '방법론', title: 'Chain-of-Thought', dur: 6.5,
  cap: 'few-shot 예시의 답 앞에 풀이 과정을 적어 두면 모델도 같은 방식으로 중간 단계를 쓰며 답한다. 다단계 산술, 상식, 기호 추론에서 정확도가 올랐다.',
  build(S) {
    S.cue([1.45, 2.05, 2.85, 3.55, 4.15, 4.8]);
    S.box(16, 22, 290, 316, '');
    S.text(28, 40, '프롬프트 (예시 1개 + 질문)', { fs: 11, fw: 700, cls: 'sub', anchor: 'start' });
    S.box(28, 54, 266, 142, '', { cls: 'ghost' });
    S.lines(40, 76, ['Q. 약 한 통에 30정. 하루 2정씩 먹으면', '두 통은 며칠 분인가?'], { fs: 12, lh: 20 });
    const r1 = S.text(40, 126, 'A. 두 통은 30 × 2 = 60정이다.', { fs: 12, anchor: 'start', fw: 700 });
    const r2 = S.text(40, 146, '하루 2정이므로 60 ÷ 2 = 30일이다.', { fs: 12, anchor: 'start', fw: 700 });
    S.text(40, 174, '답은 30일.', { fs: 12, anchor: 'start' });
    const ql = S.box(28, 210, 266, 114, '', { cls: 'dash' });
    S.lines(40, 234, ['Q. 시럽 한 병 120mL, 한 번에 5mL씩', '하루 3번 먹인다. 한 병은 며칠 분인가?'], { fs: 12, lh: 20 });
    S.text(40, 290, 'A.', { fs: 12, fw: 700, anchor: 'start' });
    const tag = S.box(228, 100, 60, 20, '풀이 과정', { cls: 'tagb', fs: 10.5 });
    const L = S.box(334, 155, 80, 50, 'LLM', { cls: 'solid', fs: 16 });
    const w1 = S.wire([[306, 180], L.l]);
    S.text(538, 52, '모델 출력', { fs: 11, fw: 700, cls: 'sub' });
    const s1 = S.box(452, 70, 172, 40, '하루 5 × 3 = 15mL', { fs: 13.5 });
    const s2 = S.box(452, 140, 172, 40, '120 ÷ 15 = 8', { fs: 13.5 });
    const s3 = S.box(452, 210, 172, 40, '답: 8일', { cls: 'solid', fs: 15 }); S.slot(s3);
    const w2 = S.hv(L.r, [452, 90], { mx: 433 }), w3 = S.wire([s1.b, s2.t]), w4 = S.wire([s2.b, s3.t]);
    S.cls([r1, r2], 'acc', 0.3, 1.6); S.vis(tag, 0.3, 1.6);
    S.hl(ql, 1.5, 2.2); S.dot(w1, 2.1, 2.5); S.hl(L, 2.45, 3.0);
    S.dot(w2, 2.9, 3.3); S.vis(s1.tx, 3.3); S.dot(w3, 3.6, 3.9); S.vis(s2.tx, 3.9); S.dot(w4, 4.2, 4.5); S.vis(s3, 4.5);
  }
});

scene({
  sec: 'pr', page: 24, kind: '방법론', title: 'Zero-shot CoT', dur: 6.6,
  cap: '예시 없이 질문 뒤에 ‘Let’s think step by step.’ 한 문장을 붙여 단계적 추론을 끌어낸다. 원 논문은 첫 호출로 추론을 만들고, 두 번째 호출로 답만 뽑는 2단계로 썼다.',
  build(S) {
    S.cue([1.12, 1.78, 2.85, 4.22, 4.82, 5.45]);
    const P = S.doc(16, 34, 212, 112, '1차 프롬프트', ['시럽 120mL, 한 번에 5mL씩', '하루 3번. 한 병은 며칠 분인가?', { t: "Let's think step by step.", fw: 700, cls: 'acc' }], { fs: 12, lh: 22, gap: 24 });
    const L1 = S.box(256, 65, 70, 50, 'LLM', { cls: 'solid', fs: 15 }); S.text(291, 52, '1차 호출', { fs: 11, cls: 'sub' });
    const R = S.doc(356, 34, 268, 112, '추론 생성', ['하루 5 × 3 = 15mL를 쓴다.', '120 ÷ 15 = 8이다.'], { fs: 12.5, lh: 24, gap: 26 });
    const C = S.doc(16, 194, 212, 130, '2차 프롬프트', ['질문 + 1차 추론', { t: 'Therefore, the answer', fw: 700, cls: 'acc' }, { t: '(arabic numerals) is', fw: 700, cls: 'acc' }], { fs: 12, lh: 22, gap: 26 });
    const L2 = S.box(256, 235, 70, 50, 'LLM', { cls: 'solid', fs: 15 }); S.text(291, 222, '2차 호출', { fs: 11, cls: 'sub' });
    const A = S.box(356, 235, 110, 50, '8', { cls: 'solid', fs: 20 }); S.slot(A); S.text(411, 222, '답 추출', { fs: 11, cls: 'sub' });
    const w1 = S.wire([[228, 90], L1.l]), w2 = S.wire([L1.r, [356, 90]]);
    const w3 = S.vh([490, 146], [122, 194], { my: 170 });
    const w4 = S.wire([[228, 260], L2.l]), w5 = S.wire([L2.r, A.l]);
    S.type(P.rows[2], 0.3, 1.1);
    S.dot(w1, 1.15, 1.55); S.hl(L1, 1.5, 2.05); S.dot(w2, 1.8, 2.1);
    R.rows.forEach((r, i) => S.vis(r, 2.1 + i * 0.4));
    S.dot(w3, 2.9, 3.6); S.hl(C, 3.55, 4.3); S.type(C.rows[1], 3.6, 3.9); S.type(C.rows[2], 3.9, 4.2);
    S.dot(w4, 4.25, 4.55); S.hl(L2, 4.5, 5.05); S.dot(w5, 4.85, 5.15); S.vis(A, 5.15);
  }
});

scene({
  sec: 'pr', page: 25, kind: '방법론', title: 'Plan-and-Solve', dur: 6.5,
  cap: 'Zero-shot CoT에서 단계를 빠뜨리는 오류를 줄이려고, 먼저 문제를 이해하고 계획을 세운 뒤 그 계획대로 단계별로 풀라고 지시한다.',
  build(S) {
    S.cue([1.65, 2.18, 3.28, 4.9]);
    S.doc(16, 28, 232, 304, '프롬프트', ['병동 간호사 12명 중 3분의 1이', '야간 근무이고, 그중 절반이 오늘', '휴가다. 오늘 야간 근무 인원은?'], { fs: 12, lh: 21, gap: 26 });
    S.text(28, 148, 'PS 트리거 (논문 원문)', { fs: 10.5, cls: 'sub', anchor: 'start' });
    const tr = ["Let's first understand the problem", 'and devise a plan to solve the problem.', "Then, let's carry out the plan and", 'solve the problem step by step.'].map((s, i) => S.text(28, 170 + i * 20, s, { fs: 11, fw: 700, cls: 'acc', anchor: 'start', maxw: 208 }));
    const L = S.box(272, 155, 70, 50, 'LLM', { cls: 'solid', fs: 15 });
    S.box(372, 28, 252, 124, ''); S.text(384, 48, '계획', { fs: 13, fw: 800, anchor: 'start' });
    const pl = [S.text(384, 82, '① 야간 근무자 수를 구한다', { fs: 12.5, anchor: 'start' }), S.text(384, 110, '② 그중 휴가자를 뺀다', { fs: 12.5, anchor: 'start' })];
    S.box(372, 184, 252, 148, ''); S.text(384, 204, '실행', { fs: 13, fw: 800, anchor: 'start' });
    const ex = [S.text(384, 236, '12 ÷ 3 = 4명 (야간 근무)', { fs: 12.5, anchor: 'start' }), S.text(384, 262, '4 ÷ 2 = 2명 (휴가)', { fs: 12.5, anchor: 'start' })];
    const ans = S.box(384, 286, 100, 32, '답: 2명', { cls: 'solid', fs: 14 });
    const w1 = S.wire([[248, 180], L.l]), w2 = S.hv(L.r, [372, 90], { mx: 357 }), w3 = S.wire([[498, 152], [498, 184]]);
    tr.forEach((t, i) => S.type(t, 0.2 + i * 0.35, 0.55 + i * 0.35));
    S.dot(w1, 1.7, 2.1); S.hl(L, 2.05, 2.6); S.dot(w2, 2.2, 2.55);
    pl.forEach((t, i) => S.vis(t, 2.55 + i * 0.4)); S.dot(w3, 3.3, 3.65);
    ex.forEach((t, i) => S.vis(t, 3.7 + i * 0.4)); S.vis(ans, 4.6);
  }
});

scene({
  sec: 'pr', page: 26, kind: '방법론', title: 'Least-to-Most', dur: 7,
  cap: '1단계에서 문제를 쉬운 하위 문제로 나누고, 2단계에서 앞 하위 문제의 답을 다음 하위 문제의 입력으로 넣으며 차례로 푼다. 예시보다 어려운 문제로 일반화하는 데 강하다.',
  build(S) {
    S.cue([1.98, 3.78, 6.1]);
    S.text(16, 16, '1단계 · 분해', { fs: 12, fw: 800, anchor: 'start' });
    S.text(16, 154, '2단계 · 차례로 풀기', { fs: 12, fw: 800, anchor: 'start' });
    const Q = S.doc(16, 30, 192, 82, '', ['5분 걸리는 미끄럼틀을 한 번 타고', '줄을 2분 서는 일을 15분 동안', '몇 번 반복할 수 있나?'], { fs: 11.5, lh: 19, gap: 0 });
    const L1 = S.box(230, 51, 60, 40, 'LLM', { cls: 'solid', fs: 13 });
    S.box(312, 30, 312, 82, '');
    const q1 = S.text(324, 58, 'Q1. 한 번 타는 데 걸리는 시간은?', { fs: 12, anchor: 'start' });
    const q2 = S.text(324, 84, 'Q2. 15분 동안 몇 번 탈 수 있나?', { fs: 12, anchor: 'start' });
    const w1 = S.wire([[208, 71], L1.l]), w2 = S.wire([L1.r, [312, 71]]);
    const B1 = S.box(16, 170, 192, 40, 'Q1. 한 번 타는 시간은?', { fs: 12.5, anchor: 'start' });
    const L2 = S.box(230, 170, 60, 40, 'LLM', { cls: 'solid', fs: 13 });
    const A1 = S.box(312, 170, 150, 40, '5 + 2 = 7분', { fs: 14 });
    const B2 = S.doc(16, 250, 192, 60, '', ['Q2. 한 번에 7분이 걸릴 때', '15분 동안 몇 번 탈 수 있나?'], { fs: 12, lh: 20, gap: 0 });
    const L3 = S.box(230, 260, 60, 40, 'LLM', { cls: 'solid', fs: 13 });
    const A2 = S.box(312, 260, 150, 40, '15 ÷ 7 = 2.14…', { fs: 13.5 });
    const F = S.box(482, 260, 142, 40, '답: 2번', { cls: 'solid', fs: 15 }); S.slot(F);
    const w3 = S.vh([468, 112], [180, 170], { my: 140 });
    const w4 = S.wire([B1.r, L2.l]), w5 = S.wire([L2.r, A1.l]);
    const w6 = S.vh([387, 210], [112, 250], { my: 230 });
    const w7 = S.wire([[208, 280], L3.l]), w8 = S.wire([L3.r, A2.l]), w9 = S.wire([A2.r, F.l]);
    S.hl(Q, 0.2, 0.8); S.dot(w1, 0.5, 0.9); S.hl(L1, 0.85, 1.35); S.dot(w2, 1.0, 1.4); S.vis(q1, 1.4); S.vis(q2, 1.7);
    S.dot(w3, 2.0, 2.6); S.hl(B1, 2.55, 3.0); S.dot(w4, 2.6, 2.9); S.hl(L2, 2.85, 3.3); S.dot(w5, 3.1, 3.4); S.vis(A1.tx, 3.45);
    S.dot(w6, 3.8, 4.5); S.hl(B2, 4.45, 5.0); S.dot(w7, 4.5, 4.8); S.hl(L3, 4.8, 5.2); S.dot(w8, 5.0, 5.3); S.vis(A2.tx, 5.35);
    S.dot(w9, 5.5, 5.75); S.vis(F, 5.8);
  }
});

scene({
  sec: 'pr', page: 27, kind: '방법론', title: 'Self-Ask', dur: 7,
  cap: '모델이 다단계 질문에 필요한 후속 질문을 스스로 묻고 중간 답을 쓴 뒤 최종 답을 낸다. 후속 질문을 검색 엔진으로 보내면 중간 답을 외부 근거로 채울 수 있다.',
  build(S) {
    S.cue([1.28, 2.6, 2.98, 4.3, 4.9]);
    const row = (y, h, t, o = {}) => S.box(16, y, 404, h, t, Object.assign({ fs: 12, anchor: 'start', pad: 10 }, o));
    row(16, 34, 'Question: 지역번호 575가 쓰이는 주에서 우기는 언제 끝나는가?', { fw: 700 });
    const N = row(60, 28, 'Are follow up questions needed here: Yes.', { cls: 'ghost', fs: 11.5 });
    const F1 = row(98, 30, 'Follow up: 지역번호 575는 어느 주에 있는가?');
    const I1 = row(136, 30, 'Intermediate answer: 뉴멕시코주에 있다.', { cls: 'ghost' });
    const F2 = row(182, 30, 'Follow up: 뉴멕시코주의 우기는 언제 끝나는가?');
    const I2 = row(220, 30, 'Intermediate answer: 보통 9월 중순에 끝난다.', { cls: 'ghost' });
    const FA = row(270, 36, 'So the final answer is: 9월 중순', { cls: 'solid', fs: 13 });
    S.slot([N, F1, I1, F2, I2, FA]);
    const SE = S.box(470, 98, 150, 152, '검색 엔진', { cls: 'dash', sub: '(선택)\n중간 답 확인', fs: 14 });
    const a1 = S.wire([[420, 113], [470, 113]]), b1 = S.wire([[470, 151], [420, 151]]);
    const a2 = S.wire([[420, 197], [470, 197]]), b2 = S.wire([[470, 235], [420, 235]]);
    S.text(620, 336, '예시 형식: Press 외(2022) 표 10', { fs: 10, cls: 'sub', anchor: 'end' });
    S.vis(N, 0.6); S.vis(F1, 1.1); S.dot(a1, 1.3, 1.6); S.hl(SE, 1.55, 2.0); S.dot(b1, 1.9, 2.2); S.vis(I1, 2.25);
    S.vis(F2, 2.8); S.dot(a2, 3.0, 3.3); S.hl(SE, 3.25, 3.7); S.dot(b2, 3.6, 3.9); S.vis(I2, 3.95); S.vis(FA, 4.6);
  }
});

/* 프롬프트 방법론 2: 28~37쪽 (30쪽 그림 6은 각 방법론 장면으로 대신한다) */
scene({
  sec: 'pr', page: 28, kind: '방법론', title: 'Step-Back 프롬프팅', dur: 6.5,
  cap: '구체적인 질문에 바로 답하지 않고, 먼저 그 뒤에 있는 원리를 묻는 더 일반적인 질문을 만들어 답한다. 그다음 그 원리로 원래 질문을 푼다.',
  build(S) {
    S.cue([1.78, 2.88, 4.08, 4.8]);
    const O = S.doc(16, 214, 212, 88, '원래 질문', ['이상기체의 온도를 2배로, 부피를', '8배로 늘리면 압력은 어떻게 되는가?'], { fs: 11.5, lh: 19, gap: 24 });
    const B = S.doc(120, 30, 262, 74, '물러선 질문', ['이상기체에서 압력, 부피, 온도의 관계는?'], { fs: 12, gap: 26 });
    const R = S.doc(410, 30, 214, 74, '원리', []);
    S.text(517, 72, 'PV = nRT', { fs: 19, fw: 800, parent: R.g });
    const A = S.doc(282, 214, 236, 88, '원리로 풀기', ['P = nRT / V 이므로', '2 ÷ 8 = 1/4'], { fs: 12, lh: 20, gap: 24 });
    const F = S.box(540, 234, 84, 48, '1/4배', { cls: 'solid', fs: 16 });
    const w1 = S.vL([90, 214], [120, 67]), w2 = S.wire([[382, 67], [410, 67]]);
    const w3 = S.vh([517, 104], [400, 214], { my: 160 }), w4 = S.wire([[518, 258], [540, 258]]);
    const l1 = S.text(98, 150, '한 걸음 물러서기', { fs: 11, fw: 700, cls: 'acc', anchor: 'start' });
    const l2 = S.text(528, 140, '원리를 적용', { fs: 11, fw: 700, cls: 'acc', anchor: 'start' });
    S.hl(O, 0.2, 0.9);
    S.draw(w1, 0.7, 1.25); S.dot(w1, 0.7, 1.25); S.vis(l1, 0.8);
    S.vis(B, 1.25); S.hl(B, 1.25, 1.9);
    S.draw(w2, 1.8, 2.2); S.dot(w2, 1.8, 2.2); S.vis(R, 2.25); S.hl(R, 2.25, 2.9);
    S.draw(w3, 2.9, 3.5); S.dot(w3, 2.9, 3.5); S.vis(l2, 3.0); S.vis(A, 3.55); S.hl(A, 3.55, 4.2);
    S.draw(w4, 4.1, 4.45); S.dot(w4, 4.1, 4.45); S.vis(F, 4.5);
  }
});

scene({
  sec: 'pr', page: 29, kind: '방법론', title: 'Generated Knowledge', dur: 6.5,
  cap: '답하기 전에 모델이 관련 사실을 먼저 생성하게 하고, 그 지식을 질문과 함께 다시 넣어 답하게 한다. 생성한 지식이 틀리면 오류도 함께 들어가므로, 사실 정확성이 중요하면 검증된 문서를 검색해 넣는 RAG가 더 안전하다.',
  build(S) {
    S.cue([2.55, 3.48, 4.08, 5.3]);
    const Q = S.doc(16, 56, 190, 60, '질문', ['사람의 갈비뼈는 몇 쌍인가?'], { fs: 12, gap: 22 });
    const L1 = S.box(230, 66, 60, 40, 'LLM', { cls: 'solid', fs: 13 }); S.text(260, 54, '1단계', { fs: 11, cls: 'sub' });
    const K = S.doc(316, 30, 308, 120, '생성한 지식', ['갈비뼈는 좌우 대칭으로 있다.', '대부분의 성인은 갈비뼈가 24개다.', { t: '… (모델이 쓴 사실 문장)', cls: 'sub' }], { fs: 12, lh: 24, gap: 26 });
    const C = S.doc(16, 206, 270, 80, '질문 + 생성한 지식', ['사람의 갈비뼈는 몇 쌍인가?', { t: '+ 위의 지식 문장', cls: 'sub' }], { fs: 12, lh: 20, gap: 24 });
    const L2 = S.box(310, 226, 60, 40, 'LLM', { cls: 'solid', fs: 13 }); S.text(340, 214, '2단계', { fs: 11, cls: 'sub' });
    const A = S.box(396, 226, 94, 40, '12쌍', { cls: 'solid', fs: 15 }); S.slot(A);
    const warn = S.text(16, 322, '생성한 지식이 틀리면 그 오류를 그대로 믿고 답한다', { fs: 11.5, fw: 700, cls: 'acc', anchor: 'start' });
    const w1 = S.wire([[206, 86], L1.l]), w2 = S.wire([L1.r, [316, 86]]);
    const w3 = S.vh([470, 150], [151, 206], { my: 178 });
    const w4 = S.wire([[286, 246], L2.l]), w5 = S.wire([L2.r, A.l]);
    S.hl(Q, 0.2, 0.8); S.dot(w1, 0.5, 0.85); S.hl(L1, 0.8, 1.3); S.dot(w2, 1.0, 1.35);
    K.rows.forEach((r, i) => S.vis(r, 1.4 + i * 0.4));
    S.dot(w3, 2.6, 3.2); S.hl(C, 3.15, 3.8); S.dot(w4, 3.5, 3.85); S.hl(L2, 3.8, 4.3); S.dot(w5, 4.1, 4.45); S.vis(A, 4.5); S.vis(warn, 5.0);
  }
});

scene({
  sec: 'pr', page: 31, kind: '방법론', title: 'Self-Consistency', dur: 6.5,
  cap: '같은 CoT 프롬프트로 추론 경로를 여러 번 샘플링하고, 최종 답만 모아 가장 많이 나온 답을 고른다. 경로 하나가 틀려도 여러 경로가 같은 답에 이르면 그 답을 택한다.',
  build(S) {
    S.cue([2.55, 4.15, 4.9]);
    const P = S.box(16, 150, 124, 60, '같은 프롬프트', { sub: '5번 샘플링 · T = 0.7', fs: 13, sfs: 10.5 });
    const ans = [8, 8, 6, 8, 8], ys = [30, 92, 154, 216, 278];
    const paths = [], tags = [], chains = [];
    ys.forEach((y, k) => {
      S.box(196, y, 224, 44, '');
      S.text(206, y + 22, '경로 ' + (k + 1), { fs: 12, fw: 700, anchor: 'start' });
      const cy = y + 22;
      const cs = [270, 300, 330].map(x => mk('circle', { cx: x, cy, r: 4, class: 'cell f' }, S.root));
      const ls = [S.wire([[274, cy], [296, cy]], { arrow: false, cls: 'thin' }), S.wire([[304, cy], [326, cy]], { arrow: false, cls: 'thin' })];
      chains.push({ cs, ls });
      tags.push(S.box(358, y + 9, 54, 26, ans[k] + '일', { fs: 12.5 }));
      paths.push(S.hv(P.r, [196, cy], { mx: 168 }));
    });
    S.box(456, 110, 168, 140, '');
    S.text(468, 128, '다수결', { fs: 12.5, fw: 800, anchor: 'start' });
    S.text(468, 162, '8일', { fs: 12.5, fw: 700, anchor: 'start' }); S.rect(500, 154, 90, 16, 'track');
    S.bar(500, 154, 72, 16, 3.3, 4.1, { cls: 'acc' }); const c8 = S.text(598, 162, '0', { fs: 12.5, fw: 800, anchor: 'start' });
    S.text(468, 194, '6일', { fs: 12.5, fw: 700, anchor: 'start' }); S.rect(500, 186, 90, 16, 'track');
    S.bar(500, 186, 18, 16, 3.3, 3.6); const c6 = S.text(598, 194, '0', { fs: 12.5, fw: 800, anchor: 'start' });
    const fin = S.box(468, 214, 144, 26, '8일 (5개 중 4개)', { cls: 'solid', fs: 12 });
    const vw = tags.map(t => S.hv(t.r, [456, 180], { mx: 436 }));
    S.hl(P, 0.2, 0.8); paths.forEach((p, k) => S.dot(p, 0.4 + k * 0.05, 1.0 + k * 0.05));
    chains.forEach((c, k) => { c.cs.forEach((ci, j) => S.vis(ci, 1.0 + j * 0.3 + k * 0.05)); c.ls.forEach((l, j) => S.vis(l, 1.15 + j * 0.3 + k * 0.05)); });
    tags.forEach((t, k) => S.vis(t.tx, 2.0 + k * 0.08));
    vw.forEach((p, k) => S.dot(p, 2.6 + k * 0.06, 3.2 + k * 0.06));
    S.num(c8, 0, 4, 3.3, 4.1, v => String(Math.round(v))); S.num(c6, 0, 1, 3.3, 3.6, v => String(Math.round(v)));
    S.vis(fin, 4.6); S.cls(tags[2], 'muted', 4.6);
  }
});

scene({
  sec: 'pr', page: 32, kind: '방법론', title: 'Tree of Thoughts', dur: 7,
  cap: '각 단계에서 후보 생각을 여러 개 만들고, 모델이 가망을 평가해 불가능한 가지를 버린다. 막다른 가지에 이르면 되돌아가 다른 가지를 탐색한다.',
  build(S) {
    S.cue([1.6, 2.05, 3.1, 4.05, 4.88, 5.7]);
    const R = S.box(220, 12, 200, 36, '4, 9, 10, 13으로 24 만들기', { fs: 13 });
    const a = S.box(30, 90, 170, 42, '13 − 9 = 4', { sub: '남은 수 4, 4, 10', fs: 13.5, sfs: 10.5 });
    const b = S.box(235, 90, 170, 42, '4 × 9 = 36', { sub: '남은 수 10, 13, 36', fs: 13.5, sfs: 10.5 });
    const c = S.box(440, 90, 170, 42, '4 + 9 = 13', { sub: '남은 수 10, 13, 13', fs: 13.5, sfs: 10.5 });
    const ra = S.vh(R.b, a.t, { my: 68 }), rb = S.wire([R.b, b.t]), rc = S.vh(R.b, c.t, { my: 68 });
    const ea = S.text(160, 146, '가능', { fs: 11.5, fw: 800 }), eb = S.text(365, 146, '가능', { fs: 11.5, fw: 800 }), ec = S.text(525, 146, '불가능', { fs: 11.5, fw: 800, cls: 'acc' });
    const b1 = S.box(232, 184, 84, 42, '36 − 13 = 23', { sub: '남은 수 10, 23', fs: 11.5, sfs: 9.5 });
    const b2 = S.box(324, 184, 84, 42, '13 − 10 = 3', { sub: '남은 수 3, 36', fs: 11.5, sfs: 9.5 });
    const bb1 = S.vh(b.b, b1.t, { my: 162 }), bb2 = S.vh(b.b, b2.t, { my: 162 });
    const eb1 = S.text(274, 238, '불가능', { fs: 11, fw: 800, cls: 'acc' }), eb2 = S.text(366, 238, '불가능', { fs: 11, fw: 800, cls: 'acc' });
    const a1 = S.box(30, 184, 170, 42, '10 − 4 = 6', { sub: '남은 수 4, 6', fs: 13.5, sfs: 10.5 });
    const aa1 = S.wire([a.b, a1.t]);
    const ea1 = S.text(160, 238, '확실', { fs: 11.5, fw: 800 });
    const leaf = S.box(15, 268, 200, 42, '(10 − 4) × (13 − 9) = 24', { cls: 'solid', fs: 13 });
    const al = S.wire([a1.b, leaf.t]);
    const xc = S.xmark(c.cx, c.cy, 22), xb1 = S.xmark(b1.cx, b1.cy, 18), xb2 = S.xmark(b2.cx, b2.cy, 18);
    const bt = S.path('M380,90 C380,70 400,70 400,52', { cls: 'dash on' });
    const btl = S.text(408, 80, '되돌아가기', { fs: 11, fw: 800, cls: 'acc', anchor: 'start' });
    S.vis([a, b, c], 0.7); [ra, rb, rc].forEach(w => S.draw(w, 0.3, 0.8));
    S.vis([ea, eb, ec], 1.3);
    S.vis(xc, 1.8); S.cls([c, rc, ec], 'muted', 1.8);
    S.hl(b, 2.1, 2.6); [bb1, bb2].forEach(w => S.draw(w, 2.1, 2.5)); S.vis([b1, b2], 2.4);
    S.vis([eb1, eb2], 2.8); S.vis([xb1, xb2], 3.2); S.cls([b1, b2, bb1, bb2, eb1, eb2], 'muted', 3.2);
    S.vis(bt, 3.5); S.vis(btl, 3.6); S.cls([b, rb, eb], 'muted', 4.0);
    S.hl(a, 4.1, 4.6); S.draw(aa1, 4.1, 4.4); S.vis(a1, 4.4); S.vis(ea1, 4.7);
    S.draw(al, 4.9, 5.2); S.vis(leaf, 5.2);
    S.hl([ra, aa1, al], 5.4);
  }
});

scene({
  sec: 'pr', page: 33, kind: '방법론', title: 'ReAct', dur: 7,
  cap: 'Thought로 다음에 할 일을 추론하고, Action으로 검색이나 API를 호출하고, Observation으로 결과를 받아 다시 추론한다. 수치는 관찰한 문서에서만 가져오므로 환각이 줄지만, 도구 출력은 외부 텍스트라 간접 프롬프트 인젝션의 통로가 될 수 있다.',
  build(S) {
    S.cue([1.28, 1.98, 2.58, 3.28, 4.28, 5.6]);
    const Q = S.box(16, 14, 348, 36, 'Question: 아세트아미노펜의 성인 1일 최대 용량은?', { fs: 12, anchor: 'start', fw: 700 });
    const T = S.box(40, 100, 180, 60, '');
    S.text(130, 120, 'Thought', { fs: 15, fw: 700 });
    const t1 = S.text(130, 143, '최신 허가 정보를 확인해야 한다', { fs: 10.5, cls: 'sub', maxw: 164 });
    const t2 = S.text(130, 143, '관찰한 문서를 근거로 답한다', { fs: 10.5, cls: 'acc', fw: 700, maxw: 164 });
    const A = S.box(330, 100, 180, 60, '');
    S.text(420, 120, 'Action', { fs: 15, fw: 700 }); S.text(420, 143, 'search[허가사항]', { fs: 11, cls: 'sub' });
    const O = S.box(185, 232, 180, 60, '');
    S.text(275, 252, 'Observation', { fs: 15, fw: 700 }); const ot = S.text(275, 275, '허가사항 문서 내용', { fs: 11, cls: 'sub' });
    const TL = S.box(532, 196, 92, 72, '검색 도구', { cls: 'dash', sub: '외부 문서', fs: 13 });
    const F = S.box(400, 304, 224, 40, 'finish[허가사항 수치 + 출처]', { cls: 'solid', fs: 12 }); S.slot(F);
    const w0 = S.wire([[130, 50], [130, 100]]), w1 = S.wire([T.r, A.l]);
    const w2 = S.hL([510, 130], [578, 196]), w3 = S.hv([532, 248], [365, 262], { mx: 450 });
    const w4 = S.hL([185, 262], [130, 160]), w5 = S.wire([[40, 130], [24, 130], [24, 324], [400, 324]]);
    const note = S.text(40, 348, '도구 출력은 외부 텍스트라 데이터로만 다룬다', { fs: 10.5, cls: 'sub', anchor: 'start' });
    S.hl(Q, 0.1, 0.6); S.dot(w0, 0.4, 0.8); S.hl(T, 0.8, 1.4); S.vis(t1, 0.9, 3.8);
    S.dot(w1, 1.3, 1.7); S.hl(A, 1.7, 2.2); S.dot(w2, 2.0, 2.4); S.hl(TL, 2.4, 2.8);
    S.dot(w3, 2.6, 3.0); S.hl(O, 3.0, 3.5); S.vis(ot, 2.95);
    S.dot(w4, 3.3, 3.8); S.hl(T, 3.8, 4.4); S.vis(t2, 3.8);
    S.dot(w5, 4.3, 5.0); S.vis(F, 5.0); S.vis(note, 5.3);
  }
});

scene({
  sec: 'pr', page: 34, kind: '방법론', title: 'Self-Refine', dur: 7,
  cap: '같은 모델이 초안을 쓰고, 문제를 구체적으로 지적하고, 그 지적을 반영해 고쳐 쓰기를 반복한다. 반복 횟수 상한과 종료 조건을 정해 두어야 한다.',
  build(S) {
    S.cue([2.18, 3.28, 4.78, 5.9]);
    const D = S.box(16, 140, 160, 60, '초안', { sub: '퇴원 안내문', fs: 15 });
    const FB = S.box(230, 30, 200, 120, '');
    S.text(242, 48, '피드백', { fs: 12.5, fw: 800, anchor: 'start' });
    const f = ['① ‘NPO’를 쉬운 말로', '② 재방문 시점이 빠짐', '③ 첫 문장이 너무 김'].map((s, i) => S.text(242, 76 + i * 24, s, { fs: 12, anchor: 'start' }));
    const done = S.text(242, 100, '더 고칠 점 없음', { fs: 13, fw: 800, cls: 'acc', anchor: 'start' });
    const RV = S.box(230, 196, 200, 120, '');
    S.text(242, 214, '수정', { fs: 12.5, fw: 800, anchor: 'start' });
    const rv = S.group('');
    ['수술 전날 밤 12시부터는 물을', '포함해 아무것도 드시지 마세요.'].forEach((s, i) => S.text(242, 244 + i * 20, s, { fs: 11.5, anchor: 'start', parent: rv }));
    S.text(242, 286, '…', { fs: 12, cls: 'sub', anchor: 'start', parent: rv });
    const c1 = S.text(470, 176, '반복 1회', { fs: 12.5, fw: 800, cls: 'acc', anchor: 'start' });
    const c2 = S.text(470, 176, '반복 2회', { fs: 12.5, fw: 800, cls: 'acc', anchor: 'start' });
    const OK = S.box(500, 66, 124, 48, '완료', { cls: 'solid', fs: 16 }); S.slot(OK);
    const w1 = S.hv(D.r, [230, 90], { mx: 203 }), w2 = S.wire([[330, 150], [330, 196]]);
    const w3 = S.wire([[430, 256], [460, 256], [460, 90], [430, 90]]);
    const w4 = S.wire([[330, 30], [330, 16], [562, 16], [562, 66]]);
    const note = S.text(16, 340, '같은 모델이 쓰고, 지적하고, 고친다 · 종료 조건이 필요하다', { fs: 11, cls: 'sub', anchor: 'start' });
    S.hl(D, 0.2, 0.7); S.dot(w1, 0.5, 1.0); S.hl(FB, 1.0, 2.1); f.forEach((t, i) => S.vis(t, 1.2 + i * 0.3, 4.2));
    S.dot(w2, 2.2, 2.6); S.hl(RV, 2.6, 3.3); S.vis(rv, 2.65); S.vis(c1, 2.7, 4.0);
    S.dot(w3, 3.3, 4.0); S.vis(c2, 4.0); S.hl(FB, 4.0, 4.8); S.vis(done, 4.3);
    S.dot(w4, 4.8, 5.3); S.vis(OK, 5.3); S.vis(note, 5.6);
  }
});

scene({
  sec: 'pr', page: 35, kind: '방법론', title: 'Prompt Chaining', dur: 6.6,
  cap: '큰 과제를 추출, 분류, 작성처럼 짧은 프롬프트의 연결로 나눈다. 단계마다 출력 형식을 고정하고 중간 결과를 저장하면 어느 단계에서 틀렸는지 확인하고 고치기 쉽다.',
  build(S) {
    S.cue([1.58, 2.78, 4.08, 5.3]);
    S.text(320, 30, '한 단계의 출력이 다음 단계의 입력이 된다', { fs: 12, cls: 'sub' });
    const IN = S.box(16, 70, 84, 60, '녹취록', { sub: '상담', fs: 14 });
    const st = [['단계 1', '추출', 124], ['단계 2', '분류', 254], ['단계 3', '작성', 384]].map(s => S.box(s[2], 70, 100, 60, s[0], { sub: s[1], fs: 15, sfs: 12 }));
    const FO = S.box(512, 70, 112, 60, '결과', { fs: 14, cls: 'dash' });
    const FS = S.box(512, 70, 112, 60, '3줄 요약', { sub: '의료진용', cls: 'solid', fs: 14 });
    const ws = [S.wire([IN.r, st[0].l]), S.wire([st[0].r, st[1].l]), S.wire([st[1].r, st[2].l]), S.wire([st[2].r, FO.l])];
    const chips = [['수술 부위 통증', '퇴원 날짜', '보험 적용 여부'], ['증상: 통증', '절차: 퇴원 날짜', '비용: 보험'], ['① 주호소: 통증', '② 문의: 퇴원 일정', '③ 확인: 보험 적용']];
    const cg = chips.map((cs, k) => cs.map((c, i) => S.box(st[k].x, 150 + i * 30, 100, 24, c, { cls: 'ghost', fs: 11, fw: 600 })));
    st.forEach(s => S.wire([s.b, [s.cx, 148]]));
    const note = S.text(320, 274, '단계마다 중간 결과를 저장해 어느 단계에서 틀렸는지 확인한다', { fs: 11.5, cls: 'sub' });
    S.hl(IN, 0.2, 0.6); S.dot(ws[0], 0.4, 0.8);
    [0, 1, 2].forEach(k => {
      const b = 0.8 + k * 1.2;
      S.hl(st[k], b, b + 0.6);
      cg[k].forEach((c, i) => S.vis(c, b + 0.2 + i * 0.15));
      if (k < 2) S.dot(ws[k + 1], b + 0.8, b + 1.2);
    });
    S.dot(ws[3], 4.1, 4.5); S.vis(FS, 4.6); S.vis(note, 5.0);
  }
});

scene({
  sec: 'pr', page: 36, kind: '방법론', title: 'Meta Prompt', dur: 7,
  cap: '과제별 프롬프트를 사람이 쓰는 대신, 프롬프트를 만드는 상위 프롬프트를 준다. 모델이 만든 프롬프트도 고정한 뒤 평가 세트와 사람 검토로 확인하고 쓴다.',
  build(S) {
    S.cue([1.22, 2.98, 3.98, 4.58, 5.25]);
    S.text(16, 16, '1단계 · 프롬프트 생성', { fs: 12, fw: 800, anchor: 'start' });
    S.text(16, 194, '2단계 · 과제 수행', { fs: 12, fw: 800, anchor: 'start' });
    const M = S.doc(16, 30, 220, 122, '메타 프롬프트', ['당신은 프롬프트 설계자입니다.', '역할·입출력 형식·판단 기준·', '금지 사항·경계 사례를 넣어 작성', { t: '과제: 보호자 질문을 3단계로 분류', fw: 700 }], { fs: 11.5, lh: 19, gap: 24 });
    const L1 = S.box(258, 71, 60, 40, 'LLM', { cls: 'solid', fs: 13 });
    const G = S.doc(340, 30, 284, 122, '모델이 만든 과제용 프롬프트', ['역할: 소아응급 분류 보조자', '출력: {"분류": 응급|외래|자가관리, "근거"}', '기준: 호흡 곤란, 의식 저하, 탈수는 응급', '경계: 애매하면 더 높은 단계로'], { fs: 11.5, lh: 19, gap: 24 });
    const chk = S.text(212, 190, '고정 후 평가 세트·사람 검토', { fs: 11, fw: 700, cls: 'acc', anchor: 'start' });
    const I = S.doc(16, 206, 220, 86, '입력', ['생성한 프롬프트 +', '“아이가 숨쉬기 힘들어해요”'], { fs: 11.5, lh: 20, gap: 24 });
    const L2 = S.box(258, 229, 60, 40, 'LLM', { cls: 'solid', fs: 13 });
    S.doc(340, 206, 284, 86, '출력', []);
    const ot = S.text(352, 256, '{"분류": "응급", "근거": "호흡 곤란"}', { fs: 11.5, anchor: 'start', maxw: 260 });
    ot.classList.add('mono');
    const w1 = S.wire([[236, 91], L1.l]), w2 = S.wire([L1.r, [340, 91]]);
    const w3 = S.vh([482, 152], [200, 206], { my: 172 });
    const w4 = S.wire([[236, 249], L2.l]), w5 = S.wire([L2.r, [340, 249]]);
    S.hl(M, 0.2, 0.9); S.dot(w1, 0.6, 0.95); S.hl(L1, 0.95, 1.5); S.dot(w2, 1.25, 1.6);
    G.rows.forEach((r, i) => S.vis(r, 1.7 + i * 0.25)); S.vis(chk, 3.0);
    S.dot(w3, 3.0, 3.7); S.hl(I, 3.65, 4.2); S.dot(w4, 4.0, 4.3); S.hl(L2, 4.3, 4.8); S.dot(w5, 4.6, 4.9); S.vis(ot, 4.95);
  }
});

scene({
  sec: 'pr', page: 37, kind: '방법론', title: '자동 프롬프트 최적화 APE·OPRO', dur: 7,
  cap: 'LLM이 지금까지의 지시문과 점수 기록을 보고 더 나은 지시문을 제안하면, 검증 세트에서 점수를 매겨 기록에 더하고 이를 되풀이한다. 같은 탐색 구조에 다른 목적 함수를 걸면 PAIR 같은 자동 탈옥 공격이 된다.',
  build(S) {
    S.cue([1.38, 2.95, 4.55, 6.5]);
    const H = S.box(16, 30, 290, 196, '');
    S.text(28, 48, '지시문과 점수 기록', { fs: 11.5, fw: 700, cls: 'sub', anchor: 'start' });
    S.text(294, 48, '점수', { fs: 10.5, cls: 'sub', anchor: 'end' });
    const row = (y, h, lines, score, cls) => {
      const g = S.group('');
      const bx = S.box(26, y, 270, h, '', { cls: 'ghost', parent: g });
      lines.forEach((l, i) => S.text(36, y + h / 2 + (i - (lines.length - 1) / 2) * 17, l, { fs: 11.5, anchor: 'start', parent: g, maxw: 210 }));
      S.text(286, y + h / 2, score, { fs: 14, fw: 800, anchor: 'end', parent: g, cls: cls || '' });
      return { g, bx };
    };
    row(62, 32, ['“답을 계산하세요.”'], '61');
    row(102, 32, ['“단계별로 풀어 답을 계산하세요.”'], '72');
    const r3 = row(142, 46, ['“문제의 조건을 먼저 정리하고, 단계별로', '계산한 뒤, 마지막에 답을 다시 확인하세요.”'], '76', 'acc');
    const L = S.box(330, 100, 80, 50, 'LLM', { cls: 'solid', sub: '최적화기', fs: 15, sfs: 10.5 });
    const N = S.doc(432, 30, 192, 120, '새 지시문 후보', ['문제의 조건을 먼저 정리하고,', '단계별로 계산한 뒤, 마지막에', '답을 다시 확인하세요.'], { fs: 11.5, lh: 20, gap: 26 });
    const E = S.box(432, 196, 192, 100, '');
    S.text(444, 214, '검증 세트 평가', { fs: 11, fw: 700, cls: 'sub', anchor: 'start' });
    S.rect(444, 232, 168, 10, 'track'); S.bar(444, 232, 168 * 0.76, 10, 3.4, 4.4, { cls: 'acc' });
    S.text(444, 272, '정확도', { fs: 12, anchor: 'start' });
    const sc = S.text(612, 272, '0', { fs: 22, fw: 800, anchor: 'end' });
    const w1 = S.wire([[306, 125], L.l]), w2 = S.hv(L.r, [432, 90], { mx: 421 }), w3 = S.wire([[528, 150], [528, 196]]);
    const w4 = S.wire([[432, 250], [161, 250], [161, 226]]);
    const lp = S.text(300, 266, '반복', { fs: 11.5, fw: 800, cls: 'acc' });
    S.text(16, 334, '점수는 장표와 같은 설명용 가상 값', { fs: 10.5, cls: 'sub', anchor: 'start' });
    S.hl(H, 0.2, 0.9); S.dot(w1, 0.6, 1.0); S.hl(L, 1.0, 1.6); S.dot(w2, 1.4, 1.8);
    N.rows.forEach((r, i) => S.type(r, 1.8 + i * 0.35, 2.15 + i * 0.35));
    S.dot(w3, 3.0, 3.4); S.hl(E, 3.4, 4.4); S.num(sc, 0, 76, 3.4, 4.4, v => String(Math.round(v)));
    S.vis(lp, 4.6); S.dot(w4, 4.6, 5.2); S.vis(r3.g, 5.2); S.hl(r3.bx, 5.2, 6.2);
  }
});

/* VLM: 41~44쪽, VLA: 46쪽 */
scene({
  sec: 'vlm', page: 41, kind: '그림 7', title: 'VLM의 일반 구조', dur: 6.5,
  cap: '이미지를 패치로 잘라 비전 인코더로 특징을 뽑고, 연결 모듈이 이를 LLM이 읽는 시각 토큰으로 바꾼다. LLM은 시각 토큰과 텍스트 토큰을 한 시퀀스로 처리해 답을 생성한다.',
  build(S) {
    S.cue([1.98, 3.48, 4.3, 5.6, 6.45]);
    S.img(16, 108, 90, 90, 'xray');
    const grid = S.group('');
    [1, 2].forEach(k => { S.line(16 + 30 * k, 108, 16 + 30 * k, 198, 'gl', grid); S.line(16, 108 + 30 * k, 106, 108 + 30 * k, 'gl', grid); });
    S.text(61, 214, '패치 분할', { fs: 11, cls: 'sub' });
    const VE = S.box(128, 123, 92, 60, '비전 인코더', { sub: 'ViT · CLIP', fs: 13.5 });
    const CN = S.box(242, 123, 96, 60, '연결 모듈', { sub: '투영 · Q-Former\n리샘플러', fs: 13.5, sfs: 10 });
    S.text(396, 132, '시각 + 텍스트 토큰', { fs: 10, cls: 'sub' });
    const vt = S.cells(352, 147, 4, 9, 2, 'a'), tt = S.cells(396, 147, 4, 9, 2, '');
    S.box(242, 236, 190, 34, '이 영상의 이상 소견을 설명해줘', { fs: 11.5 });
    const LM = S.box(452, 98, 92, 124, 'LLM', { sub: '디코더\n한 시퀀스로 처리', fs: 16, sfs: 10 });
    const OUT = S.box(560, 128, 64, 64, '');
    S.text(592, 116, '출력', { fs: 11, cls: 'sub' });
    const ot = S.group(''); S.text(592, 151, '폐렴 소견이', { fs: 10.5, parent: ot }); S.text(592, 169, '보입니다…', { fs: 10.5, parent: ot });
    const w1 = S.wire([[106, 153], VE.l]), w2 = S.wire([VE.r, CN.l]), w3 = S.wire([CN.r, [350, 153]]);
    const w4 = S.wire([[417, 236], [417, 158]]), w5 = S.wire([[440, 153], [452, 153]]), w6 = S.wire([LM.r, OUT.l]);
    const n1 = S.text(16, 306, '① 정렬 사전학습: 연결 모듈만 학습', { fs: 11.5, anchor: 'start' });
    const n2 = S.text(16, 328, '② 시각 지시 튜닝: 연결 모듈과 LLM을 함께 미세조정', { fs: 11.5, anchor: 'start' });
    S.text(624, 328, '학습 단계는 LLaVA 기준', { fs: 10, cls: 'sub', anchor: 'end' });
    S.vis(grid, 0.4); S.dot(w1, 0.7, 1.1); S.hl(VE, 1.1, 1.6); S.dot(w2, 1.5, 1.9); S.hl(CN, 1.9, 2.4);
    S.dot(w3, 2.0, 2.3); S.dot(w4, 2.0, 2.4); S.vis(vt, 2.3);
    S.dot(w5, 2.6, 2.9); S.hl(LM, 2.9, 3.6); S.dot(w6, 3.5, 3.9); S.vis(ot, 3.95);
    S.vis([n1, n2], 4.6); S.cls(n1, 'acc', 4.8, 5.6); S.hl(CN, 4.8, 5.6); S.cls(n2, 'acc', 5.6, 6.5); S.hl([CN, LM], 5.6, 6.5);
    void tt;
  }
});

scene({
  sec: 'vlm', page: 42, kind: '구조도', title: 'Vision Transformer', dur: 7,
  cap: '이미지를 패치로 잘라 단어처럼 펼친 뒤 선형 투영으로 임베딩을 만들고, 맨 앞에 [class] 토큰을 붙이고 위치 임베딩을 더해 트랜스포머 인코더에 넣는다. 분류는 [class] 토큰의 출력으로 한다.',
  build(S) {
    S.cue([1.95, 2.85, 3.18, 4.28, 5.7]);
    S.img(16, 196, 96, 96, 'cat');
    const grid = S.group(''), nums = S.group('');
    [1, 2].forEach(k => { S.line(16 + 32 * k, 196, 16 + 32 * k, 292, 'gl', grid); S.line(16, 196 + 32 * k, 112, 196 + 32 * k, 'gl', grid); });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) S.text(16 + 32 * c + 8, 196 + 32 * r + 9, String(r * 3 + c + 1), { fs: 9, fw: 700, cls: 'acc', parent: nums });
    const px = k => 178 + k * 28;
    const cls0 = S.group(''); S.rect(150, 300, 22, 22, 'cell f', cls0); S.text(161, 311, 'C', { fs: 10, fw: 800, cls: 'oi', parent: cls0 });
    const pc = []; for (let k = 0; k < 9; k++) { const g = S.group(''); S.rect(px(k), 300, 22, 22, 'cell', g); S.text(px(k) + 11, 311, String(k + 1), { fs: 10, fw: 700, parent: g }); pc.push(g); }
    S.text(161, 338, '[class]', { fs: 9.5, fw: 700, cls: 'acc' });
    S.text(436, 311, '펼친 패치: 16×16×3 = 768개 값', { fs: 10.5, cls: 'sub', anchor: 'start', maxw: 196 });
    const E = S.box(172, 256, 256, 24, '선형 투영 E (패치 임베딩)', { fs: 11.5 });
    const emb = [S.rect(150, 216, 22, 22, 'cell f')]; for (let k = 0; k < 9; k++) emb.push(S.rect(px(k), 216, 22, 22, 'cell a'));
    const pos = S.group(''); for (let k = 0; k < 10; k++) S.text(k === 0 ? 161 : px(k - 1) + 11, 206, String(k), { fs: 9, fw: 700, cls: 'acc', parent: pos });
    const posl = S.text(436, 227, '+ 위치 임베딩 (학습)', { fs: 10.5, fw: 700, cls: 'acc', anchor: 'start' });
    const TE = S.box(140, 132, 294, 62, '트랜스포머 인코더', { sub: 'L층 · ViT-Base는 12층, 은닉 크기 768', fs: 14, sfs: 10.5 });
    const MH = S.box(116, 72, 90, 32, 'MLP 헤드', { fs: 12.5 });
    const OUT = S.box(232, 72, 84, 32, '고양이', { cls: 'solid', fs: 13 }); S.slot(OUT);
    const wm = S.wire([[161, 132], [161, 104]]), wo = S.wire([MH.r, OUT.l]);
    S.text(624, 24, '224×224 이미지를 16×16으로 자르면 패치 196개', { fs: 10.5, cls: 'sub', anchor: 'end' });
    const fly = [], up1 = [], up2 = [S.wire([[161, 216], [161, 194]], { cls: 'inv', arrow: false })];
    for (let k = 0; k < 9; k++) {
      const r = Math.floor(k / 3), c = k % 3;
      fly.push(S.wire([[16 + 32 * c + 16, 196 + 32 * r + 16], [px(k) + 11, 300]], { cls: 'inv', arrow: false }));
      up1.push(S.wire([[px(k) + 11, 300], [px(k) + 11, 238]], { cls: 'inv', arrow: false }));
      up2.push(S.wire([[px(k) + 11, 216], [px(k) + 11, 194]], { cls: 'inv', arrow: false }));
    }
    S.vis([grid, nums], 0.3);
    fly.forEach((p, k) => S.dot(p, 0.6 + k * 0.08, 1.1 + k * 0.08, { r: 4, lit: false }));
    pc.forEach((g, k) => S.vis(g, 1.05 + k * 0.08));
    S.vis(cls0, 1.75);
    S.hl(E, 1.9, 2.6); up1.forEach(p => S.dot(p, 2.0, 2.5, { r: 3.5, lit: false }));
    emb.forEach((e, k) => S.vis(e, 2.5 + k * 0.03));
    S.vis([pos, posl], 2.9);
    up2.forEach(p => S.dot(p, 3.2, 3.5, { r: 3.5, lit: false }));
    S.hl(TE, 3.5, 4.3); S.dot(wm, 4.3, 4.7); S.hl(MH, 4.7, 5.1); S.dot(wo, 5.0, 5.35); S.vis(OUT, 5.4);
  }
});

scene({
  sec: 'vlm', page: 43, kind: '구조도', title: 'CLIP', dur: 7,
  cap: '이미지-텍스트 쌍으로 두 인코더를 함께 학습해 맞는 쌍의 유사도는 높이고 나머지는 낮춘다. 분류할 때는 라벨마다 문장을 만들고, 이미지와 가장 유사한 문장을 고른다.',
  build(S) {
    S.cue([2.0, 3.98, 4.88, 5.65, 6.2]);
    S.text(166, 18, '① 대조 사전학습', { fs: 12.5, fw: 800 }); S.text(482, 18, '② 제로샷 분류', { fs: 12.5, fw: 800 });
    S.line(330, 10, 330, 346, 'rule');
    const TE = S.box(118, 34, 168, 26, '텍스트 인코더', { fs: 12 });
    const IE = S.box(16, 86, 72, 160, '이미지\n인코더', { fs: 12.5 });
    [138, 178, 218, 258].forEach((x, i) => S.text(x, 76, 'T' + (i + 1), { fs: 11, fw: 700 }));
    [106, 146, 186, 226].forEach((y, i) => S.text(104, y, 'I' + (i + 1), { fs: 11, fw: 700 }));
    const cells = [], ctx = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = 120 + c * 40, y = 88 + r * 40;
      cells.push({ r, c, el: S.rect(x, y, 36, 36, 'cell') });
      const t = mk('text', { x: x + 18, y: y + 18, 'text-anchor': 'middle', class: 'ctx' }, S.root);
      t.textContent = 'I' + (r + 1) + '·T' + (c + 1); ctx.push({ r, c, el: t });
    }
    S.text(200, 266, '대각선(맞는 쌍)은 높이고 나머지는 낮춘다', { fs: 11, cls: 'sub', maxw: 296 });
    S.text(200, 286, '실제 학습: 쌍 4억 개, 미니배치 32,768', { fs: 10.5, cls: 'sub', maxw: 296 });
    const TP = S.box(344, 32, 272, 26, '"A photo of a {label}."', { fs: 12 });
    const lab = ['개', '고양이', '자동차'], lx = [394, 480, 566];
    lab.forEach((l, i) => S.box(lx[i] - 30, 72, 60, 22, l, { cls: 'ghost', fs: 11.5 }));
    const TE2 = S.box(344, 108, 272, 26, '텍스트 인코더', { fs: 12 });
    const Tb = lab.map((l, i) => S.box(lx[i] - 36, 148, 72, 28, 'T(' + l + ')', { fs: 11 }));
    const vals = [0.21, 0.83, 0.05];
    const vt = lab.map((l, i) => S.text(lx[i], 194, '0.00', { fs: 13, fw: 800 }));
    S.img(344, 232, 60, 60, 'cat');
    const IE2 = S.box(428, 246, 106, 32, '이미지 인코더', { fs: 12 });
    const IV = S.box(556, 248, 60, 28, 'I', { cls: 'solid', fs: 14 });
    const res = S.text(480, 216, '예측: 고양이', { fs: 12.5, fw: 800, cls: 'acc' });
    S.text(480, 330, '유사도 값은 설명용 예시', { fs: 10, cls: 'sub' });
    const tw = lx.map(x => S.wire([[x, 58], [x, 72]])), cw = lx.map(x => S.wire([[x, 94], [x, 108]])), ew = lx.map(x => S.wire([[x, 134], [x, 148]]));
    const iw1 = S.wire([[404, 262], IE2.l]), iw2 = S.wire([IE2.r, IV.l]);
    const sim = lx.map(x => S.wire([[586, 248], [x, 178]], { cls: 'inv', arrow: false }));
    S.hl([TE, IE], 0.2, 0.8);
    S.cls(cells.map(c => c.el), 's', 0.6);
    cells.filter(c => c.r === c.c).forEach((c, i) => S.cls(c.el, 'a', 1.2 + i * 0.15));
    ctx.filter(c => c.r === c.c).forEach((c, i) => S.cls(c.el, 'w', 1.2 + i * 0.15));
    cells.filter(c => c.r !== c.c).forEach(c => S.cls(c.el, 'd', 1.7));
    ctx.filter(c => c.r !== c.c).forEach(c => S.cls(c.el, 'd', 1.7));
    S.hl(TP, 3.0, 3.5);
    tw.forEach(w => S.dot(w, 3.0, 3.2, { r: 3.5 })); cw.forEach(w => S.dot(w, 3.25, 3.5, { r: 3.5 }));
    S.hl(TE2, 3.45, 3.9); ew.forEach(w => S.dot(w, 3.75, 3.95, { r: 3.5 }));
    S.dot(iw1, 4.0, 4.3); S.hl(IE2, 4.3, 4.7); S.dot(iw2, 4.5, 4.8); S.hl(IV, 4.8, 5.2);
    sim.forEach(p => S.dot(p, 4.9, 5.4, { r: 4 }));
    vt.forEach((t, i) => { S.vis(t, 5.0); S.num(t, 0, vals[i], 5.0, 5.6); });
    S.hl(Tb[1], 5.8); S.cls(vt[1], 'acc', 5.8); S.vis(res, 5.9);
  }
});

scene({
  sec: 'vlm', page: 44, kind: '구조도', title: 'VLM 연결 모듈 비교', dur: 7,
  cap: '세 모델 모두 사전학습된 비전 인코더를 고정하고, 비전 인코더와 LLM 사이의 연결부를 새로 학습한다. LLaVA는 행렬 하나로 투영하고(2단계에서는 LLM도 미세조정), BLIP-2는 학습 쿼리 32개로 이미지 특징을 요약하며, Flamingo는 고정된 LM 층 사이에 게이트 교차 어텐션 층을 끼워 넣는다.',
  build(S) {
    S.cue([2.35, 4.65, 6.9]);
    S.line(213, 10, 213, 330, 'rule'); S.line(423, 10, 423, 330, 'rule');
    [['LLaVA', '투영', 108], ['BLIP-2', 'Q-Former', 318], ['Flamingo', '교차 어텐션', 530]].forEach(h => { S.text(h[2], 18, h[0], { fs: 15, fw: 800 }); S.text(h[2], 37, h[1], { fs: 11, cls: 'sub' }); });
    S.text(320, 348, '검은 상자: 새로 학습 · 흰 상자: 사전학습 가중치를 고정', { fs: 10.5, cls: 'sub' });
    S.img(84, 290, 48, 36, 'pic');
    const e1 = S.box(40, 238, 136, 36, 'CLIP ViT-L/14', { sub: '고정', fs: 12, sfs: 10 });
    const p1 = S.box(40, 184, 136, 36, '투영 행렬 W', { sub: '학습', cls: 'solid', fs: 12, sfs: 10 });
    const v1 = S.cells(52, 156, 4, 12, 2, 'a'); S.cells(110, 156, 4, 12, 2, '');
    const l1 = S.box(40, 76, 136, 64, 'LLM (Vicuna)', { sub: '1단계 고정\n2단계 학습', fs: 13, sfs: 10 });
    const a1 = [S.wire([[108, 290], [108, 274]]), S.wire([[108, 238], [108, 220]]), S.wire([[108, 184], [108, 168]]), S.wire([[108, 156], [108, 140]])];
    S.img(294, 290, 48, 36, 'pic');
    const e2 = S.box(250, 250, 136, 32, '이미지 인코더', { sub: '고정', fs: 11.5, sfs: 9.5 });
    const q2 = S.box(250, 192, 136, 42, 'Q-Former', { sub: '학습 쿼리 32개', cls: 'solid', fs: 13, sfs: 10 });
    const f2 = S.box(282, 158, 72, 18, 'FC', { cls: 'solid', fs: 10.5 });
    const v2 = S.cells(262, 132, 4, 12, 2, 'a'); S.cells(320, 132, 4, 12, 2, '');
    const l2 = S.box(250, 76, 136, 42, 'LLM', { sub: '고정', fs: 13, sfs: 10 });
    const a2 = [S.wire([[318, 290], [318, 282]]), S.wire([[318, 250], [318, 234]]), S.wire([[318, 192], [318, 176]]), S.wire([[318, 158], [318, 144]]), S.wire([[318, 132], [318, 118]])];
    S.img(456, 290, 48, 36, 'pic');
    const n3 = S.box(440, 236, 80, 36, 'NFNet', { sub: '고정', fs: 12, sfs: 10 });
    const r3 = S.box(440, 168, 80, 52, 'Perceiver\nResampler', { sub: '토큰 64개', cls: 'solid', fs: 10.5, sfs: 9.5 });
    S.text(530, 56, '게이트는 tanh(0)에서 시작', { fs: 10, cls: 'sub' });
    S.wire([[583, 328], [583, 126]], { arrow: false });
    const LMa = S.box(542, 268, 82, 24, 'LM 층', { fs: 10.5 });
    const XA = S.box(542, 236, 82, 24, '교차 어텐션', { cls: 'solid', fs: 10 });
    S.box(542, 204, 82, 24, 'LM 층', { fs: 10.5 });
    const XB = S.box(542, 172, 82, 24, '교차 어텐션', { cls: 'solid', fs: 10 });
    S.box(542, 140, 82, 24, 'LM 층', { fs: 10.5 });
    S.text(583, 340, '텍스트 토큰', { fs: 10, cls: 'sub' }); S.text(583, 112, '다음 토큰', { fs: 10, cls: 'sub' });
    const sp = S.wire([[583, 328], [583, 126]], { cls: 'inv', arrow: false });
    const fa = S.wire([[520, 194], [531, 194], [531, 248], [542, 248]]), fb = S.wire([[520, 194], [531, 194], [531, 184], [542, 184]]);
    const w31 = S.wire([[480, 290], [480, 272]]), w32 = S.wire([[480, 236], [480, 220]]);
    S.dot(a1[0], 0.2, 0.45); S.hl(e1, 0.45, 0.85); S.dot(a1[1], 0.75, 1.0); S.hl(p1, 1.0, 1.5); S.dot(a1[2], 1.25, 1.45); S.vis(v1, 1.4); S.dot(a1[3], 1.5, 1.8); S.hl(l1, 1.8, 2.3);
    S.dot(a2[0], 2.4, 2.6); S.hl(e2, 2.6, 3.0); S.dot(a2[1], 2.9, 3.15); S.hl(q2, 3.15, 3.65); S.dot(a2[2], 3.5, 3.7); S.hl(f2, 3.7, 4.0); S.dot(a2[3], 3.85, 4.0); S.vis(v2, 3.95); S.dot(a2[4], 4.0, 4.2); S.hl(l2, 4.2, 4.6);
    S.dot(w31, 4.7, 4.95); S.hl(n3, 4.95, 5.3); S.dot(w32, 5.2, 5.45); S.hl(r3, 5.45, 6.6);
    S.dot(sp, 5.5, 6.4, { lit: false }); S.hl(LMa, 5.55, 5.8);
    S.dot(fa, 5.6, 5.9); S.hl(XA, 5.85, 6.15); S.dot(fb, 5.9, 6.2); S.hl(XB, 6.15, 6.45);
  }
});

scene({
  sec: 'vla', page: 46, kind: '그림 8', title: 'VLA의 작동 원리', dur: 7,
  cap: 'VLM 백본이 카메라 영상과 언어 지시를 읽는다. RT-2와 OpenVLA는 행동의 각 차원을 256구간 토큰으로 하나씩 생성하고, π0는 행동 전문가가 flow matching으로 50스텝 행동 청크를 한 번에 만든다. 로봇이 움직이면 새 관측으로 다시 추론한다.',
  build(S) {
    S.cue([1.45, 3.68, 5.08, 5.78, 6.95]);
    const cam = S.box(16, 40, 110, 40, '카메라 영상', { fs: 13 });
    const lang = S.box(16, 96, 110, 50, '언어 지시', { sub: '“빨간 컵을 집어”', fs: 13, sfs: 10.5 });
    const st = S.box(16, 246, 110, 44, '로봇 상태', { sub: '관절각 등', fs: 13, sfs: 10.5 });
    const V = S.box(156, 50, 140, 100, 'VLM 백본', { sub: '웹 규모 이미지·텍스트로\n사전학습', fs: 15, sfs: 10 });
    const A = S.box(336, 30, 180, 80, '');
    S.text(348, 46, '이산 행동 토큰', { fs: 13, fw: 800, anchor: 'start' });
    S.text(348, 64, 'RT-2 · OpenVLA · 차원당 256구간', { fs: 10, cls: 'sub', anchor: 'start', maxw: 160 });
    const tk = ['1', '128', '91', '241', '5', '101', '127'].map((n, i) => { const g = S.group(''); S.rect(348 + i * 23, 78, 20, 22, 'cell f', g); S.text(358 + i * 23, 89, n, { fs: 10, fw: 700, cls: 'oi', parent: g, maxw: 17 }); return g; });
    const B = S.box(336, 170, 180, 120, '');
    S.text(348, 186, '행동 전문가', { fs: 13, fw: 800, anchor: 'start' });
    S.text(348, 204, 'π0 · flow matching · 10단계 적분', { fs: 10, cls: 'sub', anchor: 'start', maxw: 160 });
    S.line(352, 248, 500, 248, 'base');
    const pl = mk('polyline', { class: 'curve', points: '' }, S.root);
    const N = 24, xs = [], noise = [], target = [];
    const rnd = i => { const s = Math.sin(i * 78.233 + 1.7) * 43758.5453; return s - Math.floor(s); };
    for (let i = 0; i < N; i++) {
      xs.push(352 + i * 148 / (N - 1));
      noise.push(248 + (rnd(i) - 0.5) * 40);
      target.push(266 - 38 * (0.5 - 0.5 * Math.cos(Math.PI * i / (N - 1))));
    }
    S.vis(pl, 3.9); S.motion(4.1, 5.0);
    S.at(t => {
      const k = Math.floor(prog(t, 4.1, 5.0) * 10) / 10;
      if (pl.__k === k) return; pl.__k = k;
      pl.setAttribute('points', xs.map((x, i) => x.toFixed(1) + ',' + (noise[i] * (1 - k) + target[i] * k).toFixed(1)).join(' '));
    });
    S.text(352, 280, '노이즈에서 행동 청크로', { fs: 9.5, cls: 'sub', anchor: 'start' });
    const stepT = S.text(504, 280, '', { fs: 9.5, fw: 700, cls: 'acc', anchor: 'end' });
    S.at(t => { const s = t < 3.9 ? '' : '적분 ' + Math.floor(prog(t, 4.1, 5.0) * 10) + '/10'; if (stepT.textContent !== s) stepT.textContent = s; });
    const C = S.box(548, 120, 76, 70, '로봇 제어', { sub: 'Δx Δy Δz\n회전 · 그리퍼', cls: 'solid', fs: 13, sfs: 9.5 });
    S.text(426, 140, '모델에 따라 둘 중 하나', { fs: 10.5, cls: 'sub' });
    const w1 = S.hv(cam.r, [156, 85], { mx: 141 }), w2 = S.hv(lang.r, [156, 115], { mx: 141 });
    const wa = S.hv([296, 80], [336, 70], { mx: 316 }), wb = S.hv([296, 120], [336, 212], { mx: 316 });
    const ws = S.wire([[126, 268], [336, 268]]);
    S.text(226, 256, 'π0만 로봇 상태를 입력으로 받는다', { fs: 10, fw: 700, cls: 'acc' });
    const wca = S.hv([516, 70], [548, 140], { mx: 532 }), wcb = S.hv([516, 230], [548, 170], { mx: 532 });
    const loop = S.wire([[586, 190], [586, 320], [6, 320], [6, 60], [16, 60]], { cls: 'dash' });
    S.wire([[6, 268], [16, 268]], { cls: 'dash' });
    S.text(300, 336, '새 관측(영상·상태)으로 다시 추론하는 폐루프 제어', { fs: 10.5, cls: 'sub' });
    S.hl([cam, lang], 0.2, 0.8); S.dot(w1, 0.4, 0.85); S.dot(w2, 0.4, 0.85); S.hl(V, 0.85, 1.6);
    S.dot(wa, 1.5, 1.85); S.hl(A, 1.85, 3.3); tk.forEach((g, i) => S.vis(g, 1.9 + i * 0.2)); S.dot(wca, 3.2, 3.5); S.hl(C, 3.5, 3.9);
    S.hl(st, 3.6, 4.2); S.dot(wb, 3.7, 4.05); S.dot(ws, 3.7, 4.05); S.hl(B, 4.05, 5.4); S.dot(wcb, 5.1, 5.4); S.hl(C, 5.4, 5.8);
    S.dot(loop, 5.8, 6.5); S.hl([cam, st], 6.4, 6.95);
  }
});
