"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { formatPhone } from "@/lib/domain/phone";
import type { CustomerSearchResult } from "@/types/db";

export function CustomerSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/staff/customers/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await res.json();
        if (body.ok) {
          setResults(body.results);
          setError(null);
        } else setError(body.error ?? "Error al buscar");
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("Sin conexión");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const showResults = q.trim().length >= 2;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <h1 className="text-xl font-semibold">Buscar cliente</h1>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-white/50" />
        <input
          autoFocus
          type="search"
          inputMode="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Teléfono o nombre"
          className="h-14 w-full rounded-2xl bg-white/10 pr-4 pl-12 text-lg outline-none placeholder:text-white/40 focus:ring-2 focus:ring-lime"
        />
      </label>

      {loading ? <Loader2 className="mx-auto size-6 animate-spin text-white/60" /> : null}
      {error ? <p className="text-center text-red-400">{error}</p> : null}

      {showResults ? (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.card_id}>
              <Link
                href={`/escaner/tarjeta/${encodeURIComponent(r.public_code)}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 p-4 active:bg-white/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{r.customer_name}</p>
                  <p className="text-sm text-white/60">{formatPhone(r.phone_e164)}</p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums">
                  {r.stamps_count}/{r.stamps_required}
                </span>
              </Link>
            </li>
          ))}
          {!loading && results.length === 0 && !error ? (
            <li className="text-center text-white/60">Sin resultados</li>
          ) : null}
        </ul>
      ) : (
        <p className="text-center text-sm text-white/50">Escribe al menos 2 caracteres</p>
      )}
    </div>
  );
}
