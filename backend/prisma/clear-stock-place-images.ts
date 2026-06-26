import { PrismaClient } from '@prisma/client';

/**
 * Retire les images "stock" (Unsplash) des LIEUX, pour qu'ils affichent le
 * placeholder brandé (logo) au lieu d'une photo générique trompeuse.
 *
 * Lancer :  npm run seed:clear-place-images   (dans /backend)
 *
 * - coverUrl Unsplash  -> null
 * - images Unsplash    -> retirées du tableau
 * - Les vraies photos uploadées (stockage Supabase) ne sont PAS touchées.
 * - Idempotent : un 2e passage ne trouve plus rien à nettoyer.
 */

const prisma = new PrismaClient();

const STOCK_MARKER = 'unsplash';

async function main() {
  const places = await prisma.place.findMany({
    select: { id: true, name: true, coverUrl: true, images: true },
  });

  let cleared = 0;

  for (const place of places) {
    const coverIsStock = Boolean(place.coverUrl?.includes(STOCK_MARKER));
    const currentImages = place.images ?? [];
    const nextImages = currentImages.filter((url) => !url.includes(STOCK_MARKER));
    const imagesChanged = nextImages.length !== currentImages.length;

    if (!coverIsStock && !imagesChanged) {
      continue;
    }

    await prisma.place.update({
      where: { id: place.id },
      data: {
        ...(coverIsStock ? { coverUrl: null } : {}),
        ...(imagesChanged ? { images: nextImages } : {}),
      },
    });

    cleared += 1;
  }

  console.log(
    `✅ ${cleared} lieu(x) nettoyé(s) — covers/images stock retirées (placeholder brandé désormais affiché).`,
  );
}

main()
  .catch((err) => {
    console.error('❌ Nettoyage des images de lieux : échec', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
