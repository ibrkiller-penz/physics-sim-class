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
  var AXIS = 310, RAIL = 592, HY = 666;      // 광축 y, 광학대 윗면 y, 손잡이 가운데 y
  var XL = 25, XR = 1225;                    // −50 cm, +100 cm
  var Y_TOP = AXIS / SY, Y_BOT = -(RAIL - 6 - AXIS) / SY;  // 광선을 그리는 세로 범위(cm)
  var WIN = { x: 935, y: 12, w: 300, h: 300, top: 38, scale: 12 }; // 정면 보기 창, 1 cm = 12 u
  var RAY_SPEED = 560;                       // 실행 연출: 빛이 나아가는 빠르기 (u/s)
  var TYPES = ['arrow', 'candle', 'F', 'far'];
  var BLOCKERS = ['none', 'top', 'hole'];
  var BLOCKER_TEXT = { none: '없음', top: '위 절반', hole: '가운데 구멍' };
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
    steps: ['예측', '실험', '규칙 찾기', '생각해 보기'],
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
      if (animT * RAY_SPEED >= Math.max(maxLen, 300) + 30) SK.finish('빛이 한 점에 모여 상이 생겼어요 — S 로 기록해요');
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
  SK.el.band.style.gridTemplateColumns = 'minmax(0, 5.3fr) minmax(0, 2.8fr) minmax(0, 4.3fr)';
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { SK.requestRender(); });

  /* ------------------------------------------------------------------
     4. 상황 바꾸기 (요구 B) — 광선 3 · 가림판 · 스크린 · 물체 종류
     ------------------------------------------------------------------ */
  var raysBox = h('div', { class: 'lens-rays', role: 'group', 'aria-label': '광선' });
  var raysCtl = h('div', { class: 'ctl' }, [h('div', { class: 'ctl__label' }, ['광선 켜고 끄기 (Q · W · E)', h('span', { class: 'tag tag--live', title: '바꾸면 바로 반영돼요' }, '즉시')]), raysBox]);
  SK.panel('situation').appendChild(raysCtl);
  [['ray1', '① 나란히 → 초점'], ['ray2', '② 초점 → 나란히'], ['ray3', '③ 가운데 직진']].forEach(function (r, i) {
    var api = SK.addToggle(raysBox, { key: r[0], label: r[1], value: true, record: false });
    var icon = SK.swatch(SK.recStyle(i));
    icon.setAttribute('class', 'lens-ray-icon');
    var txt = api.el.querySelector('.check__text');
    txt.insertBefore(icon, txt.firstChild);
  });
  SK.addChoice('situation', {
    key: 'blocker', label: '가림판 (D)', apply: 'live', value: 'none', onChange: changed,
    options: [{ value: 'none', label: '없음' }, { value: 'top', label: '위 절반' }, { value: 'hole', label: '가운데 구멍' }]
  });
  SK.addToggle('situation', { key: 'screen', label: '스크린 (I)', value: true, record: false, onText: '켬', offText: '끔 (치움)' });
  SK.addChoice('situation', {
    key: 'type', label: '물체 종류 (O)', apply: 'live', style: 'cards', value: 'arrow',
    onChange: function () { changed(); syncUI(); },
    options: [{ value: 'arrow', label: '화살표' }, { value: 'candle', label: '촛불' }, { value: 'F', label: '글자 F' }, { value: 'far', label: '먼 풍경', sub: '아주 멀리' }]
  });
  SK.controls.type.el.classList.add('lens-types');

  /* ------------------------------------------------------------------
     5. 수치 바꾸기 (요구 A) — 결정서 §4 값 그대로
     ------------------------------------------------------------------ */
  SK.addVar('values', { key: 'f', label: '초점거리', symbol: 'f', unit: 'cm', min: 5, max: 20, step: 1, value: 10, decimals: 0, ticks: [5, 10, 15, 20], apply: 'live', onChange: changed });
  SK.addVar('values', { key: 's', label: '물체 거리', symbol: 's', unit: 'cm', min: 3, max: 50, step: 1, value: 30, decimals: 0, ticks: [10, 20, 30, 40, 50], apply: 'live', onChange: changed, hint: '실험 화면의 「물체」 손잡이를 끌어도 돼요' });
  SK.addVar('values', { key: 'h', label: '물체 높이', unit: 'cm', min: 2, max: 6, step: 1, value: 4, decimals: 0, ticks: [2, 4, 6], apply: 'live', onChange: changed });
  SK.addVar('values', { key: 'screenX', label: '스크린 위치', unit: 'cm', min: 5, max: 100, step: 1, value: 15, decimals: 0, ticks: [20, 40, 60, 80, 100], apply: 'live', record: false });

  /* 표시 도구 */
  SK.addToggle('tools', { key: 'marks', label: 'f · 2f 표시 (광학대 바닥)', value: true });
  SK.addToggle('tools', { key: 'ruler', label: '눈금자 (거리·높이 표시)', value: true });
  SK.addToggle('tools', { key: 'fan', label: '렌즈 전체를 지나는 빛 다발', value: false });
  SK.addToggle('tools', { key: 'hideF', label: '초점거리 숨기기 (맞히기)', value: false, onChange: function () { syncUI(); renderTable(); } });
  SK.panel('tools').appendChild(h('button', { class: 'btn lens-tool-btn', type: 'button', onclick: function (e) { if (e.detail > 0) e.currentTarget.blur(); ruleCard(); } }, ['규칙 카드', h('span', { class: 'btn__key', text: 'G' })]));

  /* 심화 ▸ (교육과정 해설: 렌즈 제작자 공식 제외 → 그림으로만) */
  SK.panel('deep').appendChild(h('div', { class: 'lens-deep' }, [
    h('p', { text: '계산 없이 그림으로만 봐요.' }),
    h('button', { class: 'btn', type: 'button', onclick: function (e) { if (e.detail > 0) e.currentTarget.blur(); figureDialog('material'); } }, '렌즈 재료(굴절률 1.5 / 1.7) 비교 ▸'),
    h('button', { class: 'btn', type: 'button', onclick: function (e) { if (e.detail > 0) e.currentTarget.blur(); figureDialog('litho'); } }, '포토리소그래피: 축소 투영 ▸')
  ]));

  /* ------------------------------------------------------------------
     6. 하단 띠: 계기판 | 상의 모습 | 기록 표 (그래프 없음)
     ------------------------------------------------------------------ */
  meters = SK.meters(null, [
    { key: 's', label: '물체 거리', unit: 'cm', decimals: 0, size: 'md' },
    { key: 'si', label: '상 거리', unit: 'cm', decimals: 0, size: 'md' },
    { key: 'hi', label: '상 크기', unit: 'cm', decimals: 1, size: 'md' },
    { key: 'm', label: '배율', unit: '배', decimals: 1, size: 'md' }
  ]);
  kindEls = {
    main: h('span', { class: 'lens-kind__main', text: '–' }),
    easy: h('span', { class: 'lens-kind__easy', text: '' }),
    sub: h('span', { class: 'lens-kind__sub', text: '' })
  };
  SK.el.graph.appendChild(h('div', { class: 'lens-kind', 'aria-live': 'polite' }, [h('span', { class: 'lens-kind__label', text: '상의 모습' }), kindEls.main, kindEls.easy, kindEls.sub]));

  rt = SK.recordTable(null, {
    columns: [
      { key: 'fText', label: 'f', unit: 'cm', from: 'value', changed: function (r, p) { return r.values.fNum !== p.values.fNum; } },
      { key: 'sObjT', label: '물체 거리', unit: 'cm', from: 'value', changed: true },
      { key: 'sImgT', label: '상 거리', unit: 'cm', from: 'value' },
      { key: 'hObjT', label: '물체 크기', unit: 'cm', from: 'value', changed: true },
      { key: 'hImgT', label: '상 크기', unit: 'cm', from: 'value' },
      { key: 'mT', label: '배율', unit: '배', from: 'value' },
      { key: 'orient', label: '바로/거꾸로', unit: '', from: 'value' },
      { key: 'kind', label: '실/허', unit: '', from: 'value' },
      { key: 'sharpT', label: '선명도', unit: '%', from: 'value' }
    ]
  });
  eqBtn = h('button', { class: 'btn btn--sm lens-eqbtn', type: 'button', 'aria-pressed': 'false', title: '물체 거리와 상 거리가 같은 기록을 찾아 강조해요' }, '같은 거리 찾기');
  var recHead = rt.el.querySelector('.rec-box__head');
  recHead.insertBefore(eqBtn, recHead.lastChild);
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
      name: '초점거리는 얼마일까?', tag: '탐구 재현',
      change: '먼 풍경에서 스크린 옮기기 → 물체 40·30·20·15·12 cm, 선명한 곳에서 S',
      fixed: 'f 숨김(H로 공개), 물체 높이 4 cm, 광선 끔',
      values: preset({ type: 'far', s: 40, screenX: 30, hideF: true, ray1: false, ray2: false, ray3: false }),
      predict: {
        question: '물체를 렌즈 쪽으로 옮기면 상은 어떻게 될까?',
        choices: ['커지고, 렌즈에서 멀어진다', '커지고, 렌즈에 가까워진다', '작아지고, 렌즈에서 멀어진다', '작아지고, 렌즈에 가까워진다'],
        info: '1단계: 먼 풍경 — 스크린을 끌어 가장 선명한 곳을 찾아요(기록 없이 관찰). 2단계: 물체를 화살표(O)로 바꾸고 40 → 30 → 20 → 15 → 12 cm로 옮길 때마다 선명한 곳에 스크린을 두고 S (기록 5칸).'
      },
      onApply: function (p) {
        presetApplied(p);
        if (SK.records.length) setTimeout(function () { SK.notice('기록 칸이 ' + (5 - SK.records.length) + '개 남았어요 — 5번 기록하려면 먼저 C 로 지워요', 'warn', 5000); }, 50);
      }
    },
    {
      name: '2f에 두면 상은?', tag: '대표 문항',
      change: '물체 거리 20 cm (= 2f)', fixed: 'f 10 cm, 물체 높이 4 cm, 스크린 20 cm',
      values: preset({ type: 'arrow', s: 20, screenX: 20 }),
      predict: { question: '물체를 2f(20 cm)에 두면 상은 어디에, 어떤 크기로 생길까?', choices: ['10 cm, 물체보다 작게', '20 cm, 물체와 같은 크기', '40 cm, 물체보다 크게'] },
      onApply: presetApplied
    },
    {
      name: '프로젝터: 2배로 키우려면?', tag: '생활 속',
      change: '물체(슬라이드 F) 15 cm → 더 크게 하려면?', fixed: 'f 10 cm, 물체 높이 4 cm, 스크린 30 cm',
      values: preset({ type: 'F', s: 15, screenX: 30 }),
      predict: { question: '프로젝터 화면(상)을 더 크게 하려면 슬라이드(물체)를 어느 쪽으로 옮길까?', choices: ['렌즈 쪽으로', '렌즈에서 멀리', '어느 쪽이든 같다'], info: '지금은 15 cm에서 2배예요. 옮긴 뒤 스크린도 선명한 곳으로 옮겨 보세요.' },
      onApply: presetApplied
    },
    {
      name: '돋보기: 스크린을 치우면?', tag: '생활 속',
      change: '물체 5 cm (초점 안쪽), 스크린 끔', fixed: 'f 10 cm, 물체 높이 4 cm',
      values: preset({ type: 'F', s: 5, screenX: 15, screen: false }),
      predict: { question: '스크린을 치우면 상은 어떻게 될까?', choices: ['사라진다', '그 자리에 그대로 있다'], info: '오른쪽 위 창이 「눈으로 본 모습」으로 바뀌어요.' },
      onApply: presetApplied
    },
    {
      name: '렌즈를 반쯤 가리면?', tag: '오개념',
      change: '가림판 위 절반', fixed: 'f 10 cm, 물체 30 cm, 높이 6 cm, 스크린 15 cm',
      values: preset({ type: 'candle', s: 30, h: 6, screenX: 15, blocker: 'top', fan: true }),   // 높이 6: 상(3 cm)이 정면 창에서 모양을 알아볼 만큼 크게
      predict: { question: '렌즈 위쪽 절반을 가리면 스크린의 상은?', choices: ['상이 반쪽만 생긴다', '상은 그대로, 어두워진다', '상이 사라진다'] },
      onApply: presetApplied
    }
  ]);

  /* ------------------------------------------------------------------
     8. 수업 안내 (요구 D 대응표 — 결정서 §4-5 와 같은 내용)
     ------------------------------------------------------------------ */
  SK.guide({
    rows: [
      { target: '초점거리 f (5~20 cm, 1 cm, 기본 10 · 즉시 · 프리셋 1은 숨김)', standard: '[12물리03-02] 탐구 활동 「상의 위치와 초점거리 찾기」, 학교 렌즈 f≈10 cm', discover: 'f가 짧을수록 빛이 많이 꺾여 상이 렌즈 가까이 생긴다', misconception: '—' },
      { target: '물체 거리 (3~50 cm, 1 cm, 기본 30 · 즉시 · 드래그)', standard: '탐구 활동의 핵심 조작 변인', discover: '2f 밖: 작은 거꾸로 실상 / 2f: 같은 크기 / f~2f: 큰 거꾸로 실상 / f 안: 바로 선 허상. 물체가 다가오면 상은 멀어지고 커진다', misconception: '상은 그림이 통째로 옮겨진 것' },
      { target: '물체 높이 (2~6 cm, 1 cm, 기본 4 · 즉시)', standard: '변인 통제', discover: '배율은 물체 높이와 관계없다', misconception: '—' },
      { target: '스크린 위치 (5~100 cm, 1 cm, 기본 15 · 즉시 · 드래그)', standard: '탐구 활동(스크린을 옮겨 선명한 곳 찾기)', discover: '선명한 위치는 한 곳뿐이다', misconception: '스크린이 없으면 상이 없다' },
      { target: '광선 ①②③ (상황, 각각 켬/끔 · Q W E)', standard: '해설 「광선 추적법」', discover: '두 광선만 있어도 교점(상)이 정해진다', misconception: '—' },
      { target: '가림판 (상황, 없음/위 절반/가운데 구멍 · D)', standard: '[12물리03-02] 상 맺힘 원리', discover: '상은 그대로 생기고 어두워질 뿐이다 (다른 길로 온 빛이 같은 점에 모인다)', misconception: '렌즈를 반 가리면 상도 반쪽' },
      { target: '스크린 (상황, 켬/끔 · I)', standard: '실상·허상 구분', discover: '허상은 스크린에 맺히지 않는다. 스크린을 치워도 실상은 그 자리에 있다', misconception: '스크린이 없으면 상이 없다' },
      { target: '물체 종류 (상황, 화살표/촛불/F/먼 풍경 · O)', standard: 'F: 뒤집힘 관찰 / 먼 풍경: f 대략 재기', discover: '실상은 위아래·좌우가 모두 뒤집힌다. 먼 풍경의 상은 초점 근처에 생긴다', misconception: '—' },
      { target: '굴절률 1.5/1.7, 포토리소그래피 (심화 ▸)', standard: '해설 「렌즈 제작자 공식 제외」 → 그림으로만', discover: '—', misconception: '—' }
    ],
    sections: [
      { title: '수업 흐름', items: [
        '① 예측: 프리셋 5(반 가리기) 또는 1(물체를 옮기면?)의 예측 카드',
        '② 실험: 물체·스크린 손잡이를 끌고, 광선을 하나씩 켜며(Q W E) 설명',
        '③ 규칙 찾기: 물체 거리 40·30·20·15·12 cm에서 S → 「같은 거리 찾기」 → H로 f 공개 → 규칙 카드(G)',
        '④ 생각해 보기: 스크린을 치우면?(프리셋 4) · 프로젝터 화면을 키우려면?(프리셋 3) · 포토리소그래피(심화)'
      ] },
      { title: '이렇게 그렸어요 (교사용)', items: [
        '내부 계산은 얇은 렌즈 근사이며 화면에 식을 띄우지 않아요(교육과정 해설: 결상 공식 다루지 않음).',
        '축척: 광학대 가로 1 cm = 8 u, 세로는 1.75배(1 cm = 14 u)로 늘려 그렸어요. 직선과 교점은 그대로예요.',
        '광선 ①②가 렌즈 지름(6 cm) 밖을 지날 때는 렌즈 가운데 면(세로 점선)을 늘려 그린 작도선이에요. 빛 다발은 실제 렌즈 안(±3 cm)만 지나요.',
        '가림판 밝기: 위 절반 50%, 가운데 구멍(지름 3 cm) 25%(빛이 지나는 넓이 비). 구멍이면 초점이 어긋났을 때 흐림도 절반으로 줄어요.',
        '「초점거리 숨기기」를 켜면 f 슬라이더·f/2f 표시·상 거리·상 크기·배율이 가려지고, 기록 표의 상 거리는 스크린 위치(측정값)로 남아요. 공중에 뜬 실상도 그리지 않아 학생은 스크린을 옮기며 정면 창·선명도로만 찾아요. H로 공개.',
        '직전(흐린 윤곽·표의 「직전」 줄) = 마지막으로 값을 바꾸기 전의 상이에요. S로 기록하면 화면에 기록 번호 윤곽(색+선 모양)이 남아요.'
      ] }
    ],
    keys: 'Q · W · E 광선 ①②③ · D 가림판 · I 스크린 · O 물체 종류 · G 규칙 카드'
  });

  /* '생각해 보기' 판 — 그 단계에서만 */
  var think = h('div', { class: 'think lens-think', 'data-step-only': '생각해 보기', hidden: true }, [
    h('span', { class: 'think__label', text: '생각해 보기' }),
    h('ol', null, [
      h('li', { text: '스크린을 치우면 상은 사라질까? (프리셋 4, I)' }),
      h('li', { text: '프로젝터 화면을 더 크게 하려면 슬라이드를 어느 쪽으로? (프리셋 3)' }),
      h('li', { text: '반도체 회로는 어떻게 아주 작게 새길까? (심화 ▸)' })
    ])
  ]);
  SK.el.stage.appendChild(think);

  /* ------------------------------------------------------------------
     9. 키 (공통 키와 겹치지 않음)
     ------------------------------------------------------------------ */
  function cycle(key, list) { var i = list.indexOf(SK.get(key)); SK.set(key, list[(i + 1) % list.length]); }
  SK.onKey(function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    switch (e.code) {
      case 'KeyQ': if (!e.repeat) SK.set('ray1', !SK.get('ray1')); return true;
      case 'KeyW': if (!e.repeat) SK.set('ray2', !SK.get('ray2')); return true;
      case 'KeyE': if (!e.repeat) SK.set('ray3', !SK.get('ray3')); return true;
      case 'KeyD': if (!e.repeat) { cycle('blocker', BLOCKERS); SK.notice('가림판: ' + BLOCKER_TEXT[SK.get('blocker')], 'info', 1200); } return true;
      case 'KeyI': if (!e.repeat) { SK.set('screen', !SK.get('screen')); SK.notice(SK.get('screen') ? '스크린 켬' : '스크린 치움 — 오른쪽 위 창은 「눈으로 본 모습」', 'info', 1500); } return true;
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
    if (SK.records.length && sig === lastRecSig) { SK.notice('지금 상태는 이미 기록했어요 — 물체나 스크린을 옮긴 뒤 S', 'info'); return; }
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
      var dx = Math.abs(pt.x - x), d = null;
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
  cv.addEventListener('pointerdown', function (e) {
    var pt = SK.view.toLogical(e), hh = hit(pt);
    if (!hh) return;
    drag = { key: hh.key, id: e.pointerId };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    e.preventDefault();
    dragTo(pt);
  });
  cv.addEventListener('pointermove', function (e) {
    if (drag && e.pointerId === drag.id) { dragTo(SK.view.toLogical(e)); return; }
    if (e.pointerType === 'mouse') cv.style.cursor = hit(SK.view.toLogical(e)) ? 'grab' : '';
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
    if (meters) ['si', 'hi', 'm'].forEach(function (k) {
      var el = meters.el.querySelector('.meter[data-key="' + k + '"]');
      if (el) el.classList.toggle('is-hidden-value', hid);
    });
    SK.requestRender();
  }
  function status(p) {
    var fT = p.hideF ? (SK.isTeacher() ? 'f = ' + p.f + ' cm (숨김 공개 중)' : 'f = ? cm (숨김 — H로 공개)') : 'f = ' + p.f + ' cm';
    return fT + ' · 스크린 ' + (p.screen ? '켬' : '끔') + ' · 가림판 ' + BLOCKER_TEXT[p.blocker];
  }
  function onStep(i, name) {
    if (name === '규칙 찾기') SK.notice('기록 표의 「같은 거리 찾기」를 눌러 보세요 — 물체 거리와 상 거리가 같은 줄이 있나요?', 'info', 5000);
  }

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
      v.sImgT = im.kind === 'none' ? '∞' : dist(im.si);
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
    if (!found.length) { SK.notice('물체 거리와 상 거리가 같은 기록이 아직 없어요 — 물체를 옮기며 S 로 더 기록해 보세요', 'info', 4000); return; }
    eqOn = true; eqBtn.setAttribute('aria-pressed', 'true'); postTable();
    var r = found[0];
    SK.notice('기록 ' + r.n + ': 물체 거리 = 상 거리 = ' + r.values.sObjT + ' cm — 이 거리와 초점거리는 어떤 관계일까요?', 'ok', 6000);
  }

  /* ------------------------------------------------------------------
     14. 그리기
     ------------------------------------------------------------------ */
  function render(view, p) {
    var ctx = view.ctx, im = Phys.image(p), sc = Phys.screen(p, im), bl = Phys.blocker(p.blocker);
    var showF = p.marks && !hidden();
    var reveal = (SK.started && !SK.finished) ? animT * RAY_SPEED : Infinity;
    var done = reveal === Infinity;

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
    if (!p.screen) drawEye(ctx);
    drawWindow(ctx, p, im, sc, bl, done);
    updateBand(p, im, sc);
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
      if (major) label(ctx, String(Math.abs(cm)), x, RAIL + 27, { size: 20, weight: cm === 0 ? 800 : 600, color: cm === 0 ? '--color-ink' : '--color-ink-muted' });
    }
    label(ctx, '(cm)', XR + 4, RAIL - 14, { size: 20, align: 'right', color: '--color-ink-muted', weight: 500 });
    // f · 2f 표시 (양쪽, 바닥)
    if (showF) {
      [[-2, '2F'], [-1, 'F'], [1, 'F'], [2, '2F']].forEach(function (m) {
        var xcm = m[0] * p.f; if (xcm < -50 || xcm > 100) return;
        var x = X(xcm);
        ctx.fillStyle = C('--color-sim-lens');
        ctx.beginPath(); ctx.moveTo(x, RAIL - 2); ctx.lineTo(x - 11, RAIL - 22); ctx.lineTo(x + 11, RAIL - 22); ctx.closePath(); ctx.fill();
        label(ctx, m[1], x, RAIL - 38, { size: 22, weight: 800, color: '--color-sim-lens-text', bg: '--color-paper-raised' });
        if (Math.abs(m[0]) === 1) { ctx.beginPath(); ctx.arc(x, AXIS, 6, 0, Math.PI * 2); ctx.fill(); }
      });
    }
    ctx.restore();
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
    label(ctx, p.blocker === 'top' ? '가림판 (위 절반)' : '가림판 (가운데 구멍)', x - 10, 40, { size: 20, align: 'right', weight: 700, color: '--color-ink-muted', bg: '--color-paper-raised' });
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
    ctx.globalAlpha = 1; ctx.strokeStyle = C('--color-primary'); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    label(ctx, '볼록렌즈', LX, AXIS - R - 18, { size: 20, weight: 700, color: '--color-primary', bg: '--color-paper-raised', bgAlpha: 0.8 });
  }

  function drawObject(ctx, p) {
    var cols = { body: C('--color-ink'), flame: C('--color-q-energy-p'), trunk: C('--color-ink-muted') };
    if (p.type === 'far') {
      var tx = XL + 40;
      drawShape(ctx, 'far', tx, AXIS, 3 * SY, 3 * SY, { body: C('--color-q-energy-k'), trunk: C('--color-ink-muted') });
      label(ctx, '아주 먼 풍경 (∞) →', XL + 4, AXIS + 30, { size: 20, align: 'left', weight: 700, bg: '--color-paper-raised' });
      return;
    }
    var x = X(-p.s);
    ctx.save(); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 3; line(ctx, x, AXIS, x, RAIL); ctx.restore(); // 받침대
    drawShape(ctx, p.type, x, AXIS, p.h * SY, p.h * SY, cols);
    label(ctx, '물체', x, Y(p.h) - 18, { size: 20, weight: 700, bg: '--color-paper-raised', bgAlpha: 0.8 });
  }

  function drawImage(ctx, p, im, sc, bl) {
    var col = { body: C('--color-sim-lens'), flame: C('--color-q-energy-p'), trunk: C('--color-sim-lens') };
    if (im.kind === 'none') {
      label(ctx, '상이 생기지 않아요 — 빛이 나란히 나가요 (무한히 멀리)', LX + 300, AXIS + 120, { size: 22, weight: 700, color: '--color-sim-lens-text', bg: '--color-paper-raised' });
      return;
    }
    var si = im.si, hi = im.hi;
    if (im.kind === 'real') {
      // 초점거리 숨기기(맞히기) 중에는 공중에 뜬 실상을 그리지 않는다 — 상 위치가 곧 답이 되므로,
      // 학생은 스크린을 옮기며 정면 보기 창·선명도 막대로만 찾는다 (탐구 활동 재현)
      if (hidden()) return;
      if (si > 100) {
        SK.arrow(ctx, XR - 120, AXIS + 46, XR - 6, AXIS + 46, { color: '--color-sim-lens', width: 5 });
        label(ctx, '상이 광학대 밖 ' + dist(si) + ' cm에 생겨요', XR - 8, AXIS + 84, { size: 22, weight: 700, align: 'right', color: '--color-sim-lens-text', bg: '--color-paper-raised' });
        return;
      }
      var cut = p.screen && p.screenX < si - 0.5;     // 스크린이 상보다 앞에서 빛을 막음
      var x = X(si);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1250, RAIL - 2); ctx.clip();
      drawShape(ctx, p.type, x, AXIS, Math.abs(hi) * SY, hi * SY, { body: col.body, flame: col.flame, trunk: col.trunk, alpha: bl.bright * (cut ? 0.5 : 1), dashed: cut });
      ctx.restore();
      var tipY = clamp(Y(hi), 20, RAIL - 30);
      if (cut) label(ctx, '상이 생길 자리 (스크린이 빛을 먼저 막아요)', x + 14, tipY + 14, { size: 20, align: 'left', weight: 600, color: '--color-ink-muted', bg: '--color-paper-raised' });
      else label(ctx, '실상', x, Math.min(tipY + 26, RAIL - 90), { size: 22, weight: 800, color: '--color-sim-lens-text', bg: '--color-paper-raised', bgAlpha: 0.8 });
      if (Y(hi) > RAIL - 4) label(ctx, '상이 화면보다 커요 (' + fmt(Math.abs(hi), 1) + ' cm)', x + 14, RAIL - 60, { size: 20, align: 'left', color: '--color-sim-lens-text', bg: '--color-paper-raised' });
    } else {
      if (si < -50) {
        SK.arrow(ctx, XL + 110, AXIS - 46, XL + 4, AXIS - 46, { color: '--color-sim-lens', width: 5, dash: [8, 6] });
        label(ctx, '허상은 렌즈 앞 ' + dist(-si) + ' cm (광학대 밖)', XL + 8, AXIS - 84, { size: 22, weight: 700, align: 'left', color: '--color-sim-lens-text', bg: '--color-paper-raised' });
        return;
      }
      var xv = X(si);
      drawShape(ctx, p.type, xv, AXIS, Math.abs(hi) * SY, hi * SY, { body: col.body, flame: col.flame, trunk: col.trunk, alpha: 0.5 * bl.bright, dashed: true });
      var ty = clamp(Y(hi), 30, RAIL - 30);
      label(ctx, '허상', xv - 14, ty, { size: 22, align: 'right', weight: 800, color: '--color-sim-lens-text', bg: '--color-paper-raised', bgAlpha: 0.8 });
      if (Y(hi) < 4) label(ctx, '상이 화면보다 커요 (' + fmt(Math.abs(hi), 1) + ' cm)', xv - 14, 60, { size: 20, align: 'right', color: '--color-sim-lens-text', bg: '--color-paper-raised' });
    }
  }

  function drawScreen(ctx, p, im, sc, done) {
    if (!p.screen) return;
    var x = X(p.screenX), top = AXIS - 46;
    ctx.save();
    ctx.fillStyle = C('--color-paper-sunk'); ctx.fillRect(x - 5, top, 10, RAIL - top);
    ctx.strokeStyle = C('--color-ink-muted'); ctx.lineWidth = 2; ctx.strokeRect(x - 5, top, 10, RAIL - top);
    ctx.restore();
    label(ctx, '스크린', x, top - 18, { size: 20, weight: 700, bg: '--color-paper-raised', bgAlpha: 0.85 });
    // 선명도 막대
    var right = x > XR - 90, bx = right ? x - 40 : x + 18, by = AXIS + 30, bh = 150, bw = 20;
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
    if (sc.formed && done) {
      var fh = bh * sc.sharp;
      ctx.fillStyle = C(sc.clear ? '--color-ok' : '--color-primary');
      ctx.fillRect(bx + 2, by + bh - fh, bw - 4, fh);
    }
    ctx.restore();
    var tx = right ? bx - 8 : bx + bw + 8, al = right ? 'right' : 'left';
    label(ctx, '선명도', tx, by + 12, { size: 20, align: al, weight: 600, color: '--color-ink-muted' });
    label(ctx, (sc.formed && done) ? Math.round(sc.sharp * 100) + '%' : '–', tx, by + 40, { size: 24, align: al, weight: 800 });
    if (sc.formed && sc.clear && done) label(ctx, '선명!', tx, by + 74, { size: 26, align: al, weight: 900, color: '--color-ok', bg: '--color-ok-tint' });
  }

  function drawRuler(ctx, p, im) {
    var y = RAIL - 62;
    function dim(x1, x2, text, yy) {
      ctx.save(); ctx.strokeStyle = C('--color-ink-muted'); ctx.lineWidth = 2;
      line(ctx, x1, yy, x2, yy); line(ctx, x1, yy - 8, x1, yy + 8); line(ctx, x2, yy - 8, x2, yy + 8);
      ctx.restore();
      label(ctx, text, (x1 + x2) / 2, yy - 16, { size: 20, weight: 700, color: '--color-ink-muted', bg: '--color-paper-raised', bgAlpha: 0.85 });
    }
    if (p.type !== 'far') {
      dim(X(-p.s), LX, '물체 거리 ' + dist(p.s, true) + ' cm', y);
      label(ctx, dist(p.h, true) + ' cm', X(-p.s) - 14, Y(p.h / 2), { size: 20, align: 'right', weight: 700, color: '--color-ink-muted' });
    }
    if (hidden()) {
      if (p.screen) dim(LX, X(p.screenX), '스크린 거리 ' + dist(p.screenX, true) + ' cm', y);
      return;
    }
    if (im.kind === 'real' && im.si <= 100) {
      dim(LX, X(im.si), '상 거리 ' + dist(im.si) + ' cm', y);
      if (Y(im.hi) < RAIL - 70) label(ctx, fmt(Math.abs(im.hi), 1) + ' cm', X(im.si) - 14, Y(im.hi / 2), { size: 20, align: 'right', weight: 700, color: '--color-sim-lens-text', bg: '--color-paper-raised', bgAlpha: 0.8 });
    } else if (im.kind === 'virtual' && im.si >= -50) {
      dim(X(im.si), LX, '상 거리 (렌즈 앞) ' + dist(-im.si) + ' cm', y - 50);
    }
  }

  function drawHandles(ctx, p) {
    function handle(key, x, text) {
      var active = drag && drag.key === key, w = 108, hh = 64;
      ctx.save();
      ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 3; line(ctx, x, RAIL + 14, x, HY - hh / 2);
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
        label(ctx, dist(v, true) + ' cm', x, HY - 64, { size: 26, weight: 800, color: '--color-paper-raised', bg: '--color-ink', bgAlpha: 0.92 });
      }
    }
    if (p.type !== 'far') handle('s', X(-p.s), '물체');
    if (p.screen) handle('screenX', X(p.screenX), '스크린');
  }

  function drawEye(ctx) {
    var x = XR - 34, y = AXIS + 44;
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.strokeStyle = C('--color-ink'); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 26, y); ctx.quadraticCurveTo(x, y - 24, x - 26, y); ctx.quadraticCurveTo(x, y + 24, x + 26, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('--color-ink'); ctx.beginPath(); ctx.arc(x - 6, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    label(ctx, '눈', x, y + 38, { size: 20, weight: 800, bg: '--color-paper-raised' });
  }

  /** 오른쪽 위 정면 보기 창 (스크린 정면 / 눈으로 본 모습) */
  function drawWindow(ctx, p, im, sc, bl, done) {
    var w = WIN, cx0 = w.x + 8, cy0 = w.y + w.top, cw = w.w - 16, ch = w.h - w.top - 8;
    var ax = cx0 + cw / 2, ay = cy0 + ch / 2, k = w.scale;
    var onScreen = p.screen;
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 2;
    roundRect(ctx, w.x, w.y, w.w, w.h, 12); ctx.fill(); ctx.stroke();
    ctx.restore();
    label(ctx, onScreen ? '스크린 정면' : '눈으로 본 모습', w.x + 14, w.y + 20, { size: 22, weight: 800, align: 'left' });
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
        var size = sc.size, blurR = Math.min(46, (sc.b / 2) * k);
        var alpha = bl.bright * clamp(Math.abs(size) / (Math.abs(size) + sc.b), 0.15, 1);
        big = Math.abs(size) * k > ch / 2 - 4;
        drawBlurred(ctx, function (dx, dy) { drawShape(ctx, p.type, ax + dx, ay + dy, size * k, size * k, light); }, blurR, alpha);
        cap = '거꾸로 · ' + fmt(Math.abs(size), 1) + ' cm' + (bl.bright < 1 ? ' · 밝기 ' + Math.round(bl.bright * 100) + '%' : '');
      } else {
        ctx.save(); ctx.globalAlpha = 0.12 * bl.bright; ctx.fillStyle = C('--color-paper-raised');
        ctx.beginPath(); ctx.arc(ax, ay, 90, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        font(ctx, 700, 22); ctx.fillStyle = C('--color-paper-raised'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        wrapText(ctx, im.kind === 'none' ? '상이 맺히지 않아요 (빛이 나란히 나가요)' : '상이 맺히지 않아요 — 스크린을 치우고(I) 렌즈 너머로 보세요', ax, ay - 30, cw - 30, 30);
      }
    } else {
      if (im.kind === 'none') {
        font(ctx, 700, 22); ctx.fillStyle = C('--color-ink'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        wrapText(ctx, '상이 생기지 않아요 (무한히 멀리)', ax, ay - 14, cw - 30, 30);
      } else {
        var H = im.hi;   // 실상: 음수(거꾸로, 좌우도 뒤집힘) · 허상: 양수(바로 섬)
        big = Math.abs(H) * k > ch / 2 - 4;
        ctx.save(); ctx.globalAlpha = bl.bright; drawShape(ctx, p.type, ax, ay, H * k, H * k, dark); ctx.restore();
        cap = (im.kind === 'real' ? '거꾸로 선 상 (공중에 떠 있어요)' : '바로 선 큰 상 (렌즈 너머로)');
      }
    }
    ctx.restore();
    // 물체 정면 (비교용 작은 창)
    var ix = w.x + w.w - 74, iy = cy0 + 6;
    ctx.save();
    ctx.fillStyle = C('--color-paper-raised'); ctx.strokeStyle = C('--color-line-strong'); ctx.lineWidth = 1.5;
    ctx.fillRect(ix, iy, 64, 84); ctx.strokeRect(ix, iy, 64, 84);
    drawShape(ctx, p.type === 'far' ? 'far' : p.type, ix + 32 - (p.type === 'F' ? 6 : 0), iy + 50, 40, 40, { body: C(p.type === 'far' ? '--color-q-energy-k' : '--color-ink'), flame: C('--color-q-energy-p'), trunk: C('--color-ink-muted') });
    ctx.restore();
    label(ctx, '물체', ix + 32, iy + 69, { size: 20, weight: 700, color: '--color-ink-muted' });
    if (cap) {
      if (big) cap += ' · 창보다 큼';
      label(ctx, cap, ax, cy0 + ch - 18, { size: 20, weight: 700, color: capColor, bg: onScreen ? '--color-ink' : '--color-paper-sunk', bgAlpha: 0.85 });
    }
    if (done && onScreen && sc.formed) {
      label(ctx, sc.clear ? '선명!' : '선명도 ' + Math.round(sc.sharp * 100) + '%', cx0 + 10, cy0 + 22, { size: 22, weight: 800, align: 'left', color: sc.clear ? '--color-ok' : '--color-ink', bg: sc.clear ? '--color-ok-tint' : '--color-paper-raised' });
    }
  }

  /** 하단 띠: 계기판 · 상의 모습 */
  var lastKind = '';
  function updateBand(p, im, sc) {
    var far = im.far;
    meters.update({
      s: far ? '∞' : dist(p.s, true),
      si: im.kind === 'none' ? '∞' : dist(im.si),
      hi: im.kind === 'none' ? '–' : fmt(Math.abs(im.hi), 1),
      m: (far || im.kind === 'none') ? '–' : fmt(Math.abs(im.m), 1)
    });
    var main, easy, sub;
    if (im.kind === 'none') { main = '상이 생기지 않아요'; easy = '빛이 나란히 나가요 (무한히 멀리)'; sub = '물체가 초점에 있어요'; }
    else {
      main = im.kind === 'real' ? '거꾸로 선 실상' : '바로 선 허상';
      easy = im.kind === 'real' ? '스크린에 맺히는 상' : '렌즈 너머로 들여다봐야 보이는 상';
      if (far) sub = '먼 풍경의 상은 초점 근처에 작게 생겨요';
      else { var m = Math.abs(im.m); sub = m > 1.05 ? '물체보다 커요' : m < 0.95 ? '물체보다 작아요' : '물체와 같은 크기예요'; }
      if (p.blocker !== 'none') sub += ' · 밝기 ' + Math.round(Phys.blocker(p.blocker).bright * 100) + '%';
    }
    var key = main + easy + sub;
    if (key !== lastKind) { lastKind = key; kindEls.main.textContent = main; kindEls.easy.textContent = easy; kindEls.sub.textContent = sub; }
  }

  /* ------------------------------------------------------------------
     15. 규칙 카드 (H 로 답 공개) · 심화 그림
     ------------------------------------------------------------------ */
  function ruleCard() {
    var lines = [
      ['물체를 렌즈 쪽으로 옮기면 상은', '렌즈에서 멀어지고 커진다', '.'],
      ['물체 거리와 상 거리가 같을 때, 그 거리의 반이', '초점거리', '이고, 상은 물체와 같은 크기다.'],
      ['물체가 초점보다 렌즈에 가까우면 상은', '스크린에 맺히지 않고, 렌즈 너머로 보이는 바로 선 큰 상(허상)', '이다.'],
      ['렌즈를 반쯤 가리면 상은', '그대로 생기고 어두워질 뿐', '이다.']
    ];
    var list = h('ol', { class: 'lens-rules' }, lines.map(function (l) {
      return h('li', null, [l[0], h('span', { class: 'lens-blank', 'aria-label': '빈칸' }, '빈칸'), h('b', { class: 'lens-ans teacher-only', text: l[1] }), l[2]]);
    }));
    SK.dialog({
      title: '규칙 카드 — 기록 표에서 찾은 규칙',
      body: [list, h('p', { class: 'lens-hint', text: SK.isTeacher() ? '교사용 답이 보이는 중이에요 (H).' : '빈칸을 채워 보세요. 교사는 H 를 켠 뒤 열면 답이 보여요.' })],
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
