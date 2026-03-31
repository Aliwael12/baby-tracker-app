import { Router, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

const createLogSchema = z.object({
  babyId: z.number().int().positive(),
  type: z.enum(["feed", "pump", "sleep", "diaper", "shower", "growth"]),
  side: z.enum(["left", "right"]).nullable().optional(),
  diaperStatus: z
    .enum(["empty", "wet", "dirty", "wet_and_dirty"])
    .nullable()
    .optional(),
  weightKg: z.number().nullable().optional(),
  heightCm: z.number().nullable().optional(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
  comments: z.string().nullable().optional(),
  enteredByName: z.string().min(1),
}).superRefine((data, ctx) => {
  if ((data.type === "feed" || data.type === "pump") && !data.side) {
    ctx.addIssue({ code: "custom", message: "side is required for feed/pump", path: ["side"] });
  }
  if (data.type === "growth" && !data.weightKg && !data.heightCm) {
    ctx.addIssue({ code: "custom", message: "weightKg or heightCm required for growth", path: ["weightKg"] });
  }
});

// GET /logs?babyId=X&limit=200
router.get("/", authMiddleware, async (req, res: Response): Promise<void> => {
  const { accountId } = req as AuthRequest;
  const babyId = req.query.babyId ? parseInt(req.query.babyId as string) : null;
  const limit = req.query.limit === "all" ? undefined : parseInt((req.query.limit as string) || "200");

  if (!babyId) {
    res.status(400).json({ error: "babyId query param required" });
    return;
  }

  // Verify baby belongs to account
  const baby = await prisma.baby.findFirst({ where: { id: babyId, accountId } });
  if (!baby) {
    res.status(403).json({ error: "Baby not found or not yours" });
    return;
  }

  const logs = await prisma.activityLog.findMany({
    where: { accountId, babyId },
    orderBy: { startTime: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      side: true,
      diaperStatus: true,
      weightKg: true,
      heightCm: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      comments: true,
      enteredByName: true,
      createdAt: true,
    },
  });

  res.json(logs);
});

// POST /logs
router.post("/", authMiddleware, async (req, res: Response): Promise<void> => {
  const { accountId } = req as AuthRequest;

  const parsed = createLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const {
    babyId,
    type,
    side,
    diaperStatus,
    weightKg,
    heightCm,
    startTime,
    endTime,
    comments,
    enteredByName,
  } = parsed.data;

  // Verify baby belongs to account
  const baby = await prisma.baby.findFirst({ where: { id: babyId, accountId } });
  if (!baby) {
    res.status(403).json({ error: "Baby not found or not yours" });
    return;
  }

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  const durationMinutes =
    end && end > start
      ? (end.getTime() - start.getTime()) / 60000
      : null;

  const log = await prisma.activityLog.create({
    data: {
      accountId,
      babyId,
      type,
      side: side ?? null,
      diaperStatus: diaperStatus ?? null,
      weightKg: weightKg ?? null,
      heightCm: heightCm ?? null,
      startTime: start,
      endTime: end,
      durationMinutes,
      comments: comments ?? null,
      enteredByName,
    },
    select: {
      id: true,
      type: true,
      side: true,
      diaperStatus: true,
      weightKg: true,
      heightCm: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      comments: true,
      enteredByName: true,
      createdAt: true,
    },
  });

  res.status(201).json(log);
});

// DELETE /logs/:id
router.delete("/:id", authMiddleware, async (req, res: Response): Promise<void> => {
  const { accountId } = req as AuthRequest;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid log id" });
    return;
  }

  const log = await prisma.activityLog.findFirst({ where: { id, accountId } });
  if (!log) {
    res.status(404).json({ error: "Log not found or not yours" });
    return;
  }

  await prisma.activityLog.delete({ where: { id } });
  res.status(204).send();
});

export default router;
