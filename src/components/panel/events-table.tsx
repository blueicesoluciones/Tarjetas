import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EventRow } from "@/lib/panel/events";
import { EVENT_LABELS, formatDateTime, formatDelta } from "@/lib/panel/format";

interface Props {
  events: EventRow[];
  timeZone: string;
  showCustomer?: boolean;
  emptyText?: string;
}

export function EventsTable({ events, timeZone, showCustomer = true, emptyText = "Sin movimientos todavía." }: Props) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          {showCustomer ? <TableHead>Cliente</TableHead> : null}
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Cambio</TableHead>
          <TableHead className="text-right">Sellos</TableHead>
          <TableHead>Por</TableHead>
          <TableHead>Nota</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => (
          <TableRow key={e.id} className={e.undone_at ? "text-muted-foreground" : undefined}>
            <TableCell className="whitespace-nowrap">{formatDateTime(e.created_at, timeZone)}</TableCell>
            {showCustomer ? (
              <TableCell>
                {e.customerId ? (
                  <Link href={`/panel/clientes/${e.customerId}`} className="hover:underline">
                    {e.customerName}
                  </Link>
                ) : (
                  e.customerName
                )}
              </TableCell>
            ) : null}
            <TableCell>
              <span className="inline-flex items-center gap-1.5">
                <Badge variant={e.type === "redeem" ? "default" : e.type === "stamp" ? "secondary" : "outline"}>
                  {EVENT_LABELS[e.type]}
                </Badge>
                {e.undone_at ? <Badge variant="destructive">Deshecho</Badge> : null}
              </span>
            </TableCell>
            <TableCell className={`text-right tabular-nums ${e.undone_at ? "line-through" : ""}`}>
              {formatDelta(e.delta)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{e.stamps_after}</TableCell>
            <TableCell className="whitespace-nowrap">{e.performerName ?? "—"}</TableCell>
            <TableCell className="max-w-56 truncate" title={e.note ?? undefined}>
              {e.note ?? ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
