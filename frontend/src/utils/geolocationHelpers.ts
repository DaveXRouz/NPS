/** Request browser geolocation with timeout */
export function getCurrentPosition(
  timeout = 10000,
): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 10000) / 10000,
          lon: Math.round(pos.coords.longitude * 10000) / 10000,
        }),
      (err) => reject(err),
      { timeout, enableHighAccuracy: false },
    );
  });
}

/** Country from location API */
export interface Country {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset_hours: number;
  timezone_offset_minutes: number;
}

/** City from location API */
export interface City {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Fetch all countries from the location API */
export async function fetchCountries(lang: string = "en"): Promise<Country[]> {
  try {
    const resp = await fetch(`/api/location/countries?lang=${lang}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.countries;
  } catch {
    return [];
  }
}

/** Fetch cities for a country from the location API */
export async function fetchCities(
  countryCode: string,
  lang: string = "en",
): Promise<City[]> {
  try {
    const resp = await fetch(
      `/api/location/countries/${countryCode}/cities?lang=${lang}`,
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.cities;
  } catch {
    return [];
  }
}
