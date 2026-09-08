"""Optional local server, using only Python's standard library."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=8000)
parser.add_argument("--host", default="127.0.0.1")
args = parser.parse_args()
handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
try:
    with ThreadingHTTPServer((args.host, args.port), handler) as server:
        print(f"Open http://{args.host}:{args.port}  (Ctrl+C to stop)")
        server.serve_forever()
except KeyboardInterrupt:
    print("\nStopped.")
except OSError as error:
    raise SystemExit(f"Could not start server: {error}")
