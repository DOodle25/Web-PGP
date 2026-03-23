import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { addAudit, getHistory } from "../controllers/cryptoController.js";

const router = Router();

const auditSchema = z.object({
  body: z.object({
    action: z.string().min(3),
    metadata: z.record(z.any()).optional(),
  }),
});

router.use(requireAuth);
router.post("/audit", validate(auditSchema), addAudit);
router.get("/history", getHistory);

export default router;
