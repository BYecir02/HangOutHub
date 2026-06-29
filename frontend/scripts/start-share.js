// Lance Expo en mode tunnel (partage a distance) en forçant l'URL du backend
// sur la prod Vercel, SANS toucher au fichier .env (qui reste sur le dev local).
// Expo donne la priorite aux variables du shell par-dessus le .env, donc cette
// surcharge ne vaut que pour cette session.
const { spawn } = require('child_process');

const PUBLIC_API_URL = 'https://hang-out-hub.vercel.app';

// On laisse passer d'eventuels arguments supplementaires (ex: --clear deja inclus).
const extraArgs = process.argv.slice(2);
const expoArgs = ['expo', 'start', '--tunnel', '-c', ...extraArgs];

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npx';
const commandArgs = isWindows ? ['/c', 'npx', ...expoArgs] : expoArgs;

console.log(`\n🌍 Partage distant — backend : ${PUBLIC_API_URL}\n`);

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: PUBLIC_API_URL,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
