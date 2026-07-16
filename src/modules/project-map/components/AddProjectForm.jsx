"use client";

import { useState, useEffect } from "react";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { createProject, updateProject } from "../data/projectMap.actions";
import LocationSearch from "./LocationSearch";

export default function AddProjectForm({ show, mode, project, statuses = [], onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    status_id: "",
    dealer: "",
    project_subtotal: "",
    order_received_date: "",
    scheduled_project_date: "",
    install_date: "",
    formatted_address: "",
    address_line_1: "",
    city: "",
    state: "",
    state_code: "",
    postal_code: "",
    country: "",
    address_latitude: null,
    address_longitude: null,
    site_latitude: null,
    site_longitude: null,
    location_source: "geoapify",
    location_confirmed: false,
  });

  // Separate query state for LocationSearch so it can be controlled independently
  const [locationQuery, setLocationQuery] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (project) {
      // Build display address from available fields if formatted_address is missing
      const address = project.formatted_address || [project.address_line_1, project.city, project.state, project.postal_code, project.country].filter(Boolean).join(", ") || "";
      setForm({
        client_name: project.client_name || "",
        status_id: project.status_id ? String(project.status_id) : "",
        dealer: project.dealer || "",
        project_subtotal: project.project_subtotal != null ? String(project.project_subtotal) : "",
        order_received_date: project.order_received_date || "",
        scheduled_project_date: project.scheduled_project_date || "",
        install_date: project.install_date || "",
        formatted_address: address,
        address_line_1: project.address_line_1 || "",
        city: project.city || "",
        state: project.state || "",
        state_code: project.state_code || "",
        postal_code: project.postal_code || "",
        country: project.country || "",
        address_latitude: project.address_latitude,
        address_longitude: project.address_longitude,
        site_latitude: project.site_latitude,
        site_longitude: project.site_longitude,
        location_source: project.location_source || "geoapify",
        location_confirmed: Boolean(project.location_confirmed),
      });
      setLocationQuery(address);
    } else {
      setForm({
        client_name: "",
        status_id: "",
        dealer: "",
        project_subtotal: "",
        order_received_date: "",
        scheduled_project_date: "",
        install_date: "",
        formatted_address: "",
        address_line_1: "",
        city: "",
        state: "",
        state_code: "",
        postal_code: "",
        country: "",
        address_latitude: null,
        address_longitude: null,
        site_latitude: null,
        site_longitude: null,
        location_source: "geoapify",
        location_confirmed: false,
      });
      setLocationQuery("");
    }
  }, [project, show]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleLocationSelect = (location) => {
    setForm((f) => ({
      ...f,
      formatted_address: location.formatted_address || f.formatted_address,
      address_line_1: location.address_line_1 || f.address_line_1,
      city: location.city || f.city,
      state: location.state || f.state,
      state_code: location.state_code || f.state_code,
      postal_code: location.postcode || f.postal_code,
      country: location.country || f.country,
      address_latitude: location.latitude ?? f.address_latitude,
      address_longitude: location.longitude ?? f.address_longitude,
      location_source: "geoapify",
      location_confirmed: true,
    }));
  };

  const handleSave = async () => {
    if (!form.client_name.trim()) {
      toastError("Client name is required.", "Validation");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        status_id: form.status_id ? Number(form.status_id) : null,
        project_subtotal: form.project_subtotal !== "" ? Number(form.project_subtotal) : null,
      };

      if (mode === "edit" && project?.id) {
        await updateProject(project.id, payload);
        toastSuccess("Project updated.", "Project Map");
      } else {
        await createProject(payload);
        toastSuccess("Project created.", "Project Map");
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      toastError(err?.message || "Error saving project.", "Project Map");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "edit" ? "Edit Project" : "Add Project";

  return (
    <Modal show={show} onHide={onClose} title={title} size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>
            Client Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            value={form.client_name}
            onChange={(e) => handleChange("client_name", e.target.value)}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            placeholder="Enter client name"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Status</label>
            <select
              value={form.status_id}
              onChange={(e) => handleChange("status_id", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px", background: "#fff" }}
            >
              <option value="">Select status...</option>
              {statuses.map((s) => (
                <option key={s.status_id} value={String(s.status_id)}>{s.status_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Dealer</label>
            <input
              type="text"
              value={form.dealer}
              onChange={(e) => handleChange("dealer", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
              placeholder="Dealer name"
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Location</label>
          <LocationSearch
            onSelect={handleLocationSelect}
            selectedLocation={form}
            query={locationQuery}
            onQueryChange={setLocationQuery}
          />
        </div>

        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Project Subtotal ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.project_subtotal}
            onChange={(e) => handleChange("project_subtotal", e.target.value)}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            placeholder="0.00"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Order Received</label>
            <input
              type="date"
              value={form.order_received_date}
              onChange={(e) => handleChange("order_received_date", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Scheduled Date</label>
            <input
              type="date"
              value={form.scheduled_project_date}
              onChange={(e) => handleChange("scheduled_project_date", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Install Date</label>
            <input
              type="date"
              value={form.install_date}
              onChange={(e) => handleChange("install_date", e.target.value)}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={handleSave}>
            {mode === "edit" ? "Save Changes" : "Create Project"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}