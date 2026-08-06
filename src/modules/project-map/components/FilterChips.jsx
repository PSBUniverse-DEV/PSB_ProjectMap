"use client";

import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

export default function FilterChips({
  filters = {},
  onRemoveFilter,
  statuses = [],
  permitStatuses = [],
  welcomeCallStatuses = [],
}) {
  // Build readable filter labels
  const filterLabels = useMemo(() => {
    const labels = [];

    if (filters.status) {
      const status = statuses.find((s) => String(s.status_id) === filters.status);
      if (status) {
        labels.push({
          key: "status",
          label: `Project Status: ${status.status_name}`,
        });
      }
    }

    if (filters.permitStatus) {
      const permit = permitStatuses.find((p) => String(p.id) === filters.permitStatus);
      if (permit) {
        labels.push({
          key: "permitStatus",
          label: `Permit Status: ${permit.status_name}`,
        });
      }
    }

    if (filters.welcomeCallStatus) {
      const welcome = welcomeCallStatuses.find((w) => String(w.id) === filters.welcomeCallStatus);
      if (welcome) {
        labels.push({
          key: "welcomeCallStatus",
          label: `Welcome Call: ${welcome.status_name}`,
        });
      }
    }

    if (filters.dealer) {
      labels.push({
        key: "dealer",
        label: `Dealer: ${filters.dealer}`,
      });
    }

    if (filters.state) {
      labels.push({
        key: "state",
        label: `State: ${filters.state}`,
      });
    }

    if (filters.orderReceivedFrom || filters.orderReceivedTo) {
      const from = filters.orderReceivedFrom ? filters.orderReceivedFrom : "—";
      const to = filters.orderReceivedTo ? filters.orderReceivedTo : "—";
      labels.push({
        key: "orderReceived",
        label: `Order Received: ${from} to ${to}`,
      });
    }

    if (filters.scheduledFrom || filters.scheduledTo) {
      const from = filters.scheduledFrom ? filters.scheduledFrom : "—";
      const to = filters.scheduledTo ? filters.scheduledTo : "—";
      labels.push({
        key: "scheduled",
        label: `Scheduled: ${from} to ${to}`,
      });
    }

    if (filters.installFrom || filters.installTo) {
      const from = filters.installFrom ? filters.installFrom : "—";
      const to = filters.installTo ? filters.installTo : "—";
      labels.push({
        key: "install",
        label: `Arrival: ${from} to ${to}`,
      });
    }

    return labels;
  }, [filters, statuses, permitStatuses, welcomeCallStatuses]);

  if (filterLabels.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        padding: "6px 10px",
        background: "#f0f9ff",
        borderBottom: "1px solid #bfdbfe",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {filterLabels.map((item) => (
        <div
          key={item.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 8px",
            background: "#fff",
            border: "1px solid #93c5fd",
            borderRadius: "3px",
            fontSize: "11px",
            color: "#1e40af",
          }}
        >
          <span>{item.label}</span>
          <button
            onClick={() => onRemoveFilter?.(item.key)}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              fontSize: "10px",
            }}
            title="Remove filter"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      ))}
    </div>
  );
}
