export type SP = Promise<Record<string, string | string[] | undefined>>;

export function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}
