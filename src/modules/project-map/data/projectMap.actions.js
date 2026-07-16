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
    order_received_date: toDateOrNull(project.order_received_date),
    scheduled_project_date: toDateOrNull(project.scheduled_project_date),
    install_date: toDateOrNull(project.install_date),
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
    order_received_date: toDateOrNull(updates.order_received_date),
    scheduled_project_date: toDateOrNull(updates.scheduled_project_date),
    install_date: toDateOrNull(updates.install_date),
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

// ─── OSRM Route Calculation ─────────────────────────────────

export async function calculateRoute(originLat, originLng, destLat, destLng) {
  if (originLat == null || originLng == null || destLat == null || destLng == null) {
    throw new Error("Origin and destination coordinates are required.");
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=false`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`OSRM request failed: ${response.statusText}`);

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
