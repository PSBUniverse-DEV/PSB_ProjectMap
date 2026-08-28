"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, toastError, toastSuccess } from "@/shared/components/ui";
import { startNavbarLoader } from "@/shared/utils/navbar-loader";
import { deleteProject, calculateRoute, calculateMultiStopRoute, deleteRun, removeProjectFromRun, loadRunDetails, updateStopSequence, addProjectToRun, updateRun, updateProject, getProjectRunAssignment, updateStopNote, updateRunStopsCount, loadProjects, loadRuns, loadAllRunProjects } from "../data/projectMap.actions";
import { computeRunSegmentData } from "../utils/runSegments";
import { reverseGeocode } from "../utils/geocoding";
import { useProjectMapRealtime } from "../hooks/useProjectMapRealtime";
import { useProjectMapPolling } from "../hooks/useProjectMapPolling";
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
import RunStatusTabs from "../components/RunStatusTabs";
import ProjectStatusTabs from "../components/ProjectStatusTabs";
// Stable empty filter object handed to ProjectMap while on the Runs tab.
// ProjectMap applies whatever filters object it receives to its pins; on the
// Runs tab the run status tabs must govern the map instead, so the project
// filters are replaced with this empty object. Defined at module level so its
// identity never changes between renders (keeps ProjectMap's memoized pin
// filtering from re-running needlessly).
const EMPTY_PROJECT_FILTERS = Object.freeze({});


export default function ProjectMapView({ projects: initialProjects = [], statuses = [], origins = [], states = [], runs: initialRuns = [], buildingCategories = [], permitStatuses = [], welcomeCallStatuses = [], runStatuses = [] }) {
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
  const [projects, setProjects] = useState(initialProjects);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

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
  const [editingStopDate, setEditingStopDate] = useState(null);
  const [editingStopInvoice, setEditingStopInvoice] = useState(null);
  const [editingProjectPrice, setEditingProjectPrice] = useState(null);
  const [priceValue, setPriceValue] = useState("");
  const [allRunProjects, setAllRunProjects] = useState([]);
  const [runFilters, setRunFilters] = useState({ status: ["Scheduled"] });
  const [runSearch, setRunSearch] = useState("");
  const [isLoadingRunDetails, setIsLoadingRunDetails] = useState(false);
  const [runReloadKey, setRunReloadKey] = useState(0);
  const runRequestIdRef = useRef(0);
  const runProjectsRef = useRef([]);
  const runSelectionInProgressRef = useRef(false);

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

  // Single source of truth: projectId -> { run, runProjectId, stopSequence }.
  // runProjectId is the proj_t_run_projects row id — the key that
  // removeProjectFromRun / updateStopSequence expect, so unassign flows can
  // resolve it from the project alone.
  const projectRunLookup = useMemo(() => {
    const lookup = new Map();
    allRunProjects.forEach((rp) => {
      const run = runs.find((r) => r.id === rp.run_id);
      if (run) {
        lookup.set(rp.project_id, {
          run,
          runProjectId: rp.id,
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

  const handleRemoveFilter = useCallback((filterKey, value) => {
    // Called with a specific value: remove just that value from a multi-select
    // filter array (permitStatus, welcomeCallStatus, dealer, state), leaving
    // any other selected values in place.
    if (value !== undefined) {
      setFilters((prev) => ({
        ...prev,
        [filterKey]: (prev[filterKey] || []).filter((v) => v !== value),
      }));
      return;
    }

    const filterResets = {
      status: [],
      permitStatus: [],
      welcomeCallStatus: [],
      dealer: [],
      state: [],
      orderReceived: { orderReceivedFrom: "", orderReceivedTo: "" },
      scheduled: { scheduledFrom: "", scheduledTo: "" },
      install: { installFrom: "", installTo: "" },
    };

    const reset = filterResets[filterKey];
    if (reset && typeof reset === "object" && !Array.isArray(reset)) {
      setFilters({ ...filters, ...reset });
    } else {
      setFilters({ ...filters, [filterKey]: reset });
    }
  }, [filters]);

  // Toggles a project status in the status-tabs multi-select filter. Clicking
  // an already-selected tab deselects it; clicking "All" (empty statusId)
  // clears every selection. `filters.status` is now an array of status id
  // strings, OR'd together in filteredProjects/ProjectList/ProjectMap.
  const handleProjectStatusSelect = useCallback((statusId) => {
    setFilters((prev) => {
      if (!statusId) {
        return { ...prev, status: [] };
      }
      const current = prev.status || [];
      const next = current.includes(statusId)
        ? current.filter((s) => s !== statusId)
        : [...current, statusId];
      return { ...prev, status: next };
    });
  }, []);

  const handleRemoveRunFilter = useCallback((filterKey) => {
    if (filterKey === "status") {
      setRunFilters({ ...runFilters, status: [] });
    } else if (filterKey === "runDate") {
      setRunFilters({ ...runFilters, runDateFrom: "", runDateTo: "" });
    }
  }, [runFilters]);

  const handleRunStatusSelect = useCallback((statusName) => {
    setRunFilters((prev) => {
      if (!statusName) {
        return { ...prev, status: [] };
      }
      const current = prev.status || [];
      const next = current.includes(statusName)
        ? current.filter((s) => s !== statusName)
        : [...current, statusName];
      return { ...prev, status: next };
    });
  }, []);

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
      // Multi-select status filter — OR across selected statuses.
      if (Array.isArray(filters.status) && filters.status.length > 0 && !filters.status.includes(String(p.status_id))) {
        return false;
      }
      if (Array.isArray(filters.permitStatus) && filters.permitStatus.length > 0 && !filters.permitStatus.includes(String(p.permit_status_id))) {
        return false;
      }
      if (Array.isArray(filters.welcomeCallStatus) && filters.welcomeCallStatus.length > 0 && !filters.welcomeCallStatus.includes(String(p.welcome_call_status_id))) {
        return false;
      }
      if (Array.isArray(filters.dealer) && filters.dealer.length > 0 && !filters.dealer.includes(p.dealer)) {
        return false;
      }
      if (Array.isArray(filters.state) && filters.state.length > 0 && !filters.state.includes(p.state_code)) {
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
      // Multi-select status filter — OR across selected statuses.
      if (
        Array.isArray(runFilters.status) &&
        runFilters.status.length > 0 &&
        !runFilters.status.includes(run.status)
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

  // ---------------------------------------------------------------------------
  // Which projects get map pins, depending on the active tab.
  //
  // Projects tab: pass every project through unchanged — ProjectMap applies the
  // project filters (status tabs, permit, dealer, dates, ...) to the pins.
  //
  // Runs tab: the RUN status tabs govern the map, overriding the project
  // status filter. A project shows a pin when either:
  //   1. It has NO assigned run yet — always visible, regardless of the run
  //      status filter or the selected run. Business rule: the Runs tab is
  //      where unscheduled projects get assigned to runs, so hiding them would
  //      make that impossible (right-click an unassigned pin → "Add to Run").
  //   2. Its assigned run's status matches the selected run statuses (same
  //      multi-select OR rule as filteredRuns above). With no statuses
  //      selected ("All" tab) every run matches, so all assigned projects show.
  //
  // While a run IS selected, the map focuses on that run: its own stop pins
  // stay (the route line and the "Remove from Run" right-click need them) and
  // unassigned pins stay (the add candidates), but pins belonging to OTHER
  // runs are hidden so the map shows only what this run could look like.
  // ---------------------------------------------------------------------------
  const mapProjects = useMemo(() => {
    if (mode !== "runs") return projects;
    const selectedStatuses = Array.isArray(runFilters.status) ? runFilters.status : [];
    return projects.filter((p) => {
      const assignment = projectRunLookup.get(p.id);
      if (!assignment) return true; // unassigned — always visible for run assignment
      if (selectedRunId) {
        // A run is open: keep its own stops, hide every other run's pins.
        return assignment.run.id === selectedRunId;
      }
      if (selectedStatuses.length === 0) return true; // "All" — every run matches
      return selectedStatuses.includes(assignment.run.status);
    });
  }, [mode, projects, runFilters.status, projectRunLookup, selectedRunId]);

  // Project filters for the map. On the Runs tab the map ignores the project
  // filters entirely (the run status tabs override them) — ProjectMap receives
  // an empty filter object there. See mapProjects above for the full rule.
  const mapFilters = mode === "runs" ? EMPTY_PROJECT_FILTERS : filters;

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

  const handleSaved = async () => {
    setShowAddForm(false);
    setEditingProject(null);
    setInitialLocation(null);
    setTempMarker(null);
    clearMapSearch();
    if (editingProject?.id && selectedRunId) {
      await refreshRunData();
    }
    router.refresh();
  };

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
      const data = await computeRunSegmentData(selectedRun, freshProjects);
      if (!data) {
        toastError("Not enough valid coordinates to calculate a route.", "Recalculate"); return;
      }
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
          arrivalUpdates.push(updateStopSequence(rp.id, i));
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

  const handleRunStatusChange = useCallback(async (newStatus) => {
    if (!selectedRunId) return;
    try {
      const updatedRun = await updateRun(selectedRunId, { status: newStatus });

      // When the run cascade fires, updateRun reports which projects it moved
      // to "Fully Installed". Patch local projects state so the project list,
      // map pins, and detail drawer update immediately — same targeted-patch
      // pattern as the stop note/date/invoice handlers, no full reload.
      if (updatedRun?._cascadedProjectIds?.length) {
        // The list/map/drawer read the label from the nested relation first,
        // so patch both the status FK and the joined status object.
        const cascadedStatus =
          statuses.find((s) => s.status_id === updatedRun._cascadedStatusId) || null;
        setProjects((prev) =>
          prev.map((p) =>
            updatedRun._cascadedProjectIds.includes(p.id)
              ? {
                  ...p,
                  status_id: updatedRun._cascadedStatusId,
                  proj_s_project_status: cascadedStatus ?? p.proj_s_project_status,
                }
              : p
          )
        );
      }

      await refreshRuns();
      toastSuccess("Run status updated.", "Runs");
    } catch (err) {
      console.error("[ProjectMapView] Failed to update run status:", err);
      toastError(err?.message || "Failed to update run status.", "Runs");
      throw err; // rethrow so RunDetailPanel keeps its editor open for retry
    }
  }, [selectedRunId, refreshRuns, statuses]);

  const handleSelectRun = (id) => {
    console.log("[DEBUG] handleSelectRun:", id);
    setIsLoadingRunDetails(true);
    setSelectedRunId(id);
    setSelectedProjectId(null);
    setRunProjects([]);
    setRunRouteData(null);
    setRunSegmentData(null);
    setRunRouteLoading(false);
    setRunReloadKey((k) => k + 1);
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

  // Re-fetches the project list from the database. The page's initial list
  // comes from the server component, so this is the only way to refresh it
  // from the browser (pins, project list, and the detail drawer all render
  // from the `projects` state).
  const refreshProjects = useCallback(async () => {
    try {
      const freshProjects = await loadProjects();
      setProjects(freshProjects);
    } catch (err) {
      console.error("[ProjectMapView] Failed to refresh projects:", err);
    }
  }, []);

  // One sync pass triggered by useProjectMapRealtime whenever ANY user
  // (including this one on another tab) changes a project, a run, or a run
  // assignment. Refreshes everything the UI renders from:
  //   - projects      → map pins (Projects tab), project list, detail drawer
  //   - runs          → runs list, status tabs, run panel header
  //   - run assignments → Assigned Run lookups, Runs-tab pin rules
  // When a run is open, refreshRunData additionally reloads its stop list and
  // route line — and it already refreshes runs + assignments itself, so the
  // else-branch skips them to avoid double-fetching.
  const handleRemoteSync = useCallback(async () => {
    await refreshProjects();
    if (selectedRunId) {
      await refreshRunData();
    } else {
      await Promise.all([refreshRuns(), refreshRunProjects()]);
    }
  }, [selectedRunId, refreshProjects, refreshRuns, refreshRunProjects, refreshRunData]);

  // Live multi-user sync (Supabase Realtime). No-op when the connection
  // cannot be established — see the hook's docs for the failure modes.
  useProjectMapRealtime(handleRemoteSync);

  // Polling safety net: if realtime is unavailable (CHANNEL_ERROR, network
  // blocking websockets, RLS pending), changes are still picked up within
  // ~30 seconds. Runs alongside realtime on purpose — when realtime is
  // healthy, polling only rarely fires as a catch-up.
  useProjectMapPolling(handleRemoteSync);

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

  // Unassign entry point for the Project Detail Drawer's "×" button, keyed by
  // PROJECT id (the drawer doesn't know the run-project row id). Resolves the
  // row id from projectRunLookup and reuses handleRemoveProjectFromRun — the
  // exact same action, toasts and refreshes the Runs tab uses — so every
  // unassign path stays in sync.
  const handleRemoveProjectFromRunById = async (projectId) => {
    const assignment = projectRunLookup.get(projectId);
    if (!assignment?.runProjectId) return;
    await handleRemoveProjectFromRun(assignment.runProjectId);
  };

  const handleEditStopNote = (runProject) => {
    const proj = runProject.proj_t_projects || {};
    setEditingStopNote({
      runProjectId: runProject.id,
      projectId: runProject.project_id,
      notes: runProject.notes || "",
      clientName: proj.client_name || "Untitled",
    });
  };

  const handleSaveStopNote = async () => {
    if (!editingStopNote) return;
    setBusy(true);
    try {
      await updateStopNote(editingStopNote.runProjectId, editingStopNote.notes);
      toastSuccess("Stop note saved.", "Runs");
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === editingStopNote.projectId
            ? { ...project, project_notes: editingStopNote.notes }
            : project
        )
      );
      setRunProjects((currentRunProjects) =>
        currentRunProjects.map((rp) =>
          rp.id === editingStopNote.runProjectId
            ? {
                ...rp,
                notes: editingStopNote.notes,
                proj_t_projects: {
                  ...rp.proj_t_projects,
                  project_notes: editingStopNote.notes,
                },
              }
            : rp
        )
      );
      setEditingStopNote(null);
      await refreshRunData();
    } catch (err) {
      toastError(err?.message || "Failed to save stop note.", "Runs");
    } finally { setBusy(false); }
  };

  const handleEditStopDate = (runProject) => {
    const proj = runProject.proj_t_projects || {};
    // datetime-local inputs require "YYYY-MM-DDTHH:mm" with no seconds/offset
    const toLocalInput = (val) => {
      if (!val) return "";
      return String(val).slice(0, 16);
    };
    setEditingStopDate({
      projectId: runProject.project_id,
      clientName: proj.client_name || "Untitled",
      installStart: toLocalInput(proj.install_start),
      installEnd: toLocalInput(proj.install_end),
    });
  };

  const handleSaveStopDate = async () => {
    if (!editingStopDate) return;
    setBusy(true);
    try {
      await updateProject(editingStopDate.projectId, {
        install_start: editingStopDate.installStart || null,
        install_end: editingStopDate.installEnd || null,
        updated_by: null,
      });

      // Targeted local state patch so the UI reflects the change
      // immediately (button icon flips to "filled"), without a reload.
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingStopDate.projectId
            ? { ...p, install_start: editingStopDate.installStart || null, install_end: editingStopDate.installEnd || null }
            : p
        )
      );
      setRunProjects((prev) =>
        prev.map((rp) =>
          rp.project_id === editingStopDate.projectId
            ? { ...rp, proj_t_projects: { ...rp.proj_t_projects, install_start: editingStopDate.installStart || null, install_end: editingStopDate.installEnd || null } }
            : rp
        )
      );

      setEditingStopDate(null);
      toastSuccess("Arrival window updated.", "Runs");
    } catch (err) {
      toastError(err?.message || "Failed to update arrival window.", "Runs");
    } finally { setBusy(false); }
  };

  const handleEditStopInvoice = (runProject) => {
    const proj = runProject.proj_t_projects || {};
    setEditingStopInvoice({
      projectId: runProject.project_id,
      clientName: proj.client_name || runProject.clientName || "",
      invoiceNumber: proj.invoice_number || "",
    });
  };

  const handleSaveStopInvoice = async () => {
    if (!editingStopInvoice) return;
    setBusy(true);
    try {
      await updateProject(editingStopInvoice.projectId, {
        invoice_number: editingStopInvoice.invoiceNumber || null,
        updated_by: null,
      });

      // Targeted local state patch so the button's color/weight updates
      // immediately, without a full reload.
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingStopInvoice.projectId
            ? { ...p, invoice_number: editingStopInvoice.invoiceNumber || null }
            : p
        )
      );
      setRunProjects((prev) =>
        prev.map((rp) =>
          rp.project_id === editingStopInvoice.projectId
            ? { ...rp, proj_t_projects: { ...rp.proj_t_projects, invoice_number: editingStopInvoice.invoiceNumber || null } }
            : rp
        )
      );

      setEditingStopInvoice(null);
      toastSuccess("Invoice number updated.", "Runs");
    } catch (err) {
      toastError(err?.message || "Failed to update invoice number.", "Runs");
    } finally { setBusy(false); }
  };

  const handleEditProjectPrice = (runProject) => {
    const proj = runProject.proj_t_projects || {};
    setEditingProjectPrice({
      projectId: runProject.project_id,
      clientName: proj.client_name || "Untitled",
      currentPrice: proj.project_subtotal != null ? String(proj.project_subtotal) : "",
    });
    setPriceValue(proj.project_subtotal != null ? String(proj.project_subtotal) : "");
  };

  const handleSaveProjectPrice = async () => {
    if (!editingProjectPrice) return;
    setBusy(true);
    try {
      const numValue = parseFloat(priceValue);
      if (isNaN(numValue) || numValue < 0) {
        throw new Error("Please enter a valid price.");
      }

      await updateProject(editingProjectPrice.projectId, {
        project_subtotal: numValue,
        updated_by: null,
      });

      // Targeted local state patch
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProjectPrice.projectId
            ? { ...p, project_subtotal: numValue }
            : p
        )
      );
      setRunProjects((prev) =>
        prev.map((rp) =>
          rp.project_id === editingProjectPrice.projectId
            ? { ...rp, proj_t_projects: { ...rp.proj_t_projects, project_subtotal: numValue } }
            : rp
        )
      );

      setEditingProjectPrice(null);
      setPriceValue("");
      toastSuccess("Project price updated.", "Runs");
    } catch (err) {
      toastError(err?.message || "Failed to update project price.", "Runs");
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
          // Do NOT clear isLoadingRunDetails here.
          // The route calculation effect will clear it when map processing completes,
          // keeping the drawer loading until both backend data AND map routes are ready.
        }
      });
    return () => { cancelled = true; };
  }, [selectedRunId, runReloadKey]);

  // Calculate multi-stop route for runs
  useEffect(() => {
    if (mode !== "runs" || !selectedRunId || runProjects.length === 0) {
      setRunRouteData(null); setRunSegmentData(null);
      // No projects → no route to calculate — clear loading immediately
      setIsLoadingRunDetails(false);
      return;
    }
    const origin = selectedRun?.proj_s_origin_addresses;
    if (!origin || origin.latitude == null || origin.longitude == null) {
      setRunRouteData(null);
      // No usable origin coordinates → nothing to map — clear loading
      setIsLoadingRunDetails(false);
      return;
    }
    let cancelled = false;
    setRunRouteLoading(true);
    computeRunSegmentData(selectedRun, runProjects)
      .then((data) => {
        if (!cancelled) {
          if (!data) {
            setRunRouteData(null); setRunSegmentData(null); setRunRouteLoading(false); return;
          }
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
      .finally(() => {
        if (!cancelled) {
          setRunRouteLoading(false);
          // Route calculation is done — now the drawer can stop loading.
          // This ensures the drawer only shows content after BOTH the backend
          // data load AND the map route processing have completed.
          setIsLoadingRunDetails(false);
        }
      });
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
<button onClick={() => { startNavbarLoader(); router.push("/project-map/run-master"); }} style={{ padding: "6px 16px", fontSize: "12px", fontWeight: 400, border: "none", borderBottom: "2px solid transparent", background: "#fff", color: "#64748b", cursor: "pointer" }}>📋 Run Master List</button>
      </div>

      {mode === "projects" && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <ProjectStatusTabs
            statuses={statuses}
            selectedStatuses={filters.status || []}
            onSelectStatus={handleProjectStatusSelect}
          />
        </div>
      )}

      {mode === "runs" && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <RunStatusTabs
            runStatuses={runStatuses}
            selectedStatuses={runFilters.status || []}
            onSelectStatus={handleRunStatusSelect}
          />
        </div>
      )}

      {mode === "projects" ? (
        <div style={{ padding: "4px 10px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <MapSearch 
            value={searchQuery} 
            onChange={handleMapSearchChange} 
            onSelect={handleMapSearchSelect} 
            results={mapSearchResults}
          />
        </div>
      ) : (
        <div style={{ padding: "4px 10px", background: "#fff", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <input
            type="text"
            placeholder="🔍 Search runs..."
            value={runSearch}
            onChange={(e) => setRunSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 8px",
              fontSize: "12px",
              border: "1px solid #e2e8f0",
              borderRadius: "3px",
              outline: "none",
            }}
          />
        </div>
      )}

      {mode === "projects" && (
        <FilterChips filters={filters} onRemoveFilter={handleRemoveFilter} statuses={statuses} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} />
      )}

      {mode === "runs" && (
        <RunFilterChips runFilters={runFilters} onRemoveFilter={handleRemoveRunFilter} />
      )}

      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden", minHeight: 0 }}>
        <div style={{ width: "240px", minWidth: "240px", flexShrink: 0, zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {mode === "projects" ? (
            <>
              <FilterBar statuses={statuses} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} dealers={dealers} states={projectStates} filters={filters} onFilterChange={setFilters} onAddClick={() => { setEditingProject(null); setShowAddForm(true); }} />
              <ProjectList projects={projects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} filters={filters} statuses={statuses} />
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 10px", borderBottom: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
                <RunFilterPanel runFilters={runFilters} onFilterChange={setRunFilters} runStatuses={runStatuses} />
                <button onClick={() => { setEditingRun(null); setShowRunForm(true); }} style={{ padding: "3px 10px", fontSize: "12px", borderRadius: "3px", border: "none", background: "#16a34a", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>+ New Run</button>
              </div>
              <RunList runs={filteredRuns} selectedRunId={selectedRunId} onSelectRun={handleSelectRun} isLoading={isLoadingRunDetails} />
            </>
          )}
        </div>

        <div style={{ flex: 1, position: "relative", minHeight: 0, minWidth: 0 }}>
          <ProjectMap projects={mapProjects} selectedProjectId={selectedProjectId} onSelectProject={handleSelectProject} filters={mapFilters} selectedOrigin={selectedOrigin} routeData={routeData} stateColorLookup={stateColorLookup} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} searchResults={searchResults} mode={mode} runs={runs} selectedRunId={selectedRunId} runProjects={runProjects} runRouteData={runRouteData} onAddToRun={handleAddProjectToRun} onRemoveFromRun={handleRemoveProjectFromRun} projectRunLookup={projectRunLookup} showLabels={showLabels} onMapRightClick={handleMapRightClick} tempMarker={tempMarker} searchMarker={searchMarker} onSearchMarkerClick={handleSearchMarkerClick} />
        </div>

        {mode === "projects" && selectedProject && (
          <ProjectDetailDrawer project={selectedProject} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} projectRunLookup={projectRunLookup} onClose={handleCloseDrawer} onEdit={handleEdit} onDelete={() => setConfirmDeleteId(selectedProject.id)} onRemoveFromRun={handleRemoveProjectFromRunById} routeInfo={routeInfo} />
        )}
        {mode === "runs" && selectedRun && (
          <RunDetailPanel run={selectedRun} runProjects={runProjects} runSegmentData={runSegmentData} onClose={handleCloseRunDetail} onEdit={handleEditRun} onDelete={() => setConfirmDeleteRunId(selectedRun.id)} onRemoveProject={handleRemoveProjectFromRun} onReorderStops={handleReorderStops} onRecalculate={handleRecalculate} recalculating={recalculating} onEditStopNote={handleEditStopNote} onEditStopDate={handleEditStopDate} onEditStopInvoice={handleEditStopInvoice} onEditProjectPrice={handleEditProjectPrice} isLoading={isLoadingRunDetails} runStatuses={runStatuses} onStatusChange={handleRunStatusChange} />
        )}
      </div>

      {mode === "projects" && (
        <AddProjectForm show={showAddForm} mode={editingProject ? "edit" : "add"} project={editingProject} statuses={statuses} buildingCategories={buildingCategories} permitStatuses={permitStatuses} welcomeCallStatuses={welcomeCallStatuses} onClose={handleCloseForm} onSaved={handleSaved} initialLocation={initialLocation} />
      )}

      {mode === "runs" && (
        <RunForm show={showRunForm} mode={editingRun ? "edit" : "add"} run={editingRun} origins={origins} runStatuses={runStatuses} onClose={handleCloseRunForm} onSaved={handleRunSaved} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Project</label>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{editingStopNote.clientName}</div>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Remarks</label>
              <textarea value={editingStopNote.notes} onChange={(e) => setEditingStopNote({ ...editingStopNote, notes: e.target.value })} style={{ width: "100%", minHeight: "80px", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "6px 8px", fontSize: "12px", resize: "vertical" }} placeholder="Add remarks for this stop..." />
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setEditingStopNote(null)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={handleSaveStopNote}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal show={!!editingStopDate} onHide={() => setEditingStopDate(null)} title="Arrival Window">
        {editingStopDate && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Project</label>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{editingStopDate.clientName}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Arrival From</label>
                <input
                  type="datetime-local"
                  value={editingStopDate.installStart}
                  onChange={(e) => setEditingStopDate({ ...editingStopDate, installStart: e.target.value })}
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Arrival By</label>
                <input
                  type="datetime-local"
                  value={editingStopDate.installEnd}
                  onChange={(e) => setEditingStopDate({ ...editingStopDate, installEnd: e.target.value })}
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setEditingStopDate(null)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={handleSaveStopDate}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal show={!!editingStopInvoice} onHide={() => setEditingStopInvoice(null)} title="Invoice Number">
        {editingStopInvoice && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Project</label>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{editingStopInvoice.clientName}</div>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Invoice #</label>
              <input
                type="text"
                value={editingStopInvoice.invoiceNumber}
                onChange={(e) => setEditingStopInvoice({ ...editingStopInvoice, invoiceNumber: e.target.value })}
                style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
                placeholder="Invoice number"
              />
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setEditingStopInvoice(null)}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={handleSaveStopInvoice}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal show={!!editingProjectPrice} onHide={() => setEditingProjectPrice(null)} title="Project Price">
        {editingProjectPrice && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Project</label>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>{editingProjectPrice.clientName}</div>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "3px" }}>Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder="0.00"
                style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "4px 8px", fontSize: "12px" }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => { setEditingProjectPrice(null); setPriceValue(""); }}>Cancel</Button>
              <Button variant="primary" loading={busy} onClick={handleSaveProjectPrice}>Save</Button>
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