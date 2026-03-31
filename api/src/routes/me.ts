import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

// GET /me
router.get("/", authMiddleware, async (req, res: Response): Promise<void> => {
  const { accountId } = req as AuthRequest;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const babies = await prisma.baby.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, dob: true, gender: true, createdAt: true },
  });

  const profiles = await prisma.profile.findMany({
    where: { accountId },
    orderBy: { createdAt: "asc" },
    select: { id: true, displayName: true },
  });

  res.json({ account, babies, profiles });
});

export default router;
