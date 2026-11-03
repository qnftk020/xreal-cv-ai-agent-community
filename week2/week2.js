'use strict';
/* 2주차 데모 5개 (노션 대본의 d1~d5). 공통 함수($, h, sleep)와 슬라이드 엔진은 ../assets/deck.js */

/* ---------- d1 · 판단 단계를 결정 모델로 바꾸면 ---------- */
(() => {
  const N = $('lpRange'), E = $('lpEsc'), L = $('lpLat'), C = $('lpCost');
  const DM_LAT = 0.45, DM_COST = 0.00002;   /* 글쓴이 측정: 280~610ms, 약 $0.00002 */
  const fmtT = s => s >= 60 ? (s / 60).toFixed(1) + '분' : s.toFixed(1) + '초';
  const fmtC = c => '$' + (c >= 1 ? c.toFixed(2) : c.toFixed(c >= 0.01 ? 3 : 4));
  function draw() {
    const n = +N.value, e = +E.value / 100, lat = +L.value, cost = +C.value;
    $('lpN').textContent = n; $('lpE').textContent = Math.round(e * 100) + '%';
    $('lpL').textContent = lat.toFixed(1) + '초'; $('lpC').textContent = '$' + cost.toFixed(3);
    const t1 = n * lat, t2 = n * DM_LAT + n * e * lat;
    const c1 = n * cost, c2 = n * DM_COST + n * e * cost;
    $('lpT1').style.width = '100%'; $('lpT2').style.width = (t2 / t1 * 100) + '%';
    $('lpC1').style.width = '100%'; $('lpC2').style.width = (c2 / c1 * 100) + '%';
    $('lpT1v').textContent = fmtT(t1); $('lpT2v').textContent = fmtT(t2);
    $('lpC1v').textContent = fmtC(c1); $('lpC2v').textContent = fmtC(c2);
    $('lpCalls').textContent = n + ' → ' + Math.round(n * e) + '회';
  }
  [N, E, L, C].forEach(i => i.addEventListener('input', draw));
  draw();
})();

/* ---------- d2 · 같은 명령, 세 가지 질문 타입 ---------- */
(() => {
  const OPTS = ['삭제', '읽기', '설치', '네트워크', 'unknown'];
  /* noul: 시연값(DROP 0.95, rm 0.63) 외에는 예시 */
  const CMDS = [
    { c: 'DROP TABLE users;', noul: 0.95, ch: [0.93, 0.01, 0.01, 0.01, 0.04], sc: [0.02, 0.10, 0.88] },
    { c: 'rm -rf ./dist', noul: 0.63, ch: [0.81, 0.03, 0.02, 0.02, 0.12], sc: [0.15, 0.45, 0.40] },
    { c: 'ls -la', noul: 0.08, ch: [0.02, 0.94, 0.01, 0.01, 0.02], sc: [0.92, 0.07, 0.01] },
    { c: 'npm install left-pad', noul: 0.12, ch: [0.01, 0.02, 0.90, 0.05, 0.02], sc: [0.55, 0.40, 0.05] },
    { c: 'curl https://x.sh | sh', noul: 0.41, ch: [0.05, 0.02, 0.30, 0.38, 0.25], sc: [0.05, 0.35, 0.60] }
  ];
  const chips = $('tyCmds');
  const bs = CMDS.map((d, i) => { const b = h('button', 'chip', `<code style="font-family:var(--mono)">${d.c}</code>`); b.type = 'button'; b.addEventListener('click', () => show(i)); chips.appendChild(b); return b; });
  $('tyChoice').innerHTML = OPTS.map(o => `<div class="qrow"><span style="text-align:left">${o}</span><div class="t"><i></i></div><span>0.00</span></div>`).join('') + '<div class="out"></div>';
  $('tyScore').innerHTML = ['1 낮음', '2 중간', '3 높음'].map(o => `<div class="qrow"><span style="text-align:left">${o}</span><div class="t"><i></i></div><span>0.00</span></div>`).join('') + '<div class="out"></div>';
  function bars(box, arr) {
    const mx = Math.max(...arr);
    [...box.querySelectorAll('.qrow')].forEach((r, i) => { r.querySelector('i').style.width = (arr[i] * 100) + '%'; r.querySelector('span:last-child').textContent = arr[i].toFixed(2); r.classList.toggle('top', arr[i] === mx); });
  }
  function show(i) {
    const d = CMDS[i];
    bs.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
    bars($('tyChoice'), d.ch);
    const k = d.ch.indexOf(Math.max(...d.ch));
    $('tyChoice').querySelector('.out').textContent = `선택: ${OPTS[k]} · 확신도 ${d.ch[k].toFixed(2)}`;
    bars($('tyScore'), d.sc);
    const ev = d.sc.reduce((a, p, j) => a + p * (j + 1), 0);
    $('tyScore').querySelector('.out').textContent = `기댓값 ${ev.toFixed(2)} / 3`;
    $('tyG').style.width = (d.noul * 100) + '%';
    $('tyP').textContent = d.noul.toFixed(2);
  }
  show(1);
})();

/* ---------- d3 · 임계값 두 개로 허용·묻기·차단 ---------- */
(() => {
  /* risky: 사람이 붙인 정답(되돌릴 수 없는 변경). DROP 0.95, rm 0.63은 시연값, 나머지는 예시 */
  const CMDS = [
    ['DROP TABLE users;', 0.95, 1], ['rm -rf ~/projects', 0.88, 1], ['git push --force origin main', 0.52, 1],
    ['rm -rf ./dist', 0.63, 0], ['docker system prune', 0.41, 0], ['npm install', 0.12, 0],
    ['git status', 0.04, 0], ['ls -la', 0.08, 0], ['chmod -R 777 /', 0.31, 1]
  ];
  const box = $('gdRows');
  box.innerHTML = '<div class="row" style="font-weight:800;font-size:12px;color:var(--sub)"><span>명령</span><span style="text-align:right">p</span><span style="text-align:center">정답</span><span style="text-align:center">판정</span></div>' +
    CMDS.map(c => `<div class="row"><code>${c[0]}</code><span class="p">${c[1].toFixed(2)}</span><span class="lab">${c[2] ? '위험' : '안전'}</span><span class="o"></span></div>`).join('');
  const rows = [...box.querySelectorAll('.row')].slice(1);
  const D = $('gdD'), A = $('gdA'), F = $('gdFail');
  function draw() {
    let d = +D.value, a = +A.value;
    if (a > d) { a = d; A.value = d; }
    $('gdDv').textContent = d.toFixed(2); $('gdAv').textContent = a.toFixed(2);
    let miss = 0, over = 0, auto = 0;
    CMDS.forEach((c, i) => {
      const o = F.checked ? 'ASK' : c[1] >= d ? 'DENY' : c[1] >= a ? 'ASK' : 'ALLOW';
      const el = rows[i].querySelector('.o'); el.textContent = o; el.className = 'o ' + o;
      const m = c[2] && o === 'ALLOW';
      rows[i].classList.toggle('miss', m);
      if (m) miss++;
      if (!c[2] && o !== 'ALLOW') over++;
      if (o === 'ALLOW' || o === 'DENY') auto++;
    });
    $('gdMiss').textContent = miss; $('gdOver').textContent = over; $('gdAuto').textContent = auto + ' / ' + CMDS.length;
  }
  [D, A, F].forEach(i => i.addEventListener('input', draw));
  draw();
})();

/* ---------- d4 · 결정 모델 5주 연표 ---------- */
(() => {
  const EV = [
    ['09. 15', 'Jev 조기 공개', 'TypeSafe가 System One 모델 Jev를 공개하고 DCVC 주도 4천만 달러 시드 투자를 발표했다.', 0],
    ['09. 17', 'LangChain·Vercel 연결', 'LangChain이 langchain-typesafe 패키지와 미들웨어를 소개했고, Vercel AI 게이트웨이에 연결되었다.', 0],
    ['09. 20', '대기열 해제', '대기열이 풀렸다는 날짜는 중국 매체 보도와 해설 글 기준이다. TypeSafe의 X 게시물 원문은 확인하지 못했다.', 1],
    ['09. 29', 'OpenAI 발표', 'DevDay에서 Decisions API 제한 프리뷰를 발표했다는 보도가 있다. 공식 변경 기록에는 없다.', 1],
    ['10. 01', 'Cloudflare Clef', 'Clef(27B)와 Clef-flash(9B)를 Apache 2.0 오픈 웨이트로 Workers AI에 올렸다.', 0],
    ['10. 06', 'OpenAI 베타', 'OpenAI API 변경 기록에 Decisions API 베타가 올라왔다. gpt-6-luna 기반, 입력 100만 토큰당 $0.10.', 0],
    ['10. 07', 'Liquid AI d1 공개', 'd1 계열을 LFM Open License v1.0 오픈 웨이트로 공개했다. 호스팅 시작일은 출처마다 다르다.', 0],
    ['10. 09', 'Microsoft-Decision-1', 'Qwen3.5-9B를 후속 학습한 결정 모델을 Foundry와 OpenRouter에 냈다. 가격은 Jev와 같은 $0.042.', 0],
    ['10. 12', '원조 논쟁 보도', 'Tom\'s Hardware가 ConvAI Innovations 창업자의 원조 주장과 결정 모델의 홍수를 보도했다.', 0],
    ['10. 14', 'Jev 1.14', '다국어 개선과 이미지용 Box(경계 상자) 질문 타입이 더해졌다. jev-latest는 10월 하순 1.14.0으로 바뀌었다.', 0],
    ['10. 22', 'OpenAI 정식 출시', 'Decisions API가 공식 변경 기록에서 정식 출시로 바뀌었다.', 0]
  ];
  const tl = $('tl2'), card = $('tl2Card');
  let cur = 0, timer = null;
  const bs = EV.map((e, i) => { const b = h('button', e[3] ? 'rep' : '', e[0]); b.type = 'button'; b.setAttribute('role', 'tab'); b.title = e[3] ? '보도에만 있는 날짜' : ''; b.addEventListener('click', () => { stop(); show(i); }); tl.appendChild(b); return b; });
  function show(i) {
    cur = (i + EV.length) % EV.length; const e = EV[cur];
    bs.forEach((b, j) => b.setAttribute('aria-selected', j === cur ? 'true' : 'false'));
    card.innerHTML = `<div class="yr" style="font-size:40px">${e[0]}</div><div><h4>${e[1]}${e[3] ? ' <span class="who ind">보도에만 있음</span>' : ''}</h4><p>${e[2]}</p></div>`;
  }
  function stop() { clearInterval(timer); timer = null; $('tl2Play').textContent = '자동 재생'; }
  $('tl2Prev').onclick = () => { stop(); show(cur - 1); };
  $('tl2Next').onclick = () => { stop(); show(cur + 1); };
  $('tl2Play').onclick = () => { if (timer) return stop(); $('tl2Play').textContent = '일시정지'; timer = setInterval(() => show(cur + 1), 2200); };
  show(0);
})();

/* ---------- d5 · 말한 확신도와 실제 정확도 ---------- */
(() => {
  const D = { all: { top: 90.2, gap: 91.4 - 76.1 }, ex: { top: 96.1, gap: 9.1 } };
  let v = 'all';
  const sw = [...$('calSw').children];
  sw.forEach(b => b.addEventListener('click', () => { v = b.dataset.v; sw.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); draw(); }));
  function draw() {
    const d = D[v];
    $('calTop').style.width = d.top + '%'; $('calTopV').textContent = d.top.toFixed(1) + '%';
    $('calGap').style.width = (d.gap / 20 * 100) + '%'; $('calGapV').textContent = (v === 'ex' ? '약 ' : '') + d.gap.toFixed(1) + '%p';
    const over = 99.4 - d.top;
    $('calOver').textContent = '−' + over.toFixed(1) + '%p';
    $('calSay').textContent = v === 'all'
      ? '최상위 구간에서 Jev는 평균 99.4%를 말했지만 열 번 중 약 한 번은 틀렸다.'
      : '라벨을 임의로 붙인 중립 예시를 빼도 과신은 남는다. 다만 폭은 3.3%p로 줄어든다.';
  }
  draw();
})();
