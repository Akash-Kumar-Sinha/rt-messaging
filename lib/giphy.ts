import { cachedGiphyAssetsDb } from "./db";
import { CURATED_GIFS, GifItem } from "./gifs";

export interface GiphyAssetItem {
  id: string;
  giphyId: string;
  type: "GIF" | "STICKER";
  title: string;
  query?: string | null;
  url: string;
  previewUrl: string;
  width?: number | null;
  height?: number | null;
  provider: "giphy" | "curated";
}

// In-memory cooldown tracker to avoid thrashing GIPHY API if rate limited or down
let lastGiphyErrorTime = 0;
const GIPHY_COOLDOWN_MS = 15000; // 15 seconds cooldown on API failures

function normalizeQuery(q?: string): string {
  if (!q) return "";
  return q.toLowerCase().trim();
}

export async function searchGiphyAssets(options: {
  type: "GIF" | "STICKER";
  query?: string;
  limit?: number;
  minCacheThreshold?: number;
}): Promise<GiphyAssetItem[]> {
  const {
    type,
    query = "",
    limit = 24,
    minCacheThreshold = 12,
  } = options;

  const cleanQuery = normalizeQuery(query);
  const searchTerms = cleanQuery.split(/\s+/).filter(Boolean);

  try {
    const cachedRows = await cachedGiphyAssetsDb.where({ type }).all();

    if (cachedRows && cachedRows.length > 0) {
      let filtered = cachedRows;

      if (cleanQuery) {
        filtered = cachedRows.filter((item: any) => {
          const title = (item.title || "").toLowerCase();
          const qTag = (item.query || "").toLowerCase();
          return searchTerms.every(
            (term) => title.includes(term) || qTag.includes(term)
          );
        });
      }

      if (filtered.length >= Math.min(minCacheThreshold, limit)) {
        return filtered.slice(0, limit).map(formatDbAssetToGiphyItem);
      }
    }
  } catch (dbErr) {
    console.warn("[GIPHY Cache] Database lookup warning:", dbErr);
  }

  const apiKey = process.env.GIPHY_API_KEY;
  const isCooldown = Date.now() - lastGiphyErrorTime < GIPHY_COOLDOWN_MS;

  if (apiKey && !isCooldown) {
    try {
      const endpoint = type === "GIF"
        ? cleanQuery
          ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(cleanQuery)}&limit=${limit}&rating=g`
          : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=g`
        : cleanQuery
          ? `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(cleanQuery)}&limit=${limit}&rating=g`
          : `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=${limit}&rating=g`;

      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const rawItems = data.data || [];

        const giphyItems: GiphyAssetItem[] = [];

        for (const item of rawItems) {
          const giphyId = item.id;
          const title = item.title || (type === "GIF" ? "GIF" : "Sticker");
          
          const url =
            item.images?.fixed_height?.url ||
            item.images?.original?.url ||
            item.images?.downsized?.url ||
            `https://i.giphy.com/${giphyId}.gif`;

          const previewUrl =
            item.images?.fixed_height_small?.url ||
            item.images?.fixed_width_small?.url ||
            item.images?.preview_gif?.url ||
            url;

          const width = Number(item.images?.fixed_height?.width || item.images?.original?.width || 320);
          const height = Number(item.images?.fixed_height?.height || item.images?.original?.height || 240);

          const assetItem: GiphyAssetItem = {
            id: `giphy-${giphyId}`,
            giphyId,
            type,
            title,
            query: cleanQuery || "trending",
            url,
            previewUrl,
            width,
            height,
            provider: "giphy",
          };

          giphyItems.push(assetItem);

          saveAssetToDbCache({
            giphyId,
            type,
            title,
            query: cleanQuery || "trending",
            url,
            previewUrl,
            width,
            height,
          }).catch((err) => {
            console.warn(`[GIPHY Cache] Failed to cache asset ${giphyId}:`, err);
          });
        }

        if (giphyItems.length > 0) {
          return giphyItems;
        }
      } else {
        console.warn(`[GIPHY API] Returned status ${res.status}: ${res.statusText}`);
        if (res.status === 429 || res.status >= 500) {
          lastGiphyErrorTime = Date.now();
        }
      }
    } catch (apiErr) {
      console.error("[GIPHY API] Fetch error:", apiErr);
      lastGiphyErrorTime = Date.now();
    }
  }

  try {
    const fallbackRows = await cachedGiphyAssetsDb.where({ type }).all();
    if (fallbackRows && fallbackRows.length > 0) {
      return fallbackRows.slice(0, limit).map(formatDbAssetToGiphyItem);
    }
  } catch (fallbackDbErr) {
    console.warn("[GIPHY Cache] Fallback database query failed:", fallbackDbErr);
  }

  if (type === "GIF") {
    return CURATED_GIFS.slice(0, limit).map((g) => ({
      id: g.id,
      giphyId: g.id,
      type: "GIF",
      title: g.title,
      url: g.url,
      previewUrl: g.previewUrl,
      width: g.width,
      height: g.height,
      provider: "curated",
    }));
  }

  return [];
}

async function saveAssetToDbCache(asset: {
  giphyId: string;
  type: "GIF" | "STICKER";
  title: string;
  query: string;
  url: string;
  previewUrl: string;
  width?: number;
  height?: number;
}) {
  const existing = await cachedGiphyAssetsDb
    .where({ giphyId: asset.giphyId, type: asset.type })
    .first();

  const now = new Date().toISOString();

  if (existing) {
    // Append or update search query metadata if new keyword searched
    const existingQueries = (existing.query || "").split(",").map((s: string) => s.trim());
    if (asset.query && !existingQueries.includes(asset.query)) {
      const mergedQuery = [...existingQueries, asset.query].filter(Boolean).join(", ");
      await cachedGiphyAssetsDb.where({ id: existing.id }).update({
        query: mergedQuery,
        updatedAt: now,
      });
    }
    return existing;
  }

  const newId = crypto.randomUUID();
  await cachedGiphyAssetsDb.create({
    id: newId,
    giphyId: asset.giphyId,
    type: asset.type,
    title: asset.title,
    query: asset.query,
    url: asset.url,
    previewUrl: asset.previewUrl,
    width: asset.width || null,
    height: asset.height || null,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  });
}

function formatDbAssetToGiphyItem(dbRow: any): GiphyAssetItem {
  return {
    id: dbRow.id,
    giphyId: dbRow.giphyId,
    type: dbRow.type,
    title: dbRow.title || "Asset",
    query: dbRow.query,
    url: dbRow.url,
    previewUrl: dbRow.previewUrl || dbRow.url,
    width: dbRow.width || 320,
    height: dbRow.height || 240,
    provider: "giphy",
  };
}
