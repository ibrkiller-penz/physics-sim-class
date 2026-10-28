/* =====================================================================
   이중 슬릿: 빛에서 전자 하나까지 (double-slit-quantum) — R1 고도화 1차 2026-10-28
   공통 틀 SimKit(../../shared/sim.js, docs/SIMKIT.md R1) 위에서 동작. 일반 <script>, file:// 동작.
   명세: docs/04_팀장결정서.md §4-2 · 고도화: docs/개선/R1_계획.md D1~D10

   [물리 모델]  y = 스크린 위 위치(mm, 위쪽 +), 모든 계산은 SI 를 mm 로 환산
     두 슬릿:   I(y) = cos²(π d y / λL) · sinc²(π a y / λL)        (a = 슬릿 폭 0.05 mm, '더 많은 설정'에서만 변경)
     한 슬릿:   I(y) = sinc²(π a (y − y_s) / λL),  y_s = ±d/2
     측정기 켬: I(y) = ½[sinc²(…(y − d/2)) + sinc²(…(y + d/2))]    (간섭항 없음, 확률을 더함)
     구슬:      한 슬릿을 무작위로 골라 곧게 지남. 발사기(슬릿 앞 S = 0.1 m)에서 퍼져 나간 구슬의
                그림자 중심 y_s·(S+L)/S + 가우스 흩어짐 σ = 0.6 mm → 두 띠
     무늬 간격: Δy = λL/d   (650 nm, 0.25 mm, 2.0 m → 5.2 mm / 450 nm → 3.6 mm)
     점 뽑기:   [−30, 30] mm 를 0.05 mm 칸 1200 개로 나눈 누적 분포표의 역함수 표본
     드브로이:  λ = h / √(2 m_e e V)  (1000 V → 38.8 pm). 화면 무늬는 모형: λ_모형 = 650 nm × √(1000 V / V),
                d = 0.05 mm × d(a.u.), L = 0.4 m × L(a.u.) 를 같은 식에 넣음 → 1000 V·5·5 에서 5.2 a.u.

   [화면 축척]  실험 화면 논리 좌표 1250×660 (stageH 660)
     스크린 세로 480u = 실제 ±30 mm → 8 u/mm · 확대창 310×310u = 가운데 ±15 mm
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
     2. 화면 상수 (논리 좌표 u, 실험 화면 1250×660 — R1)
     ------------------------------------------------------------------
     왼쪽 위(상태 칩·실험 카드 설명)는 비워 두고, 글자 라벨은 장치 아래 줄에 모은다.
     ================================================================== */
  var SK = global.SimKit;
  var SCR_X = 730, SCR_W = 56, SCR_TOP = 100, SCR_H = 480, PX_MM = 8, Y0 = SCR_TOP + SCR_H / 2;   // 스크린 ±30 mm
  var SCR_BOT = SCR_TOP + SCR_H;
  var GH_X = 792, GH_W = 22;                       // 직전 실행 무늬 띠
  var RUL_X = 820;                                 // mm 눈금자
  var ZX = 900, ZY = 146, ZW = 300, ZH = 300, Z_RANGE = 15, ZPX = ZH / (2 * Z_RANGE);  // 확대창 (가운데 ±15 mm)
  var PROF_W = 100;                                // 스크린 왼쪽 밝기 곡선 폭
  var SRC_R = 130;                                 // 광원 오른쪽 끝 x
  var DS = 2;                                      // 오프스크린 해상도 배율
  var T_FLY1 = 0.25, T_FLY2 = 0.25;                // 날아가는 시간(광원→슬릿, 슬릿→스크린)
  var DOT_CAP = 50000;
  var WAVE_END = 1.5;                              // 빛: 켜고 1.5 s 뒤 '끝' (판정·해설)
  var GOAL = 3000;                                 // 하나씩: 3,000개 쌓이면 '끝'
  var V_REF = 1000;                                // 전자 모형: 1000 V 일 때 화면 무늬 = 빛 650 nm 와 같은 크기
  var FONT = '';
  var KIND_LABEL = { wave: '빛(레이저)', photon: '광자 하나씩', electron: '전자 하나씩', marble: '작은 구슬' };
  var RATE_LEVELS = [1, 20, 1000];
  var DIST_KEYS = { lam: 1, d: 1, L: 1, V: 1, dR: 1, LR: 1, a: 1, slit: 1, det: 1 };

  /* ---- 상태 ---- */
  var entrance = 'physics';  // 'physics' 빛으로 줄무늬 재기 / 'quantum' 하나씩 보내기
  var cur = null;            // 지금 분포를 만든 값 {p, g, comps, imax, Z}
  /* 히스토그램: 0.1 mm 고운 칸에 쌓고, 그릴 때 무늬 간격에 맞춰 묶는다(칸 ≤ Δy/4). */
  var HF_W = 0.1, NHF = Math.round((Y_MAX - Y_MIN) / HF_W);   // 600
  var count = 0, sinceFade = 0, histF = new Float64Array(NHF), hview = null;
  function fringeMode(g) { return g.kind !== 'marble' && g.slit === 'both' && !(g.det && g.kind !== 'wave'); }
  function histK() {
    if (!cur || !fringeMode(cur.g)) return 5;
    return Math.max(1, Math.min(5, Math.floor(fringe(cur.g) / HF_W / 4)));
  }
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
  var meas = { a: null, b: null, n: 1, drag: false, fresh: false, y0: 0, used: false };
  var ghostRef = null, ghostDots = null, ghostPat = null, ghostPatRef = null;
  var burst = false, burstTimer = 0;
  var theoryOpen = false;     // 띠의 이론값 '답 확인하기'를 열었나
  var presetHint = '';        // 실험 카드가 정한 '실행' 단계 안내
  var dotsCv, dotsCtx, zoomCv, zoomCtx, patCv, zpatCv;
  var ui = {};               // DOM 참조

  /* 전자 모드: 가속 전압 V → 드브로이 파장. 화면 무늬는 같은 식(Δy = λL/d)에 '모형 단위'로 넣는다 */
  function lamModelNm(V) { return 650 * Math.sqrt(V_REF / V); }
  function pmOf(V) { return deBroglieNm(V) * 1000; }
  function geomOf(p) {
    var el = p.send === 'electron';
    return {
      kind: p.send,
      lamNm: el ? lamModelNm(p.V) : p.lam,
      dMm: el ? 0.05 * p.dR : p.d,
      Lm: el ? 0.4 * p.LR : p.L,
      aMm: p.a, slit: p.slit, det: !!p.det
    };
  }
  function isQuantum(k) { return k === 'photon' || k === 'electron'; }
  function unitY(p) { return p.send === 'electron' ? 'a.u.' : 'mm'; }

  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.round(w * DS); c.height = Math.round(h * DS); return c; }
  function rgbStr(c, a) { return a === undefined ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lighten(c, t) { return [Math.round(c[0] + (255 - c[0]) * t), Math.round(c[1] + (255 - c[1]) * t), Math.round(c[2] + (255 - c[2]) * t)]; }
  function darken(c, t) { return [Math.round(c[0] * t), Math.round(c[1] * t), Math.round(c[2] * t)]; }
  function curveColor(p) {
    if (p.send === 'electron') return SK.color('--color-sim-slit');
    if (p.send === 'marble') return SK.color('--color-copper');
    return rgbStr(darken(lamRGB(p.lam), 0.72));
  }
  function dotColor(p) {
    if (p.send === 'electron') return SK.color('--color-sim-slit-tint');
    if (p.send === 'marble') return SK.color('--color-copper-tint');
    return rgbStr(lighten(lamRGB(p.lam), 0.35));
  }
  function waveColor(p, a) {
    if (p.send === 'electron') return SK.color('--color-sim-slit');
    return rgbStr(lamRGB(p.lam), a);
  }
  function yToScr(y) { return Y0 - y * PX_MM; }
  function yToZoom(y) { return ZY + ZH / 2 - y * ZPX; }
  function zoomToY(py) { return (ZY + ZH / 2 - py) / ZPX; }
  function slitX(g) { var Lv = Math.max(0.5, Math.min(3.0, g.Lm)); return SCR_X - (60 + 150 * Lv); }
  function slitSep(g) { return 60 + (Math.max(0.1, Math.min(0.5, g.dMm)) - 0.1) / 0.4 * 140; }
  function slitOpenH(g) { return 4 + g.aMm * 160; }
  function waveLen(g) { return 26 * Math.min(2.2, g.lamNm / 650); }
  function fmtN(n) { return Math.round(n).toLocaleString('ko-KR'); }

  /* ==================================================================
     3. 분포·점 쌓기
     ================================================================== */
  function rebuild(p) {
    var g = geomOf(p);
    var comps = (g.kind === 'wave') ? null : buildComps(g);
    var dist = buildDist(g);
    cur = { p: copy(p), g: g, comps: comps, dist: dist, imax: dist.imax || 1, Z: dist.total * CDF_STEP };
    buildPattern();
  }
  function clearDots() {
    count = 0; sinceFade = 0; histF = new Float64Array(NHF); hview = null; emitAcc = 0; flyers = []; lastDot = null;
    dotsCtx.setTransform(1, 0, 0, 1, 0, 0); dotsCtx.clearRect(0, 0, dotsCv.width, dotsCv.height);
    zoomCtx.setTransform(1, 0, 0, 1, 0, 0); zoomCtx.clearRect(0, 0, zoomCv.width, zoomCv.height);
  }
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
    dotsCtx.beginPath(); dotsCtx.arc(x * DS, yy * DS, 2.6 * DS, 0, 6.2832); dotsCtx.fill();
    if (Math.abs(y) < Z_RANGE) {
      zoomCtx.fillStyle = col;
      var zx = 5 + Math.random() * (ZW - 10), zy = (Z_RANGE - y) * ZPX;
      zoomCtx.beginPath(); zoomCtx.arc(zx * DS, zy * DS, 2.2 * DS, 0, 6.2832); zoomCtx.fill();
    }
    if (sinceFade >= DOT_CAP) fadeDots();
    lastDot = { y: y, t: SK.time };
  }
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
  function goalText() { return '점 ' + fmtN(count) + '개가 쌓였어요 — [기록하기]로 저장해요'; }
  function skipMany(n) {
    if (!cur || cur.p.send === 'wave') { SK.notice('한꺼번에 보내기는 하나씩 보내는 실험에서 써요', 'info'); return; }
    if (!SK.started) SK.stepFrame(1);
    if (SK.stepName === '예측') SK.goStep(1);
    for (var i = 0; i < n; i++) deposit(sampleComps(cur.comps, Math.random).y);
    hadRun = true;
    if (SK.started && !SK.finished && count >= GOAL) SK.finish(goalText());
    else SK.notice(fmtN(n) + '개를 한꺼번에 보냈어요 (모두 ' + fmtN(count) + '개)', 'ok', 2000);
    SK.requestRender();
  }
  function hasData() { return cur && ((cur.p.send === 'wave' && hadRun) || count >= 30); }

  /* 값이 바뀌면 SimKit 의 '새 실행'으로 넘긴다(SK.reset) — 바꾸기 전 무늬는 직전 실행으로 남김 */
  var suppressCapture = false;
  function onDistChange() {
    var oldP = cur ? copy(cur.p) : null, keep = !burst && hasData();
    var wasRunning = SK.running;
    burst = true; clearTimeout(burstTimer);
    burstTimer = setTimeout(function () { burst = false; }, 700);
    suppressCapture = !keep;
    SK.reset();
    suppressCapture = false;
    if (keep && SK.ghost && oldP) { SK.ghost.params = oldP; ghostPatRef = null; }
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
     4. 측정 (확대창) — 밝은 줄 가운데를 누르고 다음 밝은 줄까지 끌기(또는 두 번 누르기)
     ================================================================== */
  function clearMeasure() { meas.a = null; meas.b = null; meas.drag = false; }
  function measuredGap() {
    if (meas.a === null || meas.b === null || Math.abs(meas.a - meas.b) < 0.05) return null;
    return Math.abs(meas.a - meas.b) / meas.n;
  }
  var N_MAX = 5;
  var BTN = {
    minus: { x: ZX, y: 510, w: 52, h: 50 },
    plus: { x: ZX + 122, y: 510, w: 52, h: 50 },
    clear: { x: ZX + ZW - 124, y: 510, w: 124, h: 50 }
  };
  function inRect(pt, r) { return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h; }
  function setN(n) {
    meas.n = Math.max(1, Math.min(N_MAX, n));
    SK.requestRender(); SK.update();
  }
  function installPointer() {
    var cv = SK.view.canvas, active = null;
    cv.addEventListener('pointerdown', function (e) {
      var pt = SK.view.toLogical(e);
      if (pt.x >= ZX && pt.x <= ZX + ZW && pt.y >= ZY && pt.y <= ZY + ZH) {
        var y = Math.max(-Z_RANGE, Math.min(Z_RANGE, zoomToY(pt.y)));
        if (meas.a !== null && meas.b === null) { meas.b = y; meas.fresh = false; }
        else { meas.a = y; meas.b = null; meas.fresh = true; meas.y0 = pt.y; }
        meas.drag = true; meas.used = true; active = e.pointerId;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
        SK.requestRender(); SK.update(); e.preventDefault(); return;
      }
      if (inRect(pt, BTN.minus)) { setN(meas.n - 1); return; }
      if (inRect(pt, BTN.plus)) { setN(meas.n + 1); return; }
      if (inRect(pt, BTN.clear)) { clearMeasure(); SK.requestRender(); SK.update(); return; }
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
      var pt = SK.view.toLogical(e);
      var over = (pt.x >= ZX && pt.x <= ZX + ZW && pt.y >= ZY && pt.y <= ZY + ZH);
      var btn = inRect(pt, BTN.minus) || inRect(pt, BTN.plus) || inRect(pt, BTN.clear);
      cv.style.cursor = over ? 'crosshair' : btn ? 'pointer' : '';
      if (!meas.drag || e.pointerId !== active) return;
      var y = Math.max(-Z_RANGE, Math.min(Z_RANGE, zoomToY(pt.y)));
      if (meas.fresh) { if (Math.abs(pt.y - meas.y0) > 8) meas.b = y; }
      else meas.b = y;
      SK.requestRender();
    });
    function up(e) { if (e.pointerId === active) { meas.drag = false; active = null; SK.requestRender(); SK.update(); } }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
  }

  /* ==================================================================
     5. 기록용 결과
     ================================================================== */
  function theoryText(p, g) {
    if (p.send === 'marble') return '줄무늬 없음';
    if (!fringeMode(g)) return '줄무늬 없음';
    return SK.fmt(fringe(g), 1) + ' ' + unitY(p);
  }
  function lamText(p) {
    if (p.send === 'marble') return '—';
    if (p.send === 'electron') return SK.fmt(pmOf(p.V), 1) + ' pm (' + fmtN(p.V) + ' V)';
    return p.lam + ' nm';
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
        lamT: lamText(p),
        dT: el ? p.dR + ' a.u.' : SK.fmt(p.d, 2) + ' mm',
        LT: el ? p.LR + ' a.u.' : SK.fmt(p.L, 1) + ' m',
        count: p.send === 'wave' ? '—' : count,
        meas: mg === null ? '–' : SK.fmt(mg, 2) + ' ' + unitY(p),
        theo: theoryText(p, g),
        measN: mg,
        theoN: fringeMode(g) ? fringe(g) : null
      }
    };
  }

  /* ==================================================================
     6. 그리기
     ================================================================== */
  function txt(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.w || 600) + ' ' + (o.size || 20) + 'px ' + FONT;
    ctx.fillStyle = o.raw || SK.color(o.color || '--color-ink');
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
    ctx.fillRect(sx - w / 2, ys.bottom + oh / 2, w, SCR_BOT - (ys.bottom + oh / 2));
    // 값이 바뀐 변수는 그림에서 잠깐 강조 (d: 두 슬릿 사이, L: 거리 화살표)
    if (SK.isFlashing('d') || SK.isFlashing('dR')) {
      ctx.save(); ctx.strokeStyle = SK.color('--color-copper'); ctx.lineWidth = 4;
      SK.arrow(ctx, sx - 26, Y0, sx - 26, ys.top + 2, { color: '--color-copper', width: 3, head: 10 });
      SK.arrow(ctx, sx - 26, Y0, sx - 26, ys.bottom - 2, { color: '--color-copper', width: 3, head: 10 });
      ctx.restore();
    }
    ['top', 'bottom'].forEach(function (s) {
      var blocked = p.slit !== 'both' && p.slit !== s;
      if (blocked) {
        ctx.fillStyle = SK.color('--color-copper');
        roundRect(ctx, sx - 14, ys[s] - oh / 2 - 12, 28, oh + 24, 4); ctx.fill();
        txt(ctx, '막음', sx - 22, ys[s], { align: 'right', size: 20, w: 700, color: '--color-copper-text' });
      }
    });
    txt(ctx, '이중 슬릿', sx, SCR_BOT + 20, { align: 'center', size: 22, w: 700 });
    if (p.det && p.send !== 'wave') {
      ['top', 'bottom'].forEach(function (s) {
        if (p.slit !== 'both' && p.slit !== s) return;
        var on = SK.time - flash[s] < 0.18;
        ctx.fillStyle = SK.color(on ? '--color-copper' : '--color-copper-tint');
        ctx.strokeStyle = SK.color('--color-copper'); ctx.lineWidth = 3;
        roundRect(ctx, sx + 12, ys[s] - (s === 'top' ? 44 : -16), 40, 28, 5); ctx.fill(); ctx.stroke();
      });
      txt(ctx, '측정기', sx + 58, ys.top - 30, { size: 20, w: 700, color: '--color-copper-text' });
    }
    // 거리 L
    var yL = SCR_BOT + 46, flashL = SK.isFlashing('L') || SK.isFlashing('LR');
    var lc = flashL ? '--color-ok' : '--color-line-strong';
    SK.arrow(ctx, sx + 4, yL, SCR_X - 4, yL, { color: lc, width: flashL ? 4 : 2, head: 10 });
    SK.arrow(ctx, SCR_X - 4, yL, sx + 4, yL, { color: lc, width: flashL ? 4 : 2, head: 10 });
    var Ltxt = p.send === 'electron' ? 'L = ' + p.LR + ' a.u. (모형 단위)' : 'L = ' + SK.fmt(p.L, 1) + ' m (그림은 줄인 모형)';
    ctx.font = '600 20px ' + FONT;
    var tw = ctx.measureText(Ltxt).width + 20;
    ctx.fillStyle = SK.color('--color-paper-raised');
    ctx.fillRect((sx + SCR_X) / 2 - tw / 2, yL - 14, tw, 28);
    txt(ctx, Ltxt, (sx + SCR_X) / 2, yL, { align: 'center', size: 20, w: 600, color: flashL ? '--color-ok' : '--color-ink-muted' });
    return { sx: sx, ys: ys };
  }

  function drawWaves(ctx, p, g, geo) {
    var k = p.send; if (k === 'marble' || !SK.params.showWave) return;
    var lv = waveLen(g), ph = (SK.time * 1.2) % 1, strong = k === 'wave';
    ctx.save();
    ctx.globalAlpha = strong ? 0.6 : 0.3;
    ctx.strokeStyle = waveColor(p); ctx.lineWidth = strong ? 3 : 2;
    var half = slitSep(g) / 2 + 40;
    ctx.beginPath();
    for (var x = geo.sx - 8 - ((1 - ph) * lv) % lv; x > SRC_R + 4; x -= lv) { ctx.moveTo(x, Y0 - half); ctx.lineTo(x, Y0 + half); }
    ctx.stroke();
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
        if (f.slit) {
          var sy = geo.ys[f.slit], ey = yToScr(f.y);
          x = geo.sx + dist * v; y = sy + (ey - sy) * v;
          ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, p.send === 'marble' ? 7 : 5, 0, 6.2832); ctx.fill();
        } else {
          ctx.save(); ctx.globalAlpha = 0.45 * (1 - v * 0.6); ctx.strokeStyle = dark; ctx.lineWidth = 3;
          ['top', 'bottom'].forEach(function (s) {
            if (p.slit !== 'both' && p.slit !== s) return;
            ctx.beginPath(); ctx.arc(geo.sx, geo.ys[s], Math.max(1, dist * v), -1.2, 1.2); ctx.stroke();
          });
          ctx.restore();
        }
      }
    });
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
    txt(ctx, '스크린', SCR_X + SCR_W / 2, SCR_BOT + 20, { align: 'center', size: 22, w: 700 });
    // 직전 실행 무늬 띠
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
    txt(ctx, '직전 실행', GH_X - 4, SCR_TOP - 14, { size: 18, w: 600, color: '--color-ink-muted' });
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
    ctx.strokeStyle = SK.color('--color-ink'); ctx.fillStyle = SK.color('--color-ink');
    for (var mm = Y_MIN; mm <= Y_MAX; mm++) {
      var y = yToScr(mm), big = mm % 5 === 0;
      ctx.lineWidth = big ? 2.5 : 1;
      ctx.beginPath(); ctx.moveTo(RUL_X, y); ctx.lineTo(RUL_X + (big ? 14 : 6), y); ctx.stroke();
    }
    for (var m2 = -20; m2 <= 20; m2 += 10) txt(ctx, m2 === 0 ? '0' : SK.fmt(m2, 0), RUL_X + 17, yToScr(m2), { size: 18, w: 600 });
    txt(ctx, unitY(p), RUL_X + 4, SCR_BOT + 20, { size: 20, w: 700, color: '--color-ink-muted' });
  }

  /** 스크린 왼쪽 밝기 곡선 (이론·쌓인 개수 막대·직전·기록) */
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

  function patternVisible(p) { return p.send === 'wave' || count >= 200; }

  function drawZoom(ctx, p) {
    var u = unitY(p);
    ctx.fillStyle = SK.color('--color-ink');
    roundRect(ctx, ZX, ZY, ZW, ZH, 8); ctx.fill();
    ctx.save(); roundRect(ctx, ZX, ZY, ZW, ZH, 8); ctx.clip();
    if (p.send === 'wave') ctx.drawImage(zpatCv, ZX, ZY, ZW, ZH);
    else if (SK.params.showDots) ctx.drawImage(zoomCv, ZX, ZY, ZW, ZH);
    ctx.strokeStyle = SK.color('--color-paper-raised'); ctx.fillStyle = SK.color('--color-paper-raised');
    for (var mm = -Z_RANGE; mm <= Z_RANGE; mm++) {
      var y = yToZoom(mm), big = mm % 5 === 0;
      ctx.lineWidth = big ? 3 : 1.5;
      ctx.beginPath(); ctx.moveTo(ZX, y); ctx.lineTo(ZX + (big ? 22 : 10), y); ctx.stroke();
      if (big && Math.abs(mm) < Z_RANGE) txt(ctx, mm === 0 ? '0' : SK.fmt(mm, 0), ZX + 28, y, { size: 18, w: 700, color: '--color-paper-raised' });
    }
    function line(yv, lab) {
      var py = yToZoom(yv);
      ctx.strokeStyle = SK.color('--color-focus-on-dark'); ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
      ctx.beginPath(); ctx.moveTo(ZX, py); ctx.lineTo(ZX + ZW, py); ctx.stroke(); ctx.setLineDash([]);
      txt(ctx, lab, ZX + ZW - 10, py - 14, { align: 'right', size: 20, w: 700, color: '--color-focus-on-dark' });
    }
    if (meas.a !== null) line(meas.a, 'A');
    if (meas.b !== null) {
      line(meas.b, 'B');
      var xa = ZX + ZW - 60;
      SK.arrow(ctx, xa, yToZoom(meas.a), xa, yToZoom(meas.b), { color: '--color-focus-on-dark', width: 3, head: 12 });
    }
    // 처음 한 번: 재는 방법 그림 안내 (손가락 + 화살표)
    if (!meas.used && patternVisible(p) && fringeMode(cur.g)) {
      var bx = ZX + 10, by = ZY + ZH - 96, bw = ZW - 20, bh = 86;
      ctx.fillStyle = SK.color('--color-paper-raised');
      roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
      ctx.strokeStyle = SK.color('--color-sim-slit'); ctx.lineWidth = 3; roundRect(ctx, bx, by, bw, bh, 10); ctx.stroke();
      var bob = Math.sin(performance.now() / 260) * 6;
      txt(ctx, String.fromCodePoint(0x1F446), bx + 26, by + 43 + bob, { align: 'center', size: 32, w: 400 });
      SK.arrow(ctx, bx + 54, by + 16, bx + 54, by + 70, { color: '--color-sim-slit', width: 3, head: 10 });
      txt(ctx, '① 밝은 줄을 누르고', bx + 68, by + 26, { size: 19, w: 700 });
      txt(ctx, '② 다음 밝은 줄까지 끌기', bx + 68, by + 60, { size: 19, w: 700 });
      SK.requestRender();
    }
    ctx.restore();
    ctx.strokeStyle = SK.color('--color-sim-slit'); ctx.lineWidth = 4;
    roundRect(ctx, ZX, ZY, ZW, ZH, 8); ctx.stroke();
    ctx.fillStyle = SK.color('--color-sim-slit');
    roundRect(ctx, ZX + ZW - 232, ZY + 8, 224, 34, 6); ctx.fill();
    txt(ctx, '확대창 · 가운데 ±' + Z_RANGE + ' ' + u, ZX + ZW - 120, ZY + 25, { align: 'center', size: 20, w: 700, color: '--color-ink-inverse' });
    // 스크린 위 확대 범위 표시
    ctx.strokeStyle = SK.color('--color-sim-slit'); ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.strokeRect(SCR_X - 3, yToScr(Z_RANGE), SCR_W + 6, 2 * Z_RANGE * PX_MM); ctx.setLineDash([]);

    // ---- 측정 계산칸 (확대창 아래) ----
    var px = ZX, dist = meas.a !== null && meas.b !== null && Math.abs(meas.a - meas.b) >= 0.05 ? Math.abs(meas.a - meas.b) : null;
    txt(ctx, '내가 잰 길이 A~B', px, 466, { size: 20, w: 600, color: '--color-ink-muted' });
    txt(ctx, dist === null ? (meas.a === null ? '–' : 'B 를 정해요') : SK.fmt(dist, 1) + ' ' + u,
      ZX + ZW, 466, { align: 'right', size: dist === null ? 20 : 26, w: 800, color: dist === null ? '--color-ink-muted' : '--color-ink' });
    txt(ctx, '칸 수 n (1~' + N_MAX + ')', px, 494, { size: 20, w: 600 });
    txt(ctx, meas.n === 1 ? '= 이웃한 밝은 줄 2개' : '= 밝은 줄 ' + (meas.n + 1) + '개 사이', ZX + ZW, 494, { align: 'right', size: 18, w: 600, color: '--color-ink-muted' });
    [['minus', '−'], ['plus', '+']].forEach(function (b) {
      var r = BTN[b[0]], off = (b[0] === 'minus' && meas.n <= 1) || (b[0] === 'plus' && meas.n >= N_MAX);
      ctx.fillStyle = SK.color('--color-paper-raised'); ctx.strokeStyle = SK.color(off ? '--color-line' : '--color-line-strong'); ctx.lineWidth = 3;
      roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
      txt(ctx, b[1], r.x + r.w / 2, r.y + r.h / 2, { align: 'center', size: 32, w: 700, color: off ? '--color-line-strong' : '--color-ink' });
    });
    txt(ctx, String(meas.n), (BTN.minus.x + BTN.minus.w + BTN.plus.x) / 2, BTN.minus.y + 26, { align: 'center', size: 34, w: 800 });
    var r = BTN.clear;
    ctx.fillStyle = SK.color('--color-paper-raised'); ctx.strokeStyle = SK.color('--color-line-strong'); ctx.lineWidth = 3;
    roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill(); ctx.stroke();
    txt(ctx, '측정 선 지우기', r.x + r.w / 2, r.y + r.h / 2, { align: 'center', size: 18, w: 700 });
    var mg = measuredGap();
    txt(ctx, '한 칸 간격 = 잰 길이 ÷ n', px, 586, { size: 20, w: 700 });
    txt(ctx, mg === null ? '아직 재지 않았어요' : SK.fmt(mg, 2) + ' ' + u, px, 620, { size: mg === null ? 20 : 30, w: 800, color: mg === null ? '--color-ink-muted' : '--color-sim-slit-text' });
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
    updateBand(p);
  }

  /* ==================================================================
     7. 하단 띠: 계기판 1줄 | 식 칸 (값마다 입력칸과 같은 색 점)
     ================================================================== */
  var lastM = {};
  function setText(el, key, s) { if (lastM[key] !== s) { el.textContent = s; lastM[key] = s; } }
  function dot(cls) { return SK.h('span', { class: 'dsq-dot dsq-dot--' + cls, 'aria-hidden': 'true' }); }
  function updateBand(p) {
    if (!ui.m1) return;
    var mg = measuredGap(), u = unitY(p), wave = p.send === 'wave';
    // 계기판: 빛 = 내가 잰 간격 · 칸 수 n · 빛의 색 / 하나씩 = 쌓인 점 · 보내는 빠르기 · 내가 잰 간격
    if (wave) {
      setText(ui.m1l, 'm1l', '내가 잰 간격'); setText(ui.m1, 'm1', mg === null ? '아직 안 잼' : SK.fmt(mg, 2) + ' ' + u);
      setText(ui.m2l, 'm2l', '칸 수 n'); setText(ui.m2, 'm2', String(meas.n));
      setText(ui.m3l, 'm3l', '빛의 색'); setText(ui.m3, 'm3', p.lam + ' nm');
      ui.m3sw.hidden = false; ui.m3sw.style.background = rgbStr(lamRGB(p.lam));
    } else {
      setText(ui.m1l, 'm1l', '쌓인 점'); setText(ui.m1, 'm1', fmtN(count) + '개');
      setText(ui.m2l, 'm2l', '보내는 빠르기'); setText(ui.m2, 'm2', fmtN(p.rate) + '개/s');
      setText(ui.m3l, 'm3l', '내가 잰 간격'); setText(ui.m3, 'm3', mg === null ? '아직 안 잼' : SK.fmt(mg, 2) + ' ' + u);
      ui.m3sw.hidden = true;
    }
    ui.m1.classList.toggle('is-empty', wave && mg === null);
    ui.m3.classList.toggle('is-empty', !wave && mg === null);
    // 식 칸
    var g = cur.g, key = [p.send, p.lam, p.d, p.L, p.V, p.dR, p.LR, p.slit, p.det, SK.records.length, theoryOpen, entrance, mg, meas.n].join('|');
    if (ui.eqKey === key) return;
    ui.eqKey = key;
    var l1 = ui.eq1, l2 = ui.eq2;
    l1.innerHTML = ''; l2.innerHTML = '';
    function add(el, kids) { kids.forEach(function (k) { el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); }); }
    function val(cls, s) { return SK.h('span', { class: 'dsq-val' }, [dot(cls), s]); }
    if (p.send === 'marble') {
      add(l1, [SK.h('b', { text: '구슬: 간섭 없음' }), SK.h('span', { class: 'dsq-muted', text: '두 슬릿의 그림자 띠 두 개' })]);
      add(l2, ['두 띠 사이 ≈ d × (0.1 m + L) ÷ 0.1 m = ', SK.h('b', { class: 'dsq-nowrap', text: SK.fmt(marbleGap(g), 1) + ' mm' })]);
      return;
    }
    if (p.send === 'electron') {
      add(l1, [SK.h('b', { text: 'λ = h ÷ √(2meV)' }), val('lam', SK.fmt(pmOf(p.V), 1) + ' pm'), SK.h('span', { class: 'dsq-muted dsq-nowrap', text: '(1 pm = 10⁻¹² m)' })]);
    } else {
      add(l1, [SK.h('b', { text: 'Δy = λL ÷ d' }), val('lam', 'λ ' + p.lam + ' nm'), val('L', 'L ' + SK.fmt(p.L, 1) + ' m'), val('d', 'd ' + SK.fmt(p.d, 2) + ' mm')]);
    }
    if (!fringeMode(g)) {
      add(l2, [SK.h('span', { class: 'dsq-muted', text: p.slit !== 'both' ? '슬릿이 하나뿐이라 겹칠 빛이 없어요 → 줄무늬 없음' : '어느 슬릿인지 알 수 있어 간섭이 없어요 → 줄무늬 없음' })]);
      return;
    }
    add(l2, [SK.h('span', { class: 'dsq-muted', text: p.send === 'electron' ? '화면 무늬 간격(이론) ' : '이론 Δy ' })]);
    if (!SK.records.length) {
      add(l2, [SK.h('span', { class: 'dsq-muted', text: '— 먼저 재고 기록하면 볼 수 있어요' })]);
    } else if (!theoryOpen) {
      var b = SK.h('button', { class: 'btn btn--sm btn--secondary dsq-reveal', type: 'button' }, '답 확인하기');
      b.addEventListener('click', function (e) {
        if (e.detail > 0) b.blur();
        var html = document.documentElement;
        if (html.classList.contains('reveal-locked') && !html.classList.contains('is-teacher')) { SK.notice('선생님이 열어 줄 때까지 기다려요', 'info'); return; }
        theoryOpen = true; ui.eqKey = null; updateBand(SK.params); if (ui.recTable) ui.recTable.render();
      });
      l2.appendChild(b);
    } else {
      var th = fringe(g), mgv = measuredGap();
      add(l2, ['= ', SK.h('b', { class: 'dsq-nowrap', text: SK.fmt(th, 1) + ' ' + u })]);
      if (mgv !== null) add(l2, [SK.h('span', { class: 'dsq-muted dsq-nowrap', text: ' · 내가 잰 값 ' + SK.fmt(mgv, 2) + ' ' + u + ' (차이 ' + Math.round(Math.abs(mgv - th) / th * 100) + '%)' })]);
      else add(l2, [SK.h('span', { class: 'dsq-muted', text: ' · 대입 과정은 [? 도움말 › 개념]' })]);
    }
  }

  /* ==================================================================
     8. SimKit 연결
     ================================================================== */
  function taskRun() {
    var p = SK.params;
    if (entrance === 'physics') {
      if (!SK.started) return presetHint || '▶ 실행으로 빛을 켜고, 오른쪽 확대창에서 밝은 줄 사이를 재요.';
      if (measuredGap() === null) return '확대창에서 밝은 줄 가운데를 누르고 몇 칸 떨어진 밝은 줄까지 끌어요. 그다음 칸 수 n 을 맞춰요.';
      if (SK.running) return '잰 간격 ' + SK.fmt(measuredGap(), 2) + ' ' + unitY(p) + ' — 빛이 다 켜지면 [기록하기]로 저장해요.';
      if (SK.finished && !SK.canRecord() && SK.records.length) return '저장했어요 (기록 ' + SK.records.length + '개). λ 하나만 바꾸면 무늬가 새로 켜져요 — 다시 재고 기록해요.';
      return '잰 간격 ' + SK.fmt(measuredGap(), 2) + ' ' + unitY(p) + ' — [기록하기]로 저장하고, λ 하나만 바꿔 다시 재요.';
    }
    if (!SK.started) return presetHint || '▶ 실행으로 하나씩 보내고, 점이 어디에 찍히는지 지켜봐요.';
    if (SK.running && count < 200) return '처음 몇 개는 아무 데나 찍히는 것 같죠? 오른쪽 [보통]·[빨리 감기]로 더 쌓아 봐요.';
    if (SK.running) return '점이 쌓이고 있어요 (' + fmtN(count) + '/' + fmtN(GOAL) + '개). 어느 자리에 몰리나요?';
    if (!SK.canRecord() && SK.records.length) return '저장했어요 (기록 ' + SK.records.length + '개). 측정기나 보내는 것 하나만 바꿔 다시 쌓고 기록해요.';
    return '무늬가 보이면 [기록하기]로 저장하고, 측정기나 보내는 것 하나만 바꿔 다시 해 봐요.';
  }
  function taskCompare() {
    var n = SK.records.length;
    if (entrance === 'physics') {
      var c = checkPhysics();
      return '기록 3개 이상 모아 λ 와 무늬 간격의 관계를 찾아요 — ' + (n >= 3 ? '✓' : '□') + ' 기록 ' + Math.min(n, 3) + '/3 · ' + (c.onlyLam ? '✓' : '□') + ' λ 만 바꿈 · ' + (c.prop ? '✓' : '□') + ' Δy 가 λ 에 비례?';
    }
    var q = checkQuantum();
    return '측정기 끔과 켬(또는 전자와 구슬)을 하나씩 기록해 무늬를 비교해요 — ' + (q.off ? '✓' : '□') + ' 측정기 끔 · ' + (q.on ? '✓' : '□') + ' 측정기 켬 또는 구슬';
  }
  /* 비교 체크리스트 판정 */
  function checkPhysics() {
    var recs = SK.records.filter(function (r) { return r.params.send === 'wave' || r.params.send === 'photon'; });
    var onlyLam = false, prop = false;
    if (recs.length >= 2) {
      var r0 = recs[0].params, lams = {};
      onlyLam = recs.every(function (r) { lams[r.params.lam] = 1; return r.params.d === r0.d && r.params.L === r0.L && r.params.slit === 'both'; }) && Object.keys(lams).length >= 2;
      var ks = recs.filter(function (r) { return typeof r.values.measN === 'number'; }).map(function (r) { return r.values.measN / r.params.lam; });
      if (onlyLam && ks.length >= 2) {
        var mn = Math.min.apply(null, ks), mx = Math.max.apply(null, ks);
        prop = (mx - mn) / mx < 0.12;
      }
    }
    return { onlyLam: onlyLam, prop: prop };
  }
  function checkQuantum() {
    var off = false, on = false;
    SK.records.forEach(function (r) {
      if (r.params.send === 'electron' || r.params.send === 'photon') { if (r.params.det) on = true; else off = true; }
      if (r.params.send === 'marble') on = true;
    });
    return { off: off, on: on };
  }

  SK.init({
    slug: 'double-slit-quantum',
    title: '이중 슬릿: 빛에서 전자 하나까지',
    subject: '물리학 · 전자기와 양자',
    unit: '빛과 물질 / 양자와 미시세계',
    standards: ['12물리03-01', '12전자03-01'],
    today: '파장을 바꾸면 무늬 간격은 어떻게 될까?',
    stepTasks: [
      { text: function () { return entrance === 'physics' ? '아래 실험 카드 하나를 골라 무늬 간격이 어떻게 될지 먼저 예측해요.' : '아래 실험 카드 하나를 골라 스크린에 무엇이 생길지 먼저 예측해요.'; } },
      { text: taskRun },
      { text: taskCompare },
      { text: '오른쪽 정리 질문에 답해요. 막히면 [개념 다시 보기]를 눌러요.' }
    ],
    dt: 1 / 240,
    stageFit: true,
    stageH: 660,
    onStep: function () { refreshChecklist(); },
    reset: function (p) {
      if (hadRun && !suppressCapture) snapshotGhostDots();
      hadRun = false;
      rebuild(p); clearDots(); clearMeasure();
      updatePanel();
    },
    step: function (dt, p) {
      hadRun = true;
      if (!cur) return;
      if (p.send === 'wave') { if (SK.time >= WAVE_END && !SK.finished) SK.finish('빛이 켜졌어요 — 확대창에서 밝은 줄 사이를 재고 [기록하기]'); return; }
      emitAcc += p.rate * dt;
      while (emitAcc >= 1) { emitAcc -= 1; emitOne(p, p.rate); }
      for (var i = flyers.length - 1; i >= 0; i--) {
        var f = flyers[i], age = SK.time - f.t0;
        if (f.slit && age >= T_FLY1 && !f.passed) { f.passed = true; if (p.det) flash[f.slit] = SK.time; }
        if (age >= T_FLY1 + T_FLY2) { if (f.dep) deposit(f.y); flyers.splice(i, 1); }
      }
      if (count >= GOAL && SK.running && !SK.finished) SK.finish(goalText());
    },
    render: render,
    capture: function () { if (!cur || suppressCapture) return null; return captureFrom(cur.p); },
    status: function (p) {
      var s = [KIND_LABEL[p.send]];
      if (p.send === 'electron') s.push(fmtN(p.V) + ' V (λ ' + SK.fmt(pmOf(p.V), 1) + ' pm)', 'd ' + p.dR + ' a.u.', 'L ' + p.LR + ' a.u.');
      else {
        if (p.send !== 'marble') s.push(p.lam + ' nm');
        s.push('d ' + SK.fmt(p.d, 2) + ' mm', 'L ' + SK.fmt(p.L, 1) + ' m');
      }
      if (p.slit !== 'both') s.push(p.slit === 'top' ? '위 슬릿만' : '아래 슬릿만');
      if (entrance === 'quantum' && p.send !== 'wave') s.push('측정기 ' + (p.det ? '켬' : '끔'));
      return s;
    },
    predictOnPreset: true,
    confirmPresetWithRecords: true
  });

  FONT = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
  dotsCv = makeCanvas(SCR_W, SCR_H); dotsCtx = dotsCv.getContext('2d');
  zoomCv = makeCanvas(ZW, ZH); zoomCtx = zoomCv.getContext('2d');
  patCv = document.createElement('canvas'); patCv.width = 1; patCv.height = SCR_H;
  zpatCv = document.createElement('canvas'); zpatCv.width = 1; zpatCv.height = ZH;

  /* ---- 수치 바꾸기 (핵심 3개: λ 또는 V · d · L) ---- */
  SK.addVar('values', { key: 'lam', label: '빛의 {{파장}}', symbol: 'λ', unit: 'nm', min: 400, max: 700, step: 10, value: 650, decimals: 0, precision: 0, ticks: [400, 550, 700], apply: 'live',
    hint: '예: 빨강 700 · 초록 530 · 보라 400 nm (1 nm = 10⁻⁹ m)' });
  SK.controls.lam.el.classList.add('dsq-rainbow');
  SK.addVar('values', { key: 'V', label: '전자 가속 전압', symbol: 'V', unit: 'V', min: 100, max: 5000, step: 100, value: 1000, decimals: 0, precision: 0, ticks: [100, 2500, 5000], apply: 'live',
    hint: '' });
  SK.addVar('values', { key: 'd', label: '{{슬릿}} 간격', symbol: 'd', unit: 'mm', min: 0.10, max: 0.50, step: 0.05, value: 0.25, decimals: 2, precision: 3, ticks: [0.1, 0.25, 0.5], apply: 'live',
    hint: '두 슬릿 가운데 사이의 거리 (1 mm = 10⁻³ m)' });
  SK.addVar('values', { key: 'dR', label: '{{슬릿}} 간격', symbol: 'd', unit: 'a.u.', min: 2, max: 10, step: 1, value: 5, decimals: 0, precision: 0, ticks: [2, 5, 10], apply: 'live',
    hint: '모형 단위(a.u.) — 실제 전자 실험의 슬릿 간격은 1 μm 보다 작아요' });
  SK.addVar('values', { key: 'L', label: '스크린 거리', symbol: 'L', unit: 'm', min: 0.5, max: 3.0, step: 0.1, value: 2.0, decimals: 1, precision: 2, ticks: [0.5, 2, 3], apply: 'live',
    hint: '슬릿에서 스크린까지 (그림은 줄여서 그렸어요)' });
  SK.addVar('values', { key: 'LR', label: '스크린 거리', symbol: 'L', unit: 'a.u.', min: 2, max: 7, step: 1, value: 5, decimals: 0, precision: 0, ticks: [2, 5, 7], apply: 'live',
    hint: '모형 단위(a.u.) — 화면에 보이게 키운 크기예요' });
  // 입력칸 이름 앞 색 점: 띠의 식(Δy = λL ÷ d)과 같은 색 (λ 파랑 · d 구리 · L 초록)
  [['lam', 'lam'], ['V', 'lam'], ['d', 'd'], ['dR', 'd'], ['L', 'L'], ['LR', 'L']].forEach(function (a) {
    var lab = SK.controls[a[0]].el.querySelector('.var__label');
    if (lab) lab.insertBefore(dot(a[1]), lab.firstChild);
  });
  ui.vHint = SK.controls.V.el.querySelector('.var__hint');
  ui.lamHint = SK.controls.lam.el.querySelector('.var__hint');
  function updateVHint() {
    if (!ui.vHint) return;
    var V = SK.get('V');
    ui.vHint.textContent = '드브로이 파장 λ = ' + SK.fmt(pmOf(V), 1) + ' pm — 전압을 높이면 전자가 빨라져 파장이 짧아져요';
  }

  // 보내는 빠르기: 3단 버튼 + 한꺼번에 보내기 (하나씩 보낼 때만)
  ui.speedBox = SK.h('div', { class: 'dsq-speedwrap' });
  ui.speedBox.appendChild(SK.h('p', { class: 'dsq-speed-label', text: '보내는 빠르기' }));
  var sp = SK.h('div', { class: 'dsq-speed', role: 'group', 'aria-label': '보내는 빠르기' });
  ui.speedBtns = [['느리게', 1], ['보통', 20], ['빨리 감기', 1000]].map(function (o, i) {
    var b = SK.h('button', { class: 'btn btn--secondary', type: 'button', title: '1초에 ' + fmtN(o[1]) + '개씩 보내요' }, [o[0], SK.h('span', { class: 'btn__sub', text: '1초에 ' + fmtN(o[1]) + '개' })]);
    b.addEventListener('click', function (e) { if (e.detail > 0) b.blur(); setRateLevel(i); });
    sp.appendChild(b);
    return b;
  });
  ui.speedBox.appendChild(sp);
  ui.skipBtn = SK.h('button', { class: 'btn btn--primary dsq-skip', type: 'button', title: '기다리지 않고 1만 개를 바로 쌓아요' }, '1만 개 한꺼번에 보내기');
  ui.skipBtn.addEventListener('click', function (e) { if (e.detail > 0) ui.skipBtn.blur(); skipMany(10000); });
  ui.speedBox.appendChild(ui.skipBtn);
  SK.panel('values').appendChild(ui.speedBox);

  /* ---- 상황 바꾸기 ---- */
  SK.addChoice('situation', {
    key: 'send', label: '무엇을 보낼까?', style: 'cards', apply: 'restart',
    options: [
      { value: 'wave', label: '빛(레이저)', sub: '연속된 빛' },
      { value: 'photon', label: '광자 하나씩', sub: '아주 약한 빛' },
      { value: 'electron', label: '전자 하나씩', sub: '전자총' },
      { value: 'marble', label: '작은 구슬', sub: '비교용 알갱이' }
    ], value: 'wave',
    onChange: function () { updatePanel(); }
  });
  SK.controls.send.el.classList.add('dsq-cards2');
  ui.sendNote = SK.h('p', { class: 'var__hint dsq-sendnote' });
  SK.controls.send.el.appendChild(ui.sendNote);
  SK.addChoice('situation', {
    key: 'slit', label: '열린 {{슬릿}}', apply: 'live',
    options: [{ value: 'both', label: '둘 다' }, { value: 'top', label: '위만' }, { value: 'bottom', label: '아래만' }],
    value: 'both'
  });
  SK.controls.slit.el.appendChild(SK.h('p', { class: 'var__hint', text: '실험 화면의 슬릿을 직접 눌러도 막고 열 수 있어요' }));
  SK.addToggle('situation', { key: 'det', label: '어느 슬릿인지 알아내는 {{측정기}}', value: false, apply: 'live', record: true });
  SK.controls.det.el.classList.add('dsq-bigswitch');
  ui.detNote = SK.h('p', { class: 'dsq-sub', text: '' });
  SK.controls.det.el.appendChild(ui.detNote);

  /* ---- 화면에 표시하기 ---- */
  var grid = SK.h('div', { class: 'dsq-grid2' });
  SK.panel('tools').appendChild(grid);
  SK.addToggle(grid, { key: 'showDots', label: '찍힌 점', value: true });
  SK.addToggle(grid, { key: 'showHist', label: '쌓인 개수 막대', value: true });
  SK.addToggle(grid, { key: 'showTheory', label: '{{이론 곡선}}', value: true });
  SK.addToggle(grid, { key: 'showWave', label: '물결(파면)', value: true });
  ['showDots', 'showHist', 'showTheory', 'showWave'].forEach(function (k) { SK.defs[k].record = false; });
  SK.addToggle('tools', { key: 'overlay', label: '이전 무늬 곡선 겹쳐 보기', value: true });
  SK.defs.overlay.record = false;

  /* ---- 더 많은 설정 ---- */
  SK.addVar('deep', { key: 'a', label: '슬릿 폭', symbol: 'a', unit: 'mm', min: 0.02, max: 0.10, step: 0.01, value: 0.05, decimals: 2, precision: 3, ticks: [0.02, 0.05, 0.1], apply: 'live',
    hint: '슬릿 하나의 너비. 넓을수록 바깥쪽 줄이 빨리 어두워져요(회절).' });
  SK.addVar('deep', { key: 'rate', label: '보내는 빠르기 (직접 입력)', unit: '개/s', min: 1, max: 1000, step: 1, value: 20, decimals: 0, precision: 0, ticks: [1, 500, 1000], apply: 'live', record: false, onChange: function () { updatePanel(); } });

  /* ---- 하단 띠: 계기판 1줄 | 식 칸 ---- */
  SK.el.band.style.gridTemplateColumns = 'minmax(0, 4.5fr) minmax(0, 5.5fr)';
  function meterCell(n) {
    var l = SK.h('span', { class: 'dsq-label' }), v = SK.h('b', { class: 'dsq-mval num' });
    ui['m' + n + 'l'] = l; ui['m' + n] = v;
    return SK.h('div', { class: 'dsq-meter' }, [l, SK.h('span', { class: 'dsq-mrow' }, n === 3 ? [ui.m3sw = SK.h('i', { class: 'dsq-swatch', 'aria-hidden': 'true' }), v] : [v])]);
  }
  SK.el.meters.appendChild(SK.h('div', { class: 'dsq-meters' }, [meterCell(1), meterCell(2), meterCell(3)]));
  ui.eq1 = SK.h('p', { class: 'dsq-eq__l1' }); ui.eq2 = SK.h('p', { class: 'dsq-eq__l2' });
  SK.el.graph.appendChild(SK.h('div', { class: 'dsq-eq' }, [ui.eq1, ui.eq2]));

  /* ---- 기록 표 (비교 단계 큰 판) ---- */
  ui.recTable = SK.recordTable(null, {
    columns: [
      { key: 'lamT', label: 'λ (파장)', from: 'value', changed: true, priority: 1 },
      { key: 'meas', label: 'Δy (내가 잰 값)', from: 'value', priority: 1 },
      { key: 'theo', label: 'Δy (이론)', from: 'value', priority: 1,
        text: function (rec) { return theoryOpen || !rec.values || rec.values.theo === '줄무늬 없음' ? (rec.values ? rec.values.theo : '–') : '답 확인 전'; } },
      { key: 'dT', label: 'd (슬릿 간격)', from: 'value', changed: true, priority: 1 },
      { key: 'LT', label: 'L (스크린 거리)', from: 'value', changed: true, priority: 2 },
      { key: 'send', label: '보내는 것(빛/전자/구슬)', from: 'param', priority: 2 },
      { key: 'slit', label: '열린 슬릿', from: 'param', priority: 2 },
      { key: 'det', label: '측정기', from: 'param', priority: 2 },
      { key: 'count', label: '쌓인 점', decimals: 0, from: 'value', priority: 2 }
    ]
  });
  // 비교 체크리스트 (기록 큰 판 맨 위)
  ui.check = SK.h('div', { class: 'dsq-check', 'aria-live': 'polite' });
  if (SK.el.recBigBody) SK.el.recBigBody.insertBefore(ui.check, SK.el.recBigBody.firstChild);
  function refreshChecklist() {
    if (!ui.check) return;
    var n = SK.records.length, rows;
    if (entrance === 'physics') {
      var c = checkPhysics();
      rows = [[n >= 3, '기록 3개 이상 (지금 ' + n + '개)'], [c.onlyLam, 'λ 만 바꿨어요 (d·L 은 그대로)'], [c.prop, 'Δy 가 λ 에 비례해요 — 내가 잰 Δy ÷ λ 가 거의 같아요']];
    } else {
      var q = checkQuantum();
      rows = [[q.off, '측정기를 끄고 전자(또는 광자)를 기록했어요'], [q.on, '측정기를 켜거나 구슬로 바꿔 기록했어요'], [false, '두 무늬가 어떻게 다른지 한 문장으로 말해 봐요']];
    }
    ui.check.innerHTML = '';
    ui.check.appendChild(SK.h('p', { class: 'dsq-check__t', text: '비교 체크리스트' }));
    rows.forEach(function (r) { ui.check.appendChild(SK.h('p', { class: 'dsq-check__row' + (r[0] ? ' is-ok' : '') }, [SK.h('span', { class: 'dsq-check__box', text: r[0] ? '✓' : '' }), r[1]])); });
  }
  SK.onRecords(function () { refreshChecklist(); ui.eqKey = null; SK.requestRender(); });

  /* ---- 패널 보이기·끄기 ---- */
  function show(key, on) { var c = SK.controls[key]; if (c) c.el.style.display = on ? '' : 'none'; }
  function updatePanel() {
    var send = SK.get('send'), el = send === 'electron', wave = send === 'wave', marble = send === 'marble', q = entrance === 'quantum';
    show('lam', !el); show('d', !el); show('L', !el);
    show('V', el); show('dR', el); show('LR', el);
    show('a', !el);
    SK.controls.a.enable(!marble);
    SK.controls.lam.enable(!marble);
    SK.controls.lam.el.title = marble ? '이 모드에서는 파장과 무관해요' : '';
    if (ui.lamHint) ui.lamHint.textContent = marble ? '구슬 실험에서는 파장을 쓰지 않아요 (잠김)' : '예: 빨강 700 · 초록 530 · 보라 400 nm (1 nm = 10⁻⁹ m)';
    show('send', q); show('det', q);
    var opts = SK.controls.send.el.querySelectorAll('.seg__opt');
    if (opts[0]) opts[0].style.display = q ? 'none' : '';
    SK.controls.det.enable(!wave);
    ui.detNote.textContent = wave ? '빛(레이저)에서는 쓰지 않아요 — 하나씩 보낼 때 켜 보세요'
      : marble ? '구슬은 측정기를 켜도 꺼도 두 띠 그대로예요'
      : '켜면 지난 슬릿 쪽 측정기가 깜빡여요. 사람이 보는지와 상관없이, 어느 길로 갔는지 정보가 남으면 줄무늬가 사라져요.';
    ui.sendNote.textContent = marble ? '구슬은 두 슬릿을 곧게 지나 그림자 두 개가 따로 생겨요(0.25 mm 간격 → 스크린에서 약 5 mm). 간섭 무늬는 없어요.'
      : el ? '전자는 화면에 보이게 키운 모형이에요. 실제 전자 실험의 슬릿 간격은 1 μm 보다 작아요.'
      : send === 'photon' ? '아주 약한 빛이라 광자가 한 번에 하나씩 도착해요.' : '';
    ui.sendNote.hidden = !ui.sendNote.textContent;
    ui.speedBox.style.display = wave || !q ? 'none' : '';
    var vp = SK.panel('values');   // 하나씩 보내기에서는 '보내는 빠르기'가 주 조작이라 수치 칸 맨 위로
    if (q && vp.firstChild !== ui.speedBox) vp.insertBefore(ui.speedBox, vp.firstChild);
    if (!q && vp.lastChild !== ui.speedBox) vp.appendChild(ui.speedBox);
    show('rate', q);
    SK.controls.rate.enable(!wave);
    ui.speedBtns.forEach(function (b, i) { b.disabled = wave; b.setAttribute('aria-pressed', String(!wave && SK.get('rate') === RATE_LEVELS[i])); });
    ui.skipBtn.disabled = wave;
    show('showDots', !wave); show('showHist', !wave);
    SK.controls.showWave.enable(!marble);
    updateVHint();
    var stops = [];
    for (var nm = 400; nm <= 700; nm += 25) stops.push(rgbStr(lamRGB(nm)) + ' ' + ((nm - 400) / 3).toFixed(1) + '%');
    SK.controls.lam.el.style.setProperty('--dsq-spectrum', 'linear-gradient(to right, ' + stops.join(', ') + ')');
  }
  function setRateLevel(i) {
    if (SK.get('send') === 'wave') { SK.notice('빛(레이저)에서는 빠르기를 쓰지 않아요', 'info'); return; }
    SK.set('rate', RATE_LEVELS[i]);
    SK.notice('보내는 빠르기: ' + ['느리게', '보통', '빨리 감기'][i] + ' (1초에 ' + fmtN(RATE_LEVELS[i]) + '개)', 'info', 1500);
  }
  Object.keys(DIST_KEYS).forEach(function (k) {
    var d = SK.defs[k]; if (!d) return;
    var prev = d.onChange;
    d.onChange = function (v, info) { if (prev) prev(v, info); onDistChange(); };
  });

  /* ---- 기록: 빛은 무늬가 늘 보이므로 실행 전에도 기록할 수 있게, 재지 않았으면 한 번 묻기 ---- */
  var origRecord = SK.record;
  SK.record = function () {
    if (SK.running) { origRecord(); return; }
    function go() {
      if (!SK.started && SK.params.send === 'wave') SK.stepFrame(1);
      if (SK.stepName === '예측' && SK.started) SK.goStep(1);
      origRecord();
      burst = false;
    }
    var can = SK.canRecord() || (!SK.started && SK.params.send === 'wave');
    if (can && entrance === 'physics' && cur && fringeMode(cur.g) && measuredGap() === null && patternVisible(SK.params)) {
      SK.confirm({
        title: '아직 간격을 재지 않았어요',
        body: '확대창에서 밝은 줄 사이를 재면 기록 표에 「내가 잰 값」이 남아 이론값과 비교할 수 있어요. 그래도 지금 기록할까요?',
        ok: '그래도 기록하기', cancel: '먼저 잴게요'
      }).then(function (yes) { if (yes) go(); });
      return;
    }
    go();
  };

  /* ==================================================================
     9. 실험 카드 · 정리 질문 · 도움말 (모드마다)
     ================================================================== */
  var BASE = { lam: 650, d: 0.25, L: 2.0, V: 1000, dR: 5, LR: 5, a: 0.05, slit: 'both', det: false };
  function withBase(o) { var r = copy(BASE); for (var k in o) r[k] = o[k]; return r; }
  var PRESETS = {
    physics: [
      { name: '밝은 줄 사이 재기', tag: '탐구 재현', change: '없음 — 기본 상태에서 재기', fixed: 'λ 650 nm · d 0.25 mm · L 2.0 m',
        values: withBase({ send: 'wave' }),
        predict: { question: '빨간 레이저 빛이 두 슬릿을 지나면 스크린에 어떤 무늬가 생길까?', choices: ['밝은 점 하나', '밝은 줄 두 개 (슬릿 수만큼)', '밝고 어두운 줄이 같은 간격으로 여러 개'],
          answer: 3, why: '두 빛이 겹쳐 보강된 곳은 밝고, 상쇄된 곳은 어두워 줄이 여러 개 생겨요.' },
        onApply: function () { presetHint = '▶ 실행 후 확대창에서 밝은 줄 6개(5칸)를 한 번에 끌어 재고 n = 5 로 맞춰요 — 여러 칸을 재고 나누면 더 정확해요.'; } },
      { name: '빨강과 파랑 비교', tag: '대표 문항', change: 'λ 650 → 450 nm', fixed: 'd 0.25 mm · L 2.0 m',
        values: withBase({ send: 'wave', lam: 450 }),
        predict: { question: '빨강(650 nm) 대신 파랑(450 nm) 빛을 비추면 무늬 간격은?', choices: ['넓어진다', '좁아진다', '그대로다'],
          info: '①에서 빨강을 재고 기록해 두면 두 무늬를 나란히 비교할 수 있어요.',
          answer: 2, why: 'Δy = λL ÷ d — λ 가 약 0.7배라 간격도 5.2 → 약 3.6 mm 로 좁아져요.' },
        onApply: function () { presetHint = '▶ 실행 후 파란 무늬의 밝은 줄 사이를 재고 기록해 빨강(①)과 비교해요.'; } },
      { name: '슬릿 간격 두 배', tag: '탐구 재현', change: 'd 0.25 → 0.50 mm', fixed: 'λ 650 nm · L 2.0 m',
        values: withBase({ send: 'wave', d: 0.5 }),
        predict: { question: '두 슬릿 사이를 두 배(0.50 mm)로 넓히면 무늬 간격은?', choices: ['두 배로 넓어진다', '반으로 좁아진다', '그대로다'],
          answer: 2, why: 'd 는 식의 분모라서 두 배면 Δy 는 ½배 — 5.2 → 2.6 mm.' },
        onApply: function () { presetHint = '▶ 실행 후 촘촘해진 밝은 줄을 여러 칸(n = 5) 재서 기록해요.'; } },
      { name: '스크린을 멀리', tag: '탐구 재현', change: 'L 2.0 → 3.0 m', fixed: 'λ 650 nm · d 0.25 mm',
        values: withBase({ send: 'wave', L: 3.0 }),
        predict: { question: '스크린을 2.0 m 에서 3.0 m 로 멀리 두면 무늬 간격은?', choices: ['1.5배로 넓어진다', '좁아진다', '그대로다'],
          answer: 1, why: 'Δy 는 L 에 비례 — L 이 1.5배라 5.2 → 7.8 mm.' },
        onApply: function () { presetHint = '▶ 실행 후 넓어진 밝은 줄 사이를 재고 기록해요.'; } },
      { name: '한 슬릿만 열면?', tag: '오개념', change: '슬릿 둘 → 위만', fixed: 'λ 650 nm · d 0.25 mm · L 2.0 m',
        values: withBase({ send: 'wave', slit: 'top' }),
        predict: { question: '두 슬릿 중 하나를 막으면 스크린 무늬는?', choices: ['밝은 줄 수가 반으로 준다', '줄무늬 없이 넓은 밝은 띠 하나', '그대로다'],
          answer: 2, why: '겹칠 빛이 없어 간섭이 안 생겨요. 한 슬릿에서 퍼진(회절) 넓은 띠만 보여요.' },
        onApply: function () { presetHint = '▶ 실행 후 줄무늬가 있는지 보고, 실험 화면의 막힌 슬릿을 눌러 다시 열어 비교해요.'; } }
    ],
    quantum: [
      { name: '전자 하나씩', tag: '탐구 재현', change: '빠르기 1개/s 부터', fixed: '1000 V · d 5 · L 5 a.u. · 측정기 끔',
        values: withBase({ send: 'electron', rate: 1 }),
        predict: { question: '전자를 한 개씩 보내 수천 개를 쌓으면 스크린에 무엇이 생길까?', choices: ['슬릿 뒤에 두 줄', '빛처럼 여러 개의 줄무늬', '아무 무늬 없이 고르게'],
          answer: 2, why: '한 개는 한 점이지만, 어디에 찍힐지는 간섭한 확률로 정해져 쌓이면 줄무늬가 돼요.' },
        onApply: function () { presetHint = '▶ 실행해 처음 10개쯤은 하나씩 보고, 오른쪽 [보통]→[빨리 감기]로 쌓아요.'; } },
      { name: '광자 하나씩', tag: '탐구 재현', change: '전자 → 광자(아주 약한 빛)', fixed: 'λ 650 nm · d 0.25 mm · L 2.0 m',
        values: withBase({ send: 'photon', rate: 20 }),
        predict: { question: '아주 약한 빛을 광자 한 개씩 보내면 스크린에는?', choices: ['처음엔 흩어진 점, 쌓이면 줄무늬', '처음부터 줄무늬', '띠 두 개'],
          answer: 1, why: '광자 하나는 한 점, 쌓이면 레이저와 같은 간섭 무늬 — 입자로 도착하고 파동처럼 퍼져요.' },
        onApply: function () { presetHint = '▶ 실행해 점이 쌓이는 모습을 보고, [1만 개 한꺼번에 보내기]로 무늬를 확인해요.'; } },
      { name: '작은 구슬이면?', tag: '오개념', change: '보내는 것: 전자 → 작은 구슬', fixed: 'd 0.25 mm · L 2.0 m · 슬릿 둘',
        values: withBase({ send: 'marble', rate: 1000 }),
        predict: { question: '아주 작은 구슬을 하나씩 보내면 스크린에 무엇이 생길까?', choices: ['띠 두 개', '여러 개의 줄무늬', '아무 무늬 없음'],
          answer: 1, why: '구슬은 한 슬릿을 곧게 지나 그림자 띠 두 개만 생겨요. 간섭은 없어요.' },
        onApply: function () { presetHint = '▶ 실행해 구슬이 쌓인 모양을 보고 기록한 뒤, ① 전자 하나씩과 비교해요.'; } },
      { name: '측정기를 켜면?', tag: '기묘함', change: '측정기 끔 → 켬', fixed: '전자 · 빨리 감기 1000개/s · 슬릿 둘',
        values: withBase({ send: 'electron', rate: 1000, det: true }),
        predict: { question: '어느 슬릿을 지났는지 알아내는 측정기를 켜고 전자를 보내면 무늬는?', choices: ['밝고 어두운 줄무늬가 그대로 남는다', '줄무늬가 사라지고 넓게 퍼진 띠만 남는다', '아무것도 안 생긴다'],
          info: '①(측정기 끔)을 먼저 기록해 두면 두 무늬를 나란히 비교할 수 있어요.',
          answer: 2, why: '어느 슬릿을 지났는지 알 수 있는 상태가 되면 두 경로가 겹칠 수 없어 간섭이 없어져요. 사람이 봐서가 아니라 정보가 남아서예요.' },
        onApply: function () { presetHint = '▶ 실행해 무늬를 보고 기록한 뒤, 측정기를 꺼서 다시 기록해 비교해요.'; } },
      { name: '한 슬릿만 열면?', tag: '오개념', change: '슬릿 둘 → 위만', fixed: '전자 · 빨리 감기 1000개/s',
        values: withBase({ send: 'electron', rate: 1000, slit: 'top' }),
        predict: { question: '전자를 보낼 때 슬릿 하나를 막으면?', choices: ['줄무늬가 그대로 생긴다', '줄무늬 없이 넓은 띠 하나', '점이 하나도 안 찍힌다'],
          answer: 2, why: '길이 하나뿐이면 간섭할 상대가 없어 넓은 띠 하나 — 전자도 빛과 똑같아요.' },
        onApply: function () { presetHint = '▶ 실행해 무늬를 보고, 실험 화면의 막힌 슬릿을 눌러 다시 열어 비교해요.'; } }
    ]
  };

  SK.takeaway(function (p) {
    if (p.send === 'marble') return '구슬은 그림자 자리에 띠 두 개만 — 알갱이처럼만 움직이면 간섭이 없어요.';
    if (p.slit !== 'both') return '슬릿 하나만 열면 겹칠 상대가 없어 넓은 띠 하나만 생겨요.';
    if (p.det && p.send !== 'wave') return '어느 길인지 알 수 있게 되자 줄무늬가 사라졌어요 — 두 경로가 겹쳐야 간섭해요.';
    if (p.send === 'wave') return '두 빛이 겹쳐 밝은 줄(보강)과 어두운 줄(상쇄)이 같은 간격으로 생겼어요.';
    return '점은 흩어져 찍혔지만 쌓이자 줄무늬가 됐어요 — ' + (p.send === 'electron' ? '전자' : '광자') + '를 하나씩 보내도 간섭해요.';
  });

  var THINKS = {
    physics: [
      { q: '무늬 간격 Δy 를 좁게 만들려면 어떻게 해야 할까?', choices: ['파장을 더 길게', '슬릿 간격을 더 넓게', '스크린을 더 멀리'], answer: 2,
        why: 'Δy = λL ÷ d 라서 분모인 d 를 키우면 좁아져요. 파장을 길게 하거나 스크린을 멀리하면 오히려 넓어져요.' },
      { q: '초록 빛(λ 500 nm), 슬릿 간격 0.20 mm, 스크린 거리 1.6 m 이면 무늬 간격 Δy 는?', choices: ['2.0 mm', '4.0 mm', '6.4 mm'], answer: 2,
        why: 'Δy = 500×10⁻⁹ m × 1.6 m ÷ 0.20×10⁻³ m = 4.0×10⁻³ m = 4.0 mm. 패널에 값을 직접 넣어 재 보며 확인해 봐요.' },
      { q: '5.2 mm 였던 무늬에서 스크린 거리만 2.0 m → 1.0 m 로 줄이면 간격은 몇 mm 가 될까? 이유도 써 봐요.',
        reveal: '<b>2.6 mm</b> — Δy 는 L 에 비례해서 L 이 ½배면 Δy 도 ½배예요. (슬릿 간격을 0.25 → 0.50 mm 로 두 배 넓혀도 똑같이 2.6 mm 가 돼요. d 는 분모라서 두 배면 ½배.)' },
      { q: '친구가 "밝은 줄은 슬릿 수만큼, 그러니까 2개 생겨"라고 했어요. 맞을까?',
        reveal: '<b>아니에요.</b> 밝은 줄은 두 빛의 경로차가 0, λ, 2λ … 인 곳(보강 간섭)마다 생겨서 여러 개예요. 줄이 2개뿐인 건 구슬처럼 간섭하지 않는 알갱이일 때예요.' }
    ],
    quantum: [
      { q: '전자를 한 개씩 보내면 처음 몇 개의 점은 어떻게 찍힐까?', choices: ['처음부터 줄무늬 모양으로', '아무 데나 흩어진 것처럼', '두 슬릿 바로 뒤 두 곳에만'], answer: 2,
        why: '전자 하나가 어디에 닿을지는 확률로만 정해져서 처음엔 흩어져 보여요. 많이 쌓이면 확률이 큰 곳(밝은 줄)에 몰려 줄무늬가 드러나요.' },
      { q: '가속 전압을 높여 전자를 더 빠르게 하면 무늬 간격은?', choices: ['넓어진다', '좁아진다', '그대로다'], answer: 2,
        why: '빨라지면 운동량 p 가 커져서 드브로이 파장 λ = h ÷ p 가 짧아져요. 무늬 간격은 λ 에 비례하니 좁아져요. 패널의 전압을 바꿔 확인해 봐요.' },
      { q: '전자 하나는 어느 슬릿을 지났을까? 측정기를 켰을 때와 껐을 때의 무늬를 근거로 이야기해 봐요.',
        reveal: '정답 하나로 말하기 어려운 토론 질문이에요. 측정기를 끄면 줄무늬가 생기므로 전자는 두 길의 가능성을 함께 지닌 파동처럼 행동해요. 어느 슬릿인지 알아내면 줄무늬가 사라져요 — "어느 쪽"이 정해지면 간섭이 없어지는 것이 양자 세계의 특징이에요.' },
      { q: '"측정기를 켜면 사람이 지켜봐서 무늬가 사라진다"는 말은 맞을까?',
        reveal: '<b>아니에요.</b> 사람이 보는 것과는 관계없어요. 어느 슬릿을 지났는지에 대한 정보가 장치에 남기만 하면(아무도 안 봐도) 두 경로가 겹칠 수 없어 간섭이 사라져요.' }
    ]
  };
  var thinkCards = { physics: [], quantum: [] };
  ['physics', 'quantum'].forEach(function (m) { THINKS[m].forEach(function (t) { thinkCards[m].push(SK.think(t)); }); });

  var TERMS = {
    '파장': '물결의 마루에서 다음 마루까지 거리(λ). 빛은 파장에 따라 색이 달라요 — 빨강 약 700 nm, 보라 약 400 nm.',
    '간섭': '두 물결이 만나 겹치는 것. 마루끼리 만나면 더 밝아지고(보강), 마루와 골이 만나면 어두워져요(상쇄).',
    '보강 간섭': '두 빛의 경로차가 파장의 정수배(0, λ, 2λ…)인 곳 — 밝은 줄이 생겨요.',
    '상쇄 간섭': '두 빛의 경로차가 반 파장의 홀수배인 곳 — 어두운 줄이 생겨요.',
    '슬릿': '빛이나 전자가 지나가는 아주 좁은 틈. 이중 슬릿 = 틈 두 개.',
    '확대창': '스크린 가운데 ±15 mm 를 크게 보여 주는 창. 여기서 밝은 줄 사이를 재요.',
    '칸 수 n': '잰 두 밝은 줄 사이에 있는 간격 수. 밝은 줄 6개 사이를 쟀다면 n = 5.',
    'Δy': '이웃한 밝은 줄(또는 어두운 줄) 사이의 거리 = 무늬 간격. 델타 와이라고 읽어요.',
    '드브로이 파장': '움직이는 입자도 가진 파장 λ = h ÷ p (h: 플랑크 상수, p: 운동량). 빠를수록 짧아요.',
    '측정기': '전자가 어느 슬릿을 지났는지 알아내는 장치. 정보가 남으면 간섭이 사라져요.',
    '이론 곡선': '스크린 왼쪽의 굵은 곡선. 식으로 계산한 밝기(또는 점이 찍힐 확률)예요.',
    '직전 실행': '값을 바꾸기 바로 전의 무늬. 스크린 오른쪽 좁은 띠에 흐리게 남아요(저장은 안 됨).',
    'a.u.': '모형 단위(arbitrary unit). 전자 실험을 화면에 보이게 키워서 실제 길이 대신 써요.'
  };
  var HELP = {
    physics: {
      how: ['아래 실험 카드를 누르고 예측을 먼저 골라요.', '▶ 실행으로 빛을 켜요. 스크린에 밝고 어두운 줄이 생겨요.',
        '오른쪽 위 {{확대창}}에서 밝은 줄 가운데를 누르고, 몇 칸 떨어진 밝은 줄까지 끌어요(또는 두 곳을 차례로 눌러요).',
        '[−][+]로 밝은 줄 사이 {{칸 수 n}}을 맞추면 한 칸 간격이 계산돼요.', '[기록하기]로 저장하고, λ 하나만 바꿔 다시 재고 기록해요.',
        '비교 단계 표에서 λ 와 Δy 의 관계를 찾아요. 기록 뒤에는 아래 식 칸의 [답 확인하기]로 이론값을 볼 수 있어요.']
    },
    quantum: {
      how: ['아래 실험 카드를 누르고 예측을 먼저 골라요.', '▶ 실행으로 하나씩 보내요. 처음엔 점이 어디에 찍히는지 지켜봐요.',
        '오른쪽 [보통]·[빨리 감기]나 [1만 개 한꺼번에 보내기]로 점을 많이 쌓아요.', '무늬가 보이면 [기록하기]로 저장해요.',
        '{{측정기}}를 켜거나 구슬로 바꿔 다시 쌓고 기록해 무늬를 비교해요.']
    }
  };
  var CONCEPTS = [
    { title: '무늬 간격', formula: 'Δy = λL ÷ d',
      plain: 'λ: 빛의 파장(m) · L: 슬릿에서 스크린까지 거리(m) · d: 두 슬릿 사이 간격(m) · Δy: 이웃한 밝은 줄 사이(m). 파장이 길수록·스크린이 멀수록 넓고, 슬릿 간격이 넓을수록 좁아요. 예) 650 nm, 2.0 m, 0.25 mm → 5.2 mm.',
      live: function (p) {
        if (p.send === 'electron') return '(모형) 무늬 간격 = ' + SK.fmt(fringe(geomOf(p)), 1) + ' a.u.';
        if (p.send === 'marble') return '구슬은 간섭하지 않아 줄무늬가 없어요.';
        return p.lam + '×10⁻⁹ m × ' + SK.fmt(p.L, 1) + ' m ÷ ' + SK.fmt(p.d, 2) + '×10⁻³ m = ' + SK.fmt(fringe(geomOf(p)), 1) + ' mm';
      } },
    { title: '왜 줄무늬가 생길까? — 간섭', formula: '경로차 = mλ → 밝은 줄 · (m + ½)λ → 어두운 줄',
      plain: '(m = 0, 1, 2 …) 두 슬릿에서 나온 물결이 스크린의 한 점까지 가는 길이가 조금씩 달라요(경로차). 마루와 마루가 만나면 밝고(보강), 마루와 골이 만나면 어두워요(상쇄). 연못에 돌 두 개를 던졌을 때 물결이 겹치는 모습과 같아요.' },
    { title: '전자도 파동처럼 — 드브로이 파장', formula: 'λ = h ÷ p = h ÷ √(2meV)',
      plain: 'h: 플랑크 상수(6.63×10⁻³⁴ J·s) · p: 운동량 · m: 전자 질량 · e: 전하량 · V: 가속 전압. 전자를 하나씩 보내도 쌓이면 줄무늬가 생겨요 — 전자도 파동처럼 간섭한다는 증거예요.',
      live: function (p) { return fmtN(p.V) + ' V → λ = ' + SK.fmt(pmOf(p.V), 1) + ' pm (빛의 수만 분의 1)'; } },
    { title: '흔한 오해 바로잡기', plain: '① "밝은 줄은 슬릿 수만큼 2개" → 아니에요, 간섭으로 여러 개. ② "전자를 하나씩 보내면 간섭이 없다" → 하나씩 보내도 쌓이면 줄무늬. ③ "사람이 봐서 무늬가 사라진다" → 어느 길인지 정보가 남으면 사라져요. ④ "색은 무늬와 관계없다" → 파장(색)이 길수록 간격이 넓어요.' }
  ];
  function applyHelp(v) {
    SK.help({ how: HELP[v].how, concepts: CONCEPTS, terms: TERMS,
      keys: v === 'quantum' ? [['K', '1만 개 한꺼번에 보내기'], ['M', '측정기 켜고 끄기'], ['W', '물결(파면) 보기'], ['Shift + 1·2·3', '보내는 빠르기 느리게·보통·빨리 감기']] : [['W', '물결(파면) 보기']] });
  }

  /* ---- 모드 (두 갈래): 허브가 ?mode=physics|quantum 으로 넘김 ---- */
  var todayEl = SK.el.top.querySelector('.sim-today');
  function applyEntranceUI(v) {
    entrance = v;
    if (todayEl && todayEl.lastChild) todayEl.lastChild.textContent = v === 'physics' ? '파장을 바꾸면 무늬 간격은 어떻게 될까?' : '전자를 하나씩 보내도 줄무늬가 생길까?';
    SK.setPresets(PRESETS[v]);
    ['physics', 'quantum'].forEach(function (m) { thinkCards[m].forEach(function (c, i) {
      c.hidden = m !== v; var no = c.querySelector('.think-card__no'); if (no) no.textContent = '질문 ' + (i + 1);
    }); });
    applyHelp(v);
    presetHint = '';
    updatePanel(); refreshChecklist();
    ui.eqKey = null;
  }
  function pickEntrance(v) {
    applyEntranceUI(v);
    if (v === 'physics') SK.set('send', 'wave', { silent: true });
    else { SK.set('send', 'electron', { silent: true }); SK.set('rate', 20, { silent: true }); }
    SK.set('det', false, { silent: true });
    SK.reset();
  }

  /* ---- 전용 키 (화면에는 쓰지 않고 도움말 › 단축키에만) ---- */
  SK.onKey(function (e) {
    if (e.shiftKey && /^Digit[123]$/.test(e.code)) { if (!e.repeat && entrance === 'quantum') setRateLevel(+e.code.slice(5) - 1); return true; }
    if (e.shiftKey) return false;
    if (e.repeat && /^Key[MKW]$/.test(e.code)) return true;
    if (e.code === 'KeyM') {
      if (entrance !== 'quantum') return false;
      if (SK.get('send') === 'wave') SK.notice('측정기는 하나씩 보낼 때 써요', 'info');
      else SK.set('det', !SK.get('det'));
      return true;
    }
    if (e.code === 'KeyK') { if (entrance !== 'quantum') return false; skipMany(10000); return true; }
    if (e.code === 'KeyW') { SK.set('showWave', !SK.get('showWave')); return true; }
    return false;
  });

  /* ---- 수업 안내 (교사 모드) ---- */
  SK.guide({
    rows: [
      { target: '빛의 파장 λ — 400~700 nm, 기본 650 · 바로 반영', standard: '[12물리03-01] 간섭 · 탐구: 이중 슬릿에 의한 빛의 간섭', discover: 'λ↑ → Δy↑ (비례)', misconception: '색(파장)은 무늬와 관계없다' },
      { target: '슬릿 간격 d — 0.10~0.50 mm, 기본 0.25 · 바로 반영', standard: '[12물리03-01]', discover: 'd↑ → Δy↓ (반비례)', misconception: '밝은 줄은 슬릿 수만큼' },
      { target: '스크린 거리 L — 0.5~3.0 m, 기본 2.0 · 바로 반영', standard: '[12물리03-01]', discover: 'L↑ → Δy↑ (비례)', misconception: '—' },
      { target: '전자 가속 전압 V — 100~5000 V (λ = h/√(2meV) 표시) · 바로 반영', standard: '[12전자03-01] 드브로이 파장(정성)', discover: 'V↑ → λ↓ → 무늬 간격↓', misconception: '전자는 작은 공일 뿐이다' },
      { target: '보내는 것 — 광자 / 전자 / 구슬 (하나씩 보내기 모드)', standard: '[12전자03-01] 이중성, 구슬은 비교용', discover: '구슬은 두 띠, 광자·전자는 쌓이면 줄무늬', misconception: '하나씩 보내면 간섭 없음' },
      { target: '열린 슬릿 — 둘 / 위만 / 아래만 (화면의 슬릿을 눌러도 됨)', standard: '[12물리03-01] 간섭 조건', discover: '하나만 열면 넓은 띠 하나', misconception: '슬릿 하나면 줄 하나' },
      { target: '측정기 — 켬 / 끔 (하나씩 보내기 모드)', standard: '[12전자03-01], 연계 [12전자03-02]', discover: '어느 길인지 정보가 남으면 무늬 소멸', misconception: '사람이 봐서 사라진다' }
    ],
    sections: [
      { title: '수업 흐름', items: [
        '① 예측: 실험 카드를 누르면 예측 질문이 먼저 뜨고, 답을 고른 뒤 값이 바뀌어요.',
        '② 실행: 빛을 켜고 확대창에서 밝은 줄 여러 칸을 재요(n 으로 나눔). 하나씩 보내기는 3,000개가 쌓이면 끝나요.',
        '③ 비교: 기록 3개 이상(빛: λ 만 바꿈), 큰 판의 체크리스트로 비례 관계 확인. 이론값은 기록 뒤 [답 확인하기]로 공개.',
        '④ 정리: 질문 4개(선택형 2 + 서술형 2, 서술형은 [답 확인하기]). 교사 서랍에서 답 확인 잠금 가능.'
      ] },
      { title: '모형과 축척', items: [
        '스크린은 실제 ±30 mm 를 세로 480u 로, 확대창은 가운데 ±15 mm 를 보여 줘요. 무늬 위치·간격 숫자는 실제 값으로 계산해요.',
        '슬릿판~스크린 거리 그림, 슬릿 간격 그림, 파면의 파장은 눈에 보이게 키운 모형이에요(축척 아님).',
        '전자 모드: λ 는 h/√(2meV) 로 실제 값을 보여 주고, 화면 무늬는 1000 V 일 때 빛 650 nm 와 같은 크기가 되도록 키웠어요(d·L 은 모형 단위 a.u.).',
        '구슬: 발사기~슬릿 0.1 m 에서 퍼져 나온 구슬이 곧게 지나 생기는 그림자(두 띠 사이 = d × (0.1 + L) ÷ 0.1).',
        '측정기 문구는 "정보가 남으면"으로 씀("사람이 보면" 표현 쓰지 않음). 측정기를 켜면 두 슬릿 각각의 회절 띠가 더해진 넓은 띠가 돼요.'
      ] },
      { title: '확인할 것', items: ['교과서 쪽수·활동 이름 (확인 필요)', '[12전자03-02] 는 연계(정성)로만 다룸'] }
    ]
  });

  installPointer();
  applyEntranceUI('physics');
  SK.chooseMode({
    title: '무엇을 해 볼까요?', default: 'physics', urlKey: 'mode',
    modes: [
      { value: 'physics', label: '빛으로 줄무늬 재기', desc: '빛이 두 틈을 지나 밝고 어두운 줄무늬를 만드는 걸 보고 간격을 재요' },
      { value: 'quantum', label: '전자 하나씩 보내기', desc: '전자를 한 개씩 쏘아 점이 쌓여 줄무늬가 되는 걸 봐요' }
    ],
    onPick: function (v) { pickEntrance(v); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
