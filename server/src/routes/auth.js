import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import {
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const credentialsSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

router.post("/register", validate(credentialsSchema), register);
router.post("/login", validate(credentialsSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/logout-all", requireAuth, logoutAll);

export default router;
