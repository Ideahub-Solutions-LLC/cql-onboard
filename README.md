# CQL On-boarding System

A private, persistent client onboarding app for Core Quantum Leads.

## Included
- Four-step client intake: account, business essentials, setup choices, and review. Clients can provide five core business/contact details, choose specialist-led setup, and send a brief without completing every launch detail. Conditional preferences, draft saving, required-field checks, and client-specific applications are included.
- Optional A2P details and uploads, domain/email, phone and calendar preferences, contact uploads, follow-up and AI requests, and pricing acknowledgment. Unfinished setup discovery becomes explicit team follow-up checklist work.
- D1-backed records and private R2 attachments, with authorization on each API operation.
- Existing domain credentials remain in the AES-GCM vault for authorized team access and deletion. The administrator arranges client access with a specialist. VAULT_KEY is a 32-byte base64 runtime secret, kept out of source and form exports.
- Team workspace with application states, internal notes, file downloads, versioned rate snapshots, and a launch checklist.
- Editable logo, brand color, support address, signup options, and usage menu.
- Add, edit, hide, reorder, or delete signup options without rebuilding. Each option has a name, description, badge, button text, and HTTPS destination.
- CSV price imports with a preview and a choice to replace the menu or update matching services. Downloadable PDF, Excel, and CSV price-list documents can be uploaded and replaced separately.

## Operating the app
The platform requires its own email/password sign-in before exposing applications, settings, files, or pricing. The configured administrator is `chito@ideahubsolutionsinc.com`. The supplied password is the initial default. Its salted PBKDF2 verifier is stored in server code; the plaintext password is not included in the repository or browser bundle. Sign-in opens the team dashboard. Sign out revokes the session immediately, and sessions expire after eight hours. Login attempts are limited to 20 per 15-minute window for each account.

In **Brand & settings → Administrator password**, enter the current password and confirm a new password of at least 12 characters. Changing it signs out every administrator session; client sessions stay separate. The new salted verifier is stored in the database and survives redeployments; the original default stops working after a change. There is no permanent default-password bypass.

The app initializes missing database tables on first use without replacing existing data. Authentication uses the settings table for hashed session tokens, password changes, and login limits, so no authentication provider, hosting identity, extra runtime secret, or database migration is needed on an existing database. HTTPS deployments use secure HTTP-only cookies. Existing hosting identities, guest cookies, owner records, and team email allowlists do not grant access. The administrator can create client accounts through **New client**, using the client’s email and a temporary password of at least 12 characters. Copy the login details and share them privately; no invitation or email is sent automatically. The password itself is not stored or included in exports. **Copy client link** copies a single application URL containing the client email and current temporary password. Temporary passwords remain only in the administrator’s current page memory. After a refresh/sign-out, or if another administrator resets the password, reset it again to obtain fresh copyable details. Once a client has changed their password, copied details direct them to use their current password; their previous temporary password is not included. Copied links prefill the sign-in email and current temporary password using `?application=...&email=...&password=...` query parameters. The page immediately removes the email and password parameters from the address bar before checking the session. Previously shared fragment links still work. Share the link privately because it contains temporary login details. Opening the link does not sign in automatically. After changing the password, the client signs in with their new password and resumes the requested application.

Clients use the same sign-in page. On first login, they must replace the temporary password before the API permits access to applications or files. They then see only applications assigned to their login email, resume saved progress, and can use **My applications** or **My password**. Changing an application’s contact email does not change its assigned login or grant access to another client’s information. Client accounts cannot create applications, modify team settings, read internal notes, reveal vault credentials, or access other clients’ records and files.

For an existing application without credentials, open it in the team workspace and use **Client sign-in → Create client login**. Use **Reset client password** to assign a new temporary password if a client loses access. This invalidates only that client’s sessions and requires another password change on login. Adding another application for an existing email reuses the existing login without changing its password. An application link identifies the record but never bypasses sign-in or account authorization. Existing application data is preserved.

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
npm run db:migrate:local
npm run dev
```

Open the local URL printed in the terminal (normally <http://127.0.0.1:5173>). Keep the terminal open while using the app; press `Ctrl+C` to stop the server. To use another port, run Vite directly, for example `node ./node_modules/vite/bin/vite.js --config vite.config.ts --port 5174`.

The preview runs the app with local Cloudflare Worker bindings and the same administrator sign-in as production. It is intended for development, not public access. The D1 database and R2 bucket are local preview resources; local data is kept in `.wrangler/` and should not be treated as production data. The encrypted credential feature also requires a `VAULT_KEY` runtime secret containing 32 bytes encoded as base64. Do not use a production key for local development.

### Useful commands

```sh
npm run build       # Build for the current deployment target
npm start            # Run the Cloudflare build in the local Wrangler preview
npm test             # Run catalog, onboarding, authentication, and client-access API checks
npm run db:generate  # Generate a Cloudflare D1 migration from db/schema.ts
```

Run `npm run build` before `npm start`. `npm run test:api` checks sign-in and API protection against `127.0.0.1:8787` (override with `TEST_BASE_URL`). Provide `ADMIN_TEST_PASSWORD` in your test process to include successful login and logout checks. Use a local test database only. `ALLOW_PASSWORD_CHANGE_TEST=1` additionally exercises password changes and must only be used against a disposable test database; it changes that test database’s administrator password. The client-access tests bundle the real API handler against isolated SQLite and private in-memory files, without using a live site. The older smoke/catalog/features/onboarding API files describe the retired hosting-identity and guest access model and are not part of the current API suite.

## Deploy to Vercel

The Vercel build uses Vinext with Vite and Nitro. The included `vercel.json` selects Vercel's **Other** framework preset and runs `npm ci` followed by `npm run build`. Leave the Vercel output directory unset; Nitro writes the deployment to `.vercel/output`. Do not set `.next` as the output directory. Vercel and Cloudflare both use the platform’s own administrator sign-in.

1. Create a Neon Postgres database and a **private** Vercel Blob store, then connect the Blob store to this Vercel project. Use separate Neon branches/databases for Production, Preview, and local development so test data stays isolated.
2. Set `DATABASE_URL` to the Neon pooled connection string and run `npm run db:migrate` once to create the application tables.
3. Add the following environment variables in Vercel:

   - `DATABASE_URL`: Neon Postgres pooled connection string.
   - `VAULT_KEY`: a private, base64-encoded 32-byte key for encrypted domain credentials. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Keep this value stable; rotating it requires migrating stored credentials.
   - `BLOB_READ_WRITE_TOKEN`: provided when connecting a Blob store that uses token authentication. New Vercel private Blob stores can use Vercel's OIDC integration instead.

4. Deploy and sign in with the configured administrator credentials. Uploaded documents use private Blob storage and continue to be served through the app’s authorization checks.

This setup creates an empty Neon database; it does not copy existing records from Cloudflare D1 or files from R2. Export and migrate those records/files before switching a live workspace to Vercel.

For local Vercel development, link the Vercel project and run `vercel env pull .env.local`, then use `VERCEL=1 npm run dev` (PowerShell: `$env:VERCEL='1'; npm run dev`). Point local development at a separate Neon branch/database and provide a local `VAULT_KEY`. The regular `npm run dev` command remains the Cloudflare/Sites local-identity preview.

## Cloudflare Sites deployment

The app uses Vinext and React on Cloudflare Workers. A hosted deployment needs a Cloudflare D1 database bound as `DB`, a private R2 bucket bound as `BUCKET`, and `VAULT_KEY` as a secret. It must decode from base64 to exactly 32 bytes. The key protects encrypted domain credentials. Keep it private and stable; rotating it requires migrating encrypted credentials. The project’s hosting binding names are recorded in `.openai/hosting.json`.

For source sync and publishing in the managed Sites environment, use its Sites workflow. `npm run dev` is the portable local preview; `npm start` serves the locally built output through Wrangler.

Password strength is shown when assigning temporary passwords and choosing a new account password. Only Medium and Strong passwords are accepted by the server. Use at least 12 characters with three character types (uppercase, lowercase, numbers, symbols), or four different words totaling at least 20 characters. Common and repeated passwords are rejected. **Generate Password** creates a random 20-character Strong temporary password for new clients and password resets. Existing passwords can still be used to sign in.

Administrators can use **Delete** on a client application row and confirm the named client in the pop-up. This permanently removes that application, its documents, internal notes, pricing snapshot, and saved vault data. Other applications remain. The client sign-in account is removed only if no applications remain for that login; existing sessions then lose access. If cleanup fails, the row remains as **Deletion pending** and **Retry delete** finishes the operation. Pending applications block reads and edits. Database cleanup is transactional on both D1 and Postgres.
