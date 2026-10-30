/* =====================================================================
   물리 시뮬레이터 실험실 — 교과 설명 층 SimLesson (R7 1차, 2026-10-30)
   일반 <script> 로 shared/sim.js·diagram.js 다음, 시뮬레이터 sim.js 앞에 불러온다. 전역: window.SimLesson + SimKit.lesson(data)
     <script src="../../shared/icons.js"></script>
     <script src="../../shared/sim.js"></script>
     <script src="../../shared/diagram.js"></script>
     <script src="../../shared/lesson.js"></script>
     <script src="pe-physics.js"></script>   (있는 sim 만)
     <script src="sim.js"></script>           SimKit.init
     <script src="lesson.js"></script>        SimKit.lesson({...}) 데이터
   근거: docs/개선/R7_1차_계획.md §1-5 · 데이터 형식·장 타입은 docs/SIMKIT.md §0R7

   한 페이지 한 층: html.is-lesson 이면 .lesson 이 실험 화면을 덮는다(실험 DOM 은 지우지 않는다 — 닫으면 그림·값·실행 위치 그대로).
   첫 진입: ?view=explain[&ch=id] → 그 장 · ?view=sim → 바로 실험 · 쿼리 없으면 저장 physsim.lesson.<slug>.skip !== '1' 이면 설명(교사 모드는 skip 무시)
   키(설명 층): → PageDown Space 다음 · ← PageUp Shift+Space 이전 · Home/End · 1~9 장 · Enter(마지막 장) 실험 시작 · Esc 실험으로(첫 진입 제외) · J 실험으로 · F · ?
   정답·teacherNote 는 교사 모드일 때만 DOM 에 넣는다(학생 DOM 에 없음).
   ===================================================================== */
(function (global) {
  'use strict';
  var SK = global.SimKit;
  if (!SK) { console.warn('SimLesson: shared/sim.js 를 먼저 불러오세요.'); return; }
  var D = global.SimDiagram || null;
  var h = SK.h;

  var data = null, slug = '', root = null, els = {}, open = false, firstEntry = false, cur = 0, keysOpen = false;
  var KEY = function (k) { return 'physsim.lesson.' + slug + '.' + k; };
  function store(k, v) { try { if (v === null) localStorage.removeItem(KEY(k)); else localStorage.setItem(KEY(k), v); } catch (e) { /* 저장 안 돼도 이번에는 동작 */ } }
  function load(k) { try { return localStorage.getItem(KEY(k)); } catch (e) { return null; } }
  function ico(name, cls) { return SK.icon(name, { cls: cls || 'ico--lead' }); }

  /** 이 모드에서 보일 장 (심플 = data.simple 목록, 순서는 원래 순서) */
  function visible() {
    var all = data.chapters || [];
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
      if (/^\*\*[^*]+\*\*$/.test(seg)) out.push(h('strong', null, SK.rich(seg.slice(2, -2))));
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
    els.where = h('span', { class: 'lesson__where', 'aria-live': 'polite' });
    els.pace = h('span', { class: 'chip chip--outline lesson__pace teacher-only', title: '한 차시 약 45분: 설명 5분 · 예측 10분 · 실험 20분 · 정리 10분', text: '수업 진행 5·10·20·10분' });
    els.toSim = SK.btn([h('span', { class: 'lesson__btntxt', text: '실험으로' }), ico('arrow-right', 'ico--trail')], 'btn--primary lesson__tosim', function () { close(); }, { title: '실험 화면으로 (Esc · J)' });
    var helpB = SK.btn([ico('help')], 'btn--outline lesson__icon', function () { toggleKeys(); }, { 'aria-label': '설명 화면 키 안내', title: '키 안내 (?)' });
    var fsB = SK.btn([ico('expand')], 'btn--outline lesson__icon', function () { SK.toggleFullscreen(); }, { 'aria-label': '전체 화면', title: '전체 화면 (F)' });
    var head = h('header', { class: 'lesson__head' }, [hub, els.title, els.where, h('span', { class: 'lesson__gap' }), els.pace, els.toSim, helpB, fsB]);
    els.text = h('article', { class: 'lesson__text', tabindex: '-1' });
    els.figbox = h('div', { class: 'lesson__figbox lesson-fig' });
    els.how = h('figcaption', { class: 'lesson__how' });
    els.fig = h('figure', { class: 'lesson__fig' }, [els.figbox, els.how]);
    els.body = h('main', { class: 'lesson__body' }, [els.text, els.fig]);
    els.prev = SK.btn([ico('chev-left'), '이전'], 'btn--outline lesson__prev', function () { go(cur - 1); }, { title: '이전 장 (← · PageUp)' });
    els.next = SK.btn(['다음', ico('chev-right', 'ico--trail')], 'btn--primary lesson__next', function () { go(cur + 1); }, { title: '다음 장 (→ · PageDown · Space)' });
    els.start = SK.btn(['실험 시작', ico('play', 'ico--trail')], 'btn--primary lesson__start', function () { startSim(); }, { title: '실험 시작 (Enter)' });
    els.dots = h('div', { class: 'lesson__dots', role: 'group', 'aria-label': '장 고르기' });
    els.count = h('span', { class: 'lesson__count num' });
    els.skipIn = h('input', { type: 'checkbox' });
    els.skip = h('label', { class: 'lesson__skip' }, [els.skipIn, '다음부터 바로 실험']);
    var foot = h('footer', { class: 'lesson__foot' }, [els.prev, h('div', { class: 'lesson__nav' }, [els.dots, els.count]), els.skip, els.next, els.start]);
    els.keys = h('div', { class: 'lesson__keys', hidden: true, role: 'note' }, [
      h('dl', null, [
        ['→ · Space · PageDown', '다음 장'], ['← · PageUp', '이전 장'], ['Home / End', '처음 / 끝 장'], ['1 ~ 9', '그 장으로'],
        ['Enter', '(마지막 장) 실험 시작'], ['Esc · J', '실험 화면으로'], ['F', '전체 화면'], ['밀기', '태블릿: 왼쪽·오른쪽으로 밀어 넘기기']
      ].reduce(function (a, k) { a.push(h('dt', { text: k[0] })); a.push(h('dd', { text: k[1] })); return a; }, []))
    ]);
    root = h('section', { class: 'lesson', role: 'dialog', 'aria-modal': 'true', 'aria-label': '교과 설명', hidden: true }, [h('i', { class: 'lesson__bar', 'aria-hidden': 'true' }), head, els.body, foot, els.keys]);
    document.body.appendChild(root);
    // 태블릿: 좌우로 밀어 넘기기(60px 이상, 세로보다 가로가 클 때 · .no-swipe 안은 제외)
    var sx = 0, sy = 0, st = null;
    els.body.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) { st = null; return; } st = e.target; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    els.body.addEventListener('touchend', function (e) {
      if (!st || (st.closest && st.closest('.no-swipe, input, button, a, summary'))) { st = null; return; }
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; st = null;
      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }
  function toggleKeys(on) { keysOpen = on === undefined ? !keysOpen : !!on; els.keys.hidden = !keysOpen; }

  /* ── 장 그리기 ── */
  function standardsBox() {
    var list = data.standards || [];
    if (!list.length) return null;
    return h('div', { class: 'lesson__std', 'aria-label': '성취기준' }, list.map(function (s) {
      var code = typeof s === 'string' ? s : s.code, txt = typeof s === 'string' ? '' : s.text;
      var c = String(code || '').charAt(0) === '[' ? code : '[' + code + ']';
      return h('span', { class: 'chip chip--outline num', title: (s.subj ? s.subj + ' · ' : '') + (txt || '') }, c + (txt ? ' ' + txt : ''));
    }));
  }
  function eqBox(list) {
    if (!list || !list.length) return null;
    return h('div', { class: 'lesson__eqs' }, list.map(function (e) {
      var tex = typeof e === 'string' ? e : e.tex;
      var eq = h('div', { class: 'eq' });
      // tex 와 frac 을 함께 쓰면 '$Δy$ =' 뒤에 분수가 붙는다 ({ tex:'$Δy$ =', frac:['$λL$','$d$'] }) — UI팀2 요청
      if (tex) SK.mathNodes(fnTex(tex)).forEach(function (n) { eq.appendChild(typeof n === 'string' ? document.createTextNode(n) : n); });
      if (e && e.frac) { if (tex) eq.appendChild(document.createTextNode(' ')); eq.appendChild(SK.fracEl(e.frac[0], e.frac[1])); }
      return h('div', { class: 'lesson__eqrow' }, [eq, e && e.caption ? h('span', { class: 'lesson__eqcap' }, inline(e.caption)) : null]);
    }));
  }
  function symTable(list) {
    if (!list || !list.length) return null;
    return h('table', { class: 'lesson__sym' }, [
      h('thead', null, h('tr', null, [h('th', { text: '기호' }), h('th', { text: '뜻' }), h('th', { text: '단위' })])),
      h('tbody', null, list.map(function (s) { return h('tr', null, [h('td', null, SK.mathNodes(fnTex(s.sym || ''))), h('td', null, inline(s.name || s.meaning || '')), h('td', { text: s.unit || '–' })]); }))
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
    // 카드 칩: cardName 이 있으면 그 이름(갈래가 다른 sim 의 card 번호용), 없으면 preset 번호로 지금 카드 이름
    var cardNo = typeof q.card === 'number' ? q.card : typeof q.preset === 'number' ? q.preset : -1;
    var cardName = q.cardName || (typeof q.card !== 'number' && typeof q.preset === 'number' && SK.presetInfo && SK.presetInfo(q.preset) ? SK.presetInfo(q.preset).name : '');
    var card = cardNo >= 0 && cardName ? { name: cardName } : null;
    var b = SK.btn(['해 보기', ico('chev-right', 'ico--trail')], 'btn--primary lesson__try', function () { tryQ(q); }, { 'aria-label': '해 보기: ' + SK.plainMath(String(q.q || '')) });
    return h('div', { class: 'lesson__qcard' }, [
      h('p', { class: 'lesson__qno' }, ['질문 ' + n, card ? h('span', { class: 'chip chip--outline' }, ['카드 ', SK.circ(cardNo + 1), ' ' + card.name]) : null]),
      h('p', { class: 'lesson__qtext' }, inline(q.q)),
      b
    ]);
  }
  function render() {
    var v = visible(); cur = Math.max(0, Math.min(cur, v.length - 1));
    var c = v[cur]; if (!c) return;
    var teacher = SK.isTeacher(), simple = SK.isSimple && SK.isSimple();
    els.title.textContent = data.title || '';
    els.where.innerHTML = '';
    els.where.appendChild(h('b', { text: (cur + 1) + ' / ' + v.length })); els.where.appendChild(document.createTextNode(' · ' + SK.plainMath(c.title || '')));
    els.toSim.hidden = firstEntry;
    // 본문
    var t = els.text; t.innerHTML = '';
    t.appendChild(h('p', { class: 'lesson__kicker', text: (cur + 1) + '장' + (c.type === 'check' ? ' · 시뮬레이터에서 확인할 질문' : c.type === 'wrap' ? ' · 실험 뒤 정리' : c.type === 'misconception' ? ' · 흔한 오해' : '') }));
    t.appendChild(h('h2', { class: 'lesson__h' }, inline(c.title)));
    if (c.question) t.appendChild(para(c.question, 'lesson__q'));
    if (c.type === 'goal') { var sb = standardsBox(); if (sb) t.appendChild(sb); }
    paras(c.body).forEach(function (p) { t.appendChild(p); });
    if (c.goals && c.goals.length) t.appendChild(h('ul', { class: 'lesson__goals' }, c.goals.map(function (g) { return h('li', null, [ico('check', ''), h('span', null, inline(g))]); })));
    var eq = eqBox(c.eq); if (eq) t.appendChild(eq);
    var sy = symTable(c.symbols); if (sy) t.appendChild(sy);
    var tb = tableBox(c.table); if (tb) t.appendChild(tb);
    if (c.condition) t.appendChild(para(c.condition, 'lesson__cond'));
    if (c.items && c.items.length) {
      t.appendChild(h('div', { class: 'lesson__mis' }, c.items.map(function (it) {
        return h('div', { class: 'lesson__mis-card' }, [h('p', { class: 'lesson__claim' }, inline(it.claim)), h('p', { class: 'lesson__why' }, inline(it.why)), it.chapter ? link(it.chapter) : null]);
      })));
    }
    if (c.type === 'check') {
      if (c.modes && c.modes.length) {
        t.appendChild(h('div', { class: 'lesson__modes', role: 'group', 'aria-label': '무엇으로 해 볼까요' }, c.modes.map(function (m) {
          return SK.btn([h('span', null, inline(m.label))], 'btn--outline lesson__mode', function () { tryMode(c, m); });
        })));
      }
      var qs = questionsOf(c);
      if (qs.length) t.appendChild(h('div', { class: 'lesson__qs' + (qs.length > 6 ? ' is-many' : '') }, qs.map(function (q, i) { return tryCard(q, i + 1); })));
    }
    if (c.type === 'wrap') {
      if (c.summary) paras(c.summary).forEach(function (p) { t.appendChild(p); });
      if (c.quiz && c.quiz.length) {
        t.appendChild(h('p', { class: 'lesson__sub', text: '확인 문제' }));
        t.appendChild(h('ol', { class: 'lesson__quiz' }, c.quiz.map(function (qz) {
          var li = h('li', null, [h('span', null, inline(qz.q)), qz.choices && qz.choices.length ? h('ol', null, qz.choices.map(function (ch) { return h('li', null, inline(ch)); })) : null]);
          if (teacher && (qz.answer || qz.why)) li.appendChild(h('details', { class: 'lesson__note' }, [h('summary', { text: '정답·이유 (교사용)' }), para((qz.answer ? '정답 ' + qz.answer + '. ' : '') + (qz.why || ''))]));
          if (qz.chapter) { var lk = link(qz.chapter); if (lk) li.appendChild(lk); }
          return li;
        })));
      }
    }
    if (c.life && c.life.length && !simple) {
      t.appendChild(h('p', { class: 'lesson__sub', text: '생활 속에서' }));
      t.appendChild(h('ul', { class: 'lesson__life' }, c.life.map(function (l) { return h('li', null, inline(l)); })));
    }
    if (c.more && !simple) {
      var md = h('details', { class: 'lesson__more' }, [h('summary', null, inline(c.more.title || '더 알아보기'))].concat(paras(c.more.body)).concat([eqBox(c.more.eq)]));
      if (teacher && c.more.teacherOpen !== false) md.open = true;
      t.appendChild(md);
    }
    if (teacher && c.teacherNote) t.appendChild(h('details', { class: 'lesson__note' }, [h('summary', { text: '교사 메모' })].concat(paras(c.teacherNote))));
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
    // 바닥 막대
    var last = cur === v.length - 1;
    els.prev.disabled = cur === 0;
    els.next.hidden = last; els.start.hidden = !last;
    els.skip.hidden = !last || SK.isTeacher();
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
  }
  function seenList() { var s = load('seen'); try { var a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function go(i) {
    var v = visible();
    if (i < 0 || i >= v.length || i === cur) return;
    cur = i; render();
    try { els.text.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }

  /* ── 열기·닫기 ── */
  function openAt(id, first) {
    build();
    var i = typeof id === 'number' ? id : indexOf(id);
    if (i < 0) { var last = load('last'); i = last ? indexOf(last) : -1; }
    if (i < 0) i = 0;
    cur = i; firstEntry = !!first; open = true;
    if (SK.running) SK.pause();
    toggleKeys(false);
    document.documentElement.classList.add('is-lesson');
    root.hidden = false;
    if (SK.el && SK.el.slide) SK.el.slide.inert = true;   // 뒤의 실험 화면은 눌리지도, Tab 으로 가지도 않게
    render();
    setTimeout(function () { try { els.text.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }, 0);
  }
  function close(o) {
    o = o || {};
    if (!open) return;
    open = false; firstEntry = false;
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
    if (qq.chapter && !chapterById(qq.chapter)) qq.chapter = c && c.id;
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
    if (code === 'Escape') { e.preventDefault(); if (keysOpen) { toggleKeys(false); return; } if (!firstEntry) close(); else SK.notice('마지막 장의 실험 시작으로 넘어가요 (J)', 'info'); return; }
    if (code === 'KeyJ') { e.preventDefault(); close(); return; }
    if (code === 'KeyF') { e.preventDefault(); if (!e.repeat) SK.toggleFullscreen(); return; }
    if (e.key === '?' || (code === 'Slash' && e.shiftKey)) { e.preventDefault(); toggleKeys(); return; }
    if ((code === 'Enter' || code === 'NumpadEnter') && !onCtl) { e.preventDefault(); if (cur === visible().length - 1) startSim(); else go(cur + 1); return; }
    if (onCtl && (code === 'Enter' || code === 'NumpadEnter' || (code === 'Space' && t.tagName !== 'A'))) return;   // 단추·체크는 제 일
    var v = visible();
    switch (code) {
      case 'ArrowRight': case 'PageDown': e.preventDefault(); go(cur + 1); return;
      case 'ArrowLeft': case 'PageUp': e.preventDefault(); go(cur - 1); return;
      case 'Space': e.preventDefault(); go(cur + (e.shiftKey ? -1 : 1)); return;
      case 'Home': e.preventDefault(); go(0); return;
      case 'End': e.preventDefault(); go(v.length - 1); return;
      default: break;
    }
    var m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (m) { e.preventDefault(); if (+m[1] <= v.length) go(+m[1] - 1); return; }
    if (/^Key|^Arrow/.test(code)) e.preventDefault();   // 실험 키는 잠금
  }

  /* ── SimKit 에 등록 ── */
  var api = {
    isOpen: function () { return open; },
    open: function (id) { openAt(id, false); },
    close: close,
    onKey: onKey,
    has: function (id) { return !!data && indexOf(id) >= 0; },
    number: function (id) { return indexOf(id) + 1; },
    label: function (id) { var c = chapterById(id); return c ? '설명 ' + (indexOf(id) + 1) + '장 · ' + SK.plainMath(c.title || '') + ' 다시 보기' : ''; },
    /** 지금 카드(preset)의 장 = 확인 질문 중 preset 이 같은 질문의 chapter → 없으면 마지막 본 장 */
    chapterForPreset: function (pi) {
      var all = data.chapters || [];
      for (var i = 0; i < all.length; i++) {
        var qs = all[i].questions || [];
        for (var j = 0; j < qs.length; j++) if (qs[j].preset === pi && pi >= 0 && qs[j].chapter && indexOf(qs[j].chapter) >= 0) return qs[j].chapter;
      }
      var last = load('last');
      return last && indexOf(last) >= 0 ? last : null;
    },
    data: function () { return data; }
  };

  /** SimKit.lesson(data) — 시뮬레이터 lesson.js 가 부른다(SimKit.init 다음) */
  SK.lesson = function (d) {
    if (data) { console.warn('SimKit.lesson 은 한 번만 부르세요.'); return; }
    data = d || {};
    slug = data.slug || (document.body && document.body.getAttribute('data-sim')) || 'sim';
    (data.chapters || []).forEach(function (c) {
      if (!c.id) console.warn('SimLesson: 장에 id 가 없어요 — ' + c.title);
      if (c.body && [].concat(c.body).length > 5) console.warn('SimLesson(R7): 한 장 본문은 5문단 이내로 — ' + c.id);
    });
    function boot() {
      SK._lesson(api);
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
