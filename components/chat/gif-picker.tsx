"use client";

import { useState, useEffect } from "react";
import { GifItem } from "@/lib/gifs";
import { Loader2 } from "lucide-react";
import {
  PickerSurface,
  PickerSearch,
  PickerTabs,
  PickerTab,
  PickerContent,
} from "./picker-surface";

interface GifPickerProps {
  onSelect: (gif: GifItem) => void;
  onClose: () => void;
}

const CATEGORIES = [
  "Trending",
  "Reactions",
  "Funny",
  "Popular",
  "Gaming",
  "Memes",
  "Happy",
  "Dance",
];

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch GIFs based on search query or active category (debounced)
  useEffect(() => {
    let active = true;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const trimmed = query.trim();
        const searchTerm = trimmed || (activeCategory === "Trending" ? "" : activeCategory);
        const url = `/api/gifs${searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : ""}`;
        const res = await fetch(url);
        const data = await res.json();
        if (active) {
          setGifs(data.gifs || []);
        }
      } catch (err) {
        console.error("Failed to load gifs:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, activeCategory]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setQuery("");
  };

  return (
    <PickerSurface title="GIF" onClose={onClose}>
      <PickerSearch
        value={query}
        onChange={(v) => {
          setQuery(v);
          if (v) setActiveCategory("");
        }}
        onClear={() => {
          setQuery("");
          setActiveCategory("Trending");
        }}
        placeholder="Search GIFs..."
      />

      {/* Category chips */}
      <PickerTabs>
        {CATEGORIES.map((cat) => {
          const isSelected =
            !query && (activeCategory === cat || (cat === "Trending" && !activeCategory));
          return (
            <PickerTab key={cat} active={isSelected} onClick={() => handleCategoryClick(cat)}>
              {cat}
            </PickerTab>
          );
        })}
      </PickerTabs>

      {/* 3-column GIF grid */}
      <PickerContent className="pr-3.5">
        {loading && gifs.length === 0 ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-12 text-center text-xs text-muted-foreground">
            <span>No GIFs found{query ? ` for "${query}"` : ""}</span>
            <span className="text-[11px] opacity-75">
              Try searching for reactions, dancing, or funny
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 pb-1">
            {gifs.map((gif) => (
              <button
                type="button"
                key={gif.id}
                onClick={() => onSelect(gif)}
                className="group relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-secondary/40 transition-all hover:scale-[1.02] hover:border-border/80 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <img
                  src={gif.previewUrl}
                  alt={gif.title}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </PickerContent>
    </PickerSurface>
  );
}