'use strict';
/* 1주차 인터랙션. 모든 내용은 원본 장표 v0.4에서 옮겼다. */
const $ = id => document.getElementById(id);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 페이지 넘김: 한 번에 한 장씩, 다음 버튼 · ←/→ 키 · 주소(#lm) 동기화 ---------- */
const PAGER = (() => {
  const pages = [...document.querySelectorAll('main > section')];
  const links = [...document.querySelectorAll('#secnav a')];
  const DESC = { cover: '1주차 표지', summary: '이 강의의 줄기', lm: '통계 모델에서 단어 벡터까지', att: '병목을 없앤 계산', prompt: '열여덟 가지 방법론', vlm: '이미지와 행동을 토큰으로', redteam: '공격면과 공진화', conclusion: '1주차 정리' };
  const name = i => pages[i].dataset.name;
  const pad = n => String(n).padStart(2, '0');
  const seen = new Set();
  let cur = -1;
  document.body.classList.add('paged');
  $('pgTot').textContent = pad(pages.length);

  /* 각 장 끝에 다음 장 카드 */
  pages.forEach((p, i) => {
    const nx = pages[i + 1];
    const c = h('button', 'nextcard rv');
    c.type = 'button';
    if (nx) {
      c.innerHTML = `<span class="no">${pad(i + 2)}</span><span><span class="lb">NEXT · 다음 장</span><span class="nm" style="display:block">${name(i + 1)}</span><span class="ds" style="display:block">${DESC[nx.id] || ''}</span></span><span class="ar">→</span>`;
      c.addEventListener('click', () => go(i + 1));
    } else {
      c.innerHTML = `<span class="no">✓</span><span><span class="lb">1주차 끝</span><span class="nm" style="display:block">코스 홈으로</span><span class="ds" style="display:block">2주차는 강의 당일 열린다</span></span><span class="ar">→</span>`;
      c.addEventListener('click', () => { location.href = '../'; });
    }
    p.appendChild(c);
  });

  const dots = pages.map((p, i) => {
    const d = h('button'); d.type = 'button'; d.title = pad(i + 1) + ' ' + name(i); d.setAttribute('aria-label', d.title);
    d.addEventListener('click', () => go(i));
    $('pgDots').appendChild(d); return d;
  });

  function go(i, opt = {}) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (i === cur) return;
    const back = i < cur;
    cur = i; seen.add(i);
    pages.forEach((p, j) => { p.classList.toggle('cur', j === i); p.classList.toggle('back', j === i && back); });
    p_reveal(pages[i]);
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + pages[i].id));
    const on = links.find(a => a.classList.contains('on'));
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    dots.forEach((d, j) => { d.classList.toggle('cur', j === i); d.classList.toggle('seen', seen.has(j)); });
    $('pgNum').textContent = pad(i + 1); $('pgName').textContent = name(i);
    $('pgPrev').disabled = i === 0;
    $('pgPrevName').textContent = i > 0 ? name(i - 1) : '';
    $('pgNextName').textContent = i < pages.length - 1 ? name(i + 1) : '코스 홈';
    if (!opt.noHash) history.replaceState(null, '', '#' + pages[i].id);
    if (!opt.noScroll) window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }
  /* 숨겨져 있던 장의 등장 효과를 다시 건다 */
  function p_reveal(p) {
    if (XR.reduce) return;
    p.querySelectorAll('.rv').forEach((e, k) => { e.classList.remove('in'); setTimeout(() => e.classList.add('in'), 60 + Math.min(k, 6) * 70); });
  }
  const idx = hash => pages.findIndex(p => '#' + p.id === hash);

  $('pgPrev').addEventListener('click', () => go(cur - 1));
  $('pgNext').addEventListener('click', () => { if (cur === pages.length - 1) location.href = '../'; else go(cur + 1); });
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
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); $('pgNext').click(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
  });

  XR.doneButtons(st => {
    links.forEach(a => a.dataset.k && a.classList.toggle('ok', !!st['w1:' + a.dataset.k]));
    dots.forEach((d, j) => d.classList.toggle('ok', !!st['w1:' + pages[j].id]));
  });
  const start = idx(location.hash);
  go(start >= 0 ? start : 0, { noHash: start < 0, noScroll: true });
  return { go };
})();

/* ---------- 01 연표 ---------- */
(() => {
  const EV = [
    { y: 1948, t: '섀넌의 n-gram', s: '통계 언어 모델', e: 0, d: '앞의 n−1개 단어만 보고 다음 단어 확률을 센다. 섀넌의 1948년 근사가 출발점으로 소개된다 (미검증).' },
    { y: 1997, t: 'LSTM', s: 'Hochreiter · Schmidhuber', e: 0, d: '셀 상태와 세 개의 게이트로 무엇을 남기고 잊을지 정한다. 순차 계산이라 병렬화가 어렵다.' },
    { y: 2003, t: '신경망 언어 모델', s: 'NPLM (Bengio)', e: 1, d: '앞 단어들을 벡터로 바꿔 이어 붙이고 신경망으로 다음 단어를 예측한다. 단어 벡터와 예측 함수를 함께 학습하는 틀이 이후 모든 신경망 언어 모델의 기본이 되었다.' },
    { y: 2013, t: 'word2vec', s: '분산 표현', e: 1, d: '주변 단어와 가운데 단어를 서로 맞히며(CBOW · skip-gram) 단어 벡터를 배운다. 의미 관계가 벡터의 방향과 거리로 나타난다.' },
    { y: 2014, t: 'seq2seq · 어텐션', s: 'Sutskever, Bahdanau', e: 2, d: '인코더가 문장 전체를 고정 길이 벡터로 압축하는 병목이 생겼고, 어텐션은 입력을 벡터 하나로 압축할 필요를 없앴다.' },
    { y: 2017, t: 'Transformer', s: 'Attention Is All You Need', e: 2, d: '어텐션과 피드포워드 층을 잔차 연결과 정규화로 감싸 N번 쌓는다. 순환이 없어 모든 토큰을 한 번에 병렬 처리한다.' },
    { y: 2018, t: 'ELMo · GPT-1 · BERT', s: '사전학습 + 미세조정', e: 3, d: '정적 임베딩에서 문맥 임베딩으로 넘어가며 같은 단어도 문맥마다 다른 벡터를 갖게 되었다. (GPT-1 2018은 원문에서 미검증 표시)' },
    { y: 2020, t: 'GPT-3 · 스케일링 법칙', s: '인컨텍스트 학습', e: 4, d: '1,750억 파라미터에서 미세조정 없이 프롬프트 속 예시만으로 새 과제를 수행했다. 손실은 파라미터·데이터·연산량에 대해 거듭제곱 법칙으로 줄어든다.' },
    { y: 2022, t: 'InstructGPT · ChatGPT', s: 'RLHF', e: 4, d: '능력이 커지자 사용자 의도에 맞추는 정렬이 다음 과제가 되었다. 여기서부터 프롬프트 엔지니어링과 레드티밍이 본격적으로 시작된다.' },
    { y: 2024, t: '추론 모델 · VLM · VLA', s: 'test-time compute', e: 5, d: '추론에 연산을 더 쓰는 모델이 나오고, VLM은 이미지를, VLA는 로봇 행동을 토큰으로 바꿨다.' }
  ];
  const tl = $('tl'), card = $('tlCard'), eras = [...$('eras').children];
  let cur = 0, timer = null;
  const btns = EV.map((ev, i) => {
    const b = h('button', null, ev.y); b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { stop(); show(i); });
    tl.appendChild(b); return b;
  });
  function show(i) {
    cur = (i + EV.length) % EV.length;
    const ev = EV[cur];
    btns.forEach((b, j) => b.setAttribute('aria-selected', j === cur ? 'true' : 'false'));
    eras.forEach((s, j) => s.classList.toggle('on', j === ev.e));
    card.innerHTML = `<div class="yr">${ev.y}</div><div><h4>${ev.t}</h4><div class="who">${ev.s}</div><p>${ev.d}</p></div>`;
    card.animate && !XR.reduce && card.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
  }
  function stop() { clearInterval(timer); timer = null; $('tlPlay').textContent = '자동 재생'; }
  $('tlPrev').onclick = () => { stop(); show(cur - 1); };
  $('tlNext').onclick = () => { stop(); show(cur + 1); };
  $('tlPlay').onclick = () => {
    if (timer) return stop();
    $('tlPlay').textContent = '일시정지';
    timer = setInterval(() => show(cur + 1), 2400);
  };
  tl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { stop(); show(cur + 1); btns[cur].focus(); }
    if (e.key === 'ArrowLeft') { stop(); show(cur - 1); btns[cur].focus(); }
  });
  show(0);
})();

/* ---------- 01 n-gram 확률 ---------- */
(() => {
  const W = [{ w: '먹었다', c: 60 }, { w: '샀다', c: 25 }, { w: '치웠다', c: 15 }, { w: '버렸다', c: 0, unseen: true }];
  const box = $('ngBars'), smooth = $('ngSmooth');
  const rows = W.map((it, i) => {
    const r = h('div', 'brow', `<label>${it.w}</label><div class="trk"><i></i></div><span class="p">0.00</span>` +
      `<div class="ctl">${it.unseen ? '<small>말뭉치에 없음 · 횟수 0</small>' : `<input type="range" min="0" max="120" value="${it.c}" aria-label="${it.w} 횟수"><small>횟수 <b>${it.c}</b></small>`}</div>`);
    const inp = r.querySelector('input');
    if (inp) inp.addEventListener('input', () => { it.c = +inp.value; r.querySelector('small b').textContent = it.c; draw(); });
    box.appendChild(r); return r;
  });
  smooth.addEventListener('change', draw);
  function draw() {
    const sm = smooth.checked, k = sm ? 1 : 0;
    const N = W.reduce((a, b) => a + b.c, 0), V = W.length;
    const den = N + k * V;
    const ps = W.map(it => den ? (it.c + k) / den : 0);
    const mx = Math.max(...ps);
    rows.forEach((r, i) => {
      r.querySelector('i').style.width = (ps[i] * 100) + '%';
      r.querySelector('.p').textContent = ps[i].toFixed(2);
      r.classList.toggle('top', ps[i] === mx && mx > 0);
    });
    const best = W[ps.indexOf(mx)];
    $('ngPick').textContent = mx > 0 ? best.w : '?';
    $('ngF').textContent = sm
      ? `P(${best.w} | 학교에서, 밥을) = (C + 1) ÷ (C(학교에서 밥을) + |V|) = (${best.c} + 1) ÷ (${N} + ${V}) = ${mx.toFixed(2)}`
      : `P(${best.w} | 학교에서, 밥을) = C(학교에서 밥을 ${best.w}) ÷ C(학교에서 밥을) = ${best.c} ÷ ${N} = ${mx.toFixed(2)}`;
  }
  draw();

  const rng = $('nRange');
  const sup = n => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
  const upd = () => {
    const n = +rng.value;
    $('nVal').textContent = n;
    $('nBig').innerHTML = `10<sup>${4 * n}</sup>`;
    $('nBar').style.width = (4 * n / 32 * 100) + '%';
    rng.setAttribute('aria-valuetext', `n=${n}, 가능한 단어열 10${sup(4 * n)}개`);
  };
  rng.addEventListener('input', upd); upd();
})();

/* ---------- 02 셀프 어텐션 ---------- */
(() => {
  const T = ['그', '동물은', '너무', '지쳐서', '길을', '건너지', '않았다'];
  const Wt = [0.05, 0.55, 0.06, 0.12, 0.04, 0.08, 0.10];
  const Q = 3;
  const SC = Wt.map(w => Math.log(w) + 3); /* softmax하면 Wt가 되도록 맞춘 설명용 점수 */
  const STEPS = [
    ['입력 X', '토큰 임베딩', '문장의 각 토큰이 임베딩 벡터 X로 바뀐다. 아직 어떤 토큰도 다른 토큰을 보지 않았다.'],
    ['Q · K · V', 'XW_Q, XW_K, XW_V', '서로 다른 가중치 행렬로 쿼리·키·값을 만든다. ‘지쳐서’의 쿼리(검은 칸)가 다른 토큰들의 키와 비교될 준비를 한다.'],
    ['점수', 'QKᵀ / √dₖ', '쿼리와 모든 키의 내적을 √dₖ로 나눈다. ‘동물은’과의 점수가 가장 높다.'],
    ['softmax', '합이 1인 분포', '점수를 softmax로 바꾸면 가중치의 합이 1이 된다. 주체인 ‘동물은’이 0.55를 가져간다.'],
    ['가중치 · V', '문맥이 반영된 새 표현', '가중치로 값 V를 더해 ‘지쳐서’의 새 표현을 만든다. 누가 지쳤는지에 대한 정보가 그 안에 담긴다.']
  ];
  const toks = $('toks'), stepsBox = $('attSteps');
  const els = T.map(t => { const e = h('div', 'tok', `${t}<span class="w"></span><span class="heat"></span>`); toks.appendChild(e); return e; });
  const sb = STEPS.map((s, i) => {
    const b = h('button', null, `${i + 1}. ${s[0]}<small>${s[1]}</small>`); b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => { playing = false; $('attPlay').textContent = '재생'; go(i); });
    stepsBox.appendChild(b); return b;
  });
  let cur = 0, playing = false;
  function go(i) {
    cur = i;
    sb.forEach((b, j) => { b.setAttribute('aria-selected', j === i ? 'true' : 'false'); b.classList.toggle('past', j < i); });
    $('attSay').textContent = STEPS[i][2];
    els.forEach((e, j) => {
      const w = e.querySelector('.w'), heat = e.querySelector('.heat');
      e.classList.toggle('q', i >= 1 && j === Q);
      e.classList.toggle('max', i >= 2 && j === 1);
      if (i === 0) { w.textContent = 'x' + (j + 1); heat.style.width = '0'; }
      else if (i === 1) { w.textContent = j === Q ? 'q' : 'k · v'; heat.style.width = '0'; }
      else if (i === 2) { w.textContent = SC[j].toFixed(2); heat.style.width = '0'; }
      else { w.textContent = Wt[j].toFixed(2); heat.style.width = (Wt[j] / 0.55 * 100) + '%'; }
      e.style.opacity = i >= 3 ? (0.35 + Wt[j] / 0.55 * 0.65).toFixed(2) : 1;
      if (j === Q) e.style.opacity = 1;
    });
  }
  $('attPlay').addEventListener('click', async () => {
    if (playing) { playing = false; $('attPlay').textContent = '재생'; return; }
    playing = true; $('attPlay').textContent = '정지';
    for (let i = 0; i < STEPS.length && playing; i++) { go(i); await sleep(1700); }
    playing = false; $('attPlay').textContent = '다시 재생';
  });
  go(0);
})();

/* ---------- 02 마스크 격자 ---------- */
(() => {
  const INFO = {
    bert: { n: 6, mask: '양방향 어텐션 · 모든 토큰이 앞뒤를 함께 봄', obj: '마스크 언어 모델(MLM) · ‘나는 [MASK]를 먹었다’ → 밥', use: '분류, 개체명 인식, 검색 임베딩', note: 'BERT는 입력 토큰의 15%를 가려 맞히는 MLM과 다음 문장 예측(NSP)으로 사전학습했다. BERT-base 1억 1천만, BERT-large 3억 4천만 파라미터.' },
    gpt: { n: 6, mask: '인과(causal) 어텐션 · 앞쪽 토큰만 볼 수 있음', obj: '다음 토큰 예측 · ‘나는 밥을’ → 먹었다', use: '생성, 대화, 오늘날 LLM의 주류', note: '대각선 위쪽이 가려져 있어 미래 토큰을 볼 수 없다. 그래서 한 토큰씩 이어서 생성한다.' },
    t5: { n: 7, enc: 4, mask: '인코더 양방향 + 디코더 인과 + 교차 어텐션', obj: '텍스트→텍스트 변환 · ‘translate: …’ → 번역문', use: '번역, 요약. 모든 과제를 텍스트 생성으로 통일', note: '위 4행은 인코더(양방향), 아래 3행은 디코더다. 디코더는 인코더 전체를 교차 어텐션(빨강)으로 보고, 자기 쪽은 인과 마스크로 본다.' }
  };
  const grid = $('mgrid'), info = $('minfo'), tabs = [...$('maskTabs').children];
  function draw(m) {
    const c = INFO[m], n = c.n;
    grid.style.gridTemplateColumns = `repeat(${n}, auto)`;
    grid.innerHTML = '';
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
      let cls = 'off';
      if (m === 'bert') cls = 'on';
      else if (m === 'gpt') cls = k <= r ? 'on' : 'off';
      else {
        if (r < c.enc) cls = k < c.enc ? 'on' : 'off';
        else cls = k < c.enc ? 'x' : (k <= r ? 'on' : 'off');
      }
      const i = h('i'); grid.appendChild(i);
      if (XR.reduce) i.className = cls;
      else setTimeout(() => { i.className = cls; }, 18 * (r + k));
    }
    info.innerHTML = `<dl><dt>어텐션 마스크</dt><dd>${c.mask}</dd><dt>사전학습 목표</dt><dd>${c.obj}</dd><dt>주 용도</dt><dd>${c.use}</dd></dl><p class="cap">${c.note}</p>`;
    tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.m === m ? 'true' : 'false'));
  }
  tabs.forEach(t => t.addEventListener('click', () => draw(t.dataset.m)));
  draw('bert');
})();

/* ---------- 03 프롬프트 방법론 18 ---------- */
(() => {
  const G = ['입력 설계', '추론 유도', '질문 분해·지식', '다중 샘플·탐색', '도구·반복', '프롬프트를 만드는 프롬프트'];
  const ax = id => `<a href="https://arxiv.org/abs/${id}" target="_blank" rel="noopener">arXiv ${id}</a>`;
  const P = [
    [0, 'Zero-shot', 'Zero-shot은 예시 없이 과제를 말로만 설명한다', `Brown 외 2020 (${ax('2005.14165')})`, 19],
    [0, 'Few-shot', 'Few-shot은 입력-출력 예시 몇 개로 형식과 기준을 보여 준다', `Brown 외 2020 (${ax('2005.14165')})`, 20],
    [0, '역할 · 페르소나', '역할 부여는 어휘 수준, 관점, 답의 깊이를 정한다', `Reynolds·McDonell 2021 (${ax('2102.07350')}) · Kong 외 NAACL 2024 (${ax('2308.07702')})`, 21],
    [0, '구조화 · 구분자 · 출력 형식', '구분자와 태그는 지시와 데이터를 나누고, 출력 형식은 파싱을 보장한다', 'OpenAI · Anthropic 공식 가이드', 22],
    [1, 'Chain-of-Thought', 'CoT는 예시에 중간 추론을 적어 모델도 단계를 밟게 한다', `Wei 외 2022 (${ax('2201.11903')})`, 23],
    [1, 'Zero-shot CoT', 'Zero-shot CoT는 예시 없이 한 문장으로 단계적 추론을 끌어낸다', `Kojima 외 2022 (${ax('2205.11916')})`, 24],
    [1, 'Plan-and-Solve', 'Plan-and-Solve는 먼저 계획을 세우고 그 계획대로 푼다', `Wang 외 ACL 2023 (${ax('2305.04091')})`, 25],
    [1, 'Least-to-Most', 'Least-to-Most는 쉬운 하위 문제부터 풀어 어려운 문제로 올라간다', `Zhou 외 2022 (${ax('2205.10625')})`, 26],
    [2, 'Self-Ask', 'Self-Ask는 모델이 스스로 후속 질문을 던지고 답한 뒤 최종 답을 낸다', `Press 외 2022 (${ax('2210.03350')})`, 27],
    [2, 'Step-Back', 'Step-Back은 구체적 질문에서 한 걸음 물러나 원리부터 묻는다', `Zheng 외 ICLR 2024 (${ax('2310.06117')})`, 28],
    [2, 'Generated Knowledge', 'Generated Knowledge는 먼저 관련 지식을 생성하게 한 뒤 그 지식으로 답한다', `Liu 외 ACL 2022 (${ax('2110.08387')})`, 29],
    [3, 'Self-Consistency', 'Self-Consistency는 여러 추론 경로를 뽑아 다수결로 답을 정한다', `Wang 외 ICLR 2023 (${ax('2203.11171')})`, 31],
    [3, 'Tree of Thoughts', 'Tree of Thoughts는 중간 생각을 평가하며 트리를 탐색한다', `Yao 외 2023 (${ax('2305.10601')})`, 32],
    [4, 'ReAct', 'ReAct는 생각, 행동, 관찰을 번갈아 반복하며 도구를 쓴다', `Yao 외 ICLR 2023 (${ax('2210.03629')})`, 33],
    [4, 'Self-Refine', 'Self-Refine은 같은 모델이 자기 출력을 비판하고 고치기를 반복한다', `Madaan 외 2023 (${ax('2303.17651')})`, 34],
    [4, 'Prompt Chaining', 'Prompt Chaining은 큰 과제를 여러 프롬프트의 연결로 나눈다', `Wu·Terry·Cai CHI 2022 (${ax('2110.01691')})`, 35],
    [5, 'Meta Prompt', 'Meta Prompt는 모델이 과제에 맞는 프롬프트를 스스로 만들거나 지휘하게 한다', `Reynolds·McDonell 2021 · Suzgun·Kalai 2024 (${ax('2401.12954')}) · Zhang 외 2023 (${ax('2311.11482')})`, 36],
    [5, '자동 최적화 APE · OPRO', 'APE와 OPRO는 LLM이 후보 지시문을 만들고 점수로 골라 개선한다', `Zhou 외 (${ax('2211.01910')}) · Yang 외 (${ax('2309.03409')})`, 37]
  ];
  const filt = $('pmFilter'), grid = $('pmGrid'), det = $('pmDetail');
  let g = -1;
  const all = h('button', 'chip', '전체'); all.type = 'button'; filt.appendChild(all);
  const fb = [all, ...G.map(n => { const b = h('button', 'chip', n); b.type = 'button'; filt.appendChild(b); return b; })];
  fb.forEach((b, i) => b.addEventListener('click', () => { g = i - 1; paint(); }));
  const cards = P.map((p, i) => {
    const b = h('button', 'pm', `<span class="g">${String(i + 1).padStart(2, '0')} · ${G[p[0]]}</span><span class="n">${p[1]}</span>`);
    b.type = 'button'; b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => open(i));
    grid.appendChild(b); return b;
  });
  function paint() {
    fb.forEach((b, i) => b.setAttribute('aria-pressed', i - 1 === g ? 'true' : 'false'));
    let n = 0;
    cards.forEach((c, i) => { const on = g < 0 || P[i][0] === g; c.classList.toggle('dim', !on); c.tabIndex = on ? 0 : -1; if (on) n++; });
    $('pmCount').textContent = n + '개 표시';
    const first = P.findIndex(p => g < 0 || p[0] === g);
    open(first);
  }
  function open(i) {
    const p = P[i];
    cards.forEach((c, j) => c.setAttribute('aria-expanded', j === i ? 'true' : 'false'));
    det.innerHTML = `<div><span class="kicker">${G[p[0]]} · 장표 ${p[4]}쪽</span><h4>${p[1]}</h4><p>${p[2]}</p></div><div class="num">${String(i + 1).padStart(2, '0')}</div><div class="src">원본 논문: ${p[3]} · <a href="animations.html#pr">애니메이션 보기</a></div>`;
  }
  paint();
})();

/* ---------- 03 추론 패턴 ---------- */
(() => {
  const F = {
    'Chain-of-Thought': { rows: [[['질문', 's']], [['추론 단계 1']], [['추론 단계 2']], [['추론 단계 3']], [['답', 'a']]], say: '하나의 추론 사슬을 차례로 써 내려간다.' },
    'Self-Consistency': { rows: [[['질문', 's']], [['경로 1'], ['경로 2'], ['경로 3']], [['…'], ['…'], ['…']], [['답 A', 'r'], ['답 B'], ['답 A', 'r']], [['다수결 → 답 A', 'a']]], say: '여러 사슬을 샘플링해 답을 다수결로 정한다.' },
    'Tree of Thoughts': { rows: [[['질문', 's']], [['생각 a'], ['생각 b'], ['생각 c ✗', 'x']], [['a1 ✗', 'x'], ['a2', 'r'], ['b1 ✗', 'x']], [['a2-i', 'r']], [['최종 답', 'a']]], say: '중간 생각을 평가해 가망 없는 가지(점선 ✗)를 버리고 되돌아간다.' },
    'ReAct': { rows: [[['질문', 's']], [['Thought']], [['Action', 'r']], [['Observation (검색·도구 호출)']], [['Thought']], [['Action', 'r']], [['Observation']], [['답', 'a']]], say: '추론과 도구 행동, 관찰을 번갈아 반복한다.' }
  };
  const tabs = $('flowTabs'), flow = $('flow');
  let token = 0;
  const bs = Object.keys(F).map(k => {
    const b = h('button', 'chip', k); b.type = 'button'; b.setAttribute('role', 'tab');
    b.addEventListener('click', () => draw(k)); tabs.appendChild(b); return b;
  });
  async function draw(k) {
    const my = ++token;
    bs.forEach(b => b.setAttribute('aria-selected', b.textContent === k ? 'true' : 'false'));
    flow.innerHTML = ''; $('flowSay').textContent = F[k].say;
    const rows = F[k].rows.map((r, i) => {
      if (i) flow.appendChild(h('div', 'farr', '↓'));
      const row = h('div', 'frow'); r.forEach(([t, c]) => row.appendChild(h('span', 'fb' + (c ? ' ' + c : ''), t)));
      flow.appendChild(row); return row;
    });
    for (const r of rows) { if (my !== token) return; r.classList.add('in'); if (!XR.reduce) await sleep(380); }
  }
  draw('Chain-of-Thought');
})();

/* ---------- 03 부스터 / 브레이크 ---------- */
(() => {
  const sw = [...$('bbSwitch').children], old = document.querySelector('#bb .old'), nw = document.querySelector('#bb .new');
  sw.forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.v;
    sw.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    old.classList.toggle('dim', v === 'new'); nw.classList.toggle('dim', v === 'old');
    old.classList.toggle('hot', v === 'old'); nw.classList.toggle('hot', v === 'new');
  }));
})();

/* ---------- 04 파이프라인 재생기 ---------- */
function pipeline(pipeId, sayId, says) {
  const pipe = $(pipeId), st = [...pipe.querySelectorAll('.st')], ar = [...pipe.querySelectorAll('.ar')];
  let tok = 0;
  const light = i => { st.forEach((s, j) => s.classList.toggle('on', j === i)); ar.forEach((a, j) => a.classList.toggle('on', j === i - 1)); $(sayId).textContent = says()[i] || ''; };
  st.forEach((s, i) => { s.style.cursor = 'pointer'; s.addEventListener('click', () => { tok++; light(i); }); });
  return {
    light,
    async play(btn) {
      const my = ++tok;
      if (btn) btn.disabled = true;
      for (let i = 0; i < st.length; i++) { if (my !== tok) break; light(i); await sleep(XR.reduce ? 0 : 1100); }
      if (btn) btn.disabled = false;
    }
  };
}
(() => {
  const CONN = [
    ['투영(MLP)', 'LLaVA', '선형 투영(MLP)이 패치 특징을 LLM 임베딩 크기로 바로 옮긴다. 가장 단순해서 가장 널리 퍼졌다.'],
    ['Q-Former', 'BLIP-2', '학습 가능한 쿼리가 이미지 특징에서 필요한 정보만 뽑아 소수의 시각 토큰으로 만든다.'],
    ['리샘플러', 'Flamingo', '리샘플러가 시각 특징을 고정 개수로 줄이고, LLM 층 사이의 교차 어텐션으로 넣는다.']
  ];
  let c = 0;
  const says = () => [
    '입력 이미지와 텍스트 지시 "이 영상에서 이상 소견을 설명해줘"가 들어온다.',
    '이미지를 작은 패치(예: 16×16)로 자른다. 패치는 단어처럼 다뤄진다.',
    'ViT/CLIP 비전 인코더가 각 패치를 특징 벡터로 바꾼다.',
    CONN[c][2],
    'LLM은 시각 토큰과 텍스트 토큰을 한 시퀀스로 처리한다.',
    '텍스트로 답을 생성한다. (학습: ① 정렬 사전학습에서 연결 모듈만 학습 → ② 시각 지시 튜닝에서 연결 모듈과 LLM을 함께 미세조정, LLaVA 기준)'
  ];
  const P = pipeline('vlmPipe', 'vlmSay', says);
  const tabs = [...$('connTabs').children];
  tabs.forEach(t => t.addEventListener('click', () => {
    c = +t.dataset.c;
    tabs.forEach(x => x.setAttribute('aria-pressed', x === t ? 'true' : 'false'));
    $('connName').textContent = CONN[c][0]; $('connSub').textContent = CONN[c][1];
    P.light(3);
  }));
  $('vlmPlay').addEventListener('click', e => P.play(e.currentTarget));
  P.light(0);

  const ACT = [
    ['이산 행동 토큰', '각 차원을 256 구간으로 나눠 텍스트처럼 자기회귀 생성', 'RT-2와 OpenVLA는 행동의 각 차원을 256개 구간으로 나눈 토큰으로 바꿔, 텍스트를 쓰듯 한 토큰씩 생성한다.'],
    ['연속 행동 생성', '행동 전문가가 flow matching으로 행동 청크를 한 번에 생성', 'π0는 로봇 상태와 노이즈 섞인 행동을 행동 전문가(약 3억 파라미터)로 보내 flow matching으로 행동 청크를 한 번에 만든다. 최대 50Hz 제어.']
  ];
  let a = 0;
  const vsays = () => [
    '카메라 영상과 언어 지시 "빨간 컵을 집어"가 들어온다.',
    'VLM 백본은 웹 규모 이미지·텍스트로 사전학습된 지식으로 장면과 지시를 이해한다.',
    ACT[a][2],
    '로봇 제어 신호(Δx, Δy, Δz, 회전, 그리퍼)로 바뀐다. 출력이 물리적 행동이라 사람이 걸러낼 기회가 없다.',
    '환경이 바뀌면 새 관측으로 다시 추론한다 (폐루프 제어).'
  ];
  const V = pipeline('vlaPipe', 'vlaSay', vsays);
  const at = [...$('actTabs').children];
  at.forEach(t => t.addEventListener('click', () => {
    a = +t.dataset.a;
    at.forEach(x => x.setAttribute('aria-pressed', x === t ? 'true' : 'false'));
    $('actName').textContent = ACT[a][0]; $('actSub').textContent = ACT[a][1];
    V.light(2);
  }));
  V.light(0);
  /* 화면에 들어오면 한 번 자동 재생 */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { V.play(); io.disconnect(); } }), { threshold: .6 });
    io.observe($('vlaPipe'));
  } else V.light(0);
})();

/* ---------- 05 공격면 ---------- */
(() => {
  const S = [
    ['학습 데이터', ['데이터 오염', '백도어 · 슬리퍼', '학습 데이터 추출'], ['데이터 출처 검증', '오염 탐지']],
    ['사전학습 · 정렬', ['경쟁 목표', '아첨 · 보상 해킹', '정렬 위장'], ['Constitutional AI', 'Model Spec']],
    ['모델 가중치', ['유해 파인튜닝', '거부 방향 제거', '가중치 유출'], ['접근 통제', '파인튜닝 검사']],
    ['추론 입력', ['탈옥 (역할극 · 인코딩)', '최적화 공격 (GCG · PAIR)', 'many-shot · Best-of-N'], ['입출력 분류기', 'Instruction Hierarchy']],
    ['도구 · 환경', ['간접 프롬프트 인젝션', '에이전트 하이재킹', '과도한 행위 권한'], ['샌드박스 · 최소 권한', 'CaMeL · 정보 흐름']]
  ];
  const surf = $('surf');
  const cols = S.map(([n, t, d]) => {
    const c = h('div', 'col', `<h5>${n}</h5><ul class="thr">${t.map(x => `<li>${x}</li>`).join('')}</ul><ul class="def">${d.map(x => `<li>${x}</li>`).join('')}</ul>`);
    c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-pressed', 'false');
    const tog = () => {
      const on = !c.classList.contains('on');
      cols.forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      if (on) { c.classList.add('on'); c.setAttribute('aria-pressed', 'true'); }
      surf.classList.toggle('focus', on);
    };
    c.addEventListener('click', tog);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    surf.appendChild(c); return c;
  });
})();

/* ---------- 05 공격의 여섯 갈래 ---------- */
(() => {
  const A = [
    ['추론 시점 정책 회피 (탈옥)', '모델 자신의 사용 정책', '역할극, 인코딩·저자원 언어, 최적화(GCG·AutoDAN), LLM 공격자(PAIR·TAP), 규모 악용(many-shot·Best-of-N), 멀티턴(Crescendo)'],
    ['지시·데이터 혼동 (프롬프트 인젝션)', '애플리케이션의 지시, 사용자·개발자', '직접(목표 탈취·프롬프트 유출), 간접(검색 문서·이메일·도구 출력·이미지)'],
    ['가중치·학습 시점 공격', '모델 자체', '유해 파인튜닝, 거부 방향 제거, 데이터 오염, 백도어, 가중치 편집'],
    ['프라이버시 공격', '학습 데이터·시스템 프롬프트', '학습 데이터 추출, 시스템 프롬프트 유출'],
    ['외부 공격자 없는 비정렬', '정렬의 빈틈', '아첨, 정렬 위장, 창발적 비정렬, 에이전트 비정렬, 보상 해킹'],
    ['에이전트·체화 오용', '도구를 가진 에이전트, 로봇', 'AgentHarm, 로봇 탈옥(RoboPAIR·BadRobot)']
  ];
  const acc = $('acc');
  A.forEach(([n, t, r], i) => {
    const d = h('details', null, `<summary><span class="tag red" style="min-width:0;padding:2px 10px">${i + 1}</span>${n}<small>${t}</small></summary><div class="bd"><b>노리는 대상</b><span>${t}</span><b>대표 연구</b><span>${r}</span></div>`);
    if (i === 0) d.open = true;
    acc.appendChild(d);
  });
})();

/* ---------- 05 공진화 ---------- */
(() => {
  const C = [
    ['퓨샷 · 인컨텍스트 학습', 'many-shot jailbreaking', '프롬프트 분류 · 수정'],
    ['지시 튜닝 · RLHF', '경쟁 목표, 아첨', 'Constitutional AI, 사양서'],
    ['자동 프롬프트 최적화', 'GCG, PAIR, AutoDAN', '자동화 레드티밍, 적대적 학습'],
    ['반복 샘플링', 'Best-of-N 탈옥', '공격 예산 기준 평가'],
    ['RAG · 도구 사용', '간접 프롬프트 인젝션', '지시 위계, CaMeL'],
    ['VLM · VLA', '시각 프롬프트 인젝션, 로봇 탈옥', '멀티모달 분류기, 행동 안전 제약']
  ];
  const tb = document.querySelector('#coevo tbody');
  let timer = null, cur = -1;
  const rows = C.map((c, i) => {
    const r = h('tr', null, `<td class="c1">${c[0]}</td><td class="arw">→</td><td class="c2">${c[1]}</td><td class="arw">→</td><td class="c3">${c[2]}</td>`);
    r.tabIndex = 0;
    r.addEventListener('click', () => { stop(); set(i); });
    r.addEventListener('keydown', e => { if (e.key === 'Enter') { stop(); set(i); } });
    tb.appendChild(r); return r;
  });
  function set(i) { cur = i; rows.forEach((r, j) => r.classList.toggle('on', j === i)); }
  function stop() { clearInterval(timer); timer = null; $('coPlay').textContent = '자동 재생'; }
  $('coPlay').addEventListener('click', () => {
    if (timer) return stop();
    $('coPlay').textContent = '일시정지';
    set((cur + 1) % C.length);
    timer = setInterval(() => set((cur + 1) % C.length), 1800);
  });
  set(0);
})();
