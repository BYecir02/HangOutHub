import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Ne bloque pas le démarrage complet de l'API si la base répond mal au cold start.
    // Prisma tentera aussi de se connecter au premier accès.
    void this.$connect()
      .then(() => {
        this.logger.log('Connexion a la base de donnees reussie !');
      })
      .catch((error: unknown) => {
        this.logger.error(
          "Echec de connexion Prisma au demarrage (l'API continue).",
          error instanceof Error ? error.stack : String(error),
        );
      });
  }
}
