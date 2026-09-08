from pathlib import Path
root = Path(__file__).resolve().parent
template = (root / "template.html").read_text(encoding="utf-8")
html = template.replace("/*__STYLE__*/", (root / "src/style.css").read_text(encoding="utf-8"))
html = html.replace("/*__GAME__*/", (root / "src/game.js").read_text(encoding="utf-8"))
(root / "index.html").write_text(html, encoding="utf-8")
print("Built index.html")
