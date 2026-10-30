/* =====================================================================
   물리 시뮬레이터 실험실 — 교과 설명 층 SimLesson (R7 1차 · R7 2차, 2026-10-30)
   일반 <script> 로 shared/sim.js·diagram.js 다음, 시뮬레이터 sim.js 앞에 불러온다. 전역: window.SimLesson + SimKit.lesson(data)
     <script src="../../shared/icons.js"></script>
     <script src="../../shared/sim.js"></script>
     <script src="../../shared/diagram.js"></script>
     <script src="../../shared/lesson.js"></script>
     <script src="pe-physics.js"></script>   (있는 sim 만)
     <script src="sim.js"></script>           SimKit.init
     <script src="lesson.js"></script>        SimKit.lesson({...}) 데이터
   근거: docs/개선/R7_1차_계획.md §1-5 · R7_2차_계획.md §1-5~§1-9 · 데이터 형식·장 타입은 docs/SIMKIT.md §0R7·§0R7-2

   한 페이지 한 층: html.is-lesson 이면 .lesson 이 실험 화면을 덮는다(실험 DOM 은 지우지 않는다 — 닫으면 그림·값·실행 위치 그대로).
   첫 진입: ?view=explain[&ch=id] → 그 장 · ?view=sim → 바로 실험 · 쿼리 없으면 저장 physsim.lesson.<slug>.skip !== '1' 이면 설명(교사 모드는 skip 무시)
   키(설명 층): → PageDown Space 다음(마지막 장이면 실험 시작) · ← PageUp Shift+Space 이전 · Home/End · 1~9 장 · Enter(마지막 장) 실험 시작
               · Esc 실험으로(첫 진입도) · J 실험으로 · F · ?
   R7-2: wrap 장은 설명 순서에서 뺀다(정리 모달 형성평가만) · 성취기준·더 보기 접힘 · 글자 [보통|크게] · 넘침 경고 · 목차 · check 탭 · 오해 카드 · 식 팝업 API
   정답·teacherNote 는 교사 모드일 때만 DOM 에 넣는다(학생 DOM 에 없음).
   ===================================================================== */
(function (global) {
  'use strict';
  var SK = global.SimKit;
  if (!SK) { console.warn('SimLesson: shared/sim.js 를 먼저 불러오세요.'); return; }
  var D = global.SimDiagram || null;
  var h = SK.h;

  var data = null, slug = '', root = null, els = {}, open = false, firstEntry = false, cur = 0, keysOpen = false, tocOpen = false;
  var tabOf = {};   // check 장 id → 고른 탭 id
  var KEY = function (k) { return 'physsim.lesson.' + slug + '.' + k; };
  function store(k, v) { try { if (v === null) localStorage.removeItem(KEY(k)); else localStorage.setItem(KEY(k), v); } catch (e) { /* 저장 안 돼도 이번에는 동작 */ } }
  function load(k) { try { return localStorage.getItem(KEY(k)); } catch (e) { return null; } }
  function ico(name, cls) { return SK.icon(name, { cls: cls || 'ico--lead' }); }
  function portrait() { try { return global.matchMedia('(orientation: portrait) and (min-width: 601px)').matches; } catch (e) { return false; } }
  /** 기호 비교용: '$v_{0}$' → 'v_0' (diagram.js D.label sym 과 같은 규칙) */
  function normSym(s) { return String(s || '').replace(/[$\s{}\\]/g, ''); }

  /** 이 모드에서 보일 장 (심플 = data.simple 목록, 순서는 원래 순서) — R7-2: wrap 장은 빼고(정리 모달에서만) */
  function visible() {
    var all = (data.chapters || []).filter(function (c) { return c.type !== 'wrap'; });
    if (SK.isSimple && SK.isSimple() && data.simple && data.simple.length) {
      var want = {}; data.simple.forEach(function (id) { want[id] = true; });
      var list = all.filter(function (c) { return want[c.id]; });
      if (list.length) return list;
    }
    return all;
  }
  function indexOf(id) { var v = visible(); for (var i = 0; i < v.length; i++) if (v[i].id === id) return i; return -1; }
  /** 이 모드에서 보일 확인 질문 — 심플이면 simple:false 질문은 숨긴다 (팀장 R7 마무리: UI팀1·3 요청) */
  function questionsOf(c) {
    var qs = (c && c.questions) || [];
    if (SK.isSimple && SK.isSimple()) return qs.filter(function (q) { return q.simple !== false; });
    return qs;
  }
  function chapterById(id) { var all = data.chapters || []; for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }
  function wrapChapter() { var all = (data && data.chapters) || []; for (var i = 0; i < all.length; i++) if (all[i].type === 'wrap') return all[i]; return null; }

  /** 수식 안 \sin \cos \tan 는 바로 선 글자로: '$v_0 \cos θ$' → '$v_0$ cos $θ$' */
  function fnTex(s) {
    return String(s || '').replace(/\$([^$]*)\$/g, function (m, inner) {
      return ('$' + inner.replace(/\\(sin|cos|tan|ln|log)\s*/g, '$ $1 $') + '$').replace(/\$\s*\$/g, ' ');
    });
  }
  /** 인라인 표기: **굵게** · {{용어}} · $수식$ — SK.rich 가 {{}}·$…$ 를 맡는다 */
  function inline(text) {
    var out = [];
    fnTex(text).split(/(\*\*[^*]+\*\*)/).forEach(function (seg) {
      if (!seg) return;
      if (/^\*\*[^*]+\*\*$/.test(seg)) out.push(h('strong', null, richNowrap(seg.slice(2, -2))));
      else richNowrap(seg).forEach(function (n) { out.push(n); });
    });
    return out;
  }
  /** R7-3(S6): $…$ 수식 한 덩어리는 줄에서 끊기지 않게 <span class="nowrap"> (캡션 'r = R + h' 끊김) — {{frac:}}·{{용어}} 는 SK.rich 그대로 */
  function richNowrap(text) {
    var out = [];
    String(text).split(/(\{\{.+?\}\}|\$[^$]+\$)/).forEach(function (seg) {
      if (!seg) return;
      if (/^\$[^$]+\$$/.test(seg) && /\s/.test(seg)) out.push(h('span', { class: 'nowrap' }, SK.rich(seg)));
      else SK.rich(seg).forEach(function (n) { out.push(n); });
    });
    return out;
  }
  function para(text, cls) { return h('p', { class: cls || 'lesson__p' }, inline(text)); }
  function paras(list, cls) { return (Array.isArray(list) ? list : list ? [list] : []).map(function (t) { return para(t, cls); }); }

  /* ── 뼈대 ── */
  function build() {
    if (root) return;
    var hub = h('a', { class: 'lesson__hub', href: '../../index.html', title: '처음 화면(실험 고르기)으로' }, [ico('arrow-left'), '허브']);
    try { var hb = document.querySelector('.sim-top__hub'); if (hb) hub.href = hb.getAttribute('href'); } catch (e) { /* 그대로 */ }
    els.title = h('h1', { class: 'lesson__title' });
    // R7-2(S13): 'N / M · 단원' — 누르면 목차(장 제목·읽음 점)
    els.where = h('button', { class: 'lesson__where', type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: '목차 — 장 고르기' });
    els.where.addEventListener('click', function (e) { if (e.detail > 0) els.where.blur(); toggleToc(); });
    // R7-3(S5): 교사 차시 진행 띠 [도입][설명][실험][정리] — 타이머 없음, 권장 분은 title 에만. 설명 층 머리줄에만(실험 화면은 .sim-task 단계 점)
    els.pace = h('nav', { class: 'lesson__pace teacher-only', 'aria-label': '차시 진행' });
    [['intro', '도입', '5'], ['explain', '설명', '10'], ['sim', '실험', '20'], ['wrap', '정리', '10']].forEach(function (p) {
      var b = h('button', { class: 'lesson__pacebtn', type: 'button', 'data-pace': p[0], title: p[1] + ' — 권장 5·10·20·10분 중 ' + p[2] + '분' }, [h('i', { class: 'lesson__pacedot', 'aria-hidden': 'true' }), h('span', { class: 'lesson__pacet', text: p[1] })]);
      b.addEventListener('click', function (e) {
        if (e.detail > 0) b.blur();
        if (p[0] === 'intro') go(0);
        else if (p[0] === 'sim') close();
        else if (p[0] === 'wrap') { close(); if (SK.openThink) setTimeout(function () { SK.openThink(); }, 0); }
      });
      els.pace.appendChild(b);
    });
    els.toSimTxt = h('span', { class: 'lesson__btntxt', text: '실험으로' });
    els.toSim = SK.btn([els.toSimTxt, h('span', { class: 'lesson__btntxt-s', text: '실험' }), ico('arrow-right', 'ico--trail')], 'btn--primary lesson__tosim', function () { close(); }, { title: '실험 화면으로 (Esc · J)' });
    var helpB = SK.btn([ico('help')], 'btn--outline lesson__icon', function () { toggleKeys(); }, { 'aria-label': '설명 화면 키 안내', title: '키 안내 (?)' });
    var fsB = SK.btn([ico('expand')], 'btn--outline lesson__icon', function () { SK.toggleFullscreen(); }, { 'aria-label': '전체 화면', title: '전체 화면 (F)' });
    var head = h('header', { class: 'lesson__head' }, [hub, els.title, els.where, h('span', { class: 'lesson__gap' }), els.pace, els.toSim, helpB, fsB]);
    els.text = h('article', { class: 'lesson__text', tabindex: '-1' });
    els.text.addEventListener('scroll', function () { markOver(); }, { passive: true });
    global.addEventListener('resize', function () { if (open) requestAnimationFrame(markOver); });
    els.figbox = h('div', { class: 'lesson__figbox lesson-fig' });
    els.how = h('figcaption', { class: 'lesson__how' });
    els.fig = h('figure', { class: 'lesson__fig' }, [els.figbox, els.how]);
    els.body = h('main', { class: 'lesson__body' }, [els.text, els.fig]);
    els.body.addEventListener('scroll', function () { if (els.body.classList.contains('is-portrait')) markOver(); }, { passive: true });
    els.prev = SK.btn([ico('chev-left'), '이전'], 'btn--outline lesson__prev', function () { go(cur - 1); }, { title: '이전 장 (← · PageUp)' });
    els.next = SK.btn(['다음', ico('chev-right', 'ico--trail')], 'btn--primary lesson__next', function () { go(cur + 1); }, { title: '다음 장 (→ · PageDown · Space)' });
    els.start = SK.btn(['실험 시작', ico('play', 'ico--trail')], 'btn--primary lesson__start', function () { startSim(); }, { title: '실험 시작 (Enter · → · Space)' });
    els.dots = h('div', { class: 'lesson__dots', role: 'group', 'aria-label': '장 고르기' });
    els.count = h('span', { class: 'lesson__count num' });
    els.skipIn = h('input', { type: 'checkbox' });
    els.skip = h('label', { class: 'lesson__skip' }, [els.skipIn, '다음부터 바로 실험']);
    var foot = h('footer', { class: 'lesson__foot' }, [els.prev, h('div', { class: 'lesson__nav' }, [els.dots, els.count]), els.skip, els.next, els.start]);
    els.keys = h('div', { class: 'lesson__keys', hidden: true, role: 'note' }, [
      h('dl', null, [
        ['→ · Space · PageDown', '다음 장 (마지막 장이면 실험 시작)'], ['← · PageUp', '이전 장'], ['Home / End', '처음 / 끝 장'], ['1 ~ 9', '그 장으로'],
        ['Enter', '(마지막 장) 실험 시작'], ['Esc · J', '실험 화면으로'], ['F', '전체 화면'], ['밀기', '태블릿: 왼쪽·오른쪽으로 밀어 넘기기']
      ].reduce(function (a, k) { a.push(h('dt', { text: k[0] })); a.push(h('dd', { text: k[1] })); return a; }, []))
    ]);
    els.toc = h('div', { class: 'lesson__toc', hidden: true, role: 'menu', 'aria-label': '목차' });
    root = h('section', { class: 'lesson', role: 'dialog', 'aria-modal': 'true', 'aria-label': '교과 설명', hidden: true }, [h('i', { class: 'lesson__bar', 'aria-hidden': 'true' }), head, els.body, foot, els.keys, els.toc]);
    document.body.appendChild(root);
    // 태블릿: 좌우로 밀어 넘기기(60px 이상, 세로보다 가로가 클 때 · .no-swipe 안은 제외)
    var sx = 0, sy = 0, st = null;
    els.body.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) { st = null; return; } st = e.target; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    els.body.addEventListener('touchend', function (e) {
      if (!st || (st.closest && st.closest('.no-swipe, input, button, a, summary'))) { st = null; return; }
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; st = null;
      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
    root.addEventListener('pointerdown', function (e) {
      if (tocOpen && !els.toc.contains(e.target) && !els.where.contains(e.target)) toggleToc(false);
    });
    // 세로 ↔ 가로: 그림 자리 다시
    try { global.matchMedia('(orientation: portrait) and (min-width: 601px)').addEventListener('change', function () { if (open) placeFig(); }); } catch (e) { /* 예전 브라우저 */ }
  }
  function toggleKeys(on) { keysOpen = on === undefined ? !keysOpen : !!on; els.keys.hidden = !keysOpen; if (keysOpen) toggleToc(false); }
  /** R7-2(S13) 목차 팝오버 — 설명 층 안(실험 화면 팝업 틀은 뒤에 있어 쓰지 않는다) */
  function toggleToc(on) {
    tocOpen = on === undefined ? !tocOpen : !!on;
    els.toc.hidden = !tocOpen; els.where.setAttribute('aria-expanded', String(tocOpen));
    if (!tocOpen) return;
    keysOpen = false; els.keys.hidden = true;
    els.toc.innerHTML = '';
    var v = visible(), seen = seenList();
    if (unitName()) els.toc.appendChild(h('p', { class: 'lesson__tocunit', text: unitName() }));   // R7-3(S6)
    v.forEach(function (c, i) {
      var b = h('button', { class: 'lesson__tocitem' + (i === cur ? ' is-now' : ''), type: 'button', role: 'menuitem' }, [
        h('span', { class: 'lesson__tocno num', text: String(i + 1) }), h('span', { class: 'lesson__toct' }, inline(c.title || '')),
        h('i', { class: 'lesson__tocdot' + (seen.indexOf(c.id) >= 0 ? ' is-seen' : ''), 'aria-label': seen.indexOf(c.id) >= 0 ? '읽음' : '안 읽음' })
      ]);
      if (i === cur) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', function () { toggleToc(false); go(i); });
      els.toc.appendChild(b);
    });
    var r = els.where.getBoundingClientRect(), rr = root.getBoundingClientRect();
    els.toc.style.left = Math.max(8, r.left - rr.left) + 'px';
    els.toc.style.top = (r.bottom - rr.top + 6) + 'px';
    var now = els.toc.querySelector('.is-now');
    setTimeout(function () { try { (now || els.toc.querySelector('.lesson__tocitem')).focus({ preventScroll: true }); if (now) now.scrollIntoView({ block: 'nearest' }); } catch (e) { /* 무시 */ } }, 0);
  }

  /* ── 장 그리기 ── */
  /** R7-2(S7): 성취기준 = 접힘 칩 '성취기준 N ▸'(교사 모드는 펼침) */
  function standardsBox() {
    var list = data.standards || [];
    if (!list.length) return null;
    var d = h('details', { class: 'lesson__std teacher-only' }, [
      h('summary', { class: 'lesson__stdsum' }, [ico('info'), h('span', { text: '성취기준 ' + list.length })]),
      h('div', { class: 'lesson__stdlist', 'aria-label': '성취기준' }, (unitName() ? [h('p', { class: 'lesson__stdunit', text: '단원 · ' + unitName() })] : []).concat(list.map(function (s) {
        var code = typeof s === 'string' ? s : s.code, txt = typeof s === 'string' ? '' : s.text;
        var c = String(code || '').charAt(0) === '[' ? code : '[' + code + ']';
        return h('span', { class: 'chip chip--outline num', title: (s.subj ? s.subj + ' · ' : '') + (txt || '') }, c + (txt ? ' ' + txt : ''));
      })))
    ]);
    // R7-3(S5): 교사 모드도 접힘이 기본(한 장 한 화면). 단원명은 이 안 첫 줄에
    return d;
  }
  function unitName() { return (data && data.unit) || (SK.unitName ? SK.unitName() : ''); }
  function eqBox(list) {
    if (!list || !list.length) return null;
    return h('div', { class: 'lesson__eqs' }, list.map(function (e) {
      var tex = typeof e === 'string' ? e : e.tex;
      var eq = h('div', { class: 'eq' });
      // tex 와 frac 을 함께 쓰면 '$Δy$ =' 뒤에 분수가 붙는다 ({ tex:'$Δy$ =', frac:['$λL$','$d$'] }) — UI팀2 요청
      if (tex) SK.mathNodes(fnTex(tex)).forEach(function (n) { eq.appendChild(typeof n === 'string' ? document.createTextNode(n) : n); });
      if (e && e.frac) { if (tex) eq.appendChild(document.createTextNode(' ')); eq.appendChild(SK.fracEl(fnTex(e.frac[0]), fnTex(e.frac[1]))); }   // R7-2(팀장): 분수 안 \sin 도 바로 선 글자로(UI팀1 요청 3)
      if (e && e.after) SK.mathNodes(fnTex(' ' + e.after)).forEach(function (n) { eq.appendChild(typeof n === 'string' ? document.createTextNode(n) : n); });
      return h('div', { class: 'lesson__eqrow' }, [eq, e && e.caption ? h('span', { class: 'lesson__eqcap' }, inline(e.caption)) : null]);
    }));
  }
  /** 기호 이름: 장 symbols[].name → 없으면 terms 사전(같은 기호) */
  function symName(s) {
    if (s.name || s.meaning) return s.name || s.meaning;
    var n = normSym(s.sym), t = (data.terms || []).filter(function (x) { return normSym(x.sym) === n; })[0];
    return t ? t.term : '';
  }
  function symUnit(s) {
    if (s.unit) return s.unit;
    var n = normSym(s.sym), t = (data.terms || []).filter(function (x) { return normSym(x.sym) === n; })[0];
    return t && t.unit ? t.unit : '';
  }
  /** 그림 안 같은 기호(D.label {sym}) 1.2초 강조 — 설명 층 안에서만(실험 화면으로 가지 않는다) */
  function flashFig(n, row) {
    var hit = els.figbox.querySelectorAll('[data-sym]'), any = false;
    for (var i = 0; i < hit.length; i++) if (hit[i].getAttribute('data-sym') === n) { any = true; pulse(hit[i], 1200, 'is-sym-on'); }
    if (row) pulse(row, 1200, 'is-sym-on');
    return any;
  }
  function pulse(el, ms, cls) {
    el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
    clearTimeout(el._symT); el._symT = setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  function symTable(list) {
    if (!list || !list.length) return null;
    return h('table', { class: 'lesson__sym' }, [
      h('thead', null, h('tr', null, [h('th', { text: '기호' }), h('th', { text: '뜻' }), h('th', { text: '단위' })])),
      h('tbody', null, list.map(function (s) {
        var n = normSym(s.sym);
        var plainSym = !/[$_^]/.test(String(s.sym || ''));   // '$' 없는 한글 낱말('배율')은 본문 글꼴 — UI팀3 요청 4
        var b = h('button', { class: 'lesson__symbtn' + (plainSym ? ' is-txt' : ''), type: 'button', 'data-sym': n, title: '그림에서 찾기' }, SK.mathNodes(fnTex(s.sym || '')));
        var tr = h('tr', null, [h('td', null, b), h('td', null, inline(symName(s))), h('td', { class: 'lesson__symunit', text: symUnit(s) || '' })]);
        b.addEventListener('click', function (e) { if (e.detail > 0) b.blur(); flashFig(n, tr); });
        return tr;
      }))
    ]);
  }
  /** 표: { head:['물체 위치', …], rows:[['2F 보다 멀리', '30 cm', …], …], caption } — 칸 글은 인라인 표기 그대로 (UI팀3 요청) */
  function tableBox(t) {
    if (!t || !t.rows || !t.rows.length) return null;
    var kids = [];
    if (t.caption) kids.push(h('caption', null, inline(t.caption)));
    if (t.head && t.head.length) kids.push(h('thead', null, h('tr', null, t.head.map(function (x) { return h('th', null, inline(String(x))); }))));
    kids.push(h('tbody', null, t.rows.map(function (r) { return h('tr', null, (r || []).map(function (x, i) { return h(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row' } : null, inline(String(x))); })); })));
    return h('div', { class: 'lesson__tablewrap' }, h('table', { class: 'lesson__table' }, kids));
  }
  function link(chId, label) {
    var c = chapterById(chId); if (!c) return null;
    var i = indexOf(chId); if (i < 0) return null;
    var b = h('button', { class: 'lesson-link', type: 'button' }, [ico('book'), h('span', { class: 'lesson-link__txt', text: label || ((i + 1) + '장 · ' + SK.plainMath(String(c.title || '')) + ' 보기') })]);
    b.addEventListener('click', function () { go(i); });
    return b;
  }
  function tryCard(q, n) {
    // 실험 칩: cardName 이 있으면 그 이름(갈래가 다른 sim 의 card 번호용), 없으면 preset 번호로 지금 카드 이름 — R7-2: 학생 문구 '실험 ①'
    var cardNo = typeof q.card === 'number' ? q.card : typeof q.preset === 'number' ? q.preset : -1;
    var cardName = q.cardName || (typeof q.card !== 'number' && typeof q.preset === 'number' && SK.presetInfo && SK.presetInfo(q.preset) ? SK.presetInfo(q.preset).name : '');
    var card = cardNo >= 0 && cardName ? { name: cardName } : null;
    // R7 학생점검(B1/D1): 질문이 카드 기본값과 다르게 set 하면 꼬리표에 바뀐 값을 보인다(cardName 이 있으면 그 이름이 우선)
    if (card && !q.cardName && q.set && SK.presetInfo) {
      var pinf = SK.presetInfo(cardNo), pv = pinf && pinf.values, diff = [];
      if (pv) Object.keys(q.set).forEach(function (k) { if (typeof q.set[k] === 'number' && pv[k] !== undefined && pv[k] !== q.set[k]) diff.push(SK.plainMath(k) + ' ' + q.set[k]); });
      if (diff.length) card = { name: cardName + ' 바꿔서 · ' + diff.join(' · ') };
    }
    var b = SK.btn(['해 보기', ico('chev-right', 'ico--trail')], 'btn--primary lesson__try', function () { tryQ(q); }, { 'aria-label': '해 보기: ' + SK.plainMath(String(q.q || '')) });
    return h('div', { class: 'lesson__qcard' }, [
      h('p', { class: 'lesson__qno' }, ['질문 ' + n, card ? h('span', { class: 'chip chip--outline' }, ['실험 ', SK.circ(cardNo + 1), ' ' + card.name]) : (q.cardName ? h('span', { class: 'chip chip--outline' }, q.cardName) : null)]),
      h('p', { class: 'lesson__qtext' }, inline(q.q)),
      b
    ]);
  }
  /** R7-2(S11) 오해 카드: 깨졌어요 ✓ · 오해(claim) · 내 생각 [맞다][아니다] · [해 보기 ▸] · 실제로는(why — 고른 뒤·깨진 뒤·교사) */
  function brokeList() { var s = load('broke'); try { var a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function misCard(it, c) {
    var broke = it.id && brokeList().indexOf(it.id) >= 0;
    var hasTry = !!it.try;
    var why = h('p', { class: 'lesson__why' }, inline(it.why || ''));
    // R7-2(팀장, UI팀3 요청 1): 깨진 카드는 짧게 — '깨졌어요 ✓ + 결과' 한 줄이 '실제로는' 을 대신하고(단추로 펼침), 내 생각 칩은 뺀다
    var showWhy = !hasTry;   // R7-3(S5): 교사 모드도 '실제로는?' 접힘이 기본(한 장 한 화면) — 누르면 펼침
    why.hidden = !showWhy;
    var kids = [];
    if (broke) kids.push(h('p', { class: 'lesson__broke' }, [ico('check', ''), h('b', { text: '깨졌어요' }), it.result ? h('span', null, inline(' ' + it.result)) : null]));
    kids.push(h('p', { class: 'lesson__claim' }, inline(it.claim)));
    if (hasTry) {
      var lk0 = it.chapter ? link(it.chapter) : null;
      // 깨진 카드: 내 생각 칩·'실제로는?' 줄 대신 [설명 N장 … 해 보기] 한 줄 (결과 문장이 '실제로는' 을 대신함)
      var mine = h('div', { class: 'lesson__mine', role: 'group', 'aria-label': broke ? '다시 해 보기' : '내 생각' }, [broke ? (lk0 || h('span', { class: 'lesson__minet', text: '다시' })) : h('span', { class: 'lesson__minet', text: '내 생각' })]);
      // R7-3(S10): 고른 '내 생각' 은 localStorage physsim.lesson.<slug>.mine.<id> — 장을 옮겨도 그대로(저장이 막혀도 이번 화면은 동작)
      var mineSaved = it.id ? load('mine.' + it.id) : null;
      if (!broke) [['맞다', 'yes'], ['아니다', 'no']].forEach(function (m) {
        var b = h('button', { class: 'btn btn--outline lesson__minebtn', type: 'button', 'aria-pressed': String(mineSaved === m[1]), 'data-mine': m[1] }, m[0]);
        b.addEventListener('click', function (e) {
          if (e.detail > 0) b.blur();
          var bs = mine.querySelectorAll('.lesson__minebtn'); for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i] === b));
          if (it.id) store('mine.' + it.id, m[1]);
        });
        mine.appendChild(b);
      });
      var tq = {}; for (var k in it.try) tq[k] = it.try[k];
      if (it.id) tq.broke = it.id;
      if (!tq.chapter) tq.chapter = it.chapter || c.id;
      if (!tq.q) tq.q = it.claim;
      mine.appendChild(SK.btn(['해 보기', ico('chev-right', 'ico--trail')], 'btn--primary lesson__mistry', function () { tryQ(tq); }, { 'aria-label': '해 보기: ' + SK.plainMath(String(it.claim || '')) }));
      kids.push(mine);
      if (!showWhy && !broke) kids.push(SK.btn(['실제로는?', ico('chev-down', 'ico--trail')], 'btn--quiet lesson__whybtn', function (e) { why.hidden = false; e.currentTarget.remove(); }));
    }
    kids.push(why);
    if (it.chapter && !(broke && hasTry)) { var lk = link(it.chapter); if (lk) kids.push(lk); }
    return h('div', { class: 'lesson__mis-card' + (broke ? ' is-broke' : '') + (hasTry ? ' has-try' : '') }, kids);
  }
  /** 이 장에서 고른 탭(check 장 tabs) — 기본 = 지금 실험 갈래(SK.params[mode.key] === mode.value), 없으면 첫 탭 */
  function curTab(c) {
    var tabs = c.tabs || [];
    if (!tabs.length) return null;
    if (tabOf[c.id] && tabs.some(function (t) { return t.id === tabOf[c.id]; })) return tabOf[c.id];
    for (var i = 0; i < tabs.length; i++) { var m = tabs[i].mode; if (m && m.key && SK.params[m.key] === m.value) return tabs[i].id; }
    return tabs[0].id;
  }
  function render() {
    var v = visible(); cur = Math.max(0, Math.min(cur, v.length - 1));
    var c = v[cur]; if (!c) return;
    var teacher = SK.isTeacher(), simple = SK.isSimple && SK.isSimple();
    els.title.textContent = data.title || '';
    els.where.innerHTML = '';
    // R7-3(S6): 'N / M · 장 제목' — 단원명은 목차 첫 줄·성취기준 접힘 안으로
    els.where.appendChild(h('b', { class: 'num', text: (cur + 1) + ' / ' + v.length }));
    els.where.title = SK.plainMath(String(c.title || ''));   // R7 학생점검(A15): 칩은 'N / M ▾' 만, 장 제목은 title·목차에
    els.where.appendChild(ico('chev-down', 'ico--trail'));
    syncPace(c);
    syncFromChip();
    els.where.setAttribute('aria-label', '목차 — 지금 ' + (cur + 1) + ' / ' + v.length + '장 ' + SK.plainMath(c.title || ''));
    // R7-2(S13): [바로 실험] 늘 보임 — 첫 진입 '바로 실험', 실험 중 '실험으로'
    els.toSim.hidden = false;
    els.toSimTxt.textContent = firstEntry ? '바로 실험' : '실험으로';
    // 본문
    var t = els.text; t.innerHTML = '';
    var kickRow = h('div', { class: 'lesson__kickrow' });
    t.appendChild(kickRow);
    kickRow.appendChild(h('p', { class: 'lesson__kicker', text: (cur + 1) + '장' + (c.type === 'check' ? ' · 시뮬레이터에서 확인할 질문' : c.type === 'misconception' ? ' · 흔한 오해' : '') }));
    t.appendChild(h('h2', { class: 'lesson__h' }, inline(c.title)));
    if (c.question) t.appendChild(para(c.question, 'lesson__q'));
    if (c.type === 'goal') { var sb = standardsBox(); if (sb) t.appendChild(sb); }
    paras(c.body).forEach(function (p) { t.appendChild(p); });
    if (c.goals && c.goals.length) t.appendChild(h('ul', { class: 'lesson__goals' }, c.goals.map(function (g) { return h('li', null, [ico('check', ''), h('span', null, inline(g))]); })));
    var eq = eqBox(c.eq); if (eq) t.appendChild(eq);
    var sy = symTable(c.symbols); if (sy) t.appendChild(sy);
    var tb = tableBox(c.table); if (tb) t.appendChild(tb);
    if (c.condition) t.appendChild(h('p', { class: 'lesson__cond' }, [ico('info', 'lesson__condico'), h('span', null, inline(c.condition))]));   // R7-3(S6): '참고 · ' 칩(경고색 아님)
    // R7-2(S11): 개념 장 [해 보기 ▸] 한 줄
    if (c.try && c.type !== 'check') {
      var cq = {}; for (var ck in c.try) cq[ck] = c.try[ck];
      if (!cq.chapter) cq.chapter = c.id;
      t.appendChild(h('div', { class: 'lesson__ctry' }, [SK.btn(['해 보기', ico('chev-right', 'ico--trail')], 'btn--primary lesson__try', function () { tryQ(cq); }), c.try.label ? h('span', { class: 'lesson__ctryt' }, inline(c.try.label)) : null]));
    }
    if (c.items && c.items.length) t.appendChild(h('div', { class: 'lesson__mis' + (c.items.length > 2 ? ' is-many' : '') }, c.items.map(function (it) { return misCard(it, c); })));
    if (c.type === 'check') {
      var tabId = curTab(c);
      if (tabId) {
        t.appendChild(h('div', { class: 'lesson__tabs', role: 'tablist', 'aria-label': '무엇으로 해 볼까요' }, c.tabs.map(function (tab) {
          var b = h('button', { class: 'lesson__tab', type: 'button', role: 'tab', 'aria-selected': String(tab.id === tabId) }, inline(tab.label || tab.id));
          b.addEventListener('click', function () { tabOf[c.id] = tab.id; render(); var nb = els.text.querySelector('.lesson__tab[aria-selected="true"]'); if (nb) try { nb.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } });
          return b;
        })));
      } else if (c.modes && c.modes.length) {
        t.appendChild(h('div', { class: 'lesson__modes', role: 'group', 'aria-label': '무엇으로 해 볼까요' }, c.modes.map(function (m) {
          return SK.btn([h('span', null, inline(m.label))], 'btn--outline lesson__mode', function () { tryMode(c, m); });
        })));
      }
      var qs = questionsOf(c);
      if (tabId) qs = qs.filter(function (q) { return !q.tab || q.tab === tabId; });
      if (qs.length) t.appendChild(h('div', { class: 'lesson__qs' + (qs.length > 6 ? ' is-many' : '') }, qs.map(function (q, i) { return tryCard(q, i + 1); })));
    }
    // R7-2(S7): 생활 속에서 + 더 알아보기 → '더 보기 ▸' 하나 (심플은 숨김, 교사 모드는 teacherOpen 이면 펼침)
    var hasLife = c.life && c.life.length, hasMore = !!c.more;
    if ((hasLife || hasMore) && !simple) {
      var mk = [h('summary', { text: '더 보기' })];
      if (hasLife) { mk.push(h('p', { class: 'lesson__sub', text: '생활 속에서' })); mk.push(h('ul', { class: 'lesson__life' }, c.life.map(function (l) { return h('li', null, inline(l)); }))); }
      if (hasMore) { mk.push(h('p', { class: 'lesson__sub' }, inline(c.more.title || '더 알아보기'))); mk = mk.concat(paras(c.more.body)); mk.push(eqBox(c.more.eq)); }
      var md = h('details', { class: 'lesson__more' }, mk);
      // R7-3(S5): 교사 모드도 접힘(teacherOpen 필드는 무시 — 호환)
      t.appendChild(md);
    }
    if (teacher && c.teacherNote) {
      // R7-3(S5): '교사 메모 ▸ 펼치기' (+ 내용 있으면 '메모 있음') · 펼치면 '접기'
      var hasNote = [].concat(c.teacherNote).join('').trim().length > 0;
      var nt = h('span', { class: 'lesson__notet', text: '펼치기' });
      var nchev = h('span', { class: 'lesson__notechev', 'aria-hidden': 'true', text: '▸' });
      var nd = h('details', { class: 'lesson__note' }, [h('summary', null, [h('span', { text: '교사 메모' }), nchev, nt, hasNote ? h('span', { class: 'chip chip--outline lesson__notechip', text: '메모 있음' }) : null])].concat(paras(c.teacherNote)));
      nd.addEventListener('toggle', function () { nt.textContent = nd.open ? '접기' : '펼치기'; nchev.textContent = nd.open ? '▾' : '▸'; requestAnimationFrame(markOver); });
      kickRow.appendChild(nd);   // 장 번호 줄 오른쪽 접힌 칩 — 펼치면 그 아래 한 줄 전체(본문 앞)
    }
    // 그림
    var svg = '';
    if (typeof c.svg === 'function') { try { svg = c.svg(D || {}) || ''; } catch (e) { console.error('SimLesson: ' + c.id + ' 그림 오류', e); svg = ''; } }
    else if (typeof c.svg === 'string') svg = c.svg;
    els.figbox.innerHTML = '';
    if (svg && typeof svg === 'object' && svg.nodeType) els.figbox.appendChild(svg); else els.figbox.innerHTML = svg;
    var hasFig = !!svg && c.type !== 'check';
    els.fig.hidden = !hasFig;
    els.body.classList.toggle('is-wide', !hasFig);
    var how = c.how || (els.figbox.firstElementChild && els.figbox.firstElementChild.getAttribute('data-how')) || '';
    els.how.innerHTML = ''; inline(how).forEach(function (n) { els.how.appendChild(typeof n === 'string' ? document.createTextNode(n) : n); });
    els.how.hidden = !how;
    placeFig();
    // 바닥 막대
    var last = cur === v.length - 1;
    els.prev.disabled = cur === 0;
    els.next.hidden = last; els.start.hidden = !last;
    els.skip.hidden = !last || SK.isTeacher();
    els.skip.classList.toggle('is-above', last);   // R7 학생점검(A14): 마지막 장에서는 [실험 시작] 위 한 줄
    root.querySelector('.lesson__foot') && root.querySelector('.lesson__foot').classList.toggle('lesson__foot--last', last);
    els.skipIn.checked = load('skip') === '1';
    els.count.textContent = (cur + 1) + ' / ' + v.length;
    var seen = seenList();
    if (seen.indexOf(c.id) < 0) { seen.push(c.id); store('seen', JSON.stringify(seen)); }
    store('last', c.id);
    els.dots.innerHTML = '';
    v.forEach(function (ch, i) {
      var d = h('button', { class: 'lesson__dot' + (seen.indexOf(ch.id) >= 0 ? ' is-seen' : ''), type: 'button', 'aria-label': (i + 1) + '장 ' + SK.plainMath(ch.title || ''), title: (i + 1) + '. ' + SK.plainMath(ch.title || '') });
      if (i === cur) d.setAttribute('aria-current', 'step');
      d.addEventListener('click', function () { go(i); });
      els.dots.appendChild(d);
    });
    els.text.scrollTop = 0; els.body.scrollTop = 0;
    // R7-2(S7): 넘침 경고(가로만 — 세로는 한 겹 스크롤 허용)
    var at = cur, cid = c.id;
    requestAnimationFrame(function () {
      if (!open || visible()[at] !== c) return;
      els.text.classList.remove('is-over');
      var over = els.text.scrollHeight - els.text.clientHeight;
      markOver();   // R7-2(팀장): 넘치면 글 칸 아래 '↓ 이어서' 표시(학생S) — 끝까지 내리면 사라진다
      // R7-3(S5): 교사 모드도 성취기준·더 보기·교사 메모가 접힘이 기본이라 경고 대상(세로만 제외)
      if (portrait()) return;
      if (over > 4) console.warn('SimLesson(R7-2): ' + (SK.isTeacher() ? '[교사] ' : '') + (at + 1) + '장 "' + SK.plainMath(c.title || cid) + '" 글이 ' + over + ' px 넘쳐요 — 장을 나누거나 더 보기로 (' + global.innerWidth + '×' + global.innerHeight + ')');
    });
  }
  /** 글 칸이 넘치면 .is-over(아래 '↓ 이어서' 띠) — 끝까지 내리면 뗀다 */
  function markOver() {
    // R7-3(S4): 세로 820 은 .lesson__body 가 스크롤 — 같은 규칙을 그쪽에
    var t = els.text, b = els.body, pt = b.classList.contains('is-portrait');
    var sc = pt ? b : t, other = pt ? t : b;
    other.classList.remove('is-over');
    sc.classList.remove('is-over');   // 띠 자신이 길이에 끼지 않게 뗀 뒤 잰다
    sc.classList.toggle('is-over', sc.scrollHeight - sc.clientHeight - sc.scrollTop > 44);   // R7 학생점검(A7): 띠 높이보다 작은 넘침은 띠를 띄우지 않는다
  }
  /** R7-3(S5): 교사 진행 띠 현재 칸 — 설명 층에서는 '설명'(1장이면 '도입') */
  function syncPace() {
    if (!els.pace) return;
    var nowId = cur === 0 ? 'intro' : 'explain';
    var bs = els.pace.querySelectorAll('.lesson__pacebtn');
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].getAttribute('data-pace') === nowId) bs[i].setAttribute('aria-current', 'step'); else bs[i].removeAttribute('aria-current');
    }
  }
  /** R7-2(S12): 세로 820 — 그림을 제목·질문 뒤로(글 칸 안), 가로로 돌아오면 원위치 */
  function placeFig() {
    if (portrait()) {
      var after = els.text.querySelector('.lesson__q') || els.text.querySelector('.lesson__h');
      if (after && els.fig.parentNode !== els.text) after.insertAdjacentElement('afterend', els.fig);
      else if (after && after.nextSibling !== els.fig) after.insertAdjacentElement('afterend', els.fig);
      els.body.classList.add('is-portrait');
    } else {
      if (els.fig.parentNode !== els.body) els.body.appendChild(els.fig);
      els.body.classList.remove('is-portrait');
    }
  }
  function seenList() { var s = load('seen'); try { var a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function go(i) {
    var v = visible();
    if (i < 0 || i >= v.length || i === cur) return;
    cur = i; render();
    try { els.text.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }

  /* ── 열기·닫기 ── */
  function openAt(id, first, from) {
    build();
    var i = typeof id === 'number' ? id : indexOf(id);
    if (i < 0) { var last = load('last'); i = last ? indexOf(last) : -1; }
    if (i < 0) i = 0;
    cur = i; firstEntry = !!first; open = true;
    if (SK.running) SK.pause();
    toggleKeys(false); toggleToc(false);
    document.documentElement.classList.add('is-lesson');
    root.hidden = false;
    if (SK.el && SK.el.slide) SK.el.slide.inert = true;   // 뒤의 실험 화면은 눌리지도, Tab 으로 가지도 않게
    fromSim = from || null;
    render();
    setTimeout(function () { try { els.text.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 0);
  }
  var fromSim = null;
  /** R7 학생점검(A4): 실험에서 이어 온 장이면 머리에 '실험 ①과 이어진 N장이에요 · [처음부터]' 칩 */
  function syncFromChip() {
    if (!els.fromChip) {
      els.fromChip = h('p', { class: 'lesson__from', hidden: true });
      els.fromTxt = h('span');
      els.fromBtn = h('button', { class: 'btn btn--outline lesson__fromb', type: 'button', text: '처음부터' });
      els.fromBtn.addEventListener('click', function () { fromSim = null; go(0); });
      els.fromChip.appendChild(els.fromTxt); els.fromChip.appendChild(els.fromBtn);
      els.where.parentNode.insertBefore(els.fromChip, els.where.nextSibling);
    }
    var show = !!(fromSim && typeof fromSim.preset === 'number' && fromSim.preset >= 0 && cur > 0);
    els.fromChip.hidden = !show;
    if (show) { els.fromTxt.textContent = ''; els.fromTxt.appendChild(document.createTextNode('실험 ')); els.fromTxt.appendChild(SK.circ(fromSim.preset + 1)); els.fromTxt.appendChild(document.createTextNode('과 이어진 ' + (cur + 1) + '장이에요 · ')); }
  }
  function close(o) {
    o = o || {};
    if (!open) return;
    open = false; firstEntry = false;
    toggleToc(false);
    root.hidden = true;
    document.documentElement.classList.remove('is-lesson');
    if (SK.el && SK.el.slide) SK.el.slide.inert = false;
    if (SK.requestRender) SK.requestRender();
    if (SK.view && SK.view.resize) SK.view.resize();
    if (typeof SK._lessonClosed === 'function') { try { SK._lessonClosed(); } catch (e) { /* 알림 쪽 문제는 설명 닫기를 막지 않는다 */ } }
    if (o.focus !== false) setTimeout(function () { var b = SK.isSimple && SK.isSimple() ? SK.el.simple && SK.el.simple.run : SK.el.btnRun; try { if (b) b.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 0);
  }
  function startSim() {
    if (!SK.isTeacher()) store('skip', els.skipIn.checked ? '1' : null);
    close();
  }
  function tryQ(q) {
    var v = visible(), c = v[cur];
    var qq = {}; for (var k in q) qq[k] = q[k];
    if (!qq.chapter && c) qq.chapter = c.id;
    if (qq.chapter && indexOf(qq.chapter) < 0) qq.chapter = c && c.id;
    SK.lessonTry(qq);
  }
  function tryMode(c, m) {
    var qs = questionsOf(c), found = null;
    for (var i = 0; i < qs.length && !found; i++) {
      var q = qs[i];
      if (q.mode === m.value || (q.set && m.key && q.set[m.key] === m.value)) found = q;
    }
    if (found) { tryQ(found); return; }
    var s = {}; if (m.key) s[m.key] = m.value;
    tryQ({ preset: typeof m.preset === 'number' ? m.preset : null, set: m.key ? s : null, predict: false, chapter: c.id });
  }

  /* ── 키 (설명 층이 열린 동안 SimKit installKeys 가 여기로 넘긴다 — 실험 키는 잠금) ── */
  function onKey(e) {
    var code = e.code, t = e.target;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var onCtl = t && t.tagName && /^(BUTTON|A|SUMMARY|INPUT)$/.test(t.tagName);
    if (code === 'Tab') {   // 층 안에서만 돈다
      var list = root.querySelectorAll('button:not([disabled]), a[href], input, summary, [tabindex]:not([tabindex="-1"])'), f = [];
      for (var j = 0; j < list.length; j++) if (list[j].offsetParent !== null) f.push(list[j]);
      if (!f.length) return;
      var k = f.indexOf(document.activeElement); e.preventDefault();
      f[e.shiftKey ? (k <= 0 ? f.length - 1 : k - 1) : (k < 0 || k >= f.length - 1 ? 0 : k + 1)].focus();
      return;
    }
    if (code === 'Escape') {
      e.preventDefault();
      if (tocOpen) { toggleToc(false); try { els.where.focus({ preventScroll: true }); } catch (err) { /* 무시 */ } return; }
      if (keysOpen) { toggleKeys(false); return; }
      close();   // R7-2(S13): 첫 진입에서도 실험으로
      return;
    }
    if (code === 'KeyJ') { e.preventDefault(); close(); return; }
    if (code === 'KeyF') { e.preventDefault(); if (!e.repeat) SK.toggleFullscreen(); return; }
    if (e.key === '?' || (code === 'Slash' && e.shiftKey)) { e.preventDefault(); toggleKeys(); return; }
    var v = visible(), last = cur === v.length - 1;
    if (tocOpen && /^(ArrowDown|ArrowUp)$/.test(code)) {
      e.preventDefault();
      var items = Array.prototype.slice.call(els.toc.querySelectorAll('.lesson__tocitem')), ix = items.indexOf(document.activeElement);
      var nx = code === 'ArrowDown' ? Math.min(items.length - 1, ix + 1) : Math.max(0, ix - 1);
      if (items[nx]) items[nx].focus();
      return;
    }
    if ((code === 'Enter' || code === 'NumpadEnter') && !onCtl) { e.preventDefault(); if (last) startSim(); else go(cur + 1); return; }
    if (onCtl && (code === 'Enter' || code === 'NumpadEnter' || (code === 'Space' && t.tagName !== 'A'))) return;   // 단추·체크는 제 일
    switch (code) {
      case 'ArrowRight': case 'PageDown': e.preventDefault(); if (last) startSim(); else go(cur + 1); return;   // R7-2(S6): 마지막 장에서 한 번 더 = 실험 시작(클리커)
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); go(cur - 1); return;
      case 'Space': e.preventDefault(); if (!e.shiftKey && last) startSim(); else go(cur + (e.shiftKey ? -1 : 1)); return;
      case 'Home': e.preventDefault(); go(0); return;
      case 'End': e.preventDefault(); go(v.length - 1); return;
      default: break;
    }
    var m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (m) { e.preventDefault(); if (+m[1] <= v.length) go(+m[1] - 1); return; }
    if (/^Key|^Arrow/.test(code)) e.preventDefault();   // 실험 키는 잠금
  }

  /* ── R7-2(S4) 식 팝업용 ── */
  /** 식(eq)이 있는 장 — 심플에서 숨은 장도 식 팝업에는 쓴다(심플 = 식 + 기호 칩만) */
  function allChapters() { return ((data && data.chapters) || []).filter(function (c) { return c.type !== 'wrap'; }); }
  function formulas() { return allChapters().filter(function (c) { return c.eq && c.eq.length; }); }
  /** 기호 데이터의 target 값들(갈래별 객체면 모든 값) */
  function targetsOf(s) {
    var t = s && s.target;
    if (!t) return [];
    if (typeof t === 'string') return [t];
    var out = []; for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) out.push(t[k]);
    return out;
  }
  function chapterForSym(key) {
    if (!key) return null;
    var n = normSym(key), fs = formulas();
    for (var i = 0; i < fs.length; i++) {
      var ss = fs[i].symbols || [];
      for (var j = 0; j < ss.length; j++) if (targetsOf(ss[j]).indexOf(key) >= 0 || normSym(ss[j].sym) === n) return fs[i].id;
    }
    return null;
  }
  /** 지금 카드의 장이 식 장이 아니면 가장 가까운 앞 식 장(없으면 뒤 식 장) */
  function formulaOf(pi) {
    var fs = formulas(); if (!fs.length) return null;
    // R7 학생점검(A3): 현재 실험이 없으면(pi<0) '마지막 본 장'이 아니라 기본 식 장(formulaDefault → 첫 식 장)
    var id = typeof pi === 'number' && pi >= 0 ? api.chapterForPreset(pi) : (data.formulaDefault || null);
    var v = allChapters(), at = -1;
    for (var a = 0; a < v.length; a++) if (id && v[a].id === id) at = a;
    if (at < 0) return fs[0].id;
    for (var i = at; i >= 0; i--) if (v[i].eq && v[i].eq.length) return v[i].id;
    for (var k = at; k < v.length; k++) if (v[k].eq && v[k].eq.length) return v[k].id;
    return fs[0].id;
  }
  function formulaBody(id, o) {
    o = o || {};
    var c = chapterById(id); if (!c) return null;
    var box = h('div', { class: 'formula__inner' });
    var no = indexOf(id);
    box.appendChild(h('p', { class: 'formula__title' }, [no >= 0 ? h('b', { class: 'num', text: (no + 1) + '장 ' }) : null, h('span', null, inline(c.title || ''))]));
    var eq = eqBox(c.eq); if (eq) box.appendChild(eq);
    var ss = c.symbols || [];
    if (ss.length) {
      box.appendChild(h('div', { class: 'formula__syms', role: 'group', 'aria-label': '기호 — 누르면 실험 화면의 그 값이 깜빡여요' }, ss.map(function (s) {
        var hasT = targetsOf(s).length > 0, nm = symName(s);
        var b = h('button', { class: 'sym-chip' + (hasT ? '' : ' is-plain'), type: 'button', 'data-sym': normSym(s.sym), 'data-target': typeof s.target === 'string' ? s.target : null,
          title: hasT ? '누르면 실험 화면에서 찾아 줘요' : '실험 화면에는 없는 기호', 'aria-label': SK.plainMath(fnTex(s.sym || '')) + ' ' + SK.plainMath(String(nm || '')) }, [
          h('span', { class: 'sym-chip__s' + (/[$_^]/.test(String(s.sym || '')) ? '' : ' is-txt') }, SK.mathNodes(fnTex(s.sym || ''))),
          o.simple ? null : h('span', { class: 'sym-chip__n' }, inline(String(nm || '')))
        ]);
        b.addEventListener('click', function (e) {
          if (e.detail > 0) b.blur();
          pulse(b, 1500, 'is-on');
          if (hasT) SK.flashTarget(s.target, 1500);
        });
        return b;
      })));
    }
    if (!o.simple && typeof c.now === 'function') {
      var txt = '';
      try { txt = c.now(SK.params, SK.nowValues ? SK.nowValues() : {}, { finished: !!SK.finished, records: (SK.records || []).length }) || ''; } catch (err) { console.error('SimLesson: ' + c.id + ' now() 오류', err); txt = ''; }
      if (txt) box.appendChild(h('p', { class: 'formula__now' }, [h('b', { text: '지금 값 ' })].concat(inline(String(txt).replace(/^지금 값\s*[:：]?\s*/, '')))));
    }
    if (!o.simple && c.more && (c.more.eq || c.more.body)) {
      var md = h('details', { class: 'formula__more' }, [h('summary', null, inline(c.more.title || '더 알아보기'))].concat(paras(c.more.body)).concat([eqBox(c.more.eq)]));
      if (SK.isTeacher()) md.open = true;
      box.appendChild(md);
    }
    return box;
  }
  function symFlashIn(box, key) {
    var n = normSym(key), bs = box.querySelectorAll('.sym-chip');
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].getAttribute('data-target') === key || bs[i].getAttribute('data-sym') === n) { pulse(bs[i], 1500, 'is-on'); try { bs[i].focus({ preventScroll: true }); } catch (e) { /* 무시 */ } return; }
    }
    // 갈래별 객체 target 도
    var c = chapterById(chapterForSym(key));
    (c && c.symbols || []).forEach(function (s, j) { if (targetsOf(s).indexOf(key) >= 0 && bs[j]) pulse(bs[j], 1500, 'is-on'); });
  }

  /* ── SimKit 에 등록 ── */
  var api = {
    isOpen: function () { return open; },
    open: function (id, o) { openAt(id, false, o && o.from === 'sim' ? o : null); },
    close: close,
    onKey: onKey,
    refresh: function () { if (open) render(); },
    has: function (id) { return !!data && indexOf(id) >= 0; },
    number: function (id) { return indexOf(id) + 1; },
    label: function (id) { var c = chapterById(id); return c ? '설명 ' + (indexOf(id) + 1) + '장 · ' + SK.plainMath(c.title || '') + ' 다시 보기' : ''; },
    /** 지금 카드(preset)의 장 = 확인 질문 중 preset 이 같은 질문의 chapter → 없으면 마지막 본 장 */
    chapterForPreset: function (pi) {
      // R7 학생점검(A3/A4): ① SK.presetFormulaCh ② 그 preset 을 try 로 가진 설명 장 ③ 9장 질문 매핑 — 'check' 장·마지막 본 장은 돌려주지 않는다(없으면 null)
      if (!(typeof pi === 'number' && pi >= 0)) return null;
      var okCh = function (id) { var cc = id && chapterById(id); return !!(cc && cc.type !== 'check' && indexOf(id) >= 0); };
      var fc = SK.presetFormulaCh ? SK.presetFormulaCh(pi) : null;
      if (okCh(fc)) return fc;
      var all = data.chapters || [], i, j;
      var tryHas = function (t) { return t && (t.preset === pi || t.card === pi); };
      for (i = 0; i < all.length; i++) {
        var ch = all[i]; if (ch.type === 'check' || ch.type === 'wrap' || indexOf(ch.id) < 0) continue;
        if (tryHas(ch.try)) return ch.id;
        var its = ch.items || [];
        for (j = 0; j < its.length; j++) if (tryHas(its[j].try)) return ch.id;
      }
      var other = null;
      for (i = 0; i < all.length; i++) {
        var qs = all[i].questions || [], tb = all[i].tabs ? curTab(all[i]) : null;
        for (j = 0; j < qs.length; j++) {
          var q = qs[j], no = typeof q.card === 'number' ? q.card : q.preset;
          if (!(no === pi && q.chapter && okCh(q.chapter))) continue;
          var same = (!tb || !q.tab || q.tab === tb) && (!q.mode || Object.keys(SK.params || {}).some(function (k) { return SK.params[k] === q.mode; }));
          if (same) return q.chapter;
          if (!other) other = q.chapter;
        }
      }
      return other;
    },
    formulas: formulas, formulaOf: formulaOf, chapterForSym: chapterForSym, formulaBody: formulaBody, symFlashIn: symFlashIn,
    /** 정리 모달 형성평가 = wrap 장 quiz (R7-2 형식 {kind, q, choices, answerIdx, why, chapter, try}) · 심화 = wrap.more 배열 */
    // R7(학생 점검 E7): 문항에 mode 가 있으면 지금 갈래(SK.params 값 중 하나)일 때 같은 kind 의 일반 문항 대신 나온다 — kind 마다 한 문항(늘 3문항)
    quiz: function () {
      var w = wrapChapter(); if (!w || !Array.isArray(w.quiz)) return [];
      var pv = SK.params || {};
      function on(m) { return Object.keys(pv).some(function (k) { return pv[k] === m; }); }
      var kinds = [];
      w.quiz.forEach(function (q) { if (kinds.indexOf(q.kind || '') < 0) kinds.push(q.kind || ''); });
      return kinds.map(function (k) {
        var pool = w.quiz.filter(function (q) { return (q.kind || '') === k; });
        return pool.filter(function (q) { return q.mode && on(q.mode); })[0] || pool.filter(function (q) { return !q.mode; })[0] || pool[0];
      });
    },
    quizMore: function () { var w = wrapChapter(); return w && Array.isArray(w.more) ? w.more : []; },
    /** 오해 카드 [해 보기] 로 온 실행이 끝나면 sim.js 가 부른다 */
    markBroke: function (id) { var a = brokeList(); if (a.indexOf(id) < 0) { a.push(id); store('broke', JSON.stringify(a)); } },
    data: function () { return data; }
  };

  /** R7-2(S6): 데이터 검사 — quiz 3문항·answerIdx 범위·try.set 키·goals ≤ 3 (콘솔 경고만, 동작은 그대로) */
  function check() {
    var W = function (m) { console.warn('SimLesson(R7-2): ' + m); };
    function setKeys(tr, where) {
      if (!tr || !tr.set) return;
      for (var k in tr.set) if (Object.prototype.hasOwnProperty.call(tr.set, k) && SK.controls && !SK.controls[k]) W(where + ' try.set 에 없는 key — ' + k);
    }
    (data.chapters || []).forEach(function (c) {
      if (c.goals && c.goals.length > 3) W(c.id + ' 장 goals 는 3개까지 (지금 ' + c.goals.length + ')');
      (c.items || []).forEach(function (it, i) { setKeys(it.try, c.id + ' 오해 ' + (i + 1)); if (it.try && !it.id) W(c.id + ' 오해 ' + (i + 1) + ' 에 id 가 없어 깨졌어요 ✓ 를 기억하지 못해요'); });
      setKeys(c.try, c.id + ' 장');
    });
    var w = wrapChapter();
    if (!w) return;
    var qz = w.quiz || [];
    var general = qz.filter(function (q) { return !q.mode; });
    if (general.length !== 3) W('wrap.quiz 는 갈래(mode) 없는 문항이 정확히 3개(개념·계산·오개념) — 지금 ' + general.length);
    qz.forEach(function (q, i) {
      var n = '정리 문항 ' + (i + 1);
      if (typeof q.answerIdx !== 'number') W(n + ' 에 answerIdx(0부터)가 없어요');
      else if (!q.choices || q.answerIdx < 0 || q.answerIdx >= q.choices.length) W(n + ' answerIdx ' + q.answerIdx + ' 가 보기 범위 밖');
      if (q.chapter && !chapterById(q.chapter)) W(n + ' chapter 없는 장 — ' + q.chapter);
      setKeys(q.try, n);
    });
  }

  /** SimKit.lesson(data) — 시뮬레이터 lesson.js 가 부른다(SimKit.init 다음) */
  SK.lesson = function (d) {
    if (data) { console.warn('SimKit.lesson 은 한 번만 부르세요.'); return; }
    data = d || {};
    slug = data.slug || (document.body && document.body.getAttribute('data-sim')) || 'sim';
    (data.chapters || []).forEach(function (c) {
      if (!c.id) console.warn('SimLesson: 장에 id 가 없어요 — ' + c.title);
      if (c.body && [].concat(c.body).length > 5) console.warn('SimLesson(R7): 한 장 본문은 5문단 이내로 — ' + c.id);
    });
    if (data.terms && SK._lessonTerms) SK._lessonTerms(data.terms);
    function boot() {
      SK._lesson(api);
      try { check(); } catch (e) { /* 검사는 동작을 막지 않는다 */ }
      var q = null;
      try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
      var view = q && q.get('view'), ch = q && q.get('ch');
      var teacher = /[?&]teacher=1\b/.test(location.search) || SK.isTeacher();
      if (view === 'sim') return;
      if (view === 'explain') { openAt(ch && indexOf(ch) >= 0 ? ch : 0, true); return; }
      if (load('skip') === '1' && !teacher) return;
      openAt(0, true);
    }
    if (SK.el && SK.el.slide) boot(); else document.addEventListener('DOMContentLoaded', boot);
  };
  // 심플 ↔ 자세히: 열린 채 바뀌면 그 모드의 장 목록으로 다시
  if (SK.onMode) SK.onMode(function () { if (open) { var v = visible(), id = v[cur] && v[cur].id; render(); if (id) { var i = indexOf(id); if (i >= 0) cur = i; } } });

  global.SimLesson = api;
})(window);
