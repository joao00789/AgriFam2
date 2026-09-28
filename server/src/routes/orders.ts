import { Router } from "express";
import {
  createOrder,
  getOrder,
  listMyOrders,
  listProducerOrders,
} from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const orderRouter = Router();

// Qualquer usuário autenticado pode comprar (comprador ou produtor comprando de outro).
orderRouter.post("/pedidos", requireAuth, createOrder);
orderRouter.get("/pedidos", requireAuth, listMyOrders);
orderRouter.get("/pedidos/:id", requireAuth, getOrder);

orderRouter.get("/produtor/pedidos", requireAuth, requireRole("producer"), listProducerOrders);
