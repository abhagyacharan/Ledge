"use client";

import { useId, useState } from "react";
import { trimTime } from "@/lib/dates";
import { PlanSelect } from "@/modules/planner/components/review/plan-select";
import {
  DeviceReminders,
  type ReminderDevice,
} from "@/modules/reminders/components/device-reminders";
import { updateReminderSettingsAction } from "@/modules/reminders/notification-actions";
import { REMINDER_DEFAULT_OPTIONS } from "@/modules/reminders/push-support";
import { SavedMark } from "./saved-mark";
import { ErrorLine, GroupLabel, settingsCard, Sub, Switch } from "./ui";
import { useSave } from "./use-save";

type Values = {
  reminderDefault: string;
  morning: string;
  quietStart: string | null;
  quietEnd: string | null;
};

const QUIET_START = "23:00";
const QUIET_END = "07:00";

const timeInput =
  "h-11 rounded-xl bg-dash-well px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm";

/**
 * Settings › Notifications: reminders on this device, the devices that have them, a test, then the
 * default reminder, the morning time and quiet hours (docs/reminders-spec.md §5, §6). Each setting
 * saves on its own with "Saved"; a failure puts the old value back with "Couldn't save".
 */
export function NotificationsSection({
  publicKey,
  devices,
  settings,
}: {
  publicKey: string;
  devices: ReminderDevice[];
  settings: {
    reminderDefault: string;
    reminderMorningTime: string;
    quietStart: string | null;
    quietEnd: string | null;
  };
}) {
  const ids = useId();
  const [values, setValues] = useState<Values>({
    reminderDefault: settings.reminderDefault,
    morning: trimTime(settings.reminderMorningTime),
    quietStart: settings.quietStart ? trimTime(settings.quietStart) : null,
    quietEnd: settings.quietEnd ? trimTime(settings.quietEnd) : null,
  });
  const defaultSave = useSave();
  const morningSave = useSave();
  const quietSave = useSave();
  const [morningDraft, setMorningDraft] = useState(values.morning);
  const [startDraft, setStartDraft] = useState(values.quietStart ?? QUIET_START);
  const [endDraft, setEndDraft] = useState(values.quietEnd ?? QUIET_END);

  const quietOn = values.quietStart !== null && values.quietEnd !== null;

  function persist(saver: ReturnType<typeof useSave>, next: Values, revert: () => void = () => {}) {
    const before = values;
    saver.save(
      () =>
        updateReminderSettingsAction({
          reminderDefault: next.reminderDefault,
          reminderMorningTime: next.morning,
          quietStart: next.quietStart,
          quietEnd: next.quietEnd,
        }),
      {
        apply: () => setValues(next),
        undo: () => {
          setValues(before);
          setMorningDraft(before.morning);
          setStartDraft(before.quietStart ?? QUIET_START);
          setEndDraft(before.quietEnd ?? QUIET_END);
          revert();
        },
      },
    );
  }

  function saveQuietTime(which: "start" | "end", value: string) {
    if (!quietOn || !value) return;
    const next =
      which === "start" ? { ...values, quietStart: value } : { ...values, quietEnd: value };
    if (next.quietStart === values.quietStart && next.quietEnd === values.quietEnd) return;
    persist(quietSave, next);
  }

  return (
    <>
      <DeviceReminders publicKey={publicKey} devices={devices} />

      <div className="flex items-center">
        <GroupLabel id={`${ids}-default`}>Default reminder</GroupLabel>
        <SavedMark at={defaultSave.savedAt} />
      </div>
      <div className={`${settingsCard} flex flex-col gap-2 p-4`}>
        <PlanSelect
          variant="field"
          label="Default reminder for tasks with a time"
          value={values.reminderDefault}
          options={REMINDER_DEFAULT_OPTIONS}
          onChange={(value) => {
            if (value === values.reminderDefault) return;
            persist(defaultSave, { ...values, reminderDefault: value });
          }}
        />
        {defaultSave.retry ? (
          <ErrorLine onRetry={defaultSave.retry}>Couldn&apos;t save.</ErrorLine>
        ) : (
          <Sub>
            Applies to new tasks that have a due time. A task can still pick its own, or none.
          </Sub>
        )}
      </div>

      <div className="flex items-center">
        <GroupLabel id={`${ids}-morning`}>Tasks without a time</GroupLabel>
        <SavedMark at={morningSave.savedAt} />
      </div>
      <div className={`${settingsCard} flex flex-col gap-2 p-4`}>
        <div className="flex items-center gap-3">
          <label htmlFor={`${ids}-morning-time`} className="flex-1 text-[15px] font-medium">
            Remind me at
          </label>
          <input
            id={`${ids}-morning-time`}
            type="time"
            value={morningDraft}
            aria-describedby={`${ids}-morning-hint`}
            onChange={(e) => setMorningDraft(e.target.value)}
            onBlur={() => {
              if (!morningDraft) {
                setMorningDraft(values.morning);
                return;
              }
              if (morningDraft === values.morning) return;
              persist(morningSave, { ...values, morning: morningDraft });
            }}
            className={timeInput}
          />
        </div>
        {morningSave.retry ? (
          <ErrorLine onRetry={morningSave.retry}>Couldn&apos;t save.</ErrorLine>
        ) : (
          <span id={`${ids}-morning-hint`}>
            <Sub>A task with a date but no time is reminded at this time on its day.</Sub>
          </span>
        )}
      </div>

      <div className="flex items-center">
        <GroupLabel id={`${ids}-quiet`}>Quiet hours</GroupLabel>
        <SavedMark at={quietSave.savedAt} />
      </div>
      <div className={settingsCard}>
        <div className="flex items-start gap-3 p-4">
          <span className="min-w-0 flex-1">
            <span id={`${ids}-quiet-label`} className="block text-[15px] font-semibold">
              Hold reminders overnight
            </span>
            <Sub className="mt-0.5">
              <span id={`${ids}-quiet-hint`}>
                A reminder that falls in this window waits and arrives when it ends.
              </span>
            </Sub>
          </span>
          <Switch
            on={quietOn}
            labelledBy={`${ids}-quiet-label`}
            describedBy={`${ids}-quiet-hint`}
            onChange={(next) =>
              persist(
                quietSave,
                next
                  ? {
                      ...values,
                      quietStart: startDraft || QUIET_START,
                      quietEnd: endDraft || QUIET_END,
                    }
                  : { ...values, quietStart: null, quietEnd: null },
              )
            }
          />
        </div>
        {quietOn ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-dash-edge px-4 py-3">
            <label className="flex items-center gap-3 text-[15px] font-medium">
              From
              <input
                type="time"
                value={startDraft}
                onChange={(e) => setStartDraft(e.target.value)}
                onBlur={() => saveQuietTime("start", startDraft)}
                className={timeInput}
              />
            </label>
            <label className="flex items-center gap-3 text-[15px] font-medium">
              Until
              <input
                type="time"
                value={endDraft}
                onChange={(e) => setEndDraft(e.target.value)}
                onBlur={() => saveQuietTime("end", endDraft)}
                className={timeInput}
              />
            </label>
          </div>
        ) : null}
        {quietSave.retry ? (
          <div className="px-4 pb-3">
            <ErrorLine onRetry={quietSave.retry}>Couldn&apos;t save.</ErrorLine>
          </div>
        ) : null}
      </div>
    </>
  );
}
