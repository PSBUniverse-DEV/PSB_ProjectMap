"use client";

/**
 * SetupWorkspaceLayout — Full-height enterprise workspace shell.
 * Provides sidebar + main content split with sticky positioning.
 */
export default function SetupWorkspaceLayout({ sidebar, toolbar, children }) {
  return (
    <div className="setup-workspace">
      <aside className="setup-workspace__sidebar">{sidebar}</aside>
      <div className="setup-workspace__main">
        {toolbar && <div className="setup-workspace__toolbar">{toolbar}</div>}
        <div className="setup-workspace__content">{children}</div>
      </div>
    </div>
  );
}