import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../lib/prisma";
import { signToken } from "../lib/jwt";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/signup
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.account.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const account = await prisma.account.create({
    data: { name, email, password: hashed },
  });

  // Auto-create a default profile for the account owner
  await prisma.profile.create({
    data: { accountId: account.id, displayName: name },
  });

  const token = signToken({ accountId: account.id, email: account.email });
  res.status(201).json({
    token,
    account: { id: account.id, name: account.name, email: account.email },
  });
});

// POST /auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { email, password } = parsed.data;

  const account = await prisma.account.findUnique({ where: { email } });
  if (!account) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, account.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ accountId: account.id, email: account.email });
  res.json({
    token,
    account: { id: account.id, name: account.name, email: account.email },
  });
});

export default router;
