/**
 * Sede de cada sello del ciclo actual de una tarjeta, reconstruida desde el
 * historial. Sirve para dibujar el logo de la sede dentro de cada sello.
 */

export interface StampEventLite {
  type: "stamp" | "manual_adjust" | "redeem" | "undo";
  delta: number;
  stamps_after: number;
  branch_id: string | null;
  undone_at: string | null;
}

/**
 * Recorre los eventos en orden. Los sellos deshechos (y su evento «undo») no
 * cuentan; un ajuste manual suma sellos sin sede o quita los últimos; el canje
 * final gasta los más antiguos (los sobrantes conservan su sede). Si algo no
 * cuadra con stamps_after, se corrige con sellos sin sede.
 */
export function stampBranchSequence(events: StampEventLite[], stampsCount: number): (string | null)[] {
  let seq: (string | null)[] = [];
  for (const e of events) {
    if (e.type === "undo" || e.undone_at) continue;
    if (e.type === "stamp") seq.push(e.branch_id);
    else if (e.type === "redeem") seq = seq.slice(Math.max(0, -e.delta));
    else if (e.delta > 0) seq.push(...Array<null>(e.delta).fill(null));
    else if (e.delta < 0) seq = seq.slice(0, Math.max(0, seq.length + e.delta));
    seq = fit(seq, e.stamps_after);
  }
  return fit(seq, stampsCount);
}

function fit(seq: (string | null)[], length: number) {
  if (seq.length === length) return seq;
  if (seq.length > length) return seq.slice(seq.length - length);
  return [...seq, ...Array<null>(length - seq.length).fill(null)];
}
