import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Share2, 
  Play, 
  ExternalLink, 
  Clock, 
  Activity, 
  Youtube,
  Figma,
  Layout,
  FileText,
  Upload
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ResearchPaper, ResearchBlock } from '../types';
import { SurfaceCodeDiagram, TransformerDecoderDiagram, PerformanceMetricDiagram } from './Diagrams';
import { HeroScene } from './QuantumScene';
import { cn } from '../lib/utils';

interface ResearchViewerProps {
  paper: ResearchPaper;
  onBack: () => void;
  onEdit: () => void;
}

const getYouTubeId = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

// Helper to check if URL is already an embed and wrap if not
const getFigmaEmbedUrl = (url: string) => {
  if (url.includes('figma.com/embed')) return url;
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
};

const getCanvaEmbedUrl = (url: string) => {
  if (url.includes('canva.com/design') && url.includes('embed')) return url;
  // Canva embed URLs usually look like https://www.canva.com/design/DA.../view?embed
  if (url.includes('canva.com/design')) {
     const baseUrl = url.split('?')[0];
     return `${baseUrl}/view?embed`;
  }
  return url;
};

const BlockRenderer: React.FC<{ block: ResearchBlock }> = ({ block }) => {
  switch (block.type) {
    case 'figma':
      return (
        <div className="my-12 max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-stone-200 bg-white">
          <div className="bg-stone-50 border-b border-stone-100 px-6 py-3 flex items-center justify-between">
             <div className="flex items-center gap-2 text-stone-400">
                <Figma size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Figma Prototype</span>
             </div>
             <a href={block.content} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-stone-600 transition-colors">
                <ExternalLink size={14} />
             </a>
          </div>
          <div className="aspect-[16/10] w-full">
            <iframe 
              className="w-full h-full"
              src={getFigmaEmbedUrl(block.content)} 
              allowFullScreen
            />
          </div>
        </div>
      );
    case 'canva':
      return (
        <div className="my-12 max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-stone-200 bg-white">
           <div className="bg-stone-50 border-b border-stone-100 px-6 py-3 flex items-center justify-between">
             <div className="flex items-center gap-2 text-stone-400">
                <Layout size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Canva Asset</span>
             </div>
             <a href={block.content} target="_blank" rel="noopener noreferrer" className="text-stone-300 hover:text-stone-600 transition-colors">
                <ExternalLink size={14} />
             </a>
          </div>
          <div className="aspect-[16/9] w-full relative">
            <iframe 
              className="absolute inset-0 w-full h-full border-0"
              src={getCanvaEmbedUrl(block.content)} 
              allowFullScreen
              allow="fullscreen"
            />
          </div>
        </div>
      );
    case 'file-embed':
      return (
        <div className="my-12 max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-white rounded-3xl border border-stone-200 shadow-xl gap-6 group hover:shadow-2xl transition-all duration-300">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center shadow-inner border border-stone-100 group-hover:scale-105 transition-transform">
                   <FileText size={32} className="text-nobel-gold" />
                </div>
                <div>
                   <h4 className="text-lg font-bold text-stone-900 mb-1">{block.metadata?.fileName || 'Research Manuscript'}</h4>
                   <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                      <span>{block.metadata?.fileType || 'Document'}</span>
                      <span className="w-1 h-1 bg-stone-200 rounded-full" />
                      <span>{block.metadata?.fileSize ? `${(block.metadata.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Attached File'}</span>
                   </div>
                </div>
             </div>
             <a 
               href={block.content} 
               target="_blank" 
               rel="noopener noreferrer" 
               className="flex items-center gap-3 px-8 py-4 bg-stone-900 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition-all shadow-lg active:scale-95 shrink-0"
             >
                <Upload size={16} className="rotate-180" />
                <span>Open Manuscript</span>
             </a>
          </div>
        </div>
      );
    case 'text':
      return (
        <div className="prose prose-stone lg:prose-xl mx-auto mb-12">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );
    case 'image':
      return (
        <figure className="my-12 max-w-4xl mx-auto">
          <img 
            src={block.content} 
            alt={block.metadata?.caption} 
            className="rounded-2xl shadow-lg border border-stone-200 w-full object-cover"
          />
          {block.metadata?.caption && (
            <figcaption className="mt-4 text-center text-sm text-stone-500 font-serif italic">
              {block.metadata.caption}
            </figcaption>
          )}
        </figure>
      );
    case 'video':
      return (
        <div className="my-12 max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-stone-200">
          <video 
            src={block.content} 
            controls 
            autoPlay={block.metadata?.loop} 
            loop={block.metadata?.loop}
            muted={block.metadata?.loop}
            className="w-full"
          />
        </div>
      );
    case 'youtube':
      const vId = getYouTubeId(block.content);
      return (
        <div className="my-12 max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-xl border border-stone-200">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${vId}?autoplay=${block.metadata?.loop ? 1 : 0}&mute=${block.metadata?.loop ? 1 : 0}&loop=${block.metadata?.loop ? 1 : 0}&playlist=${vId}`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    case 'diagram':
      return (
        <div className="my-12 max-w-4xl mx-auto">
          {block.metadata?.diagramType === 'surface-code' && <SurfaceCodeDiagram />}
          {block.metadata?.diagramType === 'transformer' && <TransformerDecoderDiagram />}
          {block.metadata?.diagramType === 'performance' && <PerformanceMetricDiagram />}
          {!block.metadata?.diagramType && <div className="p-8 bg-stone-100 rounded-xl text-center text-stone-400">Diagram Not Specified</div>}
        </div>
      );
    case 'timestamp':
      return (
        <div className="flex items-center gap-4 my-8 p-4 bg-stone-50 border-l-4 border-nobel-gold rounded-r-lg max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-nobel-gold font-bold text-xs uppercase tracking-widest min-w-[100px]">
            <Clock size={14} />
            <span>{block.metadata?.timestamp || '0:00'}</span>
          </div>
          <p className="text-stone-700 italic font-serif text-lg">{block.content}</p>
        </div>
      );
    case 'ai-report':
    case 'predictor':
    case 'simulation':
      const isAIPredictor = block.type === 'predictor';
      const isSimulation = block.type === 'simulation';
      return (
        <div className={cn(
          "my-12 p-8 rounded-3xl border shadow-2xl overflow-hidden relative group transition-all duration-500",
          isAIPredictor ? "bg-stone-50 border-stone-200" : isSimulation ? "bg-stone-50 border-dashed border-stone-300" : "bg-stone-900 border-stone-800"
        )}
        style={isSimulation ? { borderColor: `var(--secondary)` } : {}}
        >
           <div className="absolute top-0 right-0 p-4">
              <Activity className={cn("animate-pulse")} style={{ color: `var(--secondary)` }} size={20} />
           </div>
           <div className="relative z-10">
              <div className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded mb-4"
                style={{ backgroundColor: `var(--secondary)22`, color: `var(--secondary)` }}
              >
                {block.type === 'predictor' ? 'Quantum Hardware Prediction' : block.type === 'simulation' ? 'Algorithmic Simulation' : 'AI Synthesis Report'}
              </div>
              <h4 className="font-serif text-2xl mb-4" style={{ color: isAIPredictor || isSimulation ? `var(--primary)` : '#FFFFFF' }}>
                {block.type === 'predictor' ? 'ML Error Analysis' : isSimulation ? 'Simulation Logs & Metrics' : 'Intelligence Insight'}
              </h4>
              
              {(isAIPredictor || isSimulation) && block.metadata?.parameters && (
                <div className="grid grid-cols-3 gap-4 mb-8 p-4 rounded-xl border" style={{ backgroundColor: `var(--bg-paper)`, borderColor: `var(--primary)11` }}>
                  {Object.entries(block.metadata.parameters).map(([key, val]) => (
                    <div key={key}>
                      <div className="text-[8px] font-bold uppercase tracking-tighter opacity-40">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-xl font-serif" style={{ color: `var(--primary)` }}>{val as string}</div>
                    </div>
                  ))}
                </div>
              )}

              {isSimulation && (
                <div className="mb-6 h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="h-full"
                    style={{ backgroundColor: `var(--secondary)` }}
                   />
                </div>
              )}

              <div className={cn(
                "prose lg:prose-lg max-w-none",
                isAIPredictor || isSimulation ? "prose-stone" : "prose-invert text-stone-400"
              )}>
                <ReactMarkdown>{block.content}</ReactMarkdown>
              </div>
           </div>
           <div className="absolute -bottom-12 -right-12 w-48 h-48 blur-[80px] rounded-full pointer-events-none" style={{ backgroundColor: `var(--secondary)11` }}></div>
        </div>
      );
    default:
      return null;
  }
};

export const ResearchViewer: React.FC<ResearchViewerProps> = ({ paper, onBack, onEdit }) => {
  const theme = paper.themeConfig || {
    primary: '#1C1917', // stone-900
    secondary: '#D4AF37', // nobel-gold
    accent: '#D4AF37',
    background: '#F9F8F4',
    text: '#1C1917'
  };

  return (
    <div 
      className="min-h-screen pb-24 transition-colors duration-1000"
      style={{ 
        backgroundColor: theme.background,
        color: theme.text,
        ['--primary' as any]: theme.primary,
        ['--secondary' as any]: theme.secondary,
        ['--accent' as any]: theme.accent,
        ['--bg-paper' as any]: theme.background,
        ['--text-main' as any]: theme.text,
      }}
    >
      <style>{`
        .selection\\:bg-nobel-gold::selection { background-color: var(--secondary); color: white; }
        .text-stone-800 { color: var(--text-main); }
        .prose-stone { --tw-prose-body: var(--text-main); --tw-prose-headings: var(--primary); }
      `}</style>
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-[100] py-4 md:py-6 px-4 md:px-6 border-b border-stone-200 shadow-sm backdrop-blur-md"
        style={{ backgroundColor: `${theme.background}CC` }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="group flex items-center gap-1.5 md:gap-2 transition-all font-bold text-[10px] md:text-xs tracking-widest uppercase cursor-pointer pointer-events-auto bg-white/50 hover:bg-white px-3 md:px-4 py-2 rounded-full border border-stone-200"
            style={{ color: theme.primary }}
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Library</span>
          </button>
          
          <div className="flex items-center gap-3 md:gap-6">
            <button className="transition-colors p-1.5 md:p-2" style={{ color: theme.secondary }}>
              <Share2 size={18} />
            </button>
            <button 
              onClick={onEdit}
              className="px-4 md:px-8 py-2 md:py-3 rounded-full transition-all font-bold text-[10px] md:text-xs tracking-widest uppercase shadow-lg shadow-stone-900/10"
              style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
            >
              Edit Manuscript
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative h-[60vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
        {paper.heroMedia.type === 'animation' && <HeroScene />}
        {paper.heroMedia.type === 'youtube' && paper.heroMedia.url && (
           <div className="absolute inset-0 z-0">
             <iframe
               width="100%"
               height="100%"
               src={`https://www.youtube.com/embed/${getYouTubeId(paper.heroMedia.url || '')}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playlist=${getYouTubeId(paper.heroMedia.url || '')}`}
               className="w-full h-full scale-[1.5] object-cover pointer-events-none grayscale-[0.5]"
               style={{ opacity: paper.heroMedia.opacity ?? 0.4 }}
               allow="autoplay"
             />
           </div>
        )}
        {paper.heroMedia.type === 'video' && paper.heroMedia.url && (
           <video 
              src={paper.heroMedia.url} 
              autoPlay 
              loop 
              muted 
              className="absolute inset-0 w-full h-full object-cover grayscale-[0.5] pointer-events-none"
              style={{ opacity: paper.heroMedia.opacity ?? 0.4 }}
           />
        )}
        {paper.heroMedia.type === 'none' && (
          <div className="absolute inset-0 bg-stone-50/50" />
        )}
        
        <div 
          className="absolute inset-0 opacity-80" 
          style={{ 
            background: `linear-gradient(to bottom, transparent, ${theme.background} 80%, ${theme.background})` 
          }} 
        />

        <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-6 px-4 py-1 border text-[10px] tracking-[0.3em] uppercase font-bold rounded-full"
            style={{ borderColor: `${theme.primary}44`, color: theme.primary }}
          >
            Published Scientific Narrative
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl md:text-8xl mb-8 leading-[0.9] tracking-tight"
            style={{ color: theme.primary }}
          >
            {paper.title}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl font-light max-w-2xl mx-auto leading-relaxed opacity-70"
          >
            {paper.subtitle}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            <div className="w-px h-16 bg-gradient-to-b from-transparent" style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${theme.primary}88)` }} />
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: theme.primary, opacity: 0.5 }}>Scroll to explore</div>
          </motion.div>
        </div>
      </header>

      {/* Authors */}
      <section className="py-12 border-b border-stone-100">
        <div className="container mx-auto px-6 flex flex-col items-center">
           <div className="flex items-center gap-3 mb-2">
              <span className="font-serif italic text-stone-400">Authored by</span>
              <span className="font-bold tracking-widest uppercase text-stone-900">{paper.author}</span>
           </div>
           <div className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase">{paper.authorRole || 'Lead Researcher'}</div>
        </div>
      </section>

      {/* Content Blocks */}
      <main className="container mx-auto px-6 pt-24 max-w-screen-xl">
        <div className="max-w-4xl mx-auto">
          {paper.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 pt-24 border-t border-stone-200">
         <div className="container mx-auto px-6 text-center">
            <h5 className="font-serif italic text-2xl text-stone-400 mb-8">Continuing the dialogue in quantum innovation.</h5>
            <div className="flex justify-center gap-12 text-[10px] font-bold tracking-[0.3em] uppercase text-stone-400">
               <a href="#" className="hover:text-stone-900 transition-colors">Methodology</a>
               <a href="#" className="hover:text-stone-900 transition-colors">Citations</a>
               <a href="#" className="hover:text-stone-900 transition-colors">Open Source</a>
            </div>
            <div className="mt-24 pb-12 text-[9px] text-stone-300 tracking-widest uppercase">
               © 2024 Aethel Research Platform • All Rights Reserved
            </div>
         </div>
      </footer>
    </div>
  );
};
