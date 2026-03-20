import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { order, getOrderbook, getWalletBalance, getMarkets } from "../controllers/order.controller";

const router = Router();

// Place a new order
router.post("/", authMiddleware as any, order);

// Get available markets
router.get("/markets",authMiddleware, getMarkets);

// Get orderbook for a given ticker
router.get("/book/:ticker", getOrderbook);

// Get wallet balance for the authenticated user
router.get("/balance", authMiddleware, getWalletBalance);

export default router;