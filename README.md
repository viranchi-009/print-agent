# Kraya Print Service

Self-hosted print service for printing Vehicle Entry/Exit Slips directly from the browser to physical printers (both network and USB).

## Features

- ✅ Cross-platform support (macOS, Windows, Linux)
- ✅ Support for network and USB printers
- ✅ Simple REST API
- ✅ Auto-start on system boot
- ✅ Print PDF and HTML documents
- ✅ Configurable print options (copies, orientation, paper size)

## Installation

### Prerequisites

- Node.js 16+ installed on the system where the service will run
- npm (comes with Node.js)

### Quick Setup

#### macOS

```bash
cd print-service
npm install
npm run install-service:macos
```

The service will auto-start on system boot and start immediately.

**Verify it's running:**
```bash
curl http://localhost:3100/health
```

**Useful commands:**
```bash
# Check status
launchctl list | grep kraya

# Stop service
launchctl stop co.kraya.printservice

# Start service
launchctl start co.kraya.printservice

# Uninstall
launchctl unload ~/Library/LaunchAgents/co.kraya.printservice.plist
```

**View logs:**
```bash
tail -f ~/Library/Logs/kraya-print-service.log
```

#### Windows

```bash
cd print-service
npm install
npm run install-service:windows
```

Follow the on-screen instructions. You have several options:

**Option 1: Using NSSM (Recommended)**
1. Download NSSM from https://nssm.cc/download
2. Extract and add to PATH
3. Run: `npm run install-service:windows`

**Option 2: Scheduled Task (requires Admin)**
```powershell
# Run PowerShell as Administrator
$action = New-ScheduledTaskAction -Execute 'node.exe' -Argument 'C:\path\to\print-service\src\server.js'
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName 'KrayaPrintService'
```

**Option 3: Startup Folder**
1. Create a shortcut to `print-service/run-service.bat`
2. Place it in: `C:\Users\[Username]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

**Quick start (for testing):**
```bash
# Windows CMD
print-service\run-service.bat
```

## API Endpoints

### Health Check
```http
GET /health
```

Returns service status.

### List Printers
```http
GET /printers
```

Returns available printers:
```json
{
  "success": true,
  "printers": [
    {
      "name": "HP_LaserJet_Pro",
      "displayName": "HP LaserJet Pro M404n",
      "status": "ready"
    },
    {
      "name": "Canon_Pixma",
      "displayName": "Canon PIXMA TR7500",
      "status": "ready"
    }
  ]
}
```

### Print PDF
```http
POST /print
Content-Type: application/json

{
  "printerName": "HP_LaserJet_Pro",
  "pdfData": "base64_encoded_pdf_data",
  "printOptions": {
    "copies": 1,
    "orientation": "portrait",
    "media": "A4"
  }
}
```

**printOptions:**
- `copies` (number): Number of copies (default: 1)
- `orientation` (string): "portrait" or "landscape" (default: "portrait")
- `media` (string): Paper size - "A4", "Letter", "A5", etc. (default: "A4")

### Print HTML
```http
POST /print-html
Content-Type: application/json

{
  "printerName": "HP_LaserJet_Pro",
  "html": "<html>...</html>",
  "printOptions": {
    "copies": 1,
    "orientation": "portrait",
    "media": "A4"
  }
}
```

## Usage in Frontend

### 1. Copy the client library

Copy `print-service/src/client.js` to your Next.js project:

```bash
cp print-service/src/client.js src/lib/print-client.js
```

### 2. Use in your React component

```tsx
import { useEffect, useState } from 'react';
import PrintServiceClient from '@/lib/print-client';

export default function VESPrintPage() {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [loading, setLoading] = useState(false);
  const printClient = new PrintServiceClient('http://localhost:3100');

  useEffect(() => {
    loadPrinters();
  }, []);

  async function loadPrinters() {
    try {
      const available = await printClient.getPrinters();
      setPrinters(available);
      if (available.length > 0) {
        setSelectedPrinter(available[0].name);
      }
    } catch (error) {
      alert('Error loading printers: ' + error.message);
    }
  }

  async function handlePrint() {
    if (!selectedPrinter) {
      alert('Please select a printer');
      return;
    }

    setLoading(true);
    try {
      // Generate PDF from your VES data
      const pdfBlob = await generateVESPDF(vesData);
      
      // Send to print service
      const result = await printClient.printPDF(selectedPrinter, pdfBlob);
      alert(`Print job sent! Job ID: ${result.jobID}`);
    } catch (error) {
      alert('Print error: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
        <option value="">Select Printer</option>
        {printers.map(p => (
          <option key={p.name} value={p.name}>{p.displayName}</option>
        ))}
      </select>
      
      <button onClick={handlePrint} disabled={loading}>
        {loading ? 'Printing...' : 'Print VES'}
      </button>
    </div>
  );
}
```

### 3. Generate PDF for printing

Use any PDF library (example with `html2pdf`):

```tsx
import html2pdf from 'html2pdf.js';

async function generateVESPDF(vesData) {
  const element = document.getElementById('ves-template');
  const opt = {
    margin: 10,
    filename: 'ves.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };
  
  return new Promise((resolve) => {
    html2pdf().set(opt).from(element).outputPdf('blob').then(resolve);
  });
}
```

## Configuration

### Environment Variables

Create `.env` file in `print-service/` directory:

```env
PORT=3100                    # Port to run service on
HOST=localhost               # Host to bind to
```

To allow printing from other machines, change `HOST`:
```env
HOST=0.0.0.0                # Listen on all interfaces
```

## Troubleshooting

### Service won't start (macOS)

```bash
# Check for errors
launchctl list co.kraya.printservice

# View logs
cat ~/Library/Logs/kraya-print-service-error.log

# Try to run manually
node ~/path/to/print-service/src/server.js
```

### Printer not showing up

1. Make sure printer is connected and turned on
2. Verify it appears in system print settings
3. Check printer name matches exactly (case-sensitive)

### Print job fails

- Check printer is online in system settings
- Verify PDF/HTML is valid
- Check print service logs

### Cannot connect from browser

- Ensure print service is running: `curl http://localhost:3100/health`
- Check firewall settings if accessing from another machine
- Verify PORT and HOST in .env match

### Windows: Service won't start

Try running manually first:
```bash
cd print-service
npm install
npm start
```

If it works manually but not as service, check:
- Node.js path is correct
- Script path is absolute (not relative)
- User running service has permissions

## Development

Run in watch mode for development:

```bash
npm run dev
```

This will restart the service when files change.

## Project Integration

The print service is designed to work alongside the main fe-company-panel application. Ensure:

1. Print service is installed and running before using print features
2. Browser can reach `http://localhost:3100` (or configured HOST:PORT)
3. Required printer is available on the system

## License

MIT
