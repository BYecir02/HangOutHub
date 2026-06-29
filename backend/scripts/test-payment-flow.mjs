// Test bout-en-bout du flux de paiement FedaPay (backend uniquement).
// login -> liste events payants -> réserve -> /pay -> /payment-status
// Lancer :  node scripts/test-payment-flow.mjs   (backend doit tourner)

import { randomUUID } from 'node:crypto';

const BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api/v1';
const EMAIL = process.env.TEST_EMAIL || 'amina@hangouthub.dev';
const PASSWORD = process.env.TEST_PASSWORD || 'Demo12345!';

async function call(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`Base API : ${BASE}\n`);

  console.log('1) Login…');
  const login = await call('POST', '/auth/login', null, {
    email: EMAIL,
    password: PASSWORD,
  });
  if (login.status >= 400 || !login.json?.access_token) {
    console.error('   ❌ Login échec', login.status, login.json);
    process.exit(1);
  }
  const token = login.json.access_token;
  console.log('   ✅ token obtenu\n');

  console.log('2) Recherche d’un event payant…');
  const events = await call('GET', '/events?upcoming=true&limit=100', token);
  const items = events.json?.items || [];
  const paid = items.find(
    (e) =>
      Number(e.entryFee || 0) > 0 ||
      (e.TicketType || []).some((t) => Number(t.price) > 0),
  );
  if (!paid) {
    console.error('   ❌ Aucun event payant trouvé');
    process.exit(1);
  }
  const ticket = (paid.TicketType || []).find((t) => Number(t.price) > 0);
  console.log(
    `   ✅ ${paid.title} (${paid.id}) — ${
      ticket ? `billet ${ticket.name} ${ticket.price}` : `entrée ${paid.entryFee}`
    } F\n`,
  );

  console.log('3) Réservation…');
  const book = await call('POST', `/events/${paid.id}/book`, token, {
    ticketTypeId: ticket?.id,
    clientRequestId: randomUUID(),
  });
  if (book.status >= 400 || !book.json?.id) {
    console.error('   ❌ Réservation échec', book.status, book.json);
    process.exit(1);
  }
  console.log(`   ✅ booking ${book.json.id} — statut ${book.json.status}\n`);

  console.log('4) Démarrage du paiement (POST /bookings/:id/pay)…');
  const pay = await call('POST', `/bookings/${book.json.id}/pay`, token);
  if (pay.status >= 400) {
    console.error('   ❌ /pay échec', pay.status, pay.json);
    process.exit(1);
  }
  console.log('   ✅ réponse :', JSON.stringify(pay.json));
  console.log('   🔗 URL paiement :', pay.json?.paymentUrl, '\n');

  console.log('5) Statut du paiement (GET /bookings/:id/payment-status)…');
  const status = await call(
    'GET',
    `/bookings/${book.json.id}/payment-status`,
    token,
  );
  console.log('   ✅ statut :', JSON.stringify(status.json), '\n');

  console.log('=== RÉSULTAT ===');
  if (pay.json?.paymentUrl) {
    console.log('✅ Backend OK : transaction FedaPay créée + URL renvoyée.');
    console.log('👉 Ouvre cette URL et paie avec 66000001 (MTN test) pour confirmer :');
    console.log(pay.json.paymentUrl);
  } else if (pay.json?.free) {
    console.log('ℹ️ Event gratuit -> confirmé direct (pas de paiement).');
  } else {
    console.log('⚠️ Pas d’URL de paiement renvoyée — à vérifier.');
  }
}

main().catch((e) => {
  console.error('❌ Erreur :', e?.message || e);
  process.exit(1);
});
