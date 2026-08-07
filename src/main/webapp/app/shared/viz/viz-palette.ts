/**
 * The three data-viz roles.
 *
 * Validated for lightness band, chroma floor and CVD separation — the same
 * values `_hc-tokens.scss` publishes as `--abf-series-1..3`. They are
 * referenced through the custom properties everywhere a stylesheet can reach;
 * this array exists for the places that cannot, such as an inline `fill` on a
 * generated SVG mark.
 *
 * Do not substitute. Slots 2 and 3 are lighter than slot 1, which is exactly
 * why every chart also carries a table view.
 */
export const VIZ_SERIES = ['var(--abf-series-1)', 'var(--abf-series-2)', 'var(--abf-series-3)'] as const;

/** Shorten a professional's name for a crowded axis: "Dr. Ama Boateng" -> "A. Boateng". */
export const shortName = (value: string): string => {
  const parts = value
    .replace(/^(Dr\.|Nurse|Prof\.)\s*/, '')
    .trim()
    .split(/\s+/);
  return parts.length > 1 ? `${parts[0].charAt(0)}. ${parts[parts.length - 1]}` : parts[0];
};
