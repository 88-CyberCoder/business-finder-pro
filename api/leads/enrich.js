// Vercel Edge Function — scrape a business website for emails/phones
export const config = { runtime: "edge" };

const UA = "BusinessDetailsGetter/1.0 (Global Geek Technologies)";
const SOCIAL_HOSTS = [
  "facebook.com","fb.com","instagram.com","tiktok.com",
  "linktr.ee","twitter.com","x.com","linkedin.com","youtube.com",
];

function isSocial(url) {
  if (!url) return false;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return SOCIAL_HOSTS.some((h) => u.hostname.replace(/^www\./, "").endsWith(h));
  } catch { return false; }
}

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const website = body?.website;
  const emails = new Set();
  const phones = new Set();
  let scraped = false;

  if (website && !isSocial(website)) {
    const base = website.startsWith("http") ? website : `https://${website}`;
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
      } catch { /* ignore */ }
    }
  }

  return Response.json({
    emails: Array.from(emails).slice(0, 5),
    phones: Array.from(phones).slice(0, 5),
    scraped,
  });
}
