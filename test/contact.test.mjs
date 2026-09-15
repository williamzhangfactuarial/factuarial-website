import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleContact, validateContact } from '../worker.mjs';

const valid = { name: 'Website test', email: 'contact@factuarial.insure', company: 'Factuarial', audience: 'other', message: 'Contact form delivery test.', website: '', turnstileToken: 'test-token' };
const request = (data = valid, headers = {}) => new Request('https://factuarial.insure/api/contact', { method: 'POST', headers: { Origin: 'https://factuarial.insure', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(data) });
function setup({ allowed = true, verification = {}, failEmail = false } = {}) {
  const sent = [];
  let verified = 0;
  const env = {
    SITE_ORIGIN: 'https://factuarial.insure', TURNSTILE_SITE_KEY: 'public-test', TURNSTILE_SECRET_KEY: 'private-test',
    CONTACT_RATE_LIMITER: { limit: async () => ({ success: allowed }) },
    EMAIL: { send: async (message) => { if (failEmail) throw new Error('provider detail'); sent.push(message); return { messageId: 'test' }; } }
  };
  const verify = async () => { verified++; return Response.json({ success: true, hostname: 'factuarial.insure', action: 'contact', ...verification }); };
  return { env, sent, verify, verified: () => verified };
}

test('valid inquiry sends once to the fixed destination with visitor Reply-To', async () => {
  const s = setup();
  const response = await handleContact(request({ ...valid, to: 'someone@example.com', from: 'attacker@example.com' }), s.env, s.verify);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(s.sent.length, 1);
  assert.equal(s.sent[0].to, 'contact@factuarial.insure');
  assert.equal(s.sent[0].from.email, 'website@forms.factuarial.insure');
  assert.equal(s.sent[0].replyTo, valid.email);
  assert.equal(s.sent[0].subject, 'Website inquiry: Other');
  assert.match(s.sent[0].text, /Contact form delivery test\./);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('required fields, email format, enum and length are validated', () => {
  const { errors } = validateContact({ name: '', email: 'invalid', audience: '__proto__', message: 'x'.repeat(5001) });
  assert.deepEqual(Object.keys(errors).sort(), ['audience', 'email', 'message', 'name']);
  assert.deepEqual(validateContact({ ...valid, company: '' }).errors, {});
});
test('header injection and non-string audience are rejected', () => {
  assert.ok(validateContact({ ...valid, email: 'name@example.com\r\nBcc: bad@example.com', audience: ['other'] }).errors.email);
  assert.ok(validateContact({ ...valid, audience: ['other'] }).errors.audience);
});
test('cross-origin request cannot send mail', async () => {
  const s = setup();
  assert.equal((await handleContact(request(valid, { Origin: 'https://elsewhere.example' }), s.env, s.verify)).status, 403);
  assert.equal(s.sent.length, 0);
  assert.equal(s.verified(), 0);
});
test('malformed and oversized requests fail before verification', async () => {
  const s = setup();
  for (const data of [null, [], 'message']) assert.equal((await handleContact(request(data), s.env, s.verify)).status, 400);
  assert.equal((await handleContact(request({ ...valid, message: 'x'.repeat(25000) }), s.env, s.verify)).status, 413);
  assert.equal(s.verified(), 0);
});
test('invalid field feedback and honeypot prevent sending', async () => {
  const s = setup();
  const response = await handleContact(request({ ...valid, email: 'bad' }), s.env, s.verify);
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.email);
  assert.equal((await handleContact(request({ ...valid, website: 'spam' }), s.env, s.verify)).status, 400);
  assert.equal(s.sent.length, 0);
});
test('rate limiting returns retry guidance without calling provider', async () => {
  const s = setup({ allowed: false });
  const response = await handleContact(request(), s.env, s.verify);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(s.verified(), 0);
});
test('failed, wrong-host and wrong-action challenges cannot send', async () => {
  for (const verification of [{ success: false }, { hostname: 'elsewhere.example' }, { action: 'login' }]) {
    const s = setup({ verification });
    assert.equal((await handleContact(request(), s.env, s.verify)).status, 400);
    assert.equal(s.sent.length, 0);
  }
});
test('missing challenge and missing configuration fail honestly', async () => {
  const s = setup();
  assert.equal((await handleContact(request({ ...valid, turnstileToken: '' }), s.env, s.verify)).status, 400);
  delete s.env.TURNSTILE_SECRET_KEY;
  const response = await handleContact(request(), s.env, s.verify);
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /email contact@factuarial.insure/);
  assert.equal(s.sent.length, 0);
});
test('email or verification service failure never reports success or exposes details', async () => {
  const s = setup({ failEmail: true });
  for (const verify of [s.verify, async () => { throw new Error('private detail'); }]) {
    const response = await handleContact(request(), s.env, verify);
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /provider detail|private detail/);
  }
});
test('production HTTP redirects to HTTPS with path and query intact', async () => {
  const response = await worker.fetch(new Request('http://factuarial.insure/contact?audience=broker'), {});
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://factuarial.insure/contact?audience=broker');
});
test('contact config exposes only the public sitekey and disallows mutations', async () => {
  const s = setup();
  const response = await worker.fetch(new Request('https://factuarial.insure/api/contact/config'), s.env);
  assert.deepEqual(await response.json(), { sitekey: 'public-test' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await worker.fetch(new Request('https://factuarial.insure/api/contact/config', { method: 'POST' }), s.env)).status, 405);
});
