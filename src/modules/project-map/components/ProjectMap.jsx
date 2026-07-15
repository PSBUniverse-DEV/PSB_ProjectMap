"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Constrain MapLibre to parent container
const mapStyles = `
  .maplibregl-canvas-container,
  .maplibregl-interactive,
  .maplibregl-touch-drag-pan,
  .maplibregl-touch-zoom-rotate {
    width: 100% !important;
    height: 100% !important;
  }
  .maplibregl-canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;

const STATUS_COLORS = {
  "Pre-Processing": "#6b7280",
  "Processing": "#3b82f6",
  "Waiting": "#eab308",
  "Scheduled": "#a855f7",
  "Active": "#f97316",
  "Financial": "#f59e0b",
  "Installed": "#22c55e",
  "Issue": "#ef4444",
  "Completed": "#15803d",
};

function getStatusColor(statusName) {
  if (!statusName) return "#6b7280";
  return STATUS_COLORS[statusName] || "#6b7280";
}

export default function ProjectMap({ projects = [], selectedProjectId, onSelectProject, filters = {} }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Filter projects
  const filteredProjects = projects.filter((p) => {
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
  });

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
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [osmStyle]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers for projects with coordinates
    filteredProjects.forEach((project) => {
      const lat = project.site_latitude || project.address_latitude;
      const lng = project.site_longitude || project.address_longitude;
      if (lat == null || lng == null) return;

      const statusName = project.proj_s_project_status?.status_name || "";
      const color = getStatusColor(statusName);

      // Create marker with label
      const markerEl = document.createElement("div");
      markerEl.style.cssText = `
        width: 20px;
        height: 20px;
        background: ${color};
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      `;

      // Create label element
      const labelEl = document.createElement("div");
      labelEl.style.cssText = `
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #e2e8f0;
        border-radius: 3px;
        padding: 1px 4px;
        font-size: 10px;
        font-weight: 600;
        color: #1e293b;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
      `;
      labelEl.textContent = project.client_name || "Untitled";

      // Wrap marker and label
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position: relative; display: inline-block;";
      wrapper.appendChild(markerEl);
      wrapper.appendChild(labelEl);

      const marker = new MapLibreGL.Marker({ element: wrapper })
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
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 2px;">${project.client_name || "Untitled"}</div>
        <div style="color: ${color}; font-size: 10px; margin-bottom: 2px;">${statusName || "No Status"}</div>
        <div style="font-size: 10px; color: #64748b;">${project.formatted_address || project.city || "No address"}</div>
      `;

      const popup = new MapLibreGL.Popup({ 
        offset: 20,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip"
      }).setDOMContent(tooltip);

      markerEl.addEventListener("mouseenter", () => {
        popup.setLngLat([lng, lat]).addTo(map);
      });

      markerEl.addEventListener("mouseleave", () => {
        popup.remove();
      });

      markerEl.addEventListener("click", () => {
        popup.remove();
        onSelectProject?.(project.id);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (filteredProjects.length > 0) {
      const bounds = new MapLibreGL.LngLatBounds();
      let hasValid = false;
      filteredProjects.forEach((p) => {
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
  }, [filteredProjects, onSelectProject]);

  // Center on selected project
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedProjectId) return;

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const lat = project.site_latitude || project.address_latitude;
    const lng = project.site_longitude || project.address_longitude;
    if (lat == null || lng == null) return;

    map.flyTo({ center: [lng, lat], zoom: 14 });
  }, [selectedProjectId, projects]);

  return (
    <>
      <style>{mapStyles}</style>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", position: "relative" }} />
    </>
  );
}