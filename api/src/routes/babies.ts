import { Router, Response } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

const createBabySchema = z.object({
  name: z.string().min(1),
  gender: z.enum(["girl", "boy"]),
  dob: z.string().optional().nullable(),
});

// POST /babies
router.post("/", authMiddleware, async (req, res: Response): Promise<void> => {
  const { accountId } = req as AuthRequest;

  const parsed = createBabySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, gender, dob } = parsed.data;

  const baby = await prisma.baby.create({
    data: {
      accountId,
      name,
      gender,
      dob: dob ? new Date(dob) : null,
    },
    select: { id: true, name: true, dob: true, gender: true, createdAt: true },
  });

  res.status(201).json(baby);
});

// GET /babies
router.get("/", authMiddleware, async (req, res: Response): Promise<void> => {
  const { accountId } = req as AuthRequest;

  const babies = await prisma.baby.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, dob: true, gender: true, createdAt: true },
  });

  res.json(babies);
});

export default router;
