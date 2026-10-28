/* =====================================================================
   물리 시뮬레이터 실험실 — SimKit (공통 틀 스크립트, R2 2026-10-28)
   일반 <script> 로 불러온다(ES module·fetch·CDN 금지, file:// 동작). 전역: window.SimKit
   설명서: docs/SIMKIT.md (R2 바뀐 점 §0)   ·   최소 예제: shared/TEMPLATE.html
   근거: docs/개선/R2_계획.md §2·§3 (A~G) · 이전 R1_계획.md
   R2 새 API: josa(w,'으로/로') · withJosa · say(text) · predicting() · onPredict(fn) · cfg.autoPredict/onPredictOpen/onPredictClose
             resetDefaults() · deleteRecord(i) · recordTable({extra}) · recordExtra(el) · recLabel/recMark/recTag · stageInset()
             think({id, when, hintFold}) · think.remove(id) · refreshThinks() · help({inlineTerms, concepts:[{summary, plain, figure,
             formula, symbols, example, why, live}], terms:{용어:{def, short, alias}}}) · takeaway → {line, more} · preset.changes · preset.mode
             predict({figure, afterHint, numeric:{max: 함수, example, overText}})

   ── 불러오기 (sims/<slug>/index.html) ─────────────────────────────────
     <link rel="stylesheet" href="../../shared/fonts.css">   tokens.css · base.css · shell.css
     <div id="sim-root"></div>
     <script src="../../shared/sim.js"></script>
     <script src="sim.js"></script>

   ── 1. 시작: SimKit.init(cfg) ───────────────────────────────────────
     cfg = {
       slug, title, subject, unit, standards:['12역학01-02'], today:'오늘 알아볼 것 문장',
       stepTasks: [{text, action:{label, onClick}} ×4],   // 단계별 '지금 할 일' (없으면 공통 문장)
       onStep(i, name),                 // 단계 이름은 '예측·실행·비교·정리' 고정 (steps 옵션은 R1 에서 없앰)
       hubHref, dt, stageFit, reset(p), step(dt,p), render(view,p), capture(p), save(), load(s),
       status(p) -> ['지구','공기 저항 없음','g 9.8'] (배열 권장, 문자열이면 ' · ' 로 나눔)
       predictOnPreset: true, confirmPresetWithRecords: true, onTeacher(on)
     }
     만들어지는 칸: SimKit.el.{root, slide, top, task, note, stage, panel(=패널 스크롤 칸), panelBox, recBig,
                    thinkBoard, band, meters, graph, records(=기록 칩), bar, presets, cornerTL/TR/BL/BR, status}

   ── 2. 값 두 벌: SimKit.ui(패널) / SimKit.params(지금 실행) ─────────────
     apply:'live' ⚡ 바로 반영   ·   apply:'restart' ↻ 바꾸면 처음부터 다시(실행 중이면 다음 실행부터)

   ── 3~4. 수치·상황 ──────────────────────────────────────────────────
     addVar(where, {key,label:'질량 {{질량}}',symbol,unit,min,max,step,value,decimals,precision,apply,ticks,record,teacher,hint,onChange})
     addChoice / addToggle / setPresets([{name(12자 이내), tag, change, fixed, values, predict:{question,choices,answer,why,numeric,judge}, onApply}])
     chooseMode({title, modes:[{value,label,desc}], default, urlKey:'mode', key, onPick})

   ── 5. 비교 ─────────────────────────────────────────────────────────
     record() · clearRecords() · recordTable(where, {columns:[{key,label,unit,decimals,from,priority:1|2,text,changed}]})
     graph(where, {..., empty:'높이 그래프'}) · onRecords(fn) · recStyle(i) · ghostStyle() · drawPath(...)

   ── 6. 설명 도우미 (R1 신규) ─────────────────────────────────────────
     help({how:[], concepts:[{title,formula,plain,live(p)}], terms:{용어:풀이}, keys:[['V','화살표 켜고 끄기']]})
     term('초점거리') → <abbr class="term">  · 라벨 안 {{초점거리}}
     takeaway(text|fn(p)) · reveal(el, answerHtml) · think({q, hint, choices, answer, why, reveal}) · empty(el, text)
     flash(key) / isFlashing(key) · placeLabel(ctx, [{x,y,text,anchor}])

   ── 7. 흐름 ─────────────────────────────────────────────────────────
     play/pause/toggle/reset/finish(msg)/stepFrame(±1)/setSpeed(x) · goStep(i)/nextStep/prevStep
     predict(o) → Promise<{choice(1~), index(0~), number}|null> · notice(text, type, ms, {label,onClick})
     confirm/dialog · guide(o)(교사 모드 전용 서랍) · setStatus · update · requestRender · onKey · isTeacher

   ── 공통 키 (e.code) — 화면에는 숨기고 ? 도움말 '단축키' 탭에만 적는다 ──────
     Space 실행/멈춤 · ←/→ 단계 · 1~5 실험 카드 · S 기록하기 · R 기본값으로 되돌리기 · C 기록 모두 지우기
     , . 한 장면 뒤로/앞으로 · [ ] 속도 · F 전체 화면 · T 조작판 접기 · ? 도움말 · H 3초 길게 = 교사 모드 · Esc 닫기(두 번 = 허브)
   ===================================================================== */
(function (global) {
  'use strict';

  var SK = {};
  var SPEEDS = [0.1, 0.25, 0.5, 1, 2];
  var SPEED_WORDS = { 0.1: '아주 느리게', 0.25: '느리게', 0.5: '조금 느리게', 1: '보통', 2: '빠르게' };
  var MAX_RECORDS = 5;
  var STEPS = ['예측', '실행', '비교', '정리'];
  var CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
  var SECTION_TITLES = { values: '수치 바꾸기', situation: '상황 바꾸기', tools: '화면에 표시하기', deep: '더 많은 설정' };
  var SECTION_ORDER = ['values', 'situation', 'tools'];
  // 프리셋 꼬리표 → 학생에게 보이는 말 (키는 시뮬레이터가 쓰던 것 그대로)
  var TAG_WORDS = {
    '탐구 재현': '교과서 탐구', '대표 문항': '교과서 문제', '오개념': '흔한 오해 확인',
    '과학사': '과학사', '생활 속': '생활 속', '교통안전': '교통안전',
    '작용·반작용': '작용·반작용', '발사체': '발사체', '기묘함': '기묘함'
  };

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
  /**
   * R2(B4): 조사 고르기. 두 가지로 부른다.
   *   josa('그래프', '이', '가') → '가'          (예전 방식: 받침 있으면 a, 없으면 b)
   *   josa('달', '으로/로') → '로'  josa('렌즈', '을/를') → '를'  josa('7.9 km/s', '으로/로') → '로'
   * 숫자·영문 끝 글자는 읽는 소리로 판단(1 일·3 삼·m 엠·l 엘 …). '으로/로' 는 ㄹ 받침이면 '로'.
   */
  var DIGIT_JONG = { '0': 21, '1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0 };
  var LATIN_JONG = { l: 8, m: 16, n: 4, r: 8 };
  function jongOf(word) {
    var s = String(word === undefined || word === null ? '' : word).replace(/[\s)\]}'"’”»>.,·]+$/, '');
    var ch = s.charAt(s.length - 1), c = s.charCodeAt(s.length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28;
    if (DIGIT_JONG[ch] !== undefined) return DIGIT_JONG[ch];
    var low = ch.toLowerCase();
    if (LATIN_JONG[low] !== undefined) return LATIN_JONG[low];
    return 0;
  }
  function josa(word, a, b) {
    if (b === undefined && typeof a === 'string' && a.indexOf('/') > 0) { var ab = a.split('/'); a = ab[0]; b = ab[1]; }
    var j = jongOf(word);
    if (a === '으로' && j === 8) return b;
    return j ? a : b;
  }
  /** 낱말 + 조사: withJosa('달', '으로/로') → '달로' */
  function withJosa(word, pair) { return String(word) + josa(word, pair); }
  /** '질량 {{질량}}' 처럼 {{용어}} 를 용어 말풍선으로 바꾼 노드 배열 */
  function rich(text) {
    if (text === null || text === undefined) return [];
    if (typeof text !== 'string') return [text];
    var out = [], re = /\{\{(.+?)\}\}/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      termNodes(m[1]).forEach(function (n) { out.push(n); });
      last = re.lastIndex;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function plain(text) { return typeof text === 'string' ? text.replace(/\{\{(.+?)\}\}/g, '$1') : ''; }
  function stripNo(label) { return String(label || '').replace(/^\s*(?:[①-⑨]|\d+[.)]?)\s*/, ''); }

  SK.h = h; SK.fmt = fmt; SK.clamp = clamp; SK.parseNum = parseNum; SK.josa = josa; SK.withJosa = withJosa;
  SK.fmtFlex = fmtFlex;
  /** R2(C1): 기록 이름 = 모양 기호 + 이름 ('● 기록 1', '▲ 기록 2') — 표·그래프 범례·나란히 보기 공통 */
  var MARKS = ['●', '▲', '■', '◆', '★'];
  SK.recMark = function (slot) { return MARKS[(slot || 0) % MARKS.length]; };
  SK.recLabel = function (rec) { var s = typeof rec === 'number' ? rec : rec.slot; var n = typeof rec === 'number' ? rec + 1 : rec.n; return MARKS[s % MARKS.length] + ' 기록 ' + n; };

  var colorCache = {};
  SK.color = function (name) {
    if (name.slice(0, 2) !== '--') return name;
    if (!colorCache[name]) colorCache[name] = cssVar(name, document.body || document.documentElement) || '#000';
    return colorCache[name];
  };
  /** n u → CSS px (지금 창 크기 기준, 설계 1920×1080) */
  SK.px = function (n) { return n * Math.min(window.innerWidth / 1920, window.innerHeight / 1080); };

  /* ------------------------------------------------------------------
     1. 상태
     ------------------------------------------------------------------ */
  SK.ui = {}; SK.params = {}; SK.defs = {}; SK.controls = {};
  SK.records = []; SK.ghost = null; SK.prediction = null;
  SK.time = 0; SK.running = false; SK.started = false; SK.finished = false; SK.speed = 1;
  SK.stepIndex = 0; SK.stepName = ''; SK.el = {}; SK.view = null;
  SK.STEPS = STEPS.slice();

  var cfg = {};
  var legacySteps = null;     // 예전 cfg.steps (이름 별칭으로만 사용)
  var stepTasks = [];
  var pending = {};
  var presets = [];
  var activePreset = -1;
  var statusOverride = null;
  var dirty = true;
  var runId = 0, recordedRunId = -1;
  var history = [];
  var keyHandlers = [];
  var recordListeners = [];
  var modal = null;           // {type:'dialog'|'predict'|'mode', onKey(e), shake?}
  var lastEsc = 0;
  var noticeLast = {};
  var initialized = false;
  var sideMode = 'panel', sideUser = null;
  var mainTable = null;       // recordTable(null) 옵션
  var smallTables = [];
  var thinks = [];
  var helpCfg = null, termDict = {};
  var takeawayCfg = null;
  var flashes = {};
  var todaySeen = false;
  var taskAlertUntil = 0;
  var noteState = { verdict: null, takeaway: null };
  var vsSel = [-1, -1];
  var openPop = null;
  var bandMsg = { text: '', until: 0 };   // R2(A1): 28자 넘는 토스트·finish(msg) → 띠 문장으로 잠깐
  var lastPredictOpts = null;             // R2(A4): 띠 [예측하기] 로 다시 열 예측
  var noteCollapsed = false;
  var showAllCols = false;                // R2(C1): 기록 표 '열 더 보기'
  var termSeen = {};                      // R2(D2): {{용어}} 첫 등장 괄호 풀이
  var warned = {};
  function warnOnce(key, msg) { if (!warned[key]) { warned[key] = true; console.warn(msg); } }

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
    // R2(A4): 모드·카드가 정해지면 예측 창을 자동으로. 예전 predictOnPreset:false 는 끄기로 읽는다
    if (cfg.autoPredict === undefined) cfg.autoPredict = cfg.predictOnPreset !== false;
    if (cfg.confirmPresetWithRecords === undefined) cfg.confirmPresetWithRecords = true;
    if (cfg.steps) {
      console.warn('SimKit(R1): steps 옵션은 없어졌어요. 단계 이름은 예측·실행·비교·정리로 고정입니다. 예전 이름은 data-step-only·onStep 호환용 별칭으로만 씁니다.');
      legacySteps = cfg.steps.slice(0, 4);
    }
    stepTasks = cfg.stepTasks || [];

    ensureViewport();
    if (cfg.slug) document.body.setAttribute('data-sim', cfg.slug);
    if (cfg.title && !document.title) document.title = cfg.title + ' — 물리 시뮬레이터 실험실';
    buildSkeleton();
    colorCache = {};
    if (/[?&]teacher=1\b/.test(location.search)) setTeacher(true, true);

    SK.view = SK.canvas(SK.el.stage, { w: 1250, h: cfg.stageH || 700, fit: cfg.stageFit !== false, className: 'stage-canvas' });
    installKeys();
    installCursorHide();
    installNoZoom();
    installTermTips();
    installBandShim();
    SK.goStep(0, true);

    setTimeout(function () {
      SK.params = copy(SK.ui);
      doReset(false);
      tidyPanel();
      renderRecords();
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

  function btn(label, cls, onClick, extra) {
    var a = { class: 'btn ' + (cls || ''), type: 'button' };
    if (extra) for (var k in extra) a[k] = extra[k];
    var b = h('button', a, label);
    if (onClick) b.addEventListener('click', function (e) { blurOnMouse(e); onClick(e); });
    return b;
  }
  function keyHint(k) { return h('span', { class: 'btn__key', text: k }); }

  function buildSkeleton() {
    var root = document.getElementById(cfg.rootId || 'sim-root');
    if (!root) { root = h('div', { id: 'sim-root' }); document.body.appendChild(root); }
    root.className = 'app';
    var slide = h('div', { class: 'slide sim' });

    /* ── 제목 줄: [← 허브] 제목 ……… [수업 정보 · 교사용 ▾][? 도움말][⤢ 전체 화면] (G1 같은 윤곽선) ── */
    var infoBtn = btn('수업 정보 · 교사용 ▾', 'btn--outline', function () { toggleInfo(); }, { 'aria-expanded': 'false' });
    var today = h('p', { class: 'sim-today' }, [h('b', { text: '오늘 알아볼 것' }), cfg.today || '']);
    var dl = h('dl');
    function row(t, v) { if (v) { dl.appendChild(h('dt', { text: t })); dl.appendChild(h('dd', { text: v })); } }
    row('과목', cfg.subject); row('단원', cfg.unit);
    row('성취기준', (cfg.standards || []).map(function (s) { return s.charAt(0) === '[' ? s : '[' + s + ']'; }).join(' '));
    var teacherRow = h('div', { class: 'info-pop__teacher' }, [
      btn('교사 모드 켜기 / 끄기', 'btn--outline btn--sm', function () { closePop(); SK.toggleTeacher(); }),
      h('span', { class: 'var__hint', text: '교사 모드: 손들기 수·수업 안내·숨김값이 보여요' })
    ]);
    var infoPop = h('div', { class: 'info-pop', hidden: true, role: 'dialog', 'aria-label': '수업 정보' }, [cfg.today ? today : null, dl, teacherRow]);
    var teacherInfo = h('div', { class: 'sim-top__teacher teacher-only', 'aria-label': '수업 정보(교사 모드)' });
    if (cfg.subject) teacherInfo.appendChild(h('span', { class: 'chip chip--sim', text: cfg.subject }));
    (cfg.standards || []).forEach(function (s) { teacherInfo.appendChild(h('span', { class: 'chip chip--outline num', text: s.charAt(0) === '[' ? s : '[' + s + ']' })); });
    var guideBtn = btn('수업 안내(교사)', 'btn--outline teacher-only', function () { SK.toggleGuide(); });
    guideBtn.hidden = true;
    var helpBtn = btn('? 도움말', 'btn--outline', function () { SK.toggleHelp(); });
    var fsBtn = btn('⤢ 전체 화면', 'btn--outline', function () { SK.toggleFullscreen(); });
    var top = h('header', { class: 'sim-top' }, [
      h('a', { class: 'sim-top__hub', href: cfg.hubHref, title: '처음 화면(실험 고르기)으로' }, '← 허브'),
      h('h1', { class: 'sim-title', text: cfg.title || '제목' }),
      teacherInfo,
      h('span', { class: 'sim-top__spacer' }),
      h('div', { class: 'sim-top__tools' }, [guideBtn, infoBtn, helpBtn, fsBtn, infoPop])
    ]);

    /* ── 지금 할 일 띠: 단계 | 문장 [주 행동(실행 아님)] [○○하러 가기 ▸] ── */
    var stepList = h('ol', { class: 'task-steps', 'aria-label': '수업 단계' });
    STEPS.forEach(function (name, i) {
      var b = h('button', { class: 'task-step', type: 'button', 'data-i': i, title: (i + 1) + '단계 ' + withJosa(name, '으로/로') + ' 가기' }, [
        h('span', { class: 'task-step__num', 'aria-hidden': 'true', text: String(i + 1) }),
        h('span', { class: 'task-step__name', text: name })
      ]);
      b.addEventListener('click', function (e) { blurOnMouse(e); SK.goStep(i); });
      stepList.appendChild(h('li', null, b));
    });
    var taskSub = h('p', { class: 'task-now__sub', hidden: true });
    var taskText = h('p', { class: 'task-now__text', 'aria-live': 'polite' });
    var taskWords = h('div', { class: 'task-now__words' }, [taskSub, taskText]);
    var taskAct = h('button', { class: 'btn btn--primary task-now__act', type: 'button' });
    taskAct.addEventListener('click', function (e) { blurOnMouse(e); if (taskAct._fn) taskAct._fn(); });
    var taskNext = btn('다음 단계 ▸', 'btn--quiet task-now__next', function () { SK.nextStep(); });
    var task = h('section', { class: 'sim-task', 'aria-label': '지금 할 일' }, [stepList, h('div', { class: 'task-now' }, [taskWords, taskAct, taskNext])]);

    /* ── R2(A2): 예전 실험 화면 위 해설(.sim-note)은 없앰. 예전 코드가 SimKit.el.note 를 읽어도
          아무 일이 없도록 늘 숨은 빈 칸을 남긴다(자리 피하기 코드가 0 을 얻음) ── */
    var legacyNote = h('section', { class: 'sim-note-legacy', hidden: true, 'aria-hidden': 'true' });

    /* ── 실험 화면 ── */
    var stage = h('main', { class: 'sim-stage', 'aria-label': '실험 화면' });
    var cTL = h('div', { class: 'stage-corner stage-corner--tl' });
    var cTR = h('div', { class: 'stage-corner stage-corner--tr' });
    var cBL = h('div', { class: 'stage-corner stage-corner--bl' });
    var cBR = h('div', { class: 'stage-corner stage-corner--br' });
    var status = h('div', { class: 'stage-status', 'aria-live': 'polite', 'aria-label': '지금 상태' });
    cTL.appendChild(status);
    stage.appendChild(cTL); stage.appendChild(cTR); stage.appendChild(cBL); stage.appendChild(cBR);
    /* R2(A1): 토스트 자리 = 실험 화면 안 위 가운데 한 줄 */
    var notices = h('div', { class: 'notice-zone', 'aria-live': 'assertive' });
    stage.appendChild(notices);

    /* ── 조절 패널: 해설 카드(실행 뒤) → 수치 → 상황 → 표시 → 더 많은 설정 ── */
    var toRecBtn = btn('기록 표 보기 ▸', 'btn--quiet btn--sm side-switch', function () { setSide(sideMode === 'panel' && SK.stepIndex === 3 && visibleThinks() ? 'think' : 'records', true); });
    toRecBtn.hidden = true;
    var legend = h('div', { class: 'panel-legend' }, [
      h('span', { class: 'panel-legend__words' }, [
        h('span', { class: 'apply-ico apply-ico--live', 'aria-hidden': 'true', text: '⚡' }), ' 값을 바꾸면 바로 반영',
        h('span', { class: 'panel-legend__dot', 'aria-hidden': 'true', text: '·' }),
        h('span', { class: 'apply-ico apply-ico--restart', 'aria-hidden': 'true', text: '↻' }), ' 바꾸면 처음부터 다시 실행'
      ]),
      toRecBtn
    ]);
    var legendTip = h('div', { class: 'legend-tip', hidden: true, role: 'note' }, [
      h('span', { text: '처음이에요? 값 옆 ⚡ 는 바꾸는 즉시 그림이 바뀌고, ↻ 는 ▶ 실행을 다시 눌러야 바뀌어요.' }),
      btn('알겠어요', 'btn--outline btn--sm', function () { legendTip.hidden = true; })
    ]);
    var modeLine = h('div', { class: 'panel-mode', hidden: true });
    var panelHead = h('div', { class: 'panel-head' }, [modeLine, legend, legendTip]);
    var noteEl = buildPanelNote();
    var scroll = h('div', { class: 'sim-panel__scroll' });
    var secs = {};
    SECTION_ORDER.forEach(function (name) {
      var body = h('div', { class: 'panel-sec__body' });
      var rb = btn('기본값으로 ↺', 'btn--quiet btn--sm', function () { resetSection(body); }, { title: '이 묶음의 값을 기본값으로 되돌려요' });
      rb.hidden = true;
      var sec = h('section', { class: 'panel-sec', 'data-sec': name }, [h('h2', { class: 'panel-sec__title' }, [SECTION_TITLES[name], rb]), body]);
      sec._reset = rb;
      scroll.appendChild(sec); secs[name] = body;
    });
    var deepBody = h('div', { class: 'panel-sec__body' });
    var deep = h('details', { class: 'panel-sec panel-deep', 'data-sec': 'deep' }, [
      h('summary', { class: 'panel-sec__title', text: SECTION_TITLES.deep }), deepBody
    ]);
    scroll.appendChild(deep); secs.deep = deepBody;
    var foot = h('div', { class: 'panel-foot' });
    scroll.appendChild(foot);
    /* R2(A5): '아래에 더 있어요 ↓' = 누르면 다음 묶음 머리까지 */
    var more = h('button', { class: 'panel-more', type: 'button', hidden: true }, '아래에 더 있어요 ↓');
    more.addEventListener('click', function (e) { blurOnMouse(e); scrollToNextSection(); });
    scroll.addEventListener('scroll', checkMore, { passive: true });
    var panelBox = h('aside', { class: 'sim-panel', 'aria-label': '조절 패널' }, [panelHead, noteEl.root, scroll, more]);

    /* ── 기록 표 큰 판 · 정리 질문 판 (패널 자리) ── */
    var recNeed = h('div');
    var recTitle = h('span', { text: '표' });
    var recChanged = h('p', { class: 'rec-changed', hidden: true });
    var recMoreCols = btn('열 더 보기 ▾', 'btn--outline btn--sm', function () { showAllCols = !showAllCols; renderRecords(); });
    recMoreCols.hidden = true;
    var recScroll = h('div', { class: 'rec-box__scroll scroll-shadow' });
    var recSlide = h('p', { class: 'rec-slide', hidden: true, text: '← 옆으로 밀어 보기' });
    recScroll.addEventListener('scroll', function () { checkRecScroll(); }, { passive: true });
    var recBox = h('div', { class: 'rec-box' }, [h('div', { class: 'rec-box__head' }, [recTitle, recMoreCols, h('span', { class: 'rec-box__end' })]), recChanged, recScroll, recSlide]);
    var recExtra = h('div', { class: 'rec-extra' });
    var recVs = h('div');
    var recBigBody = h('div', { class: 'side-body' }, [recNeed, recBox, h('p', { class: 'var__hint', text: '굵은 글씨 = 앞 기록과 달라진 값 · 한 번에 한 가지만 바꿔야 무엇 때문인지 알 수 있어요' }), recExtra, recVs]);
    var recCount = h('span', { class: 'chip chip--primary num' });
    var recNoteChip = noteChip();
    var recBig = h('aside', { class: 'rec-big', hidden: true, 'aria-label': '기록 비교' }, [
      h('div', { class: 'side-head' }, [h('h2', { text: '기록 비교' }), recCount, recNoteChip.btn, btn('설정 보기 ▸', 'btn--quiet btn--sm', function () { setSide('panel', true); })]),
      recNoteChip.pop, recBigBody
    ]);
    var thinkList = h('div', { class: 'side-body' });
    var thinkNoteChip = noteChip();
    var thinkBoard = h('aside', { class: 'think-board', hidden: true, 'aria-label': '정리 질문' }, [
      h('div', { class: 'side-head' }, [h('h2', { text: '정리해 봐요' }), thinkNoteChip.btn, btn('설정 보기 ▸', 'btn--quiet btn--sm', function () { setSide('panel', true); })]),
      thinkNoteChip.pop, thinkList
    ]);

    /* ── 하단 띠 + 기록 칩 ('저장한 실험 1/5 (최대 5) · 표 보기') ── */
    var meters = h('div', { class: 'band-cell band-cell--meters' });
    var graph = h('div', { class: 'band-cell band-cell--graph' });
    var band = h('section', { class: 'sim-band', 'aria-label': '측정값·그래프' }, [meters, graph]);
    var chipCount = h('span', { class: 'rec-chip__count' });
    var chipBtn = btn('표 보기', 'btn--outline', function () { setSide(sideMode === 'records' ? 'panel' : 'records', true); });
    var recChip = h('div', { class: 'rec-chip', 'aria-label': '저장한 실험' }, [chipCount, h('div', { class: 'rec-chip__row' }, [h('span', { class: 'rec-chip__max', text: '(최대 5)' }), chipBtn])]);

    /* ── 하단 막대: 실험 카드 | [▶ 실행] [한 장면 뒤로][한 장면 앞으로][속도] [기본값으로 되돌리기][그 밖의 기능 ▾] ── */
    var presetsBox = h('div', { class: 'sim-bar__presets', role: 'group', 'aria-label': '실험 카드' });
    var btnRun = h('button', { class: 'btn btn--primary btn--run', type: 'button' });
    btnRun.addEventListener('click', function (e) { blurOnMouse(e); SK.toggle(); });
    var btnBack = btn(['◀ 한 장면 뒤로', keyHint(',')], '', function () { SK.stepFrame(-1); }, { title: '실행 장면을 되감아 봐요' });
    var btnFwd = btn(['한 장면 앞으로 ▶', keyHint('.')], '', function () { SK.stepFrame(1); }, { title: '실행 장면을 조금씩 넘겨 봐요' });
    var speedMenu = h('div', { class: 'pop-menu', hidden: true, role: 'menu', 'aria-label': '재생 속도' });
    SPEEDS.forEach(function (s) {
      var it = h('button', { type: 'button', role: 'menuitemradio', 'data-s': s }, '×' + s + ' ' + SPEED_WORDS[s]);
      it.addEventListener('click', function () { SK.setSpeed(s); closePop(); });
      speedMenu.appendChild(it);
    });
    var btnSpeed = btn('', 'num', function () { togglePop(speedMenu); }, { 'aria-haspopup': 'menu', title: '재생 속도' });
    // R2(B1): 하단 [기록하기] 는 없앰(기록 = 상단 띠). 예전 코드가 SimKit.el.btnRec 를 만져도 깨지지 않게 숨은 버튼을 남긴다
    var btnRec = btn('기록하기', 'btn--secondary', function () { SK.record(); });
    btnRec.hidden = true;
    var btnReset = btn(['기본값으로 되돌리기', keyHint('R')], 'bar-reset', function () { SK.resetDefaults(); }, { title: '바꾼 값을 기본값으로 되돌리고 실험을 처음 상태로 (기록은 그대로)' });
    var moreMenu = h('div', { class: 'pop-menu', hidden: true, role: 'menu', 'aria-label': '그 밖의 기능' });
    var btnMore = btn('그 밖의 기능 ▾', '', function () { buildMoreMenu(); togglePop(moreMenu); }, { 'aria-haspopup': 'menu' });
    var grid = h('div', { class: 'bar-grid' }, [
      btnBack, btnFwd, h('div', { class: 'pop-wrap' }, [btnSpeed, speedMenu]),
      btnReset, h('div', { class: 'pop-wrap' }, [btnMore, moreMenu])
    ]);
    var bar = h('footer', { class: 'sim-bar', 'aria-label': '실행 조절' }, [presetsBox, h('div', { class: 'sim-bar__ctl' }, [btnRun, grid, btnRec])]);

    [top, task, stage, legacyNote, panelBox, recBig, thinkBoard, band, recChip, bar].forEach(function (n) { slide.appendChild(n); });
    root.innerHTML = '';
    root.appendChild(slide);
    if (!document.querySelector('.narrow-warn')) document.body.appendChild(h('div', { class: 'narrow-warn', role: 'note' }, [
      h('b', { text: '화면이 너무 좁아요' }), h('span', { text: '휴대전화라면 가로로 돌려 보세요. 태블릿이나 PC 에서 가장 잘 보여요.' })
    ]));

    SK.el = {
      root: root, slide: slide, top: top, task: task, note: legacyNote, noteBody: noteEl.body, panelNote: noteEl.root, status: status,
      steps: stepList, taskText: taskText, taskSub: taskSub, taskWords: taskWords, taskAct: taskAct, taskNext: taskNext,
      stage: stage, panel: scroll, panelBox: panelBox, panelHead: panelHead, panelMore: more, modeLine: modeLine, toRecBtn: toRecBtn, legendTip: legendTip,
      sections: secs, panelFoot: foot, recBig: recBig, recBigBody: recBigBody, recCount: recCount,
      recNeed: recNeed, recBox: recBox, recTitle: recTitle, recScroll: recScroll, recVs: recVs, recExtra: recExtra,
      recChanged: recChanged, recMoreCols: recMoreCols, recSlide: recSlide,
      thinkBoard: thinkBoard, thinkList: thinkList, noteChips: [recNoteChip, thinkNoteChip],
      band: band, meters: meters, graph: graph, records: recChip, recChipCount: chipCount, recChipBtn: chipBtn,
      bar: bar, presets: presetsBox, notices: notices,
      cornerTL: cTL, cornerTR: cTR, cornerBL: cBL, cornerBR: cBR,
      btnRun: btnRun, btnBack: btnBack, btnFwd: btnFwd, btnSpeed: btnSpeed, btnRec: btnRec, btnReset: btnReset, btnMore: btnMore,
      speedMenu: speedMenu, moreMenu: moreMenu, infoBtn: infoBtn, infoPop: infoPop, helpBtn: helpBtn, guideBtn: guideBtn
    };
    noteEls = noteEl;
    updateTransport();
    showLegendTipOnce();
  }

  /* R2(A5): 범례 첫 방문 말풍선 — 한 번만 */
  function showLegendTipOnce() {
    var seen = false;
    try { seen = localStorage.getItem('simkit:legend-seen') === '1'; } catch (e) { seen = false; }
    if (seen) return;
    SK.el.legendTip.hidden = false;
    try { localStorage.setItem('simkit:legend-seen', '1'); } catch (e) { /* 저장 안 돼도 됨 */ }
    setTimeout(function () { if (SK.el.legendTip) SK.el.legendTip.hidden = true; }, 9000);
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

  /* 패널 정리: 칸마다 '기본값으로 ↺' 는 값 위젯이 있을 때만 */
  function tidyPanel() {
    var secs = SK.el.panel.querySelectorAll('.panel-sec[data-sec]');
    for (var i = 0; i < secs.length; i++) {
      var s = secs[i];
      if (s._reset) s._reset.hidden = !s.querySelector('[data-key]');
    }
    checkMore();
  }
  function resetSection(body) {
    var els = body.querySelectorAll('[data-key]');
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute('data-key'), c = SK.controls[k];
      if (c && c.def && c.def.initial !== undefined && c.get() !== c.def.initial) c.set(c.def.initial);
    }
    SK.notice('이 묶음을 기본값으로 되돌렸어요', 'info');
  }
  function checkMore() {
    var s = SK.el.panel; if (!s) return;
    var hasMore = s.scrollHeight - s.scrollTop - s.clientHeight > 6;
    if (SK.el.panelMore.hidden === hasMore) SK.el.panelMore.hidden = !hasMore;
    s.classList.toggle('has-more', hasMore);
  }
  /** R2(A5): '아래에 더 있어요 ↓' → 다음 묶음 머리까지 부드럽게 */
  function scrollToNextSection() {
    var s = SK.el.panel, heads = s.querySelectorAll('.panel-sec');
    var cur = s.scrollTop + 8, target = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].offsetParent === null) continue;
      var y = heads[i].offsetTop - s.offsetTop;
      if (y > cur + 4) { target = y; break; }
    }
    if (target === null || target > s.scrollTop + s.clientHeight * 1.2) target = s.scrollTop + s.clientHeight * 0.7;
    s.scrollTo({ top: target, behavior: 'smooth' });
  }

  /**
   * R2(B2): [기본값으로 되돌리기] — 기록되는 값(수치·상황)을 처음 값으로, 실험을 처음 상태로.
   * 기록·모드 선택·화면 표시 도구는 그대로. 실행만 처음으로 돌리려면 SimKit.reset() (예전과 같음).
   */
  SK.resetDefaults = function (quiet) {
    if (modal) { if (modal.shake) modal.shake(); return; }
    doReset(true);
    var changed = 0;
    for (var k in SK.controls) {
      var c = SK.controls[k], d = c.def;
      if (!d || !d.record || d.initial === undefined) continue;
      if (modeApi && modeApi.key === k) continue;
      if (c.get() !== d.initial) { c.set(d.initial, { source: 'reset' }); changed++; }
    }
    markPreset(-1);
    doReset(false);
    if (!quiet) SK.notice(changed ? '기본값으로 되돌렸어요' : '이미 기본값이에요', 'info');
  };

  /* 띠 칸 호환: 예전 3칸(계기판|그래프|기록) 지정은 앞 2칸만 쓴다 */
  function splitTracks(s) {
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ' ' && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function installBandShim() {
    if (typeof MutationObserver === 'undefined') return;
    var band = SK.el.band, busy = false;
    function fix() {
      if (busy) return;
      var t = band.style.gridTemplateColumns; if (!t) return;
      var tr = splitTracks(t.trim());
      if (tr.length >= 3) { busy = true; band.style.gridTemplateColumns = tr.slice(0, 2).join(' '); busy = false; }
    }
    new MutationObserver(fix).observe(band, { attributes: true, attributeFilter: ['style'] });
  }

  /* ------------------------------------------------------------------
     3. 단계 · 지금 할 일 · 오른쪽 칸
     ------------------------------------------------------------------ */
  function stepAliases(i) { var a = [STEPS[i]]; if (legacySteps && legacySteps[i] && legacySteps[i] !== STEPS[i]) a.push(legacySteps[i]); return a; }
  /** A1: data-step-only 값 해석 — 전체 일치 → '|' ',' 나눔 → 공백 나눔(예전 "비교 정리") */
  function stepOnlyMatch(attr, i) {
    var names = stepAliases(i), a = String(attr || '').trim();
    if (names.indexOf(a) >= 0) return true;
    var parts = /[|,]/.test(a) ? a.split(/\s*[|,]\s*/) : a.split(/\s+/);
    for (var k = 0; k < parts.length; k++) if (names.indexOf(parts[k]) >= 0) return true;
    return false;
  }
  SK.goStep = function (i, silent) {
    if (i < 0 || i >= STEPS.length) return;
    if (SK.stepIndex === 0 && i !== 0 && !silent) todaySeen = true;
    // R2(A2): 비교·정리에서 예측·실행으로 돌아오면 이전 실행의 해설은 지운다(다시 실행 전까지 빈 상태)
    if (SK.stepIndex >= 2 && i <= 1) hideNote(true);
    if (i !== SK.stepIndex) bandMsg = { text: '', until: 0 };
    SK.stepIndex = i; SK.stepName = STEPS[i];
    var items = SK.el.steps.querySelectorAll('.task-step');
    for (var k = 0; k < items.length; k++) {
      var it = items[k], num = it.querySelector('.task-step__num');
      if (k === i) it.setAttribute('aria-current', 'step'); else it.removeAttribute('aria-current');
      it.classList.toggle('is-done', k < i);
      num.textContent = k < i ? '✓' : String(k + 1);
      it.title = k < i ? STEPS[k] + ' — 완료' : (k + 1) + '단계 ' + withJosa(STEPS[k], '으로/로') + ' 가기';
    }
    refreshThinks();
    document.documentElement.setAttribute('data-step', STEPS[i]);
    var only = document.querySelectorAll('[data-step-only]');
    for (var j = 0; j < only.length; j++) only[j].hidden = !stepOnlyMatch(only[j].getAttribute('data-step-only'), i);
    sideUser = null;
    setSide(autoSide(), false);
    updateTask();
    if (!silent && cfg.onStep) cfg.onStep(i, legacySteps && legacySteps[i] ? legacySteps[i] : STEPS[i], STEPS[i]);
    dirty = true;
  };
  SK.nextStep = function () { if (SK.stepIndex < STEPS.length - 1) SK.goStep(SK.stepIndex + 1); };
  SK.prevStep = function () { if (SK.stepIndex > 0) SK.goStep(SK.stepIndex - 1); };

  function autoSide() {
    if (SK.stepIndex === 2 && cfg.capture && !SK.el.records.hidden) return 'records';
    if (SK.stepIndex === 3 && visibleThinks()) return 'think';
    return 'panel';
  }
  function setSide(mode, byUser) {
    if (byUser) sideUser = mode;
    refreshThinks();
    sideMode = mode;
    SK.el.panelBox.hidden = mode !== 'panel';
    SK.el.recBig.hidden = mode !== 'records';
    SK.el.thinkBoard.hidden = mode !== 'think';
    SK.el.recChipBtn.textContent = mode === 'records' ? '표 닫기' : '표 보기';
    var tb = SK.el.toRecBtn;
    if (SK.stepIndex === 3 && visibleThinks()) { tb.hidden = false; tb.textContent = '정리 질문 보기 ▸'; }
    else if (SK.stepIndex === 2 && cfg.capture) { tb.hidden = false; tb.textContent = '기록 표 보기 ▸'; }
    else tb.hidden = true;
    if (mode === 'records') renderRecords();
    if (mode === 'panel') setTimeout(checkMore, 0);
  }
  SK.showSide = function (mode) { setSide(mode || 'panel', true); };

  /* R2(B1): 띠 문장 기본값 (25자 안팎). 실행이 다음 행동이면 띠 버튼은 숨기고 '아래 ▶ 실행을 눌러요' */
  var DEFAULT_TASK_TEXT = [
    '실험 카드를 고르고 결과를 먼저 예측해요',
    '아래 ▶ 실행을 눌러요',
    '값 하나만 바꿔 실행하고 기록끼리 비교해요',
    '오른쪽 질문으로 오늘 실험을 정리해요'
  ];
  function firstPredictPreset() {
    if (activePreset >= 0 && presets[activePreset] && presets[activePreset].predict) return activePreset;
    for (var i = 0; i < presets.length; i++) if (presets[i].predict) return i;
    return -1;
  }
  /** R2(A4): 띠 [예측하기] — 지금 카드의 예측 → 마지막 예측 → 첫 예측 카드 */
  function reopenPredict() {
    if (activePreset >= 0 && presets[activePreset] && presets[activePreset].predict) { openPresetPredict(activePreset); return; }
    if (lastPredictOpts) { SK.predict(lastPredictOpts); return; }
    var pi = firstPredictPreset();
    if (pi >= 0) SK.applyPreset(pi, { forcePredict: true });
  }
  function canReopenPredict() { return !!lastPredictOpts || firstPredictPreset() >= 0; }
  /** 띠에 '기록하기'를 띄울 수 있나 — 실행 중·일시정지 중에는 아니다(끝난 뒤에만) */
  function bandCanRecord() { return SK.canRecord() && SK.finished && !SK.running; }
  /** 단계별 기본 행동 — 실행이 아닌 행동만 (실행은 하단 ▶ 실행 하나) */
  function defaultAction(i) {
    if (i === 0) {
      if (SK.prediction && SK.prediction.pending) return null;
      if (canReopenPredict()) return { label: '예측하기', onClick: reopenPredict };
      return null;
    }
    if (SK.running || (SK.started && !SK.finished)) return null;
    if (bandCanRecord()) return { label: '기록하기', onClick: function () { SK.record(); } };
    if (i === 1 && SK.finished && recordedRunId === runId) return { label: '비교하러 가기 ▸', onClick: function () { SK.goStep(2); }, next: true };
    if (i === 2 && SK.records.length >= 2) return { label: '정리하러 가기 ▸', onClick: function () { SK.goStep(3); }, next: true };
    if (i === 3) return helpCfg && helpCfg.concepts && helpCfg.concepts.length ? { label: '개념 다시 보기', onClick: function () { SK.toggleHelp(true, 'concepts'); } } : null;
    return null;
  }
  function dynamicText(i) {
    if (i === 0 && SK.prediction && SK.prediction.pending) return '아래 ▶ 실행을 눌러 예측을 확인해요';
    if (i === 1) {
      if (SK.running) return '지켜보는 중이에요';
      if (SK.started && !SK.finished) return '멈췄어요 — 아래 ▶ 이어서 실행';
      if (SK.finished && recordedRunId !== runId && cfg.capture) return '기록하기 버튼으로 결과를 저장해요';
      if (SK.finished && recordedRunId === runId) return '저장했어요. 값 하나만 바꿔 다시 실행해요';
      if (SK.finished) return '아래 ↻ 다시 실행으로 또 해 봐요';
    }
    if (i === 3 && !visibleThinks()) return '알게 된 것을 한두 문장으로 정리해요';
    if (i === 2 && cfg.capture && SK.records.length < 2) return '기록이 2개 있어야 비교해요 (지금 ' + SK.records.length + '개)';
    return DEFAULT_TASK_TEXT[i];
  }
  var NEXT_WORDS = ['실행하러 가기 ▸', '비교하러 가기 ▸', '정리하러 가기 ▸'];
  function updateTask() {
    if (!SK.el.taskText) return;
    var i = SK.stepIndex, t = stepTasks[i] || {};
    var text = typeof t.text === 'function' ? t.text(SK.params) : t.text;
    if (!text) text = dynamicText(i);
    var now = Date.now();
    var alert = now < taskAlertUntil;
    if (alert) text = '먼저 예측하기 버튼을 누르거나 예측 없이 실행해요';
    else if (now < bandMsg.until && bandMsg.text) text = bandMsg.text;
    if (SK.el.taskText.textContent !== text) SK.el.taskText.textContent = text;
    SK.el.taskText.classList.toggle('is-alert', alert);
    SK.el.taskText.classList.toggle('is-msg', !alert && now < bandMsg.until);
    var todayEl = SK.el.top.querySelector('.sim-today');   // 시뮬레이터가 이 글을 바꾸면(모드별 문장) 그대로 따라감
    var today = todayEl && todayEl.lastChild && todayEl.lastChild.nodeType === 3 ? todayEl.lastChild.textContent : (cfg.today || '');
    if (todayEl && todayEl.childNodes.length > 2) today = todayEl.textContent.replace(/^오늘 알아볼 것\s*/, '');
    var showSub = i === 0 && !todaySeen && !!today;
    SK.el.taskSub.hidden = !showSub;
    SK.el.taskWords.classList.toggle('has-sub', showSub);
    if (showSub && SK.el.taskSub.textContent !== '오늘 알아볼 것 — ' + today) SK.el.taskSub.textContent = '오늘 알아볼 것 — ' + today;
    var act = t.action === null ? null : (t.action || defaultAction(i));
    // 시뮬레이터가 준 행동이 '실행'이면(▶·실행하기) 띠에는 띄우지 않는다 — 실행은 하단 하나 (R2 원칙 7)
    if (act && /^(▶|⏸|↻)|실행하기|이어서 실행|다시 실행/.test(act.label || '')) act = null;
    // 실행 중·일시정지 중에는 '기록하기'로 바뀌지 않는다
    if (act && /기록하기/.test(act.label || '') && !bandCanRecord() && (SK.running || (SK.started && !SK.finished))) act = null;
    var b = SK.el.taskAct;
    if (act) {
      b.hidden = false;
      if (b.textContent !== act.label) b.textContent = act.label;
      b._fn = act.onClick;
    } else { b.hidden = true; b._fn = null; }
    // '다음 단계 ▸' 대신 단계 이름이 든 '○○하러 가기 ▸' 하나만
    var nx = SK.el.taskNext;
    var actGoesNext = act && (act.next || /하러 가기/.test(act.label || ''));
    nx.hidden = i >= STEPS.length - 1 || !!actGoesNext;
    if (!nx.hidden && nx.textContent !== NEXT_WORDS[i]) nx.textContent = NEXT_WORDS[i];
  }
  /** R2(A1): 띠 문장 자리에 잠깐 보여 줄 말 (긴 토스트·finish(msg) 가 여기로 온다) */
  SK.say = function (text, ms) {
    bandMsg = { text: String(text || ''), until: Date.now() + (ms || 5000) };
    updateTask();
  };
  SK.setTask = function (i, task) { stepTasks[i] = task; updateTask(); };

  /* ------------------------------------------------------------------
     4. 값 바꾸기 공통 (⚡ 바로 반영 / ↻ 처음부터 다시)
     ------------------------------------------------------------------ */
  function applyIcon(apply) {
    return apply === 'live'
      ? h('span', { class: 'apply-ico apply-ico--live', title: '값을 바꾸면 바로 반영돼요', 'aria-label': '값을 바꾸면 바로 반영' }, '⚡')
      : h('span', { class: 'apply-ico apply-ico--restart', title: '바꾸면 처음부터 다시 실행돼요 (실행 중이면 다음 실행부터)', 'aria-label': '바꾸면 처음부터 다시 실행' }, '↻');
  }
  function registerDef(def, kind, where) {
    if (!def.key) throw new Error('SimKit: key 가 없습니다.');
    if (SK.defs[def.key]) console.warn('SimKit: key 가 겹칩니다 — ' + def.key);
    def.kind = kind;
    def.apply = def.apply || (kind === 'toggle' ? 'live' : 'restart');
    if (def.record === undefined) def.record = where !== 'tools';
    SK.defs[def.key] = def;
  }
  function valueChanged(key, value, opts) {
    opts = opts || {};
    var def = SK.defs[key];
    SK.ui[key] = value;
    if (opts.silent) { dirty = true; return; }
    if (def.record && activePreset >= 0) markPreset(-1);
    if (def.apply === 'live') {
      SK.params[key] = value; delete pending[key];
    } else if (!SK.started) {
      SK.params[key] = value; delete pending[key];
      doReset(false);
    } else if (SK.params[key] !== value) {
      pending[key] = true;
      // R2: 그림 위 토스트에는 버튼을 달지 않는다 — 상태 칩 '↻ 바꾼 값은 다음 실행부터' 와 하단 ↻ 다시 실행으로 충분
      if (opts.source !== 'reset') SK.notice('바꾼 값은 다음 실행부터 적용돼요', 'restart');
    } else {
      delete pending[key];
    }
    markPendingUI();
    SK.flash(key);
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

  /** A15: 값이 바뀐 변수를 실험 화면에서 깜빡이게 — render 안에서 SimKit.isFlashing(key) 로 묻는다 */
  SK.flash = function (key, ms) {
    flashes[key] = Date.now() + (ms || 900);
    var c = SK.controls[key];
    if (c && c.el) { c.el.classList.remove('is-flash'); void c.el.offsetWidth; c.el.classList.add('is-flash'); }
    dirty = true;
  };
  SK.isFlashing = function (key) { return !!flashes[key] && Date.now() < flashes[key]; };
  /** 0~1 깜빡임 세기 (부드럽게 켜졌다 꺼짐) */
  SK.flashLevel = function (key) {
    if (!SK.isFlashing(key)) return 0;
    var left = (flashes[key] - Date.now()) / 900;
    return Math.max(0, Math.sin(left * Math.PI * 3)) * left;
  };

  /* ------------------------------------------------------------------
     5. 수치 바꾸기: 라벨+입력 줄 / − 슬라이더 + 줄 (요구 A)
     ------------------------------------------------------------------ */
  /** 눈금: 숫자 배열은 3개(처음·가운데·끝)로 줄이고, R2(G3) [{v, label}] 은 준 그대로 쓴다 */
  function reduceTicks(t) {
    if (!t || !t.length) return [];
    var objs = typeof t[0] === 'object';
    var list = objs ? t : (t.length <= 3 ? t : [t[0], t[Math.floor((t.length - 1) / 2)], t[t.length - 1]]);
    return list.map(function (x) { return typeof x === 'object' ? { v: x.v, label: x.label } : { v: x, label: null }; });
  }
  SK.addVar = function (where, def) {
    var whereName = typeof where === 'string' ? where : '';
    registerDef(def, 'var', whereName);
    var min = def.min, max = def.max, step = def.step || 1;
    var dec = def.decimals !== undefined ? def.decimals : decimalsOf(step);
    var prec = def.precision !== undefined ? def.precision : dec + 1;
    var value = def.value !== undefined ? def.value : min;
    var unitTxt = def.unit || '';
    var aria = plain(def.label) + (def.symbol ? ' ' + def.symbol : '');

    var range = h('input', { class: 'range', type: 'range', min: min, max: max, step: step, 'aria-label': aria + (unitTxt ? ' (' + unitTxt + ')' : '') });
    var input = h('input', { class: 'var__input num', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': aria + ' 숫자 입력' });
    var err = h('p', { class: 'var__err', role: 'alert', hidden: true });
    var bubble = h('span', { class: 'var__bubble', 'aria-hidden': 'true' });
    // R2(A5): 머리줄 아래 한 줄 '0.5~3 kg · 버튼 한 번에 0.5'
    var rangeTxt = h('span', { class: 'var__range', title: '넣을 수 있는 범위' });
    var ticks = null, tickEls = [];
    var tickList = reduceTicks(def.ticks);
    if (tickList.length) {
      ticks = h('div', { class: 'var__ticks', 'aria-hidden': 'true' });
      tickList.forEach(function (t) {
        var s = h('span', { text: t.label !== null && t.label !== undefined ? String(t.label) : fmtFlex(t.v, 0, dec) });
        s._f = (t.v - min) / (max - min);
        s.style.left = (s._f * 100) + '%';
        if (s._f <= 0.02) s.classList.add('is-start'); else if (s._f >= 0.98) s.classList.add('is-end');
        ticks.appendChild(s); tickEls.push(s);
      });
    }
    var stepNum = fmtFlex(step, 0, Math.max(dec, decimalsOf(step)));
    var stepTxt = '±' + stepNum;
    var minus = h('button', { class: 'btn btn--icon var__step', type: 'button', 'aria-label': plain(def.label) + ' ' + stepNum + ' 줄이기', title: '한 번에 ' + stepNum + ' 줄여요' }, '−');
    var plus = h('button', { class: 'btn btn--icon var__step', type: 'button', 'aria-label': plain(def.label) + ' ' + stepNum + ' 늘리기', title: '한 번에 ' + stepNum + ' 늘려요' }, '+');
    var track = h('div', { class: 'var__track' + (ticks ? ' has-ticks' : '') }, [range, bubble, ticks]);
    var labelKids = rich(def.label);
    if (def.symbol) labelKids.push(h('span', { class: 'var__sym', text: def.symbol }));
    var stepInfo = h('span', { class: 'var__stepinfo', text: '버튼 한 번에 ' + stepNum });
    var el = h('div', { class: 'var' + (def.teacher ? ' teacher-only' : ''), 'data-key': def.key }, [
      h('div', { class: 'var__head' }, [
        h('label', { class: 'var__label' }, labelKids),
        applyIcon(def.apply),
        h('span', { class: 'var__field' }, [input, h('span', { class: 'var__unit', text: unitTxt })])
      ]),
      h('p', { class: 'var__meta' }, [rangeTxt, h('span', { class: 'var__meta-dot', 'aria-hidden': 'true', text: '·' }), stepInfo]),
      h('div', { class: 'var__row' }, [minus, track, plus]),
      err
    ]);
    if (def.hint) el.appendChild(h('p', { class: 'var__hint' }, rich(def.hint)));
    resolveWhere(where).appendChild(el);
    def.initial = value;

    function showRange() { rangeTxt.textContent = fmtFlex(min, 0, prec) + '~' + fmtFlex(max, 0, prec) + (unitTxt ? ' ' + unitTxt : ''); }
    function showErr(text) { err.textContent = text; err.hidden = false; input.classList.add('is-invalid'); setTimeout(checkMore, 0); }
    function clearErr() { if (!err.hidden) { err.hidden = true; input.classList.remove('is-invalid'); } }
    function show(v) {
      var s = fmtFlex(v, dec, prec);
      if (document.activeElement !== input) input.value = s.replace('−', '-');
      range.value = v;
      var f = (v - min) / (max - min);
      range.style.setProperty('--fill', (f * 100) + '%');
      bubble.textContent = s + (unitTxt ? ' ' + unitTxt : '');
      bubble.style.left = 'calc(' + f + ' * (100% - var(--space-thumb)) + var(--space-thumb) / 2)';
      for (var i = 0; i < tickEls.length; i++) tickEls[i].classList.toggle('is-under', Math.abs(tickEls[i]._f - f) < 0.09);
    }
    function set(v, opts) {
      opts = opts || {};
      v = roundTo(clamp(Number(v), min, max), prec);
      value = v; show(v);
      if (opts.source && opts.source !== 'input') clearErr();
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
      if (isNaN(v)) { showErr('숫자만 넣어 주세요 (예: ' + fmtFlex(value, dec, prec) + ')'); input.value = fmtFlex(value, dec, prec).replace('−', '-'); return; }
      if (v < min || v > max) {
        var near = clamp(v, min, max);
        var vt = fmtFlex(v, 0, prec), nt = fmtFlex(near, 0, prec);
        showErr(vt + josa(vt, '은/는') + ' 넣을 수 없어요. 범위가 ' + fmtFlex(min, 0, prec) + '~' + fmtFlex(max, 0, prec) + (unitTxt ? ' ' + unitTxt : '') + '라서 가장 가까운 ' + withJosa(nt, '으로/로') + ' 맞췄어요.');
        v = near;
      } else clearErr();
      if (roundTo(v, prec) !== value) set(v, { source: 'input' });
      input.value = fmtFlex(value, dec, prec).replace('−', '-');
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); input.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); input.value = fmtFlex(value, dec, prec).replace('−', '-'); input.blur(); e.stopPropagation(); }
    });
    input.addEventListener('change', commit);
    input.addEventListener('focus', function () { input.select(); });

    function nudge(dir) { set(roundTo(value + dir * step, prec), { source: 'button' }); }
    function holdable(b, dir) {
      var t1 = 0, t2 = 0;
      function stop() { clearTimeout(t1); clearInterval(t2); }
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); nudge(dir); stop();
        t1 = setTimeout(function () { t2 = setInterval(function () { nudge(dir); }, 80); }, 450);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stop); });
      b.addEventListener('click', function (e) { if (e.detail === 0) nudge(dir); });
    }
    holdable(minus, -1); holdable(plus, 1);

    var api = {
      key: def.key, el: el, def: def, range: range, input: input,
      get: function () { return value; },
      set: set,
      setRange: function (a, b) {
        min = a; max = b; range.min = a; range.max = b; showRange();
        for (var i = 0; i < tickEls.length; i++) tickEls[i].hidden = true;   // 범위가 바뀌면 옛 눈금은 숨김
        if (value < a || value > b) set(clamp(value, a, b), { source: 'range' }); else show(value);
      },
      enable: function (on) { el.classList.toggle('is-disabled', on === false); range.disabled = input.disabled = minus.disabled = plus.disabled = on === false; }
    };
    SK.controls[def.key] = api;
    value = roundTo(clamp(value, min, max), prec);
    def.initial = value;
    SK.ui[def.key] = value;
    if (!(def.key in SK.params)) SK.params[def.key] = value;
    showRange(); show(value);
    return api;
  };

  /* ------------------------------------------------------------------
     6. 상황 바꾸기: 세그먼트·카드 / 체크 토글 (요구 B)
     ------------------------------------------------------------------ */
  SK.addChoice = function (where, def) {
    var whereName = typeof where === 'string' ? where : '';
    registerDef(def, 'choice', whereName);
    var value = def.value !== undefined ? def.value : def.options[0].value;
    var seg = h('div', { class: 'seg' + (def.style === 'cards' ? ' seg--cards' : ''), role: 'group', 'aria-label': plain(def.label) });
    var btns = def.options.map(function (o) {
      var kids = rich(o.label);
      if (o.sub) kids.push(h('span', { class: 'btn__sub', text: o.sub }));
      var b = h('button', { class: 'seg__opt', type: 'button', title: o.title || null }, kids);
      b.addEventListener('click', function (e) { blurOnMouse(e); set(o.value, { source: 'ui' }); });
      seg.appendChild(b);
      return b;
    });
    var el = h('div', { class: 'ctl' + (def.teacher ? ' teacher-only' : ''), 'data-key': def.key }, [
      h('div', { class: 'ctl__label' }, rich(def.label).concat([applyIcon(def.apply)])), seg
    ]);
    if (def.hint) el.appendChild(h('p', { class: 'var__hint' }, rich(def.hint)));
    resolveWhere(where).appendChild(el);
    function show(v) { def.options.forEach(function (o, i) { btns[i].setAttribute('aria-pressed', String(o.value === v)); }); }
    function set(v, opts) {
      var ok = def.options.some(function (o) { return o.value === v; });
      if (!ok) { console.warn('SimKit: ' + def.key + ' 에 없는 값 ' + v); return; }
      value = v; show(v); valueChanged(def.key, v, opts);
      if (modeApi && modeApi.key === def.key) modeApi.sync(v);
    }
    var api = {
      key: def.key, el: el, def: def, get: function () { return value; }, set: set,
      enableOption: function (v, on) { def.options.forEach(function (o, i) { if (o.value === v) btns[i].disabled = on === false; }); },
      enable: function (on) { el.classList.toggle('is-disabled', on === false); btns.forEach(function (b) { b.disabled = on === false; }); }
    };
    SK.controls[def.key] = api;
    def.initial = value;
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
    var b = h('button', { class: 'check', type: 'button' }, [
      h('span', { class: 'check__box', 'aria-hidden': 'true' }),
      h('span', { class: 'check__text' }, rich(def.label)),
      def.apply === 'restart' ? applyIcon('restart') : null,
      stateEl
    ]);
    b.addEventListener('click', function (e) { blurOnMouse(e); set(!value, { source: 'ui' }); });
    var el = h('div', { class: 'ctl' + (def.teacher ? ' teacher-only' : ''), 'data-key': def.key }, b);
    if (def.hint) el.appendChild(h('p', { class: 'var__hint' }, rich(def.hint)));
    resolveWhere(where).appendChild(el);
    function show(v) { b.setAttribute('aria-pressed', String(v)); stateEl.textContent = v ? (def.onText || '켬') : (def.offText || '끔'); }
    function set(v, opts) { value = !!v; show(value); valueChanged(def.key, value, opts); }
    var api = {
      key: def.key, el: el, def: def, get: function () { return value; }, set: set,
      enable: function (on) { el.classList.toggle('is-disabled', on === false); b.disabled = on === false; }
    };
    SK.controls[def.key] = api;
    def.initial = value;
    SK.ui[def.key] = value;
    if (!(def.key in SK.params)) SK.params[def.key] = value;
    show(value);
    return api;
  };

  SK.valueText = function (key, v) {
    var d = SK.defs[key];
    if (v === undefined) v = SK.params[key];
    if (!d) return typeof v === 'number' ? fmtFlex(v, 0, 3) : String(v);
    if (d.kind === 'toggle') return v ? (d.onText || '켬') : (d.offText || '끔');
    if (d.kind === 'choice') {
      for (var i = 0; i < d.options.length; i++) if (d.options[i].value === v) return plain(d.options[i].label);
      return String(v);
    }
    var dec = d.decimals !== undefined ? d.decimals : decimalsOf(d.step || 1);
    var prec = d.precision !== undefined ? d.precision : dec + 1;
    return fmtFlex(v, dec, prec);
  };

  /* ------------------------------------------------------------------
     7. 실험 카드 (프리셋) — 예측 먼저, 답을 고른 뒤 값 적용
     ------------------------------------------------------------------ */
  var presetInfoEl = null;
  SK.tagText = function (tag) { return TAG_WORDS[tag] || tag || ''; };
  /** 카드 아래 줄: R2(E1) preset.changes('v₀ 10 → 20') → 없으면 예전 change */
  function changesText(p) { return p.changes || p.change || ''; }
  SK.setPresets = function (list) {
    presets = (list || []).slice(0, 5);
    if (list && list.length > 5) console.warn('SimKit: 실험 카드는 5개까지입니다.');
    var box = SK.el.presets; box.innerHTML = '';
    presets.forEach(function (p, i) {
      if (p.name && p.name.length > 12) console.warn('SimKit(R1): 실험 카드 이름은 12자 이내로 — "' + p.name + '"');
      if (!p.changes && p.change) warnOnce('changes', 'SimKit(R2): preset.changes(카드 아래 줄, 예: "v₀ 10 → 20") 를 써 주세요. 지금은 change 를 대신 씁니다.');
      var ch = changesText(p);
      var tip = h('span', { class: 'preset-tip', role: 'tooltip' }, [
        h('b', { text: CIRCLED[i] + ' ' + p.name }),
        p.tag ? h('span', { class: 'preset-tip__tag', text: SK.tagText(p.tag) }) : null,
        p.change ? h('span', null, [h('b', { text: '바꾸는 값: ' }), p.change]) : null,
        p.fixed ? h('span', null, [h('b', { text: '그대로 두는 값: ' }), p.fixed]) : null,
        p.predict && cfg.autoPredict ? h('span', { text: '누르면 값이 바로 바뀌고 예측 질문이 나와요.' }) : null
      ]);
      var b = h('button', { class: 'preset-card', type: 'button', 'aria-pressed': 'false', 'aria-label': (i + 1) + '번 실험 카드: ' + p.name + (ch ? ' — ' + ch : '') + (p.tag ? ' (' + SK.tagText(p.tag) + ')' : '') }, [
        h('span', { class: 'preset-card__name' }, [h('span', { class: 'preset-card__key', text: CIRCLED[i] }), h('span', { class: 'preset-card__title', text: p.name })]),
        h('span', { class: 'preset-card__changes' }, [
          p.tag ? h('span', { class: 'preset-card__dot', 'data-tag': p.tag, title: SK.tagText(p.tag), 'aria-hidden': 'true' }) : null,
          h('span', { class: 'preset-card__ch', text: ch })
        ]),
        h('span', { class: 'preset-card__picked', 'aria-hidden': 'true', text: '✓ 고름' }),
        tip
      ]);
      b.addEventListener('click', function (e) { blurOnMouse(e); SK.applyPreset(i); });
      box.appendChild(b);
    });
    updateTask();
  };
  function markPreset(i) {
    activePreset = i;
    var bs = SK.el.presets.querySelectorAll('.preset-card');
    for (var k = 0; k < bs.length; k++) bs[k].setAttribute('aria-pressed', String(k === i));
    if (presetInfoEl) { presetInfoEl.remove(); presetInfoEl = null; }
    if (i >= 0) {
      // R2 원칙 6: 실험 화면에는 모서리 칩 한 줄만 ('카드 ① 이름'), 자세한 값은 말풍선
      var p = presets[i];
      presetInfoEl = h('div', { class: 'preset-info', title: [p.change ? '바꾸는 값: ' + p.change : '', p.fixed ? '그대로: ' + p.fixed : ''].filter(Boolean).join('\n') || null }, [
        h('b', { text: '카드 ' + CIRCLED[i] }), h('span', { class: 'preset-info__name', text: p.name })
      ]);
      SK.el.cornerTL.appendChild(presetInfoEl);
    }
  }
  function setPresetValues(p, i) {
    SK.pause();
    var vals = p.values || {};
    for (var k in vals) {
      if (!Object.prototype.hasOwnProperty.call(vals, k)) continue;
      if (SK.controls[k]) SK.controls[k].set(vals[k], { silent: true });
      else console.warn('SimKit 실험 카드: 없는 key — ' + k);
    }
    pending = {}; markPendingUI();
    doReset(true);
    markPreset(i);
    if (p.onApply) p.onApply(SK.params);
    SK.update();
  }
  /** R2(E3): '카드 ①: v₀ 10 m/s · 각도 0°' (28자 안쪽으로), 모드가 바뀌면 '… 모드로 바뀌어요' */
  function presetToast(p, i) {
    var head = '카드 ' + CIRCLED[i];
    if (p.mode) return head + ': ' + withJosa(p.mode, '으로/로') + ' 바뀌어요';
    var ch = changesText(p);   // 시뮬레이터가 쓴 '바꾸는 값' 요약이 짧으면 그것을 먼저
    if (ch && (head + ': ' + ch).length <= 28) return head + ': ' + ch;
    var parts = [], vals = p.values || {};
    for (var k in vals) {
      if (!Object.prototype.hasOwnProperty.call(vals, k) || !SK.defs[k] || !SK.defs[k].record) continue;
      var d = SK.defs[k], name = d.symbol || plain(d.label);
      parts.push(name + ' ' + SK.valueText(k, vals[k]) + (d.unit ? ' ' + d.unit : ''));
    }
    var s = head + ': ' + parts.slice(0, 2).join(' · ');
    if (!parts.length || s.length > 28) s = head + ' ' + p.name;
    if (s.length > 28) s = head + ' 준비했어요';
    return s;
  }
  function openPresetPredict(i) {
    var p = presets[i]; if (!p || !p.predict) return;
    var q = copy(p.predict); q.tag = q.tag || p.tag; q.preset = i;
    SK.predict(q);
  }
  /** 카드 누르기: 값 바로 적용(패널 숫자가 바뀜) → 토스트 → (autoPredict) 예측 창 */
  SK.applyPreset = function (i, o) {
    o = o || {};
    var p = presets[i]; if (!p) return;
    function go() {
      setPresetValues(p, i);
      SK.notice(presetToast(p, i), 'info');
      if (p.predict && (cfg.autoPredict || o.forcePredict)) setTimeout(function () { if (activePreset === i) openPresetPredict(i); }, 0);
      updateTask();
    }
    if (cfg.confirmPresetWithRecords && SK.records.length && activePreset !== i) {
      SK.confirm({
        title: '실험 카드를 바꿀까요?',
        body: '여러 값이 한꺼번에 바뀌어요. 저장한 실험 ' + SK.records.length + '개는 그대로 남지만, 앞의 기록과 비교하기 어려울 수 있어요.',
        ok: '바꾸기', cancel: '그대로 두기'
      }).then(function (yes) { if (yes) go(); });
    } else go();
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
    hideNote(true);
    if (cfg.reset) cfg.reset(SK.params);
    dirty = true;
    updateTransport(); SK.update();
  }
  SK.reset = function () { doReset(true); };
  SK.play = function () {
    if (modal) { if (modal.shake) modal.shake(); return; }
    if (SK.finished) doReset(true);
    SK.running = true; lastTs = null;
    if (SK.stepIndex === 0) SK.goStep(1);
    if (SK.prediction && SK.prediction.pending && SK.prediction.runId === undefined) SK.prediction.runId = runId;
    updateTransport(); SK.update();
  };
  SK.pause = function () { SK.running = false; updateTransport(); SK.update(); };
  SK.toggle = function () { if (SK.running) SK.pause(); else SK.play(); };
  /** 시뮬레이터가 실행이 끝났을 때 부른다 */
  SK.finish = function (msg) {
    SK.running = false; SK.finished = true; dirty = true;
    updateTransport();
    var v = judgePrediction();
    showNote(v, true);
    // R2(A1): '끝났어요…' 자동 토스트 없음 — 끝 안내는 띠 문장으로 (띠가 '기록하기 버튼으로 …' 을 말함)
    if (msg) SK.say(msg.replace(/\[기록하기\]\s*(으로|로)/g, '기록하기 버튼으로').replace(/\[([^\]]+)\]/g, '$1'), 6000);
    SK.update();
  };
  SK.setSpeed = function (s) { SK.speed = s; updateTransport(); dirty = true; SK.update(); };
  function cycleSpeed(dir) {
    var i = SPEEDS.indexOf(SK.speed); if (i < 0) i = SPEEDS.indexOf(1);
    i = clamp(i + dir, 0, SPEEDS.length - 1);
    SK.setSpeed(SPEEDS[i]);
    SK.notice('속도 ×' + SPEEDS[i] + ' (' + SPEED_WORDS[SPEEDS[i]] + ')', 'info', 1200);
  }
  function updateTransport() {
    if (!SK.el.btnRun) return;
    var b = SK.el.btnRun; b.innerHTML = '';
    // R2(B1): 실행 전 '▶ 실행'(주 색) · 실행 중 '⏸ 멈추기' · 멈춤 '▶ 이어서 실행' · 끝난 뒤 '↻ 다시 실행'(윤곽선)
    var label = SK.running ? '⏸ 멈추기' : (SK.finished ? '↻ 다시 실행' : (SK.started ? '▶ 이어서 실행' : '▶ 실행'));
    b.appendChild(document.createTextNode(label));
    b.appendChild(keyHint('Space'));
    b.setAttribute('aria-label', label.replace(/^[^가-힣]+/, ''));
    b.classList.toggle('btn--primary', !SK.finished);
    b.classList.toggle('btn--secondary', SK.finished);
    b.classList.toggle('is-long', SK.started && !SK.finished && !SK.running);
    SK.el.btnSpeed.textContent = '속도 ×' + SK.speed + ' ▾';
    var items = SK.el.speedMenu.querySelectorAll('button');
    for (var i = 0; i < items.length; i++) items[i].setAttribute('aria-checked', String(+items[i].getAttribute('data-s') === SK.speed));
    var canBack = !!(cfg.save && cfg.load);
    SK.el.btnBack.disabled = !canBack;
    SK.el.btnBack.title = canBack ? '실행 장면을 되감아 봐요' : '이 실험은 되감기를 지원하지 않아요';
    renderNeed();
    updateTask();
  }

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
      if (!(cfg.save && cfg.load)) { SK.notice('이 실험은 되감기를 지원하지 않아요', 'info'); return; }
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

  var acc = 0, lastTs = null, frameN = 0;
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
    var now = Date.now();
    for (var fk in flashes) { if (now < flashes[fk] + 50) dirty = true; else delete flashes[fk]; }
    if (dirty) {
      dirty = false;
      if (SK.view) SK.view.clear();
      if (cfg.render) cfg.render(SK.view, SK.params);
      for (var i = 0; i < frameHooks.length; i++) frameHooks[i]();
    }
    if ((++frameN % 20) === 0) {
      checkMore();
      if (taskAlertUntil && now > taskAlertUntil) { taskAlertUntil = 0; updateTask(); }
      if (bandMsg.until && now > bandMsg.until) { bandMsg = { text: '', until: 0 }; updateTask(); }
    }
  }
  var frameHooks = [];
  SK.onFrame = function (fn) { frameHooks.push(fn); };
  SK.requestRender = function () { dirty = true; };

  /* ------------------------------------------------------------------
     9. 상태 칩 (실험 화면 왼쪽 위)
     ------------------------------------------------------------------ */
  SK.setStatus = function (text) { statusOverride = text; SK.update(); };
  SK.update = function () {
    var el = SK.el.status; if (!el) return;
    var main = statusOverride !== null ? statusOverride : (cfg.status ? cfg.status(SK.params) : '');
    if (main && !Array.isArray(main)) warnOnce('status', 'SimKit(R2): status() 는 배열로 돌려주세요 — 예: [\'지구\', \'공기 저항 없음\']. 지금은 \' · \' 로 나눠 씁니다.');
    var parts = Array.isArray(main) ? main : (main ? String(main).split(/\s+·\s+/) : []);
    var t = ' · t = ' + fmt(SK.time, 2) + ' s';
    var run = SK.running ? ['▶ 실행 중' + t, 'is-run'] : SK.finished ? ['✓ 끝' + t, 'is-done'] : SK.started ? ['⏸ 멈춤' + t, ''] : ['실행 전 · t = 0.00 s', ''];
    var sig = parts.join('|') + '#' + run[0] + '#' + SK.speed + '#' + SK.hasPending();
    if (el._sig !== sig) {
      el._sig = sig; el.innerHTML = '';
      parts.forEach(function (p) { if (p !== '' && p !== null && p !== undefined) el.appendChild(h('span', { class: 'chip' }, rich(String(p)))); });
      el.appendChild(h('span', { class: 'chip num ' + run[1], text: run[0] + (SK.speed !== 1 ? ' · 속도 ×' + SK.speed : '') }));
      if (SK.hasPending()) el.appendChild(h('span', { class: 'chip is-pend', text: '↻ 바꾼 값은 다음 실행부터' }));
    }
    updateTask();
  };

  /* ------------------------------------------------------------------
     10. 기록 · 직전 실행 · 지우기 · 기록 표 큰 판 · 나란히 보기
     ------------------------------------------------------------------ */
  function recordKeys() {
    var ks = [];
    for (var k in SK.defs) if (SK.defs[k].record) ks.push(k);
    return ks;
  }
  SK.canRecord = function () { return !!cfg.capture && SK.started && !SK.running && recordedRunId !== runId && SK.records.length < MAX_RECORDS; };
  SK.record = function () {
    if (!cfg.capture) { SK.notice('이 실험은 기록을 쓰지 않아요', 'info'); return; }
    if (!SK.started) { SK.notice('먼저 ▶ 실행해 보세요', 'info'); return; }
    if (SK.running && !SK.finished) { SK.notice('실행이 끝난 뒤에 기록해요', 'warn'); return; }
    if (recordedRunId === runId) { SK.notice('이 실행은 이미 기록했어요', 'info'); return; }
    if (SK.records.length >= MAX_RECORDS) {
      SK.notice('최대 5개예요 — 하나를 지워 주세요', 'warn');
      SK.say('기록 표의 ✕ 로 하나를 지우거나 그 밖의 기능에서 모두 지워요', 6000);
      setSide('records', true);
      return;
    }
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
      prediction: SK.prediction, time: SK.time, finished: SK.finished, runId: runId
    };
    SK.records.push(rec);
    recordedRunId = runId;
    bandMsg = { text: '', until: 0 };
    fireRecords();
    if (changed.length >= 2) SK.notice('기록 ' + rec.n + ' 저장 — 두 가지 이상 바꿨어요', 'warn');
    else if (SK.records.length === 1) SK.notice('기록 1 저장 — 값 하나만 바꿔 또 해요', 'ok');
    else SK.notice('기록 ' + rec.n + ' 저장 (' + SK.records.length + '/' + MAX_RECORDS + ')', 'ok');
    if (SK.stepIndex === 1 && SK.records.length >= 2) SK.goStep(2);
    SK.update();
  };
  /** R2(C4): 기록 하나 지우기 (번호·색·모양은 순서대로 다시 매김) */
  SK.deleteRecord = function (i, quiet) {
    var r = SK.records[i]; if (!r) return;
    function del() {
      SK.records.splice(i, 1);
      SK.records.forEach(function (x, k) { x.n = k + 1; x.slot = k; });
      if (r.runId === runId) recordedRunId = -1;
      vsSel = [-1, -1];
      fireRecords(); SK.update();
      SK.notice('기록을 하나 지웠어요', 'info');
    }
    if (quiet) { del(); return; }
    SK.confirm({ title: SK.recLabel(r) + josa('기록 ' + r.n, '을/를') + ' 지울까요?', body: '지우면 되돌릴 수 없어요. 뒤 기록의 번호가 하나씩 당겨져요.', ok: '지우기', cancel: '그대로 두기', danger: true })
      .then(function (yes) { if (yes) del(); });
  };
  SK.clearRecords = function () {
    if (!SK.records.length && !SK.ghost) { SK.notice('지울 기록이 없어요', 'info'); return; }
    SK.confirm({
      title: '기록을 모두 지울까요?',
      body: '저장한 실험 ' + SK.records.length + '개와 직전 실행이 지워져요. 되돌릴 수 없어요.',
      ok: '모두 지우기', cancel: '그대로 두기', danger: true
    }).then(function (yes) {
      if (!yes) return;
      SK.records = []; SK.ghost = null; recordedRunId = -1;
      fireRecords(); SK.update();
      SK.notice('기록을 모두 지웠어요', 'info');
    });
  };
  SK.onRecords = function (fn) { recordListeners.push(fn); };
  function fireRecords() {
    dirty = true;
    renderRecords();
    recordListeners.forEach(function (fn) { fn(SK.records, SK.ghost); });
  }

  SK.recStyle = function (i) {
    var n = (i % MAX_RECORDS) + 1;
    var dash = cssVar('--dash-rec-' + n);
    return {
      color: SK.color('--color-rec-' + n),
      dash: (!dash || dash === 'none') ? [] : dash.split(/[\s,]+/).map(Number),
      width: parseFloat(cssVar('--width-rec-' + n)) || 4,
      mark: MARKS[i % MARKS.length]
    };
  };
  SK.ghostStyle = function () { return { color: SK.color('--color-q-ghost'), dash: [], width: 4, mark: '○' }; };
  SK.applyStroke = function (ctx, st) {
    ctx.strokeStyle = st.color; ctx.lineWidth = st.width || 3;
    ctx.setLineDash(st.dash || []);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  };
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
  /** R2(C1): 기록 이름표 = 선 견본 + 모양 기호(색) + '기록 n' — 표·나란히 보기 공통 */
  function recTag(r, ghost) {
    var st = ghost ? SK.ghostStyle() : SK.recStyle(r.slot);
    return h('span', { class: 'rec-swatch' }, [
      swatchSVG(st),
      h('span', { class: 'rec-mark', style: 'color:' + st.color, 'aria-hidden': 'true', text: st.mark }),
      ghost ? h('span', { title: '직전 실행 — 아직 저장하지 않았어요' }, '직전(저장 전)') : '기록 ' + r.n
    ]);
  }
  SK.recTag = function (r) { return recTag(r, false); };

  /* 표 그리기 공통 — R2(C1): priority 1~3. 작은 표 = 1, 큰 판 = 2 이하(열 더 보기 → 전부) */
  var hiddenCols = 0;
  function tableCols(opts, small) {
    var cols = opts && opts.columns ? opts.columns : recordKeys().map(function (k) { return { key: k, from: 'param' }; });
    var lim = small ? 1 : (showAllCols ? 9 : 2);
    var out = cols.filter(function (c) { return (c.priority || 1) <= lim; });
    if (!small) hiddenCols = cols.length - out.length;
    return out;
  }
  function colParts(c) {
    var d = SK.defs[c.key] || {};
    var lab = c.label || (d.label ? plain(d.label) + (d.symbol ? ' ' + d.symbol : '') : c.key);
    var unit = c.unit !== undefined ? c.unit : (d.unit || '');
    return { name: lab, unit: unit };
  }
  function colLabel(c) { var p = colParts(c); return p.name + (p.unit ? ' (' + p.unit + ')' : ''); }
  function colValue(c, src) { return c.from === 'value' ? src.values[c.key] : src.params[c.key]; }
  function cellText(c, src, prev) {
    var v = colValue(c, src);
    if (typeof c.text === 'function') return c.text(src, prev);
    if (c.from === 'value') return (typeof v === 'number') ? fmt(v, c.decimals !== undefined ? c.decimals : 2) : (v === undefined || v === null ? '–' : String(v));
    return c.decimals !== undefined && typeof v === 'number' ? fmt(v, c.decimals) : SK.valueText(c.key, v);
  }
  function isChanged(c, src, prev, v) {
    if (!prev) return false;
    if (typeof c.changed === 'function') return !!c.changed(src, prev);
    if (c.from === 'value') return c.changed === true && prev.values[c.key] !== v;
    return prev.params[c.key] !== v;
  }
  function buildTable(opts, small) {
    var cols = tableCols(opts, small);
    if (!SK.records.length && !SK.ghost) return null;
    // 머리글 2줄: 이름 / 단위
    var headCells = [h('th', { scope: 'col' }, [h('span', { class: 'th-name', text: '기록' })])].concat(cols.map(function (c) {
      var p = colParts(c);
      return h('th', { scope: 'col', class: c.from === 'value' ? 'is-result' : null }, [h('span', { class: 'th-name', text: p.name }), h('span', { class: 'th-unit', text: p.unit ? '(' + p.unit + ')' : ' ' })]);
    }));
    var head = h('tr', null, headCells);
    function cells(src, prev) {
      return cols.map(function (c) {
        var v = colValue(c, src), ch = isChanged(c, src, prev, v);
        return h('td', { class: ch ? 'is-changed' : (c.from === 'value' ? 'is-result' : null), title: ch ? '앞 기록과 달라진 값' : null }, cellText(c, src, prev));
      });
    }
    var rows = [];
    if (SK.ghost && (!small || SK.records.length < 3)) {
      var gr = [h('td', null, recTag(null, true))].concat(cells(SK.ghost, null));
      rows.push(h('tr', { class: 'is-ghost' }, gr));
    }
    SK.records.forEach(function (r, i) {
      var prev = i > 0 ? SK.records[i - 1] : null;
      var first = h('td', null, recTag(r, false));
      if (r.changed.length >= 2) first.appendChild(h('span', { class: 'chip chip--warn rec-warn', text: r.changed.length + '개 바뀜' }));
      if (!small) first.insertBefore(btn('✕', 'btn--quiet rec-del', function () { SK.deleteRecord(i); }, { 'aria-label': '기록 ' + r.n + ' 지우기', title: '이 기록 지우기' }), first.firstChild);
      var tds = [first].concat(cells(r, prev));
      rows.push(h('tr', { 'data-slot': r.slot }, tds));
    });
    return h('table', { class: 'rec-table' }, [h('thead', null, head), h('tbody', null, rows)]);
  }
  /** '바꾼 값: v₀ 10 → 20' — 마지막 기록과 그 앞 기록에서 달라진 수치·상황 */
  function changedLine() {
    var n = SK.records.length; if (n < 2) return '';
    var A = SK.records[n - 2], B = SK.records[n - 1], out = [];
    recordKeys().forEach(function (k) {
      if (A.params[k] === B.params[k]) return;
      var d = SK.defs[k] || {}, name = d.symbol || plain(d.label) || k;
      out.push(name + ' ' + SK.valueText(k, A.params[k]) + ' → ' + SK.valueText(k, B.params[k]) + (d.unit ? ' ' + d.unit : ''));
    });
    return out.length ? '바꾼 값(기록 ' + A.n + ' → ' + B.n + '): ' + out.join(' · ') : '기록 ' + A.n + '과 ' + B.n + '은 값이 같아요';
  }
  function buildVs(opts) {
    var n = SK.records.length;
    if (n < 2) return null;
    if (vsSel[0] < 0 || vsSel[0] >= n || vsSel[1] < 0 || vsSel[1] >= n || vsSel[0] === vsSel[1]) vsSel = [n - 2, n - 1];
    var cols = tableCols(opts, false);
    var wrap = h('section', { class: 'vs', 'aria-label': '두 기록 나란히 보기' });
    wrap.appendChild(h('h3', { class: 'vs__title', text: '두 기록 나란히 보기' }));
    // R2(C2): '비교할 기록 A [1][2] · B [1][2]' 한 줄
    var line = h('div', { class: 'vs__pick' }, [h('span', { class: 'vs__lead', text: '비교할 기록' })]);
    ['A', 'B'].forEach(function (nm, side) {
      var grp = h('span', { class: 'vs__grp', role: 'group', 'aria-label': '기록 ' + nm }, [h('b', { class: 'vs__ab', text: nm })]);
      SK.records.forEach(function (r, i) {
        var st = SK.recStyle(r.slot);
        var b = btn([h('span', { class: 'rec-mark', style: 'color:' + st.color, 'aria-hidden': 'true', text: st.mark }), String(r.n)], 'num vs__btn', function () {
          vsSel[side] = i;
          if (vsSel[0] === vsSel[1]) vsSel[1 - side] = i === 0 ? 1 : 0;
          renderRecords();
        }, { 'aria-pressed': String(vsSel[side] === i), 'aria-label': nm + ' 로 기록 ' + r.n + ' 고르기' });
        grp.appendChild(b);
      });
      if (side === 1) line.appendChild(h('span', { class: 'vs__sep', 'aria-hidden': 'true', text: '·' }));
      line.appendChild(grp);
    });
    wrap.appendChild(line);
    wrap.appendChild(h('p', { class: 'var__hint', text: '두 기록을 고르면 아래 표가 바뀌어요' }));
    var A = SK.records[vsSel[0]], B = SK.records[vsSel[1]];
    var rows = cols.map(function (c) {
      var va = colValue(c, A), vb = colValue(c, B), diff;
      if (typeof va === 'number' && typeof vb === 'number' && typeof c.text !== 'function') {
        var d = vb - va, dd = c.decimals !== undefined ? c.decimals : (SK.defs[c.key] && c.from !== 'value' ? decimalsOf(SK.defs[c.key].step || 1) : 2);
        if (Math.abs(d) < Math.pow(10, -dd) / 2) diff = h('span', { class: 'vs-same', text: '같음' });
        else diff = h('span', { class: d > 0 ? 'vs-up' : 'vs-down', text: (d > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(d), dd) });
      } else {
        var ta = cellText(c, A, null), tb = cellText(c, B, null);
        diff = ta === tb ? h('span', { class: 'vs-same', text: '같음' }) : h('span', { class: 'vs-up', text: '다름' });
      }
      return h('tr', null, [h('td', { text: colLabel(c) }), h('td', { text: cellText(c, A, null) }), h('td', { text: cellText(c, B, null) }), h('td', null, diff)]);
    });
    function headOf(nm, r) {
      var st = SK.recStyle(r.slot);
      return h('th', { class: 'vs-th', style: 'box-shadow: inset 0 calc(-4 * var(--u)) 0 ' + st.color }, [nm + ' ', h('span', { class: 'rec-mark', style: 'color:' + st.color, text: st.mark }), ' 기록 ' + r.n]);
    }
    wrap.appendChild(h('table', { class: 'vs-table' }, [
      h('thead', null, h('tr', null, [h('th', { text: '항목' }), headOf('A', A), headOf('B', B), h('th', { text: '차이 (B − A)' })])),
      h('tbody', null, rows)
    ]));
    wrap.appendChild(h('p', { class: 'var__hint', text: '▲ B 가 더 커요 · ▼ B 가 더 작아요 · 같음 = 그대로' }));
    return wrap;
  }
  function renderNeed() {
    var need = SK.el.recNeed; if (!need) return;
    var n = SK.records.length, key = n + '|' + SK.canRecord() + '|' + SK.finished;
    if (need._k === key) return;
    need._k = key; need.innerHTML = '';
    if (n < 2) {
      var canRec = SK.canRecord() && SK.finished;
      need.appendChild(h('div', { class: 'rec-need' }, [
        h('p', { text: '기록이 2개 있어야 비교할 수 있어요 (지금 ' + n + '개). 값 하나를 바꾸고 ▶ 실행한 뒤 기록하기 버튼으로 저장해요.' }),
        canRec ? btn('지금 결과 기록하기', 'btn--secondary', function () { SK.record(); }) : null
      ]));
    }
  }
  function checkRecScroll() {
    var sc = SK.el.recScroll; if (!sc) return;
    var over = sc.scrollWidth > sc.clientWidth + 4;
    var atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4;
    sc.classList.toggle('has-overflow', over && !atEnd);
    SK.el.recSlide.hidden = !over || atEnd;
  }
  function renderRecords() {
    if (!SK.el.recChipCount) return;
    var n = SK.records.length;
    SK.el.recChipCount.innerHTML = '';
    SK.el.recChipCount.appendChild(document.createTextNode('저장한 실험 '));
    SK.el.recChipCount.appendChild(h('b', { text: n + '/' + MAX_RECORDS }));
    SK.el.recCount.textContent = '저장 ' + n + '/' + MAX_RECORDS;
    if (!cfg.capture) SK.el.records.hidden = true;
    smallTables.forEach(function (t) { t.render(); });
    // 큰 판의 표는 늘 다시 그린다(숨어 있어도) — 시뮬레이터가 rt.el 안 표를 꾸미는 경우 호환
    SK.el.recTitle.textContent = '저장한 실험 ' + n + '/' + MAX_RECORDS + (n >= MAX_RECORDS ? ' — 가득 찼어요(✕ 로 하나 지우기)' : '');
    renderNeed();
    var cl = changedLine();
    SK.el.recChanged.hidden = !cl; SK.el.recChanged.textContent = cl;
    var sc = SK.el.recScroll; sc.innerHTML = '';
    var t = buildTable(mainTable || {}, false);
    sc.appendChild(t || h('p', { class: 'rec-empty', text: '아직 저장한 실험이 없어요. ▶ 실행한 뒤 기록하기 버튼을 누르면 여기에 쌓여요.' }));
    SK.el.recMoreCols.hidden = !t || (!hiddenCols && !showAllCols);
    SK.el.recMoreCols.textContent = showAllCols ? '열 줄이기 ▴' : '열 더 보기 ▾ (' + hiddenCols + ')';
    var vs = SK.el.recVs; vs.innerHTML = '';
    var v = buildVs(mainTable || {});
    if (v) vs.appendChild(v);
    setTimeout(checkRecScroll, 0);
  }

  /**
   * 기록 표. where 를 비우면(null) 기록 표 큰 판(비교 단계 · [표 보기])에 들어간다.
   *   R2(C3): opts.extra = 요소 → 큰 판의 표 아래(나란히 보기 위) 공식 자리에 붙인다.
   * where 에 요소·패널 이름을 주면 그 자리에 작은 표(priority 1 열만)를 그린다.
   */
  SK.recordTable = function (where, opts) {
    opts = opts || {};
    if (!where || where === SK.el.records) {
      mainTable = opts;
      if (opts.extra) SK.el.recExtra.appendChild(opts.extra);
      var api = { el: SK.el.recBox, extra: SK.el.recExtra, render: function () { renderRecords(); } };
      renderRecords();
      return api;
    }
    var host = resolveWhere(where);
    var title = h('span');
    var bigBtn = btn('크게 보기', 'btn--sm btn--quiet', function () { setSide('records', true); });
    var scroll = h('div', { class: 'rec-box__scroll scroll-shadow' });
    var box = h('div', { class: 'rec-box' }, [h('div', { class: 'rec-box__head' }, [title, bigBtn]), scroll]);
    host.appendChild(box);
    if (!mainTable) mainTable = opts;
    function render() {
      title.textContent = '저장한 실험 ' + SK.records.length + '/' + MAX_RECORDS;
      scroll.innerHTML = '';
      var t = buildTable(opts, true);
      scroll.appendChild(t || h('p', { class: 'rec-empty', text: '▶ 실행한 뒤 기록하기 버튼을 누르면 여기에 쌓여요.' }));
    }
    var obj = { el: box, render: render };
    smallTables.push(obj);
    render();
    return obj;
  };
  /** R2(C3): 기록 큰 판의 시뮬레이터 전용 자리 (표 아래, 나란히 보기 위) */
  SK.recordExtra = function (el) { if (el) SK.el.recExtra.appendChild(el); return SK.el.recExtra; };

  /* ------------------------------------------------------------------
     11. 안내 토스트 · 확인 창 · 예측 카드 · 결과 해설 · 모드 · 안내 서랍
     ------------------------------------------------------------------ */
  /**
   * R2(B4): 예전 문장 다듬기 — '[기록하기]로' → '기록하기 버튼으로', 남은 [ ] 는 벗기고,
   * '(으)로'·'(을)를'·'(이)가'·'은(는)' 같은 양쪽 표기는 앞 낱말에 맞는 조사 하나로.
   */
  function tidyMsg(s) {
    s = String(s === undefined || s === null ? '' : s);
    s = s.replace(/\[기록하기\]\s*(?:\(으\))?(?:으로|로)/g, '기록하기 버튼으로');
    s = s.replace(/\[([^\]]{1,24})\]/g, '$1');
    s = s.replace(/(\S+?)\s?\(으\)로/g, function (m, w) { return w + josa(w, '으로/로'); });
    s = s.replace(/(\S+?)(?:\(을\)를|을\(를\))/g, function (m, w) { return w + josa(w, '을/를'); });
    s = s.replace(/(\S+?)(?:\(이\)가|이\(가\))/g, function (m, w) { return w + josa(w, '이/가'); });
    s = s.replace(/(\S+?)(?:\(은\)는|은\(는\))/g, function (m, w) { return w + josa(w, '은/는'); });
    s = s.replace(/(\S+?)(?:\(과\)와|과\(와\))/g, function (m, w) { return w + josa(w, '과/와'); });
    return s;
  }
  SK.tidy = tidyMsg;

  /**
   * R2(A1) 토스트: 실험 화면 안 위 가운데 한 줄, 한 번에 1개(새 것이 오면 바로 바꿈), 2.5초.
   * 28자를 넘으면 콘솔 경고 후 띠 문장(SimKit.say)으로 보낸다. action = {label, onClick} 이면 작은 버튼.
   */
  var NOTICE_MAX = 28, noticeTimer = 0;
  /** 토스트는 위 가운데 한 줄. 왼쪽·오른쪽 위 모서리 칩과 가로로 겹치면 그 칩 바로 아래로 내린다 */
  function placeNoticeZone() {
    var zone = SK.el.notices, st = SK.el.stage; if (!zone || !st) return;
    zone.style.top = '';
    var zr = zone.getBoundingClientRect(), top = 0;
    [SK.el.cornerTL, SK.el.cornerTR].forEach(function (c) {
      if (!c || !c.offsetHeight) return;
      var kids = c.children;
      for (var i = 0; i < kids.length; i++) {
        var r = kids[i].getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.left < zr.right && r.right > zr.left && r.top < zr.bottom && r.bottom > zr.top) top = Math.max(top, r.bottom - st.getBoundingClientRect().top);
      }
    });
    if (top) zone.style.top = (top + SK.px(6)) + 'px';
  }
  SK.notice = function (text, type, ms, action) {
    var zone = SK.el.notices; if (!zone) return;
    var flat = tidyMsg(text).replace(/\s+/g, ' ').trim();
    if (!flat) return;
    if (flat.length > NOTICE_MAX) {
      console.warn('SimKit(R2): 토스트는 ' + NOTICE_MAX + '자 이내로 — 띠 문장으로 보냄 (' + flat.length + '자): ' + flat);
      SK.say(flat, Math.max(ms || 0, 5000));
      return;
    }
    var now = Date.now();
    if (noticeLast[flat] && now - noticeLast[flat] < 1200 && zone.firstChild) return;
    noticeLast[flat] = now;
    var kind = type && type !== 'info' ? type : 'info';
    var kids = [kind === 'ok' ? h('span', { class: 'notice__mark', 'aria-hidden': 'true', text: '✓' }) : kind === 'warn' ? h('span', { class: 'notice__mark', 'aria-hidden': 'true', text: '!' }) : null, h('span', { text: flat })];
    var n = h('div', { class: 'notice notice--' + kind, role: 'status' }, kids);
    if (action) {
      var ab = h('button', { class: 'notice__act', type: 'button' }, action.label);
      ab.addEventListener('click', function (e) { blurOnMouse(e); n.remove(); action.onClick(); });
      n.appendChild(ab);
    }
    zone.innerHTML = '';
    zone.appendChild(n);
    placeNoticeZone();
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, ms || (action ? 4500 : msVar('--dur-notice', 2500)));
  };

  SK.dialog = function (o) {
    return new Promise(function (resolve) {
      var prevFocus = document.activeElement;
      var okBtn = h('button', { class: 'btn ' + (o.danger ? 'btn--danger' : 'btn--primary'), type: 'button' }, [o.ok || '확인', keyHint('Enter')]);
      var cancelBtn = o.cancel === null ? null : h('button', { class: 'btn', type: 'button' }, [o.cancel || '취소', keyHint('Esc')]);
      var body = typeof o.body === 'string' ? h('p', { class: 'dialog__body', text: o.body }) : h('div', { class: 'dialog__body' }, o.body || null);
      var dlg = h('div', { class: 'dialog' + (o.small || typeof o.body === 'string' ? ' dialog--sm' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '' }, [
        o.title ? h('h2', { class: 'dialog__title', text: o.title }) : null, body,
        h('div', { class: 'dialog__foot' }, [cancelBtn, okBtn])
      ]);
      var layer = h('div', { class: 'dialog-layer' }, dlg);
      SK.el.slide.appendChild(layer);
      var outer = modal;
      if (SK.running) SK.pause();
      function close(v) {
        layer.remove(); modal = outer;
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

  function predText(p) {
    if (!p) return '';
    if (p.number !== undefined && p.number !== null) return fmtFlex(p.number, 0, 3) + (p.unit ? ' ' + p.unit : '');
    return plain(p.answer || '');
  }
  function niceExample(mn, mx) {
    if (typeof mn !== 'number' || typeof mx !== 'number' || !isFinite(mn) || !isFinite(mx)) return '';
    var mid = (mn + mx) / 2, st = niceStep(Math.max(1e-9, mx - mn), 4);
    return fmtFlex(Math.round(mid / st) * st, 0, 3);
  }
  var predictListeners = [];
  /** R2(A4): 예측 창이 떠 있나 — 이 동안 시뮬은 결과 층(무늬·상·궤적)을 숨긴다 */
  SK.predicting = function () { return !!(modal && modal.type === 'predict'); };
  SK.onPredict = function (fn) { predictListeners.push(fn); };
  function firePredict(open, o) {
    SK.el.slide.classList.toggle('is-predicting', open);
    dirty = true;
    try { if (open && cfg.onPredictOpen) cfg.onPredictOpen(o); if (!open && cfg.onPredictClose) cfg.onPredictClose(o); } catch (e) { console.error(e); }
    predictListeners.forEach(function (fn) { try { fn(open, o); } catch (e) { console.error(e); } });
  }
  /**
   * 예측 창 (R2 A3). 실험 화면 아래쪽 카드 — 위쪽 장면·눈금은 그대로 보인다.
   * o = {question, choices, info, figure(SVG 글), answer(1~), why, judge(p, values)→번호, tag, handCount,
   *      numeric:{label:'얼마나 멀리 갈까?', unit, min, max(수 또는 함수), example, key, actual(p), decimals, tolerance, overText},
   *      afterHint:'예측 뒤 토스트 문구'}
   * → Promise<{choice(1~), index(0~), number}|null>. 고르면 SimKit.prediction 에 저장, 실행이 끝나면(finish) 판정이 패널 맨 위에 뜬다.
   */
  SK.predict = function (o) {
    o = o || {};
    return new Promise(function (resolve) {
      if (modal && modal.type === 'predict') modal.close(null);
      lastPredictOpts = o;
      if (SK.stepIndex !== 0) SK.goStep(0);
      SK.pause();
      var layer, card, choices = o.choices || [], sel = null;
      var counts = choices.map(function () {
        return h('input', { class: 'predict__count', type: 'number', inputmode: 'numeric', min: '0', max: '99', step: '1', placeholder: '손', 'aria-label': '손든 학생 수', title: '손든 학생 수' });
      });
      function readCounts() {
        var r = [], any = false;
        counts.forEach(function (inp) { var n = parseInt(inp.value, 10); if (isNaN(n)) n = null; else any = true; r.push(n); });
        return any ? r : null;
      }
      function store(idx, num) {
        SK.prediction = {
          question: o.question, answer: idx !== null ? choices[idx] : null, index: idx, choice: idx !== null ? idx + 1 : null,
          choices: choices.slice(), number: num, unit: o.numeric ? o.numeric.unit : '', counts: readCounts(),
          key: o.answer, why: o.why, judge: o.judge, numeric: o.numeric, pending: true, preset: o.preset
        };
      }
      var closed = false;
      function close(idx, num, runNow) {
        if (closed) return; closed = true;
        if (layer) layer.remove(); modal = null;
        SK.el.slide.classList.remove('is-modal');
        firePredict(false, o);
        if (idx === null && (num === null || num === undefined)) {
          resolve(null);
          if (runNow) { o._runNow = true; SK.play(); }
          updateTask();
          return;
        }
        store(idx, num);
        SK.notice(o.afterHint || '예측했어요 — ▶ 실행으로 확인해요', 'info');
        resolve({ choice: idx !== null ? idx + 1 : null, index: idx, number: num === undefined ? null : num });
        updateTask();
      }
      var okBtn = btn('예측하기', 'btn--primary predict__ok', function () { submit(); });
      var btns = choices.map(function (c, i) {
        var b = h('button', { class: 'btn btn--secondary predict__opt', type: 'button', 'aria-pressed': 'false' }, [h('span', { class: 'predict__no', text: CIRCLED[i] }), h('span', { class: 'predict__txt' }, rich(c)), keyHint(String(i + 1))]);
        b.addEventListener('click', function (e) { blurOnMouse(e); choose(i); });
        b.addEventListener('dblclick', function () { choose(i); submit(); });
        return h('div', { class: 'predict__choice' }, [b, counts[i]]);
      });
      function choose(i) {
        sel = i;
        btns.forEach(function (w, j) { w.firstChild.setAttribute('aria-pressed', String(j === i)); });
        okBtn.disabled = false;
      }
      counts.forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); var i = counts.indexOf(inp); if (i + 1 < counts.length) counts[i + 1].focus(); else inp.blur(); }
          if (e.code === 'Escape') { e.preventDefault(); inp.blur(); }
          e.stopPropagation();
        });
      });
      var numBox = null, numIn = null, nmMin, nmMax;
      if (o.numeric) {
        var nm = o.numeric;
        nmMin = typeof nm.min === 'function' ? nm.min(SK.params) : nm.min;
        nmMax = typeof nm.max === 'function' ? nm.max(SK.params) : nm.max;
        var ex = nm.example !== undefined ? fmtFlex(nm.example, 0, 3) : niceExample(nmMin, nmMax);
        numIn = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': plain(nm.label || '예측 값') + ' 입력', placeholder: ex !== '' ? '예: ' + ex : '' });
        var rangeTxt = typeof nmMin === 'number' && typeof nmMax === 'number' ? fmtFlex(nmMin, 0, 2) + '~' + fmtFlex(nmMax, 0, 2) + (nm.unit ? ' ' + nm.unit : '') + ' 사이' : '';
        numBox = h('div', { class: 'predict__num' }, [
          h('label', { class: 'predict__numlabel' }, rich(nm.label || '내 예측')),
          h('span', { class: 'predict__field' }, [numIn, h('span', { class: 'predict__unit', text: nm.unit || '' })]),
          rangeTxt ? h('span', { class: 'predict__range', text: rangeTxt }) : null
        ]);
        numIn.addEventListener('keydown', function (e) {
          e.stopPropagation();
          if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); submit(); }
          if (e.code === 'Escape') { e.preventDefault(); if (numIn.value.trim()) { numIn.value = ''; okBtn.disabled = sel === null; } else close(null, null); }
        });
        numIn.addEventListener('input', function () { okBtn.disabled = !numIn.value.trim() && sel === null; });
      }
      function submit() {
        if (numIn && numIn.value.trim()) {
          var v = parseNum(numIn.value);
          if (isNaN(v)) { SK.notice('숫자로 적어 주세요', 'warn'); numIn.focus(); return; }
          if (typeof nmMax === 'number' && v > nmMax) setTimeout(function () { SK.notice(o.numeric.overText || '아주 크게 봤군요 — 확인해 봐요', 'info'); }, 0);
          else if (typeof nmMin === 'number' && v < nmMin) setTimeout(function () { SK.notice('아주 작게 봤군요 — 확인해 봐요', 'info'); }, 0);
          close(null, v);
          return;
        }
        if (sel !== null) { close(sel, null); return; }
        if (modal && modal.shake) modal.shake();
      }
      okBtn.disabled = true;
      var handBtn = choices.length && o.handCount !== false ? h('button', { class: 'btn btn--sm btn--outline teacher-only', type: 'button', title: '선택지마다 손든 학생 수를 적어요', 'aria-pressed': 'false' }, '✋ 손들기 수') : null;
      if (handBtn) handBtn.addEventListener('click', function (e) {
        blurOnMouse(e);
        var on = card.classList.toggle('predict--count');
        handBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) counts[0].focus();
      });
      var fig = null;
      if (o.figure) { fig = h('div', { class: 'predict__figure', 'aria-hidden': 'true' }); fig.innerHTML = o.figure; }
      var skip = h('button', { class: 'predict__skip', type: 'button' }, '예측 없이 바로 실행');
      skip.addEventListener('click', function (e) { blurOnMouse(e); close(null, null, true); });
      card = h('div', { class: 'predict' + (fig ? ' has-figure' : '') + (choices.length > 2 ? ' is-many' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': '예측' }, [
        h('div', { class: 'predict__top' }, [h('span', { class: 'predict__label', text: '먼저 예측해 보세요' }), o.tag ? h('span', { class: 'chip chip--sim', text: SK.tagText(o.tag) }) : null, handBtn]),
        btn('✕', 'btn--quiet predict__close', function () { close(null, null); }, { 'aria-label': '예측 창 닫기', title: '닫기 (띠의 예측하기 버튼으로 다시 열 수 있어요)' }),
        h('p', { class: 'predict__q' }, rich(o.question || '')),
        o.info ? h('p', { class: 'predict__info' }, rich(o.info)) : null,
        fig || btns.length ? h('div', { class: 'predict__mid' }, [fig, btns.length ? h('div', { class: 'predict__choices' }, btns) : null]) : null,
        numBox,
        h('div', { class: 'predict__foot' }, [
          h('span', { class: 'predict__hint', text: o.numeric && !choices.length ? '적은 다음 ▶ 실행으로 확인해요' : '고른 다음 ▶ 실행으로 확인해요' }),
          skip, okBtn
        ])
      ]);
      layer = h('div', { class: 'predict-layer' }, card);
      SK.el.stage.appendChild(layer);
      modal = {
        type: 'predict', close: function (v) { close(v, null); },
        shake: function () {
          card.classList.remove('is-shake'); void card.offsetWidth; card.classList.add('is-shake');
          taskAlertUntil = Date.now() + 3000; updateTask();
        },
        onKey: function (e) {
          if (e.code === 'Escape') { close(null, null); return true; }
          var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
          if (m && +m[1] <= choices.length) { choose(+m[1] - 1); return true; }
          if (e.code === 'Enter' || e.code === 'NumpadEnter') {
            var t = document.activeElement;
            if (t && (t === skip || (t.tagName === 'BUTTON' && t !== okBtn && !t.classList.contains('predict__opt')))) return false;
            submit(); return true;
          }
          if (e.code === 'Space') { modal.shake(); return true; }
          if (e.code === 'KeyF') return false;
          if (e.code === 'Tab') return false;
          return true;
        }
      };
      firePredict(true, o);
      updateTask();
      if (numIn && !choices.length) setTimeout(function () { numIn.focus(); }, 50);
    });
  };

  /** 실행이 끝났을 때 예측 판정 → {kind, mine, right, numeric, why} (R2: 번호가 아니라 선택지 글자) */
  function judgePrediction() {
    var p = SK.prediction;
    if (!p || !p.pending) return null;
    p.pending = false;
    var values = {};
    try { var cap = cfg.capture ? cfg.capture(SK.params) : null; values = (cap && cap.values) || {}; } catch (e) { /* 무시 */ }
    if (p.number !== null && p.number !== undefined && p.numeric) {
      var nm = p.numeric, actual = typeof nm.actual === 'function' ? nm.actual(SK.params, values) : values[nm.key];
      if (typeof actual !== 'number') return null;
      var d = Math.abs(actual - p.number), dd = nm.decimals !== undefined ? nm.decimals : 1;
      var close = nm.tolerance !== undefined ? d <= nm.tolerance : d <= Math.max(Math.abs(actual) * 0.1, Math.pow(10, -dd));
      p.result = { actual: actual, diff: d, hit: close };
      return { kind: close ? 'hit' : 'miss', numeric: { pred: fmtFlex(p.number, 0, dd), actual: fmt(actual, dd), diff: fmt(d, dd), unit: nm.unit || '' }, why: p.why };
    }
    var right = null;
    if (typeof p.judge === 'function') { try { right = p.judge(SK.params, values); } catch (e) { right = null; } }
    else if (p.key) right = p.key;
    if (!right || !p.choice) return null;
    var hit = right === p.choice;
    p.result = { right: right, hit: hit };
    var list = p.choices || [];
    return { kind: hit ? 'hit' : 'miss', mine: plain(list[p.choice - 1] || p.answer || ''), right: plain(list[right - 1] || CIRCLED[right - 1]), why: p.why };
  }

  /* ── R2(A2) 결과 해설 카드: 패널 맨 위(.panel-note), 실행이 끝난 뒤에만 ── */
  var noteEls = null;
  function buildPanelNote() {
    var body = h('div', { class: 'panel-note__body' });
    var tog = btn('접기 ▴', 'btn--quiet panel-note__fold', function () { noteCollapsed = !noteCollapsed; renderNote(); }, { 'aria-expanded': 'true' });
    var root = h('section', { class: 'panel-note', hidden: true, 'aria-live': 'polite', 'aria-label': '실험 결과 해설' }, [
      h('div', { class: 'panel-note__head' }, [h('span', { class: 'panel-note__title', text: '이번 실험 결과' }), tog]), body
    ]);
    return { root: root, body: body, tog: tog };
  }
  function noteChip() {
    var pop = h('div', { class: 'note-pop', hidden: true, role: 'region', 'aria-label': '실험 결과 해설' });
    var b = btn('해설 보기 ▾', 'btn--outline btn--sm note-chip', function () {
      pop.hidden = !pop.hidden;
      b.textContent = pop.hidden ? '해설 보기 ▾' : '해설 닫기 ▴';
      if (!pop.hidden) { pop.innerHTML = ''; noteContent().forEach(function (n) { pop.appendChild(n); }); }
    });
    b.hidden = true;
    return { btn: b, pop: pop };
  }
  function hasNote() { return !!(noteState.verdict || noteState.takeaway); }
  function normTake(t) {
    if (!t) return null;
    if (typeof t === 'string') return { line: t, more: '' };
    if (typeof t === 'object' && (t.line || t.more)) return { line: t.line || '', more: t.more || '' };
    return null;
  }
  /** 해설 내용(카드·팝오버 공통): 1행 판정 → 2행 한 줄 → [왜 그럴까? ▾] */
  function noteContent() {
    var out = [], v = noteState.verdict, t = noteState.takeaway;
    if (v) {
      if (v.numeric) {
        var u = v.numeric.unit ? ' ' + v.numeric.unit : '';
        out.push(h('div', { class: 'note-verdict note-verdict--num verdict--' + v.kind }, [
          h('span', { class: 'verdict__mark', text: v.kind === 'hit' ? '✓ 가까워요' : '△ 차이 있어요' }),
          h('div', { class: 'note-nums' }, [
            h('span', { class: 'note-num' }, [h('small', { text: '예측' }), h('b', { class: 'num', text: v.numeric.pred + u })]),
            h('span', { class: 'note-num is-actual' }, [h('small', { text: '실제' }), h('b', { class: 'num', text: v.numeric.actual + u })]),
            h('span', { class: 'note-num' }, [h('small', { text: '차이' }), h('b', { class: 'num', text: v.numeric.diff + u })])
          ])
        ]));
      } else if (v.mine !== undefined) {
        out.push(h('p', { class: 'note-verdict verdict--' + v.kind }, [
          h('span', { class: 'verdict__mark', text: v.kind === 'hit' ? '✓' : '✗' }),
          h('span', null, ['내 예측: ', h('b', { text: v.mine }), ' → ',
            v.kind === 'hit' ? h('b', { class: 'verdict__res', text: '맞았어요' }) : h('span', null, ['아니에요. 실제는 ', h('b', { class: 'verdict__res', text: v.right })])])
        ]));
      } else if (v.text !== undefined) {
        out.push(h('p', { class: 'note-verdict verdict--' + (v.kind || 'info') }, [
          h('span', { class: 'verdict__mark', text: v.kind === 'hit' ? '✓' : v.kind === 'miss' ? '✗' : 'ⓘ' }), h('span', null, rich(v.text))
        ]));
      }
    }
    if (t && t.line) out.push(h('p', { class: 'note-line' }, rich(t.line)));
    var whyKids = [];
    if (v && v.why) whyKids.push(h('p', null, rich(v.why)));
    if (t && t.more) whyKids.push(h('p', null, rich(t.more)));
    if (whyKids.length) out.push(h('details', { class: 'note-why' }, [h('summary', { text: '왜 그럴까?' }), h('div', { class: 'note-why__body' }, whyKids)]));
    return out;
  }
  function renderNote() {
    if (!noteEls) return;
    var on = hasNote();
    noteEls.root.hidden = !on;
    noteEls.body.innerHTML = '';
    if (on) noteContent().forEach(function (n) { noteEls.body.appendChild(n); });
    noteEls.root.classList.toggle('is-folded', noteCollapsed);
    noteEls.body.hidden = noteCollapsed;
    noteEls.tog.textContent = noteCollapsed ? '펼치기 ▾' : '접기 ▴';
    noteEls.tog.setAttribute('aria-expanded', String(!noteCollapsed));
    (SK.el.noteChips || []).forEach(function (c) {
      c.btn.hidden = !on;
      if (!on) { c.pop.hidden = true; c.btn.textContent = '해설 보기 ▾'; }
      else if (!c.pop.hidden) { c.pop.innerHTML = ''; noteContent().forEach(function (n) { c.pop.appendChild(n); }); }
    });
    if (on && SK.el.panel) SK.el.panel.scrollTop = SK.el.panel.scrollTop;   // 패널 높이 바뀜 → '아래에 더' 다시 계산
    setTimeout(checkMore, 0);
  }
  function showNote(verdict, fromFinish) {
    if (verdict) noteState.verdict = verdict;
    if (fromFinish) {
      noteCollapsed = false;
      if (takeawayCfg) {
        var t = typeof takeawayCfg === 'function' ? takeawayCfg(SK.params) : takeawayCfg;
        noteState.takeaway = normTake(t);
      }
    }
    renderNote();
  }
  function hideNote() {
    noteState = { verdict: null, takeaway: null };
    renderNote();
  }
  /** 실행이 끝나면 패널 맨 위 카드에 '한 줄 요약'. 함수면 끝날 때 params 로 부른다.
      돌려주는 값: 문자열(한 줄) 또는 R2 {line:'한 줄', more:'왜 그럴까? 안에 넣을 전문'} · null 이면 지움 */
  SK.takeaway = function (text) {
    takeawayCfg = text || null;
    if (SK.finished) { noteState.takeaway = normTake(typeof text === 'function' ? text(SK.params) : text); renderNote(); }
  };
  SK.verdict = function (kind, text) { showNote({ kind: kind || 'info', text: text }, false); };
  SK.hideNote = function () { hideNote(); };

  /** R2(G2): 모드 고르기 창 — 기본 선택 없음, 카드를 누르면 바로 시작. 실험 화면 아래쪽 카드(예측 창과 같은 자리) */
  var modeApi = null, modeSeen = {};
  SK.chooseMode = function (o) {
    var modes = (o.modes || []).map(function (m) { return { value: m.value, label: stripNo(m.label), desc: m.desc || '' }; });
    if (!modes.length) return null;
    var urlKey = o.urlKey || 'mode';
    var storeKey = 'simkit:mode:' + (cfg.slug || location.pathname) + ':' + urlKey;
    var ctlKey = o.key || null;
    if (!ctlKey) {   // 패널에 같은 선택지(값이 똑같은 addChoice)가 있으면 찾아서 접는다
      for (var k in SK.controls) {
        var d = SK.controls[k].def;
        if (d && d.kind === 'choice' && d.options.length === modes.length && d.options.every(function (op, i) { return op.value === modes[i].value; })) { ctlKey = k; break; }
      }
    }
    var def0 = o.default !== undefined ? o.default : (ctlKey && SK.controls[ctlKey] ? SK.controls[ctlKey].get() : modes[0].value);
    var current = def0, layer = null;
    function labelOf(v) { for (var i = 0; i < modes.length; i++) if (modes[i].value === v) return modes[i].label; return String(v); }
    function remember(v) { try { sessionStorage.setItem(storeKey, String(v)); } catch (e) { /* 저장 안 돼도 동작 */ } }
    function showLine() {
      var ml = SK.el.modeLine; ml.innerHTML = ''; ml.hidden = false;
      ml.appendChild(h('span', { class: 'panel-mode__now' }, ['지금: ', h('b', { text: labelOf(current) })]));
      ml.appendChild(btn('실험 고르기', 'btn--outline btn--sm', function () { open(); }, { title: '다른 실험(모드)으로 바꿔요' }));
      if (ctlKey && SK.controls[ctlKey]) SK.controls[ctlKey].el.classList.add('is-folded');
    }
    function autoPredictAfterMode() {
      if (!cfg.autoPredict) return;
      setTimeout(function () {
        if (modal || SK.records.length || SK.started) return;
        if (SK.prediction && SK.prediction.pending) return;
        if (activePreset >= 0 && presets[activePreset] && presets[activePreset].predict) { openPresetPredict(activePreset); return; }
        var pi = firstPredictPreset();
        if (pi >= 0) SK.applyPreset(pi);
      }, 150);
    }
    function pick(v, quiet, noAuto) {
      current = v; remember(v); showLine();
      if (o.onPick) o.onPick(v, modes.map(function (m) { return m.value; }).indexOf(v));
      if (!o.onPick && ctlKey && SK.controls[ctlKey] && SK.controls[ctlKey].get() !== v) SK.controls[ctlKey].set(v);
      dirty = true;
      if (!quiet) SK.notice(withJosa(labelOf(v), '으로/로') + ' 시작해요', 'info');
      if (!noAuto) autoPredictAfterMode();
    }
    function closeLayer() { if (layer) { layer.remove(); layer = null; } modal = null; SK.el.slide.classList.remove('is-modal'); }
    function open() {
      if (layer) return;
      if (modal && modal.type === 'predict') modal.close(null);
      SK.pause();
      var opts = modes.map(function (m, i) {
        var b = h('button', { class: 'mode-opt', type: 'button', 'aria-pressed': 'false' }, [
          h('span', { class: 'mode-opt__no', text: CIRCLED[i] }),
          h('span', { class: 'mode-opt__label', text: m.label }),
          m.desc ? h('span', { class: 'mode-opt__desc', text: m.desc }) : null,
          m.value === current && modeSeen[storeKey + ':picked'] ? h('span', { class: 'mode-opt__now', text: '지금 하는 것' }) : null
        ]);
        b.addEventListener('click', function (e) { blurOnMouse(e); start(i); });
        return b;
      });
      function start(i) { modeSeen[storeKey + ':picked'] = true; closeLayer(); pick(modes[i].value); }
      var card = h('div', { class: 'mode-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title || '무엇을 알아볼까요?' }, [
        btn('✕', 'btn--quiet mode-card__close', function () { closeLayer(); pick(current, true, true); }, { 'aria-label': '닫고 지금 것으로 하기', title: '닫기 (지금 것으로 해요)' }),
        h('p', { class: 'mode-card__q', text: o.title || '무엇을 알아볼까요?' }),
        h('p', { class: 'mode-card__sub', text: '하나를 누르면 바로 시작해요. 나중에 오른쪽 패널 위 실험 고르기 버튼으로 바꿀 수 있어요.' }),
        h('div', { class: 'mode-opts', style: 'grid-template-columns:repeat(' + Math.min(modes.length, 3) + ',minmax(0,1fr))' }, opts)
      ]);
      layer = h('div', { class: 'mode-layer' }, card);
      SK.el.stage.appendChild(layer);
      SK.el.slide.classList.add('is-modal');
      modal = {
        type: 'mode', onKey: function (e) {
          var m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
          if (m && +m[1] <= modes.length) { start(+m[1] - 1); return true; }
          if (e.code === 'Escape') { closeLayer(); pick(current, true, true); return true; }
          if (e.code === 'KeyF') return false;
          if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') return !(document.activeElement && document.activeElement.classList.contains('mode-opt')) || false;
          return e.code !== 'Tab';
        }
      };
      card.setAttribute('tabindex', '-1');   // 기본 선택 없음 — 보기에 포커스 링이 먼저 생기지 않게 카드에 포커스
      setTimeout(function () { try { card.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 30);
    }
    // URL ?mode=값 → 창 없이 / 이번 세션에 이미 골랐으면 → 창 없이 그 값
    var fromUrl = null, stored = null;
    try { fromUrl = new URLSearchParams(location.search).get(urlKey); } catch (e) { fromUrl = null; }
    try { stored = sessionStorage.getItem(storeKey); } catch (e) { stored = null; }
    function valid(v) { for (var i = 0; i < modes.length; i++) if (String(modes[i].value) === String(v)) return modes[i].value; return null; }
    var pre = valid(fromUrl);
    if (pre === null) pre = valid(stored);
    if (valid(stored) !== null && o.default === undefined) current = valid(stored);
    if (modeSeen[storeKey]) pre = null;          // 같은 페이지에서 다시 부르면(예: '입구 바꾸기') 창을 연다
    modeSeen[storeKey] = true;
    setTimeout(function () {
      if (pre !== null) { modeSeen[storeKey + ':picked'] = true; pick(pre, true); }
      else open();
    }, 0);
    modeApi = { key: ctlKey, open: open, get: function () { return current; }, sync: function (v) { if (v !== current) { current = v; remember(v); showLine(); } } };
    return modeApi;
  };

  /** A13: '수업 안내(교사)' 서랍 — 교사 모드에서만 */
  var drawerEl = null;
  SK.guide = function (o) {
    o = o || {};
    var body = h('div', { class: 'drawer__body' });
    if (o.rows && o.rows.length) {
      body.appendChild(h('h3', { text: '변수·상황과 성취기준' }));
      o.rows.forEach(function (r) {
        body.appendChild(h('div', { class: 'guide-card' }, [
          h('p', { class: 'guide-card__t', text: r.target || '' }),
          h('dl', null, [
            h('dt', { text: '성취기준·탐구' }), h('dd', { text: r.standard || '—' }),
            h('dt', { text: '학생이 발견할 것' }), h('dd', { text: r.discover || '—' }),
            h('dt', { text: '깨는 오개념' }), h('dd', { text: r.misconception || '—' })
          ])
        ]));
      });
    }
    (o.sections || []).forEach(function (s) {
      body.appendChild(h('h3', { text: s.title }));
      body.appendChild(h('ul', { style: 'display:grid;gap:var(--space-2);padding-left:var(--space-5);list-style:disc' }, (s.items || []).map(function (t) { return h('li', { text: t }); })));
    });
    function toggleRow(text, get, set) {
      var b = h('button', { class: 'check', type: 'button' }, [h('span', { class: 'check__box' }), h('span', { class: 'check__text', text: text }), h('span', { class: 'check__state' })]);
      function show() { b.setAttribute('aria-pressed', String(!!get())); b.lastChild.textContent = get() ? '켬' : '끔'; }
      b.addEventListener('click', function (e) { blurOnMouse(e); set(!get()); show(); });
      show();
      return b;
    }
    var html = document.documentElement;
    body.appendChild(h('h3', { text: '교사 설정' }));
    body.appendChild(toggleRow('모드·실험 카드를 고르면 예측 창 자동으로 띄우기', function () { return cfg.autoPredict; }, function (v) { cfg.autoPredict = v; cfg.predictOnPreset = v; }));
    body.appendChild(toggleRow('학생 화면의 [답 확인하기] 잠그기 (토론 전)', function () { return html.classList.contains('reveal-locked'); }, function (v) { html.classList.toggle('reveal-locked', v); }));
    body.appendChild(toggleRow('버튼에 단축키 글자 보이기', function () { return html.classList.contains('show-keys'); }, function (v) { html.classList.toggle('show-keys', v); }));
    body.appendChild(btn('모든 [답 확인하기] 펼치기', 'btn--secondary', function () {
      var ds = document.querySelectorAll('details.reveal'); for (var i = 0; i < ds.length; i++) ds[i].open = true;
    }));
    if (o.keys) { body.appendChild(h('h3', { text: '이 실험 전용 키' })); body.appendChild(h('p', { text: o.keys })); }
    if (o.keys) { guideKeys = o.keys; if (helpEl) { helpEl.remove(); helpEl = null; } }
    var closeBtn = btn(['닫기', keyHint('Esc')], '', function () { SK.toggleGuide(false); });
    drawerEl = h('aside', { class: 'drawer teacher-only', hidden: true, 'aria-label': '수업 안내(교사)' }, [
      h('div', { class: 'drawer__head' }, [h('h2', { text: '수업 안내(교사)' }), closeBtn]), body
    ]);
    SK.el.slide.appendChild(drawerEl);
    SK.el.guideBtn.hidden = false;
  };
  var guideKeys = '';
  SK.toggleGuide = function (on) {
    if (!drawerEl) return;
    if (!SK.isTeacher()) { drawerEl.hidden = true; return; }
    drawerEl.hidden = on === undefined ? !drawerEl.hidden : !on;
    if (!drawerEl.hidden) SK.toggleHelp(false);
  };

  /** A12: 도움말 서랍 (이렇게 해요 / 개념 / 용어 / 단축키) — R2(D1~D3) */
  var helpEl = null, helpTabs = {}, helpPanes = {}, helpLive = [];
  var termAlias = {}, termShort = {}, termAliasList = {};
  var DEFAULT_HOW = [
    '아래 실험 카드 하나를 누르면 값이 바뀌고 예측 질문이 나와요. 답을 먼저 골라요.',
    '아래 ▶ 실행을 누르고 결과를 지켜봐요. 끝나면 위 띠의 기록하기 버튼으로 저장해요.',
    '오른쪽 수치 바꾸기에서 한 가지만 바꾸고 다시 실행해 기록해요.',
    '비교 단계에서 기록 표를 보고 무엇이 달라졌는지 찾아요.'
  ];
  /** terms: { 용어: '풀이' } 또는 { 용어: {def:'풀이', short:'괄호 풀이', alias:['같은 말']} } — 넣은 순서 그대로 */
  function addTerms(terms) {
    if (!terms) return;
    for (var k in terms) {
      if (!Object.prototype.hasOwnProperty.call(terms, k)) continue;
      var t = terms[k];
      if (t && typeof t === 'object') {
        termDict[k] = t.def || t.text || '';
        if (t.short) termShort[k] = t.short;
        termAliasList[k] = (t.alias || []).slice();
        (t.alias || []).forEach(function (a) { termAlias[a] = k; });
      } else termDict[k] = String(t);
    }
  }
  function canonTerm(name) { return termAlias[name] || name; }
  function shortOf(name) {
    if (termShort[name]) return termShort[name];
    var d = termDict[name]; if (!d) return '';
    var first = String(d).split(/[.。]|\s—\s/)[0].trim();
    return first.length <= 24 ? first : '';
  }
  SK.help = function (o) {
    helpCfg = o || {};
    addTerms(helpCfg.terms);
    if (helpEl) { helpEl.remove(); helpEl = null; }
    updateTask();
  };
  function concept(c) {
    var live = c.live ? h('p', { class: 'concept__live' }) : null;
    if (live) helpLive.push({ el: live, fn: c.live });
    var fig = null;
    if (c.figure) { fig = h('div', { class: 'concept__figure', 'aria-hidden': 'true' }); fig.innerHTML = c.figure; }
    var sym = null;
    if (c.symbols && c.symbols.length) {
      sym = h('table', { class: 'concept__symbols' }, [
        h('thead', null, h('tr', null, [h('th', { text: '기호' }), h('th', { text: '뜻' }), h('th', { text: '단위' })])),
        h('tbody', null, c.symbols.map(function (s) { return h('tr', null, [h('td', { class: 'concept__sym', text: s.s }), h('td', null, rich(s.meaning || '')), h('td', { text: s.unit || '–' })]); }))
      ]);
    }
    var isNew = !!(c.summary || c.symbols || c.why || c.figure || c.example);
    function lines(v) { return typeof v === 'string' ? v.split('\n').map(function (ln) { return h('p', null, rich(ln)); }) : [v]; }   // 요소를 주면 그대로
    var plainEl = c.plain ? h('div', { class: 'concept__plain' }, lines(c.plain)) : null;
    var formulaBox = c.formula ? h('p', { class: 'concept__formula', text: c.formula }) : null;
    var kids = [
      h('h3', { class: 'concept__title', text: c.title || '' }),
      c.summary ? h('p', { class: 'concept__summary' }, rich(c.summary)) : null,
      plainEl,
      c.example ? h('p', { class: 'concept__example' }, [h('b', { text: '예) ' })].concat(rich(c.example))) : null,
      fig
    ];
    if (isNew) {
      if (formulaBox || sym) kids.push(h('details', { class: 'concept__more' }, [h('summary', { text: '식 보기' }), h('div', { class: 'concept__more-body' }, [formulaBox, sym])]));
      if (c.why) kids.push(h('details', { class: 'concept__more' }, [h('summary', { text: '왜 그럴까?' }), h('div', { class: 'concept__more-body' }, lines(c.why))]));
    } else if (formulaBox) kids.splice(1, 0, formulaBox);   // 예전 구조 {title, formula, plain, live}: 식을 제목 바로 아래
    kids.push(live);
    return h('div', { class: 'concept' }, kids);
  }
  function buildHelp() {
    var o = helpCfg || {};
    var tabsBox = h('div', { class: 'help-tabs', role: 'tablist' });
    var paneBox = h('div', { class: 'drawer__body' });
    helpTabs = {}; helpPanes = {}; helpLive = [];
    function addTab(id, name, content) {
      var t = h('button', { class: 'help-tab', type: 'button', role: 'tab', 'aria-selected': 'false', 'data-tab': id }, name);
      t.addEventListener('click', function (e) { blurOnMouse(e); showTab(id); });
      tabsBox.appendChild(t);
      var p = h('div', { role: 'tabpanel', class: 'help-pane', hidden: true, 'data-tab': id }, content);
      paneBox.appendChild(p);
      helpTabs[id] = t; helpPanes[id] = p;
    }
    addTab('how', '이렇게 해요', h('ol', { class: 'help-how' }, (o.how && o.how.length ? o.how : DEFAULT_HOW).map(function (s, i) {
      return h('li', { class: 'help-step' }, [h('span', { class: 'help-step__num', 'aria-hidden': 'true', text: String(i + 1) }), h('div', { class: 'help-step__body' }, rich(tidyMsg(s)))]);
    })));
    if (o.concepts && o.concepts.length) addTab('concepts', '개념', o.concepts.map(concept));
    var names = Object.keys(termDict);
    if (names.length) {
      var dl = h('dl', { class: 'term-list' });
      names.forEach(function (n) {
        dl.appendChild(h('dt', { text: n }));
        var al = termAliasList[n] && termAliasList[n].length ? h('span', { class: 'term-list__alias', text: ' (같은 말: ' + termAliasList[n].join(', ') + ')' }) : null;
        dl.appendChild(h('dd', null, [termDict[n], al]));
      });
      addTab('terms', '용어', dl);
    }
    var keys = [
      ['Space', '실행 / 멈추기'], ['← →', '단계 바꾸기 (예측·실행·비교·정리)'], ['1 ~ 5', '실험 카드 고르기'],
      ['S', '기록하기'], ['R', '기본값으로 되돌리기'], ['C', '기록 모두 지우기'], [', .', '한 장면 뒤로 / 앞으로'],
      ['[ ]', '속도 느리게 / 빠르게'], ['F', '전체 화면'], ['T', '조작판 접기 / 펴기'], ['?', '이 도움말'],
      ['Esc', '창 닫기 (두 번 누르면 허브로)'], ['H (3초 누르기)', '교사 모드 켜기 / 끄기']
    ].concat(o.keys || []);
    var kl = h('dl', { class: 'key-list' });
    keys.forEach(function (k) { kl.appendChild(h('dt', null, h('kbd', { text: k[0] }))); kl.appendChild(h('dd', { text: k[1] })); });
    var extra = guideKeys ? h('p', { class: 'var__hint', text: '이 실험 전용: ' + guideKeys }) : null;
    addTab('keys', '단축키', [kl, extra, h('p', { class: 'var__hint', text: '키보드가 없어도 화면의 버튼으로 모두 할 수 있어요.' })]);
    var closeBtn = btn(['닫기', keyHint('Esc')], 'btn--outline', function () { SK.toggleHelp(false); });
    helpEl = h('aside', { class: 'drawer drawer--help', hidden: true, 'aria-label': '도움말' }, [
      h('div', { class: 'drawer__head' }, [h('h2', { text: '도움말 — ' + (cfg.title || '') }), closeBtn]), tabsBox, paneBox
    ]);
    SK.el.slide.appendChild(helpEl);
    showTab('how');
  }
  function showTab(id) {
    if (!helpTabs[id]) id = 'how';
    for (var k in helpTabs) { helpTabs[k].setAttribute('aria-selected', String(k === id)); helpPanes[k].hidden = k !== id; }
    refreshLive();
  }
  function refreshLive() {
    helpLive.forEach(function (l) { try { l.el.textContent = l.fn(SK.params) || ''; } catch (e) { l.el.textContent = ''; } });
  }
  SK.toggleHelp = function (on, tab) {
    if (!helpEl) buildHelp();
    var show = on === undefined ? helpEl.hidden : !!on;
    helpEl.hidden = !show;
    if (show) { if (tab) showTab(tab); else refreshLive(); if (drawerEl) drawerEl.hidden = true; }
  };

  /** A12: 용어 말풍선. SimKit.term('초점거리') → <abbr class="term"> (풀이는 help({terms}) 또는 두 번째 인자)
      R2(D3): 같은 말(alias)은 같은 풀이로 */
  SK.term = function (name, explain) {
    var canon = canonTerm(name);
    if (explain) termDict[canon] = explain;
    var a = h('abbr', { class: 'term', tabindex: '0', 'data-term': canon, text: name });
    return a;
  };
  /** R2(D2): help({inlineTerms:true}) 이면 {{용어}} 첫 등장 뒤에 '(짧은 풀이)' 를 붙인다 */
  function termNodes(name) {
    var canon = canonTerm(name), out = [SK.term(name)];
    if (helpCfg && helpCfg.inlineTerms && !termSeen[canon] && termDict[canon]) {
      var s = shortOf(canon);
      if (s) { termSeen[canon] = true; out.push(h('span', { class: 'term-inline', text: '(' + s + ')' })); }
    }
    return out;
  }
  var tipEl = null;
  function installTermTips() {
    tipEl = h('div', { class: 'term-tip', hidden: true, role: 'tooltip' });
    document.body.appendChild(tipEl);
    function show(t) {
      var name = t.getAttribute('data-term'), txt = termDict[name];
      if (!txt) return;
      tipEl.innerHTML = ''; tipEl.appendChild(h('b', { text: name })); tipEl.appendChild(document.createTextNode(txt));
      tipEl.hidden = false;
      var r = t.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
      var x = clamp(r.left + r.width / 2 - tw / 2, 8, window.innerWidth - tw - 8);
      var y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
      tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
    }
    function hide() { tipEl.hidden = true; }
    document.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('.term'); if (t) show(t); });
    document.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('.term'); if (t) hide(); });
    document.addEventListener('focusin', function (e) { var t = e.target.closest && e.target.closest('.term'); if (t) show(t); });
    document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('.term')) hide(); });
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.term');
      if (t) { e.preventDefault(); e.stopPropagation(); if (tipEl.hidden) show(t); else hide(); }
    }, true);
  }

  /** A12: 접어 두는 답. SimKit.reveal(container, '정답 글(HTML)') → <details class="reveal"> */
  SK.reveal = function (container, answerHtml, label) {
    var body = h('div', { class: 'reveal__body' });
    if (typeof answerHtml === 'string') body.innerHTML = answerHtml; else if (answerHtml) body.appendChild(answerHtml);
    var d = h('details', { class: 'reveal' }, [h('summary', { text: label || '답 확인하기' }), body]);
    d.addEventListener('toggle', function () {
      var html = document.documentElement;
      if (d.open && html.classList.contains('reveal-locked') && !html.classList.contains('is-teacher')) { d.open = false; SK.notice('선생님이 열어 줄 때까지 기다려요', 'info'); }
    });
    if (container) resolveWhere(container).appendChild(d);
    return d;
  };

  /**
   * 정리 질문 카드 (정리 단계에 오른쪽 칸에 뜬다).
   * o = {id, q, hint, hintFold, choices, answer(1~), why, reveal, where, when: () => 보일지}
   * 선택지를 누르면 바로 맞힘/틀림 + 이유(R2 D4: 이유를 바로). 계산형(보기 없음)의 hint 는 '힌트 보기 ▸' 로 접힘.
   * 반환: 카드 요소. 지우기: SimKit.think.remove(id 또는 요소)
   */
  SK.think = function (o) {
    o = o || {};
    var fb = h('div', { class: 'think-card__fb', hidden: true, 'aria-live': 'polite' });
    var choices = null;
    if (o.choices && o.choices.length) {
      var bs = [];
      choices = h('div', { class: 'think-card__choices' }, o.choices.map(function (c, i) {
        var b = btn([h('span', { class: 'think-card__mark', text: CIRCLED[i] }), h('span', { class: 'think-card__txt' }, rich(c))], 'think-card__opt', function () {
          bs.forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          fb.hidden = false; fb.innerHTML = '';
          if (!o.answer) { fb.appendChild(h('p', { text: '고른 답: ' + plain(c) + ' — 친구와 이유를 이야기해 봐요.' })); if (o.why) fb.appendChild(h('p', { class: 'think-card__why' }, rich(o.why))); return; }
          var hit = i + 1 === o.answer;
          b.classList.add(hit ? 'is-right' : 'is-wrong');
          if (!hit) bs[o.answer - 1].classList.add('is-right');
          fb.className = 'think-card__fb ' + (hit ? 'is-hit' : 'is-miss');
          fb.appendChild(h('p', { class: 'think-card__res' }, hit ? '✓ 맞았어요' : ['✗ 아니에요. 답은 ', h('b', { text: plain(o.choices[o.answer - 1]) })]));
          if (o.why) fb.appendChild(h('p', { class: 'think-card__why' }, [h('b', { text: '이유 ' })].concat(rich(o.why))));
        });
        bs.push(b);
        return b;
      }));
    }
    var hintEl = null;
    if (o.hint) {
      var fold = o.hintFold !== undefined ? o.hintFold : !(o.choices && o.choices.length);
      hintEl = fold
        ? h('details', { class: 'think-card__hintbox' }, [h('summary', { text: '힌트 보기' }), h('p', { class: 'think-card__hint' }, rich(o.hint))])
        : h('p', { class: 'think-card__hint' }, rich(o.hint));
    }
    var noEl = h('span', { class: 'think-card__no', text: '질문' });
    var card = h('div', { class: 'think-card', 'data-think': o.id || null }, [
      noEl,
      h('p', { class: 'think-card__q' }, rich(o.q || '')),
      hintEl, choices, fb
    ]);
    card._think = { id: o.id || null, when: typeof o.when === 'function' ? o.when : null, no: noEl };
    if (o.reveal) SK.reveal(card, o.reveal);
    (o.where ? resolveWhere(o.where) : SK.el.thinkList).appendChild(card);
    if (!o.where) thinks.push(card);
    refreshThinks();
    if (SK.stepIndex === 3 && !sideUser) setSide(autoSide(), false);
    return card;
  };
  SK.think.remove = function (idOrEl) {
    for (var i = thinks.length - 1; i >= 0; i--) {
      var c = thinks[i];
      if (c === idOrEl || (c._think && c._think.id === idOrEl)) { c.remove(); thinks.splice(i, 1); }
    }
    refreshThinks();
    if (SK.stepIndex === 3 && !sideUser) setSide(autoSide(), false);
  };
  /** R2(D4): when() 으로 모드별 숨김 + 보이는 것만 '질문 1·2·3' 번호 */
  function refreshThinks() {
    var n = 0;
    thinks.forEach(function (c) {
      var m = c._think || {}, show = true;
      if (m.when) { try { show = !!m.when(SK.params); } catch (e) { show = true; } }
      c.hidden = !show;
      if (show) { n++; if (m.no) m.no.textContent = '질문 ' + n; }
    });
    return n;
  }
  function visibleThinks() { var n = 0; thinks.forEach(function (c) { if (!c.hidden) n++; }); return n; }
  SK.refreshThinks = function () { refreshThinks(); if (SK.stepIndex === 3 && !sideUser) setSide(autoSide(), false); };

  /** 빈 상태 한 줄: '▶ 실행하면 여기에 ○○이 나와요' → {el, show(bool)} */
  SK.empty = function (container, what) {
    var host = resolveWhere(container);
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var el = h('p', { class: 'empty', text: '▶ 실행하면 여기에 ' + what + josa(what, '이', '가') + ' 나와요' });
    host.appendChild(el);
    return { el: el, show: function (on) { el.hidden = !on; } };
  };

  /**
   * A18: 캔버스 라벨 겹침 피하기. items = [{x, y, text, anchor:'left'|'center'|'right', color, font, bg:false}]
   * 겹치면 위/아래로 8u 씩 밀고, 흰 반투명 칩을 깔아 그린다. 반환: 그려진 상자 목록
   */
  SK.placeLabel = function (ctx, items, opts) {
    opts = opts || {};
    var placed = (opts.avoid || []).slice(), out = [];
    var padX = 6, padY = 3;
    (items || []).forEach(function (it) {
      if (!it || !it.text) return;
      ctx.save();
      ctx.font = it.font || opts.font || ('600 ' + (it.size || opts.size || 22) + 'px ' + (cssVar('--font-sans') || 'sans-serif'));
      var w = ctx.measureText(it.text).width + padX * 2, hgt = (it.size || opts.size || 22) * 1.2 + padY * 2;
      var a = it.anchor || 'center';
      var x0 = a === 'left' ? it.x : a === 'right' ? it.x - w : it.x - w / 2;
      var y0 = it.y - hgt / 2, dy = 0, tries = 0;
      function hit(y) {
        for (var i = 0; i < placed.length; i++) { var p = placed[i]; if (x0 < p.x + p.w && x0 + w > p.x && y < p.y + p.h && y + hgt > p.y) return true; }
        return false;
      }
      while (hit(y0 + dy) && tries < 24) { tries++; dy = (tries % 2 ? -1 : 1) * Math.ceil(tries / 2) * 8; }
      var box = { x: x0, y: y0 + dy, w: w, h: hgt };
      placed.push(box); out.push(box);
      if (Math.abs(dy) > 12 && it.leader !== false) {
        ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 1.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(it.x, dy < 0 ? box.y + box.h : box.y); ctx.stroke();
      }
      if (it.bg !== false) {
        ctx.fillStyle = 'rgba(251,248,239,0.88)';
        var r = 6; ctx.beginPath();
        ctx.moveTo(box.x + r, box.y); ctx.arcTo(box.x + w, box.y, box.x + w, box.y + hgt, r); ctx.arcTo(box.x + w, box.y + hgt, box.x, box.y + hgt, r);
        ctx.arcTo(box.x, box.y + hgt, box.x, box.y, r); ctx.arcTo(box.x, box.y, box.x + w, box.y, r); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = SK.color(it.color || '--color-ink');
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it.text, box.x + padX, box.y + hgt / 2);
      ctx.restore();
    });
    return out;
  };

  /* ------------------------------------------------------------------
     12. 그리기: HiDPI 캔버스 · 화살표 · 계기판 · 그래프
     ------------------------------------------------------------------ */
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
    view.clear = function () {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (view.bg) { ctx.fillStyle = SK.color(view.bg); ctx.fillRect(0, 0, cv.width, cv.height); }
      else ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.restore();
      ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, view.dpr * view.ox, view.dpr * view.oy);
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    view.toLogical = function (e) {
      var r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
    };
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(container);
    else window.addEventListener('resize', resize);
    resize();
    return view;
  };

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

  /** 계기판. items: [{key,label('{{용어}}' 가능),symbol,unit,decimals,q,hidden,size}] */
  SK.meters = function (where, items) {
    var host = resolveWhere(where || SK.el.meters);
    var wrap = h('div', { class: 'meters' });
    var cells = {};
    items.forEach(function (it) {
      var val = h('span', { class: 'num', text: '–' });
      var lab = rich(it.label || '');
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
   * 실시간 선 그래프. o = {title, x, y, series, ghost, records, empty:'높이 그래프'}
   * 그릴 선이 하나도 없으면 '▶ 실행하면 여기에 ○○이 나와요' 한 줄을 보인다.
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
    var what = o.empty || (o.title ? o.title + ' 그래프' : '그래프');
    var emptyEl = h('p', { class: 'empty', text: '▶ 실행하면 여기에 ' + what + josa(what, '이', '가') + ' 나와요' });
    var axisTxt = h('span', { class: 'graph-box__axes' });
    var box = h('div', { class: 'graph-box' }, [h('div', { class: 'graph-box__title' }, [o.title || '', axisTxt, legend]), area]);
    function axisName(a) { return a && a.label ? a.label + (a.unit ? '(' + a.unit + ')' : '') : ''; }
    function showAxes() { axisTxt.textContent = view.h < 100 && (X.label || Y.label) ? '세로 ' + axisName(Y) + ' · 가로 ' + axisName(X) : ''; }
    area.appendChild(emptyEl);
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
      var any = false;
      eachLine(function (pts) { if (pts && pts.length > 1) any = true; });
      emptyEl.hidden = any || o.empty === false;
      var ctx = view.ctx, W = view.w, H = view.h;
      view.clear();
      var small = H < 100;   // 하단 띠(88u) 안 작은 그래프: 축 이름은 제목 줄로, 여백 줄임
      var fs = 22, padL = small ? 52 : 70, padB = small ? 26 : 34, padT = small ? 4 : 8, padR = 12;   // R2: 캔버스 글자 22u 이상
      var xr = range(X, 0), yr = range(Y, 1);
      var pw = W - padL - padR, ph = H - padT - padB;
      if (pw < 10 || ph < 10) return;
      function mx(x) { return padL + (x - xr[0]) / (xr[1] - xr[0]) * pw; }
      function my(y) { return padT + ph - (y - yr[0]) / (yr[1] - yr[0]) * ph; }
      ctx.font = '500 ' + fs + 'px ' + (cssVar('--font-num') || 'sans-serif');
      ctx.lineWidth = 1; ctx.setLineDash([]);
      var xs = niceStep(xr[1] - xr[0], Math.max(2, Math.floor(pw / 110)));
      var ys = niceStep(yr[1] - yr[0], Math.max(1, Math.floor(ph / 34)));
      ctx.strokeStyle = SK.color('--color-grid'); ctx.fillStyle = SK.color('--color-ink-muted');
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      var dx = Math.max(0, -Math.floor(Math.log(xs) / Math.LN10)), dy = Math.max(0, -Math.floor(Math.log(ys) / Math.LN10));
      for (var x = Math.ceil(xr[0] / xs) * xs; x <= xr[1] + xs * 1e-6; x += xs) {
        ctx.beginPath(); ctx.moveTo(mx(x), padT); ctx.lineTo(mx(x), padT + ph); ctx.stroke();
        ctx.fillText(fmt(x, dx), mx(x), padT + ph + 4);
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      var lastLab = null;
      for (var y = yr[1] - ((yr[1] % ys) + ys) % ys; y >= yr[0] - ys * 1e-6; y -= ys) {   // 위에서부터: 글자끼리 겹치면 건너뜀
        ctx.beginPath(); ctx.moveTo(padL, my(y)); ctx.lineTo(padL + pw, my(y)); ctx.stroke();
        if (lastLab === null || Math.abs(my(y) - lastLab) >= fs + 2) { ctx.fillText(fmt(y, dy), padL - 6, my(y)); lastLab = my(y); }
      }
      ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 2;
      var y0 = (yr[0] <= 0 && yr[1] >= 0) ? my(0) : padT + ph;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph); ctx.moveTo(padL, y0); ctx.lineTo(padL + pw, y0); ctx.stroke();
      ctx.fillStyle = SK.color('--color-ink');
      ctx.font = '700 ' + fs + 'px ' + (cssVar('--font-sans') || 'sans-serif');
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      if (!small) {
        if (X.label) ctx.fillText(X.label + (X.unit ? ' (' + X.unit + ')' : ''), padL + pw, padT + ph - 4);
        ctx.save(); ctx.translate(14, padT + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (Y.label) ctx.fillText(Y.label + (Y.unit ? ' (' + Y.unit + ')' : ''), 0, 0);
        ctx.restore();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(padL, padT - 2, pw + 2, ph + 4); ctx.clip();
      eachLine(function (pts, st) { SK.drawPath(ctx, pts, { color: st.color, dash: st.dash, width: Math.max(2, st.width * 0.7) }, function (a, b) { return [mx(a), my(b)]; }); });
      ctx.restore();
    }
    view.onResize = function () { showAxes(); draw(); };
    SK.onRecords(function () { draw(); });
    draw({});
    showAxes();
    return { el: box, view: view, draw: draw, setAxis: function (ax, v) { if (ax === 'x') X = v; else Y = v; showAxes(); draw(); } };
  };

  /* ------------------------------------------------------------------
     13. 펼침 메뉴 · 수업 정보 · 키 · 교사 모드 · 커서 · 확대 금지 · 전체 화면
     ------------------------------------------------------------------ */
  function togglePop(menu) {
    if (openPop === menu) { closePop(); return; }
    closePop();
    menu.hidden = false; openPop = menu;
  }
  function closePop() {
    if (openPop) { openPop.hidden = true; openPop = null; }
    if (SK.el.infoPop && !SK.el.infoPop.hidden) { SK.el.infoPop.hidden = true; SK.el.infoBtn.setAttribute('aria-expanded', 'false'); }
  }
  function toggleInfo() {
    var p = SK.el.infoPop, was = !p.hidden;
    closePop();
    if (!was) { p.hidden = false; SK.el.infoBtn.setAttribute('aria-expanded', 'true'); }
  }
  function buildMoreMenu() {
    var m = SK.el.moreMenu; m.innerHTML = '';
    function item(label, fn, cls) {
      var b = h('button', { type: 'button', role: 'menuitem', class: cls || null }, label);
      b.addEventListener('click', function () { closePop(); fn(); });
      m.appendChild(b);
    }
    // R2(B2): 기록 모두 지우기 · 전체 화면 · 도움말 · 교사 모드 (+ 조작판 접기)
    item('기록 모두 지우기…', function () { SK.clearRecords(); }, 'is-danger');
    m.appendChild(h('hr'));
    item('전체 화면 켜기 / 끄기', function () { SK.toggleFullscreen(); });
    item('도움말 열기', function () { SK.toggleHelp(true); });
    item(SK.isTeacher() ? '교사 모드 끄기' : '교사 모드 켜기', function () { SK.toggleTeacher(); });
    item(SK.el.slide.classList.contains('is-collapsed') ? '조작판 다시 펴기' : '조작판 접기 (실험 화면 크게)', function () { SK.toggleCollapse(); });
  }
  document.addEventListener('pointerdown', function (e) {
    if (!openPop && (!SK.el.infoPop || SK.el.infoPop.hidden)) return;
    var t = e.target;
    if (t.closest && (t.closest('.pop-wrap') || t.closest('.sim-top__tools'))) return;
    closePop();
  }, true);

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
  /** A13: 교사 모드 — URL ?teacher=1 또는 H 를 3초 동안 누르기 */
  function setTeacher(on, quiet) {
    var html = document.documentElement;
    html.classList.toggle('is-teacher', on);
    html.classList.toggle('teacher', on);          // 예전 이름 호환 (convex-lens.css 의 html.teacher)
    if (!on && drawerEl) drawerEl.hidden = true;
    if (!quiet) SK.notice(on ? '교사 모드를 켰어요' : '교사 모드를 껐어요', 'info');
    dirty = true;
    if (cfg.onTeacher) cfg.onTeacher(on);
    if (SK.update && SK.el.status) { SK.el.status._sig = null; SK.update(); }
  }
  SK.toggleTeacher = function () { setTeacher(!SK.isTeacher()); };
  SK.setTeacher = function (on) { setTeacher(!!on); };
  SK.isTeacher = function () { return document.documentElement.classList.contains('is-teacher'); };
  SK.toggleCollapse = function () {
    var on = SK.el.slide.classList.toggle('is-collapsed');
    SK.notice(on ? '조작판을 접었어요 — T 키로 다시 펴요' : '조작판을 폈어요', 'info');
    if (on) SK.say('조작판을 접었어요. 그 밖의 기능 메뉴나 T 키로 다시 펴요', 5000);
    dirty = true;
  };

  var hDown = 0, hDone = false;
  function installKeys() {
    document.addEventListener('keyup', function (e) { if (e.code === 'KeyH') { hDown = 0; hDone = false; } });
    document.addEventListener('keydown', function (e) {
      var code = e.code;
      if (code === 'KeyH' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var now = Date.now();
        if (!e.repeat || !hDown) { hDown = now; hDone = false; }
        else if (!hDone && now - hDown >= 3000) { hDone = true; SK.toggleTeacher(); }
        e.preventDefault();
        return;
      }
      if (modal) {
        if (modal.onKey(e)) { e.preventDefault(); return; }
        if (code === 'KeyF' && !isTyping(e.target)) { e.preventDefault(); SK.toggleFullscreen(); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (isTyping(t)) return;
      for (var i = 0; i < keyHandlers.length; i++) { if (keyHandlers[i](e) === true) { e.preventDefault(); return; } }
      var isRange = t && t.tagName === 'INPUT' && t.type === 'range';
      if (isRange && /^(Arrow|Page|Home|End)/.test(code)) return;
      var isBtn = t && (t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || t.tagName === 'A');
      if (isBtn && (code === 'Space' || code === 'Enter' || code === 'NumpadEnter')) return;
      if (e.key === '?' || (code === 'Slash' && e.shiftKey)) { e.preventDefault(); SK.toggleHelp(); return; }

      var m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
      if (m) {
        var n = +m[1];
        if (n <= 5 && !e.repeat) { e.preventDefault(); if (presets[n - 1]) SK.applyPreset(n - 1); else SK.notice(n + '번 실험 카드는 없어요', 'info'); }
        return;
      }
      var handled = true;
      switch (code) {
        case 'KeyF': if (!e.repeat) SK.toggleFullscreen(); break;
        case 'ArrowRight': case 'PageDown': SK.nextStep(); break;
        case 'ArrowLeft': case 'PageUp': SK.prevStep(); break;
        case 'Space': if (!e.repeat) SK.toggle(); break;
        case 'KeyR': if (!e.repeat) SK.resetDefaults(); break;
        case 'KeyS': if (!e.repeat) SK.record(); break;
        case 'KeyC': if (!e.repeat) SK.clearRecords(); break;
        case 'Comma': SK.stepFrame(-1); break;
        case 'Period': SK.stepFrame(1); break;
        case 'BracketLeft': cycleSpeed(-1); break;
        case 'BracketRight': cycleSpeed(1); break;
        case 'KeyT': if (!e.repeat) SK.toggleCollapse(); break;
        case 'Escape': handleEsc(); break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    });
  }
  function handleEsc() {
    if (openPop || (SK.el.infoPop && !SK.el.infoPop.hidden)) { closePop(); return; }
    if (helpEl && !helpEl.hidden) { SK.toggleHelp(false); return; }
    if (drawerEl && !drawerEl.hidden) { SK.toggleGuide(false); return; }
    if (tipEl && !tipEl.hidden) { tipEl.hidden = true; return; }
    if (document.activeElement && document.activeElement !== document.body) { document.activeElement.blur(); }
    var now = Date.now();
    if (now - lastEsc < 1500) { location.href = cfg.hubHref; return; }
    lastEsc = now;
    SK.notice('Esc 를 한 번 더 누르면 허브로 가요', 'info', 1500);
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
  }

  /**
   * R2(G6): 실험 화면의 모서리 칩(상태 칩·카드 칩·보기 범위 버튼)이 위·아래에서 차지하는 높이.
   * 반환 {top, bottom} 은 캔버스 논리 단위(view 좌표). 라벨·궤적을 이 띠 밖으로 두면 칩과 겹치지 않는다.
   */
  SK.stageInset = function () {
    var st = SK.el.stage; if (!st) return { top: 0, bottom: 0 };
    var sr = st.getBoundingClientRect(), top = 0, bottom = 0;
    [SK.el.cornerTL, SK.el.cornerTR].forEach(function (c) {
      if (!c || !c.offsetHeight) return;
      var r = c.getBoundingClientRect(); top = Math.max(top, r.bottom - sr.top);
    });
    [SK.el.cornerBL, SK.el.cornerBR].forEach(function (c) {
      if (!c || !c.offsetHeight) return;
      var r = c.getBoundingClientRect(); bottom = Math.max(bottom, sr.bottom - r.top);
    });
    var s = (SK.view && SK.view.scale) || 1, oy = (SK.view && SK.view.oy) || 0;
    return { top: Math.max(0, (top - oy) / s), bottom: Math.max(0, (bottom - oy) / s), px: { top: top, bottom: bottom } };
  };

  global.SimKit = SK;
})(window);
