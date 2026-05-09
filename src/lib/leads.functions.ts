import { createServerFn } from "@tanstack/react-start";

const UA = "BusinessDetailsGetter/1.0 (Global Geek Technologies)";
const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

export type Lead = {
  id: string;
  name: string;
  category?: string;
  address?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  email?: string;
  website?: string;
  socialOnly?: boolean;
  socialUrl?: string;
  mapsUrl: string;
};

const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "linktr.ee",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
];

function isSocial(url?: string) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return SOCIAL_HOSTS.some((h) => u.hostname.replace(/^www\./, "").endsWith(h));
  } catch {
    return false;
  }
}

type PlacesResponse = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    location?: { latitude: number; longitude: number };
    primaryTypeDisplayName?: { text?: string };
    primaryType?: string;
    types?: string[];
  }>;
  nextPageToken?: string;
  error?: { message?: string };
};

export const findLeads = createServerFn({ method: "POST" })
  .inputValidator((d: { niche: string; location: string; country?: string }) => d)
  .handler(async ({ data }) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return {
        leads: [] as Lead[],
        total: 0,
        error: "Google Places API key is not configured.",
      };
    }

    const textQuery = [data.niche, data.location, data.country].filter(Boolean).join(" ");
    const fieldMask = [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.nationalPhoneNumber",
      "places.internationalPhoneNumber",
      "places.websiteUri",
      "places.googleMapsUri",
      "places.location",
      "places.primaryTypeDisplayName",
      "places.primaryType",
      "places.types",
      "nextPageToken",
    ].join(",");

    const all: NonNullable<PlacesResponse["places"]> = [];
    let pageToken: string | undefined;
    // Up to 3 pages = ~60 results
    for (let page = 0; page < 3; page++) {
      const body: Record<string, unknown> = { textQuery, pageSize: 20 };
      if (pageToken) body.pageToken = pageToken;

      const res = await fetch(PLACES_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
          "User-Agent": UA,
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as PlacesResponse;
      if (!res.ok) {
        return {
          leads: [] as Lead[],
          total: 0,
          error: json.error?.message || `Google Places error (${res.status}).`,
        };
      }
      if (json.places?.length) all.push(...json.places);
      if (!json.nextPageToken) break;
      pageToken = json.nextPageToken;
      // Google requires a brief delay before the next page becomes valid
      await new Promise((r) => setTimeout(r, 1500));
    }

    const leads: Lead[] = all.map((p) => {
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
        mapsUrl:
          p.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            p.displayName?.text || textQuery,
          )}&query_place_id=${p.id}`,
      };
    });

    // Filter: only no-website OR social-only
    const filtered = leads.filter((l) => !l.website || l.socialOnly);
    return { leads: filtered, total: leads.length, error: null as string | null };
  });

export const enrichLead = createServerFn({ method: "POST" })
  .inputValidator((d: { website?: string; name: string; address?: string }) => d)
  .handler(async ({ data }) => {
    const emails = new Set<string>();
    const phones = new Set<string>();
    let scraped = false;

    if (data.website && !isSocial(data.website)) {
      const base = data.website.startsWith("http") ? data.website : `https://${data.website}`;
      const targets = [
        base,
        base.replace(/\/$/, "") + "/contact",
        base.replace(/\/$/, "") + "/contact-us",
        base.replace(/\/$/, "") + "/about",
      ];
      for (const t of targets) {
        try {
          const r = await fetch(t, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) continue;
          const html = await r.text();
          scraped = true;
          const txt = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ");
          (txt.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach((e) => {
            if (!/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(e)) emails.add(e.toLowerCase());
          });
          (txt.match(/\+?\d[\d\s().-]{7,}\d/g) || []).forEach((p) => {
            const digits = p.replace(/\D/g, "");
            if (digits.length >= 8 && digits.length <= 15) phones.add(p.trim());
          });
        } catch {
          /* ignore */
        }
      }
    }

    return {
      emails: Array.from(emails).slice(0, 5),
      phones: Array.from(phones).slice(0, 5),
      scraped,
    };
  });
