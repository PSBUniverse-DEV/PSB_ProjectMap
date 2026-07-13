"use client";

import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTable,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

const ICONS = {
  projectStatuses: faTable,
};

/**
 * SetupSidebar — Compact vertical navigation resembling a schema explorer.
 */
export default function SetupSidebar({ tables, activeKey, onSelect }) {
  const [filter, setFilter] = useState("");
  const inputRef = useRef(null);

  const filtered = filter
    ? tables.filter((t) => t.label.toLowerCase().includes(filter.toLowerCase()))
    : tables;

  // Focus search on Ctrl+K within sidebar
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="setup-sidebar">
      <div className="setup-sidebar__header">
        <span className="setup-sidebar__title">Tables</span>
        <span className="setup-sidebar__count">{tables.length}</span>
      </div>

      <div className="setup-sidebar__search">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="setup-sidebar__search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="setup-sidebar__search-input"
          placeholder="Search tables..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <nav className="setup-sidebar__nav">
        {filtered.map((t) => (
          <button
            key={t.key}
            className={`setup-sidebar__item ${activeKey === t.key ? "setup-sidebar__item--active" : ""}`}
            onClick={() => onSelect(t.key)}
            title={t.label}
          >
            <FontAwesomeIcon icon={ICONS[t.key] || faTable} className="setup-sidebar__item-icon" />
            <span className="setup-sidebar__item-label">{t.label}</span>
            <span className="setup-sidebar__item-badge">{t.count ?? ""}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="setup-sidebar__empty">No tables match</div>
        )}
      </nav>
    </div>
  );
}