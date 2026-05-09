import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { order, getOrderbook, getWalletBalance, getMarkets, getOpenOrders, cancelOrder, editOrder, getPositions, getTradeHistory } from "../controllers/order.controller";

const router = Router();

// Place a new order
router.post("/", authMiddleware as any, order);

// Cancel an order
router.delete("/cancel", authMiddleware as any, cancelOrder);

// Edit an order
router.post("/edit", authMiddleware as any, editOrder);

// Get open orders for the authenticated user
router.get("/open", authMiddleware as any, getOpenOrders);

// Get positions for the authenticated user
router.get("/positions", authMiddleware as any, getPositions);

// Get trade history for the authenticated user
router.get("/history/trades", authMiddleware as any, getTradeHistory);

// Get available markets
router.get("/markets",authMiddleware, getMarkets);

// Get orderbook for a given ticker
router.get("/book/:ticker", getOrderbook);

// Get wallet balance for the authenticated user
router.get("/balance", authMiddleware, getWalletBalance);

export default router;