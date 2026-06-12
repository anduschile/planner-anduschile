import React, { useEffect } from "react";

const AuthCallbackPage: React.FC = () => {
  useEffect(() => {
    window.location.href = "/";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Redirigiendo...</h1>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
