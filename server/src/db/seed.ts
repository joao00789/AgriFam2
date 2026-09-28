/**
 * Semeia o banco com os mesmos dados hoje mockados em `script.js` (categorias,
 * produtos, produtores), para o catálogo ter conteúdo real desde já.
 *
 * O mock original em script.js só tem card de produtor para 4 dos 8 produtos
 * (Horta da D. Maria, Apiário Santa Luz, Sítio Boa Esperança, Mãos do Campo). Como
 * `products.producerId` agora é obrigatório, os outros 4 produtores abaixo (Fazenda
 * Nascente, Sítio Sabor da Terra, Sabores da Vó, Cooperativa Raízes) são perfis de
 * demonstração criados só para fechar essa referência — não existiam no mock
 * original e estão marcados como tal no campo `history`.
 *
 * Só semeia se o banco ainda não tiver nenhuma categoria (evita duplicar em reruns).
 * Não deve ser rodado contra o banco de produção com dados reais.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "./client.js";
import { categories, producers, products, users } from "./schema.js";

const SEED_PASSWORD = "SeedAgrifam2026!";

const seedCategories = [
  { name: "Frutas", icon: "apple" },
  { name: "Verduras", icon: "leaf" },
  { name: "Legumes", icon: "carrot" },
  { name: "Grãos", icon: "wheat" },
  { name: "Mel", icon: "hexagon" },
  { name: "Queijos", icon: "cheese" },
  { name: "Doces", icon: "candy" },
  { name: "Artesanato", icon: "palette" },
  { name: "Regionais", icon: "map-pin" },
];

const seedProducers = [
  {
    email: "seed-maria@agrifam.local",
    name: "Maria das Dores",
    property: "Horta da D. Maria",
    location: "Teresina - PI",
    specialty: "Verduras e temperos",
    rating: 4.9,
    history:
      "Há mais de 20 anos, Maria cultiva alimentos sem pressa e com respeito à terra. Sua horta abastece famílias de toda a região.",
    image:
      "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=800&q=80",
  },
  {
    email: "seed-joaoana@agrifam.local",
    name: "João e Ana Luz",
    property: "Apiário Santa Luz",
    location: "União - PI",
    specialty: "Mel e derivados",
    rating: 5.0,
    history:
      "O casal encontrou nas abelhas uma forma doce de cuidar da natureza e gerar renda para a família.",
    image:
      "https://images.unsplash.com/photo-1473973266408-ed4e27abdd47?auto=format&fit=crop&w=800&q=80",
  },
  {
    email: "seed-raimundo@agrifam.local",
    name: "Seu Raimundo",
    property: "Sítio Boa Esperança",
    location: "Teresina - PI",
    specialty: "Frutas e legumes",
    rating: 4.8,
    history:
      "Raimundo conhece cada canto do seu sítio e compartilha uma produção farta, saudável e cheia de sabor.",
    image:
      "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80",
  },
  {
    email: "seed-coletivo@agrifam.local",
    name: "Coletivo Raízes",
    property: "Mãos do Campo",
    location: "Timon - MA",
    specialty: "Artesanato regional",
    rating: 4.9,
    history:
      "Um coletivo de famílias que mantém vivos os trançados, as cores e as histórias da nossa cultura.",
    image:
      "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    email: "seed-nascente@agrifam.local",
    name: "Família Nascente",
    property: "Fazenda Nascente",
    location: "Altos - PI",
    specialty: "Queijos artesanais",
    rating: 4.8,
    history:
      "Perfil de demonstração (não existia no mock original do frontend): a Fazenda Nascente produz queijos artesanais. A ser completado por um produtor real.",
    image: "",
  },
  {
    email: "seed-saborterra@agrifam.local",
    name: "Sítio Sabor da Terra",
    property: "Sítio Sabor da Terra",
    location: "José de Freitas - PI",
    specialty: "Frutas regionais",
    rating: 4.7,
    history:
      "Perfil de demonstração (não existia no mock original do frontend): produtor de frutas regionais. A ser completado por um produtor real.",
    image: "",
  },
  {
    email: "seed-vo@agrifam.local",
    name: "Dona Francisca",
    property: "Sabores da Vó",
    location: "Teresina - PI",
    specialty: "Doces artesanais",
    rating: 4.9,
    history:
      "Perfil de demonstração (não existia no mock original do frontend): doces artesanais de receita de família. A ser completado por um produtor real.",
    image: "",
  },
  {
    email: "seed-cooperativa@agrifam.local",
    name: "Cooperativa Raízes",
    property: "Cooperativa Raízes",
    location: "Campo Maior - PI",
    specialty: "Grãos",
    rating: 4.8,
    history:
      "Perfil de demonstração (não existia no mock original do frontend): cooperativa produtora de grãos. A ser completado por um produtor real.",
    image: "",
  },
];

const seedProducts = [
  {
    name: "Tomate Orgânico",
    price: 8.9,
    unit: "kg",
    producerProperty: "Sítio Boa Esperança",
    location: "Teresina - PI",
    category: "Verduras",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Mel Silvestre",
    price: 32.0,
    unit: "500g",
    producerProperty: "Apiário Santa Luz",
    location: "União - PI",
    category: "Mel",
    rating: 5.0,
    image:
      "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Queijo Artesanal",
    price: 28.5,
    unit: "500g",
    producerProperty: "Fazenda Nascente",
    location: "Altos - PI",
    category: "Queijos",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Cesta de Verduras",
    price: 39.9,
    unit: "unidade",
    producerProperty: "Horta da D. Maria",
    location: "Teresina - PI",
    category: "Verduras",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Manga Rosa",
    price: 7.5,
    unit: "kg",
    producerProperty: "Sítio Sabor da Terra",
    location: "José de Freitas - PI",
    category: "Frutas",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Doce de Caju",
    price: 18.0,
    unit: "pote 300g",
    producerProperty: "Sabores da Vó",
    location: "Teresina - PI",
    category: "Doces",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Arroz Vermelho",
    price: 14.9,
    unit: "kg",
    producerProperty: "Cooperativa Raízes",
    location: "Campo Maior - PI",
    category: "Grãos",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=700&q=80",
  },
  {
    name: "Cesto de Palha",
    price: 45.0,
    unit: "unidade",
    producerProperty: "Mãos do Campo",
    location: "Timon - MA",
    category: "Artesanato",
    rating: 5.0,
    image:
      "https://images.unsplash.com/photo-1595521624992-48a59aef95d3?auto=format&fit=crop&w=700&q=80",
  },
];

async function main() {
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) {
    console.log("Banco já tem categorias — seed ignorado (rode só em banco vazio).");
    return;
  }

  const categoryRows = await db.insert(categories).values(seedCategories).returning();
  const categoryByName = new Map(categoryRows.map((row) => [row.name, row]));

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const producerByProperty = new Map<string, { id: number }>();

  for (const seed of seedProducers) {
    const [user] = await db
      .insert(users)
      .values({ name: seed.name, email: seed.email, passwordHash, role: "producer" })
      .returning();
    const [producer] = await db
      .insert(producers)
      .values({
        userId: user.id,
        property: seed.property,
        location: seed.location,
        specialty: seed.specialty,
        rating: seed.rating,
        history: seed.history,
        image: seed.image,
      })
      .returning();
    producerByProperty.set(seed.property, producer);
  }

  for (const seed of seedProducts) {
    const producer = producerByProperty.get(seed.producerProperty);
    const category = categoryByName.get(seed.category);
    if (!producer || !category) {
      throw new Error(
        `Seed inconsistente: produtor "${seed.producerProperty}" ou categoria "${seed.category}" não encontrados.`,
      );
    }
    await db.insert(products).values({
      producerId: producer.id,
      categoryId: category.id,
      name: seed.name,
      price: seed.price,
      unit: seed.unit,
      location: seed.location,
      rating: seed.rating,
      image: seed.image,
    });
  }

  console.log(
    `Seed concluído: ${categoryRows.length} categorias, ${seedProducers.length} produtores, ${seedProducts.length} produtos.`,
  );
  console.log(
    `Login de qualquer conta de produtor semeada usa a senha "${SEED_PASSWORD}" — só para uso local/demo, nunca em produção.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
