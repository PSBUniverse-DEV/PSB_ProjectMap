import { createClient } from "@supabase/supabase-js";

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

  const queries = {
    projects: supabase
      .from("proj_t_projects")
      .select(
        "id, client_name, formatted_address, address_line_1, city, state, state_code, " +
        "postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, " +
        "location_source, location_confirmed, status_id, dealer, " +
        "building_category_id, permit_status_id, welcome_call_status_id, invoice_number, " +
        "order_received_at, scheduled_project_start, scheduled_project_end, install_start, install_end, " +
        "project_subtotal, notes, " +
        "created_at, updated_at, created_by, updated_by, " +
        "proj_s_project_status(status_id, status_name, status_description)"
      )
      .order("updated_at", { ascending: false }),
    projectStatuses: supabase.from("proj_s_project_status").select("*").order("status_id"),
    originAddresses: supabase.from("proj_s_origin_addresses").select("*").order("origin_name"),
    states: supabase.from("proj_s_states").select("*").order("display_order"),
    buildingCategories: supabase.from("proj_s_building_categories").select("*").order("display_order"),
    permitStatuses: supabase.from("proj_s_permit_status").select("*").order("display_order"),
    welcomeCallStatuses: supabase.from("proj_s_welcome_call_status").select("*").order("display_order"),
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
      result[key] = [];
      errors.push(key);
    }
  });

  return { ...result, sourceErrors: errors };
}

// ─── Runs Loader ────────────────────────────────────────────

export async function loadRuns() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("proj_t_runs")
    .select("*, proj_s_origin_addresses(*)")
    .order("run_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadRunDetails(runId) {
  const supabase = getSupabaseAdmin();

  const [runResult, projectsResult] = await Promise.all([
    supabase.from("proj_t_runs").select("*, proj_s_origin_addresses(*)").eq("id", runId).single(),
    supabase
      .from("proj_t_run_projects")
      .select("*, proj_t_projects(*), proj_s_project_status(*)")
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
        "order_received_date, scheduled_project_date, install_date, project_subtotal, " +
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
