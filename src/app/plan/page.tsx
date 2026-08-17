"use client";

/**
 * The Operating System document, living on the site.
 *
 * Jaco asked for the plan itself to be here — navigable and editable — rather
 * than a PDF that goes stale in a chat thread. The parts the app acts on (OKRs,
 * SOPs, the scoreboard) are real tables elsewhere; this is the strategy in his
 * own words, which he can change when the strategy changes.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import { Eyebrow, Button } from "@/components/ui";

type Section = { id: string; number: number; title: string; body: string; pages: string };

export default function PlanPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isAdminAuthed()) router.push("/login");
    else setReady(true);
  }, [router]);

  const load = async () => {
    const r = await fetch("/api/plan");
    if (r.ok) setSections(await r.json());
  };
  useEffect(() => { if (ready) load(); }, [ready]);

  const save = async (id: string) => {
    setSaving(true);
    await fetch(`/api/plan/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    setSaving(false);
    setEditing(null);
    load();
  };

  if (!ready) return null;

  const q = query.trim().toLowerCase();
  const shown = q
    ? sections.filter((s) => s.title.toLowerCase().includes(q) || s.body.toLowerCase().includes(q))
    : sections;

  return (
    <div className="min-h-screen bg-white">
      <header className="px-5 md:px-10 pt-9 pb-6 max-w-[860px] mx-auto">
        <Link href="/" className="inline-block mb-6 text-[15px] text-[#6b6b6b] min-h-[44px] leading-[44px]">
          ← Roadmap
        </Link>
        <Eyebrow>HighLife Operating System</Eyebrow>
        <h1 className="text-[34px] md:text-[40px] leading-[1.05] font-semibold tracking-[-0.02em]">
          The plan
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-[#2e2e2e]">
          2026–2027. Twenty-three sections, editable. Change it here when the strategy changes.
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the plan"
          className="mt-7 w-full min-h-[50px] bg-white rounded-lg px-4 text-[16px] shadow-[inset_0_0_0_1px_#e2e2e2] focus:outline-none focus:shadow-[inset_0_0_0_2px_#000]"
        />
      </header>

      <main className="px-5 md:px-10 pb-24 max-w-[860px] mx-auto">
        {shown.length === 0 && (
          <p className="py-12 text-[16px] text-[#6b6b6b]">Nothing in the plan matches that.</p>
        )}

        <div className="divide-y divide-[#e2e2e2]">
          {shown.map((s) => {
            const open = openId === s.id;
            return (
              <section key={s.id}>
                <button
                  onClick={() => { setOpenId(open ? null : s.id); setEditing(null); }}
                  className="w-full text-left py-5 flex items-baseline gap-4 min-h-[64px]"
                >
                  <span className="shrink-0 w-[28px] text-[13px] tabular-nums text-[#9a9a9a]">
                    {String(s.number).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-[19px] leading-snug">{s.title}</span>
                  <span className="shrink-0 text-[13px] text-[#9a9a9a]">{open ? "−" : "+"}</span>
                </button>

                {open && (
                  <div className="pb-8 pl-0 sm:pl-[44px]">
                    {editing === s.id ? (
                      <>
                        <textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={22}
                          className="w-full bg-white rounded-lg p-4 text-[15px] leading-relaxed font-mono shadow-[inset_0_0_0_1px_#e2e2e2] focus:outline-none focus:shadow-[inset_0_0_0_2px_#000]"
                        />
                        <div className="mt-4 flex gap-3">
                          <Button kind="solid" onClick={() => save(s.id)} disabled={saving}>
                            {saving ? "Saving" : "Save"}
                          </Button>
                          <Button onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[17px] leading-[1.65] text-[#2e2e2e] whitespace-pre-wrap">
                          {s.body}
                        </div>
                        <div className="mt-6 flex items-center gap-4">
                          <Button onClick={() => { setEditing(s.id); setDraft(s.body); }}>
                            Edit this section
                          </Button>
                          <span className="text-[13px] text-[#9a9a9a]">pages {s.pages}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
