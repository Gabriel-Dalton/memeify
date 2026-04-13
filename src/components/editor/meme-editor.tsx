"use client";

import { Canvas, FabricImage, Textbox, type FabricObject, filters } from "fabric";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";

const STICKERS = ["😂", "🔥", "💀", "🐸", "😎", "🤡", "🎉", "👀", "🫠", "💩", "❌", "✨", "🧠", "🤖", "🥸", "😭"];

// A small curated filter library. Each preset is a list of fabric filter
// instances — applied together they give a distinct vibe to the base image.
// Most of these let a boring photo look instantly funny.
type FilterKey =
  | "none"
  | "grayscale"
  | "sepia"
  | "invert"
  | "pixelate"
  | "blur"
  | "deepfry"
  | "nuked"
  | "cursed"
  | "vhs"
  | "sunshine"
  | "cold"
  | "acid"
  | "noir"
  | "bubblegum"
  | "grainy"
  | "washed"
  | "y2k"
  | "night";

interface FilterPreset {
  label: string;
  emoji: string;
  build: () => unknown[];
}

// Fabric typings for filter options are loose; we cast to any at the call site.
/* eslint-disable @typescript-eslint/no-explicit-any */
const F = filters as any;

const PRESETS: Record<FilterKey, FilterPreset> = {
  none: { label: "Normal", emoji: "🧼", build: () => [] },
  grayscale: { label: "Grayscale", emoji: "⚫", build: () => [new F.Grayscale()] },
  sepia: { label: "Sepia", emoji: "🟤", build: () => [new F.Sepia()] },
  invert: { label: "Invert", emoji: "🔁", build: () => [new F.Invert()] },
  pixelate: { label: "Pixelate", emoji: "🟦", build: () => [new F.Pixelate({ blocksize: 12 })] },
  blur: { label: "Blur", emoji: "💨", build: () => [new F.Blur({ blur: 0.25 })] },
  deepfry: {
    label: "Deep Fry",
    emoji: "🍳",
    build: () => [
      new F.Contrast({ contrast: 0.8 }),
      new F.Saturation({ saturation: 0.9 }),
      new F.Noise({ noise: 40 }),
      new F.Brightness({ brightness: 0.05 }),
    ],
  },
  nuked: {
    label: "Nuked",
    emoji: "☢️",
    build: () => [
      new F.Contrast({ contrast: 1.0 }),
      new F.Saturation({ saturation: 1.0 }),
      new F.Noise({ noise: 90 }),
      new F.Pixelate({ blocksize: 3 }),
    ],
  },
  cursed: {
    label: "Cursed",
    emoji: "🕯️",
    build: () => [
      new F.Brightness({ brightness: -0.2 }),
      new F.Contrast({ contrast: 0.6 }),
      new F.Noise({ noise: 60 }),
      new F.Saturation({ saturation: -0.4 }),
    ],
  },
  vhs: {
    label: "VHS",
    emoji: "📼",
    build: () => [
      new F.Noise({ noise: 25 }),
      new F.Saturation({ saturation: -0.2 }),
      new F.Contrast({ contrast: -0.1 }),
      new F.HueRotation({ rotation: -0.03 }),
    ],
  },
  sunshine: {
    label: "Sunshine",
    emoji: "☀️",
    build: () => [
      new F.Brightness({ brightness: 0.12 }),
      new F.Saturation({ saturation: 0.4 }),
      new F.Contrast({ contrast: 0.15 }),
    ],
  },
  cold: {
    label: "Freezer",
    emoji: "🧊",
    build: () => [
      new F.HueRotation({ rotation: 0.18 }),
      new F.Saturation({ saturation: -0.15 }),
      new F.Brightness({ brightness: 0.05 }),
    ],
  },
  acid: {
    label: "Acid",
    emoji: "🧪",
    build: () => [
      new F.HueRotation({ rotation: 1.8 }),
      new F.Saturation({ saturation: 0.8 }),
      new F.Contrast({ contrast: 0.3 }),
    ],
  },
  noir: {
    label: "Noir",
    emoji: "🎩",
    build: () => [
      new F.Grayscale(),
      new F.Contrast({ contrast: 0.4 }),
      new F.Brightness({ brightness: -0.05 }),
    ],
  },
  bubblegum: {
    label: "Bubblegum",
    emoji: "🍬",
    build: () => [
      new F.HueRotation({ rotation: -0.5 }),
      new F.Saturation({ saturation: 0.6 }),
      new F.Brightness({ brightness: 0.1 }),
    ],
  },
  grainy: {
    label: "Film Grain",
    emoji: "🎞️",
    build: () => [new F.Noise({ noise: 35 }), new F.Contrast({ contrast: 0.1 })],
  },
  washed: {
    label: "Faded",
    emoji: "🫧",
    build: () => [
      new F.Saturation({ saturation: -0.5 }),
      new F.Brightness({ brightness: 0.12 }),
      new F.Contrast({ contrast: -0.15 }),
    ],
  },
  y2k: {
    label: "Y2K",
    emoji: "💿",
    build: () => [
      new F.HueRotation({ rotation: -0.25 }),
      new F.Saturation({ saturation: 0.4 }),
      new F.Brightness({ brightness: 0.08 }),
      new F.Pixelate({ blocksize: 2 }),
    ],
  },
  night: {
    label: "Night",
    emoji: "🌃",
    build: () => [
      new F.Brightness({ brightness: -0.3 }),
      new F.HueRotation({ rotation: 0.3 }),
      new F.Contrast({ contrast: 0.2 }),
    ],
  },
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
  const [activeFilter, setActiveFilter] = useState<FilterKey>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => {
    if (!canvasElRef.current || canvasRef.current) return;
    const canvas = new Canvas(canvasElRef.current, {
      width: 900,
      height: 520,
      backgroundColor: "#f4ecd8",
      preserveObjectStacking: true,
    });
    canvasRef.current = canvas;
    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
  }, []);

  const applyFilter = useCallback((key: FilterKey) => {
    setActiveFilter(key);
    const image = baseImageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    image.filters = PRESETS[key].build() as typeof image.filters;
    image.applyFilters();
    canvas.requestRenderAll();
  }, []);

  const addImage = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !canvasRef.current) return;

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result;
          if (typeof result !== "string" || !canvasRef.current) return;

          const image = await FabricImage.fromURL(result);
          if (!image.width || !image.height) {
            throw new Error("Uploaded image dimensions could not be read.");
          }
          image.set({ selectable: false, evented: false });

          const canvas = canvasRef.current;
          const scale = Math.min(canvas.getWidth() / image.width, canvas.getHeight() / image.height);
          image.scale(scale);
          image.set({
            left: (canvas.getWidth() - (image.getScaledWidth() ?? 0)) / 2,
            top: (canvas.getHeight() - (image.getScaledHeight() ?? 0)) / 2,
          });

          canvas.clear();
          canvas.backgroundColor = "#f4ecd8";
          canvas.add(image);
          canvas.sendObjectToBack(image);
          baseImageRef.current = image;
          setHasImage(true);
          applyFilter(activeFilter);
        } catch (caught) {
          console.error("Unable to load uploaded image.", caught);
        }
      };

      reader.readAsDataURL(file);
    },
    [activeFilter, applyFilter],
  );

  const addCaption = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const top = new Textbox(topText || "TOP TEXT", {
      left: canvas.getWidth() / 2,
      top: 20,
      width: 700,
      textAlign: "center",
      fontSize: 52,
      fontWeight: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 3,
      originX: "center",
      fontFamily: "Impact, sans-serif",
      editable: true,
    });

    const bottom = new Textbox(bottomText || "BOTTOM TEXT", {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() - 100,
      width: 700,
      textAlign: "center",
      fontSize: 52,
      fontWeight: "bold",
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 3,
      originX: "center",
      fontFamily: "Impact, sans-serif",
      editable: true,
    });

    canvas.add(top, bottom);
    canvas.setActiveObject(top);
    canvas.requestRenderAll();
  }, [bottomText, topText]);

  const addSticker = useCallback((emoji: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sticker = new Textbox(emoji, {
      left: canvas.getWidth() / 2,
      top: canvas.getHeight() / 2,
      fontSize: 80,
      originX: "center",
      originY: "center",
      editable: false,
    });
    canvas.add(sticker);
    canvas.setActiveObject(sticker);
    canvas.requestRenderAll();
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
    setIsSubmitting(true);
    try {
      const dataUrl = canvas.toDataURL({ format: "png", quality: 0.92, multiplier: 1 });
      await onSubmit(dataUrl);
    } finally {
      setIsSubmitting(false);
    }
  }, [disabled, onSubmit]);

  const filterKeys = Object.keys(PRESETS) as FilterKey[];

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <SectionCard className="space-y-5">
        <div>
          <h2 className="font-display text-xl">▓ Caption Controls</h2>
          <p className="mt-1 font-mono text-xs text-ink/70">
            Upload a photo, caption it, smash filters. Resubmit as many times as you want.
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
          <input
            value={topText}
            onChange={(event) => setTopText(event.target.value)}
            className="mt-2 w-full"
          />
        </label>

        <label className="block">
          Bottom text
          <input
            value={bottomText}
            onChange={(event) => setBottomText(event.target.value)}
            className="mt-2 w-full"
          />
        </label>

        <PrimaryButton type="button" onClick={addCaption} className="w-full">
          Add draggable captions
        </PrimaryButton>

        <div>
          <p className="mb-2 font-display text-xs uppercase tracking-[0.15em]">Stickers</p>
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((sticker) => (
              <button
                key={sticker}
                type="button"
                onClick={() => addSticker(sticker)}
                className="border-[2px] border-ink bg-paper-deep p-2 text-2xl shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-yellow"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 font-display text-xs uppercase tracking-[0.15em]">
            Filters <span className="text-ink/50">({filterKeys.length})</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {filterKeys.map((key) => {
              const preset = PRESETS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyFilter(key)}
                  disabled={!hasImage}
                  className={`border-[2px] border-ink px-2 py-2 text-left font-display text-[11px] uppercase shadow-stamp-sm transition-transform hover:-translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeFilter === key ? "bg-riso-pink" : "bg-paper-deep"
                  }`}
                >
                  <span className="mr-1">{preset.emoji}</span>
                  {preset.label}
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

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Rotate", mode: "rotate" as const },
            { label: "Flip X", mode: "flip-x" as const },
            { label: "Flip Y", mode: "flip-y" as const },
          ].map((t) => (
            <button
              key={t.mode}
              type="button"
              onClick={() => transformActive(t.mode)}
              className="border-[2px] border-ink bg-paper-deep px-2 py-2 font-display text-[11px] uppercase shadow-stamp-sm transition-transform hover:-translate-y-[2px] hover:bg-riso-blue hover:text-paper"
            >
              {t.label}
            </button>
          ))}
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
            {hasImage ? "remix away" : "upload to begin"}
          </span>
        </div>
        <canvas
          ref={canvasElRef}
          className="mx-auto w-full max-w-full border-[2.5px] border-ink shadow-stamp"
        />
      </SectionCard>
    </div>
  );
}
