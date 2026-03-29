const os = require('os');
const { spawn } = require('child_process');

function isPrivateIpv4(ip) {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function resolveLocalIp() {
  const interfaces = os.networkInterfaces();

  for (const netIf of Object.values(interfaces)) {
    if (!netIf) continue;

    for (const address of netIf) {
      if (address.family !== 'IPv4') continue;
      if (address.internal) continue;
      if (!isPrivateIpv4(address.address)) continue;
      return address.address;
    }
  }

  return null;
}

const ip = resolveLocalIp();

if (!ip) {
  console.error('Impossible de detecter une IP locale privee (LAN).');
  process.exit(1);
}

const apiUrl = `http://${ip}:3000`;
console.log(`EXPO_PUBLIC_API_URL=${apiUrl}`);

const child = spawn('npx expo start --lan -c', {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: apiUrl,
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
