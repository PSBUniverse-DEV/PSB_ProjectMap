"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Button, Modal, toastError } from "@/shared/components/ui";
import { useAuth } from "@/core/auth/useAuth";
import { loadProjectComments, addProjectComment, deleteProjectComment } from "../data/projectMap.actions";
import { PROJECT_COMMENT_MAX_LENGTH } from "../data/projectMap.data";

function formatCommentTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * ProjectComments — a simple team comment thread for one project, shown in
 * the project detail drawer. Self-contained: it loads and saves through the
 * comment server actions.
 *
 * Rules:
 * - Oldest comment first; a new comment is added at the bottom.
 * - A user can delete only their own comments (the server enforces this;
 *   the trash button is just hidden for everyone else). No editing.
 * - No animations, and no live refresh: the thread loads when the drawer
 *   opens. The parent must pass a `key` that changes with the project so
 *   the thread reloads when the user switches projects.
 *
 * @param {number} projectId
 */
export default function ProjectComments({ projectId }) {
  const { dbUser } = useAuth();
  const [comments, setComments] = useState(null); // null = still loading
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmComment, setConfirmComment] = useState(null); // comment awaiting delete confirmation

  // Sent to the server as a fallback identity only; when a signed session
  // exists the server uses that instead (see resolveCommentAuthor).
  const currentUserId = dbUser?.user_id != null ? String(dbUser.user_id) : null;
  const fallbackAuthor = {
    userId: dbUser?.user_id ?? null,
    name: [dbUser?.first_name, dbUser?.last_name].filter(Boolean).join(" ") || dbUser?.email || "",
  };

  useEffect(() => {
    let cancelled = false;
    loadProjectComments(projectId)
      .then((rows) => { if (!cancelled) setComments(rows || []); })
      .catch((err) => {
        if (cancelled) return;
        setComments([]);
        toastError(err?.message || "Failed to load comments.", "Comments");
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const trimmedDraft = draft.trim();
  const canPost = trimmedDraft.length > 0 && !posting;

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      const row = await addProjectComment(projectId, trimmedDraft, fallbackAuthor);
      setComments((prev) => [...(prev || []), row]);
      setDraft("");
    } catch (err) {
      toastError(err?.message || "Could not post the comment.", "Comments");
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter (Cmd+Enter on Mac) posts; plain Enter adds a new line.
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handlePost();
    }
  };

  const handleConfirmDelete = async () => {
    const comment = confirmComment;
    if (!comment) return;
    setConfirmComment(null);
    // Optimistic: drop the comment right away, put it back only if the delete fails.
    setComments((prev) => (prev || []).filter((c) => c.id !== comment.id));
    try {
      await deleteProjectComment(comment.id, fallbackAuthor);
    } catch (err) {
      setComments((prev) =>
        (prev || []).some((c) => c.id === comment.id)
          ? prev
          : [...(prev || []), comment].sort((a, b) => a.id - b.id)
      );
      toastError(err?.message || "Could not delete the comment.", "Comments");
    }
  };

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "#27374f", textTransform: "uppercase", marginBottom: "6px", letterSpacing: "0.5px" }}>
        <u>Comments</u>{comments && comments.length > 0 ? ` (${comments.length})` : ""}
      </div>

      {comments === null ? (
        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>Loading...</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "6px" }}>No comments yet.</div>
      ) : (
        comments.map((comment) => {
          const isOwn = currentUserId != null && comment.created_by != null && String(comment.created_by) === currentUserId;
          return (
            <div key={comment.id} style={{ padding: "6px 8px", marginBottom: "4px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#1e293b" }}>{comment.author_name || "Unknown"}</span>
                <span style={{ flex: 1, fontSize: "9px", color: "#94a3b8" }}>{formatCommentTime(comment.created_at)}</span>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => setConfirmComment(comment)}
                    title="Delete comment"
                    aria-label="Delete your comment"
                    style={{ background: "none", border: "none", padding: 0, color: "#94a3b8", cursor: "pointer", fontSize: "10px", lineHeight: 1 }}
                  >
                    <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div style={{ fontSize: "11px", color: "#1e293b", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{comment.comment_text}</div>
            </div>
          );
        })
      )}

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={PROJECT_COMMENT_MAX_LENGTH}
        rows={2}
        placeholder="Write a comment..."
        aria-label="Write a comment"
        style={{ display: "block", width: "100%", marginTop: "6px", padding: "6px 8px", fontSize: "11px", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: "4px", resize: "vertical", outline: "none", fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
        <span style={{ fontSize: "9px", color: "#94a3b8" }}>Ctrl+Enter to post</span>
        <button
          type="button"
          onClick={handlePost}
          disabled={!canPost}
          style={{ padding: "3px 12px", fontSize: "11px", fontWeight: 600, borderRadius: "4px", border: "none", background: canPost ? "#1e293b" : "#cbd5e1", color: "#fff", cursor: canPost ? "pointer" : "not-allowed" }}
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      {confirmComment ? (
        <Modal
          show
          animation={false}
          onHide={() => setConfirmComment(null)}
          title="Delete comment"
          footer={
            <>
              <Button variant="outline-secondary" size="sm" onClick={() => setConfirmComment(null)}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete}>Delete</Button>
            </>
          }
        >
          <div style={{ fontSize: "14px" }}>Delete this comment? This cannot be undone.</div>
        </Modal>
      ) : null}
    </div>
  );
}
