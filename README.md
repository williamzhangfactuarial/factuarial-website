# factuarial.insure

A photo centered on a black page. Edit `public/index.html` or replace
`public/photo.png` to change it.

Preview locally:

```sh
npx wrangler dev
```

Deploy to the Cloudflare account that owns `factuarial.insure`:

```sh
npx wrangler login
npx wrangler deploy
```

Cloudflare serves the static HTML. `worker.mjs` redirects HTTP visits to HTTPS.
No framework or build step is needed.
