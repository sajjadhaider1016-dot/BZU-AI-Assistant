# Image generation setup

BZU AI uses Cloudflare Workers AI with the FLUX.1 schnell model for image creation and FLUX.2 klein 4B for image edits.

## Configure production

1. In Cloudflare, enable Workers AI on the Free Workers plan.
2. Copy the Account ID from the Cloudflare dashboard.
3. Create an API token scoped to this account with Workers AI read permission.
4. In Vercel, open the BZU AI project’s **Settings → Environment Variables** and add these for **Production**:
   - `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare Account ID.
   - `CLOUDFLARE_API_TOKEN` — the API token. Keep it private; do not commit it or send it in chat.
5. Redeploy the latest production deployment.

The Cloudflare Free Workers plan includes a daily AI allocation. Leave the account on the Free plan to avoid paid overages. Generation pauses when the daily allocation is exhausted and becomes available again after Cloudflare’s daily reset.
