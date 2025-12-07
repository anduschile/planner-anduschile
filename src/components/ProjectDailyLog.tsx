import React, { useMemo, useState } from "react";
import type { DailyLog, Project } from "@/types";

interface ProjectDailyLogProps {
  project: Project;
  logs: DailyLog[];
  today: string;
  onSaveLog: (log: DailyLog) => void;
}

export const ProjectDailyLog: React.FC<ProjectDailyLogProps> = ({
  project,
  logs,
  today,
  onSaveLog,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const logForDate = useMemo(
    () => logs.find((l) => l.date === selectedDate),
    [logs, selectedDate]
  );

  const [summaryToday, setSummaryToday] = useState(logForDate?.summaryToday ?? "");
  const [nextSession, setNextSession] = useState(logForDate?.nextSession ?? "");
  const [laterPending, setLaterPending] = useState(logForDate?.laterPending ?? "");
  const [decisions, setDecisions] = useState(logForDate?.decisions ?? "");
  const [aiPrompt, setAiPrompt] = useState(logForDate?.aiPrompt ?? "");

  React.useEffect(() => {
    setSummaryToday(logForDate?.summaryToday ?? "");
    setNextSession(logForDate?.nextSession ?? "");
    setLaterPending(logForDate?.laterPending ?? "");
    setDecisions(logForDate?.decisions ?? "");
    setAiPrompt(logForDate?.aiPrompt ?? "");
  }, [logForDate]);

  const handleSave = () => {
    const base: DailyLog = logForDate ?? {
      id: "", // lo completará el padre si hace falta
      projectId: project.id,
      date: selectedDate,
      summaryToday: "",
      nextSession: "",
      laterPending: "",
      decisions: "",
      aiPrompt: "",
    };

    onSaveLog({
      ...base,
      summaryToday,
      nextSession,
      laterPending,
      decisions,
      aiPrompt,
    });
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
              onClick={handleSave}
              className="px-4 py-1.5 text-sm rounded bg-slate-900 text-white hover:bg-slate-800"
            >
              Guardar bitácora
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
                  <p className="text-slate-600 line-clamp-3">
                    {log.summaryToday}
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
