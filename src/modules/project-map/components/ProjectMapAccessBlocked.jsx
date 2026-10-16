const REASON_MESSAGES = {
  "no-role": "Your user account has no active Project Map role, so Project Map cannot be shown.",
  "no-session": "Your sign-in could not be read, so Project Map cannot be shown.",
  "no-user": "Your user record could not be found, so Project Map cannot be shown.",
  "no-run-mapping": "No run statuses are set up yet, so runs cannot be shown.",
  error: "Your Project Map access could not be checked.",
};

/**
 * Shown instead of the Project Map when the signed-in user has no project
 * statuses assigned (see loadProjectStatusTabAccess). Nothing else is loaded
 * for these users; the details are here so they can screenshot them.
 */
export default function ProjectMapAccessBlocked({ access, page = "Project Map" }) {
  const rows = [
    ["Reason", access?.reason || "--"],
    ["User", access?.user?.name || access?.user?.username || "--"],
    ["Email", access?.user?.email || "--"],
    ["User ID", access?.user?.userId ?? "--"],
    ["Project Map roles", access?.roles?.length ? access.roles.map((role) => role.name).join(", ") : "None"],
    ["Role IDs", access?.roles?.length ? access.roles.map((role) => role.roleId).join(", ") : "--"],
    ["Page", page],
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px", background: "#f8fafc", minHeight: "70vh" }}>
      <div style={{ width: "100%", maxWidth: "480px", alignSelf: "flex-start", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", color: "#1e293b" }}>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>{page} Not Available</h2>
        <p style={{ margin: 0 }}>{REASON_MESSAGES[access?.reason] || REASON_MESSAGES.error}</p>
        <p style={{ margin: 0 }}>Please take a screenshot of this message and send it to the developers.</p>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: "5px 10px", fontSize: "11px", fontWeight: 600, color: "#64748b", width: "130px" }}>{label}</td>
                <td style={{ padding: "5px 10px", fontSize: "12px", color: "#1e293b", fontFamily: "ui-monospace, Consolas, monospace" }}>{String(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
