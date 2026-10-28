/* =====================================================================
   convex-lens — 볼록렌즈로 상 만들기 (물리 시뮬레이터 실험실)
   성취기준 [12물리03-02] · 물리학 (3) 빛과 물질 · 명세: docs/04_팀장결정서.md §4-5
   공통 틀 SimKit 위에서 동작. 일반 <script> (file:// 동작, module·fetch 없음)

   물리 모델 (내부 계산 전용 — 교육과정 해설에 따라 화면에 식을 띄우지 않는다)
     얇은 렌즈 근사. 길이 단위 cm, 렌즈 중심 = 원점, 물체 쪽(왼쪽)이 음수.
     렌즈 면 높이 y 를 지나는 광선: 나가는 기울기 = 들어오는 기울기 − y / f
     → 물체 거리 s, 상 거리 s′ = s f / (s − f), 배율 m = −s′ / s (모든 광선이 한 점에 모임)
     흐림 지름 b = D·|x_s − s′| / s′ (D = 6 cm, 가운데 구멍이면 3 cm), 선명도 = max(0, 1 − b/3)
   화면 축척 (실험 화면 논리 좌표 1250×700 = u)
     가로 1 cm = 8 u (광학대 −50 ~ +100 cm = x 25 ~ 1225, 렌즈 x = 425)
     세로 1 cm = 14 u (1.75배 늘려 그림 — 직선·교점은 그대로 유지되는 변환)
   시간: 정적인 광학이라 적분이 없다. Space(실행)는 빛이 퍼져 나가는 모습을 천천히 보여 주는 연출이다.
   ===================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     0. 물리 핵심 (DOM 없음 — node 검산에도 그대로 쓴다)
     ------------------------------------------------------------------ */
  var D_LENS = 6;        // 렌즈 지름 (cm)
  var HOLE_D = 3;        // 가림판 가운데 구멍 지름 (cm)
  var FAR_TAN = 0.25;    // 먼 풍경(나무 꼭대기)이 보이는 각의 tan — 상 높이 = f × 0.25
  var Phys = {};

  /** 가림판: 밝기(통과하는 빛의 넓이 비), 흐림에 쓰는 지름, 렌즈 면 높이 y(cm)가 막히는지 */
  Phys.blocker = function (kind) {
    if (kind === 'top') return { bright: 0.5, D: D_LENS, blocked: function (y) { return y > 1e-9; } };   // 가림판 가장자리 = 광축 → 가운데 광선 ③은 지나감
    if (kind === 'hole') {
      var r = HOLE_D / D_LENS;
      return { bright: r * r, D: HOLE_D, blocked: function (y) { return Math.abs(y) > HOLE_D / 2; } };
    }
    return { bright: 1, D: D_LENS, blocked: function () { return false; } };
  };

  /** 상 계산. p = {f, s, h, type} */
  Phys.image = function (p) {
    var r = { f: p.f, far: p.type === 'far' };
    if (r.far) {
      r.s = Infinity; r.si = p.f; r.m = 0; r.hi = -FAR_TAN * p.f; r.kind = 'real';
      return r;
    }
    r.s = p.s;
    var d = p.s - p.f;
    if (Math.abs(d) < 1e-9) { r.si = Infinity; r.m = Infinity; r.hi = null; r.kind = 'none'; return r; }
    r.si = p.s * p.f / d;
    r.m = -r.si / p.s;
    r.hi = r.m * p.h;
    r.kind = r.si > 0 ? 'real' : 'virtual';
    return r;
  };

  /** 스크린 위치(p.screenX)에서 보이는 모습: 흐림 지름 b, 선명도, 스크린 위 상 크기(뒤집히면 음수) */
  Phys.screen = function (p, im) {
    var bl = Phys.blocker(p.blocker);
    var out = { bright: bl.bright, formed: false, b: null, sharp: 0, clear: false, size: null };
    if (im.kind !== 'real') return out;
    out.formed = true;
    out.b = bl.D * Math.abs(p.screenX - im.si) / im.si;
    out.sharp = Math.max(0, 1 - out.b / 3);
    out.clear = out.b < 0.2;
    // 렌즈 중심을 지나는 광선이 스크린에 닿는 높이 = 흐린 무늬의 가운데 (선명할 때는 상 높이와 같다)
    out.size = im.far ? -FAR_TAN * p.screenX : -p.h * p.screenX / p.s;
    return out;
  };

  /** 렌즈 면 높이 yL(cm)을 지나는 광선 — 렌즈 앞 기울기 inS, 렌즈 뒤 기울기 outS (얇은 렌즈 굴절 규칙) */
  Phys.ray = function (p, yL) {
    var inS = p.type === 'far' ? -FAR_TAN : (yL - p.h) / p.s;
    return { y: yL, inS: inS, outS: inS - yL / p.f };
  };

  /** 작도 광선 ①②③ 이 렌즈 면을 지나는 높이 */
  Phys.mainRayHeights = function (p) {
    var r = { 1: p.h, 3: 0 };
    if (Math.abs(p.s - p.f) > 1e-9) r[2] = -p.h * p.f / (p.s - p.f); // 초점을 지나(또는 초점에서 온 듯) 렌즈로
    return r;
  };

  /** 렌즈 뒤 두 직선(y = y0 + outS·x)의 교점. 허상이면 x < 0 (뒤로 늘린 선의 교점) */
  Phys.intersect = function (a, b) {
    var ds = a.outS - b.outS;
    if (Math.abs(ds) < 1e-12) return null;
    var x = (b.y - a.y) / ds;
    return { x: x, y: a.y + a.outS * x };
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = Phys; return; }

  /* ------------------------------------------------------------------
     1. 화면 상수·도우미
     ------------------------------------------------------------------ */
  var SK = window.SimKit;
  var h = SK.h, fmt = SK.fmt, clamp = SK.clamp;
  var LX = 425, SX = 8, SY = 14;            // 렌즈 x, 가로·세로 u/cm
  var AXIS = 380, RAIL = 592, HY = 658;      // 광축 y, 광학대 윗면 y, 손잡이 가운데 y (손잡이 630~686: 실험 화면 안쪽)
  var XL = 25, XR = 1225;                    // −50 cm, +100 cm
  var Y_TOP = AXIS / SY, Y_BOT = -(RAIL - 6 - AXIS) / SY;  // 광선을 그리는 세로 범위(cm)
  var WIN = { x: 1006, y: 12, w: 232, h: 232, top: 36, scale: 9 }; // 정면 보기 창(작게, 접기 가능), 1 cm = 9 u
  var winOpen = true;
  var RAY_SPEED = 560;                       // 실행 연출: 빛이 나아가는 빠르기 (u/s)
  var TYPES = ['arrow', 'candle', 'F', 'far'];
  var BLOCKERS = ['none', 'top', 'hole'];
  var BLOCKER_TEXT = { none: '없음', top: '위 절반', hole: '가운데만 뚫림' };
  var FONT = '"Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif';

  function X(cm) { return LX + cm * SX; }
  function Y(cm) { return AXIS - cm * SY; }
  function C(name) { return SK.color(name); }
  function font(ctx, w, px) { ctx.font = w + ' ' + px + 'px ' + FONT; }
  function isInt(v) { return Math.abs(v - Math.round(v)) < 0.05; }
  /** 거리 글자: 정수 cm (숫자칸에 소수를 직접 넣었으면 소수 1자리) */
  function dist(v, input) {
    if (v === Infinity || v === -Infinity) return '∞';
    if (v === null || v === undefined || isNaN(v)) return '–';
    return (input && !isInt(v)) ? fmt(v, 1) : fmt(Math.round(v), 0);
  }
  function hidden() { return !!SK.params.hideF && !SK.isTeacher(); }

  var animT = 0, maxLen = 1, drag = null, eqOn = false;
  var ghostData = null, committed = null, burst = false, burstTimer = 0, lastRecSig = null;
  var meters = null, rt = null, kindEls = null, eqBtn = null;

  /* ------------------------------------------------------------------
     2. 모양 (단위 높이 1 기준 다각형: u 가로, v 세로) — 옆모습·정면 공통
     ------------------------------------------------------------------ */
  var SHAPES = {
    arrow: [{ part: 'body', pts: [[-0.04, 0], [0.04, 0], [0.04, 0.74], [0.17, 0.72], [0, 1], [-0.17, 0.72], [-0.04, 0.74]] }],
    candle: [
      { part: 'body', pts: [[-0.1, 0], [0.1, 0], [0.1, 0.64], [-0.1, 0.64]] },
      { part: 'body', pts: [[-0.012, 0.64], [0.012, 0.64], [0.012, 0.7], [-0.012, 0.7]] },
      { part: 'flame', pts: [[0, 1], [0.06, 0.92], [0.095, 0.82], [0.07, 0.73], [0, 0.69], [-0.07, 0.73], [-0.095, 0.82], [-0.06, 0.92]] }
    ],
    F: [{ part: 'body', pts: [[-0.07, 0], [0.07, 0], [0.07, 0.48], [0.36, 0.48], [0.36, 0.6], [0.07, 0.6], [0.07, 0.86], [0.5, 0.86], [0.5, 1], [-0.07, 1]] }],
    far: [
      { part: 'trunk', pts: [[-0.06, 0], [0.06, 0], [0.06, 0.3], [-0.06, 0.3]] },
      { part: 'body', pts: [[-0.34, 0.24], [0.34, 0.24], [0, 1]] }
    ]
  };
  /**
   * 모양 그리기. (x0, y0) = 밑점(광축 위), kx·ky = 1 단위가 몇 u 인지 (음수면 뒤집힘)
   * o = {body, flame, trunk 색, alpha, dashed, outline}
   */
  function drawShape(ctx, type, x0, y0, kx, ky, o) {
    var parts = SHAPES[type] || SHAPES.arrow;
    ctx.save();
    ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
    parts.forEach(function (sh) {
      ctx.beginPath();
      sh.pts.forEach(function (pt, i) {
        var px = x0 + pt[0] * kx, py = y0 - pt[1] * ky;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      var col = o[sh.part] || o.body;
      if (o.dashed) {
        ctx.setLineDash([6, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha *= 0.35; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha /= 0.35;
      } else {
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();   // 아주 작은 상도 보이게
      }
    });
    ctx.restore();
  }
  /** 흐린 모양: 원판 위 여러 점에서 겹쳐 그림 (ctx.filter 없는 태블릿에서도 동작) */
  function drawBlurred(ctx, fn, radius, alpha) {
    if (radius < 0.7) { ctx.save(); ctx.globalAlpha = alpha; fn(0, 0); ctx.restore(); return; }
    var pts = [[0, 0]], i;
    for (i = 0; i < 8; i++) pts.push([Math.cos(i * Math.PI / 4) * radius * 0.5, Math.sin(i * Math.PI / 4) * radius * 0.5]);
    for (i = 0; i < 12; i++) pts.push([Math.cos(i * Math.PI / 6 + 0.26) * radius, Math.sin(i * Math.PI / 6 + 0.26) * radius]);
    var a = 1 - Math.pow(1 - Math.min(alpha, 0.97), 1 / pts.length) * 1.0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.15);
    pts.forEach(function (d) { fn(d[0], d[1]); });
    ctx.restore();
  }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
    ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function label(ctx, text, x, y, o) {
    o = o || {};
    font(ctx, o.weight || 600, o.size || 22);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.bg) {
      var w = ctx.measureText(text).width + 16, hh = (o.size || 22) + 12;
      var bx = o.align === 'left' ? x - 8 : o.align === 'right' ? x - w + 8 : x - w / 2;
      ctx.save(); ctx.fillStyle = C(o.bg); ctx.globalAlpha = o.bgAlpha || 0.92;
      roundRect(ctx, bx, y - hh / 2, w, hh, 8); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = C(o.color || '--color-ink');
    ctx.fillText(text, x, y);
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    var words = text.split(' '), lineS = '', yy = y;
    words.forEach(function (w) {
      var test = lineS ? lineS + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && lineS) { ctx.fillText(lineS, x, yy); lineS = w; yy += lh; }
      else lineS = test;
    });
    if (lineS) ctx.fillText(lineS, x, yy);
  }

  /* ------------------------------------------------------------------
     3. SimKit 시작
     ------------------------------------------------------------------ */
  SK.init({
    slug: 'convex-lens',
    title: '볼록렌즈로 상 만들기',
    subject: '물리학 (일반 선택)',
    unit: '(3) 빛과 물질',
    standards: ['12물리03-02'],
    today: '렌즈를 반쯤 가리면 상도 반쪽이 될까?',
    // 단계 이름은 예측·실행·비교·정리 (공통). 예전 '규칙 찾기' → 비교 단계의 [규칙 카드], '생각해 보기' → 정리 단계 질문 판
    stepTasks: [
      { text: '아래 실험 카드를 골라 상이 어디에 생길지 예측해요 (처음이면 ⑤ 추천)' },
      { text: '물체나 초점거리를 바꾸고 ▶ 실행, 스크린을 상이 선명한 곳으로 옮겨요' },
      { text: '기록을 보고 규칙 카드의 빈칸을 채워요 (물체 거리 = 상 거리인 줄을 찾아봐요)', action: { label: '규칙 카드 열기', onClick: function () { ruleCard(); } } },
      { text: '오른쪽 질문에 답하고, 답 확인하기로 이유를 읽어 봐요' }
    ],
    dt: 1 / 120,
    stageFit: true,
    reset: function (p) {
      animT = 0;
      if (committed === null) committed = snap(p);
      SK.ghost = ghostData;        // 직전 = 마지막으로 바꾸기 전의 상 (실행 단위가 아니라 '바꾸기 전' 단위)
      syncUI();
      renderTable();
    },
    step: function (dt) {
      animT += dt;
      // maxLen 은 render 가 잰다. 아직 한 번도 그리지 않았으면(광선 없음 포함) 광학대 길이만큼 연출
      if (animT * RAY_SPEED >= Math.max(maxLen, 300) + 30) {
        var k = Phys.image(SK.params).kind;
        SK.finish(k === 'real' ? '빛이 한 점에 모여 상이 생겼어요 — [기록하기]로 저장해요'
          : k === 'virtual' ? '빛이 모이지 않고 퍼져요 — 렌즈 너머로 보면 허상이 보여요 · [기록하기]로 저장해요'
          : '빛이 나란히 나가 상이 생기지 않아요 — [기록하기]로 저장해요');
      }
    },
    render: render,
    capture: capture,
    save: function () { return { a: animT }; },
    load: function (s) { animT = s.a; },
    status: status,
    onStep: onStep,
    onTeacher: function () { syncUI(); renderTable(); SK.update(); SK.requestRender(); },
    predictOnPreset: true
  });
  SK.el.band.style.gridTemplateColumns = 'minmax(0, 5.6fr) minmax(0, 4.4fr)';
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { SK.requestRender(); });

  /* ------------------------------------------------------------------
     4. 수치 바꾸기 (요구 A) — 패널 맨 위: 초점거리·물체 거리 / 더 많은 설정: 물체 높이·스크린 위치
     ------------------------------------------------------------------ */
  SK.addVar('values', { key: 'f', label: '{{초점거리}}', symbol: 'f', unit: 'cm', min: 5, max: 20, step: 1, value: 10, decimals: 0, ticks: [5, 10, 20], apply: 'live', onChange: changed, hint: '짧을수록 빛을 많이 꺾는 (더 볼록한) 렌즈예요' });
  SK.addVar('values', { key: 's', label: '{{물체 거리}}', symbol: 's', unit: 'cm', min: 3, max: 50, step: 1, value: 30, decimals: 0, ticks: [3, 20, 50], apply: 'live', onChange: changed, hint: '실험 화면의 [물체] 손잡이를 끌어도 돼요' });

  /* ------------------------------------------------------------------
     5. 상황 바꾸기 (요구 B) — 광선 3 · 가림판 · 스크린 · 물체 종류
     ------------------------------------------------------------------ */
  var raysBox = h('div', { class: 'lens-rays', role: 'group', 'aria-label': '작도 광선 켜고 끄기' });
  var raysCtl = h('div', { class: 'ctl' }, [h('div', { class: 'ctl__label' }, ['작도 ', SK.term('광선'), ' 켜고 끄기', h('span', { class: 'apply-ico apply-ico--live', title: '바꾸면 바로 반영돼요', 'aria-label': '바로 반영' }, '⚡')]), raysBox]);
  SK.panel('situation').appendChild(raysCtl);
  [['ray1', '① 평행→초점', '렌즈 축과 나란히 들어와 초점을 지나요'], ['ray2', '② 초점→평행', '앞쪽 초점을 지나 들어와 나란히 나가요'], ['ray3', '③ 중심 직진', '렌즈 한가운데를 꺾이지 않고 곧게 지나요']].forEach(function (r, i) {
    var api = SK.addToggle(raysBox, { key: r[0], label: r[1], value: true, record: false });
    var icon = SK.swatch(SK.recStyle(i));     // 실험 화면의 선 색·모양·굵기 그대로
    icon.setAttribute('class', 'lens-ray-icon');
    var b = api.el.querySelector('.check');
    b.title = r[2];
    var txt = api.el.querySelector('.check__text');
    txt.insertBefore(icon, txt.firstChild);
  });
  SK.addChoice('situation', {
    key: 'blocker', label: '{{가림판}}', apply: 'live', value: 'none', onChange: changed,
    options: [{ value: 'none', label: '없음' }, { value: 'top', label: '위 절반 가림' }, { value: 'hole', label: '가운데만 뚫림' }]
  });
  SK.addToggle('situation', { key: 'screen', label: '스크린 놓기', value: true, record: false, onText: '켬', offText: '끔 (치움)' });
  SK.addChoice('situation', {
    key: 'type', label: '물체 종류', apply: 'live', value: 'arrow',
    onChange: function () { changed(); syncUI(); },
    options: [{ value: 'arrow', label: '화살표' }, { value: 'candle', label: '촛불' }, { value: 'F', label: '글자 F' }, { value: 'far', label: '먼 풍경' }]
  });
  SK.controls.type.el.classList.add('lens-types');

  /* 표시 도구 */
  SK.addToggle('tools', { key: 'marks', label: 'F · 2F 위치 표시', value: true });
  SK.addToggle('tools', { key: 'ruler', label: '거리 눈금 (물체·상 거리)', value: true });
  SK.addToggle('tools', { key: 'fan', label: '렌즈 전체를 지나는 빛 다발', value: false });
  SK.addToggle('tools', { key: 'hideF', label: '초점거리 숨기기 (찾기 탐구)', value: false, onChange: function () { syncUI(); renderTable(); } });

  /* 더 많은 설정: 물체 높이 · 스크린 위치 · 심화 그림 (교육과정 해설: 렌즈 제작자 공식 제외 → 그림으로만) */
  SK.addVar('deep', { key: 'h', label: '물체 높이', unit: 'cm', min: 2, max: 6, step: 1, value: 4, decimals: 0, ticks: [2, 4, 6], apply: 'live', onChange: changed, hint: '높이를 바꿔도 배율은 그대로예요' });
  SK.addVar('deep', { key: 'screenX', label: '스크린 위치', unit: 'cm', min: 5, max: 100, step: 1, value: 15, decimals: 0, ticks: [5, 50, 100], apply: 'live', record: false, hint: '실험 화면의 [스크린] 손잡이를 끌어도 돼요' });
  SK.panel('deep').appendChild(h('div', { class: 'lens-deep' }, [
    h('p', { text: '심화 — 계산 없이 그림으로만 봐요.' }),
    h('button', { class: 'btn', type: 'button', onclick: function (e) { if (e.detail > 0) e.currentTarget.blur(); figureDialog('material'); } }, '렌즈 재료(굴절률 1.5 / 1.7) 비교 ▸'),
    h('button', { class: 'btn', type: 'button', onclick: function (e) { if (e.detail > 0) e.currentTarget.blur(); figureDialog('litho'); } }, '포토리소그래피: 축소 투영 ▸')
  ]));

  /* ------------------------------------------------------------------
     6. 하단 띠: 계기판 4개 | 상의 모습 한 줄 (기록 표는 비교 단계 큰 판)
     ------------------------------------------------------------------ */
  meters = SK.meters(null, [
    { key: 'si', label: '상 거리', unit: 'cm', decimals: 0, size: 'md' },
    { key: 'm', label: '{{배율}}', unit: '배', decimals: 1, size: 'md' },
    { key: 'sharp', label: '{{선명도}}', unit: '%', decimals: 0, size: 'md' }
  ]);
  var siLabel = meters.el.querySelector('.meter[data-key="si"] .meter__label');
  kindEls = {
    main: h('span', { class: 'lens-kind__main', text: '–' }),
    sub: h('span', { class: 'lens-kind__sub', text: '' })
  };
  SK.el.graph.appendChild(h('div', { class: 'lens-kind', 'aria-live': 'polite' }, [h('span', { class: 'lens-kind__label', text: '상의 모습' }), kindEls.main, kindEls.sub]));

  rt = SK.recordTable(null, {
    columns: [
      { key: 'fText', label: 'f', unit: 'cm', from: 'value', priority: 1, changed: function (r, p) { return r.values.fNum !== p.values.fNum; } },
      { key: 'sObjT', label: '물체 거리', unit: 'cm', from: 'value', priority: 1, changed: true },
      { key: 'sImgT', label: '상 거리', unit: 'cm', from: 'value', priority: 1 },
      { key: 'hObjT', label: '물체 크기', unit: 'cm', from: 'value', priority: 2, changed: true },
      { key: 'hImgT', label: '상 크기', unit: 'cm', from: 'value', priority: 2 },
      { key: 'mT', label: '배율', unit: '배', from: 'value', priority: 1 },
      { key: 'orient', label: '바로/거꾸로', unit: '', from: 'value', priority: 1 },
      { key: 'kind', label: '실상/허상', unit: '', from: 'value', priority: 1 },
      { key: 'sharpT', label: '선명도', unit: '%', from: 'value', priority: 2 }
    ]
  });
  eqBtn = h('button', { class: 'btn btn--sm lens-eqbtn', type: 'button', 'aria-pressed': 'false', title: '물체 거리와 상 거리가 같은 기록을 찾아 강조해요' }, '같은 거리 찾기');
  var recHead = rt.el.querySelector('.rec-box__head');
  if (recHead) {
    recHead.insertBefore(eqBtn, recHead.lastChild);
    recHead.insertBefore(h('button', { class: 'btn btn--sm lens-rulebtn', type: 'button', onclick: function (e) { if (e.detail > 0) e.currentTarget.blur(); ruleCard(); } }, '규칙 카드'), recHead.lastChild);
  }
  eqBtn.addEventListener('click', function (e) { if (e.detail > 0) eqBtn.blur(); findEqual(); });
  SK.onRecords(function () {
    if (!SK.records.length) lastRecSig = null;
    if (!SK.ghost) ghostData = null;
    postTable();
  });

  /* ------------------------------------------------------------------
     7. 프리셋 (교과서 탐구·대표 문항 재현)
     ------------------------------------------------------------------ */
  var BASE = { f: 10, h: 4, blocker: 'none', screen: true, ray1: true, ray2: true, ray3: true, hideF: false, fan: false, marks: true, ruler: true };
  function preset(extra) { var o = {}, k; for (k in BASE) o[k] = BASE[k]; for (k in extra) o[k] = extra[k]; return o; }
  function presetApplied() { ghostData = null; SK.ghost = null; committed = snap(SK.params); eqOn = false; eqBtn.setAttribute('aria-pressed', 'false'); syncUI(); renderTable(); }
  SK.setPresets([
    {
      name: '초점거리 찾기', tag: '탐구 재현',
      change: '먼 풍경 → 스크린을 옮겨 선명한 곳 찾기. 이어서 물체를 화살표로 바꿔 40·30·20·15·12 cm 에서 기록',
      fixed: '초점거리는 숨김(선생님이 공개), 광선 끔',
      values: preset({ type: 'far', s: 40, screenX: 30, hideF: true, ray1: false, ray2: false, ray3: false }),
      predict: {
        question: '먼 풍경의 상이 맺히는 곳은 렌즈에서 얼마나 떨어져 있을까?',
        choices: ['초점거리 f 쯤', '초점거리의 2배(2f) 쯤', '렌즈에 거의 붙어서', '아주 멀리(무한히)'],
        answer: 1,
        why: '아주 먼 곳에서 온 빛은 거의 나란히(평행하게) 렌즈에 들어와요. 평행하게 들어온 빛은 초점에 모이니까, 먼 풍경의 상은 렌즈에서 초점거리 f 만큼 떨어진 곳에 생겨요. 그래서 먼 풍경으로 초점거리를 잴 수 있어요.',
        info: '힌트: 평행하게 들어온 빛은 초점에 모여요. ▶ 실행 뒤 [스크린] 손잡이를 끌어 상이 가장 선명한 곳을 찾아요.'
      },
      onApply: function (p) {
        presetApplied(p);
        if (SK.records.length) setTimeout(function () { SK.notice('기록 칸이 ' + (5 - SK.records.length) + '개 남았어요 — 5번 기록하려면 [⋯ 더보기 › 기록 모두 지우기]', 'warn', 5000); }, 50);
      }
    },
    {
      name: '물체를 2f 에', tag: '대표 문항',
      change: '물체 거리 20 cm (= 2f)', fixed: 'f 10 cm, 물체 높이 4 cm, 스크린 20 cm',
      values: preset({ type: 'arrow', s: 20, screenX: 20 }),
      predict: {
        question: '물체를 2f(20 cm)에 두면 상은 어디에, 어떤 크기로 생길까?',
        info: '2f = 초점거리의 2배예요 (f 가 10 cm 이면 20 cm).',
        choices: ['10 cm, 물체보다 작게', '20 cm, 물체와 같은 크기', '40 cm, 물체보다 크게'],
        answer: 2,
        why: '2f 에 둔 물체에서 나온 빛은 반대쪽 2f 에 모여요. 물체 거리와 상 거리가 같으니 상의 크기도 물체와 같고, 거꾸로 서요(배율 1배).'
      },
      onApply: presetApplied
    },
    {
      name: '프로젝터 크게', tag: '생활 속',
      change: '물체(슬라이드 F) 15 cm → 상을 더 크게 하려면?', fixed: 'f 10 cm, 물체 높이 4 cm, 스크린 30 cm',
      values: preset({ type: 'F', s: 15, screenX: 30 }),
      predict: {
        question: '프로젝터 화면(상)을 더 크게 하려면 슬라이드(물체)를 어느 쪽으로 옮길까?',
        choices: ['렌즈 쪽으로 (초점에 더 가깝게)', '렌즈에서 멀리', '어느 쪽이든 같다'],
        answer: 1,
        why: '물체가 초점 밖에서 초점 쪽으로 다가갈수록 상은 렌즈에서 멀어지고 커져요. 그래서 슬라이드를 렌즈 쪽으로 옮기고, 스크린은 더 멀리 옮겨야 선명해요. 단, 초점 안쪽까지 들어가면 스크린에 상이 맺히지 않아요.',
        info: '지금은 물체 15 cm 에서 상이 2배예요. 옮긴 뒤 스크린도 선명한 곳으로 옮겨 보세요.'
      },
      onApply: presetApplied
    },
    {
      name: '돋보기로 보기', tag: '생활 속',
      change: '물체 5 cm (초점 안쪽), 스크린 치움', fixed: 'f 10 cm, 물체 높이 4 cm',
      values: preset({ type: 'F', s: 5, screenX: 15, screen: false }),
      predict: {
        question: '물체를 초점보다 렌즈 가까이(5 cm) 두고 렌즈 너머로 보면 어떻게 보일까?',
        choices: ['거꾸로 선 작은 상', '바로 선 큰 상', '아무것도 안 보인다'],
        answer: 2,
        why: '초점 안쪽 물체에서 나온 빛은 렌즈를 지나도 한 점에 모이지 않고 퍼져요. 눈은 퍼지는 빛을 뒤로 늘인 곳(렌즈 앞쪽)에서 온 것처럼 느껴서, 바로 선 큰 상(허상)을 봐요. 돋보기가 바로 이 원리예요.',
        info: '오른쪽 위 창이 「눈으로 본 모습」으로 바뀌어요.'
      },
      onApply: presetApplied
    },
    {
      name: '렌즈 반 가리기', tag: '오개념',
      change: '가림판으로 렌즈 위 절반 가리기', fixed: 'f 10 cm, 물체 30 cm, 높이 6 cm, 스크린 15 cm',
      values: preset({ type: 'candle', s: 30, h: 6, screenX: 15, blocker: 'top', fan: true }),   // 높이 6: 상(3 cm)이 정면 창에서 모양을 알아볼 만큼 크게
      predict: {
        question: '렌즈 위쪽 절반을 가리면 스크린의 상은 어떻게 될까?',
        choices: ['상이 반쪽만 생긴다', '상은 그대로, 어두워진다', '상이 사라진다'],
        answer: 2,
        why: '물체 한 점에서 나온 빛은 렌즈 어느 부분을 지나도 같은 점에 모여요. 아래 절반으로 지나온 빛만으로도 상 전체가 만들어지고, 빛의 양만 절반으로 줄어요.'
      },
      onApply: presetApplied
    }
  ]);

  /* ------------------------------------------------------------------
     8. 설명 도우미 — ? 도움말(이렇게 해요·개념·용어) · 결과 해설 · 정리 질문
     ------------------------------------------------------------------ */
  /** 도움말 개념 카드용 작은 그림 (인라인 SVG, 색은 토큰) */
  function fig(svg, cap) {
    var d = h('figure', { class: 'lens-fig' });
    d.innerHTML = '<svg viewBox="0 0 520 200" role="img" aria-label="' + cap + '">' + svg + '</svg>';
    d.appendChild(h('figcaption', { text: cap }));
    return d;
  }
  var AX = '<line x1="10" y1="100" x2="510" y2="100" style="stroke:var(--color-line-strong)" stroke-width="1.5" stroke-dasharray="10 6"/>';
  var LENS = '<path d="M260 30 Q280 100 260 170 Q240 100 260 30Z" style="fill:var(--color-primary-tint);stroke:var(--color-primary)" stroke-width="2.5"/>';
  function dot(x, t) { return '<circle cx="' + x + '" cy="100" r="6" style="fill:var(--color-sim-lens)"/><text x="' + x + '" y="124" text-anchor="middle" font-size="22" font-weight="800" style="fill:var(--color-sim-lens-text);stroke:var(--color-paper-raised);stroke-width:6;paint-order:stroke">' + t + '</text>'; }
  function ray(pts, col, dash) { return '<polyline points="' + pts + '" fill="none" style="stroke:' + col + '" stroke-width="3.5"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>'; }
  var FIG_FOCUS = fig(AX + LENS +
    [40, 70, 130, 160].map(function (y) { return ray('20,' + y + ' 260,' + y + ' 380,100 500,' + (100 + (100 - y)), 'var(--color-sim-lens)'); }).join('') +
    dot(380, 'F') + dot(140, 'F') +
    '<text x="320" y="190" text-anchor="middle" font-size="20" style="fill:var(--color-ink-muted)">← 초점거리 f →</text>',
    '나란히 들어온 빛은 렌즈를 지나 초점 F 에 모여요');
  var R1 = SK.recStyle(0), R2 = SK.recStyle(1), R3 = SK.recStyle(2);
  function dashOf(st) { return st.dash && st.dash.length ? st.dash.join(' ') : ''; }
  // 물체 30 cm(=1.5f 가 아닌 3f 비율) 대신 그림용: f=80px, 물체 x=100 (s=160=2f) → 상 x=420 (2f), 같은 크기 거꾸로
  var FIG_RAYS = fig(AX + LENS +
    '<line x1="100" y1="100" x2="100" y2="50" style="stroke:var(--color-ink)" stroke-width="5"/><path d="M90 60 L100 44 L110 60Z" style="fill:var(--color-ink)"/>' +
    ray('100,50 260,50 420,150', R1.color, dashOf(R1)) +
    ray('100,50 260,150 420,150', R2.color, dashOf(R2)) +
    ray('100,50 420,150', R3.color, dashOf(R3)) +
    '<line x1="420" y1="100" x2="420" y2="150" style="stroke:var(--color-sim-lens)" stroke-width="5"/><path d="M410 140 L420 156 L430 140Z" style="fill:var(--color-sim-lens)"/>' +
    dot(180, 'F') + dot(340, 'F') +
    '<text x="100" y="30" text-anchor="middle" font-size="20" font-weight="700" style="fill:var(--color-ink)">물체</text>' +
    '<text x="470" y="170" text-anchor="middle" font-size="20" font-weight="700" style="fill:var(--color-sim-lens-text)">상</text>',
    '세 광선 중 두 개만 그려도 만나는 점이 상의 끝이에요');
  var CASES = h('table', { class: 'lens-cases' }, [
    h('thead', null, h('tr', null, ['물체 위치', '상이 생기는 곳', '상의 모습', '쓰임'].map(function (t) { return h('th', { text: t }); }))),
    h('tbody', null, [
      ['2f 보다 멀리', 'f 와 2f 사이', '거꾸로 · 작은 실상', '카메라, 눈'],
      ['2f', '2f', '거꾸로 · 같은 크기 실상', '같은 크기 복사'],
      ['f 와 2f 사이', '2f 보다 멀리', '거꾸로 · 큰 실상', '프로젝터'],
      ['f (초점)', '생기지 않음', '빛이 나란히 나감', '손전등·서치라이트'],
      ['f 보다 가까이', '렌즈 앞쪽', '바로 선 · 큰 허상', '돋보기']
    ].map(function (r) { return h('tr', null, r.map(function (t) { return h('td', { text: t }); })); }))
  ]);
  var MYTHS = h('ul', { class: 'lens-myths' }, [
    ['렌즈를 반 가리면 상도 반쪽이 된다?', '아니에요. 물체의 한 점에서 나온 빛은 렌즈 모든 부분을 지나 같은 점에 모여요. 남은 절반으로도 상 전체가 생기고, 어두워질 뿐이에요.'],
    ['스크린이 없으면 상도 없다?', '아니에요. 실상은 빛이 실제로 모이는 자리에 생겨요. 스크린은 그 빛을 받아 눈에 보이게 할 뿐이에요.'],
    ['상은 물체 그림이 통째로 날아온 것이다?', '아니에요. 물체의 점 하나하나에서 나온 빛이 각각 한 점에 모여, 점들이 모여 상이 돼요.'],
    ['허상은 가짜라서 볼 수 없다?', '볼 수 있어요. 돋보기 속 글자가 허상이에요. 다만 빛이 실제로 모인 곳이 아니라서 스크린에는 맺히지 않아요.'],
    ['물체를 초점에 두면 상이 가장 크다?', '상이 생기지 않아요. 렌즈를 지난 빛이 나란히 나가서 어디에서도 모이지 않아요.']
  ].map(function (m) { return h('li', null, [h('b', { text: '✗ ' + m[0] }), h('span', { text: '→ ' + m[1] })]); }));

  SK.help({
    how: [
      '{{초점거리}} f 를 고르세요 (기본 10 cm). 짧을수록 빛을 많이 꺾는 렌즈예요.',
      '실험 화면 아래의 [물체] 손잡이를 끌거나 물체 거리 칸에 숫자를 넣어 물체를 옮겨요.',
      '▶ 실행을 누르면 빛이 물체에서 렌즈를 지나 퍼져 나가는 모습이 보여요.',
      '[스크린] 손잡이를 끌어 상이 가장 선명한 곳을 찾아요. 오른쪽 위 창과 계기판의 {{선명도}}를 보세요.',
      '[기록하기]로 저장하고, 물체 거리 하나만 바꿔 다시 해요. 비교 단계에서 규칙 카드를 채워요.'
    ],
    concepts: [
      { title: '초점과 초점거리', formula: '초점거리 f (단위 cm)',
        plain: h('div', { class: 'lens-plain' }, [FIG_FOCUS,
          h('p', { text: '렌즈 축(광축)과 나란히 들어온 빛은 볼록렌즈를 지나 한 점에 모여요. 이 점이 초점 F, 렌즈 가운데에서 초점까지 거리가 초점거리 f 예요. 초점은 렌즈 앞뒤에 하나씩 있어요.' }),
          h('p', { text: '예) 햇빛(아주 먼 곳의 빛)을 돋보기로 모으면 종이 위 작은 점이 뜨거워져요. 그 점까지의 거리가 초점거리예요.' })]),
        live: function (p) { return p.hideF && !SK.isTeacher() ? '초점거리를 숨기고 찾는 중이에요' : 'f = ' + p.f + ' cm → F 는 렌즈 양쪽 ' + p.f + ' cm, 2F 는 ' + (2 * p.f) + ' cm'; } },
      { title: '상을 찾는 세 광선',
        plain: h('div', { class: 'lens-plain' }, [FIG_RAYS,
          h('p', { text: '① 광축과 나란히 들어온 빛 → 렌즈를 지나 뒤쪽 초점을 지나요.' }),
          h('p', { text: '② 앞쪽 초점을 지나 들어온 빛 → 렌즈를 지나 광축과 나란히 나가요.' }),
          h('p', { text: '③ 렌즈 한가운데로 들어온 빛 → 꺾이지 않고 곧게 지나가요.' }),
          h('p', { text: '물체 꼭대기에서 나온 이 빛들이 다시 만나는 곳이 상의 꼭대기예요. 렌즈의 다른 곳을 지난 빛도 모두 같은 점에 모여요.' })]) },
      { title: '실상과 허상',
        plain: h('div', { class: 'lens-plain' }, [
          h('p', { text: '실상: 빛이 실제로 한 점에 모여 생긴 상. 스크린에 맺히고, 볼록렌즈 한 개로 만든 실상은 위아래·좌우가 모두 뒤집혀 있어요. 예) 프로젝터 화면, 카메라 센서·눈의 망막에 맺힌 상.' }),
          h('p', { text: '허상: 빛이 모이지 않고 퍼질 때, 퍼지는 빛을 뒤로 늘인 선이 만나는 곳에 보이는 상. 스크린에는 맺히지 않고 렌즈 너머로 들여다봐야 보여요(바로 섬). 예) 돋보기로 본 큰 글자.' }),
          h('p', { text: '왜 거꾸로 설까? 물체 위쪽에서 나온 빛은 렌즈를 지나며 광축 아래쪽으로 꺾여 모이고, 아래쪽 빛은 위쪽으로 모이기 때문이에요. 글자 F 로 바꿔 보면 좌우도 바뀐 것을 볼 수 있어요.' })]) },
      { title: '물체 위치에 따라 달라지는 상',
        plain: h('div', { class: 'lens-plain' }, [CASES, h('p', { text: '물체가 초점 밖에서 렌즈 쪽으로 다가올수록 실상은 렌즈에서 멀어지고 커져요.' })]),
        live: function (p) {
          if (p.type === 'far') return '지금은 아주 먼 풍경 → 상은 초점(f) 근처';
          var r = p.s / p.f, where = r > 2.02 ? '2f 보다 멀리' : r > 1.98 ? '2f' : r > 1.02 ? 'f 와 2f 사이' : r > 0.98 ? '초점' : 'f 보다 가까이';
          return '물체 ' + dist(p.s, true) + ' cm, f ' + p.f + ' cm → 물체 위치: ' + where;
        } },
      { title: '배율', formula: '배율 = 상 크기 ÷ 물체 크기',
        plain: h('div', { class: 'lens-plain' }, [
          h('p', { text: '상 크기·물체 크기는 둘 다 cm, 배율은 단위가 없는 수(배)예요. 1 보다 크면 확대, 1 보다 작으면 축소, 1 이면 같은 크기예요.' }),
          h('p', { text: '가운데 광선 ③ 으로 생긴 두 삼각형이 닮은꼴이라서, 배율은 「상 거리 ÷ 물체 거리」와도 같아요. 물체 높이를 바꿔도 배율은 그대로예요.' })]),
        live: function (p) {
          var im = Phys.image(p);
          if (hidden()) return '초점거리를 숨기는 동안은 스크린에서 직접 재요';
          if (im.far || im.kind === 'none') return '먼 풍경·초점에서는 배율을 따지지 않아요';
          var m = Math.abs(im.m);
          return '상 크기 ' + fmt(Math.abs(im.hi), 1) + ' cm ÷ 물체 크기 ' + p.h + ' cm = ' + fmt(m, 1) + '배 (' + (m > 1.05 ? '확대' : m < 0.95 ? '축소' : '같은 크기') + ')';
        } },
      { title: '흔한 오해 바로잡기', plain: MYTHS }
    ],
    terms: {
      '볼록렌즈': '가운데가 가장자리보다 두꺼운 렌즈. 나란히 들어온 빛을 한 점(초점)에 모아요',
      '광선': '빛이 나아가는 길을 화살표 선으로 나타낸 것',
      '광축': '렌즈 한가운데를 수직으로 지나는 기준선(실험 화면의 가로 점선)',
      '초점': '광축과 나란히 들어온 빛이 렌즈를 지나 모이는 점. F 로 써요',
      '초점거리': '렌즈 가운데에서 초점까지 거리 f (cm). 짧을수록 빛을 많이 꺾어요',
      '2f': '초점거리의 2배 거리(f 10 cm 이면 20 cm). 화면에는 2F 로 표시해요',
      '물체 거리': '렌즈 가운데에서 물체까지 거리 (cm)',
      '실상': '빛이 실제로 모여 생긴 상. 스크린에 맺히고 거꾸로 서요',
      '허상': '빛이 모이지 않고 퍼질 때 렌즈 너머로 보이는 상. 스크린에 안 맺히고 바로 서요',
      '배율': '상 크기 ÷ 물체 크기. 1 보다 크면 확대, 작으면 축소 (단위 없음, 배)',
      '선명도': '스크린 위 상이 얼마나 또렷한지(%). 상이 생기는 곳에 스크린을 두면 100%',
      '가림판': '렌즈 일부를 가려 빛이 못 지나가게 하는 판',
      '광학대': '렌즈·물체·스크린을 한 줄로 놓고 거리를 재는 눈금 받침대'
    },
    keys: [['Q / W / E', '광선 ①②③ 켜고 끄기'], ['D', '가림판 바꾸기'], ['I', '스크린 놓기 / 치우기'], ['O', '물체 종류 바꾸기'], ['G', '규칙 카드']]
  });

  /** 실행이 끝나면 '이 실험이 보여 주는 것' — 지금 상황에 맞는 한두 문장 (프리셋 5종 + 그 밖) */
  SK.takeaway(function (p) {
    var im = Phys.image(p);
    if (p.blocker !== 'none') return '렌즈를 가려도 상은 그대로 생겨요. 물체 한 점의 빛이 렌즈 어디를 지나도 같은 점에 모이기 때문이에요 — 빛의 양만 줄어 어두워져요.';
    if (im.far) return hidden() ? '먼 풍경의 빛은 나란히 들어와 초점에 모여요 — 스크린이 가장 선명한 곳까지의 거리가 바로 초점거리예요.' : '먼 풍경의 빛은 나란히 들어와 초점(렌즈에서 ' + p.f + ' cm)에 모여 작고 거꾸로 선 상을 만들어요.';
    if (im.kind === 'none') return '물체가 초점에 있으면 렌즈를 지난 빛이 나란히 나가 상이 생기지 않아요.';
    if (im.kind === 'virtual') return '물체가 초점보다 렌즈에 가까우면 빛이 퍼져 나가요. 렌즈 너머로 보면 바로 선 큰 허상이 보여요 (돋보기) — 스크린에는 맺히지 않아요.';
    if (hidden()) return '스크린이 가장 선명한 곳이 상이 생기는 곳이에요. 물체 거리를 바꿔 가며 기록해 「물체 거리 = 상 거리」인 곳을 찾아봐요.';
    var r = p.s / p.f;
    if (Math.abs(r - 2) < 0.02) return '물체가 2f 에 있으면 상도 반대쪽 2f 에 생기고, 크기가 물체와 같아요 (거꾸로 선 실상).';
    if (r < 2) return '물체가 f 와 2f 사이에 있으면 상은 2f 보다 멀리, 물체보다 크게 생겨요 (프로젝터) — 물체가 초점에 다가갈수록 상은 더 멀어지고 커져요.';
    return '물체가 2f 보다 멀리 있으면 상은 f 와 2f 사이에 작게 생겨요 (카메라·눈) — 물체가 멀어질수록 상은 초점 쪽으로 다가가고 작아져요.';
  });

  /* 정리 단계 질문 판 (예전 '생각해 보기' 발문 3개 + 하나 더) */
  SK.think({
    q: '실상이 생긴 곳에서 스크린을 치우면 상은 사라질까?',
    hint: '스크린 놓기를 끄고 오른쪽 위 「눈으로 본 모습」 창을 보세요.',
    choices: ['사라진다', '그 자리에 그대로 생긴다 (그 자리를 들여다보면 보인다)', '렌즈 쪽으로 옮겨 간다'], answer: 2,
    why: '실상은 빛이 실제로 모이는 자리예요. 스크린은 모인 빛을 받아 우리 눈에 보이게 할 뿐이라, 치워도 빛은 그 자리에 모였다가 다시 퍼져 나가요. 그 빛을 눈으로 받으면 공중에 뜬 상이 보여요.'
  });
  SK.think({
    q: '프로젝터 화면(상)을 더 크게 하려면 슬라이드와 스크린을 어떻게 옮길까?',
    hint: '실험 카드 ③ 프로젝터 크게로 확인해 봐요.',
    choices: ['슬라이드는 렌즈 쪽으로, 스크린은 더 멀리', '슬라이드는 렌즈에서 멀리, 스크린은 더 가까이', '슬라이드만 렌즈 쪽으로, 스크린은 그대로'], answer: 1,
    why: '물체(슬라이드)가 초점 쪽으로 다가가면 상은 렌즈에서 멀어지고 커져요. 상이 생기는 자리가 멀어졌으니 스크린도 그만큼 멀리 옮겨야 선명해요.'
  });
  SK.think({
    q: '반도체 회로를 아주 작게 새기려면 마스크(회로 그림)를 렌즈에서 어디에 둘까?',
    hint: '설정 › 더 많은 설정 › 포토리소그래피 그림을 열어 봐요.',
    choices: ['초점보다 렌즈 가까이', 'f 와 2f 사이', '2f 보다 멀리'], answer: 3,
    why: '2f 보다 멀리 둔 물체의 상은 작고 거꾸로 선 실상이에요. 그래서 큰 마스크 그림을 웨이퍼 위에 몇 분의 1 크기로 줄여 새길 수 있어요(축소 투영).'
  });
  SK.think({
    q: '물체를 초점에 딱 맞춰 두면 상은 어디에 생길까? 이유도 말해 봐요.',
    reveal: '<b>상이 생기지 않아요.</b> 초점에서 나온 빛은 렌즈를 지나 모두 나란히 나가서 어디에서도 다시 모이지 않아요(광선 ② 를 떠올려 보세요). 손전등·서치라이트는 전구를 초점에 두어 멀리까지 나란한 빛을 보내요.'
  });

  /* ------------------------------------------------------------------
     8-2. 수업 안내 (교사 모드) — 요구 D 대응표
     ------------------------------------------------------------------ */
  SK.guide({
    rows: [
      { target: '초점거리 f (5~20 cm, 1 cm, 기본 10 · 바로 반영 · 카드 ①은 숨김)', standard: '[12물리03-02] 탐구 활동 「상의 위치와 초점거리 찾기」, 학교 렌즈 f≈10 cm', discover: 'f가 짧을수록 빛이 많이 꺾여 상이 렌즈 가까이 생긴다', misconception: '—' },
      { target: '물체 거리 (3~50 cm, 1 cm, 기본 30 · 바로 반영 · 끌기)', standard: '탐구 활동의 핵심 조작 변인', discover: '2f 밖: 작은 거꾸로 실상 / 2f: 같은 크기 / f~2f: 큰 거꾸로 실상 / f 안: 바로 선 허상. 물체가 다가오면 상은 멀어지고 커진다', misconception: '상은 그림이 통째로 옮겨진 것' },
      { target: '물체 높이 (더 많은 설정, 2~6 cm)', standard: '변인 통제', discover: '배율은 물체 높이와 관계없다', misconception: '—' },
      { target: '스크린 위치 (더 많은 설정, 5~100 cm · 끌기)', standard: '탐구 활동(스크린을 옮겨 선명한 곳 찾기)', discover: '선명한 위치는 한 곳뿐이다', misconception: '스크린이 없으면 상이 없다' },
      { target: '작도 광선 ①②③ (상황, 각각 켬/끔)', standard: '해설 「광선 추적법」', discover: '두 광선만 있어도 교점(상)이 정해진다', misconception: '—' },
      { target: '가림판 (상황, 없음/위 절반/가운데만 뚫림)', standard: '[12물리03-02] 상 맺힘 원리', discover: '상은 그대로 생기고 어두워질 뿐이다 (다른 길로 온 빛이 같은 점에 모인다)', misconception: '렌즈를 반 가리면 상도 반쪽' },
      { target: '스크린 놓기 (상황, 켬/끔)', standard: '실상·허상 구분', discover: '허상은 스크린에 맺히지 않는다. 스크린을 치워도 실상은 그 자리에 있다', misconception: '스크린이 없으면 상이 없다' },
      { target: '물체 종류 (상황, 화살표/촛불/F/먼 풍경)', standard: 'F: 뒤집힘 관찰 / 먼 풍경: f 대략 재기', discover: '실상은 위아래·좌우가 모두 뒤집힌다. 먼 풍경의 상은 초점 근처에 생긴다', misconception: '—' },
      { target: '굴절률 1.5/1.7, 포토리소그래피 (더 많은 설정)', standard: '해설 「렌즈 제작자 공식 제외」 → 그림으로만', discover: '—', misconception: '—' }
    ],
    sections: [
      { title: '수업 흐름', items: [
        '① 예측: 실험 카드 ⑤(반 가리기)로 시작하면 흥미를 끌기 좋아요. 손들기 수를 받아 두세요.',
        '② 실행: 물체·스크린 손잡이를 끌고, 광선을 하나씩 켜며 설명해요.',
        '③ 비교: 카드 ①(초점거리 찾기)로 물체 거리 40·30·20·15·12 cm 에서 기록 → 기록 표의 「같은 거리 찾기」 → 교사 모드에서 f 공개 → [규칙 카드].',
        '④ 정리: 오른쪽 질문 판 4문항(스크린을 치우면 · 프로젝터 · 반도체 · 초점에 두면). 토론 전에는 「답 확인 잠금」을 켜 두세요.'
      ] },
      { title: '이렇게 그렸어요', items: [
        '내부 계산은 얇은 렌즈 근사이며 결상 공식은 화면에 띄우지 않아요(교육과정 해설). 배율은 「상 크기 ÷ 물체 크기」로만 다뤄요.',
        '축척: 광학대 가로 1 cm = 8 u, 세로는 1.75배(1 cm = 14 u)로 늘려 그렸어요. 직선과 교점은 그대로예요.',
        '광선 ①②가 렌즈 지름(6 cm) 밖을 지날 때는 렌즈 가운데 면(세로 점선)을 늘려 그린 작도선이에요. 빛 다발은 실제 렌즈 안(±3 cm)만 지나요.',
        '가림판 밝기: 위 절반 50%, 가운데만 뚫림(지름 3 cm) 25%(빛이 지나는 넓이 비). 구멍이면 초점이 어긋났을 때 흐림도 절반으로 줄어요.',
        '「초점거리 숨기기」를 켜면 f 칸·F/2F 표시·상 거리·배율이 가려지고, 기록 표의 상 거리는 스크린 위치(측정값)로 남아요. 공중에 뜬 실상도 그리지 않아 학생은 스크린을 옮기며 정면 창·선명도로만 찾아요. 교사 모드에서 보여요.',
        '허상의 상 거리는 음수 대신 「10 cm (렌즈 앞쪽)」으로 통일해 적어요.',
        '직전(흐린 윤곽·표의 「직전」 줄) = 마지막으로 값을 바꾸기 전의 상이에요. 기록하면 화면에 기록 번호 윤곽(색+선 모양)이 남아요.'
      ] }
    ]
  });

  /* ------------------------------------------------------------------
     9. 키 (공통 키와 겹치지 않음 — 화면에는 쓰지 않고 도움말 › 단축키에만)
     ------------------------------------------------------------------ */
  function cycle(key, list) { var i = list.indexOf(SK.get(key)); SK.set(key, list[(i + 1) % list.length]); }
  SK.onKey(function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.code) {
      case 'KeyQ': if (!e.repeat) SK.set('ray1', !SK.get('ray1')); return true;
      case 'KeyW': if (!e.repeat) SK.set('ray2', !SK.get('ray2')); return true;
      case 'KeyE': if (!e.repeat) SK.set('ray3', !SK.get('ray3')); return true;
      case 'KeyD': if (!e.repeat) { cycle('blocker', BLOCKERS); SK.notice('가림판: ' + BLOCKER_TEXT[SK.get('blocker')], 'info', 1200); } return true;
      case 'KeyI': if (!e.repeat) { SK.set('screen', !SK.get('screen')); SK.notice(SK.get('screen') ? '스크린을 놓았어요' : '스크린을 치웠어요 — 오른쪽 위 창은 「눈으로 본 모습」', 'info', 1500); } return true;
      case 'KeyO': if (!e.repeat) cycle('type', TYPES); return true;
      case 'KeyG': if (!e.repeat) ruleCard(); return true;
    }
    return false;
  });

  /* ------------------------------------------------------------------
     10. 기록 (S) — 정적인 광학이라 '실행' 없이도 바로 기록되게 감싼다
     ------------------------------------------------------------------ */
  var origRecord = SK.record;
  function sigOf(p) { return [p.f, p.type, p.type === 'far' ? '' : p.s, p.h, p.blocker, p.screen, p.screenX, p.hideF].join('|'); }
  SK.record = function () {
    var p = SK.params, sig = sigOf(p);
    if (SK.records.length && sig === lastRecSig) { SK.notice('지금 상태는 이미 기록했어요 — 물체 거리나 스크린을 바꾼 뒤 [기록하기]', 'info'); return; }
    if (SK.records.length >= 5) { origRecord(); return; }
    if (!SK.started) SK.stepFrame(1);             // 공통 틀의 '실행됨' 표시만 켠다 (상은 이미 정해져 있음)
    var n = SK.records.length;
    origRecord();
    if (SK.records.length > n) lastRecSig = sig;
    SK.reset();                                    // 다음 기록을 받을 수 있게 새 실행으로 (기록·직전은 유지)
  };

  /* ------------------------------------------------------------------
     11. 끌기 (pointer events: 마우스·터치·펜 공통). 손잡이는 광학대 밑(손가락에 안 가리게)
     ------------------------------------------------------------------ */
  var cv = SK.view.canvas;
  function hit(pt) {
    var p = SK.params, best = null;
    function consider(key, x, top) {
      var dx = Math.abs(pt.x - x), dh = Math.abs(pt.x - clamp(x, 60, 1190)), d = null;
      if (dh <= 60 && pt.y >= HY - 34 && pt.y <= HY + 34) dx = dh;
      if (dx <= 60 && pt.y >= HY - 40 && pt.y <= HY + 40) d = dx;                // 손잡이
      else if (dx <= 30 && pt.y >= top && pt.y <= RAIL + 20) d = dx + 10;        // 물체·스크린 몸체
      if (d !== null && (!best || d < best.d)) best = { key: key, d: d };
    }
    if (p.type !== 'far') consider('s', X(-p.s), Y(p.h) - 20);
    if (p.screen) consider('screenX', X(p.screenX), AXIS - 60);
    return best;
  }
  function dragTo(pt) {
    var cm = (pt.x - LX) / SX, v;
    if (drag.key === 's') v = clamp(Math.round(-cm), 3, 50);
    else v = clamp(Math.round(cm), 5, 100);
    if (v !== SK.get(drag.key)) SK.set(drag.key, v);
    SK.requestRender();
  }
  function inWinHead(pt) { return pt.x >= WIN.x && pt.x <= WIN.x + WIN.w && pt.y >= WIN.y && pt.y <= WIN.y + WIN.top; }
  cv.addEventListener('pointerdown', function (e) {
    var pt = SK.view.toLogical(e);
    if (inWinHead(pt)) { winOpen = !winOpen; SK.requestRender(); e.preventDefault(); return; }
    var hh = hit(pt);
    if (!hh) return;
    drag = { key: hh.key, id: e.pointerId };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    e.preventDefault();
    dragTo(pt);
  });
  cv.addEventListener('pointermove', function (e) {
    if (drag && e.pointerId === drag.id) { dragTo(SK.view.toLogical(e)); return; }
    if (e.pointerType === 'mouse') { var lp = SK.view.toLogical(e); cv.style.cursor = hit(lp) ? 'grab' : inWinHead(lp) ? 'pointer' : ''; }
  });
  function endDrag(e) { if (drag && (!e || e.pointerId === drag.id)) { drag = null; SK.requestRender(); } }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('lostpointercapture', endDrag);

  /* ------------------------------------------------------------------
     12. 값이 바뀔 때: 직전(바꾸기 전) 상 보관 · 화면 정리
     ------------------------------------------------------------------ */
  function snap(p) { var o = {}; for (var k in p) o[k] = p[k]; return o; }
  function changed() {
    if (!burst) {
      burst = true;
      if (committed) { ghostData = { params: committed, series: {}, values: capture(committed).values }; SK.ghost = ghostData; renderTable(); }
    }
    clearTimeout(burstTimer);
    burstTimer = setTimeout(function () { burst = false; committed = snap(SK.params); }, 700);
  }
  function syncUI() {
    var p = SK.ui, hid = !!p.hideF && !SK.isTeacher();
    if (SK.controls.f) SK.controls.f.el.classList.toggle('teacher-only', !!p.hideF);
    if (SK.controls.s) SK.controls.s.enable(p.type !== 'far');
    if (meters) ['si', 'm'].forEach(function (k) {
      var el = meters.el.querySelector('.meter[data-key="' + k + '"]');
      if (el) el.classList.toggle('is-hidden-value', hid);
    });
    SK.requestRender();
  }
  function status(p) {
    var fT = p.hideF ? (SK.isTeacher() ? 'f ' + p.f + ' cm (학생에겐 숨김)' : 'f ? cm (숨김)') : 'f ' + p.f + ' cm';
    return [fT, '스크린 ' + (p.screen ? '켬' : '끔'), '가림판 ' + BLOCKER_TEXT[p.blocker]];
  }
  function onStep() { SK.requestRender(); }

  /* ------------------------------------------------------------------
     13. 기록용 결과 (capture) · 표 꾸미기
     ------------------------------------------------------------------ */
  function capture(p) {
    var im = Phys.image(p), sc = Phys.screen(p, im), hid = !!p.hideF, v = {};
    v.fNum = p.f; v.fHid = hid;
    v.fText = (hid && !SK.isTeacher()) ? '?' : String(p.f);
    v.sObjN = im.far ? Infinity : p.s;
    v.sObjT = im.far ? '∞' : dist(p.s, true);
    v.hObjT = im.far ? '–' : dist(p.h, true);
    v.sharpN = (sc.formed && p.screen) ? sc.sharp : null;
    v.sharpT = v.sharpN === null ? '–' : String(Math.round(sc.sharp * 100));
    if (hid) {                       // 숨김 탐구: 스크린 위치 = 측정한 상 거리
      v.sImgN = p.screen ? p.screenX : NaN;
      v.sImgT = p.screen ? dist(p.screenX, true) : '–';
      var ok = sc.formed && p.screen;
      v.hImgT = ok ? fmt(Math.abs(sc.size), 1) : '–';
      v.mT = (ok && !im.far) ? fmt(Math.abs(sc.size) / p.h, 1) : '–';
      v.ox = ok ? p.screenX : null; v.oh = ok ? sc.size : null;
    } else {
      v.sImgN = im.si;
      v.sImgT = im.kind === 'none' ? '∞' : im.kind === 'virtual' ? dist(-im.si) + ' (렌즈 앞쪽)' : dist(im.si);
      v.hImgT = im.kind === 'none' ? '–' : fmt(Math.abs(im.hi), 1);
      v.mT = (im.far || im.kind === 'none') ? '–' : fmt(Math.abs(im.m), 1);
      v.ox = im.kind === 'none' ? null : im.si; v.oh = im.kind === 'none' ? null : im.hi;
    }
    v.orient = im.kind === 'none' ? '–' : (im.kind === 'real' ? '거꾸로' : '바로');
    v.kind = im.kind === 'none' ? '없음' : (im.kind === 'real' ? '실상' : '허상');
    return { series: {}, values: v };
  }
  function isEqual(r) {
    var v = r.values;
    if (!isFinite(v.sObjN) || !isFinite(v.sImgN)) return false;
    if (v.fHid && (v.sharpN === null || v.sharpN < 0.8)) return false;   // 측정이면 선명할 때만
    return Math.abs(v.sObjN - v.sImgN) < 0.5;
  }
  function renderTable() {
    if (!rt) return;
    SK.records.concat(SK.ghost ? [SK.ghost] : []).forEach(function (r) {
      if (r.values && r.values.fNum !== undefined) r.values.fText = (r.values.fHid && !SK.isTeacher()) ? '?' : String(r.values.fNum);
    });
    rt.render();
    postTable();
  }
  function postTable() {
    if (!rt) return;
    var tb = rt.el.querySelector('tbody'); if (!tb) return;
    var rows = Array.prototype.slice.call(tb.querySelectorAll('tr')).filter(function (tr) { return !tr.classList.contains('is-ghost'); });
    rows.forEach(function (tr, i) {
      var r = SK.records[i], prev = SK.records[i - 1]; if (!r) return;
      // f·물체 거리·물체 크기의 '바뀜' 굵게는 공통 표의 changed 옵션이 맡는다 (크게 보기 창 포함)
      tr.classList.toggle('lens-eq', eqOn && isEqual(r));
    });
  }
  function findEqual() {
    var found = SK.records.filter(isEqual);
    if (eqOn) { eqOn = false; eqBtn.setAttribute('aria-pressed', 'false'); postTable(); return; }
    if (!found.length) { SK.notice('물체 거리와 상 거리가 같은 기록이 아직 없어요 — 물체를 옮기며 더 기록해 보세요', 'info', 4000); return; }
    eqOn = true; eqBtn.setAttribute('aria-pressed', 'true'); postTable();
    var r = found[0];
    SK.notice('기록 ' + r.n + ': 물체 거리 = 상 거리 = ' + r.values.sObjT + ' cm — 이 거리와 초점거리는 어떤 관계일까요?', 'ok', 6000);
  }

  /* ------------------------------------------------------------------
     14. 그리기
     ------------------------------------------------------------------ */
  /* 캔버스 라벨은 모아 두었다가 마지막에 SK.placeLabel 로 한꺼번에 (겹치면 위/아래로 밀고 흰 칩) */
  var LQ = [];
  function q(text, x, y, o) {
    o = o || {};
    var size = o.size || 22;
    LQ.push({ text: text, x: x, y: y, anchor: o.align || 'center', size: size, font: (o.weight || 700) + ' ' + size + 'px ' + FONT, color: o.color || '--color-ink', leader: o.leader });
  }

  function render(view, p) {
    var ctx = view.ctx, im = Phys.image(p), sc = Phys.screen(p, im), bl = Phys.blocker(p.blocker);
    var showF = p.marks && !hidden();
    var reveal = (SK.started && !SK.finished) ? animT * RAY_SPEED : Infinity;
    var done = reveal === Infinity;
    LQ = [];

    drawBench(ctx, p, showF);
    drawOverlays(ctx);
    maxLen = drawRays(ctx, p, im, bl, reveal);
    drawBlocker(ctx, p);
    drawLens(ctx, p);
    drawObject(ctx, p);
    if (done) drawImage(ctx, p, im, sc, bl);
    drawScreen(ctx, p, im, sc, done);
    if (p.ruler) drawRuler(ctx, p, im);
    drawHandles(ctx, p);
    // 결과 해설(.sim-note)이 실험 화면 위쪽을 덮으면 정면 창을 그 아래로 내린다
    var noteEl = SK.el.note, off = 0;
    if (noteEl && !noteEl.hidden && SK.el.stage.clientHeight) off = noteEl.offsetHeight * 700 / SK.el.stage.clientHeight;
    WIN.y = Math.round(12 + off);
    if (!p.screen) drawEye(ctx);
    var avoid = [winBox()];
    SK.placeLabel(ctx, LQ, { avoid: avoid });
    drawWindow(ctx, p, im, sc, bl, done);
    updateBand(p, im, sc, done);
  }

  function drawBench(ctx, p, showF) {
    ctx.save();
    // 렌즈 가운데 면 (작도용 세로 점선)
    ctx.strokeStyle = C('--color-line'); ctx.lineWidth = 2; ctx.setLineDash([4, 7]);
    line(ctx, LX, 18, LX, RAIL - 4);
    // 광축
    ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 1.5; ctx.setLineDash([12, 8]);
    line(ctx, XL, AXIS, XR, AXIS);
    ctx.setLineDash([]);
    // 광학대
    ctx.fillStyle = C('--color-paper-sunk'); ctx.fillRect(XL - 12, RAIL, XR - XL + 24, 14);
    ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 2; ctx.strokeRect(XL - 12, RAIL, XR - XL + 24, 14);
    for (var cm = -50; cm <= 100; cm++) {
      var x = X(cm), major = cm % 5 === 0;
      ctx.lineWidth = major ? 3 : 1.2;
      ctx.strokeStyle = C(major ? '--color-ink-muted' : '--color-line-strong');
      line(ctx, x, RAIL, x, RAIL - (cm % 10 === 0 ? 16 : major ? 12 : 6));
    }
    ctx.restore();
    // 눈금 숫자: 흰 칩 위 (손잡이·받침대 선이 지나가도 읽히게)
    for (cm = -50; cm <= 100; cm += 5) {
      label(ctx, String(Math.abs(cm)), X(cm), RAIL + 30, { size: 20, weight: cm === 0 ? 800 : 600, color: cm === 0 ? '--color-ink' : '--color-ink-muted', bg: '--color-paper-raised', bgAlpha: 0.95 });
    }
    label(ctx, '(cm)', XR + 4, RAIL - 16, { size: 20, align: 'right', color: '--color-ink-muted', weight: 500 });
    // F · 2F 표시: 광학대 위 삼각형 + 24u 글자, 광축 위 점 + 아래 작은 글자
    if (showF) {
      [[-2, '2F'], [-1, 'F'], [1, 'F'], [2, '2F']].forEach(function (m) {
        var xcm = m[0] * p.f; if (xcm < -50 || xcm > 100) return;
        var x = X(xcm), big = SK.isFlashing('f');
        ctx.save();
        ctx.fillStyle = C('--color-sim-lens');
        ctx.beginPath(); ctx.moveTo(x, RAIL - 2); ctx.lineTo(x - 12, RAIL - 24); ctx.lineTo(x + 12, RAIL - 24); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(x, AXIS, Math.abs(m[0]) === 1 ? (big ? 9 : 7) : 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        label(ctx, m[1], x, RAIL - 42, { size: 24, weight: 800, color: '--color-sim-lens-text', bg: '--color-paper-raised' });
        q(m[1], x, AXIS + 24, { size: 20, weight: 800, color: '--color-sim-lens-text', leader: false });
      });
    }
  }

  /** 기록·직전 상 윤곽 (색 + 선 모양) */
  function drawOverlays(ctx) {
    function outline(v, st, tag) {
      if (!v || v.ox === null || v.ox === undefined || !isFinite(v.ox) || v.oh === null || !isFinite(v.oh)) return;
      if (v.ox < -50 || v.ox > 100) return;
      var x = X(v.ox), yTip = clamp(Y(v.oh), 4, RAIL - 4);
      ctx.save(); SK.applyStroke(ctx, st);
      line(ctx, x, AXIS, x, yTip);
      var dir = yTip > AXIS ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x - 10, yTip - dir * 14); ctx.lineTo(x, yTip); ctx.lineTo(x + 10, yTip - dir * 14); ctx.stroke();
      ctx.restore();
      if (tag) label(ctx, tag, x + 16, yTip + dir * 4, { size: 20, weight: 800, color: st.color, align: 'left' });
    }
    SK.records.forEach(function (r) { outline(r.values, SK.recStyle(r.slot), String(r.n)); });
    if (SK.ghost) outline(SK.ghost.values, SK.ghostStyle(), '직전');
  }

  /** 광선들. 반환: 가장 긴 광선 길이(u) — 실행 연출의 끝 판단용 */
  function drawRays(ctx, p, im, bl, reveal) {
    var list = [], far = p.type === 'far', any = p.ray1 || p.ray2 || p.ray3;
    if (far) {
      if (any) [-3, -1.5, 0, 1.5, 3].forEach(function (y) {
        list.push({ y: y, st: y === 0 ? SK.recStyle(2) : { color: C('--color-sim-lens'), dash: [], width: 3 } });
      });
    } else {
      var mh = Phys.mainRayHeights(p);
      if (p.fan || p.blocker !== 'none') for (var k = -3; k <= 3; k++) list.push({ y: k, st: { color: C('--color-sim-lens'), dash: [], width: 2 }, fan: true });
      if (p.ray1) list.push({ y: mh[1], st: SK.recStyle(0), main: true });
      if (p.ray2 && mh[2] !== undefined) list.push({ y: mh[2], st: SK.recStyle(1), main: true });
      if (p.ray3) list.push({ y: 0, st: SK.recStyle(2), main: true });
    }
    var longest = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(XL - 12, 0, XR - XL + 24, RAIL - 2); ctx.clip();
    list.forEach(function (r) {
      var ray = Phys.ray(p, r.y);
      var x0 = far ? -50 : -p.s, y0 = far ? r.y + FAR_TAN * 50 : p.h;
      var pts = [[X(x0), Y(y0)], [X(0), Y(r.y)]];
      var blocked = bl.blocked(r.y);
      var st = r.st;
      if (blocked) {
        pts[1] = [X(-0.9), Y(r.y + ray.inS * -0.9)];
        st = { color: C('--color-line-strong'), dash: r.st.dash, width: Math.max(2, r.st.width - 1) };
      } else {
        var xEnd = p.screen ? p.screenX : 100;
        if (Math.abs(ray.outS) > 1e-9) {            // 화면 위·아래 밖으로 나가면 거기서 멈춤
          var yLim = ray.outS > 0 ? Y_TOP : Y_BOT;
          var xHit = (yLim - r.y) / ray.outS;
          if (xHit > 0 && xHit < xEnd) xEnd = xHit;
        }
        pts.push([X(xEnd), Y(r.y + ray.outS * xEnd)]);
      }
      var len = polyLen(pts);
      if (len > longest) longest = len;
      drawPartial(ctx, pts, st, reveal);
      // 허상: 렌즈 뒤로 퍼지는 빛을 왼쪽으로 늘린 점선
      if (!blocked && reveal === Infinity && im.kind === 'virtual' && (r.main || far)) {
        var xs = Math.max(im.si, -50);
        ctx.save(); ctx.globalAlpha = 0.6;
        SK.applyStroke(ctx, { color: st.color, dash: [6, 8], width: 2 });
        line(ctx, X(0), Y(r.y), X(xs), Y(r.y + ray.outS * xs));
        ctx.restore();
      }
    });
    ctx.restore();
    return longest;
  }
  function polyLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function drawPartial(ctx, pts, st, reveal) {
    ctx.save(); SK.applyStroke(ctx, st);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    var left = reveal;
    for (var i = 1; i < pts.length && left > 0; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dy);
      if (L <= left) { ctx.lineTo(pts[i][0], pts[i][1]); left -= L; }
      else { ctx.lineTo(pts[i - 1][0] + dx * left / L, pts[i - 1][1] + dy * left / L); left = 0; }
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawBlocker(ctx, p) {
    if (p.blocker === 'none') return;
    var x = LX - 16, w = 9;
    ctx.save();
    ctx.fillStyle = C('--color-ink-muted'); ctx.globalAlpha = 0.9;
    if (p.blocker === 'top') ctx.fillRect(x, 26, w, AXIS - 26);
    else { ctx.fillRect(x, 26, w, Y(HOLE_D / 2) - 26); ctx.fillRect(x, Y(-HOLE_D / 2), w, RAIL - 6 - Y(-HOLE_D / 2)); }
    ctx.restore();
    // 렌즈를 가리지 않게 판 오른쪽 위(렌즈보다 높이)에 짧게
    q(p.blocker === 'top' ? '가림판' : '가림판 (가운데만 뚫림)', x - 10, AXIS - (D_LENS / 2) * SY - 56, { size: 20, align: 'right', color: '--color-ink-muted' });
  }

  function drawLens(ctx, p) {
    var R = (D_LENS / 2) * SY, t = hidden() ? 9 : 4 + 60 / p.f;   // f 가 짧을수록 볼록하게 (숨김이면 고정)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(LX, AXIS - R);
    ctx.quadraticCurveTo(LX + 2 * t, AXIS, LX, AXIS + R);
    ctx.quadraticCurveTo(LX - 2 * t, AXIS, LX, AXIS - R);
    ctx.closePath();
    ctx.fillStyle = C('--color-primary-tint'); ctx.globalAlpha = 0.85; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = C('--color-primary'); ctx.lineWidth = SK.isFlashing('f') ? 4.5 : 2.5; ctx.stroke();
    ctx.restore();
    q('볼록렌즈', LX + 14, AXIS - R - 20, { size: 20, align: 'left', color: '--color-primary' });
  }

  function drawObject(ctx, p) {
    var cols = { body: C('--color-ink'), flame: C('--color-q-energy-p'), trunk: C('--color-ink-muted') };
    if (p.type === 'far') {
      var tx = XL + 40;
      drawShape(ctx, 'far', tx, AXIS, 3 * SY, 3 * SY, { body: C('--color-q-energy-k'), trunk: C('--color-ink-muted') });
      q('아주 먼 풍경 →', XL + 4, AXIS + 30, { size: 20, align: 'left' });
      return;
    }
    var x = X(-p.s);
    ctx.save(); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 3; line(ctx, x, AXIS, x, RAIL); ctx.restore(); // 받침대
    drawShape(ctx, p.type, x, AXIS, p.h * SY, p.h * SY, cols);
    q('물체', x - 12, Y(p.h) - 20, { size: 20, align: 'right' });
  }

  function drawImage(ctx, p, im, sc, bl) {
    var col = { body: C('--color-sim-lens'), flame: C('--color-q-energy-p'), trunk: C('--color-sim-lens') };
    if (im.kind === 'none') {
      q('상이 생기지 않아요 — 빛이 나란히 나가요', LX + 320, AXIS + 120, { size: 22, color: '--color-sim-lens-text' });
      return;
    }
    var si = im.si, hi = im.hi;
    if (im.kind === 'real') {
      // 초점거리 숨기기(찾기) 중에는 공중에 뜬 실상을 그리지 않는다 — 상 위치가 곧 답이 되므로,
      // 학생은 스크린을 옮기며 정면 보기 창·선명도로만 찾는다 (탐구 활동 재현)
      if (hidden()) return;
      if (si > 100) {
        SK.arrow(ctx, XR - 120, AXIS + 46, XR - 6, AXIS + 46, { color: '--color-sim-lens', width: 5 });
        q('상은 광학대 밖 ' + dist(si) + ' cm 에 생겨요', XR - 8, AXIS + 84, { size: 22, align: 'right', color: '--color-sim-lens-text' });
        return;
      }
      var cut = p.screen && p.screenX < si - 0.5;     // 스크린이 상보다 앞에서 빛을 막음
      var x = X(si);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1250, RAIL - 2); ctx.clip();
      drawShape(ctx, p.type, x, AXIS, Math.abs(hi) * SY, hi * SY, { body: col.body, flame: col.flame, trunk: col.trunk, alpha: bl.bright * (cut ? 0.5 : 1), dashed: cut });
      ctx.restore();
      var tipY = clamp(Y(hi), 20, RAIL - 30);
      if (cut) q('상이 생길 자리 (스크린이 빛을 먼저 막아요)', x + 14, Math.min(tipY + 26, RAIL - 100), { size: 20, align: 'left', color: '--color-ink-muted' });
      else q('실상', x + 16, Math.min(tipY + 10, RAIL - 100), { size: 22, weight: 800, align: 'left', color: '--color-sim-lens-text' });
      if (Y(hi) > RAIL - 4) q('상이 화면보다 커요 (' + fmt(Math.abs(hi), 1) + ' cm)', x + 14, RAIL - 120, { size: 20, align: 'left', color: '--color-sim-lens-text' });
    } else {
      if (si < -50) {
        SK.arrow(ctx, XL + 110, AXIS - 46, XL + 4, AXIS - 46, { color: '--color-sim-lens', width: 5, dash: [8, 6] });
        q('허상은 렌즈 앞쪽 ' + dist(-si) + ' cm (광학대 밖)', XL + 8, AXIS - 84, { size: 22, align: 'left', color: '--color-sim-lens-text' });
        return;
      }
      var xv = X(si);
      drawShape(ctx, p.type, xv, AXIS, Math.abs(hi) * SY, hi * SY, { body: col.body, flame: col.flame, trunk: col.trunk, alpha: 0.9 * bl.bright, dashed: true });
      var ty = clamp(Y(hi), 30, RAIL - 30);
      q('허상', xv - 14, ty, { size: 22, weight: 800, align: 'right', color: '--color-sim-lens-text' });
      if (Y(hi) < 4) q('상이 화면보다 커요 (' + fmt(Math.abs(hi), 1) + ' cm)', xv - 14, 60, { size: 20, align: 'right', color: '--color-sim-lens-text' });
    }
  }

  function drawScreen(ctx, p, im, sc, done) {
    if (!p.screen) return;
    var x = X(p.screenX), top = AXIS - 46;
    ctx.save();
    ctx.fillStyle = C('--color-paper-sunk'); ctx.fillRect(x - 5, top, 10, RAIL - top);
    ctx.strokeStyle = C('--color-ink-muted'); ctx.lineWidth = 2; ctx.strokeRect(x - 5, top, 10, RAIL - top);
    ctx.restore();
    var clear = sc.formed && sc.clear && done;
    // 선명도 숫자는 계기판으로 옮김. 선명할 때만 스크린 위에 '선명!' 표시
    q(clear ? '스크린 · 선명!' : '스크린', x, top - 20, { size: 20, color: clear ? '--color-ok' : '--color-ink' });
  }

  function drawRuler(ctx, p, im) {
    var y = RAIL - 76;
    function dim(x1, x2, text, yy, col) {
      ctx.save(); ctx.strokeStyle = C(col || '--color-ink-muted'); ctx.lineWidth = 2;
      line(ctx, x1, yy, x2, yy); line(ctx, x1, yy - 8, x1, yy + 8); line(ctx, x2, yy - 8, x2, yy + 8);
      ctx.restore();
      q(text, (x1 + x2) / 2, yy - 18, { size: 20, color: col || '--color-ink-muted' });
    }
    if (p.type !== 'far') {
      dim(X(-p.s), LX, '물체 거리 ' + dist(p.s, true) + ' cm', y);
      q(dist(p.h, true) + ' cm', X(-p.s) - 14, Y(p.h / 2), { size: 20, align: 'right', color: '--color-ink-muted' });
    }
    if (hidden()) {
      if (p.screen) dim(LX, X(p.screenX), '스크린까지 ' + dist(p.screenX, true) + ' cm', y);
      return;
    }
    if (im.kind === 'real' && im.si <= 100) {
      dim(LX, X(im.si), '상 거리 ' + dist(im.si) + ' cm', y, '--color-sim-lens-text');
      if (Y(im.hi) < RAIL - 70) q(fmt(Math.abs(im.hi), 1) + ' cm', X(im.si) - 14, Y(im.hi / 2), { size: 20, align: 'right', color: '--color-sim-lens-text' });
    } else if (im.kind === 'virtual' && im.si >= -50) {
      dim(X(im.si), LX, '상 거리 ' + dist(-im.si) + ' cm (렌즈 앞쪽)', y - 56, '--color-sim-lens-text');
    }
  }

  function drawHandles(ctx, p) {
    function handle(key, x, text) {
      var active = drag && drag.key === key, w = 112, hh = 56;
      x = clamp(x, w / 2 + 4, 1250 - w / 2 - 4);      // 손잡이는 늘 실험 화면 안쪽에
      ctx.save();
      roundRect(ctx, x - w / 2, HY - hh / 2, w, hh, hh / 2);
      ctx.fillStyle = C(active ? '--color-sim-lens' : '--color-paper-raised'); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = C('--color-sim-lens'); ctx.stroke();
      ctx.fillStyle = C(active ? '--color-paper-raised' : '--color-sim-lens');
      [-1, 1].forEach(function (d) {
        var ax = x + d * (w / 2 - 12);
        ctx.beginPath(); ctx.moveTo(ax + d * 6, HY); ctx.lineTo(ax - d * 4, HY - 8); ctx.lineTo(ax - d * 4, HY + 8); ctx.closePath(); ctx.fill();
      });
      ctx.restore();
      label(ctx, text, x, HY + 1, { size: 22, weight: 800, color: active ? '--color-paper-raised' : '--color-sim-lens-text' });
      if (active) {   // 끄는 동안 값 말풍선 (손잡이 위)
        var v = key === 's' ? p.s : p.screenX;
        label(ctx, dist(v, true) + ' cm', x, HY - 112, { size: 26, weight: 800, color: '--color-paper-raised', bg: '--color-ink', bgAlpha: 0.92 });
      }
    }
    if (p.type !== 'far') handle('s', X(-p.s), '물체');
    if (p.screen) handle('screenX', X(p.screenX), '스크린');
  }

  function drawEye(ctx) {
    var x = Math.min(XR - 34, WIN.x - 50), y = AXIS + 44;   // 정면 창에 가리지 않게
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.strokeStyle = C('--color-ink'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.quadraticCurveTo(x, y - 24, x - 26, y); ctx.quadraticCurveTo(x, y + 24, x + 26, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('--color-ink'); ctx.beginPath(); ctx.arc(x - 6, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    q('눈', x, y + 38, { size: 20, weight: 800 });
  }

  /** 오른쪽 위 정면 보기 창 (스크린 정면 / 눈으로 본 모습) — 작게, 머리를 누르면 접힘 */
  function winBox() { return { x: WIN.x - 8, y: WIN.y - 4, w: WIN.w + 16, h: (winOpen ? WIN.h : WIN.top) + 12 }; }
  function drawWindow(ctx, p, im, sc, bl, done) {
    var w = WIN, cx0 = w.x + 6, cy0 = w.y + w.top, cw = w.w - 12, ch = w.h - w.top - 6;
    var ax = cx0 + cw / 2, ay = cy0 + ch / 2, k = w.scale;
    var onScreen = p.screen;
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 2;
    roundRect(ctx, w.x, w.y, w.w, winOpen ? w.h : w.top, 10); ctx.fill(); ctx.stroke();
    ctx.restore();
    label(ctx, onScreen ? '스크린 정면' : '눈으로 본 모습', w.x + 12, w.y + w.top / 2, { size: 20, weight: 800, align: 'left' });
    label(ctx, winOpen ? '접기 ▴' : '펼치기 ▾', w.x + w.w - 10, w.y + w.top / 2, { size: 20, weight: 600, align: 'right', color: '--color-primary' });
    if (!winOpen) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(cx0, cy0, cw, ch); ctx.clip();
    ctx.fillStyle = C(onScreen ? '--color-ink' : '--color-paper-sunk'); ctx.fillRect(cx0, cy0, cw, ch);
    var light = { body: C('--color-paper-raised'), flame: C('--color-q-energy-p'), trunk: C('--color-paper-raised') };
    var dark = { body: C('--color-sim-lens'), flame: C('--color-q-energy-p'), trunk: C('--color-sim-lens') };
    var cap = '', big = false, capColor = onScreen ? '--color-paper-raised' : '--color-ink';
    if (!done) {
      cap = '빛이 가는 중…';
    } else if (onScreen) {
      if (sc.formed) {
        var size = sc.size, blurR = Math.min(36, (sc.b / 2) * k);
        var alpha = bl.bright * clamp(Math.abs(size) / (Math.abs(size) + sc.b), 0.15, 1);
        big = Math.abs(size) * k > ch / 2 - 4;
        drawBlurred(ctx, function (dx, dy) { drawShape(ctx, p.type, ax + dx, ay + dy, size * k, size * k, light); }, blurR, alpha);
        cap = (sc.clear ? '선명 · ' : '흐림 · ') + '거꾸로' + (bl.bright < 1 ? ' · 밝기 ' + Math.round(bl.bright * 100) + '%' : '');
      } else {
        font(ctx, 700, 20); ctx.fillStyle = C('--color-paper-raised'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        wrapText(ctx, im.kind === 'none' ? '상이 맺히지 않아요 (빛이 나란히 나가요)' : '스크린에 상이 맺히지 않아요 — 스크린을 치우고 렌즈 너머로 보세요', ax, ay - 30, cw - 24, 28);
      }
    } else {
      if (im.kind === 'none') {
        font(ctx, 700, 20); ctx.fillStyle = C('--color-ink'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        wrapText(ctx, '상이 생기지 않아요 (무한히 멀리)', ax, ay - 14, cw - 24, 28);
      } else {
        var H = im.hi;   // 실상: 음수(거꾸로, 좌우도 뒤집힘) · 허상: 양수(바로 섬)
        big = Math.abs(H) * k > ch / 2 - 4;
        ctx.save(); ctx.globalAlpha = bl.bright; drawShape(ctx, p.type, ax, ay, H * k, H * k, dark); ctx.restore();
        cap = im.kind === 'real' ? '거꾸로 (공중에 떠 있어요)' : '바로 선 큰 상';
      }
    }
    ctx.restore();
    // 물체 정면 (비교용 작은 창)
    var ix = w.x + w.w - 54, iy = cy0 + 6;
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 1.5;
    ctx.fillRect(ix, iy, 46, 66); ctx.strokeRect(ix, iy, 46, 66);
    drawShape(ctx, p.type === 'far' ? 'far' : p.type, ix + 23 - (p.type === 'F' ? 4 : 0), iy + 40, 30, 30, { body: C(p.type === 'far' ? '--color-q-energy-k' : '--color-ink'), flame: C('--color-q-energy-p'), trunk: C('--color-ink-muted') });
    ctx.restore();
    label(ctx, '물체', ix + 23, iy + 54, { size: 16, weight: 700, color: '--color-ink-muted' });
    if (cap) {
      if (big) cap += ' · 창보다 큼';
      label(ctx, cap, ax, cy0 + ch - 16, { size: 18, weight: 700, color: capColor, bg: onScreen ? '--color-ink' : '--color-paper-sunk', bgAlpha: 0.85 });
    }
  }

  /** 하단 띠: 계기판 4개 · 상의 모습 한 줄 */
  var lastKind = '';
  function updateBand(p, im, sc, done) {
    var far = im.far, virt = im.kind === 'virtual';
    meters.update({
      si: hidden() ? (p.screen ? '?' : '–') : im.kind === 'none' ? '∞' : virt ? dist(-im.si) : dist(im.si),
      m: (far || im.kind === 'none') ? '–' : fmt(Math.abs(im.m), 1),
      sharp: (p.screen && sc.formed && done) ? Math.round(sc.sharp * 100) : '–'
    });
    var lt = virt && !hidden() ? '상 거리 (렌즈 앞쪽)' : hidden() ? '상 거리 (숨김)' : '상 거리';
    if (siLabel.textContent !== lt) siLabel.textContent = lt;
    var main, sub;
    if (im.kind === 'none') { main = '상이 생기지 않아요'; sub = '물체가 초점에 있어 빛이 나란히 나가요'; }
    else if (far) { main = '거꾸로 선 작은 실상'; sub = hidden() ? '스크린을 옮겨 가장 선명한 곳을 찾아요' : '먼 풍경의 상은 초점 근처에 생겨요'; }
    else if (hidden()) { main = virt ? '바로 선 허상' : '거꾸로 선 실상'; sub = virt ? '스크린에 맺히지 않아요' : '스크린을 옮겨 가장 선명한 곳을 찾아요'; }
    else {
      var m = Math.abs(im.m), mt = m > 1.05 ? fmt(m, 1) + '배 확대' : m < 0.95 ? fmt(m, 1) + '배 축소' : '같은 크기';
      main = (virt ? '바로 선 허상' : '거꾸로 선 실상') + ' · ' + mt;
      sub = (virt ? '렌즈 너머로 보여요' : '스크린에 맺혀요') + ' · 상 크기 ' + fmt(Math.abs(im.hi), 1) + ' cm';
    }
    if (p.blocker !== 'none' && im.kind !== 'none') sub += ' · 밝기 ' + Math.round(Phys.blocker(p.blocker).bright * 100) + '%';
    var key = main + sub;
    if (key !== lastKind) { lastKind = key; kindEls.main.textContent = main; kindEls.sub.textContent = sub; }
  }

  /* ------------------------------------------------------------------
     15. 규칙 카드 (빈칸마다 보기 버튼 + 답 확인하기) · 심화 그림
     ------------------------------------------------------------------ */
  function ruleCard() {
    // [앞 글, [보기…], 정답 번호(0~), 뒤 글] 를 이어 붙여 한 문항. 문항마다 답 확인하기(이유)
    var items = [
      { parts: ['물체를 초점 밖에서 렌즈 쪽으로 옮기면, 상은 렌즈에서 ', [['가까워지고', '멀어지고', '그대로이고'], 1], ' 크기는 ', [['작아진다', '같다', '커진다'], 2], '.'],
        why: '물체가 초점에 다가갈수록 렌즈를 지난 빛이 덜 꺾인 채 모여서 더 먼 곳에서 만나요. 상 거리가 늘어나니 배율(상 거리 ÷ 물체 거리)도 커져요.' },
      { parts: ['물체 거리와 상 거리가 같을 때, 그 거리는 초점거리의 ', [['1배', '2배', '½배'], 1], '이고, 상의 크기는 ', [['물체보다 크다', '물체와 같다', '물체보다 작다'], 1], '.'],
        why: '물체를 2f 에 두면 상도 반대쪽 2f 에 생겨요. 그래서 「같은 거리」를 찾으면 그 거리의 절반이 초점거리예요. 거리가 같으니 배율은 1배예요.' },
      { parts: ['물체가 초점보다 렌즈에 가까우면, 상은 ', [['거꾸로 선', '바로 선'], 1], ' 상이고, 크기는 ', [['물체보다 작다', '물체보다 크다', '물체와 같다'], 1], '. 이 상은 ', [['실상', '허상'], 1], '이다.'],
        why: '초점 안쪽 물체의 빛은 렌즈를 지나도 모이지 않고 퍼져요. 퍼지는 빛을 뒤로 늘인 곳에 바로 선 큰 상이 보이는데, 빛이 실제로 모인 곳이 아니라서 허상이에요(돋보기).' },
      { parts: ['렌즈를 반쯤 가리면 상은 ', [['반쪽만 생긴다', '그대로 생기고 어두워진다', '사라진다'], 1], '.'],
        why: '물체 한 점에서 나온 빛은 렌즈 어느 부분을 지나도 같은 점에 모여요. 남은 부분을 지난 빛만으로도 상 전체가 생기고, 빛의 양만 줄어요.' }
    ];
    var list = h('ol', { class: 'lens-rules' }, items.map(function (it) {
      var sentence = h('p', { class: 'lens-rule__text' });
      it.parts.forEach(function (part) {
        if (typeof part === 'string') { sentence.appendChild(document.createTextNode(part)); return; }
        var opts = part[0], right = part[1], bs = [];
        var blank = h('span', { class: 'lens-blank', role: 'group', 'aria-label': '빈칸 — 보기 중 하나를 고르세요' });
        opts.forEach(function (o, i) {
          var b = h('button', { class: 'lens-opt', type: 'button', 'aria-pressed': 'false', text: o });
          b.addEventListener('click', function (e) {
            if (e.detail > 0) b.blur();
            bs.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); x.classList.remove('is-right', 'is-wrong'); });
            b.setAttribute('aria-pressed', 'true');
            b.classList.add(i === right ? 'is-right' : 'is-wrong');
            b.setAttribute('aria-label', o + (i === right ? ' — 맞았어요' : ' — 다시 생각해 봐요'));
          });
          bs.push(b); blank.appendChild(b);
        });
        sentence.appendChild(blank);
      });
      var li = h('li', null, sentence);
      var ans = it.parts.filter(function (x) { return typeof x !== 'string'; }).map(function (x) { return x[0][x[1]]; }).join(' · ');
      SK.reveal(li, '<b>정답: ' + ans + '</b><br>' + it.why);
      return li;
    }));
    SK.dialog({
      title: '규칙 카드 — 기록 표에서 찾은 규칙',
      body: [h('p', { class: 'lens-hint', text: '기록 표를 보며 빈칸마다 알맞은 말을 골라요. 맞으면 초록, 아니면 주황으로 바뀌어요.' }), list],
      ok: '닫기', cancel: null
    });
  }

  function figureDialog(kind) {
    var box = h('div', { class: 'lens-figure' });
    var note = h('p', { class: 'lens-figure-note' });
    SK.dialog({
      title: kind === 'material' ? '렌즈 재료에 따라 꺾이는 정도 (그림으로만)' : '포토리소그래피 — 렌즈로 회로를 작게 새기기',
      body: [box, note], ok: '닫기', cancel: null
    });
    var v = SK.canvas(box, { w: 960, h: 400, fit: true, bg: '--color-paper-raised' });
    function draw() {
      v.clear();
      if (kind === 'material') drawMaterial(v.ctx); else drawLitho(v.ctx);
    }
    v.onResize = draw; draw();
    note.textContent = kind === 'material'
      ? '같은 모양의 렌즈라도 빛을 더 잘 꺾는 유리(굴절률이 큰 유리)로 만들면 빛이 더 많이 꺾여 초점이 렌즈에 더 가까워져요. (계산은 다루지 않아요)'
      : '마스크(회로 그림)를 렌즈에서 2f보다 멀리 두면, 작고 거꾸로 선 실상이 웨이퍼 위에 맺혀요. 이 그림은 4배로 줄여 새기는 모습이에요 — 그래서 반도체·디스플레이 공정에 렌즈가 꼭 필요해요.';
  }
  function miniLens(ctx, x, y, R, t) {
    ctx.save(); ctx.beginPath();
    ctx.moveTo(x, y - R); ctx.quadraticCurveTo(x + 2 * t, y, x, y + R); ctx.quadraticCurveTo(x - 2 * t, y, x, y - R); ctx.closePath();
    ctx.fillStyle = C('--color-primary-tint'); ctx.fill(); ctx.strokeStyle = C('--color-primary'); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  function drawMaterial(ctx) {
    [[0, '굴절률 1.5 (보통 유리)', 1.5], [480, '굴절률 1.7 (빛을 더 잘 꺾는 유리)', 1.7]].forEach(function (pn) {
      var ox = pn[0], y = 210, lx = ox + 130, fpx = 250 * (0.5 / (pn[2] - 1));   // 같은 모양 → 초점거리는 (n−1)에 반비례
      label(ctx, pn[1], ox + 240, 34, { size: 24, weight: 800 });
      ctx.save(); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 1.5; ctx.setLineDash([10, 6]); line(ctx, ox + 20, y, ox + 460, y); ctx.restore();
      [-80, -40, 0, 40, 80].forEach(function (yy) {
        ctx.save(); SK.applyStroke(ctx, { color: C('--color-sim-lens'), dash: [], width: 3 });
        ctx.beginPath(); ctx.moveTo(ox + 24, y + yy); ctx.lineTo(lx, y + yy);
        var fx = lx + fpx, ex = ox + 456; ctx.lineTo(ex, y + yy + (0 - yy) * (ex - lx) / fpx); ctx.stroke(); ctx.restore();
      });
      miniLens(ctx, lx, y, 100, 18);
      ctx.fillStyle = C('--color-sim-lens'); ctx.beginPath(); ctx.arc(lx + fpx, y, 8, 0, Math.PI * 2); ctx.fill();
      label(ctx, '초점', lx + fpx, y + 130, { size: 22, weight: 800, color: '--color-sim-lens-text', bg: '--color-paper-raised' });
      ctx.save(); ctx.strokeStyle = C('--color-sim-lens'); ctx.lineWidth = 2; ctx.setLineDash([4, 5]); line(ctx, lx + fpx, y + 8, lx + fpx, y + 112); ctx.restore();
    });
    ctx.save(); ctx.strokeStyle = C('--color-line'); ctx.lineWidth = 2; line(ctx, 480, 20, 480, 380); ctx.restore();
  }
  function drawLitho(ctx) {
    var y = 190, lx = 520, sc = 7, f = 10, s = 50, si = s * f / (s - f), m = -si / s;   // 4배 축소
    var mx = lx - s * sc, wx = lx + si * sc, H = 120;
    ctx.save(); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 1.5; ctx.setLineDash([10, 6]); line(ctx, 20, y, 940, y); ctx.restore();
    for (var i = 0; i < 3; i++) SK.arrow(ctx, 20, y - 80 + i * 80, mx - 26, y - 80 + i * 80, { color: '--color-q-energy-p', width: 4 });
    label(ctx, '빛', 40, y - 110, { size: 22, weight: 800, color: '--color-q-energy-p-text' });
    ctx.save(); ctx.fillStyle = C('--color-paper-sunk'); ctx.strokeStyle = C('--color-ink-muted'); ctx.lineWidth = 2;
    ctx.fillRect(mx - 8, y - H, 16, 2 * H); ctx.strokeRect(mx - 8, y - H, 16, 2 * H); ctx.restore();
    drawShape(ctx, 'F', mx, y, H * 0.5, H, { body: C('--color-ink') });
    label(ctx, '마스크 (회로 그림)', mx, y + H + 26, { size: 22, weight: 700 });
    // 마스크 꼭대기에서 나온 광선 ①③② → 웨이퍼 위 상 꼭대기 (세로는 그림용으로 키움)
    var tip = H, tipImg = m * H, yLs = [tip, 0, -tip * f / (s - f)];
    yLs.forEach(function (yL, j) {
      ctx.save(); SK.applyStroke(ctx, SK.recStyle(j === 0 ? 0 : j === 1 ? 2 : 1));
      ctx.beginPath(); ctx.moveTo(mx, y - tip); ctx.lineTo(lx, y - yL); ctx.lineTo(wx, y - tipImg); ctx.stroke(); ctx.restore();
    });
    miniLens(ctx, lx, y, 130, 14);
    label(ctx, '렌즈', lx, y - 150, { size: 22, weight: 700, color: '--color-primary' });
    ctx.save(); ctx.fillStyle = C('--color-ink-muted'); ctx.fillRect(wx - 5, y - 70, 10, 140); ctx.restore();
    drawShape(ctx, 'F', wx + 14, y, Math.abs(tipImg) * 0.5, tipImg, { body: C('--color-sim-lens') });
    label(ctx, '웨이퍼 (반도체 판)', wx + 30, y + 100, { size: 22, weight: 700, align: 'left' });
    label(ctx, '작고 거꾸로 선 실상 (1/4 크기)', wx + 30, y - 100, { size: 20, weight: 700, align: 'left', color: '--color-sim-lens-text' });
  }
})();
