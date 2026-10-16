import { createClient } from "@supabase/supabase-js";
import { getCurrentSession } from "@/core/auth/session.service";
import { getStatusTabGroupIds } from "./projectMap.data";
import projectMapModule from "../index";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin configuration");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Setup Loader ───────────────────────────────────────────

export async function loadProjectMapSetup() {
  const supabase = getSupabaseAdmin();

  // Select all project fields including the new operational fields.
  // Uses LEFT JOIN (Supabase default) so projects without lookup records are not excluded.
  const projectsQuery = supabase
    .from("proj_t_projects")
    .select(
      "id, client_name, formatted_address, address_line_1, city, state, state_code, " +
      "postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, " +
      "location_source, location_confirmed, status_id, dealer, " +
      "building_category_id, permit_status_id, welcome_call_status_id, invoice_number, " +
      "order_received_at, scheduled_project_start, scheduled_project_end, install_start, install_end, " +
      "project_subtotal, project_notes, dimension, " +
      "created_at, updated_at, created_by, updated_by, " +
      "proj_s_project_status!proj_t_projects_status_id_fkey(status_id, status_name, status_description, system_key)"
    )
    .order("updated_at", { ascending: false });

  const queries = {
    projects: projectsQuery,
    projectStatuses: supabase
      .from("proj_s_project_status")
      .select("*")
      .order("display_order", { ascending: true })
      .order("status_name", { ascending: true }),
    originAddresses: supabase
      .from("proj_s_origin_addresses")
      .select("*")
      .order("display_order", { ascending: true })
      .order("origin_name", { ascending: true }),
    states: supabase
      .from("proj_s_states")
      .select("*")
      .order("display_order", { ascending: true })
      .order("state_name", { ascending: true }),
    buildingCategories: supabase
      .from("proj_s_building_categories")
      .select("*")
      .order("display_order", { ascending: true })
      .order("building_category_name", { ascending: true }),
    permitStatuses: supabase
      .from("proj_s_permit_status")
      .select("*")
      .order("display_order", { ascending: true })
      .order("status_name", { ascending: true }),
    welcomeCallStatuses: supabase
      .from("proj_s_welcome_call_status")
      .select("*")
      .order("display_order", { ascending: true })
      .order("status_name", { ascending: true }),
    runStatuses: supabase
      .from("proj_s_run_status")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    paymentMethods: supabase
      .from("proj_s_payment_method")
      .select("*")
      .order("display_order", { ascending: true })
      .order("method_name", { ascending: true }),
  };

  const keys = Object.keys(queries);
  const settled = await Promise.allSettled(Object.values(queries));
  const result = {};
  const errors = [];

  settled.forEach((r, i) => {
    const key = keys[i];
    if (r.status === "fulfilled" && !r.value.error) {
      result[key] = r.value.data || [];
    } else {
      // Log the actual error so we can see why the query failed
      const errMsg = r.status === "rejected"
        ? r.reason?.message || "Promise rejected"
        : r.value?.error?.message || "Unknown error";
      console.error(`[loadProjectMapSetup] Query "${key}" failed:`, errMsg);
      result[key] = [];
      errors.push(key);
    }
  });

  return { ...result, sourceErrors: errors };
}

// ─── Status Tab Access ──────────────────────────────────────

// app_id of the Project Map application. Found by module_key because ids
// differ between QAS and PROD.
async function loadProjectMapAppId(supabase) {
  const { data: app, error } = await supabase
    .from("psb_s_application")
    .select("app_id")
    .eq("module_key", projectMapModule.module_key)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) throw new Error(`No active application with module_key "${projectMapModule.module_key}"`);
  return app.app_id;
}

// The signed-in user's active roles in the Project Map application. A role
// counts only when both the user's assignment and the role itself are active.
async function loadProjectMapRoles(supabase, userId) {
  const appId = await loadProjectMapAppId(supabase);

  const { data: assignments, error: assignmentError } = await supabase
    .from("psb_m_userapproleaccess")
    .select("role_id")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .eq("is_active", true);
  if (assignmentError) throw new Error(assignmentError.message);

  const roleIds = [...new Set((assignments || []).map((row) => row.role_id))];
  if (roleIds.length === 0) return [];

  const { data: roles, error: roleError } = await supabase
    .from("psb_s_role")
    .select("role_id, role_name")
    .in("role_id", roleIds)
    .eq("is_active", true)
    .order("role_name", { ascending: true });
  if (roleError) throw new Error(roleError.message);
  return (roles || []).map((role) => ({ roleId: role.role_id, name: role.role_name || "" }));
}

// Run status names mapped to any of the given roles (proj_m_role_run_status),
// as one combined list. Runs store their status as the name, so names are
// what gets matched. A failed lookup hides runs instead of blocking the whole page.
async function loadRoleRunStatusNames(supabase, roleIds) {
  const [mappingResult, statusesResult] = await Promise.all([
    supabase.from("proj_m_role_run_status").select("status_id").in("role_id", roleIds),
    supabase.from("proj_s_run_status").select("status_id, status_name"),
  ]);
  if (mappingResult.error || statusesResult.error) {
    console.error("[loadRoleRunStatusNames]", mappingResult.error?.message || statusesResult.error?.message);
    return [];
  }
  const mappedIds = new Set((mappingResult.data || []).map((row) => String(row.status_id)));
  return (statusesResult.data || [])
    .filter((status) => mappedIds.has(String(status.status_id)))
    .map((status) => status.status_name);
}

/**
 * What the signed-in user may see and change in Project Map.
 *
 * Business rule: a user needs at least one active Project Map role
 * (psb_m_userapproleaccess for the app whose module_key is "project-map");
 * without one they cannot open the Project Map at all.
 * Every Project Map user SEES every project and run status:
 * `allowedStatusIds` / `visibleProjectStatusIds` hold every project status id,
 * `allowedRunStatusNames` every run status name.
 * What they may CHANGE comes from the statuses ticked for their roles in
 * Setup → Role Tabs (proj_m_role_project_status / proj_m_role_run_status),
 * all roles combined: `editableProjectStatusIds` (a ticked "Repairs" tab also
 * covers the repair-flow statuses) and `editableRunStatusNames`. Empty lists
 * mean view-only. The write actions in projectMap.actions.js enforce this.
 *
 * `reason` is "ok" when the user may open Project Map; otherwise it says why
 * not, and the page shows it on a blocked screen the user can screenshot for
 * the developers: "no-session" | "no-user" | "no-role" | "error".
 */
export async function loadProjectStatusTabAccess() {
  const access = {
    reason: "ok",
    allowedStatusIds: [],
    visibleProjectStatusIds: [],
    allowedRunStatusNames: [],
    editableProjectStatusIds: [],
    editableRunStatusNames: [],
    user: null,
    roles: [],
  };

  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { ...access, reason: "no-session" };

    const supabase = getSupabaseAdmin();
    const { data: user, error: userError } = await supabase
      .from("psb_s_user")
      .select("user_id, username, email, first_name, last_name")
      .eq("user_id", session.userId)
      .maybeSingle();
    if (userError) throw new Error(userError.message);
    if (!user) return { ...access, reason: "no-user", user: { userId: session.userId, name: "", username: "", email: session.email || "" } };

    access.user = {
      userId: user.user_id,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      username: user.username || "",
      email: user.email || "",
    };
    access.roles = await loadProjectMapRoles(supabase, user.user_id);
    if (access.roles.length === 0) return { ...access, reason: "no-role" };
    const roleIds = access.roles.map((role) => role.roleId);

    const [mappingResult, statusesResult, runStatusesResult] = await Promise.all([
      supabase.from("proj_m_role_project_status").select("status_id").in("role_id", roleIds),
      supabase.from("proj_s_project_status").select("status_id, status_name, is_active, system_key"),
      supabase.from("proj_s_run_status").select("status_name"),
    ]);
    if (mappingResult.error) throw new Error(mappingResult.error.message);
    if (statusesResult.error) throw new Error(statusesResult.error.message);
    if (runStatusesResult.error) throw new Error(runStatusesResult.error.message);

    // Seeing: every Project Map user sees every project and run status.
    const statuses = statusesResult.data || [];
    access.allowedStatusIds = statuses.map((status) => String(status.status_id));
    access.visibleProjectStatusIds = access.allowedStatusIds;
    access.allowedRunStatusNames = (runStatusesResult.data || []).map((status) => status.status_name);

    // Changing: only the statuses ticked for one of the user's roles. Several
    // roles can tick the same status, so de-duplicate.
    const tickedIds = [...new Set((mappingResult.data || []).map((row) => String(row.status_id)))];
    access.editableProjectStatusIds = [
      ...new Set(tickedIds.flatMap((statusId) => getStatusTabGroupIds(statusId, statuses))),
    ];
    access.editableRunStatusNames = await loadRoleRunStatusNames(supabase, roleIds);

    return access;
  } catch (error) {
    console.error("[loadProjectStatusTabAccess]", error?.message);
    return { ...access, reason: "error", allowedStatusIds: [] };
  }
}

/**
 * Data for the "Role Tabs" setup screen: every Project Map role (psb_s_role
 * rows of the app whose module_key is "project-map", switched on or off), and
 * every role ↔ status row in the project and run mapping tables.
 */
export async function loadRoleStatusMappings() {
  const supabase = getSupabaseAdmin();
  let appId;
  try {
    appId = await loadProjectMapAppId(supabase);
  } catch (error) {
    console.error("[loadRoleStatusMappings] application:", error?.message);
    return { roles: [], mappings: [], runMappings: [] };
  }

  const [rolesResult, mappingsResult, runMappingsResult] = await Promise.all([
    supabase.from("psb_s_role").select("role_id, role_name, is_active").eq("app_id", appId).order("role_name", { ascending: true }),
    supabase.from("proj_m_role_project_status").select("role_id, status_id"),
    supabase.from("proj_m_role_run_status").select("role_id, status_id"),
  ]);

  if (rolesResult.error) console.error("[loadRoleStatusMappings] roles:", rolesResult.error.message);
  if (mappingsResult.error) console.error("[loadRoleStatusMappings] mappings:", mappingsResult.error.message);
  if (runMappingsResult.error) console.error("[loadRoleStatusMappings] run mappings:", runMappingsResult.error.message);

  return {
    roles: rolesResult.data || [],
    mappings: mappingsResult.data || [],
    runMappings: runMappingsResult.data || [],
  };
}

/**
 * Every run status, switched on or off, for the setup grid.
 * loadProjectMapSetup returns active ones only, which the map pages need.
 */
export async function loadAllRunStatuses() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_s_run_status")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[loadAllRunStatuses]", error.message);
    return [];
  }
  return data || [];
}

// ─── Runs Loader ────────────────────────────────────────────

export async function loadRuns(access) {
  // Only runs in statuses this user's Project Map roles may see. A page that has
  // already looked access up passes it in to save a second lookup.
  const runAccess = access || (await loadProjectStatusTabAccess());
  const statusNames = runAccess.allowedRunStatusNames || [];
  if (statusNames.length === 0) return [];

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("proj_t_runs")
    .select("*, proj_s_origin_addresses(*), proj_t_run_projects(id, proj_t_projects(payment_method_type, project_subtotal, proj_s_project_status!proj_t_projects_status_id_fkey(status_name, system_key)))")
    .in("status", statusNames)
    .order("run_date", { ascending: false });

  if (error) throw new Error(error.message);

  const runs = data || [];
  const runIds = runs.map((r) => r.id).filter(Boolean);

  // Fetch each run's Paid Sheet header (proj_t_paid_sheet) in a single batched
  // query rather than one query per row. A run with no saved Paid Sheet row has
  // no entry here, so dot_number/state_route stay null until the sheet is saved.
  let paidSheetByRunId = {};
  if (runIds.length > 0) {
    const { data: psData, error: psError } = await supabase
      .from("proj_t_paid_sheet")
      .select("run_id, dot_number, state_route")
      .in("run_id", runIds);
    if (psError) throw new Error(psError.message);
    paidSheetByRunId = Object.fromEntries((psData || []).map((ps) => [ps.run_id, ps]));
  }

  return runs.map((run) => {
    const ps = paidSheetByRunId[run.id];
    return {
      ...run,
      dot_number: ps?.dot_number ?? null,
      state_route: ps?.state_route ?? null,
    };
  });
}

export async function loadRunDetails(runId) {
  const supabase = getSupabaseAdmin();

  const [runResult, projectsResult] = await Promise.all([
    supabase.from("proj_t_runs").select("*, proj_s_origin_addresses(*)").eq("id", runId).single(),
    supabase
      .from("proj_t_run_projects")
      .select("*, proj_t_projects(id, client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, dealer, building_category_id, permit_status_id, welcome_call_status_id, invoice_number, project_subtotal, order_received_at, scheduled_project_start, scheduled_project_end, install_start, install_end, project_notes, dimension, payment_method_type, payment_method_number, paid_sheet_notes, paid_sheet_done, status_before_run_completion_id, proj_s_project_status!proj_t_projects_status_id_fkey(*), previous_project_status:proj_s_project_status!proj_t_projects_status_before_run_completion_id_fkey(*), proj_s_building_categories(*), proj_s_permit_status(*), proj_s_welcome_call_status(*), proj_s_payment_method(id, method_name, method_description))")
      .eq("run_id", runId)
      .order("stop_sequence"),
  ]);

  if (runResult.error) throw new Error(runResult.error.message);
  if (projectsResult.error) throw new Error(projectsResult.error.message);

  return {
    run: runResult.data || null,
    projects: projectsResult.data || [],
  };
}

// ─── Project List Loader ────────────────────────────────────

export async function loadProjectMapProjects() {
  const supabase = getSupabaseAdmin();

  const [projectsResult, statusesResult, originsResult, statesResult] = await Promise.all([
    supabase
      .from("proj_t_projects")
      .select(
        "id, client_name, formatted_address, address_line_1, city, state, state_code, " +
        "postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, " +
        "location_source, location_confirmed, status_id, dealer, " +
        "building_category_id, permit_status_id, welcome_call_status_id, invoice_number, " +
        "order_received_at, scheduled_project_start, scheduled_project_end, install_start, install_end, " +
        "project_subtotal, project_notes, dimension, " +
        "created_at, updated_at, created_by, updated_by, " +
        "proj_s_project_status(status_id, status_name, status_description)"
      )
      .order("updated_at", { ascending: false }),
    supabase.from("proj_s_project_status").select("status_id, status_name, status_description, display_color").order("status_id"),
    supabase.from("proj_s_origin_addresses").select("*").eq("is_active", true).order("origin_name"),
    supabase.from("proj_s_states").select("*").eq("is_active", true).order("display_order"),
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (statusesResult.error) throw new Error(statusesResult.error.message);

  const projects = projectsResult.data || [];
  const statuses = statusesResult.data || [];
  const origins = originsResult.error ? [] : (originsResult.data || []);
  const states = statesResult.error ? [] : (statesResult.data || []);

  return { projects, statuses, origins, states };
}
