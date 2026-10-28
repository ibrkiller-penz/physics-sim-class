from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"_review"/"R3"/"물리교사"
with sync_playwright() as p:
    b=p.chromium.launch(channel="chrome",headless=True)
    pg=b.new_page(viewport={"width":1920,"height":1080})
    pg.goto((ROOT/"sims/projectile-energy/index.html").as_uri()); pg.wait_for_timeout(700)
    pg.get_by_text("예측 없이").first.click(); pg.wait_for_timeout(300)
    pg.hover(".preset-card >> nth=2"); pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT/"h_presethover.png"),clip={"x":0,"y":800,"width":1400,"height":280})
    for i in range(7): pg.keyboard.press("Tab")
    pg.wait_for_timeout(200); pg.screenshot(path=str(OUT/"h_focus.png"))
    pg.get_by_text("기본값으로 되돌리기").first.click(); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT/"h_toast.png"))
    pg.get_by_text("표 보기").first.click(); pg.wait_for_timeout(700)
    pg.screenshot(path=str(OUT/"h_table_empty.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    pg.get_by_text("그 밖의 기능").first.click(); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT/"h_more.png"))
    b.close()
