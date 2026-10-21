import http.server, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); super().end_headers()
http.server.ThreadingHTTPServer(('0.0.0.0',4560), functools.partial(H, directory='.')).serve_forever()
