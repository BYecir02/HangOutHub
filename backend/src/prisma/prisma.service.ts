import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  private async ensurePlaceClaimWorkflowCompatibility() {
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

  async onModuleInit() {
    // Ne bloque pas le démarrage complet de l'API si la base répond mal au cold start.
    // Prisma tentera aussi de se connecter au premier accès.
    void this.$connect()
      .then(() => {
        this.logger.log('Connexion a la base de donnees reussie !');
        void this.ensurePlaceClaimWorkflowCompatibility();
      })
      .catch((error: unknown) => {
        this.logger.error(
          "Echec de connexion Prisma au demarrage (l'API continue).",
          error instanceof Error ? error.stack : String(error),
        );
      });
  }
}
