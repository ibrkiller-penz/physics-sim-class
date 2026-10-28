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
    cannon: { label: '뉴턴의 대포', today: '얼마나 빨리 쏘면 지구를 돌까?' },
    sat:    { label: '원궤도 위성', today: '높이 있는 위성이 더 빨리 돌까?' },
    kepler: { label: '케플러 자료', today: '행성의 주기와 거리 사이 규칙은?' }
  };
  var THINK = {
    cannon: { q: '로켓이 충분히 높이 올라가면 중력이 0이 될까?', hint: '심화 ▸ 거리–중력 그래프를 열어 보세요. 국제우주정거장 높이에서도 중력은 지표의 89%예요.' },
    sat:    { q: '정지궤도 위성은 왜 모두 같은 높이(35,786 km)에 있을까?', hint: '주기가 하루(23.9시간)가 되는 거리 r 는 하나뿐이에요. T² ∝ r³ 그래프에서 찾아보세요.' },
    kepler: { q: '모든 행성에서 T²/a³ 이 1로 같다는 것은 무엇을 뜻할까?', hint: '태양 하나가 모든 행성을 같은 규칙(중력)으로 끌어당기고 있어요.' }
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
      text(ctx, '직각', px - (a[0] + b[0]) * 22, py - (a[1] + b[1]) * 22, { size: 18, align: 'center', color: '--color-ink-muted', halo: true });
    } else {
      var a1 = Math.atan2(a[1], a[0]), a2 = Math.atan2(b[1], b[0]);
      var d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ctx.beginPath(); ctx.arc(px, py, 22, a1, a1 + d, d < 0); ctx.stroke();
      var mid = a1 + d / 2;
      text(ctx, SK.fmt(deg, 0) + '°', px + Math.cos(mid) * 42, py + Math.sin(mid) * 42, { size: 18, align: 'center', halo: true });
    }
    ctx.restore();
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
  var kEl = null, seqEl = null, thinkEl = null, altNote = null, formulaBody = null, compareBtn = null;
  var lastFormula = '';

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
      res: null, dist: 0, lx: null, ly: null
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
        c.res = '추락'; c.dist = R * Math.abs(c.acc) / 1000;
        var k = R / r; c.lx = c.x * k / R; c.ly = c.y * k / R;
        c.path.push([c.lx, c.ly]); c.hs.push([c.t / 60, 0]);
        SK.finish('땅에 떨어졌어요 — ' + comma(c.dist) + ' km 날아감');
        return;
      }
      if (Math.abs(c.acc) >= 2 * Math.PI) {
        c.res = (c.maxR - c.minR) / c.r0 < 0.02 ? '원 궤도' : '타원 궤도';
        c.dist = 2 * Math.PI * R / 1000;
        c.path.push([c.x / R, c.y / R]); c.hs.push([c.t / 60, (r - R) / 1000]);
        // 타원은 모양만 (결정서: 타원 정량 금지) → 걸린 시간은 원 궤도에서만 알려 준다
        SK.finish(c.res === '원 궤도' ? '한 바퀴 돌았어요 — 원 궤도! (한 바퀴 ' + fmtDur(c.t) + ')' : '한 바퀴 돌았어요 — 타원 궤도! 높이가 변하며 돌아요');
        return;
      }
      // 6R 밖에서 판정: 역학적 에너지가 0 이상이면 탈출, 아니면 언젠가 돌아오는 먼 타원
      if (r > 6 * R) {
        c.res = v2 >= 2 * c.b.GM / r ? '탈출' : '먼 타원';
        c.path.push([c.x / R, c.y / R]); c.hs.push([c.t / 60, (r - R) / 1000]);
        SK.finish(c.res === '탈출' ? '돌아오지 않아요 — 탈출!' : '아주 멀리 갔다가 언젠가 돌아오는 긴 타원이에요 (탈출 속도보다 조금 느림)');
        return;
      }
      if (c.t >= 72 * 3600) { c.res = '먼 타원'; SK.finish('아주 긴 타원이에요'); return; }
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
      { key: 'body', from: 'param', label: '천체' },
      { key: 'v0', from: 'param', label: '속력', unit: 'km/s' },
      { key: 'res', from: 'value', label: '결과' },
      { key: 'hmax', from: 'value', label: '최고 높이', unit: 'km', decimals: 0 },
      { key: 'dist', from: 'value', label: '날아간 거리', unit: 'km', decimals: 0 }
    ],
    sat: [
      { key: 'alt', from: 'param', label: '고도', unit: 'km' },
      { key: 'rR', from: 'value', label: 'r/R', unit: '', decimals: 2 },
      { key: 'mass', from: 'param', label: '질량', unit: 'kg' },
      { key: 'v', from: 'value', label: '속력', unit: 'km/s', decimals: 2 },
      { key: 'Tstr', from: 'value', label: '주기', unit: '' },
      { key: 'g', from: 'value', label: '중력', unit: '%', decimals: 0 }
    ],
    kepler: [{ key: 'mode', from: 'param', label: '모드' }]
  };
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
    if (formulaBody) formulaBody.parentNode.classList.toggle('og-hide', newM === 'kepler');
    for (var m in meterSets) meterSets[m].el.hidden = m !== newM;
    if (kEl) kEl.hidden = newM !== 'kepler';
    // 하단 띠: 케플러는 기록 표 대신 그래프를 넓게
    SK.el.records.hidden = newM === 'kepler';
    SK.el.band.style.gridTemplateColumns = newM === 'kepler' ? 'minmax(0, 5fr) minmax(0, 8fr)' : '';
    recOpts.columns = COLS[newM];
    if (recTable) recTable.render();
    // 그래프 축 버튼 글자
    var g = SK.controls.gaxis;
    if (g) {
      var opts = g.el.querySelectorAll('.seg__opt');
      var sym = newM === 'sat' ? 'r' : 'a';
      if (opts[0]) opts[0].firstChild.textContent = 'T – ' + sym;
      if (opts[1]) opts[1].firstChild.textContent = 'T² – ' + sym + '³';
    }
    // 오늘 알아볼 것
    var today = SK.el.top.querySelector('.sim-today');
    if (today) { today.innerHTML = ''; today.appendChild(h('b', { text: '오늘 알아볼 것' })); today.appendChild(document.createTextNode(MODES[newM].today)); }
    if (thinkEl) {
      thinkEl.querySelector('.think__q').textContent = THINK[newM].q;
      thinkEl.querySelector('.think__hint').textContent = THINK[newM].hint;
    }
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
          SK.finish('한 바퀴 = ' + periodText(sat.T) + ' — S 로 기록하고 한 가지만 바꿔 보세요');
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
      updateFormula(p);
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
            dist: showH ? cn.dist : undefined,
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
        np: cn.path.length, nh: cn.hs.length, lastH: cn.lastH, res: cn.res, dist: cn.dist, lx: cn.lx, ly: cn.ly };
    },
    load: function (s) {
      if (curMode === 'sat' && sat) { sat.done = false; return; }
      if (curMode !== 'cannon' || !cn || s.x === undefined) return;
      cn.x = s.x; cn.y = s.y; cn.vx = s.vx; cn.vy = s.vy; cn.t = s.t; cn.acc = s.acc; cn.pa = s.pa;
      cn.maxR = s.maxR; cn.minR = s.minR; cn.path.length = s.np; cn.hs.length = s.nh; cn.lastH = s.lastH || 0;
      cn.res = s.res; cn.dist = s.dist; cn.lx = s.lx; cn.ly = s.ly;
    },
    status: function (p) {
      var m = p.mode || 'cannon';
      if (m === 'cannon') {
        var b = BODIES[p.body] || EARTH;
        if (p.body === 'jupiter') return '뉴턴의 대포 · 목성 · 탈출 속도 59.5 km/s — 대포로는 불가(비교 표만)';
        return '뉴턴의 대포 · ' + b.name + ' · 공기 없음 가정 · 배속 1초 = ' + rateText((p.tscale || 2) * 60 * SK.speed) + ' · ' + VIEW_NAME[p.cview || 'earth'];
      }
      if (m === 'sat') {
        var s = satCalc(p.alt);
        return '원궤도 위성 · 지구 · 고도 ' + comma(p.alt) + ' km · 배속 1초 ≈ ' + speedText(s.T);
      }
      return '케플러 자료 · 단위 AU·년 · 그래프 ' + (p.gaxis === 'sq' ? 'T²–a³' : 'T–a');
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
    if (v === 'far') return { key: v, s: 120, cx: CX, cy: 172 };   // 10 km/s 타원(원지점 4.06 R)까지 화면 안
    return { key: 'earth', s: CS, cx: CX, cy: CY };
  }

  /* ------------------------------------------------------------------
     6. 조절 패널 — 상황 바꾸기
     ------------------------------------------------------------------ */
  var modeCtl = SK.addChoice('situation', {
    key: 'mode', label: '무엇을 알아볼까요?', style: 'cards', apply: 'live', value: 'cannon',
    options: [
      { value: 'cannon', label: '뉴턴의 대포', sub: '01-03 · 01-05' },
      { value: 'sat', label: '원궤도 위성', sub: '01-04' },
      { value: 'kepler', label: '케플러 자료', sub: '탐구 활동' }
    ],
    onChange: function (v) {
      // 모드는 바로 바꾼다 (지금 실행은 직전 실행으로 보관)
      seq = null;
      SK.reset();
    }
  });
  modeCtl.el.classList.add('og-modes');

  var bodyCtl = SK.addChoice('situation', {
    key: 'body', label: '중심 천체', style: 'cards', apply: 'restart', value: 'earth',
    options: BODY_ORDER.map(function (k) {
      var b = BODIES[k];
      return { value: k, label: b.name, sub: k === 'jupiter' ? '탈출 59.5 · 표만' : '탈출 ' + SK.fmt(b.vEsc, 1) + ' km/s' };
    }),
    onChange: function (v) {
      if (v === 'jupiter') {
        SK.notice('목성은 59.5 km/s가 필요해요. 이 대포(최대 12 km/s)로는 안 돼요', 'warn', 4000);
        showCompare();
      }
    }
  });
  bodyCtl.el.classList.add('og-bodies');
  (function addBodyIcons() {
    var fills = { earth: ['--color-primary-tint', '--color-primary'], moon: ['--color-paper-sunk', '--color-line-strong'], mars: ['--color-sim-collision-tint', '--color-sim-collision'], jupiter: ['--color-sim-lens-tint', '--color-sim-lens'] };
    var btns = bodyCtl.el.querySelectorAll('.seg__opt');
    BODY_ORDER.forEach(function (k, i) {
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 44 44'); svg.setAttribute('class', 'og-ico'); svg.setAttribute('aria-hidden', 'true');
      var c = document.createElementNS(ns, 'circle');
      // 크기는 실제 반지름 비를 줄여서 느낌만 (달 < 화성 < 지구 < 목성)
      var rr = { earth: 15, moon: 8, mars: 11, jupiter: 20 }[k];
      c.setAttribute('cx', '22'); c.setAttribute('cy', '22'); c.setAttribute('r', String(rr));
      c.setAttribute('style', 'fill:var(' + fills[k][0] + ');stroke:var(' + fills[k][1] + ');stroke-width:2.5');
      svg.appendChild(c);
      btns[i].insertBefore(svg, btns[i].firstChild);
    });
  })();
  compareBtn = h('button', { class: 'btn btn--quiet og-panel-btn', type: 'button', onclick: function (e) { if (e.detail) e.currentTarget.blur(); showCompare(); } }, '천체 비교 표 (탈출 속도) ▸');
  bodyCtl.el.appendChild(compareBtn);

  SK.addToggle('situation', { key: 'arrows', label: '속도·중력 화살표 (V)', value: true, apply: 'live', record: false });
  SK.addToggle('situation', { key: 'trail', label: '궤적 남기기 (O)', value: true, apply: 'live', record: false });

  /* ------------------------------------------------------------------
     7. 수치 바꾸기 (첫 화면 변수: 대포 1개 · 위성 2개)
     ------------------------------------------------------------------ */
  SK.addVar('values', {
    key: 'v0', label: '발사 속력', symbol: 'v₀', unit: 'km/s',
    min: 0, max: 12, step: 0.1, value: 6.0, decimals: 1, precision: 2,
    ticks: [0, 4, 7.9, 11.2], apply: 'restart',
    onChange: function (v) {
      var ts = SK.get('tscale') || 2;
      if (v >= 9 && ts < 30) SK.notice('빠르면 오래 날아가요. 표시 도구 ▸ 시간 배속 30분 · 보는 범위 \'타원까지 전체\'를 권해요', 'info', 3500);
      else if (v < 7.5 && ts > 0.5 && SK.get('cview') !== 'near') SK.notice('금방 떨어져요. 보는 범위 \'산 근처 확대\'(Z) · 배속 30초로 보면 잘 보여요', 'info', 3500);
    }
  });
  SK.addVar('values', {
    key: 'alt', label: '위성 고도', symbol: 'h', unit: 'km',
    min: 200, max: 36000, step: 100, value: 400, decimals: 0, precision: 0,
    ticks: [400, 20200, 35786], apply: 'restart',
    onChange: function () { updateAltNote(); }
  });
  altNote = h('p', { class: 'og-note' });
  SK.controls.alt.el.appendChild(altNote);
  function updateAltNote() {
    var a = SK.get('alt'), r = (EARTH.R / 1000 + a) / (EARTH.R / 1000);
    altNote.textContent = '고도 = 지구 반지름의 ' + SK.fmt(a / 6371, 2) + '배 · 중심까지 r = ' + SK.fmt(r, 2) + ' R';
  }
  updateAltNote();
  SK.addVar('values', {
    key: 'mass', label: '위성 질량', symbol: 'm', unit: 'kg',
    min: 100, max: 10000, step: 100, value: 1000, decimals: 0, precision: 0,
    ticks: [100, 5000, 10000], apply: 'restart',
    hint: '변인 통제용: 질량만 바꿔 기록해 보세요'
  });

  /* ------------------------------------------------------------------
     8. 표시 도구
     ------------------------------------------------------------------ */
  SK.addChoice('tools', {
    key: 'gaxis', label: '그래프 축 (G)', apply: 'live', value: 'lin',
    options: [{ value: 'lin', label: 'T – a' }, { value: 'sq', label: 'T² – a³' }]
  });
  SK.addChoice('tools', {
    key: 'kzoom', label: '보는 범위', apply: 'live', value: 'all',
    options: [{ value: 'all', label: '행성 6개 전체' }, { value: 'inner', label: '안쪽 4개 확대' }]
  });
  SK.addToggle('tools', { key: 'kguide', label: '기울기 1 보조선 (T² = a³)', value: true, apply: 'live' });
  SK.addChoice('tools', {
    key: 'cview', label: '보는 범위 (Z)', apply: 'live', value: 'earth', style: 'cards',
    options: [
      { value: 'near', label: '산 근처 확대', sub: '4·6 km/s 낙하' },
      { value: 'earth', label: '지구 전체', sub: '7.9 원 궤도' },
      { value: 'far', label: '타원까지', sub: '10 km/s 타원' }
    ]
  });
  SK.controls.cview.el.classList.add('og-modes');
  SK.addChoice('tools', {
    key: 'tscale', label: '시간 배속 (대포) — 화면 1초 =', apply: 'live', value: 2,
    options: [{ value: 0.5, label: '30초' }, { value: 2, label: '2분' }, { value: 10, label: '10분' }, { value: 30, label: '30분' }]
  });
  (function addFormula() {
    formulaBody = h('div', { class: 'og-formula__body' });
    var det = h('details', { class: 'og-formula' }, [h('summary', { text: '식 보기 (교사 권장)' }), formulaBody]);
    SK.panel('tools').appendChild(det);
  })();
  function updateFormula(p) {
    if (!formulaBody) return;
    var lines;
    if (curMode === 'sat') {
      var s = satCalc(p.alt);
      lines = [
        ['r = R + h', '= ' + comma(6371) + ' + ' + comma(p.alt) + ' = ' + comma(6371 + p.alt) + ' km'],
        ['v = √(GM/r)', '= ' + SK.fmt(s.v, 2) + ' km/s   (m 은 식에 없어요)'],
        ['T = 2πr / v', '= ' + periodText(s.T)],
        ['g(r)/g(지표) = (R/r)²', '= ' + pctText(s.g) + ' %']
      ];
    } else if (curMode === 'cannon') {
      var b = BODIES[p.body] || EARTH;
      lines = [
        ['원 궤도 속력 √(GM/R)', '= ' + SK.fmt(b.vCirc, 2) + ' km/s (' + b.name + ')'],
        ['탈출 속도 √(2GM/R)', '= ' + SK.fmt(b.vEsc, 1) + ' km/s'],
        ['G', '= 6.674 × 10⁻¹¹ N·m²/kg²']
      ];
    } else lines = [];
    var key = JSON.stringify(lines);
    if (key === lastFormula) return;
    lastFormula = key;
    formulaBody.innerHTML = '';
    lines.forEach(function (l) { formulaBody.appendChild(h('p', null, [h('b', { text: l[0] + ' ' }), l[1]])); });
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
      h('h3', { text: '빛도 못 빠져나가면? — 블랙홀 [12역학01-06]' }),
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
     10. 하단 띠 — 계기판 · 그래프 · 기록 표
     ------------------------------------------------------------------ */
  meterSets.cannon = SK.meters(null, [
    { key: 'v', label: '속력', symbol: 'v', unit: 'km/s', decimals: 2, q: 'velocity', size: 'md' },
    { key: 'alt', label: '높이', unit: 'km', decimals: 0, size: 'md' },
    { key: 'res', label: '결과', unit: '', size: 'md' }
  ]);
  meterSets.sat = SK.meters(null, [
    { key: 'v', label: '속력', symbol: 'v', unit: 'km/s', decimals: 2, q: 'velocity', size: 'md' },
    { key: 'T', label: '주기', symbol: 'T', unit: '분', decimals: 1, size: 'md' },
    { key: 'g', label: '중력(지표 대비)', unit: '%', q: 'force', size: 'md' }
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
      var landed = cn.res === '추락';
      meterSets.cannon.update({
        v: p.body === 'jupiter' ? null : Math.sqrt(cn.vx * cn.vx + cn.vy * cn.vy) / 1000,
        alt: p.body === 'jupiter' ? null : Math.max(0, landed ? 0 : (r - cn.b.R) / 1000),
        res: p.body === 'jupiter' ? '발사 불가' : (cn.res || (SK.started ? '비행 중' : '준비'))
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

  (function makeBandGraph() {
    var area = h('div', { class: 'graph-box__canvas' });
    bandTitle = h('span', { text: '' });
    var box = h('div', { class: 'graph-box' }, [h('div', { class: 'graph-box__title' }, [bandTitle]), area]);
    SK.el.graph.appendChild(box);
    bandView = SK.canvas(area, { fit: false, bg: '--color-paper-raised' });
    bandView.onResize = function () { drawBand(); };
  })();
  function drawBand() {
    if (!bandView) return;
    bandView.clear();
    var ctx = bandView.ctx, W = bandView.w, H = bandView.h;
    if (W < 40 || H < 30) return;
    var box = { x: 58, y: 6, w: W - 70, h: H - 30 };
    if (curMode === 'cannon') bandCannon(ctx, box);
    else if (curMode === 'sat') bandSat(ctx, box);
    else bandKepler(ctx, box);
  }
  function setBandTitle(t) { if (bandTitle.textContent !== t) bandTitle.textContent = t; }
  function bandCannon(ctx, box) {
    setBandTitle('높이–시간 (지표에서 잰 높이)');
    var lines = [];
    SK.records.forEach(function (r) { if (r.series.h) lines.push([r.series.h, SK.recStyle(r.slot)]); });
    if (SK.ghost && SK.ghost.series.h) lines.push([SK.ghost.series.h, SK.ghostStyle()]);
    if (cn && cn.hs.length > 1) lines.push([cn.hs, { color: col('--color-sim-orbit'), dash: [], width: 4 }]);
    var xm = 1, ym = 30;
    lines.forEach(function (l) { l[0].forEach(function (pt) { if (pt[0] > xm) xm = pt[0]; if (pt[1] > ym) ym = pt[1]; }); });
    var ax = axes(ctx, box, [0, niceMax(xm)], [0, niceMax(ym)], { fs: 14, xl: 't (분)', yl: '높이 (km)', nx: 4, ny: 3 });
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y - 2, box.w + 2, box.h + 4); ctx.clip();
    lines.forEach(function (l) { SK.drawPath(ctx, l[0], { color: l[1].color, dash: l[1].dash, width: Math.max(2, l[1].width * 0.7) }, function (a, b) { return [ax.mx(a), ax.my(b)]; }); });
    ctx.restore();
  }
  function bandSat(ctx, box) {
    var sq = SK.params.gaxis === 'sq';
    setBandTitle(sq ? '기록한 위성: T² – r³ (r: 지구 반지름 R 단위, T: 시간)' : '기록한 위성: T – r (r: 지구 반지름 R 단위, T: 시간)');
    function X(rR) { return sq ? rR * rR * rR : rR; }
    function Y(Th) { return sq ? Th * Th : Th; }
    var pts = [];
    SK.records.forEach(function (r) { pts.push({ x: X(r.values.rR), y: Y(r.values.Th), st: SK.recStyle(r.slot), n: String(r.n) }); });
    if (SK.ghost && SK.ghost.values.rR) pts.push({ x: X(SK.ghost.values.rR), y: Y(SK.ghost.values.Th), ghost: true });
    var s = satCalc(SK.params.alt);
    pts.push({ x: X(s.rR), y: Y(s.Th), now: true });
    var xm = 0, ym = 0;
    pts.forEach(function (p) { if (p.x > xm) xm = p.x; if (p.y > ym) ym = p.y; });
    var ax = axes(ctx, box, [0, niceMax(xm)], [0, niceMax(ym)], { fs: 14, xl: sq ? 'r³ (R³)' : 'r (R)', yl: sq ? 'T² (시간²)' : 'T (시간)', nx: 4, ny: 3 });
    if (sq && SK.records.length >= 2) {
      var k = 4 * Math.PI * Math.PI * Math.pow(EARTH.R, 3) / (EARTH.GM * 3600 * 3600);
      var xe = niceMax(xm);
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      SK.drawPath(ctx, [[0, 0], [xe, k * xe]], { color: col('--color-line-strong'), dash: [8, 6], width: 2 }, function (a, b) { return [ax.mx(a), ax.my(b)]; });
      ctx.restore();
      text(ctx, '원점을 지나는 직선', box.x + box.w - 4, box.y + 14, { size: 14, align: 'right', color: '--color-ink-muted', halo: true });
    }
    pts.forEach(function (p) {
      var x = ax.mx(p.x), y = ax.my(p.y);
      if (p.now) { dot(ctx, x, y, 7, null, '--color-sim-orbit', 3); return; }
      if (p.ghost) { dot(ctx, x, y, 6, '--color-q-ghost'); return; }
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = p.st.color; ctx.fill();
      text(ctx, p.n, x + 9, y - 10, { size: 14, halo: true });
    });
  }
  function bandKepler(ctx, box) {
    setBandTitle('행성마다 T²/a³ — 모두 1에 가까울까?');
    var n = PLANETS.length, bw = box.w / n;
    var ax = axes(ctx, box, [0, n], [0, 1.5], { fs: 14, yl: 'T²/a³', nx: 1, ny: 3, noX: true });
    kRows.forEach(function (r, i) {
      var x = box.x + bw * i + bw * 0.2, w = bw * 0.6;
      if (r.a && r.T) {
        var q = r.T * r.T / (r.a * r.a * r.a), y = ax.my(Math.min(q, 1.5));
        ctx.fillStyle = col('--color-sim-orbit'); ctx.fillRect(x, y, w, box.y + box.h - y);
        text(ctx, SK.fmt(q, 2), x + w / 2, y - 9, { size: 13, align: 'center', halo: true });
      }
      text(ctx, r.name, x + w / 2, box.y + box.h + 12, { size: 14, align: 'center', color: '--color-ink-muted' });
    });
    ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = col('--color-q-force'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(box.x, ax.my(1)); ctx.lineTo(box.x + box.w, ax.my(1)); ctx.stroke(); ctx.restore();
  }

  recOpts = { columns: COLS.cannon };
  recTable = SK.recordTable(null, recOpts);
  SK.onRecords(function () { SK.requestRender(); updateSeq(); });

  /* ------------------------------------------------------------------
     11. 실험 화면 그리기 — 대포
     ------------------------------------------------------------------ */
  function badge(ctx, lines) {
    var w = 390, hh = 18 + lines.length * 32, x = 1250 - w - 16, y = 16;
    panelBox(ctx, x, y, w, hh);
    lines.forEach(function (l, i) { text(ctx, l[0], x + 16, y + 26 + i * 32, { size: l[1] || 22, weight: i === 0 ? 700 : 600, color: i === 0 ? '--color-ink' : '--color-ink-muted' }); });
  }
  function edgeArrow(ctx, x, y, label) {
    // 화면 밖 점(x, y)을 향하는 가장자리 화살표
    var m = 36, dx = x - CX, dy = y - CY;
    var tx = dx > 0 ? (1250 - m - CX) / dx : dx < 0 ? (m - CX) / dx : Infinity;
    var ty = dy > 0 ? (700 - m - CY) / dy : dy < 0 ? (m - CY) / dy : Infinity;
    var t = Math.min(Math.abs(tx), Math.abs(ty));
    var ex = CX + dx * t, ey = CY + dy * t, len = Math.sqrt(dx * dx + dy * dy);
    SK.arrow(ctx, ex - dx / len * 60, ey - dy / len * 60, ex, ey, { color: '--color-sim-orbit', width: 6 });
    var lx = ex - dx / len * 80, ly = ey - dy / len * 80;
    text(ctx, label, Math.min(1230, Math.max(20, lx)), ly + (dy > 0 ? -24 : 24), { size: 20, align: dx > 0 ? 'right' : 'left', halo: true });
  }
  function renderCannon(ctx, p) {
    var c = cn; if (!c) return;
    var b = c.b, R = b.R, V = viewOf(p, b);
    function map(x, y) { return [V.cx + x * V.s, V.cy - y * V.s]; }
    var rateLine = '시간 배속 1초 = ' + rateText((p.tscale || 2) * 60 * SK.speed);
    var viewLine = V.key === 'near' ? '보는 범위: 산 근처 (가로 약 ' + comma(1250 / NEAR_K, 0) + ' km)'
      : V.key === 'far' ? '보는 범위: 타원까지 (화면 반폭 ' + SK.fmt(625 / V.s, 1) + ' R)' : '보는 범위: 지구 전체 (화면 반폭 4 R)';
    // 천체
    drawBody(ctx, b.key, V.cx, V.cy, V.s);
    var top = map(0, 1), peak = map(0, (R + MOUNT) / R);
    if (V.key === 'near') {
      // 실제 축척: 산 높이 20 km = 15u. 땅이 둥글게 휘어 내려가는 것이 보인다
      var gx = 980, gy = V.cy - Math.sqrt(Math.max(0, V.s * V.s - (gx - V.cx) * (gx - V.cx)));
      if (gy < 680) text(ctx, b.name + ' 표면 — 둥글게 휘어 내려가요', gx, Math.max(gy + 34, 60), { size: 22, weight: 700, align: 'center', color: '--color-ink-muted', halo: true });
      ctx.beginPath(); ctx.moveTo(peak[0] - 46, top[1] + 2); ctx.lineTo(peak[0], peak[1]); ctx.lineTo(peak[0] + 40, top[1] + 2); ctx.closePath();
      ctx.fillStyle = col('--color-paper-sunk'); ctx.fill(); ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = col('--color-ink'); ctx.fillRect(peak[0] - 10, peak[1] - 8, 22, 8);
      text(ctx, '산꼭대기 대포 (높이 20 km)', peak[0] - 20, peak[1] - 40, { size: 18, align: 'left', color: '--color-ink-muted', halo: true });
    } else {
      text(ctx, b.name, V.cx, V.cy + 10, { size: 28, weight: 700, align: 'center', serif: true, color: '--color-ink-muted' });
      // 산은 보이도록 크게 그린 그림 (실제 20 km 는 이 축척에서 3u)
      var tp = top[1];
      ctx.beginPath(); ctx.moveTo(V.cx - 34, tp + 6); ctx.lineTo(V.cx - 4, tp - 18); ctx.lineTo(V.cx + 30, tp + 6); ctx.closePath();
      ctx.fillStyle = col('--color-paper-sunk'); ctx.fill(); ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = col('--color-ink'); ctx.fillRect(V.cx - 16, tp - 26, 26, 9);
      text(ctx, '산꼭대기 대포 (20 km)', V.cx - 40, tp - 30, { size: 18, align: 'right', color: '--color-ink-muted', halo: true });
    }

    if (b.key === 'jupiter') {
      panelBox(ctx, 250, 560, 750, 120);
      text(ctx, '목성은 탈출 속도가 59.5 km/s 예요', 625, 598, { size: 28, weight: 700, align: 'center', serif: true });
      text(ctx, '이 대포(최대 12 km/s)로는 안 돼요 — 천체 비교 표를 보세요', 625, 642, { size: 22, align: 'center', color: '--color-ink-muted' });
      badge(ctx, [[rateLine], [viewLine, 20]]);
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
      if (eq[0] > 10 && eq[0] < 1240 && eq[1] > 10 && eq[1] < 690) text(ctx, String(r.n), eq[0] + 10, eq[1] - 12, { size: 18, weight: 700, halo: true });
    });
    if (SK.ghost && SK.ghost.series.path && (SK.ghost.values.bk || SK.ghost.params.body) === b.key) SK.drawPath(ctx, SK.ghost.series.path, SK.ghostStyle(), map);
    if (other) text(ctx, '다른 천체 기록 ' + other + '개는 기록 표에서 비교해요', 1234, 156, { size: 18, align: 'right', color: '--color-ink-muted', halo: true });
    // 지금 궤적
    var pts = p.trail ? c.path : c.path.slice(-10);
    var cur = pts.concat([[c.x / R, c.y / R]]);
    SK.drawPath(ctx, cur, { color: col('--color-sim-orbit'), dash: [], width: 4 }, map);
    // 포탄
    var bp = map(c.x / R, c.y / R);
    var off = bp[0] < 0 || bp[0] > 1250 || bp[1] < 0 || bp[1] > 700;
    var r = Math.sqrt(c.x * c.x + c.y * c.y);
    if (off) {
      edgeArrow(ctx, bp[0], bp[1], V.key === 'near' ? '높이 ' + comma((r - R) / 1000) + ' km' : '중심에서 ' + SK.fmt(r / R, 1) + ' R (' + comma(r / 1000) + ' km)');
    } else {
      if (c.res === '추락') {
        ctx.save(); ctx.strokeStyle = col('--color-warn'); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(bp[0] - 9, bp[1] - 9); ctx.lineTo(bp[0] + 9, bp[1] + 9); ctx.moveTo(bp[0] + 9, bp[1] - 9); ctx.lineTo(bp[0] - 9, bp[1] + 9); ctx.stroke(); ctx.restore();
        text(ctx, comma(c.dist) + ' km', bp[0] + 14, bp[1] - 16, { size: 20, weight: 700, halo: true });
      }
      dot(ctx, bp[0], bp[1], 9, '--color-ink');
      if (p.arrows && c.res !== '추락') {
        var v = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
        var vu = [c.vx / (v || 1), -c.vy / (v || 1)];               // 화면 좌표 (y 아래)
        var fu = [-c.x / r, c.y / r];                                // 중심 쪽
        var vl = v / 1000 * 12, fl = Math.max(14, 80 * Math.pow(R / r, 2));
        if (v > 1) SK.arrow(ctx, bp[0], bp[1], bp[0] + vu[0] * vl, bp[1] + vu[1] * vl, { color: '--color-q-velocity', width: 5, label: '속도 v' });
        SK.arrow(ctx, bp[0], bp[1], bp[0] + fu[0] * fl, bp[1] + fu[1] * fl, { color: '--color-q-force', width: 5, label: '중력 F', labelColor: '--color-copper-text' });
        if (v > 1) angleMark(ctx, bp[0], bp[1], vu, fu);
      }
    }
    // 오른쪽 위: 배속 상시 + 경과 시간
    badge(ctx, [[rateLine], ['경과 ' + fmtDur(c.t), 20], [viewLine, 20]]);
    if (!SK.started) text(ctx, 'Space 로 발사!', V.key === 'earth' ? CX : 625, V.key === 'earth' ? CY + 60 : 600, { size: 24, weight: 700, align: 'center', color: '--color-sim-orbit-text', halo: true });
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
    return 290 / rmax;   // u / R
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
    text(ctx, '위성 안 (우주인)', x + 14, y + 22, { size: 18, weight: 700, color: '--color-ink-muted' });
    // 창
    ctx.save();
    roundRect(ctx, x + 14, y + 40, w - 28, hh - 110, 14);
    ctx.fillStyle = col('--color-paper-raised'); ctx.fill(); ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
    var bob = Math.sin(t * 2) * 6;
    var ax = x + w / 2, ay = y + 40 + (hh - 110) / 2 + bob;
    ctx.strokeStyle = col('--color-ink'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.translate(ax, ay); ctx.rotate(0.35 + Math.sin(t) * 0.15);
    ctx.beginPath(); ctx.arc(0, -26, 11, 0, Math.PI * 2); ctx.fillStyle = col('--color-paper-sunk'); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(0, 12);
    ctx.moveTo(0, -6); ctx.lineTo(-18, -18); ctx.moveTo(0, -6); ctx.lineTo(18, -16);
    ctx.moveTo(0, 12); ctx.lineTo(-12, 30); ctx.moveTo(0, 12); ctx.lineTo(14, 28); ctx.stroke();
    ctx.restore();
    dot(ctx, x + w * 0.78, y + 62 - bob, 7, '--color-copper');
    text(ctx, '같이 떨어지는 중 → 둥둥', x + w / 2, y + hh - 58, { size: 18, align: 'center', weight: 700, color: '--color-sim-orbit-text' });
    text(ctx, '여기 중력: 지표의 ' + pctText(g) + '%', x + w / 2, y + hh - 26, { size: 22, align: 'center', weight: 800, color: '--color-copper-text' });
  }
  function renderSat(ctx, p) {
    var s = satCalc(p.alt), S = satScale(p);
    drawBody(ctx, 'earth', CX, CY, S);
    if (S > 60) text(ctx, '지구', CX, CY, { size: 26, weight: 700, align: 'center', serif: true, color: '--color-ink-muted' });
    function circ(rR, st, lab) {
      ctx.save(); SK.applyStroke(ctx, st);
      ctx.beginPath(); ctx.arc(CX, CY, rR * S, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      if (lab) text(ctx, lab, CX + rR * S * 0.71 + 6, CY + rR * S * 0.71 + 6, { size: 18, weight: 700, halo: true });
    }
    SK.records.forEach(function (r) { circ(r.values.rR, SK.recStyle(r.slot), String(r.n)); });
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
    text(ctx, '고도 ' + comma(p.alt) + ' km', CX, CY - ro - 26, { size: 20, weight: 700, align: 'center', halo: true });
    var size = 10 + 5 * Math.log(p.mass / 100) / Math.LN10;  // 질량이 크면 조금 크게 (주기는 그대로!)
    drawSatellite(ctx, x, y, -th + Math.PI / 2, size);
    if (p.arrows) {
      var vu = [-Math.sin(th), -Math.cos(th)];
      var fu = [-Math.cos(th), Math.sin(th)];
      SK.arrow(ctx, x, y, x + vu[0] * s.v * 16, y + vu[1] * s.v * 16, { color: '--color-q-velocity', width: 5, label: 'v ' + SK.fmt(s.v, 2) + ' km/s' });
      SK.arrow(ctx, x, y, x + fu[0] * Math.max(14, 110 * s.g), y + fu[1] * Math.max(14, 110 * s.g), { color: '--color-q-force', width: 5, label: '중력', labelColor: '--color-copper-text' });
      angleMark(ctx, x, y, vu, fu);
    }
    badge(ctx, [['시간 배속 1초 ≈ ' + speedText(s.T)], ['경과 ' + fmtDur(f * s.T) + ' / 한 바퀴 ' + periodText(s.T), 20]]);
    drawAstronaut(ctx, 1250 - 16 - 280, 128, 280, 300, s.g, SK.time * 3);
    if (!SK.started) text(ctx, 'Space 로 한 바퀴 돌려 보기', CX, CY + 40, { size: 22, weight: 700, align: 'center', color: '--color-sim-orbit-text', halo: true });
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
      h('p', { class: 'og-kmsg', text: 'a: 태양까지 평균 거리(지구 = 1 AU) · T: 공전 주기(지구 = 1년). 칸을 눌러 숫자를 넣으면 그래프에 바로 나타나요(즉시).' })
    ]);
    kRows.forEach(function (row, i) {
      function inp(key) {
        var el = h('input', { class: 'og-kin num', type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': row.name + ' ' + (key === 'a' ? '궤도 반지름 a (AU)' : '공전 주기 T (년)') });
        el.addEventListener('input', function () {
          var v = SK.parseNum(el.value);
          var rg = K_RANGE[key];
          if (el.value.trim() === '') { row[key] = null; el.classList.remove('is-invalid'); }
          else if (isNaN(v) || v < rg[0] || v > rg[1]) { el.classList.add('is-invalid'); row[key] = null; }
          else { el.classList.remove('is-invalid'); row[key] = v; }
          kUpdateRow(i); SK.requestRender();
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
  function kFill() { PLANETS.forEach(function (p, i) { kSet(i, p.a, p.T); }); SK.requestRender(); SK.notice('행성 6개 자료를 넣었어요', 'ok'); }
  function kClear() { PLANETS.forEach(function (p, i) { kSet(i, null, null); }); SK.requestRender(); }
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
     15. 프리셋 5 + 순서 도우미
     ------------------------------------------------------------------ */
  // extra: 단계마다 함께 맞추는 '표시 도구'(보는 범위·배속). 기록 대상이 아니라 변인 통제에 영향 없음
  var SEQS = [
    { mode: 'cannon', key: 'v0', vals: [4, 6, 7.9, 10, 11.2], label: function (v) { return SK.fmt(v, v % 1 ? 1 : 0) + ' km/s'; },
      hint: 'Space 발사 → 끝나면 S 기록 → 다음 속력. 보는 범위·배속은 단계마다 저절로 맞춰져요',
      extra: { 4: { cview: 'near', tscale: 0.5 }, 6: { cview: 'near', tscale: 0.5 }, 7.9: { cview: 'earth', tscale: 10 }, 10: { cview: 'far', tscale: 30 }, 11.2: { cview: 'far', tscale: 30 } } },
    { mode: 'sat', key: 'mass', vals: [100, 1000, 10000], label: function (v) { return comma(v) + ' kg'; }, hint: 'Space 한 바퀴 → S 기록 → 질량만 바꾸기' },
    { mode: 'sat', key: 'alt', vals: [400, 20200, 35786], label: function (v) { return comma(v) + ' km'; }, hint: 'ISS → GPS 위성 → 정지궤도. S 기록 후 G 로 T²–r³ 그래프' },
    null,
    { mode: 'cannon', key: 'body', vals: ['moon', 'mars', 'earth'], label: function (v) { return BODIES[v].name; },
      hint: 'Space 발사 → 끝나면 S 기록 → 다음 천체 (속력 3 km/s 그대로)',
      extra: { moon: { cview: 'earth', tscale: 10 }, mars: { cview: 'near', tscale: 2 }, earth: { cview: 'near', tscale: 0.5 } } }
  ];
  function applyExtra(s, v) {
    var ex = s && s.extra && s.extra[v];
    if (!ex) return;
    for (var k in ex) if (SK.get(k) !== ex[k]) SK.set(k, ex[k]);
  }
  SK.setPresets([
    {
      name: '뉴턴의 대포', tag: '과학사',
      change: '발사 속력 4 → 6 → 7.9 → 10 → 11.2 km/s', fixed: '지구 · 산꼭대기(20 km) 수평 발사 · 공기 없음',
      values: { mode: 'cannon', body: 'earth', v0: 4, tscale: 0.5, cview: 'near', trail: true, arrows: true },
      predict: { question: '7.9 km/s로 쏘면 포탄은 어떻게 될까?', choices: ['떨어진다', '지구를 돈다', '날아가 버린다'], info: '먼저 4 km/s부터 쏘고, 속력을 하나씩 올려 기록해요.' },
      onApply: function () { seq = SEQS[0]; updateSeq(); }
    },
    {
      name: 'ISS는 왜 떠 있을까', tag: '대표 문항',
      change: '위성 질량 100 → 1,000 → 10,000 kg', fixed: '고도 400 km · 지구',
      values: { mode: 'sat', alt: 400, mass: 100, gaxis: 'lin', trail: true, arrows: true },
      predict: { question: '무거운 위성은 더 빨리 돌까?', choices: ['무거우면 더 빨리', '똑같다', '무거우면 더 느리게'], info: '국제우주정거장 높이(400 km)에서 질량만 바꿔 봐요.' },
      onApply: function () { seq = SEQS[1]; updateSeq(); }
    },
    {
      name: '정지궤도 위성', tag: '대표 문항',
      change: '고도 400(ISS) → 20,200(GPS) → 35,786 km(정지궤도, 6.6 R)', fixed: '위성 질량 1,000 kg · 지구',
      values: { mode: 'sat', alt: 400, mass: 1000, gaxis: 'lin', trail: true, arrows: true },
      predict: { question: '높이 있는 위성(35,786 km)이 국제우주정거장(400 km)보다 더 빨리 돌까?', choices: ['더 빨리 돈다', '같다', '더 느리게 돈다'], info: '고도만 바꿔 세 번 기록해요. 마지막이 정지궤도(주기 하루)예요.' },
      onApply: function () { seq = SEQS[2]; updateSeq(); }
    },
    {
      name: '행성 자료로 규칙 찾기', tag: '탐구 재현',
      change: '행성 6개의 a·T 를 표에 입력 → T–a → T²–a³', fixed: '단위 AU·년 (지구 = 1)',
      values: { mode: 'kepler', gaxis: 'lin', kzoom: 'all', kguide: true },
      predict: { question: '태양에서 멀리 있는 행성일수록 1년(공전 주기)은?', choices: ['거리에 비례해서 길다', '거리보다 더 빨리 길어진다', '거리와 상관없다'], info: '자료 카드를 보고 표를 직접 채워요.' },
      onApply: function () { seq = null; kClear(); updateSeq(); }
    },
    {
      name: '3 km/s로 쏘면?', tag: '대표 문항',
      change: '중심 천체 달 → 화성 → 지구', fixed: '발사 속력 3.0 km/s · 수평 발사',
      values: { mode: 'cannon', body: 'moon', v0: 3, tscale: 10, cview: 'earth', trail: true, arrows: true },
      predict: { question: '3 km/s로 쏘면 어디에서 탈출할까?', choices: ['달', '화성', '지구', '모두 떨어진다'], info: '달 → 화성 → 지구 순서로 쏘고 하나씩 기록해요.' },
      onApply: function () { seq = SEQS[4]; updateSeq(); }
    }
  ]);

  seqEl = h('div', { class: 'og-seq', hidden: true });
  SK.el.cornerBL.appendChild(seqEl);
  function updateSeq() {
    if (!seqEl) return;
    if (!seq || seq.mode !== curMode) { seqEl.hidden = true; return; }
    seqEl.hidden = false; seqEl.innerHTML = '';
    var now = SK.get(seq.key), idx = -1;
    seq.vals.forEach(function (v, i) { if (v === now) idx = i; });
    var steps = h('div', { class: 'og-seq__steps' });
    seq.vals.forEach(function (v, i) {
      if (i) steps.appendChild(h('span', { text: '→' }));
      steps.appendChild(h('span', { class: i === idx ? 'is-now' : (i < idx ? 'is-done' : null), text: seq.label(v) }));
    });
    var next = idx >= 0 && idx < seq.vals.length - 1 ? seq.vals[idx + 1] : null;
    var btn = h('button', { class: 'btn btn--secondary', type: 'button' }, next !== null ? '다음: ' + seq.label(next) + ' ▶' : '끝 — 기록 표를 비교해요');
    if (next === null) btn.disabled = true;
    btn.addEventListener('click', function (e) {
      if (e.detail) btn.blur();
      if (next === null) return;
      SK.set(seq.key, next, { silent: true });
      applyExtra(seq, next);
      SK.reset();
      updateSeq();
    });
    seqEl.appendChild(h('span', { class: 'og-seq__title', text: '순서 (한 가지만 바꾸기)' }));
    seqEl.appendChild(steps);
    seqEl.appendChild(h('span', { class: 'og-seq__hint', text: seq.hint }));
    seqEl.appendChild(btn);
  }

  /* 정리 단계 '생각해 보기' */
  thinkEl = h('div', { class: 'think og-think', 'data-step-only': '정리', hidden: true }, [
    h('span', { class: 'think__label', text: '생각해 보기' }),
    h('p', { class: 'think__q', text: THINK.cannon.q }),
    h('p', { class: 'think__hint', text: THINK.cannon.hint })
  ]);
  SK.el.cornerBR.appendChild(thinkEl);

  /* ------------------------------------------------------------------
     16. 실행·기록 가로채기 (케플러·목성)
     ------------------------------------------------------------------ */
  var basePlay = SK.play, baseRecord = SK.record;
  SK.play = function () {
    if (curMode === 'kepler') { SK.notice('케플러 자료는 실행 없이 표에 넣으면 바로 그래프가 그려져요', 'info'); return; }
    if (curMode === 'cannon' && SK.params.body === 'jupiter') {
      SK.notice('목성은 59.5 km/s가 필요해요. 이 대포(최대 12 km/s)로는 안 돼요', 'warn', 4000);
      return;
    }
    basePlay();
  };
  SK.record = function () {
    if (curMode === 'kepler') { SK.notice('케플러 자료는 표 자체가 기록이에요', 'info'); return; }
    if (curMode === 'cannon' && SK.params.body === 'jupiter') { SK.notice('목성은 발사할 수 없어 기록할 결과가 없어요', 'info'); return; }
    baseRecord();
  };

  /* ------------------------------------------------------------------
     17. 전용 키: V 화살표 · O 궤적 · N 중심 천체 · G 그래프 축
     ------------------------------------------------------------------ */
  SK.onKey(function (e) {
    if (e.repeat) return false;
    switch (e.code) {
      case 'KeyV': if (curMode === 'kepler') return false; SK.set('arrows', !SK.get('arrows')); SK.notice('화살표 ' + (SK.get('arrows') ? '켬' : '끔') + ' (V)', 'info', 1200); return true;
      case 'KeyO': if (curMode === 'kepler') return false; SK.set('trail', !SK.get('trail')); SK.notice('궤적 남기기 ' + (SK.get('trail') ? '켬' : '끔') + ' (O)', 'info', 1200); return true;
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
        SK.notice('보는 범위: ' + VIEW_NAME[SK.get('cview')] + ' (Z)', 'info', 1200);
        return true;
    }
    return false;
  });
  // 재생 속도([ ])를 바꾸면 화면의 배속 글자도 바로 고쳐진다 — 공통 틀 SimKit.setSpeed 가 다시 그린다 (최종 통합 점검 때 반영)

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
        '대포: a = −GM r̂/r², RK4, 한 단계 1 s 이하, 화면 1초 = 2분(기본, 30초~30분 선택). 보는 범위: 산 근처(1 km = 0.75u, 실제 축척) / 지구 전체(화면 반폭 4R) / 타원까지(반폭 5.2R).',
        '같은 기록을 세 범위로 다시 볼 수 있어요. 궤적은 천체 반지름 단위라, 다른 천체 기록은 그림에 겹치지 않고 표로만 비교해요.',
        '대포는 공기 없는 산꼭대기(높이 20 km)에서 수평 발사. 지표(r = R)에서 7.9 km/s 로 쏘면 원 궤도 속력 7.91 km/s 보다 조금 느려 땅속으로 들어가므로, 20 km 높이에서 쏘게 했어요(원 궤도 속력 7.90 km/s).',
        '추락: r < R − 1 km · 궤도: 한 바퀴(2π) · r > 6R 에서 v² ≥ 2GM/r 이면 탈출, 아니면 \'먼 타원\'(10.4~11.1 km/s). 타원은 모양만 보여 주고 최고 높이·주기는 표시하지 않아요.',
        '위성: 해석해 v = √(GM/r), T = 2πr/v, 중력 비율 (R/r)². 한 바퀴 = 화면 10초(ISS 1초 ≈ 9분, 정지궤도 1초 ≈ 2.4시간).',
        '상수: G = 6.674×10⁻¹¹, 지구 5.972×10²⁴ kg · 6,371 km, 달 7.342×10²² kg · 1,737 km, 화성 6.417×10²³ kg · 3,390 km, 목성 1.898×10²⁷ kg · 71,492 km(적도).',
        '기록·직전 실행은 모드별로 따로 보관돼요(모드를 바꿨다 돌아오면 다시 보여요).'
      ] }
    ],
    keys: '1/2/3 모드 카드에서 모드 고르기 · V 화살표 · O 궤적 남기기 · N 중심 천체 · G 그래프 축 · Z 보는 범위'
  });

  /* ------------------------------------------------------------------
     19. 첫 화면 모드 카드
     ------------------------------------------------------------------ */
  SK.chooseMode({
    title: '무엇을 알아볼까요?',
    cancelable: true,
    modes: [
      { value: 'cannon', label: '① 뉴턴의 대포', desc: '얼마나 빨리 쏘면 지구를 돌까? · [12역학01-03·05]' },
      { value: 'sat', label: '② 원궤도 위성', desc: '높이 있는 위성이 더 빨리 돌까? · [12역학01-04]' },
      { value: 'kepler', label: '③ 케플러 자료', desc: '주기와 거리 사이 규칙은? · 탐구 활동' }
    ],
    onPick: function (v) { if (SK.get('mode') !== v) SK.set('mode', v); }
  });
})();
