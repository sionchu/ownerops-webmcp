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
    visual: { accent: "#A84F3D", accentHover: "#873B2D", accentSoft: "#F6E5DF", canvas: "#F8F3EC", surface: "#FFFDF9", surfaceElevated: "#FFF9F2", ink: "#20282C", secondaryInk: "#6F6A64", border: "#E8DED3", focusLane: "#F4E1D9", agentGlow: "#EBCFC5", radiusCard: "12px", radiusShift: "12px", motifOpacity: "0.035", motionTheme: "460ms", avatarAccessory: "cap", avatarDetail: "name-tag" },
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
    visual: { accent: "#C8513B", accentHover: "#9E3E2E", accentSoft: "#F9E5DE", canvas: "#FBF3E9", surface: "#FFFDF8", surfaceElevated: "#FFF7EE", ink: "#302722", secondaryInk: "#75665E", border: "#EBDDCF", focusLane: "#F8DDD3", agentGlow: "#F0C9BC", radiusCard: "18px", radiusShift: "16px", motifOpacity: "0.05", motionTheme: "400ms", avatarAccessory: "chef-cap" },
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
    visual: { accent: "#3F6F5A", accentHover: "#315847", accentSoft: "#E5EFE9", canvas: "#F4F1EA", surface: "#FFFCF5", surfaceElevated: "#F9F5EB", ink: "#2C2925", secondaryInk: "#746E65", border: "#E5DED1", focusLane: "#E4EEE8", agentGlow: "#CFE1D7", radiusCard: "16px", radiusShift: "14px", motifOpacity: "0.03", motionTheme: "520ms", avatarAccessory: "apron" },
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
    visual: { accent: "#765E76", accentHover: "#5D495D", accentSoft: "#EFE7EF", canvas: "#F7F3F5", surface: "#FFFDFE", surfaceElevated: "#FAF5F8", ink: "#232126", secondaryInk: "#716A73", border: "#E5DDE5", focusLane: "#EEE4EE", agentGlow: "#DCCFDC", radiusCard: "9px", radiusShift: "8px", motifOpacity: "0.025", motionTheme: "440ms", avatarAccessory: "salon-apron", avatarDetail: "tool-badge" },
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
    visual: { accent: "#246A67", accentHover: "#185552", accentSoft: "#E1F0EE", canvas: "#F1F5F3", surface: "#FFFDFC", surfaceElevated: "#F7FBFA", ink: "#1E2A2A", secondaryInk: "#657170", border: "#DCE7E4", focusLane: "#DDECEA", agentGlow: "#C9DFDC", radiusCard: "8px", radiusShift: "7px", motifOpacity: "0.025", motionTheme: "540ms", avatarAccessory: "headband" },
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
    visual: { accent: "#B27A18", accentHover: "#8B5C10", accentSoft: "#F7EDD7", canvas: "#FBF6E9", surface: "#FFFDF7", surfaceElevated: "#FFF8E9", ink: "#312A22", secondaryInk: "#776C5D", border: "#E9DFC9", focusLane: "#F5E8C8", agentGlow: "#EAD7A7", radiusCard: "16px", radiusShift: "15px", motifOpacity: "0.04", motionTheme: "480ms", avatarAccessory: "apron", avatarDetail: "badge" },
  },
};

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(INDUSTRY_PROFILES, value);
}

export function getIndustryProfile(industry: IndustryId): IndustryProfile {
  return INDUSTRY_PROFILES[industry];
}
