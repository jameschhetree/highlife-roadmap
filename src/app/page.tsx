"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  RefreshCw,
  Send,
  X,
  Check,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */

interface Step {
  id: string;
  title: string;
  owner: string;
  done: boolean;
  sortOrder: number;
}

interface Task {
  id: string;
  phaseId: string;
  title: string;
  dueLabel: string;
  category: string;
  owner: string;
  done: boolean;
  sortOrder: number;
  steps: Step[];
}

interface Phase {
  id: string;
  number: number;
  name: string;
  dates: string;
  goal: string;
  color: string;
  colorBg: string;
  sortOrder: number;
  tasks: Task[];
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

/* ── Constants ─────────────────────────────────────────── */

const OWNERS = ["JoJo", "Jaco", "Both", "Unassigned"] as const;
const CATEGORIES = [
  "Legal",
  "Finance",
  "Operations",
  "Marketing",
  "Brand",
  "Pricing",
  "Revenue",
  "Hiring",
] as const;

const OWNER_COLORS: Record<string, { bg: string; text: string }> = {
  JoJo: { bg: "bg-blue-50", text: "text-blue-700" },
  Jaco: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Both: { bg: "bg-purple-50", text: "text-purple-700" },
  Unassigned: { bg: "bg-gray-50", text: "text-gray-500" },
};

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  Legal: { bg: "bg-red-50", text: "text-red-700" },
  Finance: { bg: "bg-amber-50", text: "text-amber-800" },
  Operations: { bg: "bg-stone-100", text: "text-stone-600" },
  Marketing: { bg: "bg-emerald-50", text: "text-emerald-700" },
  Brand: { bg: "bg-violet-50", text: "text-violet-700" },
  Pricing: { bg: "bg-lime-50", text: "text-lime-700" },
  Revenue: { bg: "bg-rose-50", text: "text-rose-700" },
  Hiring: { bg: "bg-blue-50", text: "text-blue-700" },
};

/* ── Main Component ────────────────────────────────────── */

export default function RoadmapPage() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragStepId, setDragStepId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/phases");
      const data = await res.json();
      setPhases(data);
      setLastSync(new Date());
      if (firstLoad.current) {
        setExpandedPhases(new Set(data.map((p: Phase) => p.id)));
        firstLoad.current = false;
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chat history
  useEffect(() => {
    if (chatOpen) {
      fetch("/api/chat")
        .then((r) => r.json())
        .then(setChatMessages)
        .catch(console.error);
    }
  }, [chatOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── API helpers ─────────────────────────────────────── */

  const api = async (
    url: string,
    method: string,
    body?: Record<string, unknown>
  ) => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  const updateTask = async (id: string, data: Record<string, unknown>) => {
    await api(`/api/tasks/${id}`, "PATCH", data);
    fetchData();
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task and all its steps?")) return;
    await api(`/api/tasks/${id}`, "DELETE");
    fetchData();
  };

  const addTask = async (phaseId: string) => {
    await api("/api/tasks", "POST", {
      phaseId,
      title: "New Task",
      category: "Operations",
    });
    fetchData();
  };

  const updateStep = async (id: string, data: Record<string, unknown>) => {
    await api(`/api/steps/${id}`, "PATCH", data);
    fetchData();
  };

  const deleteStep = async (id: string) => {
    if (!confirm("Delete this step?")) return;
    await api(`/api/steps/${id}`, "DELETE");
    fetchData();
  };

  const addStep = async (taskId: string) => {
    await api("/api/steps", "POST", { taskId, title: "New Step" });
    fetchData();
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    setChatLoading(true);
    setChatMessages((prev) => [
      ...prev,
      {
        id: "temp-" + Date.now(),
        role: "user",
        content: msg,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await api("/api/chat", "POST", { message: msg });
      setChatMessages((prev) => [
        ...prev,
        {
          id: "resp-" + Date.now(),
          role: "assistant",
          content: res.reply || res.error || "No response",
          createdAt: new Date().toISOString(),
        },
      ]);
      if (res.applied && res.applied.length > 0) {
        fetchData();
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "Failed to get response. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ── Drag & Drop ─────────────────────────────────────── */

  const handleTaskDragStart = (taskId: string) => setDragTaskId(taskId);

  const handleTaskDragOver = (
    e: React.DragEvent,
    targetTaskId: string,
    phaseId: string
  ) => {
    e.preventDefault();
    if (!dragTaskId || dragTaskId === targetTaskId) return;
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;
    const dragIdx = phase.tasks.findIndex((t) => t.id === dragTaskId);
    const targetIdx = phase.tasks.findIndex((t) => t.id === targetTaskId);
    if (dragIdx === -1 || targetIdx === -1) return;
    const newTasks = [...phase.tasks];
    const [moved] = newTasks.splice(dragIdx, 1);
    newTasks.splice(targetIdx, 0, moved);
    setPhases((prev) =>
      prev.map((p) => (p.id === phaseId ? { ...p, tasks: newTasks } : p))
    );
  };

  const handleTaskDragEnd = async (phaseId: string) => {
    setDragTaskId(null);
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;
    for (let i = 0; i < phase.tasks.length; i++) {
      if (phase.tasks[i].sortOrder !== i) {
        await api(`/api/tasks/${phase.tasks[i].id}`, "PATCH", { sortOrder: i });
      }
    }
  };

  const handleStepDragStart = (stepId: string) => setDragStepId(stepId);

  const handleStepDragOver = (
    e: React.DragEvent,
    targetStepId: string,
    taskId: string
  ) => {
    e.preventDefault();
    if (!dragStepId || dragStepId === targetStepId) return;
    setPhases((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const dragIdx = t.steps.findIndex((s) => s.id === dragStepId);
          const targetIdx = t.steps.findIndex((s) => s.id === targetStepId);
          if (dragIdx === -1 || targetIdx === -1) return t;
          const newSteps = [...t.steps];
          const [moved] = newSteps.splice(dragIdx, 1);
          newSteps.splice(targetIdx, 0, moved);
          return { ...t, steps: newSteps };
        }),
      }))
    );
  };

  const handleStepDragEnd = async (taskId: string) => {
    setDragStepId(null);
    const task = phases.flatMap((p) => p.tasks).find((t) => t.id === taskId);
    if (!task) return;
    for (let i = 0; i < task.steps.length; i++) {
      if (task.steps[i].sortOrder !== i) {
        await api(`/api/steps/${task.steps[i].id}`, "PATCH", { sortOrder: i });
      }
    }
  };

  /* ── Stats ───────────────────────────────────────────── */

  const totalTasks = phases.reduce((a, p) => a + p.tasks.length, 0);
  const totalSteps = phases.reduce(
    (a, p) => a + p.tasks.reduce((b, t) => b + t.steps.length, 0),
    0
  );
  const doneSteps = phases.reduce(
    (a, p) =>
      a + p.tasks.reduce((b, t) => b + t.steps.filter((s) => s.done).length, 0),
    0
  );
  const doneTasks = phases.reduce(
    (a, p) => a + p.tasks.filter((t) => t.done).length,
    0
  );

  /* ── Filter ──────────────────────────────────────────── */

  const filteredPhases = phases.map((p) => ({
    ...p,
    tasks:
      filter === "All" ? p.tasks : p.tasks.filter((t) => t.owner === filter),
  }));

  /* ── Render ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[#999] text-sm">
          Loading roadmap...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.06] blur-[120px]"
          style={{
            background: "radial-gradient(circle, #F59E0B, transparent 70%)",
            top: "-200px",
            left: "-100px",
            animation: "drift1 25s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px]"
          style={{
            background: "radial-gradient(circle, #0D9488, transparent 70%)",
            bottom: "-150px",
            right: "-100px",
            animation: "drift2 30s ease-in-out infinite",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-[80px]"
          style={{
            background: "radial-gradient(circle, #7C3AED, transparent 70%)",
            top: "40%",
            left: "60%",
            animation: "drift3 20s ease-in-out infinite",
          }}
        />
      </div>

      <style>{`
        @keyframes drift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(60px,40px); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-50px,-30px); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-40px,50px); } }
      `}</style>

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-xl font-semibold tracking-[0.07em] text-[#1a1a1a]">
                HIGHLIFE STUDIOS
              </h1>
              <p className="text-sm text-[#888]">
                12-Month Roadmap -- June 2026 to May 2027
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#e5e5e5] text-sm text-[#555] hover:border-[#ccc] hover:bg-[#f9f9f9] transition-all shadow-sm"
              >
                <MessageSquare size={15} />
                AI Chat
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-4 gap-3 mb-5"
        >
          {[
            { label: "Tasks", value: totalTasks },
            { label: "Steps", value: totalSteps },
            { label: "Steps Done", value: doneSteps },
            { label: "Tasks Done", value: doneTasks },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white border border-[#eee] rounded-xl px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="text-xs text-[#999] mb-0.5">{s.label}</div>
              <div className="text-2xl font-semibold text-[#1a1a1a]">
                {s.value}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Timeline bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-4 rounded-xl overflow-hidden border border-[#e5e5e5] mb-5 shadow-sm"
        >
          {[
            {
              phase: 1,
              name: "Foundation",
              dates: "Jun - Jul - Aug 2026",
              bg: "#FEF3C7",
              text: "#92400E",
              sub: "#B45309",
            },
            {
              phase: 2,
              name: "Revenue Growth",
              dates: "Sep - Oct - Nov 2026",
              bg: "#CCFBF1",
              text: "#134E4A",
              sub: "#0F766E",
            },
            {
              phase: 3,
              name: "Brand Expansion",
              dates: "Dec 2026 - Jan - Feb 2027",
              bg: "#EDE9FE",
              text: "#4C1D95",
              sub: "#6D28D9",
            },
            {
              phase: 4,
              name: "Scale",
              dates: "Mar - Apr - May 2027",
              bg: "#DBEAFE",
              text: "#1E3A8A",
              sub: "#1D4ED8",
            },
          ].map((tl) => (
            <div
              key={tl.phase}
              className="px-3 py-2.5 border-r border-[#e5e5e5] last:border-r-0"
              style={{ background: tl.bg }}
            >
              <div
                className="text-[11px] font-semibold"
                style={{ color: tl.text }}
              >
                Phase {tl.phase} -- {tl.name}
              </div>
              <div className="text-[10px]" style={{ color: tl.sub }}>
                {tl.dates}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Owner filter pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 mb-6 flex-wrap"
        >
          <span className="text-xs text-[#999] mr-1">Filter:</span>
          {["All", ...OWNERS].map((o) => (
            <button
              key={o}
              onClick={() => setFilter(o)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === o
                  ? "bg-[#1a1a1a] text-white shadow-sm"
                  : "bg-white border border-[#e5e5e5] text-[#666] hover:border-[#ccc]"
              }`}
            >
              {o}
            </button>
          ))}
        </motion.div>

        {/* Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6 overflow-hidden"
            >
              <div className="bg-white border border-[#e5e5e5] rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee]">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-[#888]" />
                    <span className="text-sm font-medium text-[#1a1a1a]">
                      AI Roadmap Assistant
                    </span>
                  </div>
                  <button
                    onClick={() => setChatOpen(false)}
                    className="text-[#ccc] hover:text-[#888] transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="h-48 overflow-y-auto px-4 py-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-[#bbb] italic">
                      Try: &quot;Add a task to Phase 2 about vendor contracts,
                      assign to Jaco&quot; or &quot;What is left for JoJo?&quot;
                    </p>
                  )}
                  {chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm ${
                        m.role === "user" ? "text-right" : ""
                      }`}
                    >
                      <div
                        className={`inline-block max-w-[85%] px-3 py-2 rounded-lg ${
                          m.role === "user"
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-[#f3f3f2] text-[#333]"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-[13px]">
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-xs text-[#999]">
                      <div className="w-2 h-2 rounded-full bg-[#ccc] animate-pulse" />
                      Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="border-t border-[#eee] px-4 py-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Ask the AI to modify the roadmap..."
                    className="flex-1 text-sm px-3 py-2 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all bg-[#fafaf8]"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm hover:bg-[#333] disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase Cards */}
        {filteredPhases.map((phase, pi) => {
          const isExpanded = expandedPhases.has(phase.id);
          const phaseSteps = phase.tasks.flatMap((t) => t.steps);
          const phaseDoneSteps = phaseSteps.filter((s) => s.done).length;
          const phaseDoneTasks = phase.tasks.filter((t) => t.done).length;
          const stepPct =
            phaseSteps.length > 0
              ? Math.round((phaseDoneSteps / phaseSteps.length) * 100)
              : 0;

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.25 + pi * 0.08,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="bg-white border border-[#eee] rounded-xl mb-4 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              {/* Phase header */}
              <button
                onClick={() => {
                  setExpandedPhases((prev) => {
                    const next = new Set(prev);
                    if (next.has(phase.id)) next.delete(phase.id);
                    else next.add(phase.id);
                    return next;
                  });
                }}
                className="w-full text-left px-5 py-4 hover:bg-[#fefefe] transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2"
                    style={{
                      background: phase.colorBg,
                      borderColor: phase.color,
                      color: phase.color,
                    }}
                  >
                    {phase.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#1a1a1a]">
                      Phase {phase.number}: {phase.name}
                    </div>
                    <div className="text-xs text-[#999]">{phase.dates}</div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-[#ccc]" />
                  ) : (
                    <ChevronRight size={16} className="text-[#ccc]" />
                  )}
                </div>
                <p className="text-xs text-[#888] mb-2 leading-relaxed">
                  {phase.goal}
                </p>
                <div className="h-1 bg-[#f0f0ef] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stepPct}%`,
                      background: phase.color,
                    }}
                  />
                </div>
                <div className="text-[10px] text-[#bbb] mt-1">
                  {phaseDoneTasks} of {phase.tasks.length} tasks -- {stepPct}%
                  of steps done
                </div>
              </button>

              {/* Tasks */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {phase.tasks.map((task) => {
                      const isTaskExpanded = expandedTasks.has(task.id);
                      const taskDoneSteps = task.steps.filter(
                        (s) => s.done
                      ).length;

                      return (
                        <div
                          key={task.id}
                          className="border-t border-[#f0f0ef]"
                          draggable
                          onDragStart={() => handleTaskDragStart(task.id)}
                          onDragOver={(e) =>
                            handleTaskDragOver(e, task.id, phase.id)
                          }
                          onDragEnd={() => handleTaskDragEnd(phase.id)}
                        >
                          <div
                            className={`flex items-start gap-2.5 px-5 py-3 group hover:bg-[#fafaf8] transition-colors ${
                              dragTaskId === task.id ? "opacity-50" : ""
                            }`}
                          >
                            <div className="pt-0.5 cursor-grab text-[#ddd] opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical size={14} />
                            </div>

                            <button
                              onClick={() =>
                                updateTask(task.id, { done: !task.done })
                              }
                              className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                task.done
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-[#ddd] hover:border-[#bbb]"
                              }`}
                            >
                              {task.done && (
                                <Check
                                  size={10}
                                  className="text-white"
                                  strokeWidth={3}
                                />
                              )}
                            </button>

                            <div className="flex-1 min-w-0">
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                className={`text-[13px] leading-relaxed editable-field ${
                                  task.done
                                    ? "line-through text-[#bbb]"
                                    : "text-[#1a1a1a]"
                                }`}
                                onBlur={(e) => {
                                  const newTitle =
                                    e.currentTarget.textContent?.trim() || "";
                                  if (newTitle && newTitle !== task.title) {
                                    updateTask(task.id, { title: newTitle });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                  }
                                }}
                              >
                                {task.title}
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span
                                  contentEditable
                                  suppressContentEditableWarning
                                  className="text-[10px] text-[#666] hover:text-[#222] focus:text-[#111] focus:outline-none focus:bg-[#fef9c3] px-1 -mx-1 rounded cursor-text"
                                  onBlur={(e) => {
                                    const next = e.currentTarget.textContent?.trim() ?? "";
                                    if (next && next !== task.dueLabel) {
                                      updateTask(task.id, { dueLabel: next });
                                    } else if (!next) {
                                      e.currentTarget.textContent = task.dueLabel;
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  title="Click to edit due date"
                                >
                                  {task.dueLabel}
                                </span>

                                <select
                                  value={task.category}
                                  onChange={(e) =>
                                    updateTask(task.id, {
                                      category: e.target.value,
                                    })
                                  }
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer appearance-none pr-4 ${
                                    CAT_COLORS[task.category]?.bg || "bg-gray-50"
                                  } ${
                                    CAT_COLORS[task.category]?.text ||
                                    "text-gray-600"
                                  }`}
                                  title="Change category"
                                >
                                  {Object.keys(CAT_COLORS).map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>

                                <select
                                  value={task.owner}
                                  onChange={(e) =>
                                    updateTask(task.id, {
                                      owner: e.target.value,
                                    })
                                  }
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer appearance-none pr-4 ${
                                    OWNER_COLORS[task.owner]?.bg || "bg-gray-50"
                                  } ${
                                    OWNER_COLORS[task.owner]?.text ||
                                    "text-gray-500"
                                  }`}
                                  style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath d='M1 2.5L4 5.5L7 2.5' stroke='%23999' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "right 4px center",
                                  }}
                                >
                                  {OWNERS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>

                                {task.steps.length > 0 && (
                                  <span className="text-[10px] text-[#bbb]">
                                    {taskDoneSteps}/{task.steps.length} steps
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {task.steps.length > 0 && (
                                <button
                                  onClick={() => {
                                    setExpandedTasks((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(task.id))
                                        next.delete(task.id);
                                      else next.add(task.id);
                                      return next;
                                    });
                                  }}
                                  className="p-1 rounded hover:bg-[#f0f0ef] text-[#bbb] hover:text-[#888] transition-colors"
                                >
                                  {isTaskExpanded ? (
                                    <ChevronDown size={14} />
                                  ) : (
                                    <ChevronRight size={14} />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="p-1 rounded hover:bg-red-50 text-[#ddd] hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Steps sub-list */}
                          <AnimatePresence>
                            {isTaskExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden bg-[#fafaf8]"
                              >
                                <div className="pl-16 pr-5 py-1.5">
                                  {task.steps.map((step) => (
                                    <div
                                      key={step.id}
                                      className="flex items-start gap-2.5 py-2 border-t border-[#eee] first:border-t-0 group/step"
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        handleStepDragStart(step.id);
                                      }}
                                      onDragOver={(e) => {
                                        e.stopPropagation();
                                        handleStepDragOver(
                                          e,
                                          step.id,
                                          task.id
                                        );
                                      }}
                                      onDragEnd={(e) => {
                                        e.stopPropagation();
                                        handleStepDragEnd(task.id);
                                      }}
                                    >
                                      <div className="pt-0.5 cursor-grab text-[#e5e5e5] opacity-0 group-hover/step:opacity-100 transition-opacity">
                                        <GripVertical size={12} />
                                      </div>
                                      <button
                                        onClick={() =>
                                          updateStep(step.id, {
                                            done: !step.done,
                                          })
                                        }
                                        className={`mt-0.5 w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                                          step.done
                                            ? "border-emerald-500 bg-emerald-500"
                                            : "border-[#ddd] hover:border-[#bbb]"
                                        }`}
                                      >
                                        {step.done && (
                                          <Check
                                            size={8}
                                            className="text-white"
                                            strokeWidth={3}
                                          />
                                        )}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div
                                          contentEditable
                                          suppressContentEditableWarning
                                          className={`text-xs leading-relaxed editable-field ${
                                            step.done
                                              ? "line-through text-[#bbb]"
                                              : "text-[#555]"
                                          }`}
                                          onBlur={(e) => {
                                            const newTitle =
                                              e.currentTarget.textContent?.trim() ||
                                              "";
                                            if (
                                              newTitle &&
                                              newTitle !== step.title
                                            ) {
                                              updateStep(step.id, {
                                                title: newTitle,
                                              });
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              e.currentTarget.blur();
                                            }
                                          }}
                                        >
                                          {step.title}
                                        </div>
                                      </div>
                                      <select
                                        value={step.owner}
                                        onChange={(e) =>
                                          updateStep(step.id, {
                                            owner: e.target.value,
                                          })
                                        }
                                        className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none pr-3 opacity-0 group-hover/step:opacity-100 transition-opacity ${
                                          OWNER_COLORS[step.owner]?.bg ||
                                          "bg-gray-50"
                                        } ${
                                          OWNER_COLORS[step.owner]?.text ||
                                          "text-gray-500"
                                        }`}
                                        style={{
                                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6' viewBox='0 0 6 6'%3E%3Cpath d='M0.5 1.5L3 4.5L5.5 1.5' stroke='%23999' fill='none' stroke-width='1'/%3E%3C/svg%3E")`,
                                          backgroundRepeat: "no-repeat",
                                          backgroundPosition:
                                            "right 3px center",
                                        }}
                                      >
                                        {OWNERS.map((o) => (
                                          <option key={o} value={o}>
                                            {o}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => deleteStep(step.id)}
                                        className="p-0.5 rounded hover:bg-red-50 text-[#e5e5e5] hover:text-red-400 transition-colors opacity-0 group-hover/step:opacity-100"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => addStep(task.id)}
                                    className="flex items-center gap-1.5 text-[11px] text-[#bbb] hover:text-[#888] py-2 transition-colors"
                                  >
                                    <Plus size={11} />
                                    Add step
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}

                    <div className="border-t border-[#f0f0ef] px-5 py-2.5">
                      <button
                        onClick={() => addTask(phase.id)}
                        className="flex items-center gap-1.5 text-xs text-[#bbb] hover:text-[#888] transition-colors"
                      >
                        <Plus size={13} />
                        Add task
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Category legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 flex-wrap mt-4 mb-8"
        >
          <span className="text-xs text-[#999]">Categories:</span>
          {CATEGORIES.map((cat) => (
            <span
              key={cat}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[cat].bg} ${CAT_COLORS[cat].text}`}
            >
              {cat}
            </span>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="text-center pb-8">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 text-xs text-[#bbb] hover:text-[#888] transition-colors"
          >
            <RefreshCw size={12} />
            {lastSync
              ? `Last synced ${lastSync.toLocaleTimeString()}`
              : "Click to refresh from server"}
          </button>
        </div>
      </div>
    </div>
  );
}
