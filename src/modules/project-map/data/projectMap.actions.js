"use server";

import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  assertFileAllowed,
  createSignedFileUpload,
  getSignedFileUrl,
  removeStoredFiles as removeStorageObjects,
} from "@/core/storage/files.service";
import { PROJECT_FILE_MAX_BYTES, PROJECT_FILE_TYPES, REPAIR_STATUS_KEYS, PROJECT_COMMENT_MAX_LENGTH, PROJECT_MAP_PAGES } from "./projectMap.data";
import { getCurrentSession } from "@/core/auth/session.service";
import { fetchAllRows, loadPageAccess, loadProjectStatusTabAccess, loadRuns as loadRunsForAccess } from "./projectMap.server";
import projectMapModule from "../index";
import {
  getDealerLink,
  linkRecordToDealer,
  listDealersForPicker,
  unlinkRecordFromDealer,
} from "@/core/dealer/dealerLinks";

// This app's key in psb_s_application (from the module definition in index.js);
// identifies its records in psb_m_dealerlink.
const DEALER_LINK_MODULE_KEY = projectMapModule.module_key;

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
  runStatuses: { table: "proj_s_run_status", pk: "status_id" },
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

// Shown when a read-only user tries to change something (see readOnly in loadProjectStatusTabAccess).
const READ_ONLY_MESSAGE = "Your Project Map roles are view only, so nothing can be changed.";

// Setup actions run only for roles that have the setup page's card (same rule as the page),
// and never for read-only users (they may open Setup but change nothing).
async function requireSetupAccess() {
  if (!(await loadPageAccess(PROJECT_MAP_PAGES.setup))) {
    throw new Error("Your role does not have access to Project Map Setup.");
  }
  const access = await loadProjectStatusTabAccess();
  if (access.readOnly) throw new Error(READ_ONLY_MESSAGE);
}

export async function createSetupRow(tableKey, row) {
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
  const { table, pk } = resolveSetupTable(tableKey);
  if (id == null) throw new Error(`${pk} is required.`);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq(pk, id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Setup Grid Hard Delete ──────────────────────────────────

// What still uses one row of each setup table. `from` is the row's column
// whose value is looked for. Runs use run statuses by NAME and projects and
// origins use states by CODE (no foreign key), so these are counted here;
// foreign-key users are also caught by the database when deleting.
const SETUP_ROW_USAGE = {
  projectStatuses: [
    { table: "proj_t_projects", column: "status_id", from: "status_id", label: "project" },
    // Status a project had before its run completed (foreign key). Checked here so
    // role mappings are never removed for a delete the database would refuse.
    { table: "proj_t_projects", column: "status_before_run_completion_id", from: "status_id", label: "project" },
  ],
  runStatuses: [{ table: "proj_t_runs", column: "status", from: "status_name", label: "run" }],
  originAddresses: [{ table: "proj_t_runs", column: "origin_id", from: "id", label: "run" }],
  states: [
    { table: "proj_t_projects", column: "state_code", from: "state_code", label: "project" },
    { table: "proj_s_origin_addresses", column: "state_code", from: "state_code", label: "origin address" },
  ],
  buildingCategories: [{ table: "proj_t_projects", column: "building_category_id", from: "id", label: "project" }],
  permitStatuses: [{ table: "proj_t_projects", column: "permit_status_id", from: "id", label: "project" }],
  welcomeCallStatuses: [{ table: "proj_t_projects", column: "welcome_call_status_id", from: "id", label: "project" }],
  paymentMethods: [{ table: "proj_t_projects", column: "payment_method_type", from: "id", label: "project" }],
};

/**
 * Permanently deletes one row of a setup grid. Refused when the row is a
 * status the code relies on by name, or when records still use it (the
 * message says how many); the Active switch is the way to retire those.
 */
export async function deleteSetupTableRow(tableKey, id) {
  await requireSetupAccess();
  const session = await getCurrentSession();
  if (!session?.userId) throw new Error("Your sign-in has expired. Please sign in again.");

  const { table, pk } = resolveSetupTable(tableKey);
  if (id == null || id === "") throw new Error(`${pk} is required.`);

  const supabase = getSupabaseAdmin();
  const { data: row, error: rowError } = await supabase.from(table).select("*").eq(pk, id).maybeSingle();
  if (rowError) throw new Error(rowError.message);
  if (!row) return { success: true };

  // Statuses with a system_key are the ones the app relies on (cascade,
  // defaults, repair flow). They can be renamed, but not deleted.
  if (row.system_key) {
    throw new Error(`"${row.status_name}" is used by the app itself and cannot be deleted. Switch it off instead.`);
  }

  for (const usage of SETUP_ROW_USAGE[tableKey] || []) {
    const value = row[usage.from];
    if (value == null || value === "") continue;
    const { count, error } = await supabase.from(usage.table).select("*", { count: "exact", head: true }).eq(usage.column, value);
    if (error) throw new Error(error.message);
    if (count > 0) {
      throw new Error(
        `This is used by ${count} ${usage.label}${count === 1 ? "" : "s"} and cannot be deleted. Change those first, or switch it off instead.`
      );
    }
  }

  // A status no longer exists for any role once it is deleted.
  if (tableKey === "projectStatuses") {
    const { error } = await supabase.from("proj_m_role_project_status").delete().eq("status_id", id);
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from(table).delete().eq(pk, id);
  if (error) {
    // 23503 = another record still points at this row
    if (error.code === "23503") throw new Error("This is still in use and cannot be deleted. Switch it off instead.");
    throw new Error(error.message);
  }
  return { success: true };
}

// ─── Project Status Specific Actions ─────────────────────────

export async function createProjectStatus(data) {
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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

  // New addresses go to the bottom of the list.
  const { data: maxOrder } = await supabase
    .from("proj_s_origin_addresses")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    display_order: (maxOrder?.display_order ?? 0) + 10,
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
  await requireSetupAccess();
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

// Saves the drag-and-drop order of the Origin Addresses setup grid.
export async function reorderOriginAddresses(updates) {
  await requireSetupAccess();
  return reorderLookupRows("originAddresses", updates);
}

export async function toggleOriginAddressActive(id, isActive) {
  await requireSetupAccess();
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

export async function deleteOriginAddress(id) {
  await requireSetupAccess();
  const supabase = getSupabaseAdmin();
  const originId = Number(id);
  if (!originId) throw new Error("id is required.");

  // Runs keep a link to their origin address, so one that is in use cannot be removed
  const { count: runCount, error: refError } = await supabase
    .from("proj_t_runs")
    .select("id", { count: "exact", head: true })
    .eq("origin_id", originId);

  if (refError) throw new Error(refError.message);
  if (runCount > 0) {
    throw new Error(
      `This origin address is used by ${runCount} run${runCount === 1 ? "" : "s"} and cannot be deleted. Switch it off instead.`
    );
  }

  const { error } = await supabase
    .from("proj_s_origin_addresses")
    .delete()
    .eq("id", originId);

  if (error) {
    // 23503 = another record still points at this address
    if (error.code === "23503") {
      throw new Error("This origin address is still in use and cannot be deleted. Switch it off instead.");
    }
    throw new Error(error.message);
  }
  return { success: true };
}

// ─── States Specific Actions ────────────────────────────────

export async function createState(data) {
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  runStatuses: { table: "proj_s_run_status", pk: "status_id", nameField: "status_name", descField: "status_description" },
  buildingCategories: { table: "proj_s_building_categories", pk: "id", nameField: "building_category_name", descField: "description" },
  permitStatuses: { table: "proj_s_permit_status", pk: "id", nameField: "status_name", descField: "description" },
  welcomeCallStatuses: { table: "proj_s_welcome_call_status", pk: "id", nameField: "status_name", descField: "description" },
  paymentMethods: { table: "proj_s_payment_method", pk: "id", nameField: "method_name", descField: "method_description" },
  // Origin addresses only use reorderLookupRows; they have their own create/update/delete.
  originAddresses: { table: "proj_s_origin_addresses", pk: "id", nameField: "origin_name", descField: "formatted_address" },
};

function resolveLookupTable(tableKey) {
  const entry = LOOKUP_TABLES[tableKey];
  if (!entry) throw new Error(`Unknown lookup table key: "${tableKey}"`);
  return entry;
}

export async function createLookupRow(tableKey, data) {
  await requireSetupAccess();
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
    // Only tables with a colour column send it (LookupTableGrid `hasColor`).
    ...(data.display_color !== undefined && { display_color: data.display_color ? String(data.display_color).trim() : null }),
    display_order: nextOrder,
    is_active: data.is_active === true || data.is_active === "true" || data.is_active === "1",
  };

  if (pk === "status_id") {
    const { data: maxId } = await supabase
      .from(table)
      .select(pk)
      .order(pk, { ascending: false })
      .limit(1)
      .maybeSingle();
    payload[pk] = (maxId?.[pk] ?? 0) + 1;
  }

  const { data: result, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return result;
}

export async function updateLookupRow(tableKey, id, data) {
  await requireSetupAccess();
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

  // Runs store their status by NAME, so a renamed run status must be renamed on the runs too.
  let previousRunStatusName = null;
  if (tableKey === "runStatuses" && data[nameField] !== undefined) {
    const { data: current } = await supabase.from(table).select(nameField).eq(pk, rowId).maybeSingle();
    previousRunStatusName = current?.[nameField] ?? null;
  }

  const payload = {};
  if (data[nameField] !== undefined) payload[nameField] = String(data[nameField]).trim();
  if (data[descField] !== undefined) payload[descField] = data[descField] ? String(data[descField]).trim() : null;
  if (data.display_color !== undefined) payload.display_color = data.display_color ? String(data.display_color).trim() : null;
  if (data.display_order !== undefined) payload.display_order = Number(data.display_order);
  if (data.is_active !== undefined) payload.is_active = data.is_active === true || data.is_active === "true" || data.is_active === "1";

  const { data: result, error } = await supabase.from(table).update(payload).eq(pk, rowId).select("*").single();
  if (error) throw new Error(error.message);

  if (previousRunStatusName && result[nameField] !== previousRunStatusName) {
    const { error: runsError } = await supabase
      .from("proj_t_runs")
      .update({ status: result[nameField] })
      .eq("status", previousRunStatusName);
    if (runsError) {
      throw new Error(`The status was renamed, but existing runs still say "${previousRunStatusName}": ${runsError.message}`);
    }
  }
  return result;
}

export async function toggleLookupRowActive(tableKey, id, isActive) {
  await requireSetupAccess();
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
  await requireSetupAccess();
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
  await requireSetupAccess();
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

// ─── Edit Access ────────────────────────────────────────────
//
// Business rule (agreed with the business owner, Oct 2026): every user with a
// Project Map role SEES every project and run, but may CHANGE one only while it
// is in a status ticked for one of their roles in Setup → Role Tabs
// (editableProjectStatusIds / editableRunStatusNames from
// loadProjectStatusTabAccess). Anything else is view-only for them.
// - Moving a project or run into any status is allowed (hand-off to the next
//   team), even one that is view-only for them afterwards.
// - New projects and runs can only be created in a status they can edit.
// - A run's details and stops follow the run's status.
// - A project counts as editable when its own status is editable OR the run it
//   is on is editable (stop edits made from inside a run). Deleting a project
//   needs its own status.
// - Comments are open to every Project Map user.
// The screens hide edit controls too; these checks are what enforce the rule.

// Run fields the screen works out by itself whenever a run is opened (also for
// viewers). They are bookkeeping, not edits, so they skip the status check.
const RUN_BOOKKEEPING_FIELDS = ["estimated_distance", "estimated_duration", "estimated_mileage", "estimated_subtotal"];

// Access of the signed-in user; throws when they may not use Project Map at all.
async function requireProjectMapAccess() {
  const access = await loadProjectStatusTabAccess();
  if (access.reason === "no-session") throw new Error("Your sign-in has expired. Please sign in again.");
  if (access.reason !== "ok") throw new Error("You do not have access to Project Map.");
  return access;
}

// A project with no status can be changed by anyone who may edit some project
// status, so it can be given one (same rule as canEditProjectStatusId).
function canEditProjectStatus(access, statusId) {
  const editableIds = access.editableProjectStatusIds || [];
  if (statusId == null) return editableIds.length > 0;
  return editableIds.includes(String(statusId));
}

function canEditRunStatus(access, statusName) {
  return Boolean(statusName) && (access.editableRunStatusNames || []).includes(statusName);
}

// Throws unless the user may change this run (judged by its current status).
async function requireRunEdit(supabase, access, runId) {
  const { data: run, error } = await supabase.from("proj_t_runs").select("id, status").eq("id", runId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!run) throw new Error("Run not found.");
  if (!canEditRunStatus(access, run.status)) {
    throw new Error(`Runs in "${run.status || "no status"}" are view-only for you.`);
  }
}

// Throws unless the user may change the run this stop (proj_t_run_projects row) is on.
async function requireRunStopEdit(supabase, access, runProjectId) {
  const { data: stop, error } = await supabase.from("proj_t_run_projects").select("run_id").eq("id", runProjectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!stop) throw new Error("Stop not found.");
  await requireRunEdit(supabase, access, stop.run_id);
}

// Throws unless the user may change this project.
// - Projects tab (no viaRunId): its own project status must be ticked.
// - Runs tab (viaRunId): it must be a stop on that run, and the run's status
//   must be ticked. Project status ticks do not count there.
async function requireProjectEdit(supabase, access, projectId, { viaRunId = null } = {}) {
  if (viaRunId != null) {
    const { data: stop, error: stopError } = await supabase
      .from("proj_t_run_projects")
      .select("run_id")
      .eq("project_id", projectId)
      .eq("run_id", viaRunId)
      .maybeSingle();
    if (stopError) throw new Error(stopError.message);
    if (!stop) throw new Error("That project is not on this run.");
    await requireRunEdit(supabase, access, viaRunId);
    return;
  }

  const { data: project, error } = await supabase
    .from("proj_t_projects")
    .select("id, status_id, proj_s_project_status!proj_t_projects_status_id_fkey(status_name)")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) throw new Error("Project not found.");
  if (canEditProjectStatus(access, project.status_id)) return;

  const statusName = project.proj_s_project_status?.status_name || "no status";
  throw new Error(`Projects in "${statusName}" are view-only for you.`);
}

// Files belong to one project or one run; changing them follows that owner.
// A project's files opened from a run (Runs tab) pass viaRunId, so the run decides.
async function requireFileOwnerEdit(supabase, access, ownerType, ownerId, viaRunId = null) {
  if (ownerType === "project") return requireProjectEdit(supabase, access, ownerId, { viaRunId });
  if (ownerType === "run") return requireRunEdit(supabase, access, ownerId);
  throw new Error(`Unknown file owner type: "${ownerType}"`);
}

// Comments & files: roles whose "Comments & Files" tick is on (every role but
// e.g. Viewer) may comment and add files on every project and run, also where
// they cannot edit. See canCommentAndAttach in loadProjectStatusTabAccess.
const COMMENT_ATTACH_MESSAGE = "Your Project Map roles can't add comments or files.";

function requireCommentAndAttach(access) {
  if (!access.canCommentAndAttach) throw new Error(COMMENT_ATTACH_MESSAGE);
}

// Adding a file: anyone who may comment and attach; otherwise the owner's edit rules decide.
async function requireFileAdd(supabase, access, ownerType, ownerId, viaRunId = null) {
  if (access.canCommentAndAttach) return;
  await requireFileOwnerEdit(supabase, access, ownerType, ownerId, viaRunId);
}

// Project fields a stop edit inside a run may change (run panel: date, invoice, price).
const STOP_PROJECT_FIELDS = ["install_start", "install_end", "invoice_number", "project_subtotal", "updated_by"];

// ─── Released stops ─────────────────────────────────────────
// When stops leave a run (stop removed, run cancelled or deleted), the user who
// did it may set those projects' statuses in the follow-up pop-up: a Runs-tab
// action, so run ticks decide, and the release already checked them. The
// release hands back a short-lived signed note listing exactly those projects;
// saveReleasedStopStatuses only accepts that note.
const RELEASE_NOTE_MINUTES = 30;

function releaseNoteSecret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing Supabase admin configuration");
  return `psb-project-map-release:${key}`;
}

function signReleaseNote(userId, projectIds) {
  if (!projectIds.length) return null;
  const body = Buffer.from(JSON.stringify({
    u: String(userId),
    p: projectIds.map(String),
    e: Date.now() + RELEASE_NOTE_MINUTES * 60000,
  })).toString("base64url");
  const signature = createHmac("sha256", releaseNoteSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

// The project ids a valid, unexpired note from this user allows.
function readReleaseNote(note, userId) {
  const expired = "This pop-up has expired. Close it and change the statuses from the projects instead.";
  const [body, signature] = String(note || "").split(".");
  if (!body || !signature) throw new Error(expired);
  const expected = Buffer.from(createHmac("sha256", releaseNoteSecret()).update(body).digest("base64url"));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error(expired);
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (data.u !== String(userId) || Date.now() > Number(data.e)) throw new Error(expired);
  return new Set(data.p);
}

// ─── Project CRUD ──────────────────────────────────────────

export async function createProject(project) {
  if (toIntOrNull(project?.status_id) === null) throw new Error("Project status is required.");
  const access = await requireProjectMapAccess();
  if (!canEditProjectStatus(access, project.status_id)) {
    throw new Error("You can only create projects in a status you can edit.");
  }

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
// `viaRunId`: the edit comes from that run (Runs tab: stop date / invoice / price).
// The run's status decides then, and only STOP_PROJECT_FIELDS may change.
export async function updateProject(projectId, updates, { viaRunId = null } = {}) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");
  // Only checked when the caller sends a status; other partial updates are untouched.
  if (Object.prototype.hasOwnProperty.call(updates || {}, "status_id") && toIntOrNull(updates.status_id) === null) {
    throw new Error("Project status is required.");
  }

  const supabase = getSupabaseAdmin();
  if (viaRunId != null && Object.keys(updates || {}).some((key) => !STOP_PROJECT_FIELDS.includes(key))) {
    throw new Error("Only the stop's date, invoice and price can be changed from a run.");
  }
  // Judged by the project's CURRENT status (Projects tab) or the run's (Runs tab),
  // so moving it into any status is allowed.
  await requireProjectEdit(supabase, await requireProjectMapAccess(), id, { viaRunId });
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
  const access = await requireProjectMapAccess();
  // Paid sheets are filled in from a run, so the run's status decides.
  const { data: stop, error: stopError } = await supabase.from("proj_t_run_projects").select("run_id").eq("project_id", id).maybeSingle();
  if (stopError) throw new Error(stopError.message);
  if (stop?.run_id != null) await requireRunEdit(supabase, access, stop.run_id);
  else await requireProjectEdit(supabase, access, id);
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
  await requireRunEdit(supabase, await requireProjectMapAccess(), runId);

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
  await requireProjectEdit(supabase, await requireProjectMapAccess(), id);

  // Remove the project's stored attachments (their rows cascade with the project)
  await removeStoredFiles(supabase, "project", id);

  // First, remove all run-project mappings (unassign the project from every run)
  const { error: mappingError } = await supabase.from("proj_t_run_projects").delete().eq("project_id", id);
  if (mappingError) throw new Error(mappingError.message);

  // Drop the project's dealer link. A leftover link is harmless (nothing can
  // load the project it points at), so a failure here must not block the delete.
  try {
    await unlinkRecordFromDealer({ moduleKey: DEALER_LINK_MODULE_KEY, recordId: id });
  } catch (linkError) {
    console.error("[deleteProject] Failed to remove dealer link:", linkError?.message);
  }

  // Then delete the project record
  const { error } = await supabase.from("proj_t_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Run CRUD ──────────────────────────────────────────────

// A run status is valid when it exists in proj_s_run_status (the setup table).
async function isKnownRunStatus(supabase, statusName) {
  if (!statusName) return false;
  const { data } = await supabase.from("proj_s_run_status").select("status_id").eq("status_name", statusName).maybeSingle();
  return Boolean(data);
}

// The run status a run falls back to when it is given an unknown one: the
// status with system_key "draft", whatever it is named now.
async function fallbackRunStatusName(supabase) {
  const { data } = await supabase.from("proj_s_run_status").select("status_name").eq("system_key", "draft").maybeSingle();
  if (!data?.status_name) throw new Error('The run status with system_key "draft" is missing from proj_s_run_status.');
  return data.status_name;
}

// Run status system_key → project status system_key for the stops on that run
// (updateRun and addProjectToRun). draft, scheduled and cancelled change nothing.
const projectStatusByRunStatus = {
  planned: "ready_for_install",
  in_progress: "currently_being_installed",
  completed: "fully_installed",
};
// Repairs follow their own flow so a repair never turns into an install.
const repairStatusByRunStatus = {
  planned: "for_repair",
  in_progress: "currently_being_repaired",
  completed: "repaired",
};

/**
 * Where a run status sends the project statuses of its stops, or null when
 * it changes nothing: { targetKey, repairKey, targetStatusId,
 * targetRepairStatusId, repairStatusIds }. Everything is found by system_key,
 * so renaming any of these statuses in setup changes nothing here.
 */
async function resolveCascadeTargets(supabase, runStatusName) {
  if (!runStatusName) return null;
  const { data: runStatus, error: runStatusError } = await supabase
    .from("proj_s_run_status")
    .select("system_key")
    .eq("status_name", runStatusName)
    .maybeSingle();
  if (runStatusError) throw runStatusError;
  const targetKey = projectStatusByRunStatus[runStatus?.system_key];
  if (!targetKey) return null;
  const repairKey = repairStatusByRunStatus[runStatus.system_key];

  const { data, error } = await supabase
    .from("proj_s_project_status")
    .select("status_id, system_key")
    .in("system_key", [targetKey, repairKey, ...REPAIR_STATUS_KEYS]);
  if (error) throw error;
  const idByKey = new Map((data || []).map((row) => [row.system_key, row.status_id]));
  return {
    targetKey,
    repairKey,
    targetStatusId: idByKey.get(targetKey) ?? null,
    targetRepairStatusId: idByKey.get(repairKey) ?? null,
    repairStatusIds: new Set(REPAIR_STATUS_KEYS.map((key) => idByKey.get(key)).filter((id) => id != null)),
  };
}

/**
 * Gives one project the project status its run's current status maps to,
 * so a stop added to a planned, in-progress or completed run matches the
 * others. Same rules as the cascade in updateRun. Failures are logged, never
 * thrown: the stop itself was added fine.
 */
async function matchProjectStatusToRun(supabase, runId, projectId) {
  try {
    const { data: run, error: runError } = await supabase.from("proj_t_runs").select("status").eq("id", runId).maybeSingle();
    if (runError) throw runError;
    const targets = await resolveCascadeTargets(supabase, run?.status);
    if (!targets) return;

    const { data: project, error: projectError } = await supabase.from("proj_t_projects").select("status_id").eq("id", projectId).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return;

    const nextStatusId = targets.repairStatusIds.has(project.status_id) ? targets.targetRepairStatusId : targets.targetStatusId;
    if (nextStatusId == null || nextStatusId === project.status_id) return;

    const { error } = await supabase
      .from("proj_t_projects")
      .update({ status_id: nextStatusId, updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) throw error;
  } catch (err) {
    console.error(`[matchProjectStatusToRun] project #${projectId} on run #${runId}:`, err?.message ?? err);
  }
}

export async function createRun(runData) {
  const supabase = getSupabaseAdmin();
  const access = await requireProjectMapAccess();
  const now = new Date().toISOString();

  const payload = {
    run_name: runData.run_name ? String(runData.run_name).trim() : null,
    origin_id: runData.origin_id || null,
    run_date: runData.run_date || null,
    // The first date this run was given; the Run Calendar shows "Rescheduled" when run_date moves away from it.
    original_run_date: runData.run_date || null,
    status: (await isKnownRunStatus(supabase, runData.status)) ? runData.status : await fallbackRunStatusName(supabase),
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

  if (!canEditRunStatus(access, payload.status)) {
    throw new Error("You can only create runs in a status you can edit.");
  }

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
 * Beyond the normal save, this is where run-status project synchronization lives.
 * When a run transitions into a mapped status, every project assigned to the run
 * is updated to the corresponding project status.
 *
 * Business rules:
 * - Planned → Ready for Install
 * - In Progress → Currently Being Installed
 * - Completed → Fully Installed
 * - Statuses are matched by system_key (see resolveCascadeTargets), so all of
 *   them can be renamed in setup. The names above are today's names.
 * - Repair projects (status system_key in REPAIR_STATUS_KEYS) follow their own flow so
 *   they stay recognisable as repairs: Planned → For Repair,
 *   In Progress → Currently Being Repaired, Completed → Repaired.
 * - The cascade fires only when the run enters a mapped status, not on every
 *   save of a run that is already in that status.
 * - Project statuses remain independently editable after the cascade. There is
 *   no stored previous status and no automatic restoration when a run reopens.
 * - The previous status must be read from proj_t_runs first because the caller
 *   only passes the new update values, and we need the old value to compare.
 * - Cascade failures are logged but never thrown: the run itself saved fine,
 *   so a failed project-status sync must not surface as a failed run save.
 * - Return value: the updated run row, plus `_cascadedStatusByProjectId`
 *   ({ [projectId]: statusId }) when a mapped transition updated projects.
 *   It is per project because repairs and non-repairs on the same run land
 *   on different statuses. That underscore-prefixed key is client metadata,
 *   never a database column.
 */
// A stop's arrival window on its run's date: 12:00 AM for both Arrival From
// and Arrival By, in the same "YYYY-MM-DDTHH:mm" form the date pickers save.
function arrivalOnRunDate(runDate) {
  return `${String(runDate).slice(0, 10)}T00:00`;
}

export async function updateRun(runId, updates) {
  const supabase = getSupabaseAdmin();
  // Judged by the run's CURRENT status, so moving it into any status is allowed.
  // Route-estimate saves are bookkeeping and skip the check.
  const access = await requireProjectMapAccess();
  const bookkeepingOnly = Object.keys(updates || {}).every((key) => RUN_BOOKKEEPING_FIELDS.includes(key));
  if (!bookkeepingOnly) await requireRunEdit(supabase, access, runId);
  const now = new Date().toISOString();

  // Read the run's current status before writing so the transition into
  // "Completed" can be detected (updates only carries the new values).
  const { data: existingRun, error: fetchError } = await supabase
    .from("proj_t_runs")
    .select("id, status, run_date, original_run_date")
    .eq("id", runId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const payload = { ...updates, updated_at: now };

  // Ensure run_name is properly handled
  if (payload.run_name !== undefined) {
    payload.run_name = payload.run_name ? String(payload.run_name).trim() : null;
  }

  if (payload.status && !(await isKnownRunStatus(supabase, payload.status))) {
    payload.status = await fallbackRunStatusName(supabase);
  }

  // The first date a run is given is kept as original_run_date (never moved
  // afterwards), so the Run Calendar can tell a rescheduled run.
  if (payload.run_date && !existingRun?.original_run_date) {
    payload.original_run_date = payload.run_date;
  }

  const { data, error } = await supabase.from("proj_t_runs").update(payload).eq("id", runId).select("*").single();
  if (error) throw new Error(error.message);

  // ─── Run date → stops' arrival dates ───
  // Business rule: when the run's date changes, every stop's arrival window
  // (install_start and install_end) is set to the run date at 12:00 AM, also
  // for stops that had no arrival date or had other times. Changing only the
  // origin leaves the stops as they are. Failures are logged, never thrown (the run saved fine).
  const newRunDate = payload.run_date ? String(payload.run_date).slice(0, 10) : null;
  const previousRunDate = existingRun?.run_date ? String(existingRun.run_date).slice(0, 10) : null;
  if (newRunDate && newRunDate !== previousRunDate) {
    try {
      const { data: stops, error: stopsError } = await supabase
        .from("proj_t_run_projects")
        .select("project_id, proj_t_projects(install_start, install_end)")
        .eq("run_id", runId);
      if (stopsError) throw stopsError;

      const arrival = arrivalOnRunDate(newRunDate);
      const isOnRunDate = (value) => String(value || "").slice(0, 16) === arrival;
      const projectIds = (stops || [])
        .filter((stop) => stop.proj_t_projects)
        .filter((stop) => !isOnRunDate(stop.proj_t_projects.install_start) || !isOnRunDate(stop.proj_t_projects.install_end))
        .map((stop) => stop.project_id);

      const results = await Promise.all(projectIds.map((projectId) =>
        supabase
          .from("proj_t_projects")
          .update({ install_start: arrival, install_end: arrival, updated_at: now })
          .eq("id", projectId)
      ));
      const failed = results.find((result) => result.error);
      if (failed) throw failed.error;
    } catch (arrivalErr) {
      console.error(
        `[updateRun] Failed to move the stops' arrival dates of run #${runId} to ${newRunDate}:`,
        arrivalErr?.message ?? arrivalErr
      );
    }
  }

  // ─── Transition cascade: run status → project status ───
  const previousStatus = existingRun?.status ?? null;
  const newStatus = payload.status !== undefined ? payload.status : previousStatus;

  let cascadeResult = null;

  // Fires only when the run enters a different status. Targets are found by
  // system_key (resolveCascadeTargets), so the statuses can be renamed.
  if (previousStatus !== newStatus) {
    try {
      const targets = await resolveCascadeTargets(supabase, newStatus);

      if (!targets) {
        // This run status changes no project statuses (draft, scheduled, cancelled, or one added in setup).
      } else if (targets.targetStatusId == null) {
        // A missing lookup row is not a run-save failure; log and skip the cascade.
        console.error(
          `[updateRun] project status with system_key '${targets.targetKey}' not found; skipping project status cascade for run #${runId}`
        );
      } else {
        // Collect every project assigned to this run.
        const { data: mappings, error: mappingsError } = await supabase
          .from("proj_t_run_projects")
          .select("project_id, proj_t_projects(status_id)")
          .eq("run_id", runId);

        if (mappingsError) throw mappingsError;

        const statusByProjectId = {};

        // Zero stops → nothing to update; not an error.
        for (const mapping of mappings || []) {
          const project = mapping.proj_t_projects;
          if (!project) continue;

          const isRepair = targets.repairStatusIds.has(project.status_id);
          const nextStatusId = isRepair ? targets.targetRepairStatusId : targets.targetStatusId;

          if (nextStatusId == null) {
            // Repair-flow row missing: leave the repair as it is rather than turn it into a normal install.
            console.error(
              `[updateRun] project status with system_key '${targets.repairKey}' not found; leaving repair project #${mapping.project_id} unchanged for run #${runId}`
            );
            continue;
          }

          statusByProjectId[mapping.project_id] = nextStatusId;
          if (project.status_id === nextStatusId) continue;

          const { error: cascadeError } = await supabase
            .from("proj_t_projects")
            .update({
              status_id: nextStatusId,
              updated_at: now,
            })
            .eq("id", mapping.project_id);

          if (cascadeError) throw cascadeError;
        }

        if (Object.keys(statusByProjectId).length > 0) {
          cascadeResult = { statusByProjectId };
        }
      }
    } catch (cascadeErr) {
      // Run save already succeeded; a failure here must not fail the response.
      // Log it so this silent partial failure stays visible in server logs.
      console.error(
        `[updateRun] Failed to cascade project statuses for run #${runId} entering '${newStatus}':`,
        cascadeErr?.message ?? cascadeErr
      );
    }
  }

  // Entering the run status with system_key "cancelled": return the stops so
  // the screen can ask which project status each should have now. Stops stay
  // on the run. A failure here is logged; the run itself saved fine.
  let releasedStops = null;
  if (previousStatus !== newStatus) {
    try {
      const { data: newRunStatus } = await supabase
        .from("proj_s_run_status")
        .select("system_key")
        .eq("status_name", newStatus)
        .maybeSingle();
      if (newRunStatus?.system_key === "cancelled") {
        releasedStops = await loadRunStopStatuses(supabase, runId);
      }
    } catch (err) {
      console.error(`[updateRun] Could not read the stops of cancelled run #${runId}:`, err?.message ?? err);
    }
  }

  // Attach cascade metadata only when it actually ran, so callers that don't
  // care (RunForm, PaidSheetForm, route-estimate saves) see the plain run row
  // exactly as before and nothing can be mistaken for a real column.
  return {
    ...data,
    ...(cascadeResult ? { _cascadedStatusByProjectId: cascadeResult.statusByProjectId } : {}),
    ...(releasedStops?.length
      ? { _releasedStops: releasedStops, _releaseToken: signReleaseNote(access.user?.userId, releasedStops.map((stop) => stop.projectId)) }
      : {}),
  };
}

// One run's stops with each project's current status, for the "choose a
// status" pop-up shown after the run is cancelled or deleted.
async function loadRunStopStatuses(supabase, runId) {
  const { data, error } = await supabase
    .from("proj_t_run_projects")
    .select("project_id, proj_t_projects(id, client_name, status_id)")
    .eq("run_id", runId)
    .order("stop_sequence");
  if (error) throw error;
  return (data || [])
    .filter((row) => row.proj_t_projects)
    .map((row) => ({
      projectId: row.project_id,
      clientName: row.proj_t_projects.client_name || "Untitled",
      statusId: row.proj_t_projects.status_id != null ? String(row.proj_t_projects.status_id) : "",
    }));
}

export async function deleteRun(runId) {
  const supabase = getSupabaseAdmin();
  const access = await requireProjectMapAccess();
  await requireRunEdit(supabase, access, runId);

  // Read the stops before they are removed, so the screen can ask which status each should have now.
  let releasedStops = [];
  try {
    releasedStops = await loadRunStopStatuses(supabase, runId);
  } catch (err) {
    console.error(`[deleteRun] Could not read the stops of run #${runId}:`, err?.message ?? err);
  }

  // Remove the run's stored attachments (their rows cascade with the run)
  await removeStoredFiles(supabase, "run", runId);

  // First, remove all run-project mappings (unassign projects)
  const { error: mappingError } = await supabase.from("proj_t_run_projects").delete().eq("run_id", runId);
  if (mappingError) throw new Error(mappingError.message);
  
  // Then delete the run record
  const { error } = await supabase.from("proj_t_runs").delete().eq("id", runId);
  if (error) throw new Error(error.message);
  
  return {
    success: true,
    releasedStops,
    releaseToken: signReleaseNote(access.user?.userId, releasedStops.map((stop) => stop.projectId)),
  };
}

export async function addProjectToRun(runId, projectId, stopSequence = 0) {
  const supabase = getSupabaseAdmin();
  await requireRunEdit(supabase, await requireProjectMapAccess(), runId);
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

  // A stop on a dated run gets the run date as its arrival window (12:00 AM for
  // both), the same rule as a run date change in updateRun. The screen asks the
  // user first. Failures are logged; the stop itself was added.
  try {
    const { data: run, error: runError } = await supabase.from("proj_t_runs").select("run_date").eq("id", runId).maybeSingle();
    if (runError) throw runError;
    if (run?.run_date) {
      const arrival = arrivalOnRunDate(run.run_date);
      const { error: arrivalError } = await supabase
        .from("proj_t_projects")
        .update({ install_start: arrival, install_end: arrival, updated_at: new Date().toISOString() })
        .eq("id", pid);
      if (arrivalError) throw arrivalError;
    }
  } catch (arrivalErr) {
    console.error(`[addProjectToRun] Failed to set project #${pid}'s arrival date to run #${runId}'s date:`, arrivalErr?.message ?? arrivalErr);
  }

  // A stop added to a run that is already under way gets the same project status as the others.
  await matchProjectStatusToRun(supabase, runId, pid);
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
  const access = await requireProjectMapAccess();
  await requireRunStopEdit(supabase, access, runProjectId);

  // Read the stop's project before the row is gone, for the "choose a status" pop-up.
  const { data: stop, error: stopError } = await supabase
    .from("proj_t_run_projects")
    .select("project_id, proj_t_projects(id, client_name, status_id)")
    .eq("id", runProjectId)
    .maybeSingle();
  if (stopError) throw new Error(stopError.message);

  const { error } = await supabase.from("proj_t_run_projects").delete().eq("id", runProjectId);
  if (error) throw new Error(error.message);

  const releasedStops = stop?.proj_t_projects
    ? [{
        projectId: stop.project_id,
        clientName: stop.proj_t_projects.client_name || "This project",
        statusId: stop.proj_t_projects.status_id != null ? String(stop.proj_t_projects.status_id) : "",
      }]
    : [];
  return {
    success: true,
    releasedStops,
    releaseToken: signReleaseNote(access.user?.userId, releasedStops.map((released) => released.projectId)),
  };
}

/**
 * Saves the statuses chosen in the "choose a status" pop-up after stops left
 * a run. Only projects listed in that release's signed note can be changed.
 * `choices`: [{ projectId, statusId }].
 */
export async function saveReleasedStopStatuses(releaseToken, choices) {
  const access = await requireProjectMapAccess();
  const allowed = readReleaseNote(releaseToken, access.user?.userId);
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  for (const choice of Array.isArray(choices) ? choices : []) {
    const projectId = toIntOrNull(choice?.projectId);
    const statusId = toIntOrNull(choice?.statusId);
    if (projectId === null || statusId === null) throw new Error("Project status is required.");
    if (!allowed.has(String(projectId))) throw new Error("That project was not part of this run.");
    const { error } = await supabase.from("proj_t_projects").update({ status_id: statusId, updated_at: now }).eq("id", projectId);
    if (error) throw new Error(error.message);
  }
  return { success: true };
}

export async function updateStopSequence(runProjectId, stopSequence) {
  const supabase = getSupabaseAdmin();
  await requireRunStopEdit(supabase, await requireProjectMapAccess(), runProjectId);
  const { data, error } = await supabase.from("proj_t_run_projects").update({ stop_sequence: Number(stopSequence) }).eq("id", runProjectId).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateStopNote(runProjectId, notes) {
  const supabase = getSupabaseAdmin();
  await requireRunStopEdit(supabase, await requireProjectMapAccess(), runProjectId);
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
  // Bookkeeping saved whenever anyone opens a run, viewers included: role only.
  await requireProjectMapAccess();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("proj_t_runs").update({ stops: count }).eq("id", runId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function loadRuns(options = {}) {
  // Same rule as the page load: only runs in statuses this user's Project Map roles may see.
  // Called from the browser, so access is always looked up here, never passed in.
  // Same loader and options as the pages (loadRuns in projectMap.server.js).
  return loadRunsForAccess(await loadProjectStatusTabAccess(), options || {});
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
  // Same rule as the page load (see ProjectMapPage): users who can see runs get
  // every project because the Runs tab needs them; everyone else gets only the
  // statuses their Project Map roles may see.
  const access = await loadProjectStatusTabAccess();
  if (access.reason !== "ok") return [];

  const supabase = getSupabaseAdmin();

  // Paged (fetchAllRows): the list can grow past one request's row limit.
  const buildQuery = () => {
    let query = supabase
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
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true });

    if (access.allowedRunStatusNames.length === 0) {
      // Projects with no status are shown to everyone so they can be given one.
      query = access.visibleProjectStatusIds.length > 0
        ? query.or(`status_id.is.null,status_id.in.(${access.visibleProjectStatusIds.join(",")})`)
        : query.is("status_id", null);
    }
    return query;
  };

  return fetchAllRows(buildQuery);
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
  await requireProjectMapAccess();
  const supabase = getSupabaseAdmin();

  // Paged (fetchAllRows): one row per stop, the fastest-growing table.
  return fetchAllRows(() => supabase
    .from("proj_t_run_projects")
    // Only the columns the app actually reads. The arrival columns
    // (estimated_arrival, estimated_departure, arrival_datetime) exist in the
    // table but are intentionally NOT fetched: nothing in the app reads them —
    // the UI shows the project's agreed arrival window
    // (install_start/install_end) instead. Add them back only if per-stop
    // route ETAs become a real feature (see rule.md §12).
    .select("id, run_id, project_id, stop_sequence, notes")
    .order("run_id", { ascending: true })
    .order("id", { ascending: true }));
}

export async function loadRunDetails(runId) {
  const supabase = getSupabaseAdmin();

  const [runResult, projectsResult] = await Promise.all([
    supabase.from("proj_t_runs").select("*, proj_s_origin_addresses(*)").eq("id", runId).maybeSingle(),
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

// ─── Route Calculation (Geoapify; OSRM demo server only as fallback) ───

const GEOAPIFY_ROUTING_URL = "https://api.geoapify.com/v1/routing";
const OSRM_DEMO_URL = "https://router.project-osrm.org/route/v1/driving";

// Geoapify returns one line per leg (MultiLineString); the map draws one LineString.
function toLineString(geometry) {
  if (!geometry) return null;
  if (geometry.type === "LineString") return geometry;
  if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
    const coordinates = [];
    geometry.coordinates.forEach((line, index) => {
      // Each leg starts where the previous one ended; skip the repeated point.
      coordinates.push(...(index === 0 ? line : line.slice(1)));
    });
    return { type: "LineString", coordinates };
  }
  return null;
}

/**
 * One driving route through `coords` ([{ lat, lng }], in order), as
 * { distance (m), duration (s), geometry (GeoJSON LineString), legs: [{ distance, duration }] }.
 * Uses Geoapify with the server-only key GEOAPIFY_SERVER_API_KEY. Falls back
 * to the public OSRM demo server (not meant for production) only when the key
 * is missing or Geoapify fails, so routes keep working.
 */
async function fetchDrivingRoute(coords) {
  const key = process.env.GEOAPIFY_SERVER_API_KEY;
  if (key) {
    try {
      const url = new URL(GEOAPIFY_ROUTING_URL);
      url.searchParams.set("waypoints", coords.map((c) => `${c.lat},${c.lng}`).join("|"));
      url.searchParams.set("mode", "drive");
      url.searchParams.set("apiKey", key);
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        const feature = data.features?.[0];
        const geometry = toLineString(feature?.geometry);
        if (feature?.properties && geometry) {
          return {
            distance: feature.properties.distance,
            duration: feature.properties.time,
            geometry,
            legs: (feature.properties.legs || []).map((leg) => ({ distance: leg.distance, duration: leg.time })),
          };
        }
        console.error("[Routing] Geoapify returned no usable route; using the OSRM demo server.");
      } else {
        console.error(`[Routing] Geoapify request failed (${response.status}); using the OSRM demo server.`);
      }
    } catch (err) {
      console.error("[Routing] Geoapify request failed; using the OSRM demo server:", err?.message);
    }
  } else {
    console.warn("[Routing] GEOAPIFY_SERVER_API_KEY is not set; using the OSRM demo server.");
  }

  const coordsStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const response = await fetch(`${OSRM_DEMO_URL}/${coordsStr}?overview=full&geometries=geojson&steps=false`);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Route request failed (${response.status}): ${text || response.statusText}`);
  }
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found between the selected points.");
  return {
    distance: route.distance,
    duration: route.duration,
    geometry: route.geometry,
    legs: (route.legs || []).map((leg) => ({ distance: leg.distance, duration: leg.duration })),
  };
}

/**
 * Everything one live-update sync pass needs (useProjectMapRealtime /
 * useProjectMapPolling → handleRemoteSync), in ONE server call. Browser →
 * server action calls run one at a time, so separate loadProjects, loadRuns,
 * loadAllRunProjects and loadRunDetails calls would queue behind each other;
 * here they run together on the server. Each loader keeps its own access rule.
 * `runDetails` is null when no run is open.
 */
export async function loadProjectMapSync(selectedRunId = null) {
  const [projects, runs, runProjects, runDetails] = await Promise.all([
    loadProjects(),
    loadRuns(),
    loadAllRunProjects(),
    selectedRunId != null ? loadRunDetails(selectedRunId) : Promise.resolve(null),
  ]);
  return { projects, runs, runProjects, runDetails };
}

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

  const route = await fetchDrivingRoute([{ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng }]);
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

  const route = await fetchDrivingRoute(validCoords);
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

  // One request for the whole multi-stop route: it returns per-leg
  // distance/duration (legs[]) AND the full route line, so there are no N
  // separate per-leg requests (fetchDrivingRoute: Geoapify, OSRM fallback).
  const legCount = validCoords.length - 1;

  let fullRoute = null;
  try {
    fullRoute = await fetchDrivingRoute(validCoords);
  } catch (err) {
    console.error("[Routing] Route fetch failed:", err.message);
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

// ─── File Attachments ───────────────────────────────────────
//
// Files live in the private Supabase Storage bucket below; proj_t_files keeps
// one row per file (owner, storage path, original name). The browser never
// sends file bytes through a server action — it asks for a one-time signed
// upload URL, uploads straight to Storage, then saves the row.
// The size limit (PROJECT_FILE_MAX_BYTES) and the allowed types
// (PROJECT_FILE_TYPES, PDF only) live in projectMap.data.js. All Storage
// calls come from
// the core file service (@/core/storage/files.service); this module only
// decides the bucket, the owner folder and its own proj_t_files rows.

const FILES_BUCKET = "file_bucket_uploading";

/**
 * Maps an owner type to its proj_t_files column and storage folder.
 * A file belongs to exactly one project or one run.
 */
function resolveFileOwner(ownerType, ownerId) {
  const id = toIntOrNull(ownerId);
  if (id === null) throw new Error("ownerId is required.");
  if (ownerType === "project") return { column: "project_id", folder: "projects", id };
  if (ownerType === "run") return { column: "run_id", folder: "runs", id };
  throw new Error(`Unknown file owner type: "${ownerType}"`);
}

/**
 * Best-effort removal of every stored file for a project or run. Called
 * before the owner row is deleted (the proj_t_files rows themselves go via
 * ON DELETE CASCADE). Never throws: a storage hiccup must not block deleting
 * the project/run, it only leaves an orphaned object in the bucket.
 */
async function removeStoredFiles(supabase, ownerType, ownerId) {
  try {
    const { column, id } = resolveFileOwner(ownerType, ownerId);
    const { data, error } = await supabase.from("proj_t_files").select("storage_path").eq(column, id);
    if (error) throw new Error(error.message);
    const paths = (data || []).map((row) => row.storage_path);
    if (paths.length === 0) return;
    await removeStorageObjects({ bucket: FILES_BUCKET, storagePaths: paths });
  } catch (err) {
    console.error("[ProjectMap] Failed to remove stored files:", err?.message);
  }
}

export async function loadFiles(ownerType, ownerId) {
  const { column, id } = resolveFileOwner(ownerType, ownerId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_t_files")
    .select("id, file_name, mime_type, file_size, created_by, created_at")
    .eq(column, id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Step 1 of an upload: validates the file and returns a one-time signed
 * upload target. `file` is plain metadata: { name, type, size }.
 */
export async function createFileUpload(ownerType, ownerId, file, { viaRunId = null } = {}) {
  const { folder, id } = resolveFileOwner(ownerType, ownerId);
  await requireFileAdd(getSupabaseAdmin(), await requireProjectMapAccess(), ownerType, id, viaRunId);
  return createSignedFileUpload({
    bucket: FILES_BUCKET,
    folder: `${folder}/${id}`,
    file,
    maxBytes: PROJECT_FILE_MAX_BYTES,
    allowedTypes: PROJECT_FILE_TYPES,
  });
}

/**
 * Step 2 of an upload: records the uploaded file. The path must be inside
 * the owner's own folder so a row can never point at another owner's file.
 */
export async function saveUploadedFile(ownerType, ownerId, storagePath, file, { viaRunId = null } = {}) {
  const { column, folder, id } = resolveFileOwner(ownerType, ownerId);
  assertFileAllowed(file, { maxBytes: PROJECT_FILE_MAX_BYTES, allowedTypes: PROJECT_FILE_TYPES });
  if (!String(storagePath || "").startsWith(`${folder}/${id}/`)) {
    throw new Error("Invalid storage path.");
  }

  const supabase = getSupabaseAdmin();
  const access = await requireProjectMapAccess();
  await requireFileAdd(supabase, access, ownerType, id, viaRunId);
  const { data, error } = await supabase
    .from("proj_t_files")
    .insert({
      [column]: id,
      storage_path: storagePath,
      file_name: String(file.name),
      mime_type: String(file.type || ""),
      file_size: toIntOrNull(file.size),
      // Who added it, so they can delete their own file later.
      created_by: toIntOrNull(access.user?.userId),
    })
    .select("id, file_name, mime_type, file_size, created_by, created_at")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Returns a short-lived link to open or download one file. */
export async function getFileUrl(fileId) {
  const id = toIntOrNull(fileId);
  if (id === null) throw new Error("fileId is required.");

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase.from("proj_t_files").select("storage_path").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("File not found.");

  return getSignedFileUrl({ bucket: FILES_BUCKET, storagePath: row.storage_path });
}

/** Permanently deletes one file: the stored object first, then its row. */
export async function deleteFile(fileId, { viaRunId = null } = {}) {
  const id = toIntOrNull(fileId);
  if (id === null) throw new Error("fileId is required.");

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase.from("proj_t_files").select("storage_path, project_id, run_id, created_by").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return { success: true };

  const access = await requireProjectMapAccess();
  // Your own file, while you may still comment and attach: yours to delete.
  // Any other file (also older files with no owner) follows the edit rules.
  const isOwnFile = access.canCommentAndAttach && row.created_by != null && Number(row.created_by) === Number(access.user?.userId);
  if (!isOwnFile) {
    if (row.project_id != null) await requireFileOwnerEdit(supabase, access, "project", row.project_id, viaRunId);
    else if (row.run_id != null) await requireFileOwnerEdit(supabase, access, "run", row.run_id);
  }

  await removeStorageObjects({ bucket: FILES_BUCKET, storagePaths: [row.storage_path] });

  const { error: deleteError } = await supabase.from("proj_t_files").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
  return { success: true };
}

/**
 * Counts attached files for several projects in one query, for screens
 * that list many projects at once (e.g. a run's stops). Returns
 * { [projectId]: count }; projects with no files are simply absent.
 */
export async function loadProjectFileCounts(projectIds) {
  const ids = Array.from(
    new Set((Array.isArray(projectIds) ? projectIds : []).map(toIntOrNull).filter((id) => id !== null))
  );
  if (ids.length === 0) return {};

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("proj_t_files").select("project_id").in("project_id", ids);
  if (error) throw new Error(error.message);

  const counts = {};
  (data || []).forEach((row) => {
    counts[row.project_id] = (counts[row.project_id] || 0) + 1;
  });
  return counts;
}


// ─── Project Comments ───────────────────────────────────────
//
// A simple team comment thread per project (proj_t_project_comments).
// Anyone with access to the module can read and post; a user can delete
// only their own comments. There is no editing.

const COMMENT_COLUMNS = "id, project_id, comment_text, author_name, created_by, created_at";

/**
 * Who is posting. The signed session is the source of truth whenever it
 * exists (dev/prod), so the browser cannot post as someone else. Local
 * development has no session (SSO is disabled there), so it falls back to
 * the identity the page sends: { userId, name }.
 */
async function resolveCommentAuthor(fallbackAuthor) {
  const session = await getCurrentSession();
  if (session?.userId) {
    return {
      userId: toIntOrNull(session.userId),
      name: session.fullName || session.email || "Unknown",
    };
  }
  return {
    userId: toIntOrNull(fallbackAuthor?.userId),
    name: hasValue(fallbackAuthor?.name) ? String(fallbackAuthor.name).trim() : "Unknown",
  };
}

export async function loadProjectComments(projectId) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_t_project_comments")
    .select(COMMENT_COLUMNS)
    .eq("project_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addProjectComment(projectId, text, fallbackAuthor = null) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");

  const commentText = String(text ?? "").trim();
  if (!commentText) throw new Error("Comment cannot be empty.");
  if (commentText.length > PROJECT_COMMENT_MAX_LENGTH) {
    throw new Error(`Comment must be ${PROJECT_COMMENT_MAX_LENGTH} characters or fewer.`);
  }

  // Comments are open to every role whose "Comments & Files" tick is on (all but e.g. Viewer), whatever their status access.
  const access = await requireProjectMapAccess();
  requireCommentAndAttach(access);
  const author = await resolveCommentAuthor(fallbackAuthor);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("proj_t_project_comments")
    .insert({
      project_id: id,
      comment_text: commentText,
      author_name: author.name,
      created_by: author.userId,
    })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Deletes one comment. Only its author may delete it. */
export async function deleteProjectComment(commentId, fallbackAuthor = null) {
  const id = toIntOrNull(commentId);
  if (id === null) throw new Error("commentId is required.");

  const supabase = getSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("proj_t_project_comments")
    .select("id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return { success: true };

  const access = await requireProjectMapAccess();
  requireCommentAndAttach(access);
  const author = await resolveCommentAuthor(fallbackAuthor);
  if (row.created_by == null || author.userId == null || Number(row.created_by) !== author.userId) {
    throw new Error("You can only delete your own comments.");
  }

  const { error: deleteError } = await supabase.from("proj_t_project_comments").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
  return { success: true };
}

// ─── Dealer link (shared table psb_m_dealerlink, via core) ─────────────

/**
 * Data for the project form's "Linked Dealer" picker: the active dealers from
 * Dealer Master and, when editing, the dealer this project is linked to.
 * A linked dealer that has since been deactivated is still listed (marked),
 * so the picker shows the real value.
 */
export async function loadProjectDealerOptions(projectId) {
  const id = toIntOrNull(projectId);
  const [dealers, link] = await Promise.all([
    listDealersForPicker(),
    id === null ? Promise.resolve(null) : getDealerLink({ moduleKey: DEALER_LINK_MODULE_KEY, recordId: id }),
  ]);

  const options = dealers.map((dealer) => ({
    value: String(dealer.dealer_id),
    label: dealer.dealer_code ? `${dealer.dealer_name} (${dealer.dealer_code})` : dealer.dealer_name,
    name: dealer.dealer_name,
  }));

  if (link && !options.some((option) => option.value === String(link.dealer_id))) {
    options.unshift({ value: String(link.dealer_id), label: `${link.dealer_name} (inactive)`, name: link.dealer_name });
  }

  return { dealers: options, linkedDealerId: link ? String(link.dealer_id) : "" };
}

/**
 * Sets or clears a project's linked dealer. Only the link is stored; the
 * project's own `dealer` text column is not touched here.
 */
export async function setProjectDealerLink(projectId, dealerId) {
  const id = toIntOrNull(projectId);
  if (id === null) throw new Error("projectId is required.");
  await requireProjectEdit(getSupabaseAdmin(), await requireProjectMapAccess(), id);

  if (!hasValue(dealerId)) {
    await unlinkRecordFromDealer({ moduleKey: DEALER_LINK_MODULE_KEY, recordId: id });
    return { linked: false };
  }

  const session = await getCurrentSession();
  const dealer = await linkRecordToDealer({
    moduleKey: DEALER_LINK_MODULE_KEY,
    recordId: id,
    dealerId,
    userId: toIntOrNull(session?.userId),
  });
  return { linked: true, dealer };
}

// ─── Role Status Tabs ────────────────────────────────────────

// Writes only the difference between what a role has and what it should have.
async function replaceRoleStatusRows(table, roleId, statusIds) {
  const session = await getCurrentSession();
  if (!session?.userId) throw new Error("Your sign-in has expired. Please sign in again.");

  const targetRoleId = Number(roleId);
  if (!targetRoleId) throw new Error("Role is required.");
  const wanted = [...new Set((Array.isArray(statusIds) ? statusIds : []).map(Number).filter(Boolean))];

  const supabase = getSupabaseAdmin();
  const { data: current, error: loadError } = await supabase
    .from(table)
    .select("status_id")
    .eq("role_id", targetRoleId);
  if (loadError) throw new Error(loadError.message);

  const existing = (current || []).map((row) => Number(row.status_id));
  const toAdd = wanted.filter((id) => !existing.includes(id));
  const toRemove = existing.filter((id) => !wanted.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase.from(table).delete().eq("role_id", targetRoleId).in("status_id", toRemove);
    if (error) throw new Error(error.message);
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from(table)
      .insert(toAdd.map((statusId) => ({ role_id: targetRoleId, status_id: statusId })));
    if (error) throw new Error(error.message);
  }

  return { success: true, count: wanted.length };
}

/**
 * Sets which project status tabs a Project Map role gives. `statusIds` is the
 * full list the role should end up with.
 */
export async function saveRoleStatusTabs(roleId, statusIds) {
  await requireSetupAccess();
  return replaceRoleStatusRows("proj_m_role_project_status", roleId, statusIds);
}

/**
 * Sets which run statuses a Project Map role gives. `statusIds` is the full
 * list of proj_s_run_status ids the role should end up with.
 */
export async function saveRoleRunStatuses(roleId, statusIds) {
  await requireSetupAccess();
  return replaceRoleStatusRows("proj_m_role_run_status", roleId, statusIds);
}

/**
 * Sets a Project Map role's options (proj_m_role_options). Today one option:
 * canCommentAndAttach, whether the role may comment and add files on every
 * project and run. A role with no row may (the default).
 */
export async function saveRoleOptions(roleId, { canCommentAndAttach = true } = {}) {
  await requireSetupAccess();
  const targetRoleId = Number(roleId);
  if (!targetRoleId) throw new Error("Role is required.");

  const { error } = await getSupabaseAdmin()
    .from("proj_m_role_options")
    .upsert(
      { role_id: targetRoleId, can_comment_and_attach: canCommentAndAttach !== false, updated_at: new Date().toISOString() },
      { onConflict: "role_id" }
    );
  if (error) throw new Error(error.message);
  return { success: true };
}
