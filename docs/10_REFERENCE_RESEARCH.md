# 10 — Reference Research

This file records evidence that should shape implementation and demo choices. It is not permission to copy proprietary UX or claim third-party data as OwnerOps truth.

## Product-demand evidence
### Toast IQ Q1 2026 restaurant AI usage
https://pos.toasttab.com/blog/data/q1-2026-restaurant-ai-pos-trends

Toast analyzed anonymized, aggregated Toast IQ inputs from more than 125,000 U.S. restaurant locations using the assistant in Q1 2026. Reported conversation categories included sales/revenue, menu/inventory, guest/marketing, operations/reporting, and labor efficiency. The top prompt was a concise daily business briefing. Product lesson: OwnerOps should prioritize **daily operating insight and action**, not remain staffing-only.

### Square AI / seller research
https://squareup.com/us/en/ai
https://squareup.com/us/en/the-bottom-line/inside-square/managerbot-ai-business-manager
https://squareup.com/us/en/the-bottom-line/inside-square/building-square-ai

Product lesson: small-business owners have data but limited time to navigate reports and formulate perfect analytical questions. OwnerOps should proactively surface priorities and ground answers in connected store data.

### Workforce references
Homebase: https://www.joinhomebase.com/employee-scheduling
7shifts: https://www.7shifts.com/
Deputy: https://www.deputy.com/

Borrow the operational concepts—availability, scheduling, time/attendance, shift swap, labor visibility, tasks/logs—without recreating their module-by-module SaaS navigation.

## Commodity / wholesale reference sources
These are candidate **reference providers**, not store purchase truth.

### Korea — KAMIS
https://www.kamis.or.kr/customer/reference/openapi_list.do

KAMIS provides agricultural/livestock/fisheries wholesale and retail price APIs, including item, period, recent-price trend, and regional queries. Seoul is supported in regional filters. Use for defensibly matched fresh-food SKUs; keep supplier invoice/receipt cost authoritative.

### United States — USDA AMS MyMarketNews
https://mymarketnews.ams.usda.gov/mymarketnews-api
https://www.ams.usda.gov/market-news/fruits-vegetables

USDA AMS publishes wholesale/terminal-market data for many commodities and exposes MyMarketNews API access. New York Terminal Market reports are a strong NYC reference for produce where package/unit normalization is explicit.

### Japan — MAFF wholesale market statistics
https://www.maff.go.jp/j/tokei/syohi/shikyou/index.html
https://www.maff.go.jp/j/tokei/syohi/oroshi_kakaku/index.html

MAFF publishes fruit/vegetable wholesale quantities and prices, including Tokyo markets and daily/periodic statistics. Use a market/city/item match rather than generic national averages when possible.

### Spain — MAPA food-chain price observatory
https://www.mapa.gob.es/es/alimentacion/temas/observatorio-cadena/cadenas-valor/sistema-de-precios-om

MAPA's origin-wholesale system tracks weekly prices for selected significant fresh-food products. Only mapped products should receive a reference.

### China — Ministry of Agriculture and Rural Affairs
https://data.moa.gov.cn/nyb/pc/index.jsp
https://zdscxx.moa.gov.cn/nyb/pc/200zs.jsp

MOA publishes agricultural wholesale price/index data and monitored product prices. Use the source's actual geography/product granularity; do not imply a Shanghai-specific price if the available observation is national.

## Commercial-rent benchmark
### Korea — Korea Real Estate Board / KOSIS
https://www.reb.or.kr/reb/cm/cntnts/cntntsView.do?cntntsId=1052
https://kosis.kr/

The Commercial Real Estate Rental Trend Survey publishes quarterly rent, rent-price index, vacancy and related data at national/city/commercial-district levels. OwnerOps should use it as a benchmark/trend only; actual lease terms in StoreState are authoritative.

For non-Korean markets, seed a benchmark with explicit `seed` freshness until a stable, appropriately granular provider is implemented. Do not use residential rent data as a commercial-store proxy.

## Weather
### OpenWeather reference adapter
https://openweathermap.org/api/current

A provider such as OpenWeather can supply current/forecast context by city/geography. Weather is evidence for an operating recommendation, not a demand guarantee. The hackathon must retain deterministic seeded weather so no API failure can break the demo.

## Industry inventory design
Industry seed catalogs are not generic ERP catalogs. They should contain the **small set of items that materially drive owner decisions**:
- perishable/high-velocity inputs;
- high-cost ingredients/materials;
- common consumables that can stock out;
- items with recipe/service linkage;
- items with plausible supplier-price changes or waste.

Public commodity references are most useful for fresh/basic commodities. Branded packaging, chemicals, salon products, sauces, or specialty goods usually rely on recent supplier purchase history.

## Occupancy / break-even design
OwnerOps should treat base rent and recurring fees as store-entered/seeded fixed-cost truth. External rent observations are only context. The useful natural-language jobs are:
- “월세 내고 남는 돈?”
- “임대료 10% 오르면?”
- “손익분기 매출 얼마?”

This is operating planning, not accounting or commercial property valuation.

## Design synthesis
OwnerOps should combine:
- Toast/Square-style data-grounded operating questions;
- workforce constraints from mature staff tools;
- inventory/vendor/waste reasoning;
- public market/weather/rent references with provenance;
- WebMCP shared-state execution;
- Linear-like calm density.

It should **not** combine their full feature menus. The differentiator is a natural-language operating manager that coordinates capabilities on one live store state.
