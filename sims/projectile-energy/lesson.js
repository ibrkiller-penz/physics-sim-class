/* =====================================================================
   포물선 운동과 역학적 에너지 — 교과 설명 데이터 (R7 1차, 2026-10-30)
   원고: docs/교과설명/projectile-energy.md (9장, 심플 1·2·3·5·8) · 형식: docs/SIMKIT.md §0R7, docs/개선/R7_1차_계획.md §1-5
   불러오는 순서: shared/sim.js → shared/diagram.js → shared/lesson.js → pe-physics.js → sim.js → 이 파일
   그림: SimDiagram(D) + 이 파일의 arr() — 실험 화면과 같은 색·화살표 문법
     속도 = 실선(--color-q-velocity) · 성분 = 같은 색 점선 · 가속도 g = 굵은 실선(--color-q-force) · 공·궤적 = --sim · 에너지 = --color-q-energy-k/p
   수치는 손계산(pe-physics.js 와 같은 g = 9.8 m/s²): R(20 m/s, 45°) = 40.8 m, 30°·60° = 35.3 m, 카드 ② 합 246 J, 달 61.7 m
   ===================================================================== */
(function () {
  'use strict';
  var SK = window.SimKit;
  if (!SK || !SK.lesson) return;

  var VC = 'var(--color-q-velocity)', AC = 'var(--color-q-force)';
  var KC = 'var(--color-q-energy-k)', PC = 'var(--color-q-energy-p)';
  function r1(v) { return Math.round(v * 10) / 10; }

  /** 화살표 머리(실험 화면 색) + 위치 에너지 빗금 — 그림마다 한 번 */
  function defs() {
    function mk(id, color, size) {
      return '<marker id="' + id + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="' + size + '" markerHeight="' + size + '" orient="auto-start-reverse" markerUnits="strokeWidth">' +
        '<path d="M0 0.8L10 5L0 9.2z" style="fill:' + color + '"/></marker>';
    }
    return '<defs>' + mk('pe-lm-v', VC, 4) + mk('pe-lm-c', VC, 5.5) + mk('pe-lm-a', AC, 3.2) +
      '<pattern id="pe-lp-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect width="10" height="10" style="fill:var(--color-paper-raised)"/><line x1="2" y1="0" x2="2" y2="10" style="stroke:' + PC + ';stroke-width:5"/></pattern></defs>';
  }
  /** 화살표: kind 'v' 속도(실선) · 'comp' 성분(점선) · 'a' 가속도 g(굵은 실선) */
  function arr(D, x1, y1, x2, y2, o) {
    o = o || {};
    var k = o.kind || 'v', c = k === 'a' ? AC : VC;
    var w = k === 'a' ? 5 : k === 'comp' ? 2.2 : 3.2;
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return '';
    var s = '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" style="stroke:' + c + ';stroke-width:' + w +
      (k === 'comp' ? ';stroke-dasharray:8 6' : '') + ';stroke-linecap:round" marker-end="url(#' + (k === 'a' ? 'pe-lm-a' : k === 'comp' ? 'pe-lm-c' : 'pe-lm-v') + ')"/>';
    if (o.label) {
      var lx = o.lx !== undefined ? o.lx : x2 + (x2 - x1) / len * 20, ly = o.ly !== undefined ? o.ly : y2 + (y2 - y1) / len * 20;
      s += D.label(lx, ly, o.label, { bg: true, anchor: o.anchor || (x2 >= x1 ? 'start' : 'end'), color: k === 'a' ? AC : k === 'comp' ? VC : 'ink', size: o.size });
    }
    return s;
  }
  /** 같은 높이로 돌아오는 포물선 점 목록: 발사 (x0,y0), 사거리 R(px), 각도 deg */
  function para(x0, y0, R, deg, n) {
    var t = Math.tan(deg * Math.PI / 180), pts = [];
    n = n || 48;
    for (var i = 0; i <= n; i++) { var x = R * i / n; pts.push([x0 + x, y0 - x * t + x * x * t / R]); }
    return pts;
  }
  function rect(x, y, w, h, fill, stroke, rx) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" style="fill:' + fill + ';stroke:' + (stroke || 'none') + ';stroke-width:2"/>';
  }

  SK.lesson({
    slug: 'projectile-energy',
    title: '포물선 운동과 역학적 에너지',
    standards: [
      // 칩 한 줄에 들어가게 줄인 문구(원고 1장 성취기준 칩의 요지) — 코드는 docs/01 확인분만, 12물리01-02 는 쓰지 않음
      { code: '12역학01-02', subj: '역학과 에너지', text: '포물선 운동의 정량적 설명 · 역학적 에너지' },
      { code: '12물리01-04', subj: '물리학', text: '일과 운동 에너지 · 역학적 에너지 보존' },
      { code: '12물리01-05', subj: '물리학', text: '연계 · 열로 바뀌어도 에너지 총량 보존 (6장)' }
    ],
    simple: ['goal', 'two-motions', 'split-v', 'energy', 'check'],
    chapters: [
      /* ── 1장 ── */
      {
        id: 'goal', type: 'goal', title: '던진 공은 어떻게 움직일까?',
        question: '공을 비스듬히 던지면 날아가는 동안 속도와 에너지는 어떻게 바뀔까?',
        body: [
          '공을 던진 뒤에는 중력만 작용해요(공기 저항은 일단 무시). 이때 공의 길이 어떤 모양인지, 얼마나 멀리 가는지를 식으로 말할 수 있어요.',
          '날아가는 동안 운동 에너지와 위치 에너지가 서로 바뀌지만 합은 어떻게 되는지도 알아봐요.'
        ],
        goals: ['수평과 수직을 따로 생각하기', '최고점에서도 가속도는 $g$', '에너지 합이 일정해지는 조건'],
        teacherNote: '이 장은 1분. 질문을 읽고 학생 예상을 손들기로 받아 두면 8장 예측과 이어진다.',
        svg: function (D) {
          var pts = para(100, 380, 600, Math.atan(230 * 2 / 300) * 180 / Math.PI);   // 최고점 (400, 150)
          var ux = 0.546, uy = -0.838;   // 발사점 접선 방향(기울기 230·2/300)
          return D.svg([defs(),
            D.line(60, 380, 740, 380, { color: 'muted', w: 2 }),
            D.curve(pts, { color: 'sim', w: 2.5, dash: '10 8' }),
            rect(220, 46, 360, 52, 'var(--sim-tint)', 'var(--sim)', 26),
            D.label(400, 72, '속도와 에너지는 어떻게 바뀔까?', { anchor: 'middle', size: 22, weight: 500 }),
            D.ball(100, 380, 11),
            arr(D, 100, 380, 100 + ux * 92, 380 + uy * 92, { label: '$v_0$' }),
            D.ball(400, 150, 11),
            D.label(400, 120, '최고점', { anchor: 'middle', bg: true }),
            arr(D, 400, 150, 462, 150, { label: '$v_x$' }),
            arr(D, 400, 166, 400, 214, { kind: 'a', label: '$g$', lx: 414, ly: 204, anchor: 'start' }),
            D.ball(700, 380, 11, { hollow: true })
          ], { how: '점선 = 공이 지나가는 길 · 가는 화살표 = 속도 · 굵은 화살표 = 중력 가속도 $g$' });
        }
      },

      /* ── 2장 ── */
      {
        id: 'two-motions', type: 'concept', title: '한 번에 두 가지 운동',
        // 원고 '핵심 개념'은 본문 세 문장과 같은 말이라 따로 띄우지 않고 셋째 문장에 '독립'을 붙임 (1920 한 화면)
        body: [
          '옆으로 가는 방향에는 힘이 없어요. 그래서 속도가 변하지 않는 **등속도 운동**이에요.',
          '아래위 방향에는 중력이 늘 아래로 작용해요. 가속도 $g$(지구에서 약 9.8 m/s²)인 **등가속도 운동**이에요.',
          '두 운동은 서로 영향을 주지 않아요(독립). 겹치면 {{포물선}}이 되고, 옆으로 던졌다고 떨어지는 방식이 달라지지는 않아요.'
        ],
        eq: [
          { tex: '$x = v_x t$', caption: '수평: 가속도 0, $v_x$ 일정' },
          { tex: '$y = v_{y0} t − ½ g t^2$', caption: '수직: 가속도 $g$, 아래 방향' }
        ],
        more: { title: '기호', body: ['$x$ 수평 위치(m) · $y$ 높이(m) · $t$ 시간(s) · $g$ {{중력 가속도}}(m/s²) · $v_{y0}$ 처음 수직 속도(m/s)'] },
        life: ['책상 모서리에서 구슬을 굴려 떨어뜨릴 때와 가만히 떨어뜨릴 때, 바닥에 닿는 소리가 거의 같이 들려요.', '물대포 호스의 물줄기가 휘어지는 모양.'],
        teacherNote: '"수평 속도를 더 키워도 떨어지는 시간은 그대로"가 이 장의 결론. 카드 ①로 바로 확인.',
        svg: function (D) {
          var k = [], i, y, x;
          k.push(defs());
          k.push(rect(20, 121, 46, 269, 'var(--sim-tint)', 'var(--color-ink-muted)'));
          k.push(D.line(20, 390, 780, 390, { color: 'ink', w: 2.5 }));
          // 같은 높이 가는 점선 (3번째·6번째 찍힘)
          [3, 6].forEach(function (j) { var yy = 110 + 5 * j * j; k.push(D.line(90, yy, 80 + 80 * j - 12, yy, { color: 'muted', w: 1.5, dash: '4 6' })); });
          k.push(D.label(330, 290, '같은 높이', { anchor: 'middle', bg: true, size: 20, color: 'muted' }));
          for (i = 0; i <= 7; i++) {
            y = 110 + 5 * i * i; x = 80 + 80 * i;   // 0.1 s 마다: 수평 같은 간격, 수직 1:3:5:7… 로 벌어짐
            if (i > 1) k.push(D.ball(80, y, 9, { color: 'muted', hollow: true }));   // 0.1 s 째는 5 px 아래라 던진 공 첫 점과 겹쳐 생략
            k.push(D.ball(x, y, 10));
            k.push(D.dots([[x, 405]], { r: 4 }));                       // 바닥 그림자
            k.push(D.dots([[766, y]], { r: 4, color: 'muted' }));         // 벽 그림자
          }
          k.push(D.line(766, 100, 766, 380, { color: 'muted', w: 1.5, dash: '2 6' }));
          k.push(D.label(180, 90, '옆으로 던진 공', { bg: true }));
          k.push(D.label(96, 330, '떨어뜨린 공', { bg: true, color: 'muted' }));
          k.push(arr(D, 400, 206, 400, 252, { kind: 'a', label: '$g$', lx: 414, ly: 244, anchor: 'start' }));
          k.push(D.label(752, 140, '벽 그림자: 점점 벌어짐', { anchor: 'end', size: 20, bg: true }));
          k.push(D.label(400, 432, '바닥 그림자: 같은 간격', { anchor: 'middle', size: 20 }));
          return D.svg(k, { title: '0.1 s 마다 찍은 두 공', how: '찬 점 = 옆으로 던진 공 · 빈 점 = 떨어뜨린 공 — 같은 순간 높이가 같아요' });
        }
      },

      /* ── 3장 ── */
      {
        id: 'split-v', type: 'formula', title: '속도를 둘로 나누기',
        // 원고 첫 문장(성분 $v_0 \cos θ$·$v_0 \sin θ$)은 식 줄 설명으로, 핵심 개념은 셋째 문장과 같아 따로 띄우지 않음 (1920 한 화면)
        body: [
          '수평 속도 $v_x$ 는 날아가는 내내 같아요. 수직 속도 $v_y$ 는 1초마다 $g$ 씩 줄어들어(올라갈 때) 0이 되었다가 다시 아래로 커져요.',
          '가장 높은 곳({{최고점}})에서 $v_y$ = 0 이에요. 하지만 $v_x$ 는 남아 있으니 속도는 0이 아니에요. 가속도는 그때도 아래로 $g$ 예요.'
        ],
        eq: [
          { tex: '$v_x = v_0 \\cos θ$', caption: '처음 속도의 수평 성분 — 일정' },
          { tex: '$v_y = v_0 \\sin θ − g t$', caption: '수직 성분 — 최고점에서 $v_y$ = 0, 이때 $t = v_0 \\sin θ ÷ g$' }
        ],
        more: { title: '더 알아보기 — 성분과 속력', body: ['던지는 각도가 $θ$ 이면 처음 속도의 수평 성분은 $v_0 \\cos θ$, 수직 성분은 $v_0 \\sin θ$ 예요.', '그 순간의 속력: $v$ = √($v_x^2$ + $v_y^2$).', '기호: $v_0$ 처음 속력(m/s) · $θ$ 던지는 각도(°) · $v_x$ 수평 속도 · $v_y$ 수직 속도(위 +, 아래 −) · $g$ 중력 가속도(m/s²)'] },
        life: ['농구 슛에서 공이 림 위에서 가장 느리게 보이는 것은 $v_y$ = 0 이기 때문이고, 속도가 0은 아니에요.', '스마트폰 슬로모션으로 던진 공을 찍어 프레임마다 위치를 읽어 봐요(동영상 분석).'],
        teacherNote: '실험 화면 ⚙ 설정에서 속도 화살표·가속도 화살표를 켜게 한다. 카드 ⑤ "최고점에서 속도는?"이 이 장과 1:1.',
        svg: function (D) {
          var pts = para(120, 370, 560, 45);   // 45° → 최고점 (400, 230), 높이 = 사거리 ÷ 4
          var c = 100 / Math.SQRT2;            // v₀ 화살표 100 → 성분 70.7
          return D.svg([defs(),
            D.line(60, 370, 770, 370, { color: 'muted', w: 2 }),
            D.curve(pts, { color: 'sim', w: 2.5, dash: '10 8' }),
            // 발사점: v₀ 와 두 성분
            D.line(120 + c, 370, 120 + c, 370 - c, { color: 'muted', w: 1.5, dash: '3 5' }),
            D.line(120, 370 - c, 120 + c, 370 - c, { color: 'muted', w: 1.5, dash: '3 5' }),
            arr(D, 120, 370, 120 + c, 370, { kind: 'comp', label: '$v_x$', lx: 120 + c / 2, ly: 396, anchor: 'middle' }),
            arr(D, 120, 370, 120, 370 - c, { kind: 'comp', label: '$v_y$', lx: 106, ly: 370 - c / 2, anchor: 'end' }),
            D.angle(120, 370, 44, 0, 45, '$θ$', { lr: 18, size: 20 }),
            D.ball(120, 370, 10),
            arr(D, 120, 370, 120 + c, 370 - c, { label: '$v_0$' }),
            // 최고점
            D.ball(400, 230, 10),
            D.label(400, 186, '$v_y$ = 0, $v_x$ 그대로', { anchor: 'middle', bg: true }),
            arr(D, 400, 230, 400 + c, 230, { kind: 'comp', label: '$v_x$' }),
            arr(D, 400, 246, 400, 292, { kind: 'a', label: '$g$', lx: 414, ly: 282, anchor: 'start' }),
            // 착지점 (같은 높이 → 처음과 같은 속력)
            D.ball(680, 370, 10),
            arr(D, 680, 370, 680 + c, 370, { kind: 'comp' }),
            arr(D, 680, 370, 680 + c, 370 + c * 0.85, {}),
            D.label(662, 424, '처음과 같은 속력 (같은 높이)', { anchor: 'end', size: 20, bg: true })
          ], { title: '처음 속도 나누기 (45°)', how: '실선 = 속도 · 점선 = 성분 $v_x$, $v_y$ · 굵은 화살표 = $g$ · 화살표 길이 = 속도 크기' });
        }
      },

      /* ── 4장 ── */
      {
        id: 'range', type: 'formula', title: '얼마나 멀리, 얼마나 오래',
        question: '더해서 90°가 되는 두 각도(30°와 60°)는 {{사거리}}가 같고, 45°에서 가장 멀리 가요.',
        body: [
          '사거리는 (수평 속도) × (비행 시간)이에요. $θ$ 가 클수록 오래 날지만 옆으로 느리고, 작을수록 옆으로 빠르지만 일찍 떨어져요. 그 균형이 맞는 곳이 45°예요.'
        ],
        eq: [
          { tex: '$R = v_0^2 \\sin 2θ ÷ g$', caption: '사거리 — 같은 높이로 돌아올 때 $v_0$, $θ$, $g$ 로 정해져요' }
        ],
        condition: '처음 높이 $h$ = 0 이고 공기 저항이 없을 때 쓰는 식이에요.',
        more: { title: '더 알아보기 — 비행 시간 · 최고 높이 · 계산 예', body: [
          '올라가는 데 걸린 시간과 내려오는 데 걸린 시간이 같아서, 비행 시간은 $v_y$ 가 처음 값에서 반대 방향의 같은 크기가 되는 시간이에요.',
          '비행 시간 $T$ = 2$v_0$ sin$θ$ ÷ $g$ · 최고 높이 $H$ = ($v_0$ sin$θ$)² ÷ 2$g$',
          '예: $v_0$ = 20 m/s, $θ$ = 45°, $g$ = 9.8 m/s² → $T$ ≈ 2.89 s, $H$ ≈ 10.2 m, $R$ ≈ 40.8 m',
          '예: $v_0$ = 20 m/s 로 30°와 60° → 둘 다 $R$ ≈ 35.3 m (sin60° = sin120°)',
          '처음 높이 $h$ > 0 이면 착지 시간이 길어져 사거리 식이 달라져요.'
        ] },
        life: ['포환·창던지기 선수들은 45°보다 약간 낮게 던져요(던지는 높이가 땅보다 높고, 공기 저항이 있어서).', '물총을 쏠 때의 각도.'],
        teacherNote: '카드 ③ "30°와 60°"은 값을 30°로 맞춰 두므로, 30°를 기록한 뒤 θ 만 60°로 바꿔 두 번째 기록을 한다.',
        svg: function (D) {
          var S = 640 / (400 / 9.8);   // 45° 사거리 40.8 m = 640 px → 1 m ≈ 15.7 px
          var R30 = 400 * Math.sin(Math.PI / 3) / 9.8 * S;   // 35.3 m
          var k = [defs(), D.line(40, 380, 780, 380, { color: 'muted', w: 2 })];
          k.push(D.group([D.curve(para(60, 380, R30, 30), { color: 'sim', w: 2.5, dash: '10 8' })], { opacity: 0.7 }));
          k.push(D.group([D.curve(para(60, 380, R30, 60), { color: 'sim', w: 2.5, dash: '16 6 3 6' })], { opacity: 0.7 }));
          k.push(D.curve(para(60, 380, 640, 45), { color: 'sim', w: 3.5 }));
          k.push(D.ball(60, 380, 9));
          k.push(D.dots([[60 + R30, 380]], { r: 7 }));
          k.push(D.dots([[700, 380]], { r: 8 }));
          k.push(D.label(60 + R30, 404, r1(R30 / S) + ' m', { anchor: 'middle', size: 20, bg: true }));
          k.push(D.label(700, 404, r1(640 / S) + ' m', { anchor: 'middle', size: 20, bg: true, weight: 500 }));
          // 축척 10 m
          k.push(D.line(60, 432, 60 + 10 * S, 432, { color: 'muted', w: 2 }));
          k.push(D.line(60, 425, 60, 439, { color: 'muted', w: 2 }), D.line(60 + 10 * S, 425, 60 + 10 * S, 439, { color: 'muted', w: 2 }));
          k.push(D.label(60 + 10 * S + 12, 432, '10 m', { size: 18, color: 'muted' }));
          // 범례 (선 모양으로 구분)
          k.push(rect(536, 50, 244, 132, 'var(--color-paper-raised)', 'var(--color-line-strong)', 10));
          k.push(D.group([D.line(552, 80, 608, 80, { color: 'sim', w: 2.5, dash: '10 8' })], { opacity: 0.7 }), D.label(620, 80, '30° — 35.3 m', { size: 20 }));
          k.push(D.line(552, 116, 608, 116, { color: 'sim', w: 3.5 }), D.label(620, 116, '45° — 가장 멀리', { size: 20, weight: 500 }));
          k.push(D.group([D.line(552, 152, 608, 152, { color: 'sim', w: 2.5, dash: '16 6 3 6' })], { opacity: 0.7 }), D.label(620, 152, '60° — 35.3 m', { size: 20 }));
          return D.svg(k, { title: '같은 속력 20 m/s, 각도만 다르게', how: '선 모양으로 각도를 구분해요 · 30°와 60°는 같은 곳에 떨어져요 ($g$ = 9.8 m/s²)' });
        }
      },

      /* ── 5장 ── */
      {
        id: 'energy', type: 'formula', title: '에너지는 어디로 가나',
        // 원고 '핵심 개념'은 본문·조건과 같은 말 → 조건 줄로. 셋째 문장(같은 높이 같은 속력)은 '더 알아보기'로 (1920 한 화면)
        body: [
          '{{운동 에너지}}는 속력이 클수록, {{위치 에너지}}는 높이가 높을수록 커요.',
          '올라가면서 속력이 줄면 운동 에너지가 줄고, 줄어든 만큼 위치 에너지가 늘어요. 최고점에서 위치 에너지는 가장 크고 운동 에너지는 가장 작아요(수평 속도가 남아서 0은 아니에요).'
        ],
        eq: [
          { tex: '$E_k = ½ m v^2$ ,  $E_p = m g h$', caption: '운동 에너지 · 중력 위치 에너지 (J, 높이 기준점은 땅)' },
          { tex: '$E = E_k + E_p$ = 일정', caption: '{{역학적 에너지}} 보존' }
        ],
        condition: '공기 저항이 없을 때 — 중력만 일을 해요.',
        more: { title: '더 알아보기 — 실험 카드 ② 값으로 계산', body: [
          '같은 높이를 지날 때는 올라갈 때나 내려올 때나 속력이 같아요.',
          '$m$ = 1 kg, $v_0$ = 10 m/s, $θ$ = 30°, 20 m 절벽, $g$ = 9.8 m/s² → 처음 $E_k$ = 50 J, $E_p$ = 196 J, $E$ = 246 J.',
          '최고점(약 21.3 m)에서 $E_k$ ≈ 37.5 J, $E_p$ ≈ 208.5 J, 합 246 J. 착지 직전 $E_k$ = 246 J, 속력 약 22.2 m/s.',
          '질량 $m$ 은 에너지 값에 비례하지만 궤적에는 영향이 없어요(공기 저항이 없을 때).'
        ] },
        life: ['롤러코스터가 첫 언덕을 지난 뒤 속력이 바뀌는 모습(마찰이 작을 때).', '점프하는 사람이 가장 높은 곳에서 느리게 움직이는 것.'],
        teacherNote: '실험 화면 에너지 막대의 "합 … J" 은 질량 1.0 kg 기준임을 말해 준다(막대 제목 옆 m 표시). 심화 질문: m 을 3 kg 으로 바꾸면 막대 값이 3배.',
        svg: function (D) {
          var top = 140, base = 380, S = (base - top) / 246;
          var cols = [
            { x: 170, K: 50, U: 196, name: '발사 (20 m 절벽 위)' },
            { x: 400, K: 37.5, U: 208.5, name: '최고점 (약 21.3 m)' },
            { x: 630, K: 246, U: 0, name: '착지 직전' }
          ];
          var k = [defs(), D.line(80, top, 780, top, { color: 'muted', w: 2, dash: '6 6' }), D.label(780, top - 18, '합 $E$ = 246 J', { anchor: 'end', size: 20, weight: 500, bg: true })];
          cols.forEach(function (c) {
            var hk = c.K * S, hu = c.U * S;
            k.push(rect(c.x - 40, base - hk, 80, hk, KC, 'var(--color-ink)'));
            if (hu > 0) k.push(rect(c.x - 40, base - hk - hu, 80, hu, 'url(#pe-lp-hatch)', 'var(--color-ink)'));
            k.push(D.label(c.x + 52, base - hk / 2, '$E_k$ ' + c.K + ' J', { size: 20, bg: true }));
            if (hu > 0) k.push(D.label(c.x + 52, base - hk - hu / 2, '$E_p$ ' + c.U + ' J', { size: 20, bg: true }));
            k.push(D.label(c.x, 408, c.name, { anchor: 'middle', size: 20 }));
          });
          k.push(D.line(80, base, 780, base, { color: 'ink', w: 2 }));
          return D.svg(k, { title: '세 장면의 에너지 (실험 카드 ②)', how: '진한 칸 = 운동 에너지 $E_k$ · 빗금 칸 = 위치 에너지 $E_p$ · 막대 꼭대기가 모두 같은 점선 위 — 합이 같아요 ($m$ = 1 kg)' });
        }
      },

      /* ── 6장 ── */
      {
        id: 'g-air', type: 'concept', title: '중력이 달라지면, 공기가 있으면',
        // 원고 핵심 (가)(나)는 본문 두 문장에, 셋째 문장은 조건 줄로 (1920 한 화면)
        body: [
          '사거리와 비행 시간은 $g$ 가 작을수록 커져요. 달의 $g$ 는 지구의 약 1/6 이라 같은 던지기로 약 6배 멀리 가요. 달에는 공기가 없어서 "이상적인" 포물선이 그대로 나타나요.',
          '지구 공기 속에서 가벼운 공은 속도가 쉽게 줄어요. 이때 역학적 에너지는 줄어들고, 사라진 것이 아니라 열로 바뀐 거예요. **총에너지(역학적 에너지 + 열)는 보존**돼요.'
        ],
        eq: [
          { tex: '$R ∝ 1 ÷ g$', caption: '$v_0$, $θ$ 가 같을 때' }
        ],
        condition: '이 단원의 에너지 보존 식은 "중력만 일을 할 때"만 맞아요. 조건을 먼저 확인하는 습관을 가져요.',
        more: { title: '더 알아보기 — 실험 카드 ④ 값', body: [
          '$v_0$ = 10 m/s, 45° → 지구 $R$ ≈ 10.2 m, 달($g$ = 1.62 m/s²) $R$ ≈ 61.7 m 로 약 6배. 달에서 비행 시간은 약 8.7 s.',
          '공기 저항이 있으면 $E$ 가 줄어요: 줄어든 역학적 에너지 = 공기 저항이 한 일의 크기. 총에너지 = 역학적 에너지 + 열 = 일정 [12물리01-05, 정성].'
        ] },
        life: ['아폴로 우주인이 달에서 골프공을 멀리 보낸 장면.', '탁구공은 지구에서 이상 궤적보다 짧게 날아가요.'],
        teacherNote: '공기 저항 조건(없음/쇠공/탁구공)은 실험 화면 ⚙ 설정 › 더 많은 설정에 있다. 필수 아님.',
        svg: function (D) {
          var Rm = 635, Re = Rm * 1.62 / 9.8;   // 달 61.7 m : 지구 10.2 m (g 에 반비례, 약 6배)
          var k = [defs(), D.line(40, 380, 780, 380, { color: 'muted', w: 2 })];
          k.push(D.curve(para(60, 380, Rm, 45), { color: 'sim', w: 3 }));
          k.push(D.curve(para(60, 380, Re, 45, 24), { color: 'muted', w: 3 }));
          k.push(D.ball(60, 380, 9));
          k.push(D.label(378, 196, '달 $g$ = 1.62 m/s²', { anchor: 'middle', bg: true }));
          k.push(D.label(60 + Re + 14, 344, '지구 $g$ = 9.8 m/s²', { size: 20, bg: true, color: 'muted' }));
          k.push(D.dim(60 + Re, 410, 60 + Rm, 410, '약 6배', { off: 0 }));
          k.push(D.label(60 + Re, 436, '10.2 m', { anchor: 'middle', size: 18, color: 'muted' }));
          k.push(D.label(60 + Rm, 436, '61.7 m', { anchor: 'middle', size: 18 }));
          // 작은 상자: 공기가 있으면
          k.push(rect(520, 44, 260, 156, 'var(--color-paper-raised)', 'var(--color-line-strong)', 10));
          k.push(D.label(536, 70, '공기가 있으면', { size: 20, weight: 500 }));
          k.push(D.curve(para(545, 150, 220, 45, 24), { color: 'muted', w: 2, dash: '6 6' }));        // 공기 없음: 최고 높이 55 (y 95)
          k.push(D.path('M545 150 C590 95, 640 100, 672 150', { color: 'sim', w: 2.5 }));          // 공기 있음: 더 낮고(y≈117) 짧고, 내려올 때 더 가파름
          k.push(D.label(650, 182, '에너지 일부 → 열', { anchor: 'middle', size: 18 }));
          return D.svg(k, { title: '같은 공, 같은 $v_0$·45°로 지구와 달에서', how: '진한 선 = 달 · 회갈색 선 = 지구 · 상자: 점선 = 공기 없음, 실선 = 공기 있음' });
        }
      },

      /* ── 7장 ── */
      {
        id: 'misc', type: 'misconception', title: '흔한 오해 4가지',
        items: [
          { claim: '"무거운 공이 더 빨리 떨어져요."', why: '공기 저항이 없으면 질량과 상관없이 같은 높이에서 같은 시간에 떨어져요. 질량은 중력과 관성에 똑같이 들어가 상쇄돼요. 공기 속에서 깃털이 늦는 건 공기 저항 때문이에요.', chapter: 'two-motions' },
          { claim: '"최고점에서는 속도도 0이고 힘도 0이에요."', why: '수직 속도만 0이에요. 옆으로 가는 속도는 그대로고, 중력은 늘 작용해서 가속도는 아래로 $g$ 예요.', chapter: 'split-v' },
          { claim: '"던진 힘이 계속 공을 밀어 줘요."', why: '손을 떠난 뒤에는 던진 방향으로 작용하는 힘이 하나도 없어요. 공은 관성으로 계속 가고, 중력만 아래로 당겨요.', chapter: 'two-motions' },
          { claim: '"각도가 클수록 멀리 가요."', why: '45°를 넘으면 오래 날지만 옆으로 느려져서 오히려 짧아져요. 90°에 가까우면 거의 제자리에 떨어져요.', chapter: 'range' }
        ]
        // 그림 없음: 오해·풀이 카드 2×2 를 전체 폭으로 (그림을 두면 카드가 반 폭이라 1920 한 화면에 안 들어감)
      },

      /* ── 8장 ── */
      {
        id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        body: ['질문을 고르고 **해 보기** 를 누르면 그 실험 상황이 바로 열려요. 먼저 예측하고 ▶ 실행으로 확인해요.'],
        questions: [
          { q: '20 m 절벽에서 옆으로 던진 공과 떨어뜨린 공, 누가 먼저 땅에 닿을까?', simple: false, preset: 0, set: { cmp: true, flash: true, shadow: true }, chapter: 'two-motions' },
          { q: '날아가는 동안 운동 에너지 + 위치 에너지의 합은?', preset: 1, set: { energy: true }, chapter: 'energy' },
          { q: '같은 속력 20 m/s 로 30°와 60°면 누가 더 멀리? (30°를 기록한 뒤 $θ$ 만 60°로)', simple: false, preset: 2, set: { theta: 30 }, chapter: 'range' },
          { q: '달에서 같은 공을 던지면 얼마나 멀리?', simple: false, preset: 3, chapter: 'g-air' },
          { q: '최고점에서 속도와 가속도는?', preset: 4, set: { showV: true, showA: true, topStop: true }, chapter: 'split-v' },
          { q: '(선택) 공의 질량을 3배로 하면 궤적과 에너지는?', simple: false, preset: 2, set: { m: 3, theta: 45, energy: true }, predict: false, chapter: 'energy' },
          { q: '(선택) 탁구공은 공기 속에서 45°가 가장 멀리일까? (35° → 40° → 45° 기록)', simple: false, preset: 2, set: { air: 'pingpong', theta: 35 }, predict: false, chapter: 'g-air' }
        ],
        teacherNote: ['발문: 각도를 바꿔도 착지 속력이 같을까? 같은 v₀·h 면 √(v₀² + 2gh) 로 같다.', '발문: 공기 저항을 켜면 최적 각도는 45°보다 큰가 작은가? (탁구공 20 m/s: 35° 쯤 약 10.4 m, 45° 10.0 m)']
      },

      /* ── 9장 ── */
      {
        id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: ['포물선 운동은 **"수평 등속 + 수직 등가속"** 이고, 중력만 일을 하면 $E_k + E_p$ 는 일정해요.', '자기 점검: "나는 ___ 를 이제 설명할 수 있어요 / 아직 헷갈려요."'],
        quiz: [
          { q: '(개념 확인) 수평으로 던진 공이 땅에 닿을 때까지 걸리는 시간을 정하는 것은?', choices: ['던지는 높이 $h$ (와 $g$)', '처음 속력 $v_0$', '공의 질량 $m$'], answer: '①', why: '떨어지는 시간 $t$ = √(2$h$ ÷ $g$) 에 $v_0$ 와 $m$ 이 없어요. 세게 던지면 멀리 갈 뿐이에요.', chapter: 'two-motions' },
          { q: '(값 계산) 지구($g$ = 10 m/s²로 계산)에서 20 m 절벽 위에서 공을 수평으로 10 m/s 로 던졌어요. 몇 m 앞에 떨어질까요?', answer: '20 m', why: '$t$ = √(2 × 20 ÷ 10) = 2 s, 수평 거리 = 10 × 2 = 20 m. (카드 ① 에서 지구 $g$ 를 10 으로 바꿔 확인)', chapter: 'two-motions' },
          { q: '(오개념 판정) "공이 최고점에서 멈춰 있으니 속도 0, 가속도 0 이다." 맞을까요?', answer: '틀렸다', why: '수직 속도만 0 이고 수평 속도 $v_x$ 는 그대로이며, 가속도는 아래로 $g$ 예요.', chapter: 'split-v' },
          { q: '(심화 선택) 공기 저항이 없을 때 역학적 에너지는 어떻게 되고, 공기 저항이 있으면 줄어든 에너지는 어디로 갔을까요?', answer: '일정하다 / 열로 바뀐다', why: '공기 저항이 있어도 총에너지는 보존돼요(5·6장).', chapter: 'g-air' }
        ],
        svg: function (D) {
          var k = [defs(), D.line(60, 370, 770, 370, { color: 'muted', w: 2 }), D.curve(para(120, 370, 560, 45), { color: 'sim', w: 2.5, dash: '10 8' })];
          var vx = 56;
          [-1, -0.5, 0, 0.5, 1].forEach(function (u) {
            var x = 400 + 280 * u, y = 370 - 140 * (1 - u * u), vy = -u * vx;   // 45°: 기울기 = −u
            k.push(D.ball(x, y, 9));
            k.push(arr(D, x, y, x + vx, y, { kind: 'comp' }));
            if (Math.abs(vy) > 1) k.push(arr(D, x, y, x, y - vy, { kind: 'comp' }));
            k.push(arr(D, x, y, x + vx, y - vy));
          });
          k.push(D.label(400, 186, '$v_x$ 는 모두 같은 길이', { anchor: 'middle', bg: true }));
          k.push(rect(500, 46, 280, 92, 'var(--sim-tint)', 'var(--sim)', 12));
          k.push(D.label(640, 74, '수평 등속 + 수직 등가속', { anchor: 'middle', size: 20, weight: 500 }));
          k.push(D.label(640, 110, '$E_k + E_p$ = 일정', { anchor: 'middle', size: 22 }));
          return D.svg(k, { title: '정리', how: '점선 = 성분 ($v_x$ 그대로, $v_y$ 만 바뀜) · 실선 = 그 순간의 속도' });
        }
      }
    ],
    links: { energy: 'energy', range: 'range', 'split-v': 'split-v', 'two-motions': 'two-motions' }
  });
})();
