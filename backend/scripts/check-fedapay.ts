import 'dotenv/config';
import { FedaPay, Transaction } from 'fedapay';

/**
 * Vérifie que la configuration FedaPay (.env) est bonne : crée une transaction
 * sandbox de 100 F et affiche l'URL de paiement. Aucun impact réel (sandbox).
 *
 * Lancer :  npx ts-node scripts/check-fedapay.ts   (dans /backend)
 */
async function main() {
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) {
    console.error('❌ FEDAPAY_SECRET_KEY absente du .env');
    process.exit(1);
  }

  FedaPay.setApiKey(key);
  FedaPay.setEnvironment(
    (process.env.FEDAPAY_ENV || 'sandbox') === 'live' ? 'live' : 'sandbox',
  );

  console.log(`🔧 Environnement : ${process.env.FEDAPAY_ENV || 'sandbox'}`);
  console.log(`🔑 Clé : ${key.slice(0, 12)}…`);

  const tx = await Transaction.create({
    description: 'Test config HangOutHub',
    amount: 100,
    currency: { iso: 'XOF' },
    callback_url: `${(process.env.APP_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '')}/payment-callback`,
    customer: {
      firstname: 'Test',
      lastname: 'HangOutHub',
      email: 'test@hangouthub.dev',
    },
  });

  const token = await tx.generateToken();

  console.log('✅ Clé FedaPay valide — transaction créée.');
  console.log(`   id : ${tx.id}`);
  console.log(`🔗 URL de paiement : ${token.url}`);
}

main().catch((error) => {
  console.error('❌ Échec FedaPay :', error?.message || error);
  process.exit(1);
});
