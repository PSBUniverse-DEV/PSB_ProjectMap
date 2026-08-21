"use client";

import { useState, useEffect, useRef } from "react";
import { forwardGeocode, reverseGeocode, parseCoordinateString } from "../utils/geocoding";

export default function LocationSearch({ onSelect, selectedLocation, query: externalQuery, onQueryChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searched, setSearched] = useState(false);
  const wrapperRef = useRef(null);
  const justSelectedRef = useRef(false);

  // Use external query if provided, otherwise internal state
  const query = externalQuery ?? "";

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

  /**
   * Performs the geocoding search explicitly.
   * Only called when the user presses Enter or clicks the Search button.
   * Prevents unnecessary API requests while typing.
   */
  const performSearch = async () => {
    // Skip search if user just selected a suggestion
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!query || query.length < 3 || loading) {
      return;
    }

    setLoading(true);
    setSearched(true);
    setShowDropdown(true);
    try {
      const coords = parseCoordinateString(query.trim());
      const features = coords
        ? [await reverseGeocode(coords.lat, coords.lng)].filter(Boolean)
        : await forwardGeocode(query, 50);

      setSuggestions(features);
      // Keep dropdown open to show results or "no results" message
      setShowDropdown(true);
    } catch (err) {
      // Silently fail — geocoding is optional
      setSuggestions([]);
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

  const handleSelect = (suggestion) => {
    console.log("[LocationSearch] handleSelect called with:", suggestion);
    justSelectedRef.current = true;
    onQueryChange?.(suggestion.formatted_address);
    setShowDropdown(false);
    setSearched(false);
    onSelect?.(suggestion);
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
            placeholder="Search address, road, city, or location..."
            value={query}
            onChange={(e) => {
              onQueryChange?.(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            disabled={loading}
            style={{
              width: "100%",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              padding: "8px 12px",
              fontSize: "13px",
              outline: "none",
              background: loading ? "#f8fafc" : "#fff",
              opacity: loading ? 0.7 : 1,
            }}
          />
          {loading && (
            <span style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}>
              <span style={spinnerStyle} />
            </span>
          )}
        </div>
        <button
          onClick={performSearch}
          disabled={loading || !query || query.trim().length < 3}
          style={{
            padding: "8px 14px",
            border: "none",
            borderRadius: "4px",
            background: loading ? "#94a3b8" : "#16a34a",
            color: "#fff",
            cursor: loading || !query || query.trim().length < 3 ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {/* Global spinner animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showDropdown && (
        <div style={{
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
        }}>
          {loading ? (
            <div style={{ padding: "14px 12px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>
              <span style={{ marginRight: "6px", verticalAlign: "middle" }}>
                <span style={spinnerStyle} />
              </span>
              Searching locations...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((s, idx) => (
              <div
                key={idx}
                onClick={() => handleSelect(s)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  borderBottom: idx < suggestions.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div style={{ fontSize: "13px", color: "#1e293b" }}>
                  {s.formatted_address || s.address_line_1 || s.label}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {[s.address_line_1, s.city, s.state_code, s.postal_code].filter(Boolean).join(", ")}
                </div>
              </div>
            ))
          ) : searched ? (
            <div style={{ padding: "14px 12px", fontSize: "12px", color: "#64748b" }}>
              <div style={{ fontWeight: 600, marginBottom: "6px" }}>No locations found.</div>
              <div style={{ fontSize: "11px", lineHeight: 1.6 }}>
                Try:
                <br />• Full address
                <br />• Landmark
                <br />• Business name
                <br />• City + State
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}