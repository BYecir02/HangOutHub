import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  public async ensurePlaceClaimWorkflowCompatibility() {
    try {
      await this.$executeRawUnsafe(`
        ALTER TABLE "PlaceClaim"
          ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(6);
      `);
    } catch (error) {
      this.logger.warn(
        'Unable to ensure PlaceClaim workflow compatibility at startup.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  public async ensureUserFlowEventCompatibility() {
    try {
      await this.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UserFlowEvent" (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          "distinctId" VARCHAR(80) NOT NULL,
          "sessionId" VARCHAR(80) NOT NULL,
          "userId" UUID NULL,
          "eventName" VARCHAR(64) NOT NULL,
          "actionName" VARCHAR(120) NULL,
          "screenKey" VARCHAR(180) NULL,
          "screenName" VARCHAR(120) NULL,
          "path" VARCHAR(255) NULL,
          "previousScreenKey" VARCHAR(180) NULL,
          "previousPath" VARCHAR(255) NULL,
          "entityType" VARCHAR(64) NULL,
          "entityId" VARCHAR(64) NULL,
          "platform" VARCHAR(20) NULL,
          "appVersion" VARCHAR(20) NULL,
          "buildChannel" VARCHAR(30) NULL,
          "locale" VARCHAR(16) NULL,
          "metadata" JSONB NULL,
          "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "UserFlowEvent_createdAt_idx" ON "UserFlowEvent" ("createdAt");`,
      );
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "UserFlowEvent_screenKey_createdAt_idx" ON "UserFlowEvent" ("screenKey", "createdAt");`,
      );
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "UserFlowEvent_eventName_createdAt_idx" ON "UserFlowEvent" ("eventName", "createdAt");`,
      );
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "UserFlowEvent_sessionId_createdAt_idx" ON "UserFlowEvent" ("sessionId", "createdAt");`,
      );
      await this.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "UserFlowEvent_userId_createdAt_idx" ON "UserFlowEvent" ("userId", "createdAt");`,
      );
    } catch (error) {
      this.logger.warn(
        'Unable to ensure UserFlowEvent compatibility at startup.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connexion a la base de donnees reussie !');
      await this.ensurePlaceClaimWorkflowCompatibility();
      await this.ensureUserFlowEventCompatibility();
    } catch (error: unknown) {
      this.logger.error(
        "Echec de connexion Prisma au demarrage (l'API continue).",
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
