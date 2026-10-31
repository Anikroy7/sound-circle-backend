import { DocumentBuilder } from "@nestjs/swagger";

/** Swagger stays at `/api`, unversioned — only the routes carry `api/v1`. */
const swaggerConfig = new DocumentBuilder()
  .setTitle("SOUNDCIRCLE CORE API")
  .setDescription("Musicians, bands and the accounts behind them")
  .setVersion("1.0")
  .addTag("APP")
  .addTag("IDN", "Users")
  .build();

export default swaggerConfig;
