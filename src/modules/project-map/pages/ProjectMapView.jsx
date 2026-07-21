"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { deleteProject, calculateRoute, calculateMultiStopRoute, calculateSegmentRoutes, deleteRun, removeProjectFromRun, loadRunDetails, updateStopSequence, addProjectToRun, updateRun } from "../data/projectMap.actions";
import ProjectMap from "../components/ProjectMap";
import ProjectList from "../components/ProjectList";
import ProjectDetailDrawer from "../components/ProjectDetailDrawer";
import RunList from "../components/RunList";
import RunDetailPanel from "../components/RunDetailPanel";
import RunForm from "../components/RunForm";
import ProjectSelectorModal from "../components/ProjectSelectorModal";
import FilterBar from "../components/FilterBar";
import AddProjectForm from "../components/AddProjectForm";

export default function ProjectMapView({ projects = [], statuses = [], origins = [], states = [], runs = [] }) {
  const router = useRouter();
  const [mode, setMode] = useState("projects"); // "projects" | "runs"
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

  // Runs state
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [showRunForm, setShowRunForm] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [confirmDeleteRunId, setConfirmDeleteRunId] = useState(null);
  const [runProjects, setRunProjects] = useState([]);
  const [runRouteData, setRunRouteData] = useState(null);
  const [runRouteLoading, setRunRouteLoading] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  // Segment route data for individual legs
  const [runSegmentData, setRunSegmentData] = useState(null);
  
  // Refs to prevent unnecessary route recalculations
  const prevCoordStringRef = useRef(null);
  const justSavedRef = useRef(false);

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

  const selectedRun = useMemo(() => {
    if (!selectedRunId) return null;
    return runs.find((r) => r.id === selectedRunId) || null;
  }, [selectedRunId, runs]);

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

  const handleSelectProject = useCallback((id) => {
    setSelectedProjectId(id);
  }, []);

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

  // Runs handlers
  const handleSelectRun = (id) => {
    setSelectedRunId(id);
    setSelectedProjectId(null);
  };

  const handleCloseRunDetail = () => {
    setSelectedRunId(null);
    setRunProjects([]);
  };

  const handleEditRun = () => {
    if (selectedRun) {
      setEditingRun(selectedRun);
      setShowRunForm(true);
    }
  };

  const handleDeleteRun = async () => {
    if (!confirmDeleteRunId) return;
    setBusy(true);
    try {
      await deleteRun(confirmDeleteRunId);
      toastSuccess("Run deleted.", "Runs");
      setConfirmDeleteRunId(null);
      if (selectedRunId === confirmDeleteRunId) {
        setSelectedRunId(null);
        setRunProjects([]);
      }
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Failed to delete run.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  const handleRunSaved = () => {
    setShowRunForm(false);
    setEditingRun(null);
    router.refresh();
  };

  const handleCloseRunForm = () => {
    setShowRunForm(false);
    setEditingRun(null);
  };

  const handleAddProjectToRun = async (projectId) => {
    if (!selectedRunId) return;
    setBusy(true);
    try {
      const currentMax = runProjects.length;
      await addProjectToRun(selectedRunId, projectId, currentMax);
      toastSuccess("Project added to run.", "Runs");
      // Refresh run projects
      const details = await loadRunDetails(selectedRunId);
      setRunProjects(details.projects || []);
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Failed to add project to run.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  const handleProjectSelectorClose = () => {
    setShowProjectSelector(false);
  };

  const handleProjectSelectorSaved = () => {
    setShowProjectSelector(false);
    // Refresh run projects
    if (selectedRunId) {
      loadRunDetails(selectedRunId).then((details) => {
        setRunProjects(details.projects || []);
      });
    }
    router.refresh();
  };

  const handleRemoveProjectFromRun = async (runProjectId) => {
    setBusy(true);
    try {
      await removeProjectFromRun(runProjectId);
      toastSuccess("Project removed from run.", "Runs");
      // Refresh run projects
      if (selectedRunId) {
        const details = await loadRunDetails(selectedRunId);
        setRunProjects(details.projects);
      }
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Failed to remove project.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  const handleReorderStops = async (fromIndex, toIndex) => {
    if (!selectedRunId || runProjects.length === 0) return;
    setBusy(true);
    try {
      // Reorder: swap stop_sequence values
      const updated = [...runProjects];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      // Update all stop sequences
      const promises = updated.map((rp, idx) => updateStopSequence(rp.id, idx));
      await Promise.all(promises);

      toastSuccess("Stop order updated.", "Runs");
      setRunProjects(updated);
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Failed to reorder stops.", "Runs");
    } finally {
      setBusy(false);
    }
  };

  // Load run details when selected
  useEffect(() => {
    if (!selectedRunId) {
      setRunProjects([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    loadRunDetails(selectedRunId)
      .then((details) => {
        if (!cancelled) {
          setRunProjects(details.projects || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toastError(err?.message || "Failed to load run details.", "Runs");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => { cancelled = true; };
  }, [selectedRunId]);

  // Calculate multi-stop route for runs
  useEffect(() => {
    if (mode !== "runs" || !selectedRunId || runProjects.length === 0) {
      setRunRouteData(null);
      setRunSegmentData(null);
      return;
    }

    const origin = selectedRun?.proj_s_origin_addresses;
    if (!origin || origin.latitude == null || origin.longitude == null) {
      setRunRouteData(null);
      return;
    }

    // Build coordinate string for comparison (detect actual changes)
    const originLat = Number(origin.latitude);
    const originLng = Number(origin.longitude);
    const coordParts = [ `${originLat},${originLng}` ];
    runProjects.forEach((rp) => {
      const proj = rp.proj_t_projects || {};
      const lat = Number(proj.site_latitude ?? proj.address_latitude);
      const lng = Number(proj.site_longitude ?? proj.address_longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coordParts.push(`${lat},${lng}`);
      }
    });
    const coordString = coordParts.join(";");

    // Skip if coordinates haven't changed (prevents repeated calculations)
    if (coordString === prevCoordStringRef.current) {
      return;
    }
    prevCoordStringRef.current = coordString;

    // Skip if we just saved (prevents loop from router.refresh())
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }

    let cancelled = false;
    setRunRouteLoading(true);

    // Build OSRM coordinates: origin -> stop1 -> stop2 -> ... -> stopN
    const coords = [];
    if (Number.isFinite(originLat) && Number.isFinite(originLng)) {
      coords.push({ lat: originLat, lng: originLng });
    }
    runProjects.forEach((rp) => {
      const proj = rp.proj_t_projects || {};
      const lat = Number(proj.site_latitude ?? proj.address_latitude);
      const lng = Number(proj.site_longitude ?? proj.address_longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        coords.push({ lat, lng });
      }
    });

    if (coords.length < 2) {
      setRunRouteData(null);
      setRunSegmentData(null);
      setRunRouteLoading(false);
      return;
    }

    console.log("[ProjectMapView] Calculating segment routes for", coords.length, "points");
    
    // Use calculateSegmentRoutes to get per-leg data + full route
    calculateSegmentRoutes(coords)
      .then((data) => {
        if (!cancelled) {
          // Store full route geometry for map display
          setRunRouteData({
            distance: data.totalDistance,
            duration: data.totalDuration,
            geometry: data.geometry,
          });
          
          // Store segment data for detailed display
          setRunSegmentData(data);
          
          // Save route estimates to run record
          const subtotal = runProjects.reduce((sum, rp) => {
            const proj = rp.proj_t_projects || {};
            return sum + (Number(proj.project_subtotal) || 0);
          }, 0);
          
          justSavedRef.current = true;
          updateRun(selectedRunId, {
            estimated_distance: data.totalDistance,
            estimated_duration: data.totalDuration,
            estimated_subtotal: subtotal,
          }).then(() => {
            router.refresh();
          }).catch((err) => {
            console.error("[ProjectMapView] Failed to save route estimates:", err);
            justSavedRef.current = false;
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[ProjectMapView] Route calculation failed:", err);
          toastError(err?.message || "Failed to calculate route.", "Route");
          setRunRouteData(null);
          setRunSegmentData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setRunRouteLoading(false);
      });

    return () => { cancelled = true; };
  }, [mode, selectedRunId, runProjects, router]);

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

      {/* Mode Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #e2e8f0",
        background: "#fff",
        flexShrink: 0,
      }}>
        <button
          onClick={() => setMode("projects")}
          style={{
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: mode === "projects" ? 600 : 400,
            border: "none",
            borderBottom: mode === "projects" ? "2px solid #1e293b" : "2px solid transparent",
            background: mode === "projects" ? "#f8fafc" : "#fff",
            color: mode === "projects" ? "#1e293b" : "#64748b",
            cursor: "pointer",
          }}
        >
          Projects
        </button>
        <button
          onClick={() => setMode("runs")}
          style={{
            padding: "6px 16px",
            fontSize: "12px",
            fontWeight: mode === "runs" ? 600 : 400,
            border: "none",
            borderBottom: mode === "runs" ? "2px solid #1e293b" : "2px solid transparent",
            background: mode === "runs" ? "#f8fafc" : "#fff",
            color: mode === "runs" ? "#1e293b" : "#64748b",
            cursor: "pointer",
          }}
        >
          Runs
        </button>
      </div>

      {/* Filter Bar / Runs Toolbar */}
      {mode === "projects" ? (
        <FilterBar
          statuses={statuses}
          dealers={dealers}
          states={projectStates}
          filters={filters}
          onFilterChange={setFilters}
          onAddClick={() => { setEditingProject(null); setShowAddForm(true); }}
        />
      ) : (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 10px",
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            {runs.length} Run{runs.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => { setEditingRun(null); setShowRunForm(true); }}
            style={{
              padding: "3px 10px",
              fontSize: "12px",
              borderRadius: "3px",
              border: "none",
              background: "#16a34a",
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            + New Run
          </button>
        </div>
      )}

      {/* Origin Selector */}
      {mode === "projects" && origins.length > 0 && (
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

      {/* Main Content: List + Map + Detail Panel */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        {/* Left Panel */}
        <div style={{ width: "240px", minWidth: "240px", flexShrink: 0, zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mode === "projects" ? (
            <ProjectList
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={handleSelectProject}
              filters={filters}
              statuses={statuses}
            />
          ) : (
            <RunList
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRun={handleSelectRun}
            />
          )}
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
            mode={mode}
            runs={runs}
            selectedRunId={selectedRunId}
            runProjects={runProjects}
            runRouteData={runRouteData}
            onAddToRun={handleAddProjectToRun}
            onRemoveFromRun={handleRemoveProjectFromRun}
          />
        </div>

        {/* Right: Detail Panel */}
        {mode === "projects" && selectedProject && (
          <ProjectDetailDrawer
            project={selectedProject}
            statuses={statuses}
            onClose={handleCloseDrawer}
            onEdit={handleEdit}
            onDelete={() => setConfirmDeleteId(selectedProject.id)}
            routeInfo={routeInfo}
          />
        )}
        {mode === "runs" && selectedRun && (
          <RunDetailPanel
            run={selectedRun}
            runProjects={runProjects}
            runSegmentData={runSegmentData}
            onClose={handleCloseRunDetail}
            onEdit={handleEditRun}
            onDelete={() => setConfirmDeleteRunId(selectedRun.id)}
            onRemoveProject={handleRemoveProjectFromRun}
            onReorderStops={handleReorderStops}
          />
        )}
      </div>

      {/* Add/Edit Project Modal */}
      {mode === "projects" && (
        <AddProjectForm
          show={showAddForm}
          mode={editingProject ? "edit" : "add"}
          project={editingProject}
          statuses={statuses}
          onClose={handleCloseForm}
          onSaved={handleSaved}
        />
      )}

      {/* Add/Edit Run Modal */}
      {mode === "runs" && (
        <RunForm
          show={showRunForm}
          mode={editingRun ? "edit" : "add"}
          run={editingRun}
          origins={origins}
          statuses={statuses}
          onClose={handleCloseRunForm}
          onSaved={handleRunSaved}
        />
      )}

      {/* Delete Project Confirmation */}
      {mode === "projects" && (
        <Modal show={!!confirmDeleteId} onHide={() => setConfirmDeleteId(null)} title="Delete Project">
          <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px" }}>
            Delete this project? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}

      {/* Delete Run Confirmation */}
      {mode === "runs" && (
        <Modal show={!!confirmDeleteRunId} onHide={() => setConfirmDeleteRunId(null)} title="Delete Run">
          <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px" }}>
            Delete this run? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setConfirmDeleteRunId(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDeleteRun}>Delete</Button>
          </div>
        </Modal>
      )}

      {/* Project Selector Modal */}
      {mode === "runs" && selectedRunId && (
        <ProjectSelectorModal
          show={showProjectSelector}
          runId={selectedRunId}
          allProjects={projects}
          existingProjectIds={runProjects.map((rp) => rp.project_id)}
          onClose={handleProjectSelectorClose}
          onSaved={handleProjectSelectorSaved}
        />
      )}
    </div>
  );
}
