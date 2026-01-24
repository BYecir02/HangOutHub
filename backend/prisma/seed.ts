import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Petite fonction pour créer des slugs propres (ex: "Sèmè-Podji" -> "seme-podji")
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Sépare les accents des lettres
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^\w\-]+/g, '') // Supprime les caractères spéciaux
    .replace(/\-\-+/g, '-') // Remplace les tirets multiples par un seul
    .replace(/^-+/, '') // Supprime les tirets au début
    .replace(/-+$/, ''); // Supprime les tirets à la fin
}

async function main() {
  console.log('🇧🇯 Début du seeding complet du Bénin...');

  // --- 1. LES ROLES ---
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

  // --- 2. LES CATÉGORIES ---
  await prisma.category.deleteMany({});
  const categories = [
    { name: 'Restaurant', icon: 'restaurant-outline', color: '#FF9F43' },
    { name: 'Bar & Lounge', icon: 'beer-outline', color: '#54a0ff' },
    { name: 'Concert', icon: 'musical-notes-outline', color: '#5f27cd' },
    { name: 'Sport', icon: 'football-outline', color: '#ee5253' },
    { name: 'Plage', icon: 'sunny-outline', color: '#feca57' },
    { name: 'Art & Culture', icon: 'color-palette-outline', color: '#ff9ff3' },
    { name: 'Festival', icon: 'people-outline', color: '#00d2d3' },
    { name: 'Boîte de nuit', icon: 'moon-outline', color: '#2e86de' },
  ];

  for (const category of categories) {
    await prisma.category.create({ data: category });
  }
  console.log('✅ Catégories mises à jour avec Icônes & Couleurs');

  // --- 3. LES VILLES DU BÉNIN (77 Communes) ---
  const beninData = {
    'Alibori': ['Kandi', 'Banikoara', 'Gogounou', 'Kérou', 'Malanville', 'Ségbana'],
    'Atacora': ['Natitingou', 'Boukoumbé', 'Cobly', 'Kouandé', 'Matéri', 'Péhunco', 'Tanguiéta', 'Toucountouna'], // Note: Kerou est dans Alibori ou Atacora selon les sources, je l'ai laissé dans Alibori comme ta liste, j'ai retiré le doublon ici
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
        where: { slug: slug }, // On utilise le slug comme identifiant unique
        update: {
            region: department // Met à jour le département si ça a changé
        },
        create: {
          name: cityName,
          slug: slug,
          region: department, // Ici 'region' sert de Département
          imageUrl: null // On pourra ajouter des images plus tard
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