import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
await mkdir(join(root, 'artifacts'), { recursive: true });
await build({ entryPoints: [join(root, 'scripts/preview-client.js')], outfile: join(root, 'artifacts/preview.js'), bundle: true, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.css': 'text' }, target: 'es2022' });
const server = createServer(async (req, res) => {
  if (req.url === '/preview.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(join(root, 'artifacts/preview.js'))); }
  else if (req.url === '/' || req.url?.startsWith('/?')) { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DSH Visuals design gallery</title><body><main id="root"></main><script src="/preview.js"></script></body></html>'); }
  else { res.statusCode = 404; res.end('Not found'); }
});
server.listen(Number(process.env.PORT || 19391), '127.0.0.1', () => console.log(`Design preview: http://127.0.0.1:${server.address().port}`));
