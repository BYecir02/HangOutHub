import { PrismaClient } from '@prisma/client';

/**
 * Marque les comptes de DÉMO (@hangouthub.dev) comme "email vérifié" afin
 * qu'ils n'aient PAS à passer par l'écran OTP au login.
 *
 * Lancer :  npm run seed:verify-demo   (dans /backend)
 *
 * - Ne touche QUE les comptes @hangouthub.dev (démo).
 * - N'affaiblit PAS le flux OTP : les vrais utilisateurs restent soumis à la
 *   vérification email (emailVerifiedAt null -> écran OTP).
 * - Idempotent.
 */

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const result = await prisma.user.updateMany({
    where: {
      email: { endsWith: '@hangouthub.dev' },
      emailVerifiedAt: null,
    },
    data: {
      emailVerifiedAt: now,
      isVerified: true,
    },
  });

  console.log(
    `✅ ${result.count} compte(s) démo marqué(s) comme email-vérifié(s) — plus d'OTP au login.`,
  );
}

main()
  .catch((err) => {
    console.error('❌ Vérification des comptes démo : échec', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
