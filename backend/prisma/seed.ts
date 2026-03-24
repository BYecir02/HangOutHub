import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo12345!';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function seedRoles() {
  const roles = [
    { name: 'USER', description: 'Utilisateur standard' },
    { name: 'ADMIN', description: 'Administrateur du systeme' },
    { name: 'ORGANIZER', description: "Organisateur d'evenements" },
    {
      name: 'PLACE_OWNER',
      description: "Proprietaire ou gerant d'un etablissement",
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
}

async function seedCategoriesAndTags() {
  await prisma.eventTag.deleteMany({});
  await prisma.placeTag.deleteMany({});
  await prisma.userTagInterest.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.category.deleteMany({});

  const categories = [
    {
      name: 'Restaurant',
      icon: 'restaurant-outline',
      color: '#FF9F43',
      tags: [
        'Maquis',
        'Gastronomique',
        'Fast-food',
        'Brunch',
        'Pizzeria',
        'Fruits de mer',
      ],
    },
    {
      name: 'Bar & Lounge',
      icon: 'beer-outline',
      color: '#54a0ff',
      tags: ['Rooftop', 'Chicha', 'VIP', 'Cocktails', 'Afterwork', 'Billard'],
    },
    {
      name: 'Concert',
      icon: 'musical-notes-outline',
      color: '#5f27cd',
      tags: ['Live Band', 'Rap/Hip-hop', 'Gospel', 'Acoustique'],
    },
    {
      name: 'Sport',
      icon: 'football-outline',
      color: '#ee5253',
      tags: ['Football', 'Fitness', 'Yoga', 'Basketball'],
    },
    {
      name: 'Plage',
      icon: 'sunny-outline',
      color: '#feca57',
      tags: ['Detente', 'Surf', 'Jet-ski', 'Vue mer'],
    },
    {
      name: 'Art & Culture',
      icon: 'color-palette-outline',
      color: '#ff9ff3',
      tags: ['Vernissage', 'Expo', 'Theatre', 'Musee', 'Cinema'],
    },
    {
      name: 'Festival',
      icon: 'people-outline',
      color: '#00d2d3',
      tags: ['Musique', 'Gastronomie', 'Danse', 'Mode'],
    },
    {
      name: 'Boite de nuit',
      icon: 'moon-outline',
      color: '#2e86de',
      tags: ['Afrobeats', 'DJ Set', 'Amapiano', 'Techno'],
    },
  ];

  for (const category of categories) {
    const { tags, ...catData } = category;

    await prisma.category.create({
      data: {
        ...catData,
        Tag: {
          create: tags.map((tagName) => ({ name: tagName })),
        },
      },
    });
  }
}

async function seedCities() {
  const beninData = {
    Alibori: ['Kandi', 'Banikoara', 'Gogounou'],
    Atacora: ['Natitingou', 'Boukoumbe', 'Tanguieta'],
    Atlantique: ['Ouidah', 'Abomey-Calavi', 'Allada'],
    Borgou: ['Parakou', 'Nikki', 'Tchaourou'],
    Collines: ['Dassa-Zoume', 'Savalou', 'Save'],
    Couffo: ['Aplahoue', 'Dogbo'],
    Donga: ['Djougou', 'Bassila'],
    Littoral: ['Cotonou'],
    Mono: ['Lokossa', 'Grand-Popo'],
    Oueme: ['Porto-Novo', 'Seme-Podji'],
    Plateau: ['Sakete', 'Ketou'],
    Zou: ['Abomey', 'Bohicon'],
  };

  const cityCoordinates: Record<
    string,
    { latitude: number; longitude: number }
  > = {
    Cotonou: { latitude: 6.37, longitude: 2.39 },
    'Porto-Novo': { latitude: 6.49, longitude: 2.62 },
    'Abomey-Calavi': { latitude: 6.45, longitude: 2.35 },
    Ouidah: { latitude: 6.36, longitude: 2.08 },
    Parakou: { latitude: 9.34, longitude: 2.63 },
    Natitingou: { latitude: 10.3, longitude: 1.38 },
    Lome: { latitude: 6.17, longitude: 1.23 },
    Accra: { latitude: 5.6, longitude: -0.19 },
    Lagos: { latitude: 6.52, longitude: 3.38 },
    Abidjan: { latitude: 5.35, longitude: -4.02 },
  };

  const extraCountries: Array<{
    country: string;
    cities: Array<{ name: string; region?: string | null }>;
  }> = [
    {
      country: 'Togo',
      cities: [{ name: 'Lome', region: 'Maritime' }],
    },
    {
      country: 'Ghana',
      cities: [{ name: 'Accra', region: 'Greater Accra' }],
    },
    {
      country: 'Nigeria',
      cities: [{ name: 'Lagos', region: 'Lagos' }],
    },
    {
      country: "Cote d'Ivoire",
      cities: [{ name: 'Abidjan', region: 'Abidjan' }],
    },
  ];

  for (const [department, cities] of Object.entries(beninData)) {
    for (const cityName of cities) {
      const slug = slugify(cityName);
      const coordinates = cityCoordinates[cityName];

      await prisma.city.upsert({
        where: { slug },
        update: {
          region: department,
          country: 'Benin',
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
        create: {
          name: cityName,
          slug,
          region: department,
          country: 'Benin',
          imageUrl: null,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
      });
    }
  }

  for (const entry of extraCountries) {
    for (const city of entry.cities) {
      const slug = slugify(city.name);
      const coordinates = cityCoordinates[city.name];

      await prisma.city.upsert({
        where: { slug },
        update: {
          region: city.region ?? null,
          country: entry.country,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
        create: {
          name: city.name,
          slug,
          region: city.region ?? null,
          country: entry.country,
          imageUrl: null,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        },
      });
    }
  }
}

async function assignRole(userId: string, roleName: string) {
  const role = await prisma.role.findUnique({ where: { name: roleName } });

  if (!role) {
    throw new Error(`Role ${roleName} introuvable`);
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      userId,
      roleId: role.id,
    },
  });
}

async function getTagsByNames(names: string[]) {
  const tags = await prisma.tag.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });

  return new Map(tags.map((tag) => [tag.name, tag.id]));
}

async function main() {
  console.log('Debut du seed HangOutHub demo...');

  await seedRoles();
  await seedCategoriesAndTags();
  await seedCities();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const cotonou = await prisma.city.findUnique({ where: { slug: 'cotonou' } });
  const calavi = await prisma.city.findUnique({
    where: { slug: 'abomey-calavi' },
  });

  if (!cotonou || !calavi) {
    throw new Error('Les villes de base sont introuvables');
  }

  const user = await prisma.user.upsert({
    where: { username: 'amina' },
    update: {
      email: 'amina@hangouthub.dev',
      phoneNumber: '+22997000001',
      displayName: 'Amina Dossou',
      bio: 'Toujours partante pour un brunch, une expo ou une bonne soiree live a Cotonou.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200',
      residenceCityId: cotonou.id,
      passwordHash,
      isVerified: true,
      followersCount: 128,
      followingCount: 214,
    },
    create: {
      username: 'amina',
      email: 'amina@hangouthub.dev',
      phoneNumber: '+22997000001',
      displayName: 'Amina Dossou',
      bio: 'Toujours partante pour un brunch, une expo ou une bonne soiree live a Cotonou.',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200',
      residenceCityId: cotonou.id,
      passwordHash,
      isVerified: true,
      followersCount: 128,
      followingCount: 214,
    },
  });

  const organizer = await prisma.user.upsert({
    where: { username: 'novaevents' },
    update: {
      email: 'nova@hangouthub.dev',
      phoneNumber: '+22997000002',
      displayName: 'Nova Events',
      bio: 'Collectif qui produit des afterworks, experiences electro et rendez-vous culturels.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      residenceCityId: cotonou.id,
      passwordHash,
      isVerified: true,
      followersCount: 482,
      followingCount: 89,
    },
    create: {
      username: 'novaevents',
      email: 'nova@hangouthub.dev',
      phoneNumber: '+22997000002',
      displayName: 'Nova Events',
      bio: 'Collectif qui produit des afterworks, experiences electro et rendez-vous culturels.',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      residenceCityId: cotonou.id,
      passwordHash,
      isVerified: true,
      followersCount: 482,
      followingCount: 89,
    },
  });

  const owner = await prisma.user.upsert({
    where: { username: 'codedistrict' },
    update: {
      email: 'district@hangouthub.dev',
      phoneNumber: '+22997000003',
      displayName: 'Code District',
      bio: 'Lieu hybride entre cocktails, DJ sets et rencontres creatives a Cotonou.',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
      residenceCityId: calavi.id,
      passwordHash,
      isVerified: true,
      followersCount: 691,
      followingCount: 54,
    },
    create: {
      username: 'codedistrict',
      email: 'district@hangouthub.dev',
      phoneNumber: '+22997000003',
      displayName: 'Code District',
      bio: 'Lieu hybride entre cocktails, DJ sets et rencontres creatives a Cotonou.',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
      residenceCityId: calavi.id,
      passwordHash,
      isVerified: true,
      followersCount: 691,
      followingCount: 54,
    },
  });

  await assignRole(user.id, 'USER');
  await assignRole(organizer.id, 'ORGANIZER');
  await assignRole(owner.id, 'PLACE_OWNER');

  await prisma.organizerProfile.upsert({
    where: { userId: organizer.id },
    update: {
      accountType: 'NOMAD',
      companyName: 'Nova Events',
      ifuNumber: 'IFU-NOVA-2026',
      payoutInfo: 'mtn-97000002',
      jobTitle: 'Directeur artistique',
      status: 'APPROVED',
    },
    create: {
      userId: organizer.id,
      accountType: 'NOMAD',
      companyName: 'Nova Events',
      ifuNumber: 'IFU-NOVA-2026',
      payoutInfo: 'mtn-97000002',
      jobTitle: 'Directeur artistique',
      status: 'APPROVED',
    },
  });

  await prisma.organizerProfile.upsert({
    where: { userId: owner.id },
    update: {
      accountType: 'PLACE',
      companyName: 'Code District',
      ifuNumber: 'IFU-DISTRICT-2026',
      payoutInfo: 'moov-97000003',
      jobTitle: 'Gerant',
      status: 'APPROVED',
    },
    create: {
      userId: owner.id,
      accountType: 'PLACE',
      companyName: 'Code District',
      ifuNumber: 'IFU-DISTRICT-2026',
      payoutInfo: 'moov-97000003',
      jobTitle: 'Gerant',
      status: 'APPROVED',
    },
  });

  const seededUserIds = [user.id, organizer.id, owner.id];
  const seededPosts = await prisma.post.findMany({
    where: { userId: { in: seededUserIds } },
    select: { id: true },
  });
  const seededPostIds = seededPosts.map((post) => post.id);

  if (seededPostIds.length > 0) {
    await prisma.postComment.deleteMany({
      where: { postId: { in: seededPostIds } },
    });
    await prisma.postLike.deleteMany({
      where: { postId: { in: seededPostIds } },
    });
    await prisma.post.deleteMany({
      where: { id: { in: seededPostIds } },
    });
  }

  const seededEvents = await prisma.event.findMany({
    where: { organizerId: { in: [organizer.id, owner.id] } },
    select: { id: true },
  });
  const seededEventIds = seededEvents.map((event) => event.id);

  if (seededEventIds.length > 0) {
    await prisma.ticketType.deleteMany({
      where: { eventId: { in: seededEventIds } },
    });
    await prisma.eventTag.deleteMany({
      where: { eventId: { in: seededEventIds } },
    });
    await prisma.event.deleteMany({
      where: { id: { in: seededEventIds } },
    });
  }

  const seededPlaces = await prisma.place.findMany({
    where: { ownerId: owner.id },
    select: { id: true },
  });
  const seededPlaceIds = seededPlaces.map((place) => place.id);

  if (seededPlaceIds.length > 0) {
    await prisma.placeTag.deleteMany({
      where: { placeId: { in: seededPlaceIds } },
    });
  }

  const seededOutings = await prisma.outing.findMany({
    where: { creatorId: { in: seededUserIds } },
    select: { id: true },
  });
  const seededOutingIds = seededOutings.map((outing) => outing.id);

  await prisma.friendship.deleteMany({
    where: {
      requesterId: { in: seededUserIds },
      receiverId: { in: seededUserIds },
    },
  });

  if (seededOutingIds.length > 0) {
    await prisma.outingParticipant.deleteMany({
      where: { outingId: { in: seededOutingIds } },
    });
    await prisma.outing.deleteMany({
      where: { id: { in: seededOutingIds } },
    });
  }

  if (seededPlaceIds.length > 0) {
    await prisma.place.deleteMany({
      where: { id: { in: seededPlaceIds } },
    });
  }

  await prisma.session.deleteMany({ where: { userId: { in: seededUserIds } } });

  await prisma.friendship.createMany({
    data: [
      {
        requesterId: user.id,
        receiverId: organizer.id,
        status: 'ACCEPTED',
      },
      {
        requesterId: organizer.id,
        receiverId: owner.id,
        status: 'ACCEPTED',
      },
      {
        requesterId: owner.id,
        receiverId: user.id,
        status: 'PENDING',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        actorId: owner.id,
        type: 'FRIEND_REQUEST',
        isRead: false,
      },
    ],
  });

  const placeOne = await prisma.place.create({
    data: {
      ownerId: owner.id,
      cityId: cotonou.id,
      name: 'Code District Rooftop',
      description:
        'Rooftop urbain pour afterworks, DJ sets et cocktails au coucher du soleil.',
      address: 'Haie Vive, Cotonou',
      latitude: 6.3572,
      longitude: 2.384,
      priceLevel: 3,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
      images: [
        'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200',
      ],
    },
  });

  const placeTwo = await prisma.place.create({
    data: {
      ownerId: owner.id,
      cityId: calavi.id,
      name: 'Blue Garden Beach Club',
      description:
        'Spot chill au bord de l eau pour brunch, live band et evenements sunset.',
      address: 'Route des peches, Abomey-Calavi',
      latitude: 6.3429,
      longitude: 2.2785,
      priceLevel: 2,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
        'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1200',
      ],
    },
  });

  const eventOne = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      placeId: placeOne.id,
      title: 'Afterwork Nova x Code District',
      description:
        'DJ set, cocktails signatures et networking creatif dans une ambiance rooftop.',
      startTime: new Date('2026-03-20T18:30:00.000Z'),
      endTime: new Date('2026-03-20T23:00:00.000Z'),
      coverUrl:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
      images: [
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200',
      ],
      entryFee: '3500',
      address: placeOne.address,
    },
  });

  const eventTwo = await prisma.event.create({
    data: {
      organizerId: owner.id,
      placeId: placeTwo.id,
      title: 'Sunset Session Blue Garden',
      description:
        'Session sunset les pieds dans le sable, live band acoustique et menu tapas.',
      startTime: new Date('2026-03-27T17:00:00.000Z'),
      endTime: new Date('2026-03-27T22:30:00.000Z'),
      coverUrl:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      ],
      entryFee: '0',
      address: placeTwo.address,
    },
  });

  const eventThree = await prisma.event.create({
    data: {
      organizerId: organizer.id,
      title: 'Cotonou Creative Night',
      description:
        'Rencontre entre artistes, designers et entrepreneurs avec showcase live.',
      startTime: new Date('2026-04-04T19:00:00.000Z'),
      endTime: new Date('2026-04-04T23:30:00.000Z'),
      coverUrl:
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
      images: [
        'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
      ],
      entryFee: '5000',
      address: 'Seme City, Cotonou',
    },
  });

  await prisma.ticketType.createMany({
    data: [
      {
        eventId: eventOne.id,
        name: 'Standard',
        description: 'Acces general + welcome drink.',
        price: 3500,
        quantity: 180,
      },
      {
        eventId: eventOne.id,
        name: 'VIP Rooftop',
        description: 'Acces rooftop prive + cocktail signature + fast line.',
        price: 8000,
        quantity: 60,
      },
      {
        eventId: eventOne.id,
        name: 'Table Crew',
        description: 'Table reservee pour 4 personnes + bouteille.',
        price: 15000,
        quantity: 15,
      },
      {
        eventId: eventTwo.id,
        name: 'Acces libre',
        description: 'Acces plage + live band. Places limitees.',
        price: 0,
        quantity: 220,
      },
      {
        eventId: eventThree.id,
        name: 'Pass creatif',
        description: 'Acces showcase + drink soft inclus.',
        price: 5000,
        quantity: 140,
      },
      {
        eventId: eventThree.id,
        name: 'Pass premium',
        description: 'Acces showcase + zone front + 2 boissons.',
        price: 9000,
        quantity: 60,
      },
    ],
    skipDuplicates: true,
  });

  const outingOne = await prisma.outing.create({
    data: {
      creatorId: user.id,
      placeId: placeOne.id,
      title: 'Rooftop vendredi avec la team',
      scheduledDate: new Date('2026-03-21T19:30:00.000Z'),
      status: 'PLANNED',
      OutingParticipant: {
        create: [
          {
            userId: user.id,
            status: 'GOING',
            isAdmin: true,
          },
          {
            userId: organizer.id,
            status: 'INVITED',
            isAdmin: false,
          },
        ],
      },
    },
  });

  const outingTwo = await prisma.outing.create({
    data: {
      creatorId: user.id,
      placeId: placeTwo.id,
      title: 'Sunset plage dimanche',
      scheduledDate: new Date('2026-03-29T16:00:00.000Z'),
      status: 'PLANNED',
      OutingParticipant: {
        create: [
          {
            userId: user.id,
            status: 'GOING',
            isAdmin: true,
          },
          {
            userId: owner.id,
            status: 'INVITED',
            isAdmin: false,
          },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: organizer.id,
        actorId: user.id,
        type: 'OUTING_INVITE',
        isRead: false,
      },
      {
        userId: owner.id,
        actorId: user.id,
        type: 'OUTING_INVITE',
        isRead: false,
      },
    ],
  });

  const tagIds = await getTagsByNames([
    'Rooftop',
    'Cocktails',
    'Detente',
    'Vue mer',
    'Afterwork',
    'Musique',
    'Live Band',
    'Expo',
  ]);

  await prisma.placeTag.createMany({
    data: [
      {
        placeId: placeOne.id,
        tagId: tagIds.get('Rooftop')!,
      },
      {
        placeId: placeOne.id,
        tagId: tagIds.get('Cocktails')!,
      },
      {
        placeId: placeTwo.id,
        tagId: tagIds.get('Detente')!,
      },
      {
        placeId: placeTwo.id,
        tagId: tagIds.get('Vue mer')!,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.eventTag.createMany({
    data: [
      {
        eventId: eventOne.id,
        tagId: tagIds.get('Afterwork')!,
      },
      {
        eventId: eventOne.id,
        tagId: tagIds.get('Musique')!,
      },
      {
        eventId: eventTwo.id,
        tagId: tagIds.get('Live Band')!,
      },
      {
        eventId: eventTwo.id,
        tagId: tagIds.get('Vue mer')!,
      },
      {
        eventId: eventThree.id,
        tagId: tagIds.get('Expo')!,
      },
      {
        eventId: eventThree.id,
        tagId: tagIds.get('Musique')!,
      },
    ],
    skipDuplicates: true,
  });

  const postOne = await prisma.post.create({
    data: {
      userId: user.id,
      content:
        'Je cherche un spot cool pour vendredi soir. Vous conseillez quoi entre rooftop et live band ?',
      images: [
        'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200',
      ],
      visibility: 'public',
    },
  });

  const postTwo = await prisma.post.create({
    data: {
      userId: organizer.id,
      content:
        'Le line-up de notre prochain afterwork est pret. Ambiance house, cocktails et dress code minimal chic.',
      images: [
        'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
      ],
      visibility: 'public',
    },
  });

  const postThree = await prisma.post.create({
    data: {
      userId: owner.id,
      content:
        'On a repense tout l espace lounge du rooftop. Plus de confort, plus de lumiere, meme energie.',
      images: [
        'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200',
      ],
      visibility: 'public',
    },
  });

  await prisma.postLike.createMany({
    data: [
      { userId: organizer.id, postId: postOne.id },
      { userId: owner.id, postId: postOne.id },
      { userId: user.id, postId: postTwo.id },
      { userId: user.id, postId: postThree.id },
    ],
    skipDuplicates: true,
  });

  await prisma.postComment.createMany({
    data: [
      {
        userId: owner.id,
        postId: postOne.id,
        content:
          'Teste Code District vendredi. On a justement une ambiance rooftop plus chill.',
      },
      {
        userId: user.id,
        postId: postTwo.id,
        content: 'Le line-up donne trop envie, je reserve ma soiree.',
      },
      {
        userId: organizer.id,
        postId: postThree.id,
        content: 'Le nouvel espace est canon. Hate de faire une date chez vous.',
      },
    ],
  });

  console.log('Seed demo termine.');
  console.log('Comptes de demo:');
  console.log('USER -> amina@hangouthub.dev / Demo12345!');
  console.log('ORGANIZER -> nova@hangouthub.dev / Demo12345!');
  console.log('PLACE_OWNER -> district@hangouthub.dev / Demo12345!');
  console.log('Contenus crees:');
  console.log(`- 2 lieux (${placeOne.name}, ${placeTwo.name})`);
  console.log(
    `- 3 evenements (${eventOne.title}, ${eventTwo.title}, ${eventThree.title})`,
  );
  console.log(`- 2 sorties (${outingOne.title}, ${outingTwo.title})`);
  console.log(`- 3 posts (${postOne.id}, ${postTwo.id}, ${postThree.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
