export const config = {
  tz: process.env.BUSINESS_TZ || "America/Costa_Rica",
  currency: process.env.CURRENCY || "CRC",
  businessName: "Ani Spa",
  appUrl: (process.env.APP_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, ""),
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),
  slotStepMin: 30,
  // Redes ficticias: cambia handle y url por las reales cuando existan.
  social: [
    { name: "Instagram", handle: "@anispa", url: "#" },
    { name: "Facebook", handle: "Ani Spa", url: "#" },
    { name: "TikTok", handle: "@anispa", url: "#" },
    { name: "WhatsApp", handle: "+506 8000-0000", url: "#" },
  ],
};
