const form = document.querySelector('#contact-form');
const status = document.querySelector('#form-status');
const submit = form.querySelector('[type="submit"]');
const selectedAudience = new URLSearchParams(location.search).get('audience');
if (['robotics', 'broker', 'capacity', 'other'].includes(selectedAudience)) form.elements.audience.value = selectedAudience;

let token = '';
let widget;
let sending = false;
const unavailable = 'The form is temporarily unavailable. Please email contact@factuarial.insure, or try again shortly.';
const fieldNames = ['name', 'email', 'company', 'audience', 'message'];

function clearErrors() {
  for (const name of fieldNames) {
    form.elements[name].removeAttribute('aria-invalid');
    document.querySelector(`#${name}-error`).textContent = '';
  }
}
function showErrors(errors) {
  for (const [name, message] of Object.entries(errors)) {
    if (!fieldNames.includes(name)) continue;
    form.elements[name].setAttribute('aria-invalid', 'true');
    document.querySelector(`#${name}-error`).textContent = message;
  }
  form.querySelector('[aria-invalid="true"]')?.focus();
}

async function initializeVerification() {
  try {
    const response = await fetch('/api/contact/config');
    if (!response.ok) throw new Error('Unavailable');
    const config = await response.json();
    if (!config.sitekey) throw new Error('Unavailable');
    window.onFactuarialTurnstile = () => {
      widget = window.turnstile.render('#turnstile-widget', {
        sitekey: config.sitekey, action: 'contact', theme: 'light', size: 'flexible', appearance: 'interaction-only',
        callback: (value) => { token = value; },
        'expired-callback': () => { token = ''; },
        'error-callback': () => { token = ''; status.textContent = 'Verification could not load. Please reload the page or email contact@factuarial.insure.'; }
      });
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onFactuarialTurnstile&render=explicit';
    script.async = true;
    script.onerror = () => { status.textContent = unavailable; };
    document.head.append(script);
  } catch { status.textContent = unavailable; }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending) return;
  clearErrors();
  if (!form.reportValidity()) return;
  if (!token) {
    status.textContent = widget === undefined ? unavailable : 'Please complete verification, or email contact@factuarial.insure.';
    if (widget !== undefined) window.turnstile.reset(widget);
    return;
  }
  sending = true;
  submit.disabled = true;
  submit.textContent = 'Sending…';
  status.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  data.turnstileToken = token;
  try {
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) {
      showErrors(result.errors || {});
      status.textContent = result.message || unavailable;
      return;
    }
    form.reset();
    status.textContent = 'Thank you. Your message has been sent.';
  } catch { status.textContent = unavailable; }
  finally {
    sending = false;
    submit.disabled = false;
    submit.innerHTML = 'Send message <span aria-hidden="true">→</span>';
    token = '';
    if (widget !== undefined) window.turnstile.reset(widget);
  }
});
initializeVerification();
