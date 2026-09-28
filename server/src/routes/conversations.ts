import { Router } from "express";
import {
  createConversation,
  listConversations,
  listMessages,
  sendMessage,
} from "../controllers/conversationController.js";
import { requireAuth } from "../middlewares/auth.js";

export const conversationRouter = Router();

conversationRouter.get("/conversas", requireAuth, listConversations);
conversationRouter.post("/conversas", requireAuth, createConversation);
conversationRouter.get("/conversas/:id/mensagens", requireAuth, listMessages);
conversationRouter.post("/conversas/:id/mensagens", requireAuth, sendMessage);
