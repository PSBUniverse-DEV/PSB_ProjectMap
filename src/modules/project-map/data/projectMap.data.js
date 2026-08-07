/**
 * Client Helpers — projectMap.data.js
 *
 * Runs in the browser. Helper functions for your View.
 * NO database calls here — that belongs in projectMap.actions.js.
 *
 * WHAT TO PUT HERE:
 *   - Constants (column definitions, tab lists, default values)
 *   - Form builders (createEmptyForm, createFormFromRow)
 *   - Normalizers (trimming strings, converting nulls)
 *   - Display mappers (DB row → table-friendly object)
 *   - Batch helpers (tracking pending creates/updates/deletes)
 *
 * SSO NOTE:
 *   Client-side session data is available via useAuth() hook.
 *   Do NOT store auth tokens or session data here — that's
 *   handled centrally by the SSO cookie (psb_session).
 */

export function formatRunCode(runNumber) {
  if (runNumber == null) return null;
  return `PSBR-${String(runNumber).padStart(6, "0")}`;
}

/**
 * Formats the three building-dimension inputs (width, length, height in feet)
 * into the single stored display string used everywhere in the app:
 *   "20' x 30' x 12'"
 *
 * Any segment that is blank/null becomes "—", and the whole call returns null
 * when every segment is empty so callers can omit a dimension line entirely.
 *
 * Example:
 *   formatDimension("20", "30", "12") -> "20' x 30' x 12'"
 *   formatDimension("", "30", "")     -> "— x 30' x —"
 *   formatDimension("", "", "")       -> null
 */
export function formatDimension(width, length, height) {
  const hasAny = [width, length, height].some((v) => v !== "" && v != null);
  if (!hasAny) return null;

  const fmt = (v) => {
    if (v === "" || v == null) return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n % 1 === 0 ? n.toFixed(0) : n}'`;
  };

  return `${fmt(width)} x ${fmt(length)} x ${fmt(height)}`;
}

/**
 * Splits a stored dimension string ("20' x 30' x 12'") back into its three
 * numeric parts so the edit form can repopulate its Width/Length/Height
 * fields. A "—" or missing segment becomes an empty string.
 *
 * Only the edit form needs this — every display location reads the already
 * formatted `project.dimension` string directly.
 */
export function parseDimension(dimensionStr) {
  if (!dimensionStr) return { width: "", length: "", height: "" };
  const parts = dimensionStr.split(" x ").map((p) => p.trim());
  const parseOne = (p) => {
    if (!p || p === "—") return "";
    const n = parseFloat(p.replace("'", ""));
    return Number.isFinite(n) ? String(n) : "";
  };
  return {
    width: parseOne(parts[0]),
    length: parseOne(parts[1]),
    height: parseOne(parts[2]),
  };
}
