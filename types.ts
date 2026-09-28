/**
 * Contratos do domínio do AgriFam.
 * As respostas da API devem seguir estes formatos quando o backend existir.
 */
export interface Category {
  name: string;
  icon: string;
  count: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
  producer: string;
  location: string;
  category: string;
  rating: number;
  image: string;
}

export interface Producer {
  id: number;
  name: string;
  property: string;
  location: string;
  specialty: string;
  rating: number;
  history: string;
  image: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export type SortOption = "featured" | "price-low" | "rating";

export interface ProductFilters {
  search: string;
  category: string;
  sort: SortOption;
}

/**
 * Contratos de POST/GET /api/pedidos (ver README.md). `price` não existe no payload
 * de criação — o backend sempre recalcula pelo preço atual do produto no banco.
 */
export interface CreateOrderItemInput {
  productId: number;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
}

export interface OrderItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  status: "confirmado";
  total: number;
  createdAt: string;
  items: OrderItem[];
}

/** Contratos de GET/POST /api/conversas (ver README.md). */
export interface Message {
  id: number;
  senderId: number;
  text: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: number;
  buyer: { id: number; name: string };
  producer: { id: number; property: string; name: string };
  lastMessage: { text: string; senderId: number; createdAt: string } | null;
  createdAt: string;
}

export interface CreateConversationInput {
  producerId: number;
}

export interface SendMessageInput {
  text: string;
}
