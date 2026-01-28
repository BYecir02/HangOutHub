import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Petite fonction pour créer des slugs propres
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function main() {
  console.log('🇧🇯 Début du seeding complet du Bénin...');

  // --- 1. LES ROLES (On touche pas) ---
  const roles = [
    { name: 'USER', description: 'Utilisateur standard' },
    { name: 'ADMIN', description: 'Administrateur du système' },
    { name: 'ORGANIZER', description: 'Organisateur d’événements' },
    { name: 'PLACE_OWNER', description: 'Propriétaire ou gérant d’un établissement' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Rôles mis à jour');

  // --- 2. LES CATÉGORIES & TAGS (C'est ici qu'on améliore !) ---
  
  // ⚠️ Important : On supprime d'abord les TAGS pour ne pas bloquer la suppression des catégories
  await prisma.tag.deleteMany({}); 
  await prisma.category.deleteMany({});

  const categories = [
    { 
      name: 'Restaurant', 
      icon: 'restaurant-outline', 
      color: '#FF9F43',
      tags: ['Maquis', 'Gastronomique', 'Fast-food', 'Brunch', 'Pizzeria', 'Fruits de mer'] 
    },
    { 
      name: 'Bar & Lounge', 
      icon: 'beer-outline', 
      color: '#54a0ff',
      tags: ['Rooftop', 'Chicha', 'VIP', 'Cocktails', 'Afterwork', 'Billard'] 
    },
    { 
      name: 'Concert', 
      icon: 'musical-notes-outline', 
      color: '#5f27cd',
      tags: ['Live Band', 'Rap/Hip-hop', 'Gospel', 'Acoustique', 'Traditionnel'] 
    },
    { 
      name: 'Sport', 
      icon: 'football-outline', 
      color: '#ee5253',
      tags: ['Football', 'Fitness', 'Yoga', 'Basketball', 'Marche', 'Salle de gym'] 
    },
    { 
      name: 'Plage', 
      icon: 'sunny-outline', 
      color: '#feca57',
      tags: ['Détente', 'Surf', 'Jet-ski', 'Pique-nique', 'Vue mer'] 
    },
    { 
      name: 'Art & Culture', 
      icon: 'color-palette-outline', 
      color: '#ff9ff3',
      tags: ['Vernissage', 'Expo', 'Théâtre', 'Stand-up', 'Musée', 'Cinéma'] 
    },
    { 
      name: 'Festival', 
      icon: 'people-outline', 
      color: '#00d2d3',
      tags: ['Musique', 'Gastronomie', 'Danse', 'Mode'] 
    },
    { 
      name: 'Boîte de nuit', 
      icon: 'moon-outline', 
      color: '#2e86de',
      tags: ['Afrobeats', 'DJ Set', 'Amapiano', 'Techno', 'Bouyon'] 
    },
  ];

  for (const category of categories) {
    // On sépare les tags du reste des données
    const { tags, ...catData } = category;

    await prisma.category.create({
      data: {
        ...catData, // name, icon, color
        Tag: {
          create: tags.map(tagName => ({ name: tagName })) // Création magique des tags liés
        }
      }
    });
  }
  console.log('✅ Catégories et Tags mis à jour');

  // --- 3. LES VILLES DU BÉNIN (On touche pas) ---
  const beninData = {
    'Alibori': ['Kandi', 'Banikoara', 'Gogounou', 'Kérou', 'Malanville', 'Ségbana'],
    'Atacora': ['Natitingou', 'Boukoumbé', 'Cobly', 'Kouandé', 'Matéri', 'Péhunco', 'Tanguiéta', 'Toucountouna'],
    'Atlantique': ['Ouidah', 'Abomey-Calavi', 'Allada', 'Kpomassè', 'Sô-Ava', 'Toffo', 'Tori-Bossito', 'Zè'],
    'Borgou': ['Parakou', 'Bembèrèkè', 'Kalalé', 'N’Dali', 'Nikki', 'Pèrèrè', 'Sinendé', 'Tchaourou'],
    'Collines': ['Dassa-Zoumè', 'Bantè', 'Glazoué', 'Ouèssè', 'Savalou', 'Savè'],
    'Couffo': ['Aplahoué', 'Djakotomey', 'Klouékanmè', 'Lalo', 'Toviklin', 'Dogbo'],
    'Donga': ['Djougou', 'Bassila', 'Copargo', 'Ouaké'],
    'Littoral': ['Cotonou'],
    'Mono': ['Lokossa', 'Athiémé', 'Bopa', 'Comè', 'Grand-Popo', 'Houéyogbé'],
    'Ouémé': ['Porto-Novo', 'Adjarra', 'Adjohoun', 'Aguégués', 'Akpro-Missérété', 'Avrankou', 'Bonou', 'Dangbo', 'Sèmè-Podji'],
    'Plateau': ['Sakété', 'Adja-Ouèrè', 'Ifangni', 'Kétou', 'Pobè'],
    'Zou': ['Abomey', 'Agbangnizoun', 'Bohicon', 'Covè', 'Djidja', 'Ouinhi', 'Za-Kpota', 'Zagnanado', 'Zogbodomey']
  };

  console.log('⏳ Insertion des villes en cours...');
  
  for (const [department, cities] of Object.entries(beninData)) {
    for (const cityName of cities) {
      const slug = slugify(cityName);
      
      await prisma.city.upsert({
        where: { slug: slug },
        update: { region: department },
        create: {
          name: cityName,
          slug: slug,
          region: department,
          imageUrl: null 
        },
      });
    }
  }

  console.log('✅ 77 Communes du Bénin ajoutées !');
  console.log('🌳 Seeding terminé avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });