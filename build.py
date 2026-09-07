"""Build a standalone, offline HTML file. Python standard library only."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
css = (ROOT / 'styles.css').read_text(encoding='utf-8')
js = '\n\n'.join((ROOT / 'src' / name).read_text(encoding='utf-8') for name in ['model.js','engine.js','render.js','mobile.js','app.js'])
html = (ROOT / 'template.html').read_text(encoding='utf-8').replace('/*__STYLE__*/',css).replace('/*__SCRIPT__*/',"(() => {\n'use strict';\n" + js + '\n})();')
(ROOT / 'index.html').write_text(html,encoding='utf-8')
print(f'Built {ROOT / "index.html"} ({len(html.encode("utf-8")):,} bytes)')
