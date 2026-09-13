import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import ask from './api/ask.js';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml', '.mp3':'audio/mpeg' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/ask') return await ask(req,res);
    if (pathname.startsWith('/api/')) { res.writeHead(404); res.end(); return; }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || !types[extname(file)]) { res.writeHead(404); res.end('Não encontrado'); return; }
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)], 'Cache-Control':'no-cache'}); res.end(data);
  } catch { res.writeHead(404); res.end('Não encontrado'); }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`XPTO Studio: http://localhost:${server.address().port}`));
