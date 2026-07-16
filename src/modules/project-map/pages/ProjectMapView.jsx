"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { deleteProject, calculateRoute } from "../data/projectMap.actions";
import ProjectMap from "../components/ProjectMap";
import ProjectList from "../components/ProjectList";
import ProjectDetailDrawer from "../components/ProjectDetailDrawer";
import FilterBar from "../components/FilterBar";
import AddProjectForm from "../components/AddProjectForm";

export default function ProjectMapView({ projects = [], statuses = [], origins = [], states = [] }) {
  const router = useRouter();
  const [filters, setFilters] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedOriginId, setSelectedOriginId] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const prevSearchRef = useRef("");

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Derived lists for filter dropdowns
  const dealers = useMemo(() => projects.map((p) => p.dealer).filter(Boolean), [projects]);
  const projectStates = useMemo(() => projects.map((p) => p.state_code).filter(Boolean), [projects]);

  // Apply filters including date range
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.status && String(p.status_id) !== String(filters.status)) return false;
      if (filters.dealer && p.dealer !== filters.dealer) return false;
      if (filters.state && p.state_code !== filters.state) return false;
      // Date range filter: check scheduled_project_date or install_date
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        const sched = p.scheduled_project_date ? new Date(p.scheduled_project_date) : null;
        const install = p.install_date ? new Date(p.install_date) : null;
        if (!sched && !install) return false;
        if (sched && sched < from && (!install || install < from)) return false;
        if (install && install < from && (!sched || sched < from)) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        const sched = p.scheduled_project_date ? new Date(p.scheduled_project_date) : null;
        const install = p.install_date ? new Date(p.install_date) : null;
        if (!sched && !install) return false;
        if (sched && sched > to && (!install || install > to)) return false;
        if (install && install > to && (!sched || sched > to)) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          (p.client_name && p.client_name.toLowerCase().includes(q)) ||
          (p.formatted_address && p.formatted_address.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [projects, filters]);

  // Detect search changes to center map
  useEffect(() => {
    const currentSearch = filters.search || "";
    const prevSearch = prevSearchRef.current;
    prevSearchRef.current = currentSearch;

    // When search changes (user types), find matching projects
    if (currentSearch && currentSearch.length >= 2) {
      const q = currentSearch.toLowerCase();
      const matched = projects.filter((p) => {
        const match =
          (p.client_name && p.client_name.toLowerCase().includes(q)) ||
          (p.formatted_address && p.formatted_address.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q));
        return match &&
          (p.site_latitude || p.address_latitude) != null &&
          (p.site_longitude || p.address_longitude) != null;
      });
      setSearchResults(matched.length > 0 ? matched : null);
    } else {
      setSearchResults(null);
    }
  }, [filters.search, projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const selectedOrigin = useMemo(() => {
    if (!selectedOriginId) return null;
    return origins.find((o) => o.id === selectedOriginId) || null;
  }, [selectedOriginId, origins]);

  // Build state color lookup from DB
  const stateColorLookup = useMemo(() => {
    const map = {};
    states.forEach((s) => {
      map[s.state_code] = s.display_color;
    });
    return map;
  }, [states]);

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

  // Calculate route when origin or selected project changes
  useEffect(() => {
    if (!selectedOrigin || !selectedProject) {
      setRouteData(null);
      return;
    }

    const destLat = selectedProject.site_latitude || selectedProject.address_latitude;
    const destLng = selectedProject.site_longitude || selectedProject.address_longitude;
    if (selectedOrigin.latitude == null || selectedOrigin.longitude == null || destLat == null || destLng == null) {
      setRouteData(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);

    calculateRoute(selectedOrigin.latitude, selectedOrigin.longitude, destLat, destLng)
      .then((data) => {
        if (!cancelled) {
          setRouteData(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastError(err?.message || "Failed to calculate route.", "Route");
          setRouteData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedOrigin, selectedProject]);

  // Format route info for display
  const routeInfo = useMemo(() => {
    if (!routeData) return null;
    const distKm = (routeData.distance / 1000).toFixed(1);
    const mins = Math.round(routeData.duration / 60);
    return {
      distance: `${distKm} km`,
      duration: `${mins} min${mins !== 1 ? "s" : ""}`,
    };
  }, [routeData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden", height: "100vh" }}>
      {/* Header */}
      <div style={{
        padding: "2px 10px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#1e293b", lineHeight: "1.2" }}>Projects Map</h2>
        <p style={{ margin: "1px 0 0", fontSize: "9px", color: "#64748b", lineHeight: "1.2" }}>View and track project locations, schedules, and statuses on an interactive map.</p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        statuses={statuses}
        dealers={dealers}
        states={projectStates}
        filters={filters}
        onFilterChange={setFilters}
        onAddClick={() => { setEditingProject(null); setShowAddForm(true); }}
      />

      {/* Origin Selector */}
      {origins.length > 0 && (
        <div style={{
          padding: "2px 10px",
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
        }}>
          <label style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>Origin:</label>
          <select
            value={selectedOriginId || ""}
            onChange={(e) => setSelectedOriginId(e.target.value || null)}
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "3px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#1e293b",
              maxWidth: "240px",
            }}
          >
            <option value="">Select origin...</option>
            {origins.map((o) => (
              <option key={o.id} value={o.id}>{o.origin_name}</option>
            ))}
          </select>
          {routeLoading && <span style={{ fontSize: "10px", color: "#64748b" }}>Calculating route...</span>}
          {routeInfo && (
            <span style={{ fontSize: "10px", color: "#1e293b" }}>
              {routeInfo.distance} · {routeInfo.duration}
            </span>
          )}
        </div>
      )}

      {/* Main Content: List + Map */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        {/* Left: Project List */}
        <div style={{ width: "240px", minWidth: "240px", flexShrink: 0, zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            filters={filters}
            statuses={statuses}
          />
        </div>

        {/* Center: Map */}
        <div style={{ flex: 1, position: "relative", minHeight: 0, minWidth: 0 }}>
          <ProjectMap
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
            filters={filters}
            selectedOrigin={selectedOrigin}
            routeData={routeData}
            stateColorLookup={stateColorLookup}
            statuses={statuses}
            searchResults={searchResults}
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
            routeInfo={routeInfo}
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