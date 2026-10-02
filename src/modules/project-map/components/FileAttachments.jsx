"use client";

import { useEffect, useRef, useState } from "react";
import { toastError, toastSuccess } from "@/shared/components/ui";
import { getSupabase } from "@/core/supabase/client";
import { loadFiles, createFileUpload, saveUploadedFile, getFileUrl, deleteFile } from "../data/projectMap.actions";

const ACCEPTED_TYPES = "image/*,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * FileAttachments — list / upload / open / delete files attached to a
 * project or a run. Self-contained: it loads and saves through the file
 * server actions, so the parent only says who the owner is.
 *
 * Upload flow: ask the server for a one-time signed upload URL, send the
 * file straight to Supabase Storage, then save the row. The file never
 * passes through a server action.
 *
 * The parent must pass `key={ownerId}` so the list resets when the user
 * switches to another project/run.
 *
 * @param {"project"|"run"} ownerType
 * @param {number} ownerId
 */
export default function FileAttachments({ ownerType, ownerId }) {
  const [files, setFiles] = useState(null); // null = still loading
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadFiles(ownerType, ownerId)
      .then((rows) => { if (!cancelled) setFiles(rows); })
      .catch((err) => {
        if (cancelled) return;
        setFiles([]);
        toastError(err?.message || "Failed to load attachments.", "Attachments");
      });
    return () => { cancelled = true; };
  }, [ownerType, ownerId]);

  const handleUpload = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // allow picking the same file again later
    if (picked.length === 0) return;

    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          toastError(`${file.name} is larger than 10 MB.`, "Attachments");
          continue;
        }
        const meta = { name: file.name, type: file.type, size: file.size };
        const { bucket, storagePath, token } = await createFileUpload(ownerType, ownerId, meta);
        const { error } = await getSupabase()
          .storage.from(bucket)
          .uploadToSignedUrl(storagePath, token, file, { contentType: file.type });
        if (error) throw new Error(error.message);
        const row = await saveUploadedFile(ownerType, ownerId, storagePath, meta);
        setFiles((prev) => [row, ...(prev || [])]);
        uploaded += 1;
      }
      if (uploaded > 0) toastSuccess(uploaded === 1 ? "File attached." : `${uploaded} files attached.`, "Attachments");
    } catch (err) {
      toastError(err?.message || "Upload failed.", "Attachments");
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (file) => {
    // Open the tab during the click so popup blockers allow it, then point
    // it at the short-lived signed link once the server returns it.
    const win = window.open("", "_blank");
    try {
      const { url } = await getFileUrl(file.id);
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (err) {
      if (win) win.close();
      toastError(err?.message || "Could not open the file.", "Attachments");
    }
  };

  const handleDelete = async (file) => {
    if (busyId || !window.confirm(`Delete ${file.file_name}? This cannot be undone.`)) return;
    setBusyId(file.id);
    try {
      await deleteFile(file.id);
      setFiles((prev) => (prev || []).filter((f) => f.id !== file.id));
      toastSuccess("File deleted.", "Attachments");
    } catch (err) {
      toastError(err?.message || "Could not delete the file.", "Attachments");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <u>Attachments</u>{files && files.length > 0 ? ` (${files.length})` : ""}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "4px", border: "1px solid #e2e8f0", background: "#fff", color: "#1e293b", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? "Uploading..." : "+ Add file"}
        </button>
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={handleUpload} style={{ display: "none" }} />
      </div>

      {files === null ? (
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>Loading...</div>
      ) : files.length === 0 ? (
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>No files attached. Images and PDF, up to 10 MB.</div>
      ) : (
        files.map((file) => (
          <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0", borderBottom: "1px solid #f2f2f2" }}>
            <button
              type="button"
              onClick={() => handleOpen(file)}
              title={file.file_name}
              style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "11px", fontWeight: 600, color: "#2563eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {file.file_name}
            </button>
            <span style={{ fontSize: "9px", color: "#94a3b8", flexShrink: 0 }}>{formatFileSize(file.file_size)}</span>
            <button
              type="button"
              onClick={() => handleDelete(file)}
              disabled={busyId === file.id}
              title="Delete file"
              aria-label={`Delete ${file.file_name}`}
              style={{ background: "none", border: "none", color: "#dc2626", cursor: busyId === file.id ? "default" : "pointer", fontSize: "14px", fontWeight: 700, padding: 0, lineHeight: 1, opacity: busyId === file.id ? 0.5 : 1, flexShrink: 0 }}
            >×</button>
          </div>
        ))
      )}
    </div>
  );
}
