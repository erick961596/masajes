"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { swal, toast } from "@/lib/swal";

/** Muestra ?error= como alerta y ?ok= como toast, y limpia la URL. */
export function Notice({ error, ok }: { error?: string; ok?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!error && !ok) return;
    if (error) swal.fire({ icon: "error", title: "Ups", text: error, confirmButtonText: "Entendido" });
    else toast.fire({ icon: "success", titleText: ok });
    const next = new URLSearchParams(params.toString());
    next.delete("error");
    next.delete("ok");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, ok]);

  return null;
}
