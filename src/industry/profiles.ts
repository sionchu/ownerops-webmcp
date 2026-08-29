import type { IndustryId, WorkerRole } from "@/domain/model";

export type AvatarAccessory = "cap" | "chef-cap" | "apron" | "salon-apron" | "headband";
export type AvatarDetail = "name-tag" | "badge" | "tool-badge";

export type IndustryProfile = {
  id: IndustryId;
  label: string;
  businessName: string;
  roleLabels: Record<WorkerRole, string>;
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
    surfaceTint: string;
    canvas: string;
    surface: string;
    ink: string;
    secondaryInk: string;
    radiusStyle: string;
    motif: string;
    motionStyle: string;
    avatarAccessory: AvatarAccessory;
    avatarDetail?: AvatarDetail;
  };
};

export const INDUSTRY_PROFILES: Record<IndustryId, IndustryProfile> = {
  diner: {
    id: "diner",
    label: "Neighborhood diner",
    businessName: "Good Shift Diner",
    roleLabels: { barista: "Crew", manager: "Shift lead" },
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
    visual: { accent: "#9b5947", accentHover: "#7f4536", accentSoft: "#f5e8e2", surfaceTint: "#f7f0eb", canvas: "#f6f0e9", surface: "#fffdf9", ink: "#242a2d", secondaryInk: "#6e6862", radiusStyle: "12px", motif: "diner", motionStyle: "crisp", avatarAccessory: "cap", avatarDetail: "name-tag" },
  },
  pizza: {
    id: "pizza",
    label: "Neighborhood pizza shop",
    businessName: "Slice House",
    roleLabels: { barista: "Counter crew", manager: "Shift lead" },
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
    visual: { accent: "#b24f3d", accentHover: "#923d30", accentSoft: "#f8e6e2", surfaceTint: "#fbf3ee", canvas: "#faf2e9", surface: "#fffdf9", ink: "#302722", secondaryInk: "#75665e", radiusStyle: "18px", motif: "pizza", motionStyle: "snappy", avatarAccessory: "chef-cap" },
  },
  coffee: {
    id: "coffee",
    label: "Neighborhood coffee shop",
    businessName: "Corner Coffee",
    roleLabels: { barista: "Barista", manager: "Manager" },
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
    visual: { accent: "#4f7664", accentHover: "#3c5e50", accentSoft: "#e5efe9", surfaceTint: "#f1f5f1", canvas: "#f1f0e9", surface: "#fffdf8", ink: "#27352e", secondaryInk: "#69736b", radiusStyle: "18px", motif: "coffee", motionStyle: "calm", avatarAccessory: "apron" },
  },
  salon: {
    id: "salon",
    label: "Neighborhood salon",
    businessName: "Cut & Co.",
    roleLabels: { barista: "Stylist", manager: "Salon lead" },
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
    visual: { accent: "#6a5d6e", accentHover: "#514654", accentSoft: "#eee8ef", surfaceTint: "#f5f2f4", canvas: "#f5f2f3", surface: "#fffefe", ink: "#252126", secondaryInk: "#716a72", radiusStyle: "6px", motif: "salon", motionStyle: "smooth", avatarAccessory: "salon-apron", avatarDetail: "tool-badge" },
  },
  sushi: {
    id: "sushi",
    label: "Neighborhood sushi restaurant",
    businessName: "Neighborhood Sushi",
    roleLabels: { barista: "Floor crew", manager: "Shift lead" },
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
    visual: { accent: "#216565", accentHover: "#155250", accentSoft: "#e1f0ef", surfaceTint: "#eef6f5", canvas: "#f3f5f2", surface: "#fffffc", ink: "#1f2b2c", secondaryInk: "#63706d", radiusStyle: "7px", motif: "sushi", motionStyle: "deliberate", avatarAccessory: "headband" },
  },
  curry: {
    id: "curry",
    label: "Neighborhood curry house",
    businessName: "Curry House",
    roleLabels: { barista: "Service crew", manager: "Shift lead" },
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
    visual: { accent: "#a87619", accentHover: "#885c10", accentSoft: "#f7eed9", surfaceTint: "#fbf6e8", canvas: "#fbf4e3", surface: "#fffdf7", ink: "#382d1d", secondaryInk: "#766852", radiusStyle: "18px", motif: "curry", motionStyle: "warm", avatarAccessory: "apron", avatarDetail: "badge" },
  },
};

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(INDUSTRY_PROFILES, value);
}

export function getIndustryProfile(industry: IndustryId): IndustryProfile {
  return INDUSTRY_PROFILES[industry];
}
