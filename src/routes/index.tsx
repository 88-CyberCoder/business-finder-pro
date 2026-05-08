import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, Copy, ExternalLink, Sparkles, Globe2, Check, Radar, Mail, Phone, Globe, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { findLeads, enrichLead, type Lead } from "@/lib/leads.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Business Details Getter — Global Geek Technologies" },
      {
        name: "description",
        content:
          "Generate accurate Google Maps search links for any business niche across multiple cities, states or countries — instantly.",
      },
      { property: "og:title", content: "Business Details Getter — Global Geek Technologies" },
      {
        property: "og:description",
        content:
          "Lead-gen power tool for agencies: niche + locations → instant Google Maps links.",
      },
    ],
  }),
  component: HomePage,
});

type ResultRow = {
  id: string;
  niche: string;
  location: string;
  country: string;
  url: string;
};

function buildMapsUrl(niche: string, location: string, country: string) {
  const parts = [niche, location, country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}

function HomePage() {
  const [niche, setNiche] = useState("");
  const [locations, setLocations] = useState("");
  const [country, setCountry] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canSearch = useMemo(
    () => niche.trim().length > 0 && locations.trim().length > 0,
    [niche, locations],
  );

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSearch) {
      toast.error("Enter a business niche and at least one city or state.");
      return;
    }
    const list = locations
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (list.length === 0) {
      toast.error("Add at least one city or state.");
      return;
    }

    const rows: ResultRow[] = list.map((loc, i) => ({
      id: `${Date.now()}-${i}`,
      niche: niche.trim(),
      location: loc,
      country: country.trim(),
      url: buildMapsUrl(niche.trim(), loc, country.trim()),
    }));

    setResults(rows);
    toast.success(`Generated ${rows.length} Google Maps link${rows.length > 1 ? "s" : ""}.`);
  };

  const copy = async (row: ResultRow) => {
    await navigator.clipboard.writeText(row.url);
    setCopiedId(row.id);
    toast.success(`Link copied — ${row.location}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const copyAll = async () => {
    if (!results.length) return;
    const text = results
      .map((r) => `${r.niche} — ${r.location}${r.country ? ", " + r.country : ""}\n${r.url}`)
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    toast.success("All links copied to clipboard.");
  };

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-right" />

      {/* Header */}
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Globe2 className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Business Details Getter</p>
              <p className="text-[11px] text-muted-foreground">by Global Geek Technologies</p>
            </div>
          </div>
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground sm:flex"
          >
            Powered by Google Maps <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Lead-gen tool for agencies & SaaS founders
        </div>
        <h1 className="text-balance text-5xl font-bold leading-[1.05] sm:text-6xl">
          Find any business,
          <br />
          <span className="text-gradient">across any city.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          Enter a niche and a list of locations — get instant, copyable Google Maps links to
          every search result. Built for scale.
        </p>
      </section>

      {/* Tabs */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <Tabs defaultValue="links" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2 bg-card/40 backdrop-blur">
            <TabsTrigger value="links">
              <MapPin className="mr-2 h-4 w-4" /> Maps Links
            </TabsTrigger>
            <TabsTrigger value="leads">
              <Radar className="mr-2 h-4 w-4" /> Lead Finder
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Original maps-link generator */}
          <TabsContent value="links">
            <form onSubmit={handleGenerate} className="glass-card rounded-2xl p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="niche" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Business Niche
                  </Label>
                  <Input
                    id="niche"
                    placeholder="e.g. Dental clinics, Real estate agencies, Coffee shops"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="h-12 bg-input/60 text-base"
                    maxLength={120}
                  />
                </div>

                <div>
                  <Label htmlFor="locations" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cities or States
                  </Label>
                  <Textarea
                    id="locations"
                    placeholder={"New York\nLos Angeles\nChicago, Illinois"}
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    className="min-h-[120px] resize-none bg-input/60 text-base"
                    maxLength={2000}
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">One per line, or separate with commas.</p>
                </div>

                <div>
                  <Label htmlFor="country" className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Country <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Input
                    id="country"
                    placeholder="e.g. United States"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="h-12 bg-input/60 text-base"
                    maxLength={80}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!canSearch}
                className="mt-6 h-12 w-full bg-[image:var(--gradient-primary)] text-base font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:opacity-95 disabled:opacity-50"
              >
                <Search className="mr-2 h-4 w-4" />
                Generate Google Maps Links
              </Button>
            </form>

            {results.length > 0 && (
              <div className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {results.length} result{results.length > 1 ? "s" : ""}
                  </h2>
                  <Button onClick={copyAll} variant="outline" size="sm" className="border-border/60 bg-card/40 backdrop-blur">
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy all
                  </Button>
                </div>

                <ul className="space-y-3">
                  {results.map((r) => (
                    <li key={r.id} className="glass-card group rounded-xl p-4 transition hover:border-primary/40">
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {r.niche} <span className="text-muted-foreground">in</span>{" "}
                            <span className="text-primary">{r.location}</span>
                            {r.country && <span className="text-muted-foreground">, {r.country}</span>}
                          </p>
                          <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-muted-foreground hover:text-foreground">
                            {r.url}
                          </a>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={() => copy(r)} className="h-9">
                            {copiedId === r.id ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button asChild size="sm" className="h-9 bg-[image:var(--gradient-primary)] text-primary-foreground hover:opacity-95">
                            <a href={r.url} target="_blank" rel="noreferrer">
                              Open <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Lead finder */}
          <TabsContent value="leads">
            <LeadFinder />
          </TabsContent>
        </Tabs>
      </section>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Global Geek Technologies. All rights reserved.</p>
          <p>Business Details Getter — built for agencies that move fast.</p>
        </div>
      </footer>
    </div>
  );
}
