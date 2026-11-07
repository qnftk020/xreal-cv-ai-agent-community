'use strict';
/* 발표자 전용 빨간펜 필기
   - 주소 끝에 ?pen 을 붙여 한 번 열면 이 브라우저에서 필기 도구가 켜진다. ?pen=off 로 끈다.
   - 필기는 이 브라우저(localStorage)에만 저장된다. 어디로도 보내지 않는다.
   - 좌표는 슬라이드 내용 상자(.fitbox) 폭을 1000으로 둔 단위로 저장한다.
   - 필기가 있는 장은 그린 순간의 레이아웃 폭(lw)·여백을 함께 저장해, 창 크기가 바뀌거나 PDF로 뽑아도
     줄바꿈이 같게 유지된다 (deck.js의 refit·DECK_PRINT가 이 값을 쓴다). */
const INK = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const ON_KEY = 'xreal-ink:on';
  const KEY = 'xreal-ink:v1:' + location.pathname.replace(/index\.html$/, '');
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } }
  };

  /* ---------- 켜고 끄기: ?pen / ?pen=off ---------- */
  let justOn = false;
  const q = new URLSearchParams(location.search);
  if (q.has('pen')) {
    const v = (q.get('pen') || '').toLowerCase();
    if (v === 'off' || v === '0' || v === 'false') ls.del(ON_KEY);
    else { justOn = ls.get(ON_KEY) !== '1'; ls.set(ON_KEY, '1'); }
    q.delete('pen');
    const qs = q.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
  if (ls.get(ON_KEY) !== '1' || typeof PAGER === 'undefined') return null;

  /* ---------- 저장 ---------- */
  function load() {
    try {
      const d = JSON.parse(ls.get(KEY) || 'null');
      if (d && d.v === 1 && d.slides && typeof d.slides === 'object') return d;
    } catch (e) { /* 손상된 값은 새로 시작 */ }
    return { v: 1, slides: {} };
  }
  let data = load();
  let saveT = 0;
  function save(now) {
    clearTimeout(saveT);
    const run = () => {
      const empty = Object.keys(data.slides).length === 0;
      const ok = empty ? (ls.del(KEY), true) : ls.set(KEY, JSON.stringify(data));
      if (!ok) toast('저장 공간이 부족해 필기를 저장하지 못했습니다. ⋯ 메뉴에서 백업을 내려받으세요', 5000);
    };
    if (now) run(); else saveT = setTimeout(run, 250);
  }
  addEventListener('pagehide', () => save(true));

  /* ---------- 도구 상태 ---------- */
  const SIZES = { p: [2, 3.4, 5.6], h: [14, 22, 34] };
  const ER = 9;                                  /* 지우개 반경 (단위: 상자 폭의 1/1000) */
  let tool = 'hand', size = 1, hidden = false, penSeen = false;
  const main = document.querySelector('main');
  const slides = PAGER.slides;
  const curSlide = () => slides[PAGER.cur()];
  const hist = new Map();                        /* 장 id → { u: 되돌리기, r: 다시 하기 } */
  const H = id => { if (!hist.has(id)) hist.set(id, { u: [], r: [] }); return hist.get(id); };

  /* ---------- 장마다 필기 층 ---------- */
  const layers = new Map();
  function layer(sl) {
    let L = layers.get(sl.id);
    if (L) return L;
    const box = sl.firstChild;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ink'); svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(NS, 'g');
    svg.appendChild(g); box.appendChild(svg);
    L = { sl, box, svg, g };
    layers.set(sl.id, L);
    rescale(L);
    return L;
  }
  function rescale(L) { const w = L.box.clientWidth; if (w) L.g.setAttribute('transform', `scale(${(w / 1000).toFixed(5)})`); }
  const r1 = n => Math.round(n * 10) / 10;
  function pathD(p) {
    const n = p.length / 2;
    if (n === 1) return `M${p[0]} ${p[1]}l0.01 0`;
    let d = `M${p[0]} ${p[1]}`;
    if (n === 2) return d + `L${p[2]} ${p[3]}`;
    for (let i = 1; i < n - 1; i++) {
      const x = p[2 * i], y = p[2 * i + 1];
      d += `Q${x} ${y} ${r1((x + p[2 * i + 2]) / 2)} ${r1((y + p[2 * i + 3]) / 2)}`;
    }
    return d + `L${p[2 * n - 2]} ${p[2 * n - 1]}`;
  }
  function strokeEl(s) {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('class', 'ink-' + s.k);
    el.setAttribute('stroke-width', s.w);
    el.setAttribute('d', pathD(s.p));
    return el;
  }
  function render(sl) {
    const L = layer(sl), d = data.slides[sl.id];
    L.g.textContent = '';
    if (d) d.s.forEach(s => L.g.appendChild(strokeEl(s)));
  }

  /* 필기가 생기면 지금의 레이아웃을 기록해 고정하고, 다 지워지면 고정을 푼다 */
  function pinFrom(sl, d) {
    const box = sl.firstChild;
    if (d && d.lw) {
      box.dataset.lw = d.lw; box.dataset.pad = d.pad || '';
      if (d.smw) box.dataset.smw = d.smw; else delete box.dataset.smw;
    } else { delete box.dataset.lw; delete box.dataset.pad; delete box.dataset.smw; }
  }
  /* 장의 기록 칸을 돌려준다. 없으면 meta(필기한 순간의 레이아웃)로 만들고, meta도 없으면 지금 레이아웃을 잰다 */
  function measure(sl) {
    const box = sl.firstChild, cs = getComputedStyle(box), st = box.querySelector('.scn .stage');
    const m = { lw: box.clientWidth, pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ') };
    if (st) m.smw = st.offsetWidth + 'px';
    return m;
  }
  const metaOf = d => (d ? { lw: d.lw, pad: d.pad, ...(d.smw ? { smw: d.smw } : {}) } : null);
  function slot(sl, meta) {
    let d = data.slides[sl.id];
    if (d && d.lw) return d;
    d = { s: d ? d.s : [], ...(meta || measure(sl)) };
    data.slides[sl.id] = d;
    pinFrom(sl, d); PAGER.refit();
    return d;
  }
  function sync(sl) {
    const d = data.slides[sl.id];
    if (d && !d.s.length) { delete data.slides[sl.id]; pinFrom(sl, null); PAGER.refit(); }
    render(sl); save(); ui();
  }

  /* ---------- 되돌리기 · 다시 하기 ----------
     op: add {s} · del {items, before} · clr {before}. before는 그 조작 직전의 획 배열 전체이고,
     meta는 그 장의 레이아웃 기록이다 (다 지운 뒤 되돌려도 처음 레이아웃으로 돌아오게) */
  function apply(sl, op, undo) {
    const d = slot(sl, op.meta);
    if (op.t === 'add') {
      if (undo) { const i = d.s.lastIndexOf(op.s); if (i >= 0) d.s.splice(i, 1); } else d.s.push(op.s);
    } else if (undo) {
      d.s.splice(0, d.s.length, ...op.before);
    } else if (op.t === 'del') {
      const gone = new Set(op.items); d.s.splice(0, d.s.length, ...d.s.filter(x => !gone.has(x)));
    } else d.s.length = 0;
    sync(sl);
  }
  function record(sl, op) { const st = H(sl.id); st.u.push(op); st.r.length = 0; if (st.u.length > 200) st.u.shift(); }
  function commit(sl, op) { op.meta = op.meta || metaOf(data.slides[sl.id]); record(sl, op); apply(sl, op, false); }
  function undo() { const sl = curSlide(), st = H(sl.id), op = st.u.pop(); if (!op) return; st.r.push(op); apply(sl, op, true); }
  function redo() { const sl = curSlide(), st = H(sl.id), op = st.r.pop(); if (!op) return; st.u.push(op); apply(sl, op, false); }
  function clearSlide() {
    const sl = curSlide(), d = data.slides[sl.id];
    if (!d || !d.s.length) return;
    commit(sl, { t: 'clr', before: d.s.slice() });
    toast('이 장의 필기를 지웠습니다 · Ctrl+Z로 되돌리기');
  }

  /* ---------- 입력 ---------- */
  let active = null, rq = 0;
  function toU(L, e) {
    const r = L.svg.getBoundingClientRect(), k = 1000 / r.width;
    return [r1((e.clientX - r.left) * k), r1((e.clientY - r.top) * k)];
  }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const x = ax + t * dx - px, y = ay + t * dy - py; return Math.sqrt(x * x + y * y);
  }
  function hits(s, u, v) {
    const p = s.p, n = p.length / 2, rr = ER + s.w / 2;
    if (n === 1) return Math.hypot(p[0] - u, p[1] - v) <= rr;
    for (let i = 0; i < n - 1; i++) if (segDist(u, v, p[2 * i], p[2 * i + 1], p[2 * i + 2], p[2 * i + 3]) <= rr) return true;
    return false;
  }
  function eraseAt(a, u, v) {
    const d = data.slides[a.sl.id]; if (!d) return;
    const keep = d.s.filter(s => { if (hits(s, u, v)) { a.del.push(s); return false; } return true; });
    if (keep.length !== d.s.length) { d.s.splice(0, d.s.length, ...keep); render(a.sl); }
  }
  const isEraserButton = e => e.button === 5 || (e.buttons & 32) === 32;
  function down(e) {
    if (tool === 'hand' || active) return;
    if (e.pointerType === 'touch' && penSeen) return;          /* 펜을 쓰기 시작하면 손바닥 터치는 무시 */
    if (e.pointerType === 'pen') penSeen = true;
    if (e.button !== 0 && e.button !== 5) return;
    const sl = curSlide(); if (!sl) return;
    e.preventDefault();
    try { main.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    const kind = isEraserButton(e) ? 'eraser' : tool;
    if (hidden) setHidden(false);
    const L = layer(sl);
    const d0 = data.slides[sl.id];
    active = { id: e.pointerId, sl, L, kind, del: [], el: null, before: d0 ? d0.s.slice() : [], meta: metaOf(d0) };
    const [u, v] = toU(L, e);
    if (kind === 'eraser') { eraseAt(active, u, v); return; }
    const k = kind === 'pen' ? 'p' : kind === 'hl' ? 'h' : 'l';
    const w = k === 'l' ? 4 : SIZES[k][size];
    active.s = { k, w, p: [u, v] };
    active.el = strokeEl(active.s);
    L.g.appendChild(active.el);
  }
  function move(e) {
    cursorAt(e);
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      const [u, v] = toU(active.L, ev);
      if (active.kind === 'eraser') { eraseAt(active, u, v); continue; }
      const p = active.s.p, lx = p[p.length - 2], ly = p[p.length - 1];
      if (Math.hypot(u - lx, v - ly) >= 0.7) p.push(u, v);
    }
    if (active.el && !rq) rq = requestAnimationFrame(() => { rq = 0; if (active && active.el) active.el.setAttribute('d', pathD(active.s.p)); });
  }
  function up(e) {
    if (!active || e.pointerId !== active.id) return;
    try { main.releasePointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    finish();
  }
  function finish() {
    const a = active; active = null;
    if (!a) return;
    if (a.kind === 'eraser') {
      if (a.del.length) {
        /* 이미 지운 상태이므로 기록만 남긴다 (다시 하기는 같은 획을 다시 지운다) */
        record(a.sl, { t: 'del', items: a.del, before: a.before, meta: a.meta });
        sync(a.sl);
      }
      return;
    }
    if (a.el) a.el.setAttribute('d', pathD(a.s.p));
    if (a.s.k === 'l') {                                          /* 레이저는 남기지 않는다 */
      const el = a.el;
      setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 650); }, 450);
      return;
    }
    a.el.remove();
    commit(a.sl, { t: 'add', s: a.s });
  }
  main.addEventListener('pointerdown', down);
  main.addEventListener('pointermove', move);
  main.addEventListener('pointerup', up);
  main.addEventListener('pointercancel', up);
  main.addEventListener('lostpointercapture', e => { if (active && e.pointerId === active.id) finish(); });
  /* 그리는 중에는 슬라이드의 버튼·링크가 눌리지 않게 막는다 */
  main.addEventListener('click', e => { if (tool !== 'hand') { e.stopPropagation(); e.preventDefault(); } }, true);

  /* 지우개·레이저 위치 표시 */
  const cur = h('div', 'ink-cursor'); document.body.appendChild(cur);
  function cursorAt(e) {
    if (tool !== 'eraser' && tool !== 'laser') { cur.style.display = 'none'; return; }
    cur.style.display = 'block'; cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
    if (tool === 'eraser') { const L = layers.get((curSlide() || {}).id); const r = L ? L.svg.getBoundingClientRect().width : 1000; const d = 2 * ER * r / 1000; cur.style.width = cur.style.height = Math.max(10, d) + 'px'; }
  }
  main.addEventListener('pointerleave', () => { if (!active) cur.style.display = 'none'; });

  /* ---------- 도구 막대 ---------- */
  const I = {
    pen: '<path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M13.8 6.8l3.4 3.4"/>',
    hl: '<path d="M9 15l-4 4h5l1.5-1.5"/><path d="M8.5 13.5l6.8-6.8a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8l-6.8 6.8z"/><path d="M8.5 13.5l2.5 2.5"/>',
    laser: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    eraser: '<path d="M8.5 20H20"/><path d="M4.6 15.4l9.2-9.2a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L12 20H8.4l-3.8-3.8a.6.6 0 0 1 0-.8z"/><path d="M9 11l5 5"/>',
    hand: '<path d="M6 3.5l12 7.2-5.3 1.4 3.3 5.9-2.4 1.3-3.3-5.9L6.5 17z"/>',
    undo: '<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>',
    redo: '<path d="M15 7l4.5 4.5L15 16"/><path d="M19 11.5h-9a5 5 0 0 0 0 10h2"/>',
    clear: '<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5.5M13.5 11v5.5"/>',
    eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    pdf: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M12 10.5v6.5M9.2 14.3L12 17l2.8-2.7"/>',
    more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    fold: '<path d="M9 6l6 6-6 6"/>'
  };
  const ico = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
  const bar = h('div', 'inkbar');
  bar.id = 'inkbar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', '필기 도구');
  bar.innerHTML = `
    <button type="button" class="ink-fold" data-a="fold" title="도구 막대 접기 · 펴기" aria-label="도구 막대 접기">${ico('fold')}</button>
    <button type="button" data-t="pen" title="빨간 펜 (P)" aria-label="빨간 펜">${ico('pen')}</button>
    <div class="ink-sizes" role="group" aria-label="굵기">
      <button type="button" data-s="0" title="가늘게 (1)" aria-label="가늘게"><i style="width:4px;height:4px"></i></button>
      <button type="button" data-s="1" title="보통 (2)" aria-label="보통"><i style="width:7px;height:7px"></i></button>
      <button type="button" data-s="2" title="굵게 (3)" aria-label="굵게"><i style="width:11px;height:11px"></i></button>
    </div>
    <button type="button" data-t="hl" title="형광펜 (H)" aria-label="형광펜">${ico('hl')}</button>
    <button type="button" data-t="laser" title="레이저 포인터 · 남지 않음 (L)" aria-label="레이저 포인터">${ico('laser')}</button>
    <button type="button" data-t="eraser" title="지우개 · 획 단위 (E)" aria-label="지우개">${ico('eraser')}</button>
    <button type="button" data-t="hand" title="필기 멈추고 슬라이드 조작 (Esc)" aria-label="슬라이드 조작">${ico('hand')}</button>
    <hr>
    <button type="button" data-a="undo" title="되돌리기 (Ctrl+Z)" aria-label="되돌리기">${ico('undo')}</button>
    <button type="button" data-a="redo" title="다시 하기 (Ctrl+Shift+Z)" aria-label="다시 하기">${ico('redo')}</button>
    <button type="button" data-a="clear" title="이 장의 필기 지우기" aria-label="이 장의 필기 지우기">${ico('clear')}</button>
    <button type="button" data-a="eye" title="필기 숨기기 · 보이기 (V)" aria-label="필기 숨기기">${ico('eye')}</button>
    <hr>
    <button type="button" data-a="pdf" title="PDF로 내보내기" aria-label="PDF로 내보내기">${ico('pdf')}</button>
    <button type="button" data-a="more" title="백업 · 설정" aria-label="백업과 설정">${ico('more')}</button>
    <span class="ink-count" aria-live="polite"></span>`;
  document.body.appendChild(bar);

  /* PDF 내보내기 창 */
  const pdfPop = h('div', 'ink-pop', `
    <h4>PDF로 내보내기</h4>
    <label><input type="checkbox" data-o="ink" checked> 필기 포함</label>
    <label><input type="checkbox" data-o="anim" checked> 애니메이션 장 포함 <small>마지막 장면으로</small></label>
    <label><input type="checkbox" data-o="onlyInk"> 필기한 장만</label>
    <p class="ink-note">16:9 가로 · <b data-n>0</b>쪽</p>
    <button type="button" class="btn primary" data-go>PDF 만들기</button>
    <p class="ink-note">인쇄 창이 열리면 <b>대상: PDF로 저장</b>을 고르고 저장한다. 크롬·엣지에서 가장 정확하다.</p>`);
  pdfPop.hidden = true; pdfPop.id = 'inkPdf'; pdfPop.setAttribute('role', 'dialog'); pdfPop.setAttribute('aria-label', 'PDF로 내보내기');
  document.body.appendChild(pdfPop);
  const moreFile = h('input'); moreFile.type = 'file'; moreFile.accept = 'application/json,.json'; moreFile.hidden = true;
  const morePop = h('div', 'ink-pop', `
    <h4>필기 백업 · 설정</h4>
    <p class="ink-note">필기는 이 브라우저에만 저장된다. 다른 컴퓨터로 옮길 때는 백업 파일을 쓴다.</p>
    <button type="button" class="btn" data-m="export">백업 내려받기 (.json)</button>
    <button type="button" class="btn" data-m="import">백업 불러오기</button>
    <button type="button" class="btn" data-m="wipe">이 주차 필기 모두 지우기</button>
    <hr>
    <button type="button" class="btn" data-m="off">필기 모드 끄기</button>
    <p class="ink-note">끄면 도구 막대와 필기가 숨겨진다. 필기는 지워지지 않으며 주소 끝에 <b>?pen</b>을 붙여 다시 켠다.</p>`);
  morePop.hidden = true; morePop.id = 'inkMore'; morePop.setAttribute('role', 'dialog'); morePop.setAttribute('aria-label', '필기 백업과 설정');
  morePop.appendChild(moreFile);
  document.body.appendChild(morePop);

  const T = h('div', 'ink-toast'); T.setAttribute('role', 'status'); document.body.appendChild(T);
  let tT = 0;
  function toast(msg, ms = 2200) { T.textContent = msg; T.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => T.classList.remove('on'), ms); }

  function setTool(t) {
    tool = t;
    document.body.classList.toggle('inking', t !== 'hand');
    ['pen', 'hl', 'laser', 'eraser', 'hand'].forEach(n => document.body.classList.toggle('tool-' + n, t === n));
    if (t !== 'eraser' && t !== 'laser') cur.style.display = 'none';
    cur.className = 'ink-cursor ' + t;
    ui();
  }
  function setHidden(v) { hidden = v; document.body.classList.toggle('ink-hidden', v); ui(); }
  function ui() {
    bar.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === tool ? 'true' : 'false'));
    bar.querySelectorAll('[data-s]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === size ? 'true' : 'false'));
    const sl = curSlide(); if (!sl) return;
    const st = H(sl.id), d = data.slides[sl.id], n = d ? d.s.length : 0;
    bar.querySelector('[data-a=undo]').disabled = !st.u.length;
    bar.querySelector('[data-a=redo]').disabled = !st.r.length;
    bar.querySelector('[data-a=clear]').disabled = !n;
    const eye = bar.querySelector('[data-a=eye]'); eye.setAttribute('aria-pressed', hidden ? 'true' : 'false'); eye.title = hidden ? '필기 보이기 (V)' : '필기 숨기기 (V)';
    bar.querySelector('.ink-count').textContent = n ? n + '획' : '';
  }
  function pop(p, btn) {
    const open = p.hidden;
    [pdfPop, morePop].forEach(x => { x.hidden = true; });
    if (!open) return;
    p.hidden = false;
    const r = btn.getBoundingClientRect(), br = bar.getBoundingClientRect();
    const narrow = innerWidth < 760;
    p.style.right = narrow ? '14px' : (innerWidth - br.left + 10) + 'px';
    p.style.top = narrow ? '' : Math.max(12, Math.min(innerHeight - p.offsetHeight - 12, r.top - 20)) + 'px';
    p.style.bottom = narrow ? (innerHeight - br.top + 10) + 'px' : '';
    if (p === pdfPop) pdfCount();
  }
  function pdfOpts() { const o = {}; pdfPop.querySelectorAll('[data-o]').forEach(i => { o[i.dataset.o] = i.checked; }); return o; }
  function pdfCount() { const o = pdfOpts(); pdfPop.querySelector('[data-n]').textContent = DECK_PRINT.count(o); }
  pdfPop.addEventListener('change', pdfCount);
  pdfPop.querySelector('[data-go]').addEventListener('click', () => {
    const o = pdfOpts();
    if (DECK_PRINT.count(o) === 0) { toast('내보낼 장이 없습니다 · 필기한 장만을 끄거나 필기를 남겨 주세요'); return; }
    Object.assign(DECK_PRINT.opts, o);
    pdfPop.hidden = true;
    if (o.ink && hidden) setHidden(false);
    setTimeout(() => window.print(), 50);
  });
  /* 인쇄가 끝나면 다음 Ctrl+P를 위해 기본값으로 돌린다 */
  addEventListener('afterprint', () => { Object.assign(DECK_PRINT.opts, { ink: true, anim: true, onlyInk: false }); });

  function download(name, text) {
    const a = h('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  morePop.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    const m = b.dataset.m;
    if (m === 'export') {
      const wk = location.pathname.split('/').filter(Boolean).pop() || 'deck';
      download(`ink-${wk}.json`, JSON.stringify({ app: 'xreal-ink', path: location.pathname, ...data }, null, 0));
    } else if (m === 'import') moreFile.click();
    else if (m === 'wipe') {
      if (!confirm('이 주차의 필기를 모두 지울까요? 되돌릴 수 없습니다. 필요하면 먼저 백업을 내려받으세요.')) return;
      data = { v: 1, slides: {} }; hist.clear();
      slides.forEach(sl => { pinFrom(sl, null); render(sl); });
      save(true); PAGER.refit(); ui(); morePop.hidden = true; toast('이 주차의 필기를 모두 지웠습니다');
    } else if (m === 'off') {
      save(true); ls.del(ON_KEY); location.reload();
    }
  });
  moreFile.addEventListener('change', () => {
    const f = moreFile.files && moreFile.files[0]; if (!f) return;
    f.text().then(txt => {
      const d = JSON.parse(txt);
      if (!d || d.v !== 1 || !d.slides || typeof d.slides !== 'object') throw new Error('형식');
      const clean = {};
      Object.keys(d.slides).forEach(id => {
        const x = d.slides[id];
        if (!x || !Array.isArray(x.s)) return;
        const s = x.s.filter(t => t && (t.k === 'p' || t.k === 'h') && Array.isArray(t.p) && t.p.length >= 2 && t.p.every(Number.isFinite) && Number.isFinite(+t.w))
          .map(t => ({ k: t.k, w: +t.w, p: t.p.slice(0, t.p.length - (t.p.length % 2)) }));
        if (s.length && +x.lw > 0) clean[id] = { s, lw: +x.lw, pad: typeof x.pad === 'string' ? x.pad.slice(0, 80) : '', ...(typeof x.smw === 'string' ? { smw: x.smw.slice(0, 20) } : {}) };
      });
      data = { v: 1, slides: clean }; hist.clear();
      slides.forEach(sl => { pinFrom(sl, data.slides[sl.id]); render(sl); });
      save(true); PAGER.refit(); ui(); morePop.hidden = true;
      toast(`백업을 불러왔습니다 · ${Object.keys(clean).length}장`);
    }).catch(() => toast('백업 파일을 읽지 못했습니다'));
    moreFile.value = '';
  });

  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) setTool(tool === b.dataset.t && b.dataset.t !== 'hand' ? 'hand' : b.dataset.t);
    else if (b.dataset.s) { size = +b.dataset.s; if (tool !== 'pen' && tool !== 'hl') setTool('pen'); ui(); }
    else if (b.dataset.a === 'undo') undo();
    else if (b.dataset.a === 'redo') redo();
    else if (b.dataset.a === 'clear') clearSlide();
    else if (b.dataset.a === 'eye') setHidden(!hidden);
    else if (b.dataset.a === 'pdf') pop(pdfPop, b);
    else if (b.dataset.a === 'more') pop(morePop, b);
    else if (b.dataset.a === 'fold') { bar.classList.toggle('ink-min'); if (bar.classList.contains('ink-min')) setTool('hand'); }
  });
  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.ink-pop, #inkbar')) return;
    pdfPop.hidden = true; morePop.hidden = true;
  });

  /* ---------- 단축키 ---------- */
  document.addEventListener('keydown', e => {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    if (mod || e.altKey) return;
    if (k === 'escape') { if (!pdfPop.hidden || !morePop.hidden) { pdfPop.hidden = morePop.hidden = true; return; } setTool('hand'); return; }
    const map = { p: 'pen', h: 'hl', l: 'laser', e: 'eraser' };
    if (map[k]) { e.preventDefault(); bar.classList.remove('ink-min'); setTool(tool === map[k] ? 'hand' : map[k]); return; }
    if (k === 'v') { e.preventDefault(); setHidden(!hidden); return; }
    if (k === '1' || k === '2' || k === '3') { size = +k - 1; if (tool !== 'pen' && tool !== 'hl') setTool('pen'); ui(); }
  });

  /* ---------- 슬라이드 엔진과 맞추기 ---------- */
  document.addEventListener('deck:slide', () => { finish(); ui(); });
  document.addEventListener('deck:fit', e => { const L = layers.get(e.detail.slide.id); if (L) rescale(L); });
  document.addEventListener('deck:printlayout', () => layers.forEach(rescale));

  document.body.classList.add('ink-on');
  PAGER.layout();
  /* 저장된 필기 그리기 */
  slides.forEach(sl => { const d = data.slides[sl.id]; if (d && d.s && d.s.length) { pinFrom(sl, d); render(sl); } });
  PAGER.refit();
  setTool('hand');
  if (justOn) toast('필기 모드를 켰습니다 · P 펜, E 지우개, Esc 멈춤 · 필기는 이 브라우저에만 저장됩니다', 4200);

  return {
    get tool() { return tool; }, setTool, undo, redo, clearSlide,
    strokes: id => (data.slides[id] ? data.slides[id].s.length : 0),
    data: () => data
  };
})();
