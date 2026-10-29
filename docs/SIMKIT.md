# SimKit — 공통 틀 사용 설명서 (개발자용, R2 고도화 2차 + R3 디테일 + R4 태블릿·글꼴·아이콘 + R5 세로 배치·예측 창·교사 발표)

> 작성: 에듀테크1(디자인 리드) · 2026-10-28
> 근거: `docs/개선/R1_계획.md` §2(디자인 방향)·§3(A1~A18, H1~H2) · 이전 판: `docs/04_팀장결정서.md`
> 다섯 시뮬레이터는 이 틀 **위에서만** 만든다. `shared/` 를 고칠 일이 생기면 디자인 리드에게 요청한다.
> 바로 동작하는 예제: `sims/_template/index.html` (= `shared/TEMPLATE.html`) — R2 새 API 를 모두 씀.

---

## 0R5. R5 에서 바뀐 것 (2026-10-29, 개발자1 · 팀장 마무리) — 먼저 읽기

> 근거: `docs/개선/R5_계획.md` §2-S. 바뀐 것: **세로 태블릿 배치** · **예측·모드 창(낮게·자리·그림 보기)** · **실험 카드 ✓ 배지** · **교사 발표(표 크게 보기·확인창·자동 예측 토글·헤더 칩)** · **기호 도우미(SK.dim·SK.frac·{{frac:}})** · **허브 교사 토글**.
> 1920×1080·1280×720 처음 화면: `sims/_template` 픽셀 차이 0. 다른 sim 은 예측·모드 창 상자, 고른 카드 배지, 허브는 오른쪽 위 [교사 모드] 버튼 자리만 바뀐다(`_review/R5/개발자1/base/` 와 비교).

### 0R5-1. 세로 태블릿 배치 (820×1180 등 — `(orientation: portrait) and (min-width: 601px)`)
- `tokens.css`: `--u = 100vw/1290`(실험 화면 1250u 가 전폭, 좌우 20u) · 무대 = 창 전체(`--space-slide-w/h = 100vw/100vh`) · `--extra = clamp(0, (100vh − 1664u)/2, 200u)` (고정 1144u + 패널 최소 520u). 820×1180 → u 0.636px, extra ≈ 62px. 16:9·가로 태블릿은 이 쿼리에 안 걸린다.
- 좌표(u, `--x: 20u`, 내용 폭 1250, `--panel-top = 916u + extra`):

| 요소 | 세로 자리 | 비고 |
|---|---|---|
| `.sim-top` | x20 y0 w1250 h72 | 제목 1줄(32u). 오른쪽 [수업 정보]·[도움말]·[전체 화면]은 아이콘만(이름은 aria-label), [수업 안내(교사)]는 글자 그대로 |
| `.sim-task` | x20 y72 w1250 h60 | 지금 단계만 이름, 나머지는 번호 원. 문장·'오늘 알아볼 것'은 한 줄(…) |
| `.sim-stage` | x20 y140 w1250 h`660u+extra` | `SK.view` 그대로(fit·grow → `view.extra`) |
| `.sim-band` · `.rec-chip` | y`812+extra` · 띠 w1010 · 칩 x1042 w228 | 높이 88 그대로 |
| `.sim-panel`·`.rec-big`·`.think-board` | x20 y`916+extra` w1250 h`100vh − 228u − (916u+extra)` | **패널 안은 2열**(`.panel-sec` 가 칸, 그 밖 요소·더 많은 설정은 2칸) |
| `.sim-bar` | x20 y`100vh − 212u` h212 | 1단 실험 카드(112u) · 2단 [▶ 실행 240u][뒤로][앞으로][속도][기본값][그 밖] |
| T 로 접기 | 실험 화면 h`100vh − 368u` | 패널·띠 자리까지 |
| 예측·모드 창 | **패널 사각형**, 어둡기 없음 | 실험 화면을 가리지 않는다 · [그림 보기] 숨김 |
| `.rec-full` | x20 y140 w1250 h`100vh − 368u` | 표 크게 보기 |

  ※ 계획 표의 막대 200u·카드 88u 는 카드 이름 2줄 + 값 줄(최소 112u)이 들어가지 않아 **212u·112u** 로 했다(패널 바닥 228u).
- 휴대전화(폭 600 이하)만 위 안내 띠 '화면이 좁아요 / 가로로 돌리면 더 크게 볼 수 있어요' + ✕(sessionStorage `sk.narrowWarnOff`, 그 세션 동안 숨김). 아이패드 세로는 띠 없음.
- 키 조작은 세로에서도 그대로(마크업 같음, CSS 만 다름) — 1~5·Space·←/→·T·F·Esc·V.
- **시뮬레이터가 할 일**: 세로에서 그림이 위에 붙고 아래가 비면 `cfg.onResize(view)` 에서 `view.extra` 로 `offsetY`·축척 k 를 정한다(R4 b). sim css 에서 `1310u`·`570u`(오른쪽 칸 자리)를 직접 쓴 곳이 있으면 세로 쿼리에서 다시 확인.

### 0R5-2. `SK.px` 는 프로브로 잰다
- 무대에 `.u-probe`(폭 1000u, 보이지 않음)를 하나 두고 `폭/1000` 을 u 로 쓴다. 창 크기가 바뀌면 다시 잰다. 세로에서는 '무대 폭/1920' 이 u 가 아니기 때문.
- 확인값: 1920×1080·1280×720·1180×820 → `SK.px(1920)` = 무대 폭 · 820×1180 → `SK.px(1290)` = 820.

### 0R5-3. 예측 창 · 모드 창
```js
SK.predict({ question, choices, ...,
  place: 'top',                 // 'bottom'(기본) | 'top' — 창을 실험 화면 위쪽에 (하늘이 빈 장면, x축 눈금을 보여야 할 때)
  numeric: { label, unit, min, max,
    example: null,              // 예시값 없음 → placeholder '숫자만' (niceExample 이 정답 근처 값을 보여 주지 않게)
    showRange: false } });      // '0~65 m 사이' 범위 글 숨김
SK.chooseMode({ modes, place: 'top' });   // 모드 창도 같은 옵션
SK.choosingMode();                        // 모드 창이 떠 있나 (예전 SK.el.stage.querySelector('.mode-layer') 대신)
```
- 층(`.predict-layer`·`.mode-layer`)은 **`SK.el.slide` 의 자식**(예전 stage). 가로에서는 실험 화면 테두리 안쪽 사각형(예전 `inset:0` 과 같은 상자), T 로 접으면 1840×760+extra, 세로는 패널 사각형. ⚠ `SK.el.stage.querySelector('.predict-layer')` 로 찾던 코드는 `document.querySelector` 로. `.mode-layer` 는 호환용 보이지 않는 표시를 stage 에 남겨 두었다(새 코드는 `SK.choosingMode()`).
- 창 높이 상한 **42%**(실험 화면 기준, 1920 에서 ≈276u) · 보기 3개 이상(`.is-many`)·그림(`.has-figure`) 58% · 모드 창 48%. 넘치면 가운데만 스크롤되고 [예측하기] 줄은 바닥에 붙어 늘 보인다(`.predict__foot` sticky). **sim 은 질문·info 를 줄여 상한 안에 들어오게** — 지금 넘치는 것: projectile 숫자 창 294u(상한 268u), collision 402u(374u). 패딩 12u 20u, 질문 30u, 보기 높이 auto, 손들기 수 버튼은 ✕ 왼쪽 위 고정(교사 모드에서 버튼이 있으면 `.predict__top` 오른쪽 여백 260u — 한 줄 질문이 버튼 밑으로 안 들어감, 팀장 R5).
- **[그림 보기]**(`.predict__peek`): 층 오른쪽 위(창이 top 이면 오른쪽 아래)에 떠 있는 버튼. 누르고 있는 동안 또는 **V 키를 누르는 동안** 층 `.is-peek` → 어둡기 0, 창 `filter: opacity(.06)`. 떼면 돌아온다. sim 코드 0줄. (계획의 'foot 왼쪽' 은 foot 이 두 줄로 꺾여 창이 80u 커져서 창 밖으로 옮김 — 숫자칸에 커서가 있을 때 V 는 글자 입력)
- 고르기 전 힌트 '보기를 고르면 눌러져요', 고른 뒤 '고른 다음 ▶ 실행으로 확인해요'.

### 0R5-4. 실험 카드
- 이름 `.preset-card__name` = grid `[번호 | 제목]`(둘째 줄도 제목 시작에 맞춤), `text-wrap: balance` 제거, 2줄 높이 고정 그대로.
- 고른 카드 ✓ 는 값 줄 앞 글자가 아니라 **오른쪽 위 원형 배지 28u**(`.preset-card[aria-pressed="true"]::after` 바탕 primary + `::before` --ico-check 종이색). 카드 모서리에 8u 걸쳐 이름·값 줄 폭을 먹지 않는다. sim css 에서 `.preset-card::before/::after` 를 쓰지 말 것.

### 0R5-5. 교사 발표
- 헤더(교사 모드): 과목 칩 + **첫 성취기준 코드** + **'외 N개'**(누르면 수업 정보 팝업을 열고 성취기준 줄에 포커스·잠깐 강조). 제목 최대 560u(= 760u − [수업 안내(교사)] 200u).
- **표 크게 보기**: 기록 큰 판 머리 `[⤢ 표 크게 보기]` → `.rec-full`(무대 자식, x40 y140 1250×760+extra, z 30 — 실험 화면+하단 띠 자리) 에 **모든 열**, 글자 28u, 바뀐 값 굵게. `Esc`·[닫기]. 코드: `SK.showRecordsFull(true|false)` (= 계획의 `renderRecords({full:true})`). 기록이 바뀌면 열린 채로 다시 그린다.
- 카드 전환 확인창: **기록이 있고, 다른 카드이고, 바뀌는 값(`p.values` 중 지금과 다른 것)이 2개 이상일 때만**. `record: false` 인 키(렌즈 `screenX`, 광선 토글 등 기록에 안 남는 값)는 세지 않는다(팀장 R5) — 렌즈 카드 ③(s 30→15, type·screenX 는 record:false)은 묻지 않는다. 문구 '기록 N개는 그대로 남아요 · 값 M개가 바뀌어요', 버튼 [취소] / [이 카드로 바꾸기].
- 수업 정보 팝업(교사 모드)에 **'카드 바꿀 때 예측 창 자동으로 띄우기'** 켬/끔(= `cfg.autoPredict`). localStorage `sk.autoPredict` 에 저장, **교사 모드가 켜질 때만** 읽는다(학생 화면은 sim 기본값). 수업 안내 서랍의 같은 줄과 함께 바뀐다.
- 수업 안내(교사) 서랍 폭 900u → **560u**, 스크림 없음(열린 채 실험 화면 조작 가능). 도움말 서랍(`.drawer--help`)은 그대로.

### 0R5-6. 기호 도우미 (R4 과제 c)
```js
// 치수선: 양끝 채운 삼각 화살촉 + 가운데 라벨(종이 배경). 가로선은 위, 세로선은 오른쪽에 라벨 (side 로 바꿈)
SK.dim(ctx, x1, y, x2, y, { label: '$L$ = 2.0 m', size: 22, head: 10, lw: 2, color: '--color-ink-muted', side: 'below', ends: 8 });
// 가로선 분수: y = 가로선 높이, 반환 = 폭 (다음 글자 x += 폭)
var x = 40 + SK.text(ctx, '$Δy$ = ', 40, 60, { size: 26 });   // 그리스 글자는 유니코드로(\Delta 표기는 없음)
x += SK.frac(ctx, '$λL$', '$d$', x, 60, { size: 26 });
```
```js
// HTML(rich 를 거치는 모든 글: 예측 질문·패널 해설·개념 카드·think…)
'줄무늬 간격 $Δy$ = {{frac:$λL$|$d$}}'   // SK.setText·SK.say 도 됨 · → <span class="frac"><span class="frac__n">λL</span><span class="frac__d">d</span></span>
```
- 글 속 '÷'·'(그림은 줄임)'·'←→' 글자 화살표는 이것으로 바꾼다(D2·D3). plain() 은 `(λL)/d` 로 읽는다.
- `icons.js` 추가: `tri-left`·`tri-right`(채운 삼각 — 캔버스 손잡이 `SK.drawIcon(ctx,'tri-left',x,y,20)`), `lock`, `eye`.
- 글자 하한 감사: 콘솔에서 `SimKit.audit.smallText()` (기본 22) → 다음 두 프레임에 그린 캔버스 글자 중 22 미만을 자리(파일:줄)별로 `console.table`. `SK.font` 에 하한은 넣지 않았다(1920 픽셀 회귀 방지) — 각 sim 이 목록을 보고 22 로 올리거나 라벨을 줄인다. (HTML 안 SVG 글자 `font:20px`·`txt(...,{size:20})` 는 감사에 안 잡히니 grep 으로.)

### 0R5-7. 허브 (`index.html`)
- 오른쪽 위 [키보드 조작 안내] 옆 **[교사 모드 끔/켬]**(aria-pressed): 켜면 `html.is-teacher`(카드 아래 성취기준이 칩으로 보임) + 모든 [열기]·보조 링크 href 에 `teacher=1`. localStorage `hub.teacher`. URL `?teacher=1` 이면 켜진 채 시작.
- 세로(601 이상): 카드 2열, 카드 높이는 내용만큼, 카드 칸 안에서 스크롤. 가로 4:3(1180×820·1024×768): 제목 아래·카드 아래 24u, 남는 세로는 위·아래로 똑같이(가운데 모음). [열기] 는 다섯 장 모두 같은 y(보조 링크 자리 44u 유지).

### 0R5-8. 시뮬레이터 개발자 반영 목록 (D1~D3)
1. 예측 창 높이: `SK.predict` 질문·info 를 줄여 42% 안으로, 장면에 따라 `place:'top'`. 숫자 예측은 `example:null, showRange:false` 검토(정답 암시).
2. `SK.el.stage.querySelector('.mode-layer'|'.predict-layer')` → `SK.choosingMode()`·`SK.predicting()` (slit `double-slit-quantum.js:852`).
3. 세로 820×1180 캡처: 그림 축척·`offsetY`(view.extra), 캔버스 위 HTML 조각 위치, 끌기 좌표(`view.toLogical`).
4. 글 속 ÷·←→ → `SK.dim`·`SK.frac`·`{{frac:}}`, 손잡이 ◂▸ → `SK.drawIcon('tri-left'/'tri-right')`.
5. `SimKit.audit.smallText()` 0건 만들기(22 미만 → 22, 자리가 모자라면 라벨 수를 줄인다).
6. 카드 이름 2줄 안(번호 열 뒤 폭 기준) — ✓ 배지는 이제 폭을 먹지 않는다.

---

## 0R4. R4 에서 바뀐 것 (2026-10-28, 개발자1) — 먼저 읽기

> 근거: `docs/개선/R4_계획.md` §1~§4. 바뀐 것 네 가지: **태블릿 세로 여유** · **캔버스 수식 글자(SK.text)** · **SVG 아이콘** · **글꼴 에스코어 드림 3·4·5**.
> 하위 호환: 아직 새 API 를 안 쓰는 시뮬레이터도 깨지지 않는다(아래 0R4-6). 예제: `sims/_template/index.html`.

### 0R4-1. 불러오는 순서 (icons.js 추가)
```html
<link rel="stylesheet" href="../../shared/fonts.css">   <!-- 에스코어 드림 OTF 3개 -->
<link rel="stylesheet" href="../../shared/tokens.css">
<link rel="stylesheet" href="../../shared/base.css">
<link rel="stylesheet" href="../../shared/shell.css">
<script src="../../shared/icons.js"></script>          <!-- R4: window.SimIcons (sim.js 보다 앞) -->
<script src="../../shared/sim.js"></script>
<script src="sim.js"></script>
```
`icons.js` 줄이 없으면 `sim.js` 가 읽는 중에 스스로 끼워 넣는다(임시 호환). 각 시뮬레이터는 줄을 직접 넣는다.

### 0R4-2. 태블릿 배치 — `--extra` (16:9 보다 세로가 긴 화면)
- `tokens.css`: `@media (max-aspect-ratio: 16/9)` 에서 `--u = 100vw/1920`, `--extra = clamp(0px, 100vh − 1080u, 440u)`. **1920×1080·1280×720 은 `--extra: 0` → 예전과 픽셀까지 같다.** 1180×820 ≈ 254u, 1024×768 ≈ 360u, 세로 화면은 440u 에서 멈추고 나머지는 위아래 띠.
- §2 그림의 각주: **실험 화면 높이 660u+extra · 오른쪽 칸 760u+extra · 하단 띠·기록 칩 `y812+extra` · 하단 막대 `y916+extra`.** 띠·막대 높이는 그대로. 접힌 화면(T) 760u+extra. 허브는 카드 칸(1fr)이 늘어난다.
- 무대 안 HTML 조각(stage-corner·예측 창·모드 창·토스트)은 무대 상자 기준이라 손댈 것 없음.
- 시뮬레이터 css 에서 무대 높이 기준 숫자(`660 * var(--u)`)를 직접 썼다면 `+ var(--extra)` 를 붙인다.

**캔버스(`SK.view`, stageFit)** — 축척은 그대로(`min`), 그림은 위에 붙고(`oy = 0`) 남는 세로는 알려 주기만 한다.

| 값 | 뜻 (논리 단위) | 16:9 |
|---|---|---|
| `view.w`·`view.h` | 설계값 그대로 (1250×660 또는 ×700) — 바닥·중심선 계산은 지금처럼 | 같음 |
| `view.hFull` | 캔버스 논리 높이 전체 = `ch / scale` | `= h` |
| `view.extra` | `hFull − h` (세로 여유) · `SK.stageExtra()` 와 같음 | 0 |
| `view.offsetY` | **시뮬레이터가 `onResize` 에서 정한다.** 그리기 전체와 `toLogical` 이 이만큼 아래로 | 0 |
| `view.toPx(x, y)` | 논리 좌표 → 무대 상자 기준 CSS px (offsetY 반영 — 무대 위 HTML 조각 위치용) | |

```js
SK.init({ …, onResize: function (view) { view.offsetY = view.extra; } });     // 바닥을 아래에 붙임(포물선) — 하늘이 y = −extra 까지
SK.init({ …, onResize: function (view) { view.offsetY = view.extra / 2; } }); // 광축·트랙·중심 천체를 가운데로
// 그리기: 넓어진 부분은 y 범위 [−offsetY, h + extra − offsetY]. 모눈은 for (y = GY; y >= −view.offsetY; y -= step)
// 칩에 안 가리는 범위: var ins = SK.stageInset(); ins.yTop ~ ins.yBottom (offsetY 반영된 그리기 좌표, 예전 top/bottom 그대로 있음)
// 예전 가운데 맞춤이 필요하면 SK.init({ stageGrow: false }) (또는 SK.canvas(el, {grow:false}))
```
- `view.onResize` 를 직접 넣었다면 그 안에서 `offsetY` 를 정하면 된다(resize 뒤 다시 적용됨). `view.oy` 를 써서 HTML 을 붙이던 곳은 `view.toPx()` 로.
- 하단 띠·패널 캔버스(`SK.graph`, 자체 띠 캔버스)는 크기가 그대로라 손댈 것 없음.

### 0R4-3. 캔버스 글자 — `SK.text` (수식 표기 `$…$`)

```js
SK.font(weight, size, kind)          // ctx.font 문자열. weight 300|400|500(그 이상은 500), kind 'sans'(에스코어) | 'math' | 'math-italic'
SK.text(ctx, str, x, y, o)           // 한 줄. 반환 = 폭. o: {size:22, weight:400, color:'--토큰'(없으면 지금 fillStyle), align:'left|center|right',
                                     //   baseline:'middle'(기본)|'alphabetic'|'top'|'bottom', bg:true|'--토큰'(라벨 칩), halo:'--토큰', tabular:false, font:'원래 ctx.font'}
SK.measure(ctx, str, o)              // {w, h} — 같은 규칙으로 폭만
SK.sym(ctx, 'v_0', x, y, o)          // = SK.text(ctx, '$v_0$', …)
SK.num(ctx, '14.1', x, y, {tabular:true})   // '0' 폭 칸에 한 자씩 (에스코어는 숫자 폭이 같아 보통 불필요 — 대체 글꼴 대비)
SK.drawIcon(ctx, 'help', x, y, 28, {color:'--color-primary'})   // 캔버스 안 아이콘(가운데 기준)
// 예: SK.text(ctx, '처음 속력 $v_0$ = ' + v + ' m/s', 40, 60, {size: 24, weight: 500});  SK.sym(ctx, 'Δy', x, y, {size: 22, align: 'center', bg: true});
```
**마크업 규칙** (캔버스·HTML 공통 — HTML 은 `rich()`/라벨·토스트·상태 칩·계기판·변수 symbol 이 같은 표기를 받음)

| 쓰기 | 그려짐 | 규칙 |
|---|---|---|
| `$v_0$` `$v_x$` `$v_y$` `$m_1$` `$E_k$` | v₀ vₓ v_y m₁ Eₖ | `_` 다음 한 글자 또는 `{…}` 가 아래첨자(0.7배, 기준선 +0.22em). 숫자 첨자는 정체, 한 글자 첨자(x·y·k)는 이탤릭 |
| `$v_{esc}$` `$v_{max}$` | v_esc | 여러 글자 첨자는 정체 |
| `$T^2$` `$a^3$` `$s'$` | T² a³ s′ | `^` 위첨자(0.7배, −0.45em). `'` 는 프라임 |
| `$λ$` `$θ$` `$ω$` | 이탤릭 | 그리스 소문자 = 변수 → 이탤릭 |
| `$Δy$` `$Δp$` | Δ 정체 + y 이탤릭 | 그리스 대문자(Δ Σ)는 정체 |
| `$v_0$ = 20 m/s` | | `$` 밖은 에스코어. 숫자·단위(m, s, kg, N, J, cm, nm)·`=` `+` `−` `×` `½` 는 `$` 밖에 |
| `● 기록 1` | 그대로 | 기록 기호 ●▲■◆★ 는 글자 |

- 수식 글꼴: `--font-math`(Times New Roman → Cambria → … serif, 시스템 글꼴) 이탤릭 400, 에스코어보다 1.1배. 이탤릭 다음 정체 사이 0.06em 자동.
- **금지: 유니코드 아래첨자(`₀ ₁ ₂ ₓ ᵧ`) 를 캔버스·라벨 문자열에 직접 쓰지 않는다** → `$v_0$`. 에스코어에 `ₓ ᵧ` 글리프가 없어 다른 글꼴로 섞인다. (HTML 의 예전 `v₀` 는 동작은 하지만 새로 쓰지 말 것.)
- `SK.arrow(…, {label:'$v_x$'})` · `SK.placeLabel(ctx, [{text:'$v_0$ 20 m/s'}])` · `SK.graph` 축 이름·범례도 같은 표기를 받는다(겉 API 그대로, 라벨 굵기 500).
- 변수·계기판 기호: `addVar({symbol:'v_0'})` · `meters([{symbol:'v_y'}])` — `_`·`^` 가 있으면 수식으로(`'$v_0$'` 도 됨). 표 머리·aria 에는 `v₀` 글자로 바뀌어 들어간다(`SK.plainMath`).
- 글꼴 준비: `SK.fontsReady`(Promise) — 첫 프레임은 글꼴이 준비된 뒤(최대 1.5초) 시작, 늦게 오면 `SK.redraw()` 가 한 번 더 그린다. 시뮬레이터 자체 캔버스(띠·패널)는 `SK.fontsReady.then(draw)` 또는 `SK.redraw` 뒤 다시 그리기.
- 5종의 글꼴 상수(`FONT`·`SERIF`·`FS/FN`·`font()`·`fontNum()`, `'Pretendard'`·`'Noto Serif KR'` 이름)는 **모두 `SK.font()`/`SK.text()` 로 바꾼다** — Pretendard·Noto Serif KR 파일은 지웠다.

### 0R4-4. SVG 아이콘 — `shared/icons.js`
목록(24×24, 선 2, round, currentColor): `play ▶` `pause ⏸` `replay ↻` `reset ↺` `step-back ◀` `step-fwd` `chev-right ▸` `chev-left` `chev-down ▾` `chev-up ▴` `arrow-left ←` `arrow-right` `arrow-down ↓` `arrow-up ↑` `arrow-ne ↗` `close ✕ ✗` `check ✓` `bolt ⚡` `help ?` `expand ⤢` `more ⋯` `warn` `info`.
글자로 남기는 것: `→`(값 변화·문장) · `×`(곱셈·속도 ×2) · `● ▲ ■ ◆ ★`(기록 기호) · `½ ² ³ °` · `△ ⓘ ✋`.

```js
SK.icon('play', {size:'sm'|'md'|'lg', cls:'', label:'실행'})   // SVG 요소 (label 없으면 aria-hidden). h() 의 자식으로 바로
SK.iconHTML('chev-right')                                        // 문자열 (innerHTML·템플릿)
SK.iconPath('help')                                              // 캔버스 Path2D 용 d 문자열 · SK.drawIcon(ctx, name, x, y, size, {color})
SK.iconify(el)               // el 안 텍스트의 맨 앞/맨 뒤 글자 기호만 아이콘으로 ('? 도움말' '다음 ▸' '✕'). 가운데 '10 → 20' 은 그대로
SK.iconify(el, {all:true})   // 문장 가운데 ▶·↻ 도 (→ × ? 제외) — '아래 ▶ 실행을 눌러요'
SK.setText(el, '해설 보기 ▾') // textContent 대신 — 글 + $수식$ + 아이콘, 같은 글이면 건드리지 않음
SK.btn(label, cls, onClick, attrs)   // 공통 버튼 (label 의 글자 기호는 자동 아이콘)
SimIcons.html('chev-right')  // SimKit 없는 페이지(허브)
```
- **크기**: 글자 옆 아이콘은 크기를 안 주면 **부모 글자 1em**. 범례·칩 안 `sm`(20u), 보통 `md`(24u), 캔버스 안 버튼·주 버튼 `lg`(32u).
- **정렬**: 버튼·칩은 이미 `inline-flex; align-items:center`. 버튼 안 아이콘과 글 간격 8u(`ico--lead`/`ico--trail` 이 gap 12u 에서 4u 뺌). 본문 글 속은 `vertical-align: -0.12em`. **아이콘만 있는 버튼(✕)은 `aria-label` 필수.** `display:grid` 상자 안에서는 아이콘+글을 `<span>` 하나로 묶는다(그리드 칸이 갈라짐).
- **CSS `content:` 기호**: 글자 대신 마스크 — `content:""; width:1em; height:1em; background-color: currentColor; mask: var(--ico-chev-down) center/contain no-repeat`. 토큰 `--ico-chev-down` `--ico-chev-up` `--ico-chev-right` `--ico-check` `--ico-bolt`(tokens.css, 데이터 URI — file:// 동작). 공통의 펼치기/접기·해설 보기·힌트·메뉴 ✓·고른 카드 ✓ 는 이미 바꿨다.
- 외부 SVG 파일·fetch 금지(JS 문자열 내장).

### 0R4-5. 글꼴 — 에스코어 드림 3·4·5 (S-Core Dream)
- `fonts.css`: `font-family: 'S-Core Dream'` 300(`SCDream3.otf`)·400(`SCDream4.otf`)·500(`SCDream5.otf`), `format('opentype')`. **라이선스: 공식 OTF 원본 그대로 — woff/woff2 변환·subset·글꼴 이름 수정 금지.** 원문 `shared/fonts/LICENSE_SCDream.txt`. 출처 표기: 허브 아래 '글꼴: 에스코어 드림 (S-Core)' · README.
- 토큰: `--font-sans` = 에스코어 → 맑은 고딕 → …, `--font-serif`·`--font-num` = `var(--font-sans)`(명조 없음), **`--font-math`** = 물리 기호 이탤릭 세리프(시스템).

| 쓰임 | 굵기 | 비고 |
|---|---|---|
| 본문·표 셀·변수 라벨·설명 | 400 | `body` 기본 |
| 24u 이상 보조 글: 허브 부제 small · 도움말 본문 · 수업 정보 dd · 해설 '왜 그럴까?' 본문 | 300 (`--font-weight-light`) | **22u 이하 글은 300 금지**(눈금 라벨 등 400) |
| 제목·버튼·칩·지금 할 일·계기판 숫자·강조 `b` | 500 | `--font-weight-semibold/bold/black` 은 모두 500 으로 바뀜 — 위계는 크기·색 |
| 캔버스 | 라벨 400 · 강조/제목 500 · 눈금 400 | `SK.font(400|500, 22|24|26)` 만 |
| 물리 기호 `.var__sym` `.meter__label i` `.sym` | `--font-math` italic 400 | `<i class="sym">v<sub>0</sub></i>` (rich 가 `$v_0$` 를 바꿔 줌) |

- **600·700·800·900 을 숫자로 쓰지 않는다**(가짜 굵게가 생김 → `html { font-synthesis: style }` 로 막아 둠). 검사: `grep -nE "font(-weight)?: *[6-9]00|'[6-9]00 |font\([6-9]00" sims` = 0.
- 에스코어는 Pretendard 보다 글자 폭이 넓다(숫자 0.61em). 넘치면 **문구를 줄이지 말고** 7단계 안에서 한 단계 내리거나 폭을 조정, 그래도 안 되면 팀장과 상의. 공통에서는 하단 막대 버튼 좌우 여백 16→12u 로 실험 카드 폭을 지켰다. 패널 범례(⚡·↻)는 두 줄이 된다.

### 0R4-6. 하위 호환 · 시뮬레이터가 할 일 (개발자2·3 · 개발자1 projectile)
- 그대로 동작: 예전 `ctx.font='700 …Pretendard'` 는 맑은 고딕으로 보일 뿐 깨지지 않는다 · `view.w/h` · `stageInset().top/bottom` · `SK.px` · `toLogical`(offsetY 0 이면 예전과 같음) · 유니코드 `v₀` · 글자 기호 버튼.
- 할 일 체크리스트
  1. `index.html` 에 `<script src="../../shared/icons.js">` (sim.js 앞).
  2. `onResize` 에서 `view.offsetY` (R4_계획 §1-4 표: projectile `extra` · slit/collision/orbit/lens `extra/2`) + 넓어진 부분 그리기(모눈·스크린·화면 밖 판정 `hFull`) + `view.oy` 로 붙인 HTML 은 `view.toPx`.
  3. 캔버스 글자 전부 `SK.text`/`SK.font` — 기호는 `$…$`, 유니코드 아래첨자 0건, 굵기 500 이하.
  4. 자체 HTML·CSS 의 글자 기호(▾ ✓ ▸ ↻ …)는 `SK.iconify(root)`·`SK.setText`·`SK.icon`, CSS `content:` 는 `--ico-*` 마스크.
  5. css 의 600/700/800/900 숫자 → 500(토큰은 이미 500). `--font-serif` 이탤릭으로 기호를 쓰던 곳은 `--font-math`.
  6. 1920·1280 회귀 0, 1180·1024 빈 띠 0, 끌기 위치 맞음, 콘솔 오류 0.

### 0R4-7. 팀장 마무리에서 공통 틀에 더한 것 (2026-10-28 밤 · 5종 모두 반영 끝)
- **유니코드 아래첨자 자동 변환** `SK.normMath`: `rich()`·`mathNodes`·`SK.text` 가 `$…$` 밖의 `v₀ m₁ vₓ vᵧ v₁′` 를 `$v_0$` 로 바꿔 그린다. 그래서 실험 카드 `changes/fixed`, 개념 `formula/symbols/live`, 용어 `def`, 기록 표 머리, 상태 칩, 토글 `onText/offText` 가 모두 이탤릭 세리프+아래첨자. 새 글은 그래도 `$…$` 로 쓴다(표기 한 가지).
- 상태 칩(`status()` 배열)·기록 표 열 이름·`SK.guide` rows/sections 도 `rich`+`iconify` 를 거친다 (projectile 의 `mathify()` 는 자체 교사 서랍 HTML 용으로만 남음).
- `--ico-close` 마스크 토큰 추가(렌즈의 `--lens-ico-close` 대체). `addToggle` 상태 글은 `setText`(✓ 아이콘).
- 허브 카드: `max-height: 700u` + 칸 가운데 정렬 — 16:9 는 그대로, 세로가 긴 화면에서 카드 속이 비지 않는다.
- 캔버스 축 제목처럼 **왼쪽 여백(`view.ox`)이 0 인 태블릿에서만** 자리를 바꿔야 하면 `view.ox / view.scale` 로 판정한다(projectile y축 제목 예: 16:9 세로 제목 · 태블릿 가로 제목).
- 남겨 둔 글자 기호: 기록 구분 `●▲■◆★`(허브 배지·기록 표·속력 막대 범례)와 값 변화 `→`. 이 둘은 내용 기호라 아이콘으로 바꾸지 않는다.

---

## 0R3. R3 디테일 디자인에서 바뀐 것 (2026-10-28, 개발자1) — 먼저 읽기

> 근거: `docs/개선/R3_디테일디자인.md` §2·§3-1. 뼈대는 그대로, 디테일만. 아래 **디테일 규칙**은 5종 모두 지킨다.

### 0R3-1. 디테일 규칙
1. **글자 크기 7단계만**: caption 22 · meta 24 · control 26 · body 28 · h3 32 · title 34/40 · meter 56 (u). 캔버스 글자도 22/24/26 중 하나, 제목만 명조.
2. **간격은 4u 배수**. 섹션 사이 `--space-5`(24u), 변수 행 사이 `--space-4`, 눈금 줄과 다음 요소 사이 `--space-4`.
3. **높이·모서리**: 주 버튼 72u, 보조 버튼·칩 토글 56u(`--space-btn-h-sm`), 칩 36u, 캔버스 안 버튼 44u. 카드·버튼·입력 `--radius-md`, 칩·알약 `--radius-pill`, 캔버스 안 상자 8u.
4. **줄바꿈**: `body` 는 이미 `word-break: keep-all`. 제목·질문·카드 이름 `text-wrap: balance`(`.predict__q` `.preset-card__title` `.drawer__head h2` 는 공통에서 적용), 본문 단락 `text-wrap: pretty`. 기호·숫자 뒤 조사는 붙여 쓴다(`30°가`, `2f에`). '두 개'·'1 kg' 처럼 갈라지면 안 되는 짧은 어절은 `&nbsp;`(JS 문자열이면 `\u00a0`) 로 묶는다. 짧은 끝말 하나가 남으면 문구를 줄인다.
5. **단위**: 영문 단위(m/s·kg·cm·nm)는 숫자와 한 칸, `°`·`%` 는 붙인다. 직접 이어 붙이지 말고 `SK.withUnit(v, unit)`. 숫자는 `tabular-nums`. 슬라이더 범위·말풍선·범위 밖 안내·예측 범위·계기판 단위는 공통이 자동으로 이 규칙을 쓴다.
6. **값 자리 글자**('쏘기 전'·'부딪친 뒤'·'아직 없음')는 `.meter__value.is-text`(body 28u·600·muted). `SK.meters().set(key, '쏘기 전')` 처럼 **숫자가 없는 글**을 넣으면 공통이 자동으로 붙이고 단위를 숨긴다. 자체 계기판이면 클래스를 직접 단다.
7. **번호 원**(①②③)은 글리프 대신 `.circ`(`SK.circ(n)`). 실험 카드 번호·예측 보기 번호·정리 카드 번호는 공통이 이미 바꿨다. 시뮬레이터 자체 화면(모드 카드·하단 단계 상자 등)은 `SK.circ(1)` 또는 `SK.circText('① 시작점')`.
8. **포커스**: 버튼·카드는 주황 링 한 겹(`:focus-visible`). 입력칸(`.var__input` `.predict__num input` `.predict__count`)은 링 없이 청록 테두리 + tint 그림자. `tabindex="-1"` 컨테이너·`.predict`·`.mode-card`·`.drawer` 는 링 없음.
9. **배지는 카드 밖으로 걸치지 않는다.** 실험 카드 '✓ 고름'·'추천' 은 값 줄 앞 글자(`::before`). 추천 카드는 `.preset-card` 에 클래스 `is-reco` 만 단다.
10. **스크롤 끝**: 패널 마스크는 끝 64u 를 0 까지 투명, 스크롤 영역 padding-bottom 64u. '아래에 더 있어요' 는 padding 만 남으면 사라진다.
11. **상태 전환 때 크기 변화 금지**: 실행 버튼 폭 240u 고정(Space 칩은 absolute), 시간 상태 칩 `.is-time` min-width 230u + tabular-nums.
12. **캔버스 라벨**은 선과 겹칠 수 있으면 `--color-paper-label`(paper 85%) 배경·모서리 4u, 화살표 라벨은 화살 끝에서 12u 바깥. 캔버스 안 검은 면은 `--color-canvas-dark`(#2A2521).

### 0R3-2. 새로 생긴 것 · 바뀐 것 (API · 클래스 · 토큰)
| 이름 | 내용 |
|---|---|
| `SK.withUnit(v, unit)` | `'20 m/s'` · `'45°'` · `'100%'`. v 는 숫자·글 모두, unit 이 비면 v 그대로 |
| `SK.circ(n)` | `<span class="circ">n</span>` 요소. n 은 숫자 또는 원문자(`'②'`→2) |
| `SK.circText(text)` | `'① 시작점'` → `[circ, ' 시작점']` (원문자 없으면 `[text]`) — `h()` 의 자식으로 바로 |
| `.circ` | 1.3em 원, currentColor 테두리 2u, `--font-num` 600. 부모 글자 크기를 따라감 |
| `.meter__value.is-text` | 값 자리 글자. `SK.meters` 는 숫자 없는 글이면 자동 |
| `.meter__unit[data-unit]` | `SK.meters` 가 단위를 속성으로도 넣음 — `°`·`%` 는 margin 0 |
| `.meter__value .arrow` | 값 안 화살표(`2.0 <span class="arrow">→</span> 0.0`)를 0.7em 으로 |
| `.preset-card.is-reco` | 값 줄 앞 '추천 ·'(구리색). 고른 카드는 '✓' 만(팀장 확인: '✓ 고름 ·' 은 값 줄이 잘림) |
| `.preset-card__picked` | **표시 안 함**(`display:none !important`, 마크업 호환용으로만 남음) |
| `.preset-card__dot` | **숨김**(팀장 확인: 한 색이 된 점은 뜻이 없고 값 줄을 잘리게 함). 마크업은 그대로 둬도 됨 |
| `.var__unit--deg` | 단위가 `°` 일 때 공통이 붙임(기준선 맞춤) |
| `.var__ticks span.is-start/.is-end` | 눈금 위치 12% 안쪽이면 양끝 정렬. **`.is-under`(손잡이 밑 숨김) 삭제 — 눈금은 항상 보임**, 트랙 아래 26u |
| `.var.is-disabled` | 입력·슬라이더만 .45, `.var__hint`·`.pe-hint` 는 선명 |
| `.btn:disabled` | 흐리게(.4) 대신 sunk 배경·line 테두리·muted 글자 |
| `.drawer-scrim` | 도움말 서랍 뒤 0.18 먹색, 누르면 닫힘. 도움말 제목은 `'도움말'` + `<small>`(실험 이름) |
| `.stage-status .chip.is-time` | 시간이 든 상태 칩(공통이 붙임) |
| `.sim.is-modal .stage-overlay` · `.cm-lower` · `.stage-corner` · `.notice-zone` | 모달(예측·모드 창)이 떠 있을 때 숨김(캔버스 위 HTML 조각·모서리 칩·토스트) |
| `notice()` 글 속 원문자 | '카드 ①' 처럼 글 속 ①②도 `.circ` 배지로 자동 변환 |
| `--color-dim` | `rgb(74 58 40 / .28)` 따뜻한 갈색(예전 회색 .25) |
| `--color-canvas-dark` / `--color-paper-label` | `#2A2521` / `rgb(251 248 239 / .85)` 신규 |
| 그 밖의 기능 메뉴 | '기록 모두 지우기…' 가 맨 아래 구분선 밑 |
| 기록 큰 판 빈 상태 | 표 상자·'저장한 실험 0/5' 소제목 숨김, 안내 한 상자('아직 저장한 실험이 없어요 — …') |
| **삭제** `legendTip` | 패널 범례 첫 방문 말풍선(`SK.el.legendTip`, `.legend-tip`, localStorage `simkit:legend-seen`) 삭제. 범례 줄 ⚡·↻ 는 같은 `.apply-ico` 칩, '·' 는 간격으로 |

---

## 0. R2(고도화 2차)에서 바뀐 것 — 먼저 읽기

> 근거: `docs/개선/R2_계획.md` §2·§3(A~G)·§6 · 작성: 에듀테크1 · 2026-10-28
> 교사 평가 "디자인이 어설프고 UI 가 불편·어렵다, 내용도 친절하게" 에 대한 공통 틀 답. 아래 0-3 체크리스트를 5종이 반영한다.

### 0-1. 원칙 (R1 다섯 + R2 셋)
6. **그림 위에는 아무것도 올리지 않는다.** 토스트는 실험 화면 위 가운데 **한 줄**(빈 모서리), 해설은 **오른쪽 패널 맨 위 카드**, 예측·모드 창은 실험 화면 **아래쪽 카드**(위쪽 장면·눈금은 보임). 실험 화면에 남는 것: 그림·라벨·모서리 칩·보기 범위 버튼.
7. **같은 일은 한 곳에서 한 이름으로.** 아래 0-2 표 그대로 쓴다.
8. **설명은 한 줄 → 펼치기.** 판정·해설·개념 카드·정리 질문 모두 한 줄이 먼저, 식·기호·원리는 `▾` 뒤. 전문어는 `{{용어}}`(첫 등장 괄호 풀이 자동 — `help({inlineTerms:true})`).

### 0-2. 버튼·문구 이름 고정표 (grep 으로 검사)
| 하는 일 | 자리 | 이름(그대로) | 쓰지 말 것 |
|---|---|---|---|
| 실행 | 하단 막대 | `▶ 실행` → 실행 중 `⏸ 멈추기` → 멈춤 `▶ 이어서 실행` → 끝 `↻ 다시 실행`(윤곽선 그대로 — R3: 버튼 폭 240u 고정이라 바뀌어도 덜컹 없음) | 띠 버튼에 '실행하기' |
| 기록 | 상단 띠(끝난 뒤에만) | `기록하기` | 하단 기록 버튼, 문장 속 `[기록하기]` → '기록하기 버튼으로' |
| 단계 이동 | 상단 띠 | `비교하러 가기 ▸` `정리하러 가기 ▸` `실행하러 가기 ▸` | '다음 단계 ▸' 와 함께 두 개 |
| 예측 다시 열기 | 상단 띠(예측 단계) | `예측하기` | '예측 입력', '예측 질문 받기' |
| 되돌리기 | 하단 막대 | `기본값으로 되돌리기` (패널 묶음 머리 `기본값으로 ↺`) | '처음 설정으로', '초기화' |
| 장면 넘기기 | 하단 막대 | `◀ 한 장면 뒤로` `한 장면 앞으로 ▶` | '한 칸' |
| 메뉴 | 하단 막대 | `그 밖의 기능 ▾` (기록 모두 지우기·전체 화면·도움말·교사 모드·조작판 접기) | '⋯ 더보기' |
| 머리 버튼 | 제목 줄 | `수업 정보 · 교사용 ▾` `? 도움말` `⤢ 전체 화면` (같은 윤곽선) | |
| 기록 칩 | 띠 오른쪽 | `저장한 실험 1/5` `(최대 5)` `표 보기` | |
| 기록 이름 | 표·범례·나란히 | `● 기록 1` `▲ 기록 2` `■ 기록 3` `◆ 기록 4` `★ 기록 5` (`SK.recLabel(i)`) | 색만으로 구분 |
| 비교 고르기 | 기록 큰 판 | `비교할 기록 A [●1][▲2] · B [●1][▲2]` | '앞 기록/뒤 기록' |
| 모드 | 패널 맨 위 | `지금: ○○ [실험 고르기]` | '바꾸기' |
| 해설 | 패널 맨 위 카드 / 큰 판 머리 칩 | `이번 실험 결과` `접기 ▴` `왜 그럴까? ▾` / `해설 보기 ▾` | |

### 0-3. R2 체크리스트 — 각 시뮬레이터가 할 일
| # | 할 일 | 공통 틀이 해 준 것 / 시뮬이 할 것 |
|---|---|---|
| A1 | 토스트 **28자 이내**(넘으면 콘솔 경고 + 띠 문장으로 감). `SK.finish(msg)` 는 이제 **띠 문장**으로 간다(토스트 아님). 긴 안내는 `SK.say(text, ms)` | 시뮬: 콘솔의 `SimKit(R2): 토스트는 28자…` 경고를 0건으로 |
| A2 | `.sim-note` 가 패널 맨 위 `.panel-note` 로 옮겨졌다. **자체 회피 코드 삭제**: projectile 궤적 하강·convex 정면창 `SK.el.note` 이동·double-slit 광축/확대창 하강·`.sim.has-note` CSS(collision·convex·orbit) | 공통: `SK.el.note` 는 늘 숨은 빈 칸(회피 값 0) → 지금은 깨지지 않지만 지울 것 |
| A2 | `takeaway(fn)` 은 `{line:'한 줄', more:'왜 그럴까? 안 전문'}` 반환 권장(문자열이면 한 줄) | 시뮬: 긴 해설 문장을 line/more 로 나누기 |
| A3 | 숫자 예측 `numeric:{label:'얼마나 멀리 갈까?', unit, min, max: 수|함수, example, overText, key, decimals, tolerance}` — 라벨은 **질문형**, placeholder 는 `예: 40` 자동 | 시뮬: label '사거리' → 질문형 |
| A3 | 선택형은 **고른 뒤 [예측하기]** 로 확정(두 번 누르기·숫자키+Enter 도 됨). `predict({figure:'<svg…>'})` 로 그림 1장 | double-slit: 레이저→틈→스크린 그림 |
| A4 | 카드를 누르면 **값이 바로 적용**(패널 숫자 바뀜) → 토스트 `카드 ①: v₀ 10 m/s · θ 0°` → (autoPredict) 예측 창. **예측 창이 떠 있는 동안 결과 층(무늬·상·궤적)을 숨길 것**: render 에서 `if (SK.predicting()) …` 또는 `cfg.onPredictOpen/Close`·`SK.onPredict(fn(open))` | 시뮬: 결과 층 숨김. 자체 자동 예측(projectile 처음 `SK.predict`, collision `applyPreset(0)`)은 공통 autoPredict 와 겹치므로 정리 |
| A4 | 모드를 고르면(chooseMode) 첫 예측 카드가 자동 적용·예측 창이 뜬다. 닫으면 띠 `예측하기` 로 다시 연다 | double-slit·orbit: onPick 안 자체 예측 호출 정리 |
| A5 | 패널: 묶음 머리 고정(sticky)·끝 페이드·`아래에 더 있어요 ↓`=다음 묶음으로. 수치 칸 머리줄 아래 `0.5~3 kg · 버튼 한 번에 0.5` 자동. `addVar({ticks:[{v,label}]})` 로 눈금에 이름(예: 달/지구) | 시뮬: 눈금 이름 쓰고 싶으면 객체 배열 |
| B1 | 띠 버튼은 **실행이 아닌 행동만**. `stepTasks[i].action` 에 '▶ 실행하기' 류를 넣으면 무시된다. 실행 중·멈춤 중엔 '기록하기'가 뜨지 않는다 | 시뮬: stepTasks 문장 **25자 안팎**, '아래 기록하기' 언급 삭제(하단 기록 버튼 없음) |
| B2 | `R` 키·[기본값으로 되돌리기] = `SK.resetDefaults()`(기록되는 값 → 처음 값, 실행 처음으로, 기록·모드·표시 도구는 그대로). `SK.reset()` 은 예전처럼 **실행만** 처음으로 | 시뮬: 문장 속 '[처음 설정으로]' → '기본값으로 되돌리기' 또는 '↻ 다시 실행' |
| B3 | 버튼의 단축키 글자는 정밀 포인터 마우스 올림·교사 설정에서만. 터치 기기는 도움말 '단축키' 탭 숨김 | — |
| B4 | `SK.josa(word,'으로/로'|'을/를'|'이/가'|'은/는'|'과/와')`, `SK.withJosa(word,'으로/로')`. 숫자·단위 끝은 읽는 소리로(7.9 km/s→로, 1→로, 3→으로). 토스트·띠·finish 의 `(으)로` `(을)를` `(이)가` `은(는)` `[기록하기]로` 는 공통 틀이 자동으로 고쳐 주지만(`SK.tidy`) **원문에서 지울 것**. 단위 뒤 조사 붙여쓰기(`7.9 km/s로`) | orbit 1334행 `(으)로` 등 |
| C1 | 기록 표 열 `priority` 1(작은 표·큰 판)·2(큰 판)·3(열 더 보기에서만). 머리글 2줄(이름/단위) 자동. 큰 판 위에 `바꾼 값(기록 1 → 2): v₀ 20 → 15 m/s` 자동. 넓으면 오른쪽 그림자+'← 옆으로 밀어 보기' | 시뮬: 열이 5개 넘으면 priority 2·3 나누기 |
| C1 | 기록 선·범례에 모양 기호: `SK.recStyle(i).mark`(●▲■◆★), `SK.recLabel(rec)`, `SK.recTag(rec)`(견본+기호+이름 요소) | 그래프 범례·캔버스 라벨에 '기록 n' 대신 `SK.recLabel` |
| C3 | 큰 판 전용 자리: `SK.recordTable(null, {columns, extra: el})` 또는 `SK.recordExtra(el)` | collision `recBigBody.insertBefore(card, recVs)`·double-slit `insertBefore(ui.check, …)` → `extra` 로 |
| C4 | 5개가 차면 안내 + 큰 판 각 줄 ✕ 로 하나 지우기(`SK.deleteRecord(i)`) — 번호·색은 다시 매김. 시뮬이 `rec.n`/`rec.slot` 을 따로 저장해 두었다면 `onRecords` 에서 다시 읽기 | convex(기록 칸 남은 수 안내 문장) |
| D1 | 도움말 '이렇게 해요' 세로 깨짐 고침(`.help-step` 2칸 격자). 서랍 폭 `min(720u, 100vw−40u)` | — |
| D2 | 개념 카드 `concepts:[{title, summary(한 줄), plain('줄1\n줄2'), example, figure(SVG 글), formula, symbols:[{s,meaning,unit}], why, live(p)}]` — 렌더 순서 summary→plain→example→figure→[식 보기]→[왜 그럴까?]→지금 값으로. 예전 `{title, formula, plain, live}` 도 그대로 보임 | 5종: summary·symbols·why 로 나누기 |
| D3 | `terms:{ '초점거리': {def, short, alias:['초점 거리','f']} }` — 같은 말은 같은 풀이, 넣은 순서대로 | — |
| D4 | `think({id, q, choices, answer, why, hint, hintFold, reveal, when: p => …})` · `SK.think.remove(id)` · 모드가 바뀌면 `SK.refreshThinks()`. 답을 누르면 '답은 ○○' + 이유가 바로. 보기 없는 계산형 hint 는 '힌트 보기'로 접힘 | double-slit·orbit 의 자체 숨김(thinkCards[m]) → `when` 으로 |
| D5 | 예측 판정은 **선택지 글자**로: `내 예측: 동시에 → 맞았어요` / 숫자형 `예측 40 m · 실제 40.8 m · 차이 0.8 m` | 선택지 글은 짧게(그대로 판정 문장에 들어감) |
| E1 | 카드 아래 줄 = `preset.changes`(예 `'v₀ 10 → 20'`, `'g: 달'`, 14자 안팎). 없으면 `change` 를 쓰고 콘솔 경고. 분류(tag)는 색 점+말풍선 | 5종 `changes` 추가 |
| E3 | `preset.mode:'위성 모드'` 를 주면 토스트가 `카드 ③: 위성 모드로 바뀌어요` | orbit |
| E4 | `predict({afterHint:'자료 카드를 보세요'})` 로 예측 뒤 토스트 문구 바꾸기(28자 이내) | orbit 케플러 |
| G2 | chooseMode: 기본 선택 없음, 카드를 누르면 바로 시작, 패널 줄 `지금: ○○ [실험 고르기]` | — |
| G3 | 글자 전용 색 `--color-ok-text` `--color-warn-text` `--color-ink-chip`. `status()` 는 **배열만**(문자열이면 콘솔 경고) | 5종 status 배열 확인 |
| G6 | `SK.stageInset()` → `{top, bottom}`(캔버스 단위): 모서리 칩이 차지하는 위·아래 높이. 라벨·궤적을 그 밖으로 | 라벨이 상태 칩 밑으로 들어가는 곳 |
| 글자 | 캔버스 글자 **22u 이상**(`--fs-caption` 20→22). 공통 그래프는 22 로 올림 | 측정(2026-10-28, 처음 화면): projectile 20 · double-slit 18 · collision 20 · orbit 12 · convex 16 → 22 이상으로 |

### 0-4. 하위 호환 · 깨지는 지점 (정확히)
- **그대로 동작**: `predictOnPreset`(→ `autoPredict` 로 읽음, false 면 끔) · `SK.el.note`(늘 숨은 빈 칸) · `SK.el.btnRec`(숨은 버튼, 클릭하면 기록) · `preset.change`(아래 줄 대용) · 예전 `concepts` 구조 · 문자열 `takeaway`·`terms` · 숫자 `ticks` · `notice(text, type, ms, action)` · `recordTable(null,{columns})`·`rt.el` · `SK.reset()`(실행만 처음으로).
- **동작이 바뀜(시뮬이 확인할 것)**
  1. 카드 클릭 순서: 예전 '예측 → 고른 뒤 값 적용' → 이제 **'값 적용(onApply) → 예측 창'**. 예측 창 ✕ 는 카드 취소가 아니라 예측만 닫음. `onApply` 안에서 `SK.prediction` 을 읽던 코드는 **이전 예측**을 읽게 됨(예전과 같음).
  2. 선택형 예측: 보기를 누르면 **바로 닫히지 않고** 고른 상태 → [예측하기]. 숫자키 1~9 도 고르기만 함(Enter 로 확정).
  3. `SK.finish(msg)` 의 msg 는 토스트가 아니라 **띠 문장**(6초). 28자 넘는 `notice` 도 띠로 간다.
  4. `R` 키는 `resetDefaults`(값까지 처음으로). 시뮬 `onKey` 에서 R 을 따로 쓰면 그쪽이 먼저.
  5. 띠 `stepTasks[i].action` 의 label 이 `▶`·`⏸`·`↻`·'실행하기'·'이어서 실행'·'다시 실행' 이면 숨김. orbit `{label:'자료 카드 보기'}` 같은 실행 아닌 행동은 그대로.
  6. 기록 큰 판 표에 ✕ 버튼이 첫 칸에 붙는다. `rt.el` 안 표를 직접 꾸미던 코드(convex `recHead.insertBefore`)는 머리 구조가 `[제목][열 더 보기][끝]` 으로 바뀌어 **위치가 달라질 수 있음** → `extra` 로 옮길 것.
  7. 예측·모드 창이 실험 화면 **아래쪽**으로 내려감(배경 흐림 없음, 어둡기 0.25) → 위쪽 결과 층이 보이므로 A4 숨김 필요.
  8. 패널 `.panel-sec__title` 이 sticky(배경 sunk). 패널에 직접 넣은 요소가 제목과 겹치면 z-index 4 아래로.
- **콘솔 경고로 알려 주는 것**: 토스트 28자 초과 · `status()` 문자열 · `preset.changes` 없음 · 카드 이름 12자 초과.

### 0-5. 확인 방법 (리드 통합 확인)
- `python tools/shot.py sims/<slug>/index.html?mode=… _review/R2_after/<이름>.png …` (G4: 쿼리 됨) — 1280×720·1920×1080·1180×820 × 단계(예측 창/실행 끝/비교/정리/도움말).
- 자동 검사 `python _review/R2/edu1/check.py`: 토스트∩띠 bbox 0 · `.sim-stage` 안 해설 0 · 보이는 kbd 0 · `(으)로` 0 · `[기록하기]` 0 · 하단 기록 버튼 0 · 캔버스 최소 글자(px, 논리 단위).
- 도움말 '이렇게 해요' 1280 에서 한 줄 20자 이상(D1).

---

### 0-6. 최종 통합 점검(2026-10-28, 팀장)에서 공통 틀에 고친 것
- `sim.js` 숫자 예측 창: Esc 는 칸이 비어 있으면 창을 닫고, 글자가 있으면 지우기(두 번째 Esc 로 닫힘). 시뮬 코드 변경 없음.
- `shell.css` 교사 모드: `.sim-title` 한 줄 고정(최대 760u), 성취기준 칩이 대신 줄바꿈·잘림.
- `base.css` 기록 표: `.th-name` 줄바꿈 없음 → 머리글은 '이름 / 단위' 2줄 고정. 머리글 이름이 길면 `label` 을 줄이세요.
- 받은 요청 중 미반영 목록과 우선순위는 `docs/개선/최종보고.md` §5.

## 0R1. R1 에서 바뀐 것 (참고 — R2 가 덮어쓴 곳은 위 §0 이 우선)

### 0-1. 디자인 원칙 다섯 가지
1. **지금 할 일 하나** — 제목 아래 띠(`.sim-task`)에 단계 스테퍼 + '지금 할 일' 문장 + 주 행동 버튼 1개.
2. **단계별 점진 공개** — 예측: 장면+예측 카드+핵심 수치 / 실행: 계기판·그래프 / 비교: 오른쪽 칸이 **기록 표 큰 판**으로 바뀜 / 정리: 오른쪽 칸이 **정리 질문 판**으로 바뀜.
3. **잘림 0** — shared 에서 `text-overflow: ellipsis` 를 쓰지 않는다. 긴 글은 `word-break: keep-all` 로 2줄, 또는 접기.
4. **말은 풀어쓴다** — '즉시'→'⚡ 바로 반영', '다시 시작'→'↻ 바꾸면 처음부터 다시', '1배'→'속도 ×1', '◀ ▶'→'한 칸 뒤로/앞으로', '지우기'→'기록 모두 지우기', '초기화'→'처음 설정으로', '기록'→'기록하기', '기록 0/5'→'저장한 실험 0/5', '직전'→'직전 실행(저장 안 됨)', '■ 준비'→'실행 전 · t = 0.00 s'. **단축키는 화면에 쓰지 않는다**(버튼 위에 마우스를 올리거나 `? 도움말 › 단축키` 탭에서만).
5. **개념 도우미는 공통 부품** — 시뮬레이터는 내용(JSON)만 넣는다: `help()` `term()` `takeaway()` `reveal()` `think()`.

### 0-2. 각 시뮬레이터가 해야 할 반영 작업 (체크리스트)
| # | 할 일 | 해당 |
|---|---|---|
| 1 | `init` 에서 **`steps` 옵션 삭제**. 단계 이름은 `예측·실행·비교·정리` 고정. `data-step-only` 값·`onStep` 비교 문자열을 `'비교'`/`'정리'` 로 바꾼다. (지금은 예전 이름을 별칭으로 받아 줘서 깨지지 않지만 콘솔 경고가 뜸) | convex-lens(`'생각해 보기'`·`'규칙 찾기'`), double-slit(`'생각해 보기'`) |
| 2 | `stepTasks:[{text, action:{label,onClick}}]` 4개로 단계별 '지금 할 일' 문장을 쓴다(없으면 공통 문장). action 을 비우면 공통 버튼(실행하기/기록하기/비교하러 가기…)이 상황에 맞게 바뀜 | 5종 |
| 3 | 실험 카드(프리셋) **name 12자 이내**로 다시 쓰기(넘으면 콘솔 경고 + 작은 글씨). `tag` 는 예전 키 그대로(표시 말은 shared 가 바꿈: 탐구 재현→교과서 탐구, 대표 문항→교과서 문제, 오개념→흔한 오해 확인) | 5종 |
| 4 | 모든 `preset.predict` 에 **`answer`(1부터)·`why` 필수**, 또는 `judge(p, values)→번호`. 숫자 예측은 `numeric:{label, unit, min, max, key, decimals, tolerance}`. 실행이 끝나면(`finish`) 판정이 자동으로 뜬다 | 5종 (projectile 은 자체 judge 를 지우고 `judge` 로 옮길 것) |
| 5 | 실험 카드는 이제 **예측 카드를 먼저 띄우고, 답을 고른 뒤 값 적용**(`onApply` 도 그 뒤). ✕ 로 닫으면 카드 취소, '예측 없이 바로 실행'은 값 적용 후 실행. 기록이 있으면 확인창 | 5종 확인 |
| 6 | `status()` 는 **배열** 반환 권장 `['지구','공기 저항 없음','g 9.8']` (칩 하나에 한 덩어리). 문자열이면 ` · ` 로 나눔. 'H로 공개' 같은 키 안내는 빼기 | 5종 |
| 7 | 패널 순서가 **수치 → 상황 → 화면에 표시하기 → 더 많은 설정**. `addVar` 는 핵심 2~3개만 `'values'`, 나머지는 `'deep'`. 패널 맨 위에 직접 끼워 넣은 것(projectile 의 g 막대 `SK.el.panel.insertBefore`)은 `'values'` 안으로 | 5종 |
| 8 | **하단 띠가 88u(한 줄)로 줄었다.** 계기판은 1줄 3~4개, 그래프는 1개. 2줄 계기판·띠 안 큰 판은 칸 안에서 잘린다(막대를 덮지는 않음). 기록 표 칸은 띠에서 빠짐 → `SimKit.el.band.style.gridTemplateColumns` 를 3칸으로 주면 앞 2칸만 씀 | projectile(계기판 6개), collision(계기판 4개+그래프 3개), orbit, double-slit, lens(상의 모습 판) |
| 9 | `.teacher-only` 는 **교사 모드에서만** 보인다(`?teacher=1` 또는 H 3초). 학생이 봐야 할 설명·정답은 거기 두지 말고 `SK.reveal()`(답 확인하기)·`SK.think({…why})` 로 | projectile(정답 줄), lens(빈칸 답), collision(H 버튼) |
| 10 | `notice` 는 **1개만** 뜬다(새 것이 옛 것을 바꿈). 끝 안내와 기록 안내를 한 문장으로: `SK.finish('착지 — [기록하기]로 저장해요')`. 'S 로', 'Space 로', 'R 후' 같은 키 이름 금지 | 5종 |
| 11 | 토스트·발문 카드·수식 박스를 **실험 화면 안에 직접 그리지 말 것** → 결과 문장은 `SK.takeaway()`, 정리 발문은 `SK.think()`, 식은 `SK.help({concepts})` | projectile·collision·orbit(think 를 cornerBR/TR 에 붙임), double-slit(수식 박스) |
| 12 | `SK.help({how, concepts, terms})` 로 `? 도움말` 채우기, 라벨에 `{{용어}}` 쓰기, 실행 끝 `SK.takeaway()` | 5종 |
| 13 | `chooseMode` 쓰는 곳: `desc` 한 줄 필수('이걸 고르면 무엇을 해 보나'), 라벨 앞 '①' 빼기(shared 가 붙임), 성취기준 코드는 desc 에서 빼기. 허브가 `?mode=` 로 넘김(이중슬릿 physics/quantum, 위성 cannon). 패널의 같은 선택(값이 같은 addChoice)은 자동으로 접히고 '지금: ○○ [바꾸기]' 한 줄이 됨 | double-slit, orbit |
| 14 | 캔버스 라벨이 겹치는 곳은 `SK.placeLabel(ctx, items)` | orbit·lens·collision |
| 15 | 실험 화면은 **1250×660**(예전 700). `stageFit:true` 면 1250×700 그림이 0.94배로 줄어 그대로 보임. 새로 그리면 `stageH: 660` 을 주고 660 기준으로 | 5종(선택) |

### 0-3. 하위 호환(지금 5종이 깨지지 않게 한 것)
- `cfg.steps` → 경고 후 무시, 예전 이름은 **별칭**: `data-step-only="생각해 보기"` 도 4단계에서 보이고, `onStep(i, 예전이름, 새이름)` 으로 넘어감.
- `data-step-only` 해석(A1): 속성 전체가 단계 이름과 같으면 OK → `|` `,` 로 나눔 → 공백으로 나눔(예전 `"비교 정리"`).
- `SK.el.panel` = 패널 **스크롤 칸**(예전처럼 `insertBefore`·`appendChild` 됨). `SK.el.panelFoot` 그대로.
- `SK.el.records` = 오른쪽 아래 **기록 칩**(`hidden` 으로 숨기기 가능). `recordTable(null, …)` 은 기록 큰 판에 그려지고 반환 `el` 안에 `.rec-box__head` · `tbody` 가 그대로 있다(렌즈의 '같은 거리 찾기' 버튼 호환).
- `.sim-today` 는 '수업 정보 ▾' 안에 있다. 시뮬레이터가 글을 바꾸면 '지금 할 일' 띠의 '오늘 알아볼 것' 줄도 따라감.
- `html.teacher` 클래스도 함께 붙인다(렌즈 CSS 호환). `SK.isTeacher()`·`cfg.onTeacher(on)` 그대로.
- `predict()` 는 이제 `{choice, index, number}|null` 을 돌려준다(예전: 번호). 지금 5종은 직접 부르지 않음. `SK.prediction` 은 예전 필드(`answer`·`index`·`counts`)를 그대로 가진다.
- 키 `H` 짧게 = 아무 일 없음(교사 모드는 3초). `[ ]` 속도는 ×0.1·×0.25·×0.5·×1·×2.

---

## 1. 파일 구조

```
49_물리-수업시뮬레이터/
├─ index.html                 허브 (카드 5장, 1~5 키, ?mode= 전달)
├─ shared/
│  ├─ fonts.css · fonts/      로컬 글꼴 — R4: 에스코어 드림 SCDream3/4/5.otf (원본 그대로) + LICENSE_SCDream.txt
│  ├─ tokens.css              디자인 토큰 (--u, --color-*, --fs-*, --space-* …)
│  ├─ base.css                리셋·무대·부품 클래스 (R1 부품은 파일 끝 19~30번)
│  ├─ shell.css               시뮬레이터 화면 뼈대 배치 (R1 전면 수정)
│  ├─ icons.js                R4: window.SimIcons — 공통 SVG 아이콘(JS 문자열 내장)
│  ├─ sim.js                  window.SimKit
│  └─ TEMPLATE.html           복사해서 시작하는 예제 (= sims/_template/index.html)
└─ sims/<slug>/index.html + sim.js (+ <slug>.css)
```
불러오는 순서(바꾸지 말 것): `fonts.css → tokens.css → base.css → shell.css → ../../shared/icons.js → ../../shared/sim.js → sim.js`

---

## 2. 화면 뼈대 (1920×1080 기준, 단위 u) — `SimKit.init()` 이 만든다

```
y0   ~72    .sim-top     [← 허브] 제목(명조 34u, 식별색 밑줄)  (교사 모드: 과목·성취기준 칩)   [수업 정보 ▾][? 도움말][⤢ 전체 화면]
y72  ~132   .sim-task    ①예측 ─ ②실행 ─ ③비교 ─ ④정리 │ (오늘 알아볼 것) 지금 할 일 문장   [주 행동 버튼] [다음 단계 ▸]
y140 ~800   .sim-stage   1250×660 (x40) · 왼쪽 위 상태 칩 줄(status) · .sim-note(예측 판정·결과 해설, 실행 끝나면 맨 위)
y140 ~900   .sim-panel   570×760 (x1310) 수치 → 상황 → 화면에 표시하기 → 더 많은 설정 ▾ · 머리: 범례 '⚡ 바로 반영 · ↻ 처음부터 다시'
            .rec-big     (같은 자리, 비교 단계) 기록 표 큰 판 · 기록 2개 필요 안내 · 두 기록 나란히 보기(▲▼)
            .think-board (같은 자리, 정리 단계, think() 가 있을 때) 정리 질문 카드
y812 ~900   .sim-band    1010×88 계기판 | 그래프 (5:4)        .rec-chip 228×88 '저장한 실험 n/5 [표 보기]'
y916 ~1036  .sim-bar     실험 카드 5장(2줄) | [▶ 실행] [◀ 한 칸 뒤로][앞으로 ▶][속도 ×1 ▾] / [기록하기][처음 설정으로][⋯ 더보기]
y806        .notice-zone 토스트 1개, 3초, 실험 화면과 하단 띠 사이 가운데 (모달보다 위)
```
- R4 각주: 16:9 보다 세로가 긴 화면에서는 **실험 화면 h660+extra · 오른쪽 칸 h760+extra · 하단 띠·기록 칩 y812+extra · 하단 막대 y916+extra** (§0R4-2). 16:9 는 extra 0.
- R5 각주(세로 태블릿, 폭 601 이상): **오른쪽 칸 → 실험 화면 아래 전폭(x20 y916+extra, 2열), 바닥 100vh − 228u · 하단 막대는 바닥 212u(카드 1단 + 실행 줄 2단)** · 예측·모드 창은 패널 자리 (§0R5-1).
- `SimKit.el.*`: `root slide top task note stage panel(스크롤 칸) panelBox recBig thinkBoard band meters graph records(기록 칩) bar presets cornerTL/TR/BL/BR status notices`
- 오른쪽 칸 전환: 비교 단계 → 기록 큰 판, 정리 단계 → 질문 판(think 가 있으면). 판 머리 '설정 보기 ▸', 패널 머리 '기록 표 보기 ▸', 기록 칩 '표 보기/표 닫기'. `SK.showSide('panel'|'records'|'think')`.
- 패널은 안에서 스크롤, 끝이 아니면 아래 그림자 + '아래에 더 있어요 ↓'(누르면 내려감). 칸마다 '기본값으로 ↺'.
- T(또는 ⋯ › 조작판 접기): 패널·띠 숨기고 실험 화면 1840×760.
- 폭 600px 이하: 맨 위 '화면이 좁아요 / 가로로 돌리면 더 크게 볼 수 있어요' 띠 + ✕ (R5). 아이패드 세로는 세로 배치(§0R5-1).

---

## 3. 클래스 (base.css · shell.css)

| 분류 | 클래스 |
|---|---|
| 지금 할 일 | `.sim-task` `.task-steps` `.task-step[aria-current=step]` `.task-step.is-done` `.task-step__num` `.task-now__text` `.task-now__sub` `.task-now__act` |
| 버튼 | `.btn` `--primary` `--secondary` `--quiet` `--danger` `--icon` `--sm`(56u) `--lg` · `.btn__key`(기본 숨김, `html.show-keys`·호버·키보드 포커스에서만) |
| 변수 위젯 | `.var` `.var__head` `.var__label` `.var__sym` `.var__range`(범위 상시) `.var__input` `.var__unit` `.var__row` `.var__step` `.var__stepinfo`(±step) `.range`(트랙 10u·손잡이 56u) `.var__ticks`(22u, 3개, 항상 보임 · 양끝 `.is-start/.is-end`) `.var__unit--deg` `.var__err`(범위 밖 고정 안내) `.var__hint` · `.is-pending` `.is-flash` `.is-folded` |
| 반영 아이콘 | `.apply-ico--live`(⚡) `.apply-ico--restart`(↻, 실행 중 바꾸면 '↻ 다음 실행부터') — 예전 `.tag--live/--restart` 는 CSS 만 남음 |
| 실험 카드 | `.preset-card` `.preset-card__name`(2줄) `.preset-card__key` `.preset-card__tag`(20u 풀어쓴 말) `.preset-tip`(호버 설명) `.preset-info`(고른 카드, 왼쪽 위) |
| 상태 칩 | `.stage-status .chip` `.is-run` `.is-done` `.is-pend` `.is-time`(R3) |
| R3 디테일 | `.circ` `.meter__value.is-text` `.preset-card.is-reco` `.drawer-scrim` — §0R3 |
| 예측 | `.predict-layer` `.predict` `.predict__close` `.predict__choices`(80u 버튼) `.predict__num` `.is-shake` · 판정 `.verdict--hit/--miss/--info` `.verdict__mark` |
| 설명 도우미 | `.sim-note` `.takeaway` `.reveal`(`<details>`, `html.reveal-locked` 면 잠김) `.empty` `.think-card` `.term`(점선 밑줄) `.term-tip` `.drawer--help` `.help-tab` `.concept` `.concept__formula` `.concept__live` |
| 기록 | `.rec-chip` `.rec-big` `.rec-need` `.rec-box` `.rec-table`(`td.is-changed`, `tr.is-ghost`) `.scroll-shadow`(좌우 그림자) `.vs` `.vs-table` `.vs-up`(▲) `.vs-down`(▼) |
| 창·메뉴 | `.dialog-layer` `.dialog` `.mode-layer`(흐림+70%) `.mode-card` `.mode-opt` `.pop-menu` `.info-pop` `.drawer` `.guide-card` |
| 교사 | `html.is-teacher`(+`html.teacher`) `.teacher-only` |

---

## 4. SimKit API

### 4-1. 시작
```js
SimKit.init({
  slug: 'projectile-energy', title: '포물선 운동과 역학적 에너지',
  subject: '역학과 에너지', unit: '(1) 시공간과 운동', standards: ['12역학01-02'],   // '수업 정보 ▾' 와 교사 모드에서만
  today: '옆으로 던진 공과 떨어뜨린 공, 무엇이 먼저 땅에 닿을까?',                     // 예측 단계 첫 진입 때 띠 위 보조 줄
  stepTasks: [ { text: '30°와 60° 중 어느 쪽이 멀리 갈지 먼저 골라요.' },
               { text: '▶ 실행하고 떨어지는 곳을 봐요.' },
               { text: '각도만 바꿔 두 번 기록하고 비교해요.' },
               { text: '정리 질문에 답해 봐요.', action: { label: '개념 보기', onClick: () => SimKit.toggleHelp(true, 'concepts') } } ],
  onStep(i, name) {},
  dt: 1/240, stageFit: true, stageH: 660,
  reset(p) {}, step(dt, p) {}, render(view, p) {}, capture(p) { return { series:{}, values:{} }; },
  save() {}, load(s) {},
  status(p) { return ['지구', '공기 저항 없음', 'g ' + p.g]; },
  predictOnPreset: true, confirmPresetWithRecords: true, onTeacher(on) {}
});
```

### 4-2. 값 두 벌
`SimKit.ui`(패널) / `SimKit.params`(지금 실행). 물리 코드는 **params 만** 읽는다. `apply:'live'` ⚡ 바로 반영, `apply:'restart'` ↻ 실행 전이면 바로 reset, 실행 중이면 '다음 실행부터 적용돼요 — [처음 설정으로]' 토스트(이미 기록한 실행이면 '이 실행은 이미 기록했어요 — 바꾼 값은 다음 실행부터…').

### 4-3. 수치·상황
```js
SimKit.addVar('values', { key:'f', label:'{{초점거리}}', symbol:'f', unit:'cm', min:5, max:20, step:1, value:10,
  ticks:[5, 10, 20], apply:'live', hint:'렌즈를 바꾸는 것과 같아요' });     // 라벨 줄: 이름 ⚡ 5~20 [10] cm / − 슬라이더 + ±1
SimKit.addChoice('situation', { key:'planet', label:'어디에서?', options:[{value:'earth',label:'지구',sub:'g 9.8'}], style:'cards' });
SimKit.addToggle('tools', { key:'showV', label:'속도 화살표', value:true });
// 값이 바뀌면 그 변수 이름으로 깜빡임 — render 에서:
if (SimKit.isFlashing('f')) { /* 초점 표시를 굵게 */ }   // SimKit.flashLevel('f') → 0~1, SimKit.flash('f') 로 직접 켜기
```
- `ticks` 가 4개 이상이면 양 끝 + 가운데 1개로 줄인다. 범위 밖 입력: 입력칸 아래에 '99은(는) 넣을 수 없어요 — 범위 5~20 cm 라서 가장 가까운 20(으)로 맞췄어요' (다음 입력까지 남음).
- 변수 이름은 '질량 m₁' 처럼 한글 뒤에 기호(`label` + `symbol`).

### 4-4. 실험 카드(프리셋)
```js
SimKit.setPresets([{ name:'30°와 60°', tag:'탐구 재현', change:'θ 30° → 60°', fixed:'v₀ 20 m/s',
  values:{ theta:30 },
  predict:{ question:'어느 쪽이 더 멀리 갈까?', choices:['30°','60°','같다'], answer:3, why:'sin2θ 가 같아서' },
  onApply(p){} }]);
```
흐름: 카드 누름 → (기록이 있으면 확인창) → 예측 카드 → 답 고름 → 값 적용·reset → `onApply` → 토스트 '③ 30°와 60° 준비 완료 · 내 예측: ③ 같다 — ▶ 실행으로 확인!' → 실행 → `finish()` 때 판정 자동 표시.

### 4-5. 예측 카드 (A10)
```js
SimKit.predict({ question, choices, info, answer, why, judge(p, values), numeric:{label, unit, min, max, key, decimals, tolerance}, tag, handCount })
  .then(r => { /* r = {choice:1~, index:0~, number} 또는 null(✕ 닫기·예측 없이 실행) */ });
```
- 선택지 큰 버튼(80u) + 보조 버튼 '예측 없이 바로 실행' + ✕. 카드가 떠 있을 때 Space·▶ 실행 → 카드 흔들림 + 띠에 '먼저 답을 고르거나 [예측 없이 바로 실행]을 누르세요'. 떠 있는 동안 시뮬 멈춤.
- '✋ 손들기 수' 는 교사 모드에서만. 결과 `SimKit.prediction.counts`.
- 판정(`finish()` 때): `answer`(1~) 또는 `judge()` → '✓ 맞았어요 · 내 예측 ② → 맞았어요 — 이유: why' / '✗ 아니었어요 · 정답은 ③'. 숫자 예측은 `capture().values[numeric.key]`(또는 `numeric.actual(p, values)`)와 비교해 '예측 40 m · 실제 40.8 m (차이 0.8 m)', `tolerance`(기본 10%) 안이면 '✓ 가까워요'.
- 직접 띄우기: `SimKit.verdict('hit'|'miss'|'info', '문장')`, 지우기 `SimKit.hideNote()`.

### 4-6. 설명 도우미 (A12)
```js
SimKit.help({
  how: ['실험 카드를 눌러 예측을 골라요.', '▶ 실행하고 지켜봐요.', '한 가지만 바꿔 기록해요.'],
  concepts: [{ title:'렌즈 공식', formula:'1/a + 1/b = 1/f', plain:'물체가 가까워지면 상은 멀어지고 커져요.',
               live: p => '1/' + p.s + ' + 1/b = 1/' + p.f + ' → b = …' }],
  terms: { '초점거리': '렌즈 가운데에서 빛이 모이는 곳까지 거리(cm)', '실상': '스크린에 맺히는 상' },
  keys: [['V', '속도 화살표 켜고 끄기']]          // 이 실험 전용 키 (도움말 › 단축키 탭)
});
SimKit.term('초점거리')            // → <abbr class="term"> 마우스 올림·탭하면 풀이 말풍선. 라벨·발문 글 안에서는 '{{초점거리}}'
SimKit.takeaway(p => '물체가 2f 에 있으면 상도 2f 에, 크기가 같아요.')   // 실행이 끝나면 '이 실험이 보여 주는 것' (null 로 지움)
SimKit.reveal(el, '<b>정답</b> 같은 크기')                             // <details class="reveal"> '답 확인하기'
SimKit.think({ q:'g 가 4배면 시간은?', choices:['4배','2배','½배'], answer:3, why:'t = √(2h/g)' })   // 정리 단계 오른쪽 판
SimKit.think({ q:'질량을 두 배로 하면?', hint:'공기 저항이 없다면…', reveal:'그대로예요' })
SimKit.empty(SimKit.el.graph, '힘 그래프')  // '▶ 실행하면 여기에 힘 그래프가 나와요' → {show(bool)}
SimKit.graph(null, {..., empty:'높이 그래프'})   // 그래프는 선이 없으면 저절로 빈 상태 문구
```
- `? 도움말`(헤더 버튼·`?` 키): 탭 '이렇게 해요 / 개념 / 용어 / 단축키'. `SimKit.toggleHelp(true, 'concepts')`.
- 교사 모드 서랍에 '[답 확인하기] 잠그기'(토론 전, 기본 열림)·'모든 답 펼치기'.

### 4-7. 기록·비교 (A8)
- `record()`: 실행 중이면 거부('아직 실행 중이에요 — 끝나거나 ⏸ 멈춘 뒤에 기록해요'). 5개까지. 직전 기록과 2가지 이상 다르면 경고.
- `recordTable(null, {columns:[{key, label, unit, decimals, from:'param'|'value', priority:1|2, text(rec,prev), changed}]})` → 기록 큰 판(모든 열, 좌우 스크롤 그림자). `recordTable(요소, …)` → 그 자리에 작은 표(**priority 1 열만**, 없으면 1로 봄) + '크게 보기'.
- 비교 단계: 기록 0~1개면 '기록이 2개 이상 있어야 비교할 수 있어요 (지금 n개) …' + [지금 결과 기록하기]/[▶ 실행하기]. 2개 이상이면 '두 기록 나란히 보기'(앞/뒤 기록 고르기, 차이 ▲▼ 같음).
- `recStyle(i)` `ghostStyle()` `drawPath()` `onRecords(fn)` 그대로.

### 4-8. 모드 고르기 (A11)
```js
SimKit.chooseMode({ title:'무엇을 알아볼까요?', default:'cannon', urlKey:'mode', key:'mode',   // key 생략 시 값이 같은 addChoice 를 찾아 접음
  modes:[{ value:'cannon', label:'뉴턴의 대포', desc:'얼마나 빨리 쏘면 지구를 돌까?' }, …],
  onPick(v){} });     // 반환 {open(), get()}
```
- URL `?mode=값` 이면 창 없이 바로. 이번 세션에 한 번 골랐으면(sessionStorage) 창 없이 그 값. 같은 페이지에서 다시 부르면 창을 연다.
- 창: 기본값 미리 선택, 큰 '이걸로 시작 ▸', ✕·Esc = 지금 것으로 시작, 숫자 키로 고르기. 떠 있는 동안 시뮬 멈춤·상태 칩 숨김·뒤 흐림.
- 패널 머리에 '지금: 뉴턴의 대포 [바꾸기]'.

### 4-9. 그 밖
- `notice(text, 'info'|'warn'|'restart'|'ok', ms, {label, onClick})` — 1개, 3초(버튼이 있으면 4.5초).
- `confirm/dialog({title, body, ok, cancel, danger})`.
- `guide({rows, sections, keys})` — '수업 안내(교사)' 서랍(교사 모드 헤더 버튼). 표 대신 카드.
- `placeLabel(ctx, [{x, y, text, anchor:'left'|'center'|'right', color, size, bg, leader}], {avoid:[상자], size})` — 겹치면 8u 씩 위/아래로, 반투명 칩 배경, 많이 밀리면 이음선. 반환: 상자 목록.
- R3: `withUnit(v, unit)` · `circ(n)` · `circText(text)` — §0R3-2.
- `setTeacher(bool)` `toggleTeacher()` `isTeacher()` · `toggleHelp()` `toggleGuide()` · `showSide()` · `setTask(i, {text, action})`.
- 그대로인 것: `meters` (라벨에 `{{용어}}` 가능) · `graph` · `canvas` · `arrow` · `color` · `px` · `fmt` · `play/pause/toggle/reset/finish/stepFrame/setSpeed` · `goStep/nextStep/prevStep` · `setStatus` · `update` · `requestRender` · `onFrame` · `onKey`.

---

## 5. 키 (e.code — 한글 입력 상태에서도 동작). 화면에는 쓰지 않고 `? 도움말 › 단축키` 에만

| 키 | 하는 일 | 키 | 하는 일 |
|---|---|---|---|
| Space | 실행 / 멈추기 (예측 카드가 떠 있으면 흔들림) | S | 기록하기 |
| ← → / PageUp·Down | 단계 | R | 처음 설정으로 (기록 유지) |
| 1~5 | 실험 카드 (예측·모드 카드에서는 그 선택지) | C | 기록 모두 지우기 (확인창) |
| , . | 한 칸 뒤로 / 앞으로 (1/60초) | [ ] | 속도 ×0.1·×0.25·×0.5·×1·×2 |
| F | 전체 화면 | T | 조작판 접기 |
| ? | 도움말 | H 3초 누르기 | 교사 모드 켜기/끄기 (또는 URL `?teacher=1`) |
| Esc | 메뉴·서랍·창 닫기 → 1.5초 안에 두 번 = 허브 | | |

---

## 6. 지켜야 할 규칙
1. file:// 로 동작(일반 `<script>`, fetch·module·CDN 금지).
2. 색은 토큰 이름으로만. 상태는 **색 + 글자('켬/끔', '✓ 완료') + 선 모양**을 함께.
3. 크기는 u. 버튼 72u(띠·막대 2단은 56u 허용), 손잡이 56u, 보조 글자 최소 20u(1280 에서 13px).
4. 말줄임 금지, 키 이름 단독 금지, '~해요' 체.
5. 실험 화면 안에는 그림과 짧은 라벨만. 긴 글은 takeaway / think / help 로.
6. 학생 화면에 '교사용'·'손들기'·'H 키'·성취기준 코드가 보이지 않게(교사 모드에서만).
7. 검수: 1280×720 · 1366×768 · 1920×1080 에서 잘림 0, 콘솔 오류 0, `node --check`.

---

## 7. 토큰 (R1, 바탕 #F5EFE0 기준 WCAG 대비, node 재계산)

| 토큰 | 값 | 대비 | 비고 |
|---|---|---|---|
| `--color-ink` / `--color-ink-muted` | #1C1A17 / **#5A5347** | 15.1 / 6.6 (sunk 위 6.0) | R1: 보조 글자 |
| `--fs-caption` / `--fs-meta` / `--fs-control` | 20u / 24u / 26u | — | 1280 에서 13 / 16 / 17px |
| `--space-thumb` / `--space-track` / `--space-btn-h-sm` | 56u / 10u / 56u | — | R1 신규·변경 |
| 식별색 projectile / slit / collision / orbit / lens (채도 −20%) | #27675A / #684074 / #9B4B37 / #434684 / #7C560E | 5.8 / 7.1 / 5.3 / 7.5 / 5.7 | 바탕 위 |
| 식별색 `-text` on `-tint` | #265B50 / #684074 / #884332 / #434684 / #6E4D0F | 5.8 / 5.9 / 5.4 / 6.2 / 5.7 | tint 위 글자 |
| primary · copper · ok · warn | 그대로 | 8.3 · 4.7 · 5.6 · 7.3 | |
| `--color-dim` (R3) | rgb(74 58 40 / .28) | — | 예측·모드 창 뒤 어둡기 |
| `--color-canvas-dark` / `--color-paper-label` (R3) | #2A2521 / rgb(251 248 239 / .85) | — | 캔버스 검은 면 / 캔버스 라벨 배경 |

세로 화면 설계(1330×2000)는 R1 에서 뺐다(통째로 줄어듦). R2 에서 세로 배치.

---

## 8. 검증 기록 (R1, 2026-10-28)
- `node --check shared/sim.js` 통과.
- `tools/shot.py` 로 허브(1280×720·1920×1080), 다섯 시뮬레이터 첫 화면(1280×720), 포물선 1366×768, 충돌 1920×1080 실행 중, 예제(`sims/_template`)의 예측→실행→판정→기록→비교→정리 흐름, 렌즈의 도움말·교사 모드·수업 안내·범위 밖 입력·⋯ 메뉴, 허브 → 이중슬릿(?mode=quantum)·위성(?mode=cannon) 을 찍어 확인. 콘솔 오류 0(경고는 `steps` 옵션·12자 넘는 카드 이름 안내뿐).
- 스크린샷: `_review/edu1/`.
