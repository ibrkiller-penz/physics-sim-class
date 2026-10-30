"""설명 그림(SVG) 자동 점검 — R7 3차 S8 (docs/개선/R7_3차_계획.md §1-9).

사용:
  python tools/check_dg.py <slug|all> [--size 1280x720] [--team UI팀1] [--no-teacher]

  slug   projectile-energy · double-slit-quantum · collision-momentum · orbit-gravity · convex-lens · all
  --size 화면 크기(기본 1280x720). 1920x1080 에서도 한 번 돌려 보기를 권함
  --team 결과 파일 폴더 이름(_review/R7/3차/<team>/dg_<slug>.txt, 기본 UI팀1)

검사 (설명 층 ?view=explain 을 열고 장마다 ArrowRight):
  ① 겹침   svg.dg 안 글자(text) 두 개의 상자가 겹침(같은 <g> 안 — D.frac 분자·분모 — 는 제외, 2 단위 이하 스침은 무시)
  ② 글 밖   글자 상자가 viewBox(0~800 × 0~450) 밖으로 나감
  ③ 잘림   도형(circle·ellipse·path·rect·line·polygon) 상자가 viewBox 밖으로 나감(궤도 링 잘림 등)
           일부러 밖으로 내보낸 도형(지구 표면을 큰 원으로 그린 것 등)은 그 요소나 감싼 <g> 에 data-dg-bleed="1" 을 달면 뺀다
  ④ 넘침   .lesson__text 글이 칸을 넘침(scrollHeight > clientHeight + 4) — 학생·교사(?teacher=1) 둘 다, 세로 화면은 제외
  ⑤ 가로   document.documentElement.scrollWidth > innerWidth
결과: 표(모드·장·그림 제목·검사·요소 a·요소 b·px)를 출력하고 파일로 남긴다. 1건 이상이면 종료 코드 1.
좌표는 화면 상자(getBoundingClientRect)를 viewBox 단위로 바꿔 잰다(그룹 transform 반영). 글자 상자는 위아래 15 % 줄여 잰다(글꼴 줄 높이 여백).
"""
import io
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace", line_buffering=True)
ROOT = Path(__file__).resolve().parent.parent
SLUGS = ["projectile-energy", "double-slit-quantum", "collision-momentum", "orbit-gravity", "convex-lens"]

JS = r"""
() => {
  const out = [];
  const W0 = innerWidth;
  const title = (document.querySelector('.lesson__h') || {}).textContent || '';
  const svg = document.querySelector('.lesson__figbox svg.dg, .lesson__figbox svg');
  const name = el => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return el.tagName.toLowerCase() + (t ? ' "' + t.slice(0, 24) + '"' : '');
  };
  if (svg && svg.getBoundingClientRect().width > 0) {
    const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : { x: 0, y: 0, width: 800, height: 450 };
    const sr = svg.getBoundingClientRect();
    const k = vb.width / sr.width;
    const box = el => {
      const r = el.getBoundingClientRect();
      return { l: (r.left - sr.left) * k + vb.x, t: (r.top - sr.top) * k + vb.y, r: (r.right - sr.left) * k + vb.x, b: (r.bottom - sr.top) * k + vb.y, w: r.width, h: r.height };
    };
    const inDefs = el => !!el.closest('defs, marker, clipPath, mask, pattern, [data-dg-bleed]');   // data-dg-bleed: 일부러 그림 밖으로 내보낸 도형(지구 표면 큰 원 등)은 ②③ 에서 뺀다
    const texts = [...svg.querySelectorAll('text')].filter(t => !inDefs(t) && (t.textContent || '').trim() && t.getBoundingClientRect().width > 0)
      .map(t => { const b = box(t); const sh = (b.b - b.t) * 0.15; return { el: t, b: { l: b.l, r: b.r, t: b.t + sh, b: b.b - sh } }; });
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const a = texts[i], c = texts[j];
        const pa = a.el.parentNode, pc = c.el.parentNode;
        if (pa === pc && pa.tagName.toLowerCase() === 'g') continue;   // D.frac 분자·분모 등 같은 묶음
        const ox = Math.min(a.b.r, c.b.r) - Math.max(a.b.l, c.b.l), oy = Math.min(a.b.b, c.b.b) - Math.max(a.b.t, c.b.t);
        if (ox > 2 && oy > 2) out.push({ check: '① 겹침', a: name(a.el), b: name(c.el), px: Math.round(Math.min(ox, oy)) });
      }
    }
    const L = vb.x, T = vb.y, R = vb.x + vb.width, B = vb.y + vb.height, tol = 1;
    texts.forEach(t => {
      const b = box(t.el), d = Math.max(L - b.l, T - b.t, b.r - R, b.b - B);
      if (d > tol) out.push({ check: '② 글 밖', a: name(t.el), b: '', px: Math.round(d) });
    });
    [...svg.querySelectorAll('circle, ellipse, path, rect, line, polygon, polyline')].filter(e => !inDefs(e) && e.getBoundingClientRect().width + e.getBoundingClientRect().height > 0).forEach(e => {
      const b = box(e), d = Math.max(L - b.l, T - b.t, b.r - R, b.b - B);
      if (d > tol) out.push({ check: '③ 잘림', a: e.tagName.toLowerCase() + (e.getAttribute('d') ? ' ' + e.getAttribute('d').slice(0, 20) : ''), b: '', px: Math.round(d) });
    });
  }
  const txt = document.querySelector('.lesson__text');
  const portrait = matchMedia('(orientation: portrait)').matches;
  if (txt && !portrait) {
    const was = txt.classList.contains('is-over'); txt.classList.remove('is-over');
    const over = txt.scrollHeight - txt.clientHeight;
    if (was) txt.classList.add('is-over');
    if (over > 4) out.push({ check: '④ 넘침', a: '.lesson__text', b: '', px: over });
  }
  const sw = document.documentElement.scrollWidth;
  if (sw > W0) out.push({ check: '⑤ 가로', a: 'scrollWidth ' + sw, b: 'innerWidth ' + W0, px: sw - W0 });
  return { title: title.replace(/\s+/g, ' ').trim(), n: document.querySelectorAll('.lesson__dot').length, rows: out };
}
"""


def run(slug, w, h, teacher, browser):
    q = "view=explain" + ("&teacher=1" if teacher else "")
    url = (ROOT / "sims" / slug / "index.html").resolve().as_uri() + "?" + q
    ctx = browser.new_context(viewport={"width": w, "height": h})
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(url)
    page.wait_for_timeout(700)
    rows = []
    first = page.evaluate(JS)
    n = max(1, first["n"])
    res = first
    for i in range(n):
        if i:
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(350)
            res = page.evaluate(JS)
        for r in res["rows"]:
            if teacher and r["check"] != "④ 넘침":
                continue   # 교사 모드는 넘침만(그림은 같음)
            rows.append(dict(mode="교사" if teacher else "학생", ch=i + 1, title=res["title"], **r))
    for e in errs:
        rows.append(dict(mode="교사" if teacher else "학생", ch=0, title="", check="pageerror", a=e[:60], b="", px=0))
    ctx.close()
    return rows


def main():
    args = sys.argv[1:]
    size, team, teacher = "1280x720", "UI팀1", True
    if "--size" in args:
        i = args.index("--size"); size = args[i + 1]; del args[i:i + 2]
    if "--team" in args:
        i = args.index("--team"); team = args[i + 1]; del args[i:i + 2]
    if "--no-teacher" in args:
        args.remove("--no-teacher"); teacher = False
    if not args:
        print(__doc__); sys.exit(2)
    slugs = SLUGS if args[0] == "all" else [args[0]]
    w, h = map(int, size.lower().split("x"))
    outdir = ROOT / "_review" / "R7" / "3차" / team
    outdir.mkdir(parents=True, exist_ok=True)
    total = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        for slug in slugs:
            rows = run(slug, w, h, False, browser)
            if teacher:
                rows += run(slug, w, h, True, browser)
            lines = ["# check_dg %s %dx%d — %d건" % (slug, w, h, len(rows)), "모드\t장\t그림/장 제목\t검사\t요소 a\t요소 b\tpx"]
            for r in rows:
                lines.append("%s\t%s\t%s\t%s\t%s\t%s\t%s" % (r["mode"], r["ch"], r["title"][:28], r["check"], r["a"], r["b"], r["px"]))
            text = "\n".join(lines)
            print(text + "\n")
            suffix = "" if size == "1280x720" else "_" + size
            (outdir / ("dg_%s%s.txt" % (slug, suffix))).write_text(text + "\n", encoding="utf-8")
            total += len(rows)
        browser.close()
    print("합계 %d건" % total)
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
