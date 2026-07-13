"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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

      const el = document.createElement("div");
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: ${color};
        border: 3px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;

      const marker = new MapLibreGL.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);

      el.addEventListener("click", () => {
        onSelectProject?.(project.id);
      });

      // Popup
      const popupContent = document.createElement("div");
      popupContent.innerHTML = `
        <div style="padding: 4px; min-width: 180px;">
          <strong>${project.client_name || "Untitled"}</strong>
          <br/>
          <span style="color: ${color}; font-size: 12px;">${statusName || "No Status"}</span>
          <br/>
          <small>${project.formatted_address || project.city || ""}</small>
          <br/>
          <button id="pm-popup-view" style="margin-top: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer;">View Project</button>
        </div>
      `;

      const popup = new MapLibreGL.Popup({ offset: 25 }).setDOMContent(popupContent);
      marker.setPopup(popup);

      popupContent.querySelector("#pm-popup-view")?.addEventListener("click", () => {
        onSelectProject?.(project.id);
        popup.remove();
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
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
  );
}