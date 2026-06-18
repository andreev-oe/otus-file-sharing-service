import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PermissionsGuard } from './common/guards/permissions.guard';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import s3Config from './config/s3.config';
import throttlerConfig from './config/throttler.config';
import { CacheModule } from './infrastructure/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FoldersModule } from './modules/folders/folders.module';
import { FilesModule } from './modules/files/files.module';
import { NotesModule } from './modules/notes/notes.module';
import { GroupsModule } from './modules/groups/groups.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ShareLinksModule } from './modules/share-links/share-links.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StorageModule } from './infrastructure/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, s3Config, throttlerConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (
        databaseConfiguration: ConfigType<typeof databaseConfig>,
        appConfiguration: ConfigType<typeof appConfig>,
      ): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: databaseConfiguration.host,
        port: databaseConfiguration.port,
        username: databaseConfiguration.username,
        password: databaseConfiguration.password,
        database: databaseConfiguration.database,
        autoLoadEntities: true,
        synchronize: appConfiguration.nodeEnv !== 'production',
      }),
      inject: [databaseConfig.KEY, appConfig.KEY],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (throttlerConfiguration: ConfigType<typeof throttlerConfig>) => ([{
        ttl: throttlerConfiguration.ttl,
        limit: throttlerConfiguration.limit,
      }]),
      inject: [throttlerConfig.KEY],
    }),
    CacheModule,
    AuthModule,
    UsersModule,
    FoldersModule,
    FilesModule,
    NotesModule,
    GroupsModule,
    PermissionsModule,
    ShareLinksModule,
    ReportsModule,
    StorageModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
