/* =====================================================================
   이중 슬릿: 빛에서 전자 하나까지 — 교과 설명 데이터 (R7 1차, UI팀2 B1)
   원고: docs/교과설명/double-slit-quantum.md (기획B) · 형식: docs/SIMKIT.md §0R7-6
   그림은 인라인 SVG(SimDiagram, viewBox 800×450) — 색은 실험 화면과 같은 토큰:
     광원 상자 --color-ink-muted · 슬릿판 --color-line-strong · 스크린 --color-canvas-dark · 전자 점 --sim-tint
   해 보기: 이 실험은 '빛(physics) / 전자 하나씩(quantum)' 두 갈래라 실험 카드 목록이 갈래마다 다르다.
     질문의 mode('physics'|'quantum') + card(그 갈래의 카드 0~4)를 double-slit-quantum.js 가 받아
     먼저 갈래를 바꾼 뒤 공통 SK.lessonTry 로 넘긴다(preset 은 비워 둔다 — 다른 갈래 카드 이름이 칩에 잘못 뜨지 않게).
   ===================================================================== */
(function () {
  'use strict';
  var SK = window.SimKit;
  if (!SK || !SK.lesson) return;

  var SLIT = 'var(--color-line-strong)', SCR = 'var(--color-canvas-dark)', BOX = 'var(--color-ink-muted)', LIGHT = 'var(--color-paper-raised)';
  var BEAM = 'var(--color-warn)', DOTC = 'var(--sim-tint)';

  /* ── 그림 조각 (문자열) ── */
  function rect(x, y, w, h, fill, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx === undefined ? 4 : o.rx) + '" style="fill:' + fill +
      (o.stroke ? ';stroke:' + o.stroke + ';stroke-width:' + (o.sw || 2) : '') + (o.op !== undefined ? ';opacity:' + o.op : '') + '"/>';
  }
  /** 광원(레이저·전자총) 상자 — 실험 화면처럼 회갈색 상자 + 앞 구멍 */
  function source(D, x, y, kind) {
    var out = rect(x, y - 30, 90, 60, BOX, { rx: 8 }) + rect(x + 86, y - 7, 10, 14, LIGHT, { rx: 1 });
    if (kind === 'electron') for (var i = 0; i < 4; i++) out += D.line(x + 18 + i * 12, y - 14, x + 24 + i * 12, y + 14, { color: 'tint', w: 3 });
    else out += '<circle cx="' + (x + 26) + '" cy="' + y + '" r="9" style="fill:' + BEAM + '"/>';
    return out;
  }
  /** 슬릿판(세로) — 틈 두 개(가운데 y ± sep/2) */
  function plate(x, y, h, sep, gap, o) {
    o = o || {};
    var top = y - h / 2, bot = y + h / 2, a = y - sep / 2, b = y + sep / 2, w = 12, out = '';
    out += rect(x - w / 2, top, w, a - gap / 2 - top, SLIT, { rx: 2 });
    if (o.one) out += rect(x - w / 2, a + gap / 2, w, bot - a - gap / 2, SLIT, { rx: 2 });
    else out += rect(x - w / 2, a + gap / 2, w, b - a - gap, SLIT, { rx: 2 }) + rect(x - w / 2, b + gap / 2, w, bot - b - gap / 2, SLIT, { rx: 2 });
    return out;
  }
  /** 스크린(옆에서 본 세로 띠) + 밝은 줄(가로 막대). bars = [[y, 굵기], …] */
  function screenSide(x, y, w, h, bars, color) {
    var out = rect(x, y - h / 2, w, h, SCR, { rx: 6 });
    (bars || []).forEach(function (b) { out += rect(x + 3, b[0] - b[1] / 2, w - 6, b[1], color || LIGHT, { rx: 2 }); });
    return out;
  }
  /** 사인파 경로 (cx0~cx1, 가운데 cy, 진폭 A, 파장 lam, 위상 ph[rad]) */
  function sine(x0, x1, cy, A, lam, ph) {
    var d = '';
    for (var x = x0; x <= x1; x += 4) {
      var y = cy - A * Math.sin(2 * Math.PI * (x - x0) / lam + (ph || 0));
      d += (x === x0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  /** 같은 씨앗이면 같은 점 (그림이 넘길 때마다 바뀌지 않게) */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  /** 이중 슬릿 무늬를 따르는 점 n 개 (정면에서 본 스크린: x 방향 줄무늬) */
  function fringeDots(x, y, w, h, n, seed, r) {
    var rand = rng(seed), out = '', P = w / 6.2, made = 0, guard = 0;
    while (made < n && guard < n * 60) {
      guard++;
      var u = rand() * w - w / 2, v = rand();
      var I = Math.pow(Math.cos(Math.PI * u / P), 2) * Math.exp(-Math.pow(u / (w * 0.42), 2));
      if (v > I) continue;
      var py = y + 6 + rand() * (h - 12);
      out += '<circle cx="' + (x + w / 2 + u).toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + r + '" style="fill:' + DOTC + '"/>';
      made++;
    }
    return out;
  }
  /** 세로 치수선 — 글은 선 왼쪽(또는 오른쪽)에 (D.dim 글자는 세로선에서 선 위에 놓여서 따로 쓴다) */
  function vdim(D, x, y1, y2, label, right) {
    return D.dim(x, y1, x, y2, '') + D.label(right ? x + 14 : x - 14, (y1 + y2) / 2, label, { anchor: right ? 'start' : 'end', size: 22, bg: true });
  }
  /** 퍼지는 물결(반원 점선) */
  function ripples(D, x, y, rs) {
    return rs.map(function (r) { return D.path('M' + x + ' ' + (y - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + r), { color: 'muted', w: 1.5, dash: '5 6' }); }).join('');
  }

  SK.lesson({
    slug: 'double-slit-quantum',
    title: '빛과 전자는 두 틈을 지나 무엇을 만들까?',
    standards: [
      { code: '12물리03-01', subj: '물리학', text: '빛의 중첩·간섭으로 파동성 설명' },
      { code: '12전자03-01', subj: '전자기와 양자', text: '이중 슬릿으로 입자-파동 이중성(정성)' },
      { code: '12물리03-03', subj: '물리학', text: '연계: 이중성의 기술 활용' },
      { code: '12전자03-02', subj: '전자기와 양자', text: '연계: 중첩과 측정' }
    ],
    simple: ['goal', 'wave-words', 'path-diff', 'dy', 'matter-wave', 'check'],
    chapters: [
      /* 1장 */
      { id: 'goal', type: 'goal', title: '빛과 전자는 두 틈을 지나 무엇을 만들까?',
        question: '전자를 한 개씩 보내도 무늬가 생길까?',
        body: [
          '빛이 두 개의 좁은 틈({{슬릿}})을 지나면 스크린에 밝고 어두운 줄이 번갈아 생겨요. 이것이 **간섭 무늬**예요.',
          '이 장면으로 빛이 파동이라는 증거, 무늬 간격이 무엇으로 정해지는지, 전자와 {{광자}}도 파동처럼 무늬를 만든다는 사실을 배워요.'
        ],
        goals: ['빛의 간섭 무늬가 파동의 증거임을 설명하기', '무늬 간격이 파장·슬릿 간격·거리와 어떻게 이어지는지 찾기', '하나씩 보낸 전자·광자도 쌓이면 무늬가 됨을 확인하기'],
        svg: function (D) {
          var bars = [[225, 22], [185, 14], [265, 14], [145, 8], [305, 8]];
          return D.svg([
            source(D, 50, 225, 'light'),
            D.line(146, 225, 372, 225, { color: BEAM, w: 4 }),
            plate(380, 225, 270, 50, 12),
            ripples(D, 386, 200, [40, 85, 130]), ripples(D, 386, 250, [40, 85, 130]),
            screenSide(668, 225, 34, 300, bars),
            D.label(95, 285, '레이저', { anchor: 'middle', weight: 500 }),
            D.label(380, 384, '이중 슬릿', { anchor: 'middle', weight: 500 }),
            D.label(685, 400, '스크린', { anchor: 'middle', weight: 500 }),
            D.label(714, 225, '밝은 줄', { size: 18, color: 'muted' })
          ], { title: '레이저 — 이중 슬릿 — 스크린', how: '밝은 막대 = 빛이 모여 밝은 줄 · 가운데 줄이 가장 밝아요' });
        },
        teacherNote: '설명 10분 + 실험 20분 + 정리 10분 흐름. 레이저를 눈에 직접 비추지 않기를 한 줄 환기해요.' },

      /* 2장 */
      { id: 'wave-words', type: 'concept', title: '파동의 말: 파장, 위상, 보강과 상쇄',
        body: [
          '{{파장}} $λ$ 는 마루에서 다음 마루까지 거리예요. 빛은 파장에 따라 색이 달라서 빨강은 약 650 nm, 파랑은 약 450 nm 예요. (1 nm = 10⁻⁹ m)',
          '두 파동이 만나면 더해져요(**중첩**). 마루끼리, 골끼리 만나면 커지는 **보강**, 마루와 골이 만나면 지워지는 **상쇄**가 일어나요.',
          '마루와 골이 어긋난 정도를 **위상 차**라고 해요. 정확히 한 파장만큼 어긋나면 다시 같은 모양이라 보강이 돼요.'
        ],
        svg: function (D) {
          var x0 = 170, x1 = 770, lam = 200;
          return D.svg([
            D.label(30, 120, '보강', { weight: 500, size: 24 }), D.label(30, 148, '마루 + 마루', { size: 18, color: 'muted' }),
            D.path(sine(x0, x1, 130, 34, lam, 0), { color: 'muted', w: 1.5, dash: '7 6' }),
            D.path(sine(x0, x1, 130, 68, lam, 0), { color: 'sim', w: 4 }),
            D.dim(220, 46, 420, 46, '$λ$', { off: -18 }),
            D.label(30, 320, '상쇄', { weight: 500, size: 24 }), D.label(30, 348, '마루 + 골', { size: 18, color: 'muted' }),
            D.path(sine(x0, x1, 330, 34, lam, 0), { color: 'muted', w: 1.5 }),
            D.path(sine(x0, x1, 330, 34, lam, Math.PI), { color: 'muted', w: 1.5, dash: '7 6' }),
            D.line(x0, 330, x1, 330, { color: 'sim', w: 4 }),
            D.label(770, 214, '합친 파동: 진폭 2배', { anchor: 'end', size: 18, color: 'sim', bg: true }),
            D.label(770, 400, '합친 파동: 평평(지워짐)', { anchor: 'end', size: 18, color: 'sim', bg: true })
          ], { title: '두 파동이 만날 때', how: '가는 선 = 만나는 두 파동 · 굵은 선 = 더한 결과' });
        },
        life: ['소음 제거 이어폰은 소리와 반대 위상의 소리를 내어 상쇄시켜요.', '수조에서 두 물결이 겹치면 크게 출렁이는 곳과 잔잔한 곳이 생겨요.'] },

      /* 3장 */
      { id: 'path-diff', type: 'diagram', title: '두 틈에서 오는 빛: 경로차',
        body: [
          '레이저 빛이 두 슬릿에 닿으면 두 틈이 새 파동의 출발점이 되어 둥글게 퍼져 나가요({{회절}}).',
          '스크린의 한 점까지 두 틈에서 가는 거리가 다르고, 그 차이를 **{{경로차}}**라고 해요.',
          '경로차가 파장의 정수배(0, $λ$, 2$λ$ …)이면 마루끼리 만나 밝은 줄(보강), 반 파장의 홀수배(½$λ$, 1½$λ$ …)이면 어두운 줄(상쇄)이 돼요.'
        ],
        eq: [{ tex: '$δ$ = $mλ$', caption: '밝은 줄 — 경로차 $δ$ 가 파장의 정수배 ($m$ = 0, 1, 2 …)' }, { tex: '$δ$ = ($m$ + ½)$λ$', caption: '어두운 줄 — 반 파장의 홀수배' }],
        symbols: [{ sym: '$δ$', name: '경로차: 두 틈에서 그 점까지 거리의 차', unit: 'm' }, { sym: '$m$', name: '정수 (가운데 밝은 줄이 0)', unit: '–' }, { sym: '$λ$', name: '파장', unit: 'm' }],
        svg: function (D) {
          var sx = 190, s1 = 195, s2 = 255, scx = 560, O = 225, P = 110;
          return D.svg([
            plate(sx, 225, 300, 60, 12),
            ripples(D, sx + 6, s1, [45, 95]), ripples(D, sx + 6, s2, [45, 95]),
            rect(scx - 6, 70, 12, 310, SCR, { rx: 3 }),
            D.line(sx + 6, s1, scx - 6, O, { color: 'muted', w: 1.5, dash: '6 6' }),
            D.line(sx + 6, s2, scx - 6, O, { color: 'muted', w: 1.5, dash: '6 6' }),
            D.line(sx + 6, s1, scx - 6, P, { color: 'sim', w: 3 }),
            D.line(sx + 6, s2, scx - 6, P, { color: 'sim', w: 3 }),
            D.dots([[scx, O], [scx, P]], { r: 7, color: 'warn' }),
            vdim(D, sx - 30, s1, s2, '$d$'),
            D.label(sx + 18, s1 - 18, '$S_1$', { size: 22 }), D.label(sx + 18, s2 + 22, '$S_2$', { size: 22 }),
            D.label(scx + 18, P, 'P  경로차 $λ$', { weight: 500 }), D.label(scx + 18, P + 28, '첫 밝은 줄', { size: 18, color: 'muted' }),
            D.label(scx + 18, O, 'O  경로차 0', { weight: 500 }), D.label(scx + 18, O + 28, '가운데 밝은 줄', { size: 18, color: 'muted' }),
            D.label(400, 418, '경로차 = 두 길의 길이 차', { anchor: 'middle', size: 20, color: 'muted' })
          ], { title: '두 틈에서 스크린의 한 점까지', how: '굵은 선 두 개 = $S_1$·$S_2$ 에서 P 까지 가는 길 · 아래 길이 조금 더 길어요' });
        },
        life: ['비누막의 무지갯빛은 얇은 막 앞뒤에서 반사한 빛이 간섭해서 생겨요.'],
        teacherNote: '"가운데는 왜 늘 밝을까?" → 두 길의 길이가 같아 경로차가 0이기 때문이에요.' },

      /* 4장 */
      { id: 'dy', type: 'formula', title: '무늬 간격 식 Δy = λL/d',
        body: [
          '이웃한 밝은 줄 사이 간격 $Δy$ 는 {{frac:$λL$|$d$}} 예요. 파장이 길수록, 스크린이 멀수록 넓어지고, 슬릿 간격이 넓을수록 촘촘해져요.',
          '단위를 먼저 맞춰요. 650 nm = 6.5×10⁻⁷ m, 0.25 mm = 2.5×10⁻⁴ m 로 바꿔 넣으면 돼요.',
          '계산 예(실험 기본값): (6.5×10⁻⁷ m × 2.0 m) ÷ 2.5×10⁻⁴ m = 5.2×10⁻³ m = **5.2 mm** — 확대 보기에서 직접 재어 확인해요.'
        ],
        eq: [{ tex: '$Δy$ =', frac: ['$λL$', '$d$'], caption: '이웃한 밝은 줄 사이 간격' }],
        symbols: [
          { sym: '$Δy$', name: '이웃한 밝은 줄 간격', unit: 'm (화면은 mm)' },
          { sym: '$λ$', name: '파장', unit: 'm' },
          { sym: '$L$', name: '슬릿 ~ 스크린 거리', unit: 'm' },
          { sym: '$d$', name: '두 슬릿 사이 간격', unit: 'm' }
        ],
        condition: '슬릿 간격 $d$ 가 거리 $L$ 보다 훨씬 작고($d$ ≪ $L$), 무늬가 가운데 가까이일 때 쓰는 근사식',
        more: { title: '더 알아보기 — 경로차에서 $Δy$ 식까지',
          body: [
            '스크린 위 높이 $y$ 인 점에서 두 틈까지 경로차는 약 $d$ sin $θ$ 예요. 밝은 줄 조건은 $d$ sin $θ$ = $mλ$.',
            '$θ$ 가 작으면 sin $θ$ ≈ tan $θ$ = $y$/$L$ 이므로 $y_m$ = $mλL$/$d$, 이웃한 줄 간격은 $Δy$ = $λL$/$d$ 예요.',
            '조건: $d$ ≪ $L$ 이고 $θ$ 가 작을 때. 생각해 볼 질문 — $d$ 를 0.10 → 0.50 mm 로 바꿔도 이 근사가 잘 맞을까? (시뮬레이터 범위에서는 $θ$ 가 아주 작아 잘 맞아요.)'
          ] },
        svg: function (D) {
          var sx = 150, scx = 600, c = 225, bars = [];
          for (var k = -2; k <= 2; k++) bars.push([c + k * 62, k === 0 ? 16 : 12]);
          return D.svg([
            plate(sx, c, 300, 40, 10),
            D.line(sx + 6, c - 20, scx, c - 124, { color: 'muted', w: 1, dash: '4 6' }), D.line(sx + 6, c + 20, scx, c + 124, { color: 'muted', w: 1, dash: '4 6' }),
            D.line(sx + 6, c - 20, scx, c, { color: 'muted', w: 1, dash: '4 6' }), D.line(sx + 6, c + 20, scx, c, { color: 'muted', w: 1, dash: '4 6' }),
            screenSide(scx, c, 30, 320, bars),
            vdim(D, sx - 30, c - 20, c + 20, '$d$'),
            D.dim(sx, 408, scx, 408, '$L$', { off: -18 }),
            vdim(D, scx + 52, c, c + 62, '$Δy$', true),
            D.label(scx + 15, 52, '스크린', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(sx, 52, '이중 슬릿', { anchor: 'middle', size: 18, color: 'muted' })
          ], { title: '세 길이: 틈 간격 $d$ · 거리 $L$ · 줄 간격 $Δy$', how: '축척 그림이 아니에요 — 실제로는 $d$ 가 $L$ 보다 훨씬 작아요' });
        },
        life: ['무늬 간격을 재면 레이저의 파장을 구할 수 있어요: $λ$ = $Δy$ × $d$ ÷ $L$'],
        teacherNote: '근사 조건은 한 줄만 짚고, 유도는 아래 \'더 알아보기\'로 넘겨요.' },

      /* 5장 */
      { id: 'photon', type: 'concept', title: '빛도 알갱이처럼 와요: 광자와 하나씩 쏘기',
        body: [
          '아주 약한 빛은 **{{광자}}**라는 에너지 알갱이로 도착해요. 광자 하나의 에너지는 $E$ = $hf$ 예요.',
          '광자를 한 개씩 보내면 스크린에 점이 하나씩 찍혀요. 어디에 찍힐지는 미리 알 수 없어요.',
          '그런데 수천 개가 쌓이면 레이저 빛과 같은 줄무늬가 드러나요. 한 개는 입자처럼 도착하고, 많이 모이면 파동의 무늬가 돼요.',
          '광전 효과도 빛이 알갱이로 에너지를 준다는 증거예요.'
        ],
        eq: [{ tex: '$E$ = $hf$', caption: '광자 하나의 에너지' }],
        symbols: [{ sym: '$E$', name: '광자 에너지', unit: 'J' }, { sym: '$h$', name: '플랑크 상수 6.63×10⁻³⁴', unit: 'J·s' }, { sym: '$f$', name: '진동수', unit: 'Hz' }],
        svg: function (D) {
          var out = [], xs = [40, 300, 560], ns = [10, 200, 2000], nm = ['10개', '200개', '2,000개'], rr = [5, 3, 1.6];
          xs.forEach(function (x, i) {
            out.push(rect(x, 70, 200, 290, SCR, { rx: 8 }));
            out.push(fringeDots(x, 70, 200, 290, ns[i], 7 + i * 31, rr[i]));
            out.push(D.label(x + 100, 388, nm[i], { anchor: 'middle', weight: 500 }));
          });
          out.push(D.label(400, 428, '점 하나는 어디 찍힐지 몰라도, 쌓인 모양은 늘 같아요', { anchor: 'middle', size: 18, color: 'muted' }));
          return D.svg(out, { title: '광자를 하나씩 보낼 때 스크린(정면)', how: '왼쪽부터 쌓인 점 10개 · 200개 · 2,000개' });
        },
        life: ['어두운 곳에서 찍은 디지털 사진은 거칠다가(광자가 적음) 노출을 길게 하면 선명해져요.'],
        teacherNote: '"점이 어디 찍힐지 정하는 규칙은?" → 확률로만 말할 수 있어요.' },

      /* 6장 */
      { id: 'matter-wave', type: 'formula', title: '전자도 파동이에요: 물질파 λ = h/p',
        body: [
          '전자를 하나씩 보내도 점이 쌓여 줄무늬가 생겨요. 전자도 파동처럼 간섭해요.',
          '움직이는 입자의 파장을 **물질파 파장**이라 하고 $λ$ = $h$/$p$ 로 써요. 운동량 $p$ 가 클수록 파장이 짧아요.',
          '전자를 전압 $V$ 로 가속하면 운동량이 커져 파장이 짧아지고, 무늬 간격이 좁아져요. $V$ = 1000 V 이면 $λ$ ≈ 38.8 pm (1 pm = 10⁻¹² m), $V$ 를 4배로 하면 $p$ 는 2배, $λ$ 는 ½이에요.',
          '**화면의 줄 간격은 보기 좋게 키운 모형 단위(칸)예요. 실제 간격은 훨씬 좁아요.**'
        ],
        eq: [{ tex: '$λ$ = $h$ / $p$', caption: '물질파(드브로이) 파장' }, { tex: '$p$ = √(2$meV$)', caption: '전압 $V$ 로 가속한 전자의 운동량' }],
        symbols: [{ sym: '$m$', name: '전자 질량 9.11×10⁻³¹', unit: 'kg' }, { sym: '$e$', name: '기본 전하 1.60×10⁻¹⁹', unit: 'C' }, { sym: '$V$', name: '가속 전압', unit: 'V' }],
        svg: function (D) {
          var bars = [[150, 10], [180, 10], [210, 12], [240, 12], [270, 10], [300, 10]];
          return D.svg([
            source(D, 40, 225, 'electron'),
            D.label(85, 285, '전자총', { anchor: 'middle', weight: 500 }), D.label(85, 312, '전압 $V$', { anchor: 'middle', size: 18, color: 'muted' }),
            D.line(136, 225, 330, 225, { color: 'sim', w: 2, dash: '3 8' }),
            plate(340, 225, 230, 34, 10),
            screenSide(560, 225, 30, 230, bars, DOTC),
            D.label(575, 95, '스크린', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(40, 370, '$V$ 1000 V', { size: 20 }), rect(170, 358, 320, 24, 'var(--sim)', { rx: 3 }), D.label(500, 370, '$λ$ ≈ 38.8 pm', { size: 20 }),
            D.label(40, 410, '$V$ 4000 V', { size: 20 }), rect(170, 398, 160, 24, 'var(--sim)', { rx: 3 }), D.label(340, 410, '$λ$ ≈ 19.4 pm (½)', { size: 20 })
          ], { title: '전자를 쏘아도 줄무늬', how: '막대 길이 = 파장 · 전압 4배 → 파장 ½ · 화면 간격은 키운 모형이에요' });
        },
        life: ['전자 현미경은 파장이 아주 짧은 전자의 파동성으로 빛 현미경보다 작은 것을 봐요. (연계 [12물리03-03])'],
        teacherNote: '야구공의 물질파는 너무 짧아 관측할 수 없어요 → 일상에서 파동성이 안 보이는 이유(카드 ③ 작은 구슬과 연결).' },

      /* 7장 */
      { id: 'which-way', type: 'concept', title: '어느 슬릿을 지났는지 알아내면?',
        body: [
          '전자가 어느 슬릿을 지났는지 알아내는 {{측정기}}를 켜면 줄무늬가 사라지고 넓은 띠가 돼요.',
          '사람이 지켜봐서가 아니에요. **어느 길인지 정보가 장치에 남으면** 두 길이 겹칠 수 없어서 간섭이 일어나지 않아요.',
          '무늬는 점이 닿을 확률의 모양이에요(확률 파동). 두 길의 가능성이 열려 있을 때만 간섭이 생겨요.'
        ],
        svg: function (D) {
          var x0 = 300, x1 = 770, cx = 535, P = 48, W = 180;
          function curve(cy, H, inter) {
            var d = '';
            for (var x = x0; x <= x1; x += 3) {
              var u = x - cx, env = Math.exp(-Math.pow(u / W, 2));
              var v = inter ? Math.pow(Math.cos(Math.PI * u / P), 2) * env : 0.5 * env;
              d += (x === x0 ? 'M' : 'L') + x + ' ' + (cy - H * v).toFixed(1);
            }
            return D.path(d, { color: 'sim', w: 3 });
          }
          return D.svg([
            D.label(30, 70, '측정기 끔', { weight: 500 }), plate(190, 150, 110, 34, 9),
            D.line(x0, 190, x1, 190, { color: 'muted', w: 1.5 }), curve(190, 130, true),
            D.label(30, 280, '측정기 켬', { weight: 500 }), plate(190, 360, 110, 34, 9),
            rect(204, 330, 56, 26, 'var(--color-copper-tint)', { rx: 4, stroke: 'var(--color-copper)', sw: 2 }), D.label(232, 384, '기록 장치', { anchor: 'middle', size: 18, color: 'muted', bg: true }),
            D.line(x0, 410, x1, 410, { color: 'muted', w: 1.5 }), curve(410, 130, false),
            D.label(x1, 432, '스크린 위 위치', { anchor: 'end', size: 18, color: 'muted' }),
            D.label(x1, 52, '점이 닿을 확률', { anchor: 'end', size: 18, color: 'muted' })
          ], { title: '측정기에 따라 달라지는 무늬', how: '위 = 봉우리 여러 개(줄무늬) · 아래 = 넓은 봉우리 하나(줄무늬 없음)' });
        },
        life: ['어느 길인지 정보가 남으면 간섭이 사라지는 성질은 양자 기술의 바탕이에요. (연계 [12전자03-02])'],
        teacherNote: '시간이 부족하면 건너뛰고 실험 카드 ④에서 직접 보여 줘도 돼요.' },

      /* 8장 */
      { id: 'life', type: 'life', title: '생활 속 간섭과 이중성',
        body: [
          'CD·DVD 표면의 무지갯빛은 아주 촘촘한 홈에서 나온 빛이 간섭하기 때문이에요. 파장마다 보강되는 방향이 달라 색이 갈라져요.',
          '전자 현미경은 파장이 짧은 전자의 파동성을 이용해 아주 작은 구조를 봐요.',
          '비누막이나 물 위 기름막의 색도 간섭 때문이에요.'
        ],
        svg: function (D) {
          var out = [];
          [30, 290, 550].forEach(function (x) { out.push(rect(x, 60, 220, 290, 'var(--color-paper-raised)', { rx: 12, stroke: 'var(--color-line-strong)', sw: 1.5 })); });
          // CD
          out.push('<circle cx="140" cy="190" r="80" style="fill:var(--color-paper-sunk);stroke:var(--color-ink-muted);stroke-width:2"/><circle cx="140" cy="190" r="14" style="fill:var(--color-paper-raised);stroke:var(--color-ink-muted);stroke-width:2"/>');
          ['var(--color-rec-1)', 'var(--color-rec-2)', 'var(--color-rec-3)'].forEach(function (c, i) {
            var r = 36 + i * 14;
            out.push('<path d="M' + (140 + r * Math.cos(-2.4)).toFixed(1) + ' ' + (190 + r * Math.sin(-2.4)).toFixed(1) + 'A' + r + ' ' + r + ' 0 0 1 ' + (140 + r * Math.cos(-1.2)).toFixed(1) + ' ' + (190 + r * Math.sin(-1.2)).toFixed(1) + '" style="fill:none;stroke:' + c + ';stroke-width:6;stroke-linecap:round"/>');
          });
          out.push(D.label(140, 310, 'CD 무지갯빛', { anchor: 'middle', weight: 500 }));
          // 전자 현미경
          out.push(rect(370, 90, 60, 150, 'var(--color-paper-sunk)', { rx: 6, stroke: 'var(--color-ink-muted)', sw: 2 }));
          [130, 170, 210].forEach(function (y) { out.push('<ellipse cx="400" cy="' + y + '" rx="40" ry="8" style="fill:var(--sim-tint);stroke:var(--sim);stroke-width:2"/>'); });
          out.push(D.line(400, 96, 400, 254, { color: 'sim', w: 2, dash: '3 6' }));
          out.push(rect(360, 256, 80, 12, 'var(--color-ink-muted)', { rx: 2 }));
          out.push(D.label(400, 310, '전자 현미경', { anchor: 'middle', weight: 500 }));
          // 비누막
          out.push(rect(620, 90, 80, 170, 'var(--color-paper-sunk)', { rx: 10, stroke: 'var(--color-ink-muted)', sw: 2 }));
          ['var(--color-rec-3)', 'var(--sim-tint)', 'var(--color-rec-1)', 'var(--color-rec-2)'].forEach(function (c, i) { out.push(rect(624, 110 + i * 36, 72, 18, c, { rx: 3, op: 0.75 })); });
          out.push(D.label(660, 310, '비누막의 색', { anchor: 'middle', weight: 500 }));
          return D.svg(out, { title: '간섭과 이중성을 쓰는 곳', how: '왼쪽부터 CD 표면 · 전자 현미경 · 비누막' });
        },
        teacherNote: '[12물리03-03] 은 연계로만, 깊게 들어가지 않아요.' },

      /* 9장 */
      { id: 'misc', type: 'misconception', title: '흔한 오해',
        items: [
          { claim: '"전자 하나가 둘로 쪼개져 두 슬릿을 지나간다."', why: '전자는 늘 한 개로 도착해요(스크린에 점 하나). 무늬는 전자 하나가 어디에 닿을 확률이 두 길의 간섭으로 정해져서 생겨요.', chapter: 'matter-wave' },
          { claim: '"빛은 파동이라서 입자성은 없다."', why: '약한 빛은 광자가 하나씩 점으로 도착해요. 빛은 상황에 따라 파동과 입자의 성질을 모두 보여요.', chapter: 'photon' },
          { claim: '"무늬 간격은 슬릿 하나의 폭이 정한다."', why: '이웃한 밝은 줄 간격은 $λL$/$d$, 곧 두 슬릿 사이 간격 $d$ 로 정해져요. 슬릿 하나의 폭은 무늬 전체가 퍼지는 바깥 윤곽에 영향을 줘요.', chapter: 'dy' }
        ],
        teacherNote: '보조 오개념: "측정기를 켜면 사람이 봐서 사라진다" · "밝은 줄은 슬릿 수만큼 2개" · "슬릿 하나만 열면 줄 수가 반".' },

      /* 10장 */
      { id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        modes: [{ key: 'entry', value: 'physics', label: '빛으로 해 보기' }, { key: 'entry', value: 'quantum', label: '전자로 해 보기' }],
        questions: [
          { q: '빛이 두 틈을 지나면 어떤 무늬가 생기고, 밝은 줄 간격은 얼마일까?', mode: 'physics', card: 0, cardName: '밝은 줄 간격 재기', chapter: 'path-diff' },
          { q: '빨강을 파랑으로 바꾸면 간격은 어떻게 될까?', mode: 'physics', card: 1, cardName: '빨강과 파랑', chapter: 'dy' },
          { q: '슬릿 간격을 두 배로 하면?', mode: 'physics', card: 2, cardName: '슬릿 간격 2배', chapter: 'dy' },
          { q: '스크린을 더 멀리 두면?', mode: 'physics', card: 3, cardName: '스크린을 멀리', chapter: 'dy' },
          { q: '슬릿을 하나만 열면 줄무늬가 반이 될까?', mode: 'physics', card: 4, cardName: '슬릿 하나만?', chapter: 'misc' },
          { q: '전자를 한 개씩 보내면 처음 점은? 쌓이면?', mode: 'quantum', card: 0, cardName: '전자 하나씩', chapter: 'matter-wave' },
          { q: '광자를 하나씩 보내도 같을까?', mode: 'quantum', card: 1, cardName: '광자 하나씩', chapter: 'photon' },
          { q: '아주 작은 구슬을 보내면?', mode: 'quantum', card: 2, cardName: '작은 구슬이면?', chapter: 'matter-wave' },
          { q: '어느 슬릿인지 알아내는 측정기를 켜면?', mode: 'quantum', card: 3, cardName: '측정기를 켜면?', chapter: 'which-way' },
          { q: '전자도 슬릿 하나면 줄무늬가 사라질까?', mode: 'quantum', card: 4, cardName: '슬릿 하나만?', chapter: 'which-way' },
          { q: '가속 전압을 4배로 하면 간격은?', mode: 'quantum', card: 0, cardName: '전자 하나씩', set: { V: 4000 }, predict: false, chapter: 'matter-wave' }
        ] },

      /* 11장 */
      { id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: [
          '무늬 간격은 $λ$·$L$ 에 비례하고 $d$ 에 반비례해요.',
          '전자·광자는 하나씩 와도 쌓이면 무늬가 돼요.',
          '어느 길인지 정보가 남으면 무늬가 사라져요.'
        ],
        quiz: [
          { q: '슬릿 간격 $d$ 를 0.25 mm 에서 0.50 mm 로 두 배로 하면 무늬 간격은?', choices: ['두 배', '반(½)', '그대로'], answer: 2,
            why: '$Δy$ = $λL$/$d$ 에서 $d$ 가 분모라 두 배면 ½ 이에요. 5.2 → 2.6 mm.', chapter: 'dy' },
          { q: '초록 빛 $λ$ 500 nm, $d$ 0.20 mm, $L$ 1.6 m 이면 $Δy$ 는?', choices: ['2.0 mm', '4.0 mm', '6.4 mm'], answer: 2,
            why: '(500×10⁻⁹ × 1.6) ÷ (0.20×10⁻³) = 4.0×10⁻³ m 예요.', chapter: 'dy' },
          { q: '"전자 한 개가 둘로 쪼개져 두 슬릿을 지난다"는 말은 맞을까?', choices: ['맞다', '아니다'], answer: 2,
            why: '전자는 한 개로 도착해요. 도착할 확률이 두 길의 간섭으로 정해져 쌓이면 무늬가 돼요. 측정기로 어느 길인지 알면 무늬가 사라져요.', chapter: 'which-way' }
        ] }
    ],
    links: { 'path-diff': 'path-diff', dy: 'dy', photon: 'photon', 'which-way': 'which-way', misc: 'misc' }
  });
})();
