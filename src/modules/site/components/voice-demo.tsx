"use client";

import {
  Calendar,
  Check,
  CircleCheck,
  Flag,
  Folder,
  Fuel,
  Keyboard,
  Landmark,
  ListPlus,
  Mic,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import { parseQuickAdd, tokenKey, type TokenKind } from "@/modules/todos/quick-add-parser";
import {
  DEMO_LISTS,
  DEMO_TODAY,
  TYPE_EXAMPLES,
  VOICE_EXAMPLES,
  type VoiceCardType,
} from "../content";

type Stage = "idle" | "hold" | "listen" | "review" | "added" | "undone";

const HOLD_MS = 500; // the app's hold time (docs/voice-spec.md §3)
const CARD_ICONS: Record<VoiceCardType, typeof Fuel> = {
  expense: Fuel,
  emi: Landmark,
  list: ListPlus,
  task: CircleCheck,
};
const TOKEN_ICONS: Record<TokenKind, typeof Calendar> = {
  date: Calendar,
  list: Folder,
  priority: Flag,
};

/**
 * "Say it. Or type it.": a pretend voice capture that plays the app's real flow (hold +, listen,
 * review cards, Add, one Undo) in a loop, and a Type tab that runs the app's own quick-add parser.
 * Nothing leaves the page: no microphone, no network.
 */
export function VoiceDemo() {
  const [mode, setMode] = useState<"speak" | "type">("speak");
  const [stage, setStage] = useState<Stage>("idle");
  const [example, setExample] = useState(0);
  const [typed, setTyped] = useState(0);
  const [secs, setSecs] = useState(0);
  const [hint, setHint] = useState("Hold + for half a second");
  const autoRef = useRef(true);
  const timers = useRef<number[]>([]);

  // Plain functions: they only touch refs and state setters, so a timer that calls one later is
  // never working with stale values.
  function clear() {
    timers.current.forEach((t) => {
      window.clearTimeout(t);
      window.clearInterval(t);
    });
    timers.current = [];
  }
  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }
  function addCards(ex: number) {
    clear();
    setStage("added");
    if (autoRef.current) later(() => run((ex + 1) % VOICE_EXAMPLES.length, true), 3400);
  }
  function review(ex: number) {
    clear();
    setTyped(VOICE_EXAMPLES[ex].said.length);
    setStage("review");
    if (autoRef.current) later(() => addCards(ex), 2600);
  }
  function listen(ex: number) {
    const length = VOICE_EXAMPLES[ex].said.length;
    setStage("listen");
    setTyped(0);
    setSecs(0);
    let n = 0;
    timers.current.push(window.setInterval(() => setSecs((s) => s + 1), 1000));
    timers.current.push(
      window.setInterval(() => {
        if (n < 0) return;
        n += 2;
        if (n >= length) {
          setTyped(length);
          n = -1; // stop; review() clears the interval
          later(() => review(ex), 650);
        } else {
          setTyped(n);
        }
      }, 45),
    );
  }
  function run(ex: number, auto: boolean) {
    clear();
    autoRef.current = auto;
    setExample(ex);
    setTyped(0);
    setSecs(0);
    setStage("hold");
    later(() => listen(ex), HOLD_MS + 20);
  }

  // Start the loop once; with reduced motion, show the review cards and never animate.
  const start = useEffectEvent(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      autoRef.current = false;
      later(() => review(0), 0);
      return;
    }
    later(() => run(0, true), 1400);
  });
  const stop = useEffectEvent(() => clear());
  useEffect(() => {
    start();
    return () => stop();
  }, []);

  const ex = VOICE_EXAMPLES[example];
  const onStage = stage === "idle" || stage === "hold" || stage === "listen" || stage === "undone";

  const pointerDown = () => {
    if (stage === "listen" || stage === "review") return;
    clear();
    autoRef.current = false;
    setTyped(0);
    setSecs(0);
    setStage("hold");
    later(() => listen(example), HOLD_MS);
  };
  const pointerUp = () => {
    if (stage === "hold") {
      clear();
      setStage("idle");
      setHint("Hold a little longer, half a second");
    }
  };

  return (
    <div className="demo">
      <div className="demo-h">
        <div className="seg" role="tablist" aria-label="Input method">
          <button
            type="button"
            role="tab"
            className={mode === "speak" ? "on" : ""}
            aria-selected={mode === "speak"}
            onClick={() => setMode("speak")}
          >
            <Mic className="i s" aria-hidden />
            Speak
          </button>
          <button
            type="button"
            role="tab"
            className={mode === "type" ? "on" : ""}
            aria-selected={mode === "type"}
            onClick={() => {
              clear();
              autoRef.current = false;
              setStage("idle");
              setMode("type");
            }}
          >
            <Keyboard className="i s" aria-hidden />
            Type
          </button>
        </div>
        <span className="kbd">{mode === "speak" ? "Hold + · 0.5 s" : "Press Q"}</span>
      </div>

      <AutoHeight>
        {mode === "speak" ? (
          <>
            {onStage ? (
              <div className="vstage">
                <button
                  type="button"
                  className={`vbtn${stage === "hold" ? " hold" : stage === "listen" ? " live" : ""}`}
                  aria-label="Hold to speak"
                  onPointerDown={pointerDown}
                  onPointerUp={pointerUp}
                  onPointerLeave={pointerUp}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (stage !== "listen") run(example, false);
                    }
                  }}
                >
                  <svg className="rg" viewBox="0 0 108 108" aria-hidden>
                    <circle cx="54" cy="54" r="50" />
                  </svg>
                  <Plus className="i l" aria-hidden />
                </button>
                {stage === "listen" ? (
                  <div className="listen">
                    <b>Listening…</b>
                    <div className="meter" aria-hidden>
                      {Array.from({ length: 12 }, (_, i) => (
                        <i key={i} />
                      ))}
                    </div>
                    <span>0:{String(secs).padStart(2, "0")}</span>
                  </div>
                ) : (
                  <p className="vhint">
                    {stage === "hold"
                      ? "Keep holding…"
                      : stage === "undone"
                        ? "Undone. Everything from that command is gone."
                        : hint}
                  </p>
                )}
                <p className="tr" aria-live="polite">
                  {stage === "listen" ? ex.said.slice(0, typed) : ""}
                </p>
                {stage === "listen" ? (
                  <button
                    type="button"
                    className="btn-line"
                    onClick={() => {
                      autoRef.current = false;
                      review(example);
                    }}
                  >
                    Done
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="vrev">
                <p className="ua" style={{ margin: 0 }}>
                  You said
                </p>
                <p className="tr-q">“{ex.said}”</p>
                {ex.cards.map((card) => {
                  const Icon = CARD_ICONS[card.type];
                  return (
                    <div key={card.kind + card.title} className="vcard">
                      <div className="vc-h">
                        <span className="vc-ic">
                          <Icon className="i s" aria-hidden />
                        </span>
                        <div>
                          <div className="vc-k">{card.kind}</div>
                          <div className="vc-t">{card.title}</div>
                        </div>
                      </div>
                      <div className="vc-f">
                        {card.fields.map((f) => (
                          <span key={f.value} className="chip">
                            <span>{f.value}</span>
                            {f.guessed ? <span className="gs">guessed</span> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="vfoot">
                  {stage === "review" ? (
                    <>
                      <button
                        type="button"
                        className="btn-ink"
                        onClick={() => {
                          autoRef.current = false;
                          addCards(example);
                        }}
                      >
                        {ex.addLabel}
                      </button>
                      <button
                        type="button"
                        className="btn-line"
                        onClick={() => {
                          clear();
                          autoRef.current = false;
                          setStage("idle");
                          setHint("Cancelled. Nothing was saved.");
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <span className="toast" role="status">
                      <span className="ok">
                        <Check className="i xs" aria-hidden />
                      </span>
                      {ex.toast}
                      <button
                        type="button"
                        className="undo"
                        onClick={() => {
                          clear();
                          autoRef.current = false;
                          setStage("undone");
                        }}
                      >
                        Undo
                      </button>
                    </span>
                  )}
                  <span className="sp" />
                  <button type="button" className="btn-line" onClick={() => run(example, false)}>
                    <RotateCcw className="i s" aria-hidden />
                    Replay
                  </button>
                </div>
              </div>
            )}
            <div className="tries speak-tries">
              <span className="lbl">Try saying</span>
              {VOICE_EXAMPLES.map((e, i) => (
                <button
                  key={e.said}
                  type="button"
                  className={`try${example === i ? " on" : ""}`}
                  onClick={() => run(i, false)}
                >
                  {e.said}
                </button>
              ))}
            </div>
          </>
        ) : (
          <TypeDemo />
        )}
      </AutoHeight>
    </div>
  );
}

/** The Type tab: the app's real quick-add parser, with chips that can be removed. */
function TypeDemo() {
  const [text, setText] = useState("pay rent tomorrow 5pm #home p1");
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ title: string; previous: string } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const parsed = useMemo(
    () =>
      parseQuickAdd(text, {
        today: DEMO_TODAY,
        timeNow: "09:00",
        locale: "en-IN",
        lists: DEMO_LISTS,
        ignored,
      }),
    [text, ignored],
  );

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const add = () => {
    if (!parsed.title) return;
    window.clearTimeout(toastTimer.current);
    setToast({ title: parsed.title, previous: text });
    setText("");
    setIgnored(new Set());
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  };

  return (
    <div className="typed" style={{ display: "flex", flexDirection: "column" }}>
      <label className="qa-field">
        <Plus className="i" aria-hidden />
        <span className="sr">New task</span>
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setIgnored(new Set());
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="call mom sunday 7pm"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <p className="ua" style={{ marginTop: 22 }}>
        Understood as
      </p>
      <p className={`qa-title${parsed.title ? "" : " empty"}`}>
        {parsed.title || "Start typing a task"}
      </p>
      <div className="chips qa-chips">
        {parsed.tokens.map((token) => {
          const Icon = TOKEN_ICONS[token.kind];
          return (
            <span key={tokenKey(token)} className="chip">
              <Icon className={`i s${token.kind === "priority" ? " flag" : ""}`} aria-hidden />
              {token.label}
              <button
                type="button"
                className="x"
                aria-label={`Remove ${token.label}`}
                onClick={() => setIgnored((prev) => new Set(prev).add(tokenKey(token)))}
              >
                <X className="i xs" aria-hidden />
              </button>
            </span>
          );
        })}
      </div>
      <div className="vfoot">
        {toast ? (
          <span className="toast" role="status">
            <span className="ok">
              <Check className="i xs" aria-hidden />
            </span>
            Added “{toast.title}”
            <button
              type="button"
              className="undo"
              onClick={() => {
                window.clearTimeout(toastTimer.current);
                setText(toast.previous);
                setToast(null);
              }}
            >
              Undo
            </button>
          </span>
        ) : (
          <span className="vhint" style={{ fontSize: 13 }}>
            Stays open for the next task.
          </span>
        )}
        <span className="sp" />
        <button type="button" className="btn-ink" onClick={add}>
          Add task
        </button>
      </div>
      <div className="tries">
        <span className="lbl">Try typing</span>
        {TYPE_EXAMPLES.map((t) => (
          <button
            key={t}
            type="button"
            className="try"
            onClick={() => {
              setText(t);
              setIgnored(new Set());
              setToast(null);
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Animates its own height to fit its content, so the demo card grows and shrinks smoothly when the
 * cards appear, a longer example plays, or the tab changes, instead of jumping.
 */
function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="autoh" style={{ height }}>
      <div ref={inner}>{children}</div>
    </div>
  );
}
