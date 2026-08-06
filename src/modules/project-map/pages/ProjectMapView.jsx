"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { deleteProject, calculateRoute, calculateMultiStopRoute, calculateSegmentRoutes, deleteRun, removeProjectFromRun, loadRunDetails, updateStopSequence, addProjectToRun, updateRun, getProjectRunAssignment, updateStopNote, updateRunStopsCount, loadRuns, loadAllRunProjects } from "../data/projectMap.actions";
import { reverseGeocode } from "../utils/geocoding";
import ProjectMap from "../components/ProjectMap";
import ProjectList from "../components/ProjectList";
import ProjectDetailDrawer from "../components/ProjectDetailDrawer";
import RunList from "../components/RunList";
import RunDetailPanel from "../components/RunDetailPanel";
import RunForm from "../components/RunForm";
import ProjectSelectorModal from "../components/ProjectSelectorModal";
import FilterBar from "../components/FilterBar";
import AddProjectForm from "../components/AddProjectForm";
import MapSearch from "../components/MapSearch";
import FilterChips from "../components/FilterChips";
import RunFilterPanel from "../components/RunFilterPanel";
import RunFilterChips from "../components/RunFilterChips";

export default function ProjectMapView({ projects = [], statuses = [], origins = [], states = [], runs: initialRuns = [], buildingCategories = [], permitStatuses = [], welcomeCallStatuses = [] }) {
  const router = useRouter();
  const [mode, setMode] = useState("projects");
  const [showLabels, setShowLabels] = useState(true);
  const [filters, setFilters] = useState({});
  const isInitializedRef = useRef(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [initialLocation, setInitialLocation] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);
  const [searchMarker, setSearchMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // For filter search (project list)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedOriginId, setSelectedOriginId] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const prevSearchRef = useRef("");

  // Runs state — local copy so we can update it after mutations
  const [runs, setRuns] = useState(initialRuns);
  useEffect(() => { 
    console.log("[DEBUG] initialRuns changed:", initialRuns); 
    setRuns(initialRuns); 
  }, [initialRuns]);

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
  const [allRunProjects, setAllRunProjects] = useState([]);
  const [runFilters, setRunFilters] = useState({});
  const [runSearch, setRunSearch] = useState("");
  const [isLoadingRunDetails, setIsLoadingRunDetails] = useState(false);
  const runRequestIdRef = useRef(0);
  const runProjectsRef = useRef([]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Find the default "New Dealer Order" status ID
  const defaultStatusId = useMemo(() => {
    const status = statuses.find((s) => s.status_name === "New Dealer Order");
    return status ? String(status.status_id) : "";
  }, [statuses]);

  // Set default status on initial mount
  useEffect(() => {
    if (defaultStatusId && !isInitializedRef.current) {
      setFilters({ status: defaultStatusId });
      isInitializedRef.current = true;
    }
  }, [defaultStatusId]);

  // Fetch all run projects for the Assigned Run lookup
  useEffect(() => {
    let cancelled = false;
    loadAllRunProjects()
      .then((data) => { if (!cancelled) setAllRunProjects(data); })
      .catch((err) => { if (!cancelled) console.error("[ProjectMapView] Failed to load run projects:", err); });
    return () => { cancelled = true; };
  }, []);

  // Single source of truth: projectId -> { run, stopSequence }
  const projectRunLookup = useMemo(() => {
    const lookup = new Map();
    allRunProjects.forEach((rp) => {
      const run = runs.find((r) => r.id === rp.run_id);
      if (run) {
        lookup.set(rp.project_id, {
          run,
          stopSequence: rp.stop_sequence,
        });
      }
    });
    return lookup;
  }, [allRunProjects, runs]);

  const refreshRuns = useCallback(async () => {
    try {
      const freshRuns = await loadRuns();
      setRuns(freshRuns);
    } catch (err) {
      console.error("[ProjectMapView] Failed to refresh runs:", err);
    }
  }, []);

  const refreshRunProjects = useCallback(async () => {
    try {
      const freshRunProjects = await loadAllRunProjects();
      setAllRunProjects(freshRunProjects);
    } catch (err) {
      console.error("[ProjectMapView] Failed to refresh run projects:", err);
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

  const handleRemoveFilter = useCallback((filterKey) => {
    const filterResets = {
      status: "",
      permitStatus: "",
      welcomeCallStatus: "",
      dealer: "",
      state: "",
      orderReceived: { orderReceivedFrom: "", orderReceivedTo: "" },
      scheduled: { scheduledFrom: "", scheduledTo: "" },
      install: { installFrom: "", installTo: "" },
    };

    const reset = filterResets[filterKey];
    if (typeof reset === "object") {
      setFilters({ ...filters, ...reset });
    } else {
      setFilters({ ...filters, [filterKey]: reset });
    }
  }, [filters]);

  const handleRemoveRunFilter = useCallback((filterKey) => {
    if (filterKey === "status") {
      setRunFilters({ ...runFilters, status: "" });
    } else if (filterKey === "runDate") {
      setRunFilters({ ...runFilters, runDateFrom: "", runDateTo: "" });
    }
  }, [runFilters]);

  const dealers = useMemo(() => projects.map((p) => p.dealer).filter(Boolean), [projects]);
  const projectStates = useMemo(() => projects.map((p) => p.state_code).filter(Boolean), [projects]);

  // Helper to extract calendar date (YYYY-MM-DD) from any date value
  const toDateString = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      // If it's already a string, extract just the date part (YYYY-MM-DD)
      return value.split('T')[0];
    }
    const d = new Date(value);
    return d.toISOString().split('T')[0];
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Single-select scalar filters
      if (filters.status && String(p.status_id) !== filters.status) {
        return false;
      }
      if (filters.permitStatus && String(p.permit_status_id) !== filters.permitStatus) {
        return false;
      }
      if (filters.welcomeCallStatus && String(p.welcome_call_status_id) !== filters.welcomeCallStatus) {
        return false;
      }
      if (filters.dealer && p.dealer !== filters.dealer) {
        return false;
      }
      if (filters.state && p.state_code !== filters.state) {
        return false;
      }
      
      // Order Received date filter (compare calendar dates only)
      if (filters.orderReceivedFrom || filters.orderReceivedTo) {
        const projectDate = toDateString(p.order_received_at);
        if (projectDate) {
          if (filters.orderReceivedFrom && projectDate < filters.orderReceivedFrom) return false;
          if (filters.orderReceivedTo && projectDate > filters.orderReceivedTo) return false;
        } else if (filters.orderReceivedFrom || filters.orderReceivedTo) {
          return false;
        }
      }
      
      // Scheduled date filter (compare calendar dates only)
      if (filters.scheduledFrom || filters.scheduledTo) {
        const projectDate = toDateString(p.scheduled_project_start);
        if (projectDate) {
          if (filters.scheduledFrom && projectDate < filters.scheduledFrom) return false;
          if (filters.scheduledTo && projectDate > filters.scheduledTo) return false;
        } else if (filters.scheduledFrom || filters.scheduledTo) {
          return false;
        }
      }
      
      // Install date filter (compare calendar dates only)
      if (filters.installFrom || filters.installTo) {
        const projectDate = toDateString(p.install_start);
        if (projectDate) {
          if (filters.installFrom && projectDate < filters.installFrom) return false;
          if (filters.installTo && projectDate > filters.installTo) return false;
        } else if (filters.installFrom || filters.installTo) {
          return false;
        }
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
      setSearchResults(matched.length > 0 ? matched : null); // This is for the filter search (project list)
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

  // Filter runs by search and filters
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Status filter
      if (
        runFilters.status &&
        run.status !== runFilters.status
      ) {
        return false;
      }

      // Run date range filter
      const runDate = toDateString(run.run_date);
      if (
        runFilters.runDateFrom &&
        runDate &&
        runDate < runFilters.runDateFrom
      ) {
        return false;
      }

      if (
        runFilters.runDateTo &&
        runDate &&
        runDate > runFilters.runDateTo
      ) {
        return false;
      }

      // Search filter
      if (runSearch) {
        const q = runSearch.toLowerCase();
        const searchable = [
          run.run_name,
          run.proj_s_origin_addresses?.origin_name,
          run.team_assigned,
          run.vehicle_assigned,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [runs, runFilters, runSearch]);

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

  const handleMapRightClick = async (lng, lat) => {
    setTempMarker({ lat, lng, loading: true, error: null });
    
    const addressData = await reverseGeocode(lat, lng);
    
    // Validate address data - must have formatted_address and address_line_1
    const isValidAddress = addressData && 
                          addressData.formatted_address && 
                          addressData.address_line_1;
    
    if (isValidAddress) {
      // Preserve the exact clicked coordinates as the site location.
      // The reverse geocoder's coordinates go into address_* fields only.
      setInitialLocation({
        formatted_address: addressData.formatted_address,
        address_line_1: addressData.address_line_1,
        city: addressData.city,
        state: addressData.state,
        state_code: addressData.state_code,
        postal_code: addressData.postal_code,
        country: addressData.country,
        address_latitude: addressData.latitude,
        address_longitude: addressData.longitude,
        site_latitude: lat,   // Exact position where the user clicked
        site_longitude: lng,  // Exact position where the user clicked
        location_source: "map_click",
        location_confirmed: true,
      });
      setShowAddForm(true);
    } else {
      // Invalid location - clear temp marker and show error
      setTempMarker(null);
      toastError("No address detected. Please select a valid location.", "Location");
    }
  };

  const handleMapSearchChange = (query, results) => {
    setSearchQuery(query);
    setMapSearchResults(results || []);
  };

  const handleMapSearchSelect = (result) => {
    if (!result) {
      // Cancellation - clear everything
      setSearchMarker(null);
      setSearchQuery("");
      setMapSearchResults([]);
      return;
    }

    setSearchMarker({
      lat: result.latitude,
      lng: result.longitude,
      data: result,
    });
    
    // Clear the map search results after selection
    setMapSearchResults([]);
  };

  const clearMapSearch = () => {
    setSearchMarker(null);
    setSearchQuery("");
    setMapSearchResults([]);
  };

  const handleSearchMarkerClick = (data) => {
    // If data is null, it's a cancellation request
    if (!data) {
      setSearchMarker(null);
      return;
    }

    // For search results, the searched location IS the exact site location,
    // so both site and address coordinates are the same.
    setInitialLocation({
      formatted_address: data.formatted_address,
      address_line_1: data.address_line_1,
      city: data.city,
      state: data.state,
      state_code: data.state_code,
      postal_code: data.postal_code,
      country: data.country,
      address_latitude: data.latitude,
      address_longitude: data.longitude,
      site_latitude: data.latitude,
      site_longitude: data.longitude,
      location_source: "map_click",
      location_confirmed: true,
    });
    setShowAddForm(true);
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

  const handleSaved = () => { setShowAddForm(false); setEditingProject(null); setInitialLocation(null); setTempMarker(null); clearMapSearch(); router.refresh(); };
  const handleCloseForm = () => { setShowAddForm(false); setEditingProject(null); setInitialLocation(null); setTempMarker(null); clearMapSearch(); };

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
    console.log("[DEBUG] handleSelectRun:", id);
    const requestId = ++runRequestIdRef.current;
    setIsLoadingRunDetails(true);
    setSelectedRunId(id);
    setSelectedProjectId(null);
    setRunProjects([]);
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
      await refreshRunProjects();
    } catch (err) {
      console.error("[ProjectMapView] Failed to refresh run data:", err);
    }
  }, [selectedRunId, refreshRuns, refreshRunProjects, clearRunState]);

  const handleAddProjectToRun = async (projectId) => {
    if (!selectedRunId) return;
    setBusy(true);
    try {
      await addProjectToRun(selectedRunId, projectId, runProjects.length);
      toastSuccess("Project added to run.", "Runs");
      await refreshRunData();
      await refreshRunProjects();
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
      await refreshRunProjects();
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
      await refreshRunProjects();
    } catch (err) {
      toastError(err?.message || "Failed to reorder stops.", "Runs");
    } finally { setBusy(false); }
  };

  // Clear selected run if it's no longer in filtered list
  useEffect(() => {
    if (selectedRunId && !filteredRuns.find((r) => r.id === selectedRunId)) {
      setSelectedRunId(null);
      setRunProjects([]);
      setRunRouteData(null);
      setRunSegmentData(null);
    }
  }, [filteredRuns, selectedRunId]);

  // Load run details when selected — with race condition protection
  useEffect(() => {
    console.log("[DEBUG] loadRunDetails effect:", selectedRunId);
    if (!selectedRunId) { 
      console.log("[DEBUG] No selectedRunId, clearing runProjects");
      setRunProjects([]); 
      setIsLoadingRunDetails(false);
      return; 
    }
    const requestId = ++runRequestIdRef.current;
    let cancelled = false;
    setIsLoadingRunDetails(true);
    setBusy(true);
    loadRunDetails(selectedRunId)
      .then((details) => { 
        console.log("[DEBUG] loadRunDetails result:", details); 
        if (!cancelled && requestId === runRequestIdRef.current) {
          setRunProjects(details.projects || []); 
        }
      })
      .catch((err) => { 
        console.error("[DEBUG] loadRunDetails error:", err);
        if (!cancelled && requestId === runRequestIdRef.current) {
          toastError(err?.message || "Failed to load run details.", "Runs"); 
        }
      })
      .finally(() => { 
        if (!cancelled && requestId === runRequestIdRef.current) {
          setBusy(false); 
          setIsLoadingRunDetails(false);
        }
      });
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
    const distMi = (routeData.distance / 1609.344).toFixed(1);
    const mins = Math.round(routeData.duration / 60);
    return { distance: `${distMi} mi`, duration: `${mins} min${mins !== 1 ? "s" : ""}` };
  }, [routeData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden", height: "100vh" }}>
      <div style={{ padding: "2px 10px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#1e293b", lineHeight: "1.2" }}>Projects Map</h2>
          <p style={{ margin: "1px 0 0", fontSize: "9px", color: "#64748b", lineHeight: "1.2" }}>View and track project locations, schedules, and statuses on an interactive map.</p>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#1e293b", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
          Show Labels
        </label>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
        <button onClick={() => setMode("projects")} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: mode === "projects" ? 600 : 400, border: "none", borderBottom: mode === "projects" ? "2px solid #1e293b" : "2px solid transparent", background: mode === "projects" ? "#f8fafc" : "#fff", color: mode === "projects" ? "#1e293b" : "#64748b", cursor: "pointer" }}>Projects</button>
        <button onClick={() => setMode("runs")} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: mode === "runs" ? 600 : 400, border: "none", borderBottom: mode === "runs" ? "2px solid #1e293b" : "2px solid transparent", background: mode === "runs" ? "#f8fafc" : "#fff", color: mode === "runs" ? "#1e293b" : "#64748b", cursor: "pointer" }}>Runs</button>
      </div>

      {mode === "projects" ? (
        <FilterBar statuses={statuses} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} dealers={dealers} states={projectStates} filters={filters} onFilterChange={setFilters} onAddClick={() => { setEditingProject(null); setShowAddForm(true); }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="🔍 Search runs..."
            value={runSearch}
            onChange={(e) => setRunSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px solid #e2e8f0",
              borderRadius: "3px",
              outline: "none",
            }}
          />
          <RunFilterPanel runFilters={runFilters} onFilterChange={setRunFilters} />
          <button onClick={() => { setEditingRun(null); setShowRunForm(true); }} style={{ padding: "3px 10px", fontSize: "12px", borderRadius: "3px", border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>+ New Run</button>
        </div>
      )}

      {mode === "projects" && (
        <FilterChips filters={filters} onRemoveFilter={handleRemoveFilter} statuses={statuses} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} />
      )}

      {mode === "runs" && (
        <RunFilterChips runFilters={runFilters} onRemoveFilter={handleRemoveRunFilter} />
      )}

      {mode === "projects" && (
        <div style={{ padding: "4px 10px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <MapSearch 
            value={searchQuery} 
            onChange={handleMapSearchChange} 
            onSelect={handleMapSearchSelect} 
            results={mapSearchResults}
          />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        <div style={{ width: "240px", minWidth: "240px", flexShrink: 0, zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mode === "projects" ? (
            <ProjectList projects={projects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} filters={filters} statuses={statuses} />
          ) : (
            <RunList runs={filteredRuns} selectedRunId={selectedRunId} onSelectRun={handleSelectRun} isLoading={isLoadingRunDetails} />
          )}
        </div>

        <div style={{ flex: 1, position: "relative", minHeight: 0, minWidth: 0 }}>
          <ProjectMap projects={projects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} filters={filters} selectedOrigin={selectedOrigin} routeData={routeData} stateColorLookup={stateColorLookup} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} searchResults={searchResults} mode={mode} runs={runs} selectedRunId={selectedRunId} runProjects={runProjects} runRouteData={runRouteData} onAddToRun={handleAddProjectToRun} onRemoveFromRun={handleRemoveProjectFromRun} projectRunLookup={projectRunLookup} showLabels={showLabels} onMapRightClick={handleMapRightClick} tempMarker={tempMarker} searchMarker={searchMarker} onSearchMarkerClick={handleSearchMarkerClick} />
        </div>

        {mode === "projects" && selectedProject && (
          <ProjectDetailDrawer project={selectedProject} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} projectRunLookup={projectRunLookup} onClose={handleCloseDrawer} onEdit={handleEdit} onDelete={() => setConfirmDeleteId(selectedProject.id)} routeInfo={routeInfo} />
        )}
        {mode === "runs" && selectedRun && (
          <RunDetailPanel run={selectedRun} runProjects={runProjects} runSegmentData={runSegmentData} onClose={handleCloseRunDetail} onEdit={handleEditRun} onDelete={() => setConfirmDeleteRunId(selectedRun.id)} onRemoveProject={handleRemoveProjectFromRun} onReorderStops={handleReorderStops} onRecalculate={handleRecalculate} recalculating={recalculating} onEditStopNote={handleEditStopNote} isLoading={isLoadingRunDetails} />
        )}
      </div>

      {mode === "projects" && (
        <AddProjectForm show={showAddForm} mode={editingProject ? "edit" : "add"} project={editingProject} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} onClose={handleCloseForm} onSaved={handleSaved} initialLocation={initialLocation} />
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
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Remarks</label>
              <textarea value={editingStopNote.notes} onChange={(e) => setEditingStopNote({ ...editingStopNote, notes: e.target.value })} style={{ width: "100%", minHeight: "80px", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "6px 8px", fontSize: "12px", resize: "vertical" }} placeholder="Add remarks for this stop..." />
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