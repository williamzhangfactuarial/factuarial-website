import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { products, teamExperience } from '../src/products.mjs';

test('all published pages have the shared identity, footer and valid local assets and links', async () => {
  const paths = ['index.html', 'careers.html', 'contact.html', '404.html', ...products.map(p => `products/${p.slug}.html`)];
  for (const path of paths) {
    const html = await readFile(`public/${path}`, 'utf8');
    assert.match(html, /<span>factuarial\.<\/span>/);
    assert.match(html, /class="footer-brand" href="\/">factuarial\.<\/a>/);
    assert.match(html, /©2026 Factuarial Inc\. All rights reserved\./);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.doesNotMatch(html, /photo\.png|Hello world|team@factuarial|\[TBD\]|enquir/i);
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)) {
      const file = url === '/' ? 'public/index.html' : `public${url}${url.includes('.') ? '' : '.html'}`;
      await access(file);
    }
    assert.match(html, /<button[^>]+aria-controls="products-options"/);
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
    assert.match(nav, />Who we help</);
    assert.doesNotMatch(nav, />Products<|↗/);
    assert.ok(nav.indexOf('>Who we help<') < nav.indexOf('>Careers<'));
    assert.ok(nav.indexOf('>Careers<') < nav.indexOf('>Contact<'));
  }
});
test('homepage actions reach offerings and credentials remain on Capacity Partners', async () => {
  const home = await readFile('public/index.html', 'utf8');
  assert.match(home, /class="button-link" href="\/#offerings"[^>]*>Explore our offerings/);
  assert.match(home, /class="hero-actions">[\s\S]*?href="\/contact#page-title"[^>]*>Get in touch/);
  assert.match(home, /class="company-contact">[\s\S]*?href="\/contact#page-title"[^>]*>Get in touch/);
  const contact = await readFile('public/contact.html', 'utf8');
  assert.match(contact, /<h1 id="page-title" tabindex="-1">Let’s talk\.<\/h1>/);
  assert.match(home, /id="offerings" tabindex="-1" aria-label="Our offerings"/);
  assert.doesNotMatch(home, /company-experience|Our experience/);
  assert.ok(home.indexOf('id="offerings"') < home.indexOf('class="company-contact"'));
  const capacity = await readFile('public/products/capacity-partners.html', 'utf8');
  assert.ok(capacity.replace(/<\/?strong>/g, '').includes(teamExperience.text));
  for (const name of teamExperience.emphasis) assert.ok(capacity.includes(`<strong>${name}</strong>`));
});
test('engineering examples preserve the scope and qualification without repeating the inline list', async () => {
  const html = await readFile('public/products/robotics.html', 'utf8');
  assert.match(html, /Examples of engineering support/);
  for (const example of products[0].engineeringExamples) assert.ok(html.includes(`<li>${example}</li>`));
  assert.doesNotMatch(html, /That can include software update checks/);
  assert.ok(html.includes(products[0].paragraphs[1]));
  assert.ok(html.includes(products[0].qualification));
});
test('Careers opens an email draft with only recipient and subject prefilled', async () => {
  const html = await readFile('public/careers.html', 'utf8');
  assert.match(html, /href="mailto:contact@factuarial\.insure\?subject=Careers"/);
  assert.match(html, /href="\/careers" aria-current="page"/);
  assert.match(html, /We’d like to hear from people with backgrounds in robotics, software, research, or insurance\./);
  assert.match(html, /Tell us about yourself, something you’ve worked on, and what you’d like to work on next\./);
  assert.doesNotMatch(html, /<form|class="illustration"|[?&]body=/);
  assert.match(await readFile('public/sitemap.xml', 'utf8'), /https:\/\/factuarial\.insure\/careers/);
});
test('offering links and product contact links target their respective audiences', async () => {
  const home = await readFile('public/index.html', 'utf8');
  for (const p of products) {
    assert.ok(home.includes(`href="/products/${p.slug}"`));
    const html = await readFile(`public/products/${p.slug}.html`, 'utf8');
    assert.ok(html.includes(`href="/contact?audience=${p.audience}#page-title"`));
    assert.equal((html.match(/<th scope="row">/g) || []).length, 5);
  }
});
