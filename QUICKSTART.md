# Print Service - Quick Start Guide

## 60-Second Setup

### Step 1: Install Dependencies
```bash
cd print-service
npm install
```

### Step 2: Start the Service (Choose your OS)

**macOS (with auto-start):**
```bash
npm run install-service:macos
# Service will auto-start on login
# To manually start: launchctl start co.kraya.printservice
```

**Windows (manual or with NSSM):**
```bash
npm run install-service:windows
# Follow on-screen instructions for your preferred setup method
```

**Linux / Manual Start:**
```bash
npm start
```

### Step 3: Verify It's Running
```bash
curl http://localhost:3100/health
# Should return: {"status":"running","version":"1.0.0",...}
```

### Step 4: List Available Printers
```bash
curl http://localhost:3100/printers
# Should list your system printers
```

✅ **Done!** Service is running and ready to use.

---

## Next: Integrate with Your App

### Copy Client Library
```bash
cp print-service/src/client.js src/lib/print-client.js
```

### Use in React Component
```tsx
import PrintServiceClient from '@/lib/print-client';

const printClient = new PrintServiceClient('http://localhost:3100');

// Get printers
const printers = await printClient.getPrinters();

// Print PDF
await printClient.printPDF('HP_LaserJet', pdfBlob);
```

See `example-usage.tsx` for complete component example.

---

## Common Tasks

### Check Service Status (macOS)
```bash
launchctl list | grep kraya
```

### Stop Service (macOS)
```bash
launchctl stop co.kraya.printservice
```

### View Logs (macOS)
```bash
tail -f ~/Library/Logs/kraya-print-service.log
```

### Test Print Endpoint
```bash
curl -X POST http://localhost:3100/printers \
  -H "Content-Type: application/json" \
  -d '{"printerName":"Your_Printer_Name"}'
```

### Change Port
Edit `print-service/.env`:
```env
PORT=3200
```

---

## Troubleshooting

**Q: Service won't start on macOS**
```bash
# Check logs
cat ~/Library/Logs/kraya-print-service-error.log

# Or run manually to see errors
node print-service/src/server.js
```

**Q: Can't find printer**
- Make sure it's connected and ON
- Check printer name: `curl http://localhost:3100/printers`
- Use exact name from response (case-sensitive)

**Q: Browser can't reach service**
```bash
# Verify it's running
curl http://localhost:3100/health

# Check firewall if accessing from another machine
# Ensure HOST in .env is not restrictive
```

**Q: PDF won't print**
- Verify PDF is valid (try with smaller file)
- Check printer is online
- Check print service logs

---

## More Information

See [README.md](./README.md) for:
- Complete API documentation
- Configuration options
- Advanced usage
- Platform-specific details
