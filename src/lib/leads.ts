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

export async function findLeadsApi(input: { niche: string; location: string; country?: string }) {
  const r = await fetch("/api/leads/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || `Request failed (${r.status})`);
  }
  return (await r.json()) as { leads: Lead[]; total: number; error: string | null };
}

export async function enrichLeadApi(input: { website?: string; name: string; address?: string }) {
  const r = await fetch("/api/leads/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return (await r.json()) as { emails: string[]; phones: string[]; scraped: boolean };
}
