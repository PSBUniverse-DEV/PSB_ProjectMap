"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

function getStatusColor(statusName, statuses = []) {
  if (!statusName) return "#6b7280";
  const found = statuses.find((s) => s.status_name === statusName);
  return found?.display_color || "#6b7280";
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
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markersMapRef = useRef({});
  const originMarkerRef = useRef(null);
  const routeSourceRef = useRef("route-line");
  const initialFitDone = useRef(false);
  const mapInitAttemptedRef = useRef(false);
  const contextMenuPopupRef = useRef(null);
  
  // Refs for closure-dependent values used in marker event handlers
  const modeRef = useRef(mode);
  const selectedRunIdRef = useRef(selectedRunId);
  const runProjectsRef = useRef(runProjects);
  const onAddToRunRef = useRef(onAddToRun);
  const onRemoveFromRunRef = useRef(onRemoveFromRun);
  
  // Keep refs in sync with props
  modeRef.current = mode;
  selectedRunIdRef.current = selectedRunId;
  runProjectsRef.current = runProjects;
  onAddToRunRef.current = onAddToRun;
  onRemoveFromRunRef.current = onRemoveFromRun;

  // Filter projects (memoized to avoid recreating on every render)
  const filteredProjects = useMemo(() => projects.filter((p) => {
    if (filters.status && String(p.status_id) !== String(filters.status)) return false;
    if (filters.dealer && p.dealer !== filters.dealer) return false;
    if (filters.state && p.state_code !== filters.state) return false;
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
      Object.values(markersMapRef.current).forEach((m) => m.remove());
      markersMapRef.current = {};
      markersRef.current = [];
      originMarkerRef.current = null;
      try { map.remove(); } catch (e) { }
      mapRef.current = null;
      initialFitDone.current = false;
      mapInitAttemptedRef.current = false;
    };
  }, [osmStyle]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const newMarkersMap = {};
    const projectIds = new Set();

    filteredProjects.forEach((project) => {
      const id = project.id;
      projectIds.add(id);

      const lat = project.site_latitude || project.address_latitude;
      const lng = project.site_longitude || project.address_longitude;
      if (lat == null || lng == null) return;

      const statusName = project.proj_s_project_status?.status_name || "";
      const statusColor = getStatusColor(statusName, statuses);
      const stateColor = stateColorLookup[project.state_code] || statusColor;

      let marker = markersMapRef.current[id];
      if (marker) {
        marker.setLngLat([lng, lat]);
        newMarkersMap[id] = marker;
        return;
      }

      const markerEl = document.createElement("div");
      markerEl.style.cssText = `
        width: 20px;
        height: 20px;
        background: ${stateColor};
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      `;

      const labelEl = document.createElement("div");
      labelEl.style.cssText = `
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #e2e8f0;
        border-radius: 3px;
        padding: 1px 4px;
        font-size: 10px;
        font-weight: 600;
        color: ${statusColor};
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        margin-bottom: 2px;
      `;
      labelEl.textContent = project.client_name || "Untitled";

      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display: inline-flex; flex-direction: column; align-items: center;";
      wrapper.appendChild(labelEl);
      wrapper.appendChild(markerEl);

      marker = new MapLibreGL.Marker({ element: wrapper, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map);

      const subtotalStr = project.project_subtotal != null
        ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "";

      let addressDisplay = "";
      if (project.formatted_address) {
        addressDisplay = project.formatted_address;
      } else if (project.address_line_1 || project.city) {
        const parts = [project.address_line_1, project.city, project.state].filter(Boolean);
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
      const assignedRun = runs.find((r) => (r.proj_t_run_projects || []).some((rp) => rp.project_id === id));
      const assignedRunLabel = assignedRun ? assignedRun.run_name || `Run #${assignedRun.run_number || assignedRun.id}` : null;

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
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Scheduled</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.scheduled_project_start)}${project.scheduled_project_end ? " → " + formatDate(project.scheduled_project_end) : ""}</td></tr>
          <tr><td style="font-size: 10px; color: #94a3b8; padding-bottom: 2px;">Install</td><td style="font-size: 10px; color: #1e293b; font-weight: 600; text-align: right; padding-bottom: 2px;">${formatDate(project.install_start)}${project.install_end ? " → " + formatDate(project.install_end) : ""}</td></tr>
        </table>

        ${projectNotes ? `
        <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.4px;">Remarks</div>
        <div style="font-size: 10px; color: #475569; background: #f8fafc; padding: 4px 6px; border-radius: 3px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.4;">${truncatedNotes}</div>
        ` : ""}
      `;

      const popup = new MapLibreGL.Popup({ 
        anchor: "right",
        offset: 10,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip"
      }).setDOMContent(tooltip);

      markerEl.addEventListener("mouseenter", () => {
        try { popup.setLngLat(marker.getLngLat()).addTo(map); } catch (e) {}
      });

      markerEl.addEventListener("mouseleave", () => {
        try { popup.remove(); } catch (e) {}
      });

      markerEl.addEventListener("click", () => {
        try { popup.remove(); } catch (e) {}
        onSelectProject?.(project.id);
      });

      markerEl.addEventListener("contextmenu", (e) => e.preventDefault());

      markerEl.addEventListener("mousedown", (e) => {
        if (e.button !== 2) return;
        e.preventDefault();
        e.stopPropagation();
        try { popup.remove(); } catch (e) {}

        const currentMode = modeRef.current;
        const currentSelectedRunId = selectedRunIdRef.current;
        const currentOnAddToRun = onAddToRunRef.current;
        const currentOnRemoveFromRun = onRemoveFromRunRef.current;

        if (currentMode !== "runs") return;
        if (!currentOnAddToRun && !currentOnRemoveFromRun) return;

        // Close any previous context menu popup
        if (contextMenuPopupRef.current) {
          try { contextMenuPopupRef.current.remove(); } catch (e) {}
          contextMenuPopupRef.current = null;
        }

        // Shared assignment lookup — same source of truth as hover
        const assignedRun = runs.find((r) => (r.proj_t_run_projects || []).some((rp) => rp.project_id === id));
        const assignedRunName = assignedRun ? assignedRun.run_name || `Run #${assignedRun.run_number || assignedRun.id}` : null;

        // Determine relationship
        let relationship;
        if (!assignedRun) {
          relationship = "unassigned";
        } else if (assignedRun.id === currentSelectedRunId) {
          relationship = "selected";
        } else {
          relationship = "other";
        }

        // Find run_project id for remove action (from runs array directly)
        const runProjectId = relationship === "selected"
          ? (assignedRun.proj_t_run_projects || []).find((rp) => rp.project_id === id)?.id
          : null;

        let popupHtml = "";
        if (relationship === "unassigned") {
          if (!currentSelectedRunId) {
            popupHtml = `<div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 4px 0;">Select a run first</div>`;
          } else {
            popupHtml = `<button data-add-to-run="${id}" style="width: 100%; padding: 6px 12px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #16a34a; background: #16a34a; color: #fff; cursor: pointer;">+ Add to Run</button>`;
          }
        } else if (relationship === "selected") {
          popupHtml = `<button data-remove-from-run="${id}" style="width: 100%; padding: 6px 12px; font-size: 11px; font-weight: 600; border-radius: 4px; border: 1px solid #dc2626; background: #fef2f2; color: #dc2626; cursor: pointer;">− Remove from Run</button>`;
        } else {
          popupHtml = `
            <div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-bottom: 4px;">Already Assigned</div>
            <div style="font-size: 10px; color: #64748b; margin-bottom: 6px; line-height: 1.4;">Run: <strong>${assignedRunName || "Unknown"}</strong></div>
            <div style="font-size: 10px; color: #94a3b8; font-style: italic;">Remove it from that run first.</div>
          `;
        }

        const contextPopup = new MapLibreGL.Popup({
          offset: 20,
          closeButton: true,
          closeOnClick: false,
          className: "project-map-tooltip",
          maxWidth: "200px",
        }).setHTML(popupHtml);

        try { contextPopup.setLngLat(marker.getLngLat()).addTo(map); } catch (e) {}
        contextMenuPopupRef.current = contextPopup;

        contextPopup.on("close", () => {
          contextMenuPopupRef.current = null;
        });

        const addBtn = contextPopup.getElement()?.querySelector(`[data-add-to-run="${id}"]`);
        if (addBtn) {
          addBtn.addEventListener("click", () => {
            try { contextPopup.remove(); } catch (e) {}
            currentOnAddToRun?.(id);
          });
        }

        const removeBtn = contextPopup.getElement()?.querySelector(`[data-remove-from-run="${id}"]`);
        if (removeBtn) {
          removeBtn.addEventListener("click", () => {
            try { contextPopup.remove(); } catch (e) {}
            currentOnRemoveFromRun?.(runProjectId);
          });
        }
      });

      newMarkersMap[id] = marker;
    });

    Object.keys(markersMapRef.current).forEach((id) => {
      if (!projectIds.has(Number(id))) {
        try { markersMapRef.current[id].remove(); } catch (e) {}
        delete markersMapRef.current[id];
      }
    });

    markersMapRef.current = newMarkersMap;
    markersRef.current = Object.values(newMarkersMap);

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
  }, [filteredProjects, stateColorLookup, searchResults]);

  // Update origin marker and route line (no overlay — empty state lives in RunDetailPanel)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
    } catch (e) {}

    let origin = selectedOrigin;
    if (mode === "runs" && selectedRunId) {
      const run = runs.find((r) => r.id === selectedRunId);
      origin = run?.proj_s_origin_addresses || null;
    }

    if (origin && origin.latitude != null && origin.longitude != null) {
      const originEl = document.createElement("div");
      originEl.style.cssText = `
        width: 24px;
        height: 24px;
        background: #059669;
        border: 3px solid #fff;
        border-radius: 4px;
        cursor: default;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
      `;
      originEl.textContent = "O";

      const originLabel = document.createElement("div");
      originLabel.style.cssText = `
        position: absolute;
        top: -16px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(5, 150, 105, 0.9);
        border-radius: 3px;
        padding: 1px 4px;
        font-size: 9px;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        pointer-events: none;
      `;
      originLabel.textContent = origin.origin_name || "Origin";

      const originWrapper = document.createElement("div");
      originWrapper.style.cssText = "position: relative; display: inline-block;";
      originWrapper.appendChild(originEl);
      originWrapper.appendChild(originLabel);

      try {
        originMarkerRef.current = new MapLibreGL.Marker({ element: originWrapper })
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
            map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
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

  // Resize map when drawer opens/closes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => { try { map.resize(); } catch (e) {} }, 350);
    return () => clearTimeout(timer);
  }, [selectedProjectId]);

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: 0, position: "relative" }} />
  );
}