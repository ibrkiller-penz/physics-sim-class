"""시뮬레이터 화면 찍기 (리뷰·고도화용).

사용:
  python tools/shot.py <페이지> <저장.png> [동작 ...]

  <페이지>  프로젝트 기준 상대경로(예: sims/convex-lens/index.html) 또는 http 주소
            쿼리도 됨(R2 G4): sims/orbit-gravity/index.html?mode=kepler  index.html?teacher=1
  동작      순서대로 실행한다.
              key:ArrowRight      키 누르기 (Space, KeyS, Digit1 ...)
              click:CSS선택자     요소 클릭
              text:보이는글자     그 글자가 있는 요소 클릭
              fill:CSS선택자=값   입력칸에 값 넣고 Enter
              wait:밀리초         기다리기
              shot:파일.png       중간 화면 찍기
  --size 1280x720   화면 크기 (기본 1920x1080, 태블릿 확인은 1180x820)

콘솔 오류는 표준출력에 [console.error] 로 찍힌다.
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def main():
    args = sys.argv[1:]
    w, h = 1920, 1080
    if "--size" in args:
        i = args.index("--size")
        w, h = map(int, args[i + 1].lower().split("x"))
        del args[i:i + 2]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    page_arg, out, actions = args[0], args[1], args[2:]
    if page_arg.startswith("http"):
        url = page_arg
    else:
        path, q, query = page_arg.partition("?")          # 파일 이름은 쿼리를 뗀 것
        url = (ROOT / path).resolve().as_uri() + (("?" + query) if q else "")

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_page(viewport={"width": w, "height": h})
        page.on("console", lambda m: m.type == "error" and print("[console.error]", m.text))
        page.on("pageerror", lambda e: print("[pageerror]", e))
        page.goto(url)
        page.wait_for_timeout(600)
        for a in actions:
            kind, _, val = a.partition(":")
            if kind == "key":
                page.keyboard.press(val)
            elif kind == "click":
                page.click(val)
            elif kind == "text":
                page.get_by_text(val, exact=False).first.click()
            elif kind == "fill":
                sel, _, v = val.partition("=")
                page.fill(sel, v)
                page.keyboard.press("Enter")
            elif kind == "wait":
                page.wait_for_timeout(int(val))
            elif kind == "shot":
                page.screenshot(path=val)
                print("saved", val)
            page.wait_for_timeout(250)
        page.screenshot(path=out)
        print("saved", out)
        browser.close()


if __name__ == "__main__":
    main()
