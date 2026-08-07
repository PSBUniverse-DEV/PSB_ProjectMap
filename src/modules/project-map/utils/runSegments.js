import { calculateSegmentRoutes } from "../data/projectMap.actions";

/**
 * computeRunSegmentData — builds the coordinate list for a run's
 * origin + stops and calls the routing API to get per-leg distance/
 * duration data. Shared by the map page's Recalculate Run flow and
 * the Run Master List's Print Manifest flow, so both compute route
 * segments identically.
 *
 * Returns null if there aren't enough valid coordinates to route
 * (fewer than 2) — callers decide how to handle that (block an
 * action vs. print anyway with "—" placeholders).
 */
export async function computeRunSegmentData(run, runProjects) {
  const origin = run?.proj_s_origin_addresses;
  if (!origin || origin.latitude == null || origin.longitude == null) {
    return null;
  }

  const coords = [{ lat: Number(origin.latitude), lng: Number(origin.longitude) }];

  runProjects.forEach((rp) => {
    const proj = rp.proj_t_projects || {};
    const lat = Number(proj.site_latitude ?? proj.address_latitude);
    const lng = Number(proj.site_longitude ?? proj.address_longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coords.push({ lat, lng });
    }
  });

  if (coords.length < 2) {
    return null;
  }

  const data = await calculateSegmentRoutes(coords);
  return data; // { totalDistance, totalDuration, geometry, segments, hasPartialFailure }
}
