from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import socket
class Handler(SimpleHTTPRequestHandler):
 cache_probe_revision=None
 def translate_path(self,path):
  if path.startswith('/ipa-keyboard/'):path=path[len('/ipa-keyboard'):]
  return super().translate_path(path)
 def do_GET(self):
  if 'ipa_test_network_down=1' in self.headers.get('Cookie',''):
   self.connection.shutdown(socket.SHUT_RDWR);self.connection.close();return
  if self.path.startswith('/ipa-keyboard/__cache-probe-state?rev='):
   value=self.path.split('rev=',1)[1];Handler.cache_probe_revision=None if value=='clear' else value
   body=value.encode();kind='text/plain'
  elif self.path.split('?',1)[0]=='/ipa-keyboard/chart.html' and Handler.cache_probe_revision=='old':
   body=b'<!doctype html><h1 id="old-http-chart">Old HTTP cached chart</h1>'
   self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Cache-Control','public,max-age=3600');self.end_headers();self.wfile.write(body);return
  elif self.path=='/ipa-keyboard/sw.js?network-first=1':
   body=Path('qa/fixtures/network-first-v83.34-sw.js').read_bytes();kind='application/javascript'
  elif self.path=='/ipa-keyboard/sw.js?legacy=1':
   body=Path('qa/legacy-sw.js').read_bytes();kind='application/javascript'
  elif self.path=='/ipa-keyboard/__upgrade-fixture':
   body=b'<!doctype html><title>Upgrade fixture</title>';kind='text/html'
  else:return super().do_GET()
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
