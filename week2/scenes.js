'use strict';
/* 2주차 애니메이션 10개. 노션 강의 대본의 '사이트 요소'(s01~s10)를 따른다.
   '예시'로 표시한 값은 설명용이며, 출처가 있는 값은 대본의 근거를 따른다. */

/* s01 · 장표 3 */
scene({
  sec: 'bg', page: 3, kind: '그림 1', title: '에이전트 루프의 비용', dur: 7.4,
  cap: '위 줄은 지금의 루프다. 판단과 평가마다 생성 모델을 불러 한 바퀴에 LLM 호출이 두 번 쌓인다. 아래 줄은 판단을 결정 모델로 바꾼 루프다. LLM은 확신도가 낮을 때만 예외로 불린다.',
  build(S) {
    S.cue([2.7, 5.2, 6.6]);
    const lab = [['상태 관찰', '대화·로그·화면'], ['LLM 판단', '다음 행동 선택'], ['도구 실행', '명령·검색·API'], ['LLM 평가', '결과가 맞는지'], ['다음 상태', '루프 반복']];
    const xs = [14, 140, 266, 392, 518], W = 108;
    S.text(14, 22, '지금 · 판단마다 생성 모델', { fs: 12.5, fw: 800, anchor: 'start' });
    const A = lab.map((l, i) => S.box(xs[i], 36, W, 50, l[0], { sub: l[1], fs: 13.5, cls: i === 2 ? 'solid' : (i === 1 || i === 3 ? 'tagb' : '') }));
    const pa = S.wire([[xs[0] + W / 2, 61], [xs[4] + W / 2, 61]], { cls: 'inv' });
    for (let i = 0; i < 4; i++) S.wire([A[i].r, A[i + 1].l]);
    S.wire([[xs[4] + W / 2, 86], [xs[4] + W / 2, 100], [xs[0] + W / 2, 100], [xs[0] + W / 2, 86]], { cls: 'dash thin' });
    const c1 = S.text(626, 118, '', { fs: 12.5, fw: 800, anchor: 'end', cls: 'acc' });
    S.dot(pa, 0.3, 2.6, { lit: false });
    S.hl(A[1], 0.75, 1.3); S.hl(A[3], 1.7, 2.25);
    S.at(t => { const n = t < 0.95 ? 0 : t < 1.9 ? 1 : 2; const s = '한 바퀴 LLM 호출 ' + n + '회'; if (c1.textContent !== s) c1.textContent = s; });

    S.line(14, 140, 626, 140, 'rule');
    S.text(14, 164, '바꾸면 · 판단은 결정 모델, LLM은 예외만', { fs: 12.5, fw: 800, anchor: 'start' });
    const lab2 = [['상태 관찰', '대화·로그·화면'], ['결정 모델', '확률이 붙은 선택'], ['도구 실행', '명령·검색·API'], ['결정 모델', '통과·실패 확률'], ['다음 상태', '루프 반복']];
    const B = lab2.map((l, i) => S.box(xs[i], 178, W, 50, l[0], { sub: l[1], fs: 13.5, cls: i === 1 || i === 3 ? 'solid' : '' }));
    const pb = S.wire([[xs[0] + W / 2, 203], [xs[4] + W / 2, 203]], { cls: 'inv' });
    for (let i = 0; i < 4; i++) S.wire([B[i].r, B[i + 1].l]);
    const L = S.box(xs[3] - 20, 286, W + 40, 44, 'LLM (예외만)', { sub: '확신도가 낮을 때', fs: 13, cls: 'dash' });
    const esc = S.wire([[xs[3] + W / 2, 228], [xs[3] + W / 2, 286]], { cls: 'dash' });
    S.text(xs[3] + W / 2 - 8, 258, '낮은 확신도', { fs: 11, cls: 'acc', anchor: 'end' });
    const c2 = S.text(14, 316, '', { fs: 12.5, fw: 800, anchor: 'start', cls: 'acc' });
    S.dot(pb, 2.9, 5.0, { lit: false });
    S.hl(B[1], 3.3, 3.8); S.hl(B[3], 4.2, 4.7);
    S.vis(c2, 2.9);
    S.at(t => { const s = t < 5.4 ? '한 바퀴 LLM 호출 0회' : '예외일 때만 LLM 1회'; if (c2.textContent !== s) c2.textContent = s; });
    S.dot(esc, 5.4, 6.0); S.hl(L, 5.9, 6.9);
  }
});

/* s02 · 장표 4 */
scene({
  sec: 'bg', page: 4, kind: '개념도', title: 'System 1과 System 2의 분업', dur: 7,
  cap: '닫힌 선택은 빠른 System 1(결정 모델)이 확률을 붙여 바로 답한다. 계획처럼 선택지가 열린 일과, System 1이 확신하지 못한 일만 느린 System 2(LLM)로 간다.',
  build(S) {
    S.cue([1.6, 3.2, 4.9, 6.4]);
    const reqs = [['이 메일은 스팸인가', '닫힌 선택'], ['이 명령은 위험한가', '닫힌 선택'], ['다음 주 배포 계획 짜기', '열린 문제']];
    const R = reqs.map((r, i) => S.box(16, 56 + i * 92, 176, 52, r[0], { sub: r[1], fs: 13 }));
    const S1 = S.box(330, 60, 160, 84, 'System 1', { sub: '결정 모델 · 빠름\n확률이 붙은 선택', fs: 17, cls: 'solid' });
    const S2 = S.box(330, 216, 160, 84, 'System 2', { sub: 'LLM · 느림\n숙고와 생성', fs: 17 });
    const o1 = S.box(530, 40, 96, 40, '스팸 0.97', { fs: 13, cls: 'thin' });
    const o2 = S.box(530, 120, 96, 40, '묻기 0.63', { fs: 13, cls: 'thin' });
    const o3 = S.box(530, 238, 96, 40, '계획 문서', { fs: 13, cls: 'thin' });
    [o1, o2, o3].forEach(o => S.slot(o));
    const w1 = S.hv(R[0].r, [330, 88]), w2 = S.hv(R[1].r, [330, 116]), w3 = S.hv(R[2].r, [330, 258]);
    const q1 = S.hv([490, 88], o1.l), q2 = S.hv([490, 116], o2.l), q3 = S.wire([S2.r, o3.l]);
    const up = S.wire([[440, 144], [440, 216]], { cls: 'dash' });
    S.text(448, 182, '확신 낮으면', { fs: 11, cls: 'acc', anchor: 'start' });
    S.text(410, 330, '빠른 길 ≈ 0.3초 · 느린 길 = 수 초 (대본 근거)', { fs: 11.5, cls: 'sub' });
    S.hl(R[0], 0.2, 1.4); S.dot(w1, 0.3, 0.8); S.hl(S1, 0.8, 1.3); S.dot(q1, 1.1, 1.5); S.vis(o1, 1.5);
    S.hl(R[1], 1.8, 3.0); S.dot(w2, 1.9, 2.4); S.hl(S1, 2.4, 2.9); S.dot(q2, 2.7, 3.1); S.vis(o2, 3.1);
    S.hl(R[2], 3.4, 6.2); S.dot(w3, 3.5, 4.2); S.hl(S2, 4.2, 6.1); S.dot(q3, 5.6, 6.2); S.vis(o3, 6.3);
    S.dot(up, 4.4, 5.0, { lit: false }); S.cls(up, 'on', 4.4, 5.2);
  }
});

/* s03 · 장표 7 */
scene({
  sec: 'jev', page: 7, kind: '그림 2', title: '한 번의 처리로 여러 질문에 답하기', dur: 7,
  cap: '상태와 질문 목록이 함께 들어가고, Jev는 세 질문을 한 번에 병렬로 평가해 타입이 정해진 답을 동시에 돌려준다. 아래의 LLM은 답을 토큰 하나씩 이어 쓴다. 확률 값은 예시다.',
  build(S) {
    S.cue([1.5, 3.0, 4.2, 6.4]);
    const st = S.box(14, 30, 170, 50, '상태', { sub: '"rm -rf ./dist"', fs: 14 });
    const qs = [['Noul', '되돌릴 수 없는 삭제인가'], ['Choice', '명령의 종류'], ['Score', '위험도 1~3']];
    const Q = qs.map((q, i) => S.box(14, 100 + i * 46, 170, 38, q[0] + ' · ' + q[1], { fs: 11.5, cls: 'thin', anchor: 'start' }));
    const J = S.box(250, 60, 120, 120, 'Jev', { sub: '한 번의 처리\n병렬 평가', fs: 20, cls: 'solid' });
    const ins = [S.hv(st.r, [250, 90]), ...Q.map((q, i) => S.hv(q.r, [250, 110 + i * 22]))];
    const ans = [['참일 확률 0.63', ''], ['삭제 · 0.81', '확신도 0.81'], ['기댓값 2.3', '단계별 확률']];
    const A = ans.map((a, i) => S.box(432, 52 + i * 50, 194, 40, a[0], { sub: a[1] || null, fs: 13, cls: 'tagb' }));
    A.forEach(a => S.slot(a));
    const outs = A.map((a, i) => S.hv([370, 90 + i * 30], a.l));
    S.hl([st, ...Q], 0.2, 1.6);
    ins.forEach((w, i) => S.dot(w, 0.4 + i * 0.12, 1.4 + i * 0.05));
    S.hl(J, 1.5, 3.0);
    outs.forEach(w => S.dot(w, 2.6, 3.2));
    A.forEach(a => S.vis(a, 3.1));
    S.line(14, 258, 626, 258, 'rule');
    S.text(14, 282, 'LLM은 답을 토큰 단위로 하나씩 이어 쓴다', { fs: 12.5, fw: 800, anchor: 'start' });
    const L = S.box(14, 296, 90, 40, 'LLM', { fs: 14 });
    const tx = S.text(120, 316, '이 명령은 빌드 결과 폴더를 지우므로 위험도가 중간이며, 종류는 삭제에…', { fs: 12.5, anchor: 'start' });
    S.type(tx, 3.6, 6.3); S.hl(L, 3.6, 6.3);
  }
});

/* s04 · 장표 8 */
scene({
  sec: 'jev', page: 8, kind: '질문 타입', title: 'Choice · Score · Noul', dur: 7,
  cap: '같은 명령을 세 타입으로 묻는다. Choice는 모든 선택지의 확률과 확신도를, Score는 단계별 확률로 가중한 기댓값을, Noul은 참일 확률 하나만 돌려준다. Noul 0.63은 대본의 시연값, 나머지는 예시다.',
  build(S) {
    S.cue([2.3, 4.3, 6.0]);
    S.text(320, 22, '상태: rm -rf ./dist', { fs: 13.5, fw: 800 });
    const cols = [[14, 'Choice', '명령의 종류'], [228, 'Score', '위험도 (1~3)'], [442, 'Noul', '되돌릴 수 없는 삭제인가']];
    const H = cols.map(c => S.box(c[0], 40, 184, 44, c[1], { sub: c[2], fs: 15, cls: 'solid' }));
    const opts = [['삭제', 0.81], ['읽기', 0.03], ['설치', 0.02], ['네트워크', 0.02], ['unknown', 0.12]];
    opts.forEach((o, i) => {
      const y = 104 + i * 34;
      S.text(70, y + 10, o[0], { fs: 12, fw: 700, anchor: 'end' });
      S.rect(78, y, 110, 20, 'track');
      S.bar(78, y, 110 * o[1], 20, 0.4 + i * 0.12, 1.2 + i * 0.12, { cls: i === 0 ? 'acc' : '' });
      S.vis(S.text(194, y + 10, o[1].toFixed(2), { fs: 11, anchor: 'start', cls: 'sub' }), 1.3);
    });
    S.vis(S.text(106, 290, '선택: 삭제 · 확신도 0.81', { fs: 12.5, fw: 800, cls: 'acc' }), 1.9);
    const sc = [['1 낮음', 0.15], ['2 중간', 0.45], ['3 높음', 0.40]];
    sc.forEach((s, i) => {
      const x = 246 + i * 52, base = 250;
      S.rect(x, base - 130, 38, 130, 'track');
      S.vbar(x, base, 38, 130 * s[1] / 0.5, 2.4 + i * 0.15, 3.2 + i * 0.15);
      S.text(x + 19, base + 14, s[0], { fs: 11.5, fw: 700 });
      S.vis(S.text(x + 19, base - 130 * s[1] / 0.5 - 10, s[1].toFixed(2), { fs: 11, cls: 'sub' }), 3.4);
    });
    const ev = S.text(320, 290, '', { fs: 12.5, fw: 800, cls: 'acc' });
    S.num(ev, 1, 2.25, 3.4, 4.2, v => '기댓값 ' + v.toFixed(2));
    S.vis(ev, 3.4);
    S.rect(470, 130, 128, 24, 'track');
    S.bar(470, 130, 128 * 0.63, 24, 4.4, 5.4, { cls: 'acc' });
    const nv = S.text(534, 186, '', { fs: 26, fw: 800, cls: 'acc' });
    S.num(nv, 0, 0.63, 4.4, 5.4); S.vis(nv, 4.4);
    S.text(534, 218, '참일 확률 하나', { fs: 12, cls: 'sub' });
    S.vis(S.text(534, 290, '확신도 필드 없음', { fs: 12.5, fw: 800 }), 5.6);
    S.hl(H[0], 0.3, 2.2); S.hl(H[1], 2.3, 4.2); S.hl(H[2], 4.3, 6.2);
  }
});

/* s05 · 장표 12 */
scene({
  sec: 'eng', page: 12, kind: '그림 3', title: 'LLM은 쓰고, Jev는 판단하고, 코드는 행동한다', dur: 7.6,
  cap: '매 단계 도는 것은 Jev와 코드뿐이다. 세 번째 단계에서 확신도가 낮게 나오자 그때만 LLM이 불려 루브릭 수정안을 쓰고, 다음 판단부터 그 기준이 쓰인다.',
  build(S) {
    S.cue([1.9, 3.6, 6.3]);
    const lanes = [['쓰기 · LLM', '예외 경로에서만', 40], ['판단 · Jev', '매 단계', 140], ['행동 · 코드', '매 단계', 240]];
    lanes.forEach(l => { S.text(14, l[2] + 16, l[0], { fs: 13, fw: 800, anchor: 'start' }); S.text(14, l[2] + 34, l[1], { fs: 11, cls: 'sub', anchor: 'start' }); });
    const xs = [150, 310, 470];
    const J = xs.map((x, i) => S.box(x, 130, 120, 54, '판단 ' + (i + 1), { sub: i < 2 ? '확신도 0.9x' : '확신도 0.42', fs: 14, cls: 'solid' }));
    const C = xs.map((x, i) => S.box(x, 232, 120, 50, i < 2 ? '임계값 통과 → 실행' : '하한 미만 → 이관', { fs: 12, cls: i < 2 ? '' : 'tagb' }));
    const Lb = S.box(470, 30, 120, 54, 'LLM', { sub: '루브릭 수정안', fs: 14, cls: 'dash' });
    const d = xs.map((x, i) => S.wire([J[i].b, C[i].t]));
    const nx = [S.wire([[270, 257], [310, 157]]), S.wire([[430, 257], [470, 157]])];
    const up = S.wire([[590, 257], [612, 257], [612, 57], [590, 57]]);
    const back = S.wire([[470, 70], [430, 70], [430, 140], [470, 145]], { cls: 'dash' });
    const cnt = S.text(320, 330, '', { fs: 13, fw: 800, cls: 'acc' });
    [0, 1, 2].forEach(i => { const t = 0.2 + i * 1.7; S.hl(J[i], t, t + 0.6); S.dot(d[i], t + 0.5, t + 0.9); S.hl(C[i], t + 0.9, t + 1.4); if (i < 2) S.dot(nx[i], t + 1.3, t + 1.7); });
    S.dot(up, 4.3, 4.9); S.hl(Lb, 4.9, 6.0); S.dot(back, 5.6, 6.2);
    S.at(t => { const s = '단계 ' + (t < 1.9 ? 1 : t < 3.6 ? 2 : 3) + ' · LLM 호출 ' + (t < 4.9 ? 0 : 1) + '회'; if (cnt.textContent !== s) cnt.textContent = s; });
  }
});

/* s06 · 장표 14 */
scene({
  sec: 'eng', page: 14, kind: '기법 1', title: '가드 훅', dur: 8,
  cap: '명령을 실행하기 직전에 "이 명령은 파괴적인가"를 Noul로 묻고, 0.70 이상은 차단, 0.35 이상은 사용자에게 묻는다. Jev 호출이 실패하면 허용하지 않고 묻는다. DROP 0.95와 rm 0.63은 글쓴이 시연값, ls 0.08은 예시다.',
  build(S) {
    S.cue([2.1, 4.0, 5.9, 7.6]);
    const cmds = [['DROP TABLE users;', 0.95, 2], ['rm -rf ./dist', 0.63, 1], ['ls -la', 0.08, 0], ['Jev 호출 실패 (시간 초과)', null, 1]];
    S.text(14, 30, 'PreToolUse 훅 · 실행 직전', { fs: 12.5, fw: 800, anchor: 'start' });
    const X0 = 60, X1 = 580, Y = 150, sx = p => X0 + (X1 - X0) * p;
    S.rect(X0, Y, sx(0.35) - X0, 26, 'track');
    const za = S.rect(sx(0.35), Y, sx(0.7) - sx(0.35), 26, 'cell s'); za.setAttribute('style', 'fill:var(--accent-soft);stroke:none');
    const zd = S.rect(sx(0.7), Y, X1 - sx(0.7), 26, ''); zd.setAttribute('style', 'fill:var(--accent);opacity:.18');
    [[0.35, '0.35'], [0.7, '0.70']].forEach(v => { S.line(sx(v[0]), Y - 10, sx(v[0]), Y + 36, 'gl'); S.text(sx(v[0]), Y + 50, v[1], { fs: 12, fw: 800, cls: 'acc' }); });
    S.text(X0, Y + 50, '0', { fs: 11.5, cls: 'sub' }); S.text(X1, Y + 50, '1', { fs: 11.5, cls: 'sub' });
    S.text(sx(0.175), Y - 18, '허용', { fs: 13, fw: 800 }); S.text(sx(0.525), Y - 18, '사용자에게 묻기', { fs: 13, fw: 800 }); S.text(sx(0.85), Y - 18, '차단', { fs: 13, fw: 800, cls: 'acc' });
    const O = [S.box(96, 262, 130, 46, 'ALLOW', { sub: '실행', fs: 15 }), S.box(255, 262, 130, 46, 'ASK', { sub: '사용자 확인', fs: 15 }), S.box(414, 262, 130, 46, 'DENY', { sub: '차단', fs: 15, cls: 'solid' })];
    cmds.forEach((c, i) => {
      const t0 = 0.2 + i * 1.9, t1 = t0 + 1.8;
      const ct = S.box(140, 44, 360, 42, c[0], { fs: 15, mono: true, cls: c[1] === null ? 'dash' : '' });
      S.vis(ct, t0, t1);
      if (c[1] !== null) {
        const m = S.group('');
        mk('path', { d: `M${sx(c[1])},${Y - 2} l-7,-12 h14 z`, class: 'mka' }, m);
        mk('circle', { cx: sx(c[1]), cy: Y + 13, r: 7, class: 'dt' }, m);
        S.vis(m, t0 + 0.4, t1);
        S.vis(S.text(sx(c[1]), Y + 74, 'p = ' + c[1].toFixed(2), { fs: 13, fw: 800 }), t0 + 0.4, t1);
      } else {
        S.vis(S.text(320, Y + 74, '확률 없음 → 기본값은 허용이 아니라 묻기', { fs: 13, fw: 800, cls: 'acc' }), t0 + 0.4, t1);
      }
      S.hl(O[c[2]], t0 + 0.9, t1);
    });
  }
});

/* s07 · 장표 15 */
scene({
  sec: 'eng', page: 15, kind: '기법 2', title: '모델 라우터', dur: 7.2,
  cap: '요청마다 Choice 질문으로 빠른 모델과 강한 모델 중 하나를 고른다. 확신도가 높으면 고른 등급 그대로, 낮으면 한 단계 위로만 올린다. 아래로는 내리지 않는다. 확신도 값은 예시다.',
  build(S) {
    S.cue([3.3, 6.6]);
    const R = S.box(14, 140, 120, 56, '사용자 요청', { fs: 14 });
    const J = S.box(180, 132, 130, 72, 'Jev · Choice', { sub: 'fast / powerful', fs: 15, cls: 'solid' });
    const F = S.box(470, 236, 150, 56, 'fast 모델', { sub: '싸고 빠름', fs: 15 });
    const P = S.box(470, 44, 150, 56, 'powerful 모델', { sub: '비싸고 강함', fs: 15 });
    const w0 = S.wire([R.r, J.l]);
    const cases = [['"오타 고쳐 줘"', 'fast · 확신도 0.92', 0.2], ['"이 장애 원인 분석해 줘"', 'fast · 확신도 0.55', 3.5]];
    const ql = cases.map(c => S.text(74, 120, c[0], { fs: 12, fw: 700 }));
    const res = cases.map(c => S.text(245, 228, c[1], { fs: 12.5, fw: 800, cls: 'acc' }));
    const toF = S.hv(J.r, F.l, { mx: 400 });
    const lift = S.wire([[515, 236], [515, 100]]);
    S.text(507, 170, '한 단계 위로', { fs: 11.5, fw: 800, cls: 'acc', anchor: 'end' });
    const down = S.wire([[595, 100], [595, 236]], { cls: 'dash thin' });
    const xm = S.xmark(595, 168, 14);
    S.text(586, 140, '내리지 않음', { fs: 10.5, cls: 'sub', anchor: 'end' });
    cases.forEach((c, k) => {
      const t = c[2];
      S.vis(ql[k], t, t + 3.2); S.dot(w0, t + 0.2, t + 0.7); S.hl(J, t + 0.7, t + 1.4);
      S.vis(res[k], t + 1.1, t + 3.2); S.dot(toF, t + 1.4, t + 2.0);
    });
    S.hl(F, 1.9, 3.2);
    S.hl(F, 5.4, 5.7); S.dot(lift, 5.6, 6.2); S.hl(P, 6.2, 7.1);
    S.vis(xm, 6.2); S.cls(down, 'mute', 0);
    S.text(320, 336, '불확실할 때는 비싼 쪽으로 기운다 · 전형적 호출 약 500토큰, ≈ $0.00002, 280~610ms (글쓴이 측정)', { fs: 11.5, cls: 'sub', maxw: 610 });
  }
});

/* s08 · 장표 16 */
scene({
  sec: 'eng', page: 16, kind: '기법 3', title: '로그 분류 크론', dur: 7.8,
  cap: '로그 600건을 템플릿 7개로 묶고 Jev로 분류한다. 6개는 확신도 0.99 이상으로 자동 분류되고, 0.50이 나온 1개만 Claude Code로 넘어가 루브릭에 새 분류가 더해진다. 수치는 모두 AI Builder Club 글쓴이의 측정이다.',
  build(S) {
    S.cue([1.6, 3.2, 5.0, 7.2]);
    S.text(80, 22, '로그 600건', { fs: 12.5, fw: 800 });
    const grid = S.group('');
    for (let r = 0; r < 12; r++) for (let c = 0; c < 15; c++) S.rect(14 + c * 9, 34 + r * 9, 7, 7, 'cell f', grid);
    const tpl = S.cells(200, 70, 7, 22, 6, '');
    S.text(296, 58, '템플릿 7개 · 중복 제거', { fs: 12, fw: 700 });
    const shrink = S.wire([[150, 88], [196, 81]]);
    tpl.forEach((c, i) => S.vis(c, 0.9 + i * 0.08));
    const J = S.box(220, 140, 152, 56, 'Jev', { sub: '8회 · 7,014토큰 · 중앙값 302ms', fs: 15, cls: 'solid' });
    const toJ = S.wire([[296, 98], [296, 140]]);
    S.dot(shrink, 0.4, 0.9);
    S.dot(toJ, 1.6, 2.0); S.hl(J, 2.0, 3.0);
    tpl.forEach((c, i) => { if (i < 6) S.cls(c, 'f', 2.7); else S.cls(c, 'a', 2.7); });
    const auto = S.box(14, 236, 200, 46, '6개 자동 분류', { sub: '확신도 0.99~1.00', fs: 14 });
    const hard = S.box(240, 236, 120, 46, '1개 이관', { sub: '확신도 0.50', fs: 14, cls: 'tagb' });
    const wa = S.wire([[260, 196], [114, 236]]), wh = S.wire([[300, 196], [300, 236]]);
    S.dot(wa, 2.9, 3.3); S.vis(auto, 3.3); S.dot(wh, 2.9, 3.3); S.vis(hard, 3.3);
    const CC = S.box(420, 140, 200, 56, 'Claude Code', { sub: '새 분류를 루브릭에 추가', fs: 15 });
    const wc = S.hv(hard.r, [420, 168], { mx: 392 });
    S.dot(wc, 3.6, 4.2); S.hl(CC, 4.2, 5.0);
    const rb = S.box(420, 236, 200, 46, 'rubric.json  +1 항목', { fs: 13.5, mono: true, cls: 'thin' });
    const wr = S.wire([CC.b, rb.t]); S.dot(wr, 4.8, 5.1); S.vis(rb, 5.1); S.hl(rb, 5.1, 5.9);
    S.text(14, 310, '비용', { fs: 12, fw: 800, anchor: 'start' });
    S.rect(60, 302, 460, 14, 'track'); S.bar(60, 302, 2, 14, 5.3, 5.6);
    S.vis(S.text(70, 309, 'Jev 한 주기 $0.000295', { fs: 11.5, fw: 700, anchor: 'start' }), 5.6);
    S.rect(60, 324, 460, 14, 'track'); S.bar(60, 324, 460, 14, 5.6, 6.6, { cls: 'acc' });
    S.vis(S.text(528, 331, '$0.0834', { fs: 11.5, fw: 800, anchor: 'start' }), 6.6);
    S.vis(S.text(290, 352, 'Claude Code 1회 = 같은 주기 Jev 비용의 약 283배 · 10.4초', { fs: 12, fw: 800, cls: 'acc' }), 6.7);
  }
});

/* s09 · 장표 20 */
scene({
  sec: 'eng', page: 20, kind: '그림 4', title: '3층 검증', dur: 7.4,
  cap: '1층 결정적 검사가 명백한 실패를 먼저 거르고, 2층 결정 모델이 확신이 높은 경우만 승인·거부한다. 남은 불확실한 경우만 3층 독립 LLM이 검토하고, 검증된 결론만 기억에 저장된다. 개수는 예시다.',
  build(S) {
    S.cue([1.6, 3.3, 5.0, 6.6]);
    const st = [['결과 후보', '에이전트의 답·행동', ''], ['1층 결정적 검사', '모델 호출 없음', ''], ['2층 결정 모델', '확신 높은 것만', 'solid'], ['3층 독립 LLM', '불확실한 것만', 'tagb'], ['기억 저장', '검증된 결론만', '']];
    const xs = [10, 136, 262, 388, 514];
    const B = st.map((s, i) => S.box(xs[i], 60, 116, 56, s[0], { sub: s[1], fs: 13, cls: s[2] }));
    const W = []; for (let i = 0; i < 4; i++) W.push(S.wire([B[i].r, B[i + 1].l]));
    const counts = [['후보 10개', 0.2], ['3개 거부 · 7개 통과', 1.7], ['5개 확정 · 2개 남음', 3.4], ['2개 검토 → 1개 승인', 5.1], ['승인된 것만 저장', 6.7]];
    counts.forEach((c, i) => S.vis(S.text(xs[i] + 58, 136, c[0], { fs: 11.5, fw: 800, cls: i ? 'acc' : '', maxw: 120 }), c[1]));
    const n0 = 10, row = (y, n, cls) => S.cells(320 - n * 13, y, n, 20, 6, cls);
    const r0 = row(176, 10, 'f'); r0.forEach(c => S.vis(c, 0.2));
    const r1 = row(176, 10, ''); r1.forEach((c, i) => { S.cls(c, i < 3 ? 'd' : 'f', 1.7); S.vis(c, 1.7); });
    r0.forEach(c => S.cls(c, 'd', 1.7));
    S.hl(B[0], 0.2, 1.0); S.dot(W[0], 0.9, 1.4); S.hl(B[1], 1.3, 2.0);
    S.dot(W[1], 2.6, 3.1); S.hl(B[2], 3.0, 3.8); S.dot(W[2], 4.3, 4.8); S.hl(B[3], 4.7, 5.6); S.dot(W[3], 6.0, 6.5); S.hl(B[4], 6.4, 7.2);
    const r2 = row(222, 7, ''); r2.forEach((c, i) => { S.vis(c, 3.4); S.cls(c, i < 5 ? 'f' : 'a', 3.4); });
    const r3 = row(268, 2, 'a'); r3.forEach(c => S.vis(c, 5.1));
    S.text(14, 186, '1층 뒤', { fs: 11, cls: 'sub', anchor: 'start' }); S.text(14, 232, '2층 뒤', { fs: 11, cls: 'sub', anchor: 'start' }); S.text(14, 278, '3층으로', { fs: 11, cls: 'sub', anchor: 'start' });
    S.text(320, 334, '"Jev does not replace permissions, deterministic checks, or human approval." (Daily Dose of DS)', { fs: 11.5, cls: 'sub', maxw: 610 });
  }
});

/* s10 · 장표 28 */
scene({
  sec: 'limits', page: 28, kind: '그림 6', title: '말한 확신도와 실제 정확도', dur: 6.4,
  cap: 'Anthus의 독립 시험(감성 분류 8,801개, jev-1.13.0)이다. 최상위 확신 구간에서 말한 평균 확신도는 99.4%였지만 실제 정확도는 90.2%, Choice 답 전체는 91.4%와 76.1%였다. 확신도가 높을수록 더 맞는다는 순서는 유지되었다.',
  build(S) {
    S.cue([2.3, 4.4, 5.8]);
    const X0 = 190, W = 400, sx = v => X0 + W * v / 100;
    [0, 25, 50, 75, 100].forEach(v => { S.line(sx(v), 50, sx(v), 300, 'base'); S.text(sx(v), 316, v + '%', { fs: 11, cls: 'sub' }); });
    const G = [['최상위 확신 구간', '5,559개 · 약 63%', 99.4, 90.2, 70, 0.3], ['Choice 답 전체', '', 91.4, 76.1, 180, 2.4]];
    G.forEach(g => {
      const [nm, sub, a, b, y, t] = g;
      S.text(14, y + 22, nm, { fs: 13.5, fw: 800, anchor: 'start' });
      if (sub) S.text(14, y + 40, sub, { fs: 11, cls: 'sub', anchor: 'start' });
      S.text(X0 - 8, y + 10, '말한 확신도', { fs: 11, anchor: 'end', cls: 'sub' });
      S.text(X0 - 8, y + 44, '실제 정확도', { fs: 11, anchor: 'end', cls: 'sub' });
      S.bar(X0, y, W * a / 100, 22, t, t + 0.9);
      S.bar(X0, y + 34, W * b / 100, 22, t + 0.6, t + 1.5, { cls: 'acc' });
      const ta = S.text(sx(a) - 6, y + 11, '', { fs: 12, fw: 800, anchor: 'end', cls: 'wht' });
      const tb = S.text(sx(b) - 6, y + 45, '', { fs: 12, fw: 800, anchor: 'end', cls: 'wht' });
      S.num(ta, 0, a, t, t + 0.9, v => v.toFixed(1)); S.num(tb, 0, b, t + 0.6, t + 1.5, v => v.toFixed(1));
      const gap = S.text(sx(a) + 8, y + 45, '−' + (a - b).toFixed(1) + '%p', { fs: 13, fw: 800, cls: 'acc', anchor: 'start' });
      S.vis(gap, t + 1.6);
    });
    S.vis(S.text(320, 340, '확신도는 순위로는 쓸 만하지만, 값 그대로 "99% 맞는다"로 읽으면 안 된다', { fs: 12.5, fw: 800 }), 4.6);
  }
});
