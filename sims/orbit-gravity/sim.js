/* =====================================================================
   orbit-gravity — 인공위성과 탈출 속도 (공통 틀 SimKit 위에서 동작)
   근거: docs/04_팀장결정서.md §4-4 · 공통 틀 설명서 docs/SIMKIT.md
   성취기준: [12역학01-03] [12역학01-04] [12역학01-05] (심화 그림만 [12역학01-06])

   모드 3가지 (첫 화면 모드 카드, 조절 패널 '무엇을 알아볼까요?')
     cannon  뉴턴의 대포  — 수평 발사, a = −GM r̂ / r², RK4 · 시뮬레이션 dt 1 s · 화면 1초 = 2분(120 단계)
     sat     원궤도 위성  — 해석해 v = √(GM/r), T = 2πr/v, 중력 비율 (R/r)². 한 바퀴 = 화면 10초
     kepler  케플러 자료  — 행성 a(AU)·T(년) 표 → T–a 곡선 / T²–a³ 직선

   축척
     대포: 천체 중심 = 화면 (625, 350), 화면 반폭 625u = 천체 반지름 R 의 4배 (1 R = 156.25u)
     위성: 궤도 반지름이 290u 가 되도록 자동(기록이 있으면 기록 궤도까지 모두 담는 축척으로 고정)

   명세와 다르게 정한 점 (보고서에도 적음)
     · 대포는 '공기 없는 높은 산(20 km)' 꼭대기에서 쏜다. 지표(r = R)에서 7.9 km/s 로 쏘면
       √(GM/R) = 7.909 km/s 보다 조금 느려 근지점이 지표 30 km 아래로 들어가 '추락'이 된다(검산).
       산 높이 20 km 에서는 원 궤도 속력이 7.897 km/s 라 7.9 km/s 가 거의 원(고도 20~29 km)이 된다.
     · 목성 반지름은 적도 반지름 71,492 km 를 쓴다. 명세의 69,911 km(평균)로는 탈출 속도가 60.2 km/s 라
       명세·교과서의 59.5 km/s 와 맞지 않는다.
     · 대포 시간 배속에 '1초 = 30초 / 10분 / 30분'(표시 도구)을 더했다. 기본은 명세대로 1초 = 2분.
     · (고도화) 대포 '보는 범위' 3가지(Z): 지구 전체(명세 반폭 4R)에서는 4·6 km/s 낙하가 7~15u 로 안 보이고
       10 km/s 타원(원지점 4.06R)이 화면 아래로 잘려서, 산 근처 확대(실제 축척)와 타원까지 전체를 더했다.
     · (고도화) r > 6R 에서 탈출/먼 타원을 바로 판정(에너지 부호). 10.4~11.1 km/s 가 48시간을 기다리던 문제 해결.
   ===================================================================== */
(function () {
  'use strict';
  var SK = window.SimKit;
  var h = SK.h;

  /* ------------------------------------------------------------------
     0. 상수·자료
     ------------------------------------------------------------------ */
  var G = 6.674e-11;
  var MOUNT = 20000;              // 대포 산 높이 (m)
  var DAY_H = 24;
  var BODY_ORDER = ['earth', 'moon', 'mars', 'jupiter'];
  var BODIES = {
    earth:   { key: 'earth',   name: '지구', M: 5.972e24, R: 6371e3 },
    moon:    { key: 'moon',    name: '달',   M: 7.342e22, R: 1737e3 },
    mars:    { key: 'mars',    name: '화성', M: 6.417e23, R: 3390e3 },
    jupiter: { key: 'jupiter', name: '목성', M: 1.898e27, R: 71492e3 }
  };
  BODY_ORDER.forEach(function (k) {
    var b = BODIES[k];
    b.GM = G * b.M;
    b.vEsc = Math.sqrt(2 * b.GM / b.R) / 1000;    // km/s
    b.vCirc = Math.sqrt(b.GM / b.R) / 1000;       // km/s
    b.g = b.GM / (b.R * b.R);                     // m/s²
  });
  var EARTH = BODIES.earth;
  // 케플러 자료 (AU · 년)
  var PLANETS = [
    { name: '수성', a: 0.387, T: 0.241 },
    { name: '금성', a: 0.723, T: 0.615 },
    { name: '지구', a: 1.000, T: 1.000 },
    { name: '화성', a: 1.524, T: 1.881 },
    { name: '목성', a: 5.203, T: 11.86 },
    { name: '토성', a: 9.537, T: 29.46 }
  ];
  var MODES = {
    cannon: { label: '뉴턴의 대포', today: '얼마나 빨리 쏘면 포탄이 떨어지지 않고 지구를 돌까?' },
    sat:    { label: '원궤도 위성', today: '높이 있는 위성은 더 빨리 돌까, 더 느리게 돌까?' },
    kepler: { label: '케플러 자료', today: '행성의 공전 주기와 거리 사이에는 어떤 규칙이 있을까?' }
  };
  /* 단계별 '지금 할 일' (모드마다 다름) */
  var TASKS = {
    cannon: [
      '아래 ① 뉴턴의 대포 카드를 눌러 7.9 km/s 로 쏘면 어떻게 될지 먼저 골라요.',
      '▶ 실행으로 포탄을 쏘고, 끝나면 [기록하기]. 왼쪽 아래 [다음 ▶]으로 속력을 하나씩 올려요.',
      '속력만 다른 기록을 비교해요. 몇 km/s 부터 떨어지지 않고, 몇 km/s 부터 돌아오지 않나요?',
      '오른쪽 정리 질문에 답하고 [답 확인하기]로 맞춰 봐요.'
    ],
    sat: [
      '아래 ② 또는 ③ 카드를 눌러 위성이 어떻게 돌지 먼저 골라요.',
      '▶ 실행으로 위성을 한 바퀴 돌리고 [기록하기]. 그다음 고도(또는 질량) 하나만 바꿔요.',
      '기록 표에서 고도가 높아질 때 속력과 주기가 어떻게 변하는지 찾아요.',
      '오른쪽 정리 질문에 답하고 [답 확인하기]로 맞춰 봐요.'
    ],
    kepler: [
      '아래 ④ 행성 자료로 규칙 찾기 카드를 눌러 먼저 예측해요.',
      '실험 화면 왼쪽 표에 a(AU)와 T(년)를 넣어요. [자료 넣기]를 누르면 한 번에 채워져요.',
      '그래프를 T – a 에서 T² – a³ 로 바꿔 점들이 한 직선 위에 있는지 봐요.',
      '오른쪽 정리 질문에 답하고 [답 확인하기]로 맞춰 봐요.'
    ]
  };

  var SK_DT = 1 / 120;             // SimKit 고정 간격(화면 초) — init 의 dt 와 같게
  var CX = 625, CY = 350;          // 실험 화면 중심
  var CS = 625 / 4;                // 대포: 1 R = 156.25u (화면 반폭 = 4R)
  var SAT_SCREEN_T = 10;           // 위성 한 바퀴 = 화면 10초
  var VIEW_NAME = { near: '산 근처 확대', earth: '지구 전체', far: '타원까지 전체' };
  var NEAR_K = 0.75;               // 산 근처: 1 km = 0.75u (화면 가로 ≈ 1,670 km)
  var FONT = '"Pretendard", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';
  var SERIF = '"Noto Serif KR", "Nanum Myeongjo", serif';

  /* ------------------------------------------------------------------
     1. 작은 도구
     ------------------------------------------------------------------ */
  function col(n) { return SK.color(n); }
  function comma(n, d) {
    var s = SK.fmt(n, d || 0);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function fmtDur(sec) {
    if (sec < 600) { var mi = Math.floor(sec / 60 + 1e-9), se = Math.floor(sec - mi * 60 + 1e-9); return (mi ? mi + '분 ' : '') + se + '초'; }
    var m = Math.floor(sec / 60 + 1e-9);
    if (m < 60) return m + '분';
    var hh = Math.floor(m / 60), mm = m % 60;
    if (hh >= 48) return SK.fmt(sec / 3600, 0) + '시간';
    return hh + '시간' + (mm ? ' ' + mm + '분' : '');
  }
  function periodText(Tsec) {
    return Tsec < 7200 ? SK.fmt(Tsec / 60, 1) + '분' : SK.fmt(Tsec / 3600, 1) + '시간';
  }
  function pctText(r) { return r < 0.1 ? SK.fmt(r * 100, 1) : SK.fmt(r * 100, 0); }
  function satCalc(altKm) {
    var r = EARTH.R + altKm * 1000;
    var v = Math.sqrt(EARTH.GM / r);
    var T = 2 * Math.PI * r / v;
    return { r: r, rR: r / EARTH.R, v: v / 1000, T: T, Th: T / 3600, g: Math.pow(EARTH.R / r, 2) };
  }
  function thin(pts, max) {
    if (!pts || pts.length <= max) return pts ? pts.slice() : [];
    var out = [], step = (pts.length - 1) / (max - 1);
    for (var i = 0; i < max - 1; i++) out.push(pts[Math.round(i * step)]);
    out.push(pts[pts.length - 1]);
    return out;
  }
  function niceStep(span, n) {
    var raw = span / Math.max(1, n), p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function niceMax(v) { if (!(v > 0)) return 1; var s = niceStep(v, 4); return Math.ceil(v * 1.05 / s) * s; }
  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = (o.weight || 600) + ' ' + (o.size || 22) + 'px ' + (o.serif ? SERIF : FONT);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
    if (o.halo) { ctx.lineWidth = 6; ctx.strokeStyle = col('--color-paper-raised'); ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
    ctx.fillStyle = col(o.color || '--color-ink');
    ctx.fillText(s, x, y);
  }
  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
    ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function panelBox(ctx, x, y, w, hh) {
    ctx.save();
    roundRect(ctx, x, y, w, hh, 10);
    ctx.fillStyle = col('--color-paper-scrim'); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = col('--color-line'); ctx.stroke();
    ctx.restore();
  }
  /** 축·모눈. box = {x,y,w,h}, 반환 {mx,my} */
  function axes(ctx, box, xr, yr, o) {
    o = o || {};
    var fs = o.fs || 16;
    function mx(x) { return box.x + (x - xr[0]) / (xr[1] - xr[0]) * box.w; }
    function my(y) { return box.y + box.h - (y - yr[0]) / (yr[1] - yr[0]) * box.h; }
    var xs = niceStep(xr[1] - xr[0], o.nx || Math.max(2, Math.floor(box.w / 90)));
    var ys = niceStep(yr[1] - yr[0], o.ny || Math.max(2, Math.floor(box.h / 40)));
    var dx = Math.max(0, -Math.floor(Math.log(xs) / Math.LN10 + 1e-9)), dy = Math.max(0, -Math.floor(Math.log(ys) / Math.LN10 + 1e-9));
    ctx.save();
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.strokeStyle = col('--color-grid');
    ctx.font = '500 ' + fs + 'px ' + FONT; ctx.fillStyle = col('--color-ink-muted');
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (!o.noX) for (var x = Math.ceil(xr[0] / xs - 1e-9) * xs; x <= xr[1] + xs * 1e-6; x += xs) {
      ctx.beginPath(); ctx.moveTo(mx(x), box.y); ctx.lineTo(mx(x), box.y + box.h); ctx.stroke();
      ctx.fillText(comma(x, dx), mx(x), box.y + box.h + 4);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var y = Math.ceil(yr[0] / ys - 1e-9) * ys; y <= yr[1] + ys * 1e-6; y += ys) {
      ctx.beginPath(); ctx.moveTo(box.x, my(y)); ctx.lineTo(box.x + box.w, my(y)); ctx.stroke();
      ctx.fillText(comma(y, dy), box.x - 6, my(y));
    }
    ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    ctx.fillStyle = col('--color-ink'); ctx.font = '700 ' + fs + 'px ' + FONT;
    if (o.xl) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(o.xl, box.x + box.w, box.y + box.h - 4); }
    if (o.yl) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(o.yl, box.x + 6, box.y + 2); }
    ctx.restore();
    return { mx: mx, my: my };
  }
  function dot(ctx, x, y, r, fill, stroke, w) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = col(fill); ctx.fill(); }
    if (stroke) { ctx.lineWidth = w || 2; ctx.strokeStyle = col(stroke); ctx.setLineDash([]); ctx.stroke(); }
  }

  /** 천체 그림 (중심 x,y, 반지름 rad) */
  function drawBody(ctx, key, x, y, rad) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
    var fills = { earth: '--color-primary-tint', moon: '--color-paper-sunk', mars: '--color-sim-collision-tint', jupiter: '--color-sim-lens-tint' };
    var lines = { earth: '--color-primary', moon: '--color-line-strong', mars: '--color-sim-collision', jupiter: '--color-sim-lens' };
    ctx.fillStyle = col(fills[key]); ctx.fill();
    ctx.clip();
    if (key === 'earth') {
      ctx.fillStyle = col('--color-ok-tint');
      [[-0.35, -0.3, 0.38, 0.22], [0.3, 0.15, 0.3, 0.38], [-0.15, 0.45, 0.25, 0.14], [0.45, -0.5, 0.2, 0.12]].forEach(function (c) {
        ctx.beginPath(); ctx.ellipse(x + c[0] * rad, y + c[1] * rad, c[2] * rad, c[3] * rad, 0.4, 0, Math.PI * 2); ctx.fill();
      });
    } else if (key === 'moon') {
      ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = Math.max(1, rad * 0.02);
      [[-0.3, -0.25, 0.16], [0.35, 0.1, 0.22], [-0.1, 0.45, 0.12], [0.2, -0.5, 0.1]].forEach(function (c) {
        ctx.beginPath(); ctx.arc(x + c[0] * rad, y + c[1] * rad, c[2] * rad, 0, Math.PI * 2); ctx.stroke();
      });
    } else if (key === 'mars') {
      ctx.fillStyle = col('--color-copper-tint');
      ctx.beginPath(); ctx.ellipse(x - 0.2 * rad, y + 0.2 * rad, 0.5 * rad, 0.18 * rad, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col('--color-paper-raised');
      ctx.beginPath(); ctx.ellipse(x, y - 0.92 * rad, 0.3 * rad, 0.12 * rad, 0, 0, Math.PI * 2); ctx.fill();
    } else if (key === 'jupiter') {
      ctx.fillStyle = col('--color-copper-tint');
      [-0.55, -0.2, 0.15, 0.5].forEach(function (b, i) { ctx.fillRect(x - rad, y + b * rad, rad * 2, rad * (i % 2 ? 0.14 : 0.2)); });
      ctx.fillStyle = col('--color-q-energy-heat'); ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.ellipse(x + 0.3 * rad, y + 0.3 * rad, 0.16 * rad, 0.09 * rad, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = col(lines[key]); ctx.setLineDash([]); ctx.stroke();
  }
  /** 직각 표시 또는 각도 (점 p 에서 두 방향 a, b; 단위 벡터, 화면 좌표) */
  function angleMark(ctx, px, py, a, b) {
    var cos = a[0] * b[0] + a[1] * b[1];
    var deg = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    ctx.save();
    ctx.strokeStyle = col('--color-ink'); ctx.lineWidth = 2; ctx.setLineDash([]);
    if (Math.abs(deg - 90) < 1.5) {
      var s = 16;
      ctx.beginPath();
      ctx.moveTo(px + a[0] * s, py + a[1] * s);
      ctx.lineTo(px + a[0] * s + b[0] * s, py + a[1] * s + b[1] * s);
      ctx.lineTo(px + b[0] * s, py + b[1] * s);
      ctx.stroke();
      ctx.restore();
      return { x: px - (a[0] + b[0]) * 30, y: py - (a[1] + b[1]) * 30, text: '직각', size: 18, color: '--color-ink-muted' };
    } else {
      var a1 = Math.atan2(a[1], a[0]), a2 = Math.atan2(b[1], b[0]);
      var d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ctx.beginPath(); ctx.arc(px, py, 22, a1, a1 + d, d < 0); ctx.stroke();
      var mid = a1 + d / 2;
      ctx.restore();
      return { x: px + Math.cos(mid) * 44, y: py + Math.sin(mid) * 44, text: SK.fmt(deg, 0) + '°', size: 18 };
    }
  }

  /* ------------------------------------------------------------------
     2. 상태
     ------------------------------------------------------------------ */
  var curMode = null;
  var stash = {};                 // 모드별 기록·직전 실행 보관
  var cn = null;                  // 대포 상태
  var sat = null;                 // 위성 상태
  var seq = null;                 // 프리셋 순서 도우미 {key, vals, label(v)}
  var kRows = PLANETS.map(function (p) { return { name: p.name, a: null, T: null }; });
  var meterSets = {}, recOpts = {}, recTable = null, bandView = null, bandTitle = null;
  var deepView = null, deepKey = '';
  var kEl = null, seqEl = null, altNote = null, compareBtn = null;
  var hudEl = null, viewEl = null, kStepEl = null, thinkCards = [], kDone = false;

  /* ------------------------------------------------------------------
     3. 대포: RK4 (dt = 1 s)
     ------------------------------------------------------------------ */
  function cannonReset(p) {
    var b = BODIES[p.body] || EARTH;
    var r0 = b.R + MOUNT;
    cn = {
      b: b, x: 0, y: r0, vx: p.v0 * 1000, vy: 0, t: 0, acc: 0, pa: Math.PI / 2,
      r0: r0, maxR: r0, minR: r0,
      path: [[0, r0 / b.R]], hs: [[0, MOUNT / 1000]], lastH: 0,
      res: null, dist: 0, lx: null, ly: null, vImp: null
    };
  }
  function accel(GM, x, y) { var r2 = x * x + y * y, r = Math.sqrt(r2), k = -GM / (r2 * r); return [k * x, k * y]; }
  function rk4(c, dt) {
    var GM = c.b.GM, x = c.x, y = c.y, vx = c.vx, vy = c.vy;
    var a1 = accel(GM, x, y);
    var x2 = x + vx * dt / 2, y2 = y + vy * dt / 2, vx2 = vx + a1[0] * dt / 2, vy2 = vy + a1[1] * dt / 2;
    var a2 = accel(GM, x2, y2);
    var x3 = x + vx2 * dt / 2, y3 = y + vy2 * dt / 2, vx3 = vx + a2[0] * dt / 2, vy3 = vy + a2[1] * dt / 2;
    var a3 = accel(GM, x3, y3);
    var x4 = x + vx3 * dt, y4 = y + vy3 * dt, vx4 = vx + a3[0] * dt, vy4 = vy + a3[1] * dt;
    var a4 = accel(GM, x4, y4);
    c.x = x + dt / 6 * (vx + 2 * vx2 + 2 * vx3 + vx4);
    c.y = y + dt / 6 * (vy + 2 * vy2 + 2 * vy3 + vy4);
    c.vx = vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
    c.vy = vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
  }
  function cannonStep(p) {
    var c = cn; if (!c || c.res) return;
    // 화면 1/120 초마다 실제 시간 tscale(분)×60/120 초를 흐르게 한다. RK4 한 단계는 1 s 이하.
    var R = c.b.R, simPer = (p.tscale || 2) * 60 * SK_DT;
    var n = Math.max(1, Math.ceil(simPer - 1e-9)), hdt = simPer / n;
    for (var i = 0; i < n; i++) {
      rk4(c, hdt); c.t += hdt;
      var r = Math.sqrt(c.x * c.x + c.y * c.y);
      if (r > c.maxR) c.maxR = r;
      if (r < c.minR) c.minR = r;
      var an = Math.atan2(c.y, c.x), d = an - c.pa;
      if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      c.acc += d; c.pa = an;
      // 궤적 기록 (R 단위, 0.003 R ≈ 19 km 마다 — '산 근처 확대'에서도 매끈하게) · 높이-시간 (5 s 마다)
      var lp = c.path[c.path.length - 1], px = c.x / R, py = c.y / R;
      if ((px - lp[0]) * (px - lp[0]) + (py - lp[1]) * (py - lp[1]) > 0.003 * 0.003) c.path.push([px, py]);
      if (c.t - c.lastH >= 5 - 1e-9) { c.hs.push([c.t / 60, (r - R) / 1000]); c.lastH = c.t; }
      var v2 = c.vx * c.vx + c.vy * c.vy;
      if (r < R - 1000) {
        c.res = '추락'; c.dist = R * Math.abs(c.acc) / 1000; c.vImp = Math.sqrt(v2) / 1000;
        var k = R / r; c.lx = c.x * k / R; c.ly = c.y * k / R;
        c.path.push([c.lx, c.ly]); c.hs.push([c.t / 60, 0]);
        SK.finish('땅에 떨어졌어요 (' + comma(c.dist) + ' km 날아감) — [기록하기]로 저장해요');
        return;
      }
      if (Math.abs(c.acc) >= 2 * Math.PI) {
        c.res = (c.maxR - c.minR) / c.r0 < 0.02 ? '원 궤도' : '타원 궤도';
        c.dist = 2 * Math.PI * R / 1000;
        c.path.push([c.x / R, c.y / R]); c.hs.push([c.t / 60, (r - R) / 1000]);
        // 타원은 모양만 (결정서: 타원 정량 금지) → 걸린 시간은 원 궤도에서만 알려 준다
        SK.finish(c.res === '원 궤도' ? '한 바퀴 돌았어요, 원 궤도예요 (' + fmtDur(c.t) + ') — [기록하기]로 저장해요' : '한 바퀴 돌았어요, 높이가 변하는 타원 궤도예요 — [기록하기]로 저장해요');
        return;
      }
      // 6R 밖에서 판정: 역학적 에너지가 0 이상이면 탈출, 아니면 언젠가 돌아오는 먼 타원
      if (r > 6 * R) {
        c.res = v2 >= 2 * c.b.GM / r ? '탈출' : '먼 타원';
        c.path.push([c.x / R, c.y / R]); c.hs.push([c.t / 60, (r - R) / 1000]);
        SK.finish(c.res === '탈출' ? '돌아오지 않아요, 탈출이에요 — [기록하기]로 저장해요' : '아주 멀리 갔다가 언젠가 돌아오는 긴 타원이에요 — [기록하기]로 저장해요');
        return;
      }
      if (c.t >= 72 * 3600) { c.res = '먼 타원'; SK.finish('아주 긴 타원이에요 — [기록하기]로 저장해요'); return; }
    }
  }

  /* ------------------------------------------------------------------
     4. 모드 바꾸기 (기록·직전 실행은 모드별로 따로 보관)
     ------------------------------------------------------------------ */
  var MODE_KEYS = {
    body: ['cannon'], v0: ['cannon'], tscale: ['cannon'], cview: ['cannon'],
    alt: ['sat'], mass: ['sat'],
    arrows: ['cannon', 'sat'], trail: ['cannon', 'sat'],
    gaxis: ['sat', 'kepler'], kzoom: ['kepler'], kguide: ['kepler']
  };
  var COLS = {
    cannon: [
      { key: 'body', from: 'param', label: '천체', priority: 1 },
      { key: 'v0', from: 'param', label: '처음 속력', unit: 'km/s', priority: 1 },
      { key: 'res', from: 'value', label: '결과', priority: 1 },
      { key: 'hmax', from: 'value', label: '최고 높이', unit: 'km', decimals: 0, priority: 2 },
      { key: 'dist', from: 'value', label: '날아간 거리', unit: 'km', decimals: 0, priority: 2 },
      { key: 'vImp', from: 'value', label: '충돌 직전 속력', unit: 'km/s', decimals: 2, priority: 2 }
    ],
    sat: [
      { key: 'alt', from: 'param', label: '고도', unit: 'km', priority: 1 },
      { key: 'rR', from: 'value', label: '중심까지 r (R 단위)', unit: '', decimals: 2, priority: 2 },
      { key: 'mass', from: 'param', label: '질량', unit: 'kg', priority: 2 },
      { key: 'v', from: 'value', label: '속력', unit: 'km/s', decimals: 2, priority: 1 },
      { key: 'Tstr', from: 'value', label: '주기', unit: '', priority: 1 },
      { key: 'g', from: 'value', label: '지표 중력 대비', unit: '%', decimals: 0, priority: 2 }
    ],
    kepler: [{ key: 'mode', from: 'param', label: '모드' }]
  };
  /** 단계별 '지금 할 일'. 공통 틀의 상황 문장(실행 중·기록 안내·기록 부족)이 더 알맞을 때는 null 을 돌려 그쪽을 쓴다 */
  function tasksFor(m) {
    return [0, 1, 2, 3].map(function (i) {
      var t = { text: function () {
        if (m !== 'kepler' && i === 1 && (SK.running || SK.finished)) return null;
        if (m !== 'kepler' && i === 2 && SK.records.length < 2) return null;
        return TASKS[m][i];
      } };
      if (m === 'kepler' && i === 0) Object.defineProperty(t, 'action', { get: function () {
        return SK.prediction && SK.prediction.pending ? { label: '자료 카드 보기', onClick: function () { SK.goStep(1); showDataCard(); } } : { label: '예측 질문 받기', onClick: function () { SK.applyPreset(3); } };
      } });
      if (m === 'kepler' && i === 1) t.action = { label: '자료 카드 보기', onClick: function () { showDataCard(); } };
      if (m === 'kepler' && i === 2) t.action = { label: 'T² – a³ 그래프로', onClick: function () { SK.set('gaxis', 'sq'); } };
      return t;
    });
  }
  function switchMode(oldM, newM) {
    if (oldM) stash[oldM] = { records: SK.records, ghost: SK.ghost };
    var s = stash[newM] || { records: [], ghost: null };
    SK.records = s.records; SK.ghost = s.ghost;
    curMode = newM;
    if (seq && seq.mode !== newM) seq = null;
    SK.panel('values').parentNode.classList.toggle('og-hide', newM === 'kepler');
    for (var k in MODE_KEYS) {
      var c = SK.controls[k];
      if (c && c.el) c.el.classList.toggle('og-hide', MODE_KEYS[k].indexOf(newM) < 0);
    }
    if (altNote) altNote.classList.toggle('og-hide', newM !== 'sat');
    if (compareBtn) compareBtn.classList.toggle('og-hide', newM !== 'cannon');
    for (var m in meterSets) meterSets[m].el.hidden = m !== newM;
    if (kEl) kEl.hidden = newM !== 'kepler';
    if (hudEl) hudEl.hidden = newM === 'kepler';
    if (viewEl) viewEl.hidden = newM !== 'cannon';
    // 하단 띠: 케플러는 기록 칩 대신 그래프를 넓게
    SK.el.records.hidden = newM === 'kepler';
    SK.el.band.style.gridTemplateColumns = newM === 'kepler' ? 'minmax(0, 4fr) minmax(0, 9fr)' : '';
    recOpts.columns = COLS[newM];
    if (recTable) recTable.render();
    // 그래프 축 버튼 글자
    var g = SK.controls.gaxis;
    if (g) {
      var opts = g.el.querySelectorAll('.seg__opt');
      var sym = newM === 'sat' ? 'r' : 'a';
      if (opts[0]) opts[0].firstChild.textContent = 'T – ' + sym + ' (휘어진 선)';
      if (opts[1]) opts[1].firstChild.textContent = 'T² – ' + sym + '³ (곧은 선?)';
    }
    // 오늘 알아볼 것 · 지금 할 일
    var today = SK.el.top.querySelector('.sim-today');
    if (today) { today.innerHTML = ''; today.appendChild(h('b', { text: '오늘 알아볼 것' })); today.appendChild(document.createTextNode(MODES[newM].today)); }
    tasksFor(newM).forEach(function (t, i) { SK.setTask(i, t); });
    // 정리 질문: 이 모드 것만 보이게, 번호는 1부터
    var no = 0;
    thinkCards.forEach(function (tc) {
      var on = tc.modes.indexOf(newM) >= 0;
      tc.el.hidden = !on;
      if (on) { no++; var n = tc.el.querySelector('.think-card__no'); if (n) n.textContent = '질문 ' + no; }
    });
    updateSeq();
    SK.requestRender();
  }

  /* ------------------------------------------------------------------
     5. SimKit 시작
     ------------------------------------------------------------------ */
  SK.init({
    slug: 'orbit-gravity',
    title: '인공위성과 탈출 속도',
    subject: '역학과 에너지 (진로 선택)',
    unit: '(1) 시공간과 운동',
    standards: ['12역학01-03', '12역학01-04', '12역학01-05'],
    today: MODES.cannon.today,
    stepTasks: tasksFor('cannon'),
    dt: SK_DT,                      // 화면 1/120 초마다 한 단계 (대포 기본: 1 단계 = 1 s → 화면 1초 = 2분)
    stageFit: true,

    reset: function (p) {
      if (curMode !== p.mode) switchMode(curMode, p.mode);
      cannonReset(p);
      sat = satCalc(p.alt);
      sat.done = false;
      updateSeq();
    },
    step: function (dt, p) {
      if (curMode === 'cannon') {
        if (p.body === 'jupiter') { SK.pause(); return; }
        cannonStep(p);
      } else if (curMode === 'sat') {
        if (!sat.done && SK.time + dt >= SAT_SCREEN_T - 1e-9) {
          sat.done = true;
          SK.finish('한 바퀴 ' + periodText(sat.T) + ' 걸렸어요 — [기록하기]로 저장하고 한 가지만 바꿔 봐요');
        }
      } else {
        SK.pause();
      }
    },
    render: function (view, p) {
      if (curMode === 'cannon') renderCannon(view.ctx, p);
      else if (curMode === 'sat') renderSat(view.ctx, p);
      else if (curMode === 'kepler') renderKepler(view.ctx, p);
      updateMeters(p);
      drawBand();
      drawDeep(p);
      updateHud(p);
      updateSeq();
      if (curMode === 'cannon') lastShownBody = p.body;
    },
    capture: function (p) {
      if (curMode === 'cannon') {
        if (!cn || cn.path.length < 2 || cn.b.key === 'jupiter') return null;
        var last = cn.path[cn.path.length - 1];
        // 타원·탈출은 모양만 (결정서 §4-4: 타원 정량 금지) → 최고 높이는 추락·원 궤도에서만 적는다
        var showH = cn.res === '추락' || cn.res === '원 궤도';
        return {
          series: { path: thin(cn.path, 400), h: thin(cn.hs, 300) },
          values: {
            bk: cn.b.key,
            res: cn.res || '비행 중', hmax: showH ? (cn.maxR - cn.b.R) / 1000 : undefined,
            dist: showH ? cn.dist : undefined, vImp: cn.res === '추락' ? cn.vImp : undefined,
            lx: cn.res === '추락' ? cn.lx : null, ly: cn.res === '추락' ? cn.ly : null,
            ex: last[0], ey: last[1]
          }
        };
      }
      if (curMode === 'sat') {
        var s = satCalc(p.alt);
        return { series: {}, values: { rR: s.rR, v: s.v, Tstr: periodText(s.T), Th: s.Th, g: s.g * 100, mass: p.mass } };
      }
      return null;
    },
    save: function () {
      if (curMode !== 'cannon' || !cn) return {};
      return { x: cn.x, y: cn.y, vx: cn.vx, vy: cn.vy, t: cn.t, acc: cn.acc, pa: cn.pa, maxR: cn.maxR, minR: cn.minR,
        np: cn.path.length, nh: cn.hs.length, lastH: cn.lastH, res: cn.res, dist: cn.dist, lx: cn.lx, ly: cn.ly, vImp: cn.vImp };
    },
    load: function (s) {
      if (curMode === 'sat' && sat) { sat.done = false; return; }
      if (curMode !== 'cannon' || !cn || s.x === undefined) return;
      cn.x = s.x; cn.y = s.y; cn.vx = s.vx; cn.vy = s.vy; cn.t = s.t; cn.acc = s.acc; cn.pa = s.pa;
      cn.maxR = s.maxR; cn.minR = s.minR; cn.path.length = s.np; cn.hs.length = s.nh; cn.lastH = s.lastH || 0;
      cn.res = s.res; cn.dist = s.dist; cn.lx = s.lx; cn.ly = s.ly; cn.vImp = s.vImp;
    },
    status: function (p) {
      var m = p.mode || 'cannon';
      if (m === 'cannon') {
        var b = BODIES[p.body] || EARTH;
        if (p.body === 'jupiter') return ['목성', '대포로는 쏠 수 없어요'];
        return [b.name, '산꼭대기', '수평 발사', '공기 없음'];
      }
      if (m === 'sat') return ['지구', '원 궤도', '고도 ' + comma(p.alt) + ' km'];
      return ['태양계 행성 6개', '단위 AU · 년'];
    },
    onStep: function () { SK.requestRender(); }
  });

  /** 화면 1초에 흐르는 실제 시간(초) → 글자. 재생 속도([ ])가 1배가 아니면 함께 적는다 */
  function rateText(sec) {
    var s = sec < 60 ? SK.fmt(sec, 0) + '초' : sec < 3600 ? SK.fmt(sec / 60, sec < 600 ? 1 : 0).replace(/\.0$/, '') + '분' : SK.fmt(sec / 3600, 1) + '시간';
    return s + (SK.speed !== 1 ? ' (재생 ' + SK.speed + '배)' : '');
  }
  function speedText(Tsec) {
    return rateText(Tsec / SAT_SCREEN_T * SK.speed);
  }
  /* 대포 '보는 범위' — 같은 기록을 세 가지 축척으로 본다 */
  function viewOf(p, b) {
    var v = b.key === 'jupiter' ? 'earth' : (p.cview || 'earth');
    if (v === 'near') return { key: v, s: NEAR_K * b.R / 1000, cx: 170, cy: 250 + (b.R + MOUNT) / 1000 * NEAR_K };
    if (v === 'far') return { key: v, s: 110, cx: 760, cy: 215 };   // 10 km/s 타원(원지점 4.06 R)까지 화면 안 · 왼쪽 아래는 순서 상자 자리
    return { key: 'earth', s: CS, cx: 700, cy: 340 };
  }

  /* ------------------------------------------------------------------
     6. 조절 패널 — 수치 바꾸기 (맨 위: 대포 v₀ / 위성 고도·질량)
     ------------------------------------------------------------------ */
  /** 속력·천체에 맞춰 '보는 범위'와 시간 배속을 저절로 맞춘다 (표시만 바뀌고 기록·변인에는 영향 없음) */
  function autoView() {
    var b = BODIES[SK.get('body')] || EARTH, ratio = SK.get('v0') / b.vCirc;
    var v = ratio < 0.9 ? 'near' : ratio < 1.2 ? 'earth' : 'far';
    var ts = v === 'near' ? (b.key === 'earth' ? 0.5 : 2) : v === 'earth' ? 10 : 30;
    if (SK.get('cview') !== v) SK.set('cview', v);
    if (SK.get('tscale') !== ts) SK.set('tscale', ts);
  }
  SK.addVar('values', {
    key: 'v0', label: '{{발사 속력}}', symbol: 'v₀', unit: 'km/s',
    min: 0, max: 12, step: 0.1, value: 6.0, decimals: 1, precision: 2,
    ticks: [0, 7.9, 11.2], apply: 'restart',
    hint: '7.9 = 지구를 도는 속력 · 11.2 = 지구를 벗어나는 속력(탈출 속도)',
    onChange: function () { if (!seq) autoView(); updateSeq(); }
  });
  SK.addVar('values', {
    key: 'alt', label: '위성 {{고도}}', symbol: 'h', unit: 'km',
    min: 200, max: 36000, step: 100, value: 400, decimals: 0, precision: 0,
    ticks: [400, 20200, 35786], apply: 'restart',
    onChange: function () { updateAltNote(); updateSeq(); }
  });
  (function shortTicks() {   // 눈금 글자 줄이기: 400 · 2만 · 3만 6천
    var sp = SK.controls.alt.el.querySelectorAll('.var__ticks span'), names = ['400', '2만', '3만 6천'];
    for (var i = 0; i < sp.length && i < names.length; i++) sp[i].textContent = names[i];
  })();
  altNote = h('p', { class: 'og-note' });
  SK.controls.alt.el.appendChild(altNote);
  function updateAltNote() {
    var a = SK.get('alt'), r = (EARTH.R / 1000 + a) / (EARTH.R / 1000);
    altNote.textContent = '지구 중심까지 거리 r = ' + SK.fmt(r, 2) + ' R  (R = 지구 반지름, 약 6,400 km)';
  }
  updateAltNote();
  SK.addVar('values', {
    key: 'mass', label: '위성 질량', symbol: 'm', unit: 'kg',
    min: 100, max: 10000, step: 100, value: 1000, decimals: 0, precision: 0,
    ticks: [100, 10000], apply: 'restart',
    hint: '한 가지만 바꾸기: 고도는 그대로 두고 질량만 바꿔 기록해 보세요',
    onChange: function () { updateSeq(); }
  });

  /* ------------------------------------------------------------------
     7. 상황 바꾸기 — 모드(첫 화면 창과 같은 선택: 공통 틀이 한 줄로 접음) · 중심 천체
     ------------------------------------------------------------------ */
  SK.addChoice('situation', {
    key: 'mode', label: '무엇을 알아볼까요?', style: 'cards', apply: 'live', value: 'cannon', record: false,
    options: [
      { value: 'cannon', label: '뉴턴의 대포' },
      { value: 'sat', label: '원궤도 위성' },
      { value: 'kepler', label: '케플러 자료' }
    ],
    onChange: function () { seq = null; SK.reset(); }
  });
  SK.controls.mode.el.classList.add('og-modes');

  var bodyCtl = SK.addChoice('situation', {
    key: 'body', label: '중심 천체', style: 'cards', apply: 'restart', value: 'earth',
    options: BODY_ORDER.map(function (k) {
      var b = BODIES[k];
      return { value: k, label: b.name, sub: k === 'jupiter' ? '탈출 59.5 · 쏠 수 없음' : '탈출 ' + SK.fmt(b.vEsc, 1) + ' km/s' };
    }),
    onChange: function (v) {
      if (v === 'jupiter') { SK.notice('목성은 탈출 속도가 59.5 km/s 라 이 대포(최대 12 km/s)로는 쏠 수 없어요', 'warn', 4000); showCompare(); }
      else if (!seq) autoView();
    }
  });
  bodyCtl.el.classList.add('og-bodies');
  (function addBodyIcons() {
    var fills = { earth: ['--color-primary-tint', '--color-primary'], moon: ['--color-paper-sunk', '--color-line-strong'], mars: ['--color-sim-collision-tint', '--color-sim-collision'], jupiter: ['--color-sim-lens-tint', '--color-sim-lens'] };
    var btns = bodyCtl.el.querySelectorAll('.seg__opt');
    BODY_ORDER.forEach(function (k, i) {
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 40 40'); svg.setAttribute('class', 'og-ico'); svg.setAttribute('aria-hidden', 'true');
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '20'); c.setAttribute('cy', '20'); c.setAttribute('r', '15');   // 아이콘 크기 통일
      c.setAttribute('style', 'fill:var(' + fills[k][0] + ');stroke:var(' + fills[k][1] + ');stroke-width:3');
      svg.appendChild(c);
      if (btns[i]) btns[i].insertBefore(svg, btns[i].firstChild);
    });
  })();
  compareBtn = h('button', { class: 'og-link', type: 'button', onclick: function (e) { if (e.detail) e.currentTarget.blur(); showCompare(); } }, '천체 비교 표 보기 — 왜 천체마다 탈출 속도가 다를까? ▸');
  bodyCtl.el.appendChild(compareBtn);

  /* ------------------------------------------------------------------
     8. 화면에 표시하기
     ------------------------------------------------------------------ */
  SK.addToggle('tools', { key: 'arrows', label: '속도·중력 화살표', value: true, apply: 'live', record: false });
  SK.addToggle('tools', { key: 'trail', label: '지나간 길(궤적) 남기기', value: true, apply: 'live', record: false });
  SK.addChoice('tools', {
    key: 'gaxis', label: '그래프 축', apply: 'live', value: 'lin', record: false,
    options: [{ value: 'lin', label: 'T – a' }, { value: 'sq', label: 'T² – a³' }],
    onChange: function () { kCheck(); }
  });
  SK.addChoice('tools', {
    key: 'kzoom', label: '그래프 보는 범위', apply: 'live', value: 'all', record: false,
    options: [{ value: 'all', label: '행성 6개 전체' }, { value: 'inner', label: '안쪽 4개 확대' }]
  });
  SK.addToggle('tools', { key: 'kguide', label: '기울기 1 보조선 (T² = a³)', value: true, apply: 'live', record: false });
  SK.addChoice('tools', {
    key: 'cview', label: '보는 범위', apply: 'live', value: 'near', record: false,
    options: [{ value: 'near', label: '산 근처' }, { value: 'earth', label: '지구 전체' }, { value: 'far', label: '타원까지' }]
  });
  SK.controls.cview.el.classList.add('og-always-hide');   // 실험 화면 오른쪽 아래 버튼으로 바꿈
  SK.addChoice('tools', {
    key: 'tscale', label: '{{시간 배속}} — 화면 1초 동안 흐르는 실제 시간', apply: 'live', value: 0.5, record: false,
    options: [{ value: 0.5, label: '30초' }, { value: 2, label: '2분' }, { value: 10, label: '10분' }, { value: 30, label: '30분' }]
  });

  /* 실험 화면 오른쪽 위: 시간 배속·경과·보는 범위 (진한 글자, 창이 뜨면 공통 틀이 숨김) */
  hudEl = h('div', { class: 'og-hud' });
  SK.el.cornerTR.appendChild(hudEl);
  var hudKey = '';
  function updateHud(p) {
    var lines;
    if (curMode === 'cannon' && cn) {
      var V = viewOf(p, cn.b);
      lines = [
        ['b', '{{시간 배속}} (화면 1초 = 실제 ' + rateText((p.tscale || 2) * 60 * SK.speed) + ')'],
        ['s', '실제로 흐른 시간 ' + fmtDur(cn.t)],
        ['s', V.key === 'near' ? '보는 범위: 산 근처 (화면 가로 약 ' + comma(Math.round(1250 / NEAR_K / 10) * 10) + ' km)'
          : V.key === 'far' ? '보는 범위: 타원까지 (멀리 가는 궤도 전체)' : '보는 범위: ' + cn.b.name + ' 전체']
      ];
      if (V.key !== 'near') lines.push(['s', 'R = ' + cn.b.name + ' 반지름 (약 ' + comma(Math.round(cn.b.R / 1e5) * 100) + ' km)']);
    } else if (curMode === 'sat' && sat) {
      var s = satCalc(p.alt), f = Math.min(SK.time / SAT_SCREEN_T, 1);
      lines = [
        ['b', '{{시간 배속}} (화면 1초 ≈ 실제 ' + speedText(s.T) + ')'],
        ['s', '실제로 흐른 시간 ' + fmtDur(f * s.T) + ' / 한 바퀴 ' + periodText(s.T)]
      ];
    } else lines = [];
    var key = JSON.stringify(lines);
    if (key === hudKey) return;
    hudKey = key; hudEl.innerHTML = '';
    lines.forEach(function (l) { hudEl.appendChild(h('p', { class: l[0] === 'b' ? 'og-hud__main' : 'og-hud__sub' }, richTerm(l[1]))); });
  }
  /** '{{용어}}' → 용어 말풍선 */
  function richTerm(t) {
    var out = [], re = /\{\{([^}]+)\}\}/g, last = 0, m;
    while ((m = re.exec(t))) { if (m.index > last) out.push(t.slice(last, m.index)); out.push(SK.term(m[1])); last = re.lastIndex; }
    if (last < t.length) out.push(t.slice(last));
    return out;
  }

  /* 실험 화면 오른쪽 아래: 보는 범위 버튼 (대포) + 화면 밖으로 나가면 '더 넓게 보기' */
  var viewBtns = {}, viewHint = null;
  (function makeViewBtns() {
    var row = h('div', { class: 'og-view__row', role: 'group', 'aria-label': '보는 범위' });
    [['near', '산 근처'], ['earth', '지구 전체'], ['far', '타원까지']].forEach(function (o) {
      var b = h('button', { class: 'og-view__btn', type: 'button', 'aria-pressed': 'false' }, o[1]);
      b.addEventListener('click', function (e) { if (e.detail) b.blur(); SK.set('cview', o[0]); });
      viewBtns[o[0]] = b; row.appendChild(b);
    });
    viewHint = h('button', { class: 'btn btn--primary btn--sm og-view__hint', type: 'button', hidden: true }, '');
    viewHint.addEventListener('click', function (e) { if (e.detail) viewHint.blur(); if (viewHint._to) SK.set('cview', viewHint._to); });
    viewEl = h('div', { class: 'og-view' }, [viewHint, h('div', { class: 'og-view__box' }, [h('span', { class: 'og-view__label', text: '보는 범위' }), row])]);
    SK.el.cornerBR.appendChild(viewEl);
  })();
  function updateViewBtns(cur, off) {
    for (var k in viewBtns) { var on = String(k === cur); if (viewBtns[k].getAttribute('aria-pressed') !== on) viewBtns[k].setAttribute('aria-pressed', on); }
    var to = off ? (cur === 'near' ? 'earth' : cur === 'earth' ? 'far' : null) : null;
    viewHint.hidden = !to; viewHint._to = to;
    var t = to ? '화면 밖으로 나갔어요 — ' + (to === 'earth' ? '지구 전체로 보기' : '타원까지 넓게 보기') + ' ▸' : '';
    if (viewHint.textContent !== t) viewHint.textContent = t;
  }

  /* ------------------------------------------------------------------
     9. 심화 ▸ (거리–중력 그래프 · 로켓 분사 · 블랙홀)
     ------------------------------------------------------------------ */
  (function addDeep() {
    var deep = SK.panel('deep');
    var cv = h('div', { class: 'og-deep-canvas' });
    deep.appendChild(h('div', { class: 'og-deep-card' }, [
      h('h3', { text: '높이 올라가면 중력이 0이 될까?' }),
      cv,
      h('p', null, ['중력은 거리의 제곱에 반비례해서 ', h('b', { text: '약해질 뿐 0이 되지 않아요' }), '. 위성 안이 둥둥 떠 보이는 것은 위성과 우주인이 ', h('b', { text: '같이 떨어지고' }), ' 있기 때문이에요.'])
    ]));
    deepView = SK.canvas(cv, { w: 520, h: 280, fit: true });
    deepView.onResize = function () { deepKey = ''; drawDeep(SK.params); };

    var ns = 'http://www.w3.org/2000/svg';
    function svg(inner) {
      var s = document.createElementNS(ns, 'svg');
      s.setAttribute('viewBox', '0 0 520 150'); s.setAttribute('class', 'og-deep-svg'); s.setAttribute('aria-hidden', 'true');
      s.innerHTML = inner; return s;
    }
    deep.appendChild(h('div', { class: 'og-deep-card' }, [
      h('h3', { text: '로켓은 어떻게 빨라질까? (정성)' }),
      svg('<rect x="190" y="55" width="150" height="40" rx="12" style="fill:var(--color-paper-sunk);stroke:var(--color-ink);stroke-width:3"/>' +
          '<path d="M340 55 L390 75 L340 95 Z" style="fill:var(--color-sim-orbit)"/>' +
          '<path d="M190 62 L120 50 M190 75 L100 75 M190 88 L120 100" style="stroke:var(--color-q-energy-heat);stroke-width:5;stroke-linecap:round;fill:none"/>' +
          '<path d="M400 75 L480 75" style="stroke:var(--color-q-velocity);stroke-width:6"/><path d="M480 63 L500 75 L480 87 Z" style="fill:var(--color-q-velocity)"/>' +
          '<text x="60" y="130" style="fill:var(--color-ink-muted);font:600 20px sans-serif">가스를 뒤로 밀어냄</text>' +
          '<text x="360" y="130" style="fill:var(--color-ink-muted);font:600 20px sans-serif">로켓은 앞으로</text>'),
      h('p', null, ['로켓이 가스를 뒤로 세게 밀어내면 가스도 로켓을 앞으로 밀어요(', h('b', { text: '운동량 보존' }), '). 이렇게 속력을 높여 원 궤도 속력(7.9 km/s)이나 탈출 속도(11.2 km/s)에 이르러요.'])
    ]));
    var rs = 2 * EARTH.GM / (3e8 * 3e8) * 1000;  // mm
    deep.appendChild(h('div', { class: 'og-deep-card' }, [
      h('h3', { text: '빛도 못 빠져나가면? — 블랙홀' }),
      svg('<circle cx="130" cy="75" r="40" style="fill:var(--color-ink)"/>' +
          '<circle cx="130" cy="75" r="62" style="fill:none;stroke:var(--color-line-strong);stroke-width:2;stroke-dasharray:6 6"/>' +
          '<path d="M20 30 Q130 20 175 62" style="fill:none;stroke:var(--color-sim-lens);stroke-width:4"/>' +
          '<text x="250" y="60" style="fill:var(--color-ink);font:700 22px sans-serif">탈출 속도 = 빛의 속력</text>' +
          '<text x="250" y="95" style="fill:var(--color-ink-muted);font:600 20px sans-serif">R = 2GM / c²</text>'),
      h('p', null, ['탈출 속도 √(2GM/R) 가 빛의 속력보다 커지면 빛도 빠져나오지 못해요. 지구를 블랙홀로 만들려면 반지름을 약 ', h('b', { text: SK.fmt(rs, 0) + ' mm' }), ' 로 줄여야 해요(그림으로만 다뤄요).'])
    ]));
  })();
  function drawDeep(p) {
    if (!deepView) return;
    var key = curMode + '|' + p.alt + '|' + deepView.scale;
    if (key === deepKey) return;
    deepKey = key;
    deepView.clear();
    var ctx = deepView.ctx;
    var ax = axes(ctx, { x: 70, y: 20, w: 430, h: 210 }, [0, 36000], [0, 100], { fs: 16, xl: '고도 (km)', yl: '중력 (지표 = 100%)', nx: 4, ny: 4 });
    ctx.save();
    ctx.beginPath();
    for (var i = 0; i <= 120; i++) {
      var a = 36000 * i / 120, gg = Math.pow(6371 / (6371 + a), 2) * 100;
      if (i === 0) ctx.moveTo(ax.mx(a), ax.my(gg)); else ctx.lineTo(ax.mx(a), ax.my(gg));
    }
    ctx.strokeStyle = col('--color-q-force'); ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    [[400, 'ISS 89%'], [35786, '정지궤도 2.3%']].forEach(function (m) {
      var gg = Math.pow(6371 / (6371 + m[0]), 2) * 100;
      dot(ctx, ax.mx(m[0]), ax.my(gg), 6, '--color-q-force');
      text(ctx, m[1], ax.mx(m[0]) + (m[0] > 20000 ? -8 : 10), ax.my(gg) - 16, { size: 18, align: m[0] > 20000 ? 'right' : 'left', halo: true });
    });
    if (curMode === 'sat') {
      var gg2 = Math.pow(6371 / (6371 + p.alt), 2) * 100;
      dot(ctx, ax.mx(p.alt), ax.my(gg2), 8, null, '--color-sim-orbit', 3);
      text(ctx, '지금 ' + pctText(gg2 / 100) + '%', ax.mx(p.alt) + 12, ax.my(gg2) + 18, { size: 18, color: '--color-sim-orbit-text', halo: true });
    }
  }

  /* ------------------------------------------------------------------
     10. 하단 띠 — 계기판 1줄 · 속력 막대(대포·위성) / T²/a³ 막대(케플러)
     ------------------------------------------------------------------ */
  meterSets.cannon = SK.meters(null, [
    { key: 'v', label: '현재 속력', symbol: 'v', unit: 'km/s', decimals: 2, q: 'velocity', size: 'md' },
    { key: 'alt', label: '{{높이}}', unit: 'km', decimals: 0, size: 'md' },
    { key: 'res', label: '{{결과}}', unit: '', size: 'md' }
  ]);
  meterSets.sat = SK.meters(null, [
    { key: 'v', label: '속력', symbol: 'v', unit: 'km/s', decimals: 2, q: 'velocity', size: 'md' },
    { key: 'T', label: '{{주기}}', symbol: 'T', unit: '분', decimals: 1, size: 'md' },
    { key: 'g', label: '지표 중력 대비', unit: '%', q: 'force', size: 'md' }
  ]);
  meterSets.kepler = SK.meters(null, [
    { key: 'ratio', label: '평균 T²/a³', unit: '', decimals: 2 },
    { key: 'n', label: '입력한 행성', unit: '개', decimals: 0 }
  ]);
  for (var mk in meterSets) meterSets[mk].el.hidden = true;
  function setUnit(set, key, u) {
    var el = set.el.querySelector('[data-key="' + key + '"] .meter__unit');
    if (el && el.textContent !== u) el.textContent = u;
  }
  function updateMeters(p) {
    if (curMode === 'cannon' && cn) {
      var r = Math.sqrt(cn.x * cn.x + cn.y * cn.y);
      var landed = cn.res === '추락', jup = p.body === 'jupiter';
      meterSets.cannon.update({
        v: jup ? null : (landed && cn.vImp !== null ? cn.vImp : Math.sqrt(cn.vx * cn.vx + cn.vy * cn.vy) / 1000),
        alt: jup ? null : Math.max(0, landed ? 0 : (r - cn.b.R) / 1000),
        res: jup ? '쏠 수 없음' : resWord(cn.res)
      });
    } else if (curMode === 'sat' && sat) {
      var s = satCalc(p.alt);
      var useMin = s.T < 7200;
      meterSets.sat.update({ v: s.v, T: useMin ? s.T / 60 : s.T / 3600, g: pctText(s.g) });
      setUnit(meterSets.sat, 'T', useMin ? '분' : '시간');
    } else if (curMode === 'kepler') {
      var st = kStats();
      meterSets.kepler.update({ ratio: st.n ? st.mean : null, n: st.n });
    }
  }
  /** 결과 세 가지 말 (계기판·기록 표) */
  function resWord(res) {
    if (!res) return SK.started ? '나는 중' : '쏘기 전';
    if (res === '추락') return '추락';
    if (res === '탈출') return '탈출';
    return '궤도 유지';
  }

  (function makeBandGraph() {
    var area = h('div', { class: 'graph-box__canvas' });
    bandTitle = h('span', { text: '' });
    var box = h('div', { class: 'graph-box og-band' }, [h('div', { class: 'graph-box__title' }, [bandTitle]), area]);
    SK.el.graph.appendChild(box);
    bandView = SK.canvas(area, { fit: false, bg: '--color-paper-raised' });
    bandView.onResize = function () { drawBand(); };
  })();
  function drawBand() {
    if (!bandView) return;
    bandView.clear();
    var ctx = bandView.ctx, W = bandView.w, H = bandView.h;
    if (W < 40 || H < 20) return;
    if (curMode === 'cannon') bandCannon(ctx, W, H);
    else if (curMode === 'sat') bandSat(ctx, W, H);
    else bandKepler(ctx, W, H);
  }
  function setBandTitle(t) { if (bandTitle.textContent !== t) bandTitle.textContent = t; }
  /** 수평 속력 막대: 구간 색칠 + 눈금 + 기록 점 + 지금 표시 */
  function speedBar(ctx, W, H, o) {
    var x0 = 14, x1 = W - 14, y = Math.max(10, H * 0.42), bh = Math.min(18, H * 0.3);
    function X(v) { return x0 + (x1 - x0) * Math.max(0, Math.min(1, v / o.max)); }
    (o.zones || []).forEach(function (z) {
      ctx.fillStyle = col(z.color); ctx.fillRect(X(z.from), y - bh / 2, X(z.to) - X(z.from), bh);
      if (X(z.to) - X(z.from) > 70) text(ctx, z.label, (X(z.from) + X(z.to)) / 2, y, { size: 13, weight: 700, align: 'center', color: z.text || '--color-ink' });
    });
    ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 1; ctx.strokeRect(x0, y - bh / 2, x1 - x0, bh);
    (o.ticks || []).forEach(function (t) {
      ctx.beginPath(); ctx.moveTo(X(t), y - bh / 2); ctx.lineTo(X(t), y + bh / 2 + 4); ctx.strokeStyle = col('--color-ink'); ctx.lineWidth = 2; ctx.stroke();
      text(ctx, SK.fmt(t, t % 1 ? 1 : 0), X(t), y + bh / 2 + 13, { size: 13, weight: 700, align: 'center' });
    });
    (o.dots || []).forEach(function (d) {
      ctx.beginPath(); ctx.arc(X(d.v), y, 6, 0, Math.PI * 2); ctx.fillStyle = d.color; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = col('--color-paper-raised'); ctx.stroke();
      text(ctx, d.n, X(d.v), y - bh / 2 - 9, { size: 12, weight: 700, align: 'center', halo: true });
    });
    if (o.now !== null && o.now !== undefined) {
      var nx = X(o.now);
      ctx.beginPath(); ctx.moveTo(nx, y + bh / 2 + 2); ctx.lineTo(nx - 7, y + bh / 2 + 14); ctx.lineTo(nx + 7, y + bh / 2 + 14); ctx.closePath();
      ctx.fillStyle = col('--color-sim-orbit'); ctx.fill();
      ctx.strokeStyle = col('--color-sim-orbit'); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(nx, y - bh / 2 - 3); ctx.lineTo(nx, y + bh / 2 + 2); ctx.stroke();
    }
  }
  function bandCannon(ctx, W, H) {
    var b = BODIES[SK.params.body] || EARTH;
    if (b.key === 'jupiter') { setBandTitle('목성 탈출 속도 59.5 km/s — 이 대포의 다섯 배예요'); return; }
    setBandTitle('처음 속력 ' + SK.fmt(SK.params.v0, 1) + ' km/s(▲)는 어느 구간? · 번호 = 기록');
    var dots = [];
    SK.records.forEach(function (r) { if ((r.values.bk || r.params.body) === b.key) dots.push({ v: r.params.v0, color: SK.recStyle(r.slot).color, n: String(r.n) }); });
    speedBar(ctx, W, H, {
      max: 12,
      zones: [
        { from: 0, to: b.vCirc, color: '--color-warn-tint', label: '추락' },
        { from: b.vCirc, to: Math.min(12, b.vEsc), color: '--color-ok-tint', label: '궤도 유지' },
        { from: Math.min(12, b.vEsc), to: 12, color: '--color-primary-tint', label: '탈출' }
      ],
      ticks: [0, +b.vCirc.toFixed(1), +b.vEsc.toFixed(1), 12].filter(function (t, i, a) { return t <= 12 && a.indexOf(t) === i; }),
      dots: dots, now: SK.params.v0
    });
  }
  function bandSat(ctx, W, H) {
    var s = satCalc(SK.params.alt);
    setBandTitle('위성 속력 ' + SK.fmt(s.v, 2) + ' km/s(▲) · 번호 = 기록');
    var dots = SK.records.map(function (r) { return { v: r.values.v, color: SK.recStyle(r.slot).color, n: String(r.n) }; });
    speedBar(ctx, W, H, {
      max: 8,
      zones: [{ from: 0, to: 8, color: '--color-paper-sunk', label: '' }],
      ticks: [0, 3.1, 3.9, 7.7, 8],
      dots: dots, now: s.v
    });
  }
  function bandKepler(ctx, W, H) {
    setBandTitle('행성마다 T²/a³ — 모두 1(점선)에 가까울까?');
    var box = { x: 40, y: 4, w: W - 50, h: H - 22 };
    var n = PLANETS.length, bw = box.w / n;
    var my = function (v) { return box.y + box.h - v / 1.5 * box.h; };
    ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
    text(ctx, '1', box.x - 8, my(1), { size: 12, align: 'right', color: '--color-ink-muted' });
    kRows.forEach(function (r, i) {
      var x = box.x + bw * i + bw * 0.25, w = bw * 0.5;
      if (r.a && r.T) {
        var q = r.T * r.T / (r.a * r.a * r.a), y = my(Math.min(q, 1.5));
        ctx.fillStyle = col('--color-sim-orbit'); ctx.fillRect(x, y, w, box.y + box.h - y);
      }
      text(ctx, r.name + (r.a && r.T ? ' ' + SK.fmt(r.T * r.T / (r.a * r.a * r.a), 2) : ''), x + w / 2, H - 7, { size: 12, align: 'center', color: '--color-ink' });
    });
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = col('--color-q-force'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(box.x, my(1)); ctx.lineTo(box.x + box.w, my(1)); ctx.stroke(); ctx.restore();
  }

  recOpts = { columns: COLS.cannon };
  recTable = SK.recordTable(null, recOpts);
  SK.onRecords(function () { SK.requestRender(); updateSeq(); });

  /* ------------------------------------------------------------------
     11. 실험 화면 그리기 — 대포
     ------------------------------------------------------------------ */
  function edgeArrow(ctx, x, y, label, labels, cx0, cy0) {
    // 화면 밖 점(x, y)을 향하는 가장자리 화살표 (글자는 placeLabel 로). cx0, cy0: 천체 중심(화면)
    var ccx = Math.min(1150, Math.max(100, cx0)), ccy = Math.min(600, Math.max(100, cy0));
    var m = 36, dx = x - ccx, dy = y - ccy;
    var tx = dx > 0 ? (1250 - m - ccx) / dx : dx < 0 ? (m - ccx) / dx : Infinity;
    var ty = dy > 0 ? (700 - m - ccy) / dy : dy < 0 ? (m - ccy) / dy : Infinity;
    var t = Math.min(Math.abs(tx), Math.abs(ty));
    var ex = ccx + dx * t, ey = ccy + dy * t, len = Math.sqrt(dx * dx + dy * dy);
    SK.arrow(ctx, ex - dx / len * 60, ey - dy / len * 60, ex, ey, { color: '--color-sim-orbit', width: 6 });
    var lx = ex - dx / len * 80, ly = ey - dy / len * 80 + (dy > 0 ? -24 : 24);
    labels.push({ x: Math.min(1230, Math.max(20, lx)), y: ly, text: label, anchor: dx > 0 ? 'right' : 'left', size: 20 });
  }
  function renderCannon(ctx, p) {
    var c = cn; if (!c) return;
    var b = c.b, R = b.R, V = viewOf(p, b);
    var labels = [];
    function map(x, y) { return [V.cx + x * V.s, V.cy - y * V.s]; }
    // 천체
    drawBody(ctx, b.key, V.cx, V.cy, V.s);
    var top = map(0, 1), peak = map(0, (R + MOUNT) / R);
    var flashB = SK.isFlashing && SK.isFlashing('body');
    if (V.key === 'near') {
      // 실제 축척: 산 높이 20 km = 15u. 땅이 둥글게 휘어 내려가는 것이 보인다
      var gx = 980, gy = V.cy - Math.sqrt(Math.max(0, V.s * V.s - (gx - V.cx) * (gx - V.cx)));
      if (gy < 680) labels.push({ x: gx, y: Math.max(gy + 34, 60), text: b.name + ' 표면 — 둥글게 휘어 내려가요', size: 20, color: '--color-ink-muted' });
      ctx.beginPath(); ctx.moveTo(peak[0] - 46, top[1] + 2); ctx.lineTo(peak[0], peak[1]); ctx.lineTo(peak[0] + 40, top[1] + 2); ctx.closePath();
      ctx.fillStyle = col('--color-paper-sunk'); ctx.fill(); ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = col('--color-ink'); ctx.fillRect(peak[0] - 10, peak[1] - 8, 22, 8);
      labels.push({ x: peak[0] - 54, y: peak[1] + 34, text: '산꼭대기 대포 (높이 20 km)', anchor: 'right', size: 18, color: '--color-ink-muted' });
    } else {
      text(ctx, b.name, V.cx, V.cy + 10, { size: flashB ? 34 : 28, weight: 700, align: 'center', serif: true, color: flashB ? '--color-sim-orbit-text' : '--color-ink-muted' });
      // 산은 보이도록 크게 그린 그림 (실제 20 km 는 이 축척에서 3u)
      var tp = top[1];
      ctx.beginPath(); ctx.moveTo(V.cx - 34, tp + 6); ctx.lineTo(V.cx - 4, tp - 18); ctx.lineTo(V.cx + 30, tp + 6); ctx.closePath();
      ctx.fillStyle = col('--color-paper-sunk'); ctx.fill(); ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = col('--color-ink'); ctx.fillRect(V.cx - 16, tp - 26, 26, 9);
      labels.push({ x: V.cx - 44, y: tp + 4, text: '산꼭대기 대포', anchor: 'right', size: 18, color: '--color-ink-muted' });
    }

    if (b.key === 'jupiter') {
      panelBox(ctx, 250, 540, 750, 110);
      text(ctx, '목성은 탈출 속도가 59.5 km/s 예요', 625, 578, { size: 28, weight: 700, align: 'center', serif: true });
      text(ctx, '이 대포(최대 12 km/s)로는 쏠 수 없어요 — 천체 비교 표를 보세요', 625, 620, { size: 22, align: 'center', color: '--color-ink-muted' });
      updateViewBtns(V.key, false);
      SK.placeLabel(ctx, labels);
      return;
    }
    // 기록·직전 궤적 (색 + 선 모양). 궤적은 천체 반지름 R 단위라 같은 천체 기록만 겹친다
    var other = 0;
    SK.records.forEach(function (r) {
      if ((r.values.bk || r.params.body) !== b.key) { other++; return; }
      var st = SK.recStyle(r.slot);
      SK.drawPath(ctx, r.series.path, st, map);
      if (r.values.lx !== null && r.values.lx !== undefined) {
        var q = map(r.values.lx, r.values.ly);
        ctx.save(); ctx.strokeStyle = st.color; ctx.lineWidth = 3; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(q[0] - 7, q[1] - 7); ctx.lineTo(q[0] + 7, q[1] + 7); ctx.moveTo(q[0] + 7, q[1] - 7); ctx.lineTo(q[0] - 7, q[1] + 7); ctx.stroke(); ctx.restore();
      }
      var e = r.series.path[r.series.path.length - 1]; var eq = map(e[0], e[1]);
      if (eq[0] > 10 && eq[0] < 1240 && eq[1] > 10 && eq[1] < 690) labels.push({ x: eq[0] + 12, y: eq[1] - 14, text: '기록 ' + r.n + ' (' + SK.fmt(r.params.v0, 1) + ')', anchor: 'left', size: 17 });
    });
    if (SK.ghost && SK.ghost.series.path && (SK.ghost.values.bk || SK.ghost.params.body) === b.key) SK.drawPath(ctx, SK.ghost.series.path, SK.ghostStyle(), map);
    if (other) labels.push({ x: 24, y: 650, text: '다른 천체에서 쏜 기록 ' + other + '개는 기록 표에서 비교해요', anchor: 'left', size: 17, color: '--color-ink-muted' });
    // 지금 궤적
    var pts = p.trail ? c.path : c.path.slice(-10);
    var cur = pts.concat([[c.x / R, c.y / R]]);
    SK.drawPath(ctx, cur, { color: col('--color-sim-orbit'), dash: [], width: 4 }, map);
    // 포탄
    var bp = map(c.x / R, c.y / R);
    var off = bp[0] < 0 || bp[0] > 1250 || bp[1] < 0 || bp[1] > 700;
    var r = Math.sqrt(c.x * c.x + c.y * c.y);
    if (off) {
      edgeArrow(ctx, bp[0], bp[1], V.key === 'near' ? '포탄: 높이 ' + comma((r - R) / 1000) + ' km' : '포탄: 중심에서 ' + SK.fmt(r / R, 1) + ' R', labels, V.cx, V.cy);
    } else {
      if (c.res === '추락') {
        ctx.save(); ctx.strokeStyle = col('--color-warn'); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(bp[0] - 9, bp[1] - 9); ctx.lineTo(bp[0] + 9, bp[1] + 9); ctx.moveTo(bp[0] + 9, bp[1] - 9); ctx.lineTo(bp[0] - 9, bp[1] + 9); ctx.stroke(); ctx.restore();
        labels.push({ x: bp[0] + 16, y: bp[1] - 18, text: '떨어진 곳 (' + comma(c.dist) + ' km 날아감)', anchor: 'left', size: 20 });
      }
      dot(ctx, bp[0], bp[1], 9, '--color-ink');
      if (p.arrows && c.res !== '추락') {
        var v = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
        var vu = [c.vx / (v || 1), -c.vy / (v || 1)];               // 화면 좌표 (y 아래)
        var fu = [-c.x / r, c.y / r];                                // 중심 쪽
        var vl = Math.max(30, v / 1000 * 12), fl = Math.max(30, 80 * Math.pow(R / r, 2));
        if (v > 1) {
          SK.arrow(ctx, bp[0], bp[1], bp[0] + vu[0] * vl, bp[1] + vu[1] * vl, { color: '--color-q-velocity', width: 5 });
          labels.push({ x: bp[0] + vu[0] * (vl + 12), y: bp[1] + vu[1] * (vl + 12), text: '속도', anchor: vu[0] >= 0 ? 'left' : 'right', size: 18, color: '--color-q-velocity' });
        }
        SK.arrow(ctx, bp[0], bp[1], bp[0] + fu[0] * fl, bp[1] + fu[1] * fl, { color: '--color-q-force', width: 5 });
        labels.push({ x: bp[0] + fu[0] * (fl + 14), y: bp[1] + fu[1] * (fl + 14), text: '중력 (중심 쪽)', anchor: fu[0] > 0.3 ? 'left' : fu[0] < -0.3 ? 'right' : 'center', size: 18, color: '--color-copper-text' });
        if (v > 1) { var am = angleMark(ctx, bp[0], bp[1], vu, fu); if (am) labels.push(am); }
      }
    }
    updateViewBtns(V.key, off && c.res !== '원 궤도');
    SK.placeLabel(ctx, labels);
  }

  /* ------------------------------------------------------------------
     12. 실험 화면 그리기 — 원궤도 위성
     ------------------------------------------------------------------ */
  function satScale(p) {
    var rmax = satCalc(p.alt).rR;
    if (SK.records.length) {
      SK.records.forEach(function (r) { if (r.values.rR > rmax) rmax = r.values.rR; });
      if (SK.ghost && SK.ghost.values.rR > rmax) rmax = SK.ghost.values.rR;
    }
    return 220 / rmax;   // u / R (궤도 반지름 220u — 왼쪽 아래 순서 상자·오른쪽 우주인 칸과 안 겹치게)
  }
  function drawSatellite(ctx, x, y, ang, size) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = col('--color-primary'); ctx.strokeStyle = col('--color-primary-dark'); ctx.lineWidth = 1.5;
    ctx.fillRect(-size * 2.2, -size * 0.35, size * 1.4, size * 0.7); ctx.strokeRect(-size * 2.2, -size * 0.35, size * 1.4, size * 0.7);
    ctx.fillRect(size * 0.8, -size * 0.35, size * 1.4, size * 0.7); ctx.strokeRect(size * 0.8, -size * 0.35, size * 1.4, size * 0.7);
    ctx.fillStyle = col('--color-sim-orbit'); ctx.fillRect(-size * 0.8, -size * 0.6, size * 1.6, size * 1.2);
    ctx.restore();
  }
  function drawAstronaut(ctx, x, y, w, hh, g, t) {
    panelBox(ctx, x, y, w, hh);
    text(ctx, '위성 안의 우주인', x + 14, y + 22, { size: 20, weight: 700, color: '--color-ink' });
    // 창
    var wh = hh - 128;
    ctx.save();
    roundRect(ctx, x + 14, y + 40, w - 28, wh, 14);
    ctx.fillStyle = col('--color-paper-raised'); ctx.fill(); ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
    var bob = Math.sin(t * 2) * 6;
    var ax = x + w / 2, ay = y + 40 + wh / 2 + bob;
    ctx.strokeStyle = col('--color-ink'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.translate(ax, ay); ctx.rotate(0.35 + Math.sin(t) * 0.15);
    ctx.beginPath(); ctx.arc(0, -26, 11, 0, Math.PI * 2); ctx.fillStyle = col('--color-paper-sunk'); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 12);
    ctx.moveTo(0, -6); ctx.lineTo(-18, -18); ctx.moveTo(0, -6); ctx.lineTo(18, -16);
    ctx.moveTo(0, 12); ctx.lineTo(-12, 30); ctx.moveTo(0, 12); ctx.lineTo(14, 28); ctx.stroke();
    ctx.restore();
    dot(ctx, x + w * 0.78, y + 62 - bob, 7, '--color-copper');
    text(ctx, '둥둥 = 위성과 같이 떨어지는 중', x + w / 2, y + hh - 70, { size: 18, align: 'center', weight: 700, color: '--color-sim-orbit-text' });
    text(ctx, '중력: 지표 중력 대비 ' + pctText(g) + '%', x + w / 2, y + hh - 42, { size: 20, align: 'center', weight: 800, color: '--color-copper-text' });
    text(ctx, '(거리 2배면 중력 1/4)', x + w / 2, y + hh - 16, { size: 17, align: 'center', weight: 600, color: '--color-ink' });
  }
  /** 실험 화면 오른쪽 아래: 기록한 위성의 T – r (또는 T² – r³) 그래프 */
  function satGraph(ctx, p) {
    var sq = p.gaxis === 'sq';
    var bx = 1250 - 16 - 300, by = 396, bw = 300, bh = 250;
    panelBox(ctx, bx, by, bw, bh);
    text(ctx, sq ? 'T² – r³ 그래프' : 'T – r 그래프', bx + 14, by + 20, { size: 20, weight: 700 });
    text(ctx, sq ? '곧은 선이면 T² ∝ r³' : '기록하면 점이 생겨요', bx + 14, by + 44, { size: 16, color: '--color-ink-muted' });
    function X(rR) { return sq ? rR * rR * rR : rR; }
    function Y(Th) { return sq ? Th * Th : Th; }
    var pts = [];
    SK.records.forEach(function (r) { pts.push({ x: X(r.values.rR), y: Y(r.values.Th), st: SK.recStyle(r.slot), n: String(r.n) }); });
    var s = satCalc(p.alt);
    pts.push({ x: X(s.rR), y: Y(s.Th), now: true });
    var xm = 0, ym = 0;
    pts.forEach(function (q) { if (q.x > xm) xm = q.x; if (q.y > ym) ym = q.y; });
    var box = { x: bx + 56, y: by + 62, w: bw - 72, h: bh - 106 };
    var ax = axes(ctx, box, [0, niceMax(xm)], [0, niceMax(ym)], { fs: 15, nx: 3, ny: 3 });
    text(ctx, sq ? '가로 r³ (R³)' : '가로 r (R 단위)', box.x + box.w, by + bh - 12, { size: 15, align: 'right', color: '--color-ink' });
    text(ctx, sq ? '세로 T² (시간²)' : '세로 T (시간)', bx + 10, by + bh - 12, { size: 15, align: 'left', color: '--color-ink' });
    if (sq && SK.records.length >= 2) {
      var k = 4 * Math.PI * Math.PI * Math.pow(EARTH.R, 3) / (EARTH.GM * 3600 * 3600), xe = niceMax(xm);
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      SK.drawPath(ctx, [[0, 0], [xe, k * xe]], { color: col('--color-line-strong'), dash: [8, 6], width: 2 }, function (a, b) { return [ax.mx(a), ax.my(b)]; });
      ctx.restore();
    }
    pts.forEach(function (q) {
      var x = ax.mx(q.x), y = ax.my(q.y);
      if (q.now) { dot(ctx, x, y, 7, null, '--color-sim-orbit', 3); return; }
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = q.st.color; ctx.fill();
      text(ctx, q.n, x + 8, y - 10, { size: 16, weight: 700, halo: true });
    });
  }
  function renderSat(ctx, p) {
    var s = satCalc(p.alt), S = satScale(p), CX = 610, CY = 385;
    var labels = [];
    drawBody(ctx, 'earth', CX, CY, S);
    if (S > 60) text(ctx, '지구', CX, CY, { size: 26, weight: 700, align: 'center', serif: true, color: '--color-ink-muted' });
    function circ(rR, st, lab) {
      ctx.save(); SK.applyStroke(ctx, st);
      ctx.beginPath(); ctx.arc(CX, CY, rR * S, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      if (lab) labels.push({ x: CX + rR * S * 0.71 + 8, y: CY + rR * S * 0.71 + 8, text: lab, anchor: 'left', size: 17 });
    }
    SK.records.forEach(function (r) { circ(r.values.rR, SK.recStyle(r.slot), '기록 ' + r.n); });
    if (SK.ghost && SK.ghost.values.rR) circ(SK.ghost.values.rR, SK.ghostStyle());
    var ro = s.rR * S;
    ctx.save(); ctx.strokeStyle = col('--color-line'); ctx.lineWidth = 2; ctx.setLineDash([4, 8]);
    ctx.beginPath(); ctx.arc(CX, CY, ro, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    var f = Math.min(SK.time / SAT_SCREEN_T, 1);
    var th0 = Math.PI / 2, th = th0 + 2 * Math.PI * f;           // 수학 각(반시계)
    if (p.trail && f > 0) {
      ctx.save(); ctx.strokeStyle = col('--color-sim-orbit'); ctx.lineWidth = 4; ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(CX, CY, ro, -th0, -th, true); ctx.stroke(); ctx.restore();
    }
    var x = CX + ro * Math.cos(th), y = CY - ro * Math.sin(th);
    // 고도 표시: 지표에서 궤도까지 (왼쪽 아래 대각선, 궤도 바깥 여백에 글자)
    var ux = -1, uy = 0;   // 왼쪽 수평선 (위·아래는 상태 칩·순서 상자 자리)
    ctx.save(); ctx.strokeStyle = col('--color-ink-muted'); ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(CX + ux * S, CY + uy * S); ctx.lineTo(CX + ux * ro, CY + uy * ro); ctx.stroke(); ctx.restore();
    labels.push({ x: CX - ro - 10, y: CY - 22, text: '고도 ' + comma(p.alt) + ' km', anchor: 'right', size: 20 });
    var size = 10 + 5 * Math.log(p.mass / 100) / Math.LN10;  // 질량이 크면 조금 크게 (주기는 그대로!)
    drawSatellite(ctx, x, y, -th + Math.PI / 2, size);
    if (p.arrows) {
      var vu = [-Math.sin(th), -Math.cos(th)];
      var fu = [-Math.cos(th), Math.sin(th)];
      var vl = s.v * 16, fl = Math.max(30, 110 * s.g);
      SK.arrow(ctx, x, y, x + vu[0] * vl, y + vu[1] * vl, { color: '--color-q-velocity', width: 5 });
      SK.arrow(ctx, x, y, x + fu[0] * fl, y + fu[1] * fl, { color: '--color-q-force', width: 5 });
      // 위성 라벨은 궤도 바깥쪽으로
      var ox = Math.cos(th), oy = -Math.sin(th);
      labels.push({ x: x + vu[0] * (vl + 14) + ox * 10, y: y + vu[1] * (vl + 14) + oy * 10, text: '속도 ' + SK.fmt(s.v, 2) + ' km/s', anchor: vu[0] >= 0.2 ? 'left' : vu[0] <= -0.2 ? 'right' : 'center', size: 18, color: '--color-q-velocity' });
      labels.push({ x: x + fu[0] * (fl + 16), y: y + fu[1] * (fl + 16), text: '중력', anchor: 'center', size: 18, color: '--color-copper-text' });
      var am = angleMark(ctx, x, y, vu, fu); if (am) labels.push(am);
    }
    drawAstronaut(ctx, 1250 - 16 - 300, 136, 300, 248, s.g, SK.time * 3);
    satGraph(ctx, p);
    SK.placeLabel(ctx, labels, { avoid: [{ x: 934, y: 136, w: 300, h: 510 }] });
  }

  /* ------------------------------------------------------------------
     13. 케플러 자료 — 표(DOM) + 그래프(캔버스)
     ------------------------------------------------------------------ */
  var K_RANGE = { a: [0.1, 40], T: [0.05, 300] };
  function kStats() {
    var n = 0, sum = 0;
    kRows.forEach(function (r) { if (r.a && r.T) { n++; sum += r.T * r.T / (r.a * r.a * r.a); } });
    return { n: n, mean: n ? sum / n : 0 };
  }
  function kFmt(v, d) { return v === null || v === undefined ? '–' : SK.fmt(v, d); }
  (function makeKepler() {
    var tbody = h('tbody');
    kEl = h('div', { class: 'og-kepler', hidden: true }, [
      h('table', { class: 'og-ktable' }, [
        h('thead', null, h('tr', null, [h('th', { text: '행성' }), h('th', { text: 'a (AU)' }), h('th', { text: 'T (년)' }), h('th', { text: 'T²' }), h('th', { text: 'a³' }), h('th', { text: 'T²/a³' })])),
        tbody
      ]),
      h('div', { class: 'og-kbtns' }, [
        h('button', { class: 'btn btn--secondary', type: 'button', onclick: function (e) { if (e.detail) e.currentTarget.blur(); showDataCard(); } }, '자료 카드 보기'),
        h('button', { class: 'btn', type: 'button', onclick: function (e) { if (e.detail) e.currentTarget.blur(); kFill(); } }, '자료 넣기'),
        h('button', { class: 'btn btn--quiet', type: 'button', onclick: function (e) { if (e.detail) e.currentTarget.blur(); kClear(); } }, '표 비우기')
      ]),
      kStepEl = h('ol', { class: 'og-ksteps' }, [
        h('li', { text: '표 채우기 — a: 태양까지 거리(AU, 지구 = 1), T: 공전 주기(년)' }),
        h('li', { text: 'T – a 그래프: 휘어진 선이에요' }),
        h('li', { text: 'T² – a³ 그래프: 곧은 선, 기울기 1' })
      ])
    ]);
    kEl.style.gridTemplateRows = 'auto auto auto';
    kRows.forEach(function (row, i) {
      function inp(key) {
        var el = h('input', { class: 'og-kin num', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': row.name + ' ' + (key === 'a' ? '궤도 반지름 a (AU)' : '공전 주기 T (년)') });
        el.addEventListener('input', function () {
          var v = SK.parseNum(el.value);
          var rg = K_RANGE[key];
          if (el.value.trim() === '') { row[key] = null; el.classList.remove('is-invalid'); }
          else if (isNaN(v) || v < rg[0] || v > rg[1]) { el.classList.add('is-invalid'); row[key] = null; }
          else { el.classList.remove('is-invalid'); row[key] = v; }
          kUpdateRow(i); kCheck(); SK.requestRender();
        });
        el.addEventListener('change', function () {
          var v = SK.parseNum(el.value), rg = K_RANGE[key];
          if (el.value.trim() !== '' && (isNaN(v) || v < rg[0] || v > rg[1])) {
            SK.notice(isNaN(v) ? '숫자만 넣어 주세요 (예: 1.524)' : '범위는 ' + rg[0] + ' ~ ' + rg[1] + (key === 'a' ? ' AU' : ' 년') + ' 예요', 'warn');
          }
        });
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); var all = kEl.querySelectorAll('.og-kin'); var idx = Array.prototype.indexOf.call(all, el); if (all[idx + 1]) all[idx + 1].focus(); else el.blur(); }
          else if (e.key === 'Escape') { e.preventDefault(); el.blur(); }
        });
        el.addEventListener('focus', function () { el.select(); });
        row['el' + key] = el;
        return el;
      }
      row.cT2 = h('td', { class: 'num' }); row.ca3 = h('td', { class: 'num' }); row.cq = h('td', { class: 'num og-ratio' });
      tbody.appendChild(h('tr', null, [h('td', { text: row.name }), h('td', null, inp('a')), h('td', null, inp('T')), row.cT2, row.ca3, row.cq]));
      kUpdateRow(i);
    });
    SK.el.stage.appendChild(kEl);
  })();
  function kUpdateRow(i) {
    var r = kRows[i];
    r.cT2.textContent = r.T ? kFmt(r.T * r.T, r.T < 2 ? 3 : 1) : '–';
    r.ca3.textContent = r.a ? kFmt(r.a * r.a * r.a, r.a < 2 ? 3 : 1) : '–';
    r.cq.textContent = r.a && r.T ? kFmt(r.T * r.T / (r.a * r.a * r.a), 2) : '–';
  }
  function kSet(i, a, T) {
    var r = kRows[i]; r.a = a; r.T = T;
    r.ela.value = a === null ? '' : String(a); r.elT.value = T === null ? '' : String(T);
    r.ela.classList.remove('is-invalid'); r.elT.classList.remove('is-invalid');
    kUpdateRow(i);
  }
  function kFill() { PLANETS.forEach(function (p, i) { kSet(i, p.a, p.T); }); kCheck(); SK.requestRender(); SK.notice('행성 6개 자료를 넣었어요 — 이제 그래프를 T² – a³ 로 바꿔 봐요', 'ok'); }
  function kClear() { PLANETS.forEach(function (p, i) { kSet(i, null, null); }); kDone = false; kCheck(); SK.hideNote(); SK.requestRender(); }
  /** 케플러 3단계 안내: 지금 단계 강조, 표가 다 차고 T² – a³ 이면 결론(정리 문장·예측 판정) */
  function kCheck() {
    if (!kStepEl) return;
    var n = kStats().n, sq = SK.get('gaxis') === 'sq';
    var step = n < 3 ? 0 : (!sq ? 1 : 2);
    var lis = kStepEl.children;
    for (var i = 0; i < lis.length; i++) {
      lis[i].classList.toggle('is-now', i === step);
      lis[i].classList.toggle('is-done', i < step || (i === 2 && sq && n >= 6));
    }
    if (curMode === 'kepler' && n > 0 && SK.stepIndex === 0) SK.goStep(1);
    if (curMode === 'kepler' && sq && n >= 6 && !kDone) { kDone = true; SK.finish('점들이 원점을 지나는 곧은 선 위에 있어요 — T² ∝ a³'); }
  }
  function showDataCard() {
    var tb = h('tbody', null, PLANETS.map(function (p) {
      return h('tr', null, [h('td', { text: p.name }), h('td', { class: 'num', text: SK.fmt(p.a, 3) }), h('td', { class: 'num', text: p.T < 10 ? SK.fmt(p.T, 3) : SK.fmt(p.T, 2) })]);
    }));
    SK.dialog({
      title: '행성 관측 자료 카드',
      body: [
        h('table', { class: 'guide-table og-compare' }, [h('thead', null, h('tr', null, [h('th', { text: '행성' }), h('th', { text: '궤도 반지름 a (AU)' }), h('th', { text: '공전 주기 T (년)' })])), tb]),
        h('p', { class: 'og-dialog-note', text: '1 AU = 지구–태양 평균 거리(약 1억 5천만 km). 표에 직접 옮겨 적고 T², a³ 를 비교해 보세요.' })
      ],
      ok: '닫기', cancel: null
    });
  }
  function renderKepler(ctx, p) {
    var sq = p.gaxis === 'sq', inner = p.kzoom === 'inner';
    var box = { x: 720, y: 120, w: 490, h: 490 };
    text(ctx, sq ? 'T² – a³ 그래프' : 'T – a 그래프', box.x, 64, { size: 30, weight: 700, serif: true });
    text(ctx, sq ? '점들이 한 직선 위에 있을까?' : '거리가 멀수록 주기는 어떻게 늘까?', box.x, 96, { size: 20, color: '--color-ink-muted' });
    var pts = [];
    kRows.forEach(function (r) { if (r.a && r.T) pts.push({ x: sq ? r.a * r.a * r.a : r.a, y: sq ? r.T * r.T : r.T, name: r.name }); });
    var xm = inner ? (sq ? 4 : 2) : (sq ? 900 : 10), ym = inner ? (sq ? 4 : 2) : (sq ? 900 : 30);
    var ax = axes(ctx, box, [0, xm], [0, ym], { fs: 18, xl: sq ? 'a³ (AU³)' : 'a (AU)', yl: sq ? 'T² (년²)' : 'T (년)', nx: 5, ny: 5 });
    ctx.save(); ctx.beginPath(); ctx.rect(box.x - 2, box.y - 2, box.w + 4, box.h + 4); ctx.clip();
    if (sq && p.kguide) {
      SK.drawPath(ctx, [[0, 0], [Math.max(xm, ym), Math.max(xm, ym)]], { color: col('--color-q-force'), dash: [10, 7], width: 3 }, function (a, b) { return [ax.mx(a), ax.my(b)]; });
    }
    if (!sq && pts.length >= 2) {
      // T–a: 원점에서 시작해 점들을 부드럽게 잇는 곡선
      var sorted = [{ x: 0, y: 0 }].concat(pts.slice().sort(function (a, b) { return a.x - b.x; }));
      ctx.beginPath(); ctx.strokeStyle = col('--color-sim-orbit'); ctx.lineWidth = 3; ctx.setLineDash([]);
      ctx.moveTo(ax.mx(sorted[0].x), ax.my(sorted[0].y));
      for (var i = 0; i < sorted.length - 1; i++) {
        var p0 = sorted[Math.max(0, i - 1)], p1 = sorted[i], p2 = sorted[i + 1], p3 = sorted[Math.min(sorted.length - 1, i + 2)];
        var c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6, c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
        ctx.bezierCurveTo(ax.mx(c1x), ax.my(c1y), ax.mx(c2x), ax.my(c2y), ax.mx(p2.x), ax.my(p2.y));
      }
      ctx.stroke();
    }
    var hidden = 0;
    pts.forEach(function (q) {
      if (q.x > xm * 1.02 || q.y > ym * 1.02) { hidden++; return; }
      dot(ctx, ax.mx(q.x), ax.my(q.y), 9, '--color-sim-orbit', '--color-paper-raised', 2);
      text(ctx, q.name, ax.mx(q.x) + 12, ax.my(q.y) - 14, { size: 20, weight: 700, halo: true });
    });
    ctx.restore();
    if (sq && p.kguide) text(ctx, '기울기 1 (T² = a³)', box.x + box.w - 8, box.y + 24, { size: 18, align: 'right', color: '--color-copper-text', halo: true });
    if (hidden) text(ctx, '범위 밖 ' + hidden + '개 — 보는 범위를 \'전체\'로', box.x + box.w, box.y + box.h + 44, { size: 18, align: 'right', color: '--color-ink-muted' });
    if (!pts.length) text(ctx, '왼쪽 표에 a 와 T 를 넣어 보세요', box.x + box.w / 2, box.y + box.h / 2, { size: 24, weight: 700, align: 'center', color: '--color-ink-muted', halo: true });
  }

  /* ------------------------------------------------------------------
     14. 목성·천체 비교 표
     ------------------------------------------------------------------ */
  function showCompare() {
    var cur = SK.get('body');
    var rows = BODY_ORDER.map(function (k) {
      var b = BODIES[k];
      return h('tr', { class: k === cur ? 'is-now' : null }, [
        h('td', { text: b.name }),
        h('td', { class: 'num', text: comma(b.R / 1000) }),
        h('td', { class: 'num', text: SK.fmt(b.M / 5.972e24, b.M < 1e24 ? 3 : 0) }),
        h('td', { class: 'num', text: SK.fmt(b.g, 1) }),
        h('td', { class: 'num', text: SK.fmt(b.vCirc, k === 'mars' ? 2 : 1) }),
        h('td', { class: 'num', text: SK.fmt(b.vEsc, 1) })
      ]);
    });
    SK.dialog({
      title: '천체마다 탈출 속도가 달라요',
      body: [
        h('table', { class: 'guide-table og-compare' }, [
          h('thead', null, h('tr', null, [h('th', { text: '천체' }), h('th', { text: '반지름 (km)' }), h('th', { text: '질량 (지구 = 1)' }), h('th', { text: '지표 중력 (m/s²)' }), h('th', { text: '원 궤도 속력 (km/s)' }), h('th', { text: '탈출 속도 (km/s)' })])),
          h('tbody', null, rows)
        ]),
        h('p', { class: 'og-dialog-note', text: '탈출 속도 = √(2GM/R). 질량이 크고 반지름이 작을수록 커요. 이 대포는 최대 12 km/s 라 목성(59.5 km/s)에서는 쏠 수 없어요. 목성 반지름은 적도 반지름 71,492 km 로 계산했어요.' })
      ],
      ok: '닫기', cancel: null
    });
  }

  /* ------------------------------------------------------------------
     15. 실험 카드 5 + 순서 도우미
     ------------------------------------------------------------------ */
  // extra: 단계마다 함께 맞추는 '표시'(보는 범위·배속). 기록 대상이 아니라 변인 통제에 영향 없음
  var SEQS = [
    { id: 'v', mode: 'cannon', key: 'v0', what: '처음 속력', unit: ' km/s', vals: [4, 6, 7.9, 10, 11.2], label: function (v) { return SK.fmt(v, v % 1 ? 1 : 0); },
      hint: '하나마다 ▶ 실행 → [기록하기] → 다음. 보는 범위는 저절로 맞춰져요',
      extra: { 4: { cview: 'near', tscale: 0.5 }, 6: { cview: 'near', tscale: 0.5 }, 7.9: { cview: 'earth', tscale: 10 }, 10: { cview: 'far', tscale: 30 }, 11.2: { cview: 'far', tscale: 30 } } },
    { id: 'm', mode: 'sat', key: 'mass', what: '위성 질량', unit: ' kg', vals: [100, 1000, 10000], label: function (v) { return comma(v); },
      hint: '하나마다 ▶ 실행(한 바퀴) → [기록하기] → 다음. 고도는 그대로' },
    { id: 'h', mode: 'sat', key: 'alt', what: '고도', unit: ' km', vals: [400, 20200, 35786], label: function (v) { return v === 400 ? '400 ISS' : v === 20200 ? '20,200 GPS' : '35,786 정지궤도'; },
      hint: '하나마다 ▶ 실행 → [기록하기]. 다 모으면 그래프 축을 T² – r³ 로' },
    null,
    { id: 'b', mode: 'cannon', key: 'body', what: '중심 천체', unit: '', vals: ['moon', 'mars', 'earth'], label: function (v) { return BODIES[v].name; },
      hint: '하나마다 ▶ 실행 → [기록하기] → 다음. 속력은 3 km/s 그대로',
      extra: { moon: { cview: 'far', tscale: 10 }, mars: { cview: 'near', tscale: 2 }, earth: { cview: 'near', tscale: 0.5 } } }
  ];
  function applyExtra(s, v) {
    var ex = s && s.extra && s.extra[v];
    if (!ex) return;
    for (var k in ex) if (SK.get(k) !== ex[k]) SK.set(k, ex[k]);
  }
  var lastShownBody = 'earth';
  function bodyNotice(p) {
    if (lastShownBody && p.body !== lastShownBody) {
      var nm = BODIES[p.body].name;
      if (SK.flash) SK.flash('body');
      setTimeout(function () { SK.notice('중심 천체가 ' + nm + (nm === '달' ? '로' : '(으)로') + ' 바뀌었어요 — 왼쪽 위 칩을 확인하세요', 'info', 3000); }, 4200);
    }
  }
  SK.setPresets([
    {
      name: '뉴턴의 대포', tag: '과학사',
      change: '처음 속력 (4~11.2 km/s)', fixed: '지구 · 수평 발사',
      values: { mode: 'cannon', body: 'earth', v0: 7.9, tscale: 10, cview: 'earth', trail: true, arrows: true },
      predict: { question: '산꼭대기에서 7.9 km/s 로 수평으로 쏘면 포탄은 어떻게 될까?', choices: ['조금 멀리 가서 떨어진다', '지구를 한 바퀴 돈다', '우주로 날아가 버린다'],
        answer: 2, why: '7.9 km/s 면 포탄이 떨어지는 만큼 둥근 땅도 휘어 내려가서, 계속 떨어지면서도 땅에 닿지 않아요.',
        info: '7.9 km/s 로 맞춰져요. 그다음 4, 6, 10, 11.2 km/s 도 쏴서 비교해요.' },
      onApply: function (p) { bodyNotice(p); seq = SEQS[0]; updateSeq(true); }
    },
    {
      name: 'ISS도 떨어지는 중', tag: '오개념',
      change: '위성 질량', fixed: '고도 400 km (ISS)',
      values: { mode: 'sat', alt: 400, mass: 100, gaxis: 'lin', trail: true, arrows: true },
      predict: { question: '같은 400 km 높이에서 무거운 위성은 더 빨리 돌까?', choices: ['무거우면 더 빨리 돈다', '똑같은 빠르기로 돈다', '무거우면 더 느리게 돈다'],
        answer: 2, why: '무거우면 중력도 크지만 그만큼 움직이기 어려워(관성) 서로 상쇄돼요. v = √(GM/r) 에 위성 질량이 없어요.',
        info: '국제우주정거장(ISS) 높이에서 질량만 바꿔 봐요.' },
      onApply: function () { seq = SEQS[1]; updateSeq(true); }
    },
    {
      name: '정지궤도 위성', tag: '대표 문항',
      change: '고도 (ISS → GPS → 정지궤도)', fixed: '질량 1,000 kg',
      values: { mode: 'sat', alt: 400, mass: 1000, gaxis: 'lin', trail: true, arrows: true },
      predict: { question: '높이 있는 위성(35,786 km)은 국제우주정거장(400 km)보다 더 빨리 돌까?', choices: ['더 빨리 돈다', '같은 빠르기다', '더 느리게 돈다'],
        answer: 3, why: '멀어질수록 중력이 약해져 느리게 돌아도 돼요(v = √(GM/r)). 400 km 는 7.7 km/s, 35,786 km 는 3.1 km/s 예요.',
        info: '고도만 바꿔 세 번 기록해요. 마지막이 정지궤도(주기 하루)예요.' },
      onApply: function () { seq = SEQS[2]; updateSeq(true); }
    },
    {
      name: '행성 자료로 규칙', tag: '탐구 재현',
      change: '행성 6개 자료', fixed: '단위 AU · 년',
      values: { mode: 'kepler', gaxis: 'lin', kzoom: 'all', kguide: true },
      predict: { question: '태양에서 멀리 있는 행성일수록 공전 주기(1년의 길이)는?', choices: ['거리에 비례해서 길어진다', '거리보다 더 빨리 길어진다', '거리와 상관없다'],
        answer: 2, why: 'T² ∝ a³ 라서 T 는 a 의 1.5제곱에 비례해요. 거리가 4배면 주기는 8배예요.',
        info: '자료 카드를 보고 표를 채워요.' },
      onApply: function () { seq = null; kClear(); updateSeq(true); setTimeout(function () { SK.notice('④ 준비 완료 — 왼쪽 표에 행성 자료를 넣어 규칙을 찾아요', 'info', 3500); }, 0); }
    },
    {
      name: '3 km/s로 쏘면?', tag: '대표 문항',
      change: '중심 천체 (지금: 달)', fixed: '처음 속력 3 km/s',
      values: { mode: 'cannon', body: 'moon', v0: 3, tscale: 10, cview: 'far', trail: true, arrows: true },
      predict: { question: '3 km/s 로 쏘면 어느 천체에서 포탄이 탈출할까?', choices: ['달', '화성', '지구', '모두 떨어진다'],
        answer: 1, why: '탈출 속도가 달 2.4, 화성 5.0, 지구 11.2 km/s 라서 3 km/s 보다 작은 달에서만 탈출해요.',
        info: '중심 천체가 달로 바뀌어요. 달 → 화성 → 지구 순서로 쏘고 하나씩 기록해요.' },
      onApply: function (p) { bodyNotice(p); seq = SEQS[4]; updateSeq(true); }
    }
  ]);

  seqEl = h('div', { class: 'og-seq', hidden: true });
  SK.el.cornerBL.appendChild(seqEl);
  var seqKey = '';
  function sameRec(r, v) { return r.params[seq.key] === v && (seq.key === 'body' || seq.mode !== 'cannon' || r.params.body === SK.get('body')); }
  function updateSeq(force) {
    if (!seqEl) return;
    if (!seq || seq.mode !== curMode) { if (!seqEl.hidden) seqEl.hidden = true; seqKey = ''; return; }
    var now = SK.get(seq.key), idx = -1;
    seq.vals.forEach(function (v, i) { if (v === now) idx = i; });
    var recd = SK.records.some(function (r) { return sameRec(r, now); });
    var key = [seq.id, now, SK.running, SK.finished, SK.records.length, recd].join('|');
    if (!force && key === seqKey) return;
    seqKey = key;
    seqEl.hidden = false; seqEl.innerHTML = '';
    var steps = h('div', { class: 'og-seq__steps' });
    seq.vals.forEach(function (v, i) {
      if (i) steps.appendChild(h('span', { class: 'og-seq__arrow', text: '→', 'aria-hidden': 'true' }));
      var done = SK.records.some(function (r) { return sameRec(r, v); });
      var b = h('button', { class: 'og-seq__chip' + (i === idx ? ' is-now' : '') + (done ? ' is-done' : ''), type: 'button', title: done ? '기록함' : '' }, (done ? '✓ ' : '') + seq.label(v));
      b.addEventListener('click', function (e) { if (e.detail) b.blur(); goSeq(v); });
      steps.appendChild(b);
    });
    var next = idx >= 0 && idx < seq.vals.length - 1 ? seq.vals[idx + 1] : null;
    var reason = '';
    var btn;
    if (next !== null) {
      btn = h('button', { class: 'btn btn--secondary btn--sm', type: 'button' }, '다음: ' + seq.label(next).replace(/ .*$/, '') + seq.unit + ' ▶');
      if (SK.running) { btn.disabled = true; reason = '실행이 끝난 뒤에 넘어가요'; }
      else if (!recd) reason = SK.finished ? '이번 결과를 아직 기록하지 않았어요 — [기록하기] 먼저' : '▶ 실행하고 [기록하기]를 한 뒤 넘어가요';
      btn.addEventListener('click', function (e) { if (e.detail) btn.blur(); goSeq(next); });
    } else {
      var n = SK.records.length;
      btn = h('button', { class: 'btn btn--primary btn--sm', type: 'button' }, '끝 — 기록 표를 비교해요 ▸');
      if (n < 2) { btn.disabled = true; reason = '기록 2개 이상 필요 (지금 ' + n + '개)'; }
      btn.addEventListener('click', function (e) { if (e.detail) btn.blur(); SK.goStep(2); });
    }
    seqEl.appendChild(h('span', { class: 'og-seq__title', text: '순서 — ' + seq.what + (seq.unit ? '(' + seq.unit.trim() + ')' : '') + '만 바꾸기' }));
    seqEl.appendChild(steps);
    seqEl.appendChild(h('span', { class: 'og-seq__hint', text: seq.hint }));
    seqEl.appendChild(h('div', { class: 'og-seq__foot' }, [btn, reason ? h('span', { class: 'og-seq__why', text: reason }) : null]));
  }
  function goSeq(v) {
    if (!seq || SK.running) { if (SK.running) SK.notice('실행이 끝나거나 ⏸ 멈춘 뒤에 바꿔요', 'info'); return; }
    SK.set(seq.key, v, { silent: true });
    applyExtra(seq, v);
    if (seq.key === 'alt') updateAltNote();
    SK.reset();
    updateSeq(true);
  }

  /* ------------------------------------------------------------------
     16. 설명 도우미 — 도움말(이렇게 해요·개념·용어) · 결과 해설 · 정리 질문
     ------------------------------------------------------------------ */
  SK.help({
    how: [
      '처음 창에서 무엇을 알아볼지 골라요 (뉴턴의 대포 · 원궤도 위성 · 케플러 자료). 오른쪽 위 [바꾸기]로 언제든 바꿀 수 있어요.',
      '아래 실험 카드를 누르면 예측 질문이 먼저 나와요. 답을 고르면 값이 저절로 맞춰져요.',
      '▶ 실행으로 쏘거나(대포) 한 바퀴 돌려요(위성). 끝나면 [기록하기].',
      '실험 화면 왼쪽 아래 순서 상자에서 [다음 ▶]을 눌러 값 하나만 바꾸고 다시 실행·기록해요.',
      '포탄이 화면 밖으로 나가면 실험 화면 오른쪽 아래 [보는 범위]를 넓혀요.',
      '비교 단계에서 기록 표를 보고, 정리 단계에서 질문에 답한 뒤 [답 확인하기]로 맞춰 봐요.'
    ],
    concepts: [
      { title: '위성은 계속 떨어지고 있어요 (뉴턴의 대포)',
        plain: '산꼭대기에서 옆으로 쏜 포탄은 중력 때문에 아래로 휘며 떨어져요. 빨리 쏠수록 더 멀리 가서 떨어지지요. 아주 빠르면(지구 7.9 km/s) 포탄이 떨어지는 만큼 둥근 땅도 휘어 내려가서 땅에 닿지 않아요. 이것이 궤도예요. 중력은 늘 지구 중심을 향하고, 원 궤도에서는 속도와 직각이라 빠르기는 그대로이고 방향만 바뀌어요.' },
      { title: '원 궤도 속력', formula: 'v = √(GM / r)',
        plain: '기호 뜻 — v: 위성의 속력(m/s), G: 중력 상수 6.67×10⁻¹¹ N·m²/kg², M: 지구 질량 6.0×10²⁴ kg, r: 지구 중심까지 거리(m, 고도 h 가 아니라 R + h). 왜? 중력이 원운동에 필요한 힘(구심력)이 되어 GMm/r² = mv²/r. 양쪽의 위성 질량 m 이 지워져서 위성 질량은 안 들어가요 — 무거우면 중력도 크지만 관성도 커서 상쇄돼요. r 이 클수록 v 는 작아요.',
        live: function (p) {
          if (curMode === 'sat') { var s = satCalc(p.alt); return 'r = 6,371 + ' + comma(p.alt) + ' = ' + comma(6371 + p.alt) + ' km → v = ' + SK.fmt(s.v, 2) + ' km/s'; }
          var b = BODIES[p.body] || EARTH; return b.name + ' 표면 바로 위 → v = √(GM/R) = ' + SK.fmt(b.vCirc, 2) + ' km/s';
        } },
      { title: '주기 — 한 바퀴 도는 데 걸리는 시간', formula: 'T = 2πr / v',
        plain: '한 바퀴 길이(2πr)를 속력 v 로 나눈 시간이에요. 높은 위성은 돌아야 할 길도 길고 속력도 느려서 주기가 훨씬 길어져요. 정지궤도는 T 가 약 하루(23.9시간)예요.',
        live: function (p) { var s = satCalc(p.alt); return '고도 ' + comma(p.alt) + ' km → T = ' + periodText(s.T); } },
      { title: '탈출 속도', formula: 'v = √(2GM / R)',
        plain: '이보다 빠르면 돌아오지 않아요. 기호 뜻 — R: 출발하는 천체의 반지름(m), M: 그 천체의 질량. 처음 운동 에너지 ½mv² 가 중력에 맞서 무한히 멀리 가는 데 드는 에너지 GMm/R 과 같아지는 속력이에요(여기서도 m 이 지워져요). 원 궤도 속력의 √2 ≈ 1.41배예요. 지구 11.2, 달 2.4, 화성 5.0, 목성 59.5 km/s.',
        live: function (p) { var b = BODIES[p.body] || EARTH; return b.name + ': 탈출 속도 ' + SK.fmt(b.vEsc, 1) + ' km/s · 원 궤도 속력 ' + SK.fmt(b.vCirc, 1) + ' km/s'; } },
      { title: '중력은 거리의 제곱에 반비례해요', formula: 'F = GMm / r²',
        plain: '지구 중심에서 거리가 2배면 중력은 1/4, 3배면 1/9로 줄어요. 줄기만 할 뿐 0이 되지는 않아요. 국제우주정거장(고도 400 km)에서도 지표의 89%, 정지궤도에서도 2.3% 예요. 우주인이 떠 보이는 것은 중력이 없어서가 아니라 우주정거장과 함께 떨어지고 있어서예요.',
        live: function (p) { var s = satCalc(p.alt); return '고도 ' + comma(p.alt) + ' km: r = ' + SK.fmt(s.rR, 2) + ' R → 중력 = (1/' + SK.fmt(s.rR, 2) + ')² = 지표의 ' + pctText(s.g) + '%'; } },
      { title: '케플러 제3법칙', formula: 'T² ∝ a³',
        plain: '공전 주기 T 의 제곱은 궤도 반지름(긴반지름) a 의 세제곱에 비례해요. 태양계에서 a 를 AU, T 를 년으로 쓰면 T²/a³ ≈ 1. 왜? 원 궤도 식 v = √(GM/r) 와 T = 2πr/v 를 합치면 T² = (4π² / GM) r³ — 같은 천체(태양)를 도는 것끼리는 비례 상수가 같아요.',
        live: function () { var st = kStats(); return st.n ? '표에 넣은 ' + st.n + '개 행성의 T²/a³ 평균 = ' + SK.fmt(st.mean, 2) : '표에 행성 자료를 넣으면 평균이 나와요'; } }
    ],
    terms: {
      '궤도': '천체나 위성이 다른 천체 둘레를 도는 길. 원 궤도와 타원 궤도가 있어요.',
      '고도': '땅(지표)에서 잰 높이 h. 지구 중심까지 거리 r = R + h 와 달라요.',
      '높이': '지표에서 포탄까지 잰 높이(km).',
      '발사 속력': '포탄을 쏘는 처음 빠르기 v₀ (km/s). 1 km/s = 초속 1,000 m.',
      '탈출 속도': '이 속력보다 빠르면 천체의 중력을 이기고 돌아오지 않아요. 지구 11.2 km/s.',
      '원 궤도 속력': '같은 높이를 유지하며 원을 그리며 도는 속력. 지구 표면 근처 7.9 km/s.',
      '시간 배속': '화면 1초 동안 실제로 몇 분이 흐르는지. 위성은 너무 오래 걸려서 빨리 감아 보여 줘요.',
      'R': '중심 천체의 반지름. 지구는 약 6,400 km. 1 R = 지구 반지름 1개 길이.',
      '변인 통제': '한 번에 한 가지만 바꾸고 나머지는 그대로 두어야 무엇 때문에 달라졌는지 알 수 있어요.',
      '주기': '한 바퀴 도는 데 걸리는 시간 T.',
      'AU': '천문단위. 지구와 태양 사이 평균 거리, 약 1억 5천만 km.',
      '정지궤도': '주기가 지구 자전과 같은(약 하루) 원 궤도. 적도 위 고도 약 35,786 km 에서 늘 같은 곳 위에 떠 있어요.',
      '구심력': '원운동을 하게 만드는 중심 쪽 힘. 위성에서는 중력이 이 역할을 해요.',
      '결과': '궤도 유지: 계속 돌아요 / 추락: 땅에 떨어졌어요 / 탈출: 돌아오지 않아요.'
    },
    keys: [['V', '속도·중력 화살표 켜고 끄기'], ['O', '궤적 남기기 켜고 끄기'], ['N', '중심 천체 바꾸기 (대포)'], ['G', '그래프 축 바꾸기'], ['Z', '보는 범위 바꾸기']]
  });

  /** 실행이 끝나면 '이 실험이 보여 주는 것' */
  SK.takeaway(function (p) {
    if (curMode === 'kepler') return 'T² ∝ a³ — 케플러 제3법칙. 태양을 도는 행성은 모두 T²/a³ 이 거의 1(AU·년 단위)로 같아요. 같은 태양의 중력이 모두를 끌어당기기 때문이에요.';
    if (curMode === 'sat') {
      var s = satCalc(p.alt);
      if (Math.abs(p.alt - 400) < 1) return 'ISS 는 떨어지는 중이지만 옆으로 ' + SK.fmt(s.v, 1) + ' km/s 로 달려서 땅이 같이 휘어 멀어져요. 무중력이 아니라 같이 떨어지는 상태예요 (중력은 지표의 ' + pctText(s.g) + '%). 위성 질량을 바꿔도 속력·주기는 그대로예요.';
      if (Math.abs(p.alt - 35786) < 1) return '주기 ' + periodText(s.T) + ' — 지구 자전(약 하루)과 같아서 늘 같은 곳 위에 떠 있어요(정지궤도). 높을수록 느리게(' + SK.fmt(s.v, 2) + ' km/s) 돌고 주기는 길어져요.';
      return '고도 ' + comma(p.alt) + ' km: 속력 ' + SK.fmt(s.v, 2) + ' km/s, 주기 ' + periodText(s.T) + '. 높을수록 중력이 약해 느리게 돌고, 돌 길도 길어 주기가 길어져요.';
    }
    if (!cn || !cn.res) return null;
    var b = cn.b, cmp = ' (탈출 속도 ' + SK.fmt(b.vEsc, 1) + ' km/s 와 비교: 지금 ' + SK.fmt(p.v0, 1) + ')';
    if (cn.res === '추락') return '처음 속력이 원 궤도 속력(' + SK.fmt(b.vCirc, 1) + ' km/s)보다 느려 땅에 떨어졌어요. 충돌 직전 속력 ' + SK.fmt(cn.vImp, 2) + ' km/s — 떨어지는 동안 중력이 끌어당겨 처음보다 빨라져요.' + cmp;
    if (cn.res === '원 궤도') return '포탄이 떨어지는 만큼 둥근 땅도 휘어 내려가서, 계속 떨어지면서도 땅에 닿지 않고 돌아요. 이것이 인공위성이에요.' + cmp;
    if (cn.res === '타원 궤도') return '원 궤도 속력보다 빠르고 탈출 속도보다 느려서, 멀어졌다가 다시 돌아오는 타원 궤도가 됐어요.' + cmp;
    if (cn.res === '탈출') return '탈출 속도 이상이라, 중력이 속력을 줄이긴 해도 0까지 줄이지 못해 돌아오지 않아요.' + cmp;
    return '탈출 속도보다 조금 느려서 아주 멀리 갔다가 언젠가 돌아오는 긴 타원이에요.' + cmp;
  });

  /* 정리 질문 (모드별로 보임) */
  function addThink(modes, o) { thinkCards.push({ modes: modes, el: SK.think(o) }); }
  addThink(['cannon', 'sat'], { q: '로켓이 아주 높이 올라가면 지구 중력이 0이 될까?', choices: ['0이 된다', '약해지지만 0은 아니다', '오히려 세진다'], answer: 2,
    why: '중력은 거리의 제곱에 반비례(F = GMm/r²)해 줄어들 뿐 0이 되지 않아요. 국제우주정거장 높이에서도 지표의 89%, 정지궤도에서도 2.3% 가 남아 있어요.' });
  addThink(['cannon'], { q: '7.9 km/s 로 쏜 포탄이 땅에 떨어지지 않는 까닭은?', choices: ['그 높이에서는 중력이 사라져서', '떨어지는 만큼 땅이 둥글게 휘어 멀어져서', '포탄이 너무 빨라 중력을 안 받아서'], answer: 2,
    why: '포탄은 계속 중력을 받아 떨어지고 있어요. 다만 옆으로 아주 빨라서 떨어지는 만큼 땅도 둥글게 휘어 내려가, 땅과의 높이가 그대로예요.' });
  addThink(['cannon'], { q: '화성의 탈출 속도(5.0 km/s)가 지구(11.2 km/s)보다 작은 까닭을 v = √(2GM/R) 로 설명해 봐요.',
    reveal: '<b>모범 답</b> 화성은 질량 M 이 지구의 약 0.11배, 반지름 R 은 약 0.53배예요. M/R 이 지구의 약 0.2배라 탈출 속도는 √0.2 ≈ 0.45배, 약 5 km/s 예요. 질량이 작을수록 탈출하기 쉬워요.' });
  addThink(['sat'], { q: '같은 높이에서 10,000 kg 위성과 100 kg 위성이 돌면?', choices: ['무거운 쪽이 빨리 돈다', '같은 빠르기로 돈다', '가벼운 쪽이 빨리 돈다'], answer: 2,
    why: 'GMm/r² = mv²/r 에서 위성 질량 m 이 지워져 v = √(GM/r). 무거우면 중력도 크지만 그만큼 움직이기도 어려워(관성) 상쇄돼요.' });
  addThink(['sat'], { q: '국제우주정거장 안의 우주인이 둥둥 떠 있는 까닭은?', choices: ['우주에는 중력이 없어서', '우주정거장과 우주인이 함께 떨어지고 있어서', '공기가 없어서'], answer: 2,
    why: '그 높이에서도 중력은 지표의 89%예요. 우주정거장과 우주인이 똑같이 떨어지니 바닥이 우주인을 받치지 않아 떠 보여요(엘리베이터 줄이 끊겨 같이 떨어질 때와 같아요).' });
  addThink(['sat'], { q: '정지궤도 위성은 왜 모두 같은 높이(약 35,786 km)에 있을까?',
    reveal: '<b>모범 답</b> 늘 같은 곳 위에 있으려면 지구 자전과 같은 주기(약 23.9시간)로 돌아야 해요. T² ∝ r³ 이라 주기가 정해지면 거리 r 도 하나로 정해져요 → 지구 중심에서 약 42,200 km(6.6 R), 고도 약 35,800 km.' });
  addThink(['kepler'], { q: '모든 행성에서 T²/a³ 이 1로 같다는 것은 무엇을 뜻할까?',
    reveal: '<b>모범 답</b> 모든 행성이 같은 태양 하나의 중력으로 돈다는 뜻이에요. T² = (4π²/GM) a³ 에서 비례 상수는 태양 질량 M 으로만 정해져, 태양을 도는 천체라면 행성이든 소행성이든 같은 값(AU·년 단위로 1)이에요.' });
  addThink(['kepler'], { q: '태양에서 4 AU 떨어져 도는 소행성의 공전 주기는?', choices: ['4년', '8년', '16년', '64년'], answer: 2,
    why: 'T² = a³ = 4³ = 64 → T = √64 = 8년. 거리가 4배여도 주기는 4배가 아니라 8배예요.' });

  /* ------------------------------------------------------------------
     17. 실행·기록 가로채기 (케플러·목성) · 전용 키
     ------------------------------------------------------------------ */
  var basePlay = SK.play, baseRecord = SK.record;
  SK.play = function () {
    if (curMode === 'kepler') { SK.notice('케플러 자료는 실행하지 않아요 — 표에 숫자를 넣으면 바로 그래프가 그려져요', 'info'); return; }
    if (curMode === 'cannon' && SK.params.body === 'jupiter') {
      SK.notice('목성은 탈출 속도가 59.5 km/s 라 이 대포(최대 12 km/s)로는 쏠 수 없어요', 'warn', 4000);
      return;
    }
    basePlay();
  };
  SK.record = function () {
    if (curMode === 'kepler') { SK.notice('케플러 자료는 표 자체가 기록이에요', 'info'); return; }
    if (curMode === 'cannon' && SK.params.body === 'jupiter') { SK.notice('목성은 쏠 수 없어서 기록할 결과가 없어요', 'info'); return; }
    baseRecord();
  };
  SK.onKey(function (e) {
    if (e.repeat) return false;
    switch (e.code) {
      case 'KeyV': if (curMode === 'kepler') return false; SK.set('arrows', !SK.get('arrows')); SK.notice('속도·중력 화살표 ' + (SK.get('arrows') ? '켬' : '끔'), 'info', 1200); return true;
      case 'KeyO': if (curMode === 'kepler') return false; SK.set('trail', !SK.get('trail')); SK.notice('궤적 남기기 ' + (SK.get('trail') ? '켬' : '끔'), 'info', 1200); return true;
      case 'KeyN':
        if (curMode !== 'cannon') { SK.notice('중심 천체는 뉴턴의 대포에서 바꿔요', 'info', 1500); return true; }
        var i = BODY_ORDER.indexOf(SK.get('body'));
        SK.set('body', BODY_ORDER[(i + 1) % BODY_ORDER.length]);
        return true;
      case 'KeyG':
        if (curMode === 'cannon') return false;
        SK.set('gaxis', SK.get('gaxis') === 'sq' ? 'lin' : 'sq');
        return true;
      case 'KeyZ':
        if (curMode === 'kepler') { SK.set('kzoom', SK.get('kzoom') === 'all' ? 'inner' : 'all'); return true; }
        if (curMode !== 'cannon') return false;
        var vs = ['near', 'earth', 'far'], vi = vs.indexOf(SK.get('cview'));
        SK.set('cview', vs[(vi + 1) % vs.length]);
        SK.notice('보는 범위: ' + VIEW_NAME[SK.get('cview')], 'info', 1200);
        return true;
    }
    return false;
  });

  /* ------------------------------------------------------------------
     18. 수업 안내 서랍 (요구 D 대응표 — 결정서 §4-4 와 같은 내용)
     ------------------------------------------------------------------ */
  SK.guide({
    rows: [
      { target: '발사 속력 v₀ (대포) · 0~12 km/s, 눈금 0.1, 기본 6.0 · 다시 시작', standard: '[12역학01-03] 힘 방향과 운동 방향, [12역학01-05] 탈출', discover: '7.9 km/s면 원 궤도, 그 사이는 타원, 11.2 km/s를 넘으면 탈출', misconception: '위성은 떨어지지 않는다' },
      { target: '고도 h (위성) · 200~36,000 km, 눈금 100, 기본 400 (+ 지구 반지름의 ○배 병기) · 다시 시작', standard: '[12역학01-04] 원운동 정량', discover: '높을수록 느리게 돌고 주기가 길다, T² ∝ r³', misconception: '높이 있을수록 빨리 돈다' },
      { target: '위성 질량 m · 100~10,000 kg, 눈금 100, 기본 1000 · 다시 시작', standard: '변인 통제', discover: '속력·주기 그대로', misconception: '무거우면 빨리 돌아야 한다' },
      { target: '중심 천체 (상황) · 지구 / 달 / 화성 / 목성(비교 표만) · 다시 시작', standard: '[12역학01-05]', discover: '질량·반지름이 다르면 탈출 속도가 다르다', misconception: '높이 올라가면 중력이 없어진다' },
      { target: '행성 자료 입력 (케플러) · a(AU), T(년) 6행 · 즉시', standard: '탐구 활동: 행성 관측 데이터로 케플러 법칙 확인하기', discover: 'T²–a³가 직선(기울기 1)', misconception: '—' },
      { target: '모드 (상황) · 뉴턴의 대포 / 원궤도 위성 / 케플러 자료', standard: '[12역학01-03·05] / [12역학01-04] / 탐구 활동', discover: '한 차시에 모드 하나', misconception: '—' },
      { target: '속도·중력 화살표 (V)', standard: '[12역학01-03]', discover: '중력은 늘 중심을 향하고, 원 궤도에서는 속도와 직각', misconception: '위성에는 힘이 작용하지 않는다(우주는 무중력)' },
      { target: '궤적 남기기 (O) · 이전 발사 궤적 색+선 모양', standard: '[12역학01-03]', discover: '속력을 올릴수록 더 멀리 떨어지다가 결국 돈다', misconception: '위성은 떨어지지 않는다' },
      { target: '그래프 축 T–a / T²–a³ (G)', standard: '[12역학01-04] · 탐구 활동', discover: 'T–a는 곡선, T²–a³는 원점을 지나는 직선', misconception: '—' },
      { target: '보는 범위 (Z, 대포) · 산 근처 확대 / 지구 전체 / 타원까지 · 즉시 (표시만, 기록·변인에 영향 없음)', standard: '[12역학01-03]', discover: '산 근처: 4·6 km/s는 떨어지고 7.9 km/s는 땅이 휘는 만큼 떨어져 높이가 그대로 / 타원까지: 10 km/s 타원 전체 모양', misconception: '빨리 쏘면 떨어지지 않고 곧게 날아간다' },
      { target: '시간 배속 (대포) · 1초 = 30초 / 2분 / 10분 / 30분 · 즉시', standard: '수업 운영', discover: '짧은 낙하는 30초, 한 바퀴는 10분, 타원은 30분이 알맞아요(순서 도우미가 저절로 맞춤)', misconception: '—' }
    ],
    sections: [
      { title: '학생이 발견할 것', items: [
        '① 위성은 계속 떨어지고 있다 (중력 = 구심력, 속도와 직각)',
        '② 높을수록 느리고 주기가 길다, T² ∝ r³',
        '③ 궤도 속력·주기는 위성 질량과 무관하다',
        '④ 지구에서 7.9 km/s면 돈다, 11.2 km/s를 넘으면 돌아오지 않는다',
        '⑤ 탈출 속도는 천체마다 다르다 (지구 11.2 · 달 2.4 · 화성 5.0 · 목성 59.5 km/s)',
        '⑥ ISS 높이(400 km)에서도 중력은 지표의 89%다'
      ] },
      { title: '수업 단계', items: [
        '예측: 모드별 발문 (프리셋을 누르면 예측 카드)',
        '실행: 대포는 순서 도우미로 5단 연속 발사 / 위성은 고도·질량을 하나씩 바꿔 S',
        '비교: 기록 표에서 고도↑ 속력↓ 주기↑, 케플러는 T²–a³ 직선',
        '정리: "높이 올라가면 중력이 0?"(심화 거리–중력 그래프), "정지궤도는 왜 같은 높이?"'
      ] },
      { title: '모델·축척 (확인용)', items: [
        '대포: a = −GM r̂/r², RK4, 한 단계 1 s 이하, 화면 1초 = 2분(기본, 30초~30분 선택). 보는 범위: 산 근처(1 km = 0.75u, 실제 축척) / 지구 전체(화면 반폭 4R) / 타원까지(1 R = 110u, 10 km/s 타원 전체).',
        '같은 기록을 세 범위로 다시 볼 수 있어요. 궤적은 천체 반지름 단위라, 다른 천체 기록은 그림에 겹치지 않고 표로만 비교해요.',
        '대포는 공기 없는 산꼭대기(높이 20 km)에서 수평 발사. 지표(r = R)에서 7.9 km/s 로 쏘면 원 궤도 속력 7.91 km/s 보다 조금 느려 땅속으로 들어가므로, 20 km 높이에서 쏘게 했어요(원 궤도 속력 7.90 km/s).',
        '추락: r < R − 1 km · 궤도: 한 바퀴(2π) · r > 6R 에서 v² ≥ 2GM/r 이면 탈출, 아니면 \'먼 타원\'(10.4~11.1 km/s). 타원은 모양만 보여 주고 최고 높이·주기는 표시하지 않아요.',
        '위성: 해석해 v = √(GM/r), T = 2πr/v, 중력 비율 (R/r)². 한 바퀴 = 화면 10초(ISS 1초 ≈ 9분, 정지궤도 1초 ≈ 2.4시간).',
        '상수: G = 6.674×10⁻¹¹, 지구 5.972×10²⁴ kg · 6,371 km, 달 7.342×10²² kg · 1,737 km, 화성 6.417×10²³ kg · 3,390 km, 목성 1.898×10²⁷ kg · 71,492 km(적도).',
        '기록·직전 실행은 모드별로 따로 보관돼요(모드를 바꿨다 돌아오면 다시 보여요).'
      ] }
    ],
    keys: 'V 화살표 · O 궤적 남기기 · N 중심 천체 · G 그래프 축 · Z 보는 범위'
  });

  /* ------------------------------------------------------------------
     19. 첫 화면 모드 카드
     ------------------------------------------------------------------ */
  SK.chooseMode({
    title: '무엇을 알아볼까요?',
    default: 'cannon', urlKey: 'mode', key: 'mode',
    modes: [
      { value: 'cannon', label: '뉴턴의 대포', desc: '대포를 점점 세게 쏘아 궤도가 되는 속력을 찾아요' },
      { value: 'sat', label: '원궤도 위성', desc: '위성 고도를 바꾸며 속력과 주기를 봐요' },
      { value: 'kepler', label: '케플러 자료', desc: '행성 자료를 표에 넣어 규칙을 찾아요' }
    ],
    onPick: function (v) { if (SK.get('mode') !== v) SK.set('mode', v); }
  });
})();
