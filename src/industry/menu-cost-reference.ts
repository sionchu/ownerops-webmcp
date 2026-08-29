import type { MarketId } from "@/domain/model";

/**
 * Human-supplied operating reference, not live market truth.
 * Monetary values are the guide's KRW-normalized examples and must not replace store actual purchase/menu data.
 */
export type MenuCostBenchmark = {
  id: string;
  market: MarketId;
  geographyLabel: string;
  menuName: string;
  normalizedPriceKrw: number;
  normalizedCostKrw: number;
  foodCostRate: number;
  yieldNotes?: string[];
  source: "user_supplied_global_cost_guide";
};

const benchmark = (
  id: string,
  market: MarketId,
  geographyLabel: string,
  menuName: string,
  normalizedPriceKrw: number,
  normalizedCostKrw: number,
  foodCostRate: number,
  yieldNotes?: string[],
): MenuCostBenchmark => ({ id, market, geographyLabel, menuName, normalizedPriceKrw, normalizedCostKrw, foodCostRate, yieldNotes, source: "user_supplied_global_cost_guide" });

export const MENU_COST_BENCHMARKS: MenuCostBenchmark[] = [
  benchmark("tokyo-sushi-10p", "jp-tokyo", "Tokyo", "Tokyo assorted sushi 10pcs", 19000, 8791, 0.463, ["Flounder yield 48%", "Salmon yield 62%"]),
  benchmark("tokyo-unaju", "jp-tokyo", "Tokyo", "Unaju eel rice", 32000, 18300, 0.572, ["Japanese eel yield 65%"]),
  benchmark("tokyo-tonkotsu", "jp-tokyo", "Tokyo", "Tonkotsu chashu ramen", 11000, 2945, 0.268, ["Braised chashu yield 80%"]),
  benchmark("tokyo-katsu", "jp-tokyo", "Tokyo", "Pork loin/tenderloin katsu set", 13000, 4008, 0.308, ["Pork trim yield 90%"]),
  benchmark("tokyo-tendon", "jp-tokyo", "Tokyo", "Shrimp/anago tendon", 14000, 3856, 0.275, ["Seafood trim yield 90%"]),
  benchmark("tokyo-yakitori", "jp-tokyo", "Tokyo", "Charcoal yakitori six-piece set", 16000, 4316, 0.270, ["Chicken thigh deboning yield 85%"]),
  benchmark("tokyo-sashimi", "jp-tokyo", "Tokyo", "Flounder and salmon sashimi for two", 38000, 15325, 0.403, ["Flounder yield 48%", "Salmon yield 62%"]),

  benchmark("nyc-porterhouse", "us-nyc", "New York", "Dry-aged porterhouse steak 500g", 85000, 33021, 0.388, ["Dry-age/trim yield 70%"]),
  benchmark("nyc-deep-dish", "us-nyc", "New York", "Signature deep-dish pizza L", 29000, 7725, 0.266),
  benchmark("nyc-double-cheeseburger", "us-nyc", "New York", "Double cheeseburger and fries", 15500, 4756, 0.307, ["Beef patty cook yield 85%"]),
  benchmark("nyc-lox-bagel", "us-nyc", "New York", "Lox bagel and cream cheese", 12500, 3671, 0.294),
  benchmark("nyc-clam-chowder", "us-nyc", "New York", "Clam chowder and garnish", 9500, 2130, 0.224),
  benchmark("nyc-ribs", "us-nyc", "New York", "BBQ ribs full rack", 36000, 11840, 0.329, ["Bone-in rib usable yield 75%"]),

  benchmark("seoul-samgyeopsal", "kr-seoul", "Seoul", "Aged pork belly BBQ set 180g", 16000, 5750, 0.359, ["Pork belly trim yield 90%", "Leaf vegetable loss 20%"]),
  benchmark("seoul-galbijjim", "kr-seoul", "Seoul", "Beef short-rib stew set", 18000, 6380, 0.354, ["Short-rib trim yield 75%"]),
  benchmark("seoul-gukbap", "kr-seoul", "Seoul", "Pork soup / seolleongtang", 10000, 3241, 0.324),
  benchmark("seoul-pajeon", "kr-seoul", "Seoul", "Seafood pajeon and makgeolli set", 22000, 5733, 0.261, ["Scallion trim yield 80%"]),
  benchmark("seoul-chimaek", "kr-seoul", "Seoul", "Seasoned fried chicken and draft beer set", 26000, 8368, 0.322, ["Draft-beer dispensing loss 5%"]),
  benchmark("seoul-bunsik", "kr-seoul", "Seoul", "Tteokbokki, sundae and fried-snack set", 16500, 4184, 0.254),

  // The supplied guide is Barcelona-oriented while OwnerOps currently models es-madrid.
  // Keep geographyLabel explicit so the agent treats this as directional Spanish cuisine reference only.
  benchmark("spain-paella", "es-madrid", "Barcelona reference", "Seafood paella for two", 36000, 10210, 0.284, ["Seafood shell/trim yield 75%"]),
  benchmark("spain-gambas", "es-madrid", "Barcelona reference", "Gambas al ajillo and baguette", 18000, 5042, 0.280),
  benchmark("spain-jamon-melon", "es-madrid", "Barcelona reference", "Jamon Iberico melon salad", 22000, 7333, 0.333, ["Jamon slicing yield 60%", "Melon yield 75%"]),
  benchmark("spain-tapas", "es-madrid", "Barcelona reference", "Five-piece pintxos/tapas set", 19500, 5253, 0.269),
  benchmark("spain-basque-cheesecake", "es-madrid", "Barcelona reference", "Basque cheesecake and sangria", 13500, 4420, 0.327, ["Cheesecake yield 90%"]),
  benchmark("spain-churros", "es-madrid", "Barcelona reference", "Churros and dipping chocolate", 7500, 1790, 0.239),

  benchmark("shanghai-xiaolongbao", "cn-shanghai", "Shanghai", "Xiaolongbao 8pcs", 11000, 2535, 0.230, ["Pork/gelatin filling yield 95%"]),
  benchmark("shanghai-dongpo", "cn-shanghai", "Shanghai", "Dongpo pork", 28000, 9699, 0.346, ["Blanch/braise yield 80%"]),
  benchmark("shanghai-mala", "cn-shanghai", "Shanghai", "Malatang / mala xiang guo for two", 21000, 6346, 0.302, ["Vegetable trim yield 85%"]),
  benchmark("shanghai-guobaorou", "cn-shanghai", "Shanghai", "Guobaorou", 18000, 5013, 0.279),
  benchmark("shanghai-menbosha", "cn-shanghai", "Shanghai", "Menbosha 6pcs", 16500, 4938, 0.299),
  benchmark("shanghai-noodles", "cn-shanghai", "Shanghai", "Dandan / beef noodles", 11500, 2829, 0.246),
];

export function getMenuCostBenchmarks(market: MarketId): MenuCostBenchmark[] {
  return MENU_COST_BENCHMARKS.filter((item) => item.market === market);
}
