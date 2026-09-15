# factuarial.insure

Five static pages served by a Cloudflare Worker at factuarial.insure.
The Company page is home. Products opens a menu for robotics companies,
brokers, and capacity partners. Contact delivers enquiries to the company inbox.

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
destination. Verify that recipient with Cloudflare and onboard
`forms.factuarial.insure` for sending from `website@forms.factuarial.insure`.
Preserve the apex domain's Google Workspace mail records.

Without the email binding or Turnstile configuration, the form fails closed
and offers the direct email address. It does not report a successful send.
Local development uses local bindings, so it does not deliver real mail.

The Worker redirects production HTTP traffic to HTTPS, validates contact
submissions, and limits attempts to five per IP per minute at each Cloudflare
location. Messages are sent as plain text with the visitor's email as Reply-To.
Message bodies are not logged or stored by the application.

Illustrations and logo were supplied by the owner. Self-hosted Latin Modern
Roman and IBM Plex Mono fonts retain their licenses in `public/assets/fonts`.
