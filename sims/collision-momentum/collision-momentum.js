/* =====================================================================
   collision-momentum — 일차원 충돌과 운동량 보존 (2026-10-28)
   공통 틀: ../../shared/sim.js (SimKit) · 명세: docs/04_팀장결정서.md §4-3
   성취기준 [12물리01-03] 작용·반작용, 운동량 보존(고려 사항: 운동량·충격량) · 연계 [12물리01-05]

   1부  CM  — 물리 엔진 (DOM 없음, node 로도 검산 가능: module.exports)
   2부  화면 — SimKit 위에서 그리기·조절·기록

   화면 축척: 트랙 x −2 ~ +2 m, 1 m = 280u (실험 화면 논리 좌표 1250×700)
   물리 모형
     - 마찰 없음(에어트랙). 반발 계수 e: 튕기기 1 · 중간 0.5 · 달라붙기 0 (심화에서 0~1)
     - 충돌 힘 F(t) = Fmax·sin(πt/τ), 0 ≤ t ≤ τ  (사인 모양으로 단순화한 모형)
       J = μ(1+e)(v₁−v₂), μ = m₁m₂/(m₁+m₂),  Fmax = πJ/(2τ),  평균 힘 = J/τ
     - 충돌 중 속도는 해석해 v₁(t) = v₁ − (J/m₁)(1−cos(πt/τ))/2 (B 는 +),
       위치는 그 해석 적분(사다리꼴 근사보다 정확, 같은 모형)
     - 벽: m₂ = ∞ → v₁′ = −e·v₁, J = m₁(1+e)v₁
     - 분리(반동): 붙어 정지 → 포탄 B 속력 u, J = m₂u, v₁′ = −m₂u/m₁
   자동 슬로 모션: 재생 배율 = min(1, τ/2) → 충돌 τ 가 화면에서 2 초.
     만나기 직전(0.25τ, 화면 약 0.5 초)부터 느려지고, 끝난 뒤 화면 0.5 초 동안 유지 후 1배.
     구현: SimKit 의 고정 간격 dt(화면 시간)마다 물리 시간 dt×배율 만큼 진행하고
           SimKit.time 을 물리 시간으로 맞춘다 → ',' '.' 한 프레임도 슬로 모션 기준.
   ===================================================================== */
(function (root) {
  'use strict';

  /* =================================================================
     1부. 물리 엔진
     ================================================================= */
  var CM = (function () {
    var HW = 0.15;              // 수레 몸통 반폭 (m) → 몸통 0.30 m = 84u
    var BUMP = 0.10;            // 범퍼 길이 (m) = 28u
    var D0 = 2 * (HW + BUMP);   // 두 수레 범퍼가 닿을 때 중심 거리 0.5 m
    var XA0 = -0.9, XB0 = 0.4;  // 처음 위치 (충돌·벽)
    var XW = 1.2;               // 벽 면 위치 (m)
    var G0 = 0.08;              // 분리 모드: 눌린 용수철 길이 (m)
    var L0 = 0.25;              // 용수철 자연 길이 (m)
    var T_PUSH = 0.3;           // 분리 모드: 밀어내기 시작 시각 (s)
    var POST_T = 1.0;           // 충돌 끝나고 더 보여 줄 시간 (s)
    var PRE_MAX = 3.0;          // 만나지 않을 때 최대 시간 (s)
    var T_MAX = 8.0;
    var X_OUT = 2.3;            // 화면 밖 판정 (m)
    var HOLD_DISP = 0.5;        // 슬로 모션 유지 (화면 시간, s)
    var CMAX = 1.6 * BUMP;      // 두 범퍼 합쳐 최대로 눌리는 양(그림용)
    var CMAXW = 0.9 * BUMP;     // 벽: 범퍼 하나
    var TRAVEL = 2.5;           // 부딪치기 전 한 수레가 움직이는 최대 거리 (m)
    var HIT_LIM = 1.6;          // 부딪치는 곳이 이 안에 있게 (m)
    var START_LIM = 1.85;       // 처음 위치 한계 (m)

    /** 실행 계획: 처음 값 → 충격량·나중 속도 (해석해) */
    function plan(p) {
      var mode = p.mode, m1 = +p.m1, m2 = +p.m2, e = +p.e, tau = +p.tau;
      var v1, v2, J = 0, meet, v1f, v2f;
      if (mode === 'separate') {
        v1 = 0; v2 = 0; J = m2 * p.u; meet = true;
        v1f = -J / m1; v2f = J / m2;
      } else if (mode === 'wall') {
        v1 = +p.v1; v2 = 0; meet = v1 > 0;
        J = meet ? m1 * (1 + e) * v1 : 0;
        v1f = v1 - J / m1; v2f = 0;
      } else {
        v1 = +p.v1; v2 = +p.v2; meet = v1 - v2 > 0;
        var mu = m1 * m2 / (m1 + m2);
        J = meet ? mu * (1 + e) * (v1 - v2) : 0;
        v1f = v1 - J / m1; v2f = v2 + J / m2;
      }
      v1f = tidy(v1f); v2f = tidy(v2f); J = tidy(J);
      var pb, pa, kb, ka;
      if (mode === 'wall') {
        pb = m1 * v1; pa = m1 * v1f; kb = 0.5 * m1 * v1 * v1; ka = 0.5 * m1 * v1f * v1f;
      } else {
        pb = m1 * v1 + m2 * v2; pa = m1 * v1f + m2 * v2f;
        kb = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2; ka = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;
      }
      // 계산 오차(1e-15 수준) 때문에 표에서 소수 2자리가 갈리지 않게: 보존되는 양은 같은 값으로 맞춘다
      if (mode !== 'wall' && Math.abs(pa - pb) < 1e-9 * Math.max(1, Math.abs(pb))) pa = pb;
      if (e === 1 && Math.abs(ka - kb) < 1e-9 * Math.max(1, kb)) ka = kb;
      return {
        mode: mode, m1: m1, m2: m2, e: e, tau: tau, u: +p.u, v1: v1, v2: v2, J: J,
        Fmax: Math.PI * J / (2 * tau), Favg: J / tau, meet: meet, v1f: v1f, v2f: v2f,
        pb: pb, pa: pa, kb: kb, ka: ka
      };
    }

    function tidy(v) { return Math.round(v * 1e12) / 1e12; }

    /** 처음 위치. 기본은 A −0.9 · B +0.4 m.
        같은 방향으로 달리며 천천히 따라잡는 충돌(예: v₁ +2, v₂ +1.5)은 기본 위치면 부딪치기 전에
        화면 밖으로 나가므로, 간격을 줄이고 두 수레를 함께 옮겨 트랙 안에서 부딪치게 한다. */
    function startPos(P) {
      var xa = XA0, gap = XB0 - XA0 - D0;              // 범퍼 사이 빈 간격 0.8 m
      if (P.mode !== 'collide' || !P.meet) return { xA: xa, xB: XB0 };
      var close = P.v1 - P.v2, vmax = Math.max(Math.abs(P.v1), Math.abs(P.v2));
      if (vmax * gap / close > TRAVEL) gap = TRAVEL * close / vmax;
      var th = gap / close, D = D0 + gap;
      var hitA = xa + P.v1 * th, hitB = hitA + D0;
      if (hitA < -HIT_LIM) xa += -HIT_LIM - hitA;
      else if (hitB > HIT_LIM) xa += HIT_LIM - hitB;
      xa = Math.max(-START_LIM, Math.min(START_LIM - D, xa));
      return { xA: xa, xB: xa + D };
    }

    function init(p) {
      var P = plan(p), sp = startPos(P);
      var s = {
        P: P, t: 0, phase: 'pre', tc: 0, vA: P.v1, vB: P.v2, xA: sp.xA, xB: sp.xB,
        hitT: null, endT: null, holdDisp: 0, slow: 1, c: 0,
        xAc: 0, xBc: 0, vA0: 0, vB0: 0, end: null
      };
      if (P.mode === 'separate') { s.xA = -(HW + G0 / 2); s.xB = HW + G0 / 2; }
      if (P.mode === 'wall') s.xB = null;
      return s;
    }
    function copyState(s) { var r = {}; for (var k in s) r[k] = s[k]; return r; }

    /** 충돌 시작까지 남은 물리 시간 */
    function timeToHit(s) {
      var P = s.P;
      if (s.phase !== 'pre' || !P.meet) return Infinity;
      if (P.mode === 'separate') return Math.max(0, T_PUSH - s.t);
      if (P.mode === 'wall') return Math.max(0, (XW - HW - BUMP - s.xA) / s.vA);
      return Math.max(0, ((s.xB - s.xA) - D0) / (s.vA - s.vB));
    }
    function free(s, d) {
      s.xA += s.vA * d;
      if (s.xB !== null) s.xB += s.vB * d;
      s.t += d;
    }
    function startHit(s) {
      s.phase = 'hit'; s.tc = 0; s.hitT = s.t;
      s.xAc = s.xA; s.xBc = s.xB; s.vA0 = s.vA; s.vB0 = s.vB;
    }
    /** 충돌 중 위치·속도 (해석해) */
    function hitPos(s) {
      var P = s.P, k = Math.PI / P.tau, tc = s.tc;
      var frac = (1 - Math.cos(k * tc)) / 2;          // 0 → 1
      var S = (tc - Math.sin(k * tc) / k) / 2;         // ∫frac dt
      s.vA = s.vA0 - P.J / P.m1 * frac;
      if (P.mode === 'separate') {
        s.vB = s.vB0 + P.J / P.m2 * frac;
        s.xA = s.xAc + s.vA0 * tc - P.J / P.m1 * S;
        s.xB = s.xBc + s.vB0 * tc + P.J / P.m2 * S;
      } else if (P.mode === 'wall') {
        var cw = s.vA0 * tc - P.J / P.m1 * S;           // 범퍼가 눌린 양
        s.c = CMAXW * Math.tanh(cw / CMAXW);
        s.xA = XW - HW - BUMP + s.c;
      } else {
        s.vB = s.vB0 + P.J / P.m2 * frac;
        var M = P.m1 + P.m2;
        var c = (s.vA0 - s.vB0) * tc - P.J * (1 / P.m1 + 1 / P.m2) * S;  // 두 범퍼가 눌린 양
        s.c = CMAX * Math.tanh(c / CMAX);               // 그림용(질량 중심은 정확히 유지)
        var xcm = (P.m1 * s.xAc + P.m2 * s.xBc) / M + (P.m1 * s.vA0 + P.m2 * s.vB0) / M * tc;
        var D = D0 - s.c;
        s.xA = xcm - P.m2 / M * D;
        s.xB = xcm + P.m1 / M * D;
      }
    }
    /** 물리 시간 h 만큼 진행 (충돌 시작·끝 순간을 정확히 나눔) */
    function advance(s, h) {
      var guard = 0;
      while (h > 1e-15 && guard++ < 8) {
        if (s.phase === 'pre') {
          var th = timeToHit(s);
          if (th <= h) { free(s, th); h -= th; startHit(s); continue; }
          free(s, h); h = 0;
        } else if (s.phase === 'hit') {
          var d = Math.min(h, s.P.tau - s.tc);
          s.tc += d; s.t += d; h -= d; hitPos(s);
          if (s.tc >= s.P.tau - 1e-12) {
            s.tc = s.P.tau; hitPos(s);
            s.phase = 'post'; s.endT = s.t;
            s.vA = s.P.v1f; if (s.P.mode !== 'wall') s.vB = s.P.v2f;
          }
        } else { free(s, h); h = 0; }
      }
    }
    /** 슬로 모션 배율 (dtDisp = 화면 시간 간격) */
    function slowFactor(s, auto, dtDisp) {
      if (!auto) return 1;
      var target = Math.min(1, s.P.tau / 2);
      if (s.phase === 'hit') return target;
      if (s.phase === 'pre') return timeToHit(s) <= 0.25 * s.P.tau + dtDisp ? target : 1;
      return s.holdDisp < HOLD_DISP ? target : 1;
    }
    function out(s) { return Math.abs(s.xA) > X_OUT || (s.xB !== null && Math.abs(s.xB) > X_OUT); }
    /** 한 걸음 (dtDisp = 화면 시간). 끝나면 s.end = 'done'|'nomeet'|'offscreen' */
    function step(s, dtDisp, autoSlow) {
      var f = slowFactor(s, autoSlow, dtDisp);
      s.slow = f;
      advance(s, dtDisp * f);
      if (s.phase === 'post') s.holdDisp += dtDisp;
      var P = s.P;
      if (s.phase === 'post' && (s.t - s.endT >= POST_T || out(s))) s.end = 'done';
      else if (s.phase === 'pre' && !P.meet && (s.t >= PRE_MAX || out(s))) s.end = 'nomeet';
      else if (s.phase === 'pre' && P.meet && out(s)) s.end = 'offscreen';
      else if (s.t >= T_MAX) s.end = 'done';
      return s;
    }
    /** 지금 주고받는 힘 크기 (B 쪽이 받는 힘 = +F, A = −F) */
    function force(s) {
      if (s.phase !== 'hit') return 0;
      return s.P.Fmax * Math.sin(Math.PI * s.tc / s.P.tau);
    }
    /** 힘-시간 곡선 점 (시간 ms, 힘 N), 충돌 시작 = 0. upTo(초)까지만 */
    function curve(P, upTo, n) {
      n = n || 60;
      var fa = [], fb = [], tau = P.tau;
      if (!P.meet) return { fa: fa, fb: fb };
      var lim = upTo === undefined ? 1.2 * tau : upTo;
      function push(t, F) { fa.push([t * 1000, -F]); fb.push([t * 1000, F]); }
      push(-0.2 * tau, 0);
      if (lim < 0) return { fa: fa, fb: fb };
      push(0, 0);
      for (var i = 1; i <= n; i++) {
        var t = tau * i / n;
        if (t > lim) { push(lim, P.Fmax * Math.sin(Math.PI * lim / tau)); return { fa: fa, fb: fb }; }
        push(t, P.Fmax * Math.sin(Math.PI * t / tau));
      }
      push(Math.min(lim, 1.2 * tau), 0);
      return { fa: fa, fb: fb };
    }
    function pNow(s) {
      var P = s.P;
      if (P.mode === 'wall') return P.m1 * s.vA;
      var p = P.m1 * s.vA + P.m2 * s.vB;
      return Math.abs(p - P.pb) < 1e-9 * Math.max(1, Math.abs(P.pb)) ? P.pb : p;   // 보존량: 계산 오차만 지움
    }
    function kNow(s) { var P = s.P; return 0.5 * P.m1 * s.vA * s.vA + (P.mode === 'wall' ? 0 : 0.5 * P.m2 * s.vB * s.vB); }
    function cartH(m) { return 60 + (Math.min(3, Math.max(0.5, m)) - 0.5) / 2.5 * 80; }

    return {
      HW: HW, BUMP: BUMP, D0: D0, XA0: XA0, XB0: XB0, XW: XW, G0: G0, L0: L0, T_PUSH: T_PUSH,
      plan: plan, init: init, startPos: startPos, copy: copyState, step: step, advance: advance, timeToHit: timeToHit,
      slowFactor: slowFactor, force: force, curve: curve, pNow: pNow, kNow: kNow, cartH: cartH
    };
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = CM;
  if (!root || !root.SimKit) return;

  /* =================================================================
     2부. 화면 (SimKit)
     ================================================================= */
  var SK = root.SimKit;
  var DT = 1 / 600;                        // 고정 화면 시간 간격 (s)
  var SX = 280, X0 = 625, RAIL = 360;      // 1 m = 280u, x=0 → 625u, 레일 y
  var LOW_Y0 = 424, LOW_Y1 = 690;          // 아래쪽 막대·그래프 영역
  var KIND_E = { elastic: 1, mid: 0.5, stick: 0 };
  var KIND_ORDER = ['elastic', 'stick', 'mid'];
  var TAU_ORDER = [0.01, 0.05, 0.2];
  var TAU_NAME = { 0.01: '딱딱', 0.05: '보통', 0.2: '푹신' };
  var MODE_NAME = { collide: '충돌', separate: '분리(반동)', wall: '벽' };

  var st = null;              // 엔진 상태
  var noMeetWarned = false;
  var drag = null;            // 수레 끌기
  var syncing = false;        // kind ↔ e 동기화 중
  var lastEqHTML = '';

  function sx(x) { return X0 + x * SX; }
  function col(n) { return SK.color(n); }
  function fmt(v, d) { return SK.fmt(v, d); }
  function sgn(v, d) { var t = fmt(v, d); return (v > 0 && Number(Math.abs(v).toFixed(d)) !== 0) ? '+' + t : t; }
  function kindOfE(e) { return e >= 0.995 ? 'elastic' : e <= 0.005 ? 'stick' : 'mid'; }
  function kindLabel(e) {
    var k = kindOfE(e), name = { elastic: '튕기기', stick: '달라붙기', mid: '중간' }[k];
    return (k === 'mid' && Math.abs(e - 0.5) > 0.004) ? name + '(e ' + fmt(e, 2) + ')' : name;
  }
  function font(w, size, fam) { return w + ' ' + size + 'px ' + (fam === 'serif' ? '"Noto Serif KR", serif' : 'Pretendard, "Malgun Gothic", sans-serif'); }

  /* ---------- 1. 뼈대 ---------- */
  SK.init({
    slug: 'collision-momentum',
    title: '일차원 충돌과 운동량 보존',
    subject: '물리학 (일반 선택)',
    unit: '(1) 힘과 에너지',
    standards: ['12물리01-03'],
    today: '트럭과 승용차가 부딪치면 누가 더 큰 힘을 받을까?',
    dt: DT,
    stageFit: true,
    reset: function (p) {
      st = CM.init(p);
      noMeetWarned = false;
      drag = null;
      syncPanel();
    },
    step: function (dt, p) {
      if (st.end) return;
      if (st.t === 0 && !st.P.meet && !noMeetWarned) {
        noMeetWarned = true;
        SK.notice(st.P.mode === 'wall' ? '수레가 벽 쪽(+)으로 움직여야 부딪쳐요' : '두 수레가 만나지 않아요 (v₁ > v₂ 로 바꿔 보세요)', 'warn', 4000);
      }
      CM.step(st, dt, !!p.autoSlow);
      SK.time = st.t - dt;    // SimKit 이 곧 +dt 하므로 → SimKit.time = 물리 시간
      if (st.end === 'done') SK.finish(finishText());
      else if (st.end === 'nomeet') SK.finish('두 수레가 만나지 않았어요 — v₁ > v₂ 로 바꿔 R');
      else if (st.end === 'offscreen') SK.finish('부딪치기 전에 화면 밖으로 나갔어요 — 속도를 바꿔 보세요');
    },
    render: render,
    capture: capture,
    save: function () { return CM.copy(st); },
    load: function (s) { st = CM.copy(s); },
    status: function (p) {
      var a = [MODE_NAME[p.mode]];
      if (p.mode !== 'separate') a.push(kindLabel(p.e));
      a.push('범퍼 ' + TAU_NAME[p.tau] + ' ' + p.tau + ' s');
      return a.join(' · ');
    },
    onStep: function (i, name) { thinkEl.hidden = name !== '정리'; }
  });
  SK.el.band.style.gridTemplateColumns = 'minmax(0, 7fr) minmax(0, 6fr)';
  SK.el.band.classList.add('cm-band');

  function finishText() {
    var P = st.P;
    if (P.mode === 'wall') return '끝 — 충격량 ' + fmt(P.J, 2) + ' N·s, 최대 힘 ' + fmt(P.Fmax, 1) + ' N · S 로 기록';
    return '끝 — 운동량 합 ' + fmt(P.pb, 2) + ' → ' + fmt(P.pa, 2) + ' kg·m/s · S 로 기록';
  }

  /* ---------- 2. 상황 바꾸기 (요구 B) ---------- */
  SK.addChoice('situation', {
    key: 'mode', label: '실험 장면', style: 'cards', apply: 'restart',
    options: [
      { value: 'collide', label: '충돌', sub: '두 수레가 부딪쳐요' },
      { value: 'separate', label: '분리(반동)', sub: '붙은 두 수레가 밀어내요' },
      { value: 'wall', label: '벽', sub: '벽에 부딪쳐요 (에어백)' }
    ],
    value: 'collide',
    onChange: function () { syncPanel(); }
  });
  SK.addChoice('situation', {
    key: 'kind', label: '충돌 종류', apply: 'restart',
    options: [
      { value: 'elastic', label: '튕기기' },
      { value: 'stick', label: '달라붙기' },
      { value: 'mid', label: '중간' }
    ],
    value: 'elastic',
    onChange: function (v) {
      if (syncing) return;
      syncing = true; SK.set('e', KIND_E[v]); syncing = false;
    }
  });
  SK.addChoice('situation', {
    key: 'tau', label: '범퍼 (부딪치는 시간 τ)', apply: 'restart',
    options: [
      { value: 0.01, label: '딱딱', sub: '0.01 s' },
      { value: 0.05, label: '보통', sub: '0.05 s' },
      { value: 0.2, label: '푹신', sub: '0.2 s' }
    ],
    value: 0.05
  });

  /* ---------- 3. 수치 바꾸기 (요구 A) — 결정서 §4 값 그대로 ---------- */
  SK.addVar('values', { key: 'm1', label: '수레 A 질량', symbol: 'm₁', unit: 'kg', min: 0.5, max: 3, step: 0.5, value: 1, decimals: 1, precision: 2, ticks: [0.5, 1, 2, 3] });
  SK.addVar('values', { key: 'm2', label: '수레 B 질량', symbol: 'm₂', unit: 'kg', min: 0.5, max: 3, step: 0.5, value: 1, decimals: 1, precision: 2, ticks: [0.5, 1, 2, 3] });
  SK.addVar('values', { key: 'v1', label: 'A 처음 속도', symbol: 'v₁', unit: 'm/s', min: -3, max: 3, step: 0.5, value: 2, decimals: 1, precision: 2, ticks: [-3, 0, 3] });
  SK.addVar('values', { key: 'v2', label: 'B 처음 속도', symbol: 'v₂', unit: 'm/s', min: -3, max: 3, step: 0.5, value: 0, decimals: 1, precision: 2, ticks: [-3, 0, 3] });
  SK.addVar('values', { key: 'u', label: '포탄(B) 속력', symbol: 'u', unit: 'm/s', min: 0, max: 6, step: 0.5, value: 4, decimals: 1, precision: 2, ticks: [0, 2, 4, 6] });
  // 속도 슬라이더: 가운데 0 굵은 눈금 + ← / → 그림
  ['v1', 'v2'].forEach(function (k) {
    var c = SK.controls[k];
    c.el.classList.add('cm-vel');
    var tk = c.el.querySelectorAll('.var__ticks span');
    if (tk.length === 3) { tk[0].textContent = '← −3'; tk[1].textContent = '0'; tk[1].className = 'cm-zero'; tk[2].textContent = '+3 →'; }
    var hint = SK.h('p', { class: 'cm-vel-hint', text: '+ 는 오른쪽(→), − 는 왼쪽(←). 실험 화면에서 수레를 끌었다 놓아도 정할 수 있어요.' });
    if (k === 'v2') c.el.appendChild(hint);
  });

  /* ---------- 4. 표시 도구 · 식 보기 ---------- */
  SK.addToggle('tools', { key: 'showP', label: '운동량 막대', value: true });
  SK.addToggle('tools', { key: 'showF', label: '힘-시간 그래프', value: true });
  SK.addToggle('tools', { key: 'showK', label: '운동 에너지 막대', value: true });
  SK.addToggle('tools', { key: 'autoSlow', label: '자동 슬로 모션 (X)', value: true });
  var eqBody = SK.h('div', { class: 'cm-eq__body' });
  var eqBox = SK.h('details', { class: 'cm-eq' }, [SK.h('summary', { class: 'cm-eq__sum', text: '식 보기' }), eqBody]);
  SK.panel('tools').appendChild(eqBox);
  eqBox.addEventListener('toggle', function () { lastEqHTML = ''; SK.requestRender(); });

  /* ---------- 5. 심화 (성취기준 밖) ---------- */
  SK.addVar('deep', {
    key: 'e', label: '반발 계수', symbol: 'e', unit: '', min: 0, max: 1, step: 0.1, value: 1, decimals: 1, precision: 2,
    ticks: [0, 0.5, 1], record: false,
    hint: '심화: 1 = 튕기기, 0 = 달라붙기. 교육과정 밖이라 접어 두었어요.',
    onChange: function (v) {
      if (syncing) return;
      var k = kindOfE(v);
      if (k !== SK.get('kind')) { syncing = true; SK.set('kind', k); syncing = false; }
    }
  });
  SK.addToggle('deep', { key: 'showCM', label: '질량 중심 함께 보기', value: false, record: false });

  /** 모드에 따라 보이는 변수 바꾸기 (패널에 보이는 값 기준) */
  function syncPanel() {
    var m = SK.get('mode');
    function show(k, on) { SK.controls[k].el.style.display = on ? '' : 'none'; }
    show('m2', m !== 'wall');
    show('v1', m !== 'separate');
    show('v2', m === 'collide');
    show('u', m === 'separate');
    SK.controls.kind.enable(m !== 'separate');
    SK.controls.m1.el.querySelector('.var__label').firstChild.textContent = m === 'separate' ? '대포(A) 질량' : '수레 A 질량';
    SK.controls.m2.el.querySelector('.var__label').firstChild.textContent = m === 'separate' ? '포탄(B) 질량' : '수레 B 질량';
    SK.requestRender();
  }

  /* ---------- 6. 하단 띠: 계기판 · 기록 표 (요구 C) ---------- */
  var meters = SK.meters(null, [
    { key: 'v1', label: 'A 속도 (지금)', symbol: 'v₁', unit: 'm/s', q: 'velocity', size: 'md' },
    { key: 'v2', label: 'B 속도 (지금)', symbol: 'v₂', unit: 'm/s', q: 'velocity', size: 'md' },
    { key: 'p', label: '운동량 합 전 → 후', symbol: 'p', unit: 'kg·m/s', size: 'md' },
    { key: 'k', label: '운동 에너지 합 전 → 후', symbol: 'K', unit: 'J', q: 'energy-k', size: 'md' }
  ]);
  SK.recordTable(null, {
    columns: [
      { key: 'mode', label: '모드', unit: '', from: 'param' },
      { key: 'kind', label: '종류', unit: '', from: 'param' },
      { key: 'tau', label: '범퍼', unit: '', from: 'param' },
      { key: 'm1', from: 'param' },
      { key: 'm2', from: 'param', text: function (r) { return r.params.mode === 'wall' ? '–' : SK.valueText('m2', r.params.m2); } },
      { key: 'v1', from: 'param', text: function (r) { return r.params.mode === 'separate' ? '0' : SK.valueText('v1', r.params.v1); } },
      { key: 'v2u', label: 'v₂(u)', unit: 'm/s', from: 'value' },
      { key: 'v1f', label: 'v₁′', unit: 'm/s', decimals: 2, from: 'value' },
      { key: 'v2f', label: 'v₂′', unit: 'm/s', decimals: 2, from: 'value' },
      { key: 'pb', label: 'p합 전', unit: 'kg·m/s', decimals: 2, from: 'value' },
      { key: 'pa', label: 'p합 후', unit: 'kg·m/s', decimals: 2, from: 'value' },
      { key: 'kb', label: 'K 전', unit: 'J', decimals: 2, from: 'value' },
      { key: 'ka', label: 'K 후', unit: 'J', decimals: 2, from: 'value' },
      { key: 'J', label: '충격량', unit: 'N·s', decimals: 2, from: 'value' },
      { key: 'fmax', label: '최대 힘', unit: 'N', decimals: 1, from: 'value' }
    ]
  });

  /* 기록 표: 그 장면에서 쓰지 않는(숨겨진) 변수는 공통 표의 text 옵션으로 '–'·'0' 으로 보이게 한다
     (위 columns 의 m₂·v₁ 참고). 예) 분리 모드 줄에 숨은 v₁ = 2.0 이 찍혀 "대포가 처음에 2 m/s 로 움직였다"로 읽히는 것을 막음. */

  function capture(p) {
    if (!st) return null;
    var P = st.P, done = st.phase === 'post';
    var cv = CM.curve(P);
    var v2u = P.mode === 'separate' ? 'u ' + fmt(P.u, 1) : P.mode === 'wall' ? '벽' : fmt(P.v2, 1);
    return {
      series: done ? { fa: cv.fa, fb: cv.fb } : {},
      values: {
        v2u: v2u, tau: P.tau,
        v1f: done ? P.v1f : st.vA, v2f: P.mode === 'wall' ? '–' : (done ? P.v2f : st.vB),
        pb: P.pb, pa: done ? P.pa : CM.pNow(st), kb: P.kb, ka: done ? P.ka : CM.kNow(st),
        J: done ? P.J : 0, fmax: done ? P.Fmax : 0
      }
    };
  }

  /* ---------- 7. 프리셋 (결정서 §5) ---------- */
  SK.setPresets([
    {
      name: '같은 질량끼리 튕기면?', tag: '탐구 재현',
      change: '충돌 종류: 튕기기', fixed: 'm₁ = m₂ = 1 kg · v₁ = +2, v₂ = 0 m/s · 범퍼 보통',
      values: { mode: 'collide', kind: 'elastic', e: 1, tau: 0.05, m1: 1, m2: 1, v1: 2, v2: 0 },
      predict: { question: 'A(1 kg, +2 m/s)가 멈춰 있는 B(1 kg)에 부딪쳐 튕기면?', choices: ['A는 멈추고 B가 +2 m/s', '둘 다 +1 m/s', 'A가 뒤로 튕겨 나온다'] }
    },
    {
      name: '달라붙으면 운동량은?', tag: '탐구 재현',
      change: '충돌 종류만: 튕기기 → 달라붙기', fixed: 'm₁ = m₂ = 1 kg · v₁ = +2, v₂ = 0 m/s · 범퍼 보통',
      values: { mode: 'collide', kind: 'stick', e: 0, tau: 0.05, m1: 1, m2: 1, v1: 2, v2: 0 },
      predict: { question: '두 수레가 달라붙어 함께 움직이면 운동량의 합은?', choices: ['줄어든다', '그대로 2 kg·m/s', '늘어난다'], info: '운동 에너지 막대도 함께 보세요.' }
    },
    {
      name: '트럭 vs 승용차, 누가 더 큰 힘?', tag: '작용·반작용',
      change: '트럭 A 3 kg·+2 m/s, 승용차 B 1 kg·−2 m/s', fixed: '튕기기 · 범퍼 보통',
      values: { mode: 'collide', kind: 'elastic', e: 1, tau: 0.05, m1: 3, m2: 1, v1: 2, v2: -2 },
      predict: { question: '트럭(3 kg)과 승용차(1 kg)가 마주 보고 부딪치면, 누가 더 큰 힘을 받을까?', choices: ['트럭이 더 큰 힘', '승용차가 더 큰 힘', '두 힘의 크기가 같다'], info: '힘-시간 그래프의 두 곡선을 비교해 보세요.' }
    },
    {
      name: '대포를 쏘면 대포는?', tag: '발사체',
      change: '포탄 속력 u = 4 m/s', fixed: '대포 A 2 kg · 포탄 B 0.5 kg · 처음엔 둘 다 정지',
      values: { mode: 'separate', tau: 0.05, m1: 2, m2: 0.5, u: 4 },
      predict: { question: '멈춰 있던 대포(2 kg)가 포탄(0.5 kg)을 +4 m/s 로 쏘면 대포는?', choices: ['가만히 있다', '뒤로 1 m/s', '뒤로 4 m/s'] }
    },
    {
      name: '에어백은 무엇을 줄일까?', tag: '교통안전',
      change: '범퍼: 딱딱 0.01 s → S 기록 → P 로 푹신 0.2 s', fixed: '벽 · 달라붙기 · 수레 1 kg, +2 m/s',
      values: { mode: 'wall', kind: 'stick', e: 0, tau: 0.01, m1: 1, v1: 2 },
      predict: { question: '푹신한 범퍼(에어백)는 무엇을 줄여 줄까?', choices: ['운동량', '충격량', '최대 힘'], info: '딱딱 범퍼로 실행 → S → P 로 푹신 → 실행해서 비교해요.' },
      onApply: function () { SK.notice('딱딱 범퍼로 실행 → S 기록 → P 로 푹신 → 다시 실행', 'info', 5000); }
    }
  ]);

  /* ---------- 8. 전용 키: E 충돌 종류 · P 범퍼 · X 자동 슬로 모션 ---------- */
  SK.onKey(function (e) {
    if (e.repeat) return false;
    if (e.code === 'KeyE') {
      if (SK.get('mode') === 'separate') { SK.notice('분리 모드에는 충돌 종류가 없어요', 'info'); return true; }
      var i = KIND_ORDER.indexOf(SK.get('kind'));
      var k = KIND_ORDER[(i + 1) % KIND_ORDER.length];
      SK.set('kind', k);
      SK.notice('충돌 종류: ' + { elastic: '튕기기', stick: '달라붙기', mid: '중간' }[k], 'info', 1500);
      return true;
    }
    if (e.code === 'KeyP') {
      var j = TAU_ORDER.indexOf(SK.get('tau'));
      var t = TAU_ORDER[(j + 1) % TAU_ORDER.length];
      SK.set('tau', t);
      SK.notice('범퍼: ' + TAU_NAME[t] + ' (' + t + ' s)', 'info', 1500);
      return true;
    }
    if (e.code === 'KeyX') {
      SK.set('autoSlow', !SK.get('autoSlow'));
      SK.notice('자동 슬로 모션 ' + (SK.get('autoSlow') ? '켬' : '끔'), 'info', 1500);
      return true;
    }
    return false;
  });

  /* ---------- 9. 실험 화면 위 HTML: 슬로 모션 배지 · 만나지 않음 안내 · 생각해 보기 ---------- */
  var badgeEl = SK.h('div', { class: 'cm-badge', hidden: true });
  var warnEl = SK.h('div', { class: 'cm-warn', hidden: true });
  var thinkEl = SK.h('div', { class: 'think cm-think', hidden: true }, [
    SK.h('span', { class: 'think__label', text: '생각해 보기' }),
    SK.h('p', { class: 'think__q', text: '운동량은 보존됐는데, 줄어든 운동 에너지는 어디로 갔을까?' }),
    SK.h('p', { class: 'think__hint', text: '달라붙기의 운동 에너지 막대에서 \'열·소리로\' 부분을 보세요. [12물리01-05]' }),
    SK.h('p', { class: 'think__q', text: '같은 질량끼리 튕기면 왜 속도가 서로 바뀔까? (뉴턴의 요람)' })
  ]);
  SK.el.cornerTR.appendChild(badgeEl);
  SK.el.cornerTR.appendChild(warnEl);
  SK.el.cornerTR.appendChild(thinkEl);

  /* ---------- 10. 수레 끌기 → 처음 속도 (0.5 m/s 단위) ---------- */
  (function installDrag() {
    var cv = SK.view.canvas;
    function cartAt(pt) {
      if (!st) return null;
      var list = [['A', st.xA, st.P.m1]];
      if (st.xB !== null) list.push(['B', st.xB, st.P.m2]);
      for (var i = 0; i < list.length; i++) {
        var x = sx(list[i][1]), hgt = CM.cartH(list[i][2]);
        if (pt.x > x - CM.HW * SX - 10 && pt.x < x + CM.HW * SX + 10 && pt.y > RAIL - 18 - hgt - 20 && pt.y < RAIL + 10) return list[i][0];
      }
      return null;
    }
    cv.addEventListener('pointerdown', function (e) {
      var pt = SK.view.toLogical(e), who = cartAt(pt);
      if (!who) return;
      var mode = SK.params.mode;
      if (mode === 'separate') { SK.notice('분리 모드는 포탄 속력 u 로 정해요', 'info'); return; }
      if (mode === 'wall' && who === 'B') return;
      if (SK.started) { SK.notice('R 로 처음 상태로 돌린 뒤 끌어 보세요', 'info'); return; }
      var x0 = who === 'A' ? st.xA : st.xB;
      drag = { who: who, id: e.pointerId, x: x0, x0: x0, grab: (pt.x - sx(x0)) / SX, samples: [[performance.now(), x0]] };
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
      e.preventDefault();
    });
    cv.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var pt = SK.view.toLogical(e);
      var x = (pt.x - X0) / SX - drag.grab;
      // 다른 수레·벽을 넘지 않게
      if (drag.who === 'A') x = Math.min(x, (st.xB !== null ? st.xB - CM.D0 : CM.XW - CM.HW - CM.BUMP));
      else x = Math.max(x, st.xA + CM.D0);
      drag.x = Math.max(-1.95, Math.min(1.95, x));
      var now = performance.now();
      drag.samples.push([now, drag.x]);
      while (drag.samples.length > 2 && now - drag.samples[0][0] > 120) drag.samples.shift();
      SK.requestRender();
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      var a = d.samples[0], b = d.samples[d.samples.length - 1];
      var moved = Math.abs(d.x - d.x0);
      SK.requestRender();
      if (moved < 0.03) return;            // 살짝 누른 것은 무시
      var dt = (b[0] - a[0]) / 1000;
      var v = (dt > 0.008 && performance.now() - b[0] < 150) ? (b[1] - a[1]) / dt : 0;
      v = Math.max(-3, Math.min(3, Math.round(v * 2) / 2));
      if (Object.is(v, -0)) v = 0;
      var key = d.who === 'A' ? 'v1' : 'v2';
      SK.set(key, v);
      SK.notice((d.who === 'A' ? 'A 처음 속도 v₁' : 'B 처음 속도 v₂') + ' = ' + sgn(v, 1) + ' m/s (끌어서 정함) · Space 로 실행', 'ok', 3000);
    }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  })();

  /* ---------- 11. 수업 안내 서랍 (요구 D 대응표 = 결정서 §4) ---------- */
  SK.guide({
    rows: [
      { target: '수레 A 질량 m₁ · 0.5~3.0 kg, 0.5 간격, 기본 1.0 (다시 시작)', standard: '[12물리01-03] 탐구 활동(역학 수레)', discover: '질량이 달라도 운동량 합은 보존되고, 두 수레가 주고받는 힘은 같다', misconception: '무거운 쪽이 더 큰 힘을 준다' },
      { target: '수레 B 질량 m₂ · 0.5~3.0 kg, 0.5 간격, 기본 1.0 (다시 시작)', standard: '[12물리01-03] 탐구 활동(역학 수레)', discover: '가벼운 쪽 속도 변화가 크다(힘은 같아도)', misconception: '가벼운 쪽이 더 큰 힘을 받는다' },
      { target: 'A 처음 속도 v₁ · −3~+3 m/s, 0.5 간격, 기본 +2.0 (다시 시작)', standard: '[12물리01-03] 운동량은 방향이 있다', discover: '속도의 부호(방향)가 운동량 합에 들어간다', misconception: '속도는 크기만 있다' },
      { target: 'B 처음 속도 v₂ · −3~+3 m/s, 0.5 간격, 기본 0 (다시 시작)', standard: '[12물리01-03]', discover: '정지한 물체도 같은 크기의 힘을 준다', misconception: '가만히 있는 물체는 힘을 주지 않는다' },
      { target: '범퍼(충돌 시간 τ) · 딱딱 0.01 / 보통 0.05 / 푹신 0.2 s (다시 시작)', standard: '[12물리01-03] 고려 사항 \'충격량\', 교통수단(에어백)', discover: '힘-시간 그래프 넓이(충격량)는 같고 높이(최대 힘)만 다르다', misconception: '에어백은 운동량을 줄인다' },
      { target: '충돌 종류(상황) · 튕기기 / 달라붙기 / 중간 (다시 시작)', standard: '[12물리01-03], 연계 [12물리01-05]', discover: '달라붙어도 운동량 합은 같고 운동 에너지만 준다(열·소리)', misconception: '운동량 보존 = 에너지 보존' },
      { target: '포탄 속력 u (분리 모드) · 0~6 m/s, 0.5 간격, 기본 4.0 (다시 시작)', standard: '[12물리01-03] 발사체(반동)', discover: '운동량 합은 0, 가벼운 쪽이 빠르다', misconception: '반동은 운동량이 새로 생긴 것' },
      { target: '실험 장면 · 충돌 / 분리(반동) / 벽', standard: '[12물리01-03] 스포츠·교통수단·발사체에 적용', discover: '세 장면 모두 주고받는 힘은 크기 같고 방향 반대', misconception: '—' },
      { target: '반발 계수 e (심화 ▸)', standard: '성취기준 밖 — 심화', discover: '—', misconception: '—' },
      { target: '질량 중심 함께 보기 (심화 ▸)', standard: '성취기준 밖 — 심화', discover: '충돌 전후 질량 중심의 속도가 일정하다', misconception: '—' }
    ],
    sections: [
      { title: '수업 흐름', items: [
        '① 예측: 프리셋 3(트럭 vs 승용차) → 예측 카드에서 고르기',
        '② 실험: Space 로 실행. 자동 슬로 모션 중 , . 로 한 프레임씩',
        '③ 규칙 찾기: 프리셋 1 실행 → S, 프리셋 2(충돌 종류만 바꿈) 실행 → S, 질량만 바꿔 실행 → S. 기록 표의 p합 전/후 열 비교',
        '④ 생각해 보기(→ 정리 단계): "운동 에너지는 어디로?", "같은 질량이면 왜 속도가 바뀔까?(뉴턴의 요람)"'
      ] },
      { title: '모형 안내', items: [
        '마찰 없음(에어트랙). 충돌 힘은 사인 모양으로 단순화한 모형: F(t) = F최대·sin(πt/τ).',
        '충격량 J = 2·F최대·τ/π = 힘-시간 그래프 넓이, 평균 힘 = J/τ.',
        '벽 모드의 벽은 질량이 아주 큰 물체(지구에 붙음)로 보아, 수레 운동량만 바뀐다(벽이 같은 크기의 충격량을 반대로 받음).',
        '분리 모드에서 늘어난 운동 에너지는 눌린 용수철에 저장돼 있던 에너지다.',
        '수레를 끌었다 놓으면 놓는 순간 속도(0.5 m/s 단위)가 처음 속도에 들어간다(실행은 하지 않음).',
        '성취기준 코드는 결정서에서 확인된 [12물리01-03], [12물리01-05]만 썼다.'
      ] }
    ],
    keys: 'E 충돌 종류 순환 · P 범퍼 순환 · X 자동 슬로 모션'
  });

  /* =================================================================
     그리기
     ================================================================= */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = font(o.w || 600, o.size || 22, o.fam);
    ctx.fillStyle = col(o.color || '--color-ink');
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
    ctx.fillText(s, x, y);
  }
  function zigzag(ctx, x1, x2, y, amp, n) {
    ctx.beginPath(); ctx.moveTo(x1, y);
    var w = x2 - x1;
    for (var i = 1; i < n; i++) ctx.lineTo(x1 + w * i / n, y + (i % 2 ? -amp : amp));
    ctx.lineTo(x2, y); ctx.stroke();
  }

  function render(view, p) {
    if (!st) return;
    var ctx = view.ctx, P = st.P;
    drawTrack(ctx, P);
    if (p.showCM && P.mode !== 'wall') drawCM(ctx, P);
    drawCarts(ctx, P);
    drawLower(ctx, p, P);
    updateHTML(p, P);
  }

  function drawTrack(ctx, P) {
    // 레일
    ctx.fillStyle = col('--color-paper-sunk');
    rr(ctx, sx(-2) - 10, RAIL, sx(2) - sx(-2) + 20, 12, 4); ctx.fill();
    ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
    // 눈금 0.5 m
    for (var i = -4; i <= 4; i++) {
      var x = sx(i / 2), big = i % 2 === 0;
      ctx.fillStyle = col(big ? '--color-line-strong' : '--color-line');
      ctx.fillRect(x - 1, RAIL + 12, 2, big ? 14 : 8);
      if (big) text(ctx, (i > 0 ? '+' : i < 0 ? '−' : '') + Math.abs(i / 2) + (i === 4 ? ' m' : ''), x, RAIL + 40, { size: 20, w: 500, color: '--color-ink-muted', align: 'center' });
    }
    text(ctx, '마찰 없는 트랙 · 눈금 0.5 m', sx(-2) - 10, RAIL - 16, { size: 20, w: 500, color: '--color-ink-muted' });
    // 벽
    if (P.mode === 'wall') {
      var wx = sx(CM.XW);
      ctx.fillStyle = col('--color-paper-sunk'); ctx.fillRect(wx, RAIL - 210, 36, 222);
      ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 3; ctx.strokeRect(wx, RAIL - 210, 36, 222);
      ctx.save(); ctx.beginPath(); ctx.rect(wx, RAIL - 210, 36, 222); ctx.clip();
      ctx.lineWidth = 2;
      for (var k = -230; k < 40; k += 18) { ctx.beginPath(); ctx.moveTo(wx, RAIL + k); ctx.lineTo(wx + 36, RAIL + k - 36); ctx.stroke(); }
      ctx.restore();
      text(ctx, '벽', wx + 18, RAIL - 228, { size: 24, w: 700, align: 'center' });
    }
  }

  function cartPos(who) {
    if (drag && drag.who === who) return drag.x;
    return who === 'A' ? st.xA : st.xB;
  }

  function drawBumper(ctx, faceX, dir, len, tau) {
    // faceX: 몸통 앞면(u), dir: +1 오른쪽으로 뻗음 / −1 왼쪽, len: 지금 길이(u)
    var y = RAIL - 50, x2 = faceX + dir * len;
    var a = Math.min(faceX, x2), w = Math.abs(len);
    ctx.save();
    if (tau <= 0.01) {
      ctx.fillStyle = col('--color-ink-muted'); rr(ctx, a, y - 13, w, 26, 3); ctx.fill();
    } else if (tau <= 0.05) {
      ctx.strokeStyle = col('--color-ink-muted'); ctx.lineWidth = 3;
      zigzag(ctx, faceX, x2 - dir * 6, y, 12, 7);
      ctx.fillStyle = col('--color-ink-muted'); ctx.fillRect(dir > 0 ? x2 - 6 : x2, y - 18, 6, 36);
    } else {
      ctx.fillStyle = col('--color-paper-sunk'); rr(ctx, a, y - 24, w, 48, 14); ctx.fill();
      ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  function drawCart(ctx, who, x, m, color, name) {
    var hgt = CM.cartH(m), bw = 2 * CM.HW * SX, cx = sx(x);
    var top = RAIL - 18 - hgt;
    ctx.fillStyle = col(color);
    rr(ctx, cx - bw / 2, top, bw, hgt, 8); ctx.fill();
    // 바퀴
    ctx.fillStyle = col('--color-ink');
    [-0.28, 0.28].forEach(function (f) { ctx.beginPath(); ctx.arc(cx + f * bw, RAIL - 9, 9, 0, Math.PI * 2); ctx.fill(); });
    text(ctx, name, cx, top + 24, { size: name.length > 1 ? 24 : 28, w: 800, color: '--color-ink-inverse', align: 'center' });
    if (hgt >= 86) text(ctx, fmt(m, m % 0.5 ? 2 : 1) + ' kg', cx, top + 54, { size: 20, w: 700, color: '--color-ink-inverse', align: 'center' });
    else text(ctx, fmt(m, m % 0.5 ? 2 : 1) + ' kg', cx + bw / 2 + 6, top + 12, { size: 20, w: 700, color: '--color-ink-muted' });
    return { cx: cx, top: top };
  }

  function velArrow(ctx, cx, top, v) {
    var y = top - 30;
    if (Math.abs(v) < 0.005) {
      ctx.fillStyle = col('--color-q-velocity'); ctx.beginPath(); ctx.arc(cx, y, 6, 0, Math.PI * 2); ctx.fill();
      text(ctx, '0 m/s (정지)', cx, y - 24, { size: 22, w: 700, color: '--color-q-velocity', align: 'center' });
      return;
    }
    var L = Math.max(-240, Math.min(240, v * 40));
    SK.arrow(ctx, cx, y, cx + L, y, { color: '--color-q-velocity', width: 5 });
    text(ctx, sgn(v, 1) + ' m/s', cx + L / 2, y - 24, { size: 22, w: 700, color: '--color-q-velocity', align: 'center' });
  }

  function drawCarts(ctx, P) {
    var tau = P.tau, xA = cartPos('A'), xB = cartPos('B');
    var hw = CM.HW * SX;
    var nameA = P.mode === 'separate' ? 'A 대포' : 'A', nameB = P.mode === 'separate' ? 'B 포탄' : 'B';
    if (P.mode === 'separate') {
      // 눌린 용수철: A 앞면에 붙어 있음
      var fa = sx(xA) + hw, fb = sx(xB) - hw;
      var len = Math.min(fb - fa, CM.L0 * SX);
      ctx.strokeStyle = col('--color-ink-muted'); ctx.lineWidth = 3;
      zigzag(ctx, fa, fa + len, RAIL - 50, 14, 9);
      if (st.phase === 'pre') text(ctx, '눌린 용수철', (fa + fb) / 2, RAIL - 80, { size: 20, w: 600, color: '--color-ink-muted', align: 'center' });
    } else {
      var cA = P.mode === 'wall' ? st.c : st.c / 2;
      if (drag || st.phase === 'pre') cA = 0;
      var lenA = (CM.BUMP * SX) - cA * SX;
      drawBumper(ctx, sx(xA) + hw, 1, lenA, tau);
      if (P.mode === 'collide') drawBumper(ctx, sx(xB) - hw, -1, lenA, tau);
    }
    var a = drawCart(ctx, 'A', xA, P.m1, '--color-rec-1', nameA);
    var b = P.mode === 'wall' ? null : drawCart(ctx, 'B', xB, P.m2, '--color-rec-2', nameB);
    // 끌기 중: 손가락 안내
    if (drag) {
      text(ctx, '놓는 순간 속도가 처음 속도가 돼요', sx(drag.x), RAIL - 18 - CM.cartH(drag.who === 'A' ? P.m1 : P.m2) - 70, { size: 22, w: 700, color: '--color-primary', align: 'center' });
      return;
    }
    velArrow(ctx, a.cx, a.top, st.vA);
    if (b) velArrow(ctx, b.cx, b.top, st.vB);
    // 힘 화살표 한 쌍 (충돌 중)
    var F = CM.force(st);
    if (F > 0.002 * P.Fmax && P.Fmax > 0) {
      var L = 30 + 150 * F / P.Fmax, y = RAIL - 30;
      var cx;
      if (P.mode === 'wall') cx = sx(CM.XW);
      else if (P.mode === 'separate') cx = (sx(xA) + hw + sx(xB) - hw) / 2;
      else cx = (sx(xA) + sx(xB)) / 2;
      var fs = fmt(F, F >= 100 ? 0 : 1) + ' N';
      SK.arrow(ctx, cx - 4, y, cx - 4 - L, y, { color: '--color-q-force', width: 8 });
      SK.arrow(ctx, cx + 4, y, cx + 4 + L, y, { color: '--color-q-force', width: 8 });
      // 글자는 레일 아래 띠에 (속도 화살표와 겹치지 않게)
      var lab = '← A가 받는 힘 ' + fs + '   |   ' + (P.mode === 'wall' ? '벽' : 'B') + '가 받는 힘 ' + fs + ' →   크기 같고 방향 반대';
      ctx.font = font(800, 22);
      var tw = ctx.measureText(lab).width + 28, lx = Math.max(16, Math.min(1234 - tw, cx - tw / 2));
      ctx.fillStyle = col('--color-copper-tint'); rr(ctx, lx, RAIL + 22, tw, 36, 8); ctx.fill();
      ctx.strokeStyle = col('--color-copper'); ctx.lineWidth = 2; ctx.stroke();
      text(ctx, lab, lx + 14, RAIL + 40, { size: 22, w: 800, color: '--color-copper-text' });
    }
  }

  function drawCM(ctx, P) {
    var M = P.m1 + P.m2, xcm = (P.m1 * cartPos('A') + P.m2 * cartPos('B')) / M;
    var vcm = (P.m1 * st.vA + P.m2 * st.vB) / M, x = sx(xcm);
    ctx.save();
    ctx.strokeStyle = col('--color-ink'); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(x, RAIL + 6); ctx.lineTo(x, RAIL - 236); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col('--color-paper-raised'); ctx.beginPath(); ctx.arc(x, RAIL + 6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 11, RAIL + 6); ctx.lineTo(x + 11, RAIL + 6); ctx.moveTo(x, RAIL - 5); ctx.lineTo(x, RAIL + 17); ctx.stroke();
    ctx.restore();
    text(ctx, '질량 중심 v = ' + sgn(vcm, 2) + ' m/s (일정)', x, RAIL - 250, { size: 20, w: 700, align: 'center' });
  }

  /* ---------- 아래 영역: 운동량 막대 | 힘-시간 그래프 | 운동 에너지 막대 ---------- */
  function drawLower(ctx, p, P) {
    var items = [];
    if (p.showP) items.push({ w: 1, fn: drawPBars });
    if (p.showF) items.push({ w: 1.35, fn: drawFT });
    if (p.showK) items.push({ w: 0.9, fn: drawKBars });
    if (!items.length) return;
    var x = 16, W = 1250 - 32, gap = 14, total = 0;
    items.forEach(function (it) { total += it.w; });
    var avail = W - gap * (items.length - 1);
    items.forEach(function (it) {
      var w = avail * it.w / total;
      var box = { x: x, y: LOW_Y0, w: w, h: LOW_Y1 - LOW_Y0 };
      ctx.fillStyle = col('--color-paper'); rr(ctx, box.x, box.y, box.w, box.h, 10); ctx.fill();
      ctx.strokeStyle = col('--color-line'); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); it.fn(ctx, box, P); ctx.restore();
      x += w + gap;
    });
  }

  function niceMax(v, step) { return Math.max(step, Math.ceil(v / step - 1e-9) * step); }

  function drawPBars(ctx, b, P) {
    text(ctx, '운동량 p (kg·m/s) — 전 / 후', b.x + 14, b.y + 20, { size: 22, w: 700 });
    var hit = st.phase !== 'pre';
    var pA0 = P.m1 * P.v1, pB0 = P.m2 * P.v2, pA = P.m1 * st.vA, pB = P.mode === 'wall' ? 0 : P.m2 * st.vB;
    var rows;
    if (P.mode === 'wall') {
      rows = [
        { lab: 'A 전', v: pA0, c: '--color-rec-1', pre: true },
        { lab: 'A 후', v: hit ? pA : null, c: '--color-rec-1' },
        { lab: '벽이 받은 충격량', v: hit ? (pA0 - pA) : null, c: '--color-ink-muted', note: true }
      ];
    } else {
      rows = [
        { lab: 'A 전', v: pA0, c: '--color-rec-1', pre: true },
        { lab: 'A 후', v: hit ? pA : null, c: '--color-rec-1' },
        { lab: 'B 전', v: pB0, c: '--color-rec-2', pre: true },
        { lab: 'B 후', v: hit ? pB : null, c: '--color-rec-2' },
        { lab: '합 전', v: pA0 + pB0, c: '--color-ink', pre: true, sum: true },
        { lab: '합 후', v: hit ? pA + pB : null, c: '--color-ink', sum: true }
      ];
    }
    var mx = 0.5;
    rows.forEach(function (r) { mx = Math.max(mx, Math.abs(r.v || 0)); });
    [P.pa, P.m1 * P.v1f, P.m2 * P.v2f].forEach(function (v) { if (isFinite(v)) mx = Math.max(mx, Math.abs(v)); });
    var tick = mx <= 3 ? 0.5 : mx <= 6 ? 1 : 2;
    mx = niceMax(mx, tick);
    var labW = P.mode === 'wall' ? 150 : 64, x0 = b.x + 12 + labW, x1 = b.x + b.w - 16, zx = (x0 + x1) / 2, half = (x1 - x0) / 2;
    var top = b.y + 44, bot = b.y + b.h - 34, rh = (bot - top) / rows.length;
    function X(v) { return zx + v / mx * half; }
    // 눈금
    ctx.lineWidth = 1;
    for (var t = -mx; t <= mx + 1e-9; t += tick) {
      ctx.strokeStyle = col(Math.abs(t) < 1e-9 ? '--color-line-strong' : '--color-grid');
      ctx.lineWidth = Math.abs(t) < 1e-9 ? 3 : 1;
      ctx.beginPath(); ctx.moveTo(X(t), top - 4); ctx.lineTo(X(t), bot + 4); ctx.stroke();
    }
    [-mx, 0, mx].forEach(function (t) { text(ctx, (t > 0 ? '+' : '') + fmt(t, tick < 1 ? 1 : 0), X(t), bot + 18, { size: 20, w: 500, color: '--color-ink-muted', align: 'center' }); });
    rows.forEach(function (r, i) {
      var y = top + rh * i + rh / 2, bh = Math.min(26, rh - 8);
      text(ctx, r.lab, b.x + 12, y, { size: 20, w: r.sum ? 800 : 600, color: r.sum ? '--color-ink' : '--color-ink-muted' });
      if (r.v === null) { text(ctx, '실행하면 나타나요', zx + 8, y, { size: 20, w: 500, color: '--color-ink-muted' }); return; }
      var xa = X(0), xb = X(r.v);
      ctx.fillStyle = col(r.c);
      ctx.globalAlpha = r.pre ? 0.5 : 1;
      ctx.fillRect(Math.min(xa, xb), y - bh / 2, Math.abs(xb - xa), bh);
      ctx.globalAlpha = 1;
      if (r.pre) { ctx.strokeStyle = col(r.c); ctx.lineWidth = 2; ctx.strokeRect(Math.min(xa, xb), y - bh / 2, Math.abs(xb - xa), bh); }
      var lbl = sgn(r.v, 2);
      var right = r.v >= 0;
      var tx = right ? Math.max(xb, xa) + 6 : Math.min(xb, xa) - 6;
      if (right && tx > x1 - 60) { right = false; tx = xa - 6; }
      if (!right && tx < x0 + 60) { right = true; tx = xa + 6; }
      text(ctx, lbl, tx, y, { size: r.sum ? 22 : 20, w: 800, color: r.sum ? '--color-ink' : r.c, align: right ? 'left' : 'right' });
    });
  }

  function drawKBars(ctx, b, P) {
    text(ctx, '운동 에너지 K (J)', b.x + 14, b.y + 20, { size: 22, w: 700 });
    var hit = st.phase !== 'pre';
    var kA0 = 0.5 * P.m1 * P.v1 * P.v1, kB0 = P.mode === 'wall' ? 0 : 0.5 * P.m2 * P.v2 * P.v2;
    var kA = 0.5 * P.m1 * st.vA * st.vA, kB = P.mode === 'wall' ? 0 : 0.5 * P.m2 * st.vB * st.vB;
    var done = st.phase === 'post';
    var mx = Math.max(0.5, kA0 + kB0, P.ka);
    var x0 = b.x + 60, x1 = b.x + b.w - 20, W = x1 - x0;
    function wd(v) { return v / mx * W; }
    var rows = [{ lab: '전', a: kA0, b: kB0, y: b.y + 92 }, { lab: '후', a: hit ? kA : null, b: kB, y: b.y + 170 }];
    rows.forEach(function (r) {
      text(ctx, r.lab, b.x + 16, r.y, { size: 24, w: 800 });
      if (r.a === null) { text(ctx, '실행하면 나타나요', x0, r.y, { size: 20, w: 500, color: '--color-ink-muted' }); return; }
      var x = x0;
      ctx.fillStyle = col('--color-q-energy-k'); ctx.fillRect(x, r.y - 18, wd(r.a), 36);
      if (wd(r.a) > 34) text(ctx, 'A', x + 8, r.y, { size: 20, w: 800, color: '--color-ink-inverse' });
      x += wd(r.a);
      if (r.b > 0) {
        ctx.globalAlpha = 0.55; ctx.fillStyle = col('--color-q-energy-k'); ctx.fillRect(x, r.y - 18, wd(r.b), 36); ctx.globalAlpha = 1;
        ctx.fillStyle = col('--color-paper-raised'); ctx.fillRect(x - 1, r.y - 18, 2, 36);
        if (wd(r.b) > 34) text(ctx, 'B', x + 8, r.y, { size: 20, w: 800, color: '--color-ink' });
        x += wd(r.b);
      }
      text(ctx, fmt(r.a + r.b, 2) + ' J', Math.min(x + 8, x1 - 70), r.y - 30, { size: 22, w: 800, color: '--color-q-energy-k' });
      if (r.lab === '후') {
        var lost = (kA0 + kB0) - (r.a + r.b);
        if (lost > 0.005) {
          ctx.save();
          ctx.strokeStyle = col('--color-q-energy-heat'); ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
          ctx.strokeRect(x, r.y - 18, wd(lost), 36);
          ctx.beginPath(); ctx.rect(x, r.y - 18, wd(lost), 36); ctx.clip();
          ctx.setLineDash([]); ctx.lineWidth = 2;
          for (var k = -40; k < wd(lost) + 40; k += 12) { ctx.beginPath(); ctx.moveTo(x + k, r.y + 18); ctx.lineTo(x + k + 36, r.y - 18); ctx.stroke(); }
          ctx.restore();
          text(ctx, (done ? '' : '지금 ') + '열·소리로 ' + fmt(lost, 2) + ' J', x0, r.y + 40, { size: 22, w: 800, color: '--color-q-energy-heat' });
        } else if (lost < -0.005 && P.mode === 'separate') {
          text(ctx, '용수철 에너지 → 운동 에너지', x0, r.y + 40, { size: 20, w: 700, color: '--color-ink-muted' });
        } else if (done) {
          text(ctx, '운동 에너지 그대로', x0, r.y + 40, { size: 20, w: 700, color: '--color-ink-muted' });
        }
      }
    });
  }

  function drawFT(ctx, b, P) {
    text(ctx, '힘-시간 (넓이 = 충격량)', b.x + 14, b.y + 20, { size: 22, w: 700 });
    // 범례
    var lx = b.x + b.w - 14;
    ctx.font = font(700, 20); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    var lb = P.mode === 'wall' ? '벽' : 'B';
    ctx.fillStyle = col('--color-copper-text'); ctx.fillText('F_' + lb, lx, b.y + 20);
    var w1 = ctx.measureText('F_' + lb).width;
    SK.drawPath(ctx, [[lx - w1 - 40, b.y + 20], [lx - w1 - 8, b.y + 20]], SK.recStyle(1));
    ctx.fillStyle = col('--color-rec-1'); ctx.fillText('F_A', lx - w1 - 52, b.y + 20);
    var w2 = ctx.measureText('F_A').width;
    SK.drawPath(ctx, [[lx - w1 - w2 - 92, b.y + 20], [lx - w1 - w2 - 60, b.y + 20]], SK.recStyle(0));

    var pl = b.x + 70, pr = b.x + b.w - 16, pt = b.y + 44, pb = b.y + b.h - 62;
    // 보이는 선들: 지금 + 직전 + 기록
    var lines = [];
    SK.records.forEach(function (r) { if (r.series.fb && r.series.fb.length) lines.push({ s: r.series, st: SK.recStyle(r.slot), tau: r.values.tau, n: r.n, J: r.values.J, F: r.values.fmax }); });
    if (SK.ghost && SK.ghost.series.fb && SK.ghost.series.fb.length) lines.push({ s: SK.ghost.series, st: SK.ghostStyle(), tau: SK.ghost.values.tau, ghost: true });
    var tauMax = P.tau, fpk = P.meet ? P.Fmax : 0;
    lines.forEach(function (L) { tauMax = Math.max(tauMax, L.tau || 0); L.s.fb.forEach(function (q) { fpk = Math.max(fpk, Math.abs(q[1])); }); });
    if (fpk <= 0) fpk = 10;
    var t0 = -0.2 * tauMax * 1000, t1 = 1.2 * tauMax * 1000, fm = fpk * 1.15;
    function X(t) { return pl + (t - t0) / (t1 - t0) * (pr - pl); }
    function Y(f) { return (pt + pb) / 2 - f / fm * (pb - pt) / 2; }
    // 모눈
    ctx.lineWidth = 1; ctx.strokeStyle = col('--color-grid');
    var tstep = tauMax <= 0.01 ? 2 : tauMax <= 0.05 ? 10 : 50;
    var tLast = Math.floor((t1 + 1e-6) / tstep) * tstep;
    for (var t = 0; t <= t1 + 1e-6; t += tstep) {
      ctx.beginPath(); ctx.moveTo(X(t), pt); ctx.lineTo(X(t), pb); ctx.stroke();
      var last = Math.abs(t - tLast) < 1e-6;
      text(ctx, String(Math.round(t)) + (last ? ' ms' : ''), X(t), pb + 16, { size: 20, w: last ? 700 : 500, color: '--color-ink-muted', align: last ? 'right' : 'center' });
    }
    ctx.strokeStyle = col('--color-line-strong'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pl, Y(0)); ctx.lineTo(pr, Y(0)); ctx.moveTo(pl, pt); ctx.lineTo(pl, pb); ctx.stroke();
    var fTxt = fmt(fm, fm >= 100 ? 0 : 1);
    text(ctx, '+' + fTxt, pl - 6, pt + 8, { size: 20, w: 500, color: '--color-ink-muted', align: 'right' });
    text(ctx, '0', pl - 6, Y(0), { size: 20, w: 500, color: '--color-ink-muted', align: 'right' });
    text(ctx, '−' + fTxt, pl - 6, pb - 8, { size: 20, w: 500, color: '--color-ink-muted', align: 'right' });
    text(ctx, 'F (N)', pl - 6, pt + 36, { size: 20, w: 700, color: '--color-ink-muted', align: 'right' });

    ctx.save(); ctx.beginPath(); ctx.rect(pl, pt - 2, pr - pl, pb - pt + 4); ctx.clip();
    function map(a, c) { return [X(a), Y(c)]; }
    lines.forEach(function (L) {
      SK.drawPath(ctx, L.s.fa, L.st, map);
      SK.drawPath(ctx, L.s.fb, L.st, map);
    });
    // 지금 실행: 넓이 색칠 40% + 선
    if (P.meet && st.phase !== 'pre') {
      var cv = CM.curve(P, st.phase === 'hit' ? st.tc : undefined, 90);
      [[cv.fa, '--color-rec-1', 0], [cv.fb, '--color-rec-2', 1]].forEach(function (z) {
        var pts = z[0]; if (pts.length < 2) return;
        ctx.beginPath(); ctx.moveTo(X(pts[0][0]), Y(0));
        pts.forEach(function (q) { ctx.lineTo(X(q[0]), Y(q[1])); });
        ctx.lineTo(X(pts[pts.length - 1][0]), Y(0)); ctx.closePath();
        ctx.globalAlpha = 0.4; ctx.fillStyle = col(z[1]); ctx.fill(); ctx.globalAlpha = 1;
        SK.drawPath(ctx, pts, SK.recStyle(z[2]), map);
      });
    }
    ctx.restore();
    // 글자: 충격량·최대 힘
    if (!P.meet || P.J <= 0) {
      text(ctx, P.mode === 'separate' ? '포탄 속력이 0 이면 힘이 없어요' : '만나지 않으면 힘도 없어요', (pl + pr) / 2, (pt + pb) / 2 - 30, { size: 20, w: 600, color: '--color-ink-muted', align: 'center' });
    } else if (st.phase === 'pre') {
      text(ctx, '부딪치면 여기에 그려져요', (pl + pr) / 2, (pt + pb) / 2 - 30, { size: 20, w: 600, color: '--color-ink-muted', align: 'center' });
    } else {
      var k = Math.PI / P.tau, tc = st.phase === 'hit' ? st.tc : P.tau;
      var Jnow = P.J * (1 - Math.cos(k * tc)) / 2;
      var who = P.mode === 'wall' ? '벽' : 'B';
      text(ctx, '충격량 ' + who + ' +' + fmt(Jnow, 2) + ' · A −' + fmt(Jnow, 2) + ' N·s', pl + 8, pt + 12, { size: 20, w: 800, color: '--color-ink' });
      text(ctx, '최대 힘 ' + fmt(P.Fmax, P.Fmax >= 100 ? 0 : 1) + ' N · 평균 ' + fmt(P.Favg, P.Favg >= 100 ? 0 : 1) + ' N', pl + 8, pb - 12, { size: 20, w: 700, color: '--color-copper-text' });
    }
    // 기록 요약
    var info = lines.filter(function (L) { return !L.ghost; }).map(function (L) { return '기록' + L.n + ' J ' + fmt(L.J, 2) + ' · 최대 ' + fmt(L.F, L.F >= 100 ? 0 : 1) + ' N'; });
    var foot = '시간 0 = 부딪친 순간 · 힘은 사인 모양 모형';
    if (info.length) {
      ctx.font = font(600, 20);
      foot = info.slice(-2).join('  |  ');
      if (ctx.measureText(foot).width > b.w - 24) foot = info[info.length - 1];
    }
    text(ctx, foot, b.x + 12, b.y + b.h - 16, { size: 20, w: 600, color: '--color-ink-muted' });
  }

  /* ---------- HTML 갱신 (계기판·배지·안내·식) ---------- */
  function vText(v, unit) {
    var a = Math.abs(v) < 0.005 ? '' : v > 0 ? ' →' : ' ←';
    return sgn(v, 1) + a;
  }
  function updateHTML(p, P) {
    var hit = st.phase !== 'pre';
    meters.update({
      v1: vText(st.vA),
      v2: P.mode === 'wall' ? '벽' : vText(st.vB),
      p: fmt(P.pb, 2) + ' → ' + (hit ? fmt(CM.pNow(st), 2) : '?'),
      k: fmt(P.kb, 2) + ' → ' + (hit ? fmt(CM.kNow(st), 2) : '?')
    });
    // 슬로 모션 배지
    var slowOn = SK.running && st.slow < 0.999;
    badgeEl.hidden = !slowOn;
    if (slowOn) {
      var tx = '슬로 모션 ×1/' + Math.round(1 / st.slow);
      if (badgeEl.textContent !== tx) badgeEl.textContent = tx;
    }
    // 만나지 않음 안내 (패널에 보이는 값 기준)
    var um = SK.get('mode'), w = '';
    if (um === 'collide' && SK.get('v1') <= SK.get('v2')) w = '두 수레가 만나지 않아요 (v₁ > v₂ 로)';
    else if (um === 'wall' && SK.get('v1') <= 0) w = '수레가 벽에 닿지 않아요 (v₁ > 0 으로)';
    warnEl.hidden = !w;
    if (w && warnEl.textContent !== w) warnEl.textContent = w;
    // 식 보기
    if (eqBox.open) {
      var html = eqHTML(P, hit);
      if (html !== lastEqHTML) { eqBody.innerHTML = html; lastEqHTML = html; }
    }
  }
  function par(v) { return v < 0 ? '(' + fmt(v, 2) + ')' : fmt(v, 2); }
  function eqHTML(P, hit) {
    var done = st.phase === 'post';
    var a = done ? P.v1f : st.vA, b = done ? P.v2f : st.vB;
    var q = hit ? '' : ' <span class="cm-eq__note">(실행하면 채워져요)</span>';
    if (P.mode === 'wall') {
      return '<p class="cm-eq__f">J = Δp = m₁v₁′ − m₁v₁</p>' +
        '<p>= ' + fmt(P.m1, 2) + '×' + (hit ? par(a) : '?') + ' − ' + fmt(P.m1, 2) + '×' + par(P.v1) + q + '</p>' +
        '<p class="cm-eq__r">수레가 받은 충격량 ' + (hit ? fmt(P.m1 * a - P.m1 * P.v1, 2) : '?') + ' N·s · 벽은 반대로 같은 크기</p>';
    }
    var v1 = P.v1, v2 = P.v2;
    var lhs = P.m1 * v1 + P.m2 * v2, rhs = P.m1 * a + P.m2 * b;
    return '<p class="cm-eq__f">m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′</p>' +
      '<p>' + fmt(P.m1, 2) + '×' + par(v1) + ' + ' + fmt(P.m2, 2) + '×' + par(v2) + ' = ' +
      (hit ? fmt(P.m1, 2) + '×' + par(a) + ' + ' + fmt(P.m2, 2) + '×' + par(b) : '?') + q + '</p>' +
      '<p class="cm-eq__r">' + fmt(lhs, 2) + ' = ' + (hit ? fmt(rhs, 2) : '?') + ' kg·m/s</p>' +
      '<p class="cm-eq__f">J = Δp_B = m₂(v₂′ − v₂) = ' + (hit ? sgn(P.m2 * (b - v2), 2) : '?') + ' N·s</p>';
  }
})(typeof window !== 'undefined' ? window : null);
