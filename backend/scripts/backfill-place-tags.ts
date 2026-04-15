import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

type PlaceTagRule = {
  tag: string;
  match: (name: string) => boolean;
};

const prisma = new PrismaClient();

const PLACE_TAG_RULES: PlaceTagRule[] = [
  { tag: 'Palais', match: (name) => name.includes('palais') },
  { tag: 'Fort', match: (name) => name.includes('fort ') || name.startsWith('fort') },
  {
    tag: 'Monument',
    match: (name) =>
      name.includes('monument') ||
      name.includes('porte du non-retour') ||
      name.includes('memorial') ||
      name.includes('phare'),
  },
  {
    tag: 'Site historique',
    match: (name) =>
      name.includes('historique') ||
      name.includes('gare') ||
      name.includes('place ') ||
      name.includes('place chacha') ||
      name.includes('place jean bayol') ||
      name.includes('bibliotheque') ||
      name.includes('route des esclaves') ||
      name.includes('ancien palais') ||
      name.includes('port autonome'),
  },
  {
    tag: 'Architecture',
    match: (name) =>
      name.includes('maison bresilienne') ||
      name.includes('quartier bresilien') ||
      name.includes('assemblee nationale'),
  },
  { tag: 'Temple', match: (name) => name.includes('temple') || name.includes('couvent') },
  { tag: 'Vaudou', match: (name) => name.includes('vaudou') },
  { tag: 'Mosquee', match: (name) => name.includes('mosquee') },
  { tag: 'Cathedrale', match: (name) => name.includes('cathedrale') },
  { tag: 'Sanctuaire', match: (name) => name.includes('sanctuaire') },
  { tag: 'Cascade', match: (name) => name.includes('cascade') },
  { tag: 'Foret', match: (name) => name.includes('foret') },
  { tag: 'Grotte', match: (name) => name.includes('grotte') },
  { tag: 'Collines', match: (name) => name.includes('collines') || name.includes('pic de') },
  { tag: 'Rochers', match: (name) => name.includes('rochers') },
  { tag: 'Mangroves', match: (name) => name.includes('mangroves') },
  { tag: 'Dunes', match: (name) => name.includes('dunes') },
  { tag: 'Lagune', match: (name) => name.includes('lagune') || name.includes('bouche du roy') },
  {
    tag: 'Lac',
    match: (name) => name.includes('lac ') || name.startsWith('lac') || name.includes('lacustre'),
  },
  { tag: 'Riviere', match: (name) => name.includes('riviere') || name.includes('fleuve') },
  { tag: 'Source thermale', match: (name) => name.includes('source thermale') },
  { tag: 'Jardin', match: (name) => name.includes('jardin') },
  { tag: 'Parc national', match: (name) => name.includes('parc national') },
  { tag: 'Reserve', match: (name) => name.includes('reserve') },
  { tag: 'Faune', match: (name) => name.includes('faune') || name.includes('cynegetique') },
  { tag: 'Marche', match: (name) => name.includes('marche') },
  { tag: 'Artisanat', match: (name) => name.includes('artisanat') || name.includes('songhai') },
  { tag: 'Poterie', match: (name) => name.includes('poterie') },
  { tag: 'Village', match: (name) => name.includes('village') },
  {
    tag: 'Tata Somba',
    match: (name) =>
      name.includes('tata somba') ||
      name.includes('koussoukoingou') ||
      name.includes('nadoba') ||
      name.includes('tabota'),
  },
  {
    tag: 'Lacustre',
    match: (name) =>
      name.includes('lacustre') ||
      name.includes('ganvie') ||
      name.includes('so-ava') ||
      name.includes("ile d'aguegues"),
  },
  { tag: 'Plage', match: (name) => name.includes('plage') },
  { tag: 'Musee', match: (name) => name.includes('musee') || name.includes('fondation') },
  { tag: 'Expo', match: (name) => name.includes('institut francais') },
  { tag: 'Stade', match: (name) => name.includes('stade') },
];

function normalizeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function getApprovedTagsByNames(names: string[]) {
  const tags = await prisma.tag.findMany({
    where: {
      name: { in: names },
      status: 'APPROVED',
    },
    select: { id: true, name: true },
  });

  return new Map(tags.map((tag) => [tag.name, tag.id]));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const places = await prisma.place.findMany({
    select: {
      id: true,
      name: true,
      PlaceTag: {
        select: {
          tagId: true,
        },
      },
    },
  });

  const tagIdsByName = await getApprovedTagsByNames(
    PLACE_TAG_RULES.map((rule) => rule.tag),
  );

  const linksToCreate: Array<{ placeId: string; tagId: number }> = [];
  const touchedPlaces: Array<{ placeId: string; placeName: string; tagNames: string[] }> = [];

  for (const place of places) {
    const normalizedName = normalizeName(place.name);
    const existingTagIds = new Set(place.PlaceTag.map((entry) => entry.tagId));
    const nextTagNames: string[] = [];

    for (const rule of PLACE_TAG_RULES) {
      if (!rule.match(normalizedName)) {
        continue;
      }

      const tagId = tagIdsByName.get(rule.tag);
      if (!tagId) {
        continue;
      }

      nextTagNames.push(rule.tag);

      if (!existingTagIds.has(tagId)) {
        linksToCreate.push({ placeId: place.id, tagId });
      }
    }

    if (nextTagNames.length > 0) {
      touchedPlaces.push({
        placeId: place.id,
        placeName: place.name,
        tagNames: Array.from(new Set(nextTagNames)),
      });
    }
  }

  console.log(`Places analysés: ${places.length}`);
  console.log(`Lieux reconnus par règles: ${touchedPlaces.length}`);
  console.log(`Nouveaux liens à créer: ${linksToCreate.length}`);

  if (dryRun) {
    console.log('Mode dry-run: aucune écriture effectuée.');

    if (touchedPlaces.length > 0) {
      console.log('Exemples:');
      for (const item of touchedPlaces.slice(0, 10)) {
        console.log(`- ${item.placeName} -> ${item.tagNames.join(', ')}`);
      }
    }

    return;
  }

  if (linksToCreate.length > 0) {
    const batchSize = 500;

    for (let index = 0; index < linksToCreate.length; index += batchSize) {
      const batch = linksToCreate.slice(index, index + batchSize);
      await prisma.placeTag.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
  }

  console.log('Backfill terminé.');
}

main()
  .catch((error) => {
    console.error('Backfill échoué:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });