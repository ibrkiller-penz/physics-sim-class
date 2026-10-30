/* =====================================================================
   볼록렌즈로 상 만들기 (convex-lens) — 교과 설명 데이터 (R7 2차, UI팀3)
   원고: docs/교과설명/convex-lens.md (기획B 2차, 11장 + 정리 모달) · 형식: docs/SIMKIT.md §0R7-2
   불러오는 순서: shared/sim.js → diagram.js → lesson.js(공통) → sim.js → 이 파일
   그림: viewBox 800×450. 광축 = 가로 점선, 렌즈 = D.lens, 세 광선 = D.ray(style 1·2·3) — 실험 화면 광선 ①②③ 과 같은
         기록 색·선 모양 토큰(--color-rec-1~3 · --dash-rec-1~3). 실상 = 실선 화살표, 허상 = 점선 화살표. 색은 CSS 변수만.
   교육과정: [12물리03-02] 결상 공식은 다루지 않음 → 본문은 정성(세 광선·위치 구간·배율 = 거리 비).
            1/s + 1/s′ = 1/f · m = −s′/s 는 8장 '더 보기'(교사 펼침)와 식 팝업 '더 알아보기'에만. 화면·본문에 s′ 기호 없음('상 거리').
   R7 2차: 6장 그림 / 7장 표(4열) 분할 · terms · symbols[].target · now · 오해 4개 try/result · quiz 3(answerIdx)
   ===================================================================== */
(function () {
  'use strict';
  /** 세로 화살표(물체·상). up = 위쪽이 + (SVG y 는 아래가 +). dashed = 허상 */
  function arrowV(D, x, yAxis, hgt, o) {
    o = o || {};
    var tip = yAxis - hgt, dir = hgt >= 0 ? 1 : -1, col = o.color || 'var(--color-ink)', w = o.w || 4;
    return '<line x1="' + x + '" y1="' + yAxis + '" x2="' + x + '" y2="' + (tip + dir * 10) + '" style="stroke:' + col + ';stroke-width:' + w + (o.dashed ? ';stroke-dasharray:7 5' : '') + '"/>' +
      '<path d="M' + (x - 9) + ' ' + (tip + dir * 14) + ' L' + x + ' ' + tip + ' L' + (x + 9) + ' ' + (tip + dir * 14) + (o.dashed ? '' : ' Z') + '" style="' + (o.dashed ? 'fill:none;stroke:' + col + ';stroke-width:2.5' : 'fill:' + col) + '"/>';
  }
  function axis(D, x0, x1, y) { return D.line(x0, y, x1, y, { color: 'muted', w: 1.5, dash: '10 6' }); }
  function fdot(D, x, y, t, below) { return D.dots([[x, y]], { r: 5, color: 'sim' }) + (t ? D.label(x, y + (below ? 24 : -22), t, { anchor: 'middle', size: 20, color: 'sim', weight: 500 }) : ''); }
  var IMG = 'var(--sim)';
  /** R7-3(C5): 광선 + 구간마다 광선 색 작은 V(진행 방향) — 렌즈 위 검은 화살촉 대신 */
  function rayV(D, pts, style, skip) {
    var out = D.ray(pts, { style: style, arrow: false }), c = 'var(--color-rec-' + style + ')';
    for (var i = 1; i < pts.length; i++) {
      if (skip && skip.indexOf(i) >= 0) continue;
      var ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1], L = Math.hypot(bx - ax, by - ay);
      if (L < 60) continue;
      var ux = (bx - ax) / L, uy = (by - ay) / L, mx = ax + (bx - ax) * 0.5, my = ay + (by - ay) * 0.5;
      out += '<path d="M' + (mx - ux * 8 - uy * 6).toFixed(1) + ' ' + (my - uy * 8 + ux * 6).toFixed(1) + ' L' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' L' + (mx - ux * 8 + uy * 6).toFixed(1) + ' ' + (my - uy * 8 - ux * 6).toFixed(1) + '" style="fill:none;stroke:' + c + ';stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"/>';
    }
    return out;
  }
  /** 광선 번호 배지 ①②③ (광선 색 테두리 원 + 숫자) */
  function rayNo(D, x, y, n) {
    return '<g><circle cx="' + x + '" cy="' + y + '" r="13" style="fill:var(--color-paper-raised);stroke:var(--color-rec-' + n + ');stroke-width:2.5"/>' +
      D.label(x, y + 1, String(n), { anchor: 'middle', size: 18, weight: 500, color: 'var(--color-rec-' + n + ')', bg: false }) + '</g>';
  }
  /** 바탕 칩이 있는 라벨(그림 위 선과 겹쳐도 읽히게) — 폭은 글자 수로 어림 */
  function chipLabel(D, x, y, text, o) {
    o = o || {};
    var size = o.size || 18, w = 0;
    String(text).replace(/\$/g, '').split('').forEach(function (ch) { w += /[가-힣]/.test(ch) ? size * 0.98 : size * 0.56; });
    w += 16;
    var x0 = o.anchor === 'middle' ? x - w / 2 : o.anchor === 'end' ? x - w : x - 8;
    return '<rect x="' + x0.toFixed(1) + '" y="' + (y - size * 0.75).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (size * 1.5).toFixed(1) + '" rx="' + (size * 0.75).toFixed(1) + '" style="fill:var(--color-paper-raised);stroke:var(--color-line);stroke-width:1.2"/>' +
      D.label(x, y, text, { anchor: o.anchor, size: size, color: o.color, weight: o.weight, bg: false });
  }
  /* R7-3(C5·C6b): 7장 위치 5칸 — 표 행 [해 보기] 와 그림 띠가 같은 순서·같은 값 */
  var POS = [
    { name: '2F 밖', s: 30, res: ['0.5배', '거꾸로'], h: 1, real: true, tryQ: { preset: null, set: base({}), predict: false } },
    { name: '2F', s: 20, res: ['1배', '거꾸로'], h: 1, real: true, tryQ: { preset: 1 } },
    { name: 'F ~ 2F', s: 15, res: ['2배', '거꾸로'], h: 1, real: true, tryQ: { preset: 2 } },
    { name: 'F', s: 10, res: ['상 없음', ''], h: 0, tryQ: { preset: null, set: base({ s: 10 }), predict: false } },
    { name: 'F 안', s: 5, res: ['2배 바로', '(허상)'], h: 1, tryQ: { preset: 3 } }
  ];
  var selPos = -1;   // 7장에서 고른 행(그림 칸 강조) — 이번 탭 동안만
  function posBand(D) {
    var y = 250, L = 744, x0 = 34, cw = 132, kids = [];
    kids.push(D.line(20, y, 780, y, { color: 'muted', w: 1.5, dash: '10 6' }), D.lens(L, y, 150), D.label(L, y + 100, '렌즈', { anchor: 'middle', size: 18, color: 'sim', weight: 500 }));
    POS.forEach(function (c, i) {
      var cx = x0 + cw * i + cw / 2;
      kids.push('<rect x="' + (x0 + cw * i + 3) + '" y="72" width="' + (cw - 6) + '" height="330" rx="10" style="fill:' + (i === selPos ? 'var(--sim-tint)' : 'var(--color-paper-raised)') + ';stroke:' + (i === selPos ? 'var(--sim)' : 'var(--color-line)') + ';stroke-width:' + (i === selPos ? 2.5 : 1.2) + '"/>');
      kids.push(D.label(cx, 100, c.name, { anchor: 'middle', size: 22, weight: 500, color: 'sim', bg: false }));
      kids.push(D.label(cx, 134, '$s$ = ' + c.s + ' cm', { anchor: 'middle', size: 18, color: 'muted', bg: false }));
      if (c.name === 'F' || c.name === '2F') kids.push(D.dots([[cx, y]], { r: 6, color: 'sim' }));
      kids.push(arrowV(D, cx - (c.name === 'F' || c.name === '2F' ? 0 : 0), y, 46, { w: 3.5 }));
      kids.push(D.label(cx, 318, c.res[0], { anchor: 'middle', size: 20, weight: 500, bg: false }));
      if (c.res[1]) kids.push(D.label(cx, 346, c.res[1], { anchor: 'middle', size: 18, color: 'muted', bg: false }));
    });
    kids.push(D.arrow(120, 428, 560, 428, { kind: 'v', color: 'muted' }), D.label(580, 428, '물체를 렌즈 쪽으로', { size: 18, color: 'muted' }));
    return D.svg(kids, { title: '물체 위치 지도 ($f$ = 10 cm, 물체는 렌즈 왼쪽)', how: '칸 = 물체 위치(멀리 → 가까이) · 아래 글 = 상의 크기와 방향 · F 를 지나면 거꾸로 선 실상이 바로 선 허상으로 바뀌어요' });
  }
  /** 기본 상태(sim.js BASE + 화살표 s 30 · 스크린 15) — 카드 없이 값만 적용하는 해 보기용 */
  function base(extra) {
    var o = { type: 'arrow', s: 30, screenX: 15, h: 4, f: 10, hideF: false, blocker: 'none', screen: true, fan: false, ray1: true, ray2: true, ray3: true }, k;
    for (k in extra) o[k] = extra[k];
    return o;
  }
  /** 물체 위치 세 구간 그림(6장 그림 · 7장 표 옆에 같은 그림) */
  function posSvg(D) {
    var L = 400, f = 50, kids = [];
    var strips = [
      { y: 105, s: 150, name: '2F 밖', res: '작은 실상 (0.5배)' },
      { y: 235, s: 75, name: 'F ~ 2F', res: '큰 실상 (2배)' },
      { y: 365, s: 25, name: 'F 안', res: '큰 허상 (2배)' }
    ];
    kids.push(D.line(20, 170, 780, 170, { color: 'line', w: 1.2 }), D.line(20, 300, 780, 300, { color: 'line', w: 1.2 }));
    strips.forEach(function (st) {
      var y = st.y, ox = L - st.s, h = 30, sp = st.s * f / (st.s - f), m = sp / st.s, ix = L + sp, ih = -h * m;
      kids.push(axis(D, 60, 740, y), D.lens(L, y, 100), fdot(D, L - f, y), fdot(D, L + f, y), fdot(D, L - 2 * f, y), fdot(D, L + 2 * f, y));
      var s1 = h / f, x1 = Math.min(620, L + (h + 62) / s1);
      kids.push(D.ray([[ox, y - h], [L, y - h], [x1, y - h + (x1 - L) * s1]], { style: 1, arrow: false }));
      var s3 = h / st.s, x3 = Math.min(620, L + 62 / s3);
      kids.push(D.ray([[ox, y - h], [L, y], [x3, y + (x3 - L) * s3]], { style: 3, arrow: false }));
      if (sp < 0) kids.push(D.line(L, y - h, ix, y - ih, { color: 'muted', w: 1.8, dash: '5 5' }), D.line(L, y, ix, y - ih, { color: 'muted', w: 1.8, dash: '5 5' }));
      kids.push(arrowV(D, ox, y, h, { w: 3.5 }), arrowV(D, ix, y, ih, { color: IMG, dashed: sp < 0, w: 3.5 }));
      kids.push(D.label(24, y - 40, st.name, { weight: 500, size: 22 }), D.label(780, y - 40, st.res, { anchor: 'end', size: 20, color: 'sim' }));
    });
    return D.svg(kids, { title: '물체 위치 세 구간 (점: 렌즈 양쪽 F·2F)', how: '실선 화살표 = 실상(거꾸로) · 점선 화살표 = 허상(바로) — 물체가 F 쪽으로 다가올수록 상이 멀어지고 커져요' });
  }
  /** '지금 값' — 상 거리(표시용 계산, 실험 계산은 sim.js Phys). 예측 중·f 숨김이면 답을 말하지 않는다 */
  function hush() { return !!(window.SimKit && SimKit.predicting && SimKit.predicting()); }
  function fHidden(p) { return p.hideF && !(window.SimKit && SimKit.isTeacher && SimKit.isTeacher()); }
  function r1(v) { return String(Math.round(v * 10) / 10); }

  SimKit.lesson({
    slug: 'convex-lens',
    title: '볼록렌즈는 어떻게 상을 만들까?',
    standards: [
      { code: '12물리03-02', subj: '물리학', text: '굴절과 볼록렌즈의 상 맺힘' },
      { code: '12전자02-02', subj: '전자기와 양자', text: '(연계) 렌즈를 쓰는 광학 기기' }
    ],
    simple: ['goal', 'terms', 'three-rays', 'real-virtual', 'by-position', 'check'],
    terms: [
      { term: '굴절', sym: '', unit: '', mean: '빛이 다른 물질로 들어갈 때 방향이 꺾이는 현상' },
      { term: '광축', sym: '', unit: '', mean: '렌즈 한가운데를 수직으로 지나는 기준선' },
      { term: '초점', sym: 'F', unit: '(자리)', mean: '광축과 나란히 들어온 빛이 모이는 점 — 렌즈 양쪽에 하나씩' },
      { term: '초점거리', sym: '$f$', unit: 'cm', mean: '렌즈 가운데에서 초점까지의 거리(길이)', where: 'f' },
      { term: '물체 거리', sym: '$s$', unit: 'cm', mean: '렌즈 가운데에서 물체까지의 거리', where: 's' },
      { term: '상 거리', sym: '', unit: 'cm', mean: '렌즈 가운데에서 상까지의 거리', where: 'meter:si' },
      { term: '실상', sym: '', unit: '', mean: '빛이 실제로 모여 생긴 상 — 스크린에 맺히고 거꾸로 서요' },
      { term: '허상', sym: '', unit: '', mean: '퍼지는 빛을 되짚어 보이는 상 — 스크린에 안 맺히고 바로 서요' },
      { term: '배율', sym: '', unit: '배', mean: '{{frac:상 크기|물체 크기}} = {{frac:상 거리|물체 거리}}', where: 'meter:m' }
    ],
    chapters: [
      /* 1장 */
      { id: 'goal', type: 'goal', title: '볼록렌즈는 어떻게 상을 만들까?',
        question: '렌즈를 반쯤 가리면 상도 반쪽만 생길까?',
        body: [
          '돋보기, 카메라, 프로젝터, 우리 눈 속에는 모두 볼록렌즈가 있어요. 볼록렌즈는 빛을 꺾어 한곳에 모아 **상**을 만들어요.',
          '빛의 길(광선)을 그려 상의 위치와 모양을 알아내요(그림의 세 광선은 4장에서).',
          '물체를 가까이 하거나 멀리 할 때 상이 어떻게 달라지는지도 확인해요.'
        ],
        goals: ['굴절과 초점', '세 광선으로 상 찾기', '물체 위치에 따라 달라지는 상'],
        svg: function (D) {
          var y = 225, L = 400, f = 100, ox = 170, oh = 90, ty = y - oh;
          var ix = L + 230 * f / 130, ih = oh * (ix - L) / 230;   // 물체 거리 230 → 상 거리 177, 약 0.77배
          // R7-3(C5): 렌즈 위 검은 화살촉 → 광선 색 작은 V · 광선 번호 ①②③ 은 광선 중간(물체 → 렌즈 구간)
          var r1 = [[ox, ty], [L, ty], [660, ty + (660 - L) * oh / f]], r2 = [[ox, ty], [L, y + ih], [660, y + ih]], r3 = [[ox, ty], [L, y], [660, y + (660 - L) * oh / (L - ox)]];
          return D.svg([
            axis(D, 40, 760, y), D.lens(L, y, 300),
            fdot(D, L - 2 * f, y, '2F', true), fdot(D, L - f, y, 'F', false), fdot(D, L + f, y, 'F', false), fdot(D, L + 2 * f, y, '2F', true),
            rayV(D, r1, 1), rayV(D, r2, 2), rayV(D, r3, 3),
            rayNo(D, 290, ty - 22, 1), rayNo(D, 250, ty + (250 - ox) * (y + ih - ty) / (L - ox) + 26, 2), rayNo(D, 330, ty + (330 - ox) * (y - ty) / (L - ox) - 24, 3),
            arrowV(D, ox, y, oh), arrowV(D, ix, y, -ih, { color: IMG }),
            D.label(ox, ty - 22, '물체', { anchor: 'middle', weight: 500 }), D.label(L, 405, '렌즈', { anchor: 'middle', weight: 500, color: 'sim' }),
            D.label(ix + 14, y - 26, '상', { weight: 500, color: 'sim' }),
            D.label(760, y - 18, '광축', { anchor: 'end', size: 18, color: 'muted' })
          ], { title: '물체 — 렌즈 — 상 (세 광선 ①②③)', how: '물체 꼭대기에서 나온 세 광선이 렌즈를 지나 상의 꼭대기 한 점에 다시 모여요 — 4장에서 이 세 광선을 그려요' });
        },
        teacherNote: '설명 10분 + 실험 20분 + 정리 10분. 오늘의 질문은 실험 ⑤ 와 이어지므로 답을 말하지 않고 남겨 둬요.' },

      /* 2장 */
      { id: 'refraction', type: 'concept', title: '굴절과 볼록렌즈의 모양',
        body: [
          '빛은 공기에서 유리로 들어갈 때 방향이 꺾여요. 이것이 **굴절**이에요.',
          '볼록렌즈는 가운데가 가장자리보다 두꺼워요. 나란히 들어온 빛은 가장자리를 지날수록 더 많이 꺾여 안쪽으로 모여요.',
          '그래서 볼록렌즈는 빛을 모으는 렌즈예요. 빛이 모이는 점이 **초점**이에요.'
        ],
        life: ['물이 담긴 둥근 어항이나 물방울이 글자를 크게 보이게 해요.'],
        svg: function (D) {
          var y = 280, F = 560, kids = [axis(D, 40, 760, y), D.lens(400, y, 300)];
          [-120, -60, 0, 60, 120].forEach(function (d) {
            var ex = 660, ey = y + (ex - 400) * (-d) / (F - 400) + d;
            kids.push(D.line(60, y + d, 400, y + d, { color: 'sim', w: Math.abs(d) > 90 ? 3.5 : 2.5 }));
            kids.push(D.line(400, y + d, ex, ey, { color: 'sim', w: Math.abs(d) > 90 ? 3.5 : 2.5 }));
          });
          kids.push(fdot(D, F, y, 'F', true), D.label(70, y - 145, '나란한 빛 →', { size: 20, color: 'muted' }));
          // 확대 창: 유리 경계에서 꺾임 (법선 점선)
          var cx = 690, cy = 100, r = 62;
          kids.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="fill:var(--color-paper-raised);stroke:var(--color-line-strong);stroke-width:2"/>',
            '<path d="M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + cx + ' ' + (cy + r) + ' Z" style="fill:var(--sim-tint)"/>',
            D.line(cx, cy - r, cx, cy + r, { color: 'ink', w: 2 }), D.line(cx - 56, cy, cx + 56, cy, { color: 'muted', w: 1.5, dash: '5 4' }),
            D.line(cx - 50, cy - 38, cx, cy, { color: 'sim', w: 3 }), D.line(cx, cy, cx + 54, cy + 24, { color: 'sim', w: 3 }),
            D.label(cx - 22, cy + 34, '공기', { anchor: 'middle', size: 17, color: 'muted' }), D.label(cx + 26, cy - 30, '유리', { anchor: 'middle', size: 17, color: 'muted' }),
            D.label(cx - r - 8, cy - 46, '경계 확대', { anchor: 'end', size: 17, color: 'muted' }));
          return D.svg(kids, { title: '나란한 빛이 렌즈를 지나 모여요', how: '가장자리를 지난 빛(굵은 선)일수록 많이 꺾여 모두 초점 F 로 모여요 · 오른쪽 위 = 경계에서 꺾이는 모습 확대' });
        },
        teacherNote: '굴절 법칙(스넬)의 정량식은 쓰지 않아요. 정성만.' },

      /* 3장 */
      { id: 'terms', type: 'concept', title: '용어 정리: 광축, 초점, 초점거리, F와 2F',
        body: [
          '**광축**은 렌즈 한가운데를 수직으로 지나는 기준선이에요. 거리와 높이는 광축을 기준으로 재요.',
          '광축과 나란히 들어온 빛이 모이는 점이 **초점 F** 예요. 렌즈 양쪽에 하나씩 있어요.',
          '렌즈 가운데에서 초점까지의 거리가 **초점거리 $f$** 예요. 렌즈에서 $f$ 의 두 배 거리인 자리가 **2F** 예요.'
        ],
        try: { label: '실험 ① — $f$ 를 숨기고 먼 풍경 상으로 찾기', preset: 0 },
        life: ['돋보기를 햇빛에 비추면 종이 위 한 점이 밝고 뜨거워져요. 그 점이 초점, 렌즈에서 그 점까지가 $f$ 예요.'],
        svg: function (D) {
          var y = 230, L = 400, f = 90;
          return D.svg([
            axis(D, 40, 760, y), D.lens(L, y, 300),
            D.line(60, y - 100, L, y - 100, { color: 'sim', w: 2.5 }), D.line(L, y - 100, L + f, y, { color: 'sim', w: 2.5 }),
            D.line(60, y - 55, L, y - 55, { color: 'sim', w: 2.5 }), D.line(L, y - 55, L + f, y, { color: 'sim', w: 2.5 }),
            fdot(D, L - 2 * f, y, '2F', true), fdot(D, L - f, y, 'F', false), fdot(D, L + f, y, 'F', false), fdot(D, L + 2 * f, y, '2F', true),
            D.dim(L, y + 70, L + f, y + 70, '$f$', { off: 22 }), D.dim(L, y + 120, L + 2 * f, y + 120, '2$f$', { off: 22 }),
            D.line(L, y + 40, L, y + 135, { w: 1.2, dash: '4 4' }),
            D.label(40, y - 18, '광축', { size: 20, color: 'muted' })
          ], { title: '광축 · 초점 F · 초점거리 $f$ · 2F', how: 'F · 2F 는 자리(점), $f$ 와 2$f$ 는 길이(cm)' });
        },
        teacherNote: '소문자 $f$(초점거리, 길이)와 대문자 F(초점, 자리)를 구분해요.' },

      /* 4장 */
      { id: 'three-rays', type: 'diagram', title: '세 광선 그리기 (작도)',
        body: [
          '물체 한 점의 세 광선이 다시 만나는 점이 상이에요. **두 광선만 그어도** 되고 셋째는 확인용이에요.'
        ],
        eq: [{ tex: '광선 ① ② ③ 이 만나는 점 = 상' }],
        symbols: [
          { sym: '①', name: '나란히 → 초점으로', unit: '', target: 'stage:ray1' },
          { sym: '②', name: '초점 지나 → 나란히', unit: '', target: 'stage:ray2' },
          { sym: '③', name: '중심으로 → 곧게', unit: '', target: 'stage:ray3' },
          { sym: '$f$', name: '초점거리 (F 의 자리)', unit: 'cm', target: 'f' }
        ],
        condition: '얇은 렌즈 · 광축 가까이 지나는 광선만 그린 근사예요',
        try: { label: 'Q · W · E 로 광선 끄고 켜기', preset: null, set: base({}), predict: false },
        svg: function (D) {
          var y = 225, L = 400, f = 80, ox = 160, oh = 80, tx = ox, ty = y - oh;
          return D.svg([
            axis(D, 40, 760, y), D.lens(L, y, 280),
            fdot(D, L - 2 * f, y, '2F', true), fdot(D, L - f, y, 'F', true), fdot(D, L + f, y, 'F', false), fdot(D, L + 2 * f, y, '2F', true),
            rayV(D, [[tx, ty], [L, ty], [620, ty + (620 - L) * 1]], 1), rayV(D, [[tx, ty], [L, ty + (L - tx) * 0.5], [620, ty + (L - tx) * 0.5]], 2),
            rayV(D, [[tx, ty], [L, y], [620, y + (620 - L) / 3]], 3),
            arrowV(D, ox, y, oh), arrowV(D, 520, y, -40, { color: IMG }),
            '<circle cx="520" cy="265" r="7" style="fill:none;stroke:var(--color-ink);stroke-width:2.5"/>',
            D.label(ox, ty - 20, '물체', { anchor: 'middle', weight: 500 }),
            D.label(532, 200, '상', { weight: 500, color: 'sim' }),   // R7-3(C5): 상 화살표 위(광축 위 빈 곳)
            D.line(40, 360, 90, 360, { color: 'var(--color-rec-1)', w: 3 }), D.label(100, 360, '① 광축과 나란히 → 초점으로', { size: 19 }),
            '<line x1="40" y1="392" x2="90" y2="392" style="stroke:var(--color-rec-2);stroke-width:3;stroke-dasharray:var(--dash-rec-2)"/>', D.label(100, 392, '② 초점을 지나 → 나란히', { size: 19 }),
            '<line x1="40" y1="424" x2="90" y2="424" style="stroke:var(--color-rec-3);stroke-width:3;stroke-dasharray:var(--dash-rec-3)"/>', D.label(100, 424, '③ 렌즈 중심으로 → 곧게', { size: 19 })
          ], { title: '세 광선으로 상 찾기 (실험 화면 광선 ①②③ 과 같은 색·선 모양)', how: '① 실선 · ② 점선 · ③ 일점쇄선 · 세 광선이 만나는 점(작은 원)이 상의 꼭대기 — 실험 화면에서 Q·W·E 로 하나씩 꺼 봐요' });
        },
        teacherNote: '발문 "광선 ③ 이 꺾이지 않는 이유는?" → 렌즈 한가운데는 양면이 거의 평행이라 얇은 판처럼 방향이 거의 안 바뀌어요(근사).' },

      /* 5장 */
      { id: 'real-virtual', type: 'diagram', title: '실상과 허상',
        body: [
          '빛이 실제로 한 점에 모여 만든 상이 **실상**이에요. 스크린에 비치고, 볼록렌즈가 만든 실상은 위아래·좌우가 뒤집혀 있어요.',
          '**허상**은 빛이 모이지 않고 퍼질 때 생겨요. 퍼지는 빛을 거꾸로 되짚어 만나는 곳에 상이 있는 것처럼 보여요. 스크린에는 맺히지 않고, 렌즈 너머로 들여다봐야 보이며 바로 서 있어요.',
          '물체가 초점보다 바깥에 있으면 실상, 초점 안쪽에 있으면 허상이 생겨요.'
        ],
        try: { label: '실험 ④ 돋보기 — 스크린 놓기(I)로 안 맺힘 확인', preset: 3 },
        life: ['실상: 프로젝터 화면, 카메라 센서와 눈 속 망막에 맺힌 상.', '허상: 돋보기로 보는 큰 글자.'],
        svg: function (D) {
          var a = 135, b = 345, L = 400, f = 60;
          return D.svg([
            D.label(20, 70, '실상', { weight: 500, size: 24 }), D.label(20, 280, '허상', { weight: 500, size: 24 }),
            D.line(20, 240, 780, 240, { color: 'line', w: 1.5 }),
            axis(D, 60, 760, a), D.lens(L, a, 140), fdot(D, L + f, a), fdot(D, L - f, a),
            D.ray([[250, a - 45], [L, a - 45], [560, a - 45 + 160 * 0.75]], { style: 1, arrow: false }),
            D.ray([[250, a - 45], [L, a], [560, a + 48]], { style: 3, arrow: false }),
            arrowV(D, 250, a, 45), arrowV(D, 500, a, -30, { color: IMG }),
            '<rect x="496" y="' + (a - 70) + '" width="8" height="140" style="fill:var(--color-line-strong);opacity:0.55"/>',
            chipLabel(D, 520, a - 55, '스크린에 맺힘 (거꾸로)', { size: 18, color: 'sim' }),
            axis(D, 60, 760, b), D.lens(L, b, 140), fdot(D, L + f, b), fdot(D, L - f, b),
            D.ray([[370, b - 30], [L, b - 30], [560, b - 30 + 160 * 0.5]], { style: 1, arrow: false }),
            D.ray([[370, b - 30], [L, b], [445, b + 45]], { style: 3, arrow: false }),
            D.line(L, b - 30, 340, b - 60, { color: 'muted', w: 2, dash: '5 5' }), D.line(L, b, 340, b - 60, { color: 'muted', w: 2, dash: '5 5' }),
            arrowV(D, 370, b, 30), arrowV(D, 340, b, 60, { color: IMG, dashed: true }),
            D.label(330, b - 78, '허상 (바로 섬·큼)', { anchor: 'end', size: 18, color: 'sim', bg: true }),
            '<path d="M660 ' + (b + 2) + ' q-16 -13 -32 0 q16 13 32 0z" style="fill:var(--color-paper-raised);stroke:var(--color-ink);stroke-width:2.5"/><circle cx="645" cy="' + (b + 2) + '" r="5" style="fill:var(--color-ink)"/>',
            chipLabel(D, 650, b - 30, '여기서 들여다봐요', { anchor: 'middle', size: 18 }),
            chipLabel(D, 600, b + 80, '빛이 안 모여요: 스크린에 안 맺힘', { anchor: 'middle', size: 18, color: 'muted' })
          ], { title: '실상과 허상', how: '위: 빛이 실제로 모임(실선) → 스크린에 맺힘 · 아래: 빛이 퍼짐 → 되짚은 점선이 만나는 곳에 허상(점선 화살표)' });
        } },

      /* 6장 */
      { id: 'by-position', type: 'diagram', title: '물체 위치에 따라 달라지는 상',
        body: [
          '물체를 렌즈에 가까이 가져올수록 상은 렌즈에서 멀어지고 커져요. 멀리 두면 상은 초점 쪽으로 다가오며 작아져요.',
          '초점(F)과 2F 를 경계로 위치를 나누어 살펴봐요. 2F 에 두면 반대쪽 2F 에 같은 크기의 거꾸로 선 실상이 생겨요.',
          '초점에 둔 물체의 빛은 렌즈를 지나 나란히 나가서 상이 생기지 않아요.'
        ],
        try: { label: '실험 ② — 물체를 2F 에', preset: 1 },
        life: ['카메라·눈: 멀리(2F 밖) 있는 물체의 작은 실상.', '프로젝터: 슬라이드를 F 바로 바깥(F~2F)에 두어 크게 확대.', '돋보기: F 안쪽에 대어 큰 허상.'],
        svg: posSvg,
        teacherNote: '칠판에서는 이 그림 → 다음 장 표 순서로 넘겨요. 실험 ②③④ 를 차례로 눌러 표를 채워 봐요.' },

      /* 7장 — R7-3(C5·C6b): 그림 = 위치 5칸 띠(6장 세 구간 그림과 역할 분리) · 표 행마다 [해 보기] (행 전체 누름) */
      { id: 'by-position-table', type: 'concept', title: '위치별 상 한눈에 보기',
        condition: '$f$ = 10 cm 일 때의 예 · 행을 누르면 그 위치로 실험해요',
        table: {
          head: ['물체 위치', '물체 거리 $s$', '상 거리', '상의 모습'],
          rows: [
            ['2F 보다 멀리', '30 cm', '15 cm', '거꾸로 선 실상 · 0.5배'],
            ['2F', '20 cm', '20 cm', '거꾸로 선 실상 · 1배'],
            ['F ~ 2F', '15 cm', '30 cm', '거꾸로 선 실상 · 2배'],
            ['초점 F', '10 cm', '없음', '상이 생기지 않음'],
            ['F 안쪽', '5 cm', '앞쪽 10 cm', '바로 선 허상 · 2배']
          ] },
        svg: posBand,
        teacherNote: '이 표가 오늘의 요약이에요. 수치는 시뮬레이터 값과 같아요(식이 아니라 작도·실험으로 확인). 진행: 행을 위에서 아래로 짚으며 [해 보기]로 물체를 렌즈 쪽으로 밀면 상이 멀어지고 커져요 → F 에서 상이 사라져요 → F 안에서 바로 선 허상으로 바뀌어요. 발문: "어느 줄에서 거꾸로 선 상이 바로 선 상으로 바뀌나요?"(F 를 지날 때)' },

      /* 8장 */
      { id: 'magnify', type: 'formula', title: '배율: 상은 물체의 몇 배일까?',
        body: [
          '**배율**은 상 크기가 물체 크기의 몇 배인지예요. 광선 ③ 이 닮은 삼각형을 만들어서 상 거리와 물체 거리의 비와 같아요({{frac:30 cm|15 cm}} = 2배).'
        ],
        eq: [{ tex: '배율 =', frac: ['상 크기', '물체 크기'] }, { tex: '=', frac: ['상 거리', '물체 거리'] }],   // R7-3(C6b): 쌓은 분수(한글 낱말은 본문 글꼴 .frac__txt)
        symbols: [
          { sym: '$s$', name: '물체 거리', unit: 'cm', target: 's' },
          { sym: '상 거리', name: '렌즈 가운데부터 상까지', unit: 'cm', target: 'meter:si' },
          { sym: '배율', name: '상이 물체의 몇 배인지', unit: '배', target: 'meter:m' }
        ],
        now: function (p) {
          if (fHidden(p)) return '초점거리를 숨긴 실험이에요 — 정리에서 확인해요';
          if (hush()) return '물체 거리 $s$ = ' + p.s + ' cm → ▶ 실행하면 상 거리를 확인해요';
          if (p.s === p.f) return '물체가 초점에 있어요 → 상이 생기지 않아요';
          var si = p.s * p.f / (p.s - p.f), m = Math.abs(si) / p.s;
          if (si < 0) return '초점 안쪽 → 바로 선 허상(앞쪽 ' + r1(-si) + ' cm) · 배율 = {{frac:' + r1(-si) + '|' + p.s + '}} = ' + r1(m) + '배';
          return '배율 = {{frac:상 거리|물체 거리}} = {{frac:' + r1(si) + '|' + p.s + '}} = ' + r1(m) + '배 · 거꾸로';
        },
        life: ['실험 ③ 프로젝터 크게: {{frac:상 거리 30 cm|물체 거리 15 cm}} = 2배. 물체 거리 $s$ 를 바꿔 배율 계기를 읽어 봐요.', '스마트폰 카메라로 가까이 찍을 때 상이 커지는 것.'],
        more: { title: '더 알아보기 — 결상 공식과 부호 (교육과정 밖 심화)',
          body: ['물체 거리 $s$, 상 거리 $s′$, 초점거리 $f$ 사이에는 {{frac:1|$s$}} + {{frac:1|$s′$}} = {{frac:1|$f$}} 가 성립해요. 배율을 $m$ = −{{frac:$s′$|$s$}} 로 쓰면 음수일 때 거꾸로 선 상이에요.',
            '예: $f$ = 10, $s$ = 30 → $s′$ = 15, $m$ = −0.5 · $s$ = 5 → $s′$ = −10(렌즈 앞쪽 허상), $m$ = +2.'],
          eq: [{ tex: '$m$ = −', frac: ['$s′$', '$s$'] }] },
        svg: function (D) {
          // R7-3(C5): 본문 예와 같은 2배 — 물체 거리 130 : 상 거리 260, 물체 높이 50 : 상 높이 100
          var y = 200, L = 400, ox = L - 130, ix = L + 260, oh = 50, ih = 100;
          return D.svg([
            '<path d="M' + ox + ' ' + y + ' L' + ox + ' ' + (y - oh) + ' L' + L + ' ' + y + ' Z" style="fill:var(--sim-tint);stroke:none"/>',
            '<path d="M' + L + ' ' + y + ' L' + ix + ' ' + y + ' L' + ix + ' ' + (y + ih) + ' Z" style="fill:var(--color-warn-tint);stroke:none"/>',
            axis(D, 40, 760, y), D.lens(L, y, 260),
            D.ray([[ox, y - oh], [L, y], [ix, y + ih]], { style: 3, arrow: false }),
            arrowV(D, ox, y, oh), arrowV(D, ix, y, -ih, { color: IMG }),
            D.dim(ox, y + 40, L, y + 40, '물체 거리 15 cm', { off: 22, size: 19 }), D.dim(L, y - 40, ix, y - 40, '상 거리 30 cm (2배)', { off: -22, size: 19 }),
            D.dim(ox - 26, y, ox - 26, y - oh, '', {}), D.label(ox - 40, y - oh / 2, '물체 크기', { anchor: 'end', size: 19 }),
            D.dim(ix + 26, y, ix + 26, y + ih, '', {}), D.label(ix + 40, y + ih / 2, '상 크기', { anchor: 'start', size: 19 }),
            D.label(L, 380, '광선 ③ (렌즈 중심을 곧게)', { anchor: 'middle', size: 19, color: 'muted' })
          ], { title: '닮은 삼각형 두 개', how: '옅은 두 삼각형은 닮은꼴 · 상 거리가 물체 거리의 2배면 상 크기도 물체 크기의 2배예요' });
        },
        teacherNote: '화면 배율은 크기 비(양수)예요. 뒤집힘은 \'거꾸로\' 로 따로 말하고, 부호($m$ < 0)는 더 보기에서만.' },

      /* 9장 */
      { id: 'life', type: 'life', title: '생활 속 볼록렌즈',
        body: [
          '**돋보기**: 물체를 초점 안쪽에 두고 들여다보면 바로 선 큰 허상이 보여요.',
          '**카메라와 눈**: 먼 풍경(2F 밖)의 작고 거꾸로 선 실상을 센서·망막에 맺어요. 눈은 수정체 두께를 조절해 초점을 맞추고, 뇌가 다시 바로 세워 인식해요.',
          '**프로젝터**: 슬라이드를 렌즈의 F 바로 바깥에 두면 멀리 있는 스크린에 크게 확대된 실상이 생겨요.',
          '**반도체 공정(포토리소그래피)**: 큰 회로 그림(마스크)을 2F 보다 멀리 두어 웨이퍼 위에 작게 줄여 새겨요.'
        ],
        svg: function (D) {
          var cards = [
            { t: '돋보기', s: 0.6, kind: '바로 선 큰 허상' },
            { t: '카메라 · 눈', s: 3, kind: '작은 실상' },
            { t: '프로젝터', s: 1.4, kind: '큰 실상' },
            { t: '반도체 공정', s: 2.6, kind: '줄인(축소) 실상' }
          ], kids = [];
          cards.forEach(function (c, i) {
            var x0 = 20 + i * 192, w = 180, cy = 230, L = x0 + 112, f = 26;
            kids.push('<rect x="' + x0 + '" y="70" width="' + w + '" height="330" rx="12" style="fill:var(--color-paper-raised);stroke:var(--color-line-strong);stroke-width:1.5"/>');
            kids.push(D.label(x0 + w / 2, 104, c.t, { anchor: 'middle', weight: 500 }));
            kids.push(D.line(x0 + 10, cy, x0 + w - 10, cy, { color: 'muted', w: 1.2, dash: '6 4' }), D.lens(L, cy, 110));
            kids.push(D.dots([[L - f, cy], [L - 2 * f, cy], [L + f, cy]], { r: 3.5, color: 'sim' }));
            kids.push(arrowV(D, Math.max(x0 + 14, L - c.s * f), cy, 28, { w: 3 }));
            kids.push(D.label(L - f, cy + 22, 'F', { anchor: 'middle', size: 16, color: 'sim' }), D.label(L - 2 * f, cy + 22, '2F', { anchor: 'middle', size: 16, color: 'sim' }));
            kids.push(D.label(x0 + w / 2, 352, c.kind, { anchor: 'middle', size: 18, color: 'sim' }));
          });
          return D.svg(kids, { title: '물체를 어디에 두나 (F·2F 기준)', how: '돋보기는 F 안, 프로젝터는 F~2F, 카메라·눈과 반도체 공정은 2F 밖' });
        },
        teacherNote: '시간이 부족하면 건너뛰고 7장 표의 생활 예로 대신해요. 반도체 공정은 [12물리03-02] 의 소개 소재이고 [12전자02-02] 와 이어져요(정성).' },

      /* 10장 */
      { id: 'misc', type: 'misconception', title: '흔한 오해 4가지',
        items: [
          { id: 'half-lens', claim: '"렌즈 반쪽을 가리면 상도 반쪽만 생겨요."', chapter: 'three-rays',
            why: '한 점의 빛은 렌즈 어디를 지나도 같은 점에 모여요. 남은 절반으로도 상 전체가 생겨요.',
            try: { preset: 4 }, result: '상 전체가 생기고 밝기만 줄어요.' },
          { id: 'no-screen', claim: '"스크린을 치우면 상도 사라져요."', chapter: 'real-virtual',
            why: '실상은 빛이 실제로 모이는 자리에 생겨요. 스크린은 그 빛을 받아 보이게 할 뿐이에요.',
            try: { preset: null, set: base({ screen: false }), predict: false }, result: '스크린이 없어도 광선은 15 cm 자리에서 만나요.' },
          { id: 'at-focus', claim: '"물체를 초점에 두면 상이 가장 커요."', chapter: 'by-position',
            why: '초점에서 나온 빛은 렌즈를 지나 나란히 나가 만나지 않아요. 가장 큰 상은 초점 바로 바깥에서.',
            try: { preset: null, set: base({ s: 10 }), predict: false }, result: '$s$ = $f$ = 10 cm — 상이 생기지 않아요.' },
          { id: 'virtual-fake', claim: '"허상은 가짜라서 볼 수 없어요."', chapter: 'real-virtual',
            why: '돋보기 속 큰 글자가 허상이에요. 눈으로 보이고, 스크린에만 맺히지 않아요.',
            try: { preset: 3 }, result: '돋보기 창에 바로 선 큰 상이 보여요.' }
        ] },

      /* 11장 */
      { id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        questions: [
          { q: '먼 풍경의 상은 렌즈에서 얼마나 떨어진 곳에 생길까? 초점거리 $f$ 를 어떻게 알아낼까?', preset: 0, chapter: 'terms' },
          { q: '물체를 2F 에 두면 상은 어디에, 어떤 크기로?', preset: 1, chapter: 'by-position' },
          { q: '물체가 2F 보다 멀면(기본 상태) 상은?', preset: null, set: base({}), predict: false, chapter: 'by-position-table' },
          { q: '프로젝터 화면을 크게 하려면 슬라이드를 어디로?', preset: 2, chapter: 'magnify' },
          { q: '물체를 초점 안쪽에 두고 들여다보면?', preset: 3, chapter: 'real-virtual' },
          { q: '물체를 초점 바로 위에 두면 상은?', preset: null, set: base({ s: 10 }), predict: false, chapter: 'by-position-table' },
          { q: '렌즈 위쪽 절반을 가리면 상은 어떻게 될까?', preset: 4, chapter: 'misc' }
        ],
        teacherNote: '한 질문에 해 보기 하나. 4장은 기본 상태에서 Q·W·E 로 광선을 하나씩 꺼 보고, 5장은 실험 ④ + 스크린 놓기(I) 로 확인해요. 실험 ① 은 $f$ 를 숨기므로 정리 단계에서 답을 공개해요.' },

      /* 정리 모달 전용 (설명 순서에서는 빠진다) */
      { id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: ['물체를 렌즈 쪽으로 옮기면 상은 멀어지고 커져요. 2F 에 두면 같은 크기, 초점 안쪽은 스크린에 안 맺히는 바로 선 허상이에요. 렌즈를 가려도 상은 그대로이고 어두워질 뿐이에요.',
          '자기 평가: 잘 이해했어요 / 조금 헷갈려요 / 다시 보고 싶어요 — 다시 보고 싶으면 문항의 설명 장으로 돌아가요.'],
        quiz: [
          { kind: 'concept', q: '$f$ = 10 cm 인 볼록렌즈 앞 20 cm(2F)에 물체를 두었어요. 상은 어디에, 어떤 크기로 생길까?',
            choices: ['렌즈 뒤 10 cm, 물체보다 작게', '렌즈 뒤 20 cm, 물체와 같은 크기', '렌즈 뒤 40 cm, 물체보다 크게'], answerIdx: 1,
            why: '2F 에 둔 물체의 빛은 반대쪽 2F(20 cm)에 모여요. 물체 거리와 상 거리가 같아 배율 1배, 거꾸로 선 실상이에요.', chapter: 'by-position', try: { preset: 1 } },
          { kind: 'calc', q: '$f$ = 10 cm 렌즈에서 물체 거리 12 cm 의 물체가 렌즈 뒤 60 cm 에 상을 만들어요. 배율은?',
            choices: ['0.2배', '5배', '48배'], answerIdx: 1,
            why: '배율 = {{frac:상 거리|물체 거리}} = {{frac:60|12}} = 5배. 초점 바로 바깥이라 거꾸로 선 큰 실상이에요.', chapter: 'magnify', try: { preset: null, set: base({ s: 12, screenX: 60 }), predict: false } },
          { kind: 'misconception', q: '"렌즈 위쪽 절반을 종이로 가리면 상의 위쪽 절반이 사라진다." 맞을까?',
            choices: ['맞다. 위쪽 절반이 사라진다', '아니다. 상 전체가 생기고 어두워진다', '아니다. 상이 아예 사라진다'], answerIdx: 1,
            why: '남은 절반을 지난 빛도 같은 점에 모여 상 전체가 생겨요. 줄어드는 것은 밝기뿐이에요.', chapter: 'misc', try: { preset: 4 } }
        ],
        more: [
          { q: '물체를 초점 안쪽에 두었는데 스크린에 상이 안 보여요. 고장일까?', answer: '아니다 — 허상이라서', why: '허상은 빛이 모이지 않아 스크린에 맺히지 않아요. 렌즈 너머로 들여다보면 보여요.', chapter: 'real-virtual' },
          { q: '$f$ 를 20 cm 로 바꾸고 물체를 2F 에 두면 상 거리는?', answer: '40 cm, 같은 크기', why: '2F = 2$f$ = 40 cm 자리에 둔 물체는 반대쪽 40 cm 에 1배 실상을 만들어요.', chapter: 'by-position' }
        ] }
    ],
    links: { terms: 'terms', 'three-rays': 'three-rays', 'real-virtual': 'real-virtual', 'by-position': 'by-position', magnify: 'magnify', misc: 'misc' }
  });

  /* R7-3(C6b): 7장 표 행마다 [해 보기] — 공통 표(tableBox)에 행 동작이 없어 이 sim 에서만 붙인다(shared 요청: table.rows[].try).
     표가 그려질 때(설명 층 다시 그리기) 첫 칸을 단추로 바꾸고 행 전체를 누를 수 있게. 고른 행은 강조, 그림 칸도 같은 번호 강조 */
  function decorateTable(tb) {
    if (!tb || tb.getAttribute('data-rowtry')) return;
    var head = tb.querySelector('thead th');
    if (!head || head.textContent.replace(/\s/g, '') !== '물체위치') return;
    tb.setAttribute('data-rowtry', '1');
    [].forEach.call(tb.querySelectorAll('tbody tr'), function (tr, i) {
      var c = POS[i]; if (!c) return;
      var th = tr.querySelector('th'); if (!th) return;
      var txt = th.textContent;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'cl-rowtry';
      b.setAttribute('aria-label', '해 보기: 물체를 ' + txt + '(' + c.s + ' cm)에 두기');
      b.appendChild(document.createTextNode(txt));
      var ic = SimKit.icon && SimKit.icon('chev-right', { cls: 'ico--trail' }); if (ic) b.appendChild(ic);
      th.textContent = ''; th.appendChild(b);
      tr.classList.add('cl-row'); tr.classList.toggle('is-sel', i === selPos);
      if (i === selPos) tr.setAttribute('aria-current', 'true');
      function go() {
        selPos = i;
        var q = {}, k; for (k in c.tryQ) q[k] = c.tryQ[k];
        q.chapter = 'by-position-table';
        SimKit.lessonTry(q);
      }
      b.addEventListener('click', function (e) { e.stopPropagation(); go(); });
      tr.addEventListener('click', go);
    });
  }
  function watchTable() {
    var root = document.querySelector('section.lesson');
    if (!root) return false;
    new MutationObserver(function () { if (!root.hidden) decorateTable(root.querySelector('.lesson__table:not([data-rowtry])')); }).observe(root, { childList: true, subtree: true });
    decorateTable(root.querySelector('.lesson__table'));
    return true;
  }
  if (!watchTable()) {   // 설명 층이 아직 없으면 body 에 붙을 때까지 기다린다
    var wb = new MutationObserver(function () { if (watchTable()) wb.disconnect(); });
    wb.observe(document.body || document.documentElement, { childList: true });
  }
})();
