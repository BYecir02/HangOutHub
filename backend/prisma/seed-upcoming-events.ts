import { PrismaClient } from '@prisma/client';

/**
 * Seed autonome et idempotent : crée des ÉVÉNEMENTS À VENIR au Bénin,
 * rattachés à un organisateur déjà approuvé (par défaut Nova Events).
 *
 * Lancer :  npm run seed:events   (dans /backend)
 *
 * - Les dates sont calculées par rapport à "maintenant" → toujours dans le futur.
 * - Rejoue sans doublon : on supprime d'abord les events de ce script (par titre).
 */

const prisma = new PrismaClient();

/** Date future : maintenant + `days` jours, à l'heure UTC indiquée. */
function futureDate(days: number, hour = 19, minute = 0): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

interface SeedEvent {
  title: string;
  description: string;
  citySlug: string;
  address: string;
  coverUrl: string;
  images: string[];
  entryFee: string;
  startInDays: number;
  startHour: number;
  durationHours: number;
  tags: string[];
  tickets: Array<{ name: string; description: string; price: number; quantity: number }>;
}

const EVENTS: SeedEvent[] = [
  {
    title: 'Amapiano Rooftop — Cotonou',
    description:
      'Le rooftop le plus chaud de Cotonou : sélection amapiano, cocktails signatures et vue sur la ville.',
    citySlug: 'cotonou',
    address: 'Haie Vive, Cotonou',
    coverUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f3f9b?w=1200',
    images: ['https://images.unsplash.com/photo-1571266028243-e4733b0f3f9b?w=1200'],
    entryFee: '7000',
    startInDays: 5,
    startHour: 22,
    durationHours: 5,
    tags: ['Amapiano', 'Rooftop', 'Cocktails'],
    tickets: [
      { name: 'Standard', description: 'Accès général + welcome drink.', price: 7000, quantity: 150 },
      { name: 'Table VIP', description: 'Table pour 4 + bouteille.', price: 25000, quantity: 20 },
    ],
  },
  {
    title: 'Cotonou Afro Night',
    description:
      'Grande soirée afrobeats avec les meilleurs DJ de la place. Dancefloor garanti jusqu’au bout de la nuit.',
    citySlug: 'cotonou',
    address: 'Fidjrossè, Cotonou',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200',
    images: ['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200'],
    entryFee: '5000',
    startInDays: 7,
    startHour: 21,
    durationHours: 6,
    tags: ['Afrobeats', 'DJ Set'],
    tickets: [
      { name: 'Standard', description: 'Accès dancefloor.', price: 5000, quantity: 300 },
      { name: 'VIP', description: 'Carré VIP + fast line.', price: 12000, quantity: 80 },
    ],
  },
  {
    title: 'Sunset Live — Grand-Popo',
    description:
      'Coucher de soleil les pieds dans le sable, live band acoustique et ambiance bord de mer.',
    citySlug: 'grand-popo',
    address: 'Plage de Grand-Popo',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200'],
    entryFee: '0',
    startInDays: 9,
    startHour: 17,
    durationHours: 5,
    tags: ['Live Band', 'Plage', 'Detente'],
    tickets: [
      { name: 'Accès libre', description: 'Entrée gratuite, places limitées.', price: 0, quantity: 250 },
    ],
  },
  {
    title: 'Festival des Arts de Porto-Novo',
    description:
      'Deux scènes, danse, musique live et stands gastronomiques au cœur de la capitale.',
    citySlug: 'porto-novo',
    address: 'Place Jean Bayol, Porto-Novo',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
    images: ['https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200'],
    entryFee: '3000',
    startInDays: 12,
    startHour: 18,
    durationHours: 6,
    tags: ['Musique', 'Danse', 'Gastronomie'],
    tickets: [
      { name: 'Pass 1 jour', description: 'Accès au site pour la journée.', price: 3000, quantity: 500 },
      { name: 'Pass 2 jours', description: 'Accès au site pour les 2 jours.', price: 5000, quantity: 300 },
    ],
  },
  {
    title: 'Brunch & Gospel — Abomey-Calavi',
    description:
      'Brunch dominical convivial accompagné d’une chorale gospel live. Ambiance chaleureuse en famille ou entre amis.',
    citySlug: 'abomey-calavi',
    address: 'Route des Pêches, Abomey-Calavi',
    coverUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200'],
    entryFee: '6000',
    startInDays: 14,
    startHour: 11,
    durationHours: 4,
    tags: ['Gospel', 'Brunch'],
    tickets: [
      { name: 'Brunch + concert', description: 'Buffet brunch + concert gospel.', price: 6000, quantity: 120 },
    ],
  },
  {
    title: 'Ouidah Vibes — Vodun & Danse',
    description:
      'Soirée culturelle mêlant percussions traditionnelles, danse et musique live sur la cité historique.',
    citySlug: 'ouidah',
    address: 'Place du Chacha, Ouidah',
    coverUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200',
    images: ['https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200'],
    entryFee: '2000',
    startInDays: 18,
    startHour: 19,
    durationHours: 4,
    tags: ['Danse', 'Musique'],
    tickets: [
      { name: 'Entrée', description: 'Accès au spectacle.', price: 2000, quantity: 400 },
    ],
  },
  {
    title: 'Parakou Live Session',
    description:
      'Scène ouverte rap/hip-hop et live band dans le grand nord. La relève musicale en concert.',
    citySlug: 'parakou',
    address: 'Centre culturel, Parakou',
    coverUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200',
    images: ['https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200'],
    entryFee: '4000',
    startInDays: 21,
    startHour: 20,
    durationHours: 4,
    tags: ['Rap/Hip-hop', 'Live Band'],
    tickets: [
      { name: 'Standard', description: 'Accès concert.', price: 4000, quantity: 200 },
    ],
  },
  {
    title: 'Découverte Tata Somba — Natitingou',
    description:
      'Visite guidée des maisons-forteresses Tata Somba et immersion dans les traditions de l’Atacora.',
    citySlug: 'natitingou',
    address: 'Boukoumbé, Natitingou',
    coverUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
    images: ['https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200'],
    entryFee: '1500',
    startInDays: 25,
    startHour: 9,
    durationHours: 6,
    tags: ['Tata Somba', 'Village', 'Culture'],
    tickets: [
      { name: 'Visite guidée', description: 'Visite accompagnée + transport local.', price: 1500, quantity: 60 },
    ],
  },
];

async function main() {
  // 1) Organisateur approuvé (Nova Events en priorité, sinon n'importe quel approuvé).
  const organizer =
    (await prisma.user.findUnique({ where: { email: 'nova@hangouthub.dev' } })) ??
    (await prisma.user.findFirst({
      where: { OrganizerProfile: { is: { status: 'APPROVED' } } },
    }));

  if (!organizer) {
    throw new Error(
      "Aucun organisateur approuvé trouvé. Lance d'abord le seed de démo (npm run prisma:seed) ou approuve un organisateur.",
    );
  }

  // 2) Villes nécessaires.
  const slugs = [...new Set(EVENTS.map((e) => e.citySlug))];
  const cities = await prisma.city.findMany({ where: { slug: { in: slugs } } });
  const cityBySlug = new Map(cities.map((c) => [c.slug, c]));

  // 3) Tags référencés.
  const tagNames = [...new Set(EVENTS.flatMap((e) => e.tags))];
  const tagRows = await prisma.tag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true, name: true },
  });
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  // 4) Idempotence : on retire d'abord les events de ce script (par titre).
  const titles = EVENTS.map((e) => e.title);
  const existing = await prisma.event.findMany({
    where: { organizerId: organizer.id, title: { in: titles } },
    select: { id: true },
  });
  const existingIds = existing.map((e) => e.id);
  if (existingIds.length > 0) {
    await prisma.eventTag.deleteMany({ where: { eventId: { in: existingIds } } });
    await prisma.ticketType.deleteMany({ where: { eventId: { in: existingIds } } });
    await prisma.event.deleteMany({ where: { id: { in: existingIds } } });
  }

  // 5) Création.
  let created = 0;
  const skipped: string[] = [];

  for (const e of EVENTS) {
    const city = cityBySlug.get(e.citySlug);
    if (!city) {
      skipped.push(`${e.title} (ville "${e.citySlug}" absente)`);
      continue;
    }

    const startTime = futureDate(e.startInDays, e.startHour);
    const endTime = new Date(startTime.getTime() + e.durationHours * 60 * 60 * 1000);

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        cityId: city.id,
        title: e.title,
        description: e.description,
        address: e.address,
        startTime,
        endTime,
        coverUrl: e.coverUrl,
        images: e.images,
        entryFee: e.entryFee,
      },
    });

    const tagData = e.tags
      .map((name) => tagIdByName.get(name))
      .filter((id): id is number => typeof id === 'number')
      .map((tagId) => ({ eventId: event.id, tagId }));
    if (tagData.length > 0) {
      await prisma.eventTag.createMany({ data: tagData, skipDuplicates: true });
    }

    await prisma.ticketType.createMany({
      data: e.tickets.map((t) => ({ eventId: event.id, ...t })),
      skipDuplicates: true,
    });

    created += 1;
  }

  console.log(
    `✅ ${created} événement(s) à venir créés (organisateur : ${organizer.displayName ?? organizer.email}).`,
  );
  if (skipped.length > 0) {
    console.log('⚠️  Ignorés :', skipped.join(', '));
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed events à venir : échec', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
