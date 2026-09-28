import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT) || 3333;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith("troque-este-valor")) {
  throw new Error("JWT_SECRET ausente ou fraco. Configure em server/.env um segredo aleatório com pelo menos 32 caracteres.");
}
const app = createApp();

app.listen(port, () => {
  console.log(`AgriFam API rodando em http://localhost:${port}`);
});
