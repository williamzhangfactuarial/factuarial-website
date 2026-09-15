# factuarial.insure

Six static pages served by a Cloudflare Worker at factuarial.insure.
The Company page is home. Who we help opens a menu for robotics companies,
brokers, and capacity partners. Careers opens an email draft with the Careers
subject. Contact delivers inquiries to the company inbox.
The homepage links directly to its offerings. Contact guidance follows the
selected audience and preserves entered messages when that selection changes.

Preview locally:

```sh
npm ci
npm run dev
```

Deploy to the Cloudflare account that owns `factuarial.insure`:

```sh
npm run deploy
```

Edit product copy in `src/products.mjs`, page templates in `scripts/build.mjs`,
and presentation in `public/assets/site.css`. Run `npm run build` after copy or
template changes. Generated HTML is committed with its source. `npm test`
checks form validation, delivery handling, routes, assets, and shared branding.

The form uses a restricted Cloudflare Email binding and Turnstile. Configure
`TURNSTILE_SITE_KEY` as a Worker variable and `TURNSTILE_SECRET_KEY` as a Worker
secret. The EMAIL binding must only allow `contact@factuarial.insure` as its
destination. The verified recipient is `contact@factuarial.insure`.
Email Routing is enabled only on `forms.factuarial.insure` for sending from
`website@forms.factuarial.insure`. The apex domain keeps its Google Workspace
mail records. Sending to this verified destination uses Cloudflare's free
[Email Routing service](https://developers.cloudflare.com/email-service/platform/pricing/).

Without the email binding or Turnstile configuration, the form fails closed
and offers the direct email address. It does not report a successful send.
Local development uses local bindings, so it does not deliver real mail.

The Worker redirects production HTTP traffic to HTTPS, validates contact
submissions, and limits attempts to five per IP per minute at each Cloudflare
location. Messages are sent as plain text with the visitor's email as Reply-To.
Message bodies are not logged or stored by the application.

Illustrations and logo were supplied by the owner. Self-hosted Latin Modern
Roman and IBM Plex Mono fonts retain their licenses in `public/assets/fonts`.
