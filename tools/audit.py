"""전체 회귀 점검 — R7 3차 S8 (docs/개선/R7_3차_계획.md §1-9 · §5-1).

사용:
  python tools/audit.py [--team UI팀1] [--slug <slug>] [--size 1280x720] [--mode 자세히|심플|교사] [--no-shots]
  python tools/audit.py --r8 [--slug <slug>] [--team UI팀1]   (R8 추가 검사 a~d, 아래 r8_main)

허브 + 5종 × 4크기(1920×1080·1280×720·1180×820·820×1180) × {자세히, 심플, 교사} 마다 같은 세트를 돌린다:
  ①설명 1장 ②설명 마지막 장 ③실험 ④예측 띠 ⑤ƒ 식 팝업 ⑥⚙ 설정 ⑦실험 고르기 ⑧⋯ ⑨정리 모달 ⑩기록 1개
세트마다 모으는 것:
  console.error · pageerror · 'SimLesson(R7-2)' 넘침 경고(교사 포함, 세로는 원래 경고 안 함) ·
  document.documentElement.scrollWidth > innerWidth · 보이는 터치 대상(button·a·summary·input·[role=button])이 44 px 보다 작은 수(앞 5개 이름)
결과: _review/R7/3차/<team>/final/audit_log.json (+ 캡처 final/<slug>_<size>_<mode>_<세트>.jpg — --no-shots 면 안 찍음)
종료 코드: console.error·pageerror·넘침 경고·가로 넘침이 하나라도 있으면 1 (터치 대상 수는 보고만)
"""
import io
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
ROOT = Path(__file__).resolve().parent.parent
SLUGS = ["projectile-energy", "double-slit-quantum", "collision-momentum", "orbit-gravity", "convex-lens"]
SIZES = ["1920x1080", "1280x720", "1180x820", "820x1180"]
MODES = {"자세히": "", "심플": "&simple=1", "교사": "&teacher=1"}

ESC_IF_OPEN = "() => { if ((window.SimKit && SimKit.pop && (SimKit.pop.open || SimKit.pop.band))) document.activeElement && document.activeElement.blur && document.activeElement.blur(), document.dispatchEvent(new KeyboardEvent('keydown', {code:'Escape', key:'Escape', bubbles:true})); }"

PROBE = r"""
() => {
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (el.closest('[hidden], [inert]')) return false;
    return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
  const small = [];
  document.querySelectorAll('button, a[href], summary, input:not([type=hidden]), select, [role=button]').forEach(el => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    if (el.type === 'checkbox' || el.type === 'radio') { const lb = el.closest('label'); if (lb && lb.getBoundingClientRect().height >= 44) return; }
    if (r.width < 44 || r.height < 44) small.push(((el.getAttribute('aria-label') || el.textContent || el.className || el.tagName) + '').replace(/\s+/g, ' ').trim().slice(0, 24) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  });
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, small: small.length, smallEx: small.slice(0, 5),
           band: !!document.querySelector('.pop--band:not([hidden])'), pop: (window.SimKit && SimKit.pop && SimKit.pop.open) || null };
}
"""


def url_of(path, q):
    return (ROOT / path).resolve().as_uri() + ("?" + q if q else "")


def main():
    args = sys.argv[1:]
    team, slugs, sizes, modes, shots = "UI팀1", SLUGS, SIZES, list(MODES), True
    def opt(name):
        if name in args:
            i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
        return None
    team = opt("--team") or team
    s = opt("--slug"); slugs = [s] if s else slugs
    z = opt("--size"); sizes = [z] if z else sizes
    m = opt("--mode"); modes = [m] if m else modes
    if "--no-shots" in args: shots = False
    out = ROOT / "_review" / "R7" / "3차" / team / "final"
    out.mkdir(parents=True, exist_ok=True)
    log = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        def open_page(size):
            w, h = map(int, size.split("x"))
            ctx = browser.new_context(viewport={"width": w, "height": h})
            page = ctx.new_page()
            buf = {"err": [], "warn": []}
            page.on("console", lambda msg: (buf["err"].append(msg.text[:300]) if msg.type == "error" else
                                            buf["warn"].append(msg.text[:300]) if msg.type == "warning" and "SimLesson(R7-2)" in msg.text else None))
            page.on("pageerror", lambda e: buf["err"].append("[pageerror] " + str(e)[:300]))
            return ctx, page, buf

        def snap(page, buf, rec, tag):
            try:
                pr = page.evaluate(PROBE)
            except Exception as e:   # noqa
                pr = {"sw": 0, "iw": 0, "small": 0, "smallEx": [], "band": False, "pop": None, "probeError": str(e)[:120]}
            item = dict(rec, set=tag, errors=list(buf["err"]), lessonWarn=list(buf["warn"]), **pr)
            item["overflowX"] = pr["sw"] > pr["iw"]
            buf["err"].clear(); buf["warn"].clear()
            log.append(item)
            if shots:
                fn = "%s_%s_%s_%s.jpg" % (rec["page"], rec["size"], rec["mode"], tag)
                page.screenshot(path=str(out / fn), type="jpeg", quality=60)
            flag = ("ERR " if item["errors"] else "") + ("WARN " if item["lessonWarn"] else "") + ("X " if item["overflowX"] else "")
            print("%-22s %-9s %-4s %-10s %s small=%d" % (rec["page"], rec["size"], rec["mode"], tag, flag or "ok", pr["small"]))

        def step(page, js=None, key=None, wait=350):
            try:
                if js: page.evaluate(js)
                if key: page.keyboard.press(key)
            except Exception as e:   # noqa
                print("  [step-fail]", js or key, str(e)[:100])
            page.wait_for_timeout(wait)

        # 허브
        for size in sizes:
            for mode in modes:
                ctx, page, buf = open_page(size)
                page.goto(url_of("index.html", MODES[mode].lstrip("&")))
                page.wait_for_timeout(600)
                snap(page, buf, {"page": "hub", "size": size, "mode": mode}, "hub")
                ctx.close()
        # 5종
        for slug in slugs:
            path = "sims/%s/index.html" % slug
            for size in sizes:
                for mode in modes:
                    rec = {"page": slug, "size": size, "mode": mode}
                    ctx, page, buf = open_page(size)
                    page.goto(url_of(path, "view=explain" + MODES[mode]))
                    page.wait_for_timeout(700)
                    snap(page, buf, rec, "01_lesson1")
                    step(page, key="End", wait=500)
                    snap(page, buf, rec, "02_lessonLast")
                    page.goto(url_of(path, "view=sim" + MODES[mode]))
                    page.wait_for_timeout(800)
                    step(page, js="() => { if (document.querySelector('.pop--band:not([hidden])')) document.dispatchEvent(new KeyboardEvent('keydown', {code:'Escape', key:'Escape', bubbles:true})); }")
                    snap(page, buf, rec, "03_sim")   # Esc 를 두 번 누르면 허브로 가므로 띠가 열렸을 때만 한 번
                    step(page, js="""() => { const b = [...document.querySelectorAll('.simple-task__predict, .task-now .btn, .sim-task .btn')].find(x => x.offsetParent && /예측/.test(x.textContent)); if (b) b.click(); }""", wait=500)
                    snap(page, buf, rec, "04_band")
                    step(page, js=ESC_IF_OPEN)
                    step(page, js="() => SimKit.formulaPop && SimKit.formulaPop({})", wait=450)
                    snap(page, buf, rec, "05_formula")
                    step(page, js=ESC_IF_OPEN)
                    step(page, key="KeyU", wait=450)
                    snap(page, buf, rec, "06_settings")
                    step(page, js=ESC_IF_OPEN)
                    step(page, key="KeyY", wait=450)
                    snap(page, buf, rec, "07_presets")
                    step(page, js=ESC_IF_OPEN)
                    step(page, js="() => { const s = document.documentElement.classList.contains('is-simple'); if (s) SimKit.openSheet('more'); else document.querySelector('.tool-btn--more').click(); }", wait=450)
                    snap(page, buf, rec, "08_more")
                    step(page, js=ESC_IF_OPEN)
                    step(page, js="() => SimKit.openThink && SimKit.openThink()", wait=450)
                    snap(page, buf, rec, "09_think")
                    step(page, js=ESC_IF_OPEN)
                    step(page, js="() => { SimKit.setSpeed && SimKit.setSpeed(8); SimKit.play(); }", wait=200)
                    try:
                        page.wait_for_function("() => window.SimKit && (SimKit.finished || !SimKit.running)", timeout=12000)
                    except Exception:   # noqa
                        pass
                    page.wait_for_timeout(300)
                    step(page, js="() => { if (SimKit.running) SimKit.pause(); SimKit.record && SimKit.record(); }", wait=500)
                    snap(page, buf, rec, "10_record")
                    ctx.close()
        browser.close()
    (out / "audit_log.json").write_text(json.dumps(log, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [x for x in log if x["errors"] or x["lessonWarn"] or x["overflowX"]]
    small = sum(1 for x in log if x["small"])
    print("\n세트 %d개 · 문제 %d개(오류·넘침 경고·가로 넘침) · 44px 미만 터치 대상이 있는 세트 %d개 → %s" % (len(log), len(bad), small, out / "audit_log.json"))
    for x in bad[:40]:
        print("  ", x["page"], x["size"], x["mode"], x["set"], (x["errors"] + x["lessonWarn"])[:2], "X" if x["overflowX"] else "")
    sys.exit(1 if bad else 0)


# ---------------------------------------------------------------------------
# R8 추가 검사 (docs/개선/R8_검토.md §3 검수) — python tools/audit.py --r8 [--slug s] [--team UI팀1]
#   (a) 교사 수업 안내 서랍 '기본 N' = 변수 defs 기본값, '실험 ①은 N' = 카드 ① 값 (rows key 로 자동 채움)
#   (b) 1920·1280 에서 모든 카드의 예측 보기 칩을 Playwright mouse.click 으로 고르면 aria-pressed=true
#   (c) 예측 띠가 열린 동안 숨김 값이 DOM·계기에 없음(숨김 계기 숫자, 상 거리·Δy 숫자, 궤도 속력 띠 이름)
#   (d) 이중 슬릿: 키보드 Tab 만으로 측정 단추에 닿고 Enter/Space 로 측정 칸이 채워지는지(UI팀2 C1 작업 뒤)
# 결과: _review/R8/<team>/audit_r8.json · 종료 코드 1 = 실패 하나라도
# ---------------------------------------------------------------------------
R8_GUIDE = r"""
() => {
  const SK = window.SimKit, out = [];
  if (!SK || !SK.guideTarget) return { skip: 'SimKit.guideTarget 없음' };
  const cards = [...document.querySelectorAll('aside.drawer .guide-card__t')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
  if (!cards.length) return { skip: '서랍 줄 없음(SK.guide rows 없음)' };
  const plainLab = s => String(s || '').replace(/\{\{|\}\}/g, '').replace(/\$/g, '').trim();
  cards.forEach(t => {
    const m = /기본 ([^,·(]+)/.exec(t); if (!m) return;
    let key = null;
    for (const k in SK.controls) { const d = SK.controls[k].def; if (d && d.label && t.indexOf(plainLab(d.label)) === 0) { key = k; break; } }
    if (!key) { out.push({ text: t.slice(0, 60), problem: '변수 이름을 못 찾음(하드코딩 줄?)' }); return; }
    const want = SK.guideTarget({ key: key }).replace(/\$/g, '');
    const wm = /기본 ([^,·(]+)/.exec(want), got = m[1].trim(), exp = wm ? wm[1].trim() : '?';
    if (got !== exp) out.push({ key: key, got: got, want: exp });
    const p0 = SK.presetInfo && SK.presetInfo(0), cv = p0 && p0.values ? p0.values[key] : undefined;
    if (cv !== undefined && SK.controls[key].def.initial !== cv && t.indexOf('실험 ①') < 0) out.push({ key: key, problem: '카드 ① 값 표시 없음' });
  });
  return { rows: cards.length, bad: out };
}
"""
R8_LEAK = r"""
(slug) => {
  const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  const bad = [];
  document.querySelectorAll('.meter.is-hidden-value, .simple-meter.is-hidden-value').forEach(m => {
    const n = m.querySelector('.num'); if (n && vis(n) && /[0-9]/.test(n.textContent)) bad.push('숨김 계기 숫자: ' + m.getAttribute('data-key') + ' ' + n.textContent);
  });
  const band = document.querySelector('.pop--band');
  // 팀장 R8 결과: 복제본 textContent 는 visibility:hidden·display:none 글자도 읽어 오검출(궤도 '지구 돌기') → 살아 있는 DOM 을 걸어가며 보이는 글자만 모은다
  const seen = new Set(), parts = [];
  const walk = el => { if (seen.has(el)) return; seen.add(el);
    if (el.matches('.pop--band, .predict, [hidden], .sr-only')) return;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
    el.childNodes.forEach(n => { if (n.nodeType === 3) parts.push(n.textContent); else if (n.nodeType === 1) walk(n); }); };
  document.querySelectorAll('.sim-stage, .sim-band, .simple-meters, .sim-panel').forEach(e => { if (vis(e)) walk(e); });
  const txt = parts.join(' ');
  const rules = { 'convex-lens': [/상 거리\s*[0-9]/, /배율\s*[0-9]/], 'double-slit-quantum': [/Δy\s*=?\s*[0-9]/], 'orbit-gravity': [/지구 돌기/, /탈출 속도\s*[0-9]/] }[slug] || [];
  rules.forEach(re => { const m = re.exec(txt); if (m) bad.push('DOM 글자: ' + m[0]); });
  return bad;
}
"""


def r8_main(args):
    def opt(name):
        if name in args:
            i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
        return None
    team = opt("--team") or "UI팀1"
    s = opt("--slug"); slugs = [s] if s else SLUGS
    out = ROOT / "_review" / "R8" / team
    out.mkdir(parents=True, exist_ok=True)
    res = {"a_guide": {}, "b_chips": {}, "c_leak": {}, "d_keyboard": {}, "errors": {}}
    fails = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        def page_for(size, q, path):
            w, h = map(int, size.split("x"))
            ctx = browser.new_context(viewport={"width": w, "height": h})
            pg = ctx.new_page()
            errs = []
            pg.on("console", lambda m: m.type == "error" and errs.append(m.text[:200]))
            pg.on("pageerror", lambda e: errs.append("[pageerror] " + str(e)[:200]))
            pg.goto(url_of(path, q))
            pg.wait_for_timeout(900)
            return ctx, pg, errs

        for slug in slugs:
            path = "sims/%s/index.html" % slug
            # (a)
            ctx, pg, errs = page_for("1920x1080", "view=sim&teacher=1", path)
            pg.evaluate("() => SimKit.toggleGuide && SimKit.toggleGuide(true)")
            pg.wait_for_timeout(300)
            a = pg.evaluate(R8_GUIDE)
            res["a_guide"][slug] = a
            if a.get("bad"): fails += 1
            print("(a)", slug, "skip: " + a["skip"] if a.get("skip") else "rows=%d bad=%d" % (a["rows"], len(a["bad"])))
            res["errors"][slug] = list(errs)
            ctx.close()
            # (b)·(c)
            for size in ("1920x1080", "1280x720"):
                ctx, pg, errs = page_for(size, "view=sim", path)
                n = pg.evaluate("() => { const r = []; for (let i = 0; i < 9; i++) { const p = SimKit.presetInfo(i); if (!p) break; if (p.predict) r.push(i); } return r; }")
                chips_bad, leak = [], []
                for i in n:
                    pg.evaluate("(i) => { if (SimKit.predicting()) document.querySelector('.predict__close') && document.querySelector('.predict__close').click(); SimKit.applyPreset(i, { forcePredict: true, noConfirm: true }); }", i)
                    pg.wait_for_timeout(450)
                    leak += ["카드 %d: %s" % (i + 1, x) for x in pg.evaluate(R8_LEAK, slug)]
                    k = pg.locator(".pop--band .predict__opt").count()
                    for j in range(k):
                        el = pg.locator(".pop--band .predict__opt").nth(j)
                        bb = el.bounding_box()
                        if not bb:
                            chips_bad.append("카드 %d 보기 %d: 안 보임" % (i + 1, j + 1)); continue
                        pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
                        pg.wait_for_timeout(60)
                        bb = el.bounding_box()   # hover 뒤 자리가 바뀌면(A1) 여기서 잡힌다
                        pg.mouse.click(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
                        pg.wait_for_timeout(80)
                        if el.get_attribute("aria-pressed") != "true":
                            chips_bad.append("카드 %d 보기 %d: 첫 클릭에 안 골라짐" % (i + 1, j + 1))
                res["b_chips"]["%s %s" % (slug, size)] = chips_bad
                res["c_leak"]["%s %s" % (slug, size)] = leak
                if chips_bad: fails += 1
                if leak: fails += 1
                print("(b)", slug, size, "cards=%d" % len(n), "bad=%d" % len(chips_bad), "| (c) leak=%d" % len(leak))
                res["errors"][slug] += list(errs)
                ctx.close()
        # (d) 이중 슬릿 키보드 측정 (UI팀2 C1 뒤): Tab 으로 측정 관련 단추에 닿는지, Enter 로 측정 칸이 바뀌는지
        if "double-slit-quantum" in slugs:
            ctx, pg, errs = page_for("1280x720", "view=sim", "sims/double-slit-quantum/index.html")
            pg.evaluate("() => { if (SimKit.predicting()) document.querySelector('.predict__close').click(); SimKit.setSpeed && SimKit.setSpeed(8); SimKit.play(); }")
            try:
                pg.wait_for_function("() => SimKit.finished || !SimKit.running", timeout=15000)
            except Exception:   # noqa
                pass
            hits = []
            for _ in range(120):
                pg.keyboard.press("Tab")
                d = pg.evaluate("() => { const a = document.activeElement; if (!a) return null; const t = ((a.getAttribute('aria-label') || '') + ' ' + (a.textContent || '') + ' ' + (a.className || '')).replace(/\\s+/g, ' '); return /측정|measure|밝은 줄|간격 수/.test(t) ? t.slice(0, 60) : null; }")
                if d and d not in hits: hits.append(d)
            MEAS = "() => [...document.querySelectorAll('.dsq-step, [class*=measure], [data-measure]')].map(e => e.textContent).join('|')"   # 팀장 R8 결과: UI팀2 C1 단계 칸 .dsq-step 도 읽는다
            before = pg.evaluate(MEAS)
            ok = False
            if hits:
                # 첫 측정 대상에 다시 가서 Enter·Space·→ 를 눌러 본다
                for _ in range(120):
                    pg.keyboard.press("Tab")
                    # 팀장 R8 결과: 측정 '칸'(UI팀2 C1 .dsq-zoomkey, role=application)에 닿았을 때만 — '측정 방법' 단추·단계 칸은 Enter 로 측정이 안 바뀜
                    if pg.evaluate("() => { const a = document.activeElement; return !!a && (a.classList.contains('dsq-zoomkey') || a.getAttribute('role') === 'application'); }"):
                        break
                for k in ("Enter", "ArrowRight", "Space"):
                    pg.keyboard.press(k); pg.wait_for_timeout(120)
                after = pg.evaluate(MEAS)
                ok = after != before
            res["d_keyboard"] = {"tabTargets": hits[:8], "changedByKeys": ok}
            if not hits or not ok: fails += 1
            print("(d) double-slit Tab targets=%d changed=%s" % (len(hits), ok))
            res["errors"]["double-slit-quantum"] += list(errs)
            ctx.close()
        browser.close()
    nerr = sum(len(v) for v in res["errors"].values())
    if nerr: fails += 1
    (out / "audit_r8.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\nR8 검사 실패 %d · 콘솔 오류 %d → %s" % (fails, nerr, out / "audit_r8.json"))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    if "--r8" in sys.argv:
        _a = sys.argv[1:]; _a.remove("--r8"); r8_main(_a)
    else:
        main()
