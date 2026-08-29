/**
 * Example: Using Print Service in a React Component
 *
 * This example shows how to integrate the print service with your VES printing feature.
 * Adapt this to your actual VES component.
 */

import { useEffect, useState } from 'react';
import PrintServiceClient from './src/client';

// Hook for using print service
function usePrintService(serviceUrl = 'http://localhost:3100') {
  const [printers, setPrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printClient = new PrintServiceClient(serviceUrl);

  const loadPrinters = async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await printClient.getPrinters();
      setPrinters(available);
      return available;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const printPDF = async (printerName: string, pdfData: Blob, options?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await printClient.printPDF(printerName, pdfData, options);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const printHTML = async (printerName: string, html: string, options?: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await printClient.printHTML(printerName, html, options);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    printers,
    loading,
    error,
    loadPrinters,
    printPDF,
    printHTML
  };
}

// Example VES Printer Component
export default function VESPrinterExample() {
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [vesData, setVesData] = useState({
    entryTime: new Date(),
    vehicleNumber: 'ABC-123',
    driverName: 'John Doe',
    destination: 'Warehouse A'
  });

  const { printers, loading, error, loadPrinters, printPDF } = usePrintService();

  useEffect(() => {
    loadPrinters();
  }, []);

  const generateVESPDF = async (data: any) => {
    // Example: Generate PDF using html2pdf or similar
    // This is a simplified example - adapt based on your actual VES template

    const html = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Vehicle Entry/Exit Slip</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td><strong>Vehicle Number:</strong></td>
            <td>${data.vehicleNumber}</td>
          </tr>
          <tr>
            <td><strong>Entry Time:</strong></td>
            <td>${data.entryTime.toLocaleString()}</td>
          </tr>
          <tr>
            <td><strong>Driver Name:</strong></td>
            <td>${data.driverName}</td>
          </tr>
          <tr>
            <td><strong>Destination:</strong></td>
            <td>${data.destination}</td>
          </tr>
        </table>
        <p style="margin-top: 40px; font-size: 12px; color: #999;">
          Generated: ${new Date().toLocaleString()}
        </p>
      </div>
    `;

    // Convert HTML string to Blob
    const blob = new Blob([html], { type: 'text/html' });

    // Alternatively, if using html2pdf:
    // const pdf = await html2pdf().set(options).from(html).outputPdf('blob');
    // return pdf;

    return blob;
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      alert('Please select a printer');
      return;
    }

    try {
      const pdfBlob = await generateVESPDF(vesData);
      const result = await printPDF(selectedPrinter, pdfBlob, {
        copies: 1,
        orientation: 'portrait',
        media: 'A4'
      });

      alert(`✅ Print job sent!\nJob ID: ${result.jobID}`);
    } catch (err: any) {
      alert(`❌ Print failed:\n${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h1>VES Printer</h1>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#fee',
          borderRadius: '4px',
          marginBottom: '10px',
          color: '#c33'
        }}>
          ❌ {error}
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label>
          <strong>Select Printer:</strong>
          <select
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
            style={{
              display: 'block',
              marginTop: '5px',
              padding: '8px',
              width: '100%'
            }}
          >
            <option value="">-- Choose a printer --</option>
            {printers.map((printer) => (
              <option key={printer.name} value={printer.name}>
                {printer.displayName || printer.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>VES Data Preview:</strong>
        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          overflowX: 'auto'
        }}>
          {JSON.stringify(vesData, null, 2)}
        </pre>
      </div>

      <button
        onClick={handlePrint}
        disabled={loading || !selectedPrinter}
        style={{
          padding: '10px 20px',
          backgroundColor: selectedPrinter && !loading ? '#0066cc' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || !selectedPrinter ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {loading ? '🖨️  Printing...' : '🖨️  Print VES'}
      </button>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>
          💡 Make sure the print service is running on this machine.
          <br />
          Check: <code>curl http://localhost:3100/health</code>
        </p>
      </div>
    </div>
  );
}
