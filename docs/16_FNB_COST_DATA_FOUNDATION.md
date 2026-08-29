# 16 — F&B Cost Data Foundation

## Decision

OwnerOps may ingest external food-cost data as an **offline/prebuild input**, but the hackathon runtime remains backend-free.

The current staffing `AppState` is still the source of truth for UI, calculations, persistence, snapshots, and WebMCP. Food-price observations are a separate read-only context and must not create a second scheduling or payroll state path.

```text
Official APIs / public datasets / merchant POS
                │
                ▼
        offline sync script
                │
                ▼
      three-tier price isolation
                │
        ┌───────┴────────┐
        ▼                ▼
 future cost UI      future DB load
        │                │
        └──── no mutation of staffing AppState in MVP
```

## Why offline first

- Preserves the current no-backend hackathon deployment.
- Keeps the demo deterministic when an upstream API is slow, down, rate-limited, or requires credentials.
- Avoids shipping API secrets to the browser.
- Creates one normalized contract that can later be loaded into Supabase/Postgres without changing source adapters.
- Lets the repo prove real-data provenance now without turning OwnerOps into a full accounting/POS product.

## Three-tier price isolation

Public market prices, merchant invoice prices, and recipe-ready usable costs are different facts. Never overwrite one with another.

```text
Tier 1  raw_price_snapshots
        source payload + request provenance, unchanged
                    │
                    ▼
Tier 2  normalized_price_observations
        one currency / quantity / unit / market contract
                    │
                    ▼
Tier 3  effective_ingredient_prices
        canonical ingredient + edible yield + usable unit cost
```

The implemented TypeScript contracts are `RawPriceSnapshot`, `PriceObservation`, and `EffectiveIngredientPrice` in `src/cost-data/model.ts`.

Recipe cost uses the same deterministic rule everywhere:

```text
purchase unit cost = purchase price / purchase quantity
usable unit cost   = purchase unit cost / edible yield
menu line cost     = usable unit cost * recipe quantity
```

For example, a 1 kg fish purchased for 24,000 at 48% edible yield is `24,000 / 1,000 / 0.48 = 50` currency units per usable gram. Multiplying purchase price by yield would be incorrect.

Whole-fish/whole-leg yields and pre-trimmed-loin yields are different procurement states and must never share one yield value silently.

## Source map

| Source | Market | What it can provide | Access | OwnerOps use |
|---|---|---|---|---|
| KAMIS Open API | Seoul / Korea | Agricultural, livestock and fishery wholesale/retail observations; Seoul region code; daily/category/item endpoints | API key + requester ID | Primary Korean commodity source |
| Japan e-Stat Retail Price Survey | Tokyo / Japan | Monthly Tokyo retail prices for major goods, including food items | e-Stat application ID | Primary Tokyo public retail benchmark |
| USDA MyMarketNews (MARS) | NYC / US | Published market-news reports for produce, livestock/meat, dairy and other commodities | USDA account + personal API key | Primary US wholesale/market source; explicit report mapping required |
| Eurostat Statistics API | Spain | HICP and other food-price indices | No key | Inflation/index adjustment, not restaurant invoice replacement |
| Mercamadrid statistics | Madrid / Spain | Product kilos and min/max/frequent wholesale prices; Excel export in public statistics UI | Public web/export; no stable documented REST API verified | Fresh-produce/fish/meat market reference via download adapter |
| Shanghai Agriculture / municipal monitoring | Shanghai / China | Monthly agricultural price monitoring and public staple-food tables/files | Public pages/files; no stable public REST endpoint verified | HTML/XLS document adapter |
| Open Food Facts Open Prices | Global | Crowdsourced product price observations with date/location/product metadata | Read API is public | Supplemental retail observations; null/coverage checks required |
| Square API / Square MCP | Merchant stores | Catalog, orders, inventory, labor, vendors and payments for a connected merchant | Merchant OAuth | Future actual-store truth; separate provenance from public market data |

## Verified endpoints and configuration

### Seoul — KAMIS

Base endpoint:

```text
https://www.kamis.or.kr/service/price/xml.do
```

The sync script supports two modes.

Category snapshot:

```text
action=dailyPriceByCategoryList
```

Specific item lookup when `KAMIS_ITEM_CODE` is set:

```text
action=ItemInfo
```

Environment variables:

```text
KAMIS_CERT_KEY
KAMIS_CERT_ID
KAMIS_PRODUCT_CLASS=02    # 01 retail, 02 wholesale
KAMIS_COUNTRY_CODE=1101   # Seoul
KAMIS_CATEGORY_CODE=200   # 100 grain, 200 veg, 300 specialty, 400 fruit, 500 livestock, 600 fishery
KAMIS_REGDAY              # optional YYYY-MM-DD

# optional item mode
KAMIS_ITEM_CODE
KAMIS_KIND_CODE=00
KAMIS_RANK_CODE=04
```

`dailyPriceByCategoryList` is category-level; setting an item code there does not filter the response. Item mode therefore uses the documented `ItemInfo` parameter family explicitly.

Official references:
- `https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=1`
- `https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=14`

### Tokyo — Japan e-Stat

Statistics API v3 JSON endpoint:

```text
https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData
```

Retail Price Survey statistics code: `00200571`.

Environment variables:

```text
ESTAT_APP_ID
ESTAT_STATS_DATA_ID
```

`statsDataId` must be pinned to the selected Retail Price Survey table or discovered before sync; do not guess it from a human-facing table number.

Official API specification:
`https://www.e-stat.go.jp/api/index.php/en/api-info/api-spec`

### New York — USDA MyMarketNews

Canonical report endpoint:

```text
https://marsapi.ams.usda.gov/services/v1.2/reports
```

Authentication uses the personal API key as Basic-auth username with a blank password. Retrieval is report/slug based. Do **not** hard-code one boxed-beef report and assume it contains ribs, salmon, produce, or every NYC recipe ingredient. OwnerOps must maintain an explicit report/section/commodity mapping and may need multiple reports.

Environment variables:

```text
USDA_MMN_API_KEY
USDA_MMN_REPORT_ID        # optional; without it the sync retrieves report catalogue metadata
```

Official docs:
- `https://mymarketnews.ams.usda.gov/mymarketnews-api`
- `https://mymarketnews.ams.usda.gov/mymarketnews-api/reports`

### Spain — Eurostat + Mercamadrid

Eurostat base:

```text
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{datasetCode}
```

No API key is required. Use it for food-price indices and macro adjustment, not direct recipe ingredient invoices.

Mercamadrid exposes public product statistics including kilos and minimum/maximum/frequent EUR/kg prices and offers Excel export through its statistics interface, but no stable documented public REST API was verified during this review. Treat it as a download/page adapter until a supported endpoint is confirmed.

References:
- `https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction`
- `https://www.mercamadrid.es/estadisticas/`

### Shanghai — government monitoring pages/files

Useful public source:

```text
https://nyncw.sh.gov.cn/jcsj/index.html
```

The Shanghai Agriculture and Rural Affairs Commission publishes dated monthly agricultural price-monitoring reports. Other municipal pages may publish downloadable staple-food tables. No stable public REST API was verified, so the first adapter is document ingestion with a pinned source URL and explicit parser version.

Environment variable:

```text
SHANGHAI_PRICE_URL
```

The sync script only accepts explicitly supplied Shanghai government hosts; it does not silently crawl the entire site.

### Global supplement — Open Prices

Read endpoint:

```text
https://prices.openfoodfacts.org/api/v1/prices
```

This is crowdsourced and coverage is uneven. Product joins may be incomplete, so null checks and `crowdsourced` confidence must be preserved.

Optional query string:

```text
OPEN_PRICES_QUERY=size=100
```

Docs:
`https://prices.openfoodfacts.org/api/docs`

## Merchant truth versus market reference

A restaurant's negotiated invoice/POS data is operational truth for that store. Public KAMIS/e-Stat/USDA/Eurostat/Shanghai/Open Prices observations are market references. The model must support comparisons such as:

```text
merchant usable unit cost
vs
market reference usable unit cost
```

without ever replacing the merchant value automatically.

For merchants already on Square, Square's official remote MCP is:

```text
https://mcp.squareup.com/sse
```

It exposes the Square REST API platform through MCP after merchant OAuth. Keep merchant catalog/order/inventory/labor data in a separate provenance class from public market data.

Toast and 7shifts are valid future merchant integrations but are not implemented in this branch.

## Future `fnb-cost-data-platform` extraction

If this research layer becomes a production product, extract it from the hackathon app rather than growing OwnerOps into a backend monolith.

Recommended shape:

```text
fnb-cost-data-platform/
├─ schema/
│  └─ 001_initial_schema.sql
├─ engine/
│  └─ deterministic cost / menu / BEP calculations
├─ pipelines/
│  ├─ KAMIS adapter
│  ├─ e-Stat adapter
│  ├─ USDA MMN adapter
│  ├─ Eurostat adapter
│  └─ Shanghai/Mercamadrid document adapters
├─ api/
│  └─ HTTP application API if a real consumer needs one
├─ mcp/
│  └─ internal developer/data MCP configuration
└─ export/
   └─ Excel snapshot/export path
```

The production database should preserve the three tiers instead of collapsing them into one price column:

```text
price_source
raw_price_observation
normalized_price
effective_ingredient_price
ingredient
ingredient_alias
recipe
recipe_line
menu_item
cost_snapshot
```

Do not add FastAPI, Python/dlt, Supabase, or another runtime to this hackathon repository merely because the production extraction may use them.

## Future Supabase / MCP upgrade

The same normalized observations can later be loaded into Postgres/Supabase. Recommended internal developer MCP configuration uses project scoping and read-only access:

```text
https://mcp.supabase.com/mcp?project_ref=<project-ref>&read_only=true&features=database,docs
```

Supabase explicitly recommends project scope/read-only mode and warns against exposing developer MCP access to end users or connecting it casually to production data. This MCP is a developer/data tool, not an OwnerOps customer feature.

A Python ETL extraction could optionally use `dlt`, whose separate MCP server can inspect pipelines/tables/schema/state. That is useful after the data platform becomes its own project; it is unnecessary for the current Node-only offline sync.

## Explicit non-goals for this branch

- No Supabase runtime dependency.
- No new API route required by the demo UI.
- No FastAPI/Python/dlt runtime added to this repository.
- No automatic restaurant-menu scraping.
- No browser-side secrets.
- No change to the eight WebMCP staffing tools.
- No recipe-cost field added to canonical staffing `AppState` yet.
- No claim that public retail/wholesale prices equal a restaurant's negotiated supplier invoice.

## Promotion rule

A source may move from `experimental` to `operational` only after:

1. authentication/access is documented,
2. a pinned sample response is captured,
3. units and currency are normalized,
4. source date/location are retained,
5. missing/null fields are tested,
6. the adapter fails closed without corrupting the last good snapshot.
