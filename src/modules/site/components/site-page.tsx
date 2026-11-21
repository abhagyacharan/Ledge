import {
  ArrowDown,
  ArrowUpRight,
  Bell,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Flag,
  Keyboard,
  Laptop,
  Lock,
  Plus,
  Sheet,
  Smartphone,
} from "lucide-react";
import type * as React from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { BrandTile } from "@/components/shell/brand";
import { BeforeWith } from "./before-with";
import { SITE_LINKS } from "../content";
import { HeroPhone } from "./hero-phone";
import { Fact, Moods, Overdue, PHONE_SHOTS, Saved, StatusBar, TaskRow } from "./phone-parts";
import { SiteFaq } from "./site-faq";
import { SiteMotion } from "./site-motion";
import { SiteNav } from "./site-nav";
import { VoiceDemo } from "./voice-demo";

/**
 * The public page about Ledge, built from O's Claude Design canvas "Ledge site" (2026-11-21).
 * Sections: hero with a working phone, the problem, how it works (one Friday), voice and quick add,
 * phone and laptop, FAQ, footer. Styles: ../site.css.
 */
export function SitePage() {
  return (
    <div className="lg">
      <SiteMotion />
      <Hero />
      <Problem />
      <HowItWorks />
      <SayIt />
      <Pocket />
      <section className="sec center" id="faq" aria-labelledby="h-faq">
        <div className="wrap">
          <span className="eyebrow" data-reveal="">
            FAQ
          </span>
          <h2 className="h-sec" id="h-faq" data-reveal="" style={D(0.08)}>
            Questions, <span className="ser">answered</span>.
          </h2>
          <SiteFaq />
        </div>
      </section>
      <Footer />
    </div>
  );
}

/** A reveal delay, read by the CSS as --d. */
function D(seconds: number) {
  return { "--d": `${seconds}s` } as React.CSSProperties;
}

function OpenLedge({ label = "Open Ledge" }: { label?: string }) {
  return (
    <a className="cta" href={SITE_LINKS.signIn}>
      {label}
      <span className="arr">
        <ArrowUpRight className="i" aria-hidden />
      </span>
    </a>
  );
}

function Hero() {
  return (
    <header className="hero" id="top">
      <div className="wrap">
        <SiteNav />
        <div className="hero-c">
          <h1 className="h-hero">
            One <span className="ser">calm</span> place to run your day.
          </h1>
          <HeroPhone />
          <div className="hero-foot">
            <p className="lead">
              Tasks, money and a daily journal that already know about each other. Add anything by
              typing or by voice, then see what&apos;s due, what slipped and where the money went.
            </p>
            <div className="ctas">
              <OpenLedge />
              <a className="cta2" href="#how">
                See how it works
                <ArrowDown className="i" aria-hidden />
              </a>
            </div>
            <p className="small">Email and password. Nothing to install.</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function Problem() {
  return (
    <section className="sec center" aria-labelledby="h-problem">
      <div className="wrap">
        <span className="eyebrow" data-reveal="">
          The problem
        </span>
        <h2 className="h-sec" data-reveal="" style={D(0.08)} id="h-problem">
          Your life is in <span className="hl">four</span> places. None of them talk.
        </h2>
        <p className="lead" data-reveal="" style={D(0.16)}>
          A to-do app for tasks, a spreadsheet you forget to update, a notebook by the bed. Ledge
          puts them on one page, so each day adds up.
        </p>
        <BeforeWith
          before={
            <div className="bw-card before" data-reveal="left">
              <div className="bw-h">
                <h3>Before</h3>
                <span className="p-eb">a Thursday evening</span>
              </div>
              <div className="scrap tilt1">
                <Bell className="i s" aria-hidden />
                <span>
                  <b>To-do app</b> · 14 tasks overdue
                </span>
                <span className="p-eb">ignored</span>
              </div>
              <div className="scrap block tilt2">
                <div className="row">
                  <Sheet className="i s" aria-hidden />
                  <b>Finances 2026.xlsx</b>
                  <span className="p-eb">last edited 19 days ago</span>
                </div>
                <div className="xls" aria-hidden>
                  <span>01/11</span>
                  <span>uber??</span>
                  <span>3500</span>
                  <span />
                  <span>#REF!</span>
                  <span />
                </div>
              </div>
              <div className="scrap tilt3">
                <BookOpen className="i s" aria-hidden />
                <span>
                  <b>Notebook</b> · last entry in September
                </span>
              </div>
              <p className="cap">Each tool knows one thing. Nobody knows how the day went.</p>
            </div>
          }
          after={
            <div className="bw-card with" data-reveal="right" style={D(0.1)}>
              <div className="bw-h">
                <h3>With Ledge</h3>
                <span className="p-eb">Journal · Thu, 12 Nov</span>
              </div>
              <Fact icon="done">4 done · General 2, Freelance 2</Fact>
              <Fact icon="spent">
                <span className="money">₹1,240</span> spent · <span className="money">₹900</span> on
                wants · about your usual
              </Fact>
              <div className="fact">
                <Clock className="i s" aria-hidden />
                <span>2 slipped</span>
                <ArrowUpRight className="i s go" aria-hidden />
              </div>
              <Moods only={["Okay", "Good", "Great"]} />
              <p className="jtext">
                Long walk after work, then cooked dal at home instead of ordering in. The invoice
                can wait one more day.
              </p>
              <p className="cap" style={{ paddingTop: 28 }}>
                <Saved />
              </p>
            </div>
          }
        />
      </div>
    </section>
  );
}

function Step({
  n,
  time,
  title,
  children,
  box,
}: {
  n: string;
  time: string;
  title: string;
  children: ReactNode;
  box: ReactNode;
}) {
  return (
    <li className="step" data-reveal="" style={D((Number(n) - 1) * 0.1)}>
      <div className="box" aria-hidden>
        {box}
      </div>
      <p className="step-n">
        {n} <span>·</span> {time}
      </p>
      <h3 className="step-t">{title}</h3>
      <p className="step-p">{children}</p>
    </li>
  );
}

function HowItWorks() {
  return (
    <section className="panel" data-theme="dark" id="how" aria-labelledby="h-how">
      <div className="wrap sec center">
        <span className="eyebrow" data-reveal="">
          One Friday in Ledge
        </span>
        <h2 className="h-sec" data-reveal="" style={D(0.08)} id="h-how">
          How Ledge <span className="ser">works</span>.
        </h2>
        <p className="lead" data-reveal="" style={D(0.16)}>
          Four moments. A few seconds each.
        </p>
        <ol className="steps">
          <Step
            n="01"
            time="7:45 am"
            title="Add it in seconds"
            box={
              <>
                <div className="box-in">
                  <div className="qa-in">
                    <Plus className="i s" />
                    <span>
                      pay electricity bill 5pm p1
                      <span className="caret" />
                    </span>
                  </div>
                  <p className="ua">Understood as</p>
                  <div className="chips">
                    <span className="chip ring sm">
                      <Calendar className="i xs" />
                      Today
                    </span>
                    <span className="chip ring sm">
                      <Clock className="i xs" />
                      5:00 pm
                    </span>
                    <span className="chip ring sm">General</span>
                    <span className="chip ring sm">
                      <Flag className="i xs flag" />
                      High
                    </span>
                  </div>
                </div>
                <div className="mini-v">
                  <svg className="rg" viewBox="0 0 58 58">
                    <circle cx="29" cy="29" r="27" />
                  </svg>
                  <span className="fab">
                    <Plus className="i" />
                  </span>
                </div>
              </>
            }
          >
            Type it the way you&apos;d say it, or hold + and speak. Ledge shows what it understood
            before saving.
          </Step>
          <Step
            n="02"
            time="1:05 pm"
            title="Log it as you pay"
            box={
              <div className="box-in">
                <div className="amt">
                  <small>₹</small>640
                </div>
                <div className="field">Swiggy lunch</div>
                <div className="chips">
                  <span className="chip sel sm">
                    <Check className="i xs" />
                    Dining
                  </span>
                  <span className="chip sel sm">
                    <Check className="i xs" />
                    UPI
                  </span>
                </div>
                <div className="chips" style={{ marginTop: 8 }}>
                  <span className="chip ring sm">Need</span>
                  <span className="chip sel sm">Want</span>
                </div>
              </div>
            }
          >
            Amount, name, save. Category and payment method remember your last choice.
          </Step>
          <Step
            n="03"
            time="6:10 pm"
            title="Tick it off"
            box={
              <div className="box-in">
                <p className="p-eb" style={{ marginBottom: 10 }}>
                  Today · 6:10 pm
                </p>
                <div className="mini-row fold">
                  <div className="trow">
                    <span className="chk hi">
                      <Check className="i xs" />
                    </span>
                    <div>
                      <div className="t-name">Pay electricity bill</div>
                      <div className="t-meta">
                        <span>5:00 pm</span>
                        <span>General</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mini-row">
                  <TaskRow name="Send invoice to Kiran" high meta={<Overdue />} />
                </div>
                <div className="mini-row">
                  <TaskRow name="Review PR on drizzle docs" meta={<span>2/5 subtasks</span>} />
                </div>
              </div>
            }
          >
            Done tasks fold away. Anything late says so in words, not just in red.
          </Step>
          <Step
            n="04"
            time="10:05 pm"
            title="The day adds itself up"
            box={
              <div className="box-in">
                <p className="p-eb">Journal</p>
                <p className="p-h" style={{ fontSize: 22, margin: "4px 0 12px" }}>
                  Fri, 13 Nov
                </p>
                <Fact icon="done">3 done · General 2, Health 1</Fact>
                <Fact icon="spent">
                  <span className="money">₹640</span> spent · about your usual
                </Fact>
                <p className="jtext" style={{ fontSize: 13, color: "var(--soft)", marginTop: 8 }}>
                  Paid the bill before five. Long walk after work.
                  <span className="caret" />
                </p>
              </div>
            }
          >
            Tonight&apos;s page already lists what you did and spent. You only write what matters.
          </Step>
        </ol>
        <div className="ctas" style={{ marginTop: 56 }}>
          <OpenLedge />
        </div>
      </div>
    </section>
  );
}

function SayIt() {
  return (
    <section className="say" data-theme="dark" id="voice" aria-labelledby="h-say">
      <div className="wrap say-grid">
        <div>
          <span className="eyebrow" data-reveal="">
            Try it, right here
          </span>
          <h2 className="h-sec" data-reveal="" style={D(0.08)} id="h-say">
            Say it. Or <span className="ser">type</span> it.
          </h2>
          <p className="lead" data-reveal="" style={D(0.16)}>
            Hold the + button and talk, or type one line. Ledge turns it into tasks, expenses and
            EMIs, and shows you exactly what it understood.
          </p>
          <ul className="points" data-reveal="" style={D(0.22)}>
            <li>
              <span className="n">01</span>Hold + for half a second
            </li>
            <li>
              <span className="n">02</span>Check the cards, then add
            </li>
            <li>
              <span className="n">03</span>One Undo takes it all back
            </li>
          </ul>
          <p className="note">
            <Lock className="i s" aria-hidden />
            Nothing is saved until you tap Add.
          </p>
        </div>
        <div data-reveal="scale" style={D(0.1)}>
          <VoiceDemo />
        </div>
      </div>
    </section>
  );
}

function Pocket() {
  return (
    <section className="pocket deep" aria-labelledby="h-pocket">
      <div className="wrap">
        <div className="pk-head">
          <div>
            <span className="eyebrow" data-reveal="">
              Phone and laptop
            </span>
            <h2 className="h-sec" data-reveal="" style={D(0.08)} id="h-pocket">
              In your pocket.
              <br />
              <span className="ser">At your desk.</span>
            </h2>
          </div>
          <p className="lead" data-reveal="" style={D(0.16)}>
            One thumb is enough on a phone. On a laptop, a sidebar shows every module, tasks open
            beside their list, and Ctrl K reaches everything.
          </p>
        </div>

        <div className="pk-shots">
          <div
            className="dk"
            data-reveal=""
            role="img"
            aria-label="Ledge on a laptop: the Work list with a task open beside it"
          >
            <div className="dk-bar">
              <span className="d" />
              <span className="d" />
              <span className="d" />
              <span className="url">Ledge · Tasks · Work</span>
            </div>
            <Image
              src="/site/laptop-list.png"
              alt=""
              width={2880}
              height={1800}
              sizes="(max-width: 900px) 92vw, 880px"
              className="dk-shot"
            />
          </div>

          <div className="pk-phone" role="img" aria-label="Ledge on a phone: the Home screen">
            <div className="phone" data-reveal="right" style={D(0.25)}>
              <div className="screen">
                <StatusBar />
                <div className="shot">
                  <Image
                    src={PHONE_SHOTS[0].src}
                    alt=""
                    width={1170}
                    height={2172}
                    sizes="300px"
                    className="shot-img on"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <ul className="pk-facts" data-reveal="" style={D(0.3)}>
          <li>
            <Keyboard className="i s" aria-hidden />
            Ctrl K reaches everything
          </li>
          <li>
            <Smartphone className="i s" aria-hidden />
            One thumb on a phone
          </li>
          <li>
            <Laptop className="i s" aria-hidden />
            Sidebar and side-by-side tasks on a laptop
          </li>
        </ul>
      </div>
    </section>
  );
}

function GitHubMark() {
  return (
    <svg
      className="i s"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.1-1.3-.3-2.5-1-3.5.3-1.2.3-2.4 0-3.5 0 0-1 0-3 1.5-2.6-.5-5.4-.5-8 0C6 2 5 2 5 2c-.3 1.2-.3 2.4 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.4.5-.7 1-.9 1.7-.2.6-.2 1.2-.1 1.8v4M9 18c-4.5 2-5-2-7-2" />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="foot" data-theme="dark">
      <div className="wrap">
        <div className="foot-mark">
          <div className="wm-clip">
            <span className="wm" aria-hidden>
              {"Ledge".split("").map((ch, i) => (
                <span key={i} className="ch" style={D(i * 0.06)}>
                  {ch}
                </span>
              ))}
              <b>.</b>
            </span>
          </div>
          <div className="foot-side">
            <h2 className="foot-tag">
              Start tonight. <span className="ser">Thank yourself tomorrow.</span>
            </h2>
            <div className="foot-ctas">
              <OpenLedge label="Get started" />
              <a className="cta-out" href={SITE_LINKS.signIn}>
                Log in
              </a>
            </div>
          </div>
        </div>
        <div className="foot-row">
          <div className="foot-brand">
            <a className="logo" href="#top">
              <BrandTile />
              Ledge
            </a>
            <span className="foot-sub">The everyday ledger</span>
            <span className="foot-copy">
              © 2026 · Built by <a href={SITE_LINKS.portfolio}>{SITE_LINKS.builtBy}</a>
            </span>
          </div>
          <nav className="foot-links" aria-label="Footer">
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
            <a className="gh" href={SITE_LINKS.github}>
              <GitHubMark />
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
