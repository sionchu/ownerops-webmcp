import type { IndustryId, InventoryUnit, RecipeLine, WorkerRole } from "@/domain/model";

export type AvatarAccessory = "cap" | "chef-cap" | "apron" | "salon-apron" | "headband";
export type AvatarDetail = "name-tag" | "badge" | "tool-badge";

type SupplierKind = "food" | "packaging" | "sanitation" | "beauty";

export type InventorySeed = {
  id: string;
  name: string;
  category: string;
  unit: InventoryUnit;
  onHand: number;
  parLevel: number;
  reorderPoint: number;
  leadTimeDays: number;
  supplierKind: SupplierKind;
  baseUnitCostKrw: number;
  marketReferenceKey?: string;
  perishable?: boolean;
};

export type MenuSeed = {
  id: string;
  name: string;
  category: string;
  basePriceKrw: number;
  recipe: RecipeLine[];
};

export type IndustryProfile = {
  id: IndustryId;
  label: string;
  businessName: string;
  roleLabels: Record<WorkerRole, string>;
  operations: {
    workerSkills: Record<string, string[]>;
    inventory: InventorySeed[];
    menu: MenuSeed[];
    closingTasks: string[];
  };
  copy: {
    scheduleContext: string;
    peakLabel: string;
    incidentLabel: string;
    coverageLabel: string;
    disruptionTitle: string;
    disruptionBody: string;
    suggestedPrompt: string;
    headline: string;
  };
  visual: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    canvas: string;
    surface: string;
    surfaceElevated: string;
    ink: string;
    secondaryInk: string;
    border: string;
    focusLane: string;
    agentGlow: string;
    radiusCard: string;
    radiusShift: string;
    motifOpacity: string;
    motionTheme: string;
    avatarAccessory: AvatarAccessory;
    avatarDetail?: AvatarDetail;
  };
};

const commonCrewSkills = {
  minsoo: ["service"],
  jiyoung: ["service"],
  younghee: ["manager", "service"],
  chulsoo: ["service"],
  hana: ["service"],
};

export const INDUSTRY_PROFILES: Record<IndustryId, IndustryProfile> = {
  diner: {
    id: "diner",
    label: "Neighborhood diner",
    businessName: "Good Shift Diner",
    roleLabels: { barista: "Crew", manager: "Shift lead" },
    operations: {
      workerSkills: { ...commonCrewSkills, minsoo: ["service", "prep"], chulsoo: ["service", "prep"], younghee: ["manager", "service", "prep"] },
      inventory: [
        { id: "eggs", name: "Eggs", category: "fresh", unit: "ea", onHand: 72, parLevel: 120, reorderPoint: 48, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 330, marketReferenceKey: "eggs", perishable: true },
        { id: "whole-milk", name: "Whole milk", category: "dairy", unit: "l", onHand: 14, parLevel: 30, reorderPoint: 10, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 2500, marketReferenceKey: "milk", perishable: true },
        { id: "bread", name: "Bread", category: "bakery", unit: "pack", onHand: 12, parLevel: 20, reorderPoint: 6, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 3200, perishable: true },
        { id: "rice", name: "Rice", category: "staple", unit: "kg", onHand: 18, parLevel: 30, reorderPoint: 10, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 4300, marketReferenceKey: "rice" },
        { id: "cooking-oil", name: "Cooking oil", category: "staple", unit: "l", onHand: 9, parLevel: 16, reorderPoint: 5, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 4600, marketReferenceKey: "cooking_oil" },
        { id: "chicken", name: "Chicken", category: "protein", unit: "kg", onHand: 9, parLevel: 16, reorderPoint: 6, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 8500, marketReferenceKey: "chicken", perishable: true },
        { id: "onion", name: "Onion", category: "produce", unit: "kg", onHand: 8, parLevel: 16, reorderPoint: 5, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 2500, marketReferenceKey: "onion", perishable: true },
        { id: "lettuce", name: "Lettuce", category: "produce", unit: "kg", onHand: 3, parLevel: 6, reorderPoint: 2, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 5600, marketReferenceKey: "lettuce", perishable: true },
        { id: "takeout-box", name: "Takeout containers", category: "packaging", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 3, supplierKind: "packaging", baseUnitCostKrw: 38000 },
        { id: "sanitizer", name: "Food-safe sanitizer", category: "cleaning", unit: "l", onHand: 3, parLevel: 5, reorderPoint: 2, leadTimeDays: 3, supplierKind: "sanitation", baseUnitCostKrw: 7500 },
      ],
      menu: [
        { id: "breakfast-plate", name: "Breakfast plate", category: "meal", basePriceKrw: 12000, recipe: [{ inventoryItemId: "eggs", quantity: 2, unit: "ea" }, { inventoryItemId: "bread", quantity: 0.15, unit: "pack" }] },
        { id: "chicken-rice", name: "Chicken rice", category: "meal", basePriceKrw: 14500, recipe: [{ inventoryItemId: "chicken", quantity: 0.18, unit: "kg" }, { inventoryItemId: "rice", quantity: 0.16, unit: "kg" }, { inventoryItemId: "onion", quantity: 0.05, unit: "kg" }] },
      ],
      closingTasks: ["Check refrigerator temperature", "Count eggs and milk", "Sanitize prep surfaces", "Close cash and note exceptions"],
    },
    copy: {
      scheduleContext: "Published diner schedule · Seoul",
      peakLabel: "Dinner rush",
      incidentLabel: "Call-out",
      coverageLabel: "Rush coverage",
      disruptionTitle: "Friday evening coverage",
      disruptionBody: "Minsoo is currently assigned 18:00–22:00. Mark the call-out to compare the bounded recovery choices.",
      suggestedPrompt: "Minsoo called out before dinner rush. Show me three options, but don't apply anything yet.",
      headline: "Friday rush. One person short. Three ways out.",
    },
    visual: { accent: "#A84F3D", accentHover: "#873B2D", accentSoft: "#F6E5DF", canvas: "#F8F3EC", surface: "#FFFDF9", surfaceElevated: "#FFF9F2", ink: "#20282C", secondaryInk: "#6F6A64", border: "#E8DED3", focusLane: "#F4E1D9", agentGlow: "#EBCFC5", radiusCard: "12px", radiusShift: "12px", motifOpacity: "0.035", motionTheme: "460ms", avatarAccessory: "cap", avatarDetail: "name-tag" },
  },
  pizza: {
    id: "pizza",
    label: "Neighborhood pizza shop",
    businessName: "Slice House",
    roleLabels: { barista: "Counter crew", manager: "Shift lead" },
    operations: {
      workerSkills: { minsoo: ["counter", "prep"], jiyoung: ["counter"], younghee: ["manager", "counter", "prep"], chulsoo: ["counter", "prep"], hana: ["counter"] },
      inventory: [
        { id: "flour", name: "Pizza flour", category: "staple", unit: "kg", onHand: 24, parLevel: 40, reorderPoint: 14, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 2100, marketReferenceKey: "flour" },
        { id: "yeast", name: "Yeast", category: "staple", unit: "g", onHand: 900, parLevel: 1500, reorderPoint: 500, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 18 },
        { id: "tomato-sauce", name: "Tomato sauce", category: "sauce", unit: "kg", onHand: 13, parLevel: 22, reorderPoint: 8, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 5200, marketReferenceKey: "tomato" },
        { id: "mozzarella", name: "Mozzarella", category: "dairy", unit: "kg", onHand: 8, parLevel: 16, reorderPoint: 6, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 14500, perishable: true },
        { id: "pepperoni", name: "Pepperoni", category: "protein", unit: "kg", onHand: 4, parLevel: 8, reorderPoint: 3, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 18500, perishable: true },
        { id: "olive-oil", name: "Olive oil", category: "staple", unit: "l", onHand: 6, parLevel: 10, reorderPoint: 4, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 15000 },
        { id: "onion", name: "Onion", category: "produce", unit: "kg", onHand: 5, parLevel: 10, reorderPoint: 3, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 2500, marketReferenceKey: "onion", perishable: true },
        { id: "mushroom", name: "Mushroom", category: "produce", unit: "kg", onHand: 3, parLevel: 6, reorderPoint: 2, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 7900, marketReferenceKey: "mushroom", perishable: true },
        { id: "pizza-box", name: "Pizza boxes", category: "packaging", unit: "box", onHand: 3, parLevel: 6, reorderPoint: 2, leadTimeDays: 4, supplierKind: "packaging", baseUnitCostKrw: 44000 },
        { id: "sanitizer", name: "Kitchen sanitizer", category: "cleaning", unit: "l", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 3, supplierKind: "sanitation", baseUnitCostKrw: 7500 },
      ],
      menu: [
        { id: "margherita", name: "Margherita pizza", category: "pizza", basePriceKrw: 17000, recipe: [{ inventoryItemId: "flour", quantity: 0.28, unit: "kg" }, { inventoryItemId: "tomato-sauce", quantity: 0.12, unit: "kg" }, { inventoryItemId: "mozzarella", quantity: 0.16, unit: "kg" }] },
        { id: "pepperoni-pizza", name: "Pepperoni pizza", category: "pizza", basePriceKrw: 19500, recipe: [{ inventoryItemId: "flour", quantity: 0.28, unit: "kg" }, { inventoryItemId: "tomato-sauce", quantity: 0.12, unit: "kg" }, { inventoryItemId: "mozzarella", quantity: 0.15, unit: "kg" }, { inventoryItemId: "pepperoni", quantity: 0.08, unit: "kg" }] },
      ],
      closingTasks: ["Count mozzarella and dough prep", "Clean oven deck", "Check next-day dough", "Count pizza boxes"],
    },
    copy: {
      scheduleContext: "Published pizza schedule · Seoul",
      peakLabel: "Friday pizza rush",
      incidentLabel: "Call-out",
      coverageLabel: "Rush coverage",
      disruptionTitle: "Friday evening coverage",
      disruptionBody: "Minsoo is currently assigned 18:00–22:00. Mark the call-out to compare the bounded recovery choices.",
      suggestedPrompt: "Minsoo called out before Friday pizza rush. Show me three options, but don't apply anything yet.",
      headline: "Friday pizza rush. Keep the line moving.",
    },
    visual: { accent: "#C8513B", accentHover: "#9E3E2E", accentSoft: "#F9E5DE", canvas: "#FBF3E9", surface: "#FFFDF8", surfaceElevated: "#FFF7EE", ink: "#302722", secondaryInk: "#75665E", border: "#EBDDCF", focusLane: "#F8DDD3", agentGlow: "#F0C9BC", radiusCard: "18px", radiusShift: "16px", motifOpacity: "0.05", motionTheme: "400ms", avatarAccessory: "chef-cap" },
  },
  coffee: {
    id: "coffee",
    label: "Neighborhood coffee shop",
    businessName: "Corner Coffee",
    roleLabels: { barista: "Barista", manager: "Manager" },
    operations: {
      workerSkills: { minsoo: ["barista"], jiyoung: ["barista"], younghee: ["manager", "barista"], chulsoo: ["barista"], hana: ["barista"] },
      inventory: [
        { id: "espresso-beans", name: "Espresso beans", category: "coffee", unit: "kg", onHand: 5.4, parLevel: 9, reorderPoint: 3.5, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 24500, marketReferenceKey: "coffee_beans" },
        { id: "filter-beans", name: "Filter beans", category: "coffee", unit: "kg", onHand: 2.1, parLevel: 4, reorderPoint: 1.5, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 27000, marketReferenceKey: "coffee_beans" },
        { id: "whole-milk", name: "Whole milk", category: "dairy", unit: "l", onHand: 11.4, parLevel: 30, reorderPoint: 12, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 2500, marketReferenceKey: "milk", perishable: true },
        { id: "oat-milk", name: "Oat milk", category: "dairy-alt", unit: "l", onHand: 7, parLevel: 12, reorderPoint: 5, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 3900, perishable: true },
        { id: "vanilla-syrup", name: "Vanilla syrup", category: "syrup", unit: "l", onHand: 3.2, parLevel: 5, reorderPoint: 2, leadTimeDays: 4, supplierKind: "food", baseUnitCostKrw: 10500 },
        { id: "cocoa", name: "Cocoa / chocolate", category: "flavor", unit: "kg", onHand: 2.5, parLevel: 4, reorderPoint: 1.5, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 16000 },
        { id: "croissant", name: "Croissant", category: "pastry", unit: "ea", onHand: 18, parLevel: 36, reorderPoint: 12, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 1800, perishable: true },
        { id: "cup-16", name: "16 oz cups", category: "packaging", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 4, supplierKind: "packaging", baseUnitCostKrw: 47000 },
        { id: "lid-16", name: "16 oz lids", category: "packaging", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 4, supplierKind: "packaging", baseUnitCostKrw: 33000 },
        { id: "machine-cleaner", name: "Espresso machine cleaner", category: "cleaning", unit: "pack", onHand: 3, parLevel: 5, reorderPoint: 2, leadTimeDays: 5, supplierKind: "sanitation", baseUnitCostKrw: 14500 },
      ],
      menu: [
        { id: "americano", name: "Americano", category: "coffee", basePriceKrw: 4500, recipe: [{ inventoryItemId: "espresso-beans", quantity: 0.018, unit: "kg" }] },
        { id: "latte", name: "Caffè latte", category: "coffee", basePriceKrw: 5500, recipe: [{ inventoryItemId: "espresso-beans", quantity: 0.018, unit: "kg" }, { inventoryItemId: "whole-milk", quantity: 0.22, unit: "l" }] },
        { id: "oat-latte", name: "Oat latte", category: "coffee", basePriceKrw: 6200, recipe: [{ inventoryItemId: "espresso-beans", quantity: 0.018, unit: "kg" }, { inventoryItemId: "oat-milk", quantity: 0.22, unit: "l" }] },
        { id: "croissant-menu", name: "Croissant", category: "pastry", basePriceKrw: 4200, recipe: [{ inventoryItemId: "croissant", quantity: 1, unit: "ea" }] },
      ],
      closingTasks: ["Backflush espresso machine", "Record milk count", "Check refrigerator temperature", "Count pastries and note waste"],
    },
    copy: {
      scheduleContext: "Published coffee schedule · Seoul",
      peakLabel: "Rush window",
      incidentLabel: "Call-out",
      coverageLabel: "Bar coverage",
      disruptionTitle: "Friday evening coverage",
      disruptionBody: "Minsoo is currently assigned 18:00–22:00. Mark the call-out to compare the bounded recovery choices.",
      suggestedPrompt: "Minsoo called out before the rush window. Show me three options, but don't apply anything yet.",
      headline: "Rush window. Keep the bar covered.",
    },
    visual: { accent: "#3F6F5A", accentHover: "#315847", accentSoft: "#E5EFE9", canvas: "#F4F1EA", surface: "#FFFCF5", surfaceElevated: "#F9F5EB", ink: "#2C2925", secondaryInk: "#746E65", border: "#E5DED1", focusLane: "#E4EEE8", agentGlow: "#CFE1D7", radiusCard: "16px", radiusShift: "14px", motifOpacity: "0.03", motionTheme: "520ms", avatarAccessory: "apron" },
  },
  salon: {
    id: "salon",
    label: "Neighborhood salon",
    businessName: "Cut & Co.",
    roleLabels: { barista: "Stylist", manager: "Salon lead" },
    operations: {
      workerSkills: { minsoo: ["stylist", "cut"], jiyoung: ["stylist", "color"], younghee: ["manager", "stylist", "color"], chulsoo: ["stylist", "cut"], hana: ["stylist", "treatment"] },
      inventory: [
        { id: "shampoo", name: "Professional shampoo", category: "wash", unit: "l", onHand: 6, parLevel: 10, reorderPoint: 4, leadTimeDays: 4, supplierKind: "beauty", baseUnitCostKrw: 18000 },
        { id: "conditioner", name: "Professional conditioner", category: "wash", unit: "l", onHand: 5, parLevel: 9, reorderPoint: 3, leadTimeDays: 4, supplierKind: "beauty", baseUnitCostKrw: 19500 },
        { id: "color", name: "Hair color", category: "color", unit: "pack", onHand: 22, parLevel: 36, reorderPoint: 14, leadTimeDays: 5, supplierKind: "beauty", baseUnitCostKrw: 12500 },
        { id: "developer", name: "Developer", category: "color", unit: "l", onHand: 4, parLevel: 7, reorderPoint: 3, leadTimeDays: 5, supplierKind: "beauty", baseUnitCostKrw: 13000 },
        { id: "treatment", name: "Treatment product", category: "care", unit: "l", onHand: 3, parLevel: 6, reorderPoint: 2, leadTimeDays: 5, supplierKind: "beauty", baseUnitCostKrw: 28000 },
        { id: "gloves", name: "Nitrile gloves", category: "consumable", unit: "box", onHand: 3, parLevel: 6, reorderPoint: 2, leadTimeDays: 5, supplierKind: "beauty", baseUnitCostKrw: 12000 },
        { id: "foil", name: "Color foil", category: "consumable", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 5, supplierKind: "beauty", baseUnitCostKrw: 15000 },
        { id: "disinfectant", name: "Tool disinfectant", category: "cleaning", unit: "l", onHand: 2, parLevel: 4, reorderPoint: 1, leadTimeDays: 4, supplierKind: "sanitation", baseUnitCostKrw: 9500 },
        { id: "neck-strips", name: "Neck strips", category: "consumable", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 6, supplierKind: "beauty", baseUnitCostKrw: 14000 },
      ],
      menu: [
        { id: "cut", name: "Haircut", category: "service", basePriceKrw: 35000, recipe: [{ inventoryItemId: "shampoo", quantity: 0.012, unit: "l" }, { inventoryItemId: "neck-strips", quantity: 0.01, unit: "box" }] },
        { id: "color-service", name: "Color service", category: "service", basePriceKrw: 95000, recipe: [{ inventoryItemId: "color", quantity: 1, unit: "pack" }, { inventoryItemId: "developer", quantity: 0.12, unit: "l" }, { inventoryItemId: "gloves", quantity: 0.01, unit: "box" }] },
      ],
      closingTasks: ["Disinfect tools", "Count color/developer", "Laundry/towel check", "Review next-day color bookings"],
    },
    copy: {
      scheduleContext: "Published salon schedule · Seoul",
      peakLabel: "Booking peak",
      incidentLabel: "Call-out",
      coverageLabel: "Chair coverage",
      disruptionTitle: "Friday booking coverage",
      disruptionBody: "Minsoo is currently assigned 18:00–22:00. Mark the call-out to compare the bounded recovery choices.",
      suggestedPrompt: "Minsoo called out before the booking peak. Show me three options, but don't apply anything yet.",
      headline: "Booking peak. Protect every chair.",
    },
    visual: { accent: "#765E76", accentHover: "#5D495D", accentSoft: "#EFE7EF", canvas: "#F7F3F5", surface: "#FFFDFE", surfaceElevated: "#FAF5F8", ink: "#232126", secondaryInk: "#716A73", border: "#E5DDE5", focusLane: "#EEE4EE", agentGlow: "#DCCFDC", radiusCard: "9px", radiusShift: "8px", motifOpacity: "0.025", motionTheme: "440ms", avatarAccessory: "salon-apron", avatarDetail: "tool-badge" },
  },
  sushi: {
    id: "sushi",
    label: "Neighborhood sushi restaurant",
    businessName: "Neighborhood Sushi",
    roleLabels: { barista: "Floor crew", manager: "Shift lead" },
    operations: {
      workerSkills: { minsoo: ["service", "sushi-prep"], jiyoung: ["service"], younghee: ["manager", "service", "sushi-prep"], chulsoo: ["service", "sushi-prep"], hana: ["service"] },
      inventory: [
        { id: "sushi-rice", name: "Sushi rice", category: "staple", unit: "kg", onHand: 20, parLevel: 32, reorderPoint: 11, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 4800, marketReferenceKey: "rice" },
        { id: "rice-vinegar", name: "Rice vinegar", category: "seasoning", unit: "l", onHand: 4, parLevel: 7, reorderPoint: 2, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 7800 },
        { id: "nori", name: "Nori", category: "staple", unit: "pack", onHand: 16, parLevel: 26, reorderPoint: 9, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 9800 },
        { id: "salmon", name: "Salmon", category: "fish", unit: "kg", onHand: 6, parLevel: 10, reorderPoint: 4, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 24000, marketReferenceKey: "salmon", perishable: true },
        { id: "tuna", name: "Tuna", category: "fish", unit: "kg", onHand: 3, parLevel: 6, reorderPoint: 2, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 35000, marketReferenceKey: "tuna", perishable: true },
        { id: "soy-sauce", name: "Soy sauce", category: "seasoning", unit: "l", onHand: 8, parLevel: 12, reorderPoint: 4, leadTimeDays: 4, supplierKind: "food", baseUnitCostKrw: 5200 },
        { id: "ginger", name: "Pickled ginger", category: "garnish", unit: "kg", onHand: 3, parLevel: 5, reorderPoint: 2, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 7200 },
        { id: "cucumber", name: "Cucumber", category: "produce", unit: "kg", onHand: 4, parLevel: 7, reorderPoint: 2, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 3600, marketReferenceKey: "cucumber", perishable: true },
        { id: "sushi-tray", name: "Takeaway sushi trays", category: "packaging", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 4, supplierKind: "packaging", baseUnitCostKrw: 42000 },
        { id: "sanitizer", name: "Food-safe sanitizer", category: "cleaning", unit: "l", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 3, supplierKind: "sanitation", baseUnitCostKrw: 7500 },
      ],
      menu: [
        { id: "salmon-roll", name: "Salmon roll", category: "sushi", basePriceKrw: 14500, recipe: [{ inventoryItemId: "sushi-rice", quantity: 0.18, unit: "kg" }, { inventoryItemId: "nori", quantity: 0.08, unit: "pack" }, { inventoryItemId: "salmon", quantity: 0.11, unit: "kg" }, { inventoryItemId: "cucumber", quantity: 0.03, unit: "kg" }] },
        { id: "tuna-set", name: "Tuna set", category: "sushi", basePriceKrw: 22000, recipe: [{ inventoryItemId: "sushi-rice", quantity: 0.2, unit: "kg" }, { inventoryItemId: "tuna", quantity: 0.13, unit: "kg" }] },
      ],
      closingTasks: ["Record fish count", "Check cold holding", "Prepare rice target for tomorrow", "Sanitize sushi prep area"],
    },
    copy: {
      scheduleContext: "Published sushi schedule · Seoul",
      peakLabel: "Dinner service",
      incidentLabel: "Call-out",
      coverageLabel: "Service coverage",
      disruptionTitle: "Friday service coverage",
      disruptionBody: "Minsoo is currently assigned 18:00–22:00. Mark the call-out to compare the bounded recovery choices.",
      suggestedPrompt: "Minsoo called out before dinner service. Show me three options, but don't apply anything yet.",
      headline: "Dinner service. Keep the floor balanced.",
    },
    visual: { accent: "#246A67", accentHover: "#185552", accentSoft: "#E1F0EE", canvas: "#F1F5F3", surface: "#FFFDFC", surfaceElevated: "#F7FBFA", ink: "#1E2A2A", secondaryInk: "#657170", border: "#DCE7E4", focusLane: "#DDECEA", agentGlow: "#C9DFDC", radiusCard: "8px", radiusShift: "7px", motifOpacity: "0.025", motionTheme: "540ms", avatarAccessory: "headband" },
  },
  curry: {
    id: "curry",
    label: "Neighborhood curry house",
    businessName: "Curry House",
    roleLabels: { barista: "Service crew", manager: "Shift lead" },
    operations: {
      workerSkills: { minsoo: ["service", "prep"], jiyoung: ["service"], younghee: ["manager", "service", "prep"], chulsoo: ["service", "prep"], hana: ["service"] },
      inventory: [
        { id: "rice", name: "Rice", category: "staple", unit: "kg", onHand: 21, parLevel: 34, reorderPoint: 12, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 4300, marketReferenceKey: "rice" },
        { id: "onion", name: "Onion", category: "produce", unit: "kg", onHand: 10, parLevel: 18, reorderPoint: 6, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 2500, marketReferenceKey: "onion", perishable: true },
        { id: "potato", name: "Potato", category: "produce", unit: "kg", onHand: 9, parLevel: 16, reorderPoint: 6, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 3100, marketReferenceKey: "potato", perishable: true },
        { id: "carrot", name: "Carrot", category: "produce", unit: "kg", onHand: 6, parLevel: 11, reorderPoint: 4, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 3300, marketReferenceKey: "carrot", perishable: true },
        { id: "chicken", name: "Chicken", category: "protein", unit: "kg", onHand: 9, parLevel: 15, reorderPoint: 5, leadTimeDays: 1, supplierKind: "food", baseUnitCostKrw: 8500, marketReferenceKey: "chicken", perishable: true },
        { id: "curry-base", name: "Curry base / spice blend", category: "spice", unit: "kg", onHand: 5, parLevel: 8, reorderPoint: 3, leadTimeDays: 4, supplierKind: "food", baseUnitCostKrw: 16500 },
        { id: "cooking-oil", name: "Cooking oil", category: "staple", unit: "l", onHand: 7, parLevel: 12, reorderPoint: 4, leadTimeDays: 2, supplierKind: "food", baseUnitCostKrw: 4600, marketReferenceKey: "cooking_oil" },
        { id: "coconut-milk", name: "Coconut milk", category: "sauce", unit: "l", onHand: 5, parLevel: 9, reorderPoint: 3, leadTimeDays: 3, supplierKind: "food", baseUnitCostKrw: 6800 },
        { id: "takeout-box", name: "Takeout containers", category: "packaging", unit: "box", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 4, supplierKind: "packaging", baseUnitCostKrw: 38000 },
        { id: "sanitizer", name: "Food-safe sanitizer", category: "cleaning", unit: "l", onHand: 2, parLevel: 5, reorderPoint: 2, leadTimeDays: 3, supplierKind: "sanitation", baseUnitCostKrw: 7500 },
      ],
      menu: [
        { id: "chicken-curry", name: "Chicken curry", category: "meal", basePriceKrw: 13500, recipe: [{ inventoryItemId: "rice", quantity: 0.19, unit: "kg" }, { inventoryItemId: "chicken", quantity: 0.16, unit: "kg" }, { inventoryItemId: "onion", quantity: 0.08, unit: "kg" }, { inventoryItemId: "potato", quantity: 0.08, unit: "kg" }, { inventoryItemId: "curry-base", quantity: 0.04, unit: "kg" }] },
      ],
      closingTasks: ["Count rice and chicken", "Cool/store curry safely", "Prep onion/potato target", "Check takeout packaging"],
    },
    copy: {
      scheduleContext: "Published curry schedule · Seoul",
      peakLabel: "Dinner rush",
      incidentLabel: "Call-out",
      coverageLabel: "Service coverage",
      disruptionTitle: "Friday service coverage",
      disruptionBody: "Minsoo is currently assigned 18:00–22:00. Mark the call-out to compare the bounded recovery choices.",
      suggestedPrompt: "Minsoo called out before dinner rush. Show me three options, but don't apply anything yet.",
      headline: "Dinner rush. Keep service covered.",
    },
    visual: { accent: "#B27A18", accentHover: "#8B5C10", accentSoft: "#F7EDD7", canvas: "#FBF6E9", surface: "#FFFDF7", surfaceElevated: "#FFF8E9", ink: "#312A22", secondaryInk: "#776C5D", border: "#E9DFC9", focusLane: "#F5E8C8", agentGlow: "#EAD7A7", radiusCard: "16px", radiusShift: "15px", motifOpacity: "0.04", motionTheme: "480ms", avatarAccessory: "apron", avatarDetail: "badge" },
  },
};

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(INDUSTRY_PROFILES, value);
}

export function getIndustryProfile(industry: IndustryId): IndustryProfile {
  return INDUSTRY_PROFILES[industry];
}
