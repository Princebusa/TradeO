import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { order, getOrderbook, getWalletBalance } from "../controllers/order.controller";

const router = Router();

// Place a new order
router.post("/", authMiddleware as any, order);

// Get orderbook for a given ticker
router.get("/book/:ticker", getOrderbook);

// Get wallet balance for the authenticated user
router.get("/balance", authMiddleware as any, getWalletBalance);

export default router;