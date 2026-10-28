# SimKit — 공통 틀 사용 설명서 (개발자용, R2 고도화 2차)

> 작성: 에듀테크1(디자인 리드) · 2026-10-28
> 근거: `docs/개선/R1_계획.md` §2(디자인 방향)·§3(A1~A18, H1~H2) · 이전 판: `docs/04_팀장결정서.md`
> 다섯 시뮬레이터는 이 틀 **위에서만** 만든다. `shared/` 를 고칠 일이 생기면 디자인 리드에게 요청한다.
> 바로 동작하는 예제: `sims/_template/index.html` (= `shared/TEMPLATE.html`) — R2 새 API 를 모두 씀.

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
| 실행 | 하단 막대 | `▶ 실행` → 실행 중 `⏸ 멈추기` → 멈춤 `▶ 이어서 실행` → 끝 `↻ 다시 실행`(윤곽선) | 띠 버튼에 '실행하기' |
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
│  ├─ fonts.css · fonts/      로컬 글꼴
│  ├─ tokens.css              디자인 토큰 (--u, --color-*, --fs-*, --space-* …)
│  ├─ base.css                리셋·무대·부품 클래스 (R1 부품은 파일 끝 19~30번)
│  ├─ shell.css               시뮬레이터 화면 뼈대 배치 (R1 전면 수정)
│  ├─ sim.js                  window.SimKit
│  └─ TEMPLATE.html           복사해서 시작하는 예제 (= sims/_template/index.html)
└─ sims/<slug>/index.html + sim.js (+ <slug>.css)
```
불러오는 순서(바꾸지 말 것): `fonts.css → tokens.css → base.css → shell.css → ../../shared/sim.js → sim.js`

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
- `SimKit.el.*`: `root slide top task note stage panel(스크롤 칸) panelBox recBig thinkBoard band meters graph records(기록 칩) bar presets cornerTL/TR/BL/BR status notices`
- 오른쪽 칸 전환: 비교 단계 → 기록 큰 판, 정리 단계 → 질문 판(think 가 있으면). 판 머리 '설정 보기 ▸', 패널 머리 '기록 표 보기 ▸', 기록 칩 '표 보기/표 닫기'. `SK.showSide('panel'|'records'|'think')`.
- 패널은 안에서 스크롤, 끝이 아니면 아래 그림자 + '아래에 더 있어요 ↓'(누르면 내려감). 칸마다 '기본값으로 ↺'.
- T(또는 ⋯ › 조작판 접기): 패널·띠 숨기고 실험 화면 1840×760.
- 폭 600px 이하: 맨 위 '태블릿이나 PC 에서 열어 주세요' 띠(세로 배치는 R2).

---

## 3. 클래스 (base.css · shell.css)

| 분류 | 클래스 |
|---|---|
| 지금 할 일 | `.sim-task` `.task-steps` `.task-step[aria-current=step]` `.task-step.is-done` `.task-step__num` `.task-now__text` `.task-now__sub` `.task-now__act` |
| 버튼 | `.btn` `--primary` `--secondary` `--quiet` `--danger` `--icon` `--sm`(56u) `--lg` · `.btn__key`(기본 숨김, `html.show-keys`·호버·키보드 포커스에서만) |
| 변수 위젯 | `.var` `.var__head` `.var__label` `.var__sym` `.var__range`(범위 상시) `.var__input` `.var__unit` `.var__row` `.var__step` `.var__stepinfo`(±step) `.range`(트랙 10u·손잡이 56u) `.var__ticks`(20u 먹색, 3개, 손잡이 밑은 숨김) `.var__err`(범위 밖 고정 안내) `.var__hint` · `.is-pending` `.is-flash` `.is-folded` |
| 반영 아이콘 | `.apply-ico--live`(⚡) `.apply-ico--restart`(↻, 실행 중 바꾸면 '↻ 다음 실행부터') — 예전 `.tag--live/--restart` 는 CSS 만 남음 |
| 실험 카드 | `.preset-card` `.preset-card__name`(2줄) `.preset-card__key` `.preset-card__tag`(20u 풀어쓴 말) `.preset-tip`(호버 설명) `.preset-info`(고른 카드, 왼쪽 위) |
| 상태 칩 | `.stage-status .chip` `.is-run` `.is-done` `.is-pend` |
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

세로 화면 설계(1330×2000)는 R1 에서 뺐다(통째로 줄어듦). R2 에서 세로 배치.

---

## 8. 검증 기록 (R1, 2026-10-28)
- `node --check shared/sim.js` 통과.
- `tools/shot.py` 로 허브(1280×720·1920×1080), 다섯 시뮬레이터 첫 화면(1280×720), 포물선 1366×768, 충돌 1920×1080 실행 중, 예제(`sims/_template`)의 예측→실행→판정→기록→비교→정리 흐름, 렌즈의 도움말·교사 모드·수업 안내·범위 밖 입력·⋯ 메뉴, 허브 → 이중슬릿(?mode=quantum)·위성(?mode=cannon) 을 찍어 확인. 콘솔 오류 0(경고는 `steps` 옵션·12자 넘는 카드 이름 안내뿐).
- 스크린샷: `_review/edu1/`.
