import type { CartItem, ProductFilters } from "./types";

/**
 * Ponto de entrada tipado reservado para a migração gradual do frontend.
 *
 * O arquivo script.js é a saída que o navegador usa hoje. Depois de instalar
 * as dependências, `npm run build` compila este arquivo para JavaScript em dist/.
 * A lógica existente pode ser movida para cá por etapas sem quebrar a página.
 */
export const backendIntegration = {
  /** Substituir por GET /api/produtos quando a API estiver disponível. */
  productsEndpoint: "/api/produtos",
  /** Substituir por GET /api/produtores quando a API estiver disponível. */
  producersEndpoint: "/api/produtores",
  /** Substituir por POST /api/pedidos no checkout real. */
  ordersEndpoint: "/api/pedidos",
} as const;

/**
 * Mantém o formato do estado que hoje fica no localStorage.
 * Depois, este estado pode ser sincronizado com a conta autenticada.
 */
export interface FrontendState {
  cart: CartItem[];
  favorites: number[];
  filters: ProductFilters;
}

export const defaultFilters: ProductFilters = {
  search: "",
  category: "",
  sort: "featured",
};
