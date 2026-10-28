/* =====================================================================
   포물선 운동과 역학적 에너지 (projectile-energy) — 화면·조작
   공통 틀 SimKit(../../shared/sim.js) + 물리 계산 PEPhys(pe-physics.js) 위에서 동작.
   근거: docs/04_팀장결정서.md §4-1 (변수 대응표·프리셋·수용 기준)
   ===================================================================== */
(function () {
  'use strict';

  var SK = window.SimKit, PH = window.PEPhys;
  if (!SK || !PH) { document.body.textContent = '공통 틀(shared/sim.js) 또는 pe-physics.js 를 불러오지 못했어요.'; return; }
  var h = SK.h, fmt = SK.fmt;
  var DT = PH.DT;

  /* 실험 화면 배치 (논리 좌표 1250×700, 1 = 1u) */
  var L = { AX: 64, X0: 150, GY: 636, RIGHT: 1225, TOP: 130 };
  var VS = 5;          // 속도 화살표: 1 m/s = 5u
  var ACC_LEN = 72;    // 가속도 화살표 길이(일정)
  var BALL_R = 14;     // 공 지름 28u

  var run = null, st = null;
  var autoBox = { x: 44, y: 12 }, fixedBox = null, manualLock = null;
  var map = { S: 10 };
  var drag = null;
  var holdUntil = 0;
  var curPreset = -1, predBase = null;
  var pick = -1;       // 눌러서 고른 섬광 점 번호 (동영상 분석처럼 그 순간 값 보기)

  function fontSans() { return getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif'; }
  function fontNum() { return getComputedStyle(document.documentElement).getPropertyValue('--font-num').trim() || 'sans-serif'; }
  var FS = '', FN = '';

  function gText(g) { return g === 10 ? '10' : (Math.round(g * 100) / 100).toString(); }
  function mText(p) {
    if (p.air === 'off') return SK.valueText('m', p.m);
    return p.air === 'steel' ? '0.50' : '0.0027';
  }
  function eDec(E0) { return E0 < 10 ? 2 : 1; }

  /* ------------------------------------------------------------------
     축척: 자동(해석해·미리 적분으로 궤적 상자 + 10% 여유) / 고정
     기록이 1개라도 있으면 자동 고정. 자물쇠(L)로 수동 고정·해제.
     ------------------------------------------------------------------ */
  function boxFor(r) { return { x: Math.max(r.R * 1.1, 10), y: Math.max(r.H * 1.1, 5) }; }
  function isLocked() { return manualLock !== null ? manualLock : SK.records.length > 0; }
  function currentBox() {
    if (isLocked()) { if (!fixedBox) fixedBox = autoBox; return fixedBox; }
    fixedBox = null; return autoBox;
  }
  function toggleLock() {
    var on = !isLocked();
    if (on && !fixedBox) fixedBox = autoBox;
    manualLock = on;
    if (!on) fixedBox = null;
    SK.notice(on ? '축척 고정 — 여러 실행을 같은 눈금으로 비교해요 (L)' : '축척 자동 — 궤적에 맞춰 화면을 맞춰요 (L)', 'info');
    SK.update(); SK.requestRender();
  }
  function lockBox(b) { manualLock = true; fixedBox = b; SK.update(); SK.requestRender(); }

  /* ------------------------------------------------------------------
     1. 화면 뼈대
     ------------------------------------------------------------------ */
  SK.init({
    slug: 'projectile-energy',
    title: '포물선 운동과 역학적 에너지',
    subject: '역학과 에너지 (진로 선택)',
    unit: '(1) 시공간과 운동',
    standards: ['12역학01-02', '12물리01-04'],
    today: '수평으로 던진 공과 그냥 떨어뜨린 공, 무엇이 먼저 땅에 닿을까?',
    dt: DT,
    stageFit: true,
    reset: onReset,
    step: physStep,
    render: onRender,
    capture: onCapture,
    save: onSave,
    load: onLoad,
    status: onStatus,
    predictOnPreset: true
  });
  SK.el.band.style.gridTemplateColumns = 'minmax(0, 5fr) minmax(0, 3fr) minmax(0, 5fr)';

  /* ------------------------------------------------------------------
     2. 조절 패널 — 맨 위 g 전환(고정) → 상황 → 수치 → 표시 도구 → 심화
     ------------------------------------------------------------------ */
  var gbar = h('div', { class: 'pe-gbar' });
  SK.el.panel.insertBefore(gbar, SK.el.panel.firstChild);
  SK.addChoice(gbar, {
    key: 'gEarth', label: '지구 중력 가속도 g (G 키)', apply: 'restart',
    options: [{ value: 9.8, label: '9.8', sub: '실제 값' }, { value: 10, label: '10', sub: '계산 쉽게' }],
    value: 9.8, onChange: syncUI
  });

  // 상황 바꾸기 (요구 B)
  SK.addChoice('situation', {
    key: 'planet', label: '어디에서 던질까?', style: 'cards', apply: 'restart',
    options: [
      { value: 'earth', label: '지구', sub: 'g = 9.8' },
      { value: 'moon', label: '달', sub: 'g = 1.62' },
      { value: 'mars', label: '화성', sub: 'g = 3.71' }
    ],
    value: 'earth',
    onChange: function (v) {
      if (v === 'moon' && SK.get('air') !== 'off') SK.notice('달에는 공기가 없어서 공기 저항이 생기지 않아요', 'info', 4000);
      syncUI();
    }
  });
  SK.addChoice('situation', {
    key: 'air', label: '공기 저항', apply: 'restart',
    options: [
      { value: 'off', label: '끔', sub: '이상적 조건' },
      { value: 'steel', label: '쇠공', sub: '0.50 kg' },
      { value: 'pingpong', label: '탁구공', sub: '0.0027 kg' }
    ],
    value: 'off', onChange: syncUI
  });
  SK.addToggle('situation', { key: 'cmp', label: '비교 공 (떨어뜨린 공, B 키)', value: false, apply: 'live', record: false });
  SK.addChoice('situation', {
    key: 'pad', label: '던지는 곳', apply: 'restart', record: false,
    options: [{ value: 'ground', label: '지면', sub: 'h = 0' }, { value: 'cliff', label: '절벽 위', sub: 'h 바꾸기' }],
    value: 'ground',
    onChange: function (v) {
      if (v === 'ground' && SK.get('h') !== 0) SK.set('h', 0);
      else if (v === 'cliff' && SK.get('h') === 0) SK.set('h', 20);
      syncUI();
    }
  });

  // 수치 바꾸기 (요구 A) — 첫 화면 4개
  SK.addVar('values', {
    key: 'v0', label: '처음 속력', symbol: 'v₀', unit: 'm/s',
    min: 0, max: 30, step: 1, value: 20, decimals: 0, precision: 1, ticks: [0, 10, 20, 30], apply: 'restart'
  });
  SK.addVar('values', {
    key: 'theta', label: '던지는 각도', symbol: 'θ', unit: '°',
    min: 0, max: 90, step: 5, value: 45, decimals: 0, precision: 1, ticks: [0, 30, 45, 60, 90], apply: 'restart'
  });
  SK.addVar('values', {
    key: 'h', label: '던지는 높이', symbol: 'h', unit: 'm',
    min: 0, max: 45, step: 5, value: 0, decimals: 0, precision: 1, ticks: [0, 20, 45], apply: 'restart'
  });
  SK.addVar('values', {
    key: 'm', label: '공의 질량', symbol: 'm', unit: 'kg',
    min: 0.1, max: 5, step: 0.1, value: 1, decimals: 1, precision: 2, ticks: [0.1, 1, 5], apply: 'restart'
  });
  var hHint = h('p', { class: 'pe-hint', text: '' });
  SK.controls.h.el.appendChild(hHint);
  var mHint = h('p', { class: 'pe-hint', text: '' });
  SK.controls.m.el.appendChild(mHint);

  // 표시 도구 (즉시)
  SK.addToggle('tools', { key: 'flash', label: '섬광 사진 (0.1 s마다)', value: true });
  SK.addToggle('tools', { key: 'showV', label: '속도 화살표 (A 키)', value: true });
  SK.addToggle('tools', { key: 'showA', label: '가속도 화살표 (A 키)', value: false });
  SK.addToggle('tools', { key: 'shadow', label: '그림자 (x축·y축)', value: false });
  SK.addToggle('tools', { key: 'energy', label: '에너지 막대', value: true });
  SK.addToggle('tools', { key: 'topStop', label: '최고점에서 멈추기', value: false });

  // 심화 ▸ (성취기준 밖: 공기 저항 계수 직접 입력, 식 보기)
  SK.addToggle('deep', { key: 'kCustom', label: '공기 저항 계수 직접 넣기', value: false, apply: 'restart', record: true, onChange: syncUI });
  SK.addVar('deep', {
    key: 'k4', label: '공기 저항 계수', symbol: 'k', unit: '×10⁻⁴ kg/m',
    min: 0.5, max: 50, step: 0.5, value: 5.5, decimals: 1, precision: 2, ticks: [0.5, 3.5, 5.5, 50], apply: 'restart',
    hint: '쇠공 5.5, 탁구공 3.5 (k = ½ρC_dA). 공기 저항을 켰을 때만 쓰여요.'
  });
  var formulaBox = h('div', { class: 'pe-formula', 'aria-live': 'polite' });
  SK.panel('deep').appendChild(h('div', { class: 'pe-formula-wrap' }, [h('p', { class: 'pe-formula__title', text: '식 보기 — 지금 값을 넣으면' }), formulaBox]));

  /* ------------------------------------------------------------------
     3. 실험 화면 위 글자 판: 범례(왼쪽 위) · 축척·자물쇠(오른쪽 위) · 결과 · 생각해 보기
     ------------------------------------------------------------------ */
  var legend = h('div', { class: 'pe-legend', 'aria-label': '화살표 범례' });
  var legendKey = '';

  var scaleText = h('span', { class: 'pe-scale__text num', text: '1칸 = 10 m' });
  var lockLabel = h('span', { text: '자동' });
  var lockBtn = h('button', { class: 'btn pe-lock', type: 'button', title: '축척 고정/자동 (L)', 'aria-pressed': 'false' }, [lockSVG(), lockLabel, h('span', { class: 'btn__key', text: 'L' })]);
  lockBtn.addEventListener('click', function (e) { if (e.detail > 0) lockBtn.blur(); toggleLock(); });
  SK.el.cornerTR.appendChild(h('div', { class: 'pe-scale' }, [scaleText, lockBtn]));
  SK.el.cornerTR.appendChild(legend);
  var resultChip = h('div', { class: 'pe-result', hidden: true, 'aria-live': 'polite' });
  SK.el.cornerTR.appendChild(resultChip);

  var think = h('div', { class: 'think pe-think', 'data-step-only': '정리' }, [
    h('span', { class: 'think__label', text: '생각해 보기' }),
    h('p', { class: 'think__q', text: '수평으로 던지면, 땅에 닿을 때까지 걸리는 시간은 ( ______ )로만 정해진다.' }),
    h('p', { class: 'think__hint teacher-only pe-answer', text: '정답: 던지는 높이 h (와 중력 가속도 g). v₀·질량과는 상관없어요. t = √(2h/g) → 20 m 에서 2 s, 45 m 에서 3 s (g = 10)' }),
    h('p', { class: 'think__hint', text: '더 생각하기: 공기 저항을 켜면 가장 멀리 가는 각도는 45°보다 클까, 작을까? (탁구공으로 35°·40°·45° 를 하나씩 S)' }),
    h('p', { class: 'think__hint teacher-only pe-answer', text: '정답: 작아져요. 탁구공(20 m/s)은 35° 쯤에서 가장 멀리(약 10.3 m), 45° 는 9.9 m. 쇠공은 거의 45° 그대로(38.7 m).' }),
    h('p', { class: 'think__hint', text: '정답은 H 키로 보여 줘요.' })
  ]);
  think.hidden = SK.stepName !== '정리';
  SK.el.cornerBR.appendChild(think);

  function lockSVG() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'pe-lock__icon');
    var body = document.createElementNS(ns, 'rect');
    body.setAttribute('x', '4'); body.setAttribute('y', '11'); body.setAttribute('width', '16'); body.setAttribute('height', '10'); body.setAttribute('rx', '2');
    body.setAttribute('style', 'fill:currentColor');
    var shackle = document.createElementNS(ns, 'path');
    shackle.setAttribute('class', 'pe-lock__shackle');
    shackle.setAttribute('d', 'M8 11V7a4 4 0 0 1 8 0v4');
    shackle.setAttribute('style', 'fill:none;stroke:currentColor;stroke-width:2.4');
    svg.appendChild(shackle); svg.appendChild(body);
    return svg;
  }
  function legendSVG(kind) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 56 20'); svg.setAttribute('aria-hidden', 'true');
    function el(tag, attrs) { var e = document.createElementNS(ns, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
    if (kind === 'v' || kind === 'vc' || kind === 'a') {
      var col = kind === 'a' ? 'var(--color-q-force)' : 'var(--color-q-velocity)';
      el('line', { x1: '3', y1: '10', x2: '42', y2: '10', style: 'stroke:' + col + ';stroke-width:4;stroke-linecap:round' + (kind === 'vc' ? ';stroke-dasharray:7 5' : '') });
      el('path', { d: 'M54 10 L40 3 L40 17 Z', style: 'fill:' + col });
    } else if (kind === 'cmp') {
      el('circle', { cx: '28', cy: '10', r: '8', style: 'fill:var(--color-line-strong);stroke:var(--color-ink-muted);stroke-width:2' });
    } else if (kind === 'flash') {
      el('circle', { cx: '10', cy: '10', r: '5', style: 'fill:var(--color-sim-projectile)' });
      el('circle', { cx: '28', cy: '10', r: '5', style: 'fill:var(--color-sim-projectile)' });
      el('circle', { cx: '46', cy: '10', r: '5', style: 'fill:var(--color-sim-projectile)' });
    }
    return svg;
  }
  function updateLegend(p) {
    var key = [p.showV, p.showA, p.cmp, p.flash, run && run.analytic, run && run.theta > 0].join(',');
    if (key === legendKey) return;
    legendKey = key;
    legend.innerHTML = '';
    function row(kind, text) { legend.appendChild(h('span', { class: 'pe-legend__row' }, [legendSVG(kind), text])); }
    if (p.showV) { row('v', '속도 v'); row('vc', '성분 vₓ·v_y'); }
    if (p.showA) row('a', run && !run.analytic ? '가속도 a' : '가속도 a = g');
    if (p.flash) row('flash', '0.1 s 간격 · 점을 누르면 값');
    if (p.cmp) row('cmp', run && run.theta > 0 ? '비교 공 (옆으로 안 감)' : '비교 공 (떨어뜨린 공)');
    legend.hidden = !legend.children.length;
  }

  /* ------------------------------------------------------------------
     4. 하단 띠: 계기판 | 에너지 막대 | 기록 표 (요구 C)
     ------------------------------------------------------------------ */
  var meters = SK.meters(null, [
    { key: 't', label: '시간', symbol: 't', unit: 's', decimals: 2 },
    { key: 'x', label: '수평 거리', symbol: 'x', unit: 'm', decimals: 1 },
    { key: 'y', label: '높이', symbol: 'y', unit: 'm', decimals: 1 },
    { key: 'vx', label: '수평 속도', symbol: 'vₓ', unit: 'm/s', decimals: 1, q: 'velocity' },
    { key: 'vy', label: '연직 속도', symbol: 'v_y', unit: 'm/s', decimals: 1, q: 'velocity' },
    { key: 'sp', label: '속력', symbol: 'v', unit: 'm/s', decimals: 1, q: 'velocity' }
  ]);
  meters.el.classList.add('pe-meters');

  var energyBox = h('div', { class: 'pe-energy', 'aria-label': '에너지 막대' });
  SK.el.graph.appendChild(energyBox);
  var ev = SK.canvas(energyBox, { fit: false, bg: '--color-paper-raised' });
  ev.onResize = function () { if (run) drawEnergy(SK.params); };

  SK.recordTable(null, {
    columns: [
      { key: 'v0', from: 'param' },
      { key: 'theta', from: 'param' },
      { key: 'h', from: 'param' },
      { key: 'gtxt', label: 'g', unit: 'm/s²', from: 'value', changed: function (r) { return r.changed.indexOf('planet') >= 0 || r.changed.indexOf('gEarth') >= 0; } },
      { key: 'mtxt', label: 'm', unit: 'kg', from: 'value', changed: function (r) { return r.changed.indexOf('m') >= 0 || r.changed.indexOf('air') >= 0; } },
      { key: 'air', from: 'param' },
      { key: 'T', label: '비행 시간', unit: 's', decimals: 2, from: 'value' },
      { key: 'R', label: '수평 거리', unit: 'm', decimals: 1, from: 'value' },
      { key: 'H', label: '최고 높이', unit: 'm', decimals: 1, from: 'value' },
      { key: 'vL', label: '착지 속력', unit: 'm/s', decimals: 1, from: 'value' },
      { key: 'E0t', label: 'E 처음', unit: 'J', from: 'value' },
      { key: 'E1t', label: 'E 착지', unit: 'J', from: 'value' }   // 탁구공(1 J 미만)도 보이게 소수 자리를 에너지 크기에 맞춤
    ]
  });
  // g·m 열의 '바뀜' 굵게는 공통 표의 changed 옵션이 맡는다 (크게 보기 창에서도 같이 굵게 — 최종 통합 점검)
  SK.onRecords(function (records) {
    if (!records.length && manualLock === false) manualLock = null;
    SK.update();
  });

  /* ------------------------------------------------------------------
     5. 프리셋 (교과서 탐구·대표 문항 그대로) — 키 1~5
     ------------------------------------------------------------------ */
  var TOOLS_OFF = { flash: false, showV: false, showA: false, shadow: false, energy: true, topStop: false, cmp: false };
  function vals(o) { var r = {}; var k; for (k in TOOLS_OFF) r[k] = TOOLS_OFF[k]; for (k in o) r[k] = o[k]; r.kCustom = false; return r; }
  var PRESETS = [
    {
      name: '수평으로 던진 공, 떨어뜨린 공보다 늦을까?', tag: '대표 문항',
      change: 'v₀ 10 → 15 → 20 m/s (하나씩 바꿔 S)', fixed: 'h 20 m · θ 0° · g 10 · m 1 kg · 공기 저항 끔',
      values: vals({ planet: 'earth', gEarth: 10, air: 'off', pad: 'cliff', h: 20, v0: 10, theta: 0, m: 1, cmp: true, flash: true, shadow: true }),
      box: { x: 44, y: 30 },
      predict: { question: '절벽(20 m)에서 수평으로 10 m/s로 던진 공과 그냥 떨어뜨린 공(회색), 무엇이 먼저 땅에 닿을까?', choices: ['던진 공이 먼저', '떨어뜨린 공이 먼저', '동시에'] },
      judge: function (p, phase) {
        if (phase !== 'finish' || st.cLand === null) return null;
        var d = st.tLand - st.cLand;
        return { index: Math.abs(d) < 0.005 ? 2 : (d > 0 ? 1 : 0), text: '던진 공 ' + fmt(st.tLand, 2) + ' s · 떨어뜨린 공 ' + fmt(st.cLand, 2) + ' s' };
      }
    },
    {
      name: '날아가는 동안 에너지 합은 변할까?', tag: '탐구 재현',
      change: 'θ 30° → 45° → 60° (착지 속력 비교)', fixed: 'v₀ 10 m/s · h 20 m · g 10 · m 1 kg · 공기 저항 끔',
      values: vals({ planet: 'earth', gEarth: 10, air: 'off', pad: 'cliff', h: 20, v0: 10, theta: 30, m: 1, flash: true, energy: true }),
      box: { x: 30, y: 34 },
      predict: { question: '날아가는 동안 운동 에너지 + 위치 에너지의 합은 어떻게 될까?', choices: ['점점 줄어든다', '점점 늘어난다', '내내 같다'], info: '처음: 운동 에너지 50 J + 위치 에너지 200 J' },
      judge: function (p, phase) {
        if (phase !== 'finish') return null;
        var E1 = st.result.E1, E0 = run.E0, d = E1 - E0;
        return { index: Math.abs(d) <= 0.001 * E0 + 1e-9 ? 2 : (d < 0 ? 0 : 1), text: 'E 처음 ' + fmt(E0, 1) + ' J → 착지 ' + fmt(E1, 1) + ' J, 착지 속력 ' + fmt(st.result.vL, 1) + ' m/s' };
      }
    },
    {
      name: '30°와 60°, 어느 쪽이 멀리 갈까?', tag: '탐구 재현',
      change: 'θ 30° → 60° (실행 → S → 60° → 실행)', fixed: 'v₀ 20 m/s · h 0 (지면) · g 10 · 공기 저항 끔',
      values: vals({ planet: 'earth', gEarth: 10, air: 'off', pad: 'ground', h: 0, v0: 20, theta: 30, m: 1, flash: true }),
      box: { x: 44, y: 17 },
      predict: { question: '같은 속력 20 m/s로 30°와 60°로 던지면 어느 쪽이 더 멀리 갈까?', choices: ['30°', '60°', '같다'] },
      judge: function (p, phase) {
        if (phase !== 'finish' || (p.theta !== 30 && p.theta !== 60)) return null;
        var r30 = PH.rangeFor(p, { theta: 30 }), r60 = PH.rangeFor(p, { theta: 60 });
        var d = r30 - r60;
        return { index: Math.abs(d) < 0.05 ? 2 : (d > 0 ? 0 : 1), text: '30° ' + fmt(r30, 1) + ' m · 60° ' + fmt(r60, 1) + ' m (45°는 ' + fmt(PH.rangeFor(p, { theta: 45 }), 1) + ' m)' };
      }
    },
    {
      name: '달에서 던지면 얼마나 멀리 갈까?', tag: '대표 문항',
      change: '지구(g 10) 실행 → S → 달(1.62) 실행', fixed: 'v₀ 10 m/s · θ 45° · h 0 · 공기 저항 끔',
      values: vals({ planet: 'earth', gEarth: 10, air: 'off', pad: 'ground', h: 0, v0: 10, theta: 45, m: 1, flash: true }),
      box: { x: 68, y: 17 },
      predict: { question: '달(g = 1.62)에서 똑같이 던지면 지구(g = 10)보다 몇 배 멀리 갈까?', choices: ['약 2배', '약 6배', '같다'] },
      judge: function (p, phase) {
        if (phase !== 'finish') return null;
        if (p.planet !== 'moon') return { pending: true, text: '지구 ' + fmt(st.result.R, 1) + ' m — 이제 S → 달 카드 → 실행' };
        var re = PH.rangeFor(p, { planet: 'earth', gEarth: 10 }), ratio = st.result.R / re;
        var opts = [2, 6, 1], best = 0;
        for (var i = 1; i < 3; i++) if (Math.abs(ratio - opts[i]) < Math.abs(ratio - opts[best])) best = i;
        return { index: best, text: '지구 ' + fmt(re, 1) + ' m → 달 ' + fmt(st.result.R, 1) + ' m (' + fmt(ratio, 1) + '배)' };
      }
    },
    {
      name: '최고점에서 공은 멈출까?', tag: '오개념',
      change: '최고점에서 저절로 멈춤 → 화살표 보기', fixed: 'v₀ 20 m/s · θ 45° · h 0 · g 10',
      values: vals({ planet: 'earth', gEarth: 10, air: 'off', pad: 'ground', h: 0, v0: 20, theta: 45, m: 1, topStop: true, showV: true, showA: true }),
      box: null,
      predict: { question: '가장 높은 곳(최고점)에서 공의 속도와 가속도는?', choices: ['속도 0, 가속도 0', '속도 0, 가속도 g', '속도 0 아님, 가속도 g'] },
      judge: function (p, phase) {
        if (phase !== 'top') return null;
        var sp = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
        return { index: sp > 0.05 ? 2 : 1, text: 'vₓ = ' + fmt(st.vx, 1) + ' m/s, v_y = ' + fmt(st.vy, 1) + ' m/s, a = ' + gText(run.g) + ' m/s² 아래' };
      }
    }
  ];
  SK.setPresets(PRESETS.map(function (pr, i) {
    return {
      name: pr.name, tag: pr.tag, change: pr.change, fixed: pr.fixed, values: pr.values, predict: pr.predict,
      onApply: function () {
        curPreset = i; predBase = SK.prediction;
        if (pr.box) lockBox(pr.box);
        else { manualLock = null; fixedBox = null; }
        showResult(null);
        SK.update(); SK.requestRender();
      }
    };
  }));

  function judge(phase) {
    if (curPreset < 0) return false;
    var pr = PRESETS[curPreset], j = pr.judge(SK.params, phase);
    if (!j) return false;
    if (j.pending) { showResult({ text: j.text, plain: true }); return true; }
    var pred = SK.prediction;
    var valid = pred && pred !== predBase && pred.question === pr.predict.question;
    var ans = pr.predict.choices[j.index];
    var txt = (valid ? '예측: ' + pred.answer + ' / ' : '') + '결과: ' + ans + (valid ? (pred.index === j.index ? ' ✓' : ' ✗') : '');
    showResult({ text: txt, sub: j.text, wrong: valid && pred.index !== j.index });
    SK.notice(txt, valid && pred.index !== j.index ? 'warn' : 'ok', 5000);
    return true;
  }
  function showResult(r) {
    if (!r) { resultChip.hidden = true; resultChip.innerHTML = ''; return; }
    resultChip.innerHTML = '';
    resultChip.appendChild(h('b', { text: r.text }));
    if (r.sub) resultChip.appendChild(h('span', { text: r.sub }));
    resultChip.classList.toggle('is-wrong', !!r.wrong);
    resultChip.classList.toggle('is-plain', !!r.plain);
    resultChip.hidden = false;
  }

  /* ------------------------------------------------------------------
     6. 수업 안내 서랍 — 변수 대응표 (결정서 §4-1-4 와 같은 내용)
     ------------------------------------------------------------------ */
  SK.guide({
    rows: [
      { target: '처음 속력 v₀ — 0~30 m/s, 1, 기본 20 (다시 시작)', standard: '[12역학01-02] 정량 설명. 교과서 문제의 10·20 m/s (교과서 쪽수 확인 필요)', discover: '수평 던지기에서 v₀를 바꿔도 비행 시간은 같고 수평 거리만 v₀에 비례', misconception: '세게 던지면 늦게 떨어진다' },
      { target: '던지는 각도 θ — 0~90°, 5°, 기본 45 (다시 시작)', standard: '[12역학01-02]', discover: '30°와 60°는 같은 거리, 45° 최대(지면 발사)', misconception: '각도가 클수록 멀리 간다' },
      { target: '던지는 높이 h — 0~45 m, 5, 기본 0 (다시 시작)', standard: '탐구 활동(포물선 운동 동영상 분석), 수평 던지기 대표 문항', discover: '낙하 시간 = √(2h/g): 20 m → 2 s, 45 m → 3 s (g = 10)', misconception: '—' },
      { target: '공의 질량 m — 0.1~5 kg, 0.1, 기본 1 (다시 시작)', standard: '변인 통제 연습', discover: '궤적·시간은 그대로, 에너지 값만 질량에 비례', misconception: '무거운 공이 빨리 떨어진다' },
      { target: '중력 g (상황) — 지구 9.8/10, 달 1.62, 화성 3.71 (다시 시작)', standard: '[12역학01-02] g가 식에 어떻게 들어가는지', discover: 'g가 작으면 비행 시간·거리·높이가 커진다', misconception: '—' },
      { target: '공기 저항 (상황) — 끔 / 쇠공 / 탁구공 (다시 시작)', standard: '[12역학01-02] \'이상적 조건\'의 뜻, 심화 발문', discover: '공기 저항이 있으면 질량이 작은 공이 덜 날아가고 최적 각도가 45°보다 작다', misconception: '공기 저항은 늘 무시해도 된다' },
      { target: '비교 공 (상황) — 켬 / 끔 (즉시)', standard: '대표 문항(수평 던지기 vs 자유 낙하)', discover: '두 공의 높이가 항상 같다', misconception: '던진 공이 늦게 떨어진다' }
    ],
    sections: [
      { title: '성취기준', items: ['[12역학01-02] 뉴턴 운동 법칙으로 포물선 운동을 정량적으로 설명하고 역학적 에너지를 구한다.', '연계 [12물리01-04] 역학적 에너지 보존.', '탐구 활동: 포물선 운동을 하는 물체의 동영상을 분석하여 역학적 에너지 보존 확인하기. (교과서 활동 이름·쪽수는 확인 필요)'] },
      { title: '수업 흐름 (→ 키)', items: ['① 예측: 프리셋을 누르면 발문 카드가 떠요(1~3 으로 고르기).', '② 실행: Space. 끝나면 오른쪽 위에 "예측 / 결과 ✓" 가 떠요. , . 로 한 프레임씩.', '③ 비교: 한 가지만 바꿔 S 를 3~5번. 표에서 같은 열(비행 시간 등)을 찾아요. 기록이 생기면 축척이 저절로 고정돼요.', '④ 정리: 빈칸 문장 "비행 시간은 ___로만 정해진다", H 로 정답.'] },
      { title: '발문', items: ['각도를 바꿔도 착지 속력이 같을까? (프리셋 2, 모둠 활동) → 같은 v₀·h 면 √(v₀² + 2gh) 로 같아요.', '공기 저항을 켜면 가장 멀리 가는 각도는 45°보다 클까 작을까? → 탁구공 20 m/s 에서 약 35°.', '최고점에서 공은 멈출까? → 수평 속도는 그대로, 가속도는 g 아래.'] },
      { title: '조작 메모', items: ['섬광 점(0.1 s 간격)을 누르면 그 순간의 t·x·y·속도와 운동·위치 에너지가 떠요. 동영상 분석 활동처럼 점 몇 개를 골라 합이 같은지 표에 적게 해요. 빈 곳을 누르면 닫혀요.', '공을 손가락으로 당겼다 놓으면 v₀·θ 가 들어가요(당긴 길이 10u = 1 m/s, 1 m/s·5° 눈금). 놓아도 실행하지 않아요.', '공기 저항 끔은 해석해(식)로 계산해서 에너지 합이 출렁이지 않아요. 켬은 RK4 (dt = 1/240 s).', '공기 저항을 켜면 질량은 공 종류로 정해져요(쇠공 0.50 kg, 탁구공 0.0027 kg). 달에는 공기가 없어 저항이 0, 화성은 공기 밀도 0.020 kg/m³ 로 계산해요.', '비교 공은 같은 높이에서 같은 연직 속도로 출발하고 옆으로는 움직이지 않는 공이에요. θ = 0° 이면 그냥 떨어뜨린 공.'] }
    ],
    keys: 'G 지구 g 9.8/10 · L 축척 고정/자동 · B 비교 공 · A 속도·가속도 화살표'
  });

  /* ------------------------------------------------------------------
     7. 전용 키 (공통 키와 겹치지 않음)
     ------------------------------------------------------------------ */
  SK.onKey(function (e) {
    if (e.repeat) return false;
    switch (e.code) {
      case 'KeyG':
        if (SK.get('planet') !== 'earth') { SK.notice('9.8 / 10 전환은 지구에서만 써요', 'info'); return true; }
        SK.set('gEarth', SK.get('gEarth') === 10 ? 9.8 : 10);
        SK.notice('지구 g = ' + gText(SK.get('gEarth')) + ' m/s²', 'info');
        return true;
      case 'KeyL': toggleLock(); return true;
      case 'KeyB': SK.set('cmp', !SK.get('cmp')); return true;
      case 'KeyA':
        var on = !(SK.get('showV') || SK.get('showA'));
        SK.set('showV', on); SK.set('showA', on);
        return true;
    }
    return false;
  });

  /* ------------------------------------------------------------------
     8. 공을 당겨서 v₀·θ 넣기 (pointer events: 마우스·펜·터치)
     ------------------------------------------------------------------ */
  var cv = SK.view.canvas;
  function startPx() { return { x: L.X0, y: L.GY - (run ? run.h : 0) * map.S }; }
  cv.addEventListener('pointerdown', function (e) {
    if (!run) return;
    var q = SK.view.toLogical(e), b = startPx();
    var nearBall = Math.hypot(q.x - b.x, q.y - b.y) <= 52;
    if (!nearBall || SK.started) {
      // 섬광 점 누르기 → 그 순간의 t·x·y·v·에너지 (탐구 활동: 동영상 분석으로 역학적 에너지 보존 확인)
      var hit = SK.params.flash ? flashAt(q) : -1;
      if (hit >= 0 || pick >= 0) { pick = hit; SK.requestRender(); return; }
      if (nearBall) SK.notice('R 로 처음으로 돌린 뒤 공을 당겨 보세요', 'info');
      return;
    }
    drag = { x: q.x, y: q.y, v: null };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    e.preventDefault();
    SK.requestRender();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var q = SK.view.toLogical(e), b = startPx();
    drag.x = q.x; drag.y = q.y;
    drag.v = PH.pullValues(b.x - q.x, q.y - b.y);
    SK.requestRender();
  });
  function flashAt(q) {
    var best = -1, bd = 30, S = map.S;
    for (var i = 0; i < st.flash.length; i++) {
      var f = st.flash[i];
      var d = Math.hypot(L.X0 + f[1] * S - q.x, L.GY - f[2] * S - q.y);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function endDrag(apply) {
    if (!drag) return;
    var v = drag.v; drag = null;
    if (apply && v && v.len >= 12) {
      SK.set('theta', v.theta); SK.set('v0', v.v0);
      SK.notice('v₀ = ' + v.v0 + ' m/s, θ = ' + v.theta + '° — Space 로 실행', 'info');
    }
    SK.requestRender();
  }
  cv.addEventListener('pointerup', function () { endDrag(true); });
  cv.addEventListener('pointercancel', function () { endDrag(false); });

  /* ------------------------------------------------------------------
     9. 상태 연결
     ------------------------------------------------------------------ */
  function syncUI() {
    var u = SK.ui;
    var airOn = u.air !== 'off';
    SK.controls.m.enable(!airOn);
    mHint.textContent = airOn ? PH.BALLS[u.air].name + '을 골라서 질량은 ' + (u.air === 'steel' ? '0.50' : '0.0027') + ' kg 으로 정해져요 (잠김)' : '';
    mHint.hidden = !airOn;
    SK.controls.h.enable(u.pad === 'cliff');
    hHint.textContent = u.pad === 'cliff' ? '' : '지면에서 던져요 (h = 0 고정). \'절벽 위\'를 고르면 바꿀 수 있어요.';
    hHint.hidden = u.pad === 'cliff';
    SK.controls.gEarth.enable(u.planet === 'earth');
    SK.controls.k4.enable(!!u.kCustom);
    var earthSub = SK.controls.planet.el.querySelector('.seg__opt .btn__sub');
    if (earthSub) earthSub.textContent = 'g = ' + gText(u.gEarth);
  }

  function onReset(p) {
    if (p.pad === 'ground' && p.h !== 0) { p.h = 0; SK.set('h', 0, { silent: true }); }
    run = PH.buildRun(p);
    st = PH.newState(run);
    autoBox = boxFor(run);
    holdUntil = 0; pick = -1;
    showResult(null);
    updateFormula(p);
    syncUI();
  }

  function physStep(dt, p) {
    if (!st || SK.finished) return;
    if (st.hold && performance.now() < holdUntil) { SK.time = st.t - dt; return; }   // 최고점 정지 직후 같은 프레임의 남은 걸음 무시
    st.hold = false;
    if (st.landed && (st.cLanded || !p.cmp)) { finishRun(p); return; }
    var e = PH.advance(st, run, dt, !!p.topStop);
    SK.time = st.t - dt;   // 공통 틀이 곧 dt 를 더함 → SK.time = st.t
    if (e.top) {
      st.hold = true; holdUntil = performance.now() + 30;
      SK.pause();
      // 프리셋 판정 안내가 뜨면 같은 내용의 안내를 겹쳐 띄우지 않는다
      if (!judge('top')) SK.notice('최고점! vₓ = ' + fmt(st.vx, 1) + ' m/s, v_y = ' + fmt(st.vy, 1) + ' m/s — Space 로 계속', 'ok', 4000);
      return;
    }
    if (st.landed && (st.cLanded || !p.cmp)) finishRun(p);
  }

  function finishRun(p) {
    if (SK.finished) return;
    var E = PH.energy(run, st);
    st.result = {
      T: st.tLand, R: st.x, H: run.analytic ? run.H : st.maxY,
      vL: Math.sqrt(st.vx * st.vx + st.vy * st.vy), E0: run.E0, E1: E.E
    };
    var msg = st.tLand < 1e-9
      ? (run.v0 > 0 ? '지면에서 수평(θ = 0°)으로 던지면 바로 땅에 닿아요 — θ 를 키우거나 「절벽 위」를 골라 보세요' : '공이 움직이지 않아요 — v₀ 나 h 를 키워 보세요')
      : '착지! 비행 시간 ' + fmt(st.tLand, 2) + ' s · 수평 거리 ' + fmt(st.x, 1) + ' m — S 로 기록';
    SK.finish(msg);
    judge('finish');
  }

  function thin(pts, max) {
    if (pts.length <= max) return pts.slice();
    var out = [], step = (pts.length - 1) / (max - 1);
    for (var i = 0; i < max - 1; i++) out.push(pts[Math.round(i * step)]);
    out.push(pts[pts.length - 1]);
    return out;
  }
  function onCapture(p) {
    if (!st || !SK.started) return null;
    var r = st.result || {};
    var fl = st.flash.map(function (f) { return [f[1], f[2]]; });
    if (fl.length > 200) { var k = Math.ceil(fl.length / 200), o = []; for (var i = 0; i < fl.length; i += k) o.push(fl[i]); fl = o; }
    return {
      series: { path: thin(st.trail, 300), flash: fl },
      values: {
        T: r.T, R: r.R, H: r.H !== undefined ? r.H : (run.analytic && st.topDone ? run.H : undefined),
        vL: r.vL, E0: run.E0, E1: r.E1, gtxt: gText(run.g), mtxt: mText(p),
        E0t: fmt(run.E0, eDec(run.E0)), E1t: r.E1 === undefined ? undefined : fmt(r.E1, eDec(run.E0))
      }
    };
  }
  function onSave() {
    return {
      t: st.t, n: st.n, x: st.x, y: st.y, vx: st.vx, vy: st.vy, yc: st.yc, vyc: st.vyc,
      landed: st.landed, cLanded: st.cLanded, tLand: st.tLand, cLand: st.cLand, maxY: st.maxY,
      topDone: st.topDone, tTopSeen: st.tTopSeen, flashIdx: st.flashIdx,
      trailN: st.trail.length, flashN: st.flash.length, result: st.result
    };
  }
  function onLoad(s) {
    for (var k in s) if (k !== 'trailN' && k !== 'flashN') st[k] = s[k];
    st.trail.length = s.trailN; st.flash.length = s.flashN; st.hold = false;
    if (pick >= st.flash.length) pick = -1;
    if (!st.landed) showResult(null);
  }

  function onStatus(p) {
    if (!p || !p.planet) return '';
    var g = PH.gOf(p);
    var s = 'g = ' + gText(g) + ' m/s²';
    if (p.planet === 'earth') s += p.gEarth === 10 ? ' (계산 쉽게)' : '';
    else s += ' (' + PH.PLANETS[p.planet].name + ')';
    s += ' · 공기 저항 ' + (p.air === 'off' ? '끔' : PH.BALLS[p.air].name + (PH.kOf(p) === 0 ? ' (공기 없음)' : ''));
    s += ' · ' + (isLocked() ? (manualLock === null ? '비교 중: 축척 고정' : '축척 고정') : '축척 자동');
    return s;
  }

  /* 식 보기 (말 → 식 → 지금 값) */
  function updateFormula(p) {
    var r = run, g = gText(r.g), vs = fmt(r.vy0, 1), vc = fmt(r.vx0, 2), hh = fmt(r.h, 0);
    var A = PH.buildRun({ planet: p.planet, gEarth: p.gEarth, air: 'off', pad: p.pad, h: p.h, v0: p.v0, theta: p.theta, m: p.m, kCustom: false, k4: p.k4 });
    var items = [
      ['비행 시간 — 땅에 닿을 때까지', 'T = (v₀sinθ + √((v₀sinθ)² + 2gh)) ÷ g', '= (' + vs + ' + √(' + vs + '² + 2×' + g + '×' + hh + ')) ÷ ' + g + ' = ' + fmt(A.T, 2) + ' s'],
      ['수평 거리 — 옆으로는 같은 빠르기', 'R = v₀cosθ × T', '= ' + vc + ' × ' + fmt(A.T, 2) + ' = ' + fmt(A.R, 1) + ' m'],
      ['최고 높이 — 연직 속도가 0 이 될 때', 'H = h + (v₀sinθ)² ÷ 2g', '= ' + hh + ' + ' + vs + '² ÷ (2×' + g + ') = ' + fmt(A.H, 1) + ' m'],
      ['착지 속력 — 역학적 에너지 보존', 'v = √(v₀² + 2gh)', '= √(' + fmt(r.v0, 0) + '² + 2×' + g + '×' + hh + ') = ' + fmt(A.vL, 1) + ' m/s']
    ];
    formulaBox.innerHTML = '';
    items.forEach(function (it) {
      formulaBox.appendChild(h('div', { class: 'pe-formula__item' }, [h('b', { text: it[0] }), h('code', { text: it[1] }), h('code', { text: it[2] })]));
    });
    if (!r.analytic) {
      formulaBox.appendChild(h('p', { class: 'pe-hint', text: '지금은 공기 저항이 있어서 실제 값이 식과 달라요: T ' + fmt(r.T, 2) + ' s, R ' + fmt(r.R, 1) + ' m, 착지 ' + fmt(r.vL, 1) + ' m/s. (k = ' + fmt(r.k * 1e4, 1) + '×10⁻⁴ kg/m)' }));
    }
  }

  /* ------------------------------------------------------------------
     10. 그리기
     ------------------------------------------------------------------ */
  function niceCell(S) {
    var c = [0.5, 1, 2, 5, 10, 20, 50, 100, 200];
    for (var i = 0; i < c.length; i++) if (c[i] * S >= 46) return c[i];
    return 200;
  }
  function numTxt(v) { return (Math.round(v * 10) / 10).toString(); }

  function onRender(view, p) {
    if (!run) return;
    if (!FS) { FS = fontSans(); FN = fontNum(); }
    var ctx = view.ctx, W = view.w, H = view.h;
    var B = currentBox();
    var S = Math.min((L.RIGHT - L.X0) / B.x, (L.GY - L.TOP) / B.y);
    map.S = S;
    function sx(x) { return L.X0 + x * S; }
    function sy(y) { return L.GY - y * S; }
    function mp(x, y) { return [sx(x), sy(y)]; }
    var cell = niceCell(S);
    var C = {
      grid: SK.color('--color-grid'), line: SK.color('--color-line-strong'), ink: SK.color('--color-ink'),
      muted: SK.color('--color-ink-muted'), sunk: SK.color('--color-paper-sunk'), raised: SK.color('--color-paper-raised'),
      sim: SK.color('--color-sim-projectile'), scrim: SK.color('--color-paper-scrim')
    };

    // 모눈
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; sx(gx) <= W; gx += cell) { ctx.moveTo(sx(gx), 0); ctx.lineTo(sx(gx), L.GY); }
    for (var gy = 0; sy(gy) >= 0; gy += cell) { ctx.moveTo(L.AX, sy(gy)); ctx.lineTo(W, sy(gy)); }
    ctx.stroke();
    // 지면
    ctx.fillStyle = C.sunk; ctx.fillRect(0, L.GY, W, H - L.GY);
    ctx.strokeStyle = C.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, L.GY); ctx.lineTo(W, L.GY); ctx.stroke();
    // 절벽(발사대)
    if (run.h > 0) {
      var cy = sy(run.h);
      ctx.fillStyle = C.sunk; ctx.fillRect(L.AX + 4, cy, L.X0 - L.AX - 4, L.GY - cy);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.strokeRect(L.AX + 4, cy, L.X0 - L.AX - 4, L.GY - cy);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L.AX + 4, cy); ctx.lineTo(L.X0, cy); ctx.stroke();
    } else {
      ctx.fillStyle = C.line; ctx.fillRect(L.X0 - 24, L.GY - 6, 48, 6);
    }
    // 왼쪽 벽 자 (y축)
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(L.AX, L.GY); ctx.lineTo(L.AX, 0); ctx.stroke();
    ctx.font = '600 20px ' + FN; ctx.fillStyle = C.muted;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var ky = Math.max(1, Math.ceil(30 / (cell * S)));
    for (var iy = 1; sy(iy * cell) >= 20; iy++) {
      if (iy % ky) continue;
      var yy = sy(iy * cell);
      ctx.fillRect(L.AX - 8, yy - 1, 8, 2);
      ctx.fillText(numTxt(iy * cell), L.AX - 12, yy);
    }
    // x 눈금 (지면 아래)
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    var kx = Math.max(1, Math.ceil(64 / (cell * S)));
    for (var ix = 0; sx(ix * cell) <= W - 20; ix++) {
      if (ix % kx) continue;
      var xx = sx(ix * cell);
      ctx.fillRect(xx - 1, L.GY, 2, 8);
      ctx.fillText(numTxt(ix * cell), xx, L.GY + 12);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.font = '700 20px ' + FS;
    ctx.fillText('x (m)', W - 70, L.GY + 36);
    ctx.save(); ctx.translate(14, (L.TOP + L.GY) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('y (m)', 0, 0); ctx.restore();

    // 기록·직전 실행 궤적 (색 + 선 모양) + 섬광 점
    function drawRun(series, style, label) {
      if (!series || !series.path) return;
      SK.drawPath(ctx, series.path, style, mp);
      if (series.flash && p.flash) {
        ctx.fillStyle = style.color;
        for (var i = 0; i < series.flash.length; i++) {
          var f = series.flash[i];
          ctx.beginPath(); ctx.arc(sx(f[0]), sy(f[1]), 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (label) {
        var e = series.path[series.path.length - 1], ex = sx(e[0]), ey = sy(e[1]);
        ctx.font = '700 22px ' + FN; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = style.color; ctx.fillText(label, Math.min(ex, W - 16), Math.max(ey - 10, 24));
      }
    }
    SK.records.forEach(function (r) { drawRun(r.series, SK.recStyle(r.slot), String(r.n)); });
    if (SK.ghost) drawRun(SK.ghost.series, SK.ghostStyle(), null);

    // 지금 실행
    SK.drawPath(ctx, st.trail.concat([[st.x, st.y]]), { color: C.sim, dash: [], width: 4 }, mp);
    if (p.flash) {
      for (var fi = 0; fi < st.flash.length; fi++) {
        var f = st.flash[fi];
        if (p.cmp) {   // 같은 시각의 두 공을 잇는 가는 가로선
          ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(L.X0, sy(f[3])); ctx.lineTo(sx(f[1]), sy(f[2])); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(L.X0, sy(f[3]), 7, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = C.sim; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(sx(f[1]), sy(f[2]), 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    var bx = sx(st.x), by = sy(st.y);
    // 그림자 (x축: 지면, y축: 왼쪽 벽)
    if (p.shadow) {
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, L.GY); ctx.moveTo(bx, by); ctx.lineTo(L.AX, by); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.sim;
      ctx.beginPath(); ctx.arc(bx, L.GY, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(L.AX, by, 9, 0, Math.PI * 2); ctx.fill();
    }
    // 비교 공 (회색)
    if (p.cmp) {
      var cyy = sy(st.yc);
      ctx.fillStyle = C.line; ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(L.X0, cyy, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (p.flash || p.shadow) {
        ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(L.X0, cyy); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    // 공
    ctx.fillStyle = C.sim; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 화살표
    var moving = !st.landed;
    if (p.showV && moving) {
      var tx = bx + st.vx * VS, ty = by - st.vy * VS;
      SK.arrow(ctx, bx, by, tx, by, { color: '--color-q-velocity', width: 3, dash: [8, 6], label: Math.abs(st.vx) > 1 ? 'vₓ' : '' });
      SK.arrow(ctx, bx, by, bx, ty, { color: '--color-q-velocity', width: 3, dash: [8, 6], label: Math.abs(st.vy) > 1 ? 'v_y' : '' });
      SK.arrow(ctx, bx, by, tx, ty, { color: '--color-q-velocity', width: 5, label: 'v' });
    }
    if (p.showA && moving) {
      if (run.analytic) SK.arrow(ctx, bx, by, bx, by + ACC_LEN, { color: '--color-q-force', width: 5, label: 'a = g' });
      else {
        var a = PH.accel(st.vx, st.vy, run.g, run.km), am = Math.hypot(a[0], a[1]);
        if (am > 0) SK.arrow(ctx, bx, by, bx + a[0] / am * ACC_LEN * am / run.g, by - a[1] / am * ACC_LEN * am / run.g, { color: '--color-q-force', width: 5, label: 'a' });
      }
    }

    // 최고점 정보
    if (st.hold || (st.topDone && SK.started && !SK.running && !SK.finished && Math.abs(st.vy) < 1e-6)) {
      label(ctx, [
        '최고점 (t = ' + fmt(st.t, 2) + ' s)',
        'vₓ = ' + fmt(st.vx, 1) + ' m/s  (그대로)',
        'v_y = ' + fmt(st.vy, 1) + ' m/s',
        'a = ' + gText(run.g) + ' m/s²  (아래)'
      ], bx, by + 60, W, C, 'side');   // 공 옆에 (오른쪽 위 결과 판과 겹치지 않게)
    }
    // 착지 결과
    if (SK.finished && st.result && st.tLand > 0) {
      var lines = ['착지 ' + fmt(st.tLand, 2) + ' s · ' + fmt(st.x, 1) + ' m'];
      if (p.cmp && st.cLand !== null) lines.push('비교 공 ' + fmt(st.cLand, 2) + ' s');
      label(ctx, lines, bx, L.GY - 40, W, C);
    }

    // 고정 축척에서 화면 밖: 가장자리 화살표 + 좌표
    if (bx > W - 6 || by < 6) {
      var ex = Math.min(bx, W - 30), ey = Math.max(by, 30);
      var dx = bx - ex, dy = by - ey, dl = Math.hypot(dx, dy) || 1;
      SK.arrow(ctx, ex - dx / dl * 40, ey - dy / dl * 40, ex, ey, { color: '--color-ink', width: 4 });
      ctx.font = '700 22px ' + FN; ctx.fillStyle = C.ink; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('화면 밖 (' + numTxt(st.x) + ', ' + numTxt(st.y) + ') m', W - 12, ey + 16);
    }

    // 당기기 미리 보기
    if (drag && drag.v) {
      var b0 = startPx();
      ctx.strokeStyle = C.muted; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(drag.x, drag.y); ctx.stroke(); ctx.setLineDash([]);
      var th = drag.v.theta * Math.PI / 180, len = drag.v.v0 * VS * 2;
      SK.arrow(ctx, b0.x, b0.y, b0.x + Math.cos(th) * len, b0.y - Math.sin(th) * len, { color: '--color-q-velocity', width: 6 });
      label(ctx, ['v₀ ' + drag.v.v0 + ' m/s · θ ' + drag.v.theta + '°'], drag.x, drag.y - 40, W, C);
    } else if (!SK.started && !drag) {
      ctx.strokeStyle = C.sim; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(L.X0, sy(run.h), BALL_R + 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    // 고른 섬광 점: 그 순간 값 (운동 + 위치 = 합)
    if (pick >= 0 && st.flash[pick]) {
      var pf = st.flash[pick], px = sx(pf[1]), py = sy(pf[2]);
      var pv2 = pf[4] * pf[4] + pf[5] * pf[5], pK = 0.5 * run.m * pv2, pU = run.m * run.g * Math.max(0, pf[2]);
      var pd = eDec(run.E0);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.stroke();
      label(ctx, [
        't = ' + fmt(pf[0], 2) + ' s   x = ' + fmt(pf[1], 1) + ' m   y = ' + fmt(pf[2], 1) + ' m',
        'vₓ = ' + fmt(pf[4], 1) + '   v_y = ' + fmt(pf[5], 1) + '   v = ' + fmt(Math.sqrt(pv2), 1) + ' m/s',
        '운동 ' + fmt(pK, pd) + ' J + 위치 ' + fmt(pU, pd) + ' J = ' + fmt(pK + pU, pd) + ' J'
      ], px, py - 22, W, C);
    }

    // 축척 판
    var sTxt = '1칸 = ' + numTxt(cell) + ' m';
    if (scaleText.textContent !== sTxt) scaleText.textContent = sTxt;
    var lk = isLocked();
    lockBtn.setAttribute('aria-pressed', String(lk));
    lockLabel.textContent = lk ? '고정' : '자동';

    updateLegend(p);
    var sp = Math.sqrt(st.vx * st.vx + st.vy * st.vy);
    meters.update({ t: st.t, x: st.x, y: st.y, vx: st.vx, vy: st.vy, sp: sp });
    drawEnergy(p);
  }

  /** 실험 화면 위 말풍선 */
  function label(ctx, lines, x, y, W, C, side) {
    ctx.font = '700 24px ' + FS;
    var w = 0;
    lines.forEach(function (t) { w = Math.max(w, ctx.measureText(t).width); });
    var pw = w + 28, ph = lines.length * 32 + 16;
    var lx = Math.max(8, Math.min(x - pw / 2, W - pw - 8)), ly = Math.max(8, y - ph);
    if (side) {   // 공 왼쪽에 두고, 자리가 없으면 오른쪽
      lx = x - BALL_R - 40 - pw;
      if (lx < L.AX + 8) lx = Math.min(x + BALL_R + 40, W - pw - 8);
    }
    ctx.fillStyle = C.scrim; ctx.strokeStyle = C.line; ctx.lineWidth = 1.5;
    roundRect(ctx, lx, ly, pw, ph, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach(function (t, i) { ctx.fillText(t, lx + 14, ly + 10 + i * 32); });
  }
  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
    ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  /** 에너지 막대: 운동 · 위치 · 합(먹색 테두리) · 열(공기 저항 켬) */
  function drawEnergy(p) {
    if (!FS) { FS = fontSans(); FN = fontNum(); }
    var ctx = ev.ctx, W = ev.w, H = ev.h;
    ev.clear();
    if (W < 40 || H < 40) return;
    var ink = SK.color('--color-ink'), muted = SK.color('--color-ink-muted');
    ctx.font = '700 20px ' + FS; ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    var d = eDec(run.E0);
    ctx.fillText('역학적 에너지 (J)', 10, 6);
    if (!p.energy) {
      ctx.font = '500 20px ' + FS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('표시 도구에서 켜요', W / 2, H / 2 + 10);
      return;
    }
    var E = PH.energy(run, st);
    var K = E.K, U = Math.max(0, E.U), heat = Math.max(0, E.heat);
    var bars = [
      { lab: '운동', val: K, col: '--color-q-energy-k', txt: '--color-q-energy-k' },
      { lab: '위치', val: U, col: '--color-q-energy-p', txt: '--color-q-energy-p-text' },
      { lab: '합', sum: true }
    ];
    if (!run.analytic) bars.push({ lab: '열', val: heat, col: '--color-q-energy-heat', txt: '--color-q-energy-heat' });
    var top = 54, bottom = H - 26, bh = bottom - top;
    var max = run.E0 > 0 ? run.E0 : 1;
    var slot = (W - 12) / bars.length, bw = Math.min(46, slot * 0.55);
    // 처음 에너지 높이 점선
    ctx.strokeStyle = muted; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(6, top); ctx.lineTo(W - 6, top); ctx.stroke(); ctx.setLineDash([]);
    bars.forEach(function (b, i) {
      var cx = 6 + slot * i + slot / 2, x = cx - bw / 2;
      var val, hgt;
      if (b.sum) {
        var hk = K / max * bh, hu = U / max * bh;
        ctx.fillStyle = SK.color('--color-q-energy-k'); ctx.fillRect(x, bottom - hk, bw, hk);
        ctx.fillStyle = SK.color('--color-q-energy-p'); ctx.fillRect(x, bottom - hk - hu, bw, hu);
        ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.strokeRect(x, bottom - hk - hu, bw, hk + hu);
        val = K + U; hgt = hk + hu;
        ctx.fillStyle = ink;
      } else {
        val = b.val; hgt = Math.min(bh, b.val / max * bh);
        ctx.fillStyle = SK.color(b.col); ctx.fillRect(x, bottom - hgt, bw, hgt);
        ctx.fillStyle = SK.color(b.txt);
      }
      ctx.font = (b.sum ? '800 ' : '700 ') + '20px ' + FN; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(fmt(val, d), cx, bottom - hgt - 2);
      ctx.fillStyle = ink; ctx.font = '600 20px ' + FS; ctx.textBaseline = 'top';
      ctx.fillText(b.lab, cx, bottom + 3);
    });
    ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, bottom); ctx.lineTo(W - 6, bottom); ctx.stroke();
  }
})();
