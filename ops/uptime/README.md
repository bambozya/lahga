# Uptime monitor

A Cloudflare Worker that looks at lahga.fyi every five minutes from outside the
netcup server and emails info@lahga.fyi once when the site stops answering, and
once when it is back. Free tier, no new account: it runs in the Cloudflare
account that already holds the domain.

Why not the GitHub Actions cron in `.github/workflows/uptime.yml`? GitHub runs
it only a few times a day in practice, so an outage could go unnoticed for
hours. That workflow can be deleted once this is live.

## Deploy (once)

Run these from this folder. `npx` downloads wrangler, Cloudflare's command-line
tool, the first time.

```sh
cd ops/uptime
npx wrangler login                        # opens the browser, log in to Cloudflare
npx wrangler kv namespace create STATE    # prints an id: paste it into wrangler.toml
npx wrangler secret put BREVO_API_KEY     # paste the Brevo key (same as in Coolify)
npx wrangler deploy
```

`deploy` prints the worker's URL. Opening it shows the last check as JSON.

## Test it

Trigger a check by hand instead of waiting for the timer:

```sh
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled"
```

To see a real alert, stop the app container in Coolify for ten minutes and
start it again. Two emails should arrive: one saying the site is down, one
saying it is back. The first run after a deploy records the state silently and
does not email.

## Change something

Edit `wrangler.toml` (interval, targets, recipient) or `worker.js`, then
`npx wrangler deploy` again.
