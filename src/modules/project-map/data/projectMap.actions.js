"use server";

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

// ─── Helpers ───────────────────────────────────────────────

function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function toDateOrNull(v) {
  if (!hasValue(v)) return null;
  return String(v).trim();
}

function toIntOrNull(v) {
  if (!hasValue(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

// ─── Setup Table CRUD ──────────────────────────────────────

const SETUP_TABLES = {
  projectStatuses: { table: "proj_s_project_status", pk: "status_id" },
  originAddresses: { table: "proj_s_origin_addresses", pk: "id" },
  states: { table: "proj_s_states", pk: "id" },
  buildingCategories: { table: "proj_s_building_categories", pk: "id" },
  permitStatuses: { table: "proj_s_permit_status", pk: "id" },
  welcomeCallStatuses: { table: "proj_s_welcome_call_status", pk: "id" },
};

function resolveSetupTable(key) {
  const entry = SETUP_TABLES[key];
  if (!entry) throw new Error(`Unknown setup table key: "${key}"`);
  return entry;
}

export async function createSetupRow(tableKey, row) {
  const { table, pk } = resolveSetupTable(tableKey);
  if (!row || typeof row !== "object") throw new Error("Row data is required.");

  const supabase = getSupabaseAdmin();
  const payload = { ...row };
  delete payload[pk];

  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSetupRow(tableKey, id, updates) {
  const { table, pk } = resolveSetupTable(tableKey);
  if (id == null) throw new Error(`${pk} is required.`);
  if (!updates || typeof updates !== "object") throw new Error("Update data is required.");

  const supabase = getSupabaseAdmin();
  const payload = { ...updates };
  delete payload[pk];

  const { data, error } = await supabase.from(table).update(payload).eq(pk, id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteSetupRow(tableKey, id) {
  const { table, pk } = resolveSetupTable(tableKey);
  if (id == null) throw new Error(`${pk} is required.`);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq(pk, id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Lookup Table Loaders ──────────────────────────────────

export async function loadBuildingCategories() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_s_building_categories")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadPermitStatuses() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_s_permit_status")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadWelcomeCallStatuses() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_s_welcome_call_status")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

// ─── Project CRUD ──────────────────────────────────────────

export async function createProject(project) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const payload = {
    client_name: String(project.client_name || "").trim(),
    formatted_address: hasValue(project.formatted_address) ? String(project.formatted_address).trim() : null,
    address_line_1: hasValue(project.address_line_1) ? String(project.address_line_1).trim() : null,
    city: hasValue(project.city) ? String(project.city).trim() : null,
    state: hasValue(project.state) ? String(project.state).trim() : null,
    state_code: hasValue(project.state_code) ? String(project.state_code).trim() : null,
    postal_code: hasValue(project.postal_code) ? String(project.postal_code).trim() : null,
    country: hasValue(project.country) ? String(project.country).trim() : null,
    address_latitude: project.address_latitude != null ? Number(project.address_latitude) : null,
    address_longitude: project.address_longitude != null ? Number(project.address_longitude) : null,
    site_latitude: project.site_latitude != null ? Number(project.site_latitude) : null,
    site_longitude: project.site_longitude != null ? Number(project.site_longitude) : null,
    location_source: hasValue(project.location_source) ? String(project.location_source).trim() : null,
    location_confirmed: Boolean(project.location_confirmed),
    status_id: toIntOrNull(project.status_id),
    dealer: hasValue(project.dealer) ? String(project.dealer).trim() : null,
    building_category_id: toIntOrNull(project.building_category_id),
    permit_status_id: toIntOrNull(project.permit_status_id),
    welcome_call_status_id: toIntOrNull(project.welcome_call_status_id),
    invoice_number: hasValue(project.invoice_number) ? String(project.invoice_number).trim() : null,
    order_received_at: project.order_received_at || null,
    scheduled_project_start: project.scheduled_project_start || null,
    scheduled_project_end: project.scheduled_project_end || null,
    install_start: project.install_start || null,
    install_end: project.install_end || null,
    project_subtotal: project.project_subtotal != null ? Number(project.project_subtotal) : null,
    created_by: toIntOrNull(project.created_by),
    updated_by: toIntOrNull(project.updated_by),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("proj_t_projects").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProject(projectId, updates) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const payload = {
    ...updates,
    updated_at: now,
    building_category_id: toIntOrNull(updates.building_category_id),
    permit_status_id: toIntOrNull(updates.permit_status_id),
    welcome_call_status_id: toIntOrNull(updates.welcome_call_status_id),
    invoice_number: hasValue(updates.invoice_number) ? String(updates.invoice_number).trim() : null,
    order_received_at: updates.order_received_at || null,
    scheduled_project_start: updates.scheduled_project_start || null,
    scheduled_project_end: updates.scheduled_project_end || null,
    install_start: updates.install_start || null,
    install_end: updates.install_end || null,
    updated_by: toIntOrNull(updates.updated_by),
  };

  const { data, error } = await supabase.from("proj_t_projects").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProject(projectId) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proj_t_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Run CRUD ──────────────────────────────────────────────

const RUN_STATUSES = ["Draft", "Planned", "Scheduled", "In Progress", "Completed", "Cancelled"];

export async function createRun(runData) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const payload = {
    run_name: String(runData.run_name || "").trim(),
    origin_id: runData.origin_id || null,
    run_date: runData.run_date || null,
    status: RUN_STATUSES.includes(runData.status) ? runData.status : "Draft",
    notes: runData.notes ? String(runData.notes).trim() : null,
    team_assigned: runData.team_assigned ? String(runData.team_assigned).trim() : null,
    vehicle_assigned: runData.vehicle_assigned ? String(runData.vehicle_assigned).trim() : null,
    estimated_distance: runData.estimated_distance != null ? Number(runData.estimated_distance) : null,
    estimated_mileage: runData.estimated_mileage != null ? Number(runData.estimated_mileage) : null,
    estimated_duration: runData.estimated_duration != null ? Number(runData.estimated_duration) : null,
    estimated_subtotal: runData.estimated_subtotal != null ? Number(runData.estimated_subtotal) : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("proj_t_runs").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRun(runId, updates) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const payload = { ...updates, updated_at: now };
  if (payload.status && !RUN_STATUSES.includes(payload.status)) {
    payload.status = "Draft";
  }

  const { data, error } = await supabase.from("proj_t_runs").update(payload).eq("id", runId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteRun(runId) {
  const supabase = getSupabaseAdmin();
  
  // First, remove all run-project mappings (unassign projects)
  const { error: mappingError } = await supabase.from("proj_t_run_projects").delete().eq("run_id", runId);
  if (mappingError) throw new Error(mappingError.message);
  
  // Then delete the run record
  const { error } = await supabase.from("proj_t_runs").delete().eq("id", runId);
  if (error) throw new Error(error.message);
  
  return { success: true };
}

export async function addProjectToRun(runId, projectId, stopSequence = 0) {
  const supabase = getSupabaseAdmin();
  const pid = Number(projectId);

  // Check if project is already assigned to ANY run (including this one)
  const { data: existing, error: checkError } = await supabase
    .from("proj_t_run_projects")
    .select("id, run_id")
    .eq("project_id", pid)
    .maybeSingle();

  if (checkError) throw new Error(checkError.message);

  if (existing) {
    if (existing.run_id === runId) {
      throw new Error("This project is already in this run.");
    }
    // Get the other run's name
    const { data: otherRun } = await supabase
      .from("proj_t_runs")
      .select("run_name")
      .eq("id", existing.run_id)
      .single();
    throw new Error(
      `Project is already assigned to run "${otherRun?.run_name || `#${existing.run_id}`}". Remove it from that run first.`
    );
  }

  const payload = {
    run_id: runId,
    project_id: pid,
    stop_sequence: Number(stopSequence) || 0,
  };

  const { data, error } = await supabase.from("proj_t_run_projects").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

// Check if a project is already assigned to a run (returns { id, run_id, run_name } or null)
export async function getProjectRunAssignment(projectId) {
  const supabase = getSupabaseAdmin();
  const pid = Number(projectId);

  const { data, error } = await supabase
    .from("proj_t_run_projects")
    .select("id, run_id, proj_t_runs!inner(run_name)")
    .eq("project_id", pid)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    runId: data.run_id,
    runName: data.proj_t_runs?.run_name || null,
  };
}

export async function removeProjectFromRun(runProjectId) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proj_t_run_projects").delete().eq("id", runProjectId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateStopSequence(runProjectId, stopSequence) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proj_t_run_projects").update({ stop_sequence: Number(stopSequence) }).eq("id", runProjectId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateStopNote(runProjectId, notes) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proj_t_run_projects").update({ notes: notes || null }).eq("id", runProjectId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRunStopsCount(runId, count) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proj_t_runs").update({ stops: count }).eq("id", runId);
  if (error) throw new Error(error.message);
  return { success: true };
}

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
    supabase.from("proj_t_runs").select("*, proj_s_origin_addresses(*)").eq("id", runId).maybeSingle(),
    supabase
      .from("proj_t_run_projects")
      .select("*, proj_t_projects(*, proj_s_project_status(*), proj_s_building_categories(*), proj_s_permit_status(*), proj_s_welcome_call_status(*))")
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

// ─── OSRM Route Calculation ─────────────────────────────────

export async function calculateRoute(originLat, originLng, destLat, destLng) {
  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    throw new Error("Origin and destination coordinates are required.");
  }

  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const dLat = Number(destLat);
  const dLng = Number(destLng);

  if (!Number.isFinite(oLat) || !Number.isFinite(oLng) || !Number.isFinite(dLat) || !Number.isFinite(dLng)) {
    throw new Error("Invalid coordinates provided. Ensure all projects have valid latitude/longitude values.");
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&steps=false`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OSRM request failed (${response.status}): ${text || response.statusText}`);
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found between the selected points.");
  }

  const route = data.routes[0];
  return {
    distance: route.distance,          // meters
    duration: route.duration,          // seconds
    geometry: route.geometry,          // GeoJSON LineString
  };
}

export async function calculateMultiStopRoute(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    throw new Error("At least 2 coordinates are required (origin + at least one stop).");
  }

  // Filter out invalid coordinates and sanitize
  const validCoords = coordinates
    .map((c) => {
      const lat = c?.lat != null ? Number(c.lat) : NaN;
      const lng = c?.lng != null ? Number(c.lng) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const clampedLat = Math.max(-90, Math.min(90, lat));
      const clampedLng = Math.max(-180, Math.min(180, lng));
      return {
        lat: Math.round(clampedLat * 1000000) / 1000000,
        lng: Math.round(clampedLng * 1000000) / 1000000,
      };
    })
    .filter((c) => c !== null);

  if (validCoords.length < 2) {
    throw new Error("At least 2 valid coordinates are required.");
  }

  const coordsStr = validCoords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OSRM request failed (${response.status}): ${text || response.statusText}`);
  }
  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("No route found between the selected points.");
  }

  const route = data.routes[0];
  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
  };
}

// Calculate per-segment routes for a run
export async function calculateSegmentRoutes(coordinates) {
  if (!coordinates || coordinates.length < 2) {
    throw new Error("At least 2 coordinates are required.");
  }

  // Filter and sanitize coordinates
  const validCoords = coordinates
    .map((c) => {
      const lat = c?.lat != null ? Number(c.lat) : NaN;
      const lng = c?.lng != null ? Number(c.lng) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        lat: Math.round(Math.max(-90, Math.min(90, lat)) * 1000000) / 1000000,
        lng: Math.round(Math.max(-180, Math.min(180, lng)) * 1000000) / 1000000,
      };
    })
    .filter((c) => c !== null);

  if (validCoords.length < 2) {
    throw new Error("At least 2 valid coordinates are required.");
  }

  // Calculate each leg individually, catching errors per segment
  const segments = [];
  for (let i = 0; i < validCoords.length - 1; i++) {
    const from = validCoords[i];
    const to = validCoords[i + 1];
    const coordsStr = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false&steps=false`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const parsed = JSON.parse(text);
        console.error(`[OSRM] Segment ${i + 1} failed: ${from.lat},${from.lng} → ${to.lat},${to.lng} - ${parsed?.code || response.status}`);
        segments.push({
          fromIndex: i,
          toIndex: i + 1,
          error: parsed?.code || "NoRoute",
          distance: null,
          duration: null,
        });
        continue;
      }
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        console.error(`[OSRM] Segment ${i + 1}: No route found`);
        segments.push({
          fromIndex: i,
          toIndex: i + 1,
          error: "NoRoute",
          distance: null,
          duration: null,
        });
        continue;
      }

      const route = data.routes[0];
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        distance: route.distance,
        duration: route.duration,
      });
    } catch (err) {
      console.error(`[OSRM] Segment ${i + 1} unexpected error:`, err.message);
      segments.push({
        fromIndex: i,
        toIndex: i + 1,
        error: "RouteError",
        distance: null,
        duration: null,
      });
    }
  }

  // Calculate full route for overall geometry (only if all segments succeeded)
  const fullCoordsStr = validCoords.map((c) => `${c.lng},${c.lat}`).join(";");
  const fullUrl = `https://router.project-osrm.org/route/v1/driving/${fullCoordsStr}?overview=full&geometries=geojson&steps=false`;
  let fullRoute = null;
  try {
    const fullResponse = await fetch(fullUrl);
    if (fullResponse.ok) {
      const fullData = await fullResponse.json();
      fullRoute = fullData.routes?.[0] || null;
    }
  } catch (err) {
    console.error("[OSRM] Full route fetch failed:", err.message);
  }

  // Calculate totals from only valid segments
  const validSegments = segments.filter((s) => !s.error);

  return {
    segments,
    totalDistance: fullRoute?.distance || validSegments.reduce((sum, s) => sum + (s.distance || 0), 0),
    totalDuration: fullRoute?.duration || validSegments.reduce((sum, s) => sum + (s.duration || 0), 0),
    geometry: fullRoute?.geometry || null,
    hasPartialFailure: segments.some((s) => s.error),
  };
}
