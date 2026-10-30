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

## Runtime
Vinext / React on Cloudflare Workers; D1 binding DB; R2 binding BUCKET. Hosted authentication is provided by Sites. Runtime secret: VAULT_KEY. Never rotate this key without a data migration for stored credentials.

## Development
Use the Sites skill helpers for install, build, source sync, and publishing. npm run dev serves the portable preview. npm run db:generate produces schema migrations. The production preview uses npm start.

npm test runs catalog, pricing, and short-intake unit checks, including legacy draft migration and conditional requirements. tests/catalog.mjs and tests/pricing.mjs check CSV parsing, catalog validation, exact customer rates, tier separation, and billing distinctions. tests/features-api.mjs checks request persistence, rate snapshots, and activation checklist prerequisites. npm run test:api runs all four API suites, including the essentials-only flow and launch follow-up prerequisites. Run it only against an isolated synthetic local database. tests/smoke.mjs, tests/catalog-api.mjs, tests/features-api.mjs, and tests/onboarding-api.mjs target only 127.0.0.1:8787 with synthetic records and identities. They expect the local database owner local_seedy and a synthetic VAULT_KEY in the local preview. Checks cover access control, CSRF, client isolation, files, encrypted credentials, sequential steps, settings conflicts, price-list access, version snapshots, submission locking, and launch prerequisites. Do not point them at production.
