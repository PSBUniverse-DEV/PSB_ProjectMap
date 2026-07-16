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
    projectStatuses: supabase.from("proj_s_project_status").select("*").order("status_id"),
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
        "order_received_date, scheduled_project_date, install_date, " +
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
