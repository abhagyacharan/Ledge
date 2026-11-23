"use client";

import { Bell, BellRing, CircleAlert, Info, Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { ok } from "@/lib/result";
import { cn } from "@/lib/utils";
import { SavedMark } from "@/modules/account/components/saved-mark";
import {
  ErrorLine,
  GroupLabel,
  Notice,
  pill,
  RowIcon,
  rowClass,
  settingsCard,
  Sub,
  Switch,
} from "@/modules/account/components/ui";
import { useSave } from "@/modules/account/components/use-save";
import {
  removeDeviceAction,
  sendTestNotificationAction,
  subscribePushAction,
  unsubscribePushAction,
} from "../notification-actions";
import { detectPushSupport, urlBase64ToUint8Array, type PushSupport } from "../push-support";

export type ReminderDevice = {
  id: string;
  endpoint: string;
  label: string;
  /** Already formatted in the person's locale and time zone. */
  added: string;
};

type Phase = "loading" | PushSupport;

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("worker")), 8000),
  );
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

function currentSupport(): PushSupport {
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return detectPushSupport({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    standalone,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : null,
  });
}

/**
 * "Reminders on this device" (docs/reminders-spec.md §2, §8): the switch that asks for permission
 * and subscribes this browser, the devices that have reminders on, and a test notification.
 */
export function DeviceReminders({
  publicKey,
  devices,
}: {
  publicKey: string;
  devices: ReminderDevice[];
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [testNote, setTestNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [testing, startTest] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [forced, setForced] = useState<boolean | null>(null);
  const switchSave = useSave();

  // What this browser can do and whether it already holds a subscription.
  useEffect(() => {
    let cancelled = false;
    async function look() {
      const support = currentSupport();
      let found: string | null = null;
      if (support === "ready") {
        try {
          const reg = await readyRegistration();
          found = (await reg.pushManager.getSubscription())?.endpoint ?? null;
        } catch {
          // The worker is not ready (plain http, or it failed); the switch will say so if tapped.
        }
      }
      if (cancelled) return;
      setEndpoint(found);
      setPhase(support);
    }
    void look();
    return () => {
      cancelled = true;
    };
  }, []);

  // On means: the browser holds a subscription and the server lists it.
  const serverHas = endpoint !== null && devices.some((d) => d.endpoint === endpoint);
  // `forced` bridges the moment before the refreshed device list arrives.
  const on = phase === "ready" && (forced ?? serverHas);

  function turnOn() {
    setError(null);
    startBusy(async () => {
      try {
        // Asked straight from the tap: iPhone refuses the prompt otherwise.
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPhase(permission === "denied" ? "denied" : "ready");
          if (permission !== "denied") setError("Allow notifications to turn reminders on.");
          return;
        }
        const reg = await readyRegistration();
        const options = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        };
        let sub: PushSubscription;
        try {
          sub = await reg.pushManager.subscribe(options);
        } catch {
          // A subscription made with another key blocks a new one; drop it and try once more.
          await (await reg.pushManager.getSubscription())?.unsubscribe();
          sub = await reg.pushManager.subscribe(options);
        }
        const result = await subscribePushAction(sub.toJSON());
        if (!result.ok) {
          await sub.unsubscribe();
          setEndpoint(null);
          setError(result.error);
          return;
        }
        setEndpoint(sub.endpoint);
        setForced(true);
        switchSave.save(async () => result, { apply: () => {}, undo: () => {} });
      } catch {
        setError("Couldn't turn reminders on here. Try again.");
      }
    });
  }

  function turnOff() {
    setError(null);
    startBusy(async () => {
      try {
        const reg = await readyRegistration();
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          const result = await unsubscribePushAction({ endpoint: sub.endpoint });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          await sub.unsubscribe();
        }
        setEndpoint(null);
        setForced(false);
        switchSave.save(async () => ok(), {
          apply: () => {},
          undo: () => {},
        });
      } catch {
        setError("Couldn't turn reminders off here. Try again.");
      }
    });
  }

  async function removeDevice(device: ReminderDevice) {
    setRemoving(device.id);
    setError(null);
    try {
      const result = await removeDeviceAction({ id: device.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (device.endpoint === endpoint) {
        const reg = await readyRegistration();
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        setEndpoint(null);
        setForced(false);
      }
    } catch {
      setError("Couldn't turn that device off. Try again.");
    } finally {
      setRemoving(null);
    }
  }

  function sendTest() {
    setTestNote(null);
    startTest(async () => {
      try {
        const result = await sendTestNotificationAction();
        if (!result.ok) {
          setTestNote({ text: result.error, bad: true });
        } else if (result.data.sent > 0) {
          setTestNote({
            text: `Sent to ${result.data.sent} ${result.data.sent === 1 ? "device" : "devices"}.`,
            bad: false,
          });
        } else if (result.data.failed > 0) {
          setTestNote({ text: "Couldn't reach your devices. Try again.", bad: true });
        } else {
          setTestNote({ text: "No device has reminders on.", bad: true });
        }
      } catch {
        setTestNote({ text: "Couldn't send the test. Try again.", bad: true });
      }
    });
  }

  return (
    <>
      {phase === "ios-install" ? (
        <Notice icon={<Info aria-hidden />}>
          <p className="font-semibold">Add Ledge to your Home Screen first</p>
          <p className="mt-1 text-dash-ink-soft">
            On iPhone and iPad, reminders work only in the installed app (iOS 16.4 or later). Tap
            Share, then Add to Home Screen, open Ledge from there and come back to this page.
          </p>
        </Notice>
      ) : phase === "unsupported" ? (
        <Notice icon={<Info aria-hidden />}>
          This browser can&apos;t receive notifications from Ledge. Try Chrome, Edge, Firefox or
          Safari on a recent device.
        </Notice>
      ) : phase === "denied" ? (
        <Notice icon={<Info aria-hidden />}>
          <p className="font-semibold">Notifications are blocked for Ledge</p>
          <p className="mt-1 text-dash-ink-soft">
            Allow them in your browser&apos;s site settings (the lock or tune icon beside the
            address, then Notifications), or in your phone&apos;s settings for Ledge. Then reload
            this page.
          </p>
        </Notice>
      ) : (
        <div className={settingsCard}>
          <div className="flex items-start gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span id="device-label" className="flex items-center text-[15px] font-semibold">
                Reminders on this device
                <SavedMark at={switchSave.savedAt} />
              </span>
              <Sub className="mt-0.5">
                <span id="device-hint">
                  Task reminders arrive as notifications here, even when Ledge is closed.
                </span>
              </Sub>
            </span>
            <Switch
              on={on}
              disabled={phase === "loading" || busy}
              labelledBy="device-label"
              describedBy="device-hint"
              onChange={(next) => (next ? turnOn() : turnOff())}
            />
          </div>
          {error ? (
            <div className="px-4 pb-3">
              <ErrorLine>{error}</ErrorLine>
            </div>
          ) : null}
        </div>
      )}

      <GroupLabel id="devices-title">Devices with reminders</GroupLabel>
      <div aria-labelledby="devices-title" role="group" className={settingsCard}>
        {devices.length === 0 ? (
          <p className="px-4 py-4 text-[14px] text-dash-ink-soft">No device has reminders on.</p>
        ) : (
          devices.map((d) => (
            <div key={d.id} className={cn(rowClass, "font-medium")}>
              <RowIcon>
                <Smartphone />
              </RowIcon>
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {d.label}
                  {d.endpoint === endpoint ? (
                    <span className="ml-2 text-[12px] font-normal text-dash-ink-soft">
                      This device
                    </span>
                  ) : null}
                </span>
                <Sub>Added {d.added}</Sub>
              </span>
              <button
                type="button"
                disabled={removing === d.id}
                onClick={() => void removeDevice(d)}
                aria-label={`Turn off reminders on ${d.label}`}
                className={pill.small}
              >
                Turn off
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={sendTest} disabled={testing} className={pill.secondary}>
          <BellRing aria-hidden />
          Send a test notification
        </button>
        <span role="status" className="min-w-0 text-[13px] font-medium">
          {testNote ? (
            <span
              className={cn(
                "flex items-center gap-1.5",
                testNote.bad ? "text-dash-bad" : "text-dash-ink-soft",
              )}
            >
              {testNote.bad ? (
                <CircleAlert aria-hidden className="size-4 shrink-0" />
              ) : (
                <Bell aria-hidden className="size-4 shrink-0" />
              )}
              {testNote.text}
            </span>
          ) : null}
        </span>
      </div>
    </>
  );
}
