import { GoogleGenAI } from '@google/genai';
import { ResearchPaper, ResearchBlock } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function structurePDFContent(text: string, userId: string): Promise<ResearchPaper> {
  const prompt = `
    You are a research assistant tasked with converting extracted scientific text from a PDF into an immersive digital manuscript format.
    
    EXTRACTED TEXT:
    ${text.slice(0, 10000)} // Truncate to stay within context limits if raw text is huge
    
    TASK:
    1. Identify the Title, Subtitle, and Author.
    2. Organize the content into meaningful "blocks".
    3. Block types allowed: "text", "diagram", "simulation", "predictor", "youtube", "video", "timestamp".
    4. For "text" blocks, use technical but readable Markdown.
    
    OUTPUT FORMAT:
    Return ONLY a JSON object that matches the following structure:
    {
      "title": "Title of the paper",
      "subtitle": "Subtitle or summary line",
      "author": "Name of the main author",
      "blocks": [
        { "type": "text", "content": "Markdown content..." },
        { "type": "diagram", "content": "diagram description or type", "metadata": { "diagramType": "surface-code" } },
        ...
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    const paper: ResearchPaper = {
      id: Math.random().toString(36).substr(2, 12),
      title: result.title || 'Imported Manuscript',
      subtitle: result.subtitle || 'Generated from PDF analysis',
      author: result.author || 'Imported Author',
      authorRole: 'Contributor',
      themeColor: '#1C1917',
      heroMedia: { type: 'none' },
      blocks: (result.blocks || []).map((b: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: b.type || 'text',
        content: b.content || '',
        metadata: b.metadata || {}
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: userId
    };

    return paper;
  } catch (error) {
    console.error("Failed to structure PDF content:", error);
    throw error;
  }
}

export async function extractBlocksFromPDF(text: string): Promise<ResearchBlock[]> {
  const prompt = `
    You are a research assistant tasked with converting extracted scientific text from a PDF into research blocks for an immersive digital manuscript.
    
    EXTRACTED TEXT:
    ${text.slice(0, 10000)}
    
    TASK:
    Organize the relevant content into meaningful "blocks".
    Block types allowed: "text", "diagram", "simulation", "predictor", "youtube", "video", "timestamp".
    
    OUTPUT FORMAT:
    Return ONLY a JSON array of blocks:
    [
      { "type": "text", "content": "Markdown content..." },
      { "type": "diagram", "content": "diagram description", "metadata": { "diagramType": "surface-code" } }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '[]');
    
    return result.map((b: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      type: b.type || 'text',
      content: b.content || '',
      metadata: b.metadata || {}
    }));
  } catch (error) {
    console.error("Failed to extract blocks from PDF:", error);
    throw error;
  }
}
