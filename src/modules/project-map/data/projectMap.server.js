import { createClient } from "@supabase/supabase-js";
import { getCurrentSession } from "@/core/auth/session.service";
import { getStatusTabGroupIds } from "./projectMap.data";

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
      "proj_s_project_status!proj_t_projects_status_id_fkey(status_id, status_name, status_description)"
    )
    .order("updated_at", { ascending: false });

  const queries = {
    projects: projectsQuery,
    projectStatuses: supabase
      .from("proj_s_project_status")
      .select("*")
      .order("display_order", { ascending: true })
      .order("status_name", { ascending: true }),
    originAddresses: supabase.from("proj_s_origin_addresses").select("*").order("origin_name"),
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

// Run status names mapped to a department (proj_m_department_run_status).
// Runs store their status as the name, so names are what gets matched. A
// failed lookup hides runs instead of blocking the whole page.
async function loadDepartmentRunStatusNames(supabase, deptId) {
  const [mappingResult, statusesResult] = await Promise.all([
    supabase.from("proj_m_department_run_status").select("status_id").eq("dept_id", deptId),
    supabase.from("proj_s_run_status").select("status_id, status_name"),
  ]);
  if (mappingResult.error || statusesResult.error) {
    console.error("[loadDepartmentRunStatusNames]", mappingResult.error?.message || statusesResult.error?.message);
    return [];
  }
  const mappedIds = new Set((mappingResult.data || []).map((row) => String(row.status_id)));
  return (statusesResult.data || [])
    .filter((status) => mappedIds.has(String(status.status_id)))
    .map((status) => status.status_name);
}

/**
 * Which project status tabs the signed-in user may see.
 *
 * Business rule: tabs are shown per department, from
 * proj_m_department_project_status. A user with no department, or a
 * department with no mapped statuses, cannot open the Project Map at all.
 * For users who do have tabs, `visibleProjectStatusIds` is every status whose
 * projects they may see (their tabs, plus the repair-flow statuses when they
 * have the "Repairs" tab); projects in any other status are never sent to them.
 *
 * `allowedRunStatusNames` is the same idea for runs: the run statuses mapped
 * to the department. It is filled even when `reason` is "no-mapping", because
 * the Run Master List does not need project tabs. Empty means no runs at all.
 *
 * `reason` is "ok" when tabs are available; otherwise it says why not, and
 * the page shows it on a blocked screen the user can screenshot for the developers:
 * "no-session" | "no-user" | "no-department" | "no-mapping" | "error".
 */
export async function loadProjectStatusTabAccess() {
  const access = { reason: "ok", allowedStatusIds: [], visibleProjectStatusIds: [], allowedRunStatusNames: [], user: null, department: null };

  try {
    const session = await getCurrentSession();
    if (!session?.userId) return { ...access, reason: "no-session" };

    const supabase = getSupabaseAdmin();
    const { data: user, error: userError } = await supabase
      .from("psb_s_user")
      .select("user_id, username, email, first_name, last_name, dept_id")
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
    if (user.dept_id == null) return { ...access, reason: "no-department" };

    const [departmentResult, mappingResult, statusesResult] = await Promise.all([
      supabase.from("psb_s_department").select("dept_id, dept_name").eq("dept_id", user.dept_id).maybeSingle(),
      supabase.from("proj_m_department_project_status").select("status_id").eq("dept_id", user.dept_id),
      supabase.from("proj_s_project_status").select("status_id, status_name, is_active"),
    ]);
    if (departmentResult.error) throw new Error(departmentResult.error.message);
    if (mappingResult.error) throw new Error(mappingResult.error.message);
    if (statusesResult.error) throw new Error(statusesResult.error.message);

    access.department = { deptId: user.dept_id, name: departmentResult.data?.dept_name || "" };
    access.allowedRunStatusNames = await loadDepartmentRunStatusNames(supabase, user.dept_id);
    access.allowedStatusIds = (mappingResult.data || []).map((row) => String(row.status_id));
    if (access.allowedStatusIds.length === 0) return { ...access, reason: "no-mapping" };

    const statuses = statusesResult.data || [];
    access.visibleProjectStatusIds = [
      ...new Set(access.allowedStatusIds.flatMap((statusId) => getStatusTabGroupIds(statusId, statuses))),
    ];

    return access;
  } catch (error) {
    console.error("[loadProjectStatusTabAccess]", error?.message);
    return { ...access, reason: "error", allowedStatusIds: [] };
  }
}

/**
 * Data for the "Department Tabs" setup screen: every department, and every
 * department ↔ status row in the project and run mapping tables.
 */
export async function loadDepartmentStatusMappings() {
  const supabase = getSupabaseAdmin();
  const [departmentsResult, mappingsResult, runMappingsResult] = await Promise.all([
    supabase.from("psb_s_department").select("dept_id, dept_name, is_active").order("dept_name", { ascending: true }),
    supabase.from("proj_m_department_project_status").select("dept_id, status_id"),
    supabase.from("proj_m_department_run_status").select("dept_id, status_id"),
  ]);

  if (departmentsResult.error) console.error("[loadDepartmentStatusMappings] departments:", departmentsResult.error.message);
  if (mappingsResult.error) console.error("[loadDepartmentStatusMappings] mappings:", mappingsResult.error.message);
  if (runMappingsResult.error) console.error("[loadDepartmentStatusMappings] run mappings:", runMappingsResult.error.message);

  return {
    departments: departmentsResult.data || [],
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
  // Only runs in statuses this user's department may see. A page that has
  // already looked access up passes it in to save a second lookup.
  const runAccess = access || (await loadProjectStatusTabAccess());
  const statusNames = runAccess.allowedRunStatusNames || [];
  if (statusNames.length === 0) return [];

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("proj_t_runs")
    .select("*, proj_s_origin_addresses(*), proj_t_run_projects(id, proj_t_projects(payment_method_type, project_subtotal, proj_s_project_status!proj_t_projects_status_id_fkey(status_name)))")
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
