import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { useContainer } from "class-validator";
import { SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { AppModule } from "@apps/core-api/modules/app/app.module";
import swaggerConfig from "@apps/core-api/config/swagger.config";
import { ResponseInterceptor } from "@soundcircle/shared/utils/interceptors/response.interceptor";
import { ReqBodyTransformInterceptor } from "@soundcircle/shared/utils/interceptors/req-body-transform.interceptor";
import { CustomExceptionFilter } from "@soundcircle/shared/utils/exception/custom-exception.filter";
import { validationErrorHandling } from "@soundcircle/shared/utils/util/utils";
import { corsOrigins } from "@soundcircle/shared/utils/util/cors";
import { ENV } from "@soundcircle/shared/utils/util/constant";
/**
 * Side-effect import — installs the `.sortOrder()` query-builder extension.
 * OMIT THIS AND EVERY LIST ROUTE'S `sort_order_by[]` THROWS THE FIRST TIME IT IS USED.
 */
import "@soundcircle/shared/utils/util/sort-order.query-builder";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // A proxy or load balancer fronts the app, so the real client IP is in the forwarded chain —
  // without this every *_ip column records the proxy's address.
  (app.getHttpAdapter().getInstance() as any).set("trust proxy", true);
  (app.getHttpAdapter().getInstance() as any).set("query parser", "extended");

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );

  // Allow-list, never "*".
  app.enableCors({ origin: corsOrigins(), credentials: true });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useGlobalInterceptors(new ReqBodyTransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      exceptionFactory: validationErrorHandling,
    }),
  );

  // The version lives here, where no controller can forget it.
  app.setGlobalPrefix("api/v1");

  app.useGlobalFilters(new CustomExceptionFilter(app.get(WINSTON_MODULE_NEST_PROVIDER)));

  const reflector: Reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // Lets class-validator resolve custom validators from the Nest container.
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document, {
    customSiteTitle: "SOUNDCIRCLE CORE API",
  });

  await app.listen(ENV.CORE_API_PORT);
}

bootstrap().then(() => console.log("running core-api on port : " + ENV.CORE_API_PORT));
