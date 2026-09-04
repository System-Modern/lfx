import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

PORT = int(os.environ.get("PORT", "3000"))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
ROOT = Path(__file__).resolve().parent

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("SUPABASE_URL dan SUPABASE_ANON_KEY wajib tersedia di environment server.")


class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Access-Control-Allow-Headers", "apikey, authorization, content-type, x-client-info, prefer, range")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.end_headers()

    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()

    def do_PUT(self):
        self.handle_request()

    def do_PATCH(self):
        self.handle_request()

    def do_DELETE(self):
        self.handle_request()

    def handle_request(self):
        if self.path.startswith("/supabase/"):
            self.proxy_supabase()
        else:
            self.serve_static()

    def proxy_supabase(self):
        upstream_url = SUPABASE_URL + self.path[len("/supabase"):]
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "content-length", "authorization", "apikey"}
        }
        headers["apikey"] = SUPABASE_ANON_KEY
        headers["Authorization"] = "Bearer " + SUPABASE_ANON_KEY

        try:
            request = Request(upstream_url, data=body or None, headers=headers, method=self.command)
            with urlopen(request) as upstream:
                response_body = upstream.read()
                self.send_response(upstream.status)
                self.send_header("Content-Type", upstream.headers.get("Content-Type", "application/octet-stream"))
                self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
                self.end_headers()
                self.wfile.write(response_body)
        except Exception as error:
            self.send_error(502, "Supabase tidak dapat dihubungi: " + str(error))

    def serve_static(self):
        relative_path = urlsplit(self.path).path.lstrip("/") or "index.html"
        file_path = (ROOT / relative_path).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            self.send_error(403, "Forbidden")
            return
        if not file_path.is_file():
            self.send_error(404, "Not found")
            return

        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(file_path.name)[0] or "application/octet-stream")
        self.end_headers()
        with file_path.open("rb") as file:
            self.wfile.write(file.read())


print(f"Supabase proxy aktif di http://localhost:{PORT}/supabase")
ThreadingHTTPServer(("", PORT), Handler).serve_forever()
