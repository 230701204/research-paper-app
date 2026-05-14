import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Book, Clock, ArrowRight, X, Upload, Loader2, Trash2, Share2 } from 'lucide-react';
import { ResearchPaper } from '../types';
import { cn } from '../lib/utils';

interface DashboardProps {
  papers: ResearchPaper[];
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
  onDelete: (paper: ResearchPaper) => void;
  onImportPDF: (file: File) => void;
  onResetLibrary: () => void;
  onShare: (paper: ResearchPaper) => void;
  isImporting?: boolean;
  currentUserId?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  papers, 
  onSelect, 
  onEdit, 
  onCreate, 
  onDelete, 
  onImportPDF,
  onResetLibrary,
  onShare,
  isImporting,
  currentUserId 
}) => {
  // Sort papers: recently accessed (updatedAt) first
  const sortedPapers = [...papers].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen bg-[#F9F8F4] pt-20 md:pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-stone-200 pb-8 gap-6">
          <div>
            <h1 className="font-serif text-3xl md:text-5xl text-stone-900 mb-2">My Research</h1>
            <p className="text-stone-500 text-sm md:text-base font-medium tracking-tight">Manage and curate your scientific narratives.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <button 
              onClick={() => document.getElementById('doc-import-input')?.click()}
              disabled={isImporting}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 border border-stone-200 rounded-full hover:bg-stone-50 transition-all font-medium shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 text-xs md:text-sm"
            >
              {isImporting ? <Loader2 size={16} className="animate-spin text-stone-900" /> : <Upload size={16} />}
              <span>{isImporting ? 'Processing...' : 'Import'}</span>
            </button>
            <input 
              id="doc-import-input"
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportPDF(file); 
                e.target.value = '';
              }}
            />
            <button 
              onClick={onCreate}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all font-medium shadow-sm hover:shadow-md active:scale-95 text-xs md:text-sm"
            >
              <Plus size={16} />
              <span>New Paper</span>
            </button>

            {papers.length > 1 && (
              <button 
                onClick={onResetLibrary}
                className="p-3 text-stone-300 hover:text-red-500 transition-colors"
                title="Reset Library (Delete all but template)"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {sortedPapers.map((paper, index) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "group bg-white border rounded-2xl p-5 md:p-6 hover:shadow-xl transition-all flex flex-col h-full relative overflow-hidden",
                paper.id === 'alpha-qubit-default' ? "border-nobel-gold/30 bg-stone-50/30" : "border-stone-200 hover:border-stone-900/10"
              )}
            >
              {paper.id === 'alpha-qubit-default' && (
                <div className="absolute top-0 left-0 px-3 py-1 bg-nobel-gold text-white text-[8px] font-bold uppercase tracking-widest rounded-br-xl z-20">
                  Featured Template
                </div>
              )}
              {paper.ownerId === currentUserId && paper.id !== 'alpha-qubit-default' && (
                <div 
                  className="absolute top-3 right-3 z-20 p-2.5 text-stone-300 hover:text-red-500 hover:bg-white rounded-xl transition-all opacity-100 md:opacity-0 group-hover:opacity-100 cursor-pointer shadow-sm border border-stone-100 bg-white/80 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(paper);
                  }}
                  title="Delete Paper"
                >
                  <X size={16} />
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <div onClick={() => onSelect(paper.id)} className="cursor-pointer mb-4 aspect-video rounded-xl bg-stone-100 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                      Read Manuscript <ArrowRight size={12} />
                    </span>
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Book size={48} strokeWidth={1} />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-bold tracking-[0.2em] text-stone-400 uppercase">
                      {new Date(paper.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <h3 onClick={() => onSelect(paper.id)} className="cursor-pointer font-serif text-2xl text-stone-900 mb-2 group-hover:text-nobel-gold transition-colors">{paper.title}</h3>
                  <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed mb-6">{paper.subtitle}</p>
                  
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => onEdit(paper.id)}
                      className="flex-1 py-2 border border-stone-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-50 hover:border-stone-900/10 transition-all"
                    >
                      Edit 
                    </button>
                    <button 
                      onClick={() => onShare(paper)}
                      className="p-2 border border-stone-200 rounded-lg text-stone-400 hover:text-stone-900 hover:border-stone-900/10 transition-all"
                      title="Share Manuscript"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-stone-50 flex items-center justify-between text-stone-400">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <div className="w-2 h-2 rounded-full bg-nobel-gold"></div>
                  {paper.author}
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <Clock size={12} />
                  <span>5 min read</span>
                </div>
              </div>
            </motion.div>
          ))}
          
          {papers.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-stone-200 rounded-3xl">
              <Book className="mx-auto text-stone-200 mb-4" size={64} strokeWidth={1} />
              <h3 className="text-xl font-serif text-stone-800 mb-2">No research papers yet</h3>
              <p className="text-stone-500 mb-8">Start your first scientific journey today.</p>
              <button 
                onClick={onCreate}
                className="inline-flex items-center gap-2 text-nobel-gold font-bold text-sm tracking-widest uppercase hover:underline"
              >
                Create First Paper <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
