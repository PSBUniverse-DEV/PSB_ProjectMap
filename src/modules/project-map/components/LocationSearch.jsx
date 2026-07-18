"use client";

import { useState, useEffect, useRef, useMemo } from "react";

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

export default function LocationSearch({ onSelect, selectedLocation, query: externalQuery, onQueryChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
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

  // Debounced search
  useEffect(() => {
    // Skip search if user just selected a suggestion
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (!query || query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (!GEOAPIFY_API_KEY) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
        url.searchParams.set("text", query);
        url.searchParams.set("apiKey", GEOAPIFY_API_KEY);
        url.searchParams.set("limit", "5");

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(`Geocoding failed: ${res.status}`);
        }
        const data = await res.json();

        const features = (data.features || []).map((f) => ({
          formatted_address: f.properties.formatted || "",
          address_line_1: f.properties.address_line1 || "",
          city: f.properties.city || "",
          state: f.properties.state || "",
          state_code: f.properties.state_code || "",
          postal_code: f.properties.postcode || "",
          country: f.properties.country || "",
          latitude: f.properties.lat || null,
          longitude: f.properties.lon || null,
        }));

        setSuggestions(features);
        setShowDropdown(features.length > 0);
      } catch (err) {
        // Silently fail — geocoding is optional
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (suggestion) => {
    console.log("[LocationSearch] handleSelect called with:", suggestion);
    justSelectedRef.current = true;
    onQueryChange?.(suggestion.formatted_address);
    setShowDropdown(false);
    onSelect?.(suggestion);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        placeholder="Search address, road, city, or location..."
        value={query}
        onChange={(e) => {
          onQueryChange?.(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        style={{
          width: "100%",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          padding: "8px 12px",
          fontSize: "13px",
          outline: "none",
        }}
      />
      {loading && <span style={{ position: "absolute", right: "10px", top: "10px", fontSize: "11px", color: "#94a3b8" }}>...</span>}

      {showDropdown && suggestions.length > 0 && (
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
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(s)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: idx < suggestions.length - 1 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div style={{ fontSize: "13px", color: "#1e293b" }}>{s.label}</div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                {[s.address_line_1, s.city, s.state_code, s.postal_code].filter(Boolean).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}