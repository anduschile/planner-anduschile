// src/pages/ReviewsPage.tsx
import React from "react";

export const ReviewsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-800 mb-2">
          Revisiones semanal / mensual
        </h2>
        <p className="text-sm text-slate-600">
          Aquí más adelante tendrás tu revisión semanal y mensual: 
          qué avanzaste, qué vas a pausar, y qué entra al TOP 3 de foco.
          Por ahora, enfócate en Proyectos y Hoy.
        </p>
      </div>
    </div>
  );
};
