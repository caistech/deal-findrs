# Design Plan — DealFindrs TEARDOWN Remediation

## Survey Failures I Am Fixing

### Field Evidence Failures (10/14 currently evidenced, need to evidence the missing 10)

| Field | Current State | Fix Required | Location |
|-------|--------------|--------------|----------|
| ICP geography | NOT EVIDENCED | Add Australia (primary market) evidence | src/app/page.tsx hero section |
| Prospect type | CONFLICTING: hero says "buyers' agents & property firms", features says "for developers" | Choose ONE coherent archetype per the spec: Property firms & buyers' agents seeking branded tools | src/app/page.tsx line 52, line 109 |
| ICP buyer title | NOT EVIDENCED | Add evidence of target buyer roles | src/app/page.tsx - add section |
| ICP company size | NOT EVIDENCED | Add evidence of company size targeting | src/app/page.tsx - add section |
| ICP stage | NOT EVIDENCED | Add evidence of deal stage targeting | src/app/page.tsx - add section |
| Exclusions | NOT EVIDENCED | Add what DealFindrs is NOT for | src/app/page.tsx - add section |
| Distributor | CONFLICTING: hero markets to buyers' agents, but mechanism is self-service | Evidence the distributor model from spec: "Property firms, buyers' agents, real estate agencies seeking branded deal assessment tools" | src/app/page.tsx - clarify positioning |
| Distributor outcomes | NOT EVIDENCED | Add what distributors get: branded tools, steady flow of scored deals, client retention | src/app/page.tsx - add section |
| End user | NOT EVIDENCED | Add: "Property developers, investment analysts, buyers' agents, and development promoters who evaluate deal opportunities" | src/app/page.tsx - add section |
| End-user outcomes | NOT EVIDENCED | Add: consistent scoring, saved time, better decisions, faster deal flow | src/app/page.tsx - add section |

### PRE-HARD Checks Failures

| Check | Current State | Fix Required |
|-------|--------------|--------------|
| P2 | FAIL - No named distributor archetype; conflicting messages | Fix the messaging to use the spec's distributor: "Property firms, buyers' agents, real estate agencies" |
| P3 | FAIL - No distributor model evidenced | Evidence the white-label/distributor model clearly in copy |

## Resolution of Prospect Type Conflict

The teardown identified conflicting archetypes:
- Hero (line 52): "For buyers' agents & property firms"
- Features (line 109): "Built by developers, for developers"

Per the `_spec.json`:
- **Distributor**: "Property firms, buyers' agents, real estate agencies, and development promoters seeking branded deal assessment tools for their teams."
- **End user**: "Property developers, investment analysts, buyers' agents, and development promoters"

**Decision**: The spec clearly defines a DISTRIBUTOR model. The product is sold TO property firms/agents who then provide it TO their developer clients under their brand. This is a white-label / B2B2C model.

**Chosen archetype**: Property firms, buyers' agents, and real estate agencies as the primary buyer (distributor), who use the platform to serve their property developer clients.

## Standards I Must Satisfy

### From PORTFOLIO_STANDARD.md

| Rule | Requirement | How Build Meets It |
|------|-------------|-------------------|
| R3 | Every UI surface has explanatory header | Already present on authenticated pages |
| R11 | Vendor identity via env, never hardcoded | Header/Footer use env vars |
| R14 | One public sample artefact before signup | Need to verify / check if present |

### From THIN_MVP_RUBRIC.md

- The product must deliver the full experience (AI assessments, RAG status, devfinance modules)
- Zero scale infrastructure pre-GO (appears to be met - it's a self-service SaaS)

## Implementation Plan

1. **Fix Prospect Type Conflict** (src/app/page.tsx)
   - Remove "Built by developers, for developers" from line 109
   - Update to reflect white-label/distributor model

2. **Add ICP Geography** - Add "Australia-focused" evidence in hero/proximity section

3. **Add ICP Buyer Title** - Create a "Who It's For" section naming specific roles

4. **Add ICP Company Size** - Add section about firm sizes (small to large agencies)

5. **Add ICP Stage** - Add evidence of what deal stages are evaluated

6. **Add Exclusions** - Add "Who It's Not For" section

7. **Add Distributor Outcomes** - Add section on what distributors receive

8. **Add End User + Outcomes** - Add section on end user type and benefits

9. **Verify no hardcoded vendor identity** - Check all components use env vars
