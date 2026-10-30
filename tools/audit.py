"""전체 회귀 점검 — R7 3차 S8 (docs/개선/R7_3차_계획.md §1-9 · §5-1).

사용:
  python tools/audit.py [--team UI팀1] [--slug <slug>] [--size 1280x720] [--mode 자세히|심플|교사] [--no-shots]

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


if __name__ == "__main__":
    main()
