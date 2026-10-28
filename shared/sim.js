/* =====================================================================
   물리 시뮬레이터 실험실 — SimKit (공통 틀 스크립트, 2026-10-28)
   일반 <script> 로 불러온다(ES module·fetch·CDN 금지, file:// 동작). 전역: window.SimKit
   자세한 설명서: docs/SIMKIT.md   ·   최소 예제: shared/TEMPLATE.html

   ── 불러오기 (sims/<slug>/index.html) ─────────────────────────────────
     <link rel="stylesheet" href="../../shared/fonts.css">   tokens.css · base.css · shell.css
     <div id="sim-root"></div>
     <script src="../../shared/sim.js"></script>
     <script src="sim.js"></script>

   ── 1. 시작: SimKit.init(cfg) — 화면 뼈대·키·루프를 한 번에 만든다 ──────
     cfg = {
       slug, title, subject, unit, standards:['12역학01-02'], today:'오늘 알아볼 것 문장',
       steps: ['예측','실행','비교','정리'] (기본값), onStep(i, name),
       hubHref: '../../index.html',
       dt: 1/240,                       // 고정 물리 시간 간격(초). 루프가 누적해 나눠 부른다
       stageFit: true,                  // true: 실험 화면 논리 좌표 1250×700 고정(T로 커져도 비율 유지)
                                        // false: 논리 좌표 = 실제 칸 크기(u 단위), view.w/h 가 바뀜
       reset(params),                   // 처음 상태 만들기 (R·프리셋·'다시 시작' 값 적용 때)
       step(dt, params),                // 물리 한 걸음. 끝나면 SimKit.finish() 를 부른다
       render(view, params),            // 실험 화면 그리기 (view = SimKit.view)
       capture(params) -> {series:{이름:[[x,y],...]}, values:{이름:숫자}} | null
                                        // 지금(또는 방금 끝난) 실행의 결과. 기록 S·직전 흐림에 쓰임
       save() -> 상태 객체, load(상태)   // (선택) 있으면 ',' 한 프레임 뒤로 가기가 된다
       status(params) -> '문장'          // 상태 줄 왼쪽 글 (예: 'g = 10 m/s² · 공기 저항 끔')
       predictOnPreset: true            // 프리셋을 누르면 예측 카드부터 (교사가 서랍에서 끌 수 있음)
     }
     만들어지는 칸: SimKit.el.{root, slide, top, stage, panel, band, meters, graph, records, bar,
                    presets, cornerTL, cornerTR, cornerBL, cornerBR}
     SimKit.view  = 실험 화면 캔버스 (아래 6)
     SimKit.panel('situation'|'values'|'tools'|'deep') = 조절 패널 칸 (상황→수치→표시 도구→심화▸)

   ── 2. 값 두 벌: SimKit.ui(패널에 보이는 값) / SimKit.params(지금 실행에 쓰는 값) ──
     apply:'live'    → 바꾸면 params 도 즉시 바뀜          (꼬리표 '즉시')
     apply:'restart' → params 는 다음 reset 때 바뀜(R)      (꼬리표 '다시 시작')
                       실행 전(t=0)에 바꾸면 곧바로 reset 해서 화면에 반영
                       실행 중에 바꾸면 "다음 실행부터 적용돼요 — R" 안내 3초
     ⇒ 시뮬레이터 코드는 언제나 params 만 읽는다.  SimKit.get(key) = ui 값, SimKit.set(key, v)

   ── 3. 수치 바꾸기 (요구 A) ─────────────────────────────────────────
     SimKit.addVar(where, {key, label, symbol, unit, min, max, step, value,
                           decimals, precision, apply, ticks, record, teacher, onChange})
       슬라이더 + −/+ + 숫자칸(inputmode=decimal) + 단위 + 꼬리표. 범위 밖 → 빨간 안내 후 가장 가까운 값.
       decimals = 표시 최소 소수 자리(기본: step 에서), precision = 숫자칸에 쳐 넣을 수 있는 최대 자리(기본 decimals+1)
       ticks = [0, 15, 30] 처럼 눈금 숫자. 반환: {get, set(v,{silent}), setRange(min,max), enable(bool), el}
       where = 'situation'|'values'|'tools'|'deep' 또는 DOM 요소

   ── 4. 상황 바꾸기 (요구 B) ─────────────────────────────────────────
     SimKit.addChoice(where, {key, label, options:[{value,label,sub}], value, apply, style:'seg'|'cards', onChange})
     SimKit.addToggle(where, {key, label, value:false, apply:'live', onText:'켬', offText:'끔', onChange})
       (where 가 'tools' 이면 기본 record:false — 표시 도구는 기록 비교에서 빠짐)
     SimKit.setPresets([{name, tag:'탐구 재현'|'대표 문항'|'오개념'|'과학사'|'교통안전',
                         change:'바꿀 값 설명', fixed:'고정한 값 설명',
                         values:{key:value, ...},           // 한꺼번에 설정 (나머지는 그대로)
                         predict:{question, choices:[...], info},
                         onApply(params)}])                 // 최대 5개, 키 1~5
     SimKit.chooseMode({title, modes:[{value,label,desc}], onPick(value)})  // 첫 화면 모드 카드(키 1~n)

   ── 5. 비교 (요구 C) ────────────────────────────────────────────────
     S  → capture() 결과 + 변수 스냅샷을 SimKit.records 에 저장(최대 5, 색+선 모양 rec-1~5)
     R  → reset. 실행했던 결과는 SimKit.ghost(직전 실행, 35% 흐림)로 자동 보관. 기록은 그대로
     C  → 확인 창 후 기록·직전 실행 모두 지우기
     SimKit.recordTable(where, {columns:[{key,label,unit,decimals,from:'param'|'value'}]})
       바뀐 변수 굵게, 두 개 이상 바뀌면 경고 칩. 기록이 바뀌면 저절로 다시 그림.
     SimKit.graph(where, {title, x:{label,unit,min,max}, y:{...}, series:[{key,label,color}]})
       → g.draw({key:[[x,y],...]})  지금 실행 + 직전(흐림) + 기록(색+선 모양)을 함께 그림. min/max 'auto' 가능
     SimKit.onRecords(fn)  기록·직전 실행이 바뀔 때마다 fn(records, ghost)
     SimKit.recStyle(i) / SimKit.ghostStyle() → {color, dash:[..], width}
     SimKit.drawPath(ctx, points, style, map?)  실험 화면 위에 궤적 겹쳐 그리기

   ── 6. 그리기 도우미 ───────────────────────────────────────────────
     SimKit.canvas(container, {w, h, fit}) → view {canvas, ctx, w, h, clear(), toLogical(e)}  HiDPI
     SimKit.view (실험 화면): 논리 좌표 1250×700(=u), 왼쪽 위 원점
     SimKit.color('--color-primary')  CSS 토큰 색 읽기     SimKit.px(n) = n u 의 CSS px
     SimKit.arrow(ctx, x1,y1,x2,y2, {color, width, head, dash, label})
     SimKit.meters(where, [{key,label,symbol,unit,decimals,q:'velocity'|'force'|'energy-k'|'energy-p'|'heat', hidden}])
       → m.set(key, value) / m.update({key:value})
     SimKit.fmt(v, decimals)  (음수는 '−', 소수 자리 고정)

   ── 7. 흐름·안내 ───────────────────────────────────────────────────
     SimKit.play() / pause() / toggle() / reset() / finish(msg) / stepFrame(+1|-1) / setSpeed(x)
     SimKit.time(초) · SimKit.running · SimKit.started · SimKit.finished · SimKit.speed
     SimKit.goStep(i) · SimKit.stepIndex · SimKit.stepName — 단계 바뀌면 cfg.onStep,
       data-step-only="비교 정리" 붙은 요소는 그 단계에서만 보임
     SimKit.predict({question, choices, info, tag}) → Promise<번호|null>  예측 카드
     SimKit.notice(text, 'info'|'warn'|'restart'|'ok', ms)   SimKit.confirm({title, body, ok, cancel}) → Promise<bool>
     SimKit.guide({rows:[{target, standard, discover, misconception}], notes:[문장]})  '수업 안내' 서랍(교사용)
     SimKit.setStatus(text|null)  SimKit.update()  (상태 줄 다시 쓰기)  SimKit.requestRender()
     SimKit.onKey(fn(e) -> true 면 처리 끝)  시뮬레이터 전용 키 (공통 키보다 먼저 받음)

   ── 공통 키 (e.code 사용 → 한글 입력 상태에서도 동작) ──────────────────
     F 전체 화면 · → / PageDown 다음 단계 · ← / PageUp 이전 단계 · Space 실행/일시정지
     1~5 프리셋 · R 초기화(기록 유지) · S 기록 · C 기록 지우기(확인) · , / . 한 프레임 뒤/앞
     [ / ] 속도 0.05·0.1·0.25·0.5·1배 · H 교사용 숨김값 · T 조작판 접기
     Esc 창·카드 닫기 → (닫을 것이 없으면) 1.5초 안에 두 번: 허브로
     숫자칸·글자칸에 포커스가 있으면 공통 키는 꺼진다. 슬라이더 포커스 중 화살표는 슬라이더가 받는다.
   ===================================================================== */
(function (global) {
  'use strict';

  var SK = {};
  var SPEEDS = [0.05, 0.1, 0.25, 0.5, 1];
  var MAX_RECORDS = 5;
  var STEP_DEFAULT = ['예측', '실행', '비교', '정리'];
  var SECTION_TITLES = { situation: '상황 바꾸기', values: '수치 바꾸기', tools: '표시 도구', deep: '심화' };

  /* ------------------------------------------------------------------
     0. 작은 도구
     ------------------------------------------------------------------ */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    if (kids !== undefined && kids !== null) {
      (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return el;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function decimalsOf(step) {
    var s = String(step);
    if (s.indexOf('e-') >= 0) return parseInt(s.split('e-')[1], 10) || 0;
    var i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  }
  function roundTo(v, d) { var p = Math.pow(10, d); return Math.round(v * p) / p; }
  /** 숫자 → 글자. 음수는 '−'(U+2212). decimals 자리 고정. */
  function fmt(v, decimals) {
    if (v === null || v === undefined || isNaN(v)) return '–';
    var d = decimals === undefined ? 2 : decimals;
    var s = Math.abs(v).toFixed(d);
    if (Number(s) === 0) return s;
    return (v < 0 ? '−' : '') + s;
  }
  /** 최소 minD 자리, 최대 maxD 자리(뒤쪽 0 은 minD 까지 지움) */
  function fmtFlex(v, minD, maxD) {
    var s = fmt(v, maxD);
    if (maxD > minD && s.indexOf('.') >= 0) {
      var cut = s.length;
      while (cut > 0 && s.charAt(cut - 1) === '0' && (cut - s.indexOf('.') - 1) > minD) cut--;
      s = s.slice(0, cut);
      if (s.charAt(s.length - 1) === '.') s = s.slice(0, -1);
    }
    return s;
  }
  function parseNum(str) {
    if (typeof str === 'number') return str;
    var s = String(str).trim().replace(/[−–—]/g, '-').replace(/\s/g, '').replace(/,/g, '.');
    if (s === '' || s === '-' || s === '.') return NaN;
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return NaN;
    return parseFloat(s);
  }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function cssVar(name, el) { return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim(); }
  function msVar(name, fallback) {
    var v = cssVar(name); if (!v) return fallback;
    var n = parseFloat(v); return isNaN(n) ? fallback : (v.indexOf('ms') >= 0 ? n : n * 1000);
  }
  function blurOnMouse(e) { if (e && e.detail > 0 && e.currentTarget && e.currentTarget.blur) e.currentTarget.blur(); }

  SK.h = h; SK.fmt = fmt; SK.clamp = clamp; SK.parseNum = parseNum;

  /* 색 토큰 읽기 (캐시) */
  var colorCache = {};
  SK.color = function (name) {
    if (name.slice(0, 2) !== '--') return name;
    if (!colorCache[name]) colorCache[name] = cssVar(name, document.body || document.documentElement) || '#000';
    return colorCache[name];
  };
  /** n u → CSS px (지금 창 크기 기준) */
  SK.px = function (n) {
    var probe = cssVar('--design-w') || '1920';
    var w = window.innerWidth, hgt = window.innerHeight;
    var dw = parseFloat(probe) || 1920, dh = dw === 1330 ? 2000 : 1080;
    return n * Math.min(w / dw, hgt / dh);
  };

  /* ------------------------------------------------------------------
     1. 상태
     ------------------------------------------------------------------ */
  SK.ui = {};          // 패널에 보이는 값
  SK.params = {};      // 지금 실행에 쓰는 값
  SK.defs = {};        // key → 정의
  SK.controls = {};    // key → 위젯 API
  SK.records = [];
  SK.ghost = null;
  SK.prediction = null;
  SK.time = 0;
  SK.running = false;
  SK.started = false;
  SK.finished = false;
  SK.speed = 1;
  SK.stepIndex = 0;
  SK.stepName = '';
  SK.el = {};
  SK.view = null;

  var cfg = {};
  var steps = [];
  var pending = {};           // '다시 시작' 값 중 아직 적용 안 된 key
  var presets = [];
  var activePreset = -1;
  var statusOverride = null;
  var dirty = true;
  var runId = 0, recordedRunId = -1;
  var history = [];
  var keyHandlers = [];
  var recordListeners = [];
  var modal = null;           // {type:'dialog'|'predict'|'mode', onKey(e)}
  var lastEsc = 0;
  var noticeLast = {};
  var initialized = false;

  /* ------------------------------------------------------------------
     2. init — 화면 뼈대
     ------------------------------------------------------------------ */
  SK.init = function (c) {
    if (initialized) { console.warn('SimKit.init 은 한 번만 부르세요.'); return SK; }
    initialized = true;
    cfg = c || {};
    cfg.dt = cfg.dt || 1 / 240;
    cfg.hubHref = cfg.hubHref || '../../index.html';
    if (cfg.predictOnPreset === undefined) cfg.predictOnPreset = true;
    steps = (cfg.steps && cfg.steps.length) ? cfg.steps.slice() : STEP_DEFAULT.slice();

    ensureViewport();
    if (cfg.slug) document.body.setAttribute('data-sim', cfg.slug);
    if (cfg.title && !document.title) document.title = cfg.title + ' — 물리 시뮬레이터 실험실';
    buildSkeleton();
    colorCache = {};

    SK.view = SK.canvas(SK.el.stage, { w: 1250, h: 700, fit: cfg.stageFit !== false, className: 'stage-canvas' });
    installKeys();
    installCursorHide();
    installNoZoom();
    renderSteps();
    SK.goStep(0, true);

    // 첫 reset 은 시뮬레이터가 변수 위젯을 다 만든 뒤(다음 틱)에
    setTimeout(function () {
      SK.params = copy(SK.ui);
      doReset(false);
      requestAnimationFrame(frame);
    }, 0);
    return SK;
  };

  function ensureViewport() {
    var m = document.querySelector('meta[name="viewport"]');
    var want = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    if (!m) { m = h('meta', { name: 'viewport' }); document.head.appendChild(m); }
    m.setAttribute('content', want);
  }

  function buildSkeleton() {
    var root = document.getElementById(cfg.rootId || 'sim-root');
    if (!root) { root = h('div', { id: 'sim-root' }); document.body.appendChild(root); }
    root.className = 'app';
    var slide = h('div', { class: 'slide sim' });

    // 제목 줄
    var chips = [];
    if (cfg.subject) chips.push(h('span', { class: 'chip chip--sim', text: cfg.subject }));
    if (cfg.unit) chips.push(h('span', { class: 'chip chip--outline', text: cfg.unit }));
    (cfg.standards || []).forEach(function (s) {
      chips.push(h('span', { class: 'chip chip--sim num', text: s.charAt(0) === '[' ? s : '[' + s + ']' }));
    });
    var today = cfg.today ? h('p', { class: 'sim-today' }, [h('b', { text: '오늘 알아볼 것' }), cfg.today]) : null;
    var status = h('p', { class: 'sim-status', 'aria-live': 'polite' });
    var stepList = h('ul', { class: 'menu__list sim-steps', 'aria-label': '수업 단계' });
    var top = h('header', { class: 'sim-top menu' }, [
      h('a', { class: 'menu__brand sim-top__brand', href: cfg.hubHref, title: '처음 화면(허브)으로 — Esc 두 번' }, [
        h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, [h('i'), h('i'), h('i')]),
        h('span', { class: 'menu__name' }, ['물리 시뮬레이터', h('br'), '실험실'])
      ]),
      h('div', { class: 'sim-top__main' }, [
        h('h1', { class: 'sim-title', text: cfg.title || '제목' }),
        h('div', { class: 'sim-top__line2' }, chips.concat(today ? [today] : []))
      ]),
      status,
      stepList
    ]);

    // 실험 화면
    var stage = h('main', { class: 'sim-stage', 'aria-label': '실험 화면' });
    var cTL = h('div', { class: 'stage-corner stage-corner--tl' });
    var cTR = h('div', { class: 'stage-corner stage-corner--tr' });
    var cBL = h('div', { class: 'stage-corner stage-corner--bl' });
    var cBR = h('div', { class: 'stage-corner stage-corner--br' });
    var notices = h('div', { class: 'notice-zone', 'aria-live': 'assertive' });
    stage.appendChild(cTL); stage.appendChild(cTR); stage.appendChild(cBL); stage.appendChild(cBR); stage.appendChild(notices);

    // 조절 패널
    var panel = h('aside', { class: 'sim-panel', 'aria-label': '조절 패널' });
    var secs = {};
    ['situation', 'values', 'tools'].forEach(function (name) {
      var body = h('div', { class: 'panel-sec__body' });
      var sec = h('section', { class: 'panel-sec', 'data-sec': name }, [h('h2', { class: 'panel-sec__title', text: SECTION_TITLES[name] }), body]);
      panel.appendChild(sec); secs[name] = body;
    });
    var deepBody = h('div', { class: 'panel-sec__body' });
    var deep = h('details', { class: 'panel-sec panel-deep', 'data-sec': 'deep' }, [
      h('summary', { class: 'panel-sec__title', text: SECTION_TITLES.deep }), deepBody
    ]);
    panel.appendChild(deep); secs.deep = deepBody;
    var foot = h('div', { class: 'panel-foot' });
    panel.appendChild(foot);

    // 하단 띠
    var meters = h('div', { class: 'band-cell band-cell--meters' });
    var graph = h('div', { class: 'band-cell band-cell--graph' });
    var records = h('div', { class: 'band-cell band-cell--records' });
    var band = h('section', { class: 'sim-band', 'aria-label': '측정값·그래프·기록' }, [meters, graph, records]);

    // 하단 막대
    var presetsBox = h('div', { class: 'sim-bar__group sim-bar__presets', 'aria-label': '프리셋 (1~5)' });
    var btnRun = h('button', { class: 'btn btn--primary btn--run', type: 'button', onclick: function (e) { blurOnMouse(e); SK.toggle(); } });
    var btnBack = h('button', { class: 'btn btn--icon', type: 'button', title: '한 프레임 뒤 ( , )', 'aria-label': '한 프레임 뒤', onclick: function (e) { blurOnMouse(e); SK.stepFrame(-1); } }, '◀');
    var btnFwd = h('button', { class: 'btn btn--icon', type: 'button', title: '한 프레임 앞 ( . )', 'aria-label': '한 프레임 앞', onclick: function (e) { blurOnMouse(e); SK.stepFrame(1); } }, '▶');
    var btnSpeed = h('button', { class: 'btn btn--speed num', type: 'button', title: '재생 속도 ( [ / ] )', onclick: function (e) { blurOnMouse(e); cycleSpeed(); } });
    var transport = h('div', { class: 'sim-bar__group sim-bar__transport' }, [btnRun, btnBack, btnFwd, btnSpeed]);
    var btnRec = h('button', { class: 'btn btn--secondary', type: 'button', onclick: function (e) { blurOnMouse(e); SK.record(); } }, ['기록', h('span', { class: 'btn__key', text: 'S' })]);
    var btnReset = h('button', { class: 'btn', type: 'button', onclick: function (e) { blurOnMouse(e); SK.reset(); } }, ['초기화', h('span', { class: 'btn__key', text: 'R' })]);
    var btnClear = h('button', { class: 'btn btn--quiet', type: 'button', onclick: function (e) { blurOnMouse(e); SK.clearRecords(); } }, ['지우기', h('span', { class: 'btn__key', text: 'C' })]);
    var recGroup = h('div', { class: 'sim-bar__group sim-bar__records' }, [btnRec, btnReset, btnClear]);
    var bar = h('footer', { class: 'sim-bar', 'aria-label': '실행 조절' }, [presetsBox, transport, recGroup]);

    slide.appendChild(top); slide.appendChild(stage); slide.appendChild(panel); slide.appendChild(band); slide.appendChild(bar);
    root.innerHTML = '';
    root.appendChild(slide);

    SK.el = {
      root: root, slide: slide, top: top, status: status, steps: stepList, stage: stage, panel: panel,
      sections: secs, panelFoot: foot, band: band, meters: meters, graph: graph, records: records,
      bar: bar, presets: presetsBox, notices: notices,
      cornerTL: cTL, cornerTR: cTR, cornerBL: cBL, cornerBR: cBR,
      btnRun: btnRun, btnBack: btnBack, btnFwd: btnFwd, btnSpeed: btnSpeed, btnRec: btnRec
    };
    updateTransport();
  }

  SK.panel = function (name) {
    if (!SK.el.sections) throw new Error('SimKit.init 을 먼저 부르세요.');
    return SK.el.sections[name] || SK.el.sections.values;
  };
  function resolveWhere(where) {
    if (!where) return SK.panel('values');
    if (typeof where === 'string') return SK.panel(where);
    return where;
  }

  /* ------------------------------------------------------------------
     3. 단계 (예측 › 실행 › 비교 › 정리)
     ------------------------------------------------------------------ */
  function renderSteps() {
    var ul = SK.el.steps; ul.innerHTML = '';
    steps.forEach(function (name, i) {
      var b = h('button', { class: 'menu__item', type: 'button', 'data-i': i, onclick: function (e) { blurOnMouse(e); SK.goStep(i); } }, [
        h('span', { class: 'menu__key', 'aria-hidden': 'true' }), name
      ]);
      ul.appendChild(h('li', null, b));
    });
  }
  SK.goStep = function (i, silent) {
    if (i < 0 || i >= steps.length) return;
    SK.stepIndex = i; SK.stepName = steps[i];
    var items = SK.el.steps.querySelectorAll('.menu__item');
    for (var k = 0; k < items.length; k++) {
      var it = items[k], key = it.querySelector('.menu__key');
      if (k === i) { it.setAttribute('aria-current', 'step'); key.textContent = '●'; }
      else { it.removeAttribute('aria-current'); key.textContent = k < i ? '✓' : ''; }
      it.classList.toggle('is-done', k < i);
    }
    document.documentElement.setAttribute('data-step', steps[i]);
    var only = document.querySelectorAll('[data-step-only]');
    for (var j = 0; j < only.length; j++) {
      var list = only[j].getAttribute('data-step-only').split(/\s+/);
      only[j].hidden = list.indexOf(steps[i]) < 0;
    }
    if (!silent && cfg.onStep) cfg.onStep(i, steps[i]);
    dirty = true;
  };
  SK.nextStep = function () { if (SK.stepIndex < steps.length - 1) SK.goStep(SK.stepIndex + 1); };
  SK.prevStep = function () { if (SK.stepIndex > 0) SK.goStep(SK.stepIndex - 1); };

  /* ------------------------------------------------------------------
     4. 값 바꾸기 공통 (즉시 / 다시 시작)
     ------------------------------------------------------------------ */
  function applyTag(apply) {
    return apply === 'live'
      ? h('span', { class: 'tag tag--live', title: '바꾸면 바로 반영돼요' }, '즉시')
      : h('span', { class: 'tag tag--restart', title: '다음 실행부터 반영돼요 (R)' }, '다시 시작');
  }
  function registerDef(def, kind, where) {
    if (!def.key) throw new Error('SimKit: key 가 없습니다.');
    if (SK.defs[def.key]) console.warn('SimKit: key 가 겹칩니다 — ' + def.key);
    def.kind = kind;
    def.apply = def.apply || (kind === 'toggle' ? 'live' : 'restart');
    if (def.record === undefined) def.record = where !== 'tools';
    SK.defs[def.key] = def;
  }
  /** 위젯이 값을 바꿨을 때 공통 처리 */
  function valueChanged(key, value, opts) {
    opts = opts || {};
    var def = SK.defs[key];
    SK.ui[key] = value;
    if (opts.silent) { dirty = true; return; }
    if (def.record && activePreset >= 0) markPreset(-1);
    if (def.apply === 'live') {
      SK.params[key] = value;
      delete pending[key];
    } else if (!SK.started) {
      SK.params[key] = value;
      delete pending[key];
      doReset(false);
    } else if (SK.params[key] !== value) {
      pending[key] = true;
      SK.notice('다음 실행부터 적용돼요 — R', 'restart');
    } else {
      delete pending[key];
    }
    markPendingUI();
    if (def.onChange) def.onChange(value, { key: key, source: opts.source || 'ui', params: SK.params });
    dirty = true;
    SK.update();
  }
  function markPendingUI() {
    for (var k in SK.controls) {
      var el = SK.controls[k].el;
      if (el) el.classList.toggle('is-pending', !!pending[k]);
    }
  }
  SK.get = function (key) { return SK.ui[key]; };
  SK.set = function (key, value, opts) {
    var c = SK.controls[key];
    if (!c) { console.warn('SimKit.set: 없는 key — ' + key); return; }
    c.set(value, opts);
  };
  SK.hasPending = function () { for (var k in pending) return true; return false; };

  /* ------------------------------------------------------------------
     5. 수치 바꾸기: 슬라이더 + −/+ + 숫자칸 (요구 A)
     ------------------------------------------------------------------ */
  SK.addVar = function (where, def) {
    var whereName = typeof where === 'string' ? where : '';
    registerDef(def, 'var', whereName);
    var min = def.min, max = def.max, step = def.step || 1;
    var dec = def.decimals !== undefined ? def.decimals : decimalsOf(step);
    var prec = def.precision !== undefined ? def.precision : dec + 1;
    var value = def.value !== undefined ? def.value : min;

    var range = h('input', { class: 'range', type: 'range', min: min, max: max, step: step, 'aria-label': def.label + (def.unit ? ' (' + def.unit + ')' : '') });
    var input = h('input', { class: 'var__input num', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': def.label + ' 숫자 입력' });
    var msg = h('p', { class: 'var__msg', role: 'alert', hidden: true });
    var bubble = h('span', { class: 'var__bubble', 'aria-hidden': 'true' });
    var ticks = null;
    if (def.ticks && def.ticks.length) {
      ticks = h('div', { class: 'var__ticks', 'aria-hidden': 'true' });
      def.ticks.forEach(function (t) {
        ticks.appendChild(h('span', { style: 'left:' + ((t - min) / (max - min) * 100) + '%', text: fmtFlex(t, 0, dec) }));
      });
    }
    var minus = h('button', { class: 'btn btn--icon var__step', type: 'button', 'aria-label': def.label + ' 줄이기' }, '−');
    var plus = h('button', { class: 'btn btn--icon var__step', type: 'button', 'aria-label': def.label + ' 늘리기' }, '+');
    var track = h('div', { class: 'var__track' }, [range, bubble, ticks]);
    var labelKids = [def.label];
    if (def.symbol) labelKids.push(h('span', { class: 'var__sym', text: def.symbol }));
    var el = h('div', { class: 'var' + (def.teacher ? ' teacher-only' : ''), 'data-key': def.key }, [
      h('div', { class: 'var__head' }, [
        h('label', { class: 'var__label' }, labelKids),
        applyTag(def.apply),
        h('span', { class: 'var__field' }, [input, h('span', { class: 'var__unit', text: def.unit || '' })])
      ]),
      h('div', { class: 'var__row' }, [minus, track, plus]),
      msg
    ]);
    if (def.hint) el.appendChild(h('p', { class: 'var__msg text-muted', style: 'color:var(--color-ink-muted)', text: def.hint }));
    resolveWhere(where).appendChild(el);

    var msgTimer = 0;
    function showMsg(text) {
      msg.textContent = text; msg.hidden = false; input.classList.add('is-invalid');
      clearTimeout(msgTimer);
      msgTimer = setTimeout(function () { msg.hidden = true; input.classList.remove('is-invalid'); }, msVar('--dur-notice', 3000));
    }
    function show(v) {
      var s = fmtFlex(v, dec, prec);
      if (document.activeElement !== input) input.value = s.replace('−', '-');
      range.value = v;
      range.style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%');
      bubble.textContent = s + (def.unit ? ' ' + def.unit : '');
      bubble.style.left = 'calc(' + ((v - min) / (max - min)) + ' * (100% - var(--space-thumb)) + var(--space-thumb) / 2)';
    }
    function set(v, opts) {
      opts = opts || {};
      v = roundTo(clamp(Number(v), min, max), prec);
      value = v; show(v);
      valueChanged(def.key, v, opts);
    }
    range.addEventListener('input', function () { set(parseFloat(range.value), { source: 'slider' }); });
    function startDrag() { el.classList.add('is-dragging'); }
    function endDrag() { el.classList.remove('is-dragging'); }
    range.addEventListener('pointerdown', startDrag);
    range.addEventListener('pointerup', endDrag);
    range.addEventListener('pointercancel', endDrag);
    range.addEventListener('blur', endDrag);
    range.addEventListener('change', endDrag);

    function commit() {
      var raw = input.value, v = parseNum(raw);
      if (isNaN(v)) { showMsg('숫자만 넣어 주세요. (예: ' + fmtFlex(value, dec, prec) + ')'); input.value = fmtFlex(value, dec, prec).replace('−', '-'); return; }
      if (v < min || v > max) {
        var near = clamp(v, min, max);
        showMsg('범위는 ' + fmtFlex(min, 0, prec) + ' ~ ' + fmtFlex(max, 0, prec) + (def.unit ? ' ' + def.unit : '') + ' 예요. 가장 가까운 ' + fmtFlex(near, 0, prec) + ' 로 맞췄어요.');
        v = near;
      }
      if (roundTo(v, prec) !== value) set(v, { source: 'input' });
      input.value = fmtFlex(value, dec, prec).replace('−', '-');
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); input.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); input.value = fmtFlex(value, dec, prec).replace('−', '-'); input.blur(); e.stopPropagation(); }
    });
    input.addEventListener('change', commit);
    input.addEventListener('focus', function () { input.select(); });

    // −/+ : 누르고 있으면 반복
    function nudge(dir) { set(roundTo(value + dir * step, prec), { source: 'button' }); }
    function holdable(btn, dir) {
      var t1 = 0, t2 = 0;
      function stop() { clearTimeout(t1); clearInterval(t2); }
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault(); nudge(dir); stop();
        t1 = setTimeout(function () { t2 = setInterval(function () { nudge(dir); }, 80); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, stop); });
      btn.addEventListener('click', function (e) { if (e.detail === 0) nudge(dir); }); // 키보드 Enter
    }
    holdable(minus, -1); holdable(plus, 1);

    var api = {
      key: def.key, el: el, def: def, range: range, input: input,
      get: function () { return value; },
      set: set,
      setRange: function (a, b) {
        min = a; max = b; range.min = a; range.max = b;
        if (value < a || value > b) set(clamp(value, a, b), { source: 'range' }); else show(value);
      },
      enable: function (on) { el.classList.toggle('is-disabled', on === false); range.disabled = input.disabled = minus.disabled = plus.disabled = on === false; }
    };
    SK.controls[def.key] = api;
    value = roundTo(clamp(value, min, max), prec);
    SK.ui[def.key] = value;
    if (!(def.key in SK.params)) SK.params[def.key] = value;
    show(value);
    return api;
  };

  /* ------------------------------------------------------------------
     6. 상황 바꾸기: 세그먼트·카드 / 체크 토글 (요구 B)
     ------------------------------------------------------------------ */
  SK.addChoice = function (where, def) {
    var whereName = typeof where === 'string' ? where : '';
    registerDef(def, 'choice', whereName);
    var value = def.value !== undefined ? def.value : def.options[0].value;
    var seg = h('div', { class: 'seg' + (def.style === 'cards' ? ' seg--cards' : ''), role: 'group', 'aria-label': def.label });
    var btns = def.options.map(function (o) {
      var kids = [o.label];
      if (o.sub) kids.push(h('span', { class: 'btn__sub', text: o.sub }));
      var b = h('button', { class: 'seg__opt', type: 'button', title: o.title || null }, kids);
      b.addEventListener('click', function (e) { blurOnMouse(e); set(o.value, { source: 'ui' }); });
      seg.appendChild(b);
      return b;
    });
    var el = h('div', { class: 'ctl' + (def.teacher ? ' teacher-only' : ''), 'data-key': def.key }, [
      h('div', { class: 'ctl__label' }, [def.label, applyTag(def.apply)]), seg
    ]);
    resolveWhere(where).appendChild(el);
    function show(v) {
      def.options.forEach(function (o, i) { btns[i].setAttribute('aria-pressed', String(o.value === v)); });
    }
    function set(v, opts) {
      var ok = def.options.some(function (o) { return o.value === v; });
      if (!ok) { console.warn('SimKit: ' + def.key + ' 에 없는 값 ' + v); return; }
      value = v; show(v); valueChanged(def.key, v, opts);
    }
    var api = {
      key: def.key, el: el, def: def, get: function () { return value; }, set: set,
      enableOption: function (v, on) { def.options.forEach(function (o, i) { if (o.value === v) btns[i].disabled = on === false; }); },
      enable: function (on) { el.classList.toggle('is-disabled', on === false); btns.forEach(function (b) { b.disabled = on === false; }); }
    };
    SK.controls[def.key] = api;
    SK.ui[def.key] = value;
    if (!(def.key in SK.params)) SK.params[def.key] = value;
    show(value);
    return api;
  };

  SK.addToggle = function (where, def) {
    var whereName = typeof where === 'string' ? where : '';
    registerDef(def, 'toggle', whereName);
    var value = !!def.value;
    var stateEl = h('span', { class: 'check__state' });
    var btn = h('button', { class: 'check', type: 'button' }, [
      h('span', { class: 'check__box', 'aria-hidden': 'true' }),
      h('span', { class: 'check__text', text: def.label }),
      def.apply === 'restart' ? applyTag('restart') : null,
      stateEl
    ]);
    btn.addEventListener('click', function (e) { blurOnMouse(e); set(!value, { source: 'ui' }); });
    var el = h('div', { class: 'ctl' + (def.teacher ? ' teacher-only' : ''), 'data-key': def.key }, btn);
    resolveWhere(where).appendChild(el);
    function show(v) { btn.setAttribute('aria-pressed', String(v)); stateEl.textContent = v ? (def.onText || '켬') : (def.offText || '끔'); }
    function set(v, opts) { value = !!v; show(value); valueChanged(def.key, value, opts); }
    var api = {
      key: def.key, el: el, def: def, get: function () { return value; }, set: set,
      enable: function (on) { el.classList.toggle('is-disabled', on === false); btn.disabled = on === false; }
    };
    SK.controls[def.key] = api;
    SK.ui[def.key] = value;
    if (!(def.key in SK.params)) SK.params[def.key] = value;
    show(value);
    return api;
  };

  /** 기록·표에 쓰는 값 글자 */
  SK.valueText = function (key, v) {
    var d = SK.defs[key];
    if (v === undefined) v = SK.params[key];
    if (!d) return typeof v === 'number' ? fmtFlex(v, 0, 3) : String(v);
    if (d.kind === 'toggle') return v ? (d.onText || '켬') : (d.offText || '끔');
    if (d.kind === 'choice') {
      for (var i = 0; i < d.options.length; i++) if (d.options[i].value === v) return d.options[i].label;
      return String(v);
    }
    var dec = d.decimals !== undefined ? d.decimals : decimalsOf(d.step || 1);
    var prec = d.precision !== undefined ? d.precision : dec + 1;
    return fmtFlex(v, dec, prec);
  };

  /* ------------------------------------------------------------------
     7. 프리셋 (값·상황을 한꺼번에)
     ------------------------------------------------------------------ */
  var presetInfoEl = null;
  SK.setPresets = function (list) {
    presets = (list || []).slice(0, 5);
    if (list && list.length > 5) console.warn('SimKit: 프리셋은 5개까지입니다.');
    var box = SK.el.presets; box.innerHTML = '';
    presets.forEach(function (p, i) {
      var b = h('button', { class: 'preset', type: 'button', title: p.name + (p.change ? ' — 바꿀 값: ' + p.change : ''), 'aria-pressed': 'false' }, [
        h('span', { class: 'preset__key', text: String(i + 1) }),
        h('span', { class: 'preset__body' }, [
          h('span', { class: 'preset__name', text: p.name }),
          p.tag ? h('span', { class: 'chip', 'data-tag': p.tag, text: p.tag }) : null
        ])
      ]);
      b.addEventListener('click', function (e) { blurOnMouse(e); SK.applyPreset(i); });
      box.appendChild(b);
    });
  };
  function markPreset(i) {
    activePreset = i;
    var bs = SK.el.presets.querySelectorAll('.preset');
    for (var k = 0; k < bs.length; k++) bs[k].setAttribute('aria-pressed', String(k === i));
    if (presetInfoEl) { presetInfoEl.remove(); presetInfoEl = null; }
    if (i >= 0) {
      var p = presets[i];
      presetInfoEl = h('div', { class: 'preset-info' }, [
        p.tag ? h('span', { class: 'chip', 'data-tag': p.tag, text: p.tag }) : null,
        h('b', { text: (i + 1) + '. ' + p.name }),
        p.change ? h('span', { class: 'is-change' }, [h('b', { text: '바꿀 값 ' }), p.change]) : null,
        p.fixed ? h('span', { class: 'is-fixed' }, [h('b', { text: '고정한 값 ' }), p.fixed]) : null
      ]);
      SK.el.cornerTL.insertBefore(presetInfoEl, SK.el.cornerTL.firstChild);
    }
  }
  SK.applyPreset = function (i) {
    var p = presets[i]; if (!p) return;
    SK.pause();
    var vals = p.values || {};
    for (var k in vals) {
      if (!Object.prototype.hasOwnProperty.call(vals, k)) continue;
      if (SK.controls[k]) SK.controls[k].set(vals[k], { silent: true });
      else console.warn('SimKit 프리셋: 없는 key — ' + k);
    }
    pending = {}; markPendingUI();
    doReset(true);
    markPreset(i);
    if (p.onApply) p.onApply(SK.params);
    SK.update();
    if (p.predict && cfg.predictOnPreset) {
      var q = copy(p.predict); q.tag = q.tag || p.tag;
      SK.predict(q);
    }
  };

  /* ------------------------------------------------------------------
     8. 실행 흐름 · 고정 시간 간격 루프
     ------------------------------------------------------------------ */
  function captureGhost() {
    if (!SK.started || !cfg.capture) return;
    var data = cfg.capture(SK.params);
    if (data) {
      SK.ghost = { params: copy(SK.params), series: data.series || {}, values: data.values || {} };
      fireRecords();
    }
  }
  function doReset(keepGhostCapture) {
    if (keepGhostCapture) captureGhost();
    SK.params = copy(SK.ui);
    pending = {}; markPendingUI();
    SK.time = 0; SK.running = false; SK.started = false; SK.finished = false;
    history = []; acc = 0;
    runId++;
    if (cfg.reset) cfg.reset(SK.params);
    dirty = true;
    updateTransport(); SK.update();
  }
  SK.reset = function () { doReset(true); };
  SK.play = function () {
    if (modal) return;
    if (SK.finished) doReset(true);
    SK.running = true; lastTs = null;
    if (SK.stepName === '예측' && SK.stepIndex < steps.length - 1 && steps[SK.stepIndex + 1] === '실행') SK.goStep(SK.stepIndex + 1);
    updateTransport(); SK.update();
  };
  SK.pause = function () { SK.running = false; updateTransport(); SK.update(); };
  SK.toggle = function () { if (SK.running) SK.pause(); else SK.play(); };
  /** 시뮬레이터가 실행이 끝났을 때 부른다 (예: 공이 땅에 닿음) */
  SK.finish = function (msg) {
    SK.running = false; SK.finished = true; dirty = true;
    updateTransport(); SK.update();
    if (msg) SK.notice(msg, 'ok');
  };
  // 재생 속도를 바꾸면 화면도 다시 그린다 (배속 글자를 실험 화면에 쓰는 시뮬레이터용) — 고도화 요청 반영
  SK.setSpeed = function (s) { SK.speed = s; updateTransport(); dirty = true; SK.update(); };
  function cycleSpeed(dir) {
    var i = SPEEDS.indexOf(SK.speed); if (i < 0) i = SPEEDS.length - 1;
    if (dir === undefined) i = (i + 1) % SPEEDS.length; else i = clamp(i + dir, 0, SPEEDS.length - 1);
    SK.setSpeed(SPEEDS[i]);
  }
  function speedText(s) { return String(s) + '배'; }
  function updateTransport() {
    if (!SK.el.btnRun) return;
    var b = SK.el.btnRun; b.innerHTML = '';
    var label = SK.running ? '⏸ 멈춤' : (SK.finished ? '↻ 다시' : (SK.started ? '▶ 계속' : '▶ 실행'));
    b.appendChild(document.createTextNode(label));
    b.appendChild(h('span', { class: 'btn__key', text: 'Space' }));
    b.setAttribute('aria-pressed', String(SK.running));
    SK.el.btnSpeed.textContent = speedText(SK.speed);
    SK.el.btnBack.disabled = !(cfg.save && cfg.load);
  }

  /** 한 프레임(1/60 초) 앞(+1) / 뒤(−1) */
  SK.stepFrame = function (dir) {
    if (modal) return;
    if (SK.running) SK.pause();
    if (dir > 0) {
      if (SK.finished) return;
      pushHistory();
      var n = Math.max(1, Math.round((1 / 60) / cfg.dt));
      for (var i = 0; i < n && !SK.finished; i++) physStep();
      dirty = true;
    } else {
      if (!(cfg.save && cfg.load)) { SK.notice('이 시뮬레이터는 뒤로 가기를 지원하지 않아요', 'info'); return; }
      var hst = history.pop();
      if (!hst) { SK.notice('더 뒤로 갈 수 없어요', 'info'); return; }
      cfg.load(hst.s); SK.time = hst.t; SK.finished = false;
      SK.started = SK.time > 0;
      dirty = true;
    }
    updateTransport(); SK.update();
  };
  function pushHistory() {
    if (!(cfg.save && cfg.load)) return;
    history.push({ t: SK.time, s: cfg.save() });
    if (history.length > 1800) history.shift();
  }
  function physStep() {
    if (cfg.step) cfg.step(cfg.dt, SK.params);
    SK.time += cfg.dt;
    if (!SK.started) { SK.started = true; updateTransport(); }
  }

  var acc = 0, lastTs = null;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (lastTs === null) lastTs = ts;
    var real = Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    if (SK.running) {
      pushHistory();
      acc += real * SK.speed;
      var n = 0;
      while (acc >= cfg.dt && n < 4000) {
        physStep(); acc -= cfg.dt; n++;
        if (!SK.running) { acc = 0; break; }
      }
      dirty = true;
      if (Math.floor(SK.time * 4) !== Math.floor((SK.time - real * SK.speed) * 4)) SK.update();
    }
    if (dirty) {
      dirty = false;
      if (SK.view) SK.view.clear();
      if (cfg.render) cfg.render(SK.view, SK.params);
      for (var i = 0; i < frameHooks.length; i++) frameHooks[i]();
    }
  }
  var frameHooks = [];
  SK.onFrame = function (fn) { frameHooks.push(fn); };
  SK.requestRender = function () { dirty = true; };

  /* ------------------------------------------------------------------
     9. 상태 줄
     ------------------------------------------------------------------ */
  SK.setStatus = function (text) { statusOverride = text; SK.update(); };
  SK.update = function () {
    var el = SK.el.status; if (!el) return;
    el.innerHTML = '';
    var main = statusOverride !== null ? statusOverride : (cfg.status ? cfg.status(SK.params) : '');
    if (main) el.appendChild(document.createTextNode(main + ' · '));
    var run = SK.running ? '▶ 실행 중' : SK.finished ? '✓ 끝' : SK.started ? '⏸ 멈춤' : '⏹ 준비';
    el.appendChild(h('span', { class: SK.running ? 'is-run' : '' }, run + (SK.speed !== 1 ? ' ' + speedText(SK.speed) : '')));
    if (SK.hasPending()) el.appendChild(h('span', { class: 'is-pend' }, ' · 바뀐 값은 R 후 적용'));
    else el.appendChild(document.createTextNode(' · t = ' + fmt(SK.time, 2) + ' s'));
  };

  /* ------------------------------------------------------------------
     10. 기록 (S) · 직전 실행 · 지우기 (C)
     ------------------------------------------------------------------ */
  function recordKeys() {
    var ks = [];
    for (var k in SK.defs) if (SK.defs[k].record) ks.push(k);
    return ks;
  }
  SK.record = function () {
    if (!cfg.capture) { SK.notice('이 시뮬레이터는 기록을 쓰지 않아요', 'info'); return; }
    if (!SK.started) { SK.notice('먼저 실행해 보세요 (Space)', 'info'); return; }
    if (recordedRunId === runId) { SK.notice('이 실행은 이미 기록했어요. R 후 다시 실행하세요', 'info'); return; }
    if (SK.records.length >= MAX_RECORDS) { SK.notice('기록은 5개까지예요. C 로 지우고 다시 기록하세요', 'warn'); return; }
    var data = cfg.capture(SK.params);
    if (!data) { SK.notice('아직 기록할 결과가 없어요', 'info'); return; }
    var snap = {}, keys = recordKeys();
    keys.forEach(function (k) { snap[k] = SK.params[k]; });
    var prev = SK.records[SK.records.length - 1];
    var changed = [];
    if (prev) keys.forEach(function (k) { if (prev.params[k] !== snap[k]) changed.push(k); });
    var rec = {
      n: SK.records.length + 1, slot: SK.records.length,
      params: snap, values: data.values || {}, series: data.series || {},
      changed: changed, preset: activePreset >= 0 ? presets[activePreset].name : null,
      prediction: SK.prediction, time: SK.time
    };
    SK.records.push(rec);
    recordedRunId = runId;
    fireRecords();
    if (changed.length >= 2) SK.notice('두 가지 이상을 바꿨어요 — 무엇 때문인지 알기 어려워요', 'warn');
    else SK.notice('기록 ' + rec.n + ' 저장 (' + SK.records.length + '/' + MAX_RECORDS + ')', 'ok');
    if (SK.stepName === '실행' && steps.indexOf('비교') > SK.stepIndex && SK.records.length >= 2) SK.goStep(steps.indexOf('비교'));
    SK.update();
  };
  SK.clearRecords = function () {
    if (!SK.records.length && !SK.ghost) { SK.notice('지울 기록이 없어요', 'info'); return; }
    SK.confirm({
      title: '기록을 모두 지울까요?',
      body: '기록 ' + SK.records.length + '개와 직전 실행 흐림이 지워져요. 되돌릴 수 없어요.',
      ok: '지우기', cancel: '취소', danger: true
    }).then(function (yes) {
      if (!yes) return;
      SK.records = []; SK.ghost = null; recordedRunId = -1;
      fireRecords(); SK.update();
      SK.notice('기록을 지웠어요', 'info');
    });
  };
  SK.onRecords = function (fn) { recordListeners.push(fn); };
  function fireRecords() {
    dirty = true;
    recordListeners.forEach(function (fn) { fn(SK.records, SK.ghost); });
  }

  /** 기록 i(0~4)의 선 모양 */
  SK.recStyle = function (i) {
    var n = (i % MAX_RECORDS) + 1;
    var dash = cssVar('--dash-rec-' + n);
    return {
      color: SK.color('--color-rec-' + n),
      dash: (!dash || dash === 'none') ? [] : dash.split(/[\s,]+/).map(Number),
      width: parseFloat(cssVar('--width-rec-' + n)) || 4
    };
  };
  SK.ghostStyle = function () { return { color: SK.color('--color-q-ghost'), dash: [], width: 4 }; };
  /** 선 모양을 ctx 에 적용 (Canvas 논리 좌표 = u) */
  SK.applyStroke = function (ctx, st) {
    ctx.strokeStyle = st.color; ctx.lineWidth = st.width || 3;
    ctx.setLineDash(st.dash || []);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };
  /** 점 목록을 선으로. map(x,y) → [px,py] 로 좌표 변환 */
  SK.drawPath = function (ctx, pts, st, map) {
    if (!pts || pts.length < 2) return;
    ctx.save(); SK.applyStroke(ctx, st);
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = map ? map(pts[i][0], pts[i][1]) : pts[i];
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.stroke(); ctx.restore();
  };
  function swatchSVG(st) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 36 12'); svg.setAttribute('aria-hidden', 'true');
    var ln = document.createElementNS(ns, 'line');
    ln.setAttribute('x1', '2'); ln.setAttribute('y1', '6'); ln.setAttribute('x2', '34'); ln.setAttribute('y2', '6');
    ln.setAttribute('stroke', st.color); ln.setAttribute('stroke-width', String(Math.max(1.5, st.width * 0.75)));
    ln.setAttribute('stroke-linecap', 'round');
    if (st.dash && st.dash.length) ln.setAttribute('stroke-dasharray', st.dash.map(function (d) { return d * 0.6; }).join(' '));
    svg.appendChild(ln);
    return svg;
  }
  SK.swatch = swatchSVG;

  /** 기록 표. columns 생략 시 기록 대상 변수 전부 */
  SK.recordTable = function (where, opts) {
    opts = opts || {};
    var host = resolveWhere(where || SK.el.records);
    var title = h('span', { text: '기록' });
    var bigBtn = h('button', { class: 'btn btn--sm btn--quiet', type: 'button', title: '기록 표 크게 보기' }, '크게 ⤢');
    var scroll = h('div', { class: 'rec-box__scroll' });
    var box = h('div', { class: 'rec-box' }, [h('div', { class: 'rec-box__head' }, [title, bigBtn]), scroll]);
    host.appendChild(box);
    function columns() {
      if (opts.columns) return opts.columns;
      return recordKeys().map(function (k) { return { key: k, from: 'param' }; });
    }
    function build(big) {
      var cols = columns();
      if (!SK.records.length && !SK.ghost) {
        return h('p', { class: 'rec-empty', text: '실행한 뒤 S 를 누르면 결과가 여기 쌓여요. 한 번에 한 가지만 바꿔 비교해 보세요.' });
      }
      var head = h('tr', null, [h('th', { text: '#' })].concat(cols.map(function (c) {
        var d = SK.defs[c.key] || {};
        var lab = c.label || (d.symbol || d.label || c.key);
        var unit = c.unit !== undefined ? c.unit : (d.unit || '');
        return h('th', { text: lab + (unit ? ' (' + unit + ')' : '') });
      })));
      var rows = [];
      /* 열 옵션 (고도화 요청 반영):
         - text(rec): 그 줄의 기록 전체를 보고 글자를 정한다 (예: 벽 모드 줄의 m₂ 는 '–')
         - changed: true | function(rec, prev) → 결과(value) 열에도 '바뀜' 굵게를 붙인다 (크게 보기 창 포함) */
      function isChanged(c, src, prev, v) {
        if (!prev) return false;
        if (typeof c.changed === 'function') return !!c.changed(src, prev);
        if (c.from === 'value') return c.changed === true && prev.values[c.key] !== v;
        return prev.params[c.key] !== v;
      }
      function cellsFor(src, prev, cls) {
        return cols.map(function (c) {
          var v, txt, changed;
          if (c.from === 'value') {
            v = src.values[c.key];
            txt = typeof c.text === 'function' ? c.text(src, prev)
              : (typeof v === 'number') ? fmt(v, c.decimals !== undefined ? c.decimals : 2) : (v === undefined ? '–' : String(v));
            changed = isChanged(c, src, prev, v);
            return h('td', { class: changed ? 'is-changed' : 'is-result' }, txt);
          }
          v = src.params[c.key];
          txt = typeof c.text === 'function' ? c.text(src, prev)
            : c.decimals !== undefined && typeof v === 'number' ? fmt(v, c.decimals) : SK.valueText(c.key, v);
          changed = isChanged(c, src, prev, v);
          return h('td', { class: changed ? 'is-changed' : null }, txt);
        });
      }
      if (SK.ghost && (big || SK.records.length < 3)) {
        rows.push(h('tr', { class: 'is-ghost' }, [h('td', null, h('span', { class: 'rec-swatch' }, [swatchSVG(SK.ghostStyle()), '직전']))].concat(cellsFor(SK.ghost, null))));
      }
      SK.records.forEach(function (r, i) {
        var prev = i > 0 ? SK.records[i - 1] : null;
        var first = h('td', null, h('span', { class: 'rec-swatch' }, [swatchSVG(SK.recStyle(r.slot)), String(r.n)]));
        if (r.changed.length >= 2) first.appendChild(h('span', { class: 'chip chip--warn', style: 'height:calc(22 * var(--u));margin-left:var(--space-1)', text: r.changed.length + '개 바뀜' }));
        rows.push(h('tr', null, [first].concat(cellsFor(r, prev))));
      });
      return h('table', { class: 'rec-table' }, [h('thead', null, head), h('tbody', null, rows)]);
    }
    function render() {
      title.textContent = '기록 ' + SK.records.length + '/' + MAX_RECORDS;
      scroll.innerHTML = ''; scroll.appendChild(build(false));
    }
    bigBtn.addEventListener('click', function (e) {
      blurOnMouse(e);
      SK.dialog({ title: '기록 표', body: build(true), ok: '닫기', cancel: null });
    });
    SK.onRecords(render);
    render();
    return { el: box, render: render };
  };

  /* ------------------------------------------------------------------
     11. 확인 창 · 안내 말풍선 · 예측 카드 · 모드 카드 · 수업 안내 서랍
     ------------------------------------------------------------------ */
  SK.notice = function (text, type, ms) {
    var zone = SK.el.notices; if (!zone) return;
    var now = Date.now();
    if (noticeLast[text] && now - noticeLast[text] < 1200) return;
    noticeLast[text] = now;
    var n = h('div', { class: 'notice' + (type && type !== 'info' ? ' notice--' + type : ''), text: text });
    zone.appendChild(n);
    // 최대 2개만 쌓는다 (3개까지 쌓이면 프리셋 설명 줄·왼쪽 위 안내를 가렸음 — 고도화 보고 반영)
    while (zone.children.length > 2) zone.removeChild(zone.firstChild);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, ms || msVar('--dur-notice', 3000));
  };

  /** 일반 창. body 는 글자 또는 요소. 반환: Promise<bool> */
  SK.dialog = function (o) {
    return new Promise(function (resolve) {
      var prevFocus = document.activeElement;
      var okBtn = h('button', { class: 'btn ' + (o.danger ? 'btn--danger' : 'btn--primary'), type: 'button' }, [o.ok || '확인', h('span', { class: 'btn__key', text: 'Enter' })]);
      var cancelBtn = o.cancel === null ? null : h('button', { class: 'btn', type: 'button' }, [o.cancel || '취소', h('span', { class: 'btn__key', text: 'Esc' })]);
      var body = typeof o.body === 'string' ? h('p', { class: 'dialog__body', text: o.body }) : h('div', { class: 'dialog__body' }, o.body || null);
      var dlg = h('div', { class: 'dialog' + (o.small || typeof o.body === 'string' ? ' dialog--sm' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '' }, [
        o.title ? h('h2', { class: 'dialog__title', text: o.title }) : null, body,
        h('div', { class: 'dialog__foot' }, [cancelBtn, okBtn])
      ]);
      var layer = h('div', { class: 'dialog-layer' }, dlg);
      SK.el.slide.appendChild(layer);
      var was = SK.running; if (was) SK.pause();
      function close(v) {
        layer.remove(); modal = null;
        if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
        resolve(v);
      }
      okBtn.addEventListener('click', function () { close(true); });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });
      layer.addEventListener('pointerdown', function (e) { if (e.target === layer) close(false); });
      modal = {
        type: 'dialog', onKey: function (e) {
          if (e.code === 'Escape') { close(false); return true; }
          if (e.code === 'Enter' || e.code === 'NumpadEnter') { close(true); return true; }
          if (e.code === 'Tab') return false;
          return true;
        }
      };
      okBtn.focus({ preventScroll: true });
    });
  };
  SK.confirm = function (o) { return SK.dialog(o); };

  /** 예측 카드. choices: ['더 멀리', '같다', ...]  → Promise<번호(0~)|null> */
  SK.predict = function (o) {
    return new Promise(function (resolve) {
      if (modal && modal.type === 'predict') modal.close(null);
      var i0 = steps.indexOf('예측'); if (i0 >= 0) SK.goStep(i0);
      SK.pause();
      var layer, card, choices = o.choices || [];
      // 교사 화면용 '손들기 수' (결정서 §7: 학생 태블릿은 각자 고르고, 교사 화면은 손든 수를 적는다)
      var counts = choices.map(function () {
        return h('input', { class: 'predict__count', type: 'number', inputmode: 'numeric', min: '0', max: '99', step: '1', placeholder: '손', 'aria-label': '손든 학생 수', title: '손든 학생 수' });
      });
      function readCounts() {
        var r = [], any = false;
        counts.forEach(function (inp) { var n = parseInt(inp.value, 10); if (isNaN(n)) n = null; else any = true; r.push(n); });
        return any ? r : null;
      }
      function close(v) {
        var cnt = readCounts();
        if (layer) layer.remove(); modal = null;
        if (v !== null && v !== undefined) {
          SK.prediction = { question: o.question, answer: choices[v], index: v, counts: cnt };
          var tail = cnt ? ' · 손들기 ' + cnt.map(function (n, i) { return (i + 1) + '번 ' + (n === null ? 0 : n) + '명'; }).join(', ') : '';
          SK.notice('예측: ' + choices[v] + tail + ' — Space 로 실행해 확인!', 'info', 4000);
        }
        resolve(v);
      }
      var btns = choices.map(function (c, i) {
        return h('div', { class: 'predict__choice' }, [
          h('button', { class: 'btn btn--secondary', type: 'button', onclick: function () { close(i); } }, [h('span', { class: 'btn__key', text: String(i + 1) }), c]),
          counts[i]
        ]);
      });
      counts.forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); var i = counts.indexOf(inp); if (i + 1 < counts.length) counts[i + 1].focus(); else inp.blur(); }
          if (e.code === 'Escape') { e.preventDefault(); inp.blur(); }
          e.stopPropagation();   // 숫자칸에서 1~9 는 프리셋·선택이 아니라 숫자 입력
        });
      });
      var handBtn = choices.length && o.handCount !== false ? h('button', { class: 'btn btn--sm btn--quiet', type: 'button', title: '선택지마다 손든 학생 수를 적어요 (교사 화면)', 'aria-pressed': 'false' }, '✋ 손들기 수') : null;
      if (handBtn) handBtn.addEventListener('click', function (e) {
        blurOnMouse(e);
        var on = card.classList.toggle('predict--count');
        handBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) counts[0].focus();
      });
      card = h('div', { class: 'predict', role: 'dialog', 'aria-modal': 'true', 'aria-label': '예측' }, [
        h('div', { class: 'predict__top' }, [h('span', { class: 'predict__label', text: '먼저 예측해 보세요' }), o.tag ? h('span', { class: 'chip', 'data-tag': o.tag, text: o.tag }) : null, handBtn]),
        h('p', { class: 'predict__q', text: o.question || '' }),
        o.info ? h('p', { class: 'predict__info', text: o.info }) : null,
        btns.length ? h('div', { class: 'predict__choices' }, btns) : null,
        h('div', { class: 'predict__foot' }, [h('button', { class: 'btn btn--quiet', type: 'button', onclick: function () { close(null); } }, ['건너뛰기', h('span', { class: 'btn__key', text: 'Esc' })])])
      ]);
      layer = h('div', { class: 'predict-layer' }, card);
      SK.el.stage.appendChild(layer);
      modal = {
        type: 'predict', close: close, onKey: function (e) {
          if (e.code === 'Escape') { close(null); return true; }
          var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
          if (m && +m[1] <= choices.length) { close(+m[1] - 1); return true; }
          if (e.code === 'KeyF') return false;
          return true;
        }
      };
    });
  };

  /** 첫 화면 모드 카드 (키 1~n) */
  SK.chooseMode = function (o) {
    var modes = o.modes || [];
    var layer;
    function pick(i) {
      layer.remove(); modal = null;
      if (o.onPick) o.onPick(modes[i].value, i);
      dirty = true;
    }
    var cards = modes.map(function (m, i) {
      return h('button', { class: 'seg__opt', type: 'button', style: 'min-height:calc(220 * var(--u));display:grid;align-content:center;gap:var(--space-2);padding:var(--space-5)', onclick: function () { pick(i); } }, [
        h('span', { class: 'preset__key', style: 'justify-self:center', text: String(i + 1) }),
        h('strong', { style: 'font:var(--font-weight-bold) var(--fs-h3)/1.25 var(--font-serif)', text: m.label }),
        m.desc ? h('span', { class: 'btn__sub', style: 'font-size:var(--fs-meta)', text: m.desc }) : null
      ]);
    });
    var card = h('div', { class: 'predict', role: 'dialog', 'aria-modal': 'true', style: 'width:min(calc(1150 * var(--u)),94%)' }, [
      h('p', { class: 'predict__q', text: o.title || '무엇을 알아볼까요?' }),
      h('div', { class: 'seg seg--cards', style: 'grid-template-columns:repeat(' + Math.min(modes.length, 3) + ',1fr)' }, cards)
    ]);
    layer = h('div', { class: 'predict-layer' }, card);
    SK.el.stage.appendChild(layer);
    SK.pause();
    modal = {
      type: 'mode', onKey: function (e) {
        var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
        if (m && +m[1] <= modes.length) { pick(+m[1] - 1); return true; }
        if (e.code === 'KeyF') return false;
        if (e.code === 'Escape' && o.cancelable) { layer.remove(); modal = null; return true; }
        return e.code !== 'Tab';
      }
    };
  };

  /** '수업 안내' 서랍 (교사용 대응표·발문) */
  var drawerEl = null;
  SK.guide = function (o) {
    o = o || {};
    var body = h('div', { class: 'drawer__body' });
    if (o.rows && o.rows.length) {
      body.appendChild(h('h3', { text: '변수·상황 대응표 (요구 D)' }));
      body.appendChild(h('table', { class: 'guide-table' }, [
        h('thead', null, h('tr', null, [h('th', { text: '변수·상황' }), h('th', { text: '성취기준·탐구' }), h('th', { text: '학생이 발견할 것' }), h('th', { text: '깨는 오개념' })])),
        h('tbody', null, o.rows.map(function (r) {
          return h('tr', null, [h('td', { text: r.target || '' }), h('td', { text: r.standard || '' }), h('td', { text: r.discover || '' }), h('td', { text: r.misconception || '' })]);
        }))
      ]));
    }
    (o.sections || []).forEach(function (s) {
      body.appendChild(h('h3', { text: s.title }));
      body.appendChild(h('ul', { style: 'display:grid;gap:var(--space-2);padding-left:var(--space-5);list-style:disc' }, (s.items || []).map(function (t) { return h('li', { text: t }); })));
    });
    var predToggle = h('button', { class: 'check', type: 'button' }, [h('span', { class: 'check__box' }), h('span', { class: 'check__text', text: '프리셋을 누르면 예측 카드부터 띄우기' }), h('span', { class: 'check__state' })]);
    function showPred() { predToggle.setAttribute('aria-pressed', String(!!cfg.predictOnPreset)); predToggle.lastChild.textContent = cfg.predictOnPreset ? '켬' : '끔'; }
    predToggle.addEventListener('click', function (e) { blurOnMouse(e); cfg.predictOnPreset = !cfg.predictOnPreset; showPred(); });
    showPred();
    body.appendChild(h('h3', { text: '교사 설정' }));
    body.appendChild(predToggle);
    body.appendChild(h('h3', { text: '키 조작' }));
    body.appendChild(h('p', { text: 'F 전체 화면 · ←/→ 단계 · Space 실행/멈춤 · 1~5 프리셋 · R 초기화(기록 유지) · S 기록 · C 기록 지우기 · , . 한 프레임 · [ ] 속도 · H 교사용 숨김값 · T 조작판 접기 · Esc 두 번 처음 화면' + (o.keys ? ' · ' + o.keys : '') }));
    var closeBtn = h('button', { class: 'btn', type: 'button', onclick: function () { SK.toggleGuide(false); } }, ['닫기', h('span', { class: 'btn__key', text: 'Esc' })]);
    drawerEl = h('aside', { class: 'drawer', hidden: true, 'aria-label': '수업 안내' }, [
      h('div', { class: 'drawer__head' }, [h('h2', { text: '수업 안내 (교사용)' }), closeBtn]), body
    ]);
    SK.el.slide.appendChild(drawerEl);
    var openBtn = h('button', { class: 'btn btn--quiet', type: 'button', onclick: function (e) { blurOnMouse(e); SK.toggleGuide(true); } }, '수업 안내 (교사용) ▸');
    SK.el.panelFoot.appendChild(openBtn);
  };
  SK.toggleGuide = function (on) {
    if (!drawerEl) return;
    drawerEl.hidden = on === undefined ? !drawerEl.hidden : !on;
  };

  /* ------------------------------------------------------------------
     12. 그리기: HiDPI 캔버스 · 화살표 · 계기판 · 그래프
     ------------------------------------------------------------------ */
  /**
   * container 를 꽉 채우는 HiDPI 캔버스.
   *  fit:true  → 논리 좌표 w×h 고정, 칸 비율이 달라도 가운데 맞춤(레터박스)
   *  fit:false → 논리 좌표 = 칸 크기(u 단위). view.w / view.h 가 칸 크기를 따라 바뀜
   */
  SK.canvas = function (container, o) {
    o = o || {};
    var cv = h('canvas', { class: o.className || null });
    if (!o.className) cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.insertBefore(cv, container.firstChild);
    var ctx = cv.getContext('2d');
    var view = {
      canvas: cv, ctx: ctx, w: o.w || 1250, h: o.h || 700, fit: o.fit !== false,
      scale: 1, ox: 0, oy: 0, dpr: 1, onResize: null,
      bg: o.bg === undefined ? '--color-paper-raised' : o.bg
    };
    function resize() {
      var r = container.getBoundingClientRect();
      var cw = Math.max(1, r.width), ch = Math.max(1, r.height);
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      view.dpr = dpr;
      if (view.fit) {
        var s = Math.min(cw / view.w, ch / view.h);
        view.scale = s; view.ox = (cw - view.w * s) / 2; view.oy = (ch - view.h * s) / 2;
      } else {
        var u = SK.px(1) || 1;
        view.scale = u; view.ox = 0; view.oy = 0; view.w = cw / u; view.h = ch / u;
      }
      ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
      dirty = true;
      if (view.onResize) view.onResize(view);
    }
    view.resize = resize;
    /** 전체 지우기(바탕색) 후 논리 좌표 변환 복구 */
    view.clear = function () {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (view.bg) { ctx.fillStyle = SK.color(view.bg); ctx.fillRect(0, 0, cv.width, cv.height); }
      else ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.restore();
      ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * view.oy);
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    /** 포인터 이벤트 → 논리 좌표 {x, y} */
    view.toLogical = function (e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
    };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);
    resize();
    return view;
  };

  /** 화살표 (논리 좌표). o: {color, width, head, dash, label, labelColor} */
  SK.arrow = function (ctx, x1, y1, x2, y2, o) {
    o = o || {};
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;
    var w = o.width || 5, head = Math.min(o.head || w * 3.6, len * 0.6);
    var ux = dx / len, uy = dy / len;
    var col = SK.color(o.color || '--color-q-velocity');
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.setLineDash(o.dash || []);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - ux * head * 0.8, y2 - uy * head * 0.8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * head - uy * head * 0.55, y2 - uy * head + ux * head * 0.55);
    ctx.lineTo(x2 - ux * head + uy * head * 0.55, y2 - uy * head - ux * head * 0.55);
    ctx.closePath(); ctx.fill();
    if (o.label) {
      ctx.font = '700 ' + (o.fontSize || 24) + 'px ' + (cssVar('--font-sans') || 'sans-serif');
      ctx.fillStyle = SK.color(o.labelColor || o.color || '--color-ink');
      ctx.textBaseline = 'middle';
      ctx.fillText(o.label, x2 + ux * 10 + 6, y2 + uy * 10);
    }
    ctx.restore();
  };

  /** 계기판 (큰 숫자). items: [{key,label,symbol,unit,decimals,q,hidden}] */
  SK.meters = function (where, items) {
    var host = resolveWhere(where || SK.el.meters);
    var wrap = h('div', { class: 'meters' });
    var cells = {};
    items.forEach(function (it) {
      var val = h('span', { class: 'num', text: '–' });
      var lab = [it.label || ''];
      if (it.symbol) lab.push(' ', h('i', { text: it.symbol }));
      var card = h('div', { class: 'meter' + (it.hidden ? ' is-hidden-value' : ''), 'data-q': it.q || null, 'data-key': it.key }, [
        h('span', { class: 'meter__label' }, lab),
        h('span', { class: 'meter__value' + (it.size === 'md' ? ' meter__value--md' : '') }, [val, h('span', { class: 'meter__unit', text: it.unit || '' })])
      ]);
      wrap.appendChild(card);
      cells[it.key] = { el: val, dec: it.decimals !== undefined ? it.decimals : 1, last: null };
    });
    host.appendChild(wrap);
    var api = {
      el: wrap,
      set: function (key, v) {
        var c = cells[key]; if (!c) return;
        var t = typeof v === 'number' ? fmt(v, c.dec) : (v === null || v === undefined ? '–' : String(v));
        if (t !== c.last) { c.el.textContent = t; c.last = t; }
      },
      update: function (obj) { for (var k in obj) api.set(k, obj[k]); }
    };
    return api;
  };

  function niceStep(span, n) {
    var raw = span / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  /**
   * 실시간 선 그래프. 지금 실행 + 직전 실행(흐림) + 기록(색+선 모양)을 함께 그린다.
   * o = {title, x:{label,unit,min,max}, y:{label,unit,min,max}, series:[{key,label,color}], ghost:true, records:true}
   *   min/max 에 'auto' 를 주면 보이는 모든 선을 담도록 맞춘다(눈금은 1·2·5 단위).
   * g.draw(current)  current = {key:[[x,y],...]} (series 가 하나면 배열만 줘도 됨)
   */
  SK.graph = function (where, o) {
    o = o || {};
    var host = resolveWhere(where || SK.el.graph);
    var series = o.series || [{ key: 'y', label: o.y && o.y.label, color: '--color-primary' }];
    var legend = h('span', { class: 'graph-box__legend' });
    if (series.length > 1) series.forEach(function (s) {
      legend.appendChild(h('span', null, [swatchSVG({ color: SK.color(s.color || '--color-primary'), dash: s.dash || [], width: 4 }), s.label || s.key]));
    });
    var area = h('div', { class: 'graph-box__canvas' });
    var box = h('div', { class: 'graph-box' }, [h('div', { class: 'graph-box__title' }, [o.title || '', legend]), area]);
    host.appendChild(box);
    var view = SK.canvas(area, { fit: false, bg: '--color-paper-raised' });
    var current = {};
    var X = o.x || {}, Y = o.y || {};

    function eachLine(fn) {
      if (o.records !== false) SK.records.forEach(function (r) {
        series.forEach(function (s) { if (r.series[s.key]) fn(r.series[s.key], SK.recStyle(r.slot), s); });
      });
      if (o.ghost !== false && SK.ghost) series.forEach(function (s) { if (SK.ghost.series[s.key]) fn(SK.ghost.series[s.key], SK.ghostStyle(), s); });
      series.forEach(function (s) {
        if (current[s.key]) fn(current[s.key], { color: SK.color(s.color || '--color-primary'), dash: s.dash || [], width: 4 }, s);
      });
    }
    function range(axis, idx) {
      var lo = axis.min, hi = axis.max;
      if (lo === undefined || lo === 'auto' || hi === undefined || hi === 'auto') {
        var a = Infinity, b = -Infinity;
        eachLine(function (pts) { for (var i = 0; i < pts.length; i++) { var v = pts[i][idx]; if (v < a) a = v; if (v > b) b = v; } });
        if (!isFinite(a)) { a = 0; b = 1; }
        if (lo === undefined || lo === 'auto') lo = Math.min(a, 0);
        if (hi === undefined || hi === 'auto') hi = b;
        if (hi - lo < 1e-9) hi = lo + 1;
        var st = niceStep(hi - lo, 4);
        if (axis.min === undefined || axis.min === 'auto') lo = Math.floor(lo / st) * st;
        if (axis.max === undefined || axis.max === 'auto') hi = Math.ceil(hi / st) * st;
      }
      return [lo, hi];
    }
    function draw(cur) {
      if (cur !== undefined) current = Array.isArray(cur) ? (function () { var m = {}; m[series[0].key] = cur; return m; })() : (cur || {});
      var ctx = view.ctx, W = view.w, H = view.h;
      view.clear();
      var fs = 16, padL = 64, padB = 30, padT = 8, padR = 12;
      var xr = range(X, 0), yr = range(Y, 1);
      var pw = W - padL - padR, ph = H - padT - padB;
      if (pw < 10 || ph < 10) return;
      function mx(x) { return padL + (x - xr[0]) / (xr[1] - xr[0]) * pw; }
      function my(y) { return padT + ph - (y - yr[0]) / (yr[1] - yr[0]) * ph; }
      ctx.font = '500 ' + fs + 'px ' + (cssVar('--font-num') || 'sans-serif');
      ctx.lineWidth = 1; ctx.setLineDash([]);
      // 모눈·눈금
      var xs = niceStep(xr[1] - xr[0], Math.max(2, Math.floor(pw / 90)));
      var ys = niceStep(yr[1] - yr[0], Math.max(2, Math.floor(ph / 34)));
      ctx.strokeStyle = SK.color('--color-grid'); ctx.fillStyle = SK.color('--color-ink-muted');
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var dx = Math.max(0, -Math.floor(Math.log(xs) / Math.LN10)), dy = Math.max(0, -Math.floor(Math.log(ys) / Math.LN10));
      for (var x = Math.ceil(xr[0] / xs) * xs; x <= xr[1] + xs * 1e-6; x += xs) {
        ctx.beginPath(); ctx.moveTo(mx(x), padT); ctx.lineTo(mx(x), padT + ph); ctx.stroke();
        ctx.fillText(fmt(x, dx), mx(x), padT + ph + 4);
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (var y = Math.ceil(yr[0] / ys) * ys; y <= yr[1] + ys * 1e-6; y += ys) {
        ctx.beginPath(); ctx.moveTo(padL, my(y)); ctx.lineTo(padL + pw, my(y)); ctx.stroke();
        ctx.fillText(fmt(y, dy), padL - 6, my(y));
      }
      // 축
      ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 2;
      var y0 = (yr[0] <= 0 && yr[1] >= 0) ? my(0) : padT + ph;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph); ctx.moveTo(padL, y0); ctx.lineTo(padL + pw, y0); ctx.stroke();
      // 축 이름
      ctx.fillStyle = SK.color('--color-ink');
      ctx.font = '700 ' + fs + 'px ' + (cssVar('--font-sans') || 'sans-serif');
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      if (X.label) ctx.fillText(X.label + (X.unit ? ' (' + X.unit + ')' : ''), padL + pw, padT + ph - 4);
      ctx.save(); ctx.translate(14, padT + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (Y.label) ctx.fillText(Y.label + (Y.unit ? ' (' + Y.unit + ')' : ''), 0, 0);
      ctx.restore();
      // 선
      ctx.save(); ctx.beginPath(); ctx.rect(padL, padT - 2, pw + 2, ph + 4); ctx.clip();
      eachLine(function (pts, st) { SK.drawPath(ctx, pts, { color: st.color, dash: st.dash, width: Math.max(2, st.width * 0.7) }, function (a, b) { return [mx(a), my(b)]; }); });
      ctx.restore();
    }
    view.onResize = function () { draw(); };
    SK.onRecords(function () { draw(); });
    draw({});
    return { el: box, view: view, draw: draw, setAxis: function (ax, v) { if (ax === 'x') X = v; else Y = v; draw(); } };
  };

  /* ------------------------------------------------------------------
     13. 키 · 커서 · 확대 금지 · 전체 화면
     ------------------------------------------------------------------ */
  SK.onKey = function (fn) { keyHandlers.push(fn); };

  function isTyping(t) {
    if (!t || !t.tagName) return false;
    if (t.isContentEditable) return true;
    var tag = t.tagName;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag === 'INPUT') {
      var ty = (t.type || 'text').toLowerCase();
      return ['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color'].indexOf(ty) < 0;
    }
    return false;
  }
  SK.toggleFullscreen = function () {
    var d = document, el = d.documentElement;
    var fs = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (!fs) { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); }
      else { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    } catch (e) { SK.notice('이 브라우저는 전체 화면을 지원하지 않아요', 'info'); }
  };
  SK.toggleTeacher = function () {
    var on = document.documentElement.classList.toggle('teacher');
    SK.notice(on ? '교사용 숨김값 보이기 (H)' : '교사용 숨김값 숨기기 (H)', 'info');
    dirty = true;
    if (cfg.onTeacher) cfg.onTeacher(on);
  };
  SK.isTeacher = function () { return document.documentElement.classList.contains('teacher'); };
  SK.toggleCollapse = function () {
    var on = SK.el.slide.classList.toggle('is-collapsed');
    SK.notice(on ? '조작판 접음 — T 로 다시 펴기' : '조작판 폄', 'info');
    dirty = true;
  };

  function installKeys() {
    document.addEventListener('keydown', function (e) {
      var code = e.code;
      if (modal) {
        if (modal.onKey(e)) { e.preventDefault(); return; }
        if (code === 'KeyF' && !isTyping(e.target)) { e.preventDefault(); SK.toggleFullscreen(); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (isTyping(t)) return;                                   // 숫자칸 포커스 중: 공통 키 끔
      for (var i = 0; i < keyHandlers.length; i++) { if (keyHandlers[i](e) === true) { e.preventDefault(); return; } }
      var isRange = t && t.tagName === 'INPUT' && t.type === 'range';
      if (isRange && /^(Arrow|Page|Home|End)/.test(code)) return;  // 슬라이더 조절
      var isBtn = t && (t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || t.tagName === 'A');
      if (isBtn && (code === 'Space' || code === 'Enter' || code === 'NumpadEnter')) return; // 키보드로 버튼 누르기

      var m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
      if (m) {
        var n = +m[1];
        if (n <= 5 && !e.repeat) { e.preventDefault(); if (presets[n - 1]) SK.applyPreset(n - 1); else SK.notice(n + '번 프리셋이 없어요', 'info'); }
        return;
      }
      var handled = true;
      switch (code) {
        case 'KeyF': if (!e.repeat) SK.toggleFullscreen(); break;
        case 'ArrowRight': case 'PageDown': SK.nextStep(); break;
        case 'ArrowLeft': case 'PageUp': SK.prevStep(); break;
        case 'Space': if (!e.repeat) SK.toggle(); break;
        case 'KeyR': if (!e.repeat) SK.reset(); break;
        case 'KeyS': if (!e.repeat) SK.record(); break;
        case 'KeyC': if (!e.repeat) SK.clearRecords(); break;
        case 'Comma': SK.stepFrame(-1); break;
        case 'Period': SK.stepFrame(1); break;
        case 'BracketLeft': cycleSpeed(-1); break;
        case 'BracketRight': cycleSpeed(1); break;
        case 'KeyH': if (!e.repeat) SK.toggleTeacher(); break;
        case 'KeyT': if (!e.repeat) SK.toggleCollapse(); break;
        case 'Escape': handleEsc(); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });
  }
  function handleEsc() {
    if (drawerEl && !drawerEl.hidden) { SK.toggleGuide(false); return; }
    var openDeep = SK.el.panel && SK.el.panel.querySelector('details[open]');
    if (openDeep) { openDeep.open = false; return; }
    if (document.activeElement && document.activeElement !== document.body) { document.activeElement.blur(); }
    var now = Date.now();
    if (now - lastEsc < 1500) { location.href = cfg.hubHref; return; }
    lastEsc = now;
    SK.notice('한 번 더 Esc 를 누르면 처음 화면(허브)으로 가요', 'info', 1500);
  }

  function installCursorHide() {
    var html = document.documentElement, timer = 0;
    var wait = msVar('--dur-cursor-hide', 3000);
    function show() {
      html.classList.remove('cursor-hidden');
      clearTimeout(timer);
      timer = setTimeout(function () { html.classList.add('cursor-hidden'); }, wait);
    }
    document.addEventListener('mousemove', show, { passive: true });
    document.addEventListener('pointerdown', show, { passive: true });
    document.addEventListener('keydown', function (e) { if (!isTyping(e.target)) html.classList.add('cursor-hidden'); });
    show();
  }
  function installNoZoom() {
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    // 두 번 탭 확대는 CSS touch-action: manipulation 이 막는다(탭 클릭은 살려 둠)
  }

  global.SimKit = SK;
})(window);
