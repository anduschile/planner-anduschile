import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Carpeta dist generada por vite build
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// Cualquier ruta → index.html (SPA)
app.get("*", (_, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Render asigna el puerto con process.env.PORT
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Servidor iniciado en puerto ${port}`);
});
