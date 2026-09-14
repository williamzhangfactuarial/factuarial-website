# factuarial.insure

A black page with "Hello world". Edit `public/index.html` to change it.

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
