/* =====================================================================
   일차원 충돌과 운동량 보존 — 교과 설명 데이터 (R7 1차, UI팀2 B3)
   원고: docs/교과설명/collision-momentum.md (기획A) · 형식: docs/SIMKIT.md §0R7-6
   그림은 인라인 SVG(SimDiagram, viewBox 800×450). 수레 색은 실험 화면과 같은 토큰:
     수레 A(대포·트럭) = --color-rec-1 · 수레 B(포탄·승용차) = --color-rec-2 · 운동 에너지 = --color-q-energy-k
   부호 약속: 오른쪽(→) = + · 왼쪽(←) = −
   ===================================================================== */
(function () {
  'use strict';
  var SK = window.SimKit;
  if (!SK || !SK.lesson) return;

  var CA = 'var(--color-rec-1)', CB = 'var(--color-rec-2)', EK = 'var(--color-q-energy-k)', INK = 'var(--color-ink)', PAPER = 'var(--color-paper-raised)';

  function rect(x, y, w, h, fill, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx === undefined ? 4 : o.rx) + '" style="fill:' + fill +
      (o.stroke ? ';stroke:' + o.stroke + ';stroke-width:' + (o.sw || 2) : '') + (o.dash ? ';stroke-dasharray:' + o.dash : '') + (o.op !== undefined ? ';opacity:' + o.op : '') + '"/>';
  }
  /** 수레: 왼쪽 x · 바닥(바퀴 아래) y · 폭 w · 높이 h · 색 · 이름 */
  function cart(D, x, y, w, h, color, name) {
    var top = y - h - 12;
    return rect(x, top, w, h, color, { rx: 8 }) +
      '<circle cx="' + (x + w * 0.25) + '" cy="' + (y - 6) + '" r="6" style="fill:' + INK + '"/><circle cx="' + (x + w * 0.75) + '" cy="' + (y - 6) + '" r="6" style="fill:' + INK + '"/>' +
      (name ? '<text x="' + (x + w / 2) + '" y="' + (top + h / 2) + '" text-anchor="middle" dominant-baseline="middle" style="font-size:22px;font-weight:500;fill:' + PAPER + '">' + name + '</text>' : '');
  }
  function track(D, x1, x2, y) { return D.line(x1, y, x2, y, { color: 'muted', w: 3 }); }
  /** 가로 막대(운동량·속도 변화) — x0 에서 len(+ 오른쪽, − 왼쪽), 두께 22 */
  function bar(x0, y, len, color) { return rect(Math.min(x0, x0 + len), y - 11, Math.abs(len), 22, color, { rx: 3 }); }

  SK.lesson({
    slug: 'collision-momentum',
    title: '부딪치면 무엇이 그대로일까?',
    standards: [{ code: '12물리01-03', subj: '물리학', text: '작용·반작용과 운동량 보존을 여러 상황에 적용' }],
    simple: ['goal', 'momentum', 'conserve', 'bounce-stick', 'check'],
    chapters: [
      /* 1장 */
      { id: 'goal', type: 'goal', title: '부딪치면 무엇이 그대로일까?',
        question: '같은 질량의 수레가 부딪치면 어떻게 될까? 부딪치기 전과 뒤에 변하지 않는 것은 무엇일까?',
        body: [
          '두 물체가 부딪치면 속도가 서로 크게 바뀌어요. 그래도 **그대로인 것**을 찾으면 충돌을 예측할 수 있어요.',
          '이번 단원에서는 그대로인 것({{운동량}})과 그대로가 아닌 것({{운동 에너지}})을 구분해요. 부딪치는 순간 두 물체가 서로 주는 힘과, 에어백이 힘을 줄이는 이유도 살펴봐요.',
          '교육과정 탐구: 일차원 충돌에서 운동량 보존 확인하기'
        ],
        goals: ['$p$ = $mv$ 와 부호(방향) 쓰기', '충돌 전후 운동량의 합이 같음을 확인하기', '운동 에너지는 튕기느냐에 따라 달라짐을 알기'],
        svg: function (D) {
          return D.svg([
            D.label(30, 80, '부딪치기 전', { weight: 500 }),
            track(D, 120, 760, 160), cart(D, 180, 160, 100, 50, CA, 'A'), cart(D, 480, 160, 100, 50, CB, 'B'),
            D.arrow(230, 82, 310, 82, { kind: 'v', color: 'ink', label: '2 m/s' }), D.label(530, 82, '0', { anchor: 'middle', size: 22 }),
            D.label(400, 235, '그대로인 것은?', { anchor: 'middle', weight: 500, size: 24, color: 'sim', bg: true }),
            D.label(30, 270, '부딪친 뒤', { weight: 500 }),
            track(D, 120, 760, 360), cart(D, 330, 360, 100, 50, CA, 'A'), cart(D, 520, 360, 100, 50, CB, 'B'),
            D.label(380, 282, '0', { anchor: 'middle', size: 22 }), D.arrow(570, 282, 650, 282, { kind: 'v', color: 'ink', label: '2 m/s' })
          ], { title: '마찰 없는 트랙 위 두 수레', how: '위 = 부딪치기 전 · 아래 = 부딪친 뒤 · 같은 질량 1 kg' });
        },
        teacherNote: '1분. 학생이 "속도가 바뀌었다"는 점을 먼저 말하게 한 뒤 "그대로인 것"으로 넘겨요.' },

      /* 2장 */
      { id: 'momentum', type: 'formula', title: '운동량: 움직임의 양',
        body: [
          '무겁고 빠른 물체일수록 멈추기 어려워요. 이 "멈추기 어려운 정도"를 **{{운동량}}**이라고 해요. 운동량은 질량과 속도의 곱이에요.',
          '운동량의 방향은 속도의 방향이에요. 일직선에서는 오른쪽으로 가면 +, 왼쪽으로 가면 −로 나타내요.',
          '속도가 같으면 질량이 큰 쪽이, 질량이 같으면 속도가 큰 쪽이 운동량이 커요. 두 물체의 운동량 합은 부호까지 넣어 더해요: $p$ = $p_1$ + $p_2$'
        ],
        eq: [{ tex: '$p$ = $mv$', caption: '운동량 = 질량 × 속도 (단위 kg·m/s)' }],
        symbols: [{ sym: '$p$', name: '운동량 (방향 있음)', unit: 'kg·m/s' }, { sym: '$m$', name: '질량', unit: 'kg' }, { sym: '$v$', name: '속도 (오른쪽 +, 왼쪽 −)', unit: 'm/s' }],
        svg: function (D) {
          var ax = 520, k = 40, rows = [[110, 1, 2, '+2', CA], [230, 3, 2, '+6', CA], [350, 1, -2, '−2', CB]], out = [];
          out.push(D.line(ax, 60, ax, 400, { color: 'ink', w: 3 }));
          out.push(D.label(ax - 12, 70, '− 왼쪽', { anchor: 'end', size: 18, color: 'muted' }), D.label(ax + 12, 70, '+ 오른쪽', { size: 18, color: 'muted' }));
          rows.forEach(function (r) {
            var w = 50 + 20 * r[1];
            out.push(cart(D, 40, r[0] + 26, w, 34, r[4], r[1] + ' kg'));
            out.push(D.arrow(r[2] > 0 ? 190 : 290, r[0] - 8, r[2] > 0 ? 190 + 50 * r[2] : 290 + 50 * r[2], r[0] - 8, { kind: 'v', color: 'ink' }));
            out.push(D.label(240, r[0] + 22, (r[2] > 0 ? '+' : '−') + Math.abs(r[2]) + ' m/s', { anchor: 'middle', size: 18, color: 'muted' }));
            out.push(bar(ax, r[0], r[1] * r[2] * k, r[2] > 0 ? 'var(--sim)' : 'var(--color-ink-muted)'));
            out.push(D.label(r[2] > 0 ? ax + r[1] * r[2] * k + 12 : ax + r[1] * r[2] * k - 12, r[0], r[3], { anchor: r[2] > 0 ? 'start' : 'end', weight: 500 }));
          });
          return D.svg(out, { title: '운동량 막대 (1칸 = 1 kg·m/s)', how: '막대 길이 = 운동량 크기 · 막대 방향 = 부호(+ 오른쪽, − 왼쪽)' });
        },
        life: ['느린 대형 트럭과 빠른 야구공은 둘 다 멈추기 어려워요.', '같은 속력이어도 달리는 트럭이 자전거보다 멈추기 어려워요.'],
        teacherNote: '부호 약속을 칠판에 한 번 적어요. 3장의 힘·충격량도 같은 부호 약속을 써요.' },

      /* 3장 */
      { id: 'impulse', type: 'formula', title: '충격량과 힘',
        body: [
          '공을 받을 때 손을 뒤로 빼며 받으면 덜 아파요. 공의 운동량이 0이 되는 일은 같은데, 걸리는 시간이 길어졌기 때문이에요.',
          '힘 $F$ 가 시간 $Δt$ 동안 작용하면 **{{충격량}}** $I$ = $FΔt$ 이고, 이것이 운동량의 변화 $Δp$ 와 같아요.',
          '같은 $Δp$ 에서는 $Δt$ 가 길수록 평균 힘이 작아요. 예(카드 ⑤): 1 kg 수레가 2 m/s 로 벽에서 멈추면 $Δp$ = 2 N·s — 딱딱 범퍼(0.01 s)는 약 200 N, 푹신 범퍼(0.2 s)는 약 10 N 이에요.'
        ],
        eq: [{ tex: '$I$ = $FΔt$ = $Δp$', caption: '충격량 = 운동량의 변화 (N·s = kg·m/s)' }, { tex: '$F$ = $Δp$ / $Δt$', caption: '평균 힘' }],
        svg: function (D) {
          function tri(ox, base, hgt) { return '<path d="M' + ox + ' 360L' + (ox + base / 2) + ' ' + (360 - hgt) + 'L' + (ox + base) + ' 360z" style="fill:var(--sim-tint);stroke:var(--sim);stroke-width:3;stroke-linejoin:round"/>'; }
          return D.svg([
            D.label(60, 70, '딱딱한 범퍼', { weight: 500 }),
            D.axis(60, 360, 300, 270, { xl: '시간 $t$', yl: '힘 $F$' }), tri(80, 40, 240),
            D.label(130, 140, '평균 약 200 N', { size: 18 }), D.label(100, 386, '0.01 s', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(440, 70, '푹신한 범퍼', { weight: 500 }),
            D.axis(440, 360, 320, 270, { xl: '시간 $t$', yl: '힘 $F$' }), tri(450, 280, 34),
            D.label(590, 306, '평균 약 10 N', { anchor: 'middle', size: 18 }), D.label(590, 386, '0.2 s', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(400, 428, '색칠한 넓이가 같아요 = 충격량 2 N·s', { anchor: 'middle', weight: 500, color: 'sim' })
          ], { title: '힘-시간 그래프 (넓이 = 충격량)', how: '키 큰 뾰족 모양과 낮고 넓은 모양 — 넓이가 같으면 시간이 길수록 힘이 작아요' });
        },
        life: ['에어백·안전띠·범퍼는 부딪치는 시간을 늘려 힘을 줄여요. (연계 [12물리01-02] 교통안전)', '낙법은 구르면서 시간을 늘리고, 야구 글러브는 뒤로 빼며 받아요.'],
        teacherNote: '벽에서 수레의 운동량이 변한다고 보존이 깨진 것은 아님을 4장에서 다시 짚어요.' },

      /* 4장 */
      { id: 'conserve', type: 'formula', title: '바깥 힘이 없으면 합은 일정',
        body: [
          '부딪칠 때 두 물체가 서로 주는 힘은 크기가 같고 방향이 반대예요. 시간도 같으니 충격량도 크기가 같고 방향이 반대예요.',
          '그래서 A 의 운동량이 줄어든 만큼 B 의 운동량이 늘어나서, **합은 그대로**예요(운동량 보존). 각 물체의 운동량이 같다는 뜻이 아니에요.',
          '붙어 있다가 밀어내는 경우(대포, 로켓)도 마찬가지예요. 예(카드 ④): 처음 합이 0이라 포탄(0.5 kg)이 +4 m/s 로 +2 kg·m/s 를 가지면 대포(2 kg)는 −2 kg·m/s, 곧 뒤로 1 m/s 예요.'
        ],
        eq: [{ tex: '$m_1v_1$ + $m_2v_2$ = $m_1v_1′$ + $m_2v_2′$', caption: '충돌 전 운동량 합 = 충돌 후 운동량 합' }],
        symbols: [{ sym: '$v_1$, $v_2$', name: '충돌 전 속도', unit: 'm/s' }, { sym: '$v_1′$, $v_2′$', name: '충돌 후 속도', unit: 'm/s' }],
        condition: '계에 바깥 힘(알짜 외력)이 없을 때 — 마찰 없는 트랙의 두 수레',
        svg: function (D) {
          var k = 40, x0 = 200;
          return D.svg([
            D.label(30, 80, '충돌', { weight: 500 }),
            D.label(120, 120, '전', { anchor: 'end' }), bar(x0, 120, 2 * k, CA), D.label(x0 + 40, 120, 'A +2', { anchor: 'middle', size: 18, color: PAPER }),
            D.label(330, 120, 'B 0', { size: 20, color: 'muted' }), D.label(560, 120, '합 = +2', { weight: 500, color: 'sim' }),
            D.label(120, 175, '후', { anchor: 'end' }), D.label(x0 - 20, 175, 'A 0', { anchor: 'end', size: 20, color: 'muted' }), bar(x0, 175, 2 * k, CB), D.label(x0 + 40, 175, 'B +2', { anchor: 'middle', size: 18, color: PAPER }),
            D.label(560, 175, '합 = +2', { weight: 500, color: 'sim' }),
            D.line(30, 230, 770, 230, { color: 'muted', w: 1, dash: '4 6' }),
            D.label(30, 270, '분리 (대포)', { weight: 500 }),
            D.label(400, 300, '처음: 둘 다 정지 → 합 0', { anchor: 'middle', size: 18, color: 'muted' }),
            D.line(400, 320, 400, 400, { color: 'ink', w: 3 }),
            bar(400, 360, -2 * k, CA), bar(400, 360, 2 * k, CB),
            D.label(306, 360, '대포 −2', { anchor: 'end', weight: 500 }), D.label(494, 360, '포탄 +2', { weight: 500 }),
            D.label(620, 360, '합 = 0', { weight: 500, color: 'sim' })
          ], { title: '운동량 막대로 본 보존 (1칸 = 1 kg·m/s)', how: '막대가 옮겨 가도 합의 길이는 그대로 · 분리는 −2 와 +2 가 합쳐 0' });
        },
        life: ['총을 쏘면 총이 뒤로 밀리는 반동', '보트에서 뛰어내리면 보트가 뒤로 가요.', '로켓은 가스를 뒤로 뿜어 앞으로 가요.'],
        teacherNote: '"보존"은 "계의 합이 일정"이라는 뜻이에요. 벽 충돌: 수레만 보면 운동량이 바뀌지만 벽(지구)이 반대 방향으로 같은 운동량을 받아요(질량이 커서 속도 변화가 안 보임).' },

      /* 5장 */
      { id: 'bounce-stick', type: 'concept', title: '튕기기와 달라붙기',
        body: [
          '같은 질량의 A(2 m/s)가 정지한 B 에 부딪쳐 **튕기면** 두 수레가 속도를 서로 바꿔요. A 는 서고 B 가 2 m/s 로 가요.',
          '같은 충돌에서 **달라붙으면** 합쳐진 수레가 1 m/s 로 가요. 운동량 합 2 kg·m/s 는 그대로예요.',
          '하지만 운동 에너지는 2 J 에서 1 J 로 줄었어요. 줄어든 에너지는 소리·열·찌그러짐으로 바뀌었어요(총에너지는 보존).',
          '정리: 운동량 합은 튕기기·중간·달라붙기 모두 **그대로**, 운동 에너지 합은 튕기기에서만 그대로이고 나머지는 **줄어들어요**.'
        ],
        eq: [{ tex: '$E_k$ = ½$mv^2$', caption: '운동 에너지 (J)' }, { tex: '$m_1v_1$ + $m_2v_2$ = ($m_1$ + $m_2$)$v′$', caption: '달라붙기' }],
        svg: function (D) {
          var base = 360, k = 110;
          function ebar(x, j, label) { return rect(x, base - j * k, 70, j * k, EK, { rx: 3 }) + D.label(x + 35, base - j * k - 18, label, { anchor: 'middle', size: 20, weight: 500 }); }
          return D.svg([
            D.label(170, 70, '튕기기', { anchor: 'middle', weight: 500 }),
            ebar(90, 2, '2 J'), ebar(180, 2, '2 J'),
            D.label(125, 386, '전', { anchor: 'middle', size: 18, color: 'muted' }), D.label(215, 386, '후', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(170, 420, '운동량 2 → 2 · 에너지 그대로', { anchor: 'middle', size: 18 }),
            D.line(400, 60, 400, 420, { color: 'muted', w: 1, dash: '4 6' }),
            D.label(590, 70, '달라붙기', { anchor: 'middle', weight: 500 }),
            ebar(500, 2, '2 J'), ebar(590, 1, '1 J'),
            rect(590, base - 2 * k, 70, k, 'none', { stroke: 'var(--color-ink-muted)', sw: 2, dash: '6 5', rx: 3 }),
            D.label(672, base - 1.62 * k, '열·소리', { size: 18, color: 'muted' }), D.label(672, base - 1.38 * k, '1 J', { size: 18, color: 'muted' }),
            D.label(535, 386, '전', { anchor: 'middle', size: 18, color: 'muted' }), D.label(625, 386, '후', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(590, 420, '운동량 2 → 2 · 에너지 줄어듦', { anchor: 'middle', size: 18 })
          ], { title: '운동 에너지 합 막대 (같은 질량 1 kg, A 2 m/s)', how: '두 경우 모두 운동량 합은 2 kg·m/s 그대로 · 달라붙으면 에너지 절반이 열·소리로' });
        },
        life: ['당구공 두 개의 충돌은 거의 튕기기(탄성), 찰흙 덩어리가 붙는 충돌은 달라붙기(완전 비탄성)예요.', '자동차 범퍼가 찌그러지며 에너지를 흡수해요.'],
        teacherNote: '카드 ①과 ②를 이어서 해요. 실험 화면의 그래프 탭을 "운동량 → 운동 에너지"로 바꿔 봐요. 중간(반발 계수 e = 0.5, 심화)이면 0.5·1.5 m/s, 1.25 J.' },

      /* 6장 */
      { id: 'action-reaction', type: 'concept', title: '서로 미는 두 힘',
        body: [
          '트럭이 승용차를 밀 때, 승용차도 같은 크기로 트럭을 밀어요. 누가 더 큰 힘을 받느냐는 질문의 답은 **서로 같다**예요({{작용·반작용}}).',
          '힘이 같고 부딪친 시간도 같으니 충격량도 크기가 같아요. 그래서 운동량 변화의 크기도 같아요.',
          '다만 $Δv$ = $Δp$ ÷ $m$ 이라서 질량이 작은 승용차의 속도가 훨씬 크게 바뀌어요. 예(카드 ③): 트럭 3 kg·+2 m/s, 승용차 1 kg·−2 m/s 가 튕기면 트럭 $Δv$ = −2 m/s, 승용차 $Δv$ = +6 m/s 예요.'
        ],
        eq: [{ tex: '$F_{A→B}$ = −$F_{B→A}$', caption: '작용·반작용' }, { tex: '$Δv$ = $Δp$ / $m$', caption: '같은 $Δp$ 면 가벼운 쪽 속도가 크게 바뀜' }],
        svg: function (D) {
          return D.svg([
            track(D, 60, 740, 200),
            cart(D, 230, 200, 170, 96, CA, '트럭 A'), cart(D, 400, 200, 100, 60, CB, 'B'),
            D.arrow(400, 70, 290, 70, { kind: 'f', label: '$F$', ly: 70 }), D.arrow(400, 70, 510, 70, { kind: 'f', label: '$F$', ly: 70 }),
            D.label(400, 36, '같은 크기, 반대 방향', { anchor: 'middle', weight: 500, color: 'warn' }),
            D.label(450, 226, '승용차', { anchor: 'middle', size: 18, color: 'muted' }),
            D.label(400, 270, '속도 변화는 가벼운 쪽이 커요', { anchor: 'middle', weight: 500 }),
            D.line(400, 300, 400, 410, { color: 'ink', w: 3 }),
            D.label(120, 330, '트럭 $Δv$', { size: 20 }), bar(400, 330, -40, CA), D.label(348, 330, '−2', { anchor: 'end', weight: 500 }),
            D.label(120, 385, '승용차 $Δv$', { size: 20 }), bar(400, 385, 120, CB), D.label(532, 385, '+6 m/s', { weight: 500 })
          ], { title: '부딪치는 순간의 두 힘', how: '굵은 화살표 = 서로에게 주는 힘(길이 같음) · 아래 막대 = 속도 변화' });
        },
        life: ['스케이트보드 위에서 벽을 밀면 내가 뒤로 가요.', '가벼운 아이와 무거운 어른이 서로 밀면 힘은 같고, 가벼운 쪽이 더 빨리 밀려나요.'],
        teacherNote: '"더 큰 힘"과 "더 큰 영향($Δv$)"을 구분하게 해요. 카드 ③의 힘-시간 탭에서 두 곡선이 겹쳐요.' },

      /* 7장 */
      { id: 'misc', type: 'misconception', title: '흔한 오해',
        items: [
          { claim: '"큰(무거운) 물체가 더 큰 힘을 줘요."', why: '부딪치는 두 힘은 항상 크기가 같고 방향만 반대예요. 질량에 따라 다른 것은 속도가 바뀌는 정도예요.', chapter: 'action-reaction' },
          { claim: '"붙으면 멈춰요."', why: '붙은 뒤에도 운동량 합은 그대로라서 합쳐진 물체가 계속 움직여요(같은 질량이면 처음 속도의 절반으로).', chapter: 'bounce-stick' },
          { claim: '"운동량이 보존되면 운동 에너지도 보존돼요."', why: '두 보존은 조건이 달라요. 붙는 충돌은 운동량만 보존되고 운동 에너지는 줄어요(열·소리로 바뀜).', chapter: 'bounce-stick' },
          { claim: '"벽에 부딪쳐 멈추면 운동량이 사라져요."', why: '수레의 운동량은 벽(지구)으로 넘어가요. 계 전체로는 보존이에요.', chapter: 'conserve' }
        ] },

      /* 8장 */
      { id: 'check', type: 'check', title: '시뮬레이터에서 확인할 질문',
        questions: [
          { q: '같은 질량의 A(2 m/s)가 멈춘 B와 부딪혀 튕기면?', preset: 0, chapter: 'bounce-stick' },
          { q: '이번엔 달라붙으면?', preset: 1, chapter: 'bounce-stick' },
          { q: '3배 무거운 트럭과 승용차가 정면충돌하면 누가 더 큰 힘을 받을까?', preset: 2, chapter: 'action-reaction' },
          { q: '멈춘 대포가 포탄을 쏘면 대포는?', preset: 3, chapter: 'conserve' },
          { q: '딱딱한 범퍼를 푹신한 범퍼로 바꾸면? (딱딱으로 기록한 뒤 범퍼를 푹신 0.2 s 로 바꿔 한 번 더)', preset: 4, set: { tau: 0.01 }, chapter: 'impulse' },
          { q: '3 kg 수레가 멈춘 1 kg 수레에 달라붙으면 함께 몇 m/s 로 갈까?', preset: 1, set: { m1: 3, m2: 1 }, predict: false, chapter: 'conserve' }
        ],
        teacherNote: 'Q1 이 끝나면 "튕기는 대신 붙으면 에너지 1 J 는 어디로?" → Q2.' },

      /* 9장 */
      { id: 'wrap', type: 'wrap', title: '실험 뒤 정리',
        summary: ['바깥 힘이 없으면 충돌 전후 운동량의 합은 일정하고, 운동 에너지의 합은 튕기는 충돌에서만 일정해요. 부딪친 두 물체가 서로 주는 힘은 항상 크기가 같아요.'],
        quiz: [
          { q: '질량 2 kg 수레가 3 m/s 로 오른쪽으로 가요. 운동량은?', choices: ['+6 kg·m/s', '+1.5 kg·m/s', '−6 kg·m/s'], answer: 1,
            why: '$p$ = $mv$ = 2 × 3, 방향은 오른쪽(+).', chapter: 'momentum' },
          { q: '1 kg 수레 A(+2 m/s)가 정지한 1 kg 수레 B 와 부딪쳐 달라붙었어요. 합쳐진 수레의 속도와 운동 에너지 변화는?', choices: ['1 m/s, 2 J → 1 J', '2 m/s, 2 J 그대로', '1 m/s, 2 J 그대로'], answer: 1,
            why: '운동량 합 2 = (1 + 1)$v′$ 에서 $v′$ = 1 m/s. $E_k$ = ½ × 2 × 1² = 1 J, 줄어든 1 J 은 소리·열로.', chapter: 'bounce-stick' },
          { q: '"무거운 트럭이 가벼운 승용차를 더 큰 힘으로 민다." 맞을까?', choices: ['맞다', '틀리다'], answer: 2,
            why: '작용·반작용으로 두 힘은 크기가 같아요. 달라지는 것은 속도 변화(승용차가 더 크게 바뀜)예요.', chapter: 'action-reaction' },
          { q: '(심화) 같은 충돌에서 푹신한 범퍼가 평균 힘을 작게 하는 이유는?', answer: '충격량은 같고 시간이 길어져서',
            why: '충격량(= 운동량 변화)은 같고 $Δt$ 가 길어지므로 $F$ = $Δp$ ÷ $Δt$ 가 작아요.', chapter: 'impulse' }
        ] }
    ],
    links: { momentum: 'momentum', impulse: 'impulse', conserve: 'conserve', 'bounce-stick': 'bounce-stick', 'action-reaction': 'action-reaction' }
  });
})();
