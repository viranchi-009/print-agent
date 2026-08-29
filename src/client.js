/**
 * Print Service Client
 * Browser-side client for communicating with the print service
 * Usage: import { PrintServiceClient } from '@/lib/print-client.js'
 */

class PrintServiceClient {
  constructor(baseUrl = 'http://localhost:3100') {
    this.baseUrl = baseUrl;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getPrinters() {
    try {
      const response = await fetch(`${this.baseUrl}/printers`);
      if (!response.ok) throw new Error('Failed to fetch printers');
      const data = await response.json();
      return data.printers || [];
    } catch (error) {
      throw new Error(`Failed to get printers: ${error.message}`);
    }
  }

  /**
   * Print a PDF document
   * @param {string} printerName - Name of the printer
   * @param {Blob|ArrayBuffer} pdfData - PDF file as Blob or ArrayBuffer
   * @param {Object} options - Print options (optional)
   * @returns {Promise<Object>} Job details
   */
  async printPDF(printerName, pdfData, options = {}) {
    try {
      if (!printerName) throw new Error('Printer name is required');
      if (!pdfData) throw new Error('PDF data is required');

      // Convert Blob to base64
      const pdfBase64 = await this._blobToBase64(pdfData);

      const response = await fetch(`${this.baseUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName,
          pdfData: pdfBase64.split(',')[1], // Remove data:application/pdf;base64, prefix
          printOptions: options
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Print failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Print error: ${error.message}`);
    }
  }

  /**
   * Print HTML content
   * @param {string} printerName - Name of the printer
   * @param {string} html - HTML content to print
   * @param {Object} options - Print options (optional)
   * @returns {Promise<Object>} Job details
   */
  async printHTML(printerName, html, options = {}) {
    try {
      if (!printerName) throw new Error('Printer name is required');
      if (!html) throw new Error('HTML content is required');

      const response = await fetch(`${this.baseUrl}/print-html`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerName,
          html,
          printOptions: options
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Print failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Print error: ${error.message}`);
    }
  }

  /**
   * Convert Blob to base64 string
   * @private
   */
  async _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export default PrintServiceClient;
