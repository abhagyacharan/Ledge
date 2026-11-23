"use client";

import { Lock, Move, Pencil, Trash2, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type PointerEvent } from "react";
import { Sheet, SheetBody, SheetFooter, SheetHeader } from "@/components/dash/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { run, undoToast } from "@/modules/todos/components/run-action";
import {
  googlePhotoAction,
  removeAvatarAction,
  restoreAvatarAction,
  updateNameAction,
  uploadAvatarAction,
} from "../actions";
import { AVATAR_SIDE, checkPicked, cropSquare, PICKABLE_TYPES, shownAvatar } from "../avatar";
import { SavedMark } from "./saved-mark";
import { Avatar, ErrorLine, pill, SectionHeader, settingsCard, Sub } from "./ui";
import { useSave } from "./use-save";
import { GoogleG } from "@/modules/auth/google-mark";

type Picked = { url: string; name: string; size: number; width: number; height: number };

/**
 * Settings › Account (screens 9b, 9c, 9d): the optional photo with its Edit menu and crop sheet,
 * the name (saves when you leave the field), and the email, read-only because you sign in with
 * it.
 */
export function AccountSection({
  name,
  email,
  image,
  google,
}: {
  name: string;
  email: string;
  image: string | null;
  /** Google is connected: shows "Signed in with Google" and offers the Google photo. */
  google: boolean;
}) {
  const router = useRouter();
  const mobile = useIsMobile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [photoSavedAt, setPhotoSavedAt] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const hasPhoto = shownAvatar(image) !== null;

  function pick() {
    setMenuOpen(false);
    fileRef.current?.click();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const problem = checkPicked(file);
    if (problem) {
      setPhotoError(problem);
      return;
    }
    setPhotoError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      setPicked({
        url,
        name: file.name,
        size: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setPhotoError("Ledge can't use that file. Try a JPEG, PNG or WebP.");
    };
    img.src = url;
  }

  function after(result: { ok: boolean; error?: string }) {
    if (result.ok) {
      setPhotoError(null);
      setPhotoSavedAt((n) => (n ?? 0) + 1);
      router.refresh();
    } else setPhotoError(result.error ?? "Couldn't save. Try again.");
  }

  function upload(blob: Blob) {
    const form = new FormData();
    form.set("photo", blob, "photo");
    startBusy(async () => {
      try {
        after(await uploadAvatarAction(form));
      } catch {
        after({ ok: false, error: "Couldn't reach the server. Try again." });
      }
    });
  }

  function takeGooglePhoto() {
    setMenuOpen(false);
    startBusy(async () => {
      try {
        after(await googlePhotoAction({}));
      } catch {
        after({ ok: false, error: "Couldn't reach the server. Try again." });
      }
    });
  }

  function remove() {
    setMenuOpen(false);
    const before = image;
    startBusy(async () => {
      const result = await run(removeAvatarAction({}));
      if (!result.ok) return;
      router.refresh();
      if (before && shownAvatar(before)) {
        undoToast("Photo removed.", () => {
          void run(restoreAvatarAction({ image: before })).then((r) => r.ok && router.refresh());
        });
      }
    });
  }

  function select(option: string) {
    if (option === "upload") pick();
    else if (option === "google") takeGooglePhoto();
    else if (option === "remove") remove();
  }

  const options = [
    {
      id: "upload",
      icon: <Upload aria-hidden className="size-4" />,
      label: "Upload a photo",
      sub: "JPEG, PNG or WebP, up to 5 MB",
    },
    ...(google
      ? [
          {
            id: "google",
            icon: <GoogleG className="size-4" />,
            label: "Use my Google photo",
            sub: `From ${email}`,
          },
        ]
      : []),
    ...(hasPhoto
      ? [
          {
            id: "remove",
            icon: <Trash2 aria-hidden className="size-4" />,
            label: "Remove photo",
            sub: "Your initials show instead",
          },
        ]
      : []),
  ];

  const editButton = (
    <button
      type="button"
      aria-haspopup="menu"
      aria-label="Edit profile picture"
      disabled={busy}
      onClick={mobile ? () => setMenuOpen(true) : undefined}
      // The visible pill is 32px; the padding takes the tap area to 44px.
      className="absolute -bottom-3 left-1/2 inline-flex h-11 -translate-x-1/2 items-center rounded-full px-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="inline-flex h-8 items-center gap-1 rounded-full border border-dash-edge bg-dash-card px-3 text-[12px] font-semibold text-dash-ink shadow-(--dash-lift)">
        <Pencil aria-hidden className="size-3" />
        Edit
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Account" />

      <section
        aria-label="Profile picture"
        className={cn(
          settingsCard,
          "flex flex-col items-center gap-4 rounded-3xl px-5 pt-7 pb-5 md:flex-row md:gap-6 md:p-6",
        )}
      >
        <div className="relative">
          <span
            className={cn(
              "block rounded-full p-[3px]",
              busy &&
                "animate-spin [background:conic-gradient(var(--color-dash-accent)_0_30%,var(--color-dash-track)_0)]",
            )}
          >
            <Avatar
              image={image}
              name={name}
              className={cn("size-24 text-[30px]", busy && "animate-none opacity-50")}
            />
          </span>
          {mobile ? (
            editButton
          ) : (
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>{editButton}</DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                {options.map((o) => (
                  <DropdownMenuItem
                    key={o.id}
                    onSelect={() => select(o.id)}
                    className="items-start gap-3 py-2"
                  >
                    <span className="mt-0.5">{o.icon}</span>
                    <span>
                      <span className="block text-[14px] font-medium">{o.label}</span>
                      <span className="block text-[12px] text-muted-foreground">{o.sub}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center md:items-start md:text-left">
          <p className="hidden text-[15px] font-semibold md:block">Profile picture</p>
          <Sub className="max-w-80 pt-1 md:pt-0">
            Optional. Without a photo, your initials show in the sidebar and on Settings.
          </Sub>
          {busy ? (
            <span role="status" className="text-[13px] font-medium">
              Saving photo…
            </span>
          ) : null}
          <SavedMark at={photoSavedAt} />
          {photoError ? <ErrorLine className="text-left">{photoError}</ErrorLine> : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={PICKABLE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </section>

      <NameAndEmail name={name} email={email} google={google} />

      {/* Phones: the photo menu as a bottom sheet (screen 9d). */}
      <Sheet open={mobile && menuOpen} onOpenChange={setMenuOpen}>
        <SheetHeader title="Profile picture" />
        <SheetBody>
          <div role="menu" aria-label="Profile picture" className="flex flex-col gap-1">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="menuitem"
                onClick={() => select(o.id)}
                className="flex min-h-14 items-center gap-3 rounded-2xl px-2 text-left outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="grid size-9 place-items-center rounded-full bg-dash-well">
                  {o.icon}
                </span>
                <span>
                  <span className="block text-[15px] font-medium">{o.label}</span>
                  <Sub>{o.sub}</Sub>
                </span>
              </button>
            ))}
          </div>
        </SheetBody>
      </Sheet>

      <CropSheet
        picked={picked}
        onClose={() => {
          if (picked) URL.revokeObjectURL(picked.url);
          setPicked(null);
        }}
        onSave={(blob) => {
          if (picked) URL.revokeObjectURL(picked.url);
          setPicked(null);
          upload(blob);
        }}
      />
    </div>
  );
}

function NameAndEmail({ name, email, google }: { name: string; email: string; google: boolean }) {
  const id = useId();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const { save, savedAt, retry } = useSave();

  function commit() {
    const next = value.trim();
    if (next === name.trim()) return;
    if (!next) {
      setError("Enter a name.");
      return;
    }
    setError(null);
    save(() => updateNameAction({ name: next }), {
      apply: () => setValue(next),
      undo: () => setValue(name),
    });
  }

  return (
    <section
      aria-label="Name and email"
      className={cn(settingsCard, "flex flex-col gap-4 rounded-3xl p-5 md:p-6")}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center">
          <label htmlFor={`${id}-name`} className="text-[13px] font-medium text-dash-ink-soft">
            Name
          </label>
          <SavedMark at={savedAt} />
        </div>
        <input
          id={`${id}-name`}
          value={value}
          maxLength={100}
          autoComplete="name"
          aria-invalid={error ? true : undefined}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-12 rounded-2xl bg-dash-well px-4 text-base font-medium text-dash-ink outline-none focus-visible:ring-3 focus-visible:ring-dash-accent/60 md:text-[15px]"
        />
        {error ? <ErrorLine>{error}</ErrorLine> : null}
        {retry ? <ErrorLine onRetry={retry}>Couldn&apos;t save.</ErrorLine> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <span id={`${id}-email`} className="text-[13px] font-medium text-dash-ink-soft">
          Email
        </span>
        {/* Read-only, so it never looks like a field: an outline, not a well, with a lock. */}
        <div
          aria-labelledby={`${id}-email`}
          className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-dash-edge px-4 py-2 text-[15px]"
        >
          <Lock aria-hidden className="size-3.5 text-dash-ink-soft" />
          <span className="min-w-0 break-all">{email}</span>
          {google ? (
            <span className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-dash-well px-2.5 text-[12px] font-medium">
              <GoogleG className="size-3.5" />
              Signed in with Google
            </span>
          ) : null}
        </div>
        <Sub>You sign in with this email, so it can&apos;t be changed here.</Sub>
      </div>
    </section>
  );
}

/**
 * The crop sheet (screen 9d): a square with a round preview, drag to move, a zoom slider, then
 * Save photo. The browser cuts the square and shrinks it to 256px before anything is sent.
 */
function CropSheet({
  picked,
  onClose,
  onSave,
}: {
  picked: Picked | null;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [box, setBox] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const measure = (el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new ResizeObserver(() => setBox(el.clientWidth));
    observer.current.observe(el);
  };
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const zoomId = useId();
  const [key, setKey] = useState<string | null>(null);
  // A new photo starts centred at 100%.
  if (picked && picked.url !== key) {
    setKey(picked.url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  const crop = picked ? cropSquare(picked.width, picked.height, zoom, offset.x, offset.y) : null;

  function move(dxPx: number, dyPx: number, start: { ox: number; oy: number }) {
    if (!picked || !crop || !box) return;
    const perPx = crop.side / box;
    const spareX = (picked.width - crop.side) / 2;
    const spareY = (picked.height - crop.side) / 2;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setOffset({
      x: spareX > 0 ? clamp(start.ox - (dxPx * perPx) / spareX) : 0,
      y: spareY > 0 ? clamp(start.oy - (dyPx * perPx) / spareY) : 0,
    });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // Keep the sheet's own swipe-to-close out of the way while moving the photo.
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    e.stopPropagation();
    move(e.clientX - drag.current.x, e.clientY - drag.current.y, drag.current);
  }

  async function save() {
    if (!picked || !crop) return;
    setSaving(true);
    const img = new Image();
    img.src = picked.url;
    await img.decode().catch(() => undefined);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIDE;
    canvas.height = AVATAR_SIDE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return setSaving(false);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, crop.x, crop.y, crop.side, crop.side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    // Browsers that can't write WebP hand back a PNG; a JPEG is smaller then.
    const final =
      blob && blob.type === "image/webp"
        ? blob
        : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    setSaving(false);
    if (final) onSave(final);
  }

  const scale = picked && crop && box ? box / crop.side : null;
  const size = !picked
    ? ""
    : picked.size < 1024 * 1024
      ? `${Math.max(1, Math.round(picked.size / 1024))} KB`
      : `${(picked.size / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <Sheet open={picked !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetHeader
        title="Crop your photo"
        description={picked ? `${picked.name} · ${size}` : undefined}
      />
      <SheetBody className="flex flex-col gap-4">
        <div
          ref={measure}
          role="img"
          aria-label="Square crop area. Drag the photo, or use the arrow keys, to move it."
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => {
            const step = 12;
            const by: Record<string, [number, number]> = {
              ArrowLeft: [step, 0],
              ArrowRight: [-step, 0],
              ArrowUp: [0, step],
              ArrowDown: [0, -step],
            };
            const d = by[e.key];
            if (!d) return;
            e.preventDefault();
            move(d[0], d[1], { ox: offset.x, oy: offset.y });
          }}
          className="relative mx-auto aspect-square w-full max-w-[358px] cursor-grab touch-none overflow-hidden rounded-2xl bg-dash-track outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          {picked && crop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picked.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none origin-top-left"
              style={
                scale
                  ? {
                      width: picked.width * scale,
                      height: picked.height * scale,
                      left: -crop.x * scale,
                      top: -crop.y * scale,
                    }
                  : { width: "100%", height: "100%", objectFit: "cover" }
              }
            />
          ) : null}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[8%] rounded-full shadow-[0_0_0_400px_rgb(17_18_20/0.5),inset_0_0_0_2px_#fff]"
          />
          <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex h-7.5 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[rgb(17_18_20/0.7)] px-3 text-[12px] font-medium text-white">
            <Move aria-hidden className="size-3.5" />
            Drag to move
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.2) * 10) / 10))}
            className="grid size-11 place-items-center rounded-full outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ZoomOut aria-hidden className="size-[18px]" />
          </button>
          <label htmlFor={zoomId} className="sr-only">
            Zoom
          </label>
          <input
            id={zoomId}
            type="range"
            min={100}
            max={300}
            step={5}
            value={Math.round(zoom * 100)}
            aria-valuetext={`${Math.round(zoom * 100)}%`}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="h-11 min-w-0 flex-1 accent-dash-ink"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.2) * 10) / 10))}
            className="grid size-11 place-items-center rounded-full outline-none hover:bg-dash-well focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ZoomIn aria-hidden className="size-[18px]" />
          </button>
          <span className="w-11 text-right font-mono text-[12px] text-dash-ink-soft">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </SheetBody>
      <SheetFooter>
        <button type="button" onClick={onClose} className={pill.secondary}>
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className={cn(pill.primary, "flex-1")}
        >
          {saving ? "Saving…" : "Save photo"}
        </button>
      </SheetFooter>
    </Sheet>
  );
}
