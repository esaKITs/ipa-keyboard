from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  if path.startswith('/ipa-keyboard/'):path=path[len('/ipa-keyboard'):]
  return super().translate_path(path)
 def do_GET(self):
  if self.path=='/ipa-keyboard/sw.js?legacy=1':
   body=Path('qa/legacy-sw.js').read_bytes();kind='application/javascript'
  elif self.path=='/ipa-keyboard/__upgrade-fixture':
   body=b'<!doctype html><title>Upgrade fixture</title>';kind='text/html'
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
