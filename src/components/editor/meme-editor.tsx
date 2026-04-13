"use client";

import { Canvas, FabricImage, Textbox, type FabricObject, filters } from "fabric";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SectionCard } from "@/components/ui/section-card";

const STICKERS = ["😂", "🔥", "💀", "🐸", "😎", "🤡", "🎉"];
const FILTER_LABELS: Record<FilterType, string> = {
  none: "None",
  grayscale: "Grayscale",
  sepia: "Sepia",
  invert: "Invert",
  pixelate: "Pixelate",
};

type FilterType = "none" | "grayscale" | "sepia" | "invert" | "pixelate";

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
  const [activeFilter, setActiveFilter] = useState<FilterType>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!canvasElRef.current || canvasRef.current) {
      return;
    }

    const canvas = new Canvas(canvasElRef.current, {
      width: 900,
      height: 520,
      backgroundColor: "#111827",
      preserveObjectStacking: true,
    });

    canvasRef.current = canvas;
    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
  }, []);

  const applyFilter = useCallback((nextFilter: FilterType) => {
    setActiveFilter(nextFilter);
    const image = baseImageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) {
      return;
    }

    const imageFilters = [];
    if (nextFilter === "grayscale") {
      imageFilters.push(new filters.Grayscale());
    }
    if (nextFilter === "sepia") {
      imageFilters.push(new filters.Sepia());
    }
    if (nextFilter === "invert") {
      imageFilters.push(new filters.Invert());
    }
    if (nextFilter === "pixelate") {
      imageFilters.push(new filters.Pixelate({ blocksize: 12 }));
    }

    image.filters = imageFilters;
    image.applyFilters();
    canvas.requestRenderAll();
  }, []);

  const addImage = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvasRef.current) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result;
        if (typeof result !== "string" || !canvasRef.current) {
          return;
        }

        const image = await FabricImage.fromURL(result);
        if (!image.width || !image.height) {
          throw new Error("Uploaded image dimensions could not be read.");
        }
        image.set({ selectable: false, evented: false });

        const canvas = canvasRef.current;
        const scale = Math.min(
          canvas.getWidth() / image.width,
          canvas.getHeight() / image.height,
        );
        image.scale(scale);
        image.set({
          left: (canvas.getWidth() - (image.getScaledWidth() ?? 0)) / 2,
          top: (canvas.getHeight() - (image.getScaledHeight() ?? 0)) / 2,
        });

        canvas.clear();
        canvas.backgroundColor = "#111827";
        canvas.add(image);
        canvas.sendObjectToBack(image);
        baseImageRef.current = image;
        applyFilter(activeFilter);
      } catch (caught) {
        console.error("Unable to load uploaded image.", caught);
      }
    };

    reader.readAsDataURL(file);
  }, [activeFilter, applyFilter]);

  const addCaption = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

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
    if (!canvas) {
      return;
    }

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
    if (!canvas) {
      return;
    }

    const target = (canvas.getActiveObject() ?? baseImageRef.current) as FabricObject | null;
    if (!target) {
      return;
    }

    if (mode === "rotate") {
      target.set("angle", ((target.angle ?? 0) + 15) % 360);
    }

    if (mode === "flip-x") {
      target.set("flipX", !target.flipX);
    }

    if (mode === "flip-y") {
      target.set("flipY", !target.flipY);
    }

    canvas.requestRenderAll();
  }, []);

  const exportMeme = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !baseImageRef.current || disabled) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dataUrl = canvas.toDataURL({ format: "png", quality: 0.92, multiplier: 1 });
      await onSubmit(dataUrl);
    } finally {
      setIsSubmitting(false);
    }
  }, [disabled, onSubmit]);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <SectionCard className="space-y-5">
        <div>
          <h2 className="font-display text-xl">▓ Meme Controls</h2>
          <p className="mt-1 font-mono text-xs text-ink/70">
            Upload an image, drag text, smash stickers, remix fast.
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
          <p className="mb-2 font-display text-xs uppercase tracking-[0.15em]">Filters</p>
          <div className="grid grid-cols-2 gap-2">
            {(["none", "grayscale", "sepia", "invert", "pixelate"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => applyFilter(filter)}
                className={`border-[2px] border-ink px-3 py-2 font-display text-[11px] uppercase shadow-stamp-sm transition-transform hover:-translate-y-[2px] ${
                  activeFilter === filter
                    ? "bg-riso-pink text-ink"
                    : "bg-paper-deep text-ink"
                }`}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>
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

        <PrimaryButton type="button" onClick={exportMeme} disabled={disabled || isSubmitting} className="w-full">
          {isSubmitting ? "Submitting…" : "▸ Submit meme"}
        </PrimaryButton>
      </SectionCard>

      <SectionCard className="overflow-auto bg-paper-deep">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-xs uppercase tracking-[0.2em] text-ink/70">
            ▓▓ The Canvas ▓▓
          </span>
          <span className="font-pixel text-base text-ink/60">press & remix</span>
        </div>
        <canvas
          ref={canvasElRef}
          className="mx-auto w-full max-w-full border-[2.5px] border-ink shadow-stamp"
        />
      </SectionCard>
    </div>
  );
}
