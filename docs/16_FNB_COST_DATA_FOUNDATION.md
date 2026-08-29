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
      normalized price snapshots
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
- Creates one normalized contract that can later be loaded into Supabase/Postgres without changing the source adapters.
- Lets the repo prove real-data provenance now without turning OwnerOps into a full accounting/POS product.

## Normalized observation contract

External sources should eventually map to this shape before they are used for recipe costing:

```ts
type PriceObservation = {
  sourceId: string;
  market: MarketId;
  observedAt: string;
  productLabel: string;
  canonicalIngredientId?: string;
  price: number;
  currency: CurrencyCode;
  purchaseQuantity: number;
  purchaseUnit: "g" | "kg" | "ml" | "l" | "ea" | "pack";
  priceLevel: "retail" | "wholesale" | "merchant" | "index";
  locationLabel?: string;
  sourceRecordId?: string;
  sourceUrl: string;
  confidence: "official" | "merchant" | "crowdsourced" | "derived";
};
```

Recipe cost then uses the same deterministic rule everywhere:

```text
usable unit cost = purchase price / purchase quantity / edible yield
menu line cost   = usable unit cost * recipe quantity
```

Whole-fish/whole-leg yields and pre-trimmed-loin yields are different procurement states and must never share one yield value silently.

## Source map

| Source | Market | What it can provide | Access | OwnerOps use |
|---|---|---|---|---|
| KAMIS Open API | Seoul / Korea | Agricultural, livestock, fishery wholesale/retail price observations; period queries; Seoul region code | API key + requester ID | Primary Korean commodity source |
| Japan e-Stat Retail Price Survey | Tokyo / Japan | Monthly Tokyo retail prices for major goods, including food items | e-Stat application ID | Primary Tokyo public retail benchmark |
| USDA MyMarketNews (MARS) | NYC / US | Published market-news report data for produce, meat, dairy and other commodities | USDA account + personal API key | Primary US wholesale/market source; report mapping required |
| Eurostat Statistics API | Spain | HICP and other food-price indices | No key | Inflation/index adjustment, not restaurant invoice replacement |
| Mercamadrid statistics | Madrid / Spain | Product kilos and min/max/frequent wholesale prices; Excel export in public statistics UI | Public web/export; no documented stable REST API verified | Fresh-produce/fish/meat market reference via download adapter |
| Shanghai Agriculture / Development & Reform monitoring | Shanghai / China | Monthly agricultural price monitoring and daily staple-food XLS tables | Public pages/files; no stable public REST endpoint verified | HTML/XLS document adapter |
| Open Food Facts Open Prices | Global | Crowdsourced product price observations with date/location/product metadata | Read API is public | Supplemental retail observations; null/coverage checks required |
| Square API / Square MCP | Merchant stores | Catalog, orders, inventory, labor, vendors and payments for the connected merchant | Merchant OAuth/access token | Future real-store actuals; not part of public market-price collection |

## Verified endpoints and configuration

### Seoul — KAMIS

Base endpoint:

```text
https://www.kamis.or.kr/service/price/xml.do
```

Useful actions:

```text
action=dailyPriceByCategoryList
action=periodProductList
action=dailySalesList
action=recentlyPriceTrendList
```

Environment variables used by the sync script:

```text
KAMIS_CERT_KEY
KAMIS_CERT_ID
KAMIS_ITEM_CODE
KAMIS_CATEGORY_CODE       # optional
KAMIS_START_DATE          # YYYY-MM-DD
KAMIS_END_DATE            # YYYY-MM-DD
KAMIS_PRODUCT_CLASS=02    # 01 retail, 02 wholesale
KAMIS_COUNTRY_CODE=1101   # Seoul where supported
```

Official reference:
`https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=6`

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

`statsDataId` should be pinned to the selected Retail Price Survey table or discovered before sync; do not guess it from a human-facing table number.

Official API specification:
`https://www.e-stat.go.jp/api/index.php/en/api-info/api-spec`

### New York — USDA MyMarketNews

Base endpoint:

```text
https://marsapi.ams.usda.gov/services/v1.2/reports
```

Authentication uses the personal API key as Basic-auth username with a blank password. Data retrieval is report/slug based, so OwnerOps must keep an explicit report-to-ingredient mapping instead of pretending the API is a universal commodity search endpoint.

Environment variables:

```text
USDA_MMN_API_KEY
USDA_MMN_REPORT_ID        # optional; without it the sync can retrieve report catalogue metadata
```

Official docs:
`https://mymarketnews.ams.usda.gov/mymarketnews-api`

### Spain — Eurostat + Mercamadrid

Eurostat base:

```text
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{datasetCode}
```

No API key is required. Use it for food-price indices and macro adjustment, not direct recipe ingredient invoices.

Mercamadrid exposes product statistics including kilos and minimum/maximum/frequent EUR/kg prices and offers Excel export through its public statistics interface, but no stable documented public REST API was verified during this review. Treat it as a download/page adapter until a supported endpoint is confirmed.

References:
- `https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/api`
- `https://www.mercamadrid.es/estadisticas/`

### Shanghai — government monitoring pages/files

Useful public sources:

```text
https://nyncw.sh.gov.cn/jcsj/index.html
https://www.shanghai.gov.cn/nw17239/
```

Shanghai currently publishes monthly agricultural monitoring reports and daily staple-food price tables, often with XLS attachments. No stable public REST API was verified, so the first adapter is document ingestion with a pinned source URL and explicit parser version.

Environment variable for an explicitly selected document/page:

```text
SHANGHAI_PRICE_URL
```

Do not silently crawl the whole government site.

### Global supplement — Open Prices

Read endpoint:

```text
https://prices.openfoodfacts.org/api/v1/prices
```

This is crowdsourced and coverage is uneven. Product joins may be incomplete, so null checks and source confidence must be preserved.

Optional query string:

```text
OPEN_PRICES_QUERY=size=100
```

Docs:
`https://prices.openfoodfacts.org/api/docs`

## Future database / MCP upgrade

When the offline snapshot model proves useful, load the same normalized observations into Postgres/Supabase:

```text
price_source
price_observation
ingredient
ingredient_alias
recipe
recipe_line
menu_item
cost_snapshot
```

Recommended internal developer MCP:

```text
https://mcp.supabase.com/mcp?project_ref=<project-ref>&read_only=true&features=database,docs
```

Use project scoping and read-only mode by default. This MCP is for development/analysis, not an end-user production capability.

For merchants already on Square, the Square remote MCP (`https://mcp.squareup.com/sse`) can later provide merchant-owned catalog/order/inventory/labor data. Keep public market-price collection and merchant actuals as separate provenance classes.

## Explicit non-goals for this branch

- No Supabase runtime dependency.
- No new API route required by the demo UI.
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
