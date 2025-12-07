import React from "react";

type View = "projects" | "today" | "ideas" | "reviews";

interface NavBarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

const labels: Record<View, string> = {
  projects: "Proyectos",
  today: "Hoy",
  ideas: "Ideas",
  reviews: "Revisión",
};

export const NavBar: React.FC<NavBarProps> = ({
  currentView,
  onChangeView,
}) => {
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
