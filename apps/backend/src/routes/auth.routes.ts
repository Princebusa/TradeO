import { Router } from "express";
import { Register, login } from "../controllers/auth.controller";


const router = Router();

// Public routes
router.post("/register", Register);
router.post("/login", login);




export default router;

