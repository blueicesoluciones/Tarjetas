"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/**
 * Menú del celular: abre el mismo contenido del menú lateral en un panel. Va en
 * un portal porque la barra superior (con desenfoque) encerraría el panel fijo.
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);

  // Al navegar se cierra (también si se toca el enlace de la página actual).
  if (open && pathname !== openedAt) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
        className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-lg"
        aria-label="Abrir menú"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
              <button
                type="button"
                className="bg-ink/40 absolute inset-0"
                aria-label="Cerrar menú"
                onClick={() => setOpen(false)}
              />
              <div
                className="bg-background absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col shadow-xl"
                onClickCapture={(e) => {
                  if ((e.target as HTMLElement).closest("a")) setOpen(false);
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="hover:bg-muted absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-lg"
                  aria-label="Cerrar menú"
                >
                  <X className="size-5" />
                </button>
                {children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
