'use strict';
/* 공통 동작: 스크롤 등장, 읽기 진행 막대, 숫자 카운트업, 학습 완료 체크(브라우저에만 저장) */
const XR = (() => {
  const KEY = 'xreal-cv-ai-agent-community:progress';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장소를 못 쓰면 무시 */ } };
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function reveal() {
    const els = document.querySelectorAll('.rv');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    els.forEach(e => io.observe(e));
  }

  function readbar() {
    const bar = document.querySelector('.readbar');
    if (!bar) return;
    const f = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + '%';
    };
    addEventListener('scroll', f, { passive: true }); f();
  }

  function countUp() {
    const els = document.querySelectorAll('[data-count]');
    const run = el => {
      const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      if (reduce) { el.textContent = pre + to.toFixed(dec) + suf; return; }
      const t0 = performance.now(), D = 1200;
      const tick = now => {
        const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
        el.textContent = pre + (to * e).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: .5 });
    els.forEach(e => io.observe(e));
  }

  /* data-done="week1:lm" 버튼: 누르면 완료 표시를 토글한다 */
  function doneButtons(onChange) {
    const st = load();
    document.querySelectorAll('[data-done]').forEach(b => {
      const id = b.dataset.done;
      const paint = () => { b.setAttribute('aria-pressed', st[id] ? 'true' : 'false'); b.lastChild.textContent = st[id] ? ' 학습 완료' : '이 장을 다 봤어요'; };
      if (!b.lastChild || b.lastChild.nodeType !== 3) b.appendChild(document.createTextNode(''));
      paint();
      b.addEventListener('click', () => { st[id] = !st[id]; save(st); paint(); onChange && onChange(st); });
    });
    onChange && onChange(st);
  }

  document.addEventListener('DOMContentLoaded', () => { reveal(); readbar(); countUp(); });
  return { load, save, doneButtons, reduce };
})();
