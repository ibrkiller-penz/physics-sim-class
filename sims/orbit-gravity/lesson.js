/* =====================================================================
   인공위성과 탈출 속도 (orbit-gravity) — 교과 설명 데이터 (R7 2차, UI팀3)
   원고: docs/교과설명/orbit-gravity.md (기획A 2차, 11장 + 정리 모달) · 형식: docs/SIMKIT.md §0R7-2
   불러오는 순서: shared/sim.js → diagram.js → lesson.js(공통) → sim.js → 이 파일
   그림: viewBox 800×450 모식도(축척 아님). 지구 = 단원 원색 채움, 궤도 = 단원색(--sim) 점선,
         속도 = 실선 화살표(kind v), 중력 = 구리색 굵은 화살표(kind f — 공통 토큰, 붉은색 안 씀). 색은 CSS 변수만.
   기호: R = 천체 반지름, r = 천체 중심에서의 거리(궤도 반지름, r ≥ R), h = 고도, r = R + h. 실험 대포는 h = 20 km 산.
   성취기준: [12역학01-03]·[12역학01-04]·[12역학01-05] (sim standards 와 같음). 케플러는 원운동만 정량, 타원 정량 없음.
   R7 2차: 장 11개(orbit-heights·kepler-1·kepler-2 분할) · terms · symbols[].target · now · 오해 try/result · quiz 3(answerIdx)
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

  /* '지금 값' 대입용 상수 — sim.js 의 BODIES 와 같은 값(표시만, 실험 계산은 sim.js) */
  var G = 6.674e-11, MOUNT_KM = 20;
  var BODIES = {
    earth: { name: '지구', M: 5.972e24, R: 6371 }, moon: { name: '달', M: 7.342e22, R: 1737 },
    mars: { name: '화성', M: 6.417e23, R: 3390 }, jupiter: { name: '목성', M: 1.898e27, R: 71492 }
  };
  function bodyOf(p) { return BODIES[p && p.body] || BODIES.earth; }
  function comma(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  /** 중심에서의 거리 r(km) — 위성: R + 고도, 대포: R + 산 높이 20 km */
  function rNow(p) { var b = p && p.mode === 'sat' ? BODIES.earth : bodyOf(p); return { b: b, h: p && p.mode === 'sat' ? p.alt : MOUNT_KM, r: b.R + (p && p.mode === 'sat' ? p.alt : MOUNT_KM) }; }
  function vCirc(b, rKm) { return Math.sqrt(G * b.M / (rKm * 1000)) / 1000; }   // km/s
  /** 예측 창이 떠 있는 동안은 결과 값을 말하지 않는다(정답 누출 금지) */
  function hush() { return !!(window.SimKit && SimKit.predicting && SimKit.predicting()); }
  function rLine(x) { return '$r$ = $R$ + $h$ = ' + comma(x.b.R) + ' + ' + comma(x.h) + ' = ' + comma(x.r) + ' km'; }
  function periodText(sec) { return sec < 7200 ? Math.round(sec / 60) + '분' : f1(sec / 3600) + '시간'; }

  SimKit.lesson({
    slug: 'orbit-gravity',
    title: '위성은 왜 떨어지지 않을까?',
    standards: [
      { code: '12역학01-03', subj: '역학과 에너지', text: '힘과 운동 방향(원운동)' },
      { code: '12역학01-04', subj: '역학과 에너지', text: '인공위성·행성 운동(원운동에 한해 정량)' },
      { code: '12역학01-05', subj: '역학과 에너지', text: '행성마다 다른 탈출 속도' }
    ],
    simple: ['goal', 'cannon', 'orbit-speed', 'escape', 'check'],
    terms: [
      { term: '만유인력 상수', sym: '$G$', unit: 'N·m²/kg²', mean: '6.67×10⁻¹¹ — 모든 물체 사이 중력의 세기를 정하는 상수' },
      { term: '중심 천체 질량', sym: '$M$', unit: 'kg', mean: '위성이 도는 천체(지구 5.97×10²⁴ kg)의 질량', where: 'body' },
      { term: '위성 질량', sym: '$m$', unit: 'kg', mean: '위성(포탄)의 질량 — 궤도 속력 식에는 들어가지 않아요', where: 'mass' },
      { term: '천체 반지름', sym: '$R$', unit: 'km', mean: '천체 중심에서 표면까지(지구 6,371 km)' },
      { term: '고도', sym: '$h$', unit: 'km', mean: '천체 표면에서 잰 높이 — 위성 고도, 대포는 산 높이 20 km', where: 'alt' },
      { term: '중심에서의 거리', sym: '$r$', unit: 'km', mean: '천체 중심에서 위성까지(궤도 반지름) — $r$ = $R$ + $h$, $r$ ≥ $R$', where: 'alt' },
      { term: '궤도 속력', sym: '$v$', unit: 'km/s', mean: '원궤도를 도는 빠르기 $v$ = √($GM$/$r$)', where: 'meter:v' },
      { term: '발사 속력', sym: '$v_0$', unit: 'km/s', mean: '산 위에서 수평으로 쏘는 속력', where: 'v0' },
      { term: '주기', sym: '$T$', unit: '분·시간', mean: '한 바퀴 도는 데 걸리는 시간', where: 'meter:T' },
      { term: '탈출 속도', sym: '$v_{esc}$', unit: 'km/s', mean: '되돌아오지 않는 가장 작은 속력 — 원궤도 속력의 √2 배', where: 'stage:vband' },
      { term: '제1 우주 속도', sym: '', unit: 'km/s', mean: '지표 부근 원궤도 속력, 지구 약 7.9 km/s' },
      { term: '제2 우주 속도', sym: '', unit: 'km/s', mean: '지표에서의 탈출 속도, 지구 약 11.2 km/s' }
    ],
    chapters: [
      /* 1장 */
      { id: 'goal', type: 'goal', title: '위성은 왜 떨어지지 않을까?',
        question: '얼마나 빨리 쏘면 포탄이 땅에 떨어지지 않고 지구를 돌까? 더 빨리 쏘면 어떻게 될까?',
        body: [
          '달과 인공위성은 중력에 끌리면서도 지구로 떨어지지 않고 돌아요. 비밀은 **옆으로 가는 속력**에 있어요.',
          '높이에 따라 위성의 속력과 주기가 어떻게 달라지는지, 어떤 속력이면 지구를 벗어나는지 알아봐요. 행성의 주기 규칙도 자료로 확인해요.'
        ],
        goals: ['위성은 계속 떨어지고 있다', '원궤도 속력 $v$ = √($GM$/$r$), 탈출 속도', '$T^2$ 은 $a^3$ 에 비례한다'],
        svg: function (D) {
          var cx = 400, cy = 262, Re = 110, ro = 172, sy = cy - ro;
          var ra = 215 * Math.PI / 180, ex = cx + Re * Math.cos(ra), ey = cy - Re * Math.sin(ra);
          return D.svg([
            circle(cx, cy, Re, EARTH), D.label(cx + 40, cy + 30, '지구', { anchor: 'middle', weight: 500, bg: false }),
            orbit(cx, cy, ro), D.label(cx + 186, cy - 120, '궤도', { color: 'sim' }),
            D.line(cx, cy, cx, sy + 8, { color: 'muted', w: 1.8, dash: '6 5' }), D.label(cx - 12, cy - 128, '$r$', { anchor: 'end', italic: true, sym: 'r' }),
            D.line(cx, cy, ex, ey, { color: 'ink', w: 2 }), D.label((cx + ex) / 2 - 8, (cy + ey) / 2 - 18, '$R$', { anchor: 'end', sym: 'R' }),
            D.dots([[cx, cy]], { r: 4, color: 'ink' }),
            sat(cx, sy),
            D.arrow(cx + 14, sy, cx + 90, sy, { kind: 'v', label: '$v$', sym: 'v' }),
            D.arrow(cx + 2, sy + 10, cx + 2, sy + 52, { kind: 'f', label: '$F$', lx: cx + 16, ly: sy + 40, anchor: 'start', sym: 'F' })
          ], { title: '지구를 도는 위성 (모식도, 축척 아님)', how: '실선 화살표 $v$ = 옆으로 가는 속도 · 굵은 구리색 화살표 $F$ = 중력(지구 중심 쪽) · $R$ 천체 반지름, $r$ 중심에서 위성까지' });
        },
        teacherNote: '1분. "우주에는 중력이 없다" 같은 예상을 받아 두었다가 10장(오해)에 써요.' },

      /* 2장 */
      { id: 'cannon', type: 'diagram', title: '뉴턴의 대포: 떨어지며 돌기',
        body: [
          '포탄은 쏜 뒤에 중력만 받아 휘어지며 떨어져요. 빠를수록 멀리 떨어지고, 그사이 둥근 땅도 아래로 휘어요.',
          '약 7.9 km/s 면 떨어지는 만큼 땅도 휘어서 땅에 닿지 않아요. 위성은 **계속 떨어지는 물체**예요.'
        ],
        condition: '공기 없음, 높이 $h$ = 20 km 산에서 수평 발사 → $r$ = $R$ + 20 km.',
        try: { label: '실험 ① — $v_0$ 4 · 6 · 7.9 · 10 · 11.2 km/s 차례로', preset: 0 },
        life: ['실험 결과: 4·6 km/s 추락 · 7.9 거의 원궤도 · 10 타원(가장 먼 곳이 $R$ 의 약 4배) · 11.2 km/s 이상 탈출.', '실제로는 산 위에서 쏘기 어려워, 로켓이 위로 올라간 뒤 옆으로 가속해 위성을 만들어요.'],
        svg: function (D) {
          var R = 500, CX = 400, CY = 700, top = 170;
          var k1 = 0.0031, k2 = 0.001477, p1 = [], p2 = [], x;
          for (x = 400; x <= 520; x += 6) p1.push([x, top + k1 * (x - 400) * (x - 400)]);
          for (x = 400; x <= 680; x += 8) p2.push([x, top + k2 * (x - 400) * (x - 400)]);
          var ell = [], e = 0.3, rp = CY - top, a = rp / (1 - e);
          for (var t = -95; t <= 95; t += 3) { var th = t * Math.PI / 180, r = a * (1 - e * e) / (1 + e * Math.cos(th)); ell.push([CX + r * Math.sin(th), CY - r * Math.cos(th)]); }
          var bx = 596, by = 18, bw = 196, bh = 124;   // 오른쪽 위 확대 상자: h 와 r = R + h
          return D.svg([
            circle(CX, CY, R, EARTH),
            D.curve(ell, { color: 'muted', w: 2.5, dash: '14 6 3 6' }),
            D.curve(arcPts(CX, CY, CY - top, -10, 810), { color: 'sim', w: 4, dash: '10 7' }),
            D.curve(p1, { color: 'warn', w: 3 }), D.curve(p2, { color: 'warn', w: 3 }),
            '<path d="M386 200 L400 ' + top + ' L414 200 Z" style="fill:var(--color-paper-sunk);stroke:var(--color-line-strong);stroke-width:2"/>',
            D.ball(400, top, 7, { color: 'ink' }),
            D.label(330, 120, '7.9 km/s: 떨어져도 땅에 닿지 않아요', { anchor: 'middle', color: 'sim', weight: 500 }),
            D.line(500, 228, 470, 262, { color: 'muted', w: 1.5 }), D.label(470, 276, '느리게', { anchor: 'middle' }),
            D.line(650, 292, 640, 322, { color: 'muted', w: 1.5 }), D.label(640, 336, '조금 더 빠르게', { anchor: 'middle' }),
            D.label(700, 200, '더 빠르게', { anchor: 'middle', color: 'muted' }),
            rect(bx, by, bw, bh, 'fill:var(--color-paper-raised);stroke:var(--color-line-strong);stroke-width:1.5'),
            '<path d="M' + (bx + 14) + ' ' + (by + 104) + ' Q' + (bx + 98) + ' ' + (by + 92) + ' ' + (bx + 182) + ' ' + (by + 104) + '" style="fill:none;stroke:var(--color-primary);stroke-width:2.5"/>',
            '<path d="M' + (bx + 62) + ' ' + (by + 100) + ' L' + (bx + 86) + ' ' + (by + 48) + ' L' + (bx + 110) + ' ' + (by + 98) + '" style="fill:var(--color-paper-sunk);stroke:var(--color-line-strong);stroke-width:2"/>',
            D.dim(bx + 124, by + 99, bx + 124, by + 48, ''),
            D.label(bx + 136, by + 72, '$h$', { size: 20, sym: 'h' }), D.label(bx + 150, by + 72, '20 km', { size: 17 }),
            D.label(bx + 12, by + 22, '$r$ = $R$ + $h$ (과장)', { size: 18, sym: 'r' }),
            D.line(470, 395, 520, 395, { color: 'warn', w: 3 }), D.label(530, 395, '추락', { size: 20 }),
            D.line(470, 425, 520, 425, { color: 'sim', w: 4, dash: '10 7' }), D.label(530, 425, '원 궤도', { size: 20 }),
            D.line(620, 425, 670, 425, { color: 'muted', w: 2.5, dash: '14 6 3 6' }), D.label(680, 425, '타원', { size: 20 })
          ], { title: '뉴턴의 대포 (모식도, 축척 아님)', how: '실선 = 추락 · 굵은 점선 = 원 궤도 · 일점쇄선 = 타원 — 오른쪽 위: 산 높이 $h$, 중심에서의 거리 $r$ = $R$ + $h$' });
        },
        teacherNote: '실험 ① 의 순서 칩 4 → 6 → 7.9 → 10 → 11.2 를 차례로 쏘며 결과 변화를 봐요.' },

      /* 3장 */
      { id: 'inverse-square', type: 'formula', title: '중력은 멀어질수록 약해진다',
        body: [
          '중심에서의 거리 $r$ 가 2배면 중력은 4분의 1, 3배면 9분의 1 — 줄지만 0 이 되지는 않아요. ISS(400 km)에서도 지표의 약 89 % 예요.'
        ],
        eq: [{ tex: '$F$ =', frac: ['$GMm$', '$r^2$'], caption: '$g$ = $GM$/$r^2$' }],
        symbols: [
          { sym: '$F$', name: '중력 (계기 "지표 $g$ 대비")', unit: 'N', target: 'meter:g' },
          { sym: '$r$', name: '중심에서의 거리 $R$ + $h$', target: 'alt' }
        ],
        now: function (p, v, st) {
          var x = rNow(p), k = Math.pow(x.b.R / x.r, 2);
          return rLine(x) + ' → ($R$/$r$)² = ' + k.toFixed(2) + ' → 지표의 ' + Math.round(k * 100) + ' %';
        },
        try: { label: '고도 6,400 km($r$ ≈ 2$R$)', preset: 1, set: { alt: 6400 } },
        life: ['지구가 위성을 당기는 힘과 위성이 지구를 당기는 힘은 크기가 같고 방향이 반대예요(작용·반작용).', '달의 중력이 바닷물을 당겨 생기는 밀물·썰물(조석).', '같은 위성이 고도 400 km 에서는 지표의 89 %, 36,000 km 에서는 약 2 % 의 중력을 받아요.'],
        svg: function (D) {
          var ex = 160, cy = 200, xs = [300, 440, 580], L = [90, 22.5, 10];
          var kids = [circle(ex, cy, 70, EARTH), D.label(ex, cy, '지구', { anchor: 'middle', weight: 500, bg: false })];
          xs.forEach(function (x, i) {
            kids.push(sat(x, cy), D.arrow(x - 12, cy, x - 12 - L[i], cy, { kind: 'f' }));
            kids.push(D.line(x, cy + 14, x, 300 + i * 50, { color: 'muted', w: 1.5, dash: '4 5' }));
          });
          kids.push(D.label(xs[0] - 57, cy - 40, '$F$', { anchor: 'middle', color: 'var(--color-copper-text)', weight: 500, sym: 'F' }),
            D.frac(xs[1] - 20, cy - 46, '$F$', '4', { color: 'var(--color-copper-text)' }),
            D.frac(xs[2] - 14, cy - 46, '$F$', '9', { color: 'var(--color-copper-text)' }));
          kids.push(D.line(ex, cy + 72, ex, 400, { color: 'muted', w: 1.5, dash: '4 5' }),
            D.dim(ex, 300, xs[0], 300, '$r$', { off: -16 }), D.dim(ex, 350, xs[1], 350, '2$r$', { off: -16 }), D.dim(ex, 400, xs[2], 400, '3$r$', { off: -16 }));
          kids.push(D.label(790, 430, '거리 2배 → 힘 4분의 1', { anchor: 'end', size: 20, color: 'muted' }));
          return D.svg(kids, { title: '거리에 따른 중력의 세기 (모식도)', how: '구리색 화살표 길이 = 중력의 크기 — 1 : 4분의 1 : 9분의 1 (거리 $r$, 2$r$, 3$r$)' });
        },
        teacherNote: '수식 암기가 아니라 "멀수록 약해지고 0은 아니다"가 핵심이에요. 해 보기의 고도 6,400 km 는 $r$ ≈ 2$R$ 이라 계기 약 25 %.' },

      /* 4장 */
      { id: 'orbit-speed', type: 'formula', title: '원궤도 속력',
        body: [
          '위성에서는 **중력이 구심력**이에요. 중력과 구심력을 같게 놓으면 양쪽의 위성 질량 $m$ 이 약분돼요.',
          '그래서 $v$ 는 $m$ 과 무관하고 $M$ 과 $r$ 로 정해져요.'
        ],
        eq: [{ tex: '$v$ = √', frac: ['$GM$', '$r$'], caption: '$m$ 이 없어요 · 주기 $T$ = 2π$r$/$v$' }],
        symbols: [
          { sym: '$v$', target: { sat: 'meter:v', cannon: 'v0' } }, { sym: '$M$', target: 'body' }, { sym: '$T$', target: 'meter:T' }
        ],
        now: function (p, v, st) {
          var x = rNow(p);
          if (hush(st)) return rLine(x) + ' → ▶ 실행하면 $v$ 를 확인해요';
          var vv = vCirc(x.b, x.r), T = 2 * Math.PI * x.r / vv;
          return rLine(x) + ' → $v$ = √($GM$/$r$) ≈ ' + f1(vv) + ' km/s' + (p.mode === 'sat' ? ', $T$ ≈ ' + periodText(T) : '');
        },
        more: { title: '더 알아보기 — 유도와 예', body: ['중력 {{frac:$GMm$|$r^2$}} = 구심력 {{frac:$mv^2$|$r$}} → $v^2$ = {{frac:$GM$|$r$}}. $r$ 가 클수록 $v$ 가 작고 주기 $T$ 가 길어요.', 'ISS: $h$ = 400 km → $r$ = 6,771 km, $v$ ≈ 7.7 km/s, $T$ ≈ 92 분. 위성 질량을 100 → 10,000 kg 으로 바꿔도 $v$ 는 같아요.'] },
        svg: function (D) {
          var cx = 215, cy = 300, Re = 120, rs = 200, sx = cx + rs * Math.cos(Math.PI / 4), sy = cy - rs * Math.sin(Math.PI / 4);
          var ux = (cx - sx) / rs, uy = (cy - sy) / rs;
          return D.svg([
            circle(cx, cy, Re, EARTH), D.label(cx - 20, cy + 60, '지구', { anchor: 'middle', weight: 500, bg: false }),
            orbit(cx, cy, rs), sat(sx, sy), D.dots([[cx, cy]], { r: 4, color: 'ink' }),
            D.arrow(sx + ux * 14, sy + uy * 14, sx + ux * 80, sy + uy * 80, { kind: 'f' }),
            D.label(sx + ux * 80 - 8, sy + uy * 80 + 30, '중력 $F$ = 구심력', { anchor: 'middle', color: 'var(--color-copper-text)', weight: 500 }),
            D.arrow(sx + 12, sy + 12, sx + 66, sy + 66, { kind: 'v', label: '$v$', sym: 'v' }),
            rect(470, 70, 300, 250, 'fill:var(--color-paper-raised);stroke:var(--color-line-strong);stroke-width:1.5'),
            D.label(500, 112, '$v$ = √', { size: 30, weight: 500, sym: 'v' }), D.frac(612, 112, '$GM$', '$r$', { size: 28 }),
            D.label(500, 185, '$m$ 은 약분 →', { size: 20, color: 'muted' }), D.label(650, 185, '$m$', { size: 24, color: 'muted', sym: 'm' }),
            D.line(638, 196, 664, 174, { color: 'warn', w: 2.5 }),
            D.label(500, 230, '$M$ 중심 천체 질량', { size: 19, sym: 'M' }), D.label(500, 262, '$r$ 중심에서의 거리 (km)', { size: 19, sym: 'r' }),
            D.label(500, 294, '$v$ 궤도 속력 (km/s)', { size: 19 })
          ], { title: '중력 = 구심력 (모식도)', how: '중심을 향한 중력이 원운동의 구심력 — 식에서 위성 질량 $m$ 이 지워져요' });
        },
        teacherNote: '위성 모드의 순서 칩 — 질량만 바꾸기(100 → 1,000 → 10,000 kg)와 이어서 써요.' },

      /* 5장 */
      { id: 'orbit-heights', type: 'diagram', title: '높은 궤도일수록 느려요',
        body: [
          '높이 올라갈수록 중력이 약해져서 천천히 돌아도 궤도를 지켜요.',
          'ISS(400 km)는 7.7 km/s 로 약 92분, GPS(20,200 km)는 3.9 km/s 로 약 12시간, 정지궤도(35,786 km)는 3.1 km/s 로 약 24시간이에요.',
          '정지궤도 위성은 지구 자전과 같은 주기라서 적도 위 한 곳에 머물러 보여요.'
        ],
        now: function (p, v, st) {
          var x = rNow(p);
          if (p.mode !== 'sat') return '위성 모드에서 고도 $h$ 를 바꿔 봐요';
          if (hush(st)) return rLine(x) + ' → ▶ 실행하면 $v$ 를 확인해요';
          var vv = vCirc(x.b, x.r);
          return rLine(x) + ' → $v$ ≈ ' + f1(vv) + ' km/s, $T$ ≈ ' + periodText(2 * Math.PI * x.r / vv);
        },
        try: { label: '실험 ③ — 고도 400 → 20,200 → 35,786 km', preset: 2, set: { alt: 400 } },
        more: { title: '더 알아보기 (교육과정 밖·정성)', body: ['에너지를 더해 더 높은 궤도로 올라가면 새 원궤도의 속력은 처음보다 작아요. 공기 저항으로 에너지를 잃으면 궤도가 낮아지며 속력은 커져요.'] },
        svg: function (D) {
          // R7-2: 바깥 궤도가 그림 제목과 겹치지 않게(위 끝 y 70) · 라벨은 궤도 바깥 오른쪽에 leader 선 + 바탕(잘림 0)
          var cx = 200, cy = 262, rs = [94, 144, 192], vs = [80, 55, 40];
          var txt = ['ISS 7.7 km/s · 약 92분', 'GPS 3.9 km/s · 약 12시간', '정지궤도 3.1 km/s · 약 24시간'], ly = [190, 135, 80];
          var kids = [circle(cx, cy, 62, EARTH), D.label(cx, cy, '지구', { anchor: 'middle', weight: 500, bg: false })];
          rs.forEach(function (r) { kids.push(orbit(cx, cy, r)); });
          rs.forEach(function (r, i) {
            kids.push(sat(cx, cy - r), D.arrow(cx + 13, cy - r, cx + 13 + vs[i], cy - r, { kind: 'v' }));
            var ex = cx + 13 + vs[i] + 6;
            kids.push(D.line(ex, cy - r, 450, ly[i], { color: 'muted', w: 1.5 }), D.dots([[450, ly[i]]], { r: 3, color: 'muted' }));
            kids.push(D.label(462, ly[i], txt[i], { size: 21 }));
          });
          kids.push(D.label(785, 430, '화살표 길이 = 속력 (안쪽일수록 빨라요)', { size: 20, color: 'muted', anchor: 'end' }));
          return D.svg(kids, { title: '높이에 따른 세 궤도 (모식도, 축척 아님)', how: '안쪽 궤도일수록 화살표(속력)가 길고 한 바퀴 시간은 짧아요' });
        },
        teacherNote: '실험 ③ 의 순서 칩(ISS → GPS → 정지궤도)으로 세 번 기록해 비교해요.' },

      /* 6장 */
      { id: 'weightless', type: 'concept', title: '무중력의 정체',
        body: [
          'ISS 높이에서도 중력은 지표의 약 89 % 예요. 우주인이 뜨는 건 **정거장과 함께 떨어지기** 때문이에요.',
          '줄 끊긴 엘리베이터 안에서 몸이 뜨는 것과 같아요.',
          '"무중력"은 중력이 0이 아니라 바닥이 나를 받치지 않는 상태예요.'
        ],
        eq: [{ tex: "$g'$ =", frac: ['$GM$', '$r^2$'], after: '≈ 8.7 m/s²', caption: 'ISS 와 우주인의 가속도가 같아요' }],
        now: function (p) { var x = rNow(p), k = Math.pow(x.b.R / x.r, 2); return rLine(x) + " → $g'$ ≈ " + f1(9.8 * k) + ' m/s² (지표의 ' + Math.round(k * 100) + ' %)'; },
        try: { label: '실험 ② — 계기 "지표 $g$ 대비" 89 % 확인', preset: 1 },
        life: ['롤러코스터가 급히 내려갈 때 몸이 뜨는 느낌.', '포물선 비행(무중력 체험 비행기).'],
        svg: function (D) {
          return D.svg([
            circle(400, 960, 600, EARTH), orbit(400, 960, 690),
            D.label(120, 430, '지구', { weight: 500 }),
            D.box(325, 215, 150, 70, { color: 'muted', fill: 'paper' }), D.label(400, 200, 'ISS', { anchor: 'middle', weight: 500 }),
            person(395, 228, D),
            D.arrow(400, 290, 400, 352, { kind: 'f' }), D.arrow(455, 290, 455, 352, { kind: 'f' }),
            D.label(470, 335, '같은 중력 가속도', { color: 'var(--color-copper-text)' }),
            D.arrow(478, 250, 556, 250, { kind: 'v', label: '옆 속도', lx: 566, ly: 250 }),
            rect(620, 70, 90, 110, 'fill:none;stroke:var(--color-ink-muted);stroke-width:2'),
            person(665, 98, D), D.arrow(740, 90, 740, 170, { kind: 'f' }),
            D.label(665, 205, '줄 끊긴 엘리베이터', { anchor: 'middle', size: 18, color: 'muted' })
          ], { title: '함께 떨어지는 우주정거장 (모식도)', how: '정거장과 우주인이 같은 가속도로 떨어져 바닥이 우주인을 받치지 않아요' });
        },
        teacherNote: '실험 ② 의 질문은 "질량이 바뀌어도 속력은?" — 이 장에서는 "그래서 뜨는 이유"를 구분해서 말해 줘요.' },

      /* 7장 */
      { id: 'escape', type: 'formula', title: '탈출 속도',
        body: [
          '충분히 빨리 쏘면 돌아오지 않아요. 그 경계가 **탈출 속도** $v_{esc}$ 로, 원궤도 속력의 √2 배예요.',
          '천체마다 달라요(달 2.4 · 화성 5.0 · 지구 11.2 km/s). 탈출해도 중력은 0이 아니에요.'
        ],
        eq: [{ tex: '$v_{esc}$ = √', frac: ['2$GM$', '$r$'], after: '= √2 $v$', caption: '지표에서 쏘면 $r$ = $R$' }],
        symbols: [{ sym: '$v_{esc}$', name: '탈출 속도 (속력 띠 눈금)', unit: 'km/s', target: 'stage:vband' }],
        now: function (p, v, st) {
          var b = bodyOf(p);
          if (p.mode === 'sat') return '대포 모드에서 천체를 바꿔 봐요 (지구 $v_{esc}$ ≈ 11.2 km/s)';
          if (hush(st)) return b.name + ': $v_0$ = ' + f1(p.v0) + ' km/s → ▶ 실행해서 탈출하는지 봐요';
          var ve = Math.sqrt(2 * G * b.M / (b.R * 1000)) / 1000;
          return b.name + ': $v_{esc}$ = √(2$GM$/$R$) ≈ ' + f1(ve) + ' km/s · $v_0$ = ' + f1(p.v0) + ' km/s → ' + (p.v0 >= ve ? '탈출' : '돌아와요');
        },
        try: { label: '$v_0$ 를 √2 배로 — 7.9 → 11.2 km/s', preset: 0, set: { v0: 11.2 } },
        more: { title: '더 알아보기 — 에너지로 보기', body: ['처음 운동 에너지 ½$mv^2$ 이 중력 위치 에너지의 크기 {{frac:$GMm$|$r$}} 이상이면 돌아오지 않아요 → $v_{esc}$ = √(2$GM$/$r$).', '실험 속력 띠(지구): $v_0$ < 7.9 추락 · 7.9 ≤ $v_0$ < 11.2 궤도 · $v_0$ ≥ 11.2 탈출. 목성은 59.5 km/s.'] },
        life: ['달에 대기가 거의 없는 까닭(약한 중력에서 기체가 빠져나감).', '로켓이 지구를 벗어나려면 아주 큰 속력이 필요한 까닭.'],
        svg: function (D) {
          var X = function (v) { return 60 + 680 * v / 13; }, by = 70, bh = 40;
          var x79 = X(7.9), x112 = X(11.2);
          var kids = [
            rect(X(0), by, x79 - X(0), bh, 'fill:var(--color-warn-tint)'), rect(x79, by, x112 - x79, bh, 'fill:var(--color-ok-tint)'), rect(x112, by, X(13) - x112, bh, 'fill:var(--color-primary-tint)'),
            rect(X(0), by, X(13) - X(0), bh, 'fill:none;stroke:var(--color-line-strong);stroke-width:1.5'),
            D.label((X(0) + x79) / 2, by + bh / 2, '추락', { anchor: 'middle', weight: 500, bg: false }),
            D.label((x79 + x112) / 2, by + bh / 2, '궤도', { anchor: 'middle', weight: 500, bg: false }),
            D.label((x112 + X(13)) / 2, by + bh / 2, '탈출', { anchor: 'middle', weight: 500, bg: false }),
            D.line(x79, by, x79, by + bh + 8, { color: 'ink', w: 2.5 }), D.line(x112, by, x112, by + bh + 8, { color: 'ink', w: 2.5 }),
            D.label(X(0), by + bh + 24, '0', { anchor: 'middle', size: 20, color: 'muted' }),
            D.label(x79, by + bh + 24, '7.9', { anchor: 'middle', size: 20, weight: 500 }),
            D.label(x112, by + bh + 24, '11.2', { anchor: 'middle', size: 20, weight: 500, sym: 'v_esc' }),
            D.label(X(13), by + bh + 24, 'km/s', { anchor: 'end', size: 20, color: 'muted' }),
            D.label(60, 190, '천체마다 탈출 속도 (km/s)', { size: 20, color: 'muted' })
          ];
          var BX = function (v) { return 150 + 560 * v / 13; };
          [['moon', '달', 2.4], ['mars', '화성', 5.0], ['earth', '지구', 11.2], ['jupiter', '목성', 59.5]].forEach(function (b, i) {
            var y = 232 + i * 52, end = Math.min(BX(b[2]), BX(13));
            kids.push(D.label(60, y, b[1], { weight: 500 }), bodyIcon(124, y, 13, b[0]));
            kids.push(rect(150, y - 14, end - 150, 28, 'fill:var(--sim-tint);stroke:var(--sim);stroke-width:2'));
            if (b[2] > 13) kids.push('<path d="M' + (end - 26) + ' ' + (y - 20) + ' l8 40 M' + (end - 14) + ' ' + (y - 20) + ' l8 40" style="stroke:var(--color-paper-raised);stroke-width:6"/>', D.label(end + 8, y, '59.5', { size: 20, weight: 500 }));
            else kids.push(D.label(Math.abs(end - BX(3)) < 40 ? BX(3) + 10 : end + 10, y, String(b[2].toFixed(1)), { size: 20, weight: 500 }));
          });
          kids.push(D.line(BX(3), 205, BX(3), 410, { color: 'warn', w: 2, dash: '6 5' }), D.label(BX(3), 428, '3 km/s', { anchor: 'middle', size: 20, color: 'warn' }));
          return D.svg(kids, { title: '속력 띠와 탈출 속도', how: '위: 지구에서 쏜 속력 구간(숫자는 띠 아래 줄) · 아래: 3 km/s 선에 못 미치는 막대는 달뿐 — 3 km/s 로 쏘면 달에서만 탈출해요' });
        },
        teacherNote: '실험 ⑤ "3 km/s로 쏘면?"에서 달만 탈출함을 확인해요. 정량 유도는 ½$mv^2$ = $GMm$/$r$ 한 줄로 충분해요.' },

      /* 8장 */
      { id: 'kepler-1', type: 'diagram', title: '멀수록 1년이 더 길어요',
        body: [
          '지구는 태양에서 1 AU 떨어져 1년에 한 바퀴, 목성은 5.2 AU 에서 약 11.9년이 걸려요.',
          '거리가 늘수록 주기는 거리보다 더 빨리 길어져요. 거리가 4배면 주기는 8배예요.',
          '이 장은 자료를 읽어 규칙을 찾는 활동이에요(타원 궤도의 정량 설명은 하지 않아요).'
        ],
        try: { label: '실험 ④ — 행성 자료 넣기', preset: 3 },
        svg: function (D) {
          var ox = 110, oy = 400, W = 620, H = 320, AX = 10, TY = 30;
          var mx = function (a) { return ox + W * a / AX; }, my = function (t) { return oy - H * t / TY; };
          var P = [['수성', 0.387, 0.241, -1], ['금성', 0.723, 0.615, 1], ['지구', 1.0, 1.0, -1], ['화성', 1.524, 1.881, 1], ['목성', 5.203, 11.86, 1], ['토성', 9.537, 29.46, 1]];
          var curve = []; for (var a = 0; a <= 9.8; a += 0.2) curve.push([mx(a), my(Math.pow(a, 1.5))]);
          var kids = [
            D.axis(ox, oy, W + 30, H + 20, { xl: '$a$ (AU)', yl: '$T$ (년)', ticks: [{ v: W * 5 / AX, t: '5' }, { v: W, t: '10' }], yticks: [{ v: H * 10 / TY, t: '10' }, { v: H * 20 / TY, t: '20' }, { v: H, t: '30' }] }),
            D.curve(curve, { color: 'sim', w: 2.5 }),
            D.line(ox, oy, mx(10), my(10), { color: 'muted', w: 2, dash: '8 6' }), D.label(mx(9.6), my(10) + 26, '기울기 1 직선', { color: 'muted', size: 19, anchor: 'end' })
          ];
          P.forEach(function (q, i) {
            kids.push(D.dots([[mx(q[1]), my(q[2])]], { r: 6 }));
            if (i < 4) kids.push(D.label(mx(q[1]) + 6, my(q[2]) + q[3] * (18 + i * 6), q[0], { size: 17, anchor: 'start' }));
            else kids.push(D.label(mx(q[1]) - 12, my(q[2]) - 6, q[0], { anchor: 'end' }));
          });
          return D.svg(kids, { title: '행성 자료: $T$ – $a$', how: '여섯 점이 위로 휘는 곡선 위에 — 직선(점선)이 아니에요. 멀수록 주기가 거리보다 더 빨리 길어져요' });
        },
        teacherNote: '[12역학01-04] 의 취지(관측 → 법칙 → 중력의 과학사)를 한 줄 곁들이면 좋아요.' },

      /* 9장 */
      { id: 'kepler-2', type: 'formula', title: '$T^2$ 과 $a^3$ 은 같은 비율',
        body: [
          '$T^2$ 과 $a^3$ 을 계산하면 거의 같아요(케플러 제3법칙).',
          '그래서 $T^2$ – $a^3$ 그래프는 원점을 지나는 기울기 1 직선이에요(AU · 년). 예: 화성 $a^3$ ≈ $T^2$ ≈ 3.54.'
        ],
        eq: [{ tex: '$T^2$ ∝ $a^3$', caption: '$a$ 긴반지름(원에서는 $r$)' }],
        symbols: [{ sym: '$T$', target: 'meter:T' }, { sym: '$r$', target: 'alt' }],
        now: function (p, v, st) {
          if (p.mode !== 'sat') return '위성 모드에서 고도를 바꾸면 $T^2$ ∝ $r^3$ 을 확인할 수 있어요';
          var x = rNow(p);
          if (hush(st)) return rLine(x) + ' → ▶ 실행하면 $T$ 를 확인해요';
          var vv = vCirc(x.b, x.r);
          return rLine(x) + ' → $T$ = 2π$r$/$v$ ≈ ' + periodText(2 * Math.PI * x.r / vv);
        },
        try: { label: '실험 ④ — 그래프 축을 $T^2$ – $a^3$ 으로', preset: 3, set: { gaxis: 'sq' } },
        more: { title: '더 알아보기', body: ['원궤도라면 4장의 $v$ = √($GM$/$r$) 와 $T$ = 2π$r$/$v$ 에서 $T^2$ = {{frac:4$π^2$|$GM$}} $r^3$ — 같은 결론이 나와요.', '달의 공전 주기(약 27.3일)를 알면 같은 식으로 달 궤도 반지름(약 38만 km)을 구할 수 있어요.'] },
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
            D.label(mx(140.8) + 14, my(140.7) + 6, '목성'), D.label(mx(867.4) - 14, my(867.9) + 4, '토성', { anchor: 'end' }),
            D.dots([[ox, oy]], { r: 6 }), D.label(ox + 14, oy - 24, '원점 근처 4개 → 오른쪽 확대', { size: 18, color: 'muted' }),
            rect(ix - 40, iy - IH - 28, IW + 64, IH + 54, 'fill:var(--color-paper-raised);stroke:var(--color-line-strong);stroke-width:1.5'),
            D.line(ix, iy, ix + IW + 10, iy, { w: 1.5 }), D.line(ix, iy, ix, iy - IH - 10, { w: 1.5 }),
            D.label(ix - 8, iy, '0', { anchor: 'end', size: 16, color: 'muted' }), D.label(nx(4), iy + 15, '4', { anchor: 'middle', size: 16, color: 'muted' }), D.label(ix - 8, ny(4), '4', { anchor: 'end', size: 16, color: 'muted' }),
            D.line(nx(0), ny(0), nx(4), ny(4), { color: 'muted', w: 1.5, dash: '6 5' })
          ];
          inner.forEach(function (p) {
            kids.push(D.dots([[nx(p[1]), ny(p[1])]], { r: 5 }));
            kids.push(p[0] === '금성' ? D.label(nx(p[1]) + 4, ny(p[1]) - 20, p[0], { size: 17, anchor: 'middle' }) : D.label(nx(p[1]) + (p[2] > 0 ? 8 : -8), ny(p[1]) + p[2] * 15, p[0], { size: 17, anchor: p[2] > 0 ? 'start' : 'end' }));
          });
          return D.svg(kids, { title: '행성 자료: $T^2$ – $a^3$', how: '행성 여섯 점이 원점을 지나는 기울기 1 직선 위에 놓여요 (단위 AU · 년)' });
        },
        teacherNote: '케플러 자료 모드는 "자료 읽기 활동"으로 해요. 원궤도에서만 식으로 유도하고, 타원은 이 규칙이 성립한다는 사실만 알려 줘요.' },

      /* 10장 */
      { id: 'misc', type: 'misconception', title: '흔한 오해 4가지',
        items: [
          { id: 'no-gravity', claim: '"우주에는 중력이 없어요."', chapter: 'inverse-square',
            why: '400 km 높이에서도 중력은 지표의 약 89 % — 중력이 있어서 위성이 돌아요.',
            try: { preset: 1 }, result: '계기 "지표 $g$ 대비" 약 89 % — 중력은 있어요.' },
          { id: 'heavy-fast', claim: '"무거운 위성은 더 빨리 돌아야 해요."', chapter: 'orbit-speed',
            why: '$v$ = √($GM$/$r$) 에 위성 질량 $m$ 이 없어요. 같은 높이면 같은 속력이에요.',
            try: { preset: 1, set: { mass: 10000 } }, result: '10,000 kg 도 7.7 km/s — 100 kg 와 같아요.' },
          { id: 'high-fast', claim: '"높은 궤도의 위성이 더 빨리 돌아요."', chapter: 'orbit-heights',
            why: '$v$ = √($GM$/$r$) 에서 $r$ 이 커지면 $v$ 가 작아요. ISS 7.7 km/s, 정지 위성 3.1 km/s.',
            try: { preset: 2 }, result: '고도 400 → 35,786 km: 속력 7.7 → 3.1 km/s.' },
          { id: 'escape-zero', claim: '"탈출하면 중력이 0이 돼요."', chapter: 'escape',
            why: '탈출은 되돌아오지 않을 만큼 빨리 가는 것 — 중력은 약해질 뿐 0이 아니에요.',
            try: { preset: 0, set: { v0: 11.2, cview: 'far' } }, result: '중력 화살표가 작아질 뿐 끝까지 남아요.' }
        ] },

      /* 11장 */
      { id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        modes: [
          { key: 'mode', value: 'cannon', label: '뉴턴의 대포' },
          { key: 'mode', value: 'sat', label: '원궤도 위성' },
          { key: 'mode', value: 'kepler', label: '케플러 자료' }
        ],
        questions: [
          { q: '20 km 산꼭대기에서 7.9 km/s 로 쏘면? (이어서 4 → 6 → 7.9 → 10 → 11.2)', preset: 0, mode: 'cannon', set: { mode: 'cannon', v0: 7.9 }, chapter: 'cannon' },
          { q: '같은 400 km 높이에서 무거운 위성은 더 빨리 돌까? (질량 $m$ 100 → 10,000 kg)', simple: false, preset: 1, mode: 'sat', set: { mass: 100 }, chapter: 'orbit-speed' },
          { q: '35,786 km 위성은 ISS 보다 빨리 돌까, 천천히 돌까? (고도 $h$)', simple: false, preset: 2, chapter: 'orbit-heights' },
          { q: '태양에서 멀수록 행성의 1년은? ($T^2$ – $a^3$)', simple: false, preset: 3, mode: 'kepler', chapter: 'kepler-2' },
          { q: '3 km/s 로 쏘면 어느 천체에서 탈출할까?', preset: 4, set: { body: 'moon' }, chapter: 'escape' },
          { q: '더 해 보기: $v_0$ 를 √2 배(7.9 → 11.2 km/s) 하면?', simple: false, preset: 0, set: { v0: 11.2 }, predict: false, chapter: 'escape' }
        ],
        teacherNote: '발문: ISS 안의 사람은 왜 뜨는가?(→ 6장) · 3 km/s 로 쏘면 달·화성·지구에서 각각? · 7.9 km/s 와 11.2 km/s 의 비는?(약 1.41 = √2)' },

      /* 정리 모달 전용 (설명 순서에서는 빠진다) */
      { id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: ['위성은 중력을 구심력 삼아 **계속 떨어지며 돌아요**. 그 속력은 위성 자신의 질량과는 무관하고, 중심 천체의 질량 $M$ 과 거리 $r$ 로 정해져요($v$ = √($GM$/$r$)).',
          '탈출하려면 천체마다 정해진 속력 $v_{esc}$ 이상이 필요해요. 자기 점검: "나는 ___ 를 이제 설명할 수 있어요 / 아직 헷갈려요."'],
        quiz: [
          { kind: 'concept', q: '같은 400 km 높이의 원궤도를 도는 위성 두 대의 질량이 10배 차이 나요. 속력은?',
            choices: ['무거운 쪽이 더 빠르다', '가벼운 쪽이 더 빠르다', '두 위성의 속력이 같다'], answerIdx: 2,
            why: '$v$ = √($GM$/$r$) 에 위성 질량 $m$ 이 없어요. 속력은 중심 천체 질량 $M$ 과 거리 $r$ 로만 정해져요.', chapter: 'orbit-speed', try: { preset: 1, set: { mass: 10000 } } },
          { kind: 'calc', q: '지표에서 $g$ = 9.8 m/s² 일 때, 지구 중심에서 지구 반지름의 2배 거리($r$ = 2$R$)에서 중력 가속도는?',
            choices: ['약 2.45 m/s²', '약 4.9 m/s²', '약 1.1 m/s²'], answerIdx: 0,
            why: '$g$ = $GM$/$r^2$ 이라 $r$ 이 2배면 4분의 1 → 9.8 ÷ 4 ≈ 2.45 m/s². (실험: 고도 6,400 km 에서 계기 약 25 %)', chapter: 'inverse-square', try: { preset: 1, set: { alt: 6400 } } },
          { kind: 'misconception', q: '"높은 궤도의 위성일수록 더 빨리 돈다." 맞을까?',
            choices: ['맞다. 높을수록 빨리 돈다', '아니다. 높을수록 느리게 돈다', '높이와 상관없이 같다'], answerIdx: 1,
            why: '$v$ = √($GM$/$r$) 에서 $r$ 이 크면 $v$ 가 작아요. ISS 7.7 km/s, 정지궤도 3.1 km/s.', chapter: 'misc', try: { preset: 2 } }
        ],
        more: [
          { q: '같은 3 km/s 로 쏘면 달·화성·지구 중 어디서 탈출할까?', answer: '달', why: '탈출 속도 달 2.4 < 3 < 화성 5.0 · 지구 11.2 km/s.', chapter: 'escape' },
          { q: '7.9 km/s 와 11.2 km/s 의 비는?', answer: '약 1 : √2 (1 : 1.41)', why: '$v_{esc}$ = √2 $v$ (지표 부근).', chapter: 'escape' },
          { q: '더 높은 원궤도로 옮겨 가면 새 원궤도의 속력은 커질까, 작아질까?', answer: '작아진다', why: '$v$ ∝ 1/√$r$ — 에너지는 더 들지만 높은 원궤도는 느려요.', chapter: 'orbit-heights' }
        ] }
    ],
    links: { cannon: 'cannon', 'orbit-speed': 'orbit-speed', 'orbit-heights': 'orbit-heights', weightless: 'weightless', escape: 'escape', kepler: 'kepler-2' }
  });
})();
