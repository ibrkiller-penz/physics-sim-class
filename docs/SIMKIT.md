# SimKit — 공통 틀 사용 설명서 (개발자용)

> 작성: 에듀테크팀 플랫폼 담당 · 2026-10-28
> 근거: `docs/04_팀장결정서.md` §1-3·§2·§3 · 레퍼런스 `32_프랑스혁명-수업사이트`(tokens·base·Nav·키 규칙)
> 다섯 시뮬레이터 개발자는 이 틀 **위에서만** 만든다. 틀을 고칠 일이 생기면 직접 고치지 말고 플랫폼 담당에게 요청한다.

---

## 1. 파일 구조

```
49_물리-수업시뮬레이터/
├─ index.html                 허브 표지 (카드 5장, 1~5 키로 열기)
├─ shared/
│  ├─ fonts.css               @font-face (로컬 woff2)
│  ├─ fonts/                  PretendardVariable.woff2, noto-serif-kr-{korean,latin}-{500,700,900}-normal.woff2, LICENSE-*.txt
│  ├─ tokens.css              디자인 토큰 (--u, --color-*, --fs-*, --space-*, --radius-*, --shadow-*, --dur-*)
│  ├─ base.css                리셋·16:9 무대·상단 메뉴·부품 클래스
│  ├─ shell.css               시뮬레이터 화면 뼈대 배치(제목 줄·실험 화면·조절 패널·하단 띠·하단 막대)
│  ├─ sim.js                  window.SimKit (결정서의 'shell.js' 역할)
│  └─ TEMPLATE.html           복사해서 시작하는 최소 예제
└─ sims/
   ├─ _template/index.html    TEMPLATE.html 과 같은 내용 — 바로 열어 동작 확인용
   └─ <slug>/index.html + sim.js     ← 여기에 만든다
```

slug: `projectile-energy` · `double-slit-quantum` · `collision-momentum` · `orbit-gravity` · `convex-lens`

**시작하는 법**
1. `shared/TEMPLATE.html` → `sims/<slug>/index.html` 로 복사.
2. `<body data-sim="<slug>">` 로 바꾼다(식별색이 제목 밑줄·칩·예측 카드에 들어감).
3. 인라인 `<script>` 내용을 `sims/<slug>/sim.js` 로 옮기고 `<script src="sim.js"></script>`.
4. `index.html` 을 더블클릭(file://)해서 열리는지 확인.

불러오는 순서(바꾸지 말 것): `fonts.css → tokens.css → base.css → shell.css → ../../shared/sim.js → sim.js`

---

## 2. 화면 뼈대 (1920×1080 기준, 단위 u) — `SimKit.init()` 이 만든다

| 칸 | 클래스 / `SimKit.el.*` | 위치·크기 | 내용 |
|---|---|---|---|
| 제목 줄 | `.sim-top` / `top` | y 0~88 | 브랜드(허브 링크) · 명조 40u 제목(식별색 밑줄) · 과목·단원·성취기준 칩 · 오늘 알아볼 것 · 상태 줄(24u) · 단계 탭 |
| 실험 화면 | `.sim-stage` / `stage` | x40 y100, 1250×700 | `SimKit.view` 캔버스(논리 좌표 1250×700). 모서리 판 `cornerTL/TR/BL/BR` |
| 조절 패널 | `.sim-panel` / `panel` | x1310 y100, 570×860 | `SimKit.panel('situation' → 'values' → 'tools' → 'deep')` 순서 고정. 비어 있는 칸은 숨음 |
| 하단 띠 | `.sim-band` / `band` | x40 y816, 1250×144 | `meters`(계기판) · `graph`(그래프) · `records`(기록 표) 3칸, 비율 5:4:4. 바꾸려면 `SimKit.el.band.style.gridTemplateColumns` |
| 하단 막대 | `.sim-bar` / `bar` | y976~1064 | [프리셋 1~5] [▶ 실행 Space][◀ ,][▶ .][속도] [기록 S][초기화 R][지우기 C] |
| T 접기 | `.sim.is-collapsed` | 실험 화면 1840×860 | 패널·하단 띠 숨김. `stageFit:true` 면 1250×700 그림이 비율대로 커짐 |
| 세로 태블릿 | `@media (orientation: portrait)` | 설계 1330×2000 | 실험 화면 → 하단 띠 → 패널(2열) → 하단 막대 순으로 세로 배치. 실험 화면 크기는 그대로 |

창 비율이 16:9 가 아니면 무대 전체가 줄어들고 남는 곳은 양피지색(레터박스).

---

## 3. 클래스 목록 (base.css)

| 분류 | 클래스 |
|---|---|
| 무대 | `.app` `.slide` · 상단 메뉴 `.menu` `.menu__brand` `.brand-mark` `.menu__name` `.menu__list` `.menu__item[aria-current=step]` `.menu__key` |
| 버튼(72u 이상) | `.btn` `.btn--primary` `.btn--secondary` `.btn--quiet` `.btn--danger` `.btn--icon` `.btn--lg` `.btn--sm`(표 안 보조만) `.btn__key` `.btn__sub` `[aria-pressed=true]` |
| 칩·꼬리표 | `.chip` `--sim` `--primary` `--copper` `--warn` `--ok` `--outline` · 프리셋 꼬리표 `.chip[data-tag="탐구 재현|대표 문항|오개념|과학사|교통안전|작용·반작용|발사체|생활 속|기묘함"]` · `.tag--live`(즉시) `.tag--restart`(다시 시작) |
| 변수 위젯 | `.var` `.var__head` `.var__label` `.var__sym` `.var__input` `.var__unit` `.var__row` `.var__step` `.range` `.var__ticks` `.var__bubble` `.var__msg` · 상태 `.is-dragging` `.is-pending` `.is-disabled` |
| 상황 전환 | `.ctl` `.ctl__label` · 세그먼트 `.seg` `.seg__opt` · 카드형 `.seg--cards` · 체크 토글 `.check` `.check__box` `.check__state` |
| 프리셋 | `.preset` `.preset__key` `.preset__name` · 설명 줄 `.preset-info` (`.is-change` 바꿀 값 / `.is-fixed` 고정한 값) |
| 계기판 | `.meters` `.meter[data-q=velocity|force|energy-k|energy-p|heat]` `.meter__label` `.meter__value`(56u) `.meter__value--md` `.meter__unit` `.meter.is-hidden-value`(H 전 흐림) |
| 그래프 | `.graph-box` `.graph-box__title` `.graph-box__legend` `.graph-box__canvas` |
| 기록 표 | `.rec-box` `.rec-table` `td.is-changed`(바뀐 변수 굵게) `tr.is-ghost`(직전 실행) `.rec-swatch` |
| 질문 판 | `.think` `.think__label` `.think__q` `.think__hint` ('생각해 보기') |
| 예측 카드 | `.predict-layer` `.predict` `.predict__q` `.predict__choices` `.predict__info` |
| 안내·창 | `.notice` `--warn` `--restart` `--ok` · `.dialog-layer` `.dialog` · 서랍 `.drawer` `.guide-table` |
| 기타 | `.progress`(진행 알약) `kbd` `.num`(표 숫자) `.teacher-only`(H 때만 보임) `[data-step-only="비교 정리"]` `.sr-only` |
| 실험 화면 판 | `.stage-corner--tl/tr/bl/br` (shell.css) |

---

## 4. SimKit API

### 4-1. 시작
```js
SimKit.init({
  slug: 'projectile-energy', title: '포물선 운동과 역학적 에너지',
  subject: '역학과 에너지 (진로 선택)', unit: '(1) 시공간과 운동',
  standards: ['12역학01-02'], today: '수평으로 던진 공과 그냥 떨어뜨린 공, 무엇이 먼저 땅에 닿을까?',
  // steps 생략 = ['예측','실행','비교','정리'],  onStep(i, name)
  dt: 1/240,               // 고정 물리 간격(초)
  stageFit: true,          // 논리 좌표 1250×700 고정 (false: view.w/h 가 칸 크기 u 를 따름)
  reset(p)   { ... },      // p = SimKit.params. 처음 상태 만들기
  step(dt,p) { ... },      // 한 걸음. 끝나면 SimKit.finish('문장')
  render(view, p) { ... }, // view.ctx 에 그리기 (바탕은 이미 지워져 있음)
  capture(p) { return { series: { y: [[t,y],...] }, values: { range: 40 } }; }, // 기록·직전 흐림용
  save() { return {...}; }, load(s) { ... },     // 선택: ',' 한 프레임 뒤로
  status(p) { return 'g = 10 m/s² · 공기 저항 끔'; },
  predictOnPreset: true
});
```
`init` 직후 같은 틱 안에서 `addVar/addChoice/addToggle/meters/graph/recordTable/setPresets/guide` 를 부른다. 첫 `reset` 은 그 다음 틱에 자동 호출.

### 4-2. 값 두 벌 — 가장 중요한 규칙
- `SimKit.ui[key]` = 패널에 보이는 값, `SimKit.params[key]` = **지금 실행에 쓰는 값**. 물리 코드는 **언제나 `params` 만** 읽는다.
- `apply:'live'`(즉시): 바꾸면 params 도 바로 바뀜. `apply:'restart'`(다시 시작, 기본): 실행 전이면 곧바로 reset, 실행 중이면 params 는 그대로 두고 "다음 실행부터 적용돼요 — R" 안내 + 꼬리표 강조 + 상태 줄 표시.
- `SimKit.get(key)`, `SimKit.set(key, v, {silent})`, `SimKit.valueText(key, v)`(표용 글자).

### 4-3. 수치 바꾸기 (요구 A)
```js
SimKit.addVar('values', { key:'v0', label:'처음 속력', symbol:'v₀', unit:'m/s',
  min:0, max:30, step:1, value:20, decimals:0, precision:1, ticks:[0,10,20,30],
  apply:'restart', record:true, teacher:false, hint:'', onChange(v, info){} });
```
슬라이더(손잡이 48u, 끄는 동안 손가락 위 말풍선) + −/+(누르고 있으면 반복) + 숫자칸(`inputmode=decimal`, Enter 확정, Esc 취소) + 단위 + 꼬리표. 숫자칸은 `precision` 자리까지 정확한 값 입력 가능(슬라이더 눈금에 묶이지 않음). 범위 밖 → 빨간 안내 "범위는 a ~ b 예요. 가장 가까운 b 로 맞췄어요." 반환 `{get, set, setRange, enable, el}`.

### 4-4. 상황 바꾸기 (요구 B)
```js
SimKit.addChoice('situation', { key:'planet', label:'어디에서 던질까?', style:'cards', apply:'restart',
  options:[{value:'earth',label:'지구',sub:'g = 9.8'},{value:'moon',label:'달',sub:'g = 1.6'}], value:'earth' });
SimKit.addToggle('tools', { key:'showV', label:'속도 화살표', value:true });   // tools 는 기본 record:false
SimKit.setPresets([{ name:'30°와 60°', tag:'탐구 재현', change:'θ 30° → 60°', fixed:'v₀ 20 m/s, h 0',
  values:{ theta:30, v0:20, h:0 }, predict:{ question:'어느 쪽이 더 멀리 갈까?', choices:['30°','60°','같다'] },
  onApply(p){} }]);       // 최대 5개, 키 1~5. 누르면: 값 설정 → reset(직전 실행 보관) → 설명 줄 → 예측 카드
SimKit.chooseMode({ title:'무엇을 알아볼까요?', modes:[{value:'cannon',label:'뉴턴의 대포',desc:'...'}], onPick(v){} });
```

### 4-5. 비교 (요구 C)
- **S** `SimKit.record()` → `capture()` + 기록 대상 변수 스냅샷 → `SimKit.records[i] = {n, slot, params, values, series, changed[], preset, prediction}`. 최대 5, 같은 실행 두 번 기록 안 됨, 직전 기록과 2개 이상 바뀌면 경고.
- **R** `SimKit.reset()` → 실행했던 결과는 `SimKit.ghost`(직전 실행, 35% 흐림)로 자동 보관. 기록은 그대로.
- **C** `SimKit.clearRecords()` → 확인 창 후 기록·직전 모두 삭제.
- `SimKit.recordTable(null, {columns:[{key:'v0', from:'param'}, {key:'range', label:'수평 거리', unit:'m', decimals:1, from:'value'}]})` — 기록 칸에 표. 크게 보기 단추 있음.
  - 열 옵션 `text: function(rec, prev) → string` — 그 줄의 기록 전체(`rec.params`·`rec.values`)를 보고 글자를 정한다. 예) 벽 모드 줄의 m₂ 는 `'–'`.
  - 열 옵션 `changed: true | function(rec, prev) → bool` — 결과(`from:'value'`) 열에도 '바뀜' 굵게(`td.is-changed`)를 붙인다. `true` 면 `values[key]` 가 직전 기록과 다를 때. 작은 표와 '크게 보기' 창 모두에 적용되므로 표 DOM 을 직접 고치지 않는다.
- `SimKit.graph(null, {title, x:{label:'t',unit:'s',min:0,max:'auto'}, y:{...}, series:[{key:'y',label:'높이',color:'--color-primary'}]})` → 매 render 에서 `g.draw({y: points})`. 직전·기록 선은 저절로 겹침.
- 실험 화면 위 궤적 겹치기: `SimKit.records.forEach(r => SimKit.drawPath(ctx, r.series.path, SimKit.recStyle(r.slot), map))`, 직전은 `SimKit.ghostStyle()`.
- `SimKit.onRecords(fn)` 기록·직전이 바뀔 때.

### 4-6. 그리기·계기판
- `SimKit.view` = `{canvas, ctx, w, h, clear(), toLogical(pointerEvent)}` — 논리 좌표, 1 = 1u, 왼쪽 위 원점, HiDPI 자동.
- `SimKit.canvas(container, {w,h,fit})` 추가 캔버스. `SimKit.color('--color-q-force')` 토큰 색. `SimKit.px(n)` n u 의 CSS px.
- `SimKit.arrow(ctx, x1,y1,x2,y2, {color:'--color-q-velocity', width:5, dash:[8,6], label:'v'})`.
- `SimKit.meters(null, [{key:'vx', label:'수평 속도', symbol:'vₓ', unit:'m/s', decimals:1, q:'velocity', hidden:false}])` → `m.update({vx: 12.3})`.
- `SimKit.fmt(v, d)` 음수 '−', 소수 자리 고정.

### 4-7. 흐름·안내
`play/pause/toggle/reset/finish(msg)/stepFrame(±1)/setSpeed(x)` · `time/running/started/finished/speed` · `goStep(i)/nextStep/prevStep/stepIndex/stepName` · `predict({question, choices, info, tag, handCount}) → Promise<번호|null>` (키 1~n · 카드의 '✋ 손들기 수' 를 누르면 선택지마다 손든 수 입력칸, 결과는 `SimKit.prediction.counts`; `handCount:false` 로 숨김) · `notice(text, 'info'|'warn'|'restart'|'ok', ms)`(실험 화면 아래 가운데, 최대 2개) · `confirm({title, body, ok, cancel, danger}) → Promise<bool>` · `dialog(...)` · `guide({rows:[{target, standard, discover, misconception}], sections:[{title, items:[]}], keys:'V 화살표'})` · `setStatus(text|null)` · `update()` · `requestRender()` · `onFrame(fn)` · `onKey(e => true면 처리 끝)` · `isTeacher()`.

---

## 5. 키 규칙 (모든 시뮬레이터 공통, `e.code` 사용 → 한글 입력 상태에서도 동작)

| 키 | 하는 일 |
|---|---|
| F | 전체 화면 켜기/끄기 |
| → / PageDown, ← / PageUp | 단계 예측 › 실행 › 비교 › 정리 (프레젠터 리모컨 호환) |
| Space | 실행 / 일시정지 (끝난 뒤 누르면 새로 실행) |
| 1~5 | 프리셋 (예측 카드·모드 카드가 떠 있으면 그 선택지) |
| R | 초기화 — **기록은 지우지 않음** |
| S | 기록 (최대 5) |
| C | 기록 지우기 (확인 창: Enter 지우기 / Esc 취소) |
| , / . | 한 프레임(1/60 초) 뒤 / 앞 |
| [ / ] | 재생 속도 0.05 · 0.1 · 0.25 · 0.5 · 1배 |
| H | 교사용 숨김값 (`.teacher-only`, `.meter.is-hidden-value`) |
| T | 조작판 접기 (실험 화면 1840×860) |
| Esc | 창·카드·서랍·심화 닫기 → 닫을 것이 없으면 1.5초 안에 두 번 = 허브로 |

- 숫자칸·글자칸 포커스 중에는 공통 키가 모두 꺼진다(1~5 가 프리셋으로 넘어가지 않음). 슬라이더 포커스 중 화살표는 슬라이더가 받는다. 키보드로 포커스한 버튼의 Space/Enter 는 버튼을 누른다(마우스로 누른 버튼은 포커스가 저절로 빠짐).
- 결정서는 H 를 '교사용 숨김값'으로 정했으므로 허브 복귀는 **Esc 두 번**(또는 왼쪽 위 브랜드)이다.
- 시뮬레이터 전용 키(예: 위성 V)는 `SimKit.onKey` 로 추가하고 `guide({keys})` 에 적는다. 공통 키와 겹치지 않게.
- 단계 탭에는 번호 키를 붙이지 않는다(1~5 는 프리셋).

---

## 6. 지켜야 할 규칙

1. **file:// 로 동작**: 일반 `<script>` 만. ES module·`fetch`·XHR·CDN·외부 글꼴 금지. 데이터는 JS 객체로.
2. **색은 토큰 이름으로만**: CSS 는 `var(--color-*)`, Canvas 는 `SimKit.color('--color-*')`. 16진수 직접 금지, `color-mix()` 금지. 물리량 색은 뜻이 고정: 속도 `--color-q-velocity`(청록), 힘·가속도 `--color-q-force`(구리), 운동 에너지 `-k`, 위치 에너지 `-p`(글자는 `-p-text`), 열·손실 `-heat`, 직전 실행 `--color-q-ghost`. 기록은 `SimKit.recStyle(i)`(색+선 모양 함께) — 색만으로 구분하지 않는다.
3. **크기는 u**: CSS 는 `calc(n * var(--u))`, Canvas 는 논리 좌표(1 = 1u). 버튼·터치 대상 72u 이상, 슬라이더 손잡이 48u, 본문 글자 28u 이상(라벨·표 20~24u), 계기판 숫자 56u.
4. **움직임 0.3초 이하**, 그림자는 `--shadow-*` 만. 소리 없음.
5. **값은 params 로 읽는다**. 위젯 값을 물리 코드에서 직접 읽지 않는다. 모든 주요 변수는 `addVar`(슬라이더+숫자칸+단위+꼬리표)로 만든다.
6. **요구 D**: 첫 화면 변수 3~4개. 성취기준과 관계없는 변수는 `'deep'`(심화 ▸)에만. 상황 전환 3가지 이상, 프리셋 3개 이상(꼬리표 + `change`/`fixed` 필수). 기본값·범위·`step` 은 결정서 §4 대응표의 교과서 값(계산이 깔끔한 값)을 그대로. 대응표는 `SimKit.guide({rows})` 에 **결정서와 같은 내용**으로 넣는다.
7. **성취기준 코드는 결정서에 확인된 것만**. 모르면 `(확인 필요)`. 지어내지 않는다.
8. **쉬운 말 + 기호**: 변수 이름은 `label:'처음 속력', symbol:'v₀'`. 안내 문구는 "~해요" 체.
9. **기록**: `capture()` 는 실행을 비교하는 데 필요한 결과만(series 는 점 수백 개 이내로 솎아서). R 은 기록을 지우지 않는다.
10. 끝나는 실험은 반드시 `SimKit.finish('문장')` 을 불러 '끝' 상태를 알린다.
11. `shared/` 파일을 고치지 않는다. 필요한 스타일은 `sims/<slug>/` 안 `<style>` 또는 별도 CSS 로, 공통 클래스를 덮어쓰지 말고 새 클래스(접두사 `<slug 약어>-`)로.
12. 검수 전 확인: 1920×1080 · 1280×720 · 세로 태블릿에서 잘림 없음, 콘솔 오류 0, 숫자칸 포커스 중 1~5 무시, 60 fps.

---

## 7. 디자인 토큰 요약 · 대비 검증 (2026-10-28, WCAG 공식으로 node 재계산, 바탕 #F5EFE0)

| 토큰 | 값 | 대비 | 용도 |
|---|---|---|---|
| `--color-ink` / `-muted` | #1C1A17 / #4E473C | 15.1 / 8.0 | 글자 |
| `--color-primary` (`-dark`, `-tint`) | #0F4C5C (#0A3542, #D6E6EA) | 8.3 (tint 위 7.4) | 선택·주 버튼·속도 |
| `--color-copper` / `-text` / `-tint` | #9A5B1E / #7A4612 / #F1E4D3 | 4.7 / 6.8 (tint 위 6.2) | 힘·가속도 / 구리 글자 / '다시 시작' |
| `--color-q-energy-k` / `-p` / `-p-text` / `-heat` | #1F6F5F / #B07A00 / #8A5A00 / #A8432A | 5.2 / 3.3(면 전용) / 5.2 / 5.2 | 에너지 막대 |
| `--color-ok` / `--color-warn` | #2E6B3A / #8E2A26 | 5.6 / 7.3 | 상태 (결정서 근사 6.1 → 실측 5.6) |
| `--color-line-strong` / `--color-focus` | #8A7E68 / #B26B00 | 3.5 / 3.7 | UI 3:1 충족 |
| 식별색 projectile / slit / collision / orbit / lens | #1F6F5F / #6B3A7A / #A8432A / #3B3F8C / #8A5A00 | 5.2 / 7.3 / 5.2 / 8.0 / 5.2 | 카드 띠·밑줄·칩 |
| 식별색 tint (12%) | #DBE0D1 / #E4D9D4 / #ECDACA / #DFDAD6 / #E8DDC5 | — | 칩 바탕 |
| 식별색 `-text` (tint 위 글자) | #1F6254 / #6B3A7A / #933D27 / #3B3F8C / #7A5003 | 5.3 / 6.0 / 5.3 / 6.7 / 5.2 | projectile·collision·lens 는 원색이 tint 위 4.4~4.5 라 진한 글자색을 따로 둠 |

`<body data-sim="<slug>">` 를 주면 `--sim` `--sim-tint` `--sim-text` 가 그 시뮬레이터 색으로 바뀐다. 부품은 이 세 변수만 쓴다.

---

## 8. 검증 기록 (2026-10-28)
- `node --check shared/sim.js` 통과, TEMPLATE·허브 인라인 스크립트 문법 통과.
- 브라우저(로컬 정적 서버 경유, 1600×900 · 820×1180 세로): `sims/_template/index.html` 콘솔 오류 0 — Space 실행·끝, S 기록, 프리셋 2 → 예측 카드 → 3 선택, 숫자칸 40 입력 → 범위 안내 후 25, 실행 후 '다시 시작' 안내, 기록 표 크게 보기, T 접기, 세로 배치 확인. 허브 콘솔 오류 0.
- file:// 직접 열기는 검증 도구가 로컬 파일 접근을 막아 확인하지 못함 — 코드에 fetch·module 이 없으므로 동작 조건은 충족. 교실 PC 에서 더블클릭으로 한 번 더 확인할 것.

---

## 8. 최종 통합 점검에서 더한 것 (팀장, 2026-10-28)

고도화팀의 `shared/` 수정 요청 가운데 다른 시뮬레이터를 깨뜨리지 않는 것을 반영했다. 다섯 시뮬레이터 모두 `node --check` 통과, 로컬 서버 브라우저 확인 콘솔 오류 0.

| 요청 | 반영 |
|---|---|
| 기록 표 열에 그 줄의 값을 보고 글자를 정하는 기능 (충돌) | `columns[].text(rec, prev)` |
| 결과 열에도 '바뀜' 굵게, 크게 보기 창 포함 (포물선·이중 슬릿·렌즈) | `columns[].changed` (true 또는 함수) |
| `setSpeed` 안에서 다시 그리기 (위성) | `SimKit.setSpeed` 가 `requestRender` 를 겸함 |
| 안내 말풍선이 3개까지 쌓여 프리셋 설명 줄·왼쪽 위 안내를 가림 (포물선·이중 슬릿) | 실험 화면 아래 가운데로 옮기고 최대 2개 |
| 교사 화면 '손들기 수 입력' (포물선) | 예측 카드 '✋ 손들기 수' |
| 꼬리표 색 '작용·반작용'·'발사체'(충돌), '생활 속'(렌즈), '기묘함'(이중 슬릿) | `base.css` 공통 색표 |
| 제목 줄 넘침·상태 줄 겹침 (이중 슬릿) | `.sim-top__main` 은 내용 너비 기준, 상태 줄이 먼저 줄어듦(최소 190u), `.sim-top__line2` 넘침 숨김 |
| 슬로 모션 배율 공식 기능 (충돌) | 미반영 — 지금은 `SimKit.setSpeed(배율)` 로 임의 배율을 넣을 수 있고 `[ ]` 는 5단만 순환. 필요하면 다음 차례 |

시뮬레이터 쪽에서 지운 우회 코드: 포물선(`onRecords` 로 td 굵게), 이중 슬릿(`markChangedCells`, `DSQDebug`), 렌즈(`postTable` 의 is-changed 3줄), 충돌(`SK.valueText` 덮어쓰기), 위성(`SK.setSpeed` 감싸기).
