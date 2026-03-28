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
      tags: ['Football', 'Fitness', 'Yoga', 'Basketball', 'Stade'],
    },
    {
      name: 'Plage',
      icon: 'sunny-outline',
      color: '#feca57',
      tags: ['Detente', 'Surf', 'Jet-ski', 'Vue mer', 'Plage'],
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
    {
      name: 'Patrimoine',
      icon: 'library-outline',
      color: '#10ac84',
      tags: ['Palais', 'Fort', 'Monument', 'Site historique', 'Architecture', 'UNESCO'],
    },
    {
      name: 'Nature',
      icon: 'leaf-outline',
      color: '#1dd1a1',
      tags: [
        'Cascade',
        'Foret',
        'Grotte',
        'Collines',
        'Rochers',
        'Mangroves',
        'Dunes',
        'Lagune',
        'Lac',
        'Riviere',
        'Source thermale',
        'Jardin',
      ],
    },
    {
      name: 'Parcs & Faune',
      icon: 'paw-outline',
      color: '#48dbfb',
      tags: ['Parc national', 'Reserve', 'Faune'],
    },
    {
      name: 'Spiritualite',
      icon: 'flame-outline',
      color: '#ff6b6b',
      tags: ['Temple', 'Mosquee', 'Cathedrale', 'Sanctuaire', 'Vaudou'],
    },
    {
      name: 'Marches & Artisanat',
      icon: 'storefront-outline',
      color: '#576574',
      tags: ['Marche', 'Artisanat', 'Poterie'],
    },
    {
      name: 'Villages & Traditions',
      icon: 'home-outline',
      color: '#f368e0',
      tags: ['Village', 'Tata Somba', 'Lacustre', 'Culture'],
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
    Alibori: ['Kandi', 'Banikoara', 'Gogounou', 'Malanville'],
    Atacora: ['Natitingou', 'Boukoumbe', 'Tanguieta', 'Cobly'],
    Atlantique: ['Ouidah', 'Abomey-Calavi', 'Allada'],
    Borgou: ['Parakou', 'Nikki', 'Tchaourou'],
    Collines: ['Dassa-Zoume', 'Savalou', 'Save'],
    Couffo: ['Aplahoue', 'Dogbo'],
    Donga: ['Djougou', 'Bassila'],
    Littoral: ['Cotonou'],
    Mono: ['Lokossa', 'Grand-Popo', 'Bopa', 'Athieme', 'Come'],
    Oueme: ['Porto-Novo', 'Seme-Podji', 'So-Ava', 'Aguegues'],
    Plateau: ['Sakete', 'Ketou', 'Pobe'],
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
  const ouidah = await prisma.city.findUnique({ where: { slug: 'ouidah' } });
  const portoNovo = await prisma.city.findUnique({
    where: { slug: 'porto-novo' },
  });
  const ketou = await prisma.city.findUnique({ where: { slug: 'ketou' } });
  const grandPopo = await prisma.city.findUnique({
    where: { slug: 'grand-popo' },
  });
  const abomey = await prisma.city.findUnique({ where: { slug: 'abomey' } });
  const bohicon = await prisma.city.findUnique({ where: { slug: 'bohicon' } });
  const allada = await prisma.city.findUnique({ where: { slug: 'allada' } });
  const dassaZoume = await prisma.city.findUnique({
    where: { slug: 'dassa-zoume' },
  });
  const saveCity = await prisma.city.findUnique({ where: { slug: 'save' } });
  const savalou = await prisma.city.findUnique({ where: { slug: 'savalou' } });
  const parakou = await prisma.city.findUnique({ where: { slug: 'parakou' } });
  const nikki = await prisma.city.findUnique({ where: { slug: 'nikki' } });
  const tchaourou = await prisma.city.findUnique({
    where: { slug: 'tchaourou' },
  });
  const kandi = await prisma.city.findUnique({ where: { slug: 'kandi' } });
  const banikoara = await prisma.city.findUnique({
    where: { slug: 'banikoara' },
  });
  const tanguieta = await prisma.city.findUnique({
    where: { slug: 'tanguieta' },
  });
  const malanville = await prisma.city.findUnique({
    where: { slug: 'malanville' },
  });
  const bopa = await prisma.city.findUnique({ where: { slug: 'bopa' } });
  const athieme = await prisma.city.findUnique({
    where: { slug: 'athieme' },
  });
  const come = await prisma.city.findUnique({ where: { slug: 'come' } });
  const soAva = await prisma.city.findUnique({ where: { slug: 'so-ava' } });
  const aguegues = await prisma.city.findUnique({
    where: { slug: 'aguegues' },
  });
  const pobe = await prisma.city.findUnique({ where: { slug: 'pobe' } });
  const cobly = await prisma.city.findUnique({ where: { slug: 'cobly' } });
  const natitingou = await prisma.city.findUnique({
    where: { slug: 'natitingou' },
  });
  const boukoumbe = await prisma.city.findUnique({
    where: { slug: 'boukoumbe' },
  });

  if (
    !cotonou ||
    !calavi ||
    !ouidah ||
    !portoNovo ||
    !ketou ||
    !grandPopo ||
    !abomey ||
    !bohicon ||
    !allada ||
    !dassaZoume ||
    !saveCity ||
    !savalou ||
    !parakou ||
    !nikki ||
    !tchaourou ||
    !kandi ||
    !banikoara ||
    !tanguieta ||
    !malanville ||
    !bopa ||
    !athieme ||
    !come ||
    !soAva ||
    !aguegues ||
    !pobe ||
    !cobly ||
    !natitingou ||
    !boukoumbe
  ) {
    throw new Error('Les villes de base sont introuvables');
  }

  const user = await prisma.user.upsert({
    where: { phoneNumber: '+22997000001' },
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

  const admin = await prisma.user.upsert({
    where: { phoneNumber: '+22997000000' },
    update: {
      email: 'admin@hangouthub.dev',
      phoneNumber: '+22997000000',
      displayName: 'HangOutHub Admin',
      bio: 'Compte administrateur de la plateforme.',
      avatarUrl: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      residenceCityId: cotonou.id,
      passwordHash,
      isVerified: true,
      followersCount: 0,
      followingCount: 0,
    },
    create: {
      username: 'admin',
      email: 'admin@hangouthub.dev',
      phoneNumber: '+22997000000',
      displayName: 'HangOutHub Admin',
      bio: 'Compte administrateur de la plateforme.',
      avatarUrl: 'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=400',
      coverUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      residenceCityId: cotonou.id,
      passwordHash,
      isVerified: true,
      followersCount: 0,
      followingCount: 0,
    },
  });

  const organizer = await prisma.user.upsert({
    where: { phoneNumber: '+22997000002' },
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
    where: { phoneNumber: '+22997000003' },
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
  await assignRole(admin.id, 'ADMIN');
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
  await prisma.report.deleteMany({
    where: { reporterId: { in: seededUserIds } },
  });
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
    await prisma.review.deleteMany({
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

  const normalizeDirectPair = (a: string, b: string) =>
    a < b ? [a, b] : [b, a];
  const directPairs = [
    normalizeDirectPair(user.id, organizer.id),
    normalizeDirectPair(organizer.id, owner.id),
  ];
  const existingConversations = await prisma.directConversation.findMany({
    where: {
      OR: directPairs.map(([userOneId, userTwoId]) => ({
        userOneId,
        userTwoId,
      })),
    },
    select: { id: true },
  });
  const existingConversationIds = existingConversations.map((conversation) => conversation.id);
  if (existingConversationIds.length > 0) {
    await prisma.directMessage.deleteMany({
      where: { conversationId: { in: existingConversationIds } },
    });
    await prisma.directConversation.deleteMany({
      where: { id: { in: existingConversationIds } },
    });
  }

  const now = new Date();
  const makeConversation = async (
    userA: string,
    userB: string,
    unreadFor: string,
  ) => {
    const [userOneId, userTwoId] = normalizeDirectPair(userA, userB);
    const lastReadFor = (userId: string) =>
      userId === unreadFor
        ? new Date(now.getTime() - 1000 * 60 * 60 * 2)
        : now;

    const conversation = await prisma.directConversation.create({
      data: {
        userOneId,
        userTwoId,
        userOneLastReadAt: lastReadFor(userOneId),
        userTwoLastReadAt: lastReadFor(userTwoId),
      },
    });

    const messages = [
      {
        conversationId: conversation.id,
        senderId: userA,
        content: 'Salut ! On se cale un cafe cette semaine ?',
        sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
      },
      {
        conversationId: conversation.id,
        senderId: userB,
        content: 'Yes, dispo jeudi soir si tu veux.',
        sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 4),
      },
      {
        conversationId: conversation.id,
        senderId: userA,
        content: 'Parfait, je reserve un spot.',
        sentAt: new Date(now.getTime() - 1000 * 60 * 60 * 3),
      },
    ];

    await prisma.directMessage.createMany({ data: messages });
    await prisma.directConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: messages[messages.length - 1].sentAt },
    });
  };

  await makeConversation(user.id, organizer.id, user.id);
  await makeConversation(organizer.id, owner.id, owner.id);

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

  const ouidahPlacesData = [
    {
      name: "Fort Portugais (Musee d'Histoire de Ouidah)",
      description:
        "Ancienne forteresse convertie en musee, temoignant de l'histoire d'Ouidah.",
      address: 'Quartier historique, Ouidah',
      latitude: 6.361,
      longitude: 2.084,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'La Route des Esclaves',
      description:
        "Parcours memoire retracant l'histoire de la traite et du retour a la mer.",
      address: 'Route des Esclaves, Ouidah',
      latitude: 6.36,
      longitude: 2.086,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
    },
    {
      name: 'La Porte du Non-Retour',
      description:
        'Monument symbolique au bord de l ocean, etape finale de la Route des Esclaves.',
      address: 'Plage, Ouidah',
      latitude: 6.355,
      longitude: 2.082,
      priceLevel: 1,
      avgRating: 4.8,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Temple des Pythons',
      description:
        'Lieu sacre vaudou connu pour ses pythons, visite culturelle unique.',
      address: 'Centre-ville, Ouidah',
      latitude: 6.364,
      longitude: 2.083,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Cathedrale Saint-Francois-Xavier',
      description:
        'Cathedrale historique d Ouidah, repere architectural et culturel.',
      address: 'Centre-ville, Ouidah',
      latitude: 6.367,
      longitude: 2.087,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Place Chacha',
      description:
        'Place emblematique du commerce historique, coeur vivant de la ville.',
      address: 'Place Chacha, Ouidah',
      latitude: 6.365,
      longitude: 2.081,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Foret Sacree Kpasse',
      description:
        'Foret sacree, lieu spirituel entoure de legends et de nature.',
      address: 'Peripherie, Ouidah',
      latitude: 6.372,
      longitude: 2.075,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
    },
    {
      name: 'Memorial de la Traite Negriere',
      description:
        "Lieu de memoire pour comprendre l'histoire et honorer les victimes.",
      address: 'Ouidah',
      latitude: 6.358,
      longitude: 2.088,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: "Monument de l'Arbre de l'Oubli",
      description:
        'Site symbolique du rituel de l oubli pendant la traite negriere.',
      address: 'Route des Esclaves, Ouidah',
      latitude: 6.359,
      longitude: 2.085,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
    },
    {
      name: "Monument de l'Arbre du Retour",
      description:
        'Monument marquant le rituel du retour symbolique des ames.',
      address: 'Route des Esclaves, Ouidah',
      latitude: 6.354,
      longitude: 2.083,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
    },
    {
      name: 'Cimetiere historique de Ouidah',
      description:
        'Ancien cimetiere, memoire des familles historiques de la ville.',
      address: 'Ouidah',
      latitude: 6.368,
      longitude: 2.079,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Couvent des Pythons',
      description:
        'Lieu de culte vaudou lie aux pythons sacres et aux ceremonies.',
      address: 'Ouidah',
      latitude: 6.363,
      longitude: 2.082,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Maison Bresilienne de Ouidah',
      description:
        "Architecture afro-bresilienne, symbole des retours et du metissage culturel.",
      address: 'Ouidah',
      latitude: 6.366,
      longitude: 2.084,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Marche de Ouidah',
      description:
        'Marche local anime avec artisanat, epices et produits frais.',
      address: 'Centre-ville, Ouidah',
      latitude: 6.369,
      longitude: 2.086,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
    },
    {
      name: 'Plage de Ouidah',
      description:
        'Longue plage sablee, ideale pour balades et couchers de soleil.',
      address: 'Plage, Ouidah',
      latitude: 6.35,
      longitude: 2.079,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      ],
    },
    {
      name: 'Dunes de sable de Ouidah',
      description:
        'Paysages de dunes et ocean, spot photo naturel et paisible.',
      address: 'Littoral, Ouidah',
      latitude: 6.348,
      longitude: 2.074,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
    },
    {
      name: 'Mangroves de Ouidah',
      description:
        'Zones de mangroves pour balades nature et observation tranquille.',
      address: 'Ouidah',
      latitude: 6.345,
      longitude: 2.07,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
    },
  ];

  await prisma.place.createMany({
    data: ouidahPlacesData.map((place) => ({
      ...place,
      cityId: ouidah.id,
    })),
  });

  const ouidahPlacesCount = ouidahPlacesData.length;

  const portoNovoPlacesData = [
    {
      name: 'Musee Honme - Palais du Roi Toffa',
      description:
        'Ancien palais royal, musee emblematique de l histoire de Porto-Novo.',
      address: 'Quartier Honme, Porto-Novo',
      latitude: 6.496,
      longitude: 2.614,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Grande Mosquee de Porto-Novo',
      description:
        'Mosquee historique a l architecture afro-bresilienne unique.',
      address: 'Centre-ville, Porto-Novo',
      latitude: 6.497,
      longitude: 2.626,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
    },
    {
      name: 'Musee da Silva',
      description:
        'Musee sur l heritage afro-bresilien et les retours de diaspora.',
      address: 'Porto-Novo',
      latitude: 6.495,
      longitude: 2.618,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Musee Ethnographique de Porto-Novo',
      description:
        'Collections ethnographiques pour comprendre les cultures du Benin.',
      address: 'Porto-Novo',
      latitude: 6.493,
      longitude: 2.624,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Palais Royal de Porto-Novo',
      description:
        'Palais royal, patrimoine vivant et lieu de memoire historique.',
      address: 'Porto-Novo',
      latitude: 6.498,
      longitude: 2.62,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
  ];

  await prisma.place.createMany({
    data: portoNovoPlacesData.map((place) => ({
      ...place,
      cityId: portoNovo.id,
    })),
  });

  const portoNovoPlacesCount = portoNovoPlacesData.length;

  const ketouPlacesData = [
    {
      name: 'Palais Royal de Ketou',
      description:
        'Palais royal de Ketou, memoire vivante du heritage yoruba.',
      address: 'Ketou',
      latitude: 7.363,
      longitude: 2.607,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
    {
      name: 'Foret Sacree de Ketou',
      description:
        'Foret sacree et spirituelle, lieu de traditions ancestrales.',
      address: 'Ketou',
      latitude: 7.36,
      longitude: 2.6,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
    },
    {
      name: 'Temple Orisha de Ketou',
      description:
        'Temple orisha, haut lieu du patrimoine culturel yoruba.',
      address: 'Ketou',
      latitude: 7.365,
      longitude: 2.612,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
    },
  ];

  await prisma.place.createMany({
    data: ketouPlacesData.map((place) => ({
      ...place,
      cityId: ketou.id,
    })),
  });

  const ketouPlacesCount = ketouPlacesData.length;

  const atacoraPlacesData = [
    {
      name: 'Tata Somba de Natitingou',
      description:
        'Maisons-forteresses traditionnelles, symbole du patrimoine somba.',
      address: 'Natitingou',
      latitude: 10.311,
      longitude: 1.379,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Musee Regional de Natitingou',
      description:
        'Musee regional pour decouvrir l histoire et les cultures de l Atacora.',
      address: 'Natitingou',
      latitude: 10.304,
      longitude: 1.381,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Cascade de Kota',
      description: 'Cascade naturelle rafraichissante, spot nature populaire.',
      address: 'Kota, Natitingou',
      latitude: 10.336,
      longitude: 1.32,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Grottes de Kota',
      description: 'Grottes et formations rocheuses autour de Kota.',
      address: 'Kota, Natitingou',
      latitude: 10.338,
      longitude: 1.318,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Cascade de Tanougou',
      description: 'Chute d eau au coeur d un paysage verdoyant.',
      address: 'Tanougou, Natitingou',
      latitude: 10.387,
      longitude: 1.343,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Cascade de Dogue',
      description: 'Cascade isolee, ideale pour une randonnee nature.',
      address: 'Dogue, Natitingou',
      latitude: 10.32,
      longitude: 1.28,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Village de Boukoumbe',
      description:
        'Village culturel connu pour ses traditions et son artisanat.',
      address: 'Boukoumbe',
      latitude: 10.281,
      longitude: 1.44,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: boukoumbe.id,
    },
  ];

  await prisma.place.createMany({
    data: atacoraPlacesData.map((place) => ({
      ...place,
    })),
  });

  const atacoraPlacesCount = atacoraPlacesData.length;

  const beachPlacesData = [
    {
      name: 'Plage de Fidjrosse',
      description:
        'Grande plage publique de Cotonou, ideale pour les couchers de soleil.',
      address: 'Fidjrosse, Cotonou',
      latitude: 6.356,
      longitude: 2.372,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Plage de Togbin',
      description:
        'Plage de la route des peches, spot populaire pour detente et sorties.',
      address: 'Togbin plage, Cotonou',
      latitude: 6.334,
      longitude: 2.264,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Plage de Ouidah',
      description:
        'Plage atlantique de Ouidah, cadre calme pour balades et detente.',
      address: 'Ouidah-Plage, Ouidah',
      latitude: 6.3223,
      longitude: 2.0832,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: ouidah.id,
    },
    {
      name: "Plage d'Avlekete",
      description:
        'Plage paisible pres de Ouidah, connue pour son ambiance locale.',
      address: 'Avlekete, Ouidah',
      latitude: 6.333,
      longitude: 2.049,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      ],
      cityId: ouidah.id,
    },
    {
      name: 'Plage de Grand-Popo',
      description:
        'Immense plage sauvage bordee de cocotiers, tres appreciee.',
      address: 'Grand-Popo',
      latitude: 6.284,
      longitude: 1.82,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      ],
      cityId: grandPopo.id,
    },
  ];

  await prisma.place.createMany({
    data: beachPlacesData.map((place) => ({
      ...place,
    })),
  });

  const beachPlacesCount = beachPlacesData.length;

  const cotonouPlacesData = [
    {
      name: 'Fondation Zinsou',
      description: 'Musee d art contemporain et espace culturel.',
      address: 'Cotonou',
      latitude: 6.37,
      longitude: 2.39,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Marche Dantokpa',
      description: 'Plus grand marche de Cotonou, tres anime.',
      address: 'Dantokpa, Cotonou',
      latitude: 6.36,
      longitude: 2.4,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Lac Nokoue',
      description: 'Grand lac lagunaire aux portes de la ville.',
      address: 'Cotonou',
      latitude: 6.4,
      longitude: 2.43,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Jardin des Plantes et de la Nature',
      description: 'Espace vert pour balade et decouverte botanique.',
      address: 'Cotonou',
      latitude: 6.368,
      longitude: 2.385,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Institut Francais du Benin',
      description: 'Lieu culturel avec cinema, concerts et expos.',
      address: 'Cotonou',
      latitude: 6.372,
      longitude: 2.388,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      images: [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Cathedrale Notre-Dame de Misericorde',
      description: 'Cathedrale historique de Cotonou.',
      address: 'Cotonou',
      latitude: 6.365,
      longitude: 2.388,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: "Marche des feticheurs d'Akpakpa",
      description: 'Marche traditionnel connu pour ses objets rituels.',
      address: 'Akpakpa, Cotonou',
      latitude: 6.357,
      longitude: 2.424,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: "Centre de Promotion de l'Artisanat",
      description: 'Espace pour decouvrir et acheter l artisanat local.',
      address: 'Cotonou',
      latitude: 6.365,
      longitude: 2.395,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: "Place de l'Etoile Rouge",
      description: 'Carrefour emblematique de Cotonou.',
      address: 'Cotonou',
      latitude: 6.372,
      longitude: 2.402,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Phare de Cotonou',
      description: 'Repere historique avec vue sur la cote.',
      address: 'Cotonou',
      latitude: 6.352,
      longitude: 2.376,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Gare ferroviaire historique',
      description: 'Ancienne gare, patrimoine urbain de la ville.',
      address: 'Cotonou',
      latitude: 6.356,
      longitude: 2.401,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: "Stade de l'Amitie Mathieu Kerekou",
      description: 'Grand stade national pour evenements sportifs.',
      address: 'Cotonou',
      latitude: 6.363,
      longitude: 2.384,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Marche de Missebo',
      description: 'Marche populaire specialise dans le textile.',
      address: 'Missebo, Cotonou',
      latitude: 6.37,
      longitude: 2.404,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Marche de Gbegamey',
      description: 'Marche local avec produits du quotidien.',
      address: 'Gbegamey, Cotonou',
      latitude: 6.366,
      longitude: 2.408,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Plage de Cadjehoun',
      description: 'Plage urbaine connue pour son ambiance locale.',
      address: 'Cadjehoun, Cotonou',
      latitude: 6.354,
      longitude: 2.376,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Marche aux poissons du bord de mer',
      description: 'Marche de poissons au bord de la mer.',
      address: 'Cotonou',
      latitude: 6.35,
      longitude: 2.379,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Port Autonome de Cotonou (vue exterieure)',
      description: 'Vue sur le port principal du pays.',
      address: 'Cotonou',
      latitude: 6.35,
      longitude: 2.42,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Cathedrale Saint-Michel',
      description: 'Cathedrale historique et repere architectural.',
      address: 'Cotonou',
      latitude: 6.361,
      longitude: 2.39,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
    {
      name: 'Palais de la Presidence (exterieur)',
      description: 'Vue exterieure du palais presidentiel.',
      address: 'Cotonou',
      latitude: 6.365,
      longitude: 2.392,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: cotonou.id,
    },
  ];

  await prisma.place.createMany({
    data: cotonouPlacesData.map((place) => ({
      ...place,
    })),
  });

  const cotonouPlacesCount = cotonouPlacesData.length;

  const portoNovoExtraPlacesData = [
    {
      name: 'Assemblee Nationale (exterieur)',
      description: 'Batiment institutionnel historique.',
      address: 'Porto-Novo',
      latitude: 6.492,
      longitude: 2.62,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Centre Songhai',
      description: 'Centre agro-ecologique et de formation.',
      address: 'Porto-Novo',
      latitude: 6.485,
      longitude: 2.63,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Bibliotheque Nationale du Benin',
      description: 'Bibliotheque patrimoniale et lieu de recherche.',
      address: 'Porto-Novo',
      latitude: 6.494,
      longitude: 2.621,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Place Jean Bayol',
      description: 'Place publique du centre historique.',
      address: 'Porto-Novo',
      latitude: 6.49,
      longitude: 2.618,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Jardin public de Porto-Novo',
      description: 'Espace vert pour balade et detente.',
      address: 'Porto-Novo',
      latitude: 6.493,
      longitude: 2.619,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Quartier bresilien de Porto-Novo',
      description: 'Quartier historique a l architecture afro-bresilienne.',
      address: 'Porto-Novo',
      latitude: 6.491,
      longitude: 2.616,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Ancien Palais du Gouverneur colonial',
      description: 'Batiment colonial historique.',
      address: 'Porto-Novo',
      latitude: 6.495,
      longitude: 2.617,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Temple Vaudou de Porto-Novo',
      description: 'Lieu de culte et de traditions locales.',
      address: 'Porto-Novo',
      latitude: 6.492,
      longitude: 2.615,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Village royal de Hogbonou',
      description: 'Village royal historique de Porto-Novo.',
      address: 'Porto-Novo',
      latitude: 6.497,
      longitude: 2.622,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: portoNovo.id,
    },
    {
      name: 'Fleuve Oueme (Porto-Novo)',
      description: 'Berges du fleuve pour detente et observation.',
      address: 'Porto-Novo',
      latitude: 6.49,
      longitude: 2.64,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: portoNovo.id,
    },
  ];

  await prisma.place.createMany({
    data: portoNovoExtraPlacesData.map((place) => ({
      ...place,
    })),
  });

  const portoNovoExtraPlacesCount = portoNovoExtraPlacesData.length;

  const abomeyPlacesData = [
    {
      name: "Palais Royaux d'Abomey",
      description: 'Site UNESCO et symbole de l histoire du Danxome.',
      address: 'Abomey',
      latitude: 7.18,
      longitude: 1.99,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: abomey.id,
    },
    {
      name: "Musee Historique d'Abomey",
      description: 'Musee retraçant l histoire des rois d Abomey.',
      address: 'Abomey',
      latitude: 7.181,
      longitude: 1.992,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: abomey.id,
    },
    {
      name: "Temple Vaudou d'Abomey",
      description: 'Temple et lieux de rites traditionnels.',
      address: 'Abomey',
      latitude: 7.179,
      longitude: 1.995,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: abomey.id,
    },
    {
      name: "Forge traditionnelle d'Abomey",
      description: 'Atelier et savoir-faire metallurgique local.',
      address: 'Abomey',
      latitude: 7.182,
      longitude: 1.987,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: abomey.id,
    },
    {
      name: "Foret Sacree d'Allada",
      description: 'Foret sacree et lieu de traditions ancestrales.',
      address: 'Allada',
      latitude: 6.665,
      longitude: 2.151,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: allada.id,
    },
    {
      name: "Village Royal d'Allada",
      description: 'Village royal historique et patrimoine culturel.',
      address: 'Allada',
      latitude: 6.664,
      longitude: 2.154,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: allada.id,
    },
    {
      name: 'Gare ferroviaire de Bohicon',
      description: 'Ancienne gare ferroviaire de la region.',
      address: 'Bohicon',
      latitude: 7.17,
      longitude: 2.06,
      priceLevel: 1,
      avgRating: 4.0,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: bohicon.id,
    },
    {
      name: 'Foret Classee de la Lama',
      description: 'Foret classee pour balade nature et biodiversite.',
      address: 'Pobe',
      latitude: 6.98,
      longitude: 2.67,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: pobe.id,
    },
    {
      name: 'Village Yoruba de Ketou',
      description: 'Village traditionnel du patrimoine yoruba.',
      address: 'Ketou',
      latitude: 7.362,
      longitude: 2.605,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: ketou.id,
    },
  ];

  await prisma.place.createMany({
    data: abomeyPlacesData.map((place) => ({
      ...place,
    })),
  });

  const abomeyPlacesCount = abomeyPlacesData.length;

  const collinesPlacesData = [
    {
      name: 'Collines de Dassa-Zoume',
      description: 'Paysages de collines et points de vue naturels.',
      address: 'Dassa-Zoume',
      latitude: 7.75,
      longitude: 2.18,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: dassaZoume.id,
    },
    {
      name: 'Sanctuaire Marial de Dassa (grotte)',
      description: 'Sanctuaire et grotte mariale de pelerinage.',
      address: 'Dassa-Zoume',
      latitude: 7.748,
      longitude: 2.182,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: dassaZoume.id,
    },
    {
      name: 'Rochers de Save',
      description: 'Rochers et reliefs naturels a explorer.',
      address: 'Save',
      latitude: 8.03,
      longitude: 2.47,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: saveCity.id,
    },
    {
      name: 'Foret de Wari-Maro',
      description: 'Foret naturelle, ideale pour randonnees.',
      address: 'Savalou',
      latitude: 7.93,
      longitude: 1.97,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: savalou.id,
    },
    {
      name: 'Collines de Savalou',
      description: 'Paysages vallonnes et sites naturels.',
      address: 'Savalou',
      latitude: 7.94,
      longitude: 1.98,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: savalou.id,
    },
    {
      name: 'Marche de Savalou',
      description: 'Marche local et artisanal de la ville.',
      address: 'Savalou',
      latitude: 7.935,
      longitude: 1.975,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: savalou.id,
    },
    {
      name: 'Temple Vaudou de Savalou',
      description: 'Temple traditionnel et lieu de ceremonies.',
      address: 'Savalou',
      latitude: 7.936,
      longitude: 1.972,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: savalou.id,
    },
    {
      name: 'Atelier de poterie traditionnelle de Savalou',
      description: 'Ateliers de poterie et savoir-faire local.',
      address: 'Savalou',
      latitude: 7.934,
      longitude: 1.971,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: savalou.id,
    },
  ];

  await prisma.place.createMany({
    data: collinesPlacesData.map((place) => ({
      ...place,
    })),
  });

  const collinesPlacesCount = collinesPlacesData.length;

  const monoPlacesData = [
    {
      name: 'Bouche du Roy',
      description: 'Embouchure entre fleuve et ocean a Grand-Popo.',
      address: 'Grand-Popo',
      latitude: 6.29,
      longitude: 1.81,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: grandPopo.id,
    },
    {
      name: 'Mangroves de Grand-Popo',
      description: 'Balades nature au coeur des mangroves.',
      address: 'Grand-Popo',
      latitude: 6.286,
      longitude: 1.824,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: grandPopo.id,
    },
    {
      name: 'Lac Aheme',
      description: 'Lac paisible pour observation et detente.',
      address: 'Bopa',
      latitude: 6.58,
      longitude: 1.98,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: bopa.id,
    },
    {
      name: 'Village lacustre de Guezin',
      description: 'Village lacustre et traditions sur le lac.',
      address: 'Bopa',
      latitude: 6.59,
      longitude: 1.99,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: bopa.id,
    },
    {
      name: 'Village de Possotome',
      description: 'Village connu pour ses sources thermales.',
      address: 'Bopa',
      latitude: 6.57,
      longitude: 1.99,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: bopa.id,
    },
    {
      name: 'Source thermale de Possotome',
      description: 'Source thermale naturelle et lieu de detente.',
      address: 'Possotome, Bopa',
      latitude: 6.568,
      longitude: 1.988,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: bopa.id,
    },
    {
      name: 'Reserve de Biosphere du delta du Mono',
      description: 'Zone naturelle protege et biodiversite unique.',
      address: 'Grand-Popo',
      latitude: 6.29,
      longitude: 1.79,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: grandPopo.id,
    },
    {
      name: "Cascade d'Athieme",
      description: 'Chute d eau locale et lieu nature.',
      address: 'Athieme',
      latitude: 6.56,
      longitude: 1.66,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200',
      ],
      cityId: athieme.id,
    },
    {
      name: 'Lagune cotiere de Come',
      description: 'Lagune et paysages d eau calme.',
      address: 'Come',
      latitude: 6.41,
      longitude: 1.88,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: come.id,
    },
  ];

  await prisma.place.createMany({
    data: monoPlacesData.map((place) => ({
      ...place,
    })),
  });

  const monoPlacesCount = monoPlacesData.length;

  const ouemePlacesData = [
    {
      name: 'Village lacustre de Ganvie',
      description: 'Village sur pilotis et patrimoine lacustre.',
      address: 'So-Ava',
      latitude: 6.5,
      longitude: 2.41,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: soAva.id,
    },
    {
      name: 'Village lacustre de So-Ava',
      description: 'Village lacustre et traditions locales.',
      address: 'So-Ava',
      latitude: 6.51,
      longitude: 2.4,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: soAva.id,
    },
    {
      name: "Ile d'Aguegues",
      description: 'Ile fluviale et paysages du bas Oueme.',
      address: 'Aguegues',
      latitude: 6.52,
      longitude: 2.56,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: aguegues.id,
    },
  ];

  await prisma.place.createMany({
    data: ouemePlacesData.map((place) => ({
      ...place,
    })),
  });

  const ouemePlacesCount = ouemePlacesData.length;

  const atacoraExtraPlacesData = [
    {
      name: 'Parc National de la Pendjari',
      description: 'Reserve naturelle et faune sauvage.',
      address: 'Tanguieta',
      latitude: 10.62,
      longitude: 1.26,
      priceLevel: 1,
      avgRating: 4.8,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: tanguieta.id,
    },
    {
      name: "Pic de l'Atakora",
      description: 'Sommet et panorama naturel de la region.',
      address: 'Natitingou',
      latitude: 10.31,
      longitude: 1.37,
      priceLevel: 1,
      avgRating: 4.6,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: "Mosquee en banco de l'Atakora",
      description: 'Architecture traditionnelle en terre.',
      address: 'Natitingou',
      latitude: 10.305,
      longitude: 1.372,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: natitingou.id,
    },
    {
      name: 'Village de Koussoukoingou',
      description: 'Village somba et maisons forteresses.',
      address: 'Boukoumbe',
      latitude: 10.29,
      longitude: 1.46,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: boukoumbe.id,
    },
    {
      name: 'Village de Nadoba',
      description: 'Village somba connu pour ses tatas.',
      address: 'Boukoumbe',
      latitude: 10.28,
      longitude: 1.43,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: boukoumbe.id,
    },
    {
      name: 'Village de Tabota',
      description: 'Village traditionnel et tatas somba.',
      address: 'Boukoumbe',
      latitude: 10.27,
      longitude: 1.44,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: boukoumbe.id,
    },
    {
      name: 'Village Ditamari de Boukoumbe',
      description: 'Village culturel ditamari.',
      address: 'Boukoumbe',
      latitude: 10.29,
      longitude: 1.45,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: boukoumbe.id,
    },
    {
      name: 'Village de Cobly',
      description: 'Village historique du nord-ouest.',
      address: 'Cobly',
      latitude: 10.46,
      longitude: 1.01,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: cobly.id,
    },
  ];

  await prisma.place.createMany({
    data: atacoraExtraPlacesData.map((place) => ({
      ...place,
    })),
  });

  const atacoraExtraPlacesCount = atacoraExtraPlacesData.length;

  const borgouPlacesData = [
    {
      name: 'Grande Mosquee de Parakou',
      description: 'Mosquee principale de Parakou.',
      address: 'Parakou',
      latitude: 9.34,
      longitude: 2.63,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: parakou.id,
    },
    {
      name: 'Palais du Roi de Nikki',
      description: 'Palais traditionnel du royaume de Nikki.',
      address: 'Nikki',
      latitude: 9.93,
      longitude: 3.21,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: nikki.id,
    },
    {
      name: 'Mosquee historique de Nikki',
      description: 'Mosquee ancienne et historique.',
      address: 'Nikki',
      latitude: 9.928,
      longitude: 3.214,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: nikki.id,
    },
    {
      name: 'Foret Classee de Tchaourou',
      description: 'Zone forestiere protegee.',
      address: 'Tchaourou',
      latitude: 8.88,
      longitude: 2.6,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: tchaourou.id,
    },
  ];

  await prisma.place.createMany({
    data: borgouPlacesData.map((place) => ({
      ...place,
    })),
  });

  const borgouPlacesCount = borgouPlacesData.length;

  const aliboriPlacesData = [
    {
      name: 'Parc National du W',
      description: 'Parc national et reserve de faune.',
      address: 'Banikoara',
      latitude: 11.35,
      longitude: 2.44,
      priceLevel: 1,
      avgRating: 4.7,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: banikoara.id,
    },
    {
      name: 'Zone cynegetique de la Djona',
      description: 'Zone protegee de faune sauvage.',
      address: 'Banikoara',
      latitude: 11.36,
      longitude: 2.41,
      priceLevel: 1,
      avgRating: 4.5,
      coverUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      images: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
      ],
      cityId: banikoara.id,
    },
    {
      name: 'Foret Classee de la Sota',
      description: 'Foret classee situee pres de Kandi.',
      address: 'Kandi',
      latitude: 11.13,
      longitude: 2.94,
      priceLevel: 1,
      avgRating: 4.2,
      coverUrl:
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      images: [
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      ],
      cityId: kandi.id,
    },
    {
      name: 'Fleuve Niger a Malanville',
      description: 'Berges du Niger, point de passage au nord.',
      address: 'Malanville',
      latitude: 11.87,
      longitude: 3.38,
      priceLevel: 1,
      avgRating: 4.3,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: malanville.id,
    },
    {
      name: 'Marche international de Malanville',
      description: 'Marche frontalier tres actif.',
      address: 'Malanville',
      latitude: 11.868,
      longitude: 3.381,
      priceLevel: 1,
      avgRating: 4.1,
      coverUrl:
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      images: [
        'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200',
      ],
      cityId: malanville.id,
    },
    {
      name: 'Riviere Mekrou',
      description: 'Riviere et paysages du parc du W.',
      address: 'Banikoara',
      latitude: 11.32,
      longitude: 2.5,
      priceLevel: 1,
      avgRating: 4.4,
      coverUrl:
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      images: [
        'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200',
      ],
      cityId: banikoara.id,
    },
  ];

  await prisma.place.createMany({
    data: aliboriPlacesData.map((place) => ({
      ...place,
    })),
  });

  const aliboriPlacesCount = aliboriPlacesData.length;

  const seededPlacesForTags = await prisma.place.findMany({
    select: { id: true, name: true },
  });

  const placeTagRules: Array<{
    tag: string;
    match: (name: string) => boolean;
  }> = [
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
    { tag: 'Lac', match: (name) => name.includes('lac ') || name.startsWith('lac') || name.includes('lacustre') },
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

  const placeTagIds = await getTagsByNames(placeTagRules.map((rule) => rule.tag));
  const placeTagData: Array<{ placeId: string; tagId: number }> = [];
  const placeTagSet = new Set<string>();

  for (const place of seededPlacesForTags) {
    const name = place.name.toLowerCase();

    for (const rule of placeTagRules) {
      if (!rule.match(name)) {
        continue;
      }

      const tagId = placeTagIds.get(rule.tag);
      if (!tagId) {
        continue;
      }

      const key = `${place.id}:${tagId}`;
      if (placeTagSet.has(key)) {
        continue;
      }

      placeTagSet.add(key);
      placeTagData.push({ placeId: place.id, tagId });
    }
  }

  if (placeTagData.length > 0) {
    await prisma.placeTag.createMany({
      data: placeTagData,
      skipDuplicates: true,
    });
  }

  const reviewSeedTargets: Array<{
    name: string;
    reviews: Array<{
      userId: string;
      rating: number;
      comment?: string;
      createdAt?: Date;
    }>;
  }> = [
    {
      name: placeOne.name,
      reviews: [
        {
          userId: user.id,
          rating: 5,
          comment: 'Vue top et ambiance parfaite pour afterwork.',
          createdAt: new Date('2026-03-10T20:12:00.000Z'),
        },
        {
          userId: organizer.id,
          rating: 4,
          comment: 'Rooftop tres clean, service rapide.',
          createdAt: new Date('2026-03-12T19:05:00.000Z'),
        },
      ],
    },
    {
      name: placeTwo.name,
      reviews: [
        {
          userId: user.id,
          rating: 5,
          comment: 'Coucher de soleil incroyable, spot chill.',
          createdAt: new Date('2026-03-08T18:40:00.000Z'),
        },
        {
          userId: owner.id,
          rating: 4,
          comment: 'Bon rapport qualite/prix, musique live sympa.',
          createdAt: new Date('2026-03-09T17:10:00.000Z'),
        },
      ],
    },
    {
      name: 'La Porte du Non-Retour',
      reviews: [
        {
          userId: user.id,
          rating: 5,
          comment: 'Lieu charge d histoire, visite incontournable.',
          createdAt: new Date('2026-03-02T10:15:00.000Z'),
        },
        {
          userId: organizer.id,
          rating: 4,
          comment: 'Emouvant et bien conserve.',
          createdAt: new Date('2026-03-03T09:20:00.000Z'),
        },
      ],
    },
    {
      name: 'Musee Honme - Palais du Roi Toffa',
      reviews: [
        {
          userId: user.id,
          rating: 5,
          comment: 'Belle immersion dans l histoire locale.',
          createdAt: new Date('2026-02-22T14:05:00.000Z'),
        },
        {
          userId: owner.id,
          rating: 4,
          comment: 'Guide passionnant, musee bien organise.',
          createdAt: new Date('2026-02-23T11:45:00.000Z'),
        },
      ],
    },
    {
      name: 'Plage de Fidjrosse',
      reviews: [
        {
          userId: user.id,
          rating: 4,
          comment: 'Plage agreable, parfait pour se poser.',
          createdAt: new Date('2026-03-01T16:30:00.000Z'),
        },
        {
          userId: organizer.id,
          rating: 4,
          comment: 'Bonne ambiance et couchers de soleil.',
          createdAt: new Date('2026-03-01T18:05:00.000Z'),
        },
      ],
    },
    {
      name: 'Tata Somba de Natitingou',
      reviews: [
        {
          userId: owner.id,
          rating: 5,
          comment: 'Architecture unique, experience authentique.',
          createdAt: new Date('2026-02-18T13:10:00.000Z'),
        },
      ],
    },
  ];

  const reviewPlaceNames = reviewSeedTargets.map((target) => target.name);
  const reviewPlaces = await prisma.place.findMany({
    where: { name: { in: reviewPlaceNames } },
    select: { id: true, name: true },
  });
  const reviewPlaceByName = new Map(
    reviewPlaces.map((place) => [place.name, place]),
  );
  const reviewSeedData: Array<{
    userId: string;
    placeId: string;
    rating: number;
    comment?: string;
    createdAt?: Date;
  }> = [];

  for (const target of reviewSeedTargets) {
    const place = reviewPlaceByName.get(target.name);
    if (!place) {
      continue;
    }

    const existingCount = await prisma.review.count({
      where: { placeId: place.id },
    });
    if (existingCount > 0) {
      continue;
    }

    for (const review of target.reviews) {
      reviewSeedData.push({
        ...review,
        placeId: place.id,
      });
    }
  }

  if (reviewSeedData.length > 0) {
    await prisma.review.createMany({
      data: reviewSeedData,
      skipDuplicates: true,
    });
  }

  if (reviewPlaces.length > 0) {
    const placeRatings = await prisma.review.groupBy({
      by: ['placeId'],
      where: { placeId: { in: reviewPlaces.map((place) => place.id) } },
      _avg: { rating: true },
    });

    await Promise.all(
      placeRatings.map((entry) =>
        prisma.place.update({
          where: { id: entry.placeId },
          data: { avgRating: entry._avg.rating ?? 0 },
        }),
      ),
    );
  }

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
        'Plan vendredi soir: afterwork rooftop avec vue sur la ville. Qui est chaud ?',
      images: [
        'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200',
      ],
      visibility: 'public',
      postType: 'plan',
      placeId: placeOne.id,
      placeName: 'Code District Rooftop',
      cityName: 'Cotonou',
      ambiance: 'Bar & Lounge',
    },
  });

  const postTwo = await prisma.post.create({
    data: {
      userId: organizer.id,
      content:
        'Dimanche sunset + live band + tapas. Le spot parfait pour chiller.',
      images: [
        'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200',
      ],
      visibility: 'public',
      postType: 'plan',
      eventId: eventTwo.id,
      placeId: placeTwo.id,
      placeName: 'Blue Garden Beach Club',
      cityName: 'Abomey-Calavi',
      ambiance: 'Plage',
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
      postType: 'post',
    },
  });

  const postFour = await prisma.post.create({
    data: {
      userId: user.id,
      content: 'Foot a 5 ce soir vers 20h ? Je cherche une team motivee.',
      visibility: 'public',
      postType: 'plan',
      placeId: placeOne.id,
      placeName: 'Five Etoiles',
      cityName: 'Cotonou',
      ambiance: 'Sport',
    },
  });

  const postFive = await prisma.post.create({
    data: {
      userId: organizer.id,
      content: 'Soiree DJ set special Amapiano vendredi. On se cale ?',
      visibility: 'public',
      postType: 'plan',
      eventId: eventOne.id,
      placeId: placeOne.id,
      placeName: placeOne.name,
      cityName: 'Cotonou',
      ambiance: 'Boite de nuit',
    },
  });

  const postSix = await prisma.post.create({
    data: {
      userId: owner.id,
      content: 'Brunch du dimanche + live band. Qui partant ?',
      visibility: 'public',
      postType: 'plan',
      placeId: placeTwo.id,
      placeName: placeTwo.name,
      cityName: 'Abomey-Calavi',
      ambiance: 'Restaurant',
    },
  });

  const postSeven = await prisma.post.create({
    data: {
      userId: user.id,
      content: 'Ce soir je veux juste sortir mais sans programme. Des idees ?',
      visibility: 'public',
      postType: 'plan',
      ambiance: 'Festival',
    },
  });

  const postEight = await prisma.post.create({
    data: {
      userId: organizer.id,
      content:
        'Nouveau line up annonce pour Cotonou Creative Night. On se retrouve la bas.',
      visibility: 'public',
      postType: 'plan',
      eventId: eventThree.id,
      placeName: 'Seme City',
      cityName: 'Cotonou',
      ambiance: 'Art & Culture',
    },
  });

  const postNine = await prisma.post.create({
    data: {
      userId: owner.id,
      content:
        'Update: notre rooftop passe en mode sunset lounge tous les jeudis.',
      images: [
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      ],
      visibility: 'public',
      postType: 'post',
    },
  });

  await prisma.postLike.createMany({
    data: [
      { userId: organizer.id, postId: postOne.id },
      { userId: owner.id, postId: postOne.id },
      { userId: user.id, postId: postTwo.id },
      { userId: user.id, postId: postThree.id },
      { userId: organizer.id, postId: postFour.id },
      { userId: owner.id, postId: postFive.id },
      { userId: user.id, postId: postFive.id },
      { userId: organizer.id, postId: postSix.id },
      { userId: owner.id, postId: postSeven.id },
      { userId: user.id, postId: postEight.id },
      { userId: organizer.id, postId: postNine.id },
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
      {
        userId: organizer.id,
        postId: postFour.id,
        content: 'Chaud pour un petit match. Tu joues ou ?',
      },
      {
        userId: owner.id,
        postId: postFive.id,
        content: 'Le line up est chaud, je viens avec la team.',
      },
      {
        userId: user.id,
        postId: postSix.id,
        content: 'Brunch + live band = parfait.',
      },
      {
        userId: organizer.id,
        postId: postSeven.id,
        content: 'Si tu veux, on peut brainstormer un plan chill.',
      },
      {
        userId: owner.id,
        postId: postEight.id,
        content: 'On se retrouve a l entree vers 19h30 ?',
      },
      {
        userId: user.id,
        postId: postNine.id,
        content: 'Le jeudi soir devient mon nouveau rituel.',
      },
    ],
  });

  const seededReports = await prisma.report.createMany({
    data: [
      {
        reporterId: organizer.id,
        targetId: postThree.id,
        targetType: 'POST',
        reason: 'Contenu inapproprie',
        status: 'PENDING',
      },
      {
        reporterId: user.id,
        targetId: eventOne.id,
        targetType: 'EVENT',
        reason: 'Informations trompeuses',
        status: 'PENDING',
      },
      {
        reporterId: owner.id,
        targetId: placeTwo.id,
        targetType: 'PLACE',
        reason: 'Lieu non conforme',
        status: 'RESOLVED',
      },
      {
        reporterId: user.id,
        targetId: organizer.id,
        targetType: 'USER',
        reason: 'Comportement suspect',
        status: 'PENDING',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed demo termine.');
  console.log('Comptes de demo:');
  console.log('ADMIN -> admin@hangouthub.dev / Demo12345!');
  console.log('USER -> amina@hangouthub.dev / Demo12345!');
  console.log('ORGANIZER -> nova@hangouthub.dev / Demo12345!');
  console.log('PLACE_OWNER -> district@hangouthub.dev / Demo12345!');
  console.log('Contenus crees:');
  const totalPlacesCount =
    2 +
    ouidahPlacesCount +
    portoNovoPlacesCount +
    portoNovoExtraPlacesCount +
    ketouPlacesCount +
    atacoraPlacesCount +
    beachPlacesCount +
    cotonouPlacesCount +
    abomeyPlacesCount +
    collinesPlacesCount +
    monoPlacesCount +
    ouemePlacesCount +
    atacoraExtraPlacesCount +
    borgouPlacesCount +
    aliboriPlacesCount;
  console.log(
    `- ${totalPlacesCount} lieux (${placeOne.name}, ${placeTwo.name} + ${ouidahPlacesCount} a Ouidah + ${portoNovoPlacesCount + portoNovoExtraPlacesCount} a Porto-Novo + ${cotonouPlacesCount} a Cotonou + ${ketouPlacesCount} a Ketou + ${abomeyPlacesCount} autour d Abomey + ${collinesPlacesCount} dans les Collines + ${monoPlacesCount} dans le Mono + ${ouemePlacesCount} dans l Oueme + ${atacoraPlacesCount + atacoraExtraPlacesCount} en Atacora + ${borgouPlacesCount} en Borgou + ${aliboriPlacesCount} en Alibori + ${beachPlacesCount} plages)`,
  );
  console.log(
    `- 3 evenements (${eventOne.title}, ${eventTwo.title}, ${eventThree.title})`,
  );
  console.log(`- 2 sorties (${outingOne.title}, ${outingTwo.title})`);
  console.log(
    `- 9 posts (${postOne.id}, ${postTwo.id}, ${postThree.id}, ${postFour.id}, ${postFive.id}, ${postSix.id}, ${postSeven.id}, ${postEight.id}, ${postNine.id})`,
  );
  console.log(`- ${seededReports.count} signalements`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
