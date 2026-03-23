import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  listSecurityEvents,
  listUsers,
} from "../controllers/adminController.js";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/users", listUsers);
router.get("/security-events", listSecurityEvents);

export default router;
