/* =====================================================================
   볼록렌즈로 상 만들기 (convex-lens) — 교과 설명 데이터 (R7 1차, UI팀3)
   원고: docs/교과설명/convex-lens.md (11장 + 심화, 심플 1·3·4·5·6·10) · 형식: docs/SIMKIT.md §0R7-6
   불러오는 순서: shared/sim.js → diagram.js → lesson.js(공통) → sim.js → 이 파일
   그림: viewBox 800×450. 광축 = 가로 점선, 렌즈 = D.lens, 세 광선 = D.ray(style 1·2·3) — 실험 화면 광선 ①②③ 과 같은
         기록 색·선 모양 토큰(--color-rec-1~3 · --dash-rec-1~3). 실상 = 실선 화살표, 허상 = 점선 화살표. 색은 CSS 변수만.
   교육과정: [12물리03-02] 결상 공식은 다루지 않음 → 본문은 정성(세 광선·위치 구간·배율 = 크기 비),
            1/s + 1/s′ = 1/f · 부호 · m = −s′/s 는 6·7장 '더 알아보기' 접힘에만(교사 모드는 펼침 기본).
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
  function fdot(D, x, y, t, below) { return D.dots([[x, y]], { r: 5, color: 'sim' }) + (t ? D.label(x, y + (below ? 24 : -22), t, { anchor: 'middle', size: 20, color: 'sim', weight: 500, bg: true }) : ''); }
  var IMG = 'var(--sim)';

  SimKit.lesson({
    slug: 'convex-lens',
    title: '볼록렌즈는 어떻게 상을 만들까?',
    standards: [
      { code: '12물리03-02', subj: '물리학', text: '굴절과 볼록렌즈의 상 맺힘' },
      { code: '12전자02-02', subj: '전자기와 양자', text: '(연계) 렌즈를 쓰는 광학 기기' }
    ],
    simple: ['goal', 'terms', 'three-rays', 'real-virtual', 'by-position', 'check'],
    chapters: [
      /* 1장 */
      { id: 'goal', type: 'goal', title: '볼록렌즈는 어떻게 상을 만들까?',
        question: '렌즈를 반쯤 가리면 상도 반쪽만 생길까?',
        body: [
          '돋보기, 카메라, 프로젝터, 우리 눈 속에는 모두 볼록렌즈가 있어요. 볼록렌즈는 빛을 꺾어 한 곳에 모아 **상**을 만들어요.',
          '빛의 길(광선)을 그려 상이 어디에, 어떤 모양으로 생기는지 알아내고, 물체를 가까이·멀리 할 때 상이 어떻게 달라지는지 확인해요.'
        ],
        goals: ['굴절 → 초점·광축', '세 광선으로 상 찾기', '실상과 허상 구별하기', '물체 위치에 따른 상의 변화'],
        svg: function (D) {
          var y = 225;
          return D.svg([
            axis(D, 40, 760, y), D.lens(400, y, 300),
            arrowV(D, 170, y, 90), arrowV(D, 560, y, -62, { color: IMG }),
            D.line(170, y - 90, 400, 80, { color: 'muted', w: 1.8 }), D.line(400, 80, 560, y + 62, { color: 'muted', w: 1.8 }),
            D.line(170, y - 90, 400, 370, { color: 'muted', w: 1.8 }), D.line(400, 370, 560, y + 62, { color: 'muted', w: 1.8 }),
            D.line(170, y - 90, 560, y + 62, { color: 'muted', w: 1.8 }),
            D.label(170, y + 30, '물체', { anchor: 'middle', weight: 500 }), D.label(400, 410, '렌즈', { anchor: 'middle', weight: 500, color: 'sim' }),
            D.label(560, y - 28, '상', { anchor: 'middle', weight: 500, color: 'sim' }), D.label(760, y - 18, '광축', { anchor: 'end', size: 18, color: 'muted' })
          ], { title: '물체 — 렌즈 — 상', how: '물체 꼭대기에서 나온 빛이 렌즈를 지나 한 점(상의 꼭대기)에 다시 모여요' });
        },
        teacherNote: '설명 10분 + 실험 20분 + 정리 10분. 오늘의 질문은 마지막 카드 ⑤ 와 이어지므로 답을 말하지 않고 남겨 둬요.' },

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
        symbols: [{ sym: '$f$', name: '초점거리', unit: 'cm' }, { sym: 'F', name: '초점(자리)', unit: '–' }, { sym: '2F', name: '렌즈에서 2$f$ 만큼 떨어진 자리', unit: '–' }, { sym: '$s$', name: '물체 거리', unit: 'cm' }],
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
          ], { title: '광축 · 초점 F · 초점거리 $f$ · 2F', how: 'F·2F 는 자리(점), $f$·2$f$ 는 길이(cm) — 라벨이 겹치지 않게 F 는 위, 2F 는 아래' });
        },
        teacherNote: '소문자 $f$(초점거리, 길이)와 대문자 F(초점, 자리)를 구분해요.' },

      /* 4장 */
      { id: 'three-rays', type: 'diagram', title: '세 광선 그리기 (작도)',
        body: [
          '물체 한 점에서 나온 빛은 사방으로 퍼져 렌즈 전체를 지나요. 그중 그리기 쉬운 세 광선만 골라 상의 위치를 찾아요.',
          '① 광축과 나란히 온 광선은 렌즈를 지나 초점으로 가요. ② 앞쪽 초점을 지나 온 광선은 렌즈를 지나 광축과 나란히 나가요. ③ 렌즈 한가운데로 간 광선은 꺾이지 않고 곧게 가요.',
          '세 광선이 다시 만나는 점이 상의 한 점이에요. **두 광선만 그어도** 만나는 점은 같고, 셋째는 맞게 그렸는지 확인하는 데 써요.'
        ],
        life: ['카메라가 먼 풍경을 센서 한 곳에 작게 모으는 것도 같은 규칙이에요.'],
        svg: function (D) {
          var y = 225, L = 400, f = 80, ox = 160, oh = 80, tx = ox, ty = y - oh;
          return D.svg([
            axis(D, 40, 760, y), D.lens(L, y, 280),
            fdot(D, L - 2 * f, y, '2F', true), fdot(D, L - f, y, 'F', true), fdot(D, L + f, y, 'F', false), fdot(D, L + 2 * f, y, '2F', true),
            D.ray([[tx, ty], [L, ty], [620, ty + (620 - L) * 1]], { style: 1 }),
            D.ray([[tx, ty], [L, ty + (L - tx) * 0.5], [620, ty + (L - tx) * 0.5]], { style: 2 }),
            D.ray([[tx, ty], [L, y], [620, y + (620 - L) / 3]], { style: 3 }),
            arrowV(D, ox, y, oh), arrowV(D, 520, y, -40, { color: IMG }),
            '<circle cx="520" cy="265" r="7" style="fill:none;stroke:var(--color-ink);stroke-width:2.5"/>',
            D.label(ox, ty - 20, '물체', { anchor: 'middle', weight: 500 }), D.label(532, 238, '상', { weight: 500, color: 'sim', bg: true }),
            D.line(40, 360, 90, 360, { color: 'var(--color-rec-1)', w: 3 }), D.label(100, 360, '① 광축과 나란히 → 초점으로', { size: 19 }),
            '<line x1="40" y1="392" x2="90" y2="392" style="stroke:var(--color-rec-2);stroke-width:3;stroke-dasharray:var(--dash-rec-2)"/>', D.label(100, 392, '② 초점을 지나 → 나란히', { size: 19 }),
            '<line x1="40" y1="424" x2="90" y2="424" style="stroke:var(--color-rec-3);stroke-width:3;stroke-dasharray:var(--dash-rec-3)"/>', D.label(100, 424, '③ 렌즈 중심으로 → 곧게', { size: 19 })
          ], { title: '세 광선으로 상 찾기 (실험 화면 광선 ①②③ 과 같은 색·선 모양)', how: '세 광선이 만나는 점(작은 원)이 상의 꼭대기 — 실험 화면에서 Q·W·E 로 하나씩 꺼 봐요' });
        },
        teacherNote: '발문 "광선 ③ 이 꺾이지 않는 이유는?" → 렌즈 한가운데는 양면이 거의 평행이라 얇은 판처럼 방향이 거의 안 바뀌어요(근사).' },

      /* 5장 */
      { id: 'real-virtual', type: 'diagram', title: '실상과 허상',
        body: [
          '빛이 실제로 한 점에 모여 만든 상이 **실상**이에요. 스크린에 비치고, 볼록렌즈가 만든 실상은 위아래·좌우가 뒤집혀 있어요.',
          '**허상**은 빛이 모이지 않고 퍼질 때 생겨요. 퍼지는 빛을 거꾸로 되짚어 만나는 곳에 상이 있는 것처럼 보여요. 스크린에는 맺히지 않고, 렌즈 너머로 들여다봐야 보이며 바로 서 있어요.',
          '물체가 초점보다 바깥에 있으면 실상, 초점 안쪽에 있으면 허상이 생겨요.'
        ],
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
            D.label(515, a - 55, '스크린에 맺힘 (거꾸로)', { size: 18, color: 'sim', bg: true }),
            axis(D, 60, 760, b), D.lens(L, b, 140), fdot(D, L + f, b), fdot(D, L - f, b),
            D.ray([[370, b - 30], [L, b - 30], [560, b - 30 + 160 * 0.5]], { style: 1, arrow: false }),
            D.ray([[370, b - 30], [L, b], [445, b + 45]], { style: 3, arrow: false }),
            D.line(L, b - 30, 340, b - 60, { color: 'muted', w: 2, dash: '5 5' }), D.line(L, b, 340, b - 60, { color: 'muted', w: 2, dash: '5 5' }),
            arrowV(D, 370, b, 30), arrowV(D, 340, b, 60, { color: IMG, dashed: true }),
            D.label(330, b - 78, '허상 (바로 섬·큼)', { anchor: 'end', size: 18, color: 'sim', bg: true }),
            '<path d="M660 ' + (b + 2) + ' q-16 -13 -32 0 q16 13 32 0z" style="fill:var(--color-paper-raised);stroke:var(--color-ink);stroke-width:2.5"/><circle cx="645" cy="' + (b + 2) + '" r="5" style="fill:var(--color-ink)"/>',
            D.label(650, b - 26, '여기서 들여다봐요', { anchor: 'middle', size: 18 }),
            D.label(560, b + 80, '빛이 안 모여요: 스크린에 안 맺힘', { anchor: 'middle', size: 18, color: 'muted' })
          ], { title: '실상과 허상', how: '위: 빛이 실제로 모임(실선) → 스크린에 맺힘 · 아래: 빛이 퍼짐 → 되짚은 점선이 만나는 곳에 허상(점선 화살표)' });
        } },

      /* 6장 */
      { id: 'by-position', type: 'diagram', title: '물체 위치에 따라 달라지는 상',
        body: [
          '물체를 렌즈에 가까이 가져올수록 상은 렌즈에서 멀어지고 커져요. 멀리 두면 상은 초점 쪽으로 다가오며 작아져요.',
          '물체를 **2F** 에 두면 반대쪽 2F 에 같은 크기(1배)의 거꾸로 선 실상이 생겨요. **초점**에 두면 빛이 나란히 나가 상이 생기지 않아요.',
          '물체 위치를 초점(F)과 2F 를 경계로 나누어 정리해요. 표의 값은 시뮬레이터에서 직접 확인해요.'
        ],
        table: { caption: '$f$ = 10 cm 일 때',
          head: ['물체 위치', '예($s$)', '상의 위치', '크기', '방향', '종류'],
          rows: [
            ['2F 보다 멀리', '30 cm', 'F~2F 사이(15 cm)', '작음(0.5배)', '거꾸로', '실상'],
            ['2F', '20 cm', '2F(20 cm)', '같음(1배)', '거꾸로', '실상'],
            ['F 와 2F 사이', '15 cm', '2F 보다 멀리(30 cm)', '큼(2배)', '거꾸로', '실상'],
            ['초점 F', '10 cm', '생기지 않음', '—', '—', '—'],
            ['F 안쪽', '5 cm', '렌즈 앞쪽(10 cm)', '큼(2배)', '바로', '허상(스크린 안 맺힘)']
          ] },
        condition: '$f$ = 10 cm 기준 · 값은 시뮬레이터 카드 ②·③·④와 해 보기로 확인해요',
        life: ['카메라·눈: 멀리(2F 밖) 있는 물체의 작은 실상.', '프로젝터: 슬라이드를 F 바로 바깥(F~2F)에 두어 크게 확대.', '돋보기: F 안쪽에 대어 큰 허상.'],
        more: { title: '더 알아보기 — 결상 공식 (교육과정 밖 심화)',
          body: ['물체 거리 $s$, 상 거리 $s′$, 초점거리 $f$ 사이에는 $1/s + 1/s′ = 1/f$ 가 성립해요.',
            '부호: 렌즈 오른쪽(빛이 나가는 쪽)의 실상은 $s′$ > 0, 렌즈 왼쪽(물체 쪽)의 허상은 $s′$ < 0 으로 써요. 배율을 $m = −s′/s$ 로 쓰면 음수일 때 거꾸로 선 상이에요.',
            '예: $f$ = 10, $s$ = 30 → $s′$ = 15, $m$ = −0.5(작고 거꾸로) · $s$ = 5 → $s′$ = −10, $m$ = +2(바로 선 큰 허상, 렌즈 앞쪽 10 cm).'],
          eq: [{ tex: '$1/s + 1/s′ = 1/f$' }, { tex: '$m = −s′/s$' }] },
        svg: function (D) {
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
            kids.push(D.label(24, y - 40, st.name, { weight: 500, size: 22 }), D.label(780, y - 40, st.res, { anchor: 'end', size: 20, color: 'sim', bg: true }));
          });
          return D.svg(kids, { title: '물체 위치 세 구간 (점: 렌즈 양쪽 F·2F)', how: '실선 화살표 = 실상(거꾸로) · 점선 화살표 = 허상(바로) — 물체가 F 쪽으로 다가올수록 상이 멀어지고 커져요' });
        },
        teacherNote: '이 장이 오늘의 핵심 요약이에요. 카드 ②③④ 를 차례로 눌러 표를 채워 봐요.' },

      /* 7장 */
      { id: 'magnify', type: 'formula', title: '배율: 상은 물체의 몇 배일까?',
        body: [
          '**배율**은 상의 크기가 물체의 몇 배인지 나타내는 수예요. 1보다 크면 확대, 1보다 작으면 축소, 1이면 같은 크기예요.',
          '**배율 = 상 크기 ÷ 물체 크기 = 상 거리 ÷ 물체 거리.** 렌즈 가운데를 곧게 지나는 광선 ③ 이 닮은 삼각형 두 개를 만들기 때문이에요.',
          '물체 높이를 바꿔도 배율은 그대로예요. 예: 물체 거리 15 cm, 상 거리 30 cm 이면 배율 = 30 ÷ 15 = 2배(카드 ③, $f$ 10 cm).'
        ],
        symbols: [{ sym: '상 크기', name: '상의 높이', unit: 'cm' }, { sym: '물체 크기', name: '물체의 높이', unit: 'cm' }, { sym: '상 거리', name: '렌즈 가운데부터 상까지', unit: 'cm' }, { sym: '물체 거리', name: '렌즈 가운데부터 물체까지', unit: 'cm' }, { sym: '배율', name: '상이 물체의 몇 배인지', unit: '배' }],
        condition: '화면의 배율은 크기 비(양수)로 나타내요. 뒤집힌 상을 음수로 쓰는 방법은 \'더 알아보기\'에서.',
        life: ['스마트폰 카메라로 가까이 찍을 때 상이 커지는 것.'],
        more: { title: '더 알아보기 — 결상 공식과 부호 (교육과정 밖 심화)',
          body: ['$1/s + 1/s′ = 1/f$ 에서 상 거리 $s′$ 를 구하고, 배율을 $m = −s′/s$ 로 쓰면 크기와 방향을 한 번에 나타내요.',
            '예: $s$ = 15, $f$ = 10 → $s′$ = 30, $m$ = −2(두 배 크고 거꾸로). 화면의 2배는 $m$ 의 크기예요.'],
          eq: [{ tex: '$m = −s′/s$' }] },
        svg: function (D) {
          var y = 225, ox = 200, ix = 700, L = 400, oh = 60, ih = 90;
          return D.svg([
            '<path d="M' + ox + ' ' + y + ' L' + ox + ' ' + (y - oh) + ' L' + L + ' ' + y + ' Z" style="fill:var(--sim-tint);stroke:none"/>',
            '<path d="M' + L + ' ' + y + ' L' + ix + ' ' + y + ' L' + ix + ' ' + (y + ih) + ' Z" style="fill:var(--color-warn-tint);stroke:none"/>',
            axis(D, 40, 760, y), D.lens(L, y, 260),
            D.ray([[ox, y - oh], [L, y], [ix, y + ih]], { style: 3, arrow: false }),
            arrowV(D, ox, y, oh), arrowV(D, ix, y, -ih, { color: IMG }),
            D.dim(ox, y + 34, L, y + 34, '물체 거리', { off: 22, size: 19 }), D.dim(L, y - 34, ix, y - 34, '상 거리', { off: -22, size: 19 }),
            D.dim(ox - 26, y, ox - 26, y - oh, '', {}), D.label(ox - 40, y - oh / 2, '물체 크기', { anchor: 'end', size: 19 }),
            D.dim(ix + 26, y, ix + 26, y + ih, '', {}), D.label(ix + 18, y + ih + 30, '상 크기', { anchor: 'middle', size: 19 }),
            D.label(L, 70, '광선 ③ (렌즈 중심을 곧게)', { anchor: 'middle', size: 19, color: 'muted' })
          ], { title: '닮은 삼각형 두 개', how: '옅은 두 삼각형은 모양이 같아요 → 상 크기 ÷ 물체 크기 = 상 거리 ÷ 물체 거리' });
        } },

      /* 8장 */
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
        teacherNote: '시간이 부족하면 건너뛰고 6장 표의 생활 예로 대신해요. 반도체 공정은 [12물리03-02] 의 소개 소재이고 [12전자02-02] 와 이어져요(정성).' },

      /* 9장 */
      { id: 'misc', type: 'misconception', title: '흔한 오해 4가지',
        items: [
          { claim: '"렌즈 반쪽을 가리면 상도 반쪽만 생겨요."', why: '물체 한 점의 빛은 렌즈 어느 부분을 지나도 같은 점에 모여요. 남은 절반을 지난 빛만으로도 상 전체가 생기고, 줄어드는 것은 밝기뿐이에요.', chapter: 'three-rays' },
          { claim: '"스크린을 치우면 상도 사라져요."', why: '실상은 빛이 실제로 모이는 자리에 생겨요. 스크린은 그 빛을 받아 보이게 할 뿐이라 치워도 빛은 그 자리에 모였다 퍼져요. 허상은 스크린을 놓아도 맺히지 않아요.', chapter: 'real-virtual' },
          { claim: '"상은 물체 그림이 통째로 옮겨 간 거예요."', why: '상은 물체 각 점에서 나온 빛이 렌즈를 지나 다시 모여 만든 새 그림이에요. 실상은 위아래·좌우가 뒤집혀 있어요.', chapter: 'three-rays' },
          { claim: '"초점 안쪽에서도 스크린을 잘 옮기면 선명한 상이 생겨요."', why: '허상은 빛이 모이지 않아 스크린 어디에서도 선명해지지 않아요.', chapter: 'real-virtual' }
        ] },

      /* 10장 */
      { id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        questions: [
          { q: '먼 풍경의 상은 렌즈에서 얼마나 떨어진 곳에 생길까? 초점거리를 어떻게 알아낼까?', preset: 0, chapter: 'terms' },
          { q: '물체를 2F 에 두면 상은 어디에, 어떤 크기로?', preset: 1, chapter: 'by-position' },
          { q: '물체가 2F 보다 멀면(기본 상태) 상은?', preset: null, set: { type: 'arrow', s: 30, screenX: 15, h: 4, f: 10, hideF: false, blocker: 'none', screen: true, fan: false, ray1: true, ray2: true, ray3: true }, predict: false, chapter: 'by-position' },
          { q: '프로젝터 화면을 크게 하려면 슬라이드를 어디로?', preset: 2, chapter: 'by-position' },
          { q: '물체를 초점 안쪽에 두고 들여다보면?', preset: 3, chapter: 'real-virtual' },
          { q: '물체를 초점 바로 위에 두면 상은?', preset: null, set: { s: 10, f: 10, type: 'arrow', hideF: false, blocker: 'none', screen: true, ray1: true, ray2: true, ray3: true }, predict: false, chapter: 'by-position' },
          { q: '렌즈 위쪽 절반을 가리면 상은 어떻게 될까?', preset: 4, chapter: 'misc' }
        ],
        teacherNote: '한 질문에 해 보기 하나. 4장은 기본 상태에서 Q·W·E 로 광선을 하나씩 꺼 보고, 5장은 카드 ④ + 스크린 놓기(I), 오해 3은 물체 종류 F(O) 로 확인해요. 카드 ① 은 f 를 숨기므로 정리 단계에서 답을 공개해요.' },

      /* 11장 */
      { id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: ['물체를 렌즈 쪽으로 옮기면 상은 멀어지고 커져요. 2F 에 두면 같은 크기, 초점 안쪽은 스크린에 안 맺히는 바로 선 허상이에요. 렌즈를 가려도 상은 그대로이고 어두워질 뿐이에요.',
          '자기 평가: 잘 이해했어요 / 조금 헷갈려요 / 다시 보고 싶어요 — 다시 보고 싶으면 아래 장 링크로 돌아가요.'],
        quiz: [
          { q: '$f$ = 10 cm 인 렌즈에서 물체를 20 cm 에 두었어요. 상은 어디에, 어떤 크기로 생길까?', choices: ['10 cm, 작게', '20 cm, 같은 크기', '40 cm, 크게'], answer: '20 cm, 같은 크기(거꾸로 선 실상)', why: '2F 에 둔 물체는 반대쪽 2F 에 같은 크기로 상이 생겨요.', chapter: 'by-position' },
          { q: '물체 거리 15 cm 의 물체가 렌즈에서 30 cm 떨어진 곳에 상을 만들어요. 배율은?', answer: '2배', why: '배율 = 상 거리 ÷ 물체 거리 = 30 ÷ 15 = 2. 거꾸로 선 큰 실상(프로젝터).', chapter: 'magnify' },
          { q: '"렌즈 위쪽 절반을 가리면 상의 위쪽 절반이 사라진다." 맞는 말일까?', answer: '아니다', why: '남은 절반을 지난 빛이 같은 점에 모여 상 전체가 생겨요. 밝기만 줄어요.', chapter: 'misc' }
        ] }
    ],
    links: { terms: 'terms', 'three-rays': 'three-rays', 'real-virtual': 'real-virtual', 'by-position': 'by-position', magnify: 'magnify', misc: 'misc' }
  });
})();
