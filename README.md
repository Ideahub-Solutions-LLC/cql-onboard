# CQL On-boarding System

A private, persistent client onboarding app for Core Quantum Leads.

## Included
- Four-step client intake: account, business essentials, setup choices, and review. Clients can provide five core business/contact details, choose specialist-led setup, and send a brief without completing every launch detail. Conditional preferences, draft saving, required-field checks, and client-specific applications are included.
- Optional A2P details and uploads, domain/email, phone and calendar preferences, contact uploads, follow-up and AI requests, and pricing acknowledgment. Unfinished setup discovery becomes explicit team follow-up checklist work.
- D1-backed records and private R2 attachments, with authorization on each API operation.
- Existing domain credentials remain in the AES-GCM vault for authorized team access and deletion. New clients arrange access with their specialist after intake. VAULT_KEY is a 32-byte base64 runtime secret, kept out of source and form exports.
- Team workspace with application states, internal notes, file downloads, versioned rate snapshots, and a launch checklist.
- Editable logo, brand color, support address, staff allowlist, signup options, and usage menu.
- Add, edit, hide, reorder, or delete signup options without rebuilding. Each option has a name, description, badge, button text, and HTTPS destination.
- CSV price imports with a preview and a choice to replace the menu or update matching services. Downloadable PDF, Excel, and CSV price-list documents can be uploaded and replaced separately.

## Operating the app
The Site starts owner-private. Its first signed-in visitor becomes its application owner. Open it as the Site owner before granting anyone access. The owner may add team emails in Brand & settings; those accounts also need Site access. Create each client application with the exact email they use to sign in, grant that client Site viewer access, and copy their application link. No invitation or other email is sent by this app.

The client screen uses a focused form and a single step navigator in the side menu. The menu is visible by default and can be shown or hidden with the header button; this display preference is remembered on the device. Completed steps show checkmarks and upcoming steps remain disabled until the current step is complete.

The client sequence is: 1. Your account; 2. Your business; 3. Your setup; 4. Review & send. Clients open signup in a modal popup and declare completion; existing-account holders continue directly. The shortest path asks for business name, services/offer, contact name, email, and phone. Client identities can prefill their own contact name/email. “Help me choose” defers technical choices to the setup specialist. “Choose my services” reveals only relevant preferences; clients can optionally supply business verification or calendar details now. Signature and the three final acknowledgments remain required.


Deferred details appear in the review and become team “Follow up” checklist items. A submitted brief is not a launch-ready application or verified account. The team must resolve required setup work before marking the account launched. Existing answers are preserved; old eight-step draft progress is translated to the shorter flow when opened and saved. Past submitted snapshots stay intact.

Signup completion is a client declaration, never payment verification. Closing the popup alone does not confirm signup. A separate signup window is available if embedding fails.

Draft answers are saved using Save draft or Save & continue. Optional files upload immediately. Domain access and credential handoff are deferred to the setup specialist; the short intake does not ask for passwords. Clients can edit drafts and applications marked Changes requested; the team manages the remainder.

In Team settings → Accounts & access options, edit Signup options and click Save settings. Choose Add account option, enter any account name, paste the signup link, and add a description and features (one per line). Turn on Show to clients, then Save settings. This supports standard, free, and special-access accounts without fixed public labels or placeholders. Only published account options appear in Step 1. The supplied Enterprise example is not presented as a free-access offer.

For prices, download the CSV template, edit it in Excel or Google Sheets, and export it as CSV. Its basic columns are service, description, rate, unit, category. Tiered exports also include startup_rate, business_rate, scale_rate, section, billing, and details. Import the exported CSV to preserve all tier rates and billing details. Category is Usage, Setup, or AI; leave rate blank for To be confirmed. Import, review, choose replace or update, apply to draft, then Save settings. You can also edit rows directly and export the current menu. PDF/Excel document uploads provide a download for clients; they do not populate the individual rates automatically. Uploading and applying drafts do not change client-visible prices until settings are saved.

The supplied CQL customer schedule includes 35 services. Only customer rates are included; supplier costs, markup columns, and the original internal PDF are not distributed to clients. Scale is separate from Enterprise. Domains have an inconsistent unit in the supplied schedule; the AI subscription rows lack final customer prices. These and other unspecified rates remain Confirm with CQL. Voice AI is labeled engine-only; external model usage is not presented as free.

Clients can browse Pricing & features, select a tier for comparison, and request features such as WhatsApp activation and call recording. Requests are saved to their application and become separate team activation checklist items. Selecting a feature or previewing a different tier never activates billing or changes the subscription.

Submitted prices and signup choices are a snapshot. Past submissions retain the acknowledged rates and price-list file, even after updates. Blank rates explicitly require a quote. Signup links open the destinations configured by the team. This app does not process card payments, provision GHL sub-accounts, register A2P campaigns, publish client websites, import contacts into GHL, or activate automations. Those are explicit team checklist tasks. AI receptionist selections are setup instructions, not an active AI calling service.

## Run locally

### Prerequisites

- Node.js 22.13 or newer (the version in `package.json` is the minimum).
- npm, included with Node.js.

### Install and start

From the project directory, install the locked dependencies and start the development preview:

```sh
npm ci
npm run dev
```

Open the local URL printed in the terminal (normally <http://127.0.0.1:5173>). Keep the terminal open while using the app; press `Ctrl+C` to stop the server. To use another port, run Vite directly, for example `node ./node_modules/vite/bin/vite.js --config vite.config.ts --port 5174`.

The preview runs the app with local Cloudflare Worker bindings and a local mock identity (`seedy@sites.test`). It is intended for development, not public access. The D1 database and R2 bucket are local preview resources; local data is kept in `.wrangler/` and should not be treated as production data. The encrypted credential feature also requires a `VAULT_KEY` runtime secret containing 32 bytes encoded as base64. Do not use a production key for local development.

### Useful commands

```sh
npm run build       # Build for the current deployment target
npm start            # Run the Cloudflare build in the local Wrangler preview
npm test             # Run catalog, pricing, and onboarding unit checks
npm run db:generate  # Generate a Cloudflare D1 migration from db/schema.ts
```

Run `npm run build` before `npm start`. `npm run test:api` runs API integration checks against `127.0.0.1:8787` and an isolated synthetic local database; never point those tests at production.

## Deploy to Vercel

The Vercel build uses Vinext with Vite and Nitro. The included `vercel.json` selects Vercel's **Other** framework preset and runs `npm ci` followed by `npm run build`. Leave the Vercel output directory unset; Nitro writes the deployment to `.vercel/output`. Do not set `.next` as the output directory.

1. Create a Neon Postgres database and a **private** Vercel Blob store, then connect the Blob store to this Vercel project. Use separate Neon branches/databases for Production, Preview, and local development so test data stays isolated.
2. Set `DATABASE_URL` to the Neon pooled connection string and run `npm run db:migrate` once to create the application tables.
3. Create a Google OAuth web client. Add `https://your-production-domain/callback` as an authorized redirect URI. For Preview deployments, add their callback URLs too or use a separate OAuth client for previews.
4. Add the following environment variables in Vercel:

   - `DATABASE_URL`: Neon Postgres pooled connection string.
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: credentials for the Google OAuth web client.
   - `AUTH_SECRET`: a private signing key of at least 32 characters. Generate one with `openssl rand -base64 32`.
   - `CQL_OWNER_EMAIL`: the Google account email that is allowed to initialize the workspace and become its owner.
   - `VAULT_KEY`: a separate, private, base64-encoded 32-byte key for encrypted credentials. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Keep this value stable; rotating it requires migrating stored credentials.
   - `APP_BASE_URL` (recommended): the public origin for that Vercel environment, for example `https://onboarding.example.com` in Production. Preview deployments need a matching callback URL and origin.
   - `BLOB_READ_WRITE_TOKEN`: provided when connecting a Blob store that uses token authentication. New Vercel private Blob stores can use Vercel's OIDC integration instead.

5. Deploy. Sign in with the account matching `CQL_OWNER_EMAIL` first to initialize the owner record. Google sign-in uses a signed, HTTP-only session cookie; uploaded documents use private Blob storage and continue to be served through the app's authorization checks.

This setup creates an empty Neon database; it does not copy existing records from Cloudflare D1 or files from R2. Export and migrate those records/files before switching a live workspace to Vercel.

For local Vercel development, link the Vercel project and run `vercel env pull .env.local`, then use `VERCEL=1 npm run dev` (PowerShell: `$env:VERCEL='1'; npm run dev`). Set `APP_BASE_URL=http://localhost:5173` locally and add `http://localhost:5173/callback` to the Google OAuth client's authorized redirect URIs. Point local development at a separate Neon branch/database. The regular `npm run dev` command remains the Cloudflare/Sites mock-auth preview.

## Cloudflare Sites deployment

The app uses Vinext and React on Cloudflare Workers. A hosted deployment needs a Cloudflare D1 database bound as `DB`, a private R2 bucket bound as `BUCKET`, and Sites-hosted authentication. Set `VAULT_KEY` as a secret in the hosting environment; it must decode from base64 to exactly 32 bytes for AES-GCM credential encryption. Keep this key private and do not rotate it without migrating existing encrypted credentials. The project’s hosting binding names are recorded in `.openai/hosting.json`.

For source sync and publishing in the managed Sites environment, use its Sites workflow. `npm run dev` is the portable local preview; `npm start` serves the locally built output through Wrangler.
