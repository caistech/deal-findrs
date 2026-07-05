# Cost engine — canonical path (A3 / D1)

Resolves the report-generator audit's A3/D1 finding: *"two independent construction-cost engines
that do not reconcile to each other."*

## D1 — the decision

There are two cost families in the repo, serving **different products**:

| Engine | Measures | Product | Status |
|---|---|---|---|
| **`src/lib/estate-cost/`** (lot-based) | land-development cost per lot (civil + soft + statutory + contingency) | **estate / land subdivision** | **CANONICAL for estate deals** |
| **`src/lib/devfinance/costs.ts`** (m²-based, Rawlinsons) | dwelling construction cost per m² | dwelling / unit development | shared **primitive** + legacy dwelling pipeline |

**For an estate (subdivision) deal, `estate-cost` is the single source of construction/works cost.**
It is the one feed into the F2K deal-model — the deal-model derives its works figure from
`estate-cost`'s per-lot subtotals via `deriveWorksToTitle()` (see `@caistech/deal-model` `index.ts`),
so the estate reports and the deal-model verdict **cannot drift**: one figure, one source.

## A3 — how the two relate (no fork)

`devfinance/costs.ts` is **not** a parallel estate cost source. It provides two **shared primitives**
that `estate-cost` consumes:

- `getRegionalFactor(state, city)` — the regional multiplier `estate-cost` applies to its benchmark
  civil rates.
- `calculateConstructionCost(...)` — the trade-level dwelling engine `estate-cost` calls **only** for
  the optional House-&-Land home line (the buyer's build cost), never for the land-development civil.

So the estate civil cost (lot-based) and the dwelling construction cost (m²-based) measure **different
quantities** and are not expected to be equal — there is nothing to reconcile between them at the
land-development level. The single shared primitive means the *dwelling* figure has one source too.

## The genuine drift risk + the guard

The residual risk the audit named: the **legacy devfinance feasibility pipeline**
(`/opportunities/[id]/devfinance` + its `qs`/`valuation`/`feasibility`/`pack` routes) assembles a TDC
its own way, so running **both** the devfinance pack and the estate review-packs on the same site can
produce two different headline figures.

- **Guard:** `reconcileWorksCost(estate, alt, tolerancePct)` (in `estate-cost/build.ts`) surfaces a
  material divergence between the estate works figure and any alternative (e.g. a devfinance-derived
  one) rather than burying it — for any surface that ends up with both.
- **Product decision (flagged, NOT done here):** the devfinance dwelling pipeline is still linked from
  the opportunity page. Whether to **retire / hide it for estate opportunities** (leaving the estate
  review-packs as the sole cost/feasibility surface) is a product call, not a code cleanup — it
  removes a live, linked feature. Recommended once the estate path is confirmed as the deal home.
