// Partage a distance SANS ngrok : on utilise un Cloudflare Quick Tunnel (gratuit,
// sans compte) pour exposer le bundler Metro, puis on demarre Expo en lui disant
// d'annoncer cette URL publique via EXPO_PACKAGER_PROXY_URL. Le backend est force
// sur la prod Vercel. Aucune modif du .env (qui reste sur le dev local).
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PUBLIC_API_URL = 'https://hang-out-hub.vercel.app';
const METRO_PORT = 8081;

// winget installe cloudflared mais ne rafraichit pas toujours le PATH du terminal.
// On resout le binaire : d'abord les emplacements winget connus, sinon le PATH.
function resolveCloudflared() {
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    path.join(
      local,
      'Microsoft', 'WinGet', 'Packages',
      'Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'cloudflared.exe',
    ),
    path.join(local, 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe'),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  return 'cloudflared'; // dernier recours : sur le PATH
}

let cloudflaredProc = null;
let expoProc = null;

function cleanup() {
  if (cloudflaredProc && !cloudflaredProc.killed) cloudflaredProc.kill();
  if (expoProc && !expoProc.killed) expoProc.kill();
}
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('exit', cleanup);

function startCloudflared() {
  return new Promise((resolve, reject) => {
    console.log('\n🌩️  Ouverture du tunnel Cloudflare (gratuit, sans compte)...\n');

    cloudflaredProc = spawn(
      resolveCloudflared(),
      ['tunnel', '--url', `http://localhost:${METRO_PORT}`],
    );

    let found = false;
    const scan = (buf) => {
      const text = buf.toString();
      process.stdout.write(text);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !found) {
        found = true;
        resolve(match[0]);
      }
    };

    cloudflaredProc.stdout.on('data', scan);
    cloudflaredProc.stderr.on('data', scan);
    cloudflaredProc.on('error', reject);

    setTimeout(() => {
      if (!found) reject(new Error('URL Cloudflare introuvable (timeout 40s).'));
    }, 40000);
  });
}

(async () => {
  const tunnelUrl = await startCloudflared();

  console.log(`\n✅ Tunnel Cloudflare prêt : ${tunnelUrl}`);
  console.log(`   Backend : ${PUBLIC_API_URL}\n`);
  console.log('👉 Quand Expo démarre, appuie sur "s" pour passer en Expo Go,');
  console.log('   puis envoie le QR (ou le lien exp://) à la personne.\n');

  const isWindows = process.platform === 'win32';
  const expoArgs = ['expo', 'start', '--lan'];
  const command = isWindows ? 'cmd.exe' : 'npx';
  const commandArgs = isWindows ? ['/c', 'npx', ...expoArgs] : expoArgs;

  expoProc = spawn(command, commandArgs, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: tunnelUrl,
      EXPO_PUBLIC_API_URL: PUBLIC_API_URL,
    },
  });

  expoProc.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
})().catch((error) => {
  console.error('\n❌ Échec du tunnel Cloudflare :', error.message);
  cleanup();
  process.exit(1);
});
