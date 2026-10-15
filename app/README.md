# Cincodevinci — artist site + admin

Next.js app. Public site at `/`, admin panel at `/admin`.

---

## What the artist can do without a developer

Everything on this list is a button in `/admin`. No code, no deploys.

- Change the big cover, title, link
- Turn a countdown on for the next drop
- Pull every release straight from Apple, hide the ones they don't want
- Pull every video straight from YouTube
- Add and remove shows, mark one sold out
- Add merch, set prices, mark sizes sold out
- See the mailing list, download it as a spreadsheet
- Write an email or a text and send it to everyone

Edits go live the second they're saved.

---

## What has to be bought/created once (client side)

| Thing | Why | Cost |
|---|---|---|
| Domain | the address | ~$12/yr |
| Vercel account | hosting | free |
| Postgres — Neon, Supabase or Vercel Postgres | stores everything the admin edits | free tier is plenty |
| Stripe account | taking money for merch | 2.9% + 30¢ per sale, no monthly |
| Resend account | sending the newsletter | free to 3,000/mo |
| Twilio account *(only if they want texts)* | sending texts | ~$1.15/mo number + ~1¢ per text, plus a one-off ~$4.50 brand registration |

The site works with **none** of these except the domain, host and database. Without Stripe the shop shows but can't take money. Without Resend signups are still saved, just nothing gets sent. Same for texts.

---

## Setup

1. Push this folder to a Git repo, import it on Vercel.
2. Add a Postgres database (Vercel → Storage → Postgres, or paste a Neon/Supabase URL).
3. Paste these into Vercel → Settings → Environment Variables:

```
ADMIN_PASSWORD=          whatever password the artist should use
AUTH_SECRET=             run: openssl rand -hex 32
DATABASE_URL=            from the database provider
NEXT_PUBLIC_SITE_URL=    https://thedomain.com
```

4. Deploy. Tables build themselves on the first page load.
5. Point the domain at Vercel.

That's a working site. The rest can be added later, in any order, without touching the code.

### Adding payments
```
STRIPE_SECRET_KEY=       Stripe → Developers → API keys
STRIPE_WEBHOOK_SECRET=   Stripe → Webhooks → add endpoint
```
Webhook endpoint: `https://thedomain.com/api/stripe/webhook`, event `checkout.session.completed`.

### Adding email
```
RESEND_API_KEY=
MAIL_FROM="Cincodevinci <noreply@thedomain.com>"
```
Verify the domain in Resend first or everything lands in spam.

### Adding texts
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=      +1...
```
In Twilio, set the number's incoming-message webhook to `https://thedomain.com/api/sms/inbound`. That's what answers STOP and HELP — it is legally required, don't skip it.

US texting needs A2P 10DLC brand registration before anything sends. Twilio walks through it; allow a few days.

---

## Notes

- **Password.** One password, set in `ADMIN_PASSWORD`. To change it, change the variable and redeploy. There are no user accounts on purpose.
- **Prices** are read from the database at checkout, never from the browser, so they can't be tampered with.
- **Consent** is stored with every signup — the exact wording shown, the time and the IP. That's the record you want if a texting complaint ever lands.
- **Images** uploaded in the admin are stored in the database, so there's no second storage bill.
- **Releases and videos** sync from Apple and YouTube with no API keys and no quota. Anything hidden or hand-edited survives the next sync.
- **If the database goes down** the site stays up on its built-in content rather than erroring.

## Running it locally

```
npm install
cp .env.example .env.local     # set ADMIN_PASSWORD, leave DATABASE_URL blank
npm run dev
```

With `DATABASE_URL` blank it stores everything in `.data/db.json` so you can poke at it without a database.
