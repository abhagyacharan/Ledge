"use client";

import { Minus, Plus } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { FAQS } from "../content";

/**
 * One question open at a time; the open one's icon turns orange with a minus. Answers stay in the
 * page and slide open (a grid row from 0fr to 1fr), so the height animates without measuring.
 */
export function SiteFaq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq-list">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        const id = `faq-${i}`;
        return (
          <div
            key={item.q}
            className={`faq${isOpen ? " open" : ""}`}
            data-reveal=""
            style={{ "--d": `${i * 0.05}s` } as CSSProperties}
          >
            <h3>
              <button
                type="button"
                className="faq-q"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                {item.q}
                <span className="faq-ic" aria-hidden>
                  {isOpen ? <Minus className="i s" /> : <Plus className="i s" />}
                </span>
              </button>
            </h3>
            <div className="faq-body" id={id} inert={!isOpen}>
              <div>
                <p className="faq-a">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
