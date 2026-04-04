const { spawn } = require('child_process');

const PUBLIC_API_URL = 'https://hang-out-hub.vercel.app';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node ./scripts/run-eas-with-public-api.js <eas args...>');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npx';
const commandArgs = isWindows ? ['/c', 'npx', 'eas', ...args] : ['eas', ...args];

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    HANGOUTHUB_API_URL: PUBLIC_API_URL,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
