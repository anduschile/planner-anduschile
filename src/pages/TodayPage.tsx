import React, { useMemo, useState } from "react";
import type { Project, Task, TaskStatus } from "@/types";

interface TodayPageProps {
  initialDate: string;
  projects: Project[];
  tasks: Task[];
  onAddTask: (input: {
    title: string;
    date: string;
    projectId?: string;
    isKey: boolean;
  }) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  initialDate,
  projects,
  tasks,
  onAddTask,
  onUpdateTaskStatus,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | "">("");
  const [isKey, setIsKey] = useState<boolean>(true);

  const tasksForDay = useMemo(
    () => tasks.filter((t) => t.date === selectedDate),
    [tasks, selectedDate]
  );

  const keyTasksCount = tasksForDay.filter((t) => t.isKey).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isKey && keyTasksCount >= 3) {
      alert("Ya tienes 3 tareas clave para este día. Marca esta como NO clave o ajusta alguna.");
      return;
    }

    onAddTask({
      title,
      date: selectedDate,
      projectId: projectId || undefined,
      isKey,
    });

    setTitle("");
    setIsKey(true);
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
              Máximo 3 tareas clave. El resto son tareas secundarias. La idea es
              que tu día gire en torno a esas 3.
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

        <form onSubmit={handleSubmit} className="space-y-2 text-sm">
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
              className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs hover:bg-slate-800"
            >
              Agregar tarea
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
                      className={`${
                        task.status === "Hecha"
                          ? "line-through text-slate-400"
                          : "text-slate-800"
                      }`}
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
                    onChange={(e) =>
                      onUpdateTaskStatus(task.id, e.target.value as TaskStatus)
                    }
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
