import http.server
import socketserver
import sys

handler = http.server.SimpleHTTPRequestHandler
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(('127.0.0.1', 9090), handler) as httpd:
    print('Serving HTTP on 127.0.0.1 port 9090')
    sys.stdout.flush()
    httpd.serve_forever()
