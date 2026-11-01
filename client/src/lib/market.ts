export type LiveMarketListing = {
  auctionId: string | null;
  inscriptionId: string;
  collectionItemName: string | null;
  collectionName: string | null;
  priceSats: number | null;
  priceFb: number | null;
  priceUsd: number | null;
  address: string | null;
  marketType: string | null;
};

export type LiveMarket = {
  collectionId: string;
  collectionName: string | null;
  fbUsd: number | null;
  stats: { volumeTotalFb: number | null; volumeTotalUsd: number | null; volume24hFb: number | null; volume24hUsd: number | null; floorFb: number | null; floorUsd: number | null; marketCapFb: number | null; marketCapUsd: number | null; listed: number | null; total: number | null };
  listings: LiveMarketListing[];
  totalListings: number;
  start: number;
  limit: number;
  refreshedAt: string;
};

const MARKET_DATA_DEFAULT = "https://fractal-ordinal-live.servostar23.workers.dev";
const MARKET_DATA_CONFIG = import.meta.env.VITE_LIVE_DATA_URL?.trim().replace(/\/+$/, "") || MARKET_DATA_DEFAULT;
export const MARKET_DATA_URL = MARKET_DATA_CONFIG.replace(/\/api\/(?:market|live-inscription)$/i, "");

export async function fetchLiveMarket(collectionId: string, start = 0, limit = 20, signal?: AbortSignal): Promise<LiveMarket> {
  const response = await fetch(`${MARKET_DATA_URL}/api/market?collectionId=${encodeURIComponent(collectionId)}&start=${start}&limit=${limit}`, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Live market request failed (${response.status}).`);
  return (await response.json()) as LiveMarket;
}

export async function fetchAllLiveMarketListings(collectionId: string, totalListings: number, signal?: AbortSignal): Promise<LiveMarketListing[]> {
  const starts = Array.from({ length: Math.ceil(totalListings / 20) }, (_, page) => page * 20);
  const pages = new Array<LiveMarket | undefined>(starts.length);
  let nextPage = 0;
  let lastError: unknown;
  const loadPage = async (index: number) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        pages[index] = await fetchLiveMarket(collectionId, starts[index], 20, signal);
        return;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
        const statusMatch = error instanceof Error ? error.message.match(/\((\d{3})\)\.?$/) : null;
        const status = statusMatch ? Number(statusMatch[1]) : null;
        // Do not amplify UniSat/Worker throttling with an immediate retry storm.
        if (status === 429 || status === 503) return;
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
      }
    }
  };
  const worker = async () => {
    while (nextPage < starts.length) {
      const index = nextPage;
      nextPage += 1;
      await loadPage(index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, starts.length) }, () => worker()));
  if (pages.some((page) => !page)) throw lastError instanceof Error ? lastError : new Error("Unable to load all live UniSat listings.");
  return (pages as LiveMarket[]).flatMap((page) => page.listings);
}

export function listingTokenId(name: string | null): string | null {
  return name?.match(/#(\d+)$/)?.[1] ?? null;
}
