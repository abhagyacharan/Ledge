"use client";

import { ChevronRight, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetHeader } from "@/components/dash/sheet";
import { describeBasics } from "../../schema";
import { run, UNDO_MS } from "@/modules/todos/components/run-action";
import { useTodos } from "@/modules/todos/components/todos-provider";
import {
  addMoreTasksAction,
  addPlanAction,
  saveReviewAction,
  undoAddMoreTasksAction,
  undoAddPlanAction,
} from "../../actions";
import {
  draftPlanSchema,
  MAX_MORE_TASKS,
  MAX_TASKS,
  type DraftPlan,
  type DraftTask,
  type ListChoice,
  type PlanBasics,
} from "../../schema";
import { ReviewSkeleton } from "../flow/making-step";
import type { FlowDates } from "../flow/types";
import { CardEditor } from "./card-editor";
import { CardsView, type CardsHandle } from "./cards-view";
import { ListView, phaseAnchor } from "./list-view";
import { PhaseStrip, TitleField, ViewToggle } from "./review-parts";
import {
  blankTask,
  cutTasks,
  insertInPhase,
  isCut,
  keptTasks,
  orderedTasks,
  setCut,
  shortTitle,
  summarize,
  taskProblems,
} from "./review-logic";
import { CutTray, destinationName, SummaryFrame, SummaryPanel, type ListState } from "./summary";
import {
  clearPosition,
  readPosition,
  useMounted,
  useReviewView,
  writePosition,
} from "./use-review-prefs";

export type ReviewScreenProps = {
  /** "new": the plan being made (draft). "more": suggestions for an active plan. */
  mode: "new" | "more";
  planId: string;
  /** The cards and the plan around them. For "more", only title, phases, dates and tasks matter. */
  draft: DraftPlan;
  basics: PlanBasics | null;
  dates: FlowDates;
};

/** The review waits for the browser: it reads where you were and which view you like. */
export function ReviewScreen(props: ReviewScreenProps) {
  const mounted = useMounted();
  if (!mounted) {
    return (
      <div className="dash mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-xl flex-col gap-3">
        <ReviewSkeleton />
      </div>
    );
  }
  return <ReviewInner {...props} />;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
const isPressable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  target.closest("button, a, [role=radio], [role=checkbox]") !== null;

function ReviewInner({ mode, planId, draft: base, basics, dates }: ReviewScreenProps) {
  const router = useRouter();
  const { lists, inboxId } = useTodos();
  const [view, setView] = useReviewView();
  const isNew = mode === "new";
  const maxTasks = isNew ? MAX_TASKS : MAX_MORE_TASKS;

  const [tasks, setTasks] = useState<DraftTask[]>(() => orderedTasks(base.tasks, base.phases));
  const [title, setTitle] = useState(base.title);
  const [listState, setListState] = useState<ListState>({
    other: false,
    listId: null,
    name: base.listName,
  });
  const [index, setIndex] = useState(() =>
    Math.min(readPosition(planId), Math.max(0, base.tasks.length - 1)),
  );
  const [seen, setSeen] = useState(() => Math.min(readPosition(planId) + 1, base.tasks.length));
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(base.tasks[0]?.key ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [focusToken, setFocusToken] = useState(0);
  const cards = useRef<CardsHandle>(null);

  const phases = base.phases;
  const total = tasks.length;
  const summary = useMemo(
    () =>
      summarize({
        tasks,
        phases,
        startDate: base.startDate,
        endDate: base.endDate,
        today: dates.today,
        locale: dates.locale,
      }),
    [tasks, phases, base.startDate, base.endDate, dates.today, dates.locale],
  );
  const current = tasks[index];
  const stripPhase =
    view === "cards"
      ? (current?.phaseId ?? null)
      : (tasks.find((t) => t.key === selectedKey)?.phaseId ?? null);

  // ---- remembering where you were
  useEffect(() => {
    writePosition(planId, index);
  }, [planId, index]);

  // ---- autosave of the draft (new plans only)
  const draftNow: DraftPlan = useMemo(
    () => ({
      title: title.trim() || "Untitled plan",
      listName: listState.name.trim() || title.trim() || "My plan",
      summary: base.summary,
      startDate: base.startDate,
      endDate: base.endDate,
      phases: base.phases,
      tasks,
      resources: base.resources,
    }),
    [title, listState.name, tasks, base],
  );
  const lastSaved = useRef(JSON.stringify(base));
  const saveNow = useCallback(async (): Promise<boolean> => {
    const json = JSON.stringify(draftNow);
    if (json === lastSaved.current) return true;
    const parsed = draftPlanSchema.safeParse(draftNow);
    if (!parsed.success) return false;
    setSaveState("saving");
    const result = await saveReviewAction({ planId, draft: parsed.data });
    if (result.ok) {
      lastSaved.current = json;
      setSaveState("saved");
      return true;
    }
    setSaveState("error");
    return false;
  }, [draftNow, planId]);
  useEffect(() => {
    if (!isNew) return;
    if (JSON.stringify(draftNow) === lastSaved.current) return;
    const timer = window.setTimeout(() => void saveNow(), 800);
    return () => window.clearTimeout(timer);
  }, [isNew, draftNow, saveNow]);

  // ---- changing cards
  const updateTask = useCallback((key: string, next: DraftTask) => {
    setTasks((all) => all.map((t) => (t.key === key ? next : t)));
    setErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  }, []);

  function offerUndo(message: string, undo: () => void) {
    toast(message, {
      id: "plan-review",
      duration: UNDO_MS,
      action: { label: "Undo", onClick: undo },
    });
  }

  function decide(direction: "cut" | "keep") {
    const task = tasks[index];
    if (!task) return;
    const was = index;
    const nextTask =
      direction === "cut" ? setCut(task, true) : isCut(task) ? setCut(task, false) : task;
    if (nextTask !== task) updateTask(task.key, nextTask);
    if (index >= tasks.length - 1) {
      setSummaryOpen(true);
      setSeen(tasks.length);
    } else {
      setIndex(index + 1);
      setSeen((s) => Math.max(s, index + 2));
    }
    setFocusToken((t) => t + 1);
    offerUndo(`${direction === "cut" ? "Cut" : "Kept"} “${shortTitle(task.title)}”`, () => {
      updateTask(task.key, task);
      setSummaryOpen(false);
      setIndex(was);
      setFocusToken((t) => t + 1);
    });
  }

  function cutRow(key: string) {
    const task = tasks.find((t) => t.key === key);
    if (!task || isCut(task)) return;
    updateTask(key, setCut(task, true));
    offerUndo(`Cut “${shortTitle(task.title)}”`, () => updateTask(key, task));
  }

  function bringBack(key: string) {
    const task = tasks.find((t) => t.key === key);
    if (!task || !isCut(task)) return;
    updateTask(key, setCut(task, false));
  }

  function bringAllBack() {
    setTasks((all) => all.map((t) => (isCut(t) ? setCut(t, false) : t)));
  }

  function startEdit(key: string) {
    setEditingKey(key);
    setSelectedKey(key);
    const at = tasks.findIndex((t) => t.key === key);
    if (view === "cards" && at >= 0) setIndex(at);
  }

  function finishEdit(key: string, next: DraftTask) {
    updateTask(key, next);
    setEditingKey(null);
    setFreshKey(null);
    // Moving a card to another phase moves it in the order; keep looking at it.
    setTasks((all) => {
      const ordered = orderedTasks(all, phases);
      const at = ordered.findIndex((t) => t.key === key);
      if (view === "cards" && at >= 0) setIndex(at);
      return ordered;
    });
    setFocusToken((t) => t + 1);
  }

  function cancelEdit() {
    if (editingKey && editingKey === freshKey) {
      const key = editingKey;
      setTasks((all) => all.filter((t) => t.key !== key));
      setIndex((i) => Math.max(0, Math.min(i, tasks.length - 2)));
      setSelectedKey(tasks.find((t) => t.key !== key)?.key ?? null);
    }
    setEditingKey(null);
    setFreshKey(null);
    setFocusToken((t) => t + 1);
  }

  function addTask(phaseId: string) {
    if (tasks.length >= maxTasks) return;
    const phase = phases.find((p) => p.id === phaseId);
    const date = phase ? (phase.startDate > dates.today ? phase.startDate : dates.today) : null;
    const blank = blankTask(tasks, phaseId, date);
    const next = insertInPhase(tasks, blank, phases);
    setTasks(next);
    setFreshKey(blank.key);
    setEditingKey(blank.key);
    setSelectedKey(blank.key);
    setSummaryOpen(false);
    const at = next.findIndex((t) => t.key === blank.key);
    if (at >= 0) setIndex(at);
  }

  function jumpToPhase(phaseId: string) {
    if (view === "cards") {
      const at = tasks.findIndex((t) => t.phaseId === phaseId);
      if (at < 0) return;
      setSummaryOpen(false);
      setIndex(at);
      setSeen((s) => Math.max(s, at + 1));
    } else {
      const first = tasks.find((t) => t.phaseId === phaseId);
      if (first) setSelectedKey(first.key);
      document
        .getElementById(phaseAnchor(phaseId))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ---- Add plan
  async function addPlan() {
    if (adding) return;
    setAddError(null);
    const kept = keptTasks(tasks);
    if (kept.length === 0) {
      setAddError("Keep at least one task to add the plan.");
      return;
    }
    const problems = taskProblems(kept, dates.today);
    const firstBad = kept.find((t) => problems[t.key]);
    if (firstBad) {
      setErrors(problems);
      setAddError("A few tasks need a look first. They are marked on their cards.");
      setSummaryOpen(false);
      setSelectedKey(firstBad.key);
      const at = tasks.findIndex((t) => t.key === firstBad.key);
      if (at >= 0) setIndex(at);
      return;
    }
    setErrors({});
    setAdding(true);
    try {
      if (!isNew) {
        const result = await run(addMoreTasksAction({ planId, tasks: kept }));
        if (!result.ok) return;
        const receipt = result.data;
        clearPosition(planId);
        toast(receipt.summary, {
          duration: UNDO_MS,
          action: {
            label: "Undo",
            onClick: () => void run(undoAddMoreTasksAction(receipt)),
          },
        });
        router.push(`/plans/${planId}`);
        return;
      }
      const parsed = draftPlanSchema.safeParse({ ...draftNow, tasks: kept });
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        if (issue?.path[0] === "title") setTitleError(issue.message);
        setAddError(issue?.message ?? "Check the plan and try again.");
        return;
      }
      const list: ListChoice = listState.other
        ? { kind: "existing", listId: listState.listId ?? inboxId }
        : { kind: "new", name: parsed.data.listName };
      const result = await run(addPlanAction({ planId, draft: parsed.data, list }));
      if (!result.ok) {
        setAddError(result.error);
        return;
      }
      const receipt = result.data;
      clearPosition(planId);
      toast(receipt.summary, {
        duration: UNDO_MS,
        action: {
          label: "Undo",
          onClick: () =>
            void run(undoAddPlanAction(receipt)).then((undone) => {
              if (undone.ok) router.push(`/plans/${planId}/setup`);
            }),
        },
      });
      router.push(`/plans/${planId}`);
    } finally {
      setAdding(false);
    }
  }

  async function saveDraftAndLeave() {
    const saved = await saveNow();
    if (!saved && isNew) {
      toast.error("Give the plan a name and every task a title first.");
      return;
    }
    router.push("/plans");
  }

  function close() {
    if (isNew) void saveDraftAndLeave();
    else router.push(`/plans/${planId}`);
  }

  // ---- keys
  const latest = useRef({ decide, cutRow, bringBack, startEdit, addPlan });
  useEffect(() => {
    latest.current = { decide, cutRow, bringBack, startEdit, addPlan };
  });
  const keyState = useRef({ view, summaryOpen, editingKey, index, selectedKey, tasks });
  useEffect(() => {
    keyState.current = { view, summaryOpen, editingKey, index, selectedKey, tasks };
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const s = keyState.current;
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        if (document.querySelector("[role=dialog]")) return;
        event.preventDefault();
        void latest.current.addPlan();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (document.querySelector("[role=dialog], [role=listbox]")) return;
      if (s.editingKey || isTyping(event.target)) return;
      const key = event.key;
      const letter = key.length === 1 ? key.toLowerCase() : key;
      if (s.view === "cards") {
        if (s.summaryOpen) {
          if (key === "ArrowLeft" || key === "Escape") {
            event.preventDefault();
            setSummaryOpen(false);
          }
          return;
        }
        const task = s.tasks[s.index];
        if (!task) return;
        if (key === "ArrowLeft" || letter === "x") {
          event.preventDefault();
          cards.current?.commit("cut");
        } else if (key === "ArrowRight") {
          event.preventDefault();
          cards.current?.commit("keep");
        } else if (letter === "e") {
          event.preventDefault();
          latest.current.startEdit(task.key);
        } else if (key === "Enter" && !isPressable(event.target)) {
          event.preventDefault();
          setSheetKey(task.key);
        }
        return;
      }
      // List view
      const at = s.tasks.findIndex((t) => t.key === s.selectedKey);
      const select = (to: number) => {
        const target = s.tasks[Math.max(0, Math.min(s.tasks.length - 1, to))];
        if (!target) return;
        setSelectedKey(target.key);
        requestAnimationFrame(() =>
          document
            .querySelector(`[data-task-key="${target.key}"]`)
            ?.scrollIntoView({ block: "nearest" }),
        );
      };
      const selected = at >= 0 ? s.tasks[at] : undefined;
      if (letter === "j" || key === "ArrowDown") {
        event.preventDefault();
        select(at + 1);
      } else if (letter === "k" || key === "ArrowUp") {
        event.preventDefault();
        select(at <= 0 ? 0 : at - 1);
      } else if (selected && (key === "ArrowLeft" || letter === "x")) {
        event.preventDefault();
        latest.current.cutRow(selected.key);
      } else if (selected && key === "ArrowRight") {
        event.preventDefault();
        latest.current.bringBack(selected.key);
      } else if (selected && letter === "e") {
        event.preventDefault();
        latest.current.startEdit(selected.key);
      } else if (selected && key === "Enter" && !isPressable(event.target)) {
        event.preventDefault();
        setSheetKey(selected.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ---- pieces shared by both views
  const addLabel = isNew
    ? "Add plan"
    : `Add ${summary.kept} ${summary.kept === 1 ? "task" : "tasks"}`;
  const destination = isNew ? destinationName(listState, lists, inboxId) : base.title;
  const timeNote = basics ? `About ${describeBasics(basics).time}.` : null;
  const planStart = base.startDate;
  const planEnd = base.endDate;
  const sheetTask = sheetKey ? tasks.find((t) => t.key === sheetKey) : undefined;
  const canAdd = tasks.length < maxTasks;

  const saveStatus =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Not saved"
          : "";
  const headerRight = isNew ? (
    <div className="flex items-center gap-2">
      <span aria-live="polite" className="font-mono text-xs text-dash-ink-soft">
        {saveStatus}
      </span>
      <button
        type="button"
        onClick={() => void saveDraftAndLeave()}
        className="h-11 rounded-full px-3 text-sm font-semibold text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Save draft
      </button>
    </div>
  ) : (
    <span className="w-11" />
  );

  const dialogs = (
    <>
      <CutTray
        open={trayOpen}
        onOpenChange={setTrayOpen}
        tasks={tasks}
        phases={phases}
        planStart={planStart}
        planEnd={planEnd}
        onBringBack={bringBack}
        onBringAllBack={bringAllBack}
      />
      <Sheet open={sheetKey !== null} onOpenChange={(open) => !open && setSheetKey(null)}>
        <SheetHeader title="Edit task" description="Changes apply when you press Done." />
        <SheetBody>
          {sheetTask ? (
            <CardEditor
              key={sheetTask.key}
              task={sheetTask}
              phases={phases}
              planStart={planStart}
              planEnd={planEnd}
              dates={dates}
              problem={errors[sheetTask.key]}
              onDone={(next) => {
                updateTask(sheetTask.key, next);
                setSheetKey(null);
                setTasks((all) => orderedTasks(all, phases));
              }}
              onCancel={() => setSheetKey(null)}
            />
          ) : null}
        </SheetBody>
      </Sheet>
    </>
  );

  const titleBlock = isNew ? (
    <TitleField
      value={title}
      onChange={(v) => {
        setTitle(v);
        setTitleError(undefined);
      }}
      big={view === "list"}
      error={titleError}
    />
  ) : (
    <h1 className="min-w-0 flex-1 font-display text-[28px] leading-[1.15] font-semibold text-dash-ink md:text-[34px]">
      More for {base.title}
    </h1>
  );

  const progressValue = view === "list" || summaryOpen ? total : seen;

  // ---------------------------------------------------------------- List view
  if (view === "list") {
    return (
      <div className="dash mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 font-mono text-xs font-medium text-dash-ink-soft"
            >
              <Link href="/plans" className="hover:text-dash-ink">
                Plans
              </Link>
              <ChevronRight aria-hidden className="size-3" />
              {isNew ? (
                <span>New plan</span>
              ) : (
                <Link href={`/plans/${planId}`} className="max-w-40 truncate hover:text-dash-ink">
                  {base.title}
                </Link>
              )}
              <ChevronRight aria-hidden className="size-3" />
              <span aria-current="page" className="text-dash-ink">
                {isNew ? "Review" : "Add tasks"}
              </span>
            </nav>
            {headerRight}
          </div>
          <div className="flex items-center gap-4">
            {titleBlock}
            <ViewToggle value={view} onChange={setView} />
          </div>
          {isNew && base.summary ? (
            <p className="-mt-2 text-sm text-dash-ink-soft">{base.summary}</p>
          ) : null}
          <PhaseStrip
            className="lg:hidden"
            phases={phases}
            planStart={planStart}
            planEnd={planEnd}
            current={stripPhase}
            onJump={jumpToPhase}
          />
          <ListView
            tasks={tasks}
            phases={phases}
            planStart={planStart}
            planEnd={planEnd}
            dates={dates}
            errors={errors}
            selectedKey={selectedKey}
            editingKey={editingKey}
            canAdd={canAdd}
            onSelect={setSelectedKey}
            onEdit={startEdit}
            onEditDone={finishEdit}
            onEditCancel={cancelEdit}
            onCut={cutRow}
            onBringBack={bringBack}
            onAddTask={addTask}
          />
          <p className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-dash-ink-soft md:flex">
            <span>
              <kbd className="font-mono">J</kbd> <kbd className="font-mono">K</kbd> move
            </span>
            <span>
              <kbd className="font-mono">←</kbd> or <kbd className="font-mono">X</kbd> cut
            </span>
            <span>
              <kbd className="font-mono">→</kbd> keep
            </span>
            <span>
              <kbd className="font-mono">E</kbd> edit in place
            </span>
            <span>
              <kbd className="font-mono">Enter</kbd> open
            </span>
          </p>
          <p aria-live="polite" className="sr-only">
            {cutTasks(tasks).length} cut
          </p>
        </div>
        <SummaryPanel
          summary={summary}
          total={total}
          reviewed={progressValue}
          mode={mode}
          addLabel={addLabel}
          adding={adding}
          addError={addError}
          listState={listState}
          onListChange={setListState}
          timeNote={timeNote}
          dates={dates}
          destination={destination}
          onAdd={() => void addPlan()}
        />
        {dialogs}
      </div>
    );
  }

  // --------------------------------------------------------------- Cards view
  return (
    <div className="dash mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-xl flex-col gap-3 md:min-h-[calc(100dvh-8rem)]">
      <div
        role="progressbar"
        aria-label="Cards reviewed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={progressValue}
        className="h-1 w-full overflow-hidden rounded-full bg-dash-track"
      >
        <div
          className="h-full rounded-full bg-dash-accent transition-[width] duration-300 ease-snap motion-reduce:transition-none"
          style={{ width: `${total === 0 ? 0 : (progressValue / total) * 100}%` }}
        />
      </div>
      {summaryOpen ? (
        <SummaryFrame
          title={title}
          summary={summary}
          total={total}
          mode={mode}
          addLabel={addLabel}
          adding={adding}
          addError={addError}
          listState={listState}
          onListChange={setListState}
          onOpenTray={() => setTrayOpen(true)}
          onAdd={() => void addPlan()}
          onBackToCards={() => setSummaryOpen(false)}
          planStart={planStart}
          planEnd={planEnd}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={isNew ? "Close, the plan stays in Drafts" : "Close"}
              onClick={close}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-dash-edge bg-dash-card text-dash-ink outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {adding ? (
                <Loader2 aria-hidden className="size-[18px] animate-spin" />
              ) : (
                <X aria-hidden className="size-[18px]" />
              )}
            </button>
            <span className="font-mono text-xs font-medium text-dash-ink-soft">
              {isNew ? "Review your plan" : "More tasks"}
            </span>
            {headerRight}
          </div>
          <div className="flex items-center gap-3">{titleBlock}</div>
          <div className="-mt-1 flex items-center justify-between gap-3">
            <p className="min-w-0 text-sm leading-snug text-dash-ink-soft">
              {isNew ? base.summary : "Suggested next steps for this plan."}
            </p>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <PhaseStrip
            phases={phases}
            planStart={planStart}
            planEnd={planEnd}
            current={stripPhase}
            onJump={jumpToPhase}
          />
          <CardsView
            ref={cards}
            tasks={tasks}
            index={index}
            phases={phases}
            planStart={planStart}
            planEnd={planEnd}
            dates={dates}
            errors={errors}
            editing={editingKey !== null}
            cutCount={summary.cut}
            focusToken={focusToken}
            canAdd={canAdd}
            onDecide={decide}
            onEdit={() => current && startEdit(current.key)}
            onEditDone={(next) => current && finishEdit(current.key, next)}
            onEditCancel={cancelEdit}
            onOpenTray={() => setTrayOpen(true)}
            onSkipToSummary={() => {
              setSummaryOpen(true);
              setSeen(total);
            }}
            onAddTask={() => addTask(current?.phaseId ?? phases[0]?.id ?? "")}
          />
        </>
      )}
      {addError && !summaryOpen ? (
        <p role="alert" className="text-center text-[13px] font-medium text-dash-bad">
          {addError}
        </p>
      ) : null}
      {dialogs}
    </div>
  );
}
