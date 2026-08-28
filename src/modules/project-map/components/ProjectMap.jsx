"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { formatProjectDescriptionForDisplay, stripTownshipLabel } from "../data/projectMap.data";

function getStatusColor(statusName, statuses = []) {
  if (!statusName) return "#6b7280";
  const found = statuses.find((s) => s.status_name === statusName);
  return found?.display_color || "#6b7280";
}

function getOrdinalStop(sequence) {
  if (sequence == null) return "";
  const n = Number(sequence) + 1; // 0-based to 1-based
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0];
  return `${n}${suffix} stop`;
}

export default function ProjectMap({
  projects = [],
  selectedProjectId,
  onSelectProject,
  filters = {},
  selectedOrigin = null,
  routeData = null,
  stateColorLookup = {},
  statuses = [],
  buildingCategories = [],
  permitStatuses = [],
  welcomeCallStatuses = [],
  searchResults = null,
  mode = "projects",
  runs = [],
  selectedRunId = null,
  runProjects = [],
  runRouteData = null,
  onAddToRun = null,
  onRemoveFromRun = null,
  projectRunLookup = new Map(),
  showLabels = true,
  onMapRightClick = null,
  tempMarker = null,
  searchMarker = null,
  onSearchMarkerClick = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersMapRef = useRef({}); // id -> { marker, persistentPopup, hoverPopup }
  const originMarkerRef = useRef(null);
  const routeSourceRef = useRef("route-line");
  const initialFitDone = useRef(false);
  // Signature of the last route the map auto-fitted to. Without this, every
  // data refresh (realtime sync, 30s polling, any refetch producing new array
  // identities) re-ran fitBounds and yanked the viewport back to the run
  // while the user was panning. The map should only re-fit when the route
  // meaningfully changes — not when identical data is refetched.
  const lastRouteFitSignatureRef = useRef("");
  const mapInitAttemptedRef = useRef(false);
  const contextMenuPopupRef = useRef(null);
  const tempMarkerRef = useRef(null);
  const isContextMenuOpenRef = useRef(false);
  const searchMarkerRef = useRef(null);
  const searchMarkerPopupRef = useRef(null);
  
  // Refs for closure-dependent values used in marker event handlers
  const modeRef = useRef(mode);
  const selectedRunIdRef = useRef(selectedRunId);
  const runProjectsRef = useRef(runProjects);
  const runsRef = useRef(runs);
  const onAddToRunRef = useRef(onAddToRun);
  const onRemoveFromRunRef = useRef(onRemoveFromRun);
  const projectRunLookupRef = useRef(projectRunLookup);
  const showLabelsRef = useRef(showLabels);
  const onSearchMarkerClickRef = useRef(onSearchMarkerClick);
  
  // Keep refs in sync with props
  modeRef.current = mode;
  selectedRunIdRef.current = selectedRunId;
  runProjectsRef.current = runProjects;
  runsRef.current = runs;
  onAddToRunRef.current = onAddToRun;
  onRemoveFromRunRef.current = onRemoveFromRun;
  projectRunLookupRef.current = projectRunLookup;
  showLabelsRef.current = showLabels;
  onSearchMarkerClickRef.current = onSearchMarkerClick;

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

  // Filter projects (memoized to avoid recreating on every render)
  const filteredProjects = useMemo(() => projects.filter((p) => {
    if (Array.isArray(filters.status) && filters.status.length > 0 && !filters.status.includes(String(p.status_id))) return false;
    if (Array.isArray(filters.permitStatus) && filters.permitStatus.length > 0 && !filters.permitStatus.includes(String(p.permit_status_id))) return false;
    if (Array.isArray(filters.welcomeCallStatus) && filters.welcomeCallStatus.length > 0 && !filters.welcomeCallStatus.includes(String(p.welcome_call_status_id))) return false;
    if (Array.isArray(filters.dealer) && filters.dealer.length > 0 && !filters.dealer.includes(p.dealer)) return false;
    if (Array.isArray(filters.state) && filters.state.length > 0 && !filters.state.includes(p.state_code)) return false;
    
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
  }), [projects, filters]);

  // Memoize OSM style
  const osmStyle = useMemo(() => ({
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  }), []);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || mapInitAttemptedRef.current) return;
    mapInitAttemptedRef.current = true;

    let map;
    try {
      map = new MapLibreGL.Map({
        container: mapContainerRef.current,
        style: osmStyle,
        center: [-98.5795, 39.8283],
        zoom: 3,
        failIfMajorPerformanceCaveat: false,
      });
    } catch (err) {
      console.error("[ProjectMap] Failed to initialize map:", err);
      return;
    }

    map.addControl(new MapLibreGL.NavigationControl(), "top-right");

    map.on("load", () => {
      try {
        const canvas = map.getCanvas();
        if (canvas) canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        map.addSource("route-line", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
        });

        map.addLayer({
          id: "route-line-layer",
          type: "line",
          source: "route-line",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1d4ed8",
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });

        // Close context menu when clicking on the map
        map.on("click", () => {
          if (contextMenuPopupRef.current && !isContextMenuOpenRef.current) {
            try {
              contextMenuPopupRef.current.remove();
            } catch (e) {}
            contextMenuPopupRef.current = null;
          }
          isContextMenuOpenRef.current = false;
        });

        // Right-click handler for adding project from map (only in projects mode)
        map.on("contextmenu", (e) => {
          // Only show "Add Project Here" in projects mode
          if (modeRef.current !== "projects") {
            return;
          }

          e.preventDefault();
          
          // Close any existing context menu
          if (contextMenuPopupRef.current) {
            try {
              contextMenuPopupRef.current.remove();
            } catch (ex) {}
            contextMenuPopupRef.current = null;
          }

          const { lng, lat } = e.lngLat;
          
          const menuContent = document.createElement("div");
          menuContent.style.cssText = `
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 0;
            font-size: 12px;
            color: #1e293b;
            box-shadow: 0 3px 14px rgba(0,0,0,0.18);
            min-width: 180px;
          `;
          
          menuContent.innerHTML = `
            <div style="padding: 6px 12px; cursor: pointer; color: #1e293b; font-weight: 500;" class="ctx-add-project">📍 Add Project Here</div>
          `;
          
          menuContent.querySelector(".ctx-add-project").addEventListener("click", () => {
            isContextMenuOpenRef.current = true;
            try {
              contextMenuPopupRef.current?.remove();
            } catch (ex) {}
            contextMenuPopupRef.current = null;
            
            if (onMapRightClick) {
              onMapRightClick(lng, lat);
            }
          });
          
          const popup = new MapLibreGL.Popup({
            anchor: "left",
            offset: [12, 0],
            closeButton: false,
            closeOnClick: true,
            className: "project-context-menu"
          })
            .setLngLat([lng, lat])
            .setDOMContent(menuContent)
            .addTo(map);
          
          isContextMenuOpenRef.current = true;
          contextMenuPopupRef.current = popup;
        });

      } catch (err) {
        console.error("[ProjectMap] Failed to add layers:", err);
      }
    });

    map.on("error", (e) => {
      if (e?.error?.message?.includes("WebGL")) {
        console.warn("[ProjectMap] WebGL error:", e.error.message);
      }
    });

    mapContainerRef.current.addEventListener("contextmenu", (e) => e.preventDefault());

    mapRef.current = map;

    return () => {
      Object.values(markersMapRef.current).forEach((bundle) => {
        try { bundle.persistentPopup?.remove(); } catch (e) {}
        try { bundle.hoverPopup?.remove(); } catch (e) {}
        try { bundle.marker?.remove(); } catch (e) {}
      });
      markersMapRef.current = {};
      originMarkerRef.current = null;
      try { tempMarkerRef.current?.remove(); } catch (e) {}
      tempMarkerRef.current = null;
      try { searchMarkerRef.current?.remove(); } catch (e) {}
      searchMarkerRef.current = null;
      try { searchMarkerPopupRef.current?.remove(); } catch (e) {}
      searchMarkerPopupRef.current = null;
      try { map.remove(); } catch (e) { }
      mapRef.current = null;
      initialFitDone.current = false;
      lastRouteFitSignatureRef.current = "";
      mapInitAttemptedRef.current = false;
    };
  }, [osmStyle]);

  // Update markers (plain MapLibre default markers, no custom HTML)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const newMarkersMap = {};
    const projectIds = new Set();

    filteredProjects.forEach((project) => {
      const id = project.id;
      projectIds.add(id);

      const lat = project.site_latitude ?? project.address_latitude;
      const lng = project.site_longitude ?? project.address_longitude;
      if (lat == null || lng == null) return;

      const statusName = project.proj_s_project_status?.status_name || "";
      const statusColor = getStatusColor(statusName, statuses);
      const stateColor = stateColorLookup[project.state_code] || statusColor;

      let marker = null;
      const existingBundle = markersMapRef.current[id];
      if (existingBundle) {
        // Clean up all popups and marker before rebuilding
        try { existingBundle.persistentPopup?.remove(); } catch (e) {}
        try { existingBundle.hoverPopup?.remove(); } catch (e) {}
        try { existingBundle.marker?.remove(); } catch (e) {}
      }
      
      // Close any open context menu
      try { contextMenuPopupRef.current?.remove(); } catch (e) {}
      contextMenuPopupRef.current = null;

      const assignment = projectRunLookupRef.current.get(id) || null;
      const assignedRun = assignment?.run || null;
      const stopSequence = assignment?.stopSequence;
      const assignedRunBase = assignedRun ? assignedRun.run_name || `Run #${assignedRun.run_number || assignedRun.id}` : null;
      const assignedRunLabel = assignedRunBase && stopSequence != null ? `${assignedRunBase} (${getOrdinalStop(stopSequence)})` : assignedRunBase;

      const subtotalStr = project.project_subtotal != null
        ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "";

      let addressDisplay = "";
      if (project.formatted_address) {
        addressDisplay = stripTownshipLabel(project.formatted_address);
      } else if (project.address_line_1 || project.city) {
        const parts = [project.address_line_1, stripTownshipLabel(project.city), project.state].filter(Boolean);
        addressDisplay = parts.join(", ");
      } else {
        addressDisplay = "No address";
      }

      // Lookup names for status chips
      const buildingCategoryName = buildingCategories.find((c) => c.id === project.building_category_id)?.building_category_name || "";
      const permitStatusNameVal = permitStatuses.find((s) => s.id === project.permit_status_id)?.status_name || "";
      const welcomeCallStatusNameVal = welcomeCallStatuses.find((s) => s.id === project.welcome_call_status_id)?.status_name || "";

      const formatDate = (val) => {
        if (!val) return "—";
        try {
          const d = new Date(val);
          return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
        } catch { return val; }
      };

      const projectNotes = project.project_notes || "";
      const truncatedNotes = projectNotes.length > 120 ? projectNotes.substring(0, 120) + "…" : projectNotes;

      // Native MapLibre marker with state color
      marker = new MapLibreGL.Marker({
        color: stateColor,
        scale: 0.9
      })
        .setLngLat([lng, lat])
        .addTo(map);

      // Persistent label popup (always visible)
      const labelContent = document.createElement("div");
      labelContent.style.cssText = `
        font-size: 9px;
        color: #1e293b;
        line-height: 1.4;
      `;
      labelContent.innerHTML = `
        <div style="font-weight: 600; line-height: 1.2;">${project.client_name || "Untitled"}</div>
        <div style="color: #16a34a; font-weight: 600; line-height: 1.2;">${subtotalStr || "—"}</div>
        ${assignedRunLabel ? `<div style="color: #6366f1; line-height: 1.2;">📦 ${assignedRunLabel}</div>` : ""}
        ${formatProjectDescriptionForDisplay(project.dimension) ? `<div style="line-height: 1.2;">${formatProjectDescriptionForDisplay(project.dimension)}</div>` : ""}
      `;

      const persistentPopup = new MapLibreGL.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        anchor: "right",
        offset: 10,
        className: "project-persistent-label"
      })
        .setLngLat([lng, lat])
        .setDOMContent(labelContent);
      
      // Only show persistent label if showLabels is true
      if (showLabelsRef.current) {
        persistentPopup.addTo(map);
      }

      // Detailed hover popup (existing)
      const tooltip = document.createElement("div");
      tooltip.style.cssText = `
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 11px;
        color: #1e293b;
        box-shadow: 0 3px 14px rgba(0,0,0,0.18);
        pointer-events: none;
        min-width: 220px;
        max-width: 280px;
        line-height: 1.4;
      `;

      tooltip.innerHTML = `
        <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: ${assignedRunLabel ? "4px" : "8px"}; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">${project.client_name || "Untitled"}</div>
        ${assignedRunLabel ? `<div style="font-size: 10px; color: #6366f1; font-weight: 500; margin-bottom: 8px;">📦 Run: ${assignedRunLabel}</div>` : ""}

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Customer Information</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Dealer</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.dealer || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Building Category</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${buildingCategoryName || "—"}</td></tr>
        </table>

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Project Information</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Address</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${addressDisplay || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Dimensions</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatProjectDescriptionForDisplay(project.dimension) || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">State</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.state || project.state_code ? `${project.state || ""}${project.state_code ? " (" + project.state_code + ")" : ""}` : "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Project Subtotal</td><td style="font-size: 10px; color: #16a34a; font-weight: 700; text-align: right; padding-bottom: 2px;">${subtotalStr || "—"}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Invoice #</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${project.invoice_number || "—"}</td></tr>
        </table>

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Workflow Status</div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
          <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${getStatusColor(statusName, statuses)}20; color: ${getStatusColor(statusName, statuses)}; border: 1px solid ${getStatusColor(statusName, statuses)}40;">${statusName || "—"}</span>
          <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${permitStatusNameVal ? "#6366f120" : "#6b728020"}; color: ${permitStatusNameVal ? "#6366f1" : "#6b7280"}; border: 1px solid ${permitStatusNameVal ? "#6366f140" : "#6b728040"};">${permitStatusNameVal || "—"}</span>
          <span style="font-size: 9px; padding: 1px 6px; border-radius: 8px; font-weight: 600; background: ${welcomeCallStatusNameVal ? "#0891b220" : "#6b728020"}; color: ${welcomeCallStatusNameVal ? "#0891b2" : "#6b7280"}; border: 1px solid ${welcomeCallStatusNameVal ? "#0891b240" : "#6b728040"};">${welcomeCallStatusNameVal || "—"}</span>
        </div>

        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.4px;">Schedule</div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: ${projectNotes ? "8px" : "0"};">
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Order Received</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.order_received_at)}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Arrival</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.install_start)}${project.install_end ? " → " + formatDate(project.install_end) : ""}</td></tr>
        </table>

        ${projectNotes ? `
        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.4px;">Remarks</div>
        <div style="font-size: 10px; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.4;">${truncatedNotes}</div>
        ` : ""}
      `;

      const hoverPopup = new MapLibreGL.Popup({ 
        anchor: "right",
        offset: 10,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip"
      }).setDOMContent(tooltip);

      const markerEl = marker.getElement();
      markerEl.addEventListener("mouseenter", () => {
        try { persistentPopup.getElement().style.display = "none"; } catch (e) {}
        try { hoverPopup.setLngLat(marker.getLngLat()).addTo(map); } catch (e) {}
      });

      markerEl.addEventListener("mouseleave", () => {
        try { hoverPopup.remove(); } catch (e) {}
        try { persistentPopup.getElement().style.display = ""; } catch (e) {}
      });

      markerEl.addEventListener("click", () => {
        try { hoverPopup.remove(); } catch (e) {}
        onSelectProject?.(project.id);
      });

      // Right-click context menu for Add/Remove from Run
      markerEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const currentMode = modeRef.current;
        const currentSelectedRunId = selectedRunIdRef.current;
        
        // Only show in Runs mode with a selected run
        if (currentMode !== "runs" || !currentSelectedRunId) return;
        
        // Close any existing context menu popup
        if (contextMenuPopupRef.current) {
          try { contextMenuPopupRef.current.remove(); } catch (ex) {}
          contextMenuPopupRef.current = null;
        }
        
        const assignment = projectRunLookupRef.current.get(id) || null;
        const assignedRun = assignment?.run || null;
        const isInCurrentRun = assignedRun && assignedRun.id === currentSelectedRunId;
        const isInOtherRun = assignedRun && assignedRun.id !== currentSelectedRunId;
        
        const menuContent = document.createElement("div");
        menuContent.style.cssText = `
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 0;
          font-size: 12px;
          color: #1e293b;
          box-shadow: 0 3px 14px rgba(0,0,0,0.18);
          min-width: 180px;
        `;
        
        if (isInCurrentRun) {
          menuContent.innerHTML = `
            <div style="padding: 6px 12px; cursor: pointer; color: #dc2626; font-weight: 500;" class="ctx-remove-run">❌ Remove from Run</div>
          `;
          menuContent.querySelector(".ctx-remove-run").addEventListener("click", () => {
            const rp = runProjectsRef.current.find(rp => rp.project_id === id);
            if (rp) onRemoveFromRunRef.current?.(rp.id);
            try { contextMenuPopupRef.current?.remove(); } catch (ex) {}
            contextMenuPopupRef.current = null;
          });
        } else if (isInOtherRun) {
          menuContent.innerHTML = `
            <div style="padding: 0 12px 6px; color: #64748b; font-size: 11px;">📦 Already assigned to:</div>
            <div style="padding: 0 12px 6px; color: #6366f1; font-weight: 600; font-size: 12px;">${assignedRun.run_name || `Run #${assignedRun.run_number || assignedRun.id}`}</div>
          `;
        } else {
          menuContent.innerHTML = `
            <div style="padding: 6px 12px; cursor: pointer; color: #1e293b; font-weight: 500;" class="ctx-add-run">📦 Add to Run</div>
          `;
          menuContent.querySelector(".ctx-add-run").addEventListener("click", () => {
            onAddToRunRef.current?.(id);
            try { contextMenuPopupRef.current?.remove(); } catch (ex) {}
            contextMenuPopupRef.current = null;
          });
        }
        
        const popup = new MapLibreGL.Popup({
          anchor: "left",
          offset: [12, 0],
          closeButton: false,
          closeOnClick: true,
          className: "project-context-menu"
        })
          .setLngLat(marker.getLngLat())
          .setDOMContent(menuContent)
          .addTo(map);
        
        contextMenuPopupRef.current = popup;
      });

      // Store bundle with all associated popups
      newMarkersMap[id] = { marker, persistentPopup, hoverPopup };
    });

    Object.keys(markersMapRef.current).forEach((id) => {
      if (!projectIds.has(Number(id))) {
        const bundle = markersMapRef.current[id];
        try { bundle.persistentPopup?.remove(); } catch (e) {}
        try { bundle.hoverPopup?.remove(); } catch (e) {}
        try { bundle.marker?.remove(); } catch (e) {}
        delete markersMapRef.current[id];
      }
    });

    markersMapRef.current = newMarkersMap;

    if (!initialFitDone.current) {
      const targetProjects = searchResults || filteredProjects;
      if (targetProjects.length > 0) {
        const bounds = new MapLibreGL.LngLatBounds();
        let hasValid = false;
        targetProjects.forEach((p) => {
          const lat = p.site_latitude || p.address_latitude;
          const lng = p.site_longitude || p.address_longitude;
          if (lat != null && lng != null) {
            bounds.extend([lng, lat]);
            hasValid = true;
          }
        });
        if (hasValid) {
          try { map.fitBounds(bounds, { padding: 50, maxZoom: 14 }); } catch (e) {}
        }
      }
      initialFitDone.current = true;
    }
  }, [filteredProjects, stateColorLookup, searchResults, projectRunLookup, statuses, buildingCategories, permitStatuses, welcomeCallStatuses]);

  // Update origin marker (plain MapLibre default marker, no custom HTML)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old marker if it exists
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    let origin = selectedOrigin;
    if (mode === "runs" && selectedRunId) {
      const run = runs.find((r) => r.id === selectedRunId);
      origin = run?.proj_s_origin_addresses || null;
    }

    if (origin && origin.latitude != null && origin.longitude != null) {
      try {
        originMarkerRef.current = new MapLibreGL.Marker({
          color: "#000000",
          scale: 1.0
        })
          .setLngLat([origin.longitude, origin.latitude])
          .addTo(map);
      } catch (e) {}
    }

    // Update route line
    const currentRouteData = mode === "runs" ? runRouteData : routeData;
    if (currentRouteData && currentRouteData.geometry) {
      try {
        const source = map.getSource("route-line");
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: currentRouteData.geometry,
          });

          if (origin && runProjects.length > 0) {
            const bounds = new MapLibreGL.LngLatBounds();
            bounds.extend([origin.longitude, origin.latitude]);
            runProjects.forEach((rp) => {
              const proj = rp.proj_t_projects || {};
              const lat = proj.site_latitude || proj.address_latitude;
              const lng = proj.site_longitude || proj.address_longitude;
              if (lat != null && lng != null) {
                bounds.extend([lng, lat]);
              }
            });

            // Auto-fit ONLY when the route actually changed (different run,
            // stops added/removed/reordered, recalculated geometry). A cheap
            // signature identifies the route; identity-only refetches of the
            // same run (polling/realtime syncs) must NOT move the viewport,
            // otherwise the map keeps zooming back while the user pans.
            const coords = currentRouteData.geometry.coordinates || [];
            const routeShapeSig = `${coords.length}:${JSON.stringify(coords[0] || "")}:${JSON.stringify(coords[coords.length - 1] || "")}`;
            const stopsSig = runProjects
              .map((rp) => {
                const proj = rp.proj_t_projects || {};
                return `${proj.site_latitude || proj.address_latitude},${proj.site_longitude || proj.address_longitude}`;
              })
              .join(";");
            const fitSignature = `${mode}|${selectedRunId ?? ""}|${origin.latitude},${origin.longitude}|${routeShapeSig}|${stopsSig}`;

            if (fitSignature !== lastRouteFitSignatureRef.current) {
              lastRouteFitSignatureRef.current = fitSignature;
              map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
            }
          }
        }
      } catch (e) {}
    } else {
      try {
        const source = map.getSource("route-line");
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          });
        }
      } catch (e) {}
    }
  }, [mode, selectedOrigin, routeData, selectedProjectId, projects, runs, selectedRunId, runProjects, runRouteData]);

  // Center on selected project
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProjectId || routeData) return;

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const lat = project.site_latitude || project.address_latitude;
    const lng = project.site_longitude || project.address_longitude;
    if (lat == null || lng == null) return;

    try { map.flyTo({ center: [lng, lat], zoom: 14 }); } catch (e) {}
  }, [selectedProjectId, projects, routeData]);

  // Handle temporary marker for "Add Project from Map" (right-click - orange)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing temp marker
    if (tempMarkerRef.current) {
      try { tempMarkerRef.current.remove(); } catch (e) {}
      tempMarkerRef.current = null;
    }

    if (tempMarker && tempMarker.lat != null && tempMarker.lng != null) {
      try {
        // Create temporary marker with orange color for right-click
        tempMarkerRef.current = new MapLibreGL.Marker({
          color: "#f97316",
          scale: 1.2
        })
          .setLngLat([tempMarker.lng, tempMarker.lat])
          .addTo(map);

        // Center map on temp marker
        map.flyTo({ center: [tempMarker.lng, tempMarker.lat], zoom: 14 });
      } catch (e) {
        console.error("[ProjectMap] Failed to add temp marker:", e);
      }
    }
  }, [tempMarker]);

  // Handle search marker (white marker for map search)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing search marker and popup
    if (searchMarkerRef.current) {
      try { searchMarkerRef.current.remove(); } catch (e) {}
      searchMarkerRef.current = null;
    }
    if (searchMarkerPopupRef.current) {
      try { searchMarkerPopupRef.current.remove(); } catch (e) {}
      searchMarkerPopupRef.current = null;
    }

    if (searchMarker && searchMarker.lat != null && searchMarker.lng != null) {
      try {
        // Create white marker for search
        searchMarkerRef.current = new MapLibreGL.Marker({
          color: "#ffffff",
          scale: 1.2
        })
          .setLngLat([searchMarker.lng, searchMarker.lat])
          .addTo(map);

        // Create popup with location info and Create Project button
        const popupContent = document.createElement("div");
        popupContent.style.cssText = `
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 11px;
          color: #1e293b;
          box-shadow: 0 3px 14px rgba(0,0,0,0.18);
          min-width: 200px;
        `;
        
        const locationName = searchMarker.data?.formatted_address || searchMarker.data?.address_line_1 || "Selected Location";
        
        popupContent.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 12px;">${locationName}</div>
          <button style="
            width: 100%;
            padding: 6px 12px;
            background: #16a34a;
            color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 4px;
          " class="create-project-btn">Create Project</button>
          <button style="
            width: 100%;
            padding: 6px 12px;
            background: #fff;
            color: #64748b;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
          " class="cancel-search-btn">Cancel Search</button>
        `;
        
        popupContent.querySelector(".create-project-btn").addEventListener("click", () => {
          if (onSearchMarkerClickRef.current) {
            onSearchMarkerClickRef.current(searchMarker.data);
          }
        });
        
        popupContent.querySelector(".cancel-search-btn").addEventListener("click", () => {
          if (onSearchMarkerClickRef.current) {
            // Pass null to signal cancellation
            onSearchMarkerClickRef.current(null);
          }
        });
        
        const popup = new MapLibreGL.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: "top",
          offset: 12,
          className: "search-marker-popup"
        })
          .setLngLat([searchMarker.lng, searchMarker.lat])
          .setDOMContent(popupContent)
          .addTo(map);
        
        searchMarkerPopupRef.current = popup;
      } catch (e) {
        console.error("[ProjectMap] Failed to add search marker:", e);
      }
    }
  }, [searchMarker]);

  // Resize map when drawer opens/closes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => { try { map.resize(); } catch (e) {} }, 350);
    return () => clearTimeout(timer);
  }, [selectedProjectId]);

  // Show/hide persistent labels based on showLabels prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersMapRef.current).forEach((bundle) => {
      if (!bundle.persistentPopup) return;
      try {
        if (showLabels) {
          bundle.persistentPopup.addTo(map);
        } else {
          bundle.persistentPopup.remove();
        }
      } catch (e) {}
    });
  }, [showLabels]);

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: 0, position: "relative" }} />
  );
}