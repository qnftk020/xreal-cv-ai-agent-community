'use strict';
/* 강의 슬라이드 공통 엔진: 장을 슬라이드로 나누고, 애니메이션 장면을 끼워 넣고, 화면에 맞춘다.
   각 주차 페이지는 이 파일 앞에 window.DECK_PLACE(장 id → {슬라이드 순번: [장표 쪽수…]})를 둔다. */
const $ = id => document.getElementById(id);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 애니메이션 장면을 슬라이드 사이에 끼워 넣는다 (장표 쪽수 순서) ---------- */
const ANIM = (() => {
  /* 장 id → { 몇 번째 슬라이드 뒤: [장표 쪽수…] } */
  const PLACE = window.DECK_PLACE || {};
  const HOLD = 0.8, EPS = 1e-3;
  const items = [];
  const byPage = p => SCENES.find(s => s.page === p);
  function card(sc, sec) {
    const tag = sec.querySelector('.sec-head .tag');
    const el = h('div', 'scn rv');
    el.dataset.slide = 'anim-' + sc.page;
    el.dataset.label = sc.title;
    el.innerHTML = `<div class="main"><div class="stage" tabindex="0" role="button" aria-label="${sc.title} 애니메이션, 누르면 멈추거나 이어서 재생"><div class="prog"></div></div>
      <div class="ctl"><button class="btn primary" type="button" data-a="play">일시정지</button><button class="btn" type="button" data-a="prev">이전 동작</button><button class="btn" type="button" data-a="next">다음 동작</button><button class="btn" type="button" data-a="re">처음부터</button><span class="stp"></span></div></div>
      <div class="side"><div class="eyebrow"><span class="${tag ? tag.className : 'tag'}">${tag ? tag.textContent : ''}</span><span>애니메이션 · 장표 ${sc.page}쪽 · ${sc.kind}</span></div>
      <h2>${sc.title}</h2><p class="cap">${sc.cap}</p>
      <p class="src">빨간 점과 빨간 테두리가 지금 계산이 일어나는 곳이다. 화면을 누르면 멈추고 다시 누르면 이어진다.</p></div>`;
    const stage = el.querySelector('.stage');
    const svg = mk('svg', { viewBox: '0 0 640 360', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': sc.title + ' 애니메이션' });
    stage.insertBefore(svg, stage.firstChild);
    const S = new Scene(svg, sc.dur);
    sc.build(S);
    const steps = S.steps(); if (!steps.length) steps.push(sc.dur - 0.05);
    const it = { sc, S, steps, el, bar: stage.querySelector('.prog'), t: 0, playing: true, manual: false, target: 0, hold: 0, fitted: false,
      play: el.querySelector('[data-a=play]'), stp: el.querySelector('.stp') };
    if (XR.reduce) { it.playing = false; it.t = steps[steps.length - 1]; }
    const toggle = () => { if (!it.playing) { it.playing = true; return; } if (waiting(it)) { it.manual = false; return; } it.playing = false; };
    stage.addEventListener('click', toggle);
    stage.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); toggle(); } });
    it.play.addEventListener('click', toggle);
    el.querySelector('[data-a=next]').addEventListener('click', () => { if (!nextStep(it)) { restart(it); it.manual = true; nextStep(it); } });
    el.querySelector('[data-a=prev]').addEventListener('click', () => prevStep(it));
    el.querySelector('[data-a=re]').addEventListener('click', () => { restart(it); it.manual = false; it.playing = true; });
    items.push(it);
    return el;
  }
  /* 원본 플레이어의 '동작마다 잠깐 멈춤' 방식 */
  const lastStep = it => it.steps[it.steps.length - 1];
  const stepIndex = it => { let i = 0; for (const p of it.steps) if (it.t >= p - EPS) i++; return i; };
  const waiting = it => it.manual && it.t >= it.target - EPS;
  function advance(it, dt) {
    if (!it.playing) return;
    if (it.manual) { if (it.t < it.target) it.t = Math.min(it.target, it.t + dt); return; }
    if (it.hold > 0) { it.hold -= dt; return; }
    let nt = it.t + dt;
    const end = lastStep(it);
    const p = it.steps.find(q => q > it.t + EPS && q <= nt && q < end - EPS);
    if (p !== undefined) { it.t = p; it.hold = HOLD; return; }
    if (nt >= it.sc.dur) nt -= it.sc.dur;
    it.t = nt;
  }
  function restart(it) { it.t = 0; it.hold = 0; it.target = 0; }
  function nextStep(it) {
    if (it.manual && it.playing && it.t < it.target - EPS) { it.t = it.target; return true; }
    const i = stepIndex(it);
    if (i >= it.steps.length) return false;
    it.manual = true; it.playing = true; it.hold = 0; it.target = it.steps[i];
    return true;
  }
  function prevStep(it) {
    if (it.t <= EPS) return false;
    let tgt = 0; for (const p of it.steps) if (p < it.t - EPS) tgt = p;
    it.manual = true; it.playing = true; it.hold = 0; it.t = tgt; it.target = tgt;
    return true;
  }
  function render(it) {
    it.S.update(it.t);
    it.bar.style.transform = 'scaleX(' + (it.t / it.sc.dur).toFixed(4) + ')';
    const lab = (!it.playing || waiting(it)) ? '재생' : '일시정지';
    if (it.play.textContent !== lab) it.play.textContent = lab;
    const st = '동작 ' + Math.min(it.steps.length, stepIndex(it)) + ' / ' + it.steps.length;
    if (it.stp.textContent !== st) it.stp.textContent = st;
  }

  /* 끼워 넣기 */
  document.querySelectorAll('main > section').forEach(sec => {
    const plan = PLACE[sec.id]; if (!plan) return;
    const brks = [...sec.querySelectorAll(':scope > .brk')];
    Object.keys(plan).forEach(k => {
      const ref = brks[+k] || null;               /* k번째 슬라이드가 끝나는 자리 */
      plan[k].forEach(pg => {
        const sc = byPage(pg); if (!sc) return;
        sec.insertBefore(h('div', 'brk'), ref);
        sec.insertBefore(card(sc, sec), ref);
      });
    });
  });

  /* 지금 보이는 슬라이드의 장면만 움직인다 */
  let last = performance.now(), frozen = false;
  function tick(now) {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    if (frozen) { requestAnimationFrame(tick); return; }
    for (const it of items) {
      const sl = it.el.closest('.slide');
      if (!sl || !sl.classList.contains('cur')) continue;
      if (!it.fitted && it.el.offsetWidth) { it.S.fit(); it.fitted = true; }
      advance(it, dt); render(it);
    }
    requestAnimationFrame(tick);
  }
  items.forEach(render);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => items.forEach(i => { i.fitted = false; }));
  requestAnimationFrame(tick);
  /* 슬라이드에 들어올 때마다 처음부터 */
  return {
    enter(slide) { items.forEach(it => { if (slide.contains(it.el)) { restart(it); it.manual = false; it.playing = !XR.reduce; } }); },
    /* PDF·인쇄: 모든 장면을 마지막 동작 상태로 멈춘다. false면 원래대로 돌린다 */
    freeze(on) {
      frozen = !!on;
      items.forEach(it => {
        if (on) { it.saved = [it.t, it.playing, it.manual, it.target, it.hold]; it.t = lastStep(it); it.playing = false; it.S.fit(); it.fitted = true; render(it); }
        else if (it.saved) { [it.t, it.playing, it.manual, it.target, it.hold] = it.saved; it.saved = null; render(it); }
      });
    }
  };
})();

/* ---------- 슬라이드: 장을 화면 단위로 나누고, 넓은 화면에서는 스크롤 없이 맞춘다 ---------- */
const PAGER = (() => {
  const main = document.querySelector('main');
  const secs = [...main.querySelectorAll(':scope > section')];
  const links = [...document.querySelectorAll('#secnav a')];
  const pad = n => String(n).padStart(2, '0');
  const slides = [];
  /* 각 장을 .brk 위치에서 잘라 슬라이드로 만든다 */
  secs.forEach(sec => {
    const groups = [[]];
    [...sec.childNodes].forEach(n => { if (n.nodeType === 1 && n.classList.contains('brk')) groups.push([]); else groups[groups.length - 1].push(n); });
    const tag = sec.querySelector('.sec-head .tag');
    groups.forEach((g, k) => {
      const sl = h('section', 'slide' + (sec.classList.contains('concl') ? ' concl' : ''));
      sl.id = k ? sec.id + '-' + (k + 1) : sec.id;
      sl.dataset.sec = sec.id; sl.dataset.name = sec.dataset.name; sl.dataset.part = (k + 1) + '/' + groups.length;
      const box = h('div', 'fitbox ' + sec.className);  /* hero · sec 등 원래 클래스를 유지한다 */
      const sid = g.find(n => n.nodeType === 1 && n.dataset && n.dataset.slide);
      if (sid) { sl.id = sid.dataset.slide; sl.dataset.label = sid.dataset.label; sl.classList.add('anim'); }
      if (k && tag && !sid) box.appendChild(h('div', 'cont', `<span class="${tag.className}">${tag.textContent}</span><span>${k + 1} / ${groups.length}</span>`));
      g.forEach(n => box.appendChild(n));
      sl.appendChild(box); main.insertBefore(sl, sec); slides.push(sl);
    });
    sec.remove();
  });

  const seen = new Set();
  let cur = -1;
  document.body.classList.add('paged');
  $('pgTot').textContent = pad(slides.length);
  const label = i => slides[i].dataset.label ? '▶ ' + slides[i].dataset.label : slides[i].dataset.name + (slides[i].dataset.part !== '1/1' ? ' ' + slides[i].dataset.part.replace('/', ' / ') : '');

  const dots = slides.map((s, i) => {
    const d = h('button'); d.type = 'button'; d.title = pad(i + 1) + ' ' + label(i); d.setAttribute('aria-label', d.title);
    if (s.classList.contains('anim')) d.classList.add('an');
    d.addEventListener('click', () => go(i));
    $('pgDots').appendChild(d); return d;
  });

  /* ----- 화면 맞춤 ----- */
  const wide = () => innerWidth >= 760 && innerHeight >= 520;
  function layout() {
    const fit = wide();
    document.body.classList.toggle('fit', fit);
    const top = document.querySelector('.topbar').getBoundingClientRect().height;
    const bot = $('pager').getBoundingClientRect().height;
    document.documentElement.style.setProperty('--top', top + 'px');
    document.documentElement.style.setProperty('--bot', bot + 'px');
    refit();
  }
  let fq = 0;
  function refit() {
    cancelAnimationFrame(fq);
    fq = requestAnimationFrame(() => {
      const sl = slides[cur]; if (!sl) return;
      const box = sl.firstChild;
      box.style.zoom = ''; box.style.width = ''; box.style.maxWidth = '';
      const stage = box.querySelector('.scn .stage'); if (stage) stage.style.maxWidth = '';
      const done = z => { $('zoomNote').textContent = '화면 맞춤 ' + Math.round(z * 100) + '%'; $('zoomNote').classList.toggle('on', z < 0.999); document.dispatchEvent(new CustomEvent('deck:fit', { detail: { slide: sl, box } })); };
      if (!document.body.classList.contains('fit')) { $('zoomNote').classList.remove('on'); document.dispatchEvent(new CustomEvent('deck:fit', { detail: { slide: sl, box } })); return; }
      const avail = main.clientHeight;
      /* 필기가 있는 장은 필기한 순간의 레이아웃 폭을 그대로 쓰고 배율만 바꾼다. 줄바꿈이 같아야 필기가 제자리에 남는다 */
      const lw = +box.dataset.lw || 0;
      if (lw) {
        box.style.width = lw + 'px'; box.style.maxWidth = 'none';
        if (stage && box.dataset.smw) stage.style.maxWidth = box.dataset.smw;
        const z = Math.min(1, main.clientWidth / lw, avail / box.scrollHeight);
        if (z < 0.999) box.style.zoom = z;
        done(z); return;
      }
      const apply = z => { box.style.zoom = z; box.style.width = (100 / z) + '%'; box.style.maxWidth = (1120 / z) + 'px'; };  /* 줄어든 만큼 폭을 넓혀 화면 폭을 그대로 쓴다 */
      const fits = z => { apply(z); return box.scrollHeight * z <= avail + 1; };
      let z = 1;
      if (!fits(1)) {                          /* 폭이 바뀌면 줄바꿈도 바뀌므로 이분 탐색으로 맞는 배율을 찾는다 */
        let lo = 0.5, hi = 1;
        for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
        z = lo; apply(z);
      } else { box.style.zoom = ''; box.style.width = ''; box.style.maxWidth = ''; }
      done(z);
    });
  }
  addEventListener('resize', layout);
  /* 내용이 바뀌는 조작 뒤에는 다시 맞춘다 */
  main.addEventListener('click', () => setTimeout(refit, 30));
  main.addEventListener('toggle', () => setTimeout(refit, 30), true);
  main.addEventListener('input', () => setTimeout(refit, 30));

  function go(i, opt = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    const back = i < cur;
    cur = i; seen.add(i);
    slides.forEach((s, j) => { s.classList.toggle('cur', j === i); s.classList.toggle('back', j === i && back); });
    reveal(slides[i]); ANIM.enter(slides[i]);
    const sec = slides[i].dataset.sec;
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + sec));
    const on = links.find(a => a.classList.contains('on'));
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    dots.forEach((d, j) => { d.classList.toggle('cur', j === i); d.classList.toggle('seen', seen.has(j)); d.classList.toggle('grp', slides[j].dataset.sec === sec); });
    $('pgNum').textContent = pad(i + 1); $('pgName').textContent = label(i);
    $('pgPrev').disabled = i === 0;
    $('pgPrevName').textContent = i > 0 ? label(i - 1) : '';
    $('pgNextName').textContent = i < slides.length - 1 ? label(i + 1) : '코스 홈';
    if (!opt.noHash) history.replaceState(null, '', '#' + slides[i].id);
    window.scrollTo(0, 0);
    refit();
    document.dispatchEvent(new CustomEvent('deck:slide', { detail: { slide: slides[i], index: i } }));
  }
  function reveal(s) {
    if (XR.reduce) { s.querySelectorAll('.rv').forEach(e => e.classList.add('in')); return; }
    s.querySelectorAll('.rv').forEach((e, k) => { e.classList.remove('in'); setTimeout(() => e.classList.add('in'), 40 + Math.min(k, 6) * 60); });
  }
  const idx = hash => slides.findIndex(s => '#' + s.id === hash);

  $('pgPrev').addEventListener('click', () => go(cur - 1));
  $('pgNext').addEventListener('click', () => { if (cur === slides.length - 1) location.href = '../'; else go(cur + 1); });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const i = idx(a.getAttribute('href'));
    if (i >= 0) { e.preventDefault(); go(i); }
  });
  addEventListener('hashchange', () => { const i = idx(location.hash); if (i >= 0) go(i, { noHash: true }); });
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest('input,textarea,select,[role="tablist"],.tl,[contenteditable]')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.target.closest('button,a,summary,[role="button"],tr'))) { e.preventDefault(); $('pgNext').click(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
  });
  /* 트랙패드·휠: 화면 맞춤 모드에서는 휠로도 넘긴다 */
  let wl = 0;
  addEventListener('wheel', e => {
    if (!document.body.classList.contains('fit') || Math.abs(e.deltaY) < 30) return;
    const now = Date.now(); if (now - wl < 700) return; wl = now;
    if (e.deltaY > 0) $('pgNext').click(); else go(cur - 1);
  }, { passive: true });

  const start = idx(location.hash);
  layout();
  go(start >= 0 ? start : 0, { noHash: start < 0 });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
  return { go, refit, layout, slides, cur: () => cur, label };
})();

/* ---------- PDF·인쇄: 슬라이드 한 장을 16:9 한 쪽으로 배치한다 ----------
   인쇄 창(Ctrl+P 포함)이 열리기 직전에 배치하고, 닫히면 원래 화면으로 돌린다.
   필기 도구의 'PDF로 내보내기'는 DECK_PRINT.opts를 정한 뒤 window.print()를 부른다. */
const DECK_PRINT = (() => {
  const PW = 1280, PH = 720, CW = PW - 88, CH = PH - 36 - 56;   /* 쪽 크기와 내용 영역 (CSS px) */
  const opts = { ink: true, anim: true, onlyInk: false };
  let state = null;
  const title = () => {
    const t = document.querySelector('.slide .hero h1');
    if (!t) return document.title;
    const c = t.cloneNode(true); c.querySelectorAll('br').forEach(b => b.replaceWith(' '));
    return c.textContent.replace(/\s+/g, ' ').trim();
  };
  function prepare() {
    if (state) return;
    const body = document.body;
    state = { fit: body.classList.contains('fit'), scroll: scrollY };
    body.classList.add('fit', 'print-prep');
    body.classList.toggle('pp-noink', !opts.ink);
    ANIM.freeze(true);
    const wk = (document.querySelector('.wkchip') || {}).textContent || '';
    const keep = PAGER.slides.filter(sl => {
      if (!opts.anim && sl.classList.contains('anim')) return false;
      if (opts.onlyInk && !sl.querySelector('svg.ink path')) return false;
      return true;
    });
    PAGER.slides.forEach(sl => sl.classList.toggle('pp-skip', !keep.includes(sl)));
    keep.forEach((sl, i) => {
      const box = sl.firstChild;
      const lw = +box.dataset.lw || 1120;
      box.style.zoom = ''; box.style.maxWidth = 'none'; box.style.width = lw + 'px';
      box.style.padding = box.dataset.pad || '';
      const stage = box.querySelector('.scn .stage');
      if (stage) stage.style.maxWidth = box.dataset.smw || '760px';
      const z = Math.min(1.15, CW / lw, CH / box.scrollHeight);
      box.style.zoom = z;
      const meta = h('div', 'pp-meta', `<span>XREAL CV · AI Agent Community · ${wk} · ${title()}</span><span>${String(i + 1).padStart(2, '0')} / ${String(keep.length).padStart(2, '0')}</span>`);
      sl.appendChild(meta);
      sl.classList.toggle('pp-last', i === keep.length - 1);
    });
    document.dispatchEvent(new CustomEvent('deck:printlayout', { detail: { on: true } }));
    return keep.length;
  }
  function cleanup() {
    if (!state) return;
    const body = document.body;
    body.classList.remove('print-prep', 'pp-noink');
    if (!state.fit) body.classList.remove('fit');
    document.querySelectorAll('.pp-meta').forEach(e => e.remove());
    PAGER.slides.forEach(sl => {
      sl.classList.remove('pp-skip', 'pp-last');
      const box = sl.firstChild; box.style.zoom = ''; box.style.width = ''; box.style.maxWidth = ''; box.style.padding = '';
      const stage = box.querySelector('.scn .stage'); if (stage) stage.style.maxWidth = '';
    });
    ANIM.freeze(false);
    const y = state.scroll; state = null;
    PAGER.layout();
    scrollTo(0, y);
    document.dispatchEvent(new CustomEvent('deck:printlayout', { detail: { on: false } }));
  }
  /* 쪽 수 미리 세기 (내보내기 창에 표시) */
  function count(o = opts) {
    return PAGER.slides.filter(sl => (o.anim || !sl.classList.contains('anim')) && (!o.onlyInk || sl.querySelector('svg.ink path'))).length;
  }
  addEventListener('beforeprint', prepare);
  addEventListener('afterprint', cleanup);
  return { opts, prepare, cleanup, count };
})();
