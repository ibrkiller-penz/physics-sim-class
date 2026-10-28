/* =====================================================================
   이중 슬릿: 빛에서 전자 하나까지 (double-slit-quantum) — 2026-10-28
   공통 틀 SimKit(../../shared/sim.js) 위에서 동작. 일반 <script>, file:// 동작.
   명세: docs/04_팀장결정서.md §4-2

   [물리 모델]  y = 스크린 위 위치(mm, 위쪽 +), 모든 계산은 SI 를 mm 로 환산
     두 슬릿:   I(y) = cos²(π d y / λL) · sinc²(π a y / λL)        (a = 슬릿 폭 0.05 mm 고정, 심화에서만 변경)
     한 슬릿:   I(y) = sinc²(π a (y − y_s) / λL),  y_s = ±d/2
     측정기 켬: I(y) = ½[sinc²(…(y − d/2)) + sinc²(…(y + d/2))]    (간섭항 없음, 확률을 더함)
     구슬:      한 슬릿을 무작위로 골라 곧게 지남. 발사기(슬릿 앞 S = 0.1 m)에서 퍼져 나간 구슬의
                그림자 중심 y_s·(S+L)/S + 가우스 흩어짐 σ = 0.6 mm → 두 띠
     무늬 간격: Δy = λL/d   (650 nm, 0.25 mm, 2.0 m → 5.2 mm / 450 nm → 3.6 mm)
     점 뽑기:   [−30, 30] mm 를 0.05 mm 칸 1200 개로 나눈 누적 분포표의 역함수 표본
     드브로이:  λ = h / √(2 m_e e V)  (100 V → 0.123 nm, 정성 표시만)

   [화면 축척]  실험 화면 논리 좌표 1250×700 (1 = 1u)
     스크린 세로 600u = 실제 ±30 mm → 10 u/mm  ("스크린 ×20 확대" 표시)
     확대창 360×360u = 가운데 ±15 mm → 12 u/mm  (×24)
     슬릿판~스크린 거리 그림, 슬릿 간격 그림, 파면의 파장은 모형(축척 아님)
   ===================================================================== */
(function (global) {
  'use strict';

  /* ==================================================================
     1. 물리 (순수 함수 — node 검산용으로 global.DSQPhys 에 내보냄)
     ================================================================== */
  var Y_MIN = -30, Y_MAX = 30;      // 스크린 범위 (mm)
  var CDF_STEP = 0.05;              // 누적 분포표 칸 (mm)
  var NB = Math.round((Y_MAX - Y_MIN) / CDF_STEP);  // 1200
  var HIST_W = 0.5;                 // 히스토그램 칸 (mm)
  var NH = Math.round((Y_MAX - Y_MIN) / HIST_W);    // 120
  var S_SRC = 0.1;                  // 구슬 발사기 ~ 슬릿 (m)
  var MARBLE_SIGMA = 0.6;           // 구슬 흩어짐 (mm)
  var H_PLANCK = 6.62607015e-34, M_E = 9.1093837015e-31, Q_E = 1.602176634e-19;

  function sinc(x) { return Math.abs(x) < 1e-12 ? 1 : Math.sin(x) / x; }

  /** g = {kind:'wave'|'photon'|'electron'|'marble', lamNm, dMm, Lm, aMm, slit:'both'|'top'|'bottom', det} */
  function intensity(g, y) {
    if (g.kind === 'marble') {
      var M = (S_SRC + g.Lm) / S_SRC, c = g.dMm / 2 * M, s2 = 2 * MARBLE_SIGMA * MARBLE_SIGMA;
      var gt = Math.exp(-(y - c) * (y - c) / s2), gb = Math.exp(-(y + c) * (y + c) / s2);
      if (g.slit === 'top') return gt;
      if (g.slit === 'bottom') return gb;
      return 0.5 * (gt + gb);
    }
    var lamMm = g.lamNm * 1e-6, Lmm = g.Lm * 1e3;
    var k = Math.PI / (lamMm * Lmm);
    function env(yy) { var s = sinc(k * g.aMm * yy); return s * s; }
    if (g.slit === 'top') return env(y - g.dMm / 2);
    if (g.slit === 'bottom') return env(y + g.dMm / 2);
    if (g.det && g.kind !== 'wave') return 0.5 * (env(y - g.dMm / 2) + env(y + g.dMm / 2));
    var c2 = Math.cos(k * g.dMm * y);
    return c2 * c2 * env(y);
  }
  /** 이론 무늬 간격 Δy = λL/d (mm) */
  function fringe(g) { return g.lamNm * 1e-6 * g.Lm * 1e3 / g.dMm; }
  /** 구슬 두 띠 사이 거리 (mm) */
  function marbleGap(g) { return g.dMm * (S_SRC + g.Lm) / S_SRC; }
  function deBroglieNm(V) { return H_PLANCK / Math.sqrt(2 * M_E * Q_E * V) * 1e9; }

  function buildDist(g) {
    var pdf = new Float64Array(NB), cdf = new Float64Array(NB + 1), imax = 0;
    for (var i = 0; i < NB; i++) {
      var v = intensity(g, Y_MIN + (i + 0.5) * CDF_STEP);
      pdf[i] = v; cdf[i + 1] = cdf[i] + v; if (v > imax) imax = v;
    }
    return { pdf: pdf, cdf: cdf, total: cdf[NB], imax: imax };
  }
  /** 역함수 표본: 칸을 이분 탐색으로 찾고 칸 안에서는 선형 */
  function sampleDist(dist, rnd) {
    var u = rnd() * dist.total, lo = 0, hi = NB - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (dist.cdf[mid + 1] <= u) lo = mid + 1; else hi = mid; }
    var p = dist.pdf[lo], f = p > 0 ? (u - dist.cdf[lo]) / p : 0.5;
    return Y_MIN + (lo + Math.min(Math.max(f, 0), 1)) * CDF_STEP;
  }
  /** 표본 성분: 간섭이면 하나(어느 슬릿인지 정해지지 않음), 측정기·구슬이면 슬릿별 둘 */
  function buildComps(g) {
    var split = g.slit === 'both' && (g.kind === 'marble' || (g.det && g.kind !== 'wave'));
    if (!split) return [{ slit: g.slit === 'both' ? null : g.slit, dist: buildDist(g) }];
    var gt = copy(g), gb = copy(g); gt.slit = 'top'; gb.slit = 'bottom';
    return [{ slit: 'top', dist: buildDist(gt) }, { slit: 'bottom', dist: buildDist(gb) }];
  }
  function sampleComps(comps, rnd) {
    var c = comps.length === 1 ? comps[0] : comps[rnd() < 0.5 ? 0 : 1];
    return { y: sampleDist(c.dist, rnd), slit: c.slit };
  }
  function copy(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }

  /** 파장 → 화면 색 (Bruton 근사, 0~255) */
  function lamRGB(nm) {
    var r, g, b;
    if (nm < 440) { r = (440 - nm) / 60; g = 0; b = 1; }
    else if (nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { r = 0; g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; b = 0; }
    else { r = 1; g = 0; b = 0; }
    var f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1;
    function c(x) { x = Math.max(0, Math.min(1, x)); return Math.round(255 * Math.pow(x * f, 0.8)); }
    return [c(r), c(g), c(b)];
  }

  var Phys = {
    Y_MIN: Y_MIN, Y_MAX: Y_MAX, CDF_STEP: CDF_STEP, NB: NB, HIST_W: HIST_W, NH: NH, S_SRC: S_SRC, MARBLE_SIGMA: MARBLE_SIGMA,
    sinc: sinc, intensity: intensity, fringe: fringe, marbleGap: marbleGap, deBroglieNm: deBroglieNm,
    buildDist: buildDist, sampleDist: sampleDist, buildComps: buildComps, sampleComps: sampleComps, lamRGB: lamRGB
  };
  global.DSQPhys = Phys;
  if (typeof global.SimKit === 'undefined' || typeof document === 'undefined') return;   // node 검산

  /* ==================================================================
     2. 화면 상수 (논리 좌표 u)
     ================================================================== */
  var SK = global.SimKit;
  var SCR_X = 730, SCR_W = 60, SCR_TOP = 50, SCR_H = 600, Y0 = 350, PX_MM = 10;
  var GH_X = 796, GH_W = 24;                       // 직전 무늬 띠
  var RUL_X = 826;                                 // mm 눈금자
  var ZX = 880, ZY = 14, ZW = 360, ZH = 360, Z_RANGE = 15, ZPX = ZH / (2 * Z_RANGE);  // 확대창
  var PROF_W = 100;                                // 스크린 왼쪽 세기 곡선 폭
  var SRC_R = 130;                                 // 광원 오른쪽 끝 x
  var DS = 2;                                      // 오프스크린 해상도 배율
  var T_FLY1 = 0.25, T_FLY2 = 0.25;                // 날아가는 시간(광원→슬릿, 슬릿→스크린)
  var DOT_CAP = 50000;
  var MAG_MAIN = 20, MAG_ZOOM = Math.round(MAG_MAIN * ZPX / PX_MM);   // ×24
  var FONT = '';
  var KIND_LABEL = { wave: '빛 파동', photon: '광자 하나씩', electron: '전자 하나씩', marble: '작은 구슬' };
  var RATE_LEVELS = [1, 20, 1000];
  var DIST_KEYS = { lam: 1, d: 1, L: 1, lamR: 1, dR: 1, LR: 1, a: 1, slit: 1, det: 1 };

  /* ---- 상태 ---- */
  var entrance = 'physics';
  var cur = null;            // 지금 분포를 만든 값 {p, g, comps, imax, Z}
  /* 히스토그램: 0.1 mm 고운 칸에 쌓고, 그릴 때 무늬 간격에 맞춰 묶는다.
     기본(Δy 5.2 mm)은 0.5 mm 칸(명세 그대로). Δy 가 작아지면(예: d 0.5 mm·L 0.5 m → 0.4~1.3 mm)
     칸을 0.1~0.4 mm 로 줄여 줄무늬가 칸에 뭉개지지 않게 한다(칸 ≤ Δy/4). */
  var HF_W = 0.1, NHF = Math.round((Y_MAX - Y_MIN) / HF_W);   // 600
  var count = 0, sinceFade = 0, histF = new Float64Array(NHF), hview = null;
  function histK() {
    if (!cur) return 5;
    var g = cur.g, fr = g.kind !== 'marble' && g.slit === 'both' && !(g.det && g.kind !== 'wave');
    if (!fr) return 5;
    return Math.max(1, Math.min(5, Math.floor(fringe(g) / HF_W / 4)));
  }
  /** 지금 그릴 히스토그램 {w 칸 폭, n 칸 수, h 개수 배열} (개수·칸 폭이 그대로면 다시 쓰기) */
  function histView() {
    var k = histK();
    if (hview && hview.k === k && hview.count === count) return hview;
    var n = NHF / k, h = new Float64Array(n);
    for (var i = 0; i < NHF; i++) h[Math.floor(i / k)] += histF[i];
    hview = { k: k, w: HF_W * k, n: n, h: h, count: count };
    return hview;
  }
  var emitAcc = 0, flyers = [], lastDot = null, flash = { top: -9, bottom: -9 };
  var hadRun = false;
  var meas = { a: null, b: null, n: 1, drag: false, fresh: false, y0: 0 };
  var ghostRef = null, ghostDots = null, ghostPat = null, ghostPatRef = null;
  var burst = false, burstTimer = 0;
  var graphMode = 'rel';
  var dotsCv, dotsCtx, zoomCv, zoomCtx, patCv, zpatCv;
  var ui = {};               // DOM 참조

  /* 값 환산: 전자 모드는 '상대 크기' → 내부 SI */
  function geomOf(p) {
    var el = p.send === 'electron';
    return {
      kind: p.send,
      lamNm: el ? 130 * p.lamR : p.lam,
      dMm: el ? 0.05 * p.dR : p.d,
      Lm: el ? 0.4 * p.LR : p.L,
      aMm: p.a, slit: p.slit, det: !!p.det
    };
  }
  function isQuantum(k) { return k === 'photon' || k === 'electron'; }
  function unitY(p) { return p.send === 'electron' ? '눈금' : 'mm'; }

  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.round(w * DS); c.height = Math.round(h * DS); return c; }
  function rgbStr(c, a) { return a === undefined ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lighten(c, t) { return [Math.round(c[0] + (255 - c[0]) * t), Math.round(c[1] + (255 - c[1]) * t), Math.round(c[2] + (255 - c[2]) * t)]; }
  function darken(c, t) { return [Math.round(c[0] * t), Math.round(c[1] * t), Math.round(c[2] * t)]; }
  /** 곡선·막대 색 (종이 바탕 위) */
  function curveColor(p) {
    if (p.send === 'electron') return SK.color('--color-sim-slit');
    if (p.send === 'marble') return SK.color('--color-copper');
    return rgbStr(darken(lamRGB(p.lam), 0.72));
  }
  /** 점 색 (어두운 스크린 위) */
  function dotColor(p) {
    if (p.send === 'electron') return SK.color('--color-sim-slit-tint');
    if (p.send === 'marble') return SK.color('--color-copper-tint');
    return rgbStr(lighten(lamRGB(p.lam), 0.35));
  }
  function waveColor(p, a) {
    if (p.send === 'electron') { return SK.color('--color-sim-slit'); }
    return rgbStr(lamRGB(p.lam), a);
  }
  function yToScr(y) { return Y0 - y * PX_MM; }
  function yToZoom(y) { return ZY + ZH / 2 - y * ZPX; }
  function zoomToY(py) { return (ZY + ZH / 2 - py) / ZPX; }
  function slitX(g) { var Lv = Math.max(0.5, Math.min(3.0, g.Lm)); return SCR_X - (60 + 150 * Lv); }
  function slitSep(g) { return 60 + (Math.max(0.1, Math.min(0.5, g.dMm)) - 0.1) / 0.4 * 140; }
  function slitOpenH(g) { return 4 + g.aMm * 160; }
  function waveLen(g) { return 26 * g.lamNm / 650; }
  function fmtN(n) { return Math.round(n).toLocaleString('ko-KR'); }

  /* ==================================================================
     3. 분포·점 쌓기
     ================================================================== */
  function rebuild(p) {
    var g = geomOf(p);
    var comps = (g.kind === 'wave') ? null : buildComps(g);
    var dist = buildDist(g);             // 이론 곡선(세기)용 — 한 번에 1200 칸
    cur = { p: copy(p), g: g, comps: comps, dist: dist, imax: dist.imax || 1, Z: dist.total * CDF_STEP };
    buildPattern();
  }
  function clearDots() {
    count = 0; sinceFade = 0; histF = new Float64Array(NHF); hview = null; emitAcc = 0; flyers = []; lastDot = null;
    dotsCtx.setTransform(1, 0, 0, 1, 0, 0); dotsCtx.clearRect(0, 0, dotsCv.width, dotsCv.height);
    zoomCtx.setTransform(1, 0, 0, 1, 0, 0); zoomCtx.clearRect(0, 0, zoomCv.width, zoomCv.height);
  }
  /** 빛 파동 모드의 연속 밝기 띠 (스크린·확대창) */
  function buildPattern() {
    var col = lamRGB(cur.p.send === 'electron' ? 650 : cur.p.lam);
    function paint(cv, rows, toY) {
      var c = cv.getContext('2d'), img = c.createImageData(1, rows);
      for (var j = 0; j < rows; j++) {
        var f = intensity(cur.g, toY(j + 0.5)) / cur.imax, o = j * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = Math.round(255 * Math.min(1, f));
      }
      c.putImageData(img, 0, 0);
    }
    paint(patCv, SCR_H, function (j) { return Y_MAX - j / PX_MM; });
    paint(zpatCv, ZH, function (j) { return Z_RANGE - j / ZPX; });
  }
  function deposit(y) {
    count++; sinceFade++;
    var hb = Math.floor((y - Y_MIN) / HF_W); if (hb >= 0 && hb < NHF) histF[hb]++;
    var col = dotColor(cur.p);
    dotsCtx.fillStyle = col;
    var x = 5 + Math.random() * (SCR_W - 10), yy = (Y_MAX - y) * PX_MM;
    dotsCtx.beginPath(); dotsCtx.arc(x * DS, yy * DS, 3 * DS, 0, 6.2832); dotsCtx.fill();
    if (Math.abs(y) < Z_RANGE) {
      zoomCtx.fillStyle = col;
      var zx = 5 + Math.random() * (ZW - 10), zy = (Z_RANGE - y) * ZPX;
      zoomCtx.beginPath(); zoomCtx.arc(zx * DS, zy * DS, 3 * DS, 0, 6.2832); zoomCtx.fill();
    }
    if (sinceFade >= DOT_CAP) fadeDots();
    lastDot = { y: y, t: SK.time };
  }
  /** 5만 개마다 오래된 점을 흐리게 (히스토그램·개수는 그대로) */
  function fadeDots() {
    sinceFade = 0;
    [dotsCtx, zoomCtx].forEach(function (c) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'destination-out'; c.globalAlpha = 0.6;
      c.fillStyle = SK.color('--color-ink'); c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      c.restore();
    });
  }
  function emitOne(p, rate) {
    var s = sampleComps(cur.comps, Math.random);
    if (rate <= 60) {
      if (flyers.length < 200) flyers.push({ t0: SK.time, y: s.y, slit: s.slit, dep: true });
      else deposit(s.y);
    } else {
      deposit(s.y);
      if (flyers.length < 12 && Math.random() < 30 / rate) flyers.push({ t0: SK.time, y: s.y, slit: s.slit, dep: false });
    }
  }
  function skipMany(n) {
    if (!cur || cur.p.send === 'wave') { SK.notice('1만 개 건너뛰기는 하나씩 보내는 모드에서 써요', 'info'); return; }
    if (!SK.started) SK.stepFrame(1);   // 실행 시작으로 표시 (기록 S 가능)
    if (SK.stepName === '예측') SK.goStep(1);
    for (var i = 0; i < n; i++) deposit(sampleComps(cur.comps, Math.random).y);
    hadRun = true;
    SK.notice(fmtN(n) + '개를 한꺼번에 보냈어요 (모두 ' + fmtN(count) + '개)', 'ok', 2000);
    SK.requestRender();
  }
  function hasData() { return cur && ((cur.p.send === 'wave' && hadRun) || count >= 30); }

  /* 직전 무늬: 실행 중에 '즉시' 값이 바뀌면 바뀌기 전 무늬를 직전 실행으로 남긴다 (끄는 동안은 한 번만) */
  /* [고도화] 값이 바뀌면 SimKit 의 '새 실행'으로 넘긴다(SK.reset). 전에는 같은 실행 안에서 무늬만 바꿔서
     λ 를 바꾸거나 측정기를 켠 뒤 S 를 누르면 "이 실행은 이미 기록했어요"로 막혀
     프리셋 2(빨강→파랑)·5(측정기 끔→켬)의 '기록 두 개 비교'가 R 없이는 안 됐다.
     직전 무늬는 바꾸기 전 값(oldP)으로 남기고, 실행 중이었으면 이어서 실행한다. */
  var suppressCapture = false;
  function onDistChange() {
    var oldP = cur ? copy(cur.p) : null, keep = !burst && hasData();
    var wasRunning = SK.running;
    burst = true; clearTimeout(burstTimer);
    burstTimer = setTimeout(function () { burst = false; }, 700);
    suppressCapture = !keep;
    SK.reset();                 // capture() → 직전 무늬(바꾸기 전), reset() → 새 분포·점 지우기
    suppressCapture = false;
    if (keep && SK.ghost && oldP) { SK.ghost.params = oldP; ghostPatRef = null; if (ui.recTable) ui.recTable.render(); }
    if (wasRunning) SK.play();
    SK.requestRender();
  }
  function snapshotGhostDots() {
    ghostRef = SK.ghost;
    if (count > 0 && cur.p.send !== 'wave') {
      ghostDots = makeCanvas(SCR_W, SCR_H);
      ghostDots.getContext('2d').drawImage(dotsCv, 0, 0);
    } else ghostDots = null;
  }

  /* ==================================================================
     4. 측정 (확대창)
     ================================================================== */
  function clearMeasure() { meas.a = null; meas.b = null; meas.drag = false; }
  function measuredGap() {
    if (meas.a === null || meas.b === null) return null;
    return Math.abs(meas.a - meas.b) / meas.n;
  }
  var BTN = {
    minus: { x: 1012, y: 432, w: 72, h: 72 },
    plus: { x: 1168, y: 432, w: 72, h: 72 },
    clear: { x: 1056, y: 586, w: 184, h: 72 }
  };
  function inRect(pt, r) { return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h; }
  function installPointer() {
    var cv = SK.view.canvas, active = null;
    cv.addEventListener('pointerdown', function (e) {
      var pt = SK.view.toLogical(e);
      if (pt.x >= ZX && pt.x <= ZX + ZW && pt.y >= ZY && pt.y <= ZY + ZH) {
        var y = Math.max(-Z_RANGE, Math.min(Z_RANGE, zoomToY(pt.y)));
        if (meas.a !== null && meas.b === null) { meas.b = y; meas.fresh = false; }
        else { meas.a = y; meas.b = null; meas.fresh = true; meas.y0 = pt.y; }
        meas.drag = true; active = e.pointerId;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        SK.requestRender(); e.preventDefault(); return;
      }
      if (inRect(pt, BTN.minus)) { meas.n = Math.max(1, meas.n - 1); SK.requestRender(); return; }
      if (inRect(pt, BTN.plus)) { meas.n = Math.min(10, meas.n + 1); SK.requestRender(); return; }
      if (inRect(pt, BTN.clear)) { clearMeasure(); SK.requestRender(); return; }
      // 슬릿을 직접 눌러 막기·열기
      if (cur) {
        var g = cur.g, sx = slitX(g), sep = slitSep(g);
        if (Math.abs(pt.x - sx) < 36) {
          var which = Math.abs(pt.y - (Y0 - sep / 2)) < 36 ? 'top' : Math.abs(pt.y - (Y0 + sep / 2)) < 36 ? 'bottom' : null;
          if (which) {
            var s = SK.get('slit');
            var nv = s === 'both' ? (which === 'top' ? 'bottom' : 'top') : (s === which ? 'both' : s);
            if (nv !== s) SK.set('slit', nv);
          }
        }
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (!meas.drag || e.pointerId !== active) return;
      var pt = SK.view.toLogical(e);
      var y = Math.max(-Z_RANGE, Math.min(Z_RANGE, zoomToY(pt.y)));
      if (meas.fresh) { if (Math.abs(pt.y - meas.y0) > 8) meas.b = y; }
      else meas.b = y;
      SK.requestRender();
    });
    function up(e) { if (e.pointerId === active) { meas.drag = false; active = null; SK.requestRender(); } }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  /* ==================================================================
     5. 기록용 결과
     ================================================================== */
  function theoryText(p, g) {
    if (p.send === 'marble') return '—';
    if (p.slit !== 'both' || (p.det && p.send !== 'wave')) return '줄무늬 없음';
    return SK.fmt(fringe(g), 1) + ' ' + unitY(p);
  }
  function captureFrom(p) {
    var g = geomOf(p), pts = [], imax = 0, i, y;
    var vals = [];
    for (i = 0; i <= 600; i++) { y = Y_MIN + i * 0.1; var v = intensity(g, y); vals.push(v); if (v > imax) imax = v; }
    for (i = 0; i <= 600; i++) pts.push([Y_MIN + i * 0.1, vals[i] / (imax || 1)]);
    var el = p.send === 'electron', mg = measuredGap();
    return {
      series: { I: pts },
      values: {
        lamT: p.send === 'marble' ? '—' : el ? '상대 ' + p.lamR : p.lam + ' nm',
        dT: el ? '상대 ' + p.dR : SK.fmt(p.d, 2) + ' mm',
        LT: el ? '상대 ' + p.LR : SK.fmt(p.L, 1) + ' m',
        count: p.send === 'wave' ? '—' : count,
        meas: mg === null ? '–' : SK.fmt(mg, 2) + ' ' + unitY(p),
        theo: theoryText(p, g)
      }
    };
  }

  /* ==================================================================
     6. 그리기
     ================================================================== */
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.w || 600) + ' ' + (o.size || 20) + 'px ' + FONT;
    ctx.fillStyle = SK.color(o.color || '--color-ink');
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
    ctx.fillText(s, x, y);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawSource(ctx, p) {
    var k = p.send, x = 20, w = SRC_R - 20, h = 92, y = Y0 - h / 2;
    ctx.fillStyle = SK.color('--color-ink-muted');
    roundRect(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = SK.color('--color-paper-raised');
    if (k === 'wave' || k === 'photon') {
      ctx.fillRect(x + w - 10, Y0 - 10, 14, 20);
      ctx.fillStyle = rgbStr(lamRGB(p.lam)); ctx.beginPath(); ctx.arc(x + 30, Y0, 12, 0, 6.2832); ctx.fill();
    } else if (k === 'electron') {
      ctx.strokeStyle = SK.color('--color-sim-slit-tint'); ctx.lineWidth = 3;
      ctx.beginPath(); for (var i = 0; i < 4; i++) { ctx.moveTo(x + 18 + i * 10, Y0 - 14); ctx.lineTo(x + 23 + i * 10, Y0 + 14); } ctx.stroke();
      ctx.fillRect(x + w - 10, Y0 - 6, 14, 12);
    } else {
      ctx.beginPath(); ctx.moveTo(x + 14, y + 14); ctx.lineTo(x + 60, y + 14); ctx.lineTo(x + 44, Y0); ctx.lineTo(x + 30, Y0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = SK.color('--color-copper-tint');
      for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x + 26 + j * 12, y + 24, 5, 0, 6.2832); ctx.fill(); }
      ctx.fillStyle = SK.color('--color-paper-raised'); ctx.fillRect(x + w - 10, Y0 - 8, 14, 16);
    }
    var name = { wave: '레이저', photon: '아주 약한 빛', electron: '전자총', marble: '구슬 발사기' }[k];
    txt(ctx, name, x + w / 2, y + h + 22, { align: 'center', size: 22, w: 700 });
    if (isQuantum(k) || k === 'marble') txt(ctx, '하나씩 보내요', x + w / 2, y + h + 48, { align: 'center', size: 20, w: 500, color: '--color-ink-muted' });
  }

  function drawSlitPlate(ctx, p, g) {
    var sx = slitX(g), sep = slitSep(g), oh = slitOpenH(g), w = 14;
    var ys = { top: Y0 - sep / 2, bottom: Y0 + sep / 2 };
    ctx.fillStyle = SK.color('--color-line-strong');
    ctx.fillRect(sx - w / 2, SCR_TOP, w, ys.top - oh / 2 - SCR_TOP);
    ctx.fillRect(sx - w / 2, ys.top + oh / 2, w, ys.bottom - oh / 2 - (ys.top + oh / 2));
    ctx.fillRect(sx - w / 2, ys.bottom + oh / 2, w, SCR_TOP + SCR_H - (ys.bottom + oh / 2));
    ['top', 'bottom'].forEach(function (s) {
      var blocked = p.slit !== 'both' && p.slit !== s;
      if (blocked) {
        ctx.fillStyle = SK.color('--color-copper');
        roundRect(ctx, sx - 14, ys[s] - oh / 2 - 12, 28, oh + 24, 4); ctx.fill();
        txt(ctx, '막음', sx - 22, ys[s], { align: 'right', size: 20, w: 700, color: '--color-copper-text' });
      }
    });
    txt(ctx, '이중 슬릿', sx, SCR_TOP - 22, { align: 'center', size: 22, w: 700 });
    // 측정기 (어느 슬릿을 지났는지 알아내는 장치)
    if (p.det && p.send !== 'wave') {
      ['top', 'bottom'].forEach(function (s) {
        if (p.slit !== 'both' && p.slit !== s) return;
        var on = SK.time - flash[s] < 0.18;
        ctx.fillStyle = SK.color(on ? '--color-copper' : '--color-copper-tint');
        ctx.strokeStyle = SK.color('--color-copper'); ctx.lineWidth = 3;
        roundRect(ctx, sx + 12, ys[s] - (s === 'top' ? 44 : -16), 40, 28, 5); ctx.fill(); ctx.stroke();
      });
      txt(ctx, '측정기', sx + 56, ys.top - 30, { size: 20, w: 700, color: '--color-copper-text' });
    }
    // 거리 L 표시
    var yL = SCR_TOP + SCR_H + 22;
    SK.arrow(ctx, sx + 4, yL, SCR_X - 4, yL, { color: '--color-line-strong', width: 2, head: 10 });
    SK.arrow(ctx, SCR_X - 4, yL, sx + 4, yL, { color: '--color-line-strong', width: 2, head: 10 });
    var Ltxt = p.send === 'electron' ? '스크린 거리 (상대 ' + p.LR + ')' : 'L = ' + SK.fmt(p.L, 1) + ' m (모형)';
    ctx.fillStyle = SK.color('--color-paper-raised');
    ctx.fillRect((sx + SCR_X) / 2 - 110, yL - 14, 220, 28);
    txt(ctx, Ltxt, (sx + SCR_X) / 2, yL, { align: 'center', size: 20, w: 600, color: '--color-ink-muted' });
    return { sx: sx, ys: ys };
  }

  function drawWaves(ctx, p, g, geo) {
    var k = p.send; if (k === 'marble' || !SK.params.showWave) return;
    var lv = waveLen(g), ph = (SK.time * 1.2) % 1, strong = k === 'wave';
    ctx.save();
    ctx.globalAlpha = strong ? 0.6 : 0.3;
    ctx.strokeStyle = waveColor(p); ctx.lineWidth = strong ? 3 : 2;
    // 광원 → 슬릿: 평면파
    var half = slitSep(g) / 2 + 40;
    ctx.beginPath();
    for (var x = geo.sx - 8 - ((1 - ph) * lv) % lv; x > SRC_R + 4; x -= lv) { ctx.moveTo(x, Y0 - half); ctx.lineTo(x, Y0 + half); }
    ctx.stroke();
    // 슬릿 → 스크린: 원형 파면
    ctx.beginPath(); ctx.rect(geo.sx + 8, SCR_TOP, SCR_X - geo.sx - 8, SCR_H); ctx.clip();
    var rmax = Math.sqrt(Math.pow(SCR_X - geo.sx, 2) + Math.pow(SCR_H, 2));
    ['top', 'bottom'].forEach(function (s) {
      if (p.slit !== 'both' && p.slit !== s) return;
      ctx.beginPath();
      for (var r = ph * lv; r < rmax; r += lv) { if (r < 2) continue; ctx.moveTo(geo.sx + r, geo.ys[s]); ctx.arc(geo.sx, geo.ys[s], r, 0, Math.PI / 2); ctx.moveTo(geo.sx, geo.ys[s] - r); ctx.arc(geo.sx, geo.ys[s], r, -Math.PI / 2, 0); }
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawFlyers(ctx, p, g, geo) {
    var col = dotColor(p), dark = curveColor(p);
    var dist = SCR_X - geo.sx;
    flyers.forEach(function (f) {
      var age = SK.time - f.t0, x, y;
      if (age < T_FLY1) {
        var u = age / T_FLY1;
        var ty = f.slit ? geo.ys[f.slit] : Y0;
        x = SRC_R + (geo.sx - SRC_R) * u; y = Y0 + (ty - Y0) * u;
        if (isQuantum(p.send) && !f.slit) {
          ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.2832); ctx.fill(); ctx.restore();
        }
        ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fill();
      } else if (age < T_FLY1 + T_FLY2) {
        var v = (age - T_FLY1) / T_FLY2;
        if (f.slit) {   // 구슬·측정기: 지난 슬릿이 정해짐 → 곧은 길
          var sy = geo.ys[f.slit], ey = yToScr(f.y);
          x = geo.sx + dist * v; y = sy + (ey - sy) * v;
          ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, p.send === 'marble' ? 7 : 5, 0, 6.2832); ctx.fill();
        } else {        // 정해지지 않음: 두 슬릿에서 함께 퍼지는 확률 파동
          ctx.save(); ctx.globalAlpha = 0.45 * (1 - v * 0.6); ctx.strokeStyle = dark; ctx.lineWidth = 3;
          ['top', 'bottom'].forEach(function (s) {
            if (p.slit !== 'both' && p.slit !== s) return;
            ctx.beginPath(); ctx.arc(geo.sx, geo.ys[s], Math.max(1, dist * v), -1.2, 1.2); ctx.stroke();
          });
          ctx.restore();
        }
      }
    });
    // 방금 닿은 점 강조
    if (lastDot && SK.time - lastDot.t < 0.35 && SK.params.rate <= 60) {
      ctx.strokeStyle = col; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(SCR_X + SCR_W / 2, yToScr(lastDot.y), 14, 0, 6.2832); ctx.stroke();
    }
  }

  function drawScreen(ctx, p) {
    ctx.fillStyle = SK.color('--color-ink');
    ctx.fillRect(SCR_X, SCR_TOP, SCR_W, SCR_H);
    if (p.send === 'wave') ctx.drawImage(patCv, SCR_X, SCR_TOP, SCR_W, SCR_H);
    else if (SK.params.showDots) ctx.drawImage(dotsCv, SCR_X, SCR_TOP, SCR_W, SCR_H);
    txt(ctx, '스크린', SCR_X + SCR_W / 2, SCR_TOP - 34, { align: 'center', size: 22, w: 700 });
    txt(ctx, '×' + MAG_MAIN + ' 확대', SCR_X + SCR_W / 2, SCR_TOP - 12, { align: 'center', size: 20, w: 600, color: '--color-sim-slit-text' });
    // 직전 무늬 띠
    ctx.fillStyle = SK.color('--color-ink');
    ctx.fillRect(GH_X, SCR_TOP, GH_W, SCR_H);
    if (SK.ghost) {
      ctx.save(); ctx.globalAlpha = 0.45;
      if (SK.ghost === ghostRef && ghostDots) ctx.drawImage(ghostDots, GH_X, SCR_TOP, GH_W, SCR_H);
      else {
        if (ghostPatRef !== SK.ghost) { ghostPat = buildGhostPat(SK.ghost); ghostPatRef = SK.ghost; }
        if (ghostPat) ctx.drawImage(ghostPat, GH_X, SCR_TOP, GH_W, SCR_H);
      }
      ctx.restore();
    }
    txt(ctx, '직전', GH_X + GH_W / 2, SCR_TOP + SCR_H + 16, { align: 'center', size: 20, w: 600, color: '--color-ink-muted' });
  }
  function buildGhostPat(gh) {
    var pts = gh.series && gh.series.I; if (!pts) return null;
    var gp = gh.params || {};
    var col = gp.send === 'electron' ? SK.color('--color-sim-slit-tint') : gp.send === 'marble' ? SK.color('--color-copper-tint') : rgbStr(lamRGB(gp.lam || 650));
    var cv = document.createElement('canvas'); cv.width = 1; cv.height = SCR_H;
    var c = cv.getContext('2d');
    c.fillStyle = col;
    for (var j = 0; j < SCR_H; j++) {
      var y = Y_MAX - (j + 0.5) / PX_MM, idx = Math.round((y - Y_MIN) / 0.1), f = pts[Math.max(0, Math.min(pts.length - 1, idx))][1];
      c.globalAlpha = Math.max(0, Math.min(1, f)); c.fillRect(0, j, 1, 1);
    }
    return cv;
  }

  function drawRuler(ctx, p) {
    var el = p.send === 'electron';
    ctx.strokeStyle = SK.color('--color-ink'); ctx.fillStyle = SK.color('--color-ink');
    for (var mm = Y_MIN; mm <= Y_MAX; mm++) {
      var y = yToScr(mm), big = mm % 5 === 0;
      ctx.lineWidth = big ? 2.5 : 1;
      ctx.beginPath(); ctx.moveTo(RUL_X, y); ctx.lineTo(RUL_X + (big ? 14 : 6), y); ctx.stroke();
    }
    for (var m2 = -20; m2 <= 20; m2 += 10) txt(ctx, m2 === 0 ? '0' : SK.fmt(m2, 0), RUL_X + 16, yToScr(m2), { size: 18, w: 600 });
    txt(ctx, el ? '눈금' : 'mm', RUL_X + 6, SCR_TOP - 12, { size: 20, w: 700, color: '--color-ink-muted' });
  }

  /** 스크린 왼쪽 세기 곡선 (이론·히스토그램·직전·기록) */
  function drawProfile(ctx, p) {
    var showT = SK.params.showTheory, showH = SK.params.showHist && p.send !== 'wave' && count > 0;
    var showO = SK.params.overlay && (SK.ghost || SK.records.length);
    if (!showT && !showH && !showO) return;
    var x0 = SCR_X - 4;
    ctx.fillStyle = SK.color('--color-paper-scrim');
    ctx.fillRect(x0 - PROF_W - 6, SCR_TOP, PROF_W + 6, SCR_H);
    function mapF(y, f) { return [x0 - f * PROF_W, yToScr(y)]; }
    if (showH) {
      var hv = histView(), sc = cur.Z / (count * hv.w * cur.imax);
      ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = curveColor(p);
      for (var b = 0; b < hv.n; b++) {
        if (!hv.h[b]) continue;
        var f = Math.min(1.15, hv.h[b] * sc);
        ctx.fillRect(x0 - f * PROF_W, yToScr(Y_MIN + (b + 1) * hv.w), f * PROF_W, Math.max(0.5, hv.w * PX_MM - 0.5));
      }
      ctx.restore();
    }
    if (showO) {
      SK.records.forEach(function (r) { if (r.series.I) SK.drawPath(ctx, r.series.I, SK.recStyle(r.slot), mapF); });
      if (SK.ghost && SK.ghost.series.I) SK.drawPath(ctx, SK.ghost.series.I, SK.ghostStyle(), mapF);
    }
    if (showT) {
      ctx.save(); ctx.strokeStyle = curveColor(p); ctx.lineWidth = 3; ctx.beginPath();
      for (var j = 0; j <= SCR_H; j++) {
        var y = Y_MAX - j / PX_MM, v = intensity(cur.g, y) / cur.imax;
        if (j === 0) ctx.moveTo(x0 - v * PROF_W, SCR_TOP + j); else ctx.lineTo(x0 - v * PROF_W, SCR_TOP + j);
      }
      ctx.stroke(); ctx.restore();
    }
  }

  function drawZoom(ctx, p) {
    var el = p.send === 'electron', u = el ? '눈금' : 'mm';
    ctx.fillStyle = SK.color('--color-ink');
    roundRect(ctx, ZX, ZY, ZW, ZH, 8); ctx.fill();
    ctx.save(); roundRect(ctx, ZX, ZY, ZW, ZH, 8); ctx.clip();
    if (p.send === 'wave') ctx.drawImage(zpatCv, ZX, ZY, ZW, ZH);
    else if (SK.params.showDots) ctx.drawImage(zoomCv, ZX, ZY, ZW, ZH);
    // 안쪽 눈금 (1 칸, 5 칸 굵게)
    ctx.strokeStyle = SK.color('--color-paper-raised'); ctx.fillStyle = SK.color('--color-paper-raised');
    for (var mm = -Z_RANGE; mm <= Z_RANGE; mm++) {
      var y = yToZoom(mm), big = mm % 5 === 0;
      ctx.lineWidth = big ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(ZX, y); ctx.lineTo(ZX + (big ? 22 : 10), y); ctx.stroke();
      if (big && Math.abs(mm) < Z_RANGE) txt(ctx, mm === 0 ? '0' : SK.fmt(mm, 0), ZX + 28, y, { size: 18, w: 700, color: '--color-paper-raised' });
    }
    // 잰 선
    function line(yv, lab) {
      var py = yToZoom(yv);
      ctx.strokeStyle = SK.color('--color-focus-on-dark'); ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(ZX, py); ctx.lineTo(ZX + ZW, py); ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, lab, ZX + ZW - 8, py - 14, { align: 'right', size: 20, w: 700, color: '--color-focus-on-dark' });
    }
    if (meas.a !== null) line(meas.a, 'A');
    if (meas.b !== null) {
      line(meas.b, 'B');
      var xa = ZX + ZW - 60;
      SK.arrow(ctx, xa, yToZoom(meas.a), xa, yToZoom(meas.b), { color: '--color-focus-on-dark', width: 3, head: 12 });
    }
    ctx.restore();
    ctx.strokeStyle = SK.color('--color-sim-slit'); ctx.lineWidth = 4;
    roundRect(ctx, ZX, ZY, ZW, ZH, 8); ctx.stroke();
    // 제목 띠
    ctx.fillStyle = SK.color('--color-sim-slit');
    roundRect(ctx, ZX + ZW - 214, ZY + 8, 206, 34, 6); ctx.fill();
    txt(ctx, '확대창 ×' + MAG_ZOOM + ' (±' + Z_RANGE + ' ' + u + ')', ZX + ZW - 111, ZY + 25, { align: 'center', size: 20, w: 700, color: '--color-ink-inverse' });
    // 스크린 위 확대 범위 표시
    ctx.strokeStyle = SK.color('--color-sim-slit'); ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.strokeRect(SCR_X - 3, yToScr(Z_RANGE), SCR_W + 6, 2 * Z_RANGE * PX_MM); ctx.setLineDash([]);

    // 측정 계산칸
    var px = ZX, py0 = 394;
    var dist = meas.a !== null && meas.b !== null ? Math.abs(meas.a - meas.b) : null;
    txt(ctx, dist === null ? (meas.a === null ? '확대창을 두 번 눌러(또는 끌어) 재요' : '한 번 더 눌러 B 를 정해요') : 'A~B 거리  ' + SK.fmt(dist, 1) + ' ' + u,
      px, py0 + 8, { size: dist === null ? 22 : 26, w: 700, color: dist === null ? '--color-ink-muted' : '--color-ink' });
    txt(ctx, '사이 칸 수 n', px, BTN.minus.y + 36, { size: 24, w: 600 });
    [['minus', '−'], ['plus', '+']].forEach(function (b) {
      var r = BTN[b[0]];
      ctx.fillStyle = SK.color('--color-paper-raised'); ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 3;
      roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
      txt(ctx, b[1], r.x + r.w / 2, r.y + r.h / 2, { align: 'center', size: 36, w: 700 });
    });
    txt(ctx, String(meas.n), (BTN.minus.x + BTN.minus.w + BTN.plus.x) / 2, BTN.minus.y + 36, { align: 'center', size: 36, w: 800 });
    var mg = measuredGap();
    txt(ctx, '÷ n = 한 칸 간격', px, 540, { size: 22, w: 600, color: '--color-ink-muted' });
    txt(ctx, mg === null ? '–' : SK.fmt(mg, 2) + ' ' + u, px + 190, 540, { size: 34, w: 800, color: '--color-sim-slit-text' });
    var r = BTN.clear;
    ctx.fillStyle = SK.color('--color-paper-raised'); ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 3;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
    txt(ctx, '재기 지우기', r.x + r.w / 2, r.y + r.h / 2, { align: 'center', size: 24, w: 700 });
  }

  function render(view, p) {
    var ctx = view.ctx;
    if (!cur) return;
    var g = cur.g;
    var geo = drawSlitPlate(ctx, p, g);
    drawWaves(ctx, p, g, geo);
    drawSource(ctx, p);
    if (p.send !== 'wave') drawFlyers(ctx, p, g, geo);
    drawScreen(ctx, p);
    drawProfile(ctx, p);
    drawRuler(ctx, p);
    drawZoom(ctx, p);
    updateMeters(p);
    drawGraph();
    updateNotes(p);
  }

  /* ---- 하단 띠: 세기 그래프 (직접 그림: 이론 곡선 + 히스토그램 40% + 직전·기록 곡선) ---- */
  function drawGraph() {
    var gv = ui.graphView; if (!gv || !cur) return;
    var ctx = gv.ctx, W = gv.w, H = gv.h, p = cur.p;
    gv.clear();
    var padL = 50, padR = 8, padT = 6, padB = 24, pw = W - padL - padR, ph = H - padT - padB;
    if (pw < 20 || ph < 20) return;
    var particles = p.send !== 'wave', rel = graphMode === 'rel' || !particles;
    var hv = histView();
    setGraphTitle(hv.w, unitY(p));
    var expK = count * hv.w / cur.Z;      // 개수 모드: I → 칸별 기대 개수
    var ymax = 1.1;
    if (!rel) { var hm = 0; for (var b = 0; b < hv.n; b++) if (hv.h[b] > hm) hm = hv.h[b]; ymax = Math.max(5, hm, expK * cur.imax) * 1.1; }
    function mx(y) { return padL + (y - Y_MIN) / (Y_MAX - Y_MIN) * pw; }
    function my(v) { return padT + ph - v / ymax * ph; }
    ctx.font = '500 16px ' + FONT; ctx.lineWidth = 1;
    ctx.strokeStyle = SK.color('--color-grid'); ctx.fillStyle = SK.color('--color-ink-muted');
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var x = -30; x <= 30; x += 10) { ctx.beginPath(); ctx.moveTo(mx(x), padT); ctx.lineTo(mx(x), padT + ph); ctx.stroke(); ctx.fillText(x === 0 ? '0' : SK.fmt(x, 0), mx(x), padT + ph + 4); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var ticks = rel ? [0, 0.5, 1] : [0, Math.round(ymax / 1.1 / 2), Math.round(ymax / 1.1)];
    ticks.forEach(function (t) { ctx.beginPath(); ctx.moveTo(padL, my(t)); ctx.lineTo(padL + pw, my(t)); ctx.stroke(); ctx.fillText(rel ? SK.fmt(t, 1) : fmtN(t), padL - 6, my(t)); });
    ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ph); ctx.lineTo(padL + pw, padT + ph); ctx.stroke();
    ctx.fillStyle = SK.color('--color-ink'); ctx.font = '700 16px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('y (' + unitY(p) + ')', padL + pw, padT + ph - 2);
    ctx.save(); ctx.beginPath(); ctx.rect(padL, padT - 2, pw + 2, ph + 4); ctx.clip();
    var col = curveColor(p);
    if (particles && SK.params.showHist && count > 0) {
      var sc = rel ? cur.Z / (count * hv.w * cur.imax) : 1;
      ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = col;
      for (var b2 = 0; b2 < hv.n; b2++) {
        if (!hv.h[b2]) continue;
        var v = hv.h[b2] * sc, x0 = mx(Y_MIN + b2 * hv.w), x1 = mx(Y_MIN + (b2 + 1) * hv.w);
        ctx.fillRect(x0, my(v), Math.max(1, x1 - x0 - 0.5), padT + ph - my(v));
      }
      ctx.restore();
    }
    if (rel) {
      var map = function (a, b) { return [mx(a), my(b)]; };
      SK.records.forEach(function (r) { if (r.series.I) SK.drawPath(ctx, r.series.I, { color: SK.recStyle(r.slot).color, dash: SK.recStyle(r.slot).dash, width: 2.5 }, map); });
      if (SK.ghost && SK.ghost.series.I) SK.drawPath(ctx, SK.ghost.series.I, { color: SK.ghostStyle().color, dash: [], width: 2.5 }, map);
    }
    if (SK.params.showTheory) {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([]); ctx.beginPath();
      var n = Math.max(200, Math.round(pw * 2));
      for (var i = 0; i <= n; i++) {
        var yy = Y_MIN + (Y_MAX - Y_MIN) * i / n, I = intensity(cur.g, yy);
        var val = rel ? I / cur.imax : I * expK;
        if (i === 0) ctx.moveTo(mx(yy), my(val)); else ctx.lineTo(mx(yy), my(val));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- 계기판 · 실험 화면 글 ---- */
  var lastM = {};
  function setText(el, key, s) { if (lastM[key] !== s) { el.textContent = s; lastM[key] = s; } }
  function setGraphTitle(w, u) {
    if (!ui.graphTitle) return;
    var ws = SK.fmt(w, 1) + ' ' + u + ' 칸';
    setText(ui.graphTitle, 'gt', graphMode === 'rel' ? '세기 · 이론 곡선 + 막대(' + ws + ')' : '쌓인 개수 (' + ws + '마다)');
  }
  function updateMeters(p) {
    setText(ui.mCount, 'c', p.send === 'wave' ? '—' : fmtN(count));
    setText(ui.mCountSub, 'cs', p.send === 'wave' ? '연속 빛' : '개');
    setText(ui.mTheo, 't', theoryText(p, cur.g).replace('줄무늬 없음', '무늬 없음'));   // 좁은 칸에서 잘리지 않게
    var mg = measuredGap();
    setText(ui.mMeas, 'm', mg === null ? '–' : SK.fmt(mg, 2) + ' ' + unitY(p));
    setText(ui.mRate, 'r', p.send === 'wave' ? '—' : fmtN(p.rate) + ' 개/s');
  }
  function eqText(p, g) {
    if (p.send === 'marble') return '구슬: 간섭이 없어요. 두 띠 사이 ≈ ' + SK.fmt(marbleGap(g), 1) + ' mm (슬릿 그림자)';
    if (p.send === 'electron') return '무늬 간격 ∝ 파장 × 스크린 거리 ÷ 슬릿 간격  →  지금 ' + SK.fmt(fringe(g), 1) + ' 눈금';
    return 'Δy = λL ÷ d = ' + p.lam + '×10⁻⁹ m × ' + SK.fmt(p.L, 1) + ' m ÷ ' + SK.fmt(p.d, 2) + '×10⁻³ m = ' + SK.fmt(fringe(g), 1) + ' mm';
  }
  function updateNotes(p) {
    var g = cur.g;
    showP(ui.nModel, p.send === 'electron', '확대한 모형: 실제 전자 실험의 슬릿 간격은 1 μm보다 작아요');
    showP(ui.nDet, p.det && isQuantum(p.send), '어느 슬릿을 지났는지 알아낼 수 있게 장치를 두면 무늬가 사라져요');
    showP(ui.nEq, !!SK.params.showEq, eqText(p, g));
    ui.btnToElectron.hidden = p.send !== 'marble';
  }
  function showP(el, on, s) { el.hidden = !on; if (on && el.textContent !== s) el.textContent = s; }

  /* ==================================================================
     7. SimKit 연결
     ================================================================== */
  SK.init({
    slug: 'double-slit-quantum',
    title: '이중 슬릿: 빛에서 전자 하나까지',
    subject: '전자기와 양자 · 물리학',
    unit: '양자와 미시세계 / 빛과 물질',
    standards: ['12전자03-01', '12물리03-01'],
    today: '파장을 바꾸면 무늬 간격은?',
    steps: ['예측', '실행', '규칙 찾기', '생각해 보기'],
    dt: 1 / 240,
    stageFit: true,
    onStep: function (i, name) { showThink(name === '생각해 보기'); },
    reset: function (p) {
      if (hadRun && !suppressCapture) snapshotGhostDots();
      hadRun = false;
      rebuild(p); clearDots(); clearMeasure();
      updatePanel();
    },
    step: function (dt, p) {
      hadRun = true;
      if (!cur || p.send === 'wave') return;
      emitAcc += p.rate * dt;
      while (emitAcc >= 1) { emitAcc -= 1; emitOne(p, p.rate); }
      // 날아가는 것 정리 · 도착하면 점
      for (var i = flyers.length - 1; i >= 0; i--) {
        var f = flyers[i], age = SK.time - f.t0;
        if (f.slit && age >= T_FLY1 && !f.passed) { f.passed = true; if (p.det) flash[f.slit] = SK.time; }
        if (age >= T_FLY1 + T_FLY2) { if (f.dep) deposit(f.y); flyers.splice(i, 1); }
      }
    },
    render: render,
    capture: function () { if (!cur || suppressCapture) return null; return captureFrom(cur.p); },
    status: function (p) {
      var s = [KIND_LABEL[p.send]];
      if (p.send === 'electron') s.push('파장 ' + p.lamR + ' · 간격 ' + p.dR + ' · 거리 ' + p.LR + ' (상대)');
      else {
        if (p.send !== 'marble') s.push(p.lam + ' nm');
        s.push('d ' + SK.fmt(p.d, 2) + ' mm', 'L ' + SK.fmt(p.L, 1) + ' m');
      }
      if (p.slit !== 'both') s.push(p.slit === 'top' ? '위 슬릿만' : '아래 슬릿만');
      s.push('측정기 ' + (p.det && p.send !== 'wave' ? '켬' : '끔'));
      if (p.send !== 'wave') s.push(fmtN(p.rate) + ' 개/s');
      return s.join(' · ');
    },
    predictOnPreset: true
  });

  FONT = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
  dotsCv = makeCanvas(SCR_W, SCR_H); dotsCtx = dotsCv.getContext('2d');
  zoomCv = makeCanvas(ZW, ZH); zoomCtx = zoomCv.getContext('2d');
  patCv = document.createElement('canvas'); patCv.width = 1; patCv.height = SCR_H;
  zpatCv = document.createElement('canvas'); zpatCv.width = 1; zpatCv.height = ZH;

  /* ---- 상황 바꾸기 (요구 B) ---- */
  SK.addChoice('situation', {
    key: 'send', label: '무엇을 보낼까?', style: 'cards', apply: 'restart',
    options: [
      { value: 'wave', label: '빛 파동', sub: '레이저' },
      { value: 'photon', label: '광자 하나씩', sub: '아주 약한 빛' },
      { value: 'electron', label: '전자 하나씩', sub: '전자총' },
      { value: 'marble', label: '작은 구슬', sub: '비교용 알갱이' }
    ], value: 'wave',
    onChange: function () { updatePanel(); }
  });
  SK.controls.send.el.classList.add('dsq-cards2');
  SK.addChoice('situation', {
    key: 'slit', label: '열린 슬릿', apply: 'live',
    options: [{ value: 'both', label: '둘 다' }, { value: 'top', label: '위만' }, { value: 'bottom', label: '아래만' }],
    value: 'both'
  });
  SK.addToggle('situation', { key: 'det', label: '어느 슬릿 측정기 (M)', value: false, apply: 'live', record: true });
  SK.controls.det.el.classList.add('dsq-bigswitch');
  ui.detNote = SK.h('p', { class: 'dsq-sub', text: '' });
  SK.controls.det.el.appendChild(ui.detNote);

  /* ---- 수치 바꾸기 (요구 A) — 결정서 §4 값 그대로 ---- */
  SK.addVar('values', { key: 'lam', label: '빛의 파장 (색)', symbol: 'λ', unit: 'nm', min: 400, max: 700, step: 10, value: 650, decimals: 0, precision: 0, ticks: [400, 450, 550, 650, 700], apply: 'live' });
  SK.controls.lam.el.classList.add('dsq-rainbow');
  SK.addVar('values', { key: 'lamR', label: '파장 (짧다 ↔ 길다)', symbol: 'λ', unit: '', min: 2, max: 10, step: 1, value: 5, decimals: 0, precision: 0, ticks: [2, 5, 10], apply: 'live',
    hint: '전자가 빠를수록(가속 전압이 높을수록) 파장이 짧아요 — 드브로이 파장, 심화 ▸' });
  SK.addVar('values', { key: 'd', label: '슬릿 간격', symbol: 'd', unit: 'mm', min: 0.10, max: 0.50, step: 0.05, value: 0.25, decimals: 2, precision: 3, ticks: [0.1, 0.25, 0.5], apply: 'live' });
  SK.addVar('values', { key: 'dR', label: '슬릿 간격 (좁다 ↔ 넓다)', symbol: 'd', unit: '', min: 2, max: 10, step: 1, value: 5, decimals: 0, precision: 0, ticks: [2, 5, 10], apply: 'live' });
  SK.addVar('values', { key: 'L', label: '스크린 거리', symbol: 'L', unit: 'm', min: 0.5, max: 3.0, step: 0.1, value: 2.0, decimals: 1, precision: 2, ticks: [0.5, 1, 2, 3], apply: 'live' });
  SK.addVar('values', { key: 'LR', label: '스크린 거리 (가깝다 ↔ 멀다)', symbol: 'L', unit: '', min: 2, max: 7, step: 1, value: 5, decimals: 0, precision: 0, ticks: [2, 5, 7], apply: 'live' });

  // 보내는 빠르기: 3단 버튼 + 정밀 입력
  ui.speedBox = SK.h('div', { class: 'dsq-speed', role: 'group', 'aria-label': '보내는 빠르기' });
  ui.speedBtns = [['느리게', 1], ['보통', 20], ['빨리 감기', 1000]].map(function (o, i) {
    var b = SK.h('button', { class: 'btn btn--secondary', type: 'button', title: 'Shift+' + (i + 1) }, [o[0], SK.h('span', { class: 'btn__sub', text: fmtN(o[1]) + '개/s' })]);
    b.addEventListener('click', function (e) { if (e.detail > 0) b.blur(); setRateLevel(i); });
    ui.speedBox.appendChild(b);
    return b;
  });
  SK.panel('values').appendChild(ui.speedBox);
  SK.addVar('values', { key: 'rate', label: '보내는 빠르기', unit: '개/s', min: 1, max: 1000, step: 1, value: 20, decimals: 0, precision: 0, ticks: [1, 250, 500, 1000], apply: 'live', record: false, onChange: function () { updatePanel(); } });
  ui.skipBtn = SK.h('button', { class: 'btn btn--primary dsq-skip', type: 'button' }, ['1만 개 건너뛰기', SK.h('span', { class: 'btn__key', text: 'K' })]);
  ui.skipBtn.addEventListener('click', function (e) { if (e.detail > 0) ui.skipBtn.blur(); skipMany(10000); });
  SK.panel('values').appendChild(ui.skipBtn);

  /* ---- 표시 도구 ---- */
  var grid = SK.h('div', { class: 'dsq-grid2' });
  SK.panel('tools').appendChild(grid);
  SK.addToggle(grid, { key: 'showDots', label: '점', value: true });
  SK.addToggle(grid, { key: 'showHist', label: '히스토그램', value: true });
  SK.addToggle(grid, { key: 'showTheory', label: '이론 곡선', value: true });
  SK.addToggle(grid, { key: 'showWave', label: '파면 (W)', value: true });
  ['showDots', 'showHist', 'showTheory', 'showWave'].forEach(function (k) { SK.defs[k].record = false; });
  SK.addToggle('tools', { key: 'overlay', label: '이전 무늬 겹쳐 보기 (직전·기록)', value: true });
  SK.addToggle('tools', { key: 'showEq', label: '식 보기', value: true });

  /* ---- 심화 ---- */
  SK.addVar('deep', { key: 'a', label: '슬릿 폭', symbol: 'a', unit: 'mm', min: 0.02, max: 0.10, step: 0.01, value: 0.05, decimals: 2, precision: 3, ticks: [0.02, 0.05, 0.1], apply: 'live',
    hint: '기본 0.05 mm 고정. 넓을수록 바깥쪽 줄이 빨리 어두워져요(회절 포락선).' });
  SK.addVar('deep', { key: 'V', label: '전자 가속 전압', symbol: 'V', unit: 'V', min: 10, max: 1000, step: 10, value: 100, decimals: 0, precision: 0, ticks: [10, 500, 1000], apply: 'live', record: false,
    onChange: function () { updateDB(); } });
  ui.db = SK.h('p', { class: 'dsq-db' });
  SK.panel('deep').appendChild(ui.db);
  function updateDB() {
    var V = SK.get('V');
    ui.db.textContent = '드브로이 파장 λ = h ÷ √(2mₑeV) = ' + deBroglieNm(V).toFixed(3) + ' nm (' + V + ' V). 전압을 높이면 파장이 짧아져 무늬 간격이 좁아져요. (정성 비교용 — 화면 모형에는 쓰지 않아요)';
  }
  updateDB();

  /* ---- 하단 띠: 그래프 | 계기판 | 기록 표 ---- */
  SK.el.graph.style.order = '-1';
  SK.el.band.style.gridTemplateColumns = 'minmax(0, 5fr) minmax(0, 4.4fr) minmax(0, 3.6fr)';
  ui.graphToggle = SK.h('button', { class: 'btn btn--sm btn--quiet dsq-gtoggle', type: 'button', title: '세로축 바꾸기' }, '상대 세기 ⇄');
  ui.graphToggle.addEventListener('click', function (e) {
    if (e.detail > 0) ui.graphToggle.blur();
    graphMode = graphMode === 'rel' ? 'count' : 'rel';
    ui.graphToggle.textContent = graphMode === 'rel' ? '상대 세기 ⇄' : '쌓인 개수 ⇄';
    SK.requestRender();
  });
  ui.graphTitle = SK.h('span', { text: '세기 · 이론 곡선 + 막대(0.5 mm 칸)' });
  var gArea = SK.h('div', { class: 'graph-box__canvas' });
  SK.el.graph.appendChild(SK.h('div', { class: 'graph-box' }, [SK.h('div', { class: 'graph-box__title' }, [ui.graphTitle, ui.graphToggle]), gArea]));
  ui.graphView = SK.canvas(gArea, { fit: false, bg: '--color-paper-raised' });
  ui.graphView.onResize = function () { drawGraph(); };

  ui.mCount = SK.h('span', { class: 'dsq-big num', text: '0' });
  ui.mCountSub = SK.h('span', { class: 'dsq-big-unit', text: '개' });
  ui.mTheo = SK.h('b', { class: 'num' }); ui.mMeas = SK.h('b', { class: 'num' }); ui.mRate = SK.h('b', { class: 'num' });
  SK.el.meters.appendChild(SK.h('div', { class: 'dsq-meters' }, [
    SK.h('div', { class: 'dsq-meter-main' }, [SK.h('span', { class: 'dsq-label', text: '쌓인 개수' }), SK.h('span', null, [ui.mCount, ' ', ui.mCountSub])]),
    SK.h('div', { class: 'dsq-meter-list' }, [
      SK.h('div', { class: 'dsq-row' }, [SK.h('span', { class: 'dsq-label' }, ['이론 ', SK.h('i', { text: 'Δy' })]), ui.mTheo]),
      SK.h('div', { class: 'dsq-row' }, [SK.h('span', { class: 'dsq-label', text: '잰 간격' }), ui.mMeas]),
      SK.h('div', { class: 'dsq-row' }, [SK.h('span', { class: 'dsq-label', text: '빠르기' }), ui.mRate])
    ])
  ]));

  ui.recTable = SK.recordTable(null, {
    columns: [
      { key: 'send', label: '보내는 것', from: 'param' },
      { key: 'lamT', label: 'λ', unit: '', from: 'value', changed: true },
      { key: 'dT', label: 'd', unit: '', from: 'value', changed: true },
      { key: 'LT', label: 'L', unit: '', from: 'value', changed: true },
      { key: 'slit', label: '슬릿', from: 'param' },
      { key: 'det', label: '측정기', from: 'param' },
      { key: 'count', label: '쌓인 개수', unit: '', decimals: 0, from: 'value' },
      { key: 'meas', label: '잰 간격', unit: '', from: 'value' },
      { key: 'theo', label: '이론 간격', unit: '', from: 'value' }
    ]
  });
  /* λ·d·L 칸은 전자 모드의 '상대' 표기 때문에 결과(value) 칸이다. '바뀐 변수 굵게'는 공통 표의
     changed: true 옵션이 맡는다 (크게 보기 창 포함 — 최종 통합 점검 때 공통 틀에 넣음). */
  SK.onRecords(function (recs) {
    if (SK.stepName === '실행' && recs.length >= 2) SK.goStep(2);
  });

  /* ---- 실험 화면 위 글 (왼쪽 아래) ---- */
  ui.nHint = SK.h('p', { class: 'dsq-note dsq-note--hint', hidden: true });
  ui.nModel = SK.h('p', { class: 'dsq-note dsq-note--model', hidden: true });
  ui.nDet = SK.h('p', { class: 'dsq-note dsq-note--det', hidden: true });
  ui.nEq = SK.h('p', { class: 'dsq-note dsq-note--eq', hidden: true });
  ui.btnToElectron = SK.h('button', { class: 'btn btn--secondary dsq-note-btn', type: 'button', hidden: true }, '전자로 바꿔 보기 →');
  ui.btnToElectron.addEventListener('click', function (e) {
    if (e.detail > 0) ui.btnToElectron.blur();
    if (entrance !== 'quantum') applyEntranceUI('quantum');
    SK.set('send', 'electron', { silent: true });
    SK.reset(); SK.play();
    setHint('구슬은 두 띠, 전자는? 직전 무늬(구슬)와 나란히 비교해 보세요.');
  });
  SK.el.cornerBL.classList.add('dsq-notes');
  SK.el.cornerTL.classList.add('dsq-tl');
  [ui.nModel, ui.nDet, ui.nEq, ui.btnToElectron].forEach(function (n) { SK.el.cornerBL.appendChild(n); });
  SK.el.cornerTL.appendChild(ui.nHint);   // 프리셋 설명 줄 바로 아래
  function setHint(s) { ui.nHint.hidden = !s; ui.nHint.textContent = s || ''; }

  /* ---- '생각해 보기' 판 ---- */
  ui.think = SK.h('div', { class: 'think dsq-think', hidden: true });
  SK.el.stage.appendChild(ui.think);
  function showThink(on) {
    ui.think.hidden = !on;
    if (!on) return;
    ui.think.innerHTML = '';
    var close = SK.h('button', { class: 'btn btn--quiet dsq-think-close', type: 'button', 'aria-label': '닫기' }, '닫기 ✕');
    close.addEventListener('click', function () { ui.think.hidden = true; });
    var qs = entrance === 'quantum'
      ? [['전자 하나는 어느 슬릿을 지났을까?', '정답이 없는 토론이에요. 측정기를 켰을 때와 껐을 때 무늬가 어떻게 달랐는지를 근거로 말해 보세요.'],
         ['전자를 더 빠르게 보내면(가속 전압↑) 무늬 간격은 어떻게 될까?', '형성 평가: 빠를수록 드브로이 파장 λ = h ÷ p 가 짧아져요. 파장 슬라이더 하나만 짧게 바꿔 S 로 기록하고, 기록 표의 이론 간격과 비교해 보세요.']]
      : [['파장·슬릿 간격·스크린 거리 중 하나를 바꾸면 무늬 간격은?', '형성 평가: 슬릿 간격 d 를 0.25 mm 에서 0.50 mm 로 두 배로 하면 5.2 mm 였던 간격은 몇 mm 가 될까? 먼저 예측해 쓰고, d 하나만 바꿔 재서 확인해 보세요.'],
         ['빛 대신 전자를 하나씩 보내면 어떻게 될까?', '전자기와 양자 입구에서 이어서 알아봐요.']];
    ui.think.appendChild(SK.h('div', { class: 'dsq-think-head' }, [SK.h('span', { class: 'think__label', text: '생각해 보기' }), close]));
    qs.forEach(function (q) { ui.think.appendChild(SK.h('p', { class: 'think__q', text: q[0] })); ui.think.appendChild(SK.h('p', { class: 'think__hint', text: q[1] })); });
  }

  /* ---- 패널 보이기·끄기 ---- */
  function show(key, on) { var c = SK.controls[key]; if (c) c.el.style.display = on ? '' : 'none'; }
  function updatePanel() {
    var send = SK.get('send'), el = send === 'electron', wave = send === 'wave', marble = send === 'marble';
    show('lam', !el); show('d', !el); show('L', !el);
    show('lamR', el); show('dR', el); show('LR', el);
    show('a', !el);                      // 전자 모드 패널에는 mm 를 보이지 않음(수용 기준)
    SK.controls.a.enable(!marble);       // 구슬 모형은 슬릿 폭을 쓰지 않음
    SK.controls.lam.enable(!marble);
    SK.controls.det.enable(!wave);
    ui.detNote.textContent = wave ? '빛 파동에서는 쓰지 않아요 — 하나씩 보낼 때 켜 보세요' : marble ? '구슬은 측정기를 켜도 끄도 두 띠 그대로예요' : '켜면 지난 슬릿이 깜빡여요';
    SK.controls.rate.enable(!wave);
    ui.speedBtns.forEach(function (b, i) { b.disabled = wave; b.setAttribute('aria-pressed', String(!wave && SK.get('rate') === RATE_LEVELS[i])); });
    ui.skipBtn.disabled = wave;
    SK.controls.showDots.enable(!wave); SK.controls.showHist.enable(!wave);
    SK.controls.showWave.enable(!marble);
    // 스펙트럼 슬라이더 색
    var stops = [];
    for (var nm = 400; nm <= 700; nm += 25) stops.push(rgbStr(lamRGB(nm)) + ' ' + ((nm - 400) / 3).toFixed(1) + '%');
    SK.controls.lam.el.style.setProperty('--dsq-spectrum', 'linear-gradient(to right, ' + stops.join(', ') + ')');
  }
  function setRateLevel(i) {
    if (SK.get('send') === 'wave') { SK.notice('빛 파동에서는 빠르기를 쓰지 않아요', 'info'); return; }
    SK.set('rate', RATE_LEVELS[i]);
    SK.notice('보내는 빠르기: ' + ['느리게', '보통', '빨리 감기'][i] + ' ' + fmtN(RATE_LEVELS[i]) + '개/s', 'info', 1500);
  }
  // '즉시' 값이 바뀌면 분포를 다시 만들고 점을 새로 쌓음 (직전 무늬는 남김)
  Object.keys(DIST_KEYS).forEach(function (k) {
    var d = SK.defs[k]; if (!d) return;
    var prev = d.onChange;
    d.onChange = function (v, info) { if (prev) prev(v, info); onDistChange(); };
  });

  /* ---- 입구 (두 갈래) ---- */
  var todayEl = SK.el.top.querySelector('.sim-today');
  function applyEntranceUI(v) {
    entrance = v;
    if (todayEl) todayEl.lastChild.textContent = v === 'physics' ? '파장을 바꾸면 무늬 간격은?' : '전자를 하나씩 보내도 줄무늬가 생길까?';
    var opts = SK.controls.send.el.querySelectorAll('.seg__opt');
    opts[2].style.display = v === 'physics' ? 'none' : '';
    SK.controls.det.el.style.display = v === 'physics' ? 'none' : '';
    // 식 보기: 물리학 입구는 '표시 도구', 양자 입구는 '심화'
    SK.panel(v === 'physics' ? 'tools' : 'deep').appendChild(SK.controls.showEq.el);
    if (v === 'quantum') SK.panel('deep').appendChild(ui.db);
  }
  function pickEntrance(v) {
    applyEntranceUI(v);
    if (v === 'physics') {
      SK.set('send', 'wave', { silent: true }); SK.set('showEq', true, { silent: true });
      setHint('Space 로 빛을 켜고, 오른쪽 확대창에서 밝은 줄 사이를 재 보세요.');
    } else {
      SK.set('send', 'electron', { silent: true }); SK.set('rate', 20, { silent: true }); SK.set('showEq', false, { silent: true });
      setHint('Space 로 전자를 보내 보세요. 처음 몇 개는 어디에 찍힐까요?');
    }
    SK.reset();
  }
  function askEntrance(cancelable) {
    SK.chooseMode({
      title: '어느 수업으로 들어갈까요?', cancelable: cancelable,
      modes: [
        { value: 'physics', label: '물리학: 빛의 간섭', desc: '레이저 빛으로 밝은 줄이 몇 개, 얼마 간격으로 생기는지 재요 [12물리03-01]' },
        { value: 'quantum', label: '전자기와 양자: 하나씩 보내기', desc: '광자·전자·구슬을 하나씩 보내 쌓이는 무늬를 봐요 [12전자03-01]' }
      ],
      onPick: function (v) { pickEntrance(v); }
    });
  }
  var entranceBtn = SK.h('button', { class: 'btn btn--quiet', type: 'button' }, '입구 바꾸기');
  entranceBtn.addEventListener('click', function (e) { if (e.detail > 0) entranceBtn.blur(); askEntrance(true); });
  SK.el.panelFoot.appendChild(entranceBtn);

  /* ---- 기록: 빛 파동은 '실행'하지 않아도 무늬가 보이므로 S 를 누르면 실행으로 표시 후 기록 ---- */
  var origRecord = SK.record;
  SK.record = function () {
    if (!SK.started && SK.params.send === 'wave') SK.stepFrame(1);
    if (SK.stepName === '예측' && SK.started) SK.goStep(1);   // 빛 파동은 Space 없이 재므로 단계도 넘겨 줌
    origRecord();
    burst = false;   // 기록한 뒤 바로 값을 바꿔도 그 기록 상태를 직전 무늬로 남김
  };

  /* ---- 프리셋 (교과서 탐구 활동·대표 상황) ---- */
  var BASE = { lam: 650, d: 0.25, L: 2.0, lamR: 5, dR: 5, LR: 5, a: 0.05, slit: 'both', det: false };
  function withBase(o) { var r = copy(BASE); for (var k in o) r[k] = o[k]; return r; }
  SK.setPresets([
    { name: '밝은 줄 몇 개?', tag: '탐구 재현', change: '없음 — 기본 상태에서 관찰', fixed: 'λ 650 nm, d 0.25 mm, L 2.0 m, 슬릿 둘',
      values: withBase({ send: 'wave' }),
      predict: { question: '두 슬릿을 지난 빛, 스크린에 밝은 줄은 몇 개 생길까?', choices: ['1개', '2개', '여러 개'] },
      onApply: function () { setHint('확대창에서 어두운 줄 6개(5칸)의 양 끝을 재고 n = 5 로 나눈 뒤 S 로 기록해요. 이론값 5.2 mm'); } },
    { name: '빨강과 파랑', tag: '대표 문항', change: 'λ 650 → 450 nm', fixed: 'd 0.25 mm, L 2.0 m, 슬릿 둘',
      values: withBase({ send: 'wave', lam: 450 }),
      predict: { question: '빨강(650 nm)과 파랑(450 nm), 어느 쪽 무늬 간격이 넓을까?', choices: ['빨강이 넓다', '파랑이 넓다', '같다'], info: '1번을 S 로 기록한 뒤 누르면 빨간 무늬가 겹쳐 보여요.' },
      onApply: function () { setHint('어두운 줄 여러 칸을 재고 n 으로 나눠 S 로 기록해 1번(빨강)과 비교해요. 이론값 3.6 mm'); } },
    { name: '전자 하나씩', tag: '탐구 재현', change: '보내는 빠르기 1 → 20 → 1000 개/s', fixed: '파장·간격·거리 상대 5, 슬릿 둘, 측정기 끔',
      values: withBase({ send: 'electron', rate: 1 }),
      predict: { question: '전자를 하나씩 보내면 스크린에 무엇이 생길까?', choices: ['두 줄', '여러 줄', '아무 무늬 없음'] },
      onApply: function () { applyEntranceUI('quantum'); setHint('20개까지는 그냥 보기 → 보통(Shift+2) → 빨리 감기(Shift+3) → 1만 개 건너뛰기(K)'); } },
    { name: '작은 구슬이면?', tag: '오개념', change: '보내는 것: 전자 → 작은 구슬', fixed: 'd 0.25 mm, L 2.0 m, 슬릿 둘, 보통 20 개/s',
      values: withBase({ send: 'marble', rate: 20 }),
      predict: { question: '작은 구슬을 하나씩 보내면 스크린에 무엇이 생길까?', choices: ['두 띠', '여러 줄', '아무 무늬 없음'] },
      onApply: function () { applyEntranceUI('quantum'); setHint('구슬이 쌓이면 K 로 1만 개 → 왼쪽 아래 [전자로 바꿔 보기]'); } },
    { name: '측정기를 켜면?', tag: '기묘함', change: '측정기 끔 → 켬', fixed: '전자, 빨리 감기 1000 개/s, 슬릿 둘',
      values: withBase({ send: 'electron', rate: 1000 }),
      predict: { question: '어느 슬릿을 지났는지 알아낼 수 있게 측정기를 켜면 무늬는?', choices: ['그대로', '사라진다', '두 줄로 바뀐다'] },
      onApply: function () { applyEntranceUI('quantum'); setHint('K 로 1만 개 → M(측정기 켬) → K 로 1만 개. 직전 무늬가 스크린 옆에 흐리게 남아요.'); } }
  ]);

  /* ---- 전용 키 ---- */
  SK.onKey(function (e) {
    if (e.shiftKey && /^Digit[123]$/.test(e.code)) { if (!e.repeat) setRateLevel(+e.code.slice(5) - 1); return true; }
    if (e.shiftKey) return false;
    if (e.repeat && /^Key[MKW]$/.test(e.code)) return true;
    if (e.code === 'KeyM') {
      if (SK.get('send') === 'wave') SK.notice('측정기는 하나씩 보낼 때 써요', 'info');
      else if (entrance === 'physics') SK.notice("측정기는 '전자기와 양자' 입구에서 써요", 'info');
      else SK.set('det', !SK.get('det'));
      return true;
    }
    if (e.code === 'KeyK') { skipMany(10000); return true; }
    if (e.code === 'KeyW') { SK.set('showWave', !SK.get('showWave')); return true; }
    return false;
  });

  /* ---- 수업 안내 서랍 (요구 D 대응표 — 결정서 §4-2 와 같은 내용) ---- */
  SK.guide({
    rows: [
      { target: '빛의 파장 λ(색) — 400~700 nm, 10 nm 눈금, 기본 650 · 즉시(점은 새로 쌓음)', standard: '[12물리03-01] 간섭 · 탐구: 이중 슬릿에 의한 빛의 간섭 관찰', discover: 'λ↑ → 간격↑ (비례)', misconception: '색은 간격과 관계없다' },
      { target: '슬릿 간격 d — 0.10~0.50 mm, 0.05 눈금, 기본 0.25 · 즉시', standard: '[12물리03-01]', discover: 'd↑ → 간격↓ (반비례)', misconception: '밝은 줄은 슬릿 수만큼' },
      { target: '스크린 거리 L — 0.5~3.0 m, 0.1 눈금, 기본 2.0 · 즉시', standard: '[12물리03-01], 교실 실험 거리', discover: 'L↑ → 간격↑', misconception: '—' },
      { target: '보내는 빠르기 — 1·20·1000 개/s (정밀 1~1000) · 즉시', standard: '[12전자03-01] 단일 양자', discover: '처음 수십 개는 무작위, 쌓이면 무늬', misconception: '하나씩 보내면 간섭 없음' },
      { target: '보내는 것 (상황) — 빛 / 광자 / 전자 / 구슬 · 다시 시작', standard: '[12전자03-01] 이중성, 구슬은 비교용', discover: '구슬은 두 띠, 광자·전자는 여러 줄', misconception: '전자는 작은 공' },
      { target: '슬릿 (상황) — 둘 / 위만 / 아래만 · 즉시 (화면의 슬릿을 눌러도 막혀요)', standard: '[12물리03-01] 간섭 조건', discover: '하나만 열면 넓은 띠 하나', misconception: '슬릿 하나면 줄 하나' },
      { target: '측정기 (상황) — 켬 / 끔 · 즉시(직전 무늬 흐리게 남김)', standard: "[12전자03-01] '기묘함', 연계 [12전자03-02]", discover: '알아낼 수 있으면 무늬 소멸', misconception: '보는 것과 관계없다' },
      { target: '슬릿 폭 a, 가속 전압 — 심화 ▸', standard: "해설 '드브로이 정성'", discover: '—', misconception: '—' }
    ],
    sections: [
      { title: '수업 흐름', items: [
        '① 예측: 밝은 줄은 몇 개? (구슬 먼저 → 4번 프리셋)',
        '② 실행: 빛 → 전자 (Space)',
        '③ 규칙 찾기 — 물리학: λ·d·L 중 하나만 바꿔 S / 양자: 1 → 20 → 1000 개/s 로 쌓이는 과정',
        "④ 생각해 보기: '전자 하나는 어느 슬릿을 지났을까?'(정답 없는 토론) · '하나를 바꾸면 간격은?'(형성 평가)"
      ] },
      { title: '모형과 축척 (교사용 설명)', items: [
        '스크린 세로 600u = 실제 ±30 mm (1 mm = 10u) → 화면에 "스크린 ×20 확대"로 표시.',
        '확대창은 가운데 ±15 mm (×24). 5줄 사이(5.2 mm × 5 = 26 mm)를 한 번에 재려고 결정서의 ±10 mm 보다 넓혔어요.',
        '슬릿판~스크린 거리·슬릿 간격 그림과 파면의 파장은 눈에 보이게 키운 모형이에요(축척 아님). 무늬 위치·간격 숫자는 실제 값으로 계산해요.',
        '전자 모드 상대 크기: 파장 1 = 130 nm 상당, 간격 1 = 0.05 mm 상당, 거리 1 = 0.4 m 상당으로 같은 식에 넣어요(무늬 간격 단위 = 눈금).',
        '구슬: 발사기~슬릿 0.1 m 에서 퍼져 나온 구슬이 곧게 지나 생기는 슬릿 그림자(두 띠 사이 = d × (0.1 + L) ÷ 0.1), 흩어짐 0.6 mm.',
        '측정기 문구는 "알아낼 수 있게 장치를 두면"으로 씀 ("눈으로 보면" 표현 쓰지 않음).'
      ] },
      { title: '확인할 것', items: ['교과서 쪽수·활동 이름 (확인 필요)', '[12전자03-02] 는 연계(정성)로만 다룸'] }
    ],
    keys: 'M 측정기 · K 1만 개 건너뛰기 · W 파면 · Shift+1/2/3 빠르기 느리게/보통/빨리 감기'
  });

  installPointer();
  updatePanel();
  applyEntranceUI('physics');
  askEntrance(false);
})(typeof window !== 'undefined' ? window : globalThis);
