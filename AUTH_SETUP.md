# Account security setup

The authentication features use Resend for email delivery and Google OAuth for Google sign-in. Add these variables to Railway's service Variables (and to a local `.env` file for local development):

```env
APP_URL=https://YOUR-RAILWAY-DOMAIN
EMAIL_FROM=BZU AI <auth@YOUR-VERIFIED-DOMAIN>
RESEND_API_KEY=re_your_resend_api_key
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_CALLBACK_URL=https://YOUR-RAILWAY-DOMAIN/api/auth/google/callback
SESSION_SECRET=replace-with-a-long-random-secret
```

`APP_URL` must be the public HTTPS address of this app, without a trailing slash. `EMAIL_FROM` must use a sender domain verified in Resend. Keep all values private and do not commit `.env`.

## Resend

1. Create a Resend account and add/verify a domain you control.
2. Create an API key with permission to send email.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in Railway.

Verification emails expire after 24 hours. Password-reset emails expire after one hour. Links can only be used once. Existing accounts are marked verified by the migration.

## Google sign-in

1. In Google Cloud Console, configure the OAuth consent screen and create an OAuth client of type **Web application**.
2. Add the app's origin (the `APP_URL` value) under **Authorized JavaScript origins**.
3. Add the exact `GOOGLE_CALLBACK_URL` above under **Authorized redirect URIs**.
4. Add the resulting client ID and secret as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway.

After setting the variables, redeploy the Railway service. The database migration is applied by the existing `npm start` command (`prisma migrate deploy`).
