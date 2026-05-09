// Vercel Edge Function — Google Places (New) Text Search
export const config = { runtime: "edge" };

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const SOCIAL_HOSTS = [
  "facebook.com", "fb.com", "instagram.com", "tiktok.com",
  "linktr.ee", "twitter.com", "x.com", "linkedin.com", "youtube.com",
];

function isSocial(url) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return SOCIAL_HOSTS.some((h) => u.hostname.replace(/^www\./, "").endsWith(h));
  } catch { return false; }
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json({ leads: [], total: 0, error: "Google Places API key is not configured." });
  }

  let body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const niche = String(body?.niche ?? "").slice(0, 200);
  const location = String(body?.location ?? "").slice(0, 200);
  const country = String(body?.country ?? "").slice(0, 100);
  const textQuery = [niche, location, country].filter(Boolean).join(" ");

  if (!textQuery) return Response.json({ leads: [], total: 0, error: "Empty query." });

  const fieldMask = [
    "places.id","places.displayName","places.formattedAddress",
    "places.nationalPhoneNumber","places.internationalPhoneNumber",
    "places.websiteUri","places.googleMapsUri","places.location",
    "places.primaryTypeDisplayName","places.primaryType","places.types",
    "nextPageToken",
  ].join(",");

  const all = [];
  let pageToken;
  for (let page = 0; page < 3; page++) {
    const reqBody = { textQuery, pageSize: 20 };
    if (pageToken) reqBody.pageToken = pageToken;

    const res = await fetch(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(reqBody),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({
        leads: [], total: 0,
        error: json?.error?.message || `Google Places error (${res.status}).`,
      });
    }
    if (json.places?.length) all.push(...json.places);
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
    await new Promise((r) => setTimeout(r, 1500));
  }

  const leads = all.map((p) => {
    const website = p.websiteUri;
    const social = isSocial(website);
    return {
      id: p.id,
      name: p.displayName?.text || p.formattedAddress || "Unnamed business",
      category: p.primaryTypeDisplayName?.text || p.primaryType?.replace(/_/g, " "),
      address: p.formattedAddress,
      lat: p.location?.latitude,
      lon: p.location?.longitude,
      phone: p.internationalPhoneNumber || p.nationalPhoneNumber,
      website,
      socialOnly: !website ? true : social,
      socialUrl: social ? website : undefined,
      mapsUrl: p.googleMapsUri ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          p.displayName?.text || textQuery,
        )}&query_place_id=${p.id}`,
    };
  });

  const filtered = leads.filter((l) => !l.website || l.socialOnly);
  return Response.json({ leads: filtered, total: leads.length, error: null });
}
