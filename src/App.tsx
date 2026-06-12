import React, { useEffect, useMemo, useState } from "react";
import "./index.css";
import {
  createIdea,
  createProject,
  createReview,
  createTask,
  createTaskTemplate,
  deleteIdea,
  deleteProject as removeProject,
  deleteReview,
  deleteTask,
  deleteTaskTemplate,
  fetchPanelData,
  fetchTaskTemplates,
  getProjectDependencyCounts,
  saveDailyLog,
  updateIdea,
  updateProject as persistProjectUpdate,
  updateReview,
  updateTask,
  updateTaskStatus as persistTaskStatus,
} from "./lib/panelData";
import { migrateLocalStorageToSupabase } from "./lib/migration";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "./lib/supabase";
import { useAuth } from "./lib/useAuth";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import type {
  AppState,
  Area,
  DailyLog,
  Idea,
  NewProjectInput,
  Project,
  ProjectDependencyCounts,
  ProjectStatus,
  Review,
  ReviewType,
  Task,
  TaskStatus,
  TaskTemplate,
} from "./types";

function emptyState(): AppState {
  return {
    projects: [],
    tasks: [],
    ideas: [],
    dailyLogs: [],
    reviews: [],
    taskTemplates: [],
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

type View = "projects" | "today" | "ideas" | "reviews";

const NavBar: React.FC<{
  currentView: View;
  onChangeView: (v: View) => void;
  userEmail?: string;
  onLogout?: () => Promise<void>;
}> = ({ currentView, onChangeView, userEmail, onLogout }) => {
  const labels: Record<View, string> = {
    projects: "Proyectos",
    today: "Hoy",
    ideas: "Ideas",
    reviews: "Revisión",
  };

  const views: View[] = ["projects", "today", "ideas", "reviews"];
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!onLogout) return;
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-white shadow mb-4">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="font-semibold text-slate-800">
          Panel de Dirección Personal
        </div>
        <div className="flex gap-2 flex-1 justify-center flex-wrap">
          {views.map((v) => (
            <button
              key={v}
              onClick={() => onChangeView(v)}
              className={`px-3 py-1 rounded-md text-sm ${
                currentView === v
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {labels[v]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 whitespace-nowrap">
          {userEmail && (
            <>
              <span className="text-xs text-slate-600">{userEmail}</span>
              <button
                onClick={() => void handleLogout()}
                disabled={isLoggingOut}
                className="px-3 py-1 rounded-md text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60 transition-colors"
              >
                {isLoggingOut ? "..." : "Cerrar sesión"}
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const ProjectDailyLog: React.FC<{
  project: Project;
  logs: DailyLog[];
  today: string;
  userId: string;
  onSaveLog: (log: DailyLog) => Promise<void>;
}> = ({ project, logs, today, userId, onSaveLog }) => {
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isSaving, setIsSaving] = useState(false);

  const logForDate = useMemo(
    () => logs.find((l) => l.date === selectedDate),
    [logs, selectedDate]
  );

  const [summaryToday, setSummaryToday] = useState(logForDate?.summaryToday ?? "");
  const [nextSession, setNextSession] = useState(logForDate?.nextSession ?? "");
  const [laterPending, setLaterPending] = useState(logForDate?.laterPending ?? "");
  const [decisions, setDecisions] = useState(logForDate?.decisions ?? "");
  const [aiPrompt, setAiPrompt] = useState(logForDate?.aiPrompt ?? "");

  useEffect(() => {
    setSummaryToday(logForDate?.summaryToday ?? "");
    setNextSession(logForDate?.nextSession ?? "");
    setLaterPending(logForDate?.laterPending ?? "");
    setDecisions(logForDate?.decisions ?? "");
    setAiPrompt(logForDate?.aiPrompt ?? "");
  }, [logForDate]);

  const handleSave = async () => {
    const base: DailyLog = logForDate ?? {
      id: "",
      userId,
      projectId: project.id,
      date: selectedDate,
      summaryToday: "",
      nextSession: "",
      laterPending: "",
      decisions: "",
      aiPrompt: "",
    };

    setIsSaving(true);
    try {
      await onSaveLog({
        ...base,
        summaryToday,
        nextSession,
        laterPending,
        decisions,
        aiPrompt,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const sortedLogs = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">
            Bitácora diaria – {project.name}
          </h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              En qué quedé hoy
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm min-h-[70px]"
              value={summaryToday}
              onChange={(e) => setSummaryToday(e.target.value)}
              placeholder="Lo último que hice hoy fue..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Qué debería hacer la próxima vez
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm min-h-[70px]"
              value={nextSession}
              onChange={(e) => setNextSession(e.target.value)}
              placeholder="Próximo paso concreto cuando retome este proyecto..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Pendientes más adelante (no para ahora)
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
              value={laterPending}
              onChange={(e) => setLaterPending(e.target.value)}
              placeholder="Cosas que no quiero perder de vista, pero no son para la próxima sesión..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Notas / decisiones
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="Decisiones que tomé hoy, cambios de enfoque, acuerdos con otras personas..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Texto listo para IA (opcional)
            </label>
            <textarea
              className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Por ejemplo: Hoy hice..., me quedé en..., lo siguiente que quiero hacer es..."
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving}
              className="px-4 py-1.5 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? "Guardando..." : "Guardar bitácora"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="font-semibold text-slate-800 mb-2 text-sm">
          Entradas recientes
        </h4>
        {sortedLogs.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no hay registros en la bitácora de este proyecto.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-auto text-xs">
            {sortedLogs.map((log) => (
              <li
                key={log.id}
                className="border rounded p-2 hover:bg-slate-50 cursor-pointer"
                onClick={() => setSelectedDate(log.date)}
              >
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-slate-700">
                    {log.date}
                  </span>
                </div>
                {log.summaryToday && (
                  <p className="text-slate-600">
                    {log.summaryToday.length > 80
                      ? log.summaryToday.slice(0, 80) + "..."
                      : log.summaryToday}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const ProjectsView: React.FC<{
  projects: Project[];
  tasks: Task[];
  dailyLogs: DailyLog[];
  today: string;
  userId: string;
  onAddProject: (input: NewProjectInput) => Promise<void>;
  onUpdateProject: (projectId: string, input: NewProjectInput) => Promise<void>;
  onArchiveProject: (projectId: string) => Promise<void>;
  onDeleteProject: (project: Project) => Promise<void>;
  onSaveDailyLog: (log: DailyLog) => Promise<void>;
  computeScore: (p: Project) => number;
}> = ({
  projects,
  tasks,
  userId,
  dailyLogs,
  today,
  onAddProject,
  onUpdateProject,
  onArchiveProject,
  onDeleteProject,
  onSaveDailyLog,
  computeScore,
}) => {
  const [form, setForm] = useState<NewProjectInput>({
    name: "",
    area: "Negocio",
    objective: "",
    impact: 3,
    urgency: 3,
    effort: 3,
    status: "En marcha",
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const projectsWithScore = useMemo(
    () =>
      projects
        .filter((p) => showArchived || p.status !== "Archivado")
        .map((p) => ({ ...p, score: computeScore(p) }))
        .sort((a, b) => b.score - a.score),
    [projects, computeScore, showArchived]
  );

  const selectedProject = projectsWithScore.find((p) => p.id === selectedProjectId) ?? null;

  const resetForm = () => {
    setForm({
      name: "",
      area: "Negocio",
      objective: "",
      impact: 3,
      urgency: 3,
      effort: 3,
      status: "En marcha",
    });
    setEditingProjectId(null);
  };

  const handleChangeNumber = (
    field: "impact" | "urgency" | "effort",
    value: string
  ) => {
    const n = Number(value);
    setForm((prev) => ({
      ...prev,
      [field]: Number.isNaN(n) ? 1 : Math.min(5, Math.max(1, n)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingProjectId) {
        await onUpdateProject(editingProjectId, form);
      } else {
        await onAddProject(form);
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const areas: Area[] = ["Negocio", "Personal", "Salud", "Familia", "Otro"];
  const statuses: ProjectStatus[] = ["Idea", "En marcha", "Pausado", "Cerrado", "Archivado"];

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setSelectedProjectId(project.id);
    setForm({
      name: project.name,
      area: project.area,
      objective: project.objective,
      impact: project.impact,
      urgency: project.urgency,
      effort: project.effort,
      status: project.status,
    });
  };

  return (
    <div className="max-w-[1500px] mx-auto px-6 pb-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-slate-800">
              Proyectos (ordenados por prioridad)
            </h2>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Mostrar archivados
            </label>
          </div>
          {projectsWithScore.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aún no tienes proyectos. Crea el primero en el formulario de abajo.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {projectsWithScore.map((p) => {
                  const statusColors: Record<string, { badge: string; border: string }> = {
                    "En marcha": { badge: "bg-green-100 text-green-800", border: "border-green-200" },
                    "Idea": { badge: "bg-blue-100 text-blue-800", border: "border-blue-200" },
                    "Pausado": { badge: "bg-gray-100 text-gray-800", border: "border-gray-200" },
                    "Cerrado": { badge: "bg-red-100 text-red-800", border: "border-red-200" },
                    "Archivado": { badge: "bg-yellow-100 text-yellow-800", border: "border-yellow-200" },
                  };
                  const colors = statusColors[p.status] || statusColors["Idea"];

                  const getProgressColor = (value: number) => {
                    if (value <= 2) return "bg-blue-400";
                    if (value <= 3) return "bg-yellow-400";
                    return "bg-orange-500";
                  };

                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${colors.border} ${
                        selectedProjectId === p.id ? "bg-slate-50" : "bg-white"
                      } hover:shadow-md`}
                      onClick={() =>
                        setSelectedProjectId(
                          selectedProjectId === p.id ? null : p.id
                        )
                      }
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 break-words text-sm">{p.name}</h3>
                          <p className="text-xs text-slate-600 mt-1">{p.objective}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${colors.badge}`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3 text-xs">
                        <span className="text-slate-600">Área: <span className="font-semibold">{p.area}</span></span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Impacto</span>
                            <span className="text-xs font-semibold text-slate-800">{p.impact}/5</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressColor(p.impact)}`}
                              style={{ width: `${(p.impact / 5) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Urgencia</span>
                            <span className="text-xs font-semibold text-slate-800">{p.urgency}/5</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressColor(p.urgency)}`}
                              style={{ width: `${(p.urgency / 5) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-600">Esfuerzo</span>
                            <span className="text-xs font-semibold text-slate-800">{p.effort}/5</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getProgressColor(p.effort)}`}
                              style={{ width: `${(p.effort / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-4 p-3 bg-slate-50 rounded">
                        <div>
                          <div className="text-xs text-slate-600">Prioridad</div>
                          <div className="text-2xl font-bold text-slate-800">{p.score}</div>
                        </div>
                        <div className="flex gap-3">
                          <div className="text-center">
                            <div className="text-xs text-slate-600">Tareas</div>
                            <div className="text-lg font-semibold text-slate-800">
                              {tasks.filter((t) => t.projectId === p.id).length}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-slate-600">Bitácoras</div>
                            <div className="text-lg font-semibold text-slate-800">
                              {dailyLogs.filter((l) => l.projectId === p.id).length}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(p);
                          }}
                          className="flex-1 rounded bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          Editar
                        </button>
                        {p.status !== "Archivado" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onArchiveProject(p.id);
                            }}
                            className="flex-1 rounded bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            Archivar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void onDeleteProject(p);
                          }}
                          className="flex-1 rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-4">
                Score sugerido: impacto × 2 + urgencia − esfuerzo.
              </p>
            </>
          )}
        </div>

        <div className="w-full bg-white rounded-lg shadow p-4 xl:w-[360px] xl:min-w-[360px]">
          <h2 className="font-semibold text-slate-800 mb-3">
            {editingProjectId ? "Editar proyecto" : "Nuevo proyecto"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del proyecto
              </label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: Arte Brisa Patagonia, Latitud Sur..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Área
              </label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.area}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, area: e.target.value as Area }))
                }
              >
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Objetivo (una frase)
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[60px]"
                value={form.objective}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, objective: e.target.value }))
                }
                placeholder="Ej: Llenar las cabañas al 60% promedio anual, etc."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Impacto (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-full border rounded px-2 py-1"
                  value={form.impact}
                  onChange={(e) => handleChangeNumber("impact", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Urgencia (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-full border rounded px-2 py-1"
                  value={form.urgency}
                  onChange={(e) => handleChangeNumber("urgency", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Esfuerzo (1–5)
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-full border rounded px-2 py-1"
                  value={form.effort}
                  onChange={(e) => handleChangeNumber("effort", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Estado
              </label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as ProjectStatus,
                  }))
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              {editingProjectId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="mr-2 px-4 py-1.5 rounded bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting
                  ? "Guardando..."
                  : editingProjectId
                    ? "Actualizar proyecto"
                    : "Guardar proyecto"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {selectedProject && (
        <ProjectDailyLog
          project={selectedProject}
          logs={dailyLogs.filter((l) => l.projectId === selectedProject.id)}
          today={today}
          userId={userId}
          onSaveLog={onSaveDailyLog}
        />
      )}
    </div>
  );
};

const IdeasView: React.FC<{
  ideas: Idea[];
  projects: Project[];
  onAddIdea: (input: Omit<Idea, "id" | "userId" | "createdAt">) => Promise<void>;
  onUpdateIdea: (ideaId: string, input: Omit<Idea, "id" | "userId" | "createdAt">) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
}> = ({ ideas, projects, onAddIdea, onUpdateIdea, onDeleteIdea }) => {
  const [form, setForm] = useState<Omit<Idea, "id" | "userId" | "createdAt">>({
    title: "",
    description: "",
    impact: 3,
    effort: 3,
    linkedProjectId: undefined,
    state: "Idea",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      impact: 3,
      effort: 3,
      linkedProjectId: undefined,
      state: "Idea",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onUpdateIdea(editingId, form);
      } else {
        await onAddIdea(form);
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setForm({
      title: idea.title,
      description: idea.description,
      impact: idea.impact,
      effort: idea.effort,
      linkedProjectId: idea.linkedProjectId,
      state: idea.state,
    });
  };

  const stateColors: Record<Idea["state"], string> = {
    "Idea": "bg-blue-100 text-blue-800",
    "A evaluar": "bg-yellow-100 text-yellow-800",
    "Aprobada": "bg-green-100 text-green-800",
    "Descartada": "bg-gray-100 text-gray-800",
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pb-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-800 mb-4">
            Ideas ({ideas.length})
          </h2>
          {ideas.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aún no tienes ideas. Crea la primera en el formulario.
            </p>
          ) : (
            <div className="space-y-3">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 break-words">{idea.title}</h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{idea.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${stateColors[idea.state]}`}>
                      {idea.state}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                    <div className="flex gap-4">
                      <span>Impacto: <span className="font-semibold text-slate-800">{idea.impact}/5</span></span>
                      <span>Esfuerzo: <span className="font-semibold text-slate-800">{idea.effort}/5</span></span>
                    </div>
                  </div>

                  {idea.linkedProjectId && (
                    <div className="text-xs text-slate-600 mb-3">
                      <span>Proyecto: <span className="font-semibold">{projects.find((p) => p.id === idea.linkedProjectId)?.name || "No encontrado"}</span></span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(idea)}
                      className="flex-1 rounded bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteIdea(idea.id)}
                      className="flex-1 rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full bg-white rounded-lg shadow p-4 lg:w-[320px] lg:min-w-[320px]">
          <h2 className="font-semibold text-slate-800 mb-3">
            {editingId ? "Editar idea" : "Nueva idea"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Título
              </label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Nombre de la idea"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descripción
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[60px]"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe tu idea..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Impacto (1–5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                className="w-full border rounded px-2 py-1"
                value={form.impact}
                onChange={(e) => setForm((prev) => ({ ...prev, impact: Math.min(5, Math.max(1, Number(e.target.value))) }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Esfuerzo (1–5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                className="w-full border rounded px-2 py-1"
                value={form.effort}
                onChange={(e) => setForm((prev) => ({ ...prev, effort: Math.min(5, Math.max(1, Number(e.target.value))) }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Estado
              </label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value as Idea["state"] }))}
              >
                <option value="Idea">Idea</option>
                <option value="A evaluar">A evaluar</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Descartada">Descartada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Proyecto relacionado (opcional)
              </label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.linkedProjectId || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, linkedProjectId: e.target.value || undefined }))}
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-1.5 rounded bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting ? "..." : (editingId ? "Actualizar" : "Crear")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ReviewsView: React.FC<{
  reviews: Review[];
  onAddReview: (input: Omit<Review, "id" | "userId" | "createdAt">) => Promise<void>;
  onUpdateReview: (reviewId: string, input: Omit<Review, "id" | "userId" | "createdAt">) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
}> = ({ reviews, onAddReview, onUpdateReview, onDeleteReview }) => {
  const [form, setForm] = useState<Omit<Review, "id" | "userId" | "createdAt">>({
    date: new Date().toISOString().split("T")[0],
    type: "semanal",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      type: "semanal",
      notes: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date.trim() || !form.notes.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await onUpdateReview(editingId, form);
      } else {
        await onAddReview(form);
      }
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setForm({
      date: review.date,
      type: review.type,
      notes: review.notes,
    });
  };

  const typeLabels: Record<ReviewType, string> = {
    semanal: "Revisión Semanal",
    mensual: "Revisión Mensual",
  };

  const typeColors: Record<ReviewType, string> = {
    semanal: "bg-blue-100 text-blue-800",
    mensual: "bg-purple-100 text-purple-800",
  };

  const reviewsByType = reviews.reduce((acc, review) => {
    if (!acc[review.type]) acc[review.type] = [];
    acc[review.type].push(review);
    return acc;
  }, {} as Record<ReviewType, Review[]>);

  return (
    <div className="max-w-5xl mx-auto px-6 pb-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-800 mb-4">
            Revisiones ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aún no tienes revisiones. Crea la primera en el formulario.
            </p>
          ) : (
            <div className="space-y-6">
              {(["semanal", "mensual"] as const).map((type) => {
                const typeReviews = reviewsByType[type] || [];
                if (typeReviews.length === 0) return null;

                return (
                  <div key={type}>
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm">
                      {typeLabels[type]}
                    </h3>
                    <div className="space-y-3">
                      {typeReviews.map((review) => (
                        <div
                          key={review.id}
                          className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-slate-800">
                                  {new Date(review.date).toLocaleDateString("es-ES", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{review.notes}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${typeColors[review.type]}`}>
                              {typeLabels[review.type]}
                            </span>
                          </div>

                          <div className="flex gap-2 pt-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(review)}
                              className="flex-1 rounded bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeleteReview(review.id)}
                              className="flex-1 rounded bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full bg-white rounded-lg shadow p-4 lg:w-[320px] lg:min-w-[320px]">
          <h2 className="font-semibold text-slate-800 mb-3">
            {editingId ? "Editar revisión" : "Nueva revisión"}
          </h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Fecha
              </label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tipo de revisión
              </label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as ReviewType }))}
              >
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Notas de revisión
              </label>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[80px]"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Reflexiones, aprendizajes, próximas acciones..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-1.5 rounded bg-slate-100 text-slate-700 text-sm hover:bg-slate-200"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting ? "..." : (editingId ? "Actualizar" : "Crear")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TodayView: React.FC<{
  initialDate: string;
  projects: Project[];
  tasks: Task[];
  templates: TaskTemplate[];
  onAddTask: (input: {
    title: string;
    date: string;
    projectId?: string;
    isKey: boolean;
  }) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  onUpdateTask: (taskId: string, input: {
    title: string;
    date: string;
    projectId?: string;
    isKey: boolean;
  }) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSaveTaskAsTemplate: (taskTitle: string) => Promise<void>;
  onDeleteTaskTemplate: (templateId: string) => Promise<void>;
}> = ({ initialDate, projects, tasks, templates, onAddTask, onUpdateTaskStatus, onUpdateTask, onDeleteTask, onSaveTaskAsTemplate, onDeleteTaskTemplate }) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | "">("");
  const [isKey, setIsKey] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editProjectId, setEditProjectId] = useState<string | "">();
  const [editIsKey, setEditIsKey] = useState(false);
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const tasksForDay = useMemo(
    () => tasks.filter((t) => t.date === selectedDate),
    [tasks, selectedDate]
  );

  const keyTasksCount = tasksForDay.filter((t) => t.isKey).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isKey && keyTasksCount >= 3) {
      alert("Ya tienes 3 tareas clave para este día. Ajusta alguna o marca esta como NO clave.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTask({
        title,
        date: selectedDate,
        projectId: projectId || undefined,
        isKey,
      });

      setTitle("");
      setIsKey(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditProjectId(task.projectId || "");
    setEditIsKey(task.isKey);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editTitle.trim()) return;

    setIsEditingSubmitting(true);
    try {
      await onUpdateTask(editingTaskId, {
        title: editTitle,
        date: selectedDate,
        projectId: (editProjectId as string) || undefined,
        isKey: editIsKey,
      });
      setEditingTaskId(null);
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
      try {
        await onDeleteTask(taskId);
      } catch (err) {
        alert("Error al eliminar la tarea");
      }
    }
  };

  const getProjectName = (id?: string) =>
    projects.find((p) => p.id === id)?.name ?? "Sin proyecto";
  const availableProjects = projects.filter((project) => project.status !== "Archivado");

  const statusOptions: TaskStatus[] = ["Pendiente", "En curso", "Hecha"];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-slate-800">
              Planificador diario
            </h2>
            <p className="text-xs text-slate-500">
              Máximo 3 tareas clave. El resto son tareas secundarias.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Día:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        {templates.length > 0 && (
          <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              O selecciona una plantilla guardada:
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              onChange={(e) => {
                if (e.target.value) {
                  setTitle(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">— Plantillas de tareas —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2 text-sm">
          <div className="grid gap-2 md:grid-cols-[2fr,1fr]">
            <input
              type="text"
              className="border rounded px-2 py-1"
              placeholder="Nueva tarea para este día..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="border rounded px-2 py-1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Sin proyecto asociado</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isKey}
                onChange={(e) => setIsKey(e.target.checked)}
              />
              Es una tarea clave del día
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (title.trim()) {
                    void onSaveTaskAsTemplate(title);
                  }
                }}
                className="px-3 py-1.5 rounded bg-green-100 text-green-700 text-xs hover:bg-green-200 border border-green-300"
              >
                Guardar como plantilla
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting ? "Guardando..." : "Agregar tarea"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-slate-800 mb-2 text-sm">
          Tareas para el {selectedDate}
        </h3>
        {tasksForDay.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no tienes tareas para este día.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {tasksForDay.map((task) => (
              editingTaskId === task.id ? (
                <li key={task.id} className="border rounded p-2 bg-blue-50">
                  <form onSubmit={(e) => void handleSaveEdit(e)} className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Título de la tarea"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={editProjectId || ""}
                        onChange={(e) => setEditProjectId(e.target.value)}
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="">Sin proyecto</option>
                        {projects.filter((p) => p.status !== "Archivado").map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={editIsKey}
                          onChange={(e) => setEditIsKey(e.target.checked)}
                        />
                        Tarea clave
                      </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isEditingSubmitting}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {isEditingSubmitting ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={task.id}
                  className="border rounded px-2 py-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50 group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {task.isKey && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                          CLAVE
                        </span>
                      )}
                      <span
                        className={
                          task.status === "Hecha"
                            ? "line-through text-slate-400"
                            : "text-slate-800"
                        }
                      >
                        {task.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {getProjectName(task.projectId)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(e) => {
                        void onUpdateTaskStatus(task.id, e.target.value as TaskStatus);
                      }}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleStartEdit(task)}
                      className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => void handleDeleteTask(task.id)}
                      className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              )
            ))}
          </ul>
        )}
      </div>

      {templates.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="font-semibold text-slate-800 mb-2 text-sm">
            Mis plantillas de tareas ({templates.length})
          </h3>
          <div className="space-y-1 text-xs">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between border rounded px-2 py-1 hover:bg-slate-50"
              >
                <span className="text-slate-700">{template.title}</span>
                <button
                  onClick={() => void onDeleteTaskTemplate(template.id)}
                  className="px-2 py-0.5 rounded text-red-600 hover:bg-red-100"
                  title="Eliminar plantilla"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const getToday = () => new Date().toISOString().slice(0, 10);

const computeScore = (project: Project): number =>
  project.impact * 2 + project.urgency - project.effort;

const App: React.FC = () => {
  const { session, user, loading: authLoading, signInWithPassword, signOut } = useAuth();
  const [state, setState] = useState<AppState>(emptyState);
  const [currentView, setCurrentView] = useState<View>("projects");
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(
    getSupabaseConfigError()
  );

  // Manejar callback de autenticación
  useEffect(() => {
    const handleAuthCallback = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (code) {
        // Supabase ya manejó el callback en onAuthStateChange
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (error) {
        setSyncError(`Error de autenticación: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleAuthCallback();
  }, []);

  // Cargar datos cuando el usuario está autenticado
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        // Migrar datos locales si es la primera vez de este usuario
        await migrateLocalStorageToSupabase(user.id);

        const [remoteData, templates] = await Promise.all([
          fetchPanelData(user.id),
          fetchTaskTemplates(user.id),
        ]);
        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          projects: remoteData.projects,
          tasks: remoteData.tasks,
          dailyLogs: remoteData.dailyLogs,
          ideas: remoteData.ideas,
          reviews: remoteData.reviews,
          taskTemplates: templates,
        }));
        setSyncError(null);
      } catch (error) {
        if (!isMounted) return;
        setSyncError(
          getErrorMessage(error, "No se pudo cargar la información desde Supabase.")
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const today = getToday();

  const handleAddProject = async (input: NewProjectInput) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const project = await createProject(input, user.id);
      setState((prev) => ({
        ...prev,
        projects: [...prev.projects, project],
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo guardar el proyecto en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleUpdateProject = async (
    projectId: string,
    input: NewProjectInput
  ) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const updatedProject = await persistProjectUpdate(projectId, input, user.id);
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((project) =>
          project.id === projectId ? updatedProject : project
        ),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo actualizar el proyecto en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    const project = state.projects.find((item) => item.id === projectId);
    if (!project) return;

    await handleUpdateProject(projectId, {
      name: project.name,
      area: project.area,
      objective: project.objective,
      impact: project.impact,
      urgency: project.urgency,
      effort: project.effort,
      status: "Archivado",
    });
  };

  const handleDeleteProject = async (project: Project) => {
    if (!user) throw new Error("Usuario no autenticado");

    let counts: ProjectDependencyCounts;

    try {
      counts = await getProjectDependencyCounts(project.id, user.id);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudieron verificar las dependencias del proyecto."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }

    const hasDependencies = counts.tasks > 0 || counts.dailyLogs > 0;
    if (hasDependencies) {
      alert(
        `No se puede eliminar "${project.name}" porque tiene ${counts.tasks} tarea(s) y ${counts.dailyLogs} bitácora(s) asociada(s). Archívalo o limpia esas dependencias primero.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Eliminar "${project.name}"?\n\nTareas asociadas: ${counts.tasks}\nBitácoras asociadas: ${counts.dailyLogs}`
    );

    if (!confirmed) return;

    try {
      await removeProject(project.id, user.id);
      setState((prev) => ({
        ...prev,
        projects: prev.projects.filter((item) => item.id !== project.id),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo eliminar el proyecto en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleSaveDailyLog = async (log: DailyLog) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const savedLog = await saveDailyLog(log, user.id);
      setState((prev) => {
        const existingIndex = prev.dailyLogs.findIndex(
          (item) =>
            item.id === savedLog.id ||
            (item.projectId === savedLog.projectId && item.date === savedLog.date)
        );

        if (existingIndex >= 0) {
          const updatedLogs = [...prev.dailyLogs];
          updatedLogs[existingIndex] = savedLog;
          return { ...prev, dailyLogs: updatedLogs };
        }

        return { ...prev, dailyLogs: [...prev.dailyLogs, savedLog] };
      });
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo guardar la bitácora en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleAddTask = async (input: {
    title: string;
    date: string;
    projectId?: string;
    isKey: boolean;
  }) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const task = await createTask(input, user.id);
      setState((prev) => ({
        ...prev,
        tasks: [...prev.tasks, task],
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo guardar la tarea en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const updatedTask = await persistTaskStatus(taskId, status, user.id);
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo actualizar el estado de la tarea en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    input: { title: string; date: string; projectId?: string; isKey: boolean }
  ) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const updatedTask = await updateTask(taskId, input, user.id);
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo actualizar la tarea en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      await deleteTask(taskId, user.id);
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((task) => task.id !== taskId),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo eliminar la tarea en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleSaveTaskAsTemplate = async (taskTitle: string) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const newTemplate = await createTaskTemplate(taskTitle, undefined, user.id);
      setState((prev) => ({
        ...prev,
        taskTemplates: [newTemplate, ...prev.taskTemplates],
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(
        error,
        "No se pudo guardar la plantilla en Supabase."
      );
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleDeleteTaskTemplate = async (templateId: string) => {
    if (!user) throw new Error("Usuario no autenticado");

    if (confirm("¿Estás seguro de que quieres eliminar esta plantilla?")) {
      try {
        await deleteTaskTemplate(templateId, user.id);
        setState((prev) => ({
          ...prev,
          taskTemplates: prev.taskTemplates.filter((t) => t.id !== templateId),
        }));
        setSyncError(null);
      } catch (error) {
        const message = getErrorMessage(
          error,
          "No se pudo eliminar la plantilla en Supabase."
        );
        setSyncError(message);
        alert(message);
        throw error;
      }
    }
  };

  const handleAddIdea = async (input: Omit<Idea, "id" | "userId" | "createdAt">) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const idea = await createIdea(input, user.id);
      setState((prev) => ({
        ...prev,
        ideas: [idea, ...prev.ideas],
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(error, "No se pudo crear la idea en Supabase.");
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleUpdateIdea = async (ideaId: string, input: Omit<Idea, "id" | "userId" | "createdAt">) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const updatedIdea = await updateIdea(ideaId, input, user.id);
      setState((prev) => ({
        ...prev,
        ideas: prev.ideas.map((idea) => (idea.id === ideaId ? updatedIdea : idea)),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(error, "No se pudo actualizar la idea en Supabase.");
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!user) throw new Error("Usuario no autenticado");

    if (confirm("¿Estás seguro de que quieres eliminar esta idea?")) {
      try {
        await deleteIdea(ideaId, user.id);
        setState((prev) => ({
          ...prev,
          ideas: prev.ideas.filter((idea) => idea.id !== ideaId),
        }));
        setSyncError(null);
      } catch (error) {
        const message = getErrorMessage(error, "No se pudo eliminar la idea en Supabase.");
        setSyncError(message);
        alert(message);
        throw error;
      }
    }
  };

  const handleAddReview = async (input: Omit<Review, "id" | "userId" | "createdAt">) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const review = await createReview(input, user.id);
      setState((prev) => ({
        ...prev,
        reviews: [review, ...prev.reviews],
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(error, "No se pudo crear la revisión en Supabase.");
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleUpdateReview = async (reviewId: string, input: Omit<Review, "id" | "userId" | "createdAt">) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const updatedReview = await updateReview(reviewId, input, user.id);
      setState((prev) => ({
        ...prev,
        reviews: prev.reviews.map((review) => (review.id === reviewId ? updatedReview : review)),
      }));
      setSyncError(null);
    } catch (error) {
      const message = getErrorMessage(error, "No se pudo actualizar la revisión en Supabase.");
      setSyncError(message);
      alert(message);
      throw error;
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) throw new Error("Usuario no autenticado");

    if (confirm("¿Estás seguro de que quieres eliminar esta revisión?")) {
      try {
        await deleteReview(reviewId, user.id);
        setState((prev) => ({
          ...prev,
          reviews: prev.reviews.filter((review) => review.id !== reviewId),
        }));
        setSyncError(null);
      } catch (error) {
        const message = getErrorMessage(error, "No se pudo eliminar la revisión en Supabase.");
        setSyncError(message);
        alert(message);
        throw error;
      }
    }
  };

  // Mostrar página de login si no está autenticado
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600">Cargando autenticación...</div>
      </div>
    );
  }

  if (!session || !user) {
    return <LoginPage onSignInWithPassword={signInWithPassword} />;
  }

  // Mostrar callback page si está en la URL de callback
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") || params.has("error")) {
    return <AuthCallbackPage />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar
        currentView={currentView}
        onChangeView={setCurrentView}
        userEmail={user.email}
        onLogout={signOut}
      />
      {syncError && (
        <div className="max-w-5xl mx-auto w-full px-4 mb-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {syncError}
          </div>
        </div>
      )}
      <main className="flex-1">
        {isLoading ? (
          <div className="max-w-4xl mx-auto px-4 pb-8">
            <div className="bg-white rounded-lg shadow p-4 text-sm text-slate-600">
              Cargando datos desde Supabase...
            </div>
          </div>
        ) : (
          <>
            {currentView === "projects" && (
              <ProjectsView
                projects={state.projects}
                tasks={state.tasks}
                dailyLogs={state.dailyLogs}
                today={today}
                userId={user!.id}
                onAddProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onArchiveProject={handleArchiveProject}
                onDeleteProject={handleDeleteProject}
                onSaveDailyLog={handleSaveDailyLog}
                computeScore={computeScore}
              />
            )}
            {currentView === "today" && (
              <TodayView
                initialDate={today}
                projects={state.projects}
                tasks={state.tasks}
                templates={state.taskTemplates}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onSaveTaskAsTemplate={handleSaveTaskAsTemplate}
                onDeleteTaskTemplate={handleDeleteTaskTemplate}
              />
            )}
            {currentView === "ideas" && (
              <IdeasView
                ideas={state.ideas}
                projects={state.projects}
                onAddIdea={handleAddIdea}
                onUpdateIdea={handleUpdateIdea}
                onDeleteIdea={handleDeleteIdea}
              />
            )}
            {currentView === "reviews" && (
              <ReviewsView
                reviews={state.reviews}
                onAddReview={handleAddReview}
                onUpdateReview={handleUpdateReview}
                onDeleteReview={handleDeleteReview}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
