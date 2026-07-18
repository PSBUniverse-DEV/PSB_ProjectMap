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
  searchResults = null,
  mode = "projects",
  runs = [],
  selectedRunId = null,
  runProjects = [],
  runRouteData = null,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const markersMapRef = useRef({});
  const originMarkerRef = useRef(null);
  const routeSourceRef = useRef("route-line");
  const initialFitDone = useRef(false);

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

  // Street-level OSM style for MapLibre
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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new MapLibreGL.Map({
      container: mapContainerRef.current,
      style: osmStyle,
      center: [-98.5795, 39.8283],
      zoom: 3,
    });

    map.addControl(new MapLibreGL.NavigationControl(), "top-right");

    // Add route line source and layer after map loads
    map.on("load", () => {
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
    });

    mapRef.current = map;

    return () => {
      // Clean up all markers when map is destroyed
      Object.values(markersMapRef.current).forEach((m) => m.remove());
      markersMapRef.current = {};
      markersRef.current = [];
      originMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      initialFitDone.current = false;
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

      // Reuse existing marker if it exists
      let marker = markersMapRef.current[id];
      if (marker) {
        // Update position in case coordinates changed
        marker.setLngLat([lng, lat]);
        newMarkersMap[id] = marker;
        return;
      }

      // Create marker dot with state color
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

      // Create label element with status color
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

      // Wrap marker and label using flexbox (no absolute positioning)
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display: inline-flex; flex-direction: column; align-items: center;";
      wrapper.appendChild(labelEl);
      wrapper.appendChild(markerEl);

      marker = new MapLibreGL.Marker({ element: wrapper, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map);

      // Hover tooltip
      const tooltip = document.createElement("div");
      tooltip.style.cssText = `
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 6px 8px;
        font-size: 11px;
        color: #1e293b;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        pointer-events: none;
        min-width: 150px;
      `;
      const subtotalStr = project.project_subtotal != null
        ? `$${Number(project.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "";

      // Build address string: prefer formatted_address, fallback to components
      let addressDisplay = "";
      if (project.formatted_address) {
        addressDisplay = project.formatted_address;
      } else if (project.address_line_1 || project.city) {
        const parts = [project.address_line_1, project.city, project.state].filter(Boolean);
        addressDisplay = parts.join(", ");
      } else {
        addressDisplay = "No address";
      }

      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px; font-size: 12px;">${project.client_name || "Untitled"}</div>
        <div style="color: ${statusColor}; font-size: 11px; margin-bottom: 4px; font-weight: 500;">${statusName || "No Status"}</div>
        <div style="font-size: 10px; color: #64748b; margin-bottom: 4px; line-height: 1.4;">${addressDisplay}</div>
        ${subtotalStr ? `<div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 4px;">${subtotalStr}</div>` : ""}
      `;

      const popup = new MapLibreGL.Popup({ 
        offset: 20,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip"
      }).setDOMContent(tooltip);

      markerEl.addEventListener("mouseenter", () => {
        const pos = marker.getLngLat();
        popup.setLngLat(pos).addTo(map);
      });

      markerEl.addEventListener("mouseleave", () => {
        popup.remove();
      });

      markerEl.addEventListener("click", () => {
        popup.remove();
        onSelectProject?.(project.id);
      });

      newMarkersMap[id] = marker;
    });

    // Remove markers for projects no longer in the filtered list
    Object.keys(markersMapRef.current).forEach((id) => {
      if (!projectIds.has(Number(id))) {
        markersMapRef.current[id].remove();
        delete markersMapRef.current[id];
      }
    });

    // Update the ref
    markersMapRef.current = newMarkersMap;
    markersRef.current = Object.values(newMarkersMap);

    // Fit bounds only on initial load
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
          map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
      }
      initialFitDone.current = true;
    }
  }, [filteredProjects, stateColorLookup, searchResults]);

  // Update origin marker and route line
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing origin marker
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }

    // Determine which origin to show
    let origin = selectedOrigin;
    if (mode === "runs" && selectedRunId) {
      const run = runs.find((r) => r.id === selectedRunId);
      origin = run?.proj_s_origin_addresses || null;
    }

    if (origin && origin.latitude != null && origin.longitude != null) {
      // Create origin marker (larger, square-ish, distinct)
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

      // Origin label
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

      originMarkerRef.current = new MapLibreGL.Marker({ element: originWrapper })
        .setLngLat([origin.longitude, origin.latitude])
        .addTo(map);
    }

    // Update route line
    const currentRouteData = mode === "runs" ? runRouteData : routeData;
    if (currentRouteData && currentRouteData.geometry) {
      const source = map.getSource("route-line");
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: currentRouteData.geometry,
        });

        // Fit bounds to include origin and all stops
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
    } else {
      // Clear route line
      const source = map.getSource("route-line");
      if (source) {
        source.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        });
      }
    }
  }, [mode, selectedOrigin, routeData, selectedProjectId, projects, runs, selectedRunId, runProjects, runRouteData]);

  // Center on selected project
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProjectId || routeData) return; // Don't interfere if route is shown

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const lat = project.site_latitude || project.address_latitude;
    const lng = project.site_longitude || project.address_longitude;
    if (lat == null || lng == null) return;

    map.flyTo({ center: [lng, lat], zoom: 14 });
  }, [selectedProjectId, projects, routeData]);

  // Resize map when drawer opens/closes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const timer = setTimeout(() => map.resize(), 350);
    return () => clearTimeout(timer);
  }, [selectedProjectId]);

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%", minHeight: 0, position: "relative" }} />
  );
}