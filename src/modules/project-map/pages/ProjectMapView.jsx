"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { deleteProject, calculateRoute, calculateMultiStopRoute, calculateSegmentRoutes, deleteRun, removeProjectFromRun, loadRunDetails, updateStopSequence, addProjectToRun, updateRun, getProjectRunAssignment, updateStopNote, updateRunStopsCount, loadRuns } from "../data/projectMap.actions";
import ProjectMap from "../components/ProjectMap";
import ProjectList from "../components/ProjectList";
import ProjectDetailDrawer from "../components/ProjectDetailDrawer";
import RunList from "../components/RunList";
import RunDetailPanel from "../components/RunDetailPanel";
import RunForm from "../components/RunForm";
import ProjectSelectorModal from "../components/ProjectSelectorModal";
import FilterBar from "../components/FilterBar";
import AddProjectForm from "../components/AddProjectForm";

export default function ProjectMapView({ projects = [], statuses = [], origins = [], states = [], runs: initialRuns = [], buildingCategories = [], permitStatuses = [], welcomeCallStatuses = [] }) {
  const router = useRouter();
  const [mode, setMode] = useState("projects");
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

  // Runs state — local copy so we can update it after mutations
  const [runs, setRuns] = useState(initialRuns);
  useEffect(() => { setRuns(initialRuns); }, [initialRuns]);

  const [selectedRunId, setSelectedRunId] = useState(null);
  const [showRunForm, setShowRunForm] = useState(false);
  const [editingRun, setEditingRun] = useState(null);
  const [confirmDeleteRunId, setConfirmDeleteRunId] = useState(null);
  const [runProjects, setRunProjects] = useState([]);
  const [runRouteData, setRunRouteData] = useState(null);
  const [runRouteLoading, setRunRouteLoading] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [runSegmentData, setRunSegmentData] = useState(null);
  const [showRouteErrorModal, setShowRouteErrorModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [editingStopNote, setEditingStopNote] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const refreshRuns = useCallback(async () => {
    try {
      const freshRuns = await loadRuns();
      setRuns(freshRuns);
    } catch (err) {
      console.error("[ProjectMapView] Failed to refresh runs:", err);
    }
  }, []);

  const clearRunState = useCallback(() => {
    setSelectedRunId(null);
    setRunProjects([]);
    setRunRouteData(null);
    setRunSegmentData(null);
    setRunRouteLoading(false);
    setConfirmDeleteRunId(null);
    setEditingStopNote(null);
  }, []);

  const dealers = useMemo(() => projects.map((p) => p.dealer).filter(Boolean), [projects]);
  const projectStates = useMemo(() => projects.map((p) => p.state_code).filter(Boolean), [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (filters.status && String(p.status_id) !== String(filters.status)) return false;
      if (filters.dealer && p.dealer !== filters.dealer) return false;
      if (filters.state && p.state_code !== filters.state) return false;
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

  useEffect(() => {
    const currentSearch = filters.search || "";
    const prevSearch = prevSearchRef.current;
    prevSearchRef.current = currentSearch;
    if (currentSearch && currentSearch.length >= 2) {
      const q = currentSearch.toLowerCase();
      const matched = projects.filter((p) => {
        const match =
          (p.client_name && p.client_name.toLowerCase().includes(q)) ||
          (p.formatted_address && p.formatted_address.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q));
        return match && (p.site_latitude || p.address_latitude) != null && (p.site_longitude || p.address_longitude) != null;
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

  const stateColorLookup = useMemo(() => {
    const map = {};
    states.forEach((s) => { map[s.state_code] = s.display_color; });
    return map;
  }, [states]);

  const handleSelectProject = useCallback((id) => { setSelectedProjectId(id); }, []);

  const handleCloseDrawer = () => { setSelectedProjectId(null); };

  const handleEdit = () => {
    if (selectedProject) { setEditingProject(selectedProject); setShowAddForm(true); }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setBusy(true);
    try {
      await deleteProject(confirmDeleteId);
      toastSuccess("Project deleted.", "Project Map");
      setConfirmDeleteId(null);
      if (selectedProjectId === confirmDeleteId) setSelectedProjectId(null);
      router.refresh();
    } catch (err) {
      toastError(err?.message || "Failed to delete project.", "Project Map");
    } finally { setBusy(false); }
  };

  const handleSaved = () => { setShowAddForm(false); setEditingProject(null); router.refresh(); };
  const handleCloseForm = () => { setShowAddForm(false); setEditingProject(null); };

  const handleRecalculate = useCallback(async () => {
    if (!selectedRunId) return;
    setRecalculating(true);
    try {
      const details = await loadRunDetails(selectedRunId);
      const freshProjects = details.projects || [];
      setRunProjects(freshProjects);
      const origin = selectedRun?.proj_s_origin_addresses;
      if (!origin || origin.latitude == null || origin.longitude == null) {
        toastError("Run has no origin address with valid coordinates.", "Recalculate"); return;
      }
      const coords = [{ lat: Number(origin.latitude), lng: Number(origin.longitude) }];
      freshProjects.forEach((rp) => {
        const proj = rp.proj_t_projects || {};
        const lat = Number(proj.site_latitude ?? proj.address_latitude);
        const lng = Number(proj.site_longitude ?? proj.address_longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push({ lat, lng });
      });
      if (coords.length < 2) { toastError("Not enough valid coordinates to calculate a route.", "Recalculate"); return; }
      const data = await calculateSegmentRoutes(coords);
      if (data.hasPartialFailure) setShowRouteErrorModal(true);
      setRunRouteData({ distance: data.totalDistance, duration: data.totalDuration, geometry: data.geometry });
      setRunSegmentData(data);
      const subtotal = freshProjects.reduce((sum, rp) => {
        const proj = rp.proj_t_projects || {};
        return sum + (Number(proj.project_subtotal) || 0);
      }, 0);
      const totalMileage = data.totalDistance / 1609.344;
      await updateRun(selectedRunId, { estimated_distance: data.totalDistance, estimated_duration: data.totalDuration, estimated_mileage: totalMileage, estimated_subtotal: subtotal });
      
      // Calculate and persist arrival_datetime for each stop
      const runDate = selectedRun?.run_date ? new Date(selectedRun.run_date) : new Date();
      const originStart = new Date(runDate);
      originStart.setHours(8, 0, 0, 0); // Default start time: 8:00 AM
      let cumulativeSeconds = 0;
      const arrivalUpdates = [];
      for (let i = 0; i < freshProjects.length; i++) {
        const segment = data.segments[i];
        if (segment && !segment.error) {
          cumulativeSeconds += segment.duration;
        }
        const arrivalTime = new Date(originStart.getTime() + cumulativeSeconds * 1000);
        const rp = freshProjects[i];
        if (rp && rp.id) {
          arrivalUpdates.push(updateStopNote(rp.id, rp.notes || null).then(() => updateStopSequence(rp.id, i)));
        }
      }
      if (arrivalUpdates.length > 0) {
        await Promise.all(arrivalUpdates);
      }
      
      await updateRunStopsCount(selectedRunId, freshProjects.length);
      await refreshRuns();
      toastSuccess("Route recalculated successfully.", "Recalculate");
    } catch (err) {
      console.error("[ProjectMapView] Recalculate failed:", err);
      toastError(err?.message || "Failed to recalculate route.", "Recalculate");
      setRunRouteData(null); setRunSegmentData(null);
    } finally { setRecalculating(false); }
  }, [selectedRunId, selectedRun, refreshRuns]);

  const handleSelectRun = (id) => {
    setSelectedRunId(id);
    setSelectedProjectId(null);
    setRunRouteData(null);
    setRunSegmentData(null);
    setRunRouteLoading(false);
  };

  const handleCloseRunDetail = () => {
    clearRunState();
  };

  const handleEditRun = () => {
    if (selectedRun) { setEditingRun(selectedRun); setShowRunForm(true); }
  };

  const handleDeleteRun = async () => {
    if (!confirmDeleteRunId) return;
    setBusy(true);
    try {
      await deleteRun(confirmDeleteRunId);
      toastSuccess("Run deleted.", "Runs");
      // Clear ALL run-related state
      clearRunState();
      await refreshRuns();
    } catch (err) {
      toastError(err?.message || "Failed to delete run.", "Runs");
    } finally { setBusy(false); }
  };

  const handleRunSaved = () => { setShowRunForm(false); setEditingRun(null); refreshRuns(); };
  const handleCloseRunForm = () => { setShowRunForm(false); setEditingRun(null); };

  const refreshRunData = useCallback(async () => {
    if (!selectedRunId) return;
    try {
      const details = await loadRunDetails(selectedRunId);
      if (!details.run) {
        // Run no longer exists — clear all run state
        clearRunState();
        await refreshRuns();
        return;
      }
      const projects = details.projects || [];
      setRunProjects(projects);
      await updateRunStopsCount(selectedRunId, projects.length);
      await refreshRuns();
    } catch (err) {
      console.error("[ProjectMapView] Failed to refresh run data:", err);
    }
  }, [selectedRunId, refreshRuns, clearRunState]);

  const handleAddProjectToRun = async (projectId) => {
    if (!selectedRunId) return;
    setBusy(true);
    try {
      await addProjectToRun(selectedRunId, projectId, runProjects.length);
      toastSuccess("Project added to run.", "Runs");
      await refreshRunData();
    } catch (err) {
      toastError(err?.message || "Failed to add project to run.", "Runs");
    } finally { setBusy(false); }
  };

  const handleProjectSelectorClose = () => { setShowProjectSelector(false); };
  const handleProjectSelectorSaved = () => { setShowProjectSelector(false); refreshRunData(); };

  const handleRemoveProjectFromRun = async (runProjectId) => {
    setBusy(true);
    try {
      await removeProjectFromRun(runProjectId);
      toastSuccess("Project removed from run.", "Runs");
      await refreshRunData();
    } catch (err) {
      toastError(err?.message || "Failed to remove project.", "Runs");
    } finally { setBusy(false); }
  };

  const handleEditStopNote = (runProject) => {
    const proj = runProject.proj_t_projects || {};
    setEditingStopNote({ runProjectId: runProject.id, notes: runProject.notes || "", clientName: proj.client_name || "Untitled" });
  };

  const handleSaveStopNote = async () => {
    if (!editingStopNote) return;
    setBusy(true);
    try {
      await updateStopNote(editingStopNote.runProjectId, editingStopNote.notes);
      toastSuccess("Stop note saved.", "Runs");
      setEditingStopNote(null);
      await refreshRunData();
    } catch (err) {
      toastError(err?.message || "Failed to save stop note.", "Runs");
    } finally { setBusy(false); }
  };

  const handleReorderStops = async (fromIndex, toIndex) => {
    if (!selectedRunId || runProjects.length === 0) return;
    setBusy(true);
    try {
      const updated = [...runProjects];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      const promises = updated.map((rp, idx) => updateStopSequence(rp.id, idx));
      await Promise.all(promises);
      toastSuccess("Stop order updated.", "Runs");
      await refreshRunData();
    } catch (err) {
      toastError(err?.message || "Failed to reorder stops.", "Runs");
    } finally { setBusy(false); }
  };

  // Load run details when selected
  useEffect(() => {
    if (!selectedRunId) { setRunProjects([]); return; }
    let cancelled = false;
    setBusy(true);
    loadRunDetails(selectedRunId)
      .then((details) => { if (!cancelled) setRunProjects(details.projects || []); })
      .catch((err) => { if (!cancelled) toastError(err?.message || "Failed to load run details.", "Runs"); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [selectedRunId]);

  // Calculate multi-stop route for runs
  useEffect(() => {
    if (mode !== "runs" || !selectedRunId || runProjects.length === 0) {
      setRunRouteData(null); setRunSegmentData(null); return;
    }
    const origin = selectedRun?.proj_s_origin_addresses;
    if (!origin || origin.latitude == null || origin.longitude == null) { setRunRouteData(null); return; }
    const originLat = Number(origin.latitude);
    const originLng = Number(origin.longitude);
    let cancelled = false;
    setRunRouteLoading(true);
    const coords = [];
    if (Number.isFinite(originLat) && Number.isFinite(originLng)) coords.push({ lat: originLat, lng: originLng });
    runProjects.forEach((rp) => {
      const proj = rp.proj_t_projects || {};
      const lat = Number(proj.site_latitude ?? proj.address_latitude);
      const lng = Number(proj.site_longitude ?? proj.address_longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) coords.push({ lat, lng });
    });
    if (coords.length < 2) { setRunRouteData(null); setRunSegmentData(null); setRunRouteLoading(false); return; }
    calculateSegmentRoutes(coords)
      .then((data) => {
        if (!cancelled) {
          if (data.hasPartialFailure) setShowRouteErrorModal(true);
          setRunRouteData({ distance: data.totalDistance, duration: data.totalDuration, geometry: data.geometry });
          setRunSegmentData(data);
          const subtotal = runProjects.reduce((sum, rp) => {
            const proj = rp.proj_t_projects || {};
            return sum + (Number(proj.project_subtotal) || 0);
          }, 0);
          updateRun(selectedRunId, { estimated_distance: data.totalDistance, estimated_duration: data.totalDuration, estimated_subtotal: subtotal }).catch((err) => console.error("[ProjectMapView] Failed to save route estimates:", err));
        }
      })
      .catch((err) => {
        if (!cancelled) { console.error("[ProjectMapView] Route calculation failed:", err); toastError(err?.message || "Failed to calculate route.", "Route"); setRunRouteData(null); setRunSegmentData(null); }
      })
      .finally(() => { if (!cancelled) setRunRouteLoading(false); });
    return () => { cancelled = true; };
  }, [mode, selectedRunId, runProjects]);

  // Calculate route when origin or selected project changes
  useEffect(() => {
    if (!selectedOrigin || !selectedProject) { setRouteData(null); return; }
    const destLat = selectedProject.site_latitude || selectedProject.address_latitude;
    const destLng = selectedProject.site_longitude || selectedProject.address_longitude;
    if (selectedOrigin.latitude == null || selectedOrigin.longitude == null || destLat == null || destLng == null) { setRouteData(null); return; }
    let cancelled = false;
    setRouteLoading(true);
    calculateRoute(selectedOrigin.latitude, selectedOrigin.longitude, destLat, destLng)
      .then((data) => { if (!cancelled) setRouteData(data); })
      .catch((err) => { if (!cancelled) { toastError(err?.message || "Failed to calculate route.", "Route"); setRouteData(null); } })
      .finally(() => { if (!cancelled) setRouteLoading(false); });
    return () => { cancelled = true; };
  }, [selectedOrigin, selectedProject]);

  const routeInfo = useMemo(() => {
    if (!routeData) return null;
    const distKm = (routeData.distance / 1000).toFixed(1);
    const mins = Math.round(routeData.duration / 60);
    return { distance: `${distKm} km`, duration: `${mins} min${mins !== 1 ? "s" : ""}` };
  }, [routeData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden", height: "100vh" }}>
      <div style={{ padding: "2px 10px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#1e293b", lineHeight: "1.2" }}>Projects Map</h2>
        <p style={{ margin: "1px 0 0", fontSize: "9px", color: "#64748b", lineHeight: "1.2" }}>View and track project locations, schedules, and statuses on an interactive map.</p>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
        <button onClick={() => setMode("projects")} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: mode === "projects" ? 600 : 400, border: "none", borderBottom: mode === "projects" ? "2px solid #1e293b" : "2px solid transparent", background: mode === "projects" ? "#f8fafc" : "#fff", color: mode === "projects" ? "#1e293b" : "#64748b", cursor: "pointer" }}>Projects</button>
        <button onClick={() => setMode("runs")} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: mode === "runs" ? 600 : 400, border: "none", borderBottom: mode === "runs" ? "2px solid #1e293b" : "2px solid transparent", background: mode === "runs" ? "#f8fafc" : "#fff", color: mode === "runs" ? "#1e293b" : "#64748b", cursor: "pointer" }}>Runs</button>
      </div>

      {mode === "projects" ? (
        <FilterBar statuses={statuses} dealers={dealers} states={projectStates} filters={filters} onFilterChange={setFilters} onAddClick={() => { setEditingProject(null); setShowAddForm(true); }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>{runs.length} Run{runs.length !== 1 ? "s" : ""}</span>
          <button onClick={() => { setEditingRun(null); setShowRunForm(true); }} style={{ padding: "3px 10px", fontSize: "12px", borderRadius: "3px", border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>+ New Run</button>
        </div>
      )}

      {mode === "projects" && origins.length > 0 && (
        <div style={{ padding: "2px 10px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <label style={{ fontSize: "10px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>Origin:</label>
          <select value={selectedOriginId || ""} onChange={(e) => setSelectedOriginId(e.target.value || null)} style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "3px", border: "1px solid #e2e8f0", background: "#fff", color: "#1e293b", maxWidth: "240px" }}>
            <option value="">Select origin...</option>
            {origins.map((o) => (<option key={o.id} value={o.id}>{o.origin_name}</option>))}
          </select>
          {routeLoading && <span style={{ fontSize: "10px", color: "#64748b" }}>Calculating route...</span>}
          {routeInfo && <span style={{ fontSize: "10px", color: "#1e293b" }}>{routeInfo.distance} · {routeInfo.duration}</span>}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        <div style={{ width: "240px", minWidth: "240px", flexShrink: 0, zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mode === "projects" ? (
            <ProjectList projects={projects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} filters={filters} statuses={statuses} />
          ) : (
            <RunList runs={runs} selectedRunId={selectedRunId} onSelectRun={handleSelectRun} />
          )}
        </div>

        <div style={{ flex: 1, position: "relative", minHeight: 0, minWidth: 0 }}>
          <ProjectMap projects={projects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} filters={filters} selectedOrigin={selectedOrigin} routeData={routeData} stateColorLookup={stateColorLookup} statuses={statuses} searchResults={searchResults} mode={mode} runs={runs} selectedRunId={selectedRunId} runProjects={runProjects} runRouteData={runRouteData} onAddToRun={handleAddProjectToRun} onRemoveFromRun={handleRemoveProjectFromRun} />
        </div>

        {mode === "projects" && selectedProject && (
          <ProjectDetailDrawer project={selectedProject} statuses={statuses} onClose={handleCloseDrawer} onEdit={handleEdit} onDelete={() => setConfirmDeleteId(selectedProject.id)} routeInfo={routeInfo} />
        )}
        {mode === "runs" && selectedRun && (
          <RunDetailPanel run={selectedRun} runProjects={runProjects} runSegmentData={runSegmentData} onClose={handleCloseRunDetail} onEdit={handleEditRun} onDelete={() => setConfirmDeleteRunId(selectedRun.id)} onRemoveProject={handleRemoveProjectFromRun} onReorderStops={handleReorderStops} onRecalculate={handleRecalculate} recalculating={recalculating} onEditStopNote={handleEditStopNote} />
        )}
      </div>

      {mode === "projects" && (
        <AddProjectForm show={showAddForm} mode={editingProject ? "edit" : "add"} project={editingProject} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} onClose={handleCloseForm} onSaved={handleSaved} />
      )}

      {mode === "runs" && (
        <RunForm show={showRunForm} mode={editingRun ? "edit" : "add"} run={editingRun} origins={origins} statuses={statuses} onClose={handleCloseRunForm} onSaved={handleRunSaved} />
      )}

      {mode === "projects" && (
        <Modal show={!!confirmDeleteId} onHide={() => setConfirmDeleteId(null)} title="Delete Project">
          <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px" }}>Delete this project? This cannot be undone.</p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}

      {mode === "runs" && (
        <Modal show={!!confirmDeleteRunId} onHide={() => setConfirmDeleteRunId(null)} title="Delete Run">
          <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 16px" }}>Delete this run? This cannot be undone.</p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setConfirmDeleteRunId(null)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={handleDeleteRun}>Delete</Button>
          </div>
        </Modal>
      )}

      <Modal show={showRouteErrorModal} onHide={() => setShowRouteErrorModal(false)} title="Unable to Calculate Route">
        <div style={{ padding: "4px 0" }}>
          <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 12px", lineHeight: 1.5 }}>One or more locations cannot be connected using the road network.</p>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>This usually happens when the origin and one or more stops are in different countries or are otherwise unreachable by road. Please verify the selected locations.</p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setShowRouteErrorModal(false)}>OK</Button>
          </div>
        </div>
      </Modal>

      <Modal show={!!editingStopNote} onHide={() => setEditingStopNote(null)} title="Stop Note">
        {editingStopNote && (
          <div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Project</label>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{editingStopNote.clientName}</div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Notes</label>
              <textarea value={editingStopNote.notes} onChange={(e) => setEditingStopNote({ ...editingStopNote, notes: e.target.value })} style={{ width: "100%", minHeight: "80px", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "6px 8px", fontSize: "12px", resize: "vertical" }} placeholder="Add notes for this stop..." />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setEditingStopNote(null)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={handleSaveStopNote}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {mode === "runs" && selectedRunId && (
        <ProjectSelectorModal show={showProjectSelector} runId={selectedRunId} allProjects={projects} existingProjectIds={runProjects.map((rp) => rp.project_id)} onClose={handleProjectSelectorClose} onSaved={handleProjectSelectorSaved} />
      )}
    </div>
  );
}