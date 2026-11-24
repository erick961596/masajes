export const config = {
  tz: process.env.BUSINESS_TZ || "America/Costa_Rica",
  currency: process.env.CURRENCY || "CRC",
  businessName: "Ani Spa",
  appUrl: (process.env.APP_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, ""),
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),
  slotStepMin: 30,
  whatsapp: { number: "+506 8435 4520", url: "https://wa.me/50684354520" },
};
