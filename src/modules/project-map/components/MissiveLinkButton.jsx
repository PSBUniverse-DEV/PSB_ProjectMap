"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeOpenText } from "@fortawesome/free-solid-svg-icons";

// Small icon button that opens the project's Missive email thread in a new tab.
// Shows nothing when the project has no saved link (or it is not a web link).
// Stops the click so clickable / draggable rows around it do not react.
export default function MissiveLinkButton({ url, size = 12, style }) {
  const link = String(url || "").trim();
  if (!/^https?:\/\//i.test(link)) return null;
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title="Open Missive email"
      aria-label="Open Missive email"
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: `${size + 10}px`, height: `${size + 10}px`, borderRadius: "4px", color: "#2563eb", fontSize: `${size}px`, lineHeight: 1, textDecoration: "none", ...style }}
    >
      <FontAwesomeIcon icon={faEnvelopeOpenText} aria-hidden="true" />
    </a>
  );
}