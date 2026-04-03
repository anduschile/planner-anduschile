import React, { useEffect, useMemo, useState } from "react";
import "./index.css";
import {
  createProject,
  createTask,
  fetchPanelData,
  saveDailyLog,
  updateTaskStatus as persistTaskStatus,
} from "./lib/panelData";
import { migrateLocalStorageToSupabase } from "./lib/migration";
import {
  getSupabaseConfigError,
  isSupabaseConfigured,
} from "./lib/supabase";
import type {
  AppState,
  Area,
  DailyLog,
  NewProjectInput,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
} from "./types";

function emptyState(): AppState {
  return {
    projects: [],
    tasks: [],
    ideas: [],
    dailyLogs: [],
    reviews: [],
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
}> = ({ currentView, onChangeView }) => {
  const labels: Record<View, string> = {
    projects: "Proyectos",
    today: "Hoy",
    ideas: "Ideas",
    reviews: "Revisión",
  };

  const views: View[] = ["projects", "today", "ideas", "reviews"];

  return (
    <nav className="bg-white shadow mb-4">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-slate-800">
          Panel de Dirección Personal
        </div>
        <div className="flex gap-2">
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
      </div>
    </nav>
  );
};

const ProjectDailyLog: React.FC<{
  project: Project;
  logs: DailyLog[];
  today: string;
  onSaveLog: (log: DailyLog) => Promise<void>;
}> = ({ project, logs, today, onSaveLog }) => {
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
  dailyLogs: DailyLog[];
  today: string;
  onAddProject: (input: NewProjectInput) => Promise<void>;
  onSaveDailyLog: (log: DailyLog) => Promise<void>;
  computeScore: (p: Project) => number;
}> = ({ projects, dailyLogs, today, onAddProject, onSaveDailyLog, computeScore }) => {
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

  const projectsWithScore = useMemo(
    () =>
      projects
        .map((p) => ({ ...p, score: computeScore(p) }))
        .sort((a, b) => b.score - a.score),
    [projects, computeScore]
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

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
      await onAddProject(form);
      setForm({
        name: "",
        area: "Negocio",
        objective: "",
        impact: 3,
        urgency: 3,
        effort: 3,
        status: "En marcha",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const areas: Area[] = ["Negocio", "Personal", "Salud", "Familia", "Otro"];
  const statuses: ProjectStatus[] = ["Idea", "En marcha", "Pausado", "Cerrado"];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-8">
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-800 mb-3">
            Proyectos (ordenados por prioridad)
          </h2>
          {projectsWithScore.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aún no tienes proyectos. Crea el primero en el formulario de la derecha.
            </p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border px-2 py-1 text-left">Proyecto</th>
                  <th className="border px-2 py-1 text-left">Área</th>
                  <th className="border px-2 py-1 text-center">Impacto</th>
                  <th className="border px-2 py-1 text-center">Urgencia</th>
                  <th className="border px-2 py-1 text-center">Esfuerzo</th>
                  <th className="border px-2 py-1 text-center">Score</th>
                  <th className="border px-2 py-1 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {projectsWithScore.map((p) => (
                  <tr
                    key={p.id}
                    className={`cursor-pointer hover:bg-slate-50 ${
                      selectedProjectId === p.id ? "bg-slate-100" : ""
                    }`}
                    onClick={() =>
                      setSelectedProjectId(
                        selectedProjectId === p.id ? null : p.id
                      )
                    }
                  >
                    <td className="border px-2 py-1">{p.name}</td>
                    <td className="border px-2 py-1">{p.area}</td>
                    <td className="border px-2 py-1 text-center">{p.impact}</td>
                    <td className="border px-2 py-1 text-center">{p.urgency}</td>
                    <td className="border px-2 py-1 text-center">{p.effort}</td>
                    <td className="border px-2 py-1 text-center font-semibold">
                      {p.score}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {p.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[11px] text-slate-500 mt-2">
            Score sugerido: impacto × 2 + urgencia − esfuerzo.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-800 mb-3">
            Nuevo proyecto
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

            <div className="grid grid-cols-3 gap-2">
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                {isSubmitting ? "Guardando..." : "Guardar proyecto"}
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
          onSaveLog={onSaveDailyLog}
        />
      )}
    </div>
  );
};

const TodayView: React.FC<{
  initialDate: string;
  projects: Project[];
  tasks: Task[];
  onAddTask: (input: {
    title: string;
    date: string;
    projectId?: string;
    isKey: boolean;
  }) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
}> = ({ initialDate, projects, tasks, onAddTask, onUpdateTaskStatus }) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | "">("");
  const [isKey, setIsKey] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const getProjectName = (id?: string) =>
    projects.find((p) => p.id === id)?.name ?? "Sin proyecto";

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
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isKey}
                onChange={(e) => setIsKey(e.target.checked)}
              />
              Es una tarea clave del día
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Guardando..." : "Agregar tarea"}
            </button>
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
              <li
                key={task.id}
                className="border rounded px-2 py-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const IdeasView: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 pb-8">
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-slate-800 mb-2">Ideas</h2>
      <p className="text-sm text-slate-600">
        Aquí más adelante tendrás tu backlog de ideas (negocios, mejoras,
        automatizaciones). Por ahora, enfócate en Proyectos y Hoy.
      </p>
    </div>
  </div>
);

const ReviewsView: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 pb-8">
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-slate-800 mb-2">
        Revisiones semanal / mensual
      </h2>
      <p className="text-sm text-slate-600">
        Aquí luego podrás hacer revisión semanal y mensual: qué avanzaste,
        qué pausas, y qué entra al TOP 3 de foco.
      </p>
    </div>
  </div>
);

const getToday = () => new Date().toISOString().slice(0, 10);

const computeScore = (project: Project): number =>
  project.impact * 2 + project.urgency - project.effort;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(emptyState);
  const [currentView, setCurrentView] = useState<View>("projects");
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(
    getSupabaseConfigError()
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        await migrateLocalStorageToSupabase();
        const remoteData = await fetchPanelData();
        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          projects: remoteData.projects,
          tasks: remoteData.tasks,
          dailyLogs: remoteData.dailyLogs,
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
  }, []);

  const today = getToday();

  const handleAddProject = async (input: NewProjectInput) => {
    try {
      const project = await createProject(input);
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

  const handleSaveDailyLog = async (log: DailyLog) => {
    try {
      const savedLog = await saveDailyLog(log);
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
    try {
      const task = await createTask(input);
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
    try {
      const updatedTask = await persistTaskStatus(taskId, status);
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

  return (
    <div className="flex flex-col min-h-screen">
      <NavBar currentView={currentView} onChangeView={setCurrentView} />
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
                dailyLogs={state.dailyLogs}
                today={today}
                onAddProject={handleAddProject}
                onSaveDailyLog={handleSaveDailyLog}
                computeScore={computeScore}
              />
            )}
            {currentView === "today" && (
              <TodayView
                initialDate={today}
                projects={state.projects}
                tasks={state.tasks}
                onAddTask={handleAddTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
              />
            )}
            {currentView === "ideas" && <IdeasView />}
            {currentView === "reviews" && <ReviewsView />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
