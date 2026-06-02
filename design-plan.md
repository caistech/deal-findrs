# Design Plan — DealFindrs Teardown Rebuild

## Survey failures I am fixing

Each item below is copied from `_teardown_brief.md` with a concrete, file-level fix.

---

### Failure 1 — Prospect type: Conflicting audiences (UNEVIDENCED)

**Survey finding:** Hero says "buyers' agents & property firms" (line 67), body says "development
promoter or investment analyst" (line 232). No single coherent archetype.

**Root cause (pre-existing):** The current copy conflates two roles. "Buyers' agents & property
firms" in the hero is used as if they are the end users — but in the distributor model they are the
CHANNEL that deploys DealFindrs to its clients (the actual promoters/developers). The survey (correctly)
sees this as contradictory because neither section explains the reseller relationship.

**Fix — ONE coherent archetype per layer:**
- **Distributor (reseller):** Buyers' agent firms, property development firms, and real estate
  agencies who WHITE-LABEL or bundle DealFindrs as a deal-assessment service for their clients.
  `icp_partner_type = reseller`. Named archetype on the page: "Buyers' agent firm or property
  development firm that signs up on behalf of its client roster."
- **End user:** The property developer, development promoter, or investment analyst who is the
  DISTRIBUTOR'S CLIENT — they receive the branded assessment tool and use it to evaluate deals.
- The hero subhead is rewritten to reflect the distributor (channel) framing: not "for buyers'
  agents & property firms" as if they are the users, but as the channel that deploys it.
- Specific file changes:
  - `src/app/page.tsx` line 67: rewrite subhead to "For buyers' agents and property firms: a
    branded deal-assessment tool you deploy to your clients."
  - The body-copy `#for-firms` section is rewritten to explicitly say the firm's CLIENTS (property
    developers/promoters) are the end users, not the firm itself.
  - A new `/partners` page is created as the standalone distributor surface (see Failure 2).

---

### Failure 2 — Distributor: no distributor model evidenced (UNEVIDENCED, PRE-HARD P2)

**Survey finding:** "No distributor model evidenced. Site addresses firms as licensees and promoters
as end users but no separate distributor archetype. The 'For firms' section markets to the firm as
licensee, not as a distributor selling to others."

**Root cause:** The current "For firms" section shows the firm using the tool for its own team's
benefit — this is an INTERNAL LICENSEE model, not a DISTRIBUTOR/RESELLER model. The distributor
model requires the firm to deploy the tool to its own CLIENTS (property developers/promoters who
come to the buyers' agent for advice).

**Fix:**
1. **Rewrite `#for-firms` section in `src/app/page.tsx`** — change from "firm deploys to its team"
   framing to "firm deploys to its CLIENT ROSTER (the property developers and promoters who engage
   the buyers' agent for advisory services)." The firm is the CHANNEL PARTNER/RESELLER. Its clients
   are the end users.
2. **Create `src/app/partners/page.tsx`** — a DEDICATED partner/reseller surface that sells the
   channel economics: white-label branding, branded workspaces per client, revenue from adding
   DealFindrs to client engagements, referral/reseller program. Kept visually and structurally
   distinct from the end-user/customer sections.
3. **Add "For Partners" to the main nav** in `src/app/page.tsx` linking to `/partners`.
4. **Name the distributor archetype in the DOM** so the survey can cite it: "Buyers' agent firm,
   property development advisory, or real estate agency that serves property developer clients."

---

### Failure 3 — Distributor outcomes: NOT EVIDENCED (PRE-HARD P3)

**Survey finding:** "Outcomes listed (lines 193-196) are for the firm licensing the tool for its
own team, not for a distributor selling to end users."

**Root cause:** The current outcomes are all about the firm's internal team — "deal flow assessed
consistently," "Finance Packs delivered under the firm's brand." These are operational benefits to
the firm's staff, not commercial benefits to the firm as a channel partner selling to its clients.

**Fix:** Rewrite the distributor outcomes in `src/app/page.tsx` #for-firms section AND on the new
`/partners` page to reflect channel-partner economics:
- "Add a deal-assessment service to every client engagement — without building it yourself."
- "Your clients get branded, lender-ready Finance Packs. You get the credit."
- "Recurring revenue from client seats included in your advisory retainer."
- "A white-label workspace per client — your brand, your criteria, your relationship protected."
- These are outcomes for the FIRM AS RESELLER, not as internal user.

---

### PRE-HARD P2 — No named distributor archetype

**Fix:** Same as Failure 2. After the rebuild, the `/partners` page and the rewritten `#for-firms`
section both name the distributor archetype: "Buyers' agent firm, property development advisory,
or real estate agency that serves property developer clients — the channel that deploys DealFindrs
to its client roster." This is in the DOM and citable by the survey.

---

### PRE-HARD P3 — Q1 (distributor) not answered; Q2-Q4 hand-wavy

**Fix:** The rewritten copy and `/partners` page explicitly answer:
- Q1: The distributor is the buyers' agent / property advisory firm. They resell DealFindrs as
  part of their client service (bundled in advisory retainers, or as a standalone branded tool
  per client project).
- Q2-Q4: The "why-this-problem-why-now" for the distributor is explicit: their clients (property
  developers) need consistent deal assessment; the buyers' agent wants to offer that as a service
  without building it. The firm grows its business by adding a scalable, branded product layer
  to its existing advisory relationships.

---

## Concrete file changes

| File | Change |
|------|--------|
| `src/app/page.tsx` | (1) Rewrite hero subhead — distributor framing. (2) Rewrite `#for-firms` — firm as reseller/channel deploying to its clients, not firm using internally. (3) Rewrite distributor outcomes — channel economics (add service to clients, recurring seat revenue, white-label per client). (4) Add "For Partners" nav item → `/partners`. |
| `src/app/partners/page.tsx` | NEW — dedicated distributor/reseller surface: who the distributor is, the channel model, distributor outcomes (revenue share, white-label, client branding), partner inquiry form posting to `/api/partners/contact`. |
| `src/app/api/partners/contact/route.ts` | NEW — real server endpoint for partner inquiry form. Stores to `partner_inquiries` table. No fake success. |
| `supabase/migrations/YYYYMMDD_partner_inquiries.sql` | NEW — `partner_inquiries` table (idempotent). |
| `decisions.json` | NEW — forks encountered during build logged here. |

---

## Standards I must satisfy

| Rule ID | Rule | How this build meets it |
|---------|------|------------------------|
| **HARD rule: DISTINCT DISTRIBUTOR SURFACE** | Distributor must have a SEPARATE partner/reseller surface selling channel economics — visually and structurally distinct from end-user sections. | `/partners` page is a dedicated route, separate from the landing page end-user sections. It sells white-label, seat revenue, client branding — NOT the end-user experience. The landing page `#for-firms` section links to it. |
| **HARD rule: NO FAKE SUBMISSIONS** | Any form must POST to a real server endpoint. | Partner inquiry form on `/partners` POSTs to `/api/partners/contact` (real route handler, stores to Supabase). |
| **HARD rule: VENDOR IDENTITY VIA ENV** | No email/phone/company/HQ hardcoded in source. | `CorporateFooter` already reads from `NEXT_PUBLIC_VENDOR_*`. No new vendor identity introduced in hardcoded form. |
| **HARD rule: SUPABASE NEW-TABLE TYPING** | Insert on new tables must cast payload as `never`. | `partner_inquiries` insert uses `.insert({...} as never)`. |
| **R3 / §5** — Explanatory header on every page | Every page + panel answers what/do/matters. | `/partners` page has a clear section-level explanatory header naming the audience, what they do, and why it matters. |
| **R11** — No hardcoded vendor identity | NEXT_PUBLIC_VENDOR_* env vars | No new vendor strings hardcoded. Footer already R11-compliant. |
| **R14** — Sample artefact before signup | At least one sample reachable from landing | Existing `/reports` page serves this purpose. Landing CTA links to it. |
| **HARD gate P2** — Named distributor archetype | DOM-citable evidence | `/partners` page and rewritten `#for-firms` both name: "Buyers' agent firm, property development advisory, or real estate agency that serves property developer clients." |
| **HARD gate P3** — Distributor Q1-Q4 answered | DOM-citable evidence | `/partners` page explicitly explains the channel model, channel economics, and why buyers' agents add DealFindrs to their client service offering. |
| **Prospect type coherence** | Single coherent archetype in DOM | Distributor = buyers' agent / property advisory firm (reseller, icp_partner_type=reseller). End user = the firm's property developer / promoter clients. These are named consistently throughout. No copy conflates them. |
| **R9** — RLS on every table | New `partner_inquiries` table has RLS | Migration includes `ALTER TABLE partner_inquiries ENABLE ROW LEVEL SECURITY` + admin-only read policy. |
| **R10** — No verbatim Postgres errors | API routes use sanitised errors | `/api/partners/contact/route.ts` logs real error server-side, returns generic message to client. |
| **R12** — Public API deny-by-default | Partner inquiry endpoint is intentionally public with justification comment | Route handler has a justification comment per R12 pattern. |
