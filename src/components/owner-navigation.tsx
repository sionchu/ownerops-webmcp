"use client";

import { getStoreSurfaceCopy } from "@/i18n/store-surface";
import { useAppState } from "@/state/app-state";

export function OwnerNavigation() {
  const { locale } = useAppState();
  const ui = getStoreSurfaceCopy(locale);
  return <nav className="owner-navigation" aria-label="OwnerOps">
    <a href="#today">{ui.today}</a><a href="#schedule">{ui.schedule}</a><a href="#analysis">{ui.analysis}</a><a href="#store">{ui.store}</a>
  </nav>;
}
