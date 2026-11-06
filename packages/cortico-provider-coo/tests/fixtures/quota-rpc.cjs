/** Local line-protocol service for quota tests; never accesses a real account. */
const { createInterface } = require('node:readline');
const { writeFileSync } = require('node:fs');
const mode = process.argv[2];
if (process.argv[3]) writeFileSync(process.argv[3], String(process.pid));
const lines = createInterface({ input: process.stdin });
let initialized = false, acknowledged = false, authenticated = false;
const send = (id, result) => process.stdout.write(JSON.stringify({ id, result }) + '\n');
lines.on('line', (line) => {
  const request = JSON.parse(line);
  if (mode === 'hang') return;
  if (request.method === 'initialize' && !initialized) {
    initialized = true;
    send(request.id, { userAgent: 'local-test' });
  } else if (request.method === 'initialized' && initialized) acknowledged = true;
  else if (request.method === 'account/read' && acknowledged) {
    authenticated = true;
    send(request.id, { account: mode === 'signed-out' ? null : mode === 'api-key' ? { type: 'apiKey' } : { type: 'chatgpt', email: 'account@example.test' } });
  } else if (request.method === 'account/rateLimits/read' && authenticated) {
    if (mode === 'error') { process.stdout.write(JSON.stringify({ id: request.id, error: { code: -32000, message: 'private diagnostic' } }) + '\n'); return; }
    if (mode === 'malformed') { process.stdout.write('not JSON\n'); return; }
    if (mode === 'empty') { send(request.id, { rateLimits: { primary: null, secondary: null } }); return; }
    send(request.id, { rateLimitsByLimitId: { main: { limitId: 'main', primary: { usedPercent: 25, windowDurationMins: 300, resetsAt: 2000000000 }, secondary: { usedPercent: 60, windowDurationMins: 10080, resetsAt: null } } } });
  } else {
    process.stderr.write('Unexpected operation'); process.exit(2);
  }
});
