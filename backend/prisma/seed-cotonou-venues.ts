import { PrismaClient } from '@prisma/client';

/**
 * Seed autonome et idempotent : nouveaux RESTAURANTS / BARS de Cotonou
 * (ouvertures récentes 2025). Lieux NON revendiqués (ownerId = null).
 *
 * Lancer :  npm run seed:cotonou-venues   (dans /backend)
 *
 * IMPORTANT : la page de catégorie (CategoryScreen -> /categories/:id/discover)
 * filtre les lieux par TAG de la catégorie (PlaceTag -> Tag.categoryId).
 * On attache donc à chaque lieu au moins un tag de sa catégorie, sinon il
 * n'apparaît pas dans la page Restaurant / Bar & Lounge.
 *
 * - Rejoue sans doublon : lieux existants ignorés (même nom + ville), mais les
 *   tags sont (re)rattachés à chaque exécution (skipDuplicates).
 * - Coordonnées approximatives par quartier (à affiner si besoin).
 */

const prisma = new PrismaClient();
const CITY_SLUG = 'cotonou';

type PlaceCategory = 'Restaurant' | 'Bar & Lounge';

interface SeedPlace {
  name: string;
  category: PlaceCategory;
  /** Tags (doivent appartenir à la catégorie du lieu). */
  tags: string[];
  description: string;
  address: string;
  openingHours?: string;
  priceLevel: number;
  lat: number;
  lng: number;
}

const PLACES: SeedPlace[] = [
  {
    name: "L'Opéra Restaurant Lounge",
    category: 'Restaurant',
    tags: ['Gastronomique'],
    description:
      "Restaurant-lounge tendance qui fait parler d'Akpakpa, mentionné parmi les spots les plus chics de Cotonou.",
    address: 'Akpakpa, Cotonou',
    priceLevel: 3,
    lat: 6.3545,
    lng: 2.4305,
  },
  {
    name: 'Le Skyline Restaurant',
    category: 'Restaurant',
    tags: ['Gastronomique'],
    description:
      "Standing magnifique, service chaleureux et très bonne cuisine. Budget à partir de 8 000 FCFA par personne.",
    address:
      '100m avant le feu de Missèbô (en venant de Zongo), à côté de la nouvelle station, Cotonou',
    priceLevel: 2,
    lat: 6.366,
    lng: 2.425,
  },
  {
    name: 'Le Chablis',
    category: 'Restaurant',
    tags: ['Gastronomique'],
    description:
      "Restaurant français classique au décor cosy et élégant : menus de saison, plats faits maison de l'entrée au dessert. Ouvert début 2025.",
    address: 'Cadjèhoun, non loin du collège Père Aupiais, Cotonou',
    openingHours: 'Lun–Jeu & week-ends : 12h–15h et 18h–22h',
    priceLevel: 3,
    lat: 6.3672,
    lng: 2.3885,
  },
  {
    name: "O'Grill d'Albert",
    category: 'Restaurant',
    tags: ['Gastronomique'],
    description:
      "Ambiance chill et bonne restauration, mentionné parmi les restaurants les plus chics de Cotonou.",
    address: 'Haie Vive, Cotonou',
    priceLevel: 3,
    lat: 6.3585,
    lng: 2.3975,
  },
  {
    name: 'Vodoun Bar',
    category: 'Bar & Lounge',
    tags: ['Cocktails'],
    description:
      "Lieu atypique où culture, tradition et modernité se mêlent (tableaux et figurines des religions endogènes). Spécialité : des cocktails qui font l'unanimité. Ouvert début 2025.",
    address: "Cadjèhoun, en face de Coris Bank, près de l'ancienne Mosquée, Cotonou",
    openingHours: 'Mar–Dim : à partir de 20h',
    priceLevel: 2,
    lat: 6.3665,
    lng: 2.387,
  },
  {
    name: "L'Ovale by Code Bar",
    category: 'Bar & Lounge',
    tags: ['Afterwork', 'Cocktails'],
    description:
      "Complexe cosy aux espaces modulables : ateliers, séminaires, afterwork et rencontres professionnelles, en plein cœur de Cotonou. Ouvert début 2025.",
    address: "Patte d'Oie, non loin de l'aéroport, Cotonou",
    priceLevel: 3,
    lat: 6.3612,
    lng: 2.3845,
  },
  {
    name: 'Cave Fantasy',
    category: 'Bar & Lounge',
    tags: ['Cocktails'],
    description:
      'Espace avec restauration, bar à cocktails et piscine.',
    address: "Gbetagbo, Rue AlodoAlomin, à 300m de l'église catholique St Rita, Cotonou",
    priceLevel: 2,
    lat: 6.3742,
    lng: 2.4105,
  },
];

async function main() {
  const city = await prisma.city.findFirst({ where: { slug: CITY_SLUG } });
  if (!city) {
    throw new Error(`Ville "${CITY_SLUG}" introuvable. Lance d'abord le seed principal.`);
  }

  // Catégories + tags (pour résoudre name -> tagId dans la bonne catégorie).
  const categoryNames = [...new Set(PLACES.map((p) => p.category))];
  const categories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
    select: { id: true, name: true },
  });
  const catIdByName = new Map(categories.map((c) => [c.name, c.id]));

  const tags = await prisma.tag.findMany({
    select: { id: true, name: true, categoryId: true },
  });
  // clé "categoryId::tagName" -> tagId
  const tagId = (categoryName: PlaceCategory, tagName: string): number | undefined => {
    const catId = catIdByName.get(categoryName);
    return tags.find((t) => t.categoryId === catId && t.name === tagName)?.id;
  };

  let created = 0;
  const skipped: string[] = [];
  const missingTags: string[] = [];
  let tagLinks = 0;

  for (const pl of PLACES) {
    let row = await prisma.place.findFirst({
      where: { name: pl.name, cityId: city.id },
      select: { id: true },
    });

    if (!row) {
      row = await prisma.place.create({
        data: {
          cityId: city.id,
          ownerId: null,
          name: pl.name,
          category: pl.category,
          description: pl.description,
          address: pl.address,
          openingHours: pl.openingHours ?? null,
          priceLevel: pl.priceLevel,
          latitude: pl.lat,
          longitude: pl.lng,
          moderationStatus: 'PENDING',
        },
        select: { id: true },
      });
      created += 1;
    } else {
      skipped.push(pl.name);
    }

    // Rattachement des tags (idempotent).
    const ids = pl.tags
      .map((name) => {
        const id = tagId(pl.category, name);
        if (id === undefined) missingTags.push(`${pl.name} -> ${name}`);
        return id;
      })
      .filter((id): id is number => typeof id === 'number');

    if (ids.length > 0) {
      const res = await prisma.placeTag.createMany({
        data: ids.map((id) => ({ placeId: row!.id, tagId: id })),
        skipDuplicates: true,
      });
      tagLinks += res.count;
    }
  }

  console.log(`✅ ${created} lieu(x) créé(s), ${tagLinks} tag(s) rattaché(s).`);
  if (skipped.length > 0) {
    console.log(`⏭️  Déjà présents : ${skipped.join(', ')}`);
  }
  if (missingTags.length > 0) {
    console.log(`⚠️  Tags introuvables : ${missingTags.join(', ')}`);
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed lieux Cotonou : échec', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
