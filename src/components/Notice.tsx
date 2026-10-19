export function Notice({ error, ok }: { error?: string; ok?: string }) {
  if (error) return <p className="notice error">{error}</p>;
  if (ok) return <p className="notice ok">{ok}</p>;
  return null;
}

export type SP = Promise<Record<string, string | string[] | undefined>>;

export function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}
