// Document parsing utilities for extracting text content from various file types

// Dynamically import PDF.js only when needed
let pdfjsLib: any = null;

const loadPdfJs = async () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('PDF.js can only be loaded in browser environment');
    return null;
  }
  
  if (!pdfjsLib) {
    try {
      // Dynamically import PDF.js
      const pdfModule: any = await import('pdfjs-dist/build/pdf.min.mjs');
      pdfjsLib = pdfModule.default || pdfModule;
      
      // Try to set up the worker properly
      try {
        // First, try to import the worker module directly
        const workerModule: any = await import('pdfjs-dist/build/pdf.worker.min.mjs');
        const worker = workerModule.default || workerModule;
        
        // For newer versions of pdfjs-dist, we might not need to set workerSrc
        // But if we do, set it to the imported module
        if (worker && typeof worker === 'string') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = worker;
        } else if (worker && worker.url) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = worker.url;
        }
        // If worker is a module object, pdfjs should handle it automatically
      } catch (workerImportError) {
        console.warn('Failed to import PDF worker module directly:', workerImportError);
        
        // Try setting workerSrc to the module path
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.min.mjs';
        } catch (workerSrcError) {
          console.warn('Failed to set PDF worker source:', workerSrcError);
          // If all else fails, let PDF.js use its default worker
        }
      }
    } catch (pdfImportError) {
      console.error('Failed to import PDF.js module:', pdfImportError);
      return null;
    }
  }
  return pdfjsLib;
};

// Parse PDF documents
export const parsePdf = async (data: string): Promise<string> => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('PDF parsing can only be done in browser environment');
    return '';
  }
  
  try {
    const pdfjs = await loadPdfJs();
    if (!pdfjs) {
      console.warn('Failed to load PDF.js library');
      return '';
    }
    
    // Check if data is valid
    if (!data || typeof data !== 'string') {
      console.warn('Invalid PDF data: data is not a string');
      return '';
    }
    
    // Check if this looks like a PDF (should start with data:application/pdf or contain PDF header)
    if (!data.startsWith('data:application/pdf') && !data.includes('JVBERi0')) {
      // JVBERi0 is the base64 encoding of "%PDF-" which is the PDF header
      console.warn('Data does not appear to be a valid PDF');
      return '';
    }
    
    // Convert base64 to binary
    const base64Data = data.split(',')[1];
    if (!base64Data) {
      console.warn('Invalid PDF data format: missing base64 data');
      return '';
    }
    
    let binary;
    try {
      binary = atob(base64Data);
    } catch (decodeError) {
      console.warn('Failed to decode PDF base64 data:', decodeError);
      return '';
    }
    
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    // Check if we have valid PDF data
    if (bytes.length === 0) {
      console.warn('Empty PDF data');
      return '';
    }
    
    // Load the PDF with proper error handling
    try {
      // Create a loading task with proper parameters
      const loadingTask = pdfjsLib.getDocument({
        data: bytes.buffer,
        verbosity: 0 // Reduce verbosity to minimize console output
      });
      
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout')), 10000);
      });
      
      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
      
      // Check if we got a valid PDF document
      if (!pdf || !pdf.numPages) {
        console.warn('Loaded PDF document is invalid or has no pages');
        return '';
      }
      
      let textContent = '';
      
      // Extract text from each page (limit to first 10 pages)
      const maxPages = Math.min(pdf.numPages, 10);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          const pageText = text.items.map((item: any) => item.str).join(' ');
          textContent += pageText + '\n\n';
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }
      
      return textContent.trim();
    } catch (pdfError) {
      console.error('Error loading PDF document:', pdfError);
      // Return empty string instead of throwing to prevent app crashes
      return '';
    }
  } catch (error) {
    console.error('Error parsing PDF:', error);
    // Return empty string instead of throwing to prevent app crashes
    return '';
  }
};

// Parse Word documents (.docx)
export const parseDocx = async (data: string): Promise<string> => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('DOCX parsing can only be done in browser environment');
    return '';
  }
  
  try {
    // Check if data is valid
    if (!data || typeof data !== 'string') {
      console.warn('Invalid DOCX data: data is not a string');
      return '';
    }
    
    const mammothModule: any = await import('mammoth');
    const mammoth = mammothModule.default || mammothModule;
    
    // Convert base64 to binary
    const base64Data = data.split(',')[1];
    if (!base64Data) {
      console.warn('Invalid DOCX data format: missing base64 data');
      return '';
    }
    
    let binary;
    try {
      binary = atob(base64Data);
    } catch (decodeError) {
      console.warn('Failed to decode DOCX base64 data:', decodeError);
      return '';
    }
    
    const arrayBuffer = new ArrayBuffer(binary.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    
    // Check if we have valid DOCX data
    if (uint8Array.length === 0) {
      console.warn('Empty DOCX data');
      return '';
    }
    
    // Parse the document
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    // Return empty string instead of throwing to prevent app crashes
    return '';
  }
};

// Parse plain text files
export const parseText = (data: string): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('Text parsing can only be done in browser environment');
    return '';
  }
  
  try {
    // Check if data is valid
    if (!data || typeof data !== 'string') {
      console.warn('Invalid text data: data is not a string');
      return '';
    }
    
    // Decode base64
    const base64Data = data.split(',')[1];
    if (!base64Data) {
      console.warn('Invalid text data format: missing base64 data');
      return '';
    }
    
    return atob(base64Data);
  } catch (error) {
    console.error('Error parsing text file:', error);
    // Return empty string instead of throwing to prevent app crashes
    return '';
  }
};

// Parse RTF files (basic implementation)
export const parseRtf = (data: string): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('RTF parsing can only be done in browser environment');
    return '';
  }
  
  try {
    // Check if data is valid
    if (!data || typeof data !== 'string') {
      console.warn('Invalid RTF data: data is not a string');
      return '';
    }
    
    // Decode base64
    const base64Data = data.split(',')[1];
    if (!base64Data) {
      console.warn('Invalid RTF data format: missing base64 data');
      return '';
    }
    
    const rtfContent = atob(base64Data);
    
    // Basic RTF parsing - remove RTF formatting tags
    // This is a simplified implementation
    let text = rtfContent;
    
    // Remove RTF control words and groups
    text = text.replace(/\\[a-z]+\d*/gi, ''); // Remove control words
    text = text.replace(/[{}]/g, ''); // Remove braces
    text = text.replace(/\\/g, ''); // Remove backslashes
    
    return text.trim();
  } catch (error) {
    console.error('Error parsing RTF file:', error);
    // Return empty string instead of throwing to prevent app crashes
    return '';
  }
};

// Main function to parse documents based on type
export const parseDocument = async (data: string, type: string): Promise<string> => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('Document parsing can only be done in browser environment');
    return '';
  }
  
  // Check if data and type are valid
  if (!data || !type || typeof data !== 'string' || typeof type !== 'string') {
    console.warn('Invalid document data or type');
    return '';
  }
  
  // Clean the data URL if it has a prefix
  let cleanData = data;
  if (data.startsWith('data:')) {
    cleanData = data;
  } else if (type.includes('pdf')) {
    cleanData = `data:application/pdf;base64,${data}`;
  } else if (type.includes('word')) {
    cleanData = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${data}`;
  } else if (type.includes('text') || type.includes('plain')) {
    cleanData = `data:text/plain;base64,${data}`;
  } else if (type.includes('rtf')) {
    cleanData = `data:text/rtf;base64,${data}`;
  }
  
  try {
    if (type.includes('pdf')) {
      return await parsePdf(cleanData);
    } else if (type.includes('word') || type.includes('docx')) {
      return await parseDocx(cleanData);
    } else if (type.includes('text') || type.includes('plain')) {
      return parseText(cleanData);
    } else if (type.includes('rtf')) {
      return parseRtf(cleanData);
    } else {
      console.warn(`Unsupported document type: ${type}`);
      return '';
    }
  } catch (error) {
    console.error('Error parsing document:', error);
    // Return empty string instead of throwing to prevent app crashes
    return '';
  }
};

export const extractDocumentContentForAI = async (attachment: any): Promise<{ content: string; error?: string }> => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.warn('Document content extraction can only be done in browser environment');
    return { content: '' };
  }
  
  try {
    // Check if attachment is valid
    if (!attachment || !attachment.data || !attachment.type) {
      console.warn('Invalid attachment data');
      return { content: '' };
    }
    
    const content = await parseDocument(attachment.data, attachment.type);
    return { content };
  } catch (error) {
    console.error('Error extracting document content:', error);
    return { 
      content: '', 
      error: error instanceof Error ? error.message : 'Failed to extract document content' 
    };
  }
};