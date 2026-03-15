import { Router } from "express";
import { Register, login } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Public routes
router.post("/register", Register);
router.post("/login", login);




export default router;

