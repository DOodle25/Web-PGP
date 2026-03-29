import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  createKey,
  deleteKey,
  getKey,
  listKeys,
  updateKey,
} from "../controllers/keysController.js";

const router = Router();

const createSchema = z.object({
  body: z.object({
    publicKey: z.string().min(1),
    encryptedPrivateKey: z.string().optional().nullable(),
    fingerprint: z.string().min(6),
    algorithm: z.string().min(1),
    expiresAt: z.string().datetime().optional().nullable(),
    trustLevel: z.string().optional(),
    label: z.string().optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    expiresAt: z.string().datetime().optional(),
    trustLevel: z.string().optional(),
    label: z.string().optional(),
  }),
});

router.use(requireAuth);
router.get("/", listKeys);
router.post("/", validate(createSchema), createKey);
router.get("/:id", getKey);
router.patch("/:id", validate(updateSchema), updateKey);
router.delete("/:id", deleteKey);

export default router;
