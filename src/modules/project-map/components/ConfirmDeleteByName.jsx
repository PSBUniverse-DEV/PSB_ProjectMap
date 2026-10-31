"use client";

import { useState } from "react";
import { Button, Modal } from "@/shared/components/ui";

/**
 * ConfirmDeleteByName — confirmation for a permanent delete (projects, runs).
 * Delete only unlocks once the user types the item's name as shown (spaces
 * at the ends and upper/lower case don't matter). An item with no name asks
 * for the word DELETE instead.
 *
 * `children` is extra text shown above the name box (e.g. what happens to a
 * deleted run's projects).
 */
export default function ConfirmDeleteByName({ show, title, itemLabel, name, busy = false, onCancel, onConfirm, children }) {
  return (
    <Modal show={show} onHide={onCancel} title={title}>
      {/* Mounted only while open, so the typed text starts empty every time. */}
      {show && (
        <ConfirmBody itemLabel={itemLabel} name={name} busy={busy} onCancel={onCancel} onConfirm={onConfirm}>
          {children}
        </ConfirmBody>
      )}
    </Modal>
  );
}

function ConfirmBody({ itemLabel, name, busy, onCancel, onConfirm, children }) {
  const [typed, setTyped] = useState("");
  const expected = String(name || "").trim() || "DELETE";
  const matches = typed.trim().toLowerCase() === expected.toLowerCase();
  const confirm = () => {
    if (matches && !busy) onConfirm?.();
  };

  return (
    <div>
      {children}
      <p style={{ fontSize: "13px", color: "#1e293b", margin: "0 0 8px", lineHeight: 1.5 }}>
        Enter the selected {itemLabel}&apos;s name to delete <strong style={{ wordBreak: "break-word" }}>{expected}</strong>
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
        placeholder={`Type the ${itemLabel} name`}
        aria-label={`Type the ${itemLabel} name to confirm`}
        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "3px", padding: "6px 8px", fontSize: "13px", marginBottom: "16px" }}
      />
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" loading={busy} disabled={!matches || busy} onClick={confirm}>Delete</Button>
      </div>
    </div>
  );
}
