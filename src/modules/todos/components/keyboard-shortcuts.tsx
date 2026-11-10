"use client";

import { useEffect } from "react";
import { OPEN_HELP_EVENT, OPEN_PALETTE_EVENT } from "./shortcuts";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.getAttribute("role") === "combobox"
  );
}

const ROW = "[data-task-row]";
const LINK = "[data-task-link]";

function taskLinks(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`${ROW} ${LINK}`)];
}

function focusedRow(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.closest<HTMLElement>(ROW) : null;
}

/** Moves the selection (keyboard focus) to the next or previous task link. */
function move(step: 1 | -1) {
  const links = taskLinks();
  if (links.length === 0) return;
  const current = focusedRow()?.querySelector<HTMLElement>(LINK) ?? null;
  const index = current ? links.indexOf(current) : -1;
  const next = links[Math.max(0, Math.min(links.length - 1, index + step))];
  next.focus();
  next.scrollIntoView({ block: "nearest" });
}

/** Focuses the title box of the open task drawer, waiting briefly for it to appear. */
function focusTitleWhenReady() {
  let tries = 0;
  const timer = window.setInterval(() => {
    const input = document.getElementById("task-title");
    tries += 1;
    if (input instanceof HTMLInputElement) {
      window.clearInterval(timer);
      input.focus();
      input.select();
    } else if (tries > 60) {
      window.clearInterval(timer);
    }
  }, 50);
}

/**
 * Global keyboard shortcuts (CLAUDE.md §6.2). Plain keys are ignored while typing in a field or
 * while a dialog is open. `q` is handled by the quick-add dialog itself. Escape is handled by the
 * dialogs and the task panel.
 */
export function KeyboardShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog]")) return;

      const onTaskLink =
        document.activeElement instanceof HTMLElement && document.activeElement.matches(LINK);

      switch (event.key) {
        case "?":
          event.preventDefault();
          window.dispatchEvent(new Event(OPEN_HELP_EVENT));
          break;
        case "/":
          event.preventDefault();
          window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
          break;
        case "j":
          event.preventDefault();
          move(1);
          break;
        case "k":
          event.preventDefault();
          move(-1);
          break;
        case "ArrowDown":
          if (onTaskLink) {
            event.preventDefault();
            move(1);
          }
          break;
        case "ArrowUp":
          if (onTaskLink) {
            event.preventDefault();
            move(-1);
          }
          break;
        case "x": {
          const row = focusedRow();
          if (!row) break;
          event.preventDefault();
          row.querySelector<HTMLElement>("[data-task-checkbox]")?.click();
          break;
        }
        case "e": {
          const row = focusedRow();
          if (!row) break;
          event.preventDefault();
          row.querySelector<HTMLElement>(LINK)?.click();
          focusTitleWhenReady();
          break;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}
