"use client";

import { Check, Flag } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Moods, PHONE_SHOTS, SHOT_TABS, Saved, StatusBar, TAB_NAMES } from "./phone-parts";

const SCREENS = PHONE_SHOTS;
const AUTO_MS = 4500;

/**
 * The hero phone: four screenshots of the real app. Its own tab bar (invisible buttons laid over the
 * screenshot's tab bar) and the switch below it change the screen; it
 * moves on by itself every 4.5 s until the visitor touches it (never with reduced motion), pauses
 * while the pointer is over it, and swipes on touch screens. The floating cards change with it.
 */
export function HeroPhone() {
  const [screen, setScreen] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (!auto || hover) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setScreen((s) => (s + 1) % SCREENS.length), AUTO_MS);
    return () => window.clearInterval(id);
  }, [auto, hover]);

  const go = (i: number) => {
    setScreen(i);
    setAuto(false);
  };
  const on = (i: number) => (screen === i ? " on" : "");

  return (
    <div
      className="stage"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
    >
      <div
        className="phone-area"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null) return;
          const dx = end - start;
          if (Math.abs(dx) > 40) go((screen + (dx < 0 ? 1 : SCREENS.length - 1)) % SCREENS.length);
        }}
      >
        <div className="phone" role="group" aria-label="Ledge app preview">
          <div className="screen">
            <StatusBar />
            <div className="shot">
              {SCREENS.map((shot, i) => (
                <Image
                  key={shot.src}
                  src={shot.src}
                  alt={shot.alt}
                  width={1170}
                  height={2172}
                  sizes="(max-width: 600px) 300px, 320px"
                  priority={i === 0}
                  className={`shot-img${on(i)}`}
                  aria-hidden={screen !== i}
                />
              ))}
              <div className="shot-tabs" role="tablist" aria-label="App sections">
                {SHOT_TABS.map((pos, i) => (
                  <button
                    key={TAB_NAMES[i]}
                    type="button"
                    role="tab"
                    aria-selected={screen === i}
                    aria-label={TAB_NAMES[i]}
                    style={pos}
                    onClick={() => go(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="fls">
          <FloatGroup on={screen === 0}>
            <div className="fl r">
              <p className="eb">Due today</p>
              <p className="tt">Call mom</p>
              <PlanChips items={["Today", "Home"]} />
            </div>
            <div className="fl l tst">
              <span className="toast">
                <span className="ok">
                  <Check className="i xs" aria-hidden />
                </span>
                <span>
                  <span className="money">₹640</span> logged
                </span>
                <span className="undo">Undo</span>
              </span>
            </div>
          </FloatGroup>
          <FloatGroup on={screen === 1}>
            <div className="fl r">
              <p className="eb">Quick add understood</p>
              <p className="tt">Pay rent</p>
              <PlanChips items={["Tomorrow", "5:00 pm", "Home"]} high />
            </div>
            <div className="fl l">
              <p className="eb">In words, not just red</p>
              <p className="tt" style={{ margin: 0 }}>
                Overdue · 5 days
              </p>
              <p className="p-sub" style={{ marginTop: 4 }}>
                Send monthly invoice
              </p>
            </div>
          </FloatGroup>
          <FloatGroup on={screen === 2}>
            <div className="fl r">
              <p className="eb">November</p>
              <div className="kv">
                <span>Inflows</span>
                <span className="money">₹28,000</span>
              </div>
              <div className="kv">
                <span>− EMIs</span>
                <span className="money">₹10,142</span>
              </div>
              <div className="kv">
                <span>− Expenses</span>
                <span className="money">₹4,600</span>
              </div>
              <div className="kv tot">
                <span>Net savings</span>
                <span className="money">₹13,258</span>
              </div>
            </div>
            <div className="fl l">
              <p className="eb">Need or want</p>
              <p className="tt" style={{ margin: "0 0 8px" }}>
                Swiggy lunch · <span className="money">₹640</span>
              </p>
              <div className="chips">
                <span className="chip sm">Dining</span>
                <span className="chip sm">UPI</span>
                <span className="chip sm sel">Want</span>
              </div>
            </div>
          </FloatGroup>
          <FloatGroup on={screen === 3}>
            <div className="fl r">
              <p className="eb">How was today?</p>
              <div style={{ marginBottom: 12 }}>
                <Moods />
              </div>
              <Saved />
            </div>
            <div className="fl l">
              <p className="eb">Filled in for you</p>
              <p className="p-sub" style={{ color: "var(--ink)" }}>
                The facts at the top come from Tasks and Money. Tap one to open it.
              </p>
            </div>
          </FloatGroup>
        </div>
      </div>
      <div className="switch" role="group" aria-label="Screens">
        {TAB_NAMES.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`sw${on(i)}`}
            aria-pressed={screen === i}
            onClick={() => go(i)}
          >
            <span className="dot" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FloatGroup({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div className={`flg${on ? " on" : ""}`} aria-hidden={!on}>
      {children}
    </div>
  );
}

function PlanChips({ items, high }: { items: string[]; high?: boolean }) {
  return (
    <div className="chips">
      {items.map((item) => (
        <span key={item} className="chip sm">
          {item}
        </span>
      ))}
      {high ? (
        <span className="chip sm">
          <Flag className="i xs flag" aria-hidden />
          High
        </span>
      ) : null}
    </div>
  );
}
