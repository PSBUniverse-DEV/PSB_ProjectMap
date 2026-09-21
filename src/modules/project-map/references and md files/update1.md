
full reset of the custom badge implementation. Reverting to MapLibre's own default `Marker`, with the multi-order info surfaced on hover instead of a custom click popup. I'm also folding in the proximity-based grouping fix from before (exact-decimal matching was why you saw 2 badges instead of 1 group of 3) since I'm rewriting this same block anyway.Now the complete revert-and-rebuild prompt:

---

# reset-to-default-pin-with-hover-list.md

## Task
Remove the custom SVG badge marker entirely. Multi-order locations should use MapLibre's normal built-in `Marker` (the same pin style as every other project), with the list of orders at that address revealed on **hover**, not click. Also fix the underlying grouping to match by real-world proximity instead of exact-decimal coordinate matching, since that was confirmed to be splitting genuinely co-located orders into separate groups.

All changes are in `src/modules/project-map/components/ProjectMap.jsx`.

## 1. Update the ref comment
Find:
```js
  const clusterMarkersMapRef = useRef({}); // coordKey -> { marker, listPopup } — one badge marker per group of projects sharing an exact coordinate
```
Replace with:
```js
  const clusterMarkersMapRef = useRef({}); // groupKey -> { marker, hoverPopup, persistentPopup } — one default-style marker per group of projects at the same physical location
```

## 2. Update teardown cleanup field names
Find:
```js
      Object.values(clusterMarkersMapRef.current).forEach((bundle) => {
        try { bundle.listPopup?.remove(); } catch (e) {}
        try { bundle.marker?.remove(); } catch (e) {}
      });
      clusterMarkersMapRef.current = {};
```
Replace with:
```js
      Object.values(clusterMarkersMapRef.current).forEach((bundle) => {
        try { bundle.persistentPopup?.remove(); } catch (e) {}
        try { bundle.hoverPopup?.remove(); } catch (e) {}
        try { bundle.marker?.remove(); } catch (e) {}
      });
      clusterMarkersMapRef.current = {};
```

## 3. Add a distance helper (module scope, above the component)
Find:
```js
function getOrdinalStop(sequence) {
```
Add immediately before it:
```js
// Great-circle distance between two coordinates in meters (Haversine formula).
// Used to group projects that are physically close together (same lot),
// since real-world geocoding rarely returns byte-identical coordinates for
// what is nominally "the same address" — exact-decimal matching missed that.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Projects within this distance of each other are treated as "the same lot".
// 30m (~100ft) catches same-parcel geocoding variance without merging
// genuinely separate nearby properties.
const CLUSTER_DISTANCE_METERS = 30;
```

## 4. Replace exact-match grouping with proximity grouping
Find:
```js
    // Group projects sharing the exact same coordinate — e.g. several orders
    // on the same lot — so they can be rendered as a single count-badge
    // cluster marker below. Without
    // this, coincident markers stack on the same pixel and only the topmost
    // one can ever be clicked; the others become invisible and unreachable.
    // Rounding to 6 decimals (~11cm) groups truly-identical coordinates
    // without touching genuinely distinct nearby addresses.
    const coordGroups = new Map();
    filteredProjects.forEach((project) => {
      const gLat = project.site_latitude ?? project.address_latitude;
      const gLng = project.site_longitude ?? project.address_longitude;
      if (gLat == null || gLng == null) return;
      const key = `${Number(gLat).toFixed(6)},${Number(gLng).toFixed(6)}`;
      if (!coordGroups.has(key)) coordGroups.set(key, []);
      coordGroups.get(key).push(project.id);
    });
```
Replace with:
```js
    // Group projects that are physically close together (same lot) — e.g.
    // several orders on one parcel — so they render as a single marker
    // instead of stacking invisibly on top of each other. Grouped by
    // real-world distance (CLUSTER_DISTANCE_METERS), not exact coordinate
    // match, since the same physical address commonly geocodes to slightly
    // different coordinates each time it's looked up.
    //
    // Single-linkage clustering: starting from each ungrouped project, pull
    // in every other ungrouped project within range of ANY member already
    // in the growing group (a short BFS), so a chain of nearby points all
    // end up in one group even if the two farthest-apart members aren't
    // directly within range of each other.
    const coordGroups = new Map(); // groupKey -> [project ids]
    const projectIdToGroupKey = new Map(); // project id -> groupKey
    {
      const validProjects = filteredProjects.filter((p) => {
        const lat = p.site_latitude ?? p.address_latitude;
        const lng = p.site_longitude ?? p.address_longitude;
        return lat != null && lng != null;
      });
      const assigned = new Set();
      let groupCounter = 0;
      validProjects.forEach((seed) => {
        if (assigned.has(seed.id)) return;
        const groupIds = [];
        const queue = [seed];
        assigned.add(seed.id);
        while (queue.length > 0) {
          const current = queue.shift();
          groupIds.push(current.id);
          const curLat = current.site_latitude ?? current.address_latitude;
          const curLng = current.site_longitude ?? current.address_longitude;
          validProjects.forEach((other) => {
            if (assigned.has(other.id)) return;
            const otherLat = other.site_latitude ?? other.address_latitude;
            const otherLng = other.site_longitude ?? other.address_longitude;
            if (distanceMeters(curLat, curLng, otherLat, otherLng) <= CLUSTER_DISTANCE_METERS) {
              assigned.add(other.id);
              queue.push(other);
            }
          });
        }
        const groupKey = `cluster-${groupCounter++}`;
        coordGroups.set(groupKey, groupIds);
        groupIds.forEach((pid) => projectIdToGroupKey.set(pid, groupKey));
      });
    }
```

## 5. Update the per-project lookup
Find:
```js
      // Projects sharing the exact same coordinate (e.g. several orders on
      // one lot) are NOT rendered as individual markers here — they're
      // handled once, together, as a single count-badge marker in the
      // cluster pass below. This branch only ever runs for a coordinate
      // that is NOT shared with any other project.
      const coordKey = `${rawLat.toFixed(6)},${rawLng.toFixed(6)}`;
      const group = coordGroups.get(coordKey) || [id];
```
Replace with:
```js
      // Projects grouped into the same physical-proximity cluster (e.g.
      // several orders on one lot) are NOT rendered as individual markers
      // here — they're handled once, together, as a single default-style
      // marker in the pass below. This branch only ever runs for a project
      // whose group has exactly one member.
      const projGroupKey = projectIdToGroupKey.get(id);
      const group = (projGroupKey && coordGroups.get(projGroupKey)) || [id];
```

## 6. Replace the entire custom badge marker block with a default Marker + hover list
Find everything from the comment through the stale-cleanup loop:
```js
    // Coincident-address clusters: every group of 2+ projects sharing the
    // exact same coordinate gets ONE marker with a count badge instead of
    // stacking invisibly on top of each other. Clicking it opens a small
    // list so the user can pick which specific order to open.
    const newClusterMarkersMap = {};
    coordGroups.forEach((projectIdsInGroup, groupCoordKey) => {
      if (projectIdsInGroup.length < 2) return;

      const groupProjects = projectIdsInGroup
        .map((pid) => filteredProjects.find((p) => p.id === pid))
        .filter(Boolean);
      if (groupProjects.length < 2) return;

      const first = groupProjects[0];
      const clusterLat = first.site_latitude ?? first.address_latitude;
      const clusterLng = first.site_longitude ?? first.address_longitude;
      if (clusterLat == null || clusterLng == null) return;

      const existingCluster = clusterMarkersMapRef.current[groupCoordKey];
      if (existingCluster) {
        try { existingCluster.listPopup?.remove(); } catch (e) {}
        try { existingCluster.marker?.remove(); } catch (e) {}
      }

      const el = document.createElement("div");
      el.style.cssText = `
        position: relative;
        width: 34px;
        height: 34px;
        cursor: pointer;
      `;
      el.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
          <circle cx="17" cy="17" r="15" fill="#4338ca" stroke="#ffffff" stroke-width="2.5" />
        </svg>
        <div style="
          position: absolute; top: 0; left: 0; width: 34px; height: 34px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 13px; font-family: inherit;
          pointer-events: none;
        ">${groupProjects.length}</div>
      `;

      const clusterMarker = new MapLibreGL.Marker({ element: el, anchor: "center" })
        .setLngLat([clusterLng, clusterLat])
        .addTo(map);

      const listContent = document.createElement("div");
      listContent.style.cssText = "min-width: 220px; max-width: 280px;";
      const header = document.createElement("div");
      header.style.cssText = "padding: 8px 10px 6px; font-size: 11px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0;";
      header.textContent = `${groupProjects.length} orders at this address`;
      listContent.appendChild(header);

      groupProjects.forEach((p) => {
        const row = document.createElement("div");
        row.style.cssText = "padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;";
        const subtotalStr = p.project_subtotal != null
          ? `$${Number(p.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—";
        row.innerHTML = `
          <div style="font-weight: 600; font-size: 12px; color: #1e293b;">${p.client_name || "Untitled"}</div>
          <div style="font-size: 10px; color: #16a34a; font-weight: 600;">${subtotalStr}</div>
        `;
        row.addEventListener("mouseenter", () => { row.style.background = "#f8fafc"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
        row.addEventListener("click", () => {
          try { listPopup.remove(); } catch (e) {}
          onSelectProject?.(p.id);
        });
        listContent.appendChild(row);
      });

      const listPopup = new MapLibreGL.Popup({
        closeButton: true,
        closeOnClick: true,
        anchor: "bottom",
        offset: 20,
        className: "project-cluster-picker",
      })
        .setLngLat([clusterLng, clusterLat])
        .setDOMContent(listContent);

      el.addEventListener("click", () => {
        if (listPopup.isOpen()) {
          listPopup.remove();
        } else {
          listPopup.addTo(map);
        }
      });

      newClusterMarkersMap[groupCoordKey] = { marker: clusterMarker, listPopup };
    });

    Object.keys(clusterMarkersMapRef.current).forEach((key) => {
      if (!newClusterMarkersMap[key]) {
        const bundle = clusterMarkersMapRef.current[key];
        try { bundle.listPopup?.remove(); } catch (e) {}
        try { bundle.marker?.remove(); } catch (e) {}
      }
    });
    clusterMarkersMapRef.current = newClusterMarkersMap;
```

Replace with:
```js
    // Multi-order locations: every group of 2+ projects at the same physical
    // spot gets ONE normal MapLibre marker — same pin style as everywhere
    // else, positioned and managed entirely by MapLibre itself (so it tracks
    // zoom/pan correctly, unlike a manually-positioned custom element).
    // Hovering it reveals the list of orders at that address; clicking a row
    // in that list selects that specific project, same as clicking any
    // normal pin does.
    const newClusterMarkersMap = {};
    coordGroups.forEach((projectIdsInGroup, groupKey) => {
      if (projectIdsInGroup.length < 2) return;

      const groupProjects = projectIdsInGroup
        .map((pid) => filteredProjects.find((p) => p.id === pid))
        .filter(Boolean);
      if (groupProjects.length < 2) return;

      const validCoords = groupProjects
        .map((p) => ({ lat: p.site_latitude ?? p.address_latitude, lng: p.site_longitude ?? p.address_longitude }))
        .filter((c) => c.lat != null && c.lng != null);
      if (validCoords.length === 0) return;
      const clusterLat = validCoords.reduce((sum, c) => sum + c.lat, 0) / validCoords.length;
      const clusterLng = validCoords.reduce((sum, c) => sum + c.lng, 0) / validCoords.length;

      const existingCluster = clusterMarkersMapRef.current[groupKey];
      if (existingCluster) {
        try { existingCluster.persistentPopup?.remove(); } catch (e) {}
        try { existingCluster.hoverPopup?.remove(); } catch (e) {}
        try { existingCluster.marker?.remove(); } catch (e) {}
      }

      const firstStatusName = groupProjects[0].proj_s_project_status?.status_name || "";
      const markerColor = stateColorLookup[groupProjects[0].state_code] || getStatusColor(firstStatusName, statuses);

      // Standard MapLibre marker — identical construction to every other
      // pin on this map, just no per-project popups wired to it directly.
      const clusterMarker = new MapLibreGL.Marker({ color: markerColor, scale: 0.9 })
        .setLngLat([clusterLng, clusterLat])
        .addTo(map);

      // Always-visible small label (respects the same Show Labels toggle as
      // individual markers), summarizing the group instead of one name.
      const labelContent = document.createElement("div");
      labelContent.style.cssText = "font-size: 9px; color: #1e293b; line-height: 1.4;";
      labelContent.innerHTML = `<div style="font-weight: 600;">${groupProjects.length} orders here</div>`;
      const persistentPopup = new MapLibreGL.Popup({
        closeButton: false,
        closeOnClick: false,
        closeOnMove: false,
        anchor: "right",
        offset: 10,
        className: "project-persistent-label",
      })
        .setLngLat([clusterLng, clusterLat])
        .setDOMContent(labelContent);
      if (showLabelsRef.current) {
        persistentPopup.addTo(map);
      }

      // Detailed hover list — one row per project, each clickable.
      const listContent = document.createElement("div");
      listContent.style.cssText = "min-width: 220px; max-width: 280px;";
      const header = document.createElement("div");
      header.style.cssText = "padding: 8px 10px 6px; font-size: 11px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #e2e8f0;";
      header.textContent = `${groupProjects.length} orders at this address`;
      listContent.appendChild(header);

      groupProjects.forEach((p) => {
        const row = document.createElement("div");
        row.style.cssText = "padding: 8px 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;";
        const subtotalStr = p.project_subtotal != null
          ? `$${Number(p.project_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : "—";
        row.innerHTML = `
          <div style="font-weight: 600; font-size: 12px; color: #1e293b;">${p.client_name || "Untitled"}</div>
          <div style="font-size: 10px; color: #16a34a; font-weight: 600;">${subtotalStr}</div>
        `;
        row.addEventListener("mouseenter", () => { row.style.background = "#f8fafc"; });
        row.addEventListener("mouseleave", () => { row.style.background = ""; });
        row.addEventListener("click", () => {
          try { hoverPopup.remove(); } catch (e) {}
          onSelectProject?.(p.id);
        });
        listContent.appendChild(row);
      });

      const hoverPopup = new MapLibreGL.Popup({
        anchor: "right",
        offset: 10,
        closeButton: false,
        closeOnClick: false,
        className: "project-map-tooltip",
      }).setDOMContent(listContent);

      // A hover popup with clickable rows needs to stay open while the
      // cursor travels from the marker onto the popup itself — otherwise
      // leaving the marker's tiny hit area closes it before a row can be
      // clicked. Closing is delayed slightly and cancelled if the cursor
      // enters either the marker or the popup.
      let hoverCloseTimer = null;
      const cancelHoverClose = () => {
        if (hoverCloseTimer) { clearTimeout(hoverCloseTimer); hoverCloseTimer = null; }
      };
      const scheduleHoverClose = () => {
        cancelHoverClose();
        hoverCloseTimer = setTimeout(() => { try { hoverPopup.remove(); } catch (e) {} }, 150);
      };

      const markerEl = clusterMarker.getElement();
      markerEl.addEventListener("mouseenter", () => {
        cancelHoverClose();
        try { persistentPopup.getElement().style.display = "none"; } catch (e) {}
        try {
          hoverPopup.setLngLat(clusterMarker.getLngLat()).addTo(map);
          const popupEl = hoverPopup.getElement();
          popupEl.addEventListener("mouseenter", cancelHoverClose);
          popupEl.addEventListener("mouseleave", scheduleHoverClose);
        } catch (e) {}
      });
      markerEl.addEventListener("mouseleave", () => {
        scheduleHoverClose();
        try { persistentPopup.getElement().style.display = ""; } catch (e) {}
      });

      newClusterMarkersMap[groupKey] = { marker: clusterMarker, hoverPopup, persistentPopup };
    });

    Object.keys(clusterMarkersMapRef.current).forEach((key) => {
      if (!newClusterMarkersMap[key]) {
        const bundle = clusterMarkersMapRef.current[key];
        try { bundle.persistentPopup?.remove(); } catch (e) {}
        try { bundle.hoverPopup?.remove(); } catch (e) {}
        try { bundle.marker?.remove(); } catch (e) {}
      }
    });
    clusterMarkersMapRef.current = newClusterMarkersMap;
```

## DO NOT
- Do not add a right-click "Add to Run" context menu to the multi-order marker — there's no single project to act on until one is picked from the hover list; this stays out of scope, same as before.
- Do not touch the single-project marker code path (persistent label, hover tooltip, click, right-click context menu) — it's unaffected and only reached for projects whose group has exactly one member.
- Do not change `CLUSTER_DISTANCE_METERS` beyond a reasonable "same lot" scale (20-50m) without checking real data — too large risks merging genuinely separate nearby properties.
- Do not add `project-cluster-picker` CSS anywhere — that class is gone along with the custom click-popup; the hover popup reuses the existing `project-map-tooltip` class already styled elsewhere.

## Verification checklist
1. `grep -n "el.innerHTML\|project-cluster-picker\|clusterMarker.getElement" src/modules/project-map/components/ProjectMap.jsx` → should return **no matches** — confirms the custom SVG element and click-popup are fully removed.
2. `grep -n "distanceMeters\|CLUSTER_DISTANCE_METERS\|projectIdToGroupKey" src/modules/project-map/components/ProjectMap.jsx` → should show the new proximity grouping in place.
3. Reload `/project-map`, zoom in and out repeatedly on a multi-order location — confirm the pin stays exactly anchored to its spot at every zoom level (this was the original bug being fixed).
4. Confirm all genuinely co-located orders now merge into **one** marker (the "should be 3 not 2" case) rather than splitting into multiple groups.
5. Hover over that marker — confirm a list of all orders appears; move the cursor from the marker onto the list without it disappearing, then click a row — confirm it opens that specific project and the list closes.
6. Move the mouse away entirely — confirm the list closes on its own after a brief moment.
7. Check a normal single-project address — confirm it's completely unaffected (own hover tooltip, click-to-select, right-click context menu all work as before).
8. Paste back the output of steps 1-2 to confirm the edit persisted to disk.