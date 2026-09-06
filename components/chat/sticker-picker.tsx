"use client";

import { useState, useEffect } from "react";
import { StickerPack, StickerItem } from "@/lib/stickers";
import { Loader2 } from "lucide-react";
import {
  PickerSurface,
  PickerSearch,
  PickerTabs,
  PickerTab,
  PickerContent,
} from "./picker-surface";

interface StickerPickerProps {
  onSelect: (sticker: StickerItem) => void;
  onClose: () => void;
}

interface GiphyStickerItem {
  id: string;
  title: string;
  url: string;
  previewUrl?: string;
}

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [activePackId, setActivePackId] = useState<string>("giphy");
  const [searchQuery, setSearchQuery] = useState("");
  const [giphyStickers, setGiphyStickers] = useState<GiphyStickerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial packs and trending GIPHY stickers
  useEffect(() => {
    fetch("/api/stickers")
      .then((res) => res.json())
      .then((data) => {
        if (data.packs) setPacks(data.packs);
        if (data.stickers) setGiphyStickers(data.stickers);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Search GIPHY stickers on debounced query
  useEffect(() => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stickers?q=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.stickers) {
          setGiphyStickers(data.stickers);
          setActivePackId("giphy");
        }
      } catch (err) {
        console.error("Failed to search stickers:", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activePack = packs.find((p) => p.id === activePackId);

  return (
    <PickerSurface title="Stickers" onClose={onClose}>
      <PickerSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery("")}
        placeholder="Search stickers..."
      />

      {/* Pack chips */}
      <PickerTabs>
        <PickerTab
          active={activePackId === "giphy"}
          onClick={() => {
            setActivePackId("giphy");
            setSearchQuery("");
          }}
        >
          Trending
        </PickerTab>

        {packs.map((pack) => (
          <PickerTab
            key={pack.id}
            active={activePackId === pack.id}
            onClick={() => {
              setActivePackId(pack.id);
              setSearchQuery("");
            }}
          >
            <span>{pack.icon}</span>
            <span>{pack.name.replace("Classic ", "").replace(" Vibes", "")}</span>
          </PickerTab>
        ))}
      </PickerTabs>

      {/* 4-column stickers grid */}
      <PickerContent className="pr-3.5">
        {loading && giphyStickers.length === 0 ? (
          <div className="flex h-44 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : activePackId === "giphy" ? (
          giphyStickers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No stickers found{searchQuery ? ` for "${searchQuery}"` : ""}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 p-1">
              {giphyStickers.map((stk) => (
                <button
                  type="button"
                  key={stk.id}
                  onClick={() =>
                    onSelect({
                      id: stk.id,
                      packId: "giphy",
                      packName: "GIPHY",
                      name: stk.title,
                      url: stk.url,
                      emoji: "✨",
                    })
                  }
                  className="group relative flex aspect-square cursor-pointer items-center justify-center rounded-xl p-1 transition-all hover:scale-[1.04] hover:bg-accent active:scale-95 focus:outline-none focus:ring-1 focus:ring-ring"
                  title={stk.title}
                >
                  <img
                    src={stk.previewUrl || stk.url}
                    alt={stk.title}
                    className="size-full object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )
        ) : !activePack || activePack.stickers.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No stickers available
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 p-1">
            {activePack.stickers.map((sticker) => (
              <button
                type="button"
                key={sticker.id}
                onClick={() => onSelect(sticker)}
                className="group relative flex aspect-square cursor-pointer items-center justify-center rounded-xl p-1 transition-all hover:scale-[1.04] hover:bg-accent active:scale-95 focus:outline-none focus:ring-1 focus:ring-ring"
                title={sticker.name}
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="size-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </PickerContent>
    </PickerSurface>
  );
}