import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// PDF settings
const PDFJS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return extractTextFromPDF(file);
    case 'docx':
    case 'doc':
      return extractTextFromWord(file);
    case 'pptx':
    case 'ppt':
      return extractTextFromPPT(file);
    case 'txt':
      return file.text();
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  return fullText.trim();
}

async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromPPT(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  let fullText = '';
  
  // PPTX stores slides in ppt/slides/slide[n].xml
  const slideFiles = Object.keys(zip.files).filter(name => 
    name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  ).sort();

  for (const slidePath of slideFiles) {
    const slideXml = await zip.file(slidePath)?.async('text');
    if (slideXml) {
      // Basic regex to pull text out of XML tags <a:t>...</a:t>
      const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);
      if (textMatches) {
        const slideText = textMatches
          .map(m => m.replace(/<[^>]+>/g, ''))
          .join(' ');
        fullText += `[Slide] ${slideText}\n\n`;
      }
    }
  }
  
  return fullText.trim() || 'No text found in presentation slides.';
}

export function isSupportedFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt'].includes(extension || '');
}
