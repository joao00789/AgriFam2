import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProducer,
  getProduct,
  listCategories,
  listMyProducts,
  listProducers,
  listProducts,
  updateProduct,
} from "../controllers/catalogController.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

export const catalogRouter = Router();

// Precisa vir antes de "/produtos/:id" só por organização — "/produtor/produtos" não
// colide com esse padrão de rota, mas mantém as rotas "/produtor/*" agrupadas.
catalogRouter.get("/produtor/produtos", requireAuth, requireRole("producer"), listMyProducts);

catalogRouter.get("/produtos", listProducts);
catalogRouter.get("/produtos/:id", getProduct);
catalogRouter.post("/produtos", requireAuth, requireRole("producer"), createProduct);
catalogRouter.patch("/produtos/:id", requireAuth, requireRole("producer"), updateProduct);
catalogRouter.delete("/produtos/:id", requireAuth, requireRole("producer"), deleteProduct);

catalogRouter.get("/produtores", listProducers);
catalogRouter.get("/produtores/:id", getProducer);

catalogRouter.get("/categorias", listCategories);
