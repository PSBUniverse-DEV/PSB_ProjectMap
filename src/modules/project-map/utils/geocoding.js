/**
 * Reverse geocoding utility using Geoapify API.
 * Converts latitude/longitude coordinates to address information.
 */

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

/**
 * Reverse geocodes coordinates to address information.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Address object with properties or null if failed
 */
/**
 * Reverse geocodes coordinates to address information.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Address object with properties or null if failed
 */
export async function reverseGeocode(lat, lng) {
  if (!GEOAPIFY_API_KEY) {
    console.warn("[Geocoding] No Geoapify API key configured");
    return null;
  }

  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("apiKey", GEOAPIFY_API_KEY);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[Geocoding] API request failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const feature = data.features?.[0];
    
    if (!feature) {
      console.warn("[Geocoding] No results found for coordinates");
      return null;
    }

    const props = feature.properties;
    
    return {
      formatted_address: props.formatted || "",
      address_line_1: props.address_line1 || "",
      city: props.city || "",
      state: props.state || "",
      state_code: props.state_code || "",
      postal_code: props.postcode || "",
      country: props.country || "",
      latitude: props.lat || lat,
      longitude: props.lon || lng,
    };
  } catch (err) {
    console.error("[Geocoding] Reverse geocoding failed:", err);
    return null;
  }
}

/**
 * Forward geocodes a search query to location information.
 * Supports addresses, cities, places, and coordinates (lat,lng format).
 * 
 * @param {string} query - Search query (address, city, place, or "lat,lng")
 * @param {number} [limit=50] - Maximum number of results
 * @param {Object} [options] - Optional parameters
 * @param {Array<number>} [options.proximity] - [lng, lat] for proximity bias
 * @returns {Promise<Array>} Array of location objects
 */
export async function forwardGeocode(query, limit = 50, options = {}) {
  if (!GEOAPIFY_API_KEY) {
    console.warn("[Geocoding] No Geoapify API key configured");
    return [];
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
    url.searchParams.set("text", query.trim());
    url.searchParams.set("apiKey", GEOAPIFY_API_KEY);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("bias", "countrycode:none"); // Disable country bias for global search

    // Add proximity bias if provided (prioritize nearby results)
    if (options.proximity && Array.isArray(options.proximity) && options.proximity.length === 2) {
      url.searchParams.set("proximity", `${options.proximity[0]},${options.proximity[1]}`);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[Geocoding] Forward geocoding failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const features = data.features || [];
    
    return features.map((f) => {
      const props = f.properties;
      return {
        formatted_address: props.formatted || "",
        address_line_1: props.address_line1 || "",
        city: props.city || "",
        state: props.state || "",
        state_code: props.state_code || "",
        postal_code: props.postcode || "",
        country: props.country || "",
        latitude: props.lat,
        longitude: props.lon,
      };
    });
  } catch (err) {
    console.error("[Geocoding] Forward geocoding failed:", err);
    return [];
  }
}

/**
 * Searches for places and businesses using Geoapify Places API.
 * Better for finding named places like malls, restaurants, landmarks.
 * 
 * @param {string} query - Search query (business name, place, landmark)
 * @param {number} [limit=20] - Maximum number of results
 * @param {Array<number>} [proximity] - [lng, lat] for proximity bias
 * @returns {Promise<Array>} Array of location objects
 */
