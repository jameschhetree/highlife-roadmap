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

type Section = { id: string; number: number; title: string; body: string; pages: string };

/** Renders the plan's plain text as blocks: headings, bullets, key-value rows. */
function Body({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (k: number) => {
    if (!bullets.length) return;
    out.push(
      <ul key={`u${k}`} className="my-4 space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-3 text-[17px] leading-[1.7] text-[#d4d4d4]">
            <span className="shrink-0 text-[#555] mt-[2px]">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(i); return; }

    if (/^[•·]\s?/.test(line) || /^-\s/.test(line)) {
      bullets.push(line.replace(/^[•·-]\s?/, ""));
      return;
    }
    flush(i);

    // A short line with no terminal punctuation is a heading in this document.
    const isHeading = line.length < 62 && !/[.:,;]$/.test(line) && !/^\d/.test(line);
    if (isHeading) {
      out.push(
        <h3 key={i} className="mt-9 mb-3 text-[15px] tracking-[0.12em] uppercase text-[#888]">
          {line}
        </h3>
      );
      return;
    }
    out.push(
      <p key={i} className="my-3.5 text-[17px] leading-[1.75] text-[#d4d4d4]">{line}</p>
    );
  });
  flush(lines.length);
  return <>{out}</>;
}

export default function PlanPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
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
              on ? "bg-white/[0.09] text-white" : "text-[#888] hover:bg-white/[0.04] hover:text-[#ccc]"
            }`}
          >
            <span className="shrink-0 text-[12px] tabular-nums text-[#555]">
              {String(s.number).padStart(2, "0")}
            </span>
            <span className="text-[15px] leading-snug">{s.title}</span>
          </button>
        );
      })}
      {listed.length === 0 && <p className="px-3 py-3 text-[15px] text-[#666]">No match.</p>}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="px-3 md:px-8">
        <div style={BLUR(24, true)} className="sticky top-3 z-30 w-fit max-w-full mx-auto pill-nav px-5 h-[56px] flex items-center gap-3">
          <Link href="/" className="text-[15px] text-[#888] hover:text-white min-h-[44px] leading-[44px]">
            ← Roadmap
          </Link>
          <span className="text-[15px] text-[#333]">/</span>
          <span className="text-[15px] truncate">The plan</span>
          <button
            onClick={() => setNavOpen((v) => !v)}
            style={BLUR(20)} className="ml-auto lg:hidden min-h-[44px] px-5 rounded-full bezel text-[15px]"
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
            <p className="text-[16px] text-[#888]">Loading the plan…</p>
          ) : (
            <article className="max-w-[68ch]">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#666] mb-3">
                Section {String(active.number).padStart(2, "0")} · pages {active.pages}
              </p>
              <h1 className="text-[32px] md:text-[38px] leading-[1.1] font-semibold tracking-[-0.02em] mb-8">
                {active.title}
              </h1>

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
              ) : (
                <>
                  <Body text={active.body} />
                  <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-3">
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
              )}
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
