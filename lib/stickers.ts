export interface StickerItem {
  id: string;
  packId: string;
  packName: string;
  name: string;
  url: string;
  emoji: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "reactions",
    name: "Classic Reactions",
    icon: "🔥",
    stickers: [
      {
        id: "react-thumbs-up",
        packId: "reactions",
        packName: "Classic Reactions",
        name: "Thumbs Up",
        url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        emoji: "👍",
      },
      {
        id: "react-party-popper",
        packId: "reactions",
        packName: "Classic Reactions",
        name: "Party",
        url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80",
        emoji: "🎉",
      },
      {
        id: "react-rocket",
        packId: "reactions",
        packName: "Classic Reactions",
        name: "Rocket Launch",
        url: "https://images.unsplash.com/photo-1517976487541-01639d6715b7?w=200&auto=format&fit=crop&q=80",
        emoji: "🚀",
      },
      {
        id: "react-fire",
        packId: "reactions",
        packName: "Classic Reactions",
        name: "Fire",
        url: "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=200&auto=format&fit=crop&q=80",
        emoji: "🔥",
      },
      {
        id: "react-heart",
        packId: "reactions",
        packName: "Classic Reactions",
        name: "Heart",
        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&auto=format&fit=crop&q=80",
        emoji: "❤️",
      },
      {
        id: "react-mindblown",
        packId: "reactions",
        packName: "Classic Reactions",
        name: "Mind Blown",
        url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80",
        emoji: "🤯",
      },
    ],
  },
  {
    id: "dev-vibes",
    name: "Developer Vibes",
    icon: "💻",
    stickers: [
      {
        id: "dev-coffee",
        packId: "dev-vibes",
        packName: "Developer Vibes",
        name: "Need Coffee",
        url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80",
        emoji: "☕",
      },
      {
        id: "dev-bug",
        packId: "dev-vibes",
        packName: "Developer Vibes",
        name: "Found Bug",
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80",
        emoji: "🐛",
      },
      {
        id: "dev-ship-it",
        packId: "dev-vibes",
        packName: "Developer Vibes",
        name: "Ship It",
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&auto=format&fit=crop&q=80",
        emoji: "🚢",
      },
      {
        id: "dev-code-ninja",
        packId: "dev-vibes",
        packName: "Developer Vibes",
        name: "Coding Flow",
        url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&auto=format&fit=crop&q=80",
        emoji: "⚡",
      },
    ],
  },
];

export function getStickerById(id: string): StickerItem | null {
  for (const pack of STICKER_PACKS) {
    const found = pack.stickers.find((s) => s.id === id);
    if (found) return found;
  }
  return null;
}
