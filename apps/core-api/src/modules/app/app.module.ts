import { winstonConfig } from "@apps/core-api/config/winston.config";
import { AppController } from "@apps/core-api/modules/app/app.controller";
import { AppService } from "@apps/core-api/modules/app/app.service";
import { UserModule } from "@apps/core-api/modules/user/user.module";
import { LocationModule } from "@apps/core-api/modules/location/location.module";
import { AuthModule } from "@apps/core-api/modules/auth/auth.module";
import { InstrumentModule } from "@apps/core-api/modules/instrument/instrument.module";
import { GenreModule } from "@apps/core-api/modules/genre/genre.module";
import { MusicianModule } from "@apps/core-api/modules/musician/musician.module";
import { BandModule } from "@apps/core-api/modules/band/band.module";
import DatabaseConfig from "@soundcircle/shared/config/database.config";
import { RequestContextMiddleware } from "@soundcircle/shared/middleware/request-context.middleware";
import { UniqueValidatorRule } from "@soundcircle/shared/utils/validators/is-unique.validator";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WinstonModule } from "nest-winston";

/** The ONLY place globals are wired. Import order: TypeOrmModule → WinstonModule → the app's domain modules. */
@Module({
  imports: [
    TypeOrmModule.forRoot(DatabaseConfig),
    WinstonModule.forRoot(winstonConfig),
    LocationModule,
    UserModule,
    AuthModule,
    InstrumentModule,
    GenreModule,
    MusicianModule,
    BandModule,
  ],
  controllers: [AppController],
  providers: [AppService, UniqueValidatorRule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("{*path}");
  }
}
