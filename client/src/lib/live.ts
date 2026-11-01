export type LiveListing = { listed: boolean; auctionId: string | null; price: number | null; address: string | null; marketType: string | null; collectionName: string | null };
export type LiveInscription = { inscriptionId: string; owner: string | null; creator: string | null; listing: LiveListing; refreshedAt: string };

const LIVE_DATA_DEFAULT = "https://fractal-ordinal-live.servostar23.workers.dev";
const LIVE_DATA_CONFIG = import.meta.env.VITE_LIVE_DATA_URL?.trim().replace(/\/+$/, "") || LIVE_DATA_DEFAULT;
export const LIVE_DATA_URL = /\/api\/live-inscription$/i.test(LIVE_DATA_CONFIG)
  ? LIVE_DATA_CONFIG
  : `${LIVE_DATA_CONFIG.replace(/\/api\/(?:market|live-inscription)$/i, "")}/api/live-inscription`;
export const LIVE_DATA_API_BASE = LIVE_DATA_URL.replace(/\/api\/live-inscription\/?$/, "");

export async function fetchLiveInscription(
  inscriptionId: string,
  signal?: AbortSignal,
  chain = "FRACTAL_BITCOIN_MAINNET",
  refresh = false,
): Promise<LiveInscription> {
  const url = new URL(LIVE_DATA_URL);
  url.searchParams.set("inscriptionId", inscriptionId);
  url.searchParams.set("chain", chain);
  if (refresh) url.searchParams.set("refresh", "1");
  const response = await fetch(url.toString(), { signal, cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Live UniSat request failed (${response.status}).`);
  const payload = (await response.json()) as Partial<LiveInscription>;
  return {
    inscriptionId: payload.inscriptionId || inscriptionId,
    owner: payload.owner ?? null,
    creator: payload.creator ?? null,
    listing: payload.listing ?? { listed: false, auctionId: null, price: null, address: null, marketType: null, collectionName: null },
    refreshedAt: payload.refreshedAt || new Date().toISOString(),
  };
}
