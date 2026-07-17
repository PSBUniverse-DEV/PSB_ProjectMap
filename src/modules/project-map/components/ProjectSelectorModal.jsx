"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, Button, toastError, toastSuccess } from "@/shared/components/ui";
import { addProjectToRun } from "../data/projectMap.actions";

export default function ProjectSelectorModal({ show, runId, allProjects = [], existingProjectIds = [], onClose, onSaved }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!show) return;
    setSelectedIds([]);
    setSearch("");
  }, [show]);

  const availableProjects = useMemo(() => {
    return allProjects.filter((p) => !existingProjectIds.includes(p.id));
  }, [allProjects, existingProjectIds]);

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return availableProjects;
    const q = search.toLowerCase();
    return availableProjects.filter((p) => {
      return (
        (p.client_name && p.client_name.toLowerCase().includes(q)) ||
        (p.formatted_address && p.formatted_address.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.state && p.state.toLowerCase().includes(q))
      );
    });
  }, [availableProjects, search]);

  const toggleProject = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.length === 0) {
      toastError("Please select at least one project.", "Validation");
      return;
    }

    setBusy(true);
    try {
      // Get current max stop sequence
      const currentMax = existingProjectIds.length > 0 ? existingProjectIds.length : 0;

      // Add projects one by one with sequential stop numbers
      for (let i = 0; i < selectedIds.length; i++) {
        await addProjectToRun(runId, selectedIds[i], currentMax + i);
      }

      toastSuccess(`${selectedIds.length} project(s) added to run.`, "Runs");
      onSaved?.();
      onClose?.();
    } catch (err) {
      toastError(err?.message || "Failed to add projects.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} title="Add Projects to Run" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>
            Search Projects
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, address, city, state..."
            style={{
              width: "100%",
              border: "1px solid #e2e8f0",
              borderRadius: "3px",
              padding: "4px 8px",
              fontSize: "12px",
            }}
          />
        </div>

        <div style={{
          border: "1px solid #e2e8f0",
          borderRadius: "3px",
          maxHeight: "400px",
          overflow: "auto",
          background: "#fff",
        }}>
          {filteredProjects.length === 0 ? (
            <p style={{ padding: "20px", fontSize: "12px", color: "#94a3b8", textAlign: "center" }}>
              {search ? "No projects match your search." : "No available projects to add."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredProjects.map((project) => {
                const isSelected = selectedIds.includes(project.id);
                return (
                  <div
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: isSelected ? "#f0f9ff" : "#fff",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProject(project.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "12px", color: "#1e293b", marginBottom: "1px" }}>
                          {project.client_name || "Untitled"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {project.city && project.state ? `${project.city}, ${project.state}` : project.formatted_address || "No address"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#64748b" }}>
          <span>{selectedIds.length} selected</span>
          <span>{filteredProjects.length} available</span>
        </div>

        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "4px" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={busy} onClick={handleAddSelected}>
            Add Selected
          </Button>
        </div>
      </div>
    </Modal>
  );
}