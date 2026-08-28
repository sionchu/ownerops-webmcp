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
  };
  visual: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    surfaceTint: string;
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
    },
    visual: { accent: "#9b5947", accentHover: "#7f4536", accentSoft: "#f5e8e2", surfaceTint: "#f7f0eb", avatarAccessory: "cap", avatarDetail: "name-tag" },
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
    },
    visual: { accent: "#b24f3d", accentHover: "#923d30", accentSoft: "#f8e6e2", surfaceTint: "#fbf3ee", avatarAccessory: "chef-cap" },
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
    },
    visual: { accent: "#4f7664", accentHover: "#3c5e50", accentSoft: "#e5efe9", surfaceTint: "#f1f5f1", avatarAccessory: "apron" },
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
    },
    visual: { accent: "#6a5d6e", accentHover: "#514654", accentSoft: "#eee8ef", surfaceTint: "#f5f2f4", avatarAccessory: "salon-apron", avatarDetail: "tool-badge" },
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
    },
    visual: { accent: "#216565", accentHover: "#155250", accentSoft: "#e1f0ef", surfaceTint: "#eef6f5", avatarAccessory: "headband" },
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
    },
    visual: { accent: "#a87619", accentHover: "#885c10", accentSoft: "#f7eed9", surfaceTint: "#fbf6e8", avatarAccessory: "apron", avatarDetail: "badge" },
  },
};

export function isIndustryId(value: unknown): value is IndustryId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(INDUSTRY_PROFILES, value);
}

export function getIndustryProfile(industry: IndustryId): IndustryProfile {
  return INDUSTRY_PROFILES[industry];
}
