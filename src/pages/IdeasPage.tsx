import React from "react";

export const IdeasPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-slate-800 mb-2">
          Ideas (pendiente de implementación)
        </h2>
        <p className="text-sm text-slate-600">
          Aquí vamos a manejar el backlog de ideas, con impacto, esfuerzo y
          conexión a proyectos. De momento, enfoquémonos en Proyectos, Hoy y la
          Bitácora diaria.
        </p>
      </div>
    </div>
  );
};
