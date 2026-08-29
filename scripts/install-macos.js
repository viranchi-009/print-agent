import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceDir = path.dirname(__dirname);

console.log('🖨️  Setting up Kraya Print Service for macOS...\n');

const launchAgentName = 'co.kraya.printservice';
const launchAgentPath = path.join(
  process.env.HOME,
  'Library/LaunchAgents',
  `${launchAgentName}.plist`
);

const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${launchAgentName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/node</string>
        <string>${path.join(serviceDir, 'src/server.js')}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(process.env.HOME, 'Library/Logs/kraya-print-service.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(process.env.HOME, 'Library/Logs/kraya-print-service-error.log')}</string>
</dict>
</plist>`;

try {
  // Create LaunchAgents directory if it doesn't exist
  const launchAgentDir = path.dirname(launchAgentPath);
  if (!fs.existsSync(launchAgentDir)) {
    fs.mkdirSync(launchAgentDir, { recursive: true });
    console.log(`✓ Created ${launchAgentDir}`);
  }

  // Write plist file
  fs.writeFileSync(launchAgentPath, plistContent);
  console.log(`✓ Created launch agent at ${launchAgentPath}`);

  // Load the service
  execSync(`launchctl load ${launchAgentPath}`);
  console.log('✓ Service loaded');

  // Start the service
  execSync(`launchctl start ${launchAgentName}`);
  console.log('✓ Service started\n');

  console.log('✅ Setup complete!');
  console.log(`   Service will auto-start on login`);
  console.log(`   Logs: ~/Library/Logs/kraya-print-service*.log\n`);
  console.log('📝 Useful commands:');
  console.log(`   Start:  launchctl start ${launchAgentName}`);
  console.log(`   Stop:   launchctl stop ${launchAgentName}`);
  console.log(`   Unload: launchctl unload ${launchAgentPath}`);

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
