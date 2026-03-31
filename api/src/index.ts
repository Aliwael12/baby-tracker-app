import "dotenv/config";
import express from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import meRouter from "./routes/me";
import babiesRouter from "./routes/babies";
import logsRouter from "./routes/logs";
import profilesRouter from "./routes/profiles";

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/babies", babiesRouter);
app.use("/logs", logsRouter);
app.use("/profiles", profilesRouter);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`Baby Tracker API running on http://localhost:${PORT}`);
});

export default app;
