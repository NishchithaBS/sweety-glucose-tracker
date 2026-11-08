import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase, pool } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import readingRoutes from "./routes/readingRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "Sweety API" }));
app.use("/api/auth", authRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/reports", reportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

const port = process.env.PORT || 5000;
initializeDatabase()
  .then(() => app.listen(port, () => console.log(`Sweety API running at http://localhost:${port}`)))
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});
