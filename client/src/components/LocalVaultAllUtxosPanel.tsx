import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { ADDRESS_SPECS, type AddressType, type OrdiNetwork } from "@/lib/ordi-wallet";
import { getSpendableUtxos, getUtxoBalanceSummary, scanAddressUtxoInventory } from "@/lib/mempool";

type Row = { type: AddressType; address: string; scanned: number | null; indexed: number | null; totalSats: number | null; availableSats: number | null; unavailableSats: number | null; safeCount: number | null; safeSats: number | null; error?: string };

export function LocalVaultAllUtxosPanel({ addresses, network }: { addresses: Record<AddressType, { address: string }>; network: OrdiNetwork }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const scan = async () => {
    setBusy(true); setRows([]); setProgress("");
    const next: Row[] = [];
    try {
      for (let i = 0; i < ADDRESS_SPECS.length; i += 1) {
        const spec = ADDRESS_SPECS[i];
        const address = addresses[spec.type].address;
        const row: Row = { type: spec.type, address, scanned: null, indexed: null, totalSats: null, availableSats: null, unavailableSats: null, safeCount: null, safeSats: null };
        next.push(row); setRows([...next]);
        try {
          const summary = await getUtxoBalanceSummary(network, address);
          row.totalSats = summary.totalBalance;
          row.availableSats = summary.availableBalance;
          row.unavailableSats = summary.unavailableBalance;
          setRows([...next]);
          setProgress(`${i + 1}/${ADDRESS_SPECS.length} · ${spec.label} · inventaire`);
          const inventory = await scanAddressUtxoInventory(network, address, { onProgress: value => { row.scanned = value.scannedCount; row.indexed = value.totalCount; setRows([...next]); setProgress(`${i + 1}/${ADDRESS_SPECS.length} · ${spec.label} · ${value.scannedCount}/${value.totalCount}`); } });
          row.scanned = inventory.scannedCount; row.indexed = inventory.totalCount;
          setProgress(`${i + 1}/${ADDRESS_SPECS.length} · ${spec.label} · UTXO sûrs`);
          const safe = await getSpendableUtxos(network, address, 1, { collectAll: true, allowInsufficientSafeBalance: true });
          row.safeCount = safe.length; row.safeSats = safe.reduce((sum, item) => sum + item.satoshi, 0);
        } catch (error) { row.error = error instanceof Error ? error.message : "Échec du scan UTXO."; }
        setRows([...next]);
      }
    } finally { setBusy(false); setProgress(""); }
  };
  return <section className="mt-4 border border-[#d99a54]/40 bg-[#0b0f13] p-3 sm:p-4" aria-labelledby="all-utxos-title">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 id="all-utxos-title" className="font-mono text-[10px] uppercase tracking-[.13em] text-[#f2bd63]">Scan UTXO complet du Local Vault</h4><p className="mt-1 font-mono text-[9px] leading-4 text-[#718092]">Parcourt Legacy, Nested SegWit, Native SegWit et Taproot sur le réseau sélectionné. Aucune clé privée ni transaction n’est utilisée.</p><p className="mt-1 font-mono text-[9px] leading-4 text-[#f2bd63]">Le solde total et la disponibilité UniSat sont séparés du sous-ensemble protégé utilisable pour les frais.</p></div><button type="button" onClick={() => void scan()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 border border-[#d99a54] px-3 font-mono text-[9px] uppercase text-[#f2bd63] disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} {busy ? progress || "Scan…" : "Scanner les 4 adresses"}</button></div>
    {rows.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{rows.map(row => { const label = ADDRESS_SPECS.find(item => item.type === row.type)?.label ?? row.type; return <article key={row.type} className="border border-[#2c323a] bg-[#10151a] p-3"><p className="font-mono text-[9px] uppercase text-[#9fe0bd]">{label}</p><p className="mt-2 font-mono text-[9px] text-[#d9d3c6]">Solde total : {row.totalSats === null ? "—" : `${row.totalSats.toLocaleString("fr-FR")} sats`}</p><p className="mt-1 font-mono text-[9px] text-[#d9d3c6]">Disponible UniSat : {row.availableSats === null ? "—" : `${row.availableSats.toLocaleString("fr-FR")} sats`} · indisponible : {row.unavailableSats === null ? "—" : `${row.unavailableSats.toLocaleString("fr-FR")} sats`}</p><p className="mt-1 font-mono text-[9px] text-[#d9d3c6]">Inventaire : {row.scanned === null ? "—" : `${row.scanned} / ${row.indexed}`}</p><p className="mt-1 font-mono text-[9px] text-[#9fe0bd]">UTXO sûrs pour frais : {row.safeCount === null ? "—" : `${row.safeCount} · ${row.safeSats?.toLocaleString("fr-FR")} sats`}</p>{row.error && <p className="mt-2 break-words font-mono text-[8px] leading-4 text-[#e0b45f]">{row.error}</p>}</article>; })}</div>}
  </section>;
}
