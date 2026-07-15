"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { deleteProject } from "../data/projectMap.actions";
import ProjectMap from "../components/ProjectMap";
import ProjectList from "../components/ProjectList";
import ProjectDetailDrawer from "../components/ProjectDetailDrawer";
import FilterBar from "../components/FilterBar";
import AddProjectForm from "../components/AddProjectForm";

export default function ProjectMapView({ projects = [], statuses = [] }) {
  const router = useRouter();
  const [filters, setFilters] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Derived lists for filter dropdowns
  const dealers = useMemo(() => projects.map((p) => p.dealer).filter(Boolean), [projects]);
  const states = useMemo(() => projects.map((p) => p.state_code).filter(Boolean), [projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const handleSelectProject = (id) => {
    setSelectedProjectId(id);
  };

  const handleCloseDrawer = () => {
    setSelectedProjectId(null);
  };

  const handleEdit = () => {
    if (selectedProject) {
      setEditingProject(selectedProject);
      setShowAddForm(true);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setBusy(true);
    try {
      await deleteProject(confirmDeleteId);
      toastSuccess("Project deleted.", "Project Map");
      setConfirmDeleteId(null);
      if (selectedProjectId === confirmDeleteId) {
        setSelectedProjectId(null);
      }
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Failed to delete project.", "Project Map");
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = () => {
    setShowAddForm(false);
    setEditingProject(null);
    router.refresh();
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingProject(null);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "1px 10px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexShrink: 0,
        minHeight: "22px",
      }}>
        <h2 style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#1e293b", lineHeight: "1.1" }}>PSB Project Map</h2>
      </div>

      {/* Filter Bar */}
      <FilterBar
        statuses={statuses}
        dealers={dealers}
        states={states}
        filters={filters}
        onFilterChange={setFilters}
        onAddClick={() => { setEditingProject(null); setShowAddForm(true); }}
      />

      {/* Main Content: List + Map */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        {/* Left: Project List */}
        <div style={{ width: "240px", minWidth: "240px", flexShrink: 0, zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            filters={filters}
          />
        </div>

        {/* Center: Map */}
        <div style={{ flex: 1, position: "relative" }}>
          <ProjectMap
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            filters={filters}
          />
        </div>

        {/* Right: Detail Drawer */}
        {selectedProject && (
          <ProjectDetailDrawer
            project={selectedProject}
            statuses={statuses}
            onClose={handleCloseDrawer}
            onEdit={handleEdit}
            onDelete={() => setConfirmDeleteId(selectedProject.id)}
          />
        )}
      </div>

      {/* Add/Edit Project Modal */}
      <AddProjectForm
        show={showAddForm}
        mode={editingProject ? "edit" : "add"}
        project={editingProject}
        statuses={statuses}
        onClose={handleCloseForm}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation */}
      <Modal show={!!confirmDeleteId} onHide={() => setConfirmDeleteId(null)} title="Delete Project">
        <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px" }}>
          Delete this project? This cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}