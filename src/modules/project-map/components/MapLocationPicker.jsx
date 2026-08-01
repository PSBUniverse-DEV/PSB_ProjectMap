"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button, Modal } from "@/shared/components/ui";
import { reverseGeocode } from "../utils/geocoding";
import MapSearch from "./MapSearch";

const OSM_STYLE = {
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
};

/**
 * MapLocationPicker — A map modal for choosing a location by
 * clicking or dragging a marker on the map.
 *
 * Used by the setup screens (e.g. Origin Addresses) where users
 * may not know the exact street address but can visually identify
 * the location on a map (loading dock, warehouse, etc.).
 *
 * Workflow:
 *  - User clicks or drags the marker on the map.
 *  - Reverse geocoding fills in the address automatically.
 *  - "Choose Location" populates the parent form.
 */
export default function MapLocationPicker({ show, onHide, onChoose, initialLocation = null }) {
  const [marker, setMarker] = useState(null); // { lat, lng }
  const [address, setAddress] = useState(null); // reverse-geocoded address
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null); // Map instance stored in ref to avoid stale closures
  const [markerRef, setMarkerRef] = useState(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const containerRef = useRef(null);
  const initAttemptedRef = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (!show) return;

    if (initialLocation) {
      setMarker({
        lat: initialLocation.latitude ?? initialLocation.site_latitude,
        lng: initialLocation.longitude ?? initialLocation.site_longitude,
      });
      setAddress(initialLocation);
    } else {
      setMarker(null);
      setAddress(null);
    }
    setQuery(initialLocation?.formatted_address || "");
    setSearchResults([]);
  }, [show, initialLocation]);

  // Initialize map when modal opens.
  // The container ref may not be attached immediately because Modals render
  // via a portal asynchronously, so we retry on a timer until it's ready.
  useEffect(() => {
    if (!show) return;

    let retries = 0;
    const tryInitialize = () => {
      if (mapRef.current || initAttemptedRef.current) return;
      if (!containerRef.current) {
        if (retries < 20) {
          retries += 1;
          setTimeout(tryInitialize, 100);
        }
        return;
      }

      initAttemptedRef.current = true;
      let m;
      try {
        m = new MapLibreGL.Map({
          container: containerRef.current,
          style: OSM_STYLE,
          center: initialLocation && initialLocation.longitude != null && initialLocation.latitude != null
            ? [initialLocation.longitude, initialLocation.latitude]
            : [-98.5795, 39.8283],
          zoom: initialLocation ? 14 : 3,
          failIfMajorPerformanceCaveat: false,
        });
      } catch (err) {
        console.error("[MapLocationPicker] Failed to init map:", err);
        initAttemptedRef.current = false;
        return;
      }

      m.addControl(new MapLibreGL.NavigationControl(), "top-right");

      // Left-click places the marker.
      // MapLibre automatically distinguishes between a drag (pan) and a click,
      // so dragging to pan won't accidentally place markers.
      m.on("click", (e) => {
        handleMapClick(e.lngLat.lng, e.lngLat.lat);
      });

      // Wait for map to be ready before placing initial marker & fitting bounds
      m.on("load", () => {
        if (initialLocation && initialLocation.longitude != null && initialLocation.latitude != null) {
          placeMarker(initialLocation.longitude, initialLocation.latitude);
          m.flyTo({ center: [initialLocation.longitude, initialLocation.latitude], zoom: 14 });
        }
      });

      // Store in ref, not state - avoids stale closure in event handlers
      mapRef.current = m;
    };

    tryInitialize();

    return () => {
      try { markerRef?.remove(); } catch (e) {}
      setMarkerRef(null);
      try { mapRef.current?.remove(); } catch (e) {}
      mapRef.current = null;
      initAttemptedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  /**
   * Places or updates the draggable marker at the given coordinates
   * and triggers reverse geocoding to fill in the address.
   */
  const placeMarker = useCallback((lng, lat) => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef) {
      try { markerRef.remove(); } catch (e) {}
    }

    const newMarker = new MapLibreGL.Marker({
      color: "#1d4ed8", // Blue marker
      draggable: true,
      scale: 1.2,
    })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    // Reverse geocode on drag end
    newMarker.on("dragend", () => {
      const pos = newMarker.getLngLat();
      handleMapClick(pos.lng, pos.lat);
    });

    setMarker({ lat, lng });
    setMarkerRef(newMarker);

    // Reverse geocode immediately
    reverseGeocodeAndSet(lat, lng);
  }, [markerRef]);

  /**
   * Handles map click: place marker and reverse geocode.
   */
  const handleMapClick = useCallback((lng, lat) => {
    if (!mapRef.current) return;
    placeMarker(lng, lat);
  }, [placeMarker]);

  /**
   * Reverse geocodes coordinates, updates loading state and address.
   */
  const reverseGeocodeAndSet = async (lat, lng) => {
    setLoading(true);
    setAddress(null);
    try {
      const data = await reverseGeocode(lat, lng);
      if (data) {
        setAddress({
          ...data,
          latitude: lat,
          longitude: lng,
          site_latitude: lat,
          site_longitude: lng,
        });
        setQuery(data.formatted_address || "");
      }
    } catch (err) {
      console.error("[MapLocationPicker] Reverse geocode failed:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles search selection: fly to the result and place a marker.
   */
  const handleSearchSelect = (result) => {
    if (!result) {
      setSearchResults([]);
      setQuery("");
      return;
    }

    setQuery(result.formatted_address || result.address_line_1 || "");
    setSearchResults([]);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [result.longitude, result.latitude], zoom: 14 });
      setTimeout(() => placeMarker(result.longitude, result.latitude), 500);
    }
  };

  /**
   * Confirms the selection and closes the modal.
   */
  const handleChoose = () => {
    if (!address || !marker) return;
    onChoose?.({
      ...address,
      latitude: marker.lat,
      longitude: marker.lng,
      site_latitude: marker.lat,
      site_longitude: marker.lng,
    });
    onHide?.();
  };

  const isReady = address !== null && !loading;

  return (
    <Modal show={show} onHide={onHide} title="Choose Origin Location" size="lg">
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* Search Bar */}
        <MapSearch
          value={query}
          onChange={(q, results) => { setQuery(q); setSearchResults(results || []); }}
          onSelect={handleSearchSelect}
          results={searchResults}
        />

        {/* Map */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "420px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        />

        {/* Selected Location Details */}
        <div style={{
          background: "#f8fafc",
          padding: "10px 12px",
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
          minHeight: "84px",
        }}>
          {loading ? (
            <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                border: "2px solid #e2e8f0",
                borderTopColor: "#16a34a",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              Loading address...
            </div>
          ) : address ? (
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
                {address.formatted_address || address.address_line_1 || "Selected Location"}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Lat: {marker?.lat != null ? Number(marker.lat).toFixed(6) : "—"} | Lng: {marker?.lng != null ? Number(marker.lng).toFixed(6) : "—"}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
              Click on the map to choose an origin location, or search for an address above.
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" disabled={!isReady} onClick={handleChoose}>
            Choose Location
          </Button>
        </div>
      </div>

      {/* Global spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}