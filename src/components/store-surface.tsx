"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { applyStoreMasterDraft, storeMasterDraft, type StoreMasterDraft } from "@/domain/store-master";
import { getStoreSurfaceCopy } from "@/i18n/store-surface";
import { INTL_LOCALE } from "@/i18n";
import { storeIdForState } from "@/persistence/store-projection";
import { useAppState } from "@/state/app-state";

type Mode = "view" | "edit" | "review";
type Section = "basic" | "menu" | "inventory" | "suppliers" | "costs";
type User = { id: string; email?: string };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAMES: Record<string, Record<string, string>> = {
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  ko: { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" },
  ja: { mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日" },
  es: { mon: "Lun", tue: "Mar", wed: "Mié", thu: "Jue", fri: "Vie", sat: "Sáb", sun: "Dom" },
  "zh-CN": { mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日" },
};

function NumericInput({ value, onChange, disabled, step = "1" }: { value: number | undefined; onChange: (value: number) => void; disabled: boolean; step?: string }) {
  return <input type="number" min="0" step={step} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}/>;
}

export function StoreSurface() {
  const { state, runAction, locale } = useAppState();
  const ui = getStoreSurfaceCopy(locale);
  const [section, setSection] = useState<Section>("basic");
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState<StoreMasterDraft | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const money = useMemo(() => new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency: state.business.currency, maximumFractionDigits: 0 }), [locale, state.business.currency]);
  const disabled = mode !== "edit";
  const activeDraft = draft ?? storeMasterDraft(state);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ user: User }> : null)
      .then((payload) => { if (!controller.signal.aborted) { setUser(payload?.user ?? null); setAuthChecked(true); } })
      .catch(() => { if (!controller.signal.aborted) setAuthChecked(true); });
    return () => controller.abort();
  }, []);

  const mutate = (change: (next: StoreMasterDraft) => void) => setDraft((current) => {
    const next = structuredClone(current ?? storeMasterDraft(state));
    change(next);
    return next;
  });

  const beginEdit = () => {
    setMessage("");
    if (!user) { setMessage(ui.authRequired); return; }
    setDraft(storeMasterDraft(state));
    setMode("edit");
  };

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    const payload = await response.json() as { user?: User; error?: string };
    if (!response.ok || !payload.user) { setMessage(payload.error ?? ui.authRequired); return; }
    event.currentTarget.reset();
    setUser(payload.user);
  };

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    setMode("view");
    setDraft(null);
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/store-master", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: storeIdForState(state), master: draft }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Save failed.");
      runAction({ type: "import_state", state: applyStoreMasterDraft(state, draft) });
      setMode("view");
      setDraft(null);
      setMessage(ui.saved);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally { setSaving(false); }
  };

  return <section id="store" className="store-surface" aria-labelledby="store-title">
    <header className="store-surface-header">
      <div><span>OwnerOps · {ui.store}</span><h2 id="store-title">{ui.title}</h2><p>{ui.subtitle}</p></div>
      <div className="store-mode-actions">
        {mode === "view" && <button className="primary" onClick={beginEdit}>{ui.edit}</button>}
        {mode === "edit" && <><button className="secondary" onClick={() => { setMode("view"); setDraft(null); }}>{ui.cancel}</button><button className="primary" onClick={() => setMode("review")}>{ui.review}</button></>}
        {mode === "review" && <><button className="secondary" onClick={() => setMode("edit")}>{ui.edit}</button><button className="primary" disabled={saving} onClick={save}>{ui.save}</button></>}
      </div>
    </header>

    <div className="store-auth">
      {user ? <><span>{user.email}</span><button onClick={signOut}>{ui.signOut}</button></> : authChecked ? <form onSubmit={signIn}><strong>{ui.signIn}</strong><input name="email" type="email" autoComplete="username" aria-label={ui.email} placeholder={ui.email} required/><input name="password" type="password" autoComplete="current-password" aria-label={ui.password} placeholder={ui.password} required minLength={8}/><button type="submit">{ui.signIn}</button></form> : null}
      {message && <p role="status">{message}</p>}
    </div>

    <div className="store-tabs" role="tablist">
      {(["basic", "menu", "inventory", "suppliers", "costs"] as Section[]).map((key) => <button key={key} role="tab" aria-selected={section === key} onClick={() => setSection(key)}>{ui[key]}</button>)}
    </div>
    {mode === "review" && <div className="store-review-note"><strong>{ui.review}</strong><span>{ui.reviewHelp}</span></div>}

    <div className="store-section" data-mode={mode}>
      {section === "basic" && <>
        <div className="store-fields">
          <label><span>{ui.name}</span><input disabled={disabled} value={activeDraft.business.name} onChange={(event) => mutate((next) => { next.business.name = event.target.value; })}/></label>
          <label><span>{ui.laborTarget}</span><NumericInput disabled={disabled} step="0.01" value={activeDraft.business.targetLaborRatio} onChange={(value) => mutate((next) => { next.business.targetLaborRatio = value; })}/></label>
          <label><span>{ui.foodTarget}</span><NumericInput disabled={disabled} step="0.01" value={activeDraft.business.targetFoodCostRatio} onChange={(value) => mutate((next) => { next.business.targetFoodCostRatio = value; })}/></label>
        </div>
        <h3>{ui.hours}</h3><div className="opening-hours">
          {DAYS.map((day) => { const hours = activeDraft.business.openingHours?.[day] ?? null; return <div key={day}><strong>{DAY_NAMES[locale][day]}</strong><label><input type="checkbox" checked={Boolean(hours)} disabled={disabled} onChange={(event) => mutate((next) => { next.business.openingHours ??= {}; next.business.openingHours[day] = event.target.checked ? { open: "09:00", close: "18:00" } : null; })}/>{hours ? "" : ui.closed}</label>{hours && <><input type="time" disabled={disabled} value={hours.open} onChange={(event) => mutate((next) => { const value = next.business.openingHours?.[day]; if (value) value.open = event.target.value; })}/><input type="time" disabled={disabled} value={hours.close} onChange={(event) => mutate((next) => { const value = next.business.openingHours?.[day]; if (value) value.close = event.target.value; })}/></>}</div>; })}
        </div>
      </>}

      {section === "menu" && <div className="store-list">{activeDraft.menu.length ? activeDraft.menu.map((item, index) => <article key={item.id}>
        <div className="store-row"><label><span>{ui.name}</span><input disabled={disabled} value={item.name} onChange={(event) => mutate((next) => { next.menu[index].name = event.target.value; })}/></label><label><span>{ui.category}</span><input disabled={disabled} value={item.category} onChange={(event) => mutate((next) => { next.menu[index].category = event.target.value; })}/></label><label><span>{ui.price}</span><NumericInput disabled={disabled} value={item.price} onChange={(value) => mutate((next) => { next.menu[index].price = value; })}/></label><label className="store-check"><input type="checkbox" disabled={disabled} checked={item.active} onChange={(event) => mutate((next) => { next.menu[index].active = event.target.checked; })}/>{ui.active}</label></div>
        <details><summary>{ui.recipe} · {item.recipe.length}</summary>{item.recipe.map((line, lineIndex) => <div className="recipe-line" key={`${"inventoryItemId" in line ? line.inventoryItemId : line.prepItemId}-${lineIndex}`}><code>{"inventoryItemId" in line ? line.inventoryItemId : line.prepItemId}</code><NumericInput disabled={disabled} step="0.01" value={line.quantity} onChange={(value) => mutate((next) => { next.menu[index].recipe[lineIndex].quantity = value; })}/><input disabled={disabled} value={line.unit} onChange={(event) => mutate((next) => { next.menu[index].recipe[lineIndex].unit = event.target.value as typeof line.unit; })}/></div>)}</details>
      </article>) : <p>{ui.empty}</p>}</div>}

      {section === "inventory" && <><p className="store-boundary">{ui.readOnly}</p><div className="store-list">{activeDraft.inventory.length ? activeDraft.inventory.map((item, index) => <article key={item.id}><div className="store-row"><label><span>{ui.name}</span><input disabled={disabled} value={item.name} onChange={(event) => mutate((next) => { next.inventory[index].name = event.target.value; })}/></label><label><span>{ui.category}</span><input disabled={disabled} value={item.category} onChange={(event) => mutate((next) => { next.inventory[index].category = event.target.value; })}/></label><label><span>{ui.par}</span><NumericInput disabled={disabled} value={item.parLevel} onChange={(value) => mutate((next) => { next.inventory[index].parLevel = value; })}/></label><label><span>{ui.reorder}</span><NumericInput disabled={disabled} value={item.reorderPoint} onChange={(value) => mutate((next) => { next.inventory[index].reorderPoint = value; })}/></label><label><span>{ui.lead}</span><NumericInput disabled={disabled} value={item.leadTimeDays} onChange={(value) => mutate((next) => { next.inventory[index].leadTimeDays = value; })}/></label></div><div className="readonly-facts"><span>{ui.onHand}: <strong>{item.onHand} {item.unit}</strong></span><span>{ui.lastCost}: <strong>{item.lastPurchaseUnitCost === undefined ? "—" : money.format(item.lastPurchaseUnitCost)} / {item.unit}</strong></span><span>{ui.supplier}: <strong>{activeDraft.suppliers.find((supplier) => supplier.id === item.supplierId)?.name ?? "—"}</strong></span></div></article>) : <p>{ui.empty}</p>}</div></>}

      {section === "suppliers" && <div className="supplier-grid">{activeDraft.suppliers.length ? activeDraft.suppliers.map((supplier) => <article key={supplier.id}><strong>{supplier.name}</strong><span>{supplier.contactLabel ?? "—"}</span><span>{ui.lead}: {supplier.defaultLeadTimeDays}</span></article>) : <p>{ui.empty}</p>}</div>}

      {section === "costs" && activeDraft.business.occupancy && activeDraft.business.operatingCosts && <div className="store-cost-groups">
        <fieldset><legend>{ui.occupancy}</legend><label><span>{ui.rent}</span><NumericInput disabled={disabled} value={activeDraft.business.occupancy.baseRentMonthly} onChange={(value) => mutate((next) => { if (next.business.occupancy) next.business.occupancy.baseRentMonthly = value; })}/></label><label><span>{ui.fees}</span><NumericInput disabled={disabled} value={activeDraft.business.occupancy.recurringFeesMonthly} onChange={(value) => mutate((next) => { if (next.business.occupancy) next.business.occupancy.recurringFeesMonthly = value; })}/></label></fieldset>
        <fieldset><legend>{ui.variable}</legend>{(["packagingAndConsumables", "paymentProcessing", "deliveryAndMarketplace"] as const).map((key) => <label key={key}><span>{key === "packagingAndConsumables" ? ui.packaging : key === "paymentProcessing" ? ui.processing : ui.delivery}</span><NumericInput disabled={disabled} step="0.001" value={activeDraft.business.operatingCosts?.variableRates[key]} onChange={(value) => mutate((next) => { if (next.business.operatingCosts) next.business.operatingCosts.variableRates[key] = value; })}/></label>)}</fieldset>
        <fieldset><legend>{ui.fixed}</legend>{(["utilities", "softwareSecurityRentals", "marketing", "other"] as const).map((key) => <label key={key}><span>{key === "utilities" ? ui.utilities : key === "softwareSecurityRentals" ? ui.software : key === "marketing" ? ui.marketing : ui.other}</span><NumericInput disabled={disabled} value={activeDraft.business.operatingCosts?.fixedMonthly[key]} onChange={(value) => mutate((next) => { if (next.business.operatingCosts) next.business.operatingCosts.fixedMonthly[key] = value; })}/></label>)}</fieldset>
      </div>}
    </div>
  </section>;
}
