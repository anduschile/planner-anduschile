import React, { useMemo, useState } from "react";
import type { Area, DailyLog, NewProjectInput, Project } from "../types";
import { ProjectDailyLog } from "../components/ProjectDailyLog";
interface ProjectsPageProps {
  projects: Project[];
  dailyLogs: DailyLog[];
  today: string;
  onAddProject: (input: NewProjectInput) => void;
  onSaveDailyLog: (log: DailyLog) => void;
  computeScore: (project: Project) => number;
}

const areas: Area[] = ["Negocio", "Personal", "Salud", "Familia", "Otro"];

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  dailyLogs,
  today,
  onAddProject,
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
    setForm((prev: NewProjectInput) => ({
  ...prev,
  [field]: isNaN(n) ? 1 : Math.min(5, Math.max(1, n)),
}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAddProject(form);
    setForm({
      name: "",
      area: "Negocio",
      objective: "",
      impact: 3,
      urgency: 3,
      effort: 3,
      status: "En marcha",
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-8">
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        {/* Lista de proyectos */}
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
            Te sirve para ver tus TOP 3 proyectos que deberían mandar tu tiempo.
          </p>
        </div>

        {/* Formulario nuevo proyecto */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold text-slate-800 mb-3">
            Nuevo proyecto
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del proyecto
              </label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1"
                value={form.name}
                onChange={(e) =>
                  setForm((prev: NewProjectInput) => ({ ...prev, name: e.target.value }))
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
                  setForm((prev: NewProjectInput) => ({ ...prev, area: e.target.value as Area }))
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
                  setForm((prev: NewProjectInput) => ({ ...prev, objective: e.target.value }))
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

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-800"
              >
                Guardar proyecto
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
