"use client";

import Swal from "sweetalert2";

/** SweetAlert con los colores de la app. */
export const swal = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: "swal-popup",
    title: "swal-title",
    confirmButton: "btn",
    cancelButton: "btn ghost",
    denyButton: "btn danger",
    actions: "swal-actions",
  },
  reverseButtons: true,
  iconColor: "#6b8f71",
});

export const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  customClass: { popup: "swal-toast" },
});
