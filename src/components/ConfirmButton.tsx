"use client";

import { swal } from "@/lib/swal";

/** Botón dentro de un <form> que pide confirmación con SweetAlert antes de enviarlo. */
export function ConfirmButton({
  title,
  text,
  confirmText = "Sí, continuar",
  className,
  children,
}: {
  title: string;
  text?: string;
  confirmText?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={async (e) => {
        const form = e.currentTarget.form;
        const r = await swal.fire({ icon: "warning", title, text, showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: "No" });
        if (r.isConfirmed) form?.requestSubmit();
      }}
    >
      {children}
    </button>
  );
}
