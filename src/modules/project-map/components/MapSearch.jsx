"use client";

import { useState, useEffect, useRef } from "react";
import { forwardGeocode, reverseGeocode, parseCoordinateString } from "../utils/geocoding";

/**
 * Pulls a coordinate pair out of a pasted map link (Google Maps and similar).
 * Prefers the exact pin (!3d…!4d…), then ?q= / ?query= / ?ll=, then the view
 * centre (@lat,lng). Returns { lat, lng } or null.
 */
function parseMapLink(text) {
  if (!/^https?:\/\//i.test(text)) return null;
  let decoded = text;
  try { decoded = decodeURIComponent(text); } catch (e) {}
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

/** Place name in a Google Maps link ("/maps/place/LARROZA+Residence/@..."), or "". */
function parseMapLinkPlaceName(text) {
  const match = String(text || "").match(/\/maps\/place\/([^/@?]+)/);
  if (!match) return "";
  let name = match[1].replace(/\+/g, " ");
  try { name = decodeURIComponent(name); } catch (e) {}
  name = name.trim();
  // "/maps/place/7.08,125.60/" is a coordinate, not a name
  return name && !parseCoordinateString(name) ? name : "";
}

/**
 * Search result for a coordinate search. The pin stays exactly on the
 * searched point; the nearest known address (reverse geocode, may be a shop
 * next door) only supplies city / state / ZIP / country. A place name from a
 * Google Maps link becomes the label and address line 1.
 */
function pinnedResult(coords, place, placeName) {
  const base = place || coordinateOnlyResult(coords.lat, coords.lng);
  const label = placeName
    ? [placeName, base.city, base.state, base.country].filter(Boolean).join(", ")
    : base.formatted_address;
  return {
    ...base,
    formatted_address: label,
    address_line_1: placeName || base.address_line_1,
    latitude: coords.lat,
    longitude: coords.lng,
  };
}

/** Result for a coordinate with no street address, so it can still be pinned. */
function coordinateOnlyResult(lat, lng) {
  const label = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  return {
    formatted_address: label,
    address_line_1: label,
    city: "",
    state: "",
    state_code: "",
    postal_code: "",
    country: "",
    latitude: lat,
    longitude: lng,
  };
}

export default function MapSearch({ value, onChange, onSelect, results = [] }) {
  const [query, setQuery] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Sync internal query state with external value prop
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  /**
   * Performs the geocoding search explicitly.
   * Only called when the user presses Enter or clicks the Search button.
   * Prevents unnecessary API requests while typing.
   */
  const performSearch = async () => {
    if (!query || query.trim().length < 2 || loading) return;

    setLoading(true);
    setSearched(true);
    setShowDropdown(true);
    try {
      const text = query.trim();
      const coords = parseMapLink(text) || parseCoordinateString(text);
      const data = coords
        ? [pinnedResult(coords, await reverseGeocode(coords.lat, coords.lng), parseMapLinkPlaceName(text))]
        : /^https?:\/\//i.test(text)
          ? []
          : await forwardGeocode(text, 50);
      // Call parent's onChange with results
      if (onChange) {
        onChange(query, data);
      }
      // Keep dropdown open to show results or "no results" message
      setShowDropdown(true);
    } catch (err) {
      console.error("[MapSearch] Search failed:", err);
      if (onChange) {
        onChange(query, []);
      }
      setShowDropdown(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  };

  const handleSelect = (result) => {
    const displayText = result.formatted_address || result.address_line_1;
    setQuery(displayText);
    setShowDropdown(false);
    setSearched(false);
    if (onChange) {
      onChange(displayText, []); // Clear results after selection
    }
    onSelect?.(result);
  };

  const handleClear = () => {
    setQuery("");
    setShowDropdown(false);
    setSearched(false);
    if (onChange) {
      onChange("", []); // Clear both query and results
    }
    onSelect?.(null); // Signal cancellation to parent
  };

  // Loading spinner with proper animation
  const spinnerStyle = {
    display: "inline-block",
    width: "14px",
    height: "14px",
    border: "2px solid #e2e8f0",
    borderTopColor: "#16a34a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            placeholder="🔍 Search by address, city, ZIP, place name, coordinates, degrees or a pasted Google Maps link"
            title="Search by address, city, ZIP, place name, coordinates, or a pasted Google Maps link"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            disabled={loading}
            style={{
              width: "100%",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              padding: "6px 10px",
              fontSize: "12px",
              outline: "none",
              background: loading ? "#f8fafc" : "#fff",
              paddingRight: query ? "28px" : "10px",
              opacity: loading ? 0.7 : 1,
            }}
          />
          {loading ? (
            <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)" }}>
              <span style={spinnerStyle} />
            </span>
          ) : (
            query && (
              <button
                onClick={handleClear}
                style={{
                  position: "absolute",
                  right: "6px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "16px",
                  lineHeight: 1,
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
                title="Clear search"
              >
                ×
              </button>
            )
          )}
        </div>
        <button
          onClick={performSearch}
          disabled={loading || !query || query.trim().length < 2}
          style={{
            padding: "6px 14px",
            border: "none",
            borderRadius: "4px",
            background: loading ? "#94a3b8" : "#16a34a",
            color: "#fff",
            cursor: loading || !query || query.trim().length < 2 ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Global spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            marginTop: "4px",
            maxHeight: "240px",
            overflowY: "auto",
            zIndex: 1100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {loading ? (
            <div style={{ padding: "14px 12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
              <span style={{ marginRight: "6px", verticalAlign: "middle" }}>
                <span style={spinnerStyle} />
              </span>
              Searching locations...
            </div>
          ) : results && results.length > 0 ? (
            results.map((r, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(r)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom:
                    idx < results.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ fontSize: "13px", color: "#1e293b" }}>
                  {r.formatted_address || r.address_line_1}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {[r.city, r.state, r.postal_code, r.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                {r.latitude != null && r.longitude != null && (
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                    {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
                  </div>
                )}
              </div>
            ))
          ) : searched ? (
            <div style={{ padding: "14px 12px", fontSize: "12px", color: "#64748b" }}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>No locations found.</div>
              <div style={{ fontSize: "11px", lineHeight: 1.6 }}>
                Try:
                <br />• Complete address
                <br />• ZIP code
                <br />• Landmark
                <br />• City + State
                <br />• Coordinates: 40.8612, -82.3201
                <br />• A Google Maps link (copy it from the browser bar)
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px", fontSize: "11px", color: "#64748b", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>You can search by:</div>
              • Address: <span style={{ color: "#1e293b" }}>1234 Main St, Ashland, OH</span>
              <br />• City or ZIP: <span style={{ color: "#1e293b" }}>Ashland, OH</span> / <span style={{ color: "#1e293b" }}>44805</span>
              <br />• Place name: <span style={{ color: "#1e293b" }}>Ashland University</span>
              <br />• Coordinates (lat, lng): <span style={{ color: "#1e293b" }}>40.8612, -82.3201</span>
              <br />• Degrees: <span style={{ color: "#1e293b" }}>{`40°51'40.3"N 82°19'12.4"W`}</span>
              <br />• A Google Maps link pasted from the browser bar
              <div style={{ marginTop: "6px", color: "#94a3b8" }}>Press Enter or Search. Pick a result to drop a pin, then use Create Project.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}