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
  paymentMethods: { table: "proj_s_payment_method", pk: "id" },
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

// ─── Project Status Specific Actions ─────────────────────────

export async function createProjectStatus(data) {
  const supabase = getSupabaseAdmin();

  // Validate required fields
  if (!data.status_name || !String(data.status_name).trim()) {
    throw new Error("Status name is required.");
  }

  // Check for duplicate name
  const { data: existing } = await supabase
    .from("proj_s_project_status")
    .select("status_id")
    .eq("status_name", String(data.status_name).trim())
    .maybeSingle();

  if (existing) {
    throw new Error("A project status with this name already exists.");
  }

  // Get the highest display_order to auto-increment
  const { data: maxOrder } = await supabase
    .from("proj_s_project_status")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrder?.display_order ?? 0) + 1;

  const payload = {
    status_name: String(data.status_name).trim(),
    status_description: data.status_description ? String(data.status_description).trim() : null,
    display_color: data.display_color ? String(data.display_color).trim() : null,
    display_order: nextOrder,
    is_active: data.is_active === true || data.is_active === "true" || data.is_active === "1",
  };

  const { data: result, error } = await supabase
    .from("proj_s_project_status")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function updateProjectStatus(statusId, data) {
  const supabase = getSupabaseAdmin();
  const id = Number(statusId);
  if (!id) throw new Error("status_id is required.");

  // Validate required fields
  if (data.status_name !== undefined && !String(data.status_name).trim()) {
    throw new Error("Status name is required.");
  }

  // Check for duplicate name (exclude current record)
  if (data.status_name !== undefined) {
    const trimmedName = String(data.status_name).trim();
    const { data: existing } = await supabase
      .from("proj_s_project_status")
      .select("status_id")
      .eq("status_name", trimmedName)
      .neq("status_id", id)
      .maybeSingle();

    if (existing) {
      throw new Error("A project status with this name already exists.");
    }
  }

  const payload = {};
  if (data.status_name !== undefined) payload.status_name = String(data.status_name).trim();
  if (data.status_description !== undefined) payload.status_description = data.status_description ? String(data.status_description).trim() : null;
  if (data.display_color !== undefined) payload.display_color = data.display_color ? String(data.display_color).trim() : null;
  if (data.display_order !== undefined) payload.display_order = Number(data.display_order);
  if (data.is_active !== undefined) payload.is_active = data.is_active === true || data.is_active === "true" || data.is_active === "1";

  const { data: result, error } = await supabase
    .from("proj_s_project_status")
    .update(payload)
    .eq("status_id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function toggleProjectStatusActive(statusId, isActive) {
  const supabase = getSupabaseAdmin();
  const id = Number(statusId);
  if (!id) throw new Error("status_id is required.");

  const active = isActive === true || isActive === "true" || isActive === "1";

  const { data, error } = await supabase
    .from("proj_s_project_status")
    .update({ is_active: active })
    .eq("status_id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function reorderProjectStatuses(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("At least one update is required.");
  }

  const supabase = getSupabaseAdmin();

  // Validate all entries have status_id and display_order
  for (const u of updates) {
    if (u.status_id == null || u.display_order == null) {
      throw new Error("Each update must have status_id and display_order.");
    }
  }

  // Batch update using a transaction-like approach
  const errors = [];
  for (const u of updates) {
    const { error } = await supabase
      .from("proj_s_project_status")
      .update({ display_order: Number(u.display_order) })
      .eq("status_id", Number(u.status_id));

    if (error) errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(`Failed to update display order: ${errors.join(", ")}`);
  }

  return { success: true };
}

export async function softDeleteProjectStatus(statusId) {
  const supabase = getSupabaseAdmin();
  const id = Number(statusId);
  if (!id) throw new Error("status_id is required.");

  // Check if the status is referenced by any projects
  const { data: referencedProjects, error: refError } = await supabase
    .from("proj_t_projects")
    .select("id")
    .eq("status_id", id)
    .limit(1);

  if (refError) throw new Error(refError.message);

  // Soft delete by setting is_active = false
  const { data, error } = await supabase
    .from("proj_s_project_status")
    .update({ is_active: false })
    .eq("status_id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Origin Address Specific Actions ─────────────────────────

export async function createOriginAddress(data) {
  const supabase = getSupabaseAdmin();

  // Validate required fields
  if (!data.origin_name || !String(data.origin_name).trim()) {
    throw new Error("Origin name is required.");
  }
  if (!data.formatted_address || !String(data.formatted_address).trim()) {
    throw new Error("Formatted address is required.");
  }

  // Check for duplicate origin_name
  const trimmedName = String(data.origin_name).trim();
  const { data: existing } = await supabase
    .from("proj_s_origin_addresses")
    .select("id")
    .eq("origin_name", trimmedName)
    .maybeSingle();

  if (existing) {
    throw new Error("An origin address with this name already exists.");
  }

  const payload = {
    origin_name: trimmedName,
    formatted_address: String(data.formatted_address).trim(),
    address_line_1: data.address_line_1 ? String(data.address_line_1).trim() : null,
    city: data.city ? String(data.city).trim() : null,
    state: data.state ? String(data.state).trim() : null,
    state_code: data.state_code ? String(data.state_code).trim() : null,
    postal_code: data.postal_code ? String(data.postal_code).trim() : null,
    country: data.country ? String(data.country).trim() : null,
    latitude: data.latitude != null ? Number(data.latitude) : null,
    longitude: data.longitude != null ? Number(data.longitude) : null,
    is_active: data.is_active === true || data.is_active === "true" || data.is_active === "1",
  };

  const { data: result, error } = await supabase
    .from("proj_s_origin_addresses")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function updateOriginAddress(id, data) {
  const supabase = getSupabaseAdmin();
  const originId = Number(id);
  if (!originId) throw new Error("id is required.");

  // Validate required fields
  if (data.origin_name !== undefined && !String(data.origin_name).trim()) {
    throw new Error("Origin name is required.");
  }
  if (data.formatted_address !== undefined && !String(data.formatted_address).trim()) {
    throw new Error("Formatted address is required.");
  }

  // Check for duplicate origin_name (exclude current record)
  if (data.origin_name !== undefined) {
    const trimmedName = String(data.origin_name).trim();
    const { data: existing } = await supabase
      .from("proj_s_origin_addresses")
      .select("id")
      .eq("origin_name", trimmedName)
      .neq("id", originId)
      .maybeSingle();

    if (existing) {
      throw new Error("An origin address with this name already exists.");
    }
  }

  const payload = {};
  if (data.origin_name !== undefined) payload.origin_name = String(data.origin_name).trim();
  if (data.formatted_address !== undefined) payload.formatted_address = String(data.formatted_address).trim();
  if (data.address_line_1 !== undefined) payload.address_line_1 = data.address_line_1 ? String(data.address_line_1).trim() : null;
  if (data.city !== undefined) payload.city = data.city ? String(data.city).trim() : null;
  if (data.state !== undefined) payload.state = data.state ? String(data.state).trim() : null;
  if (data.state_code !== undefined) payload.state_code = data.state_code ? String(data.state_code).trim() : null;
  if (data.postal_code !== undefined) payload.postal_code = data.postal_code ? String(data.postal_code).trim() : null;
  if (data.country !== undefined) payload.country = data.country ? String(data.country).trim() : null;
  if (data.latitude !== undefined) payload.latitude = data.latitude != null ? Number(data.latitude) : null;
  if (data.longitude !== undefined) payload.longitude = data.longitude != null ? Number(data.longitude) : null;
  if (data.is_active !== undefined) payload.is_active = data.is_active === true || data.is_active === "true" || data.is_active === "1";

  const { data: result, error } = await supabase
    .from("proj_s_origin_addresses")
    .update(payload)
    .eq("id", originId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function toggleOriginAddressActive(id, isActive) {
  const supabase = getSupabaseAdmin();
  const originId = Number(id);
  if (!originId) throw new Error("id is required.");

  const active = isActive === true || isActive === "true" || isActive === "1";

  const { data, error } = await supabase
    .from("proj_s_origin_addresses")
    .update({ is_active: active })
    .eq("id", originId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function softDeleteOriginAddress(id) {
  const supabase = getSupabaseAdmin();
  const originId = Number(id);
  if (!originId) throw new Error("id is required.");

  // Check if the origin address is referenced by any runs
  const { data: referencedRuns, error: refError } = await supabase
    .from("proj_t_runs")
    .select("id")
    .eq("origin_id", originId)
    .limit(1);

  if (refError) throw new Error(refError.message);

  // Soft delete by setting is_active = false
  const { data, error } = await supabase
    .from("proj_s_origin_addresses")
    .update({ is_active: false })
    .eq("id", originId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── States Specific Actions ────────────────────────────────

export async function createState(data) {
  const supabase = getSupabaseAdmin();

  // Validate required fields
  if (!data.state_name || !String(data.state_name).trim()) {
    throw new Error("State name is required.");
  }
  if (!data.state_code || !String(data.state_code).trim()) {
    throw new Error("State code is required.");
  }

  // Check for duplicate name
  const trimmedName = String(data.state_name).trim();
  const { data: existingName } = await supabase
    .from("proj_s_states")
    .select("id")
    .eq("state_name", trimmedName)
    .maybeSingle();
  if (existingName) {
    throw new Error("A state with this name already exists.");
  }

  // Check for duplicate code
  const trimmedCode = String(data.state_code).trim().toUpperCase();
  const { data: existingCode } = await supabase
    .from("proj_s_states")
    .select("id")
    .eq("state_code", trimmedCode)
    .maybeSingle();
  if (existingCode) {
    throw new Error("A state with this code already exists.");
  }

  // Get the highest display_order to auto-increment
  const { data: maxOrder } = await supabase
    .from("proj_s_states")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = data.display_order != null ? Number(data.display_order) : (maxOrder?.display_order ?? 0) + 1;

  const payload = {
    state_name: trimmedName,
    state_code: trimmedCode,
    display_color: data.display_color ? String(data.display_color).trim() : null,
    display_order: nextOrder,
    is_active: data.is_active === true || data.is_active === "true" || data.is_active === "1",
  };

  const { data: result, error } = await supabase
    .from("proj_s_states")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function updateState(id, data) {
  const supabase = getSupabaseAdmin();
  const stateId = Number(id);
  if (!stateId) throw new Error("id is required.");

  // Validate required fields
  if (data.state_name !== undefined && !String(data.state_name).trim()) {
    throw new Error("State name is required.");
  }
  if (data.state_code !== undefined && !String(data.state_code).trim()) {
    throw new Error("State code is required.");
  }

  // Check for duplicate name (exclude current record)
  if (data.state_name !== undefined) {
    const trimmedName = String(data.state_name).trim();
    const { data: existing } = await supabase
      .from("proj_s_states")
      .select("id")
      .eq("state_name", trimmedName)
      .neq("id", stateId)
      .maybeSingle();
    if (existing) {
      throw new Error("A state with this name already exists.");
    }
  }

  // Check for duplicate code (exclude current record)
  if (data.state_code !== undefined) {
    const trimmedCode = String(data.state_code).trim().toUpperCase();
    const { data: existing } = await supabase
      .from("proj_s_states")
      .select("id")
      .eq("state_code", trimmedCode)
      .neq("id", stateId)
      .maybeSingle();
    if (existing) {
      throw new Error("A state with this code already exists.");
    }
  }

  const payload = {};
  if (data.state_name !== undefined) payload.state_name = String(data.state_name).trim();
  if (data.state_code !== undefined) payload.state_code = String(data.state_code).trim().toUpperCase();
  if (data.display_color !== undefined) payload.display_color = data.display_color ? String(data.display_color).trim() : null;
  if (data.display_order !== undefined) payload.display_order = Number(data.display_order);
  if (data.is_active !== undefined) payload.is_active = data.is_active === true || data.is_active === "true" || data.is_active === "1";

  const { data: result, error } = await supabase
    .from("proj_s_states")
    .update(payload)
    .eq("id", stateId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function toggleStateActive(id, isActive) {
  const supabase = getSupabaseAdmin();
  const stateId = Number(id);
  if (!stateId) throw new Error("id is required.");

  const active = isActive === true || isActive === "true" || isActive === "1";

  const { data, error } = await supabase
    .from("proj_s_states")
    .update({ is_active: active })
    .eq("id", stateId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function reorderStates(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("At least one update is required.");
  }

  const supabase = getSupabaseAdmin();

  for (const u of updates) {
    if (u.id == null || u.display_order == null) {
      throw new Error("Each update must have id and display_order.");
    }
  }

  const errors = [];
  for (const u of updates) {
    const { error } = await supabase
      .from("proj_s_states")
      .update({ display_order: Number(u.display_order) })
      .eq("id", Number(u.id));

    if (error) errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(`Failed to update display order: ${errors.join(", ")}`);
  }

  return { success: true };
}

export async function softDeleteState(id) {
  const supabase = getSupabaseAdmin();
  const stateId = Number(id);
  if (!stateId) throw new Error("id is required.");

  // Check if the state is referenced by any projects or origin addresses
  const [projectsRef, originsRef] = await Promise.all([
    supabase.from("proj_t_projects").select("id").eq("state_code", stateId).limit(1),
    supabase.from("proj_s_origin_addresses").select("id").eq("state_code", stateId).limit(1),
  ]);

  if (projectsRef.error) throw new Error(projectsRef.error.message);
  if (originsRef.error) throw new Error(originsRef.error.message);

  // Soft delete by setting is_active = false
  const { data, error } = await supabase
    .from("proj_s_states")
    .update({ is_active: false })
    .eq("id", stateId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Generic Lookup Table Actions ────────────────────────────

const LOOKUP_TABLES = {
  buildingCategories: { table: "proj_s_building_categories", pk: "id", nameField: "building_category_name", descField: "description" },
  permitStatuses: { table: "proj_s_permit_status", pk: "id", nameField: "status_name", descField: "description" },
  welcomeCallStatuses: { table: "proj_s_welcome_call_status", pk: "id", nameField: "status_name", descField: "description" },
};

function resolveLookupTable(tableKey) {
  const entry = LOOKUP_TABLES[tableKey];
  if (!entry) throw new Error(`Unknown lookup table key: "${tableKey}"`);
  return entry;
}

export async function createLookupRow(tableKey, data) {
  const { table, pk, nameField, descField } = resolveLookupTable(tableKey);
  const supabase = getSupabaseAdmin();

  const name = data[nameField] ? String(data[nameField]).trim() : "";
  if (!name) {
    throw new Error("Name is required.");
  }
  if (name.length > 100) {
    throw new Error("Name must be 100 characters or less.");
  }

  // Check for duplicate name
  const { data: existing } = await supabase
    .from(table)
    .select(pk)
    .eq(nameField, name)
    .maybeSingle();

  if (existing) {
    throw new Error("A record with this name already exists.");
  }

  // Get the highest display_order to auto-increment
  const { data: maxOrder } = await supabase
    .from(table)
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxOrder?.display_order ?? 0) + 1;

  const payload = {
    [nameField]: name,
    [descField]: data[descField] ? String(data[descField]).trim() : null,
    display_order: nextOrder,
    is_active: data.is_active === true || data.is_active === "true" || data.is_active === "1",
  };

  const { data: result, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return result;
}

export async function updateLookupRow(tableKey, id, data) {
  const { table, pk, nameField, descField } = resolveLookupTable(tableKey);
  const supabase = getSupabaseAdmin();
  const rowId = Number(id);
  if (!rowId) throw new Error(`${pk} is required.`);

  if (data[nameField] !== undefined) {
    const name = String(data[nameField]).trim();
    if (!name) throw new Error("Name is required.");

    // Check for duplicate name (exclude current record)
    const { data: existing } = await supabase
      .from(table)
      .select(pk)
      .eq(nameField, name)
      .neq(pk, rowId)
      .maybeSingle();

    if (existing) {
      throw new Error("A record with this name already exists.");
    }
  }

  const payload = {};
  if (data[nameField] !== undefined) payload[nameField] = String(data[nameField]).trim();
  if (data[descField] !== undefined) payload[descField] = data[descField] ? String(data[descField]).trim() : null;
  if (data.display_order !== undefined) payload.display_order = Number(data.display_order);
  if (data.is_active !== undefined) payload.is_active = data.is_active === true || data.is_active === "true" || data.is_active === "1";

  const { data: result, error } = await supabase.from(table).update(payload).eq(pk, rowId).select("*").single();
  if (error) throw new Error(error.message);
  return result;
}

export async function toggleLookupRowActive(tableKey, id, isActive) {
  const { table, pk } = resolveLookupTable(tableKey);
  const supabase = getSupabaseAdmin();
  const rowId = Number(id);
  if (!rowId) throw new Error(`${pk} is required.`);

  const active = isActive === true || isActive === "true" || isActive === "1";

  const { data, error } = await supabase.from(table).update({ is_active: active }).eq(pk, rowId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function reorderLookupRows(tableKey, updates) {
  const { table, pk } = resolveLookupTable(tableKey);
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("At least one update is required.");
  }

  const supabase = getSupabaseAdmin();
  for (const u of updates) {
    if (u[pk] == null || u.display_order == null) {
      throw new Error(`Each update must have ${pk} and display_order.`);
    }
  }

  const errors = [];
  for (const u of updates) {
    const { error } = await supabase
      .from(table)
      .update({ display_order: Number(u.display_order) })
      .eq(pk, Number(u[pk]));

    if (error) errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(`Failed to update display order: ${errors.join(", ")}`);
  }
  return { success: true };
}

export async function softDeleteLookupRow(tableKey, id) {
  const { table, pk } = resolveLookupTable(tableKey);
  const supabase = getSupabaseAdmin();
  const rowId = Number(id);
  if (!rowId) throw new Error(`${pk} is required.`);

  const { data, error } = await supabase.from(table).update({ is_active: false }).eq(pk, rowId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
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
    project_notes: hasValue(project.project_notes) ? String(project.project_notes).trim() : null,
    dimension: hasValue(project.dimension) ? String(project.dimension).trim() : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("proj_t_projects").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * updateProject — saves changes to an existing project as a PARTIAL update.
 *
 * Callers only send the fields they are editing, and only those fields are
 * written to the database (Supabase leaves columns missing from the payload
 * untouched). For example, the run timeline's Invoice editor sends just
 * { invoice_number } — if the other columns were included anyway, they would
 * be written as null and silently erase the project's arrival dates, order
 * date, and other data. That was a real production bug, so every field NOT
 * passed in `updates` must stay out of the payload.
 *
 * Fields that ARE passed still go through their normalizer below so empty
 * strings / blank inputs are stored as null exactly as before.
 */
export async function updateProject(projectId, updates) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Per-field normalizers — applied only when the caller passed that field.
  // Mirrors the insert (createProject) payload rules: blank values become
  // null, numeric ids are truncated ints, invoice numbers are trimmed.
  const normalizers = {
    building_category_id: toIntOrNull,
    permit_status_id: toIntOrNull,
    welcome_call_status_id: toIntOrNull,
    invoice_number: (v) => (hasValue(v) ? String(v).trim() : null),
    order_received_at: (v) => v || null,
    scheduled_project_start: (v) => v || null,
    scheduled_project_end: (v) => v || null,
    install_start: (v) => v || null,
    install_end: (v) => v || null,
    updated_by: toIntOrNull,
  };

  // Build the payload strictly from the fields present in `updates`.
  const payload = { updated_at: now };
  for (const [key, value] of Object.entries(updates)) {
    payload[key] = normalizers[key] ? normalizers[key](value) : value;
  }

  const { data, error } = await supabase.from("proj_t_projects").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);

  if (Object.prototype.hasOwnProperty.call(updates, "project_notes")) {
    const { error: syncError } = await supabase
      .from("proj_t_run_projects")
      .update({ notes: data.project_notes ?? null })
      .eq("project_id", id);
    if (syncError) {
      console.error("[updateProject] Failed to sync project_notes to proj_t_run_projects.notes:", syncError.message);
    }
  }

  return data;
}

export async function updateProjectPaymentInfo(projectId, updates) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const payload = {
    payment_method_type: toIntOrNull(updates.payment_method_type),
    payment_method_number: hasValue(updates.payment_method_number) ? String(updates.payment_method_number).trim() : null,
    paid_sheet_notes: hasValue(updates.paid_sheet_notes) ? String(updates.paid_sheet_notes).trim() : null,
    paid_sheet_done: Boolean(updates.paid_sheet_done),
    updated_at: now,
  };

  const { data, error } = await supabase.from("proj_t_projects").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);

  return data;
}

/**
 * loadPaidSheet — fetches the run-level paid-sheet header row for a run.
 *
 * proj_t_paid_sheet is one row per run (run_id is UNIQUE) and is created
 * lazily on first save, so a run with no saved paid sheet yet has no
 * matching row. Returns null in that case so the caller can seed blank
 * defaults rather than erroring.
 */
export async function loadPaidSheet(runId) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("proj_t_paid_sheet")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

/**
 * upsertPaidSheet — creates or updates the run-level paid-sheet header
 * row for a run.
 *
 * Because proj_t_paid_sheet holds one row per run (run_id UNIQUE) and the
 * row may or may not exist yet, an upsert keyed on run_id is the correct
 * operation: first save inserts, later saves update the same row.
 */
export async function upsertPaidSheet(runId, fields) {
  const supabase = getSupabaseAdmin();

  const payload = {
    run_id: runId,
    phone_number: fields.phone_number || null,
    dot_number: fields.dot_number || null,
    state_route: fields.state_route || null,
    extra_notes: fields.extra_notes || null,
    is_paid: Boolean(fields.is_paid),
    paid_date: fields.paid_date || null,
    paid_reference: fields.paid_reference || null,
    installer_signature_date: fields.installer_signature_date || null,
    psb_representative_name: fields.psb_representative_name || null,
    psb_representative_date: fields.psb_representative_date || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("proj_t_paid_sheet")
    .upsert(payload, { onConflict: "run_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * deleteProject — permanently removes a project and all its run assignments.
 *
 * A project can be linked to a run through proj_t_run_projects. That join
 * table's foreign key to proj_t_projects has NO "on delete cascade", so the
 * mapping rows must be removed first or Postgres blocks the delete with a
 * foreign-key violation (SQLSTATE 23503) and the server action surfaces as
 * an HTTP 500. Deleting in this order mirrors deleteRun().
 *
 * Business rule: deleting a project is permanent and cannot be undone.
 */
export async function deleteProject(projectId) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const supabase = getSupabaseAdmin();

  // First, remove all run-project mappings (unassign the project from every run)
  const { error: mappingError } = await supabase.from("proj_t_run_projects").delete().eq("project_id", id);
  if (mappingError) throw new Error(mappingError.message);

  // Then delete the project record
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
    run_name: runData.run_name ? String(runData.run_name).trim() : null,
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

  const { data: inserted, error: insertError } = await supabase.from("proj_t_runs").insert(payload).select("*").single();
  if (insertError) throw new Error(insertError.message);

  const runNumber = inserted?.run_number;
  const runCode = runNumber == null ? null : `PSBR-${String(runNumber).padStart(6, "0")}`;

  if (runCode) {
    const { data: existing, error: existsError } = await supabase
      .from("proj_t_runs")
      .select("id")
      .eq("run_code", runCode)
      .maybeSingle();

    if (existsError) throw new Error(existsError.message);
    if (existing) {
      throw new Error(
        `Generated run code ${runCode} already exists — this indicates a run_number uniqueness issue and should be reported.`
      );
    }
  }

  const { data, error } = await supabase
    .from("proj_t_runs")
    .update({ run_code: runCode })
    .eq("id", inserted.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * updateRun — updates a single run row.
 *
 * Beyond the normal save, this is where the "run completed" cascade lives:
 * the first time a run transitions INTO the "Completed" status, every project
 * assigned to the run (via proj_t_run_projects) is set to the "Fully Installed"
 * project status — regardless of what status they had before.
 *
 * Business rules:
 * - The cascade is deliberately ONE-WAY. Reopening a run to another status
 *   later does NOT revert the projects back to their prior statuses.
 * - The cascade fires only on the actual transition into "Completed"
 *   (previousStatus !== "Completed" && newStatus === "Completed"), not on every
 *   save of a run that is already "Completed".
 * - The previous status must be read from proj_t_runs first because the caller
 *   only passes the new update values, and we need the old value to compare.
 * - Cascade failures are logged but never thrown: the run itself saved fine,
 *   so a failed project-status sync must not surface as a failed run save.
 * - Return value: the updated run row, plus `_cascadedProjectIds` and
 *   `_cascadedStatusId` when THIS save's transition into "Completed" moved
 *   projects to "Fully Installed". Those underscore-prefixed keys (never real
 *   proj_t_runs columns) let the client patch its local state without a
 *   refetch; they are absent whenever nothing cascaded.
 */
export async function updateRun(runId, updates) {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Read the run's current status before writing so the transition into
  // "Completed" can be detected (updates only carries the new values).
  const { data: existingRun, error: fetchError } = await supabase
    .from("proj_t_runs")
    .select("id, status")
    .eq("id", runId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const payload = { ...updates, updated_at: now };

  // Ensure run_name is properly handled
  if (payload.run_name !== undefined) {
    payload.run_name = payload.run_name ? String(payload.run_name).trim() : null;
  }

  if (payload.status && !RUN_STATUSES.includes(payload.status)) {
    payload.status = "Draft";
  }

  const { data, error } = await supabase.from("proj_t_runs").update(payload).eq("id", runId).select("*").single();
  if (error) throw new Error(error.message);

  // ─── One-way cascade: run → "Completed" sets every stop to "Fully Installed" ───
  const previousStatus = existingRun?.status ?? null;
  const newStatus = payload.status !== undefined ? payload.status : previousStatus;

  // When the cascade actually moves projects, remembers which ones (and to what
  // status) so the caller can patch local state without a refetch.
  let cascadeResult = null;

  if (previousStatus !== "Completed" && newStatus === "Completed") {
    try {
      // Resolve the "Fully Installed" status_id dynamically by name. The id is a
      // serial PK (currently 9) and setup rows are user-editable, so hardcoding
      // it would silently corrupt the cascade if the row is ever re-created.
      const { data: fullyInstalled, error: statusError } = await supabase
        .from("proj_s_project_status")
        .select("status_id")
        .eq("status_name", "Fully Installed")
        .maybeSingle();

      if (statusError) throw statusError;

      if (!fullyInstalled) {
        // A missing lookup row is not a run-save failure; log and skip the cascade.
        console.error(
          "[updateRun] 'Fully Installed' status row not found in proj_s_project_status; skipping project status cascade for run #" + runId
        );
      } else {
        // Collect every project assigned to this run.
        const { data: mappings, error: mappingsError } = await supabase
          .from("proj_t_run_projects")
          .select("project_id")
          .eq("run_id", runId);

        if (mappingsError) throw mappingsError;

        const projectIds = (mappings || []).map((m) => m.project_id);

        // Zero stops → nothing to update; not an error.
        if (projectIds.length > 0) {
          const { error: cascadeError } = await supabase
            .from("proj_t_projects")
            .update({ status_id: fullyInstalled.status_id, updated_at: now })
            .in("id", projectIds);

          if (cascadeError) throw cascadeError;

          cascadeResult = { projectIds, statusId: fullyInstalled.status_id };
        }
      }
    } catch (cascadeErr) {
      // Run save already succeeded; a failure here must not fail the response.
      // Log it so this silent partial failure stays visible in server logs.
      console.error(
        "[updateRun] Failed to cascade project status to 'Fully Installed' for run #" + runId + ":",
        cascadeErr?.message ?? cascadeErr
      );
    }
  }

  // Attach cascade metadata only when it actually ran, so callers that don't
  // care (RunForm, PaidSheetForm, route-estimate saves) see the plain run row
  // exactly as before and nothing can be mistaken for a real column.
  return cascadeResult
    ? { ...data, _cascadedProjectIds: cascadeResult.projectIds, _cascadedStatusId: cascadeResult.statusId }
    : data;
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

  const { data: projectData, error: projectFetchError } = await supabase
    .from("proj_t_projects")
    .select("project_notes")
    .eq("id", pid)
    .single();
  if (projectFetchError) throw new Error(projectFetchError.message);

  const payload = {
    run_id: runId,
    project_id: pid,
    stop_sequence: Number(stopSequence) || 0,
    notes: projectData?.project_notes ?? null,
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
  const normalizedNotes = notes || null;

  const { data, error } = await supabase
    .from("proj_t_run_projects")
    .update({ notes: normalizedNotes })
    .eq("id", runProjectId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (data?.project_id) {
    const { error: syncError } = await supabase
      .from("proj_t_projects")
      .update({ project_notes: normalizedNotes, updated_at: new Date().toISOString() })
      .eq("id", data.project_id);
    if (syncError) {
      console.error("[updateStopNote] Failed to sync note to proj_t_projects.project_notes:", syncError.message);
    }
  }

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
    .select("*, proj_s_origin_addresses(*), proj_t_run_projects(id, proj_t_projects(payment_method_type, project_subtotal))")
    .order("run_date", { ascending: false });

  if (error) throw new Error(error.message);

  const runs = data || [];
  const runIds = runs.map((r) => r.id).filter(Boolean);

  // Fetch each run's Paid Sheet header (proj_t_paid_sheet) in a single batched
  // query rather than one query per row. proj_t_paid_sheet holds one row per
  // run (run_id UNIQUE), so a run with no saved Paid Sheet yet has no entry
  // here — dot_number/state_route stay null until the sheet is saved.
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

/**
 * Loads the full project list for client-side refreshes.
 *
 * Why this exists: the page's initial project list is loaded by the server
 * component (loadProjectMapProjects in projectMap.server.js), so until now
 * there was no way to re-fetch it from the browser. Live multi-user sync
 * needs one — when another user adds or edits a project, the realtime hook
 * triggers a refresh that must produce exactly the same data shape the page
 * was initialized with (same columns, same nested status lookup, same
 * ordering) or downstream components would mis-render.
 *
 * IMPORTANT: keep the select below in sync with loadProjectMapProjects().
 */
export async function loadProjects() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
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
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Builds a cheap "data version" signature for the three tables that drive the
 * Project Map UI. Used by useProjectMapPolling as the fallback sync mechanism
 * when Supabase Realtime is unavailable (e.g. CHANNEL_ERROR while RLS
 * policies are pending — see realtime-handoff.md).
 *
 * Why these fields:
 * - proj_t_projects / proj_t_runs: row count + latest updated_at catches
 *   inserts, updates, and deletes.
 * - proj_t_run_projects: has NO updated_at column, so row count + max(id)
 *   catches inserts (new max id), deletes (count drop), and reassignments.
 *
 * All six queries are head-only/limit-1 aggregates — negligible DB load even
 * with several users polling every 30 seconds.
 */
export async function getProjectMapVersion() {
  const supabase = getSupabaseAdmin();

  const [pCount, pLatest, rCount, rLatest, rpCount, rpMax] = await Promise.all([
    supabase.from("proj_t_projects").select("id", { count: "exact", head: true }),
    supabase.from("proj_t_projects").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("proj_t_runs").select("id", { count: "exact", head: true }),
    supabase.from("proj_t_runs").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("proj_t_run_projects").select("id", { count: "exact", head: true }),
    supabase.from("proj_t_run_projects").select("id").order("id", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (pCount.error) throw new Error(pCount.error.message);
  if (pLatest.error) throw new Error(pLatest.error.message);
  if (rCount.error) throw new Error(rCount.error.message);
  if (rLatest.error) throw new Error(rLatest.error.message);
  if (rpCount.error) throw new Error(rpCount.error.message);
  if (rpMax.error) throw new Error(rpMax.error.message);

  return [
    pCount.count, pLatest.data?.updated_at ?? "none",
    rCount.count, rLatest.data?.updated_at ?? "none",
    rpCount.count, rpMax.data?.id ?? "none",
  ].join("|");
}

export async function loadAllRunProjects() {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("proj_t_run_projects")
    // Only the columns the app actually reads. The arrival columns
    // (estimated_arrival, estimated_departure, arrival_datetime) exist in the
    // table but are intentionally NOT fetched: nothing in the app reads them —
    // the UI shows the project's agreed arrival window
    // (install_start/install_end) instead. Add them back only if per-stop
    // route ETAs become a real feature (see rule.md §12).
    .select("id, run_id, project_id, stop_sequence, notes")
    .order("run_id", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadRunDetails(runId) {
  const supabase = getSupabaseAdmin();

  const [runResult, projectsResult] = await Promise.all([
    supabase.from("proj_t_runs").select("*, proj_s_origin_addresses(*)").eq("id", runId).maybeSingle(),
    supabase
      .from("proj_t_run_projects")
      .select("*, proj_t_projects(id, client_name, formatted_address, address_line_1, city, state, state_code, postal_code, country, address_latitude, address_longitude, site_latitude, site_longitude, dealer, building_category_id, permit_status_id, welcome_call_status_id, invoice_number, project_subtotal, order_received_at, scheduled_project_start, scheduled_project_end, install_start, install_end, project_notes, dimension, payment_method_type, payment_method_number, paid_sheet_notes, paid_sheet_done, proj_s_project_status(*), proj_s_building_categories(*), proj_s_permit_status(*), proj_s_welcome_call_status(*), proj_s_payment_method(id, method_name, method_description))")
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

  // Single OSRM request for the whole multi-stop route. OSRM returns
  // per-leg distance/duration via routes[0].legs[] AND the full route
  // geometry in the same response — no need for N separate per-leg
  // requests plus a final full-route request (that was the previous
  // approach, and it's why the line took longer to appear as stop
  // count grew: N+1 sequential round-trips instead of 1).
  const legCount = validCoords.length - 1;
  const fullCoordsStr = validCoords.map((c) => `${c.lng},${c.lat}`).join(";");
  const fullUrl = `https://router.project-osrm.org/route/v1/driving/${fullCoordsStr}?overview=full&geometries=geojson&steps=false`;

  let fullRoute = null;
  try {
    const response = await fetch(fullUrl);
    if (response.ok) {
      const data = await response.json();
      fullRoute = data.routes?.[0] || null;
    } else {
      console.error(`[OSRM] Route request failed: ${response.status}`);
    }
  } catch (err) {
    console.error("[OSRM] Route fetch failed:", err.message);
  }

  if (!fullRoute) {
    // Entire request failed — mark every leg as errored so callers can
    // still render "—" placeholders instead of crashing.
    const segments = Array.from({ length: legCount }, (_, i) => ({
      fromIndex: i,
      toIndex: i + 1,
      error: "RouteError",
      distance: null,
      duration: null,
    }));
    return {
      segments,
      totalDistance: 0,
      totalDuration: 0,
      geometry: null,
      hasPartialFailure: true,
    };
  }

  const legs = Array.isArray(fullRoute.legs) ? fullRoute.legs : [];
  const segments = Array.from({ length: legCount }, (_, i) => {
    const leg = legs[i];
    if (!leg) {
      return { fromIndex: i, toIndex: i + 1, error: "NoRoute", distance: null, duration: null };
    }
    return { fromIndex: i, toIndex: i + 1, distance: leg.distance, duration: leg.duration };
  });

  return {
    segments,
    totalDistance: fullRoute.distance,
    totalDuration: fullRoute.duration,
    geometry: fullRoute.geometry || null,
    hasPartialFailure: segments.some((s) => s.error),
  };
}
