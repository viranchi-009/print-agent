import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import os from 'os';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3100;
const HOST = process.env.HOST || 'localhost';
const PLATFORM = os.platform(); // 'darwin' for macOS, 'win32' for Windows

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Platform detection
const isMacOS = PLATFORM === 'darwin';
const isWindows = PLATFORM === 'win32';

// Get available printers
function getPrinters() {
  try {
    if (isMacOS) {
      // macOS: lpstat -p -d
      const output = execSync('lpstat -p -d', { encoding: 'utf-8' });
      const lines = output.split('\n').filter(line => line.startsWith('printer'));
      return lines.map(line => {
        const match = line.match(/printer\s+(\S+)/);
        return {
          name: match ? match[1] : 'Unknown',
          displayName: match ? match[1] : 'Unknown'
        };
      }).filter(p => p.name !== 'Unknown');
    } else if (isWindows) {
      // Windows: Get printers using WMI
      try {
        const output = execSync(
          'powershell -Command "Get-WmiObject Win32_Printer | Select-Object -ExpandProperty Name"',
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        );
        return output
          .split('\n')
          .filter(line => line.trim())
          .map(name => ({
            name: name.trim(),
            displayName: name.trim()
          }));
      } catch (e) {
        return [];
      }
    }
  } catch (error) {
    console.error('Error getting printers:', error.message);
    return [];
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    version: '1.0.0',
    platform: PLATFORM,
    timestamp: new Date().toISOString()
  });
});

// List available printers
app.get('/printers', (req, res) => {
  try {
    const printers = getPrinters();
    res.json({
      success: true,
      printers: printers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Print document
app.post('/print', async (req, res) => {
  try {
    const { printerName, pdfData, printOptions = {} } = req.body;

    if (!printerName || !pdfData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: printerName, pdfData'
      });
    }

    // Validate printer exists
    const printers = getPrinters();
    const printerExists = printers.some(p => p.name === printerName);

    if (!printerExists) {
      return res.status(404).json({
        success: false,
        error: `Printer "${printerName}" not found. Available: ${printers.map(p => p.name).join(', ')}`
      });
    }

    // Convert base64 PDF to buffer - trim whitespace first
    const cleanBase64 = pdfData.trim().replace(/\s/g, '');
    let pdfBuffer;
    try {
      pdfBuffer = Buffer.from(cleanBase64, 'base64');
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid base64 PDF data'
      });
    }

    // Create temp file for PDF using OS temp directory for better reliability
    const tempDir = isWindows
      ? path.join(os.tmpdir(), 'kraya-print-service')
      : path.join(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFileName = `print_${Date.now()}_${Math.random().toString(36).slice(2, 11)}.pdf`;
    const tempFilePath = path.join(tempDir, tempFileName);

    // Write PDF to temp file
    fs.writeFileSync(tempFilePath, pdfBuffer);

    // Print using platform-specific command
    try {
      if (isMacOS) {
        const copies = printOptions.copies || 1;
        execSync(`lp -n ${copies} -d "${printerName}" "${tempFilePath}"`, {
          stdio: 'pipe'
        });
      } else if (isWindows) {
        // Windows: Use rundll32 printui API which reliably submits to printer queue
        const escapedPath = tempFilePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const escapedPrinter = printerName.replace(/"/g, '\\"');

        // Use rundll32 printui.dll which is the native Windows print dialog API
        // /p = print file, /n = printer name, /t = temporary print file mode
        const printCommand = `rundll32 printui.dll,PrintUIEntry /p /n "${escapedPrinter}" "${escapedPath}"`;

        console.log(`[PRINT] Executing: ${printCommand}`);

        execSync(printCommand, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          windowsHide: true,
          timeout: 10000
        });

        console.log(`[PRINT] Job submitted to printer: ${printerName}`);
      }

      // Clean up temp file with retry logic for Windows
      // Increase delay on Windows since spooler needs more time to grab the file
      const baseDelay = isWindows ? 3000 : 2000;
      const cleanupWithRetry = (filePath, retries = 8, delay = baseDelay) => {
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[CLEANUP] Removed temp file: ${filePath}`);
            }
          } catch (err) {
            if (retries > 0) {
              console.warn(`[CLEANUP] Retry (${retries} left): ${err.message}`);
              cleanupWithRetry(filePath, retries - 1, delay);
            } else {
              console.error(`[CLEANUP] Failed to delete after retries: ${filePath}`, err.message);
            }
          }
        }, delay);
      };

      cleanupWithRetry(tempFilePath);

      res.json({
        success: true,
        jobID: `job_${Date.now()}`,
        message: `Print job sent to ${printerName}`
      });
    } catch (err) {
      // Clean up on error
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (e) {
        console.error('Error deleting temp file:', e);
      }

      res.status(500).json({
        success: false,
        error: err.message || 'Failed to send print job'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Alias: print-html now just calls print (both accept base64 PDF)
app.post('/print-html', async (req, res) => {
  // Convert HTML field to pdfData for backward compatibility
  const { printerName, html, pdfData, printOptions = {} } = req.body;

  // If HTML is provided instead of PDF, send back error with instructions
  if (html && !pdfData) {
    return res.status(400).json({
      success: false,
      error: 'HTML printing should be done client-side. Please generate PDF on frontend and use /print endpoint with pdfData field.',
      hint: 'Use react-pdf or html2pdf on frontend to convert HTML → PDF, then send PDF base64 to /print endpoint'
    });
  }

  // Otherwise treat as PDF print
  req.body.pdfData = pdfData || html;
  // Forward to regular print endpoint
  const originalUrl = req.url;
  req.url = '/print';
  await app._router.handle(req, res);
});

app.listen(PORT, HOST, () => {
  console.log(`🖨️  Print Service running on http://${HOST}:${PORT}`);
  console.log(`   Platform: ${PLATFORM === 'darwin' ? 'macOS' : PLATFORM === 'win32' ? 'Windows' : 'Linux'}`);
  console.log(`\n   GET  /health              - Check service status`);
  console.log(`   GET  /printers            - List available printers`);
  console.log(`   POST /print               - Print PDF (base64 encoded)`);
  console.log(`   POST /print-html          - Print HTML`);
  console.log('');
});
