import React, { useState, useEffect } from 'react';
import { extractTextFromFile } from '../lib/docUtils';
import { extractBlocksFromPDF } from '../services/importService';
import { 
  Save, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Youtube, 
  Type, 
  Sparkles, 
  Clock,
  ChevronUp,
  ChevronDown,
  Eye,
  Settings,
  Activity,
  ArrowLeft,
  Search,
  Globe,
  Loader2,
  FileText,
  Upload,
  Figma,
  Layout,
  Menu,
  X
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { ResearchPaper, ResearchBlock, BlockType } from '../types';
import { cn } from '../lib/utils';
import { HeroScene } from './QuantumScene';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AnimatePresence, motion } from 'framer-motion';

const getYouTubeId = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

interface ResearchEditorProps {
  paper: ResearchPaper;
  onSave: (paper: ResearchPaper) => void;
  onPreview: () => void;
  onBack: () => void;
  isSaving?: boolean;
  lastSaved?: number | null;
}

export const ResearchEditor: React.FC<ResearchEditorProps> = ({ 
  paper: initialPaper, 
  onSave, 
  onPreview,
  onBack,
  isSaving,
  lastSaved
}) => {
  const [paper, setPaper] = useState<ResearchPaper>(initialPaper);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const updatePaper = (updates: Partial<ResearchPaper>) => {
    setPaper(prev => ({ ...prev, ...updates, updatedAt: Date.now() }));
  };

  // Manual sync theme when media changes - removed auto-sync to prevent infinite loops
  // and resource exhaustion. The user can click the "Sync" button manually.

  const addBlock = (type: BlockType) => {
    const newBlock: ResearchBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      metadata: type === 'timestamp' 
        ? { timestamp: '0:00' } 
        : type === 'simulation'
        ? { parameters: { iterations: 1000, complexity: 'O(n^2)' } }
        : type === 'file-embed'
        ? { fileName: '', fileSize: 0, fileType: '' }
        : {}
    };
    updatePaper({ blocks: [...paper.blocks, newBlock] });
    setActiveBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    updatePaper({ blocks: paper.blocks.filter(b => b.id !== id) });
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = paper.blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    const newBlocks = [...paper.blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    updatePaper({ blocks: newBlocks });
  };

  const updateBlock = (id: string, updates: Partial<ResearchBlock>) => {
    updatePaper({
      blocks: paper.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const handlePDFImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPDF(true);
    try {
      const text = await extractTextFromFile(file);
      const newBlocks = await extractBlocksFromPDF(text);
      updatePaper({ blocks: [...paper.blocks, ...newBlocks] });
    } catch (error) {
      console.error("PDF Import to editor failed:", error);
      alert("Failed to process PDF content.");
    } finally {
      setIsProcessingPDF(false);
      e.target.value = '';
    }
  };

  const handleInBlockUpload = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const storageRef = ref(storage, `research_files/${paper.id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      updateBlock(blockId, {
        content: downloadUrl,
        metadata: {
          fileName: file.name,
          fileType: extension,
          fileSize: file.size
        }
      });
    } catch (error) {
      console.error("In-block upload failed:", error);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const generateAIContent = async (blockId: string) => {
    setIsGenerating(true);
    try {
      const block = paper.blocks.find(b => b.id === blockId);
      const existingContext = paper.blocks
        .filter(b => b.id !== blockId && b.content)
        .map(b => b.content)
        .join('\n\n')
        .slice(0, 5000); // Limit context size

      const prompt = `Research Topic: ${paper.title}. ${paper.subtitle}. 
      Current Research Context:
      ${existingContext}

      AI Task: Write a scientific paragraph that expands on the existing research or provides a technical insight related to the topic above.
      Style: Academic, clear, authoritative. Use markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const text = response.text;
      
      if (text) {
        updateBlock(blockId, { content: text, type: 'ai-report' });
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePredictorAnalysis = async (blockId: string) => {
    setIsGenerating(true);
    try {
      const block = paper.blocks.find(b => b.id === blockId);
      const params = block?.metadata?.parameters || {};
      
      const prompt = `Research Context: ${paper.title}.
      AI Task: Predict the logical error rate and feasibility for a quantum processor with:
      - Gate Error Rate: ${params.gateError || '0.001'}
      - Topology: ${params.topology || 'Square Lattice'}
      
      Provide a highly technical, realistic, and insightful analysis in Markdown. Include a 'Logical Error Rate' estimation.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const text = response.text;
      
      if (text) {
        updateBlock(blockId, { content: text });
      }
    } catch (error) {
      console.error("Predictor analysis failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSearchResearch = async (blockId: string) => {
    setIsGenerating(true);
    try {
      const block = paper.blocks.find(b => b.id === blockId);
      const query = block?.metadata?.searchQuery || paper.title;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a detailed, well-researched report on: "${query}". 
        Integrate real-world facts and use scientific language. 
        Format in Markdown with sections.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      
      const text = response.text;
      
      if (text) {
        updateBlock(blockId, { content: text, type: 'text' });
      }
    } catch (error) {
      console.error("Search Research failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const magicDraftOutline = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Create a detailed scientific research outline for: "${paper.title}". 
      Return the output as a JSON array of objects with "type" (one of: text, diagram, timestamp) and "content" (markdown string if text, diagramType string if diagram).
      Focus on Quantum computing and AI intersections.
      Example: [{"type": "text", "content": "## Abstract..."}, {"type": "diagram", "content": "transformer"}]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text || '';
      const newBlocksData = JSON.parse(text);
      
      const newBlocks: ResearchBlock[] = newBlocksData.map((d: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        type: d.type,
        content: d.content,
        metadata: d.type === 'diagram' ? { diagramType: d.content } : {}
      }));

      updatePaper({ blocks: [...paper.blocks, ...newBlocks] });
    } catch (error) {
      console.error("Magic Draft failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const syncThemeWithHero = async () => {
    setIsGenerating(true);
    try {
      const media = paper.heroMedia;
      const prompt = `Analyze this hero media description: "${media.type === 'animation' ? 'Abstract interactive quantum particle simulation' : media.url}".
      Suggest a sophisticated research-themed 5-color palette (HEX codes) that complements this media. 
      Mood: ${paper.title}. 
      Colors needed: primary, secondary, accent (vibrant), background (soft), text (dark/readable).
      Return JSON: {"primary": "#...", "secondary": "#...", "accent": "#...", "background": "#...", "text": "#..."}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text || '';
      const theme = JSON.parse(text);
      
      updatePaper({ themeConfig: theme, themeColor: theme.primary });
    } catch (error) {
      console.error("Theme generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const theme = paper.themeConfig || {
    primary: '#1C1917',
    secondary: '#D4AF37',
    accent: '#D4AF37',
    background: '#F9F8F4',
    text: '#1C1917'
  };

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden transition-colors duration-700"
      style={{ 
        backgroundColor: theme.background,
        color: theme.text,
        ['--primary' as any]: theme.primary,
        ['--secondary' as any]: theme.secondary,
        ['--accent' as any]: theme.accent,
      }}
    >
      <style>{`
        .bg-stone-50 { background-color: var(--primary)05; }
        .text-stone-900 { color: var(--primary); }
        .text-stone-600 { color: var(--text-main); opacity: 0.8; }
        .border-stone-200 { border-color: var(--primary)11; }
        .prose-stone { --tw-prose-body: var(--text-main); --tw-prose-headings: var(--primary); }
      `}</style>
      {/* Top Bar */}
      <header className="h-14 md:h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <button 
            onClick={() => onBack()} 
            className="p-1.5 md:p-2 hover:bg-stone-50 rounded-full transition-colors text-stone-400 hover:text-stone-900 flex items-center gap-2"
            title="Back to Library"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Library</span>
          </button>
          {!isMobile && <div className="h-6 w-[1px] bg-stone-200 mx-1" />}
          <button 
            onClick={() => onPreview()} 
            className="hidden sm:flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors"
            title="Read Manuscript"
          >
            {!isMobile && <div className="w-6 h-6 bg-nobel-gold rounded-full flex items-center justify-center text-white font-serif font-bold text-[10px] shrink-0">α</div>}
            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Preview Mode</span>
          </button>
          <div className="h-6 w-[1px] bg-stone-200 mx-1 hidden sm:block" />
          <input 
            value={paper.title}
            onChange={(e) => updatePaper({ title: e.target.value })}
            className="font-serif text-sm md:text-lg bg-transparent border-none focus:ring-0 w-32 md:w-64 truncate"
            placeholder="Untitled Research"
          />
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-3">
           {!isMobile && (
             <button 
               onClick={magicDraftOutline}
               disabled={isGenerating}
               className="flex items-center gap-2 px-4 py-2 bg-nobel-gold text-white rounded-full hover:bg-nobel-gold/90 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm disabled:opacity-50"
             >
               <Sparkles size={14} className={isGenerating ? "animate-spin" : ""} />
               {isGenerating ? "Magic Drafting..." : "Magic Draft"}
             </button>
           )}
          
          {!isMobile && <div className="h-6 w-[1px] bg-stone-200 mx-1" />}

          <button 
            onClick={onPreview}
            className="flex items-center gap-2 px-3 md:px-4 py-2 text-stone-600 hover:text-stone-900 transition-colors font-medium text-xs md:text-sm"
          >
            <Eye size={16} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button 
            onClick={() => onSave(paper)}
            disabled={isSaving}
            className={cn(
              "flex items-center gap-2 px-4 md:px-6 py-2 rounded-full transition-all font-medium text-xs md:text-sm shadow-sm",
              isSaving ? "bg-stone-100 text-stone-400 cursor-not-allowed" : "bg-stone-900 text-white hover:bg-stone-800"
            )}
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>

          {isMobile && (
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-stone-100 rounded-lg text-stone-900"
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Controls - Desktop Sidebar or Mobile Bottom Sheet */}
        <AnimatePresence>
          {(isSidebarOpen || !isMobile) && (
            <motion.aside 
              initial={isMobile ? { y: '100%' } : { x: 0 }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "bg-white border-stone-200 p-6 flex flex-col gap-8 overflow-y-auto shrink-0 z-50",
                isMobile 
                  ? "fixed inset-x-0 bottom-0 h-[80vh] border-t rounded-t-[2.5rem] shadow-2xl" 
                  : "w-64 border-r"
              )}
            >
              {isMobile && (
                <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto -mt-2 mb-4 shrink-0" />
              )}
          <div>
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Plus size={12} /> Add Content
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 mb-6">
              {[
                { type: 'text', icon: Type, label: 'Text' },
                { type: 'file-embed', icon: Upload, label: 'Upload' },
                { type: 'image', icon: ImageIcon, label: 'Image' },
                { type: 'video', icon: Video, label: 'Video' },
                { type: 'youtube', icon: Youtube, label: 'YouTube' },
                { type: 'diagram', icon: Activity, label: 'Diagram' },
                { type: 'timestamp', icon: Clock, label: 'Timestamp' },
                { type: 'predictor', icon: Sparkles, label: 'Predictor' },
                { type: 'simulation', icon: Layout, label: 'Sim' },
                { type: 'figma', icon: Figma, label: 'Figma' },
                { type: 'canva', icon: Layout, label: 'Canva' },
                { type: 'search-researcher', icon: Search, label: 'Researcher' }
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => {
                    addBlock(item.type as BlockType);
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-stone-100 bg-stone-50 hover:bg-stone-100 hover:border-stone-200 transition-all text-stone-600 group"
                >
                  <item.icon size={20} className="mb-2 group-hover:text-nobel-gold" />
                  <span className="text-[10px] font-bold uppercase">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
               <button 
                onClick={() => document.getElementById('editor-doc-import')?.click()}
                disabled={isProcessingPDF || isUploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 border border-stone-900 rounded-xl hover:bg-stone-800 transition-all text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                title="Extract text from document into edit blocks"
               >
                  {isProcessingPDF ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>{isProcessingPDF ? "Extracting..." : "Smart PDF Import"}</span>
               </button>
               
               <input 
                 id="editor-doc-import"
                 type="file"
                 accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                 className="hidden"
                 onChange={handlePDFImport}
               />
            </div>
          </div>

          <div>
             <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings size={12} /> Narrative Design
            </h4>
            <div className="space-y-4">
              <button 
                onClick={syncThemeWithHero}
                disabled={isGenerating}
                className="w-full py-2 bg-stone-900 text-nobel-gold rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles size={12} className={isGenerating ? "animate-spin" : ""} />
                {isGenerating ? "Processing Palette..." : "Sync ML Theme"}
              </button>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-[8px] font-bold text-stone-300 uppercase tracking-widest mb-3">Manual Palette</div>
                <div className="space-y-3">
                  {['primary', 'secondary', 'accent', 'background', 'text'].map((type) => (
                    <div key={type} className="flex items-center justify-between gap-3">
                      <label className="text-[9px] text-stone-400 capitalize font-bold tracking-tight">{type}</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color"
                          value={(paper.themeConfig as any)?.[type] || (type === 'background' ? '#F9F8F4' : '#1C1917')}
                          onChange={(e) => {
                            const newTheme = { ... (paper.themeConfig || {
                              primary: '#1C1917',
                              secondary: '#D4AF37',
                              accent: '#D4AF37',
                              background: '#F9F8F4',
                              text: '#1C1917'
                            }), [type]: e.target.value };
                            updatePaper({ themeConfig: newTheme, themeColor: newTheme.primary });
                          }}
                          className="w-6 h-6 rounded-lg border-none p-0 cursor-pointer overflow-hidden bg-transparent"
                        />
                        <span className="text-[8px] font-mono text-stone-300">{(paper.themeConfig as any)?.[type]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                <div className="text-[8px] font-bold text-stone-300 uppercase tracking-widest mb-2">Current Palette</div>
                <div className="flex gap-1">
                  {paper.themeConfig && Object.entries(paper.themeConfig).map(([key, color]) => (
                    <div 
                      key={key} 
                      className="w-full h-4 rounded-sm border border-stone-100" 
                      style={{ backgroundColor: color }}
                      title={`${key}: ${color}`}
                    />
                  ))}
                  {!paper.themeConfig && <div className="text-[10px] text-stone-300 italic">Sync theme to see palette</div>}
                </div>
              </div>
            </div>
          </div>

              {isMobile && (
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="mt-4 w-full py-3 bg-stone-100 text-stone-900 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                >
                  Close Controls
                </button>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        {isMobile && isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40"
          />
        )}

        {/* Editor Stage */}
        <main className="flex-1 overflow-y-auto p-4 md:p-12 bg-stone-50 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pb-24 md:pb-32">
            
            {/* Hero Media Configurator - At the top as requested */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-12">
               <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                     <Sparkles size={12} className="text-nobel-gold" />
                     Manuscript Hero Animation / Video
                  </div>
                  <div className="flex items-center gap-1">
                     {(['none', 'youtube', 'video', 'animation'] as const).map(type => (
                       <button
                        key={type}
                        onClick={() => updatePaper({ heroMedia: { ...paper.heroMedia, type } })}
                        className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all",
                          paper.heroMedia.type === type 
                          ? "bg-stone-900 text-white shadow-sm"
                          : "text-stone-400 hover:text-stone-900 hover:bg-stone-100"
                        )}
                       >
                         {type}
                       </button>
                     ))}
                  </div>
               </div>
               
               <div className="p-8">
                  {paper.heroMedia.type === 'none' ? (
                    <div className="text-center py-6">
                       <Layout size={32} className="mx-auto text-stone-200 mb-3" strokeWidth={1} />
                       <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">No Hero Media Selected</p>
                       <p className="text-xs text-stone-400 mt-1 italic">Select a type above to add a cinematic entrance to your manuscript.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <div className="flex-1">
                             <label className="text-[10px] uppercase text-stone-400 font-bold tracking-widest mb-2 block">
                               {paper.heroMedia.type === 'youtube' ? 'YouTube URL' : paper.heroMedia.type === 'video' ? 'Video File URL' : 'Animation Prompt'}
                             </label>
                             <div className="relative group">
                                {paper.heroMedia.type === 'youtube' ? <Youtube size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" /> : paper.heroMedia.type === 'video' ? <Video size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" /> : <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" />}
                                <input 
                                  value={paper.heroMedia.url || ''}
                                  onChange={(e) => updatePaper({ heroMedia: { ...paper.heroMedia, url: e.target.value } })}
                                  className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:border-stone-900 outline-none transition-all placeholder:text-stone-300"
                                  placeholder={
                                    paper.heroMedia.type === 'youtube' ? "https://youtube.com/watch?v=..." :
                                    paper.heroMedia.type === 'video' ? "https://example.com/video.mp4" :
                                    "e.g. Glowing quantum particles, Fluid neon waves..."
                                  }
                                />
                             </div>
                          </div>
                          <div className="w-32">
                             <label className="text-[10px] uppercase text-stone-400 font-bold tracking-widest mb-2 block">
                               Hero Opacity
                             </label>
                             <div className="flex items-center gap-3">
                                <input 
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={paper.heroMedia.opacity ?? 0.4}
                                  onChange={(e) => updatePaper({ heroMedia: { ...paper.heroMedia, opacity: parseFloat(e.target.value) } })}
                                  className="flex-1 accent-stone-900"
                                />
                                <span className="text-[10px] font-mono text-stone-400 w-6">
                                  {Math.round((paper.heroMedia.opacity ?? 0.4) * 100)}%
                                </span>
                             </div>
                          </div>
                          <button 
                            onClick={syncThemeWithHero}
                            disabled={isGenerating || !paper.heroMedia.url}
                            className="mt-6 p-4 bg-stone-900 text-nobel-gold rounded-2xl hover:scale-105 transition-all disabled:opacity-20 shadow-lg shadow-stone-200"
                            title="Sync Theme with Media"
                          >
                            <Sparkles size={18} className={isGenerating ? "animate-spin" : ""} />
                          </button>
                       </div>
                       <p className="text-[10px] text-stone-400 italic">
                          {paper.heroMedia.type === 'youtube' && "This video will play in a loop as the background of your publication."}
                          {paper.heroMedia.type === 'video' && "Provide a direct link to a video file (.mp4) for a clean background loop."}
                          {paper.heroMedia.type === 'animation' && "Enter a description for the generative AI to create a unique quantum animation style."}
                       </p>
                       
                       {/* Visual Preview */}
                       {paper.heroMedia.url && (
                         <div className="mt-6 aspect-video rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 relative">
                            {paper.heroMedia.type === 'youtube' && (
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${getYouTubeId(paper.heroMedia.url)}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playlist=${getYouTubeId(paper.heroMedia.url)}`}
                                className="w-full h-full object-cover scale-110 pointer-events-none"
                                style={{ opacity: paper.heroMedia.opacity ?? 0.4 }}
                              />
                            )}
                            {paper.heroMedia.type === 'video' && (
                              <video 
                                src={paper.heroMedia.url}
                                autoPlay
                                muted
                                loop
                                className="w-full h-full object-cover"
                                style={{ opacity: paper.heroMedia.opacity ?? 0.4 }}
                              />
                            )}
                            {paper.heroMedia.type === 'animation' && (
                              <div className="w-full h-full flex items-center justify-center bg-stone-900 overflow-hidden">
                                 <HeroScene />
                                 <div className="absolute inset-0 bg-stone-900" style={{ opacity: 1 - (paper.heroMedia.opacity ?? 0.4) }} />
                              </div>
                            )}
                            <div className="absolute top-4 left-4 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[8px] font-bold text-white uppercase tracking-widest">
                               Live Preview
                            </div>
                         </div>
                       )}
                    </div>
                  )}
               </div>
            </div>

            {/* Metadata Editor */}
            <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm mb-12">
               <input 
                 value={paper.subtitle}
                 onChange={(e) => updatePaper({ subtitle: e.target.value })}
                 className="w-full text-xl text-stone-500 font-light italic mb-4 bg-transparent border-none focus:ring-0 p-0"
                 placeholder="Enter subtitle..."
               />
               <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-stone-400">
                  <span className="flex items-center gap-2">
                    Author: 
                    <input 
                      value={paper.author}
                      onChange={(e) => updatePaper({ author: e.target.value })}
                      className="bg-transparent border-none focus:ring-0 p-0 text-stone-800"
                    />
                  </span>
               </div>
            </div>

            {/* Block List */}
            {paper.blocks.map((block, idx) => (
              <div 
                key={block.id}
                className={cn(
                  "relative group bg-white rounded-2xl border transition-all duration-300",
                  activeBlock === block.id ? "border-nobel-gold ring-1 ring-nobel-gold/20 shadow-lg" : "border-stone-200 shadow-sm hover:border-stone-300"
                )}
                onClick={() => setActiveBlock(block.id)}
              >
                {/* Block Controls - Mobile Optimized */}
                <div className={cn(
                  "absolute flex flex-row md:flex-col gap-1 md:gap-2 transition-all duration-300 z-10",
                  isMobile 
                    ? "right-2 -top-10 scale-90" 
                    : "-right-12 top-0 opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0"
                )}>
                  <button onClick={() => moveBlock(block.id, 'up')} className="p-2 bg-white rounded-full border border-stone-200 hover:text-nobel-gold shadow-sm"><ChevronUp size={16} /></button>
                  <button onClick={() => moveBlock(block.id, 'down')} className="p-2 bg-white rounded-full border border-stone-200 hover:text-nobel-gold shadow-sm"><ChevronDown size={16} /></button>
                  <button onClick={() => removeBlock(block.id)} className="p-3 md:p-2 bg-white rounded-full border border-stone-200 text-red-400 hover:text-red-600 shadow-sm"><Trash2 size={16} /></button>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-stone-300 uppercase tracking-widest">
                     <span>BLOCK {idx + 1}</span>
                     <span>•</span>
                     <span>{block.type}</span>
                  </div>
                  {block.type === 'text' || block.type === 'ai-report' || block.type === 'predictor' || block.type === 'search-researcher' || block.type === 'simulation' ? (
                    <div className="relative">
                      {(block.type === 'predictor' || block.type === 'simulation') && (
                        <div className="mb-6 space-y-4">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Model Parameters</label>
                              <button 
                                onClick={() => {
                                  const key = prompt("Parameter name (e.g. Temperature, Depth):");
                                  if (key) {
                                    updateBlock(block.id, { 
                                      metadata: { 
                                        ...block.metadata, 
                                        parameters: { 
                                          ...block.metadata?.parameters, 
                                          [key]: '' 
                                        } 
                                      } 
                                    });
                                  }
                                }}
                                className="text-[9px] font-bold text-nobel-gold hover:underline uppercase tracking-widest"
                              >
                                + Add Param
                              </button>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {Object.entries(block.metadata?.parameters || {}).map(([key, val]) => (
                                <div key={key} className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex flex-col gap-1">
                                   <div className="flex items-center justify-between">
                                      <label className="text-[8px] font-bold text-stone-400 uppercase tracking-[0.05em] truncate">{key}</label>
                                      <button 
                                        onClick={() => {
                                          const newParams = { ...block.metadata?.parameters };
                                          delete newParams[key];
                                          updateBlock(block.id, { metadata: { ...block.metadata, parameters: newParams } });
                                        }}
                                        className="text-stone-300 hover:text-red-400"
                                      >
                                        <X size={10} />
                                      </button>
                                   </div>
                                   <input 
                                     type="text"
                                     value={val as string}
                                     onChange={(e) => updateBlock(block.id, { 
                                       metadata: { 
                                         ...block.metadata, 
                                         parameters: { 
                                           ...block.metadata?.parameters, 
                                           [key]: e.target.value 
                                         } 
                                       } 
                                     })}
                                     className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs font-medium text-stone-900"
                                     placeholder="Value..."
                                   />
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                      
                      {block.type === 'search-researcher' && (
                        <div className="mb-4 p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center gap-3">
                           <Globe size={16} className="text-stone-400" />
                           <input 
                             type="text"
                             placeholder="Enter research topic (e.g. History of Cuba)..."
                             value={block.metadata?.searchQuery || ''}
                             onChange={(e) => updateBlock(block.id, { metadata: { ...block.metadata, searchQuery: e.target.value } })}
                             className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-serif"
                           />
                        </div>
                      )}
                      
                      <textarea 
                        value={block.content}
                        onChange={(e) => {
                          updateBlock(block.id, { content: e.target.value });
                          // Auto-resize
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onFocus={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        className={cn(
                          "w-full p-0 bg-transparent border-none focus:ring-0 prose prose-stone lg:prose-xl resize-none overflow-hidden",
                          block.type === 'search-researcher' ? "min-h-[100px] opacity-70" : 
                          block.type === 'simulation' ? "bg-stone-900 text-stone-300 font-mono text-xs p-4 rounded-2xl min-h-[100px]" :
                          "min-h-[150px]"
                        )}
                        placeholder={
                          block.type === 'predictor' ? "Analyze configuration with AI..." : 
                          block.type === 'search-researcher' ? "The AI will use your query above to generate research content here." :
                          "Start typing your research..."
                        }
                        readOnly={block.type === 'search-researcher' && !block.content}
                      />
                      {(block.type === 'ai-report' || block.type === 'predictor' || block.type === 'search-researcher') && (
                        <div className="absolute bottom-0 right-0 p-2">
                          <button 
                            disabled={isGenerating}
                            onClick={() => {
                              if (block.type === 'predictor') generatePredictorAnalysis(block.id);
                              else if (block.type === 'search-researcher') generateSearchResearch(block.id);
                              else generateAIContent(block.id);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-nobel-gold rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                          >
                            <Sparkles size={16} />
                            {block.type === 'search-researcher' && <span className="text-[10px] font-bold uppercase tracking-widest">Ground & Generate</span>}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : block.type === 'timestamp' ? (
                     <div className="flex items-center gap-4">
                        <input 
                          type="text"
                          value={block.metadata?.timestamp}
                          onChange={(e) => updateBlock(block.id, { metadata: { ...block.metadata, timestamp: e.target.value } })}
                          className="w-24 p-2 bg-stone-50 border border-stone-100 rounded text-xs font-mono"
                          placeholder="0:00"
                        />
                        <input 
                          type="text"
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          className="flex-1 p-2 bg-stone-50 border border-stone-100 rounded text-sm italic font-serif"
                          placeholder="Note at this time..."
                        />
                     </div>
                   ) : block.type === 'diagram' ? (
                     <div className="space-y-4">
                       <select 
                         value={block.metadata?.diagramType}
                         onChange={(e) => updateBlock(block.id, { metadata: { ...block.metadata, diagramType: e.target.value } })}
                         className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs"
                       >
                          <option value="">Select Diagram...</option>
                          <option value="surface-code">Surface Code Interactive</option>
                          <option value="transformer">Transformer Architecture</option>
                          <option value="performance">Performance Metric Chart</option>
                       </select>
                       <div className="p-12 border-2 border-dashed border-stone-100 rounded-xl flex items-center justify-center text-stone-300">
                          {block.metadata?.diagramType ? "Interactive Diagram Selected" : "No Diagram Configured"}
                       </div>
                     </div>
                   ) : block.type === 'file-embed' ? (
                     <div className="space-y-4">
                       {!block.content ? (
                         <div className="p-8 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 flex flex-col items-center justify-center gap-3">
                            {isUploading ? (
                              <Loader2 size={24} className="animate-spin text-nobel-gold" />
                            ) : (
                              <Upload size={24} className="text-stone-300" />
                            )}
                            <div className="text-center">
                               <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{isUploading ? "Uploading..." : "No File Attached"}</p>
                               <p className="text-[10px] text-stone-400 mt-1 italic">PDF, Word, or PowerPoint to embed.</p>
                            </div>
                            {!isUploading && (
                              <button 
                                onClick={() => document.getElementById(`file-upload-${block.id}`)?.click()}
                                className="px-6 py-2 bg-stone-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-md mt-2"
                              >
                                 Choose File
                              </button>
                            )}
                            <input 
                              id={`file-upload-${block.id}`}
                              type="file"
                              className="hidden"
                              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
                              onChange={(e) => handleInBlockUpload(e, block.id)}
                            />
                         </div>
                       ) : (
                         <div className="flex items-center justify-between p-5 bg-stone-50 rounded-2xl border border-stone-200 group/file">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-stone-100">
                                  <FileText size={24} className="text-nobel-gold" />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-stone-900 truncate max-w-[200px]">{block.metadata?.fileName || 'Attached Manuscript'}</p>
                                  <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                                    {block.metadata?.fileSize ? `${(block.metadata.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'} • {block.metadata?.fileType || 'file'}
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => updateBlock(block.id, { content: '', metadata: {} })}
                                className="p-2.5 text-stone-300 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-stone-100"
                                title="Remove File"
                              >
                                 <Trash2 size={16} />
                              </button>
                            </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-4">
                        <input 
                         value={block.content}
                         onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                         className="w-full p-2 bg-stone-50 border border-stone-200 rounded text-xs"
                         placeholder={`Enter ${block.type} URL...`}
                       />
                        <input 
                         value={block.metadata?.caption || ''}
                         onChange={(e) => updateBlock(block.id, { metadata: { ...block.metadata, caption: e.target.value } })}
                         className="w-full p-2 bg-stone-50 border border-stone-100 rounded text-[10px] italic font-serif"
                         placeholder="Enter caption (optional)"
                       />
                     </div>
                   )}
                </div>
              </div>
            ))}

            {paper.blocks.length === 0 && (
              <div className="py-24 text-center border-2 border-dashed border-stone-200 rounded-3xl opacity-50">
                 <Layout size={48} className="mx-auto text-stone-300 mb-4" strokeWidth={1} />
                 <p className="font-serif text-lg text-stone-400 italic">Select a component from the sidebar to begin building.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
