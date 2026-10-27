// free-probe: verifies a hosting platform can serve HTTPS, WebSocket and outbound traffic.
// Endpoints:
//   GET /health   -> {"ok":true,...}
//   GET /outbound -> server fetches two independent IP-echo services, returns egress IP / country
//   WS  /echo     -> echoes every message back prefixed with "echo:"
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

async function fetchJson(url, ms = 6000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'user-agent': 'free-probe/1.0' } });
    return { status: r.status, body: (await r.text()).slice(0, 500) };
  } finally { clearTimeout(t); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString(), node: process.version }));
    return;
  }
  if (url.pathname === '/outbound') {
    const out = { ok: false, checks: {} };
    try {
      const ipify = await fetchJson('https://api.ipify.org?format=json');
      out.checks.ipify = ipify;
      try { out.egressIp = JSON.parse(ipify.body).ip; } catch {}
    } catch (e) { out.checks.ipify = { error: String(e) }; }
    try {
      const cf = await fetchJson('https://www.cloudflare.com/cdn-cgi/trace');
      out.checks.cloudflareTrace = cf;
      const m = cf.body.match(/^ip=(.+)$/m); if (m) out.egressIp = out.egressIp || m[1];
      const loc = cf.body.match(/^loc=(.+)$/m); if (loc) out.egressCountry = loc[1];
    } catch (e) { out.checks.cloudflareTrace = { error: String(e) }; }
    out.ok = Boolean(out.egressIp);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out, null, 2));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('free-probe running. See /health, /outbound, ws /echo\n');
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/echo') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.send('hello from free-probe');
      ws.on('message', (data) => ws.send('echo:' + data.toString()));
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => console.log('free-probe listening on ' + PORT));
