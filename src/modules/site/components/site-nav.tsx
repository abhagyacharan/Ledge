"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { BrandTile } from "@/components/shell/brand";
import { NAV_ITEMS, SITE_LINKS } from "../content";

/** Logo, the frosted link pill (a menu on phones) and Log in. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="nav" aria-label="Main">
      <a className="logo" href="#top">
        <BrandTile />
        Ledge
      </a>
      <div className="navpill">
        {NAV_ITEMS.map((item) => (
          <a key={item.href} href={item.href}>
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
          onClick={() => setOpen((v) => !v)}
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
