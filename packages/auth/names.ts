/** Display names: trimmed, inner spaces collapsed, no control characters, 2 to 40 characters. Null if not allowed. */
export function cleanName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  // Control characters are exactly what we strip.
  // oxlint-disable-next-line no-control-regex
  const clean = name.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  return clean.length >= 2 && clean.length <= 40 ? clean : null;
}
