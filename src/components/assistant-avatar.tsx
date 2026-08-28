"use client";

import { useEffect, useRef } from "react";
import type { AppState } from "@/domain/model";
import type { AvatarAccessory, AvatarDetail } from "@/industry/profiles";

type AvatarState = AppState["activity"]["state"];

type AssistantAvatarProps = {
  state: AvatarState;
  accessory: AvatarAccessory;
  detail?: AvatarDetail;
};

function cancelAnimations(element: SVGElement | null) {
  element?.getAnimations().forEach((animation) => animation.cancel());
}

function playGesture(element: SVGElement | null, keyframes: Keyframe[], duration: number) {
  element?.animate(keyframes, { duration, easing: "ease-out", fill: "both" });
}

export function AssistantAvatar({ state, accessory, detail }: AssistantAvatarProps) {
  const headRef = useRef<SVGGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const previousStateRef = useRef<AvatarState | null>(null);

  useEffect(() => {
    const head = headRef.current;
    const eyes = eyesRef.current;
    const previousState = previousStateRef.current;
    previousStateRef.current = state;
    cancelAnimations(head);
    cancelAnimations(eyes);
    if (!previousState || previousState === state || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    switch (state) {
      case "listening":
        playGesture(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(1.5deg)" }, { transform: "rotate(0deg)" }], 320);
        break;
      case "checking":
        playGesture(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(-2deg)" }, { transform: "rotate(0deg)" }], 360);
        playGesture(eyes, [{ transform: "translateX(0)" }, { transform: "translateX(-2px)" }, { transform: "translateX(1px)" }, { transform: "translateX(0)" }], 420);
        break;
      case "proposalReady":
        playGesture(head, [{ transform: "translateY(0)" }, { transform: "translateY(1px)" }, { transform: "translateY(0)" }], 360);
        break;
      case "reviewNeeded":
        playGesture(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(-3deg)" }, { transform: "rotate(0deg)" }], 420);
        playGesture(eyes, [{ transform: "translateX(0)" }, { transform: "translateX(-2px)" }, { transform: "translateX(0)" }], 420);
        break;
      case "reviewed":
        playGesture(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(1.5deg)" }, { transform: "rotate(0deg)" }], 360);
        break;
      case "warning":
        playGesture(head, [{ transform: "rotate(0deg)" }, { transform: "rotate(-1.5deg)" }, { transform: "rotate(0deg)" }], 360);
        break;
      case "applied":
        playGesture(head, [{ transform: "translateY(0)" }, { transform: "translateY(1px)" }, { transform: "translateY(0)" }], 320);
        break;
      default:
        break;
    }

    return () => {
      cancelAnimations(head);
      cancelAnimations(eyes);
    };
  }, [state]);

  const apron = accessory === "apron" || accessory === "salon-apron";
  const salonApron = accessory === "salon-apron";

  return (
    <div className={`avatar avatar-${state}`} aria-label={`Assistant status: ${state}`}>
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="avatarFace" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#d9e7e1"/><stop offset="1" stopColor="#9fbcb1"/></linearGradient>
          <filter id="avatarShadow"><feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity=".16"/></filter>
        </defs>
        <g className="avatar-shadow"><ellipse cx="60" cy="103" rx="37" ry="9" fill="#1f3930" opacity=".12"/></g>
        <g className="avatar-body">
          <path d="M30 99c2-24 13-35 30-35s28 11 30 35" fill={salonApron ? "#354047" : "#344f46"} filter="url(#avatarShadow)"/>
          {apron && <path d="M44 67l7-5h18l7 5 8 32H36l8-32Z" fill={salonApron ? "#30383d" : "var(--oo-accent, #344f46)"} opacity=".96"/>}
          {detail === "name-tag" && <rect x="51" y="78" width="18" height="7" rx="2" fill="#f4e2c8" stroke="#c99b67" strokeWidth="1"/>}
          {detail === "badge" && <circle cx="60" cy="82" r="5" fill="#f5e6b9" stroke="#c18f28" strokeWidth="1.5"/>}
          {detail === "tool-badge" && <g><circle cx="60" cy="82" r="5" fill="#e5dcea" stroke="#887692" strokeWidth="1.5"/><path d="M57 82h6m-3-3v6" stroke="#6a5d6e" strokeWidth="1.2" strokeLinecap="round"/></g>}
        </g>
        <g ref={headRef} className="avatar-head">
          <rect x="34" y="18" width="52" height="56" rx="25" fill="url(#avatarFace)" filter="url(#avatarShadow)"/>
          <g className="avatar-face">
            <path d="M42 29c9-10 29-12 39 1" fill="none" stroke="#eef5f2" strokeWidth="5" strokeLinecap="round" opacity=".75"/>
            <g ref={eyesRef} className="avatar-eyes"><circle cx="51" cy="47" r="3.5" fill="#203c33"/><circle cx="69" cy="47" r="3.5" fill="#203c33"/></g>
            <path className="avatar-mouth" d="M53 59c4 3 10 3 14 0" fill="none" stroke="#49675d" strokeWidth="2.5" strokeLinecap="round"/>
          </g>
          <g className={`avatar-accessory avatar-accessory-${accessory}`}>
            {accessory === "cap" && <><path d="M42 26c4-8 11-12 18-12s15 4 18 12" fill="var(--oo-accent, #3f5a4f)"/><path d="M36 24h48c3 0 5 2 5 4s-2 4-5 4H36c-3 0-5-2-5-4s2-4 5-4Z" fill="var(--oo-accent, #3f5a4f)"/></>}
            {accessory === "chef-cap" && <><path d="M40 27c-4-4-2-11 4-12 0-6 8-8 12-3 4-5 12-3 12 3 7-1 10 7 5 12Z" fill="var(--oo-accent, #b24f3d)"/><path d="M38 25h45c3 0 4 2 4 4s-1 4-4 4H38c-3 0-5-2-5-4s2-4 5-4Z" fill="var(--oo-accent, #b24f3d)"/></>}
            {accessory === "headband" && <path d="M35 31c15 5 35 5 50 0v6c-15 5-35 5-50 0Z" fill="var(--oo-accent, #216565)" opacity=".95"/>}
          </g>
        </g>
        <g className="avatar-signal"><circle cx="88" cy="25" r="7" fill="var(--oo-accent, #39775f)" stroke="#f6f8f7" strokeWidth="3"/></g>
      </svg>
    </div>
  );
}
