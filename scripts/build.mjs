import { mkdir, writeFile, rm } from 'node:fs/promises';
import { products, teamExperience } from '../src/products.mjs';

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const link = (href, label, extra = '', className = 'text-link') => `<a class="${className}" href="${href}" ${extra}>${escape(label)} <span aria-hidden="true">→</span></a>`;
const emphasize = (text, phrases = []) => phrases.reduce((html, phrase) => html.split(escape(phrase)).join(`<strong>${escape(phrase)}</strong>`), escape(text));
const illustration = (name, alt) => `<figure class="illustration"><img src="/assets/images/${name}-1774.webp" srcset="/assets/images/${name}-900.webp 900w, /assets/images/${name}-1774.webp 1774w" sizes="(max-width: 1152px) calc(100vw - 48px), 1080px" width="1774" height="887" alt="${escape(alt)}" fetchpriority="high" decoding="async"></figure>`;

function shell(title, description, path, content, section) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#F5F4EF">
  <meta name="color-scheme" content="light">
  <title>${escape(title)} | factuarial.</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="https://factuarial.insure${path}">
  <meta property="og:title" content="${escape(title)} | factuarial.">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://factuarial.insure${path}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/fonts/lmroman-regular.woff" as="font" type="font/woff" crossorigin>
  <link rel="preload" href="/assets/fonts/ibm-plex-mono.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/site.css">
  <script src="/assets/site.js" defer></script>
  ${section === 'contact' ? '<script src="/assets/contact.js" defer></script>' : ''}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="page">
    <header class="site-header">
      <a class="brand" href="/" aria-label="factuarial. home"><img src="/assets/logo.svg" width="32" height="56" alt=""><span>factuarial.</span></a>
      <nav aria-label="Main navigation">
        <a class="nav-link" href="/" ${section === 'company' ? 'aria-current="page"' : ''}>Company</a>
        <div class="products-menu">
          <button class="nav-link products-trigger ${section === 'products' ? 'is-current' : ''}" type="button" aria-expanded="false" aria-controls="products-options">Who we help<span class="chevron" aria-hidden="true"></span></button>
          <div class="products-panel" id="products-options" hidden>
            ${products.map(p => `<a href="/products/${p.slug}" ${path === '/products/' + p.slug ? 'aria-current="page"' : ''}>${escape(p.label)}<span aria-hidden="true">→</span></a>`).join('\n            ')}
          </div>
        </div>
        <a class="nav-link" href="/careers" ${section === 'careers' ? 'aria-current="page"' : ''}>Careers</a>
        <a class="nav-link" href="/contact" ${section === 'contact' ? 'aria-current="page"' : ''}>Contact</a>
      </nav>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <footer class="site-footer"><a class="footer-brand" href="/">factuarial.</a><p>©2026 Factuarial Inc. All rights reserved.</p></footer>
  </div>
</body>
</html>
`.replace(/[ \t]+$/gm, '');
}

const companyIntro = 'We are a group of researchers, underwriters, actuaries, and engineers developing risk assessments and insurance solutions for robots operating in the real world.';
const home = `
      <div class="opening">
      <section class="hero company-hero" aria-labelledby="page-title">
        <h1 id="page-title">Insurance for<br>physical AI.</h1>
        <p class="intro">${companyIntro}</p>
        <div class="hero-actions">${link('/#offerings', 'Explore our offerings', '', 'button-link')}${link('/contact', 'Get in touch')}</div>
      </section>
      ${illustration('company', 'People and robots working together across a workshop and a public space.')}
      </div>
      <section class="offerings" id="offerings" tabindex="-1" aria-label="Our offerings">
        ${products.map(p => `<article class="offering"><h2>For ${escape(p.label.toLowerCase())}</h2><div><p>${p.slug === 'robotics' ? `${escape(p.summary.replace(/ they do\.$/, ''))}<br class="desktop-break"> <span class="keep-together">they do.</span>` : escape(p.summary)}</p>${link('/products/' + p.slug, 'Our offering', `aria-label="Our offering for ${escape(p.label.toLowerCase())}"`)}</div></article>`).join('\n        ')}
      </section>
      <section class="support-section company-experience"><h2>Our experience</h2><div class="prose"><p>${emphasize(teamExperience.text, teamExperience.emphasis)}</p></div></section>
      <section class="company-contact"><h2>We’d love to hear from you.</h2><p><a class="button-link" href="/contact">Get in touch</a> <span>or email us at <a href="mailto:contact@factuarial.insure">contact@factuarial.insure</a>.</span></p></section>`;

await mkdir('public/products', { recursive: true });
await writeFile('public/index.html', shell('Insurance for physical AI', companyIntro, '/', home, 'company'));
for (const p of products) {
  const content = `
      <div class="opening">
      <section class="hero product-hero" aria-labelledby="page-title"><p class="eyebrow">For ${escape(p.label.toLowerCase())}</p><h1 id="page-title">${escape(p.title)}</h1><p class="intro">${escape(p.description)}</p>${p.statement ? `<p class="hero-statement"><strong>${escape(p.statement)}</strong></p>` : ''}</section>
      ${illustration(p.image, p.alt)}
      </div>
      <section class="offering-details" aria-label="${escape(p.title)}">
        <table class="${p.slug === 'robotics' ? 'coverage-table' : 'needs-table'}"><thead><tr><th scope="col">${p.columns[0]}</th><th scope="col">${p.columns[1]}</th></tr></thead><tbody>${p.rows.map(([a,b]) => `<tr><th scope="row">${escape(a)}</th><td><span class="mobile-column-label" aria-hidden="true">${p.columns[1]}</span>${escape(b)}</td></tr>`).join('')}</tbody></table>
        ${p.note ? `<p class="table-note">${escape(p.note)}</p>` : ''}
      </section>
      <section class="support-section"><h2>${escape(p.sectionTitle)}</h2><div class="prose">${p.paragraphs.map((t, i) => `<p>${emphasize(t, p.emphasis)}</p>${i === 0 && p.engineeringExamples ? `<section class="engineering-examples" aria-labelledby="engineering-examples-title"><h3 id="engineering-examples-title">Examples of engineering support</h3><ul>${p.engineeringExamples.map(example => `<li>${escape(example)}</li>`).join('')}</ul></section>` : ''}`).join('')}${p.qualification ? `<p class="qualification">${escape(p.qualification)}</p>` : ''}</div></section>
      <section class="closing-cta"><h2>${escape(p.cta)}</h2>${link('/contact?audience=' + p.audience, p.ctaLabel, '', 'button-link')}</section>`;
  await writeFile(`public/products/${p.slug}.html`, shell(p.title, p.description, '/products/' + p.slug, content, 'products'));
}

const field = (id, label, input) => `<div class="field"><label for="${id}">${label}</label>${input}<span class="field-error" id="${id}-error"></span></div>`;
const contact = `
      <section class="hero contact-hero" aria-labelledby="page-title"><h1 id="page-title">Let’s talk.</h1><p class="intro" id="contact-intro">Tell us who you are and what you’re working on.</p><p class="contact-email">You can also reach us at<br><a href="mailto:contact@factuarial.insure">contact@factuarial.insure</a>.</p></section>
      <form id="contact-form" class="contact-form" action="/api/contact" method="post" aria-label="Contact factuarial">
        <div class="field-pair">
          ${field('name', 'Name', '<input id="name" name="name" autocomplete="name" maxlength="120" required aria-describedby="name-error">')}
          ${field('email', 'Email', '<input id="email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="email-error">')}
        </div>
        ${field('company', 'Company or organization <span class="optional">(optional)</span>', '<input id="company" name="company" autocomplete="organization" maxlength="160" aria-describedby="company-error">')}
        ${field('audience', 'I’m a…', '<select id="audience" name="audience" required aria-describedby="audience-error"><option value="">Select an option</option><option value="robotics">Robotics company or operator</option><option value="broker">Broker</option><option value="capacity">Capacity partner</option><option value="other">Other</option></select>')}
        ${field('message', 'Message', '<p class="field-guidance" id="message-guidance">Tell us what you’d like to discuss.</p><textarea id="message" name="message" rows="6" maxlength="5000" required aria-describedby="message-guidance message-error"></textarea>')}
        <div class="honey" aria-hidden="true"><label for="website">Leave this field empty</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
        <p class="form-note">We’ll use these details to respond to your inquiry.</p>
        <div id="turnstile-widget"></div>
        <div class="form-actions"><p class="submission-note">Your message goes to the Factuarial team. We’ll reply to the email address you provide.</p><button class="send-button" type="submit">Send message <span aria-hidden="true">→</span></button><p id="form-status" role="status" aria-live="polite"></p></div>
        <noscript><p>Please enable JavaScript to send this form, or email <a href="mailto:contact@factuarial.insure">contact@factuarial.insure</a>.</p></noscript>
      </form>`;
await writeFile('public/contact.html', shell('Contact', 'Get in touch with Factuarial about robotics insurance, a placement, or a capacity partnership.', '/contact', contact, 'contact'));
const careersIntro = 'We’d like to hear from people with backgrounds in robotics, software, research, or insurance.';
const careers = `<section class="careers-content" aria-labelledby="page-title"><h1 class="visually-hidden" id="page-title">Careers</h1><p>${careersIntro}</p><p>Tell us about yourself, something you’ve worked on, and what you’d like to work on next.</p>${link('mailto:contact@factuarial.insure?subject=Careers', 'Introduce yourself')}</section>`;
await writeFile('public/careers.html', shell('Careers', careersIntro, '/careers', careers, 'careers'));
await writeFile('public/404.html', shell('Page not found', 'Find your way back to Factuarial.', '/404', '<section class="hero error-page"><p class="eyebrow">404</p><h1>Page not found.</h1><p>This page may have moved.</p>' + link('/', 'Back to Company') + '</section>', ''));
await writeFile('public/robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://factuarial.insure/sitemap.xml\n');
await writeFile('public/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ['/', ...products.map(p => '/products/' + p.slug), '/careers', '/contact'].map(path => `<url><loc>https://factuarial.insure${path}</loc></url>`).join('') + '</urlset>\n');
await rm('public/photo.png', { force: true });
console.log('Built Company, three product pages, Careers, Contact, and 404.');
