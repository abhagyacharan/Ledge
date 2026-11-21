"use client";

import { Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS, SITE_LINKS } from "../content";

/** The nav at the top of the hero: wordmark, the frosted link pill (a menu on phones) and Log in. */
export function SiteNav() {
  return <NavBar className="nav" label="Main" />;
}

/**
 * The same nav as a slim frosted bar that follows the visitor down the page (O, 2026-11-22). It
 * appears only below the hero, slides away while scrolling down to read and comes back on the
 * first scroll up. The link for the section on screen is highlighted. While hidden it is inert, so
 * keyboard users meet one nav, not two.
 */
export function FloatingNav() {
  const [show, setShow] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const menuOpenRef = useRef(menuOpen);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  // Show on scroll up past the hero, hide on scroll down or back at the top.
  useEffect(() => {
    const hero = document.getElementById("top");
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const pastHero = y > (hero?.offsetHeight ?? 600) - 40;
      if (!pastHero) {
        setShow(false);
        setMenuOpen(false);
      } else if (y < lastY - 4) {
        setShow(true);
      } else if (y > lastY + 4 && !menuOpenRef.current) {
        setShow(false);
      }
      if (Math.abs(y - lastY) > 4) lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Which section is in the middle of the screen.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const sections = NAV_ITEMS.map((item) => document.querySelector(item.href)).filter(
      (el): el is Element => el !== null,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fnav" data-show={show ? "" : undefined} inert={!show} aria-hidden={!show}>
      <NavBar
        className="fnav-in"
        label="Sections"
        active={active}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
      />
    </div>
  );
}

function NavBar({
  className,
  label,
  active = null,
  menuOpen,
  onMenuOpenChange,
}: {
  className: string;
  label: string;
  active?: string | null;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = menuOpen ?? ownOpen;
  const setOpen = onMenuOpenChange ?? setOwnOpen;
  return (
    <nav className={className} aria-label={label}>
      {/* The footer's big "Ledge." in small: the wordmark with its orange full stop (O, 2026-11-22). */}
      <a className="nav-wm" href="#top" aria-label="Ledge, back to the top">
        Ledge<b aria-hidden>.</b>
      </a>
      <div className="navpill">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={active === item.href ? "true" : undefined}
          >
            {item.label}
          </a>
        ))}
      </div>
      <div className="nav-r">
        <a className="login" href={SITE_LINKS.signIn}>
          Log in
        </a>
        <button
          className="menubtn"
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Menu className="i" aria-hidden />
        </button>
      </div>
      {open ? (
        <div className="mmenu">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
