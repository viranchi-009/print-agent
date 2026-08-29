import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceDir = path.dirname(__dirname);

console.log('🖨️  Setting up Kraya Print Service for Windows...\n');

const serviceName = 'KrayaPrintService';
const nodePath = process.execPath; // Get Node.js path
const scriptPath = path.join(serviceDir, 'src/server.js');

// Create a batch file to run the service
const batchContent = `@echo off
cd /d "${serviceDir}"
"${nodePath}" "${scriptPath}"
pause
`;

const batchPath = path.join(serviceDir, 'run-service.bat');

try {
  // Write batch file
  fs.writeFileSync(batchPath, batchContent);
  console.log(`✓ Created batch file at ${batchPath}`);

  // Try to create Windows service using NSSM if available
  try {
    execSync(`nssm query ${serviceName}`, { stdio: 'pipe' });
    console.log(`ℹ Service ${serviceName} already exists`);
  } catch (e) {
    // Service doesn't exist, try to create with nssm
    try {
      execSync(`nssm install ${serviceName} "${nodePath}" "${scriptPath}"`, { stdio: 'inherit' });
      execSync(`nssm start ${serviceName}`, { stdio: 'inherit' });
      console.log(`✓ Windows service created and started\n`);
      console.log('✅ Setup complete!');
      console.log(`   Service: ${serviceName}`);
      console.log(`   Manage: services.msc\n`);
      console.log('📝 Useful commands (run as Administrator):');
      console.log(`   Start:   nssm start ${serviceName}`);
      console.log(`   Stop:    nssm stop ${serviceName}`);
      console.log(`   Remove:  nssm remove ${serviceName} confirm`);
      return;
    } catch (nssmError) {
      console.log('ℹ NSSM not found, using alternative setup method\n');
    }
  }

  // Fallback: Create startup shortcut
  const startupDir = path.join(
    process.env.APPDATA,
    'Microsoft/Windows/Start Menu/Programs/Startup'
  );

  const shortcutPath = path.join(startupDir, 'Kraya Print Service.lnk');

  console.log(`📍 Manual Setup Required (NSSM not installed):\n`);
  console.log(`Option 1: Add to Windows Startup`);
  console.log(`   1. Copy this file to Startup folder:`);
  console.log(`      ${batchPath}`);
  console.log(`   2. Paste to: ${startupDir}\n`);

  console.log(`Option 2: Create Scheduled Task (Run as Administrator):`);
  console.log(`   powershell -Command "& {`);
  console.log(`     $action = New-ScheduledTaskAction -Execute '${nodePath}' -Argument '${scriptPath}'`);
  console.log(`     $trigger = New-ScheduledTaskTrigger -AtStartup`);
  console.log(`     Register-ScheduledTask -Action $action -Trigger $trigger -TaskName 'KrayaPrintService' -Description 'Kraya Print Service'`);
  console.log(`   }"\n`);

  console.log(`Option 3: Install NSSM for automatic service management`);
  console.log(`   https://nssm.cc/download\n`);

  console.log(`✅ Quick Start (for now):`);
  console.log(`   Run: ${batchPath}`);

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
