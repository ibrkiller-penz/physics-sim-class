/* =====================================================================
   인공위성과 탈출 속도 (orbit-gravity) — 교과 설명 데이터 (R7 1차, UI팀3)
   원고: docs/교과설명/orbit-gravity.md (10장, 심플 1·2·6·9) · 형식: docs/SIMKIT.md §0R7-6
   불러오는 순서: shared/sim.js → diagram.js → lesson.js(공통) → sim.js → 이 파일
   그림: viewBox 800×450 모식도(축척 아님). 지구 = 단원 원색(--color-primary) 채움, 궤도 = 단원색(--sim) 점선,
         속도 = 실선 화살표, 중력 = 굵은 화살표(중심 방향). 천체 아이콘 색 = 실험 화면 천체 칩과 같음. 색은 CSS 변수만.
   성취기준: [12역학01-03]·[12역학01-04]·[12역학01-05] (sim standards 와 같음). 케플러는 원운동만 정량, 타원 정량 없음.
   ===================================================================== */
(function () {
  'use strict';
  var EARTH = 'fill:var(--color-primary-tint);stroke:var(--color-primary);stroke-width:2.5';
  var BODY = {   // 실험 화면 천체 칩 아이콘과 같은 색
    earth: ['--color-primary-tint', '--color-primary'], moon: ['--color-paper-sunk', '--color-line-strong'],
    mars: ['--color-sim-collision-tint', '--color-sim-collision'], jupiter: ['--color-sim-lens-tint', '--color-sim-lens']
  };
  function circle(cx, cy, r, style) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="' + style + '"/>'; }
  function orbit(cx, cy, r, o) { o = o || {}; return circle(cx, cy, r, 'fill:none;stroke:' + (o.color || 'var(--sim)') + ';stroke-width:' + (o.w || 2.5) + ';stroke-dasharray:' + (o.dash || '9 7')); }
  function bodyIcon(cx, cy, r, k) { return circle(cx, cy, r, 'fill:var(' + BODY[k][0] + ');stroke:var(' + BODY[k][1] + ');stroke-width:3'); }
  function sat(x, y) { return '<rect x="' + (x - 11) + '" y="' + (y - 7) + '" width="22" height="14" rx="3" style="fill:var(--color-ink)"/>'; }
  function rect(x, y, w, hh, style) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" style="' + style + '"/>'; }
  /** 원 둘레의 점들(가로 범위 x0~x1, 위쪽 반원) */
  function arcPts(cx, cy, r, x0, x1) { var pts = []; for (var x = x0; x <= x1; x += 8) { var d = r * r - (x - cx) * (x - cx); if (d >= 0) pts.push([x, cy - Math.sqrt(d)]); } return pts; }
  /** 막대 인형(우주인): 머리 중심 (x, y) */
  function person(x, y, D) {
    return circle(x, y, 8, 'fill:var(--color-paper-raised);stroke:var(--color-ink);stroke-width:2.5') +
      D.line(x, y + 8, x, y + 30, { color: 'ink', w: 2.5 }) + D.line(x - 13, y + 14, x + 13, y + 20, { color: 'ink', w: 2.5 }) +
      D.line(x, y + 30, x - 10, y + 44, { color: 'ink', w: 2.5 }) + D.line(x, y + 30, x + 11, y + 42, { color: 'ink', w: 2.5 });
  }

  SimKit.lesson({
    slug: 'orbit-gravity',
    title: '위성은 왜 떨어지지 않을까?',
    standards: [
      { code: '12역학01-03', subj: '역학과 에너지', text: '힘과 운동 방향(원운동)' },
      { code: '12역학01-04', subj: '역학과 에너지', text: '인공위성·행성 운동(원운동에 한해 정량)' },
      { code: '12역학01-05', subj: '역학과 에너지', text: '행성마다 다른 탈출 속도' }
    ],
    simple: ['goal', 'cannon', 'escape', 'check'],
    chapters: [
      /* 1장 */
      { id: 'goal', type: 'goal', title: '위성은 왜 떨어지지 않을까?',
        question: '얼마나 빨리 쏘면 포탄이 땅에 떨어지지 않고 지구를 돌까? 더 빨리 쏘면 어떻게 될까?',
        body: [
          '달과 인공위성은 중력에 끌리면서도 지구로 떨어지지 않고 돌아요. 비밀은 **옆으로 가는 속력**에 있어요.',
          '높이·질량에 따라 위성의 속력과 주기가 어떻게 달라지는지, 어떤 속력이면 지구를 벗어나는지, 행성의 주기에는 어떤 규칙이 있는지 알아봐요.'
        ],
        goals: ['위성은 계속 떨어지고 있다', '원 궤도 속력 $v$ = √($GM$/$r$)', '탈출 속도는 천체마다 다르다', '$T^2$ 은 $a^3$ 에 비례한다'],
        svg: function (D) {
          return D.svg([
            circle(400, 270, 105, EARTH), D.label(400, 270, '지구', { anchor: 'middle', weight: 500 }),
            orbit(400, 270, 165), D.label(585, 190, '궤도', { color: 'sim', bg: true }),
            sat(400, 105),
            D.arrow(414, 105, 505, 105, { kind: 'v', label: '속도', lx: 515, ly: 105 }),
            D.arrow(400, 116, 400, 168, { kind: 'f', label: '중력', anchor: 'start', lx: 412, ly: 150 })
          ], { title: '지구를 도는 위성 (모식도, 축척 아님)', how: '실선 화살표 = 속도(옆으로) · 굵은 화살표 = 중력(지구 중심 쪽)' });
        },
        teacherNote: '1분. 질문을 읽고 학생 예상("우주에는 중력이 없다", "너무 높다") 몇 개 받아 두면 8장에 써요.' },

      /* 2장 */
      { id: 'cannon', type: 'diagram', title: '뉴턴의 대포: 떨어지며 돌기',
        body: [
          '포탄은 쏜 뒤에는 중력만 받아 옆으로 가면서 계속 아래로 떨어져요. 빠를수록 땅에 닿는 곳이 멀어지고, 그사이 지구 표면은 둥글게 휘어 내려가요.',
          '약 7.9 km/s 면 떨어지는 만큼 땅도 휘어져서, 포탄은 계속 떨어지기만 하고 땅에 닿지 않아요. 위성은 **계속 떨어지는 물체**예요.',
          '실험에서는 4·6 km/s 면 추락, 7.9 km/s 면 거의 원 궤도, 10 km/s 면 길쭉한 타원, 11.2 km/s 이상이면 탈출이에요.'
        ],
        condition: '공기가 없다고 보고, 높이 20 km 산에서 수평으로 쏴요. 이 높이의 원 궤도 속력이 약 7.9 km/s예요(지표 부근 원궤도 속력, 제1 우주 속도).',
        life: ['물수제비처럼 수평으로 던진 돌도 빠를수록 멀리 가요.', '실제로는 산 위에서 쏘기 어려워, 로켓이 위로 올라간 뒤 옆으로 가속해 위성을 만들어요.'],
        svg: function (D) {
          var R = 500, CX = 400, CY = 700, top = 170;
          var k1 = 0.0031, k2 = 0.001477, p1 = [], p2 = [], x;
          for (x = 400; x <= 520; x += 6) p1.push([x, top + k1 * (x - 400) * (x - 400)]);
          for (x = 400; x <= 680; x += 8) p2.push([x, top + k2 * (x - 400) * (x - 400)]);
          var ell = [], e = 0.3, rp = CY - top, a = rp / (1 - e);
          for (var t = -95; t <= 95; t += 3) { var th = t * Math.PI / 180, r = a * (1 - e * e) / (1 + e * Math.cos(th)); ell.push([CX + r * Math.sin(th), CY - r * Math.cos(th)]); }
          return D.svg([
            circle(CX, CY, R, EARTH),
            D.curve(ell, { color: 'muted', w: 2.5, dash: '14 6 3 6' }),
            D.curve(arcPts(CX, CY, CY - top, -10, 810), { color: 'sim', w: 4, dash: '10 7' }),
            D.curve(p1, { color: 'warn', w: 3 }), D.curve(p2, { color: 'warn', w: 3 }),
            '<path d="M386 200 L400 ' + top + ' L414 200 Z" style="fill:var(--color-paper-sunk);stroke:var(--color-line-strong);stroke-width:2"/>',
            D.ball(400, top, 7, { color: 'ink' }),
            D.label(400, 120, '7.9 km/s: 떨어져도 땅에 닿지 않아요', { anchor: 'middle', color: 'sim', weight: 500, bg: true }),
            D.label(470, 262, '느리게', { anchor: 'middle', bg: true }),
            D.label(640, 330, '조금 더 빠르게', { anchor: 'middle', bg: true }),
            D.label(690, 215, '더 빠르게', { anchor: 'middle', color: 'muted', bg: true }),
            D.line(470, 395, 520, 395, { color: 'warn', w: 3 }), D.label(530, 395, '추락', { size: 20 }),
            D.line(470, 425, 520, 425, { color: 'sim', w: 4, dash: '10 7' }), D.label(530, 425, '원 궤도', { size: 20 }),
            D.line(620, 425, 670, 425, { color: 'muted', w: 2.5, dash: '14 6 3 6' }), D.label(680, 425, '타원', { size: 20 })
          ], { title: '뉴턴의 대포 (모식도, 축척 아님)', how: '실선 = 추락 · 굵은 점선 = 원 궤도 · 일점쇄선 = 타원 — 빠를수록 멀리 가다가 결국 땅에 닿지 않아요' });
        },
        teacherNote: '카드 ① 의 순서 칩 4 → 6 → 7.9 → 10 → 11.2 를 차례로 쏘며 변화를 봐요.' },

      /* 3장 */
      { id: 'inverse-square', type: 'formula', title: '중력은 멀어질수록 약해진다',
        body: [
          '두 물체는 서로 끌어당겨요(만유인력). 지구가 위성을 당기는 힘과 위성이 지구를 당기는 힘은 크기가 같고 방향이 반대예요(작용·반작용).',
          '거리가 2배가 되면 힘은 1/4, 3배면 1/9 로 줄어요. 멀어져도 0이 되지는 않아요.',
          '우주에도 중력이 있어요. 높이 400 km 의 국제우주정거장(ISS)에서 지구 중력의 세기는 지표의 약 90%예요.'
        ],
        eq: [{ tex: '$F = GMm/r^2$', caption: '만유인력 — 거리 제곱에 반비례' }, { tex: '$g = GM/r^2$', caption: '지표 9.8 m/s², ISS 약 8.7 m/s²' }],
        symbols: [
          { sym: '$G$', name: '만유인력 상수 6.67×10⁻¹¹', unit: 'N·m²/kg²' }, { sym: '$M$', name: '지구 질량', unit: 'kg' },
          { sym: '$m$', name: '위성 질량', unit: 'kg' }, { sym: '$r$', name: '지구 중심에서 위성까지 거리 = $R$ + $h$', unit: 'm' }
        ],
        condition: '$R$ = 지구 반지름 6,371 km, $h$ = 고도. ISS 는 $r$ = 6,771 km.',
        life: ['달의 중력이 바닷물을 당겨 생기는 밀물·썰물(조석).', '같은 위성을 고도 400 km 와 36,000 km 에 두면 받는 중력이 크게 달라요.'],
        svg: function (D) {
          var cy = 200;
          return D.svg([
            circle(120, cy, 60, EARTH), D.label(120, cy, '지구', { anchor: 'middle', weight: 500 }),
            sat(320, cy), sat(520, cy), sat(720, cy),
            D.arrow(306, cy, 190, cy, { kind: 'f' }), D.label(250, cy - 34, '$F$', { anchor: 'middle', color: 'warn', weight: 500 }),
            D.arrow(506, cy, 476, cy, { kind: 'f' }), D.label(500, cy - 34, '$F$ ÷ 4', { anchor: 'middle', color: 'warn', weight: 500 }),
            D.arrow(706, cy, 693, cy, { kind: 'f' }), D.label(705, cy - 34, '$F$ ÷ 9', { anchor: 'middle', color: 'warn', weight: 500 }),
            D.line(120, 260, 120, 400, { w: 1.5, dash: '4 5' }),
            D.dim(120, 290, 320, 290, '$r$', { off: -18 }), D.dim(120, 340, 520, 340, '2$r$', { off: -18 }), D.dim(120, 390, 720, 390, '3$r$', { off: -18 })
          ], { title: '거리에 따른 중력의 세기 (모식도)', how: '굵은 화살표 길이 = 중력의 크기 — 거리가 2배면 1/4, 3배면 1/9' });
        },
        teacherNote: '수식 암기가 아니라 "멀수록 약해지고 0은 아니다"가 핵심이에요. 4장 식에서 다시 써요.' },

      /* 4장 */
      { id: 'orbit-speed', type: 'formula', title: '원궤도 속력',
        body: [
          '원운동을 하려면 중심을 향한 힘(구심력)이 필요해요. 위성에서는 **중력이 구심력**이에요.',
          '중력 $GMm/r^2$ 과 구심력 $mv^2/r$ 을 같다고 놓으면 $m$ 이 양쪽에서 약분돼요. 무거운 위성은 중력도 크지만 방향을 바꾸기도 어려워서(관성) 속력은 같아요.',
          '높이 올라갈수록 중력이 약해서 천천히 돌아도 돼요. 정지궤도 위성은 지구 자전과 같은 약 24시간 주기로 적도 위를 돌아요.'
        ],
        eq: [{ tex: '$GMm/r^2 = mv^2/r$ → $v$ = √($GM$/$r$)', caption: '위성 질량 $m$ 이 없어요' }, { tex: '$T = 2πr/v$', caption: '한 바퀴 도는 시간(주기)' }],
        symbols: [{ sym: '$v$', name: '궤도 속력', unit: 'km/s' }, { sym: '$r$', name: '지구 중심에서 거리', unit: 'km' }, { sym: '$T$', name: '주기', unit: '분·시간' }],
        condition: '예: ISS(고도 400 km) 7.7 km/s · 약 92분, GPS(20,200 km) 3.9 km/s · 약 12시간, 정지궤도(35,786 km) 3.1 km/s · 약 24시간. 질량을 100 → 10,000 kg 으로 바꿔도 $v$ 는 같아요.',
        life: ['GPS 위성, 방송 통신 위성(정지궤도라 안테나가 늘 같은 방향).', '달이 지구를 도는 주기도 같은 식으로 정해져요.'],
        svg: function (D) {
          var cx = 230, cy = 250;
          return D.svg([
            circle(cx, cy, 55, EARTH), D.label(cx, cy, '지구', { anchor: 'middle', weight: 500 }),
            orbit(cx, cy, 95), orbit(cx, cy, 145), orbit(cx, cy, 195),
            sat(cx, cy - 95), sat(cx, cy - 145), sat(cx, cy - 195),
            D.arrow(cx + 13, cy - 95, cx + 13 + 80, cy - 95, { kind: 'v' }),
            D.arrow(cx + 13, cy - 145, cx + 13 + 55, cy - 145, { kind: 'v' }),
            D.arrow(cx + 13, cy - 195, cx + 13 + 40, cy - 195, { kind: 'v' }),
            D.label(cx + 112, cy - 95, 'ISS 7.7 km/s · 약 92분', { bg: true }),
            D.label(cx + 86, cy - 145, 'GPS 3.9 km/s · 약 12시간', { bg: true }),
            D.label(cx + 70, cy - 195, '정지궤도 3.1 km/s · 약 24시간', { bg: true }),
            D.label(785, 425, '화살표 길이 = 속력 (안쪽일수록 빨라요)', { size: 20, color: 'muted', anchor: 'end' })
          ], { title: '높이에 따른 세 궤도 (모식도, 축척 아님)', how: '안쪽 궤도일수록 화살표(속력)가 길고 한 바퀴 시간은 짧아요' });
        },
        teacherNote: '위성 모드의 순서 칩 — 질량만 바꾸기(100 → 1,000 → 10,000 kg)와 고도만 바꾸기(ISS → GPS → 정지궤도)를 이어서 써요.' },

      /* 5장 */
      { id: 'weightless', type: 'concept', title: '무중력의 정체',
        body: [
          'ISS 높이에서도 지구 중력은 지표의 약 90%예요. 그런데도 우주인이 뜨는 까닭은 **정거장과 우주인이 함께 떨어지기** 때문이에요.',
          '엘리베이터 줄이 끊어져 함께 떨어질 때 몸이 뜨는 느낌과 같아요. 다만 ISS 는 옆으로 빨라서 떨어져도 땅에 닿지 않고 계속 돌아요.',
          '"무중력"은 "중력이 0"이 아니라 "바닥이 나를 받치지 않는 상태"예요.'
        ],
        eq: [{ tex: "$g' = GM/r^2$ ≈ 8.7 m/s²", caption: 'ISS 와 우주인의 가속도가 같아요' }],
        condition: '겉보기 무게 = 0 (바닥이 받쳐 주는 힘이 0)',
        life: ['롤러코스터가 급히 내려갈 때 몸이 뜨는 느낌.', '포물선 비행(무중력 체험 비행기).'],
        svg: function (D) {
          return D.svg([
            circle(400, 960, 600, EARTH), orbit(400, 960, 690),
            D.label(120, 430, '지구', { weight: 500 }),
            D.box(325, 215, 150, 70, { color: 'muted', fill: 'paper' }), D.label(400, 200, 'ISS', { anchor: 'middle', weight: 500 }),
            person(395, 228, D),
            D.arrow(400, 290, 400, 352, { kind: 'f' }), D.arrow(455, 290, 455, 352, { kind: 'f' }),
            D.label(470, 335, '같은 중력 가속도', { color: 'warn', bg: true }),
            D.arrow(478, 250, 556, 250, { kind: 'v', label: '옆 속도', lx: 566, ly: 250 }),
            rect(620, 70, 90, 110, 'fill:none;stroke:var(--color-ink-muted);stroke-width:2'),
            person(665, 98, D), D.arrow(740, 90, 740, 170, { kind: 'f' }),
            D.label(665, 205, '줄 끊긴 엘리베이터', { anchor: 'middle', size: 18, color: 'muted' })
          ], { title: '함께 떨어지는 우주정거장 (모식도)', how: '정거장과 우주인이 같은 가속도로 떨어져 바닥이 우주인을 받치지 않아요' });
        },
        teacherNote: '카드 ② 의 질문은 "질량이 바뀌어도 속력은?" — 이 장에서는 "그래서 뜨는 이유"를 구분해서 말해 줘요.' },

      /* 6장 */
      { id: 'escape', type: 'formula', title: '탈출 속도',
        body: [
          '위로 던진 공은 다시 떨어지지만 충분히 빨리 던지면 돌아오지 않아요. 그 경계 속력이 **탈출 속도**예요.',
          '에너지 보존으로 생각하면, 처음 운동 에너지 ½$mv^2$ 이 중력 위치 에너지의 크기 $GMm/R$ 이상이어야 해요.',
          '탈출 속도는 원궤도 속력의 √2 배(약 1.41배)이고, 질량이 큰 천체·반지름이 작은 천체일수록 커요. 탈출해도 중력이 0이 되지는 않아요. 멀어지며 약해질 뿐이에요.'
        ],
        eq: [{ tex: '½$mv^2 = GMm/R$', caption: '운동 에너지 = 중력 위치 에너지의 크기' }, { tex: '$v_{esc}$ = √(2$GM$/$R$) = √2 $v$', caption: '원궤도 속력 $v$ 의 √2 배 — 지구 11.2 · 달 2.4 · 화성 5.0 · 목성 59.5 km/s' }],
        condition: '실험 화면 속력 띠(지구): $v_0$ < 7.9 추락 · 7.9 ≤ $v_0$ < 11.2 궤도(원 또는 타원) · $v_0$ ≥ 11.2 탈출',
        life: ['달에 대기가 거의 없는 까닭(약한 중력에서 기체가 빠져나감).', '로켓이 지구를 벗어나려면 아주 큰 속력이 필요한 까닭.'],
        svg: function (D) {
          var X = function (v) { return 60 + 680 * v / 13; }, by = 82, bh = 40;
          var x79 = X(7.9), x112 = X(11.2);
          var kids = [
            rect(X(0), by, x79 - X(0), bh, 'fill:var(--color-warn-tint)'), rect(x79, by, x112 - x79, bh, 'fill:var(--color-ok-tint)'), rect(x112, by, X(13) - x112, bh, 'fill:var(--color-primary-tint)'),
            rect(X(0), by, X(13) - X(0), bh, 'fill:none;stroke:var(--color-line-strong);stroke-width:1.5'),
            D.label((X(0) + x79) / 2, by + bh / 2, '추락', { anchor: 'middle', weight: 500 }),
            D.label((x79 + x112) / 2, by + bh / 2, '궤도', { anchor: 'middle', weight: 500 }),
            D.label((x112 + X(13)) / 2, by + bh / 2, '탈출', { anchor: 'middle', weight: 500 }),
            D.line(x79, by, x79, by + bh + 8, { color: 'ink', w: 2.5 }), D.line(x112, by, x112, by + bh + 8, { color: 'ink', w: 2.5 }),
            D.label(X(0), by + bh + 22, '0', { anchor: 'middle', size: 20, color: 'muted' }),
            D.label(x79, by + bh + 22, '7.9', { anchor: 'middle', size: 20, weight: 500 }),
            D.label(x112, by + bh + 22, '11.2', { anchor: 'middle', size: 20, weight: 500 }),
            D.label(X(13), by + bh + 22, 'km/s', { anchor: 'end', size: 20, color: 'muted' }),
            D.label(60, 190, '천체마다 탈출 속도 (km/s)', { size: 20, color: 'muted' })
          ];
          var BX = function (v) { return 150 + 560 * v / 13; };
          [['moon', '달', 2.4], ['mars', '화성', 5.0], ['earth', '지구', 11.2], ['jupiter', '목성', 59.5]].forEach(function (b, i) {
            var y = 232 + i * 52, end = Math.min(BX(b[2]), BX(13));
            kids.push(D.label(60, y, b[1], { weight: 500 }), bodyIcon(124, y, 13, b[0]));
            kids.push(rect(150, y - 14, end - 150, 28, 'fill:var(--sim-tint);stroke:var(--sim);stroke-width:2'));
            if (b[2] > 13) kids.push('<path d="M' + (end - 26) + ' ' + (y - 20) + ' l8 40 M' + (end - 14) + ' ' + (y - 20) + ' l8 40" style="stroke:var(--color-paper-raised);stroke-width:6"/>', D.label(end + 8, y, '59.5', { size: 20, weight: 500 }));
            else kids.push(D.label(Math.abs(end - BX(3)) < 40 ? BX(3) + 10 : end + 10, y, String(b[2].toFixed(1)), { size: 20, weight: 500, bg: true }));
          });
          kids.push(D.line(BX(3), 205, BX(3), 410, { color: 'warn', w: 2, dash: '6 5' }), D.label(BX(3), 428, '3 km/s', { anchor: 'middle', size: 20, color: 'warn' }));
          return D.svg(kids, { title: '속력 띠와 탈출 속도', how: '위: 지구에서 쏜 속력 구간(숫자는 띠 아래 줄) · 아래: 3 km/s 선에 못 미치는 막대는 달뿐 — 3 km/s 로 쏘면 달에서만 탈출해요' });
        },
        teacherNote: '카드 ⑤ "3 km/s로 쏘면?"에서 달만 탈출함을 확인해요. 정량 유도는 ½mv² = GMm/R 한 줄로 충분해요.' },

      /* 7장 */
      { id: 'kepler', type: 'formula', title: '행성의 주기 규칙',
        body: [
          '지구는 태양에서 1 AU 떨어져 1년에 한 바퀴 돌아요. 목성은 5.2 AU 에서 약 11.9년이 걸려요.',
          '거리 $a$(AU)와 주기 $T$(년)를 표로 쓰고 $T^2$ 과 $a^3$ 을 계산하면 거의 같은 값이 돼요(케플러 제3법칙).',
          '원궤도라면 $v$ = √($GM$/$r$), $T = 2πr/v$ 에서 $T^2$ = (4$π^2$/$GM$) $r^3$ 이 나와요. 이 단원은 **원운동에서만 계산**하고, 타원 궤도는 이 규칙이 성립한다는 사실만 알아 둬요.'
        ],
        eq: [{ tex: '$T^2$ ∝ $a^3$', caption: '$a$: 궤도 긴반지름(원에서는 반지름 $r$)' }],
        condition: '예: 화성 $a$ = 1.524 AU, $T$ = 1.881 년 → $a^3$ ≈ 3.54, $T^2$ ≈ 3.54. 거리가 4배면 주기는 8배예요.',
        life: ['인공위성 고도가 높을수록 한 바퀴 도는 시간이 길어지는 것(4장).', '달의 공전 주기로 달 궤도 반지름을 알아내는 방법.'],
        svg: function (D) {
          var ox = 110, oy = 400, W = 620, H = 330, MX = 900;
          var mx = function (v) { return ox + W * v / MX; }, my = function (v) { return oy - H * v / MX; };
          var ix = 530, iy = 360, IW = 200, IH = 95, IM = 4;
          var nx = function (v) { return ix + IW * v / IM; }, ny = function (v) { return iy - IH * v / IM; };
          var inner = [['수성', 0.058, 1], ['금성', 0.378, -1], ['지구', 1.0, 1], ['화성', 3.54, -1]];
          var kids = [
            D.axis(ox, oy, W + 30, H + 10, { xl: '$a^3$ (AU³)', yl: '$T^2$ (년²)', ticks: [{ v: W * 300 / MX, t: '300' }, { v: W * 600 / MX, t: '600' }], yticks: [{ v: H * 300 / MX, t: '300' }, { v: H * 600 / MX, t: '600' }] }),
            D.line(ox, oy, mx(MX), my(MX), { color: 'muted', w: 2, dash: '8 6' }), D.label(mx(560), my(640), '기울기 1', { color: 'muted', size: 20, anchor: 'end' }),
            D.dots([[mx(140.8), my(140.7)], [mx(867.4), my(867.9)]], { r: 7 }),
            D.label(mx(140.8) + 14, my(140.7) + 6, '목성', { bg: true }), D.label(mx(867.4) - 14, my(867.9) + 4, '토성', { anchor: 'end', bg: true }),
            D.dots([[ox, oy]], { r: 6 }), D.label(ox + 14, oy - 24, '원점 근처 행성 4개 → 오른쪽 아래 확대', { size: 18, color: 'muted', bg: true }),
            rect(ix - 40, iy - IH - 28, IW + 64, IH + 54, 'fill:var(--color-paper-raised);stroke:var(--color-line-strong);stroke-width:1.5'),
            D.line(ix, iy, ix + IW + 10, iy, { w: 1.5 }), D.line(ix, iy, ix, iy - IH - 10, { w: 1.5 }),
            D.label(ix - 8, iy, '0', { anchor: 'end', size: 16, color: 'muted' }), D.label(nx(4), iy + 15, '4', { anchor: 'middle', size: 16, color: 'muted' }), D.label(ix - 8, ny(4), '4', { anchor: 'end', size: 16, color: 'muted' }),
            D.line(nx(0), ny(0), nx(4), ny(4), { color: 'muted', w: 1.5, dash: '6 5' })
          ];
          inner.forEach(function (p) {
            kids.push(D.dots([[nx(p[1]), ny(p[1])]], { r: 5 }));
            kids.push(D.label(nx(p[1]) + (p[2] > 0 ? 8 : -8), ny(p[1]) + p[2] * 15, p[0], { size: 17, anchor: p[2] > 0 ? 'start' : 'end' }));
          });
          return D.svg(kids, { title: '행성 자료: $T^2$ – $a^3$', how: '행성 여섯 점이 원점을 지나는 기울기 1 직선 위에 놓여요 (단위 AU · 년)' });
        },
        teacherNote: '케플러 자료 모드는 "자료 읽기 활동"으로 해요. [12역학01-04] 는 케플러 법칙에서 중력 발견까지의 과학사이므로, 관측 → 법칙 → 중력 한 줄 이야기를 곁들이면 좋아요.' },

      /* 8장 */
      { id: 'misc', type: 'misconception', title: '흔한 오해 4가지',
        items: [
          { claim: '"우주에는 중력이 없어요."', why: '400 km 높이에서도 지구 중력은 지표의 약 90%예요. 중력이 있어서 위성이 돌 수 있어요.', chapter: 'inverse-square' },
          { claim: '"무거운 위성은 더 빨리 돌아야 해요."', why: '궤도 속력 $v$ = √($GM$/$r$) 에 위성 질량이 없어요. 같은 높이에서는 질량과 관계없이 같은 속력이에요.', chapter: 'orbit-speed' },
          { claim: '"탈출하면 중력이 0이 돼요."', why: '탈출은 중력이 사라지는 게 아니라 되돌아오지 않을 만큼 빨리 가는 것이에요. 멀수록 중력은 약해지지만 0이 되지는 않아요.', chapter: 'escape' },
          { claim: '"속도를 줄이면 고도가 오르고, 빨라지면 내려가요."', why: '같은 고도의 원궤도에서는 속력이 정해져 있어요. 더 높은 원궤도로 가려면 에너지가 필요하고, 높은 원궤도는 오히려 속력이 작아요.', chapter: 'orbit-speed' }
        ] },

      /* 9장 */
      { id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        modes: [
          { key: 'mode', value: 'cannon', label: '뉴턴의 대포' },
          { key: 'mode', value: 'sat', label: '원궤도 위성' },
          { key: 'mode', value: 'kepler', label: '케플러 자료' }
        ],
        questions: [
          { q: '20 km 산꼭대기에서 7.9 km/s 로 쏘면? (이어서 순서 칩 4 → 6 → 7.9 → 10 → 11.2)', preset: 0, mode: 'cannon', set: { mode: 'cannon', v0: 7.9 }, chapter: 'cannon' },
          { q: '같은 400 km 높이에서 무거운 위성은 더 빨리 돌까? (질량 100 → 1,000 → 10,000 kg)', simple: false, preset: 1, mode: 'sat', set: { mass: 100 }, chapter: 'orbit-speed' },
          { q: '35,786 km 위성은 ISS 보다 빨리 돌까, 천천히 돌까?', simple: false, preset: 2, chapter: 'orbit-speed' },
          { q: '태양에서 멀수록 행성의 1년은?', simple: false, preset: 3, mode: 'kepler', chapter: 'kepler' },
          { q: '3 km/s 로 쏘면 어느 천체에서 탈출할까?', preset: 4, set: { body: 'moon' }, chapter: 'escape' }
        ],
        teacherNote: '발문: ISS 안의 사람은 왜 뜨는가?(→ 5장) · 3 km/s 로 쏘면 달·화성·지구에서 각각? · 7.9 km/s 와 11.2 km/s 의 비는?(약 1.41 = √2)' },

      /* 10장 */
      { id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: ['위성은 중력을 구심력 삼아 **계속 떨어지며 돌고**, 그 속력은 거리에만 달려 있어 질량과 무관해요. 탈출하려면 천체마다 정해진 속력 이상이 필요해요.', '자기 점검: "나는 ___ 를 이제 설명할 수 있어요 / 아직 헷갈려요."'],
        quiz: [
          { q: '원궤도를 도는 위성 두 대가 같은 고도에 있어요. 질량이 10배 차이 나면 속력은?', answer: '같다', why: '$v$ = √($GM$/$r$) 에 위성 질량이 없어요.', chapter: 'orbit-speed' },
          { q: '지표에서 중력 가속도가 9.8 m/s² 일 때, 지구 중심에서 지구 반지름의 2배 거리에서는?', answer: '약 2.45 m/s²', why: '$g$ ∝ 1/$r^2$ 이라 거리 2배 → 1/4.', chapter: 'inverse-square' },
          { q: '"ISS 안에서 우주인이 뜨는 것은 그곳에 중력이 없기 때문이다." 맞는 말일까?', answer: '틀리다', why: 'ISS 높이의 중력은 지표의 약 90%. 정거장과 우주인이 함께 떨어지고 있어 떠 보여요.', chapter: 'weightless' }
        ] }
    ],
    links: { cannon: 'cannon', 'orbit-speed': 'orbit-speed', weightless: 'weightless', escape: 'escape', kepler: 'kepler' }
  });
})();
