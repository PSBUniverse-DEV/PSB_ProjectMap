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

export function resolveRunStatusOptions(runStatuses = []) {
  return (Array.isArray(runStatuses) ? runStatuses : [])
    .filter((status) => status?.is_active !== false)
    .map((status) => status?.status_name)
    .filter(Boolean);
}

export function getRunStatusColor(statusName, runStatuses = []) {
  if (!statusName) return "#6b7280";
  const found = runStatuses.find((s) => s.status_name === statusName);
  return found?.display_color || "#6b7280";
}

export function formatRunCode(runNumber) {
  if (runNumber == null) return null;
  return `PSBR-${String(runNumber).padStart(6, "0")}`;
}

/**
 * Formats the full building-description inputs (roof style, three dimensions,
 * framing gauge) into the single stored string used everywhere in the app:
 *   "{Vertical Roof} {20' x 30' x 12'} {14 Ga}"
 *
 * Each brace-delimited segment is "—" when its corresponding input is empty,
 * and the whole call returns null when nothing at all was entered so callers
 * can omit the field entirely.
 *
 * Storage format (what goes into proj_t_projects.dimension):
 *   {roof} {W x L x H} {gauge}
 *
 * Example:
 *   formatProjectDescription("Vertical Roof", "20", "30", "12", "14 Ga")
 *     -> "{VERTICAL ROOF} {20' x 30' x 12'} {14 GA}"
 *   formatProjectDescription("", "20", "30", "12", "")
 *     -> "{—} {20' x 30' x 12'} {—}"
 *   formatProjectDescription("", "", "", "", "")
 *     -> null
 */
export function formatProjectDescription(roofStyle, width, length, height, framingGauge) {
  const hasWidth = width !== "" && width != null;
  const hasLength = length !== "" && length != null;
  const hasHeight = height !== "" && height != null;
  const hasAnyDimension = hasWidth || hasLength || hasHeight;
  // Roof style and framing gauge are normalized to UPPERCASE so every
  // surface (storage + all displays) shows them capitalized consistently.
  const roofTrimmed = roofStyle && roofStyle.trim();
  const gaugeTrimmed = framingGauge && framingGauge.trim();
  const hasRoofStyle = !!roofTrimmed;
  const hasFramingGauge = !!gaugeTrimmed;

  if (!hasAnyDimension && !hasRoofStyle && !hasFramingGauge) return null;

  const fmtNum = (v) => {
    if (v === "" || v == null) return "—";
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    return `${n % 1 === 0 ? n.toFixed(0) : n}'`;
  };

  const dimensionSegment = `${fmtNum(width)} x ${fmtNum(length)} x ${fmtNum(height)}`;
  const roofSegment = hasRoofStyle ? roofTrimmed.toUpperCase() : "—";
  const gaugeSegment = hasFramingGauge ? gaugeTrimmed.toUpperCase() : "—";

  return `{${roofSegment}} {${dimensionSegment}} {${gaugeSegment}}`;
}

/**
 * Splits a stored project-description string back into its five editable
 * parts. Returns an object with keys roofStyle, width, length, height,
 * framingGauge.
 *
 * Handles BOTH the new brace-delimited format and legacy records saved
 * before this restructure, which only contain a plain "W' x L' x H'" string
 * with no braces (roof/framing gauge are blank for those).
 *
 * NOTE: returned keys do NOT match the form's field names (roof_style /
 * dimension_width / dimension_length / dimension_height / framing_gauge),
 * so callers must map each value explicitly — never spread the result.
 *
 * Only the edit form needs this — every display location uses
 * formatProjectDescriptionForDisplay() instead.
 */
export function parseProjectDescription(stored) {
  const empty = { roofStyle: "", width: "", length: "", height: "", framingGauge: "" };
  if (!stored) return empty;

  const braceMatches = [...stored.matchAll(/\{([^}]*)\}/g)].map((m) => m[1]);
  if (braceMatches.length === 3) {
    const [roofSegment, dimensionSegment, gaugeSegment] = braceMatches;
    const dimParts = dimensionSegment.split(" x ").map((p) => p.trim());
    const parseOne = (p) => {
      if (!p || p === "—") return "";
      const n = parseFloat(p.replace("'", ""));
      return Number.isFinite(n) ? String(n) : "";
    };
    return {
      roofStyle: roofSegment === "—" ? "" : roofSegment.toUpperCase(),
      width: parseOne(dimParts[0]),
      length: parseOne(dimParts[1]),
      height: parseOne(dimParts[2]),
      framingGauge: gaugeSegment === "—" ? "" : gaugeSegment.toUpperCase(),
    };
  }

  // Backward compatibility: records saved before this task only ever
  // contain a plain "W' x L' x H'" string with no braces.
  const legacyParts = stored.split(" x ").map((p) => p.trim());
  const parseOne = (p) => {
    if (!p || p === "—") return "";
    const n = parseFloat(p.replace("'", ""));
    return Number.isFinite(n) ? String(n) : "";
  };
  return {
    roofStyle: "",
    width: parseOne(legacyParts[0]),
    length: parseOne(legacyParts[1]),
    height: parseOne(legacyParts[2]),
    framingGauge: "",
  };
}

/**
 * Turns a stored project-description string into a clean, human-readable
 * string for the UI / popup / drawer / print manifest — stripping the curly
 * braces and any "—" placeholders:
 *   "{Vertical Roof} {20' x 30' x 12'} {14 Ga}" -> "Vertical Roof · 20' x 30' x 12' · 14 Ga"
 *
 * Returns null when there is nothing meaningful to show, so callers can omit
 * the line/field entirely (never render a bare "—").
 */
export function formatProjectDescriptionForDisplay(stored) {
  if (!stored) return null;
  const parsed = parseProjectDescription(stored);
  const parts = [];
  if (parsed.roofStyle) parts.push(parsed.roofStyle);
  const dims = [parsed.width, parsed.length, parsed.height].filter((v) => v !== "");
  if (dims.length > 0) {
    const dimStr = [parsed.width || "—", parsed.length || "—", parsed.height || "—"]
      .map((v) => (v ? `${v}'` : "—"))
      .join(" x ");
    parts.push(dimStr);
  }
  if (parsed.framingGauge) parts.push(parsed.framingGauge);
  return parts.length > 0 ? parts.join(" · ") : null;
}
/**
 * Largest single file that can be attached to a project or run. Used by the
 * server actions (core file service check) and by the attachments UI, so
 * both sides always agree. The Supabase bucket's own file size limit must be
 * at least this large.
 */
export const PROJECT_FILE_MAX_BYTES = 30 * 1024 * 1024;

/**
 * MIME types that can be attached to a project or run: PDF only. Used by the
 * server actions (core file service check) and by the attachments UI (file
 * picker filter), so both sides always agree.
 */
export const PROJECT_FILE_TYPES = ["application/pdf"];

/**
 * Project statuses that mark a project as a repair. "Repairs" is set by
 * staff; the other three are set by the run-status cascade (updateRun) so a
 * repair keeps a repair status while its run is Planned / In Progress /
 * Completed. A repair's amount is never revenue: it is labelled "Repairs",
 * shown in red, and kept out of subtotal sums.
 */
export const REPAIR_STATUS_NAMES = [
  "Repairs",
  "For Repair",
  "Currently Being Repaired",
  "Repaired",
];

// The whole repair flow is shown under this one tab.
const REPAIRS_TAB_STATUS_NAME = "Repairs";

/**
 * True when this status has no tab of its own because it is shown under the
 * "Repairs" tab (the repair-flow statuses other than "Repairs" itself). Only
 * applies while an active "Repairs" status exists to hold them.
 */
export function isGroupedStatusTab(status, statuses = []) {
  const name = status?.status_name;
  if (name === REPAIRS_TAB_STATUS_NAME || !REPAIR_STATUS_NAMES.includes(name)) return false;
  return statuses.some((s) => s.status_name === REPAIRS_TAB_STATUS_NAME && s.is_active !== false);
}

/**
 * Status ids (as strings) that one tab stands for. Every tab stands for its
 * own status only, except "Repairs", which also covers the grouped
 * repair-flow statuses.
 */
export function getStatusTabGroupIds(statusId, statuses = []) {
  const own = String(statusId);
  const tabStatus = statuses.find((s) => String(s.status_id) === own);
  if (tabStatus?.status_name !== REPAIRS_TAB_STATUS_NAME) return [own];
  const grouped = statuses.filter((s) => s.is_active !== false && isGroupedStatusTab(s, statuses));
  return [own, ...grouped.map((s) => String(s.status_id))];
}

/**
 * True when the project is a repair. The status name is resolved from the
 * statuses list first (always current), then from the joined status object.
 */
export function isRepairProject(project, statuses = []) {
  if (!project) return false;
  const statusName =
    statuses.find((s) => s.status_id === project.status_id)?.status_name ||
    project.proj_s_project_status?.status_name ||
    "";
  return REPAIR_STATUS_NAMES.includes(statusName);
}

/**
 * How a project's amount is presented: repairs are red and labelled
 * "Repairs", everything else is green and labelled "Project Subtotal".
 * `prefix` is for compact spots that show the amount without a label cell.
 */
export function getProjectAmountDisplay(project, statuses = []) {
  const isRepair = isRepairProject(project, statuses);
  return {
    isRepair,
    label: isRepair ? "Repairs" : "Project Subtotal",
    prefix: isRepair ? "Repairs: " : "",
    color: isRepair ? "#dc2626" : "#16a34a",
  };
}

/**
 * Splits a run's stops into revenue and repairs. Repairs are never revenue,
 * so every run total must come from here instead of summing all stops.
 * `runProjects` are proj_t_run_projects rows with a nested proj_t_projects.
 */
export function splitRunAmounts(runProjects = [], statuses = []) {
  let revenue = 0;
  let repairs = 0;
  (runProjects || []).forEach((rp) => {
    const proj = rp?.proj_t_projects;
    if (!proj) return;
    const amount = Number(proj.project_subtotal) || 0;
    if (isRepairProject(proj, statuses)) repairs += amount;
    else revenue += amount;
  });
  return { revenue, repairs };
}

/**
 * Strips "Township" from a place name or address string for display,
 * keeping the city/place name itself intact. Purely a display transform —
 * never mutates the stored value.
 *   "Ashtabula Township" -> "Ashtabula"
 *   "South Bloomfield Township, OH 43011" -> "South Bloomfield, OH 43011"
 */
export function stripTownshipLabel(value) {
  if (!value) return value;
  return String(value).replace(/\s+Township\b/gi, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Splits a stored paid-sheet state-route string back into an array of
 * state codes for the multi-select form control.
 *
 * Storage format (proj_t_paid_sheet.state_route) is brace-delimited with
 * no separator — same pattern as proj_t_projects.dimension:
 *   "{TX}{OK}{AR}"
 *
 * Examples:
 *   parseStateRoute("{TX}{OK}{AR}") -> ["TX", "OK", "AR"]
 *   parseStateRoute("")             -> []
 *   parseStateRoute("AAA")          -> []  // legacy unbracketed value -> no selection
 */
export function parseStateRoute(value) {
  if (!value) return [];
  const matches = value.match(/\{([^}]*)\}/g) || [];
  return matches.map((m) => m.slice(1, -1)).filter(Boolean);
}

/**
 * Turns an array of selected state codes into the brace-delimited storage
 * string written to proj_t_paid_sheet.state_route.
 *
 *   formatStateRoute(["TX", "OK", "AR"]) -> "{TX}{OK}{AR}"
 *   formatStateRoute([])                 -> ""
 */
export function formatStateRoute(values) {
  if (!Array.isArray(values) || values.length === 0) return "";
  return values.map((v) => `{${v}}`).join("");
}
