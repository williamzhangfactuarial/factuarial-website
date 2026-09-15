const DESTINATION = 'contact@factuarial.insure';
const SENDER = 'website@forms.factuarial.insure';
const MAX_BYTES = 24_000;
const AUDIENCES = { robotics: 'Robotics company or operator', broker: 'Broker', capacity: 'Capacity partner', other: 'Other' };
const unavailable = 'The form is temporarily unavailable. Please email contact@factuarial.insure, or try again shortly.';
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const isConfigured = (env) => Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.EMAIL && env.CONTACT_RATE_LIMITER);

export function validateContact(data) {
  const errors = {};
  const fields = {};
  for (const [name, limit] of Object.entries({ name: 120, email: 254, company: 160, message: 5000 })) {
    const value = typeof data[name] === 'string' ? data[name].trim() : '';
    fields[name] = value;
    if (name !== 'company' && !value) errors[name] = `Please enter your ${name}.`;
    else if (value.length > limit) errors[name] = `Please use ${limit} characters or fewer.`;
    else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || (name !== 'message' && /[\r\n]/.test(value))) errors[name] = 'Please remove unsupported characters.';
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) errors.email = 'Please enter a valid email address.';
  if (typeof data.audience !== 'string' || !Object.hasOwn(AUDIENCES, data.audience)) errors.audience = 'Please select an option.';
  fields.audience = data.audience;
  return { fields, errors };
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new RangeError('Body too large');
  if (!request.body) throw new SyntaxError('Missing body');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new RangeError('Body too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new SyntaxError('Invalid body');
  return data;
}

export async function handleContact(request, env, verifyFetch = fetch) {
  if (request.method !== 'POST') return json({ message: 'Use POST to submit this form.' }, 405, { Allow: 'POST' });
  const siteOrigin = env.SITE_ORIGIN || 'https://factuarial.insure';
  if (request.headers.get('Origin') !== siteOrigin) return json({ message: 'Please submit the form from our website.' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ message: 'Please submit the contact form on our website.' }, 415);
  if (!isConfigured(env)) return json({ message: unavailable }, 503);
  try {
    const { success } = await env.CONTACT_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!success) return json({ message: 'Too many attempts. Please wait a minute before trying again.' }, 429, { 'Retry-After': '60' });
    let data;
    try { data = await readBody(request); }
    catch (error) { return json({ message: error instanceof RangeError ? 'Your message is too long.' : 'Please check your message and try again.' }, error instanceof RangeError ? 413 : 400); }
    if (typeof data.website !== 'undefined' && data.website !== '') return json({ message: 'This submission could not be verified.' }, 400);
    const { fields, errors } = validateContact(data);
    if (Object.keys(errors).length) return json({ message: 'Please check the highlighted fields.', errors }, 400);
    if (typeof data.turnstileToken !== 'string' || !data.turnstileToken || data.turnstileToken.length > 2048) return json({ message: 'Please complete verification and try again.' }, 400);
    const check = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: data.turnstileToken, remoteip: request.headers.get('CF-Connecting-IP') || undefined }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!check.ok) return json({ message: unavailable }, 503);
    const verification = await check.json();
    if (!verification.success || verification.hostname !== new URL(siteOrigin).hostname || verification.action !== 'contact') return json({ message: 'Verification expired or failed. Please try again.' }, 400);
    const text = `Name: ${fields.name}\nEmail: ${fields.email}\nCompany or organization: ${fields.company || 'Not provided'}\nAudience: ${AUDIENCES[fields.audience]}\n\nMessage:\n${fields.message}`;
    await env.EMAIL.send({ to: DESTINATION, from: { email: SENDER, name: 'Factuarial website' }, replyTo: fields.email, subject: `Website inquiry: ${AUDIENCES[fields.audience]}`, text });
    return json({ ok: true });
  } catch { return json({ message: unavailable }, 503); }
}

function secure(response) {
  const result = new Response(response.body, response);
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  result.headers.set('X-Frame-Options', 'DENY');
  result.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = new URL(env.SITE_ORIGIN || 'https://factuarial.insure');
    if (origin.protocol === 'https:' && url.hostname === origin.hostname && url.protocol === 'http:') { url.protocol = 'https:'; return Response.redirect(url.toString(), 301); }
    if (url.pathname === '/api/contact') return secure(await handleContact(request, env));
    if (url.pathname === '/api/contact/config') {
      if (request.method !== 'GET') return secure(json({ message: 'Method not allowed.' }, 405, { Allow: 'GET' }));
      return secure(isConfigured(env) ? json({ sitekey: env.TURNSTILE_SITE_KEY }) : json({ message: unavailable }, 503));
    }
    if (url.pathname.startsWith('/api/')) return secure(json({ message: 'Not found.' }, 404));
    return secure(await env.ASSETS.fetch(request));
  }
};
