"use client";

import { Canvas, FabricImage, Textbox, type FabricObject, filters } from "fabric";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";

const STICKERS = ["😂", "🔥", "💀", "🐸", "😎", "🤡", "🎉", "👀", "🫠", "💩", "❌", "✨", "🧠", "🤖", "🥸", "😭"];

// Curated face kit — drop these on faces to create instant funny faces.
// Each is a unicode character / emoji that looks like a face part or accessory.
const FACE_KIT: { emoji: string; size?: number; label: string }[] = [
  { emoji: "👓", label: "Glasses" },
  { emoji: "🕶️", label: "Shades" },
  { emoji: "🥽", label: "Goggles" },
  { emoji: "🧿", label: "Evil eye" },
  { emoji: "👁️", label: "Eye" },
  { emoji: "👀", label: "Eyes" },
  { emoji: "👃", label: "Nose" },
  { emoji: "👄", label: "Lips" },
  { emoji: "👅", label: "Tongue" },
  { emoji: "👂", label: "Ear" },
  { emoji: "🦷", label: "Tooth" },
  { emoji: "🪮", label: "Hair" },
  { emoji: "〰️", label: "Stache" },
  { emoji: "🎩", label: "Top hat" },
  { emoji: "👑", label: "Crown" },
  { emoji: "🎓", label: "Grad cap" },
  { emoji: "🧢", label: "Cap" },
  { emoji: "👒", label: "Sun hat" },
  { emoji: "⛑️", label: "Hard hat" },
  { emoji: "🪖", label: "Helmet" },
  { emoji: "🎅", label: "Santa" },
  { emoji: "😇", label: "Halo" },
  { emoji: "😈", label: "Horns" },
  { emoji: "🤡", label: "Clown" },
  { emoji: "🥸", label: "Disguise" },
  { emoji: "🤠", label: "Cowboy" },
  { emoji: "🧐", label: "Monocle" },
  { emoji: "🤯", label: "Explode" },
  { emoji: "💀", label: "Skull" },
  { emoji: "💥", label: "Boom" },
  { emoji: "💢", label: "Anger" },
  { emoji: "💤", label: "Sleep" },
  { emoji: "💫", label: "Dizzy" },
  { emoji: "⭐", label: "Star" },
  { emoji: "❗", label: "Bang" },
  { emoji: "❓", label: "Question" },
  { emoji: "💦", label: "Sweat" },
  { emoji: "🔥", label: "Fire" },
];

// Filter library — each preset can be toggled on/off, and they stack.
type FilterKey =
  | "grayscale" | "sepia" | "invert" | "pixelate" | "blur"
  | "deepfry" | "nuked" | "cursed" | "vhs" | "sunshine"
  | "cold" | "acid" | "noir" | "bubblegum" | "grainy"
  | "washed" | "y2k" | "night" | "highsat" | "lowsat";

interface FilterPreset { label: string; emoji: string; build: () => unknown[] }

/* eslint-disable @typescript-eslint/no-explicit-any */
const F = filters as any;

const PRESETS: Record<FilterKey, FilterPreset> = {
  grayscale: { label: "Grayscale", emoji: "⚫", build: () => [new F.Grayscale()] },
  sepia: { label: "Sepia", emoji: "🟤", build: () => [new F.Sepia()] },
  invert: { label: "Invert", emoji: "🔁", build: () => [new F.Invert()] },
  pixelate: { label: "Pixelate", emoji: "🟦", build: () => [new F.Pixelate({ blocksize: 12 })] },
  blur: { label: "Blur", emoji: "💨", build: () => [new F.Blur({ blur: 0.25 })] },
  deepfry: { label: "Deep Fry", emoji: "🍳", build: () => [
    new F.Contrast({ contrast: 0.8 }),
    new F.Saturation({ saturation: 0.9 }),
    new F.Noise({ noise: 40 }),
    new F.Brightness({ brightness: 0.05 }),
  ] },
  nuked: { label: "Nuked", emoji: "☢️", build: () => [
    new F.Contrast({ contrast: 1.0 }),
    new F.Saturation({ saturation: 1.0 }),
    new F.Noise({ noise: 90 }),
    new F.Pixelate({ blocksize: 3 }),
  ] },
  cursed: { label: "Cursed", emoji: "🕯️", build: () => [
    new F.Brightness({ brightness: -0.2 }),
    new F.Contrast({ contrast: 0.6 }),
    new F.Noise({ noise: 60 }),
    new F.Saturation({ saturation: -0.4 }),
  ] },
  vhs: { label: "VHS", emoji: "📼", build: () => [
    new F.Noise({ noise: 25 }),
    new F.Saturation({ saturation: -0.2 }),
    new F.HueRotation({ rotation: -0.03 }),
  ] },
  sunshine: { label: "Sunshine", emoji: "☀️", build: () => [
    new F.Brightness({ brightness: 0.12 }),
    new F.Saturation({ saturation: 0.4 }),
    new F.Contrast({ contrast: 0.15 }),
  ] },
  cold: { label: "Freezer", emoji: "🧊", build: () => [
    new F.HueRotation({ rotation: 0.18 }),
    new F.Saturation({ saturation: -0.15 }),
  ] },
  acid: { label: "Acid", emoji: "🧪", build: () => [
    new F.HueRotation({ rotation: 1.8 }),
    new F.Saturation({ saturation: 0.8 }),
    new F.Contrast({ contrast: 0.3 }),
  ] },
  noir: { label: "Noir", emoji: "🎩", build: () => [
    new F.Grayscale(),
    new F.Contrast({ contrast: 0.4 }),
  ] },
  bubblegum: { label: "Bubblegum", emoji: "🍬", build: () => [
    new F.HueRotation({ rotation: -0.5 }),
    new F.Saturation({ saturation: 0.6 }),
    new F.Brightness({ brightness: 0.1 }),
  ] },
  grainy: { label: "Film Grain", emoji: "🎞️", build: () => [new F.Noise({ noise: 35 })] },
  washed: { label: "Faded", emoji: "🫧", build: () => [
    new F.Saturation({ saturation: -0.5 }),
    new F.Brightness({ brightness: 0.12 }),
    new F.Contrast({ contrast: -0.15 }),
  ] },
  y2k: { label: "Y2K", emoji: "💿", build: () => [
    new F.HueRotation({ rotation: -0.25 }),
    new F.Saturation({ saturation: 0.4 }),
    new F.Pixelate({ blocksize: 2 }),
  ] },
  night: { label: "Night", emoji: "🌃", build: () => [
    new F.Brightness({ brightness: -0.3 }),
    new F.HueRotation({ rotation: 0.3 }),
  ] },
  highsat: { label: "Vivid", emoji: "🌈", build: () => [new F.Saturation({ saturation: 1.0 })] },
  lowsat: { label: "Muted", emoji: "🌫️", build: () => [new F.Saturation({ saturation: -0.5 })] },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

interface MemeEditorProps {
  onSubmit: (dataUrl: string) => Promise<void>;
  disabled?: boolean;
}

export function MemeEditor({ onSubmit, disabled = false }: MemeEditorProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const baseImageRef = useRef<FabricImage | null>(null);
  const [topText, setTopText] = useState("TOP TEXT");
  const [bottomText, setBottomText] = useState("BOTTOM TEXT");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [showAllFaceKit, setShowAllFaceKit] = useState(false);

  useEffect(() => {
    if (!canvasElRef.current || canvasRef.current) return;
    const canvas = new Canvas(canvasElRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#f4ecd8",
      preserveObjectStacking: true,
    });
    canvasRef.current = canvas;
    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
  }, []);

  const applyActiveFilters = useCallback((set: Set<FilterKey>) => {
    const image = baseImageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const stacked: unknown[] = [];
    for (const key of set) stacked.push(...PRESETS[key].build());
    image.filters = stacked as typeof image.filters;
    image.applyFilters();
    canvas.requestRenderAll();
  }, []);

  const toggleFilter = useCallback(
    (key: FilterKey) => {
      setActiveFilters((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        applyActiveFilters(next);
        return next;
      });
    },
    [applyActiveFilters],
  );

  const clearFilters = useCallback(() => {
    setActiveFilters(new Set());
    applyActiveFilters(new Set());
  }, [applyActiveFilters]);

  const addImage = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !canvasRef.current) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result;
          if (typeof result !== "string" || !canvasRef.current) return;

          const canvas = canvasRef.current;
          const image = await FabricImage.fromURL(result);
          if (!image.width || !image.height) {
            throw new Error("Uploaded image dimensions could not be read.");
          }

          // Scale to fit (contain) — keeps the whole image visible.
          const scale = Math.min(
            (canvas.getWidth() - 20) / image.width,
            (canvas.getHeight() - 20) / image.height,
          );
          image.scale(scale);
          image.set({
            originX: "center",
            originY: "center",
            selectable: false,
            evented: false,
          });

          canvas.clear();
          canvas.backgroundColor = "#f4ecd8";
          canvas.add(image);
          // IMPORTANT: centerObject works correctly after .add() and respects origins.
          canvas.centerObject(image);
          canvas.sendObjectToBack(image);
          baseImageRef.current = image;
          setHasImage(true);
          applyActiveFilters(activeFilters);
          canvas.requestRenderAll();
        } catch (caught) {
          console.error("Unable to load uploaded image.", caught);
        }
      };

      reader.readAsDataURL(file);
    },
    [activeFilters, applyActiveFilters],
  );

  const addCaption = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const top = new Textbox(topText || "TOP TEXT", {
      left: canvas.getWidth() / 2,
      top: 40,
      width: 700,
      textAlign: "center",
      fontSize: 52,
      fontWeight: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 3,
      originX: "center",
      originY: "center",
      fontFamily: "Impact, sans-serif",
      editable: true,
    });

    const bottom = new Textbox(bottomText || "BOTTOM TEXT", {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() - 40,
      width: 700,
      textAlign: "center",
      fontSize: 52,
      fontWeight: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 3,
      originX: "center",
      originY: "center",
      fontFamily: "Impact, sans-serif",
      editable: true,
    });

    canvas.add(top, bottom);
    canvas.setActiveObject(top);
    canvas.requestRenderAll();
  }, [bottomText, topText]);

  const addEmoji = useCallback((emoji: string, size = 90) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const item = new Textbox(emoji, {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      fontSize: size,
      originX: "center",
      originY: "center",
      editable: false,
    });
    canvas.add(item);
    canvas.setActiveObject(item);
    canvas.requestRenderAll();
  }, []);

  const deleteActive = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && active !== baseImageRef.current) {
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }, []);

  const transformActive = useCallback((mode: "rotate" | "flip-x" | "flip-y") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = (canvas.getActiveObject() ?? baseImageRef.current) as FabricObject | null;
    if (!target) return;
    if (mode === "rotate") target.set("angle", ((target.angle ?? 0) + 15) % 360);
    if (mode === "flip-x") target.set("flipX", !target.flipX);
    if (mode === "flip-y") target.set("flipY", !target.flipY);
    canvas.requestRenderAll();
  }, []);

  const exportMeme = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageRef.current || disabled) return;
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setIsSubmitting(true);
    try {
      const dataUrl = canvas.toDataURL({ format: "png", quality: 0.92, multiplier: 1 });
      await onSubmit(dataUrl);
    } finally {
      setIsSubmitting(false);
    }
  }, [disabled, onSubmit]);

  const filterKeys = Object.keys(PRESETS) as FilterKey[];
  const faceKitVisible = showAllFaceKit ? FACE_KIT : FACE_KIT.slice(0, 12);

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <SectionCard className="space-y-5">
        <div>
          <h2 className="font-display text-xl">▓ Caption Controls</h2>
          <p className="mt-1 font-mono text-xs text-ink/70">
            Upload a photo → slap stuff on it → remix filters → submit.
          </p>
        </div>

        <label className="block">
          Upload image
          <input
            type="file"
            accept="image/*"
            onChange={addImage}
            className="mt-2 block w-full cursor-pointer"
          />
        </label>

        <label className="block">
          Top text
          <input value={topText} onChange={(e) => setTopText(e.target.value)} className="mt-2 w-full" />
        </label>

        <label className="block">
          Bottom text
          <input value={bottomText} onChange={(e) => setBottomText(e.target.value)} className="mt-2 w-full" />
        </label>

        <PrimaryButton type="button" onClick={addCaption} className="w-full">
          Add draggable captions
        </PrimaryButton>

        {/* ---- FACE KIT ---- */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-xs uppercase tracking-[0.15em]">
              Face Kit <span className="text-ink/50">({FACE_KIT.length})</span>
            </p>
            <button
              type="button"
              onClick={() => setShowAllFaceKit((v) => !v)}
              className="font-display text-[10px] uppercase text-ink/60 underline underline-offset-2 hover:text-riso-pink"
            >
              {showAllFaceKit ? "less" : "all"}
            </button>
          </div>
          <p className="mb-2 font-mono text-[10px] text-ink/60">
            Drop funny face parts on any photo. Resize, rotate, pile them on.
          </p>
          <div className="grid grid-cols-6 gap-1.5">
            {faceKitVisible.map((item) => (
              <button
                key={item.emoji + item.label}
                type="button"
                onClick={() => addEmoji(item.emoji, 120)}
                title={item.label}
                className="border-[2px] border-ink bg-paper-deep p-1.5 text-xl shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-yellow"
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* ---- STICKERS ---- */}
        <div>
          <p className="mb-2 font-display text-xs uppercase tracking-[0.15em]">Reaction stickers</p>
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => addEmoji(sticker, 80)}
                className="border-[2px] border-ink bg-paper-deep p-2 text-2xl shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-yellow"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>

        {/* ---- FILTERS (STACKABLE) ---- */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-display text-xs uppercase tracking-[0.15em]">
              Filters <span className="text-ink/50">({filterKeys.length})</span>
            </p>
            {activeFilters.size > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="font-display text-[10px] uppercase text-ink/60 underline underline-offset-2 hover:text-riso-pink"
              >
                clear {activeFilters.size}
              </button>
            ) : null}
          </div>
          <p className="mb-2 font-mono text-[10px] text-ink/60">
            Click to stack filters — combine as many as you want.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {filterKeys.map((key) => {
              const preset = PRESETS[key];
              const on = activeFilters.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFilter(key)}
                  disabled={!hasImage}
                  className={`border-[2px] border-ink px-2 py-2 text-left font-display text-[11px] uppercase shadow-stamp-sm transition-transform hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40 ${
                    on ? "bg-riso-pink" : "bg-paper-deep"
                  }`}
                >
                  <span className="mr-1">{preset.emoji}</span>
                  {preset.label}
                  {on ? <span className="ml-1">✓</span> : null}
                </button>
              );
            })}
          </div>
          {!hasImage ? (
            <p className="mt-2 font-mono text-[10px] text-ink/60">
              Upload an image first to unlock filters.
            </p>
          ) : null}
        </div>

        {/* ---- TRANSFORMS ---- */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "↻", title: "Rotate 15°", mode: "rotate" as const },
            { label: "⇆", title: "Flip horizontal", mode: "flip-x" as const },
            { label: "⇅", title: "Flip vertical", mode: "flip-y" as const },
          ].map((t) => (
            <button
              key={t.mode}
              type="button"
              onClick={() => transformActive(t.mode)}
              title={t.title}
              className="border-[2px] border-ink bg-paper-deep px-2 py-2 text-lg shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-blue hover:text-paper"
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={deleteActive}
            title="Delete selected"
            className="border-[2px] border-ink bg-paper-deep px-2 py-2 text-lg shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-pink"
          >
            ✗
          </button>
        </div>

        <PrimaryButton
          type="button"
          onClick={exportMeme}
          disabled={disabled || isSubmitting || !hasImage}
          className="w-full"
        >
          {isSubmitting ? "Submitting…" : "▸ Submit meme"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard className="overflow-auto bg-paper-deep">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-[0.2em] text-ink/70">
            ▓▓ Your Canvas ▓▓
          </span>
          <span className="font-pixel text-base text-ink/60">
            {hasImage ? "remix away" : "upload a photo to begin"}
          </span>
        </div>
        <div className="flex items-center justify-center">
          <canvas
            ref={canvasElRef}
            className="max-w-full border-[2.5px] border-ink shadow-stamp"
          />
        </div>
      </SectionCard>
    </div>
  );
}
