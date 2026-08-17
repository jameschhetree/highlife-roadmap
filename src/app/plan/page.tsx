"use client";

/**
 * The Operating System document, living on the site.
 *
 * Notion's layout, because Jaco asked for it and because it is the right shape:
 * a persistent index on the left, one section in a comfortable reading column on
 * the right, and editing that happens in place rather than in a separate mode.
 * The first attempt was a stack of accordions — everything collapsed, nothing
 * findable, no sense of where you were in 23 sections.
 *
 * On a phone the sidebar becomes a sheet, because a 240px index beside a
 * reading column does not fit and pretending otherwise is how the first version
 * became unreadable.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import { BLUR } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";

type Section = { id: string; number: number; title: string; body: string; pages: string; pageImages: string[] };

/**
 * The plan's text, set for reading.
 *
 * "Read as text is dope, just make it more readable." So: a 60-character
 * measure, 1.8 leading, real paragraph spacing, and subheads picked out where
 * the document has them. A heading here is a short line that starts with a
 * capital, carries no terminal punctuation, and is not a bullet — which is how
 * this document writes its subheads and nothing else in it looks like.
 */
function Body({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());

  return (
    <div className="max-w-[62ch]">
      {lines.map((line, i) => {
        const bullet = /^[•·]\s?|^-\s/.test(line);
        if (bullet) {
          return (
            <p key={i} className="flex gap-3 my-2.5 text-[18px] leading-[1.7] text-[var(--muted)]">
              <span className="shrink-0 text-[var(--muted-3)]">—</span>
              <span>{line.replace(/^[•·-]\s?/, "")}</span>
            </p>
          );
        }

        const isHeading =
          line.length <= 58 &&
          !/[.,:;!?]$/.test(line) &&
          /^[A-Z]/.test(line) &&
          line.split(" ").length <= 9;

        if (isHeading) {
          return (
            <h3
              key={i}
              className="mt-10 mb-3 text-[15px] tracking-[0.14em] uppercase text-[var(--muted-3)]"
            >
              {line}
            </h3>
          );
        }

        // A figure on its own line is a statistic from the document, not prose.
        if (/^\$?[\d.,]+[KM%]?$/.test(line)) {
          return (
            <p key={i} className="my-1 text-[26px] tabular-nums text-[var(--text)]">{line}</p>
          );
        }

        return (
          <p key={i} className="my-5 text-[18px] leading-[1.8] text-[var(--text)]">{line}</p>
        );
      })}
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [asText, setAsText] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const readingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdminAuthed()) router.push("/login");
    else setReady(true);
  }, [router]);

  const load = async () => {
    const r = await fetch("/api/plan");
    if (!r.ok) return;
    const d: Section[] = await r.json();
    setSections(d);
    setActiveId((cur) => cur ?? d[0]?.id ?? null);
  };
  useEffect(() => { if (ready) load(); }, [ready]);

  const q = query.trim().toLowerCase();
  const listed = useMemo(
    () => (q ? sections.filter((s) => (s.title + s.body).toLowerCase().includes(q)) : sections),
    [sections, q]
  );
  const active = sections.find((s) => s.id === activeId) ?? null;

  const open = (id: string) => {
    setActiveId(id);
    setEditing(false);
    setAsText(false);
    setNavOpen(false);
    readingRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!active) return;
    setSaving(true);
    await fetch(`/api/plan/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    setSaving(false);
    setEditing(false);
    load();
  };

  if (!ready) return null;

  const index = (
    <nav className="space-y-0.5">
      {listed.map((s) => {
        const on = s.id === activeId;
        return (
          <button
            key={s.id}
            onClick={() => open(s.id)}
            className={`w-full text-left rounded-lg px-3 py-2.5 min-h-[44px] flex gap-3 items-baseline transition-colors ${
              on
                ? "bg-[var(--text)]/[0.10] text-[var(--text)] font-medium"
                : "text-[var(--muted)] hover:bg-[var(--text)]/[0.05] hover:text-[var(--text)]"
            }`}
          >
            <span className="shrink-0 text-[12px] tabular-nums text-[var(--muted-3)]">
              {String(s.number).padStart(2, "0")}
            </span>
            <span className="text-[15px] leading-snug">{s.title}</span>
          </button>
        );
      })}
      {listed.length === 0 && <p className="px-3 py-3 text-[15px] text-[var(--muted-3)]">No match.</p>}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="px-3 md:px-8">
        <div style={BLUR(24, true)} className="sticky top-3 z-30 w-fit max-w-full mx-auto pill-nav px-5 h-[56px] flex items-center gap-3">
          <Link href="/" className="text-[15px] text-[var(--muted)] hover:text-[var(--text)] min-h-[44px] leading-[44px]">
            ← Roadmap
          </Link>
          <span className="text-[15px] text-[var(--muted-3)]">/</span>
          <span className="text-[15px] truncate">The plan</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
          <button
            onClick={() => setNavOpen((v) => !v)}
            style={BLUR(20)} className="lg:hidden min-h-[44px] px-5 rounded-full bezel text-[15px]"
          >
            {navOpen ? "Close" : "Sections"}
          </button>
        </div>
      </header>

      <div className="max-w-[1180px] mx-auto px-5 md:px-8 grid lg:grid-cols-[268px_1fr] gap-12 pt-10 pb-28">
        {/* Sidebar on a laptop, a sheet on a phone. */}
        <aside className={`${navOpen ? "block" : "hidden"} lg:block`}>
          <div className="lg:sticky lg:top-[92px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the plan"
              className="w-full min-h-[46px] px-4 mb-4 text-[15px] rounded-full"
            />
            {index}
          </div>
        </aside>

        <main ref={readingRef} className={navOpen ? "hidden lg:block" : "block"}>
          {!active ? (
            <p className="text-[16px] text-[var(--muted)]">Loading the plan…</p>
          ) : (
            <article className="max-w-[68ch]">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[var(--muted-3)] mb-3">
                Section {String(active.number).padStart(2, "0")} · pages {active.pages}
              </p>
              <h1 className="text-[32px] md:text-[38px] leading-[1.1] font-semibold tracking-[-0.02em] mb-8">
                {active.title}
              </h1>

              {!editing && !asText && active.pageImages.length > 0 && (
                <div className="space-y-5">
                  {active.pageImages.map((src) => (
                    // The document as designed. Rounded and bordered so it reads
                    // as a page rather than as a screenshot dropped on the page.
                    <img
                      key={src} src={src} alt={`${active.title}, page`}
                      loading="lazy"
                      className="w-full rounded-xl border border-white/10 bg-white"
                    />
                  ))}
                </div>
              )}

              {editing ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={26}
                    className="w-full p-4 text-[15px] leading-[1.7] font-mono"
                  />
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={save} disabled={saving}
                      className="min-h-[48px] px-6 rounded-full bg-white text-black text-[16px] disabled:opacity-40"
                    >
                      {saving ? "Saving" : "Save"}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      style={BLUR(20)} className="min-h-[48px] px-6 rounded-full bezel text-[16px]"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : asText ? (
                <>
                  <Body text={active.body} />
                  <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                    <button
                      onClick={() => setAsText(false)}
                      style={BLUR(20)} className="min-h-[48px] px-6 rounded-full bezel text-[16px]"
                    >
                      Back to the page
                    </button>
                    <button
                      onClick={() => { setEditing(true); setDraft(active.body); }}
                      style={BLUR(20)} className="min-h-[48px] px-6 rounded-full bezel text-[16px]"
                    >
                      Edit this section
                    </button>
                    {(() => {
                      const i = sections.findIndex((s) => s.id === active.id);
                      const next = sections[i + 1];
                      return next ? (
                        <button
                          onClick={() => open(next.id)}
                          className="min-h-[48px] px-6 rounded-full bezel text-[16px] text-[#888]"
                        >
                          Next: {next.title} →
                        </button>
                      ) : null;
                    })()}
                  </div>
                </>
              ) : (
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-3">
                  <button
                    onClick={() => setAsText(true)}
                    style={BLUR(20)} className="min-h-[48px] px-6 rounded-full bezel text-[16px]"
                  >
                    Read as text
                  </button>
                  <button
                    onClick={() => { setAsText(true); setEditing(true); setDraft(active.body); }}
                    style={BLUR(20)} className="min-h-[48px] px-6 rounded-full bezel text-[16px] text-[#888]"
                  >
                    Edit
                  </button>
                  {(() => {
                    const i = sections.findIndex((x) => x.id === active.id);
                    const next = sections[i + 1];
                    return next ? (
                      <button
                        onClick={() => open(next.id)}
                        style={BLUR(20)}
                        className="min-h-[48px] px-6 rounded-full bezel text-[16px] text-[#888]"
                      >
                        Next: {next.title} →
                      </button>
                    ) : null;
                  })()}
                </div>
              )}
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
