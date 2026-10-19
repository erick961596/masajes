export const config = {
  tz: process.env.BUSINESS_TZ || "America/Mexico_City",
  currency: process.env.CURRENCY || "MXN",
  businessName: process.env.BUSINESS_NAME || "Masajes Ana",
  appUrl: (process.env.APP_URL || process.env.URL || "http://localhost:3000").replace(/\/$/, ""),
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase().trim(),
  slotStepMin: 30,
};
