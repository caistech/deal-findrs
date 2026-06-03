# Design Plan — DealFindrs Teardown Rebuild (v2)

## Survey failures I am fixing

Each failing item from `_teardown_brief.md` with the CONCRETE change (file + copy) that makes it
evidenced. Every item has a fix. None are dismissed.

---

### Failure 1 — Prospect type: Conflicting audiences (`icp_partner_type` NOT EVIDENCED)

**Survey finding (ground truth):** DOM hero says "For buyers' agents and property firms" (page.tsx:68)
but meta says "for property developers" — no single coherent archetype.

**Root cause:** The hero subhead conflates the DISTRIBUTOR (buyers' agent firm — the prospect who
buys and deploys) with the END USER (property developer — the firm's client who uses the product).
The spec sets `icp_partner_type = "reseller"` — the coherent prospect is the buyers' agent / agency
owner who RESELLS. The hero must speak to this one archetype consistently.

**Fix — `src/app/page.tsx`:**
- Hero badge/subhead is rewritten to address a SINGLE prospect: the buyers' agent firm / agency owner
  who resells DealFindrs to their developer clients.
- Meta description in `layout.tsx` is updated to match: "for buyers' agents and property firms who
  deploy branded deal assessment to their property developer clients."
- No copy says both "buyers' agents" AND "property developers" as co-equal prospects.
- The distributor ICP section names the prospect type: `data-icp-partner-type="reseller"`.

**Also fix `src/app/partners/page.tsx`:**
- Partner hero explicitly names the prospect: "Buyers' agent firm, property development advisory,
  or real estate agency — operating businesses that serve a developer client roster."
- `icp_partner_type = reseller` is named in a structured ICP summary block.

---

### Failure 2 — ICP buyer title: NOT EVIDENCED

**Survey finding (ground truth):** No buyer title in DOM. Spec says `icp_buyer_title = "Agency Owner"`.

**Root cause:** The ICP section shows "Principal / Director" as a sub-label (line 176 page.tsx) but
this is not surfaced as the ICP BUYER TITLE — it's buried in a card sub-label. The survey checks for
a named buyer title attribute.

**Fix — `src/app/page.tsx`:**
- The distributor ICP grid card for "Partner type" is updated to show "Agency Owner / Principal" as
  the value (matching spec `icp_buyer_title = "Agency Owner"`).
- A `data-icp-buyer-title` attribute is added to the card element.

**Fix — `src/app/partners/page.tsx`:**
- The partner ICP summary block adds "Buyer Title: Agency Owner / Principal" as an explicit field.
- This is in a labelled, structurally prominent section the survey can cite.

---

### Failure 3 — ICP stage: NOT EVIDENCED

**Survey finding (ground truth):** No ICP stage in DOM. Spec says `icp_stage = "Operating businesses"`.

**Root cause:** The distributor ICP section shows "Stage: Past the first deal / Actively building a
client deal pipeline" (page.tsx line 185-190) but this describes the distributor's DEAL PIPELINE
stage, not the BUSINESS STAGE (operating vs startup). The survey checks for the ICP stage value.

**Fix — `src/app/page.tsx`:**
- The ICP card for "Stage" is updated to say "Operating businesses — active firms with an existing
  developer client roster, not pre-revenue startups."
- `data-icp-stage` attribute added to the card.

**Fix — `src/app/partners/page.tsx`:**
- The partner ICP block adds "Stage: Operating businesses — firms already serving developer clients,
  not agencies starting from zero."

---

### Failure 4 — Exclusions: NOT EVIDENCED

**Survey finding (ground truth):** No exclusions in DOM. Spec says
`exclusions = "Solo affiliates with no client base; generic software resellers with no property vertical"`.

**Root cause:** The current exclusions text (page.tsx lines 237-243) says "Solo residential buyers,
institutional fund managers running 200+ deals..." — these are END USER exclusions, not DISTRIBUTOR
exclusions. The survey checks for the spec's distributor-level exclusions.

**Fix — `src/app/page.tsx`:**
- The exclusions block is updated to match the spec's distributor exclusions:
  "Not for: Solo affiliates with no client base; generic software resellers with no property-sector
  vertical. This is a channel partner programme for established buyers' agent firms and property
  advisories that actively serve developer clients."
- A `data-exclusions` attribute is added to the block.

**Fix — `src/app/partners/page.tsx`:**
- The "Not right for everyone" section is updated to match spec exclusions exactly:
  "Not a fit: solo affiliates with no developer client base; generic software resellers without a
  property-sector practice. DealFindrs is a specialist tool — the partner programme is only open to
  buyers' agent firms and property advisories with an active developer client roster."

---

### Hard Rule Compliance: DISTRIBUTION LOOP REQUIRED

**Survey/GTM requirement:** Every build must include a distribution loop — a share or referral surface
that turns a product OUTPUT into an acquisition path.

**Current state:** No shareable output surface. Finance Pack generation exists but no public sharing.
The team/invite system exists inside the app but does not expose outputs publicly.

**Fix — add a shareable Finance Pack preview surface:**
- `src/app/share/[token]/page.tsx` — a public (no-auth) "shared assessment summary" page. When a
  user generates a Finance Pack, they can share a link. The link shows a branded summary with
  "Powered by DealFindrs — try it for your deals" CTA linking back to the landing page / partner
  signup. This is the distribution loop: the Finance Pack output becomes an acquisition surface.
- `src/app/api/share/route.ts` — POST endpoint to create a share token (stored in `share_tokens`
  table); GET endpoint to retrieve a shared summary by token.
- `supabase/migrations/008_share_tokens.sql` — `share_tokens` table (idempotent, RLS: public read
  on non-expired tokens, owner write).
- The share button is added to the opportunity detail page (`src/app/opportunities/[id]/page.tsx`)
  — produces a short link the user can send to a lender, broker, or partner.
- Attribution: the shared page shows the finance firm's brand (white-label partner name) + a
  "Assessed with DealFindrs — try it for your deals" footer CTA, so every Finance Pack shared
  creates a potential new signup path.

---

## Standards I must satisfy

| Rule ID | Rule statement | How this build meets it |
|---------|---------------|------------------------|
| **HARD: FIX SURVEY FAILURES** | Every teardown-brief failing item must be made to pass | All 4 failing fields (prospect type, ICP buyer title, ICP stage, exclusions) have DOM-level fixes in `page.tsx` + `partners/page.tsx`. Evidence is citable. |
| **HARD: NO FAKE SUBMISSIONS** | Forms POST to real endpoints; no setTimeout fake-success | Partner enquiry form → `/api/partners/contact` (real DB insert). Share token → `/api/share` (real DB). No setTimeout anywhere. |
| **HARD: VENDOR IDENTITY VIA ENV** | No email/phone/company hardcoded in source | `CorporateFooter` reads from `NEXT_PUBLIC_VENDOR_*`. No new hardcoded vendor strings. |
| **HARD: SUPABASE NEW-TABLE TYPING** | Insert on new tables cast payload as `never` | `share_tokens` insert uses `.insert({...} as never)`. |
| **HARD: DISTINCT DISTRIBUTOR SURFACE** | Separate partner/reseller surface with channel economics | `/partners` page exists and is structurally distinct from end-user sections; sells white-label, seat revenue, client branding. |
| **HARD: LUCIDE ICONS** | Only import icons from installed version (0.303.0) | All icons are long-stable: `ArrowRight`, `CheckCircle`, `Users`, `Building2`, `TrendingUp`, `Share2`, `Link2`, `Copy`, etc. No niche new icons. |
| **HARD: DISTRIBUTION LOOP** | Share/referral surface turns output into acquisition path | `src/app/share/[token]/page.tsx` — shareable Finance Pack summary with "try DealFindrs" CTA + partner attribution. Real route, real DB token. |
| **HARD: LIVE-STATE ROUTES** | Live DB reads need cache-busting exports | `/api/share/route.ts` has `export const dynamic = 'force-dynamic'` etc. |
| **R3 / §5** — Explanatory header | Every page answers what/do/matters | Share page has explanatory context. Partners page has a clear explanatory section. |
| **R9** — RLS on every table | New tables have RLS | `share_tokens` migration: RLS enabled, public SELECT on non-expired tokens, authenticated INSERT/DELETE by owner. |
| **R10** — No verbatim Postgres errors | API routes sanitise errors | All new API routes log real error server-side, return generic message to client. |
| **R11** — No hardcoded vendor identity | NEXT_PUBLIC_VENDOR_* | No new vendor strings hardcoded. |
| **R12** — Public API deny-by-default | Share token read is intentionally public with justification comment | `/api/share?token=...` GET has a `PUBLIC_ROUTES` justification comment. |
| **R14** — Sample artefact before signup | At least one sample reachable from landing | `/reports` page is the sample artefact. Landing links to it. |
| **PRE-HARD P2** — Named distributor archetype | DOM-citable | "Agency Owner / Principal — buyers' agent firm or property advisory" named in both `page.tsx` and `partners/page.tsx`. |
| **PRE-HARD P3** — Distributor Q1-Q4 answered | DOM-citable | Q1 (who is distributor): agency owner / principal of a buyers' agent firm. Q2 (outcomes): white-label, seat revenue, Finance Packs under partner brand. Q3 (why now): Finance Pack by hand takes hours → DealFindrs makes it 10 minutes. Q4 (economics): reseller margin on every client seat. |

---

## File change summary

| File | Change type | Summary |
|------|-------------|---------|
| `src/app/page.tsx` | Edit | Fix prospect type (hero), ICP buyer title card, ICP stage card, exclusions block. All changes add explicit DOM evidence for the 4 failing survey fields. |
| `src/app/partners/page.tsx` | Edit | Add Agency Owner buyer title, Operating businesses stage, updated exclusions to match spec. Add ICP summary block with `data-` attributes. |
| `src/app/opportunities/[id]/page.tsx` | Edit | Add "Share Assessment" button that calls `/api/share` and shows a shareable link. |
| `src/app/share/[token]/page.tsx` | New | Public shareable Finance Pack summary page with "try DealFindrs" CTA. Distribution loop node. |
| `src/app/api/share/route.ts` | New | POST: create share token. GET: retrieve shared summary. Live-state cache-busting exports. |
| `supabase/migrations/008_share_tokens.sql` | New | `share_tokens` table: idempotent, RLS, public read on active tokens. |
| `design-plan.md` | Edit | This file (updated from prior session's draft). |
| `decisions.json` | New | Forks logged during build. |
