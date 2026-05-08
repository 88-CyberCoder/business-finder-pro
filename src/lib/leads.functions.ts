import { createServerFn } from "@tanstack/react-start";

const UA = "BusinessDetailsGetter/1.0 (Global Geek Technologies)";

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

const SOCIAL_HOSTS = ["facebook.com", "fb.com", "instagram.com", "tiktok.com", "linktr.ee", "twitter.com", "x.com"];

function isSocial(url?: string) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return SOCIAL_HOSTS.some((h) => u.hostname.replace(/^www\./, "").endsWith(h));
  } catch {
    return false;
  }
}

export const findLeads = createServerFn({ method: "POST" })
  .inputValidator((d: { niche: string; location: string; country?: string }) => d)
  .handler(async ({ data }) => {
    const q = [data.niche, data.location, data.country].filter(Boolean).join(", ");
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&extratags=1&addressdetails=1&limit=50`;
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" } });
    if (!res.ok) {
      return { leads: [] as Lead[], error: `Search failed (${res.status}). Try again in a moment.` };
    }
    const rows = (await res.json()) as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
      type?: string;
      category?: string;
      extratags?: Record<string, string>;
      address?: Record<string, string>;
    }>;

    const leads: Lead[] = rows.map((r) => {
      const t = r.extratags || {};
      const website = t.website || t["contact:website"] || t.url;
      const phone = t.phone || t["contact:phone"] || t["contact:mobile"];
      const email = t.email || t["contact:email"];
      const social = isSocial(website);
      return {
        id: String(r.place_id),
        name: t.name || r.display_name.split(",")[0],
        category: r.category || r.type,
        address: r.display_name,
        lat: Number(r.lat),
        lon: Number(r.lon),
        phone,
        email,
        website,
        socialOnly: !website ? true : social,
        socialUrl: social ? website : undefined,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.name || r.display_name)}&query_place_id=`,
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
      const targets = [base, base.replace(/\/$/, "") + "/contact", base.replace(/\/$/, "") + "/contact-us", base.replace(/\/$/, "") + "/about"];
      for (const t of targets) {
        try {
          const r = await fetch(t, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
          if (!r.ok) continue;
          const html = await r.text();
          scraped = true;
          const txt = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
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
