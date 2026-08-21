"use client";

import { useState, useEffect, useRef } from "react";
import { forwardGeocode, reverseGeocode, parseCoordinateString } from "../utils/geocoding";

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
      const coords = parseCoordinateString(query.trim());
      const data = coords
        ? [await reverseGeocode(coords.lat, coords.lng)].filter(Boolean)
        : await forwardGeocode(query.trim(), 50);
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
            placeholder="🔍 Search address, city, ZIP, place..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
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
                <br />• City + Country
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}