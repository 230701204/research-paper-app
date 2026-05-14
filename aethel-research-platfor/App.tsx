
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage, signInWithGoogle, OperationType, handleFirestoreError } from './lib/firebase';
import { ResearchPaper, ResearchBlock } from './types';
import { Dashboard } from './components/Dashboard';
import { ResearchViewer } from './components/ResearchViewer';
import { ResearchEditor } from './components/ResearchEditor';
import { ALPHA_QUBIT_PAPER } from './constants';
import { LandingPage } from './components/LandingPage';
import { Settings } from './components/Settings';
import { extractTextFromFile } from './lib/docUtils';
import { structurePDFContent } from './services/importService';
import { Settings as SettingsIcon, Loader2, Save, LogIn, LogOut, ChevronUp, ChevronDown, User as UserIcon, Home, BookOpen, Edit3, Grid } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { cn } from './lib/utils';
import { useMediaQuery } from './hooks/useMediaQuery';

type ViewState = 'dashboard' | 'editor' | 'viewer' | 'settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<ResearchPaper | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState('');
  const [createStep, setCreateStep] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>(['text']);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const layouts = {
    standard: [
      { type: 'text', content: '## Abstract\n\nStart your abstract here...' },
      { type: 'text', content: '## Introduction\n\nExplain the context and problem...' },
      { type: 'diagram', content: 'blueprint' },
      { type: 'text', content: '## Methodology\n\nDetails of your research approach...' },
      { type: 'simulation', content: 'Define simulation parameters...' }
    ],
    technical: [
      { type: 'text', content: '## Executive Summary' },
      { type: 'predictor', content: 'Initial predictions...' },
      { type: 'simulation', content: 'Simulation logic...' },
      { type: 'diagram', content: 'flowchart' },
      { type: 'text', content: '## Data Analysis' }
    ],
    simple: [
      { type: 'text', content: '## Research Notes' },
      { type: 'search-researcher', content: '' }
    ]
  };
  const [view, setView] = useState<ViewState>('dashboard');
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const { scrollY } = useScroll();
  const headerY = useTransform(scrollY, [0, 50], [0, isMobile ? -60 : 0]);

  // Optimistic paper state to prevent unmounting during fork/save
  const [activePaper, setActivePaper] = useState<ResearchPaper | null>(null);

  useEffect(() => {
    const p = papers.find(p => p.id === selectedPaperId);
    if (p) setActivePaper(p);
  }, [papers, selectedPaperId]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, selectedPaperId]);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      setIsSigningIn(false);
    });
  }, []);

  // Data Listener
  useEffect(() => {
    if (!user) {
      setPapers([ALPHA_QUBIT_PAPER]); // Show default paper if not logged in
      return;
    }

    const q = query(
      collection(db, 'research_papers'), 
      where('ownerId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const p = snapshot.docs.map(d => d.data() as ResearchPaper);
        setPapers([ALPHA_QUBIT_PAPER, ...p]);
      },
      (error) => {
        // Only log if it's not a permission error (which happens when rules haven't propagated)
        if (!error.message.includes('permission-denied')) {
          handleFirestoreError(error, OperationType.LIST, 'research_papers');
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') {
        console.log("Sign in cancelled by user or overlapping request.");
      } else {
        console.error("Sign in failed", e);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreate = async () => {
    if (!user) {
      await handleSignIn();
      return;
    }

    const newId = Math.random().toString(36).substr(2, 12);
    const newPaper: ResearchPaper = {
      id: newId,
      title: newTitle || 'New Scientific Narrative',
      subtitle: 'Exploring the frontiers of quantum intelligence',
      author: user?.displayName || 'Anonymous Researcher',
      authorRole: 'Lead Investigator',
      themeColor: '#C5A059',
      heroMedia: { type: 'none' },
      blocks: selectedBlocks.map(type => ({
        id: Math.random().toString(36).substr(2, 9),
        type: type as any,
        content: type === 'text' ? '## Abstract\n\nStart your research here...' : '',
        metadata: type === 'simulation' ? { parameters: { iterations: 1000, complexity: 'O(n^2)' } } : {}
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: user.uid
    };

    try {
      await setDoc(doc(db, 'research_papers', newId), newPaper);
      setSelectedPaperId(newId);
      setView('editor');
      setIsCreateModalOpen(false);
      setCreateStep(0);
      setNewTitle('');
      setSelectedBlocks(['text']);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `research_papers/${newId}`);
    }
  };

  const handleImportPDF = async (file: File) => {
    if (!user) {
      await handleSignIn();
      return;
    }
    
    setIsImporting(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      const paperId = Math.random().toString(36).substr(2, 12);
      
      // 1. Upload to Storage
      const storageRef = ref(storage, `research_files/${paperId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      // 2. Create paper with just the file-embed block as requested
      const embedBlock: ResearchBlock = {
        id: 'initial-embed-' + Math.random().toString(36).substr(2, 6),
        type: 'file-embed',
        content: downloadUrl,
        metadata: {
          fileName: file.name,
          fileType: extension,
          fileSize: file.size
        }
      };

      const introBlock: ResearchBlock = {
        id: 'intro-' + Math.random().toString(36).substr(2, 6),
        type: 'text',
        content: `## ${file.name.split('.')[0]}\n\nThis manuscript was initialized from an imported document.`
      };

      const finalPaper: ResearchPaper = {
        id: paperId,
        title: file.name.split('.')[0] || 'Imported Research',
        subtitle: 'Analyzing frontiers from imported document',
        author: user?.displayName || 'Anonymous Researcher',
        authorRole: 'Lead Investigator',
        themeColor: '#C5A059',
        heroMedia: { type: 'none' },
        blocks: [introBlock, embedBlock],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ownerId: user.uid
      };
      
      await setDoc(doc(db, 'research_papers', paperId), finalPaper);
      setSelectedPaperId(paperId);
      setView('editor');
      showToast("Document imported successfully", "success");
    } catch (error) {
      console.error("File Import failed:", error);
      showToast("Import failed", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = useCallback(async (paper: ResearchPaper) => {
    if (!user) return;
    setIsSaving(true);
    
    let paperToSave = { ...paper, updatedAt: Date.now() };
    let isForking = false;

    // Fork logic: if the user doesn't own the paper, save it as a new one
    if (paper.ownerId !== user.uid) {
      const newId = Math.random().toString(36).substr(2, 12);
      paperToSave = {
        ...paper,
        id: newId,
        ownerId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      isForking = true;
    }

    try {
      await setDoc(doc(db, 'research_papers', paperToSave.id), paperToSave);
      setActivePaper(paperToSave); // Optimistic update
      if (isForking) {
        setSelectedPaperId(paperToSave.id);
      }
      setLastSaved(Date.now());
      showToast(isForking ? "Manuscript forked" : "Manuscript saved", "success");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `research_papers/${paperToSave.id}`);
      showToast("Save failed", "error");
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const selectedPaper = papers.find(p => p.id === selectedPaperId);

  const handleDelete = async () => {
    if (!paperToDelete) return;
    try {
      await deleteDoc(doc(db, 'research_papers', paperToDelete.id));
      if (selectedPaperId === paperToDelete.id) {
        setSelectedPaperId(null);
        setView('dashboard');
      }
      setIsDeleteModalOpen(false);
      setPaperToDelete(null);
      setDeleteConfirmTitle('');
      showToast("Manuscript deleted", "info");
    } catch (error) {
      if (paperToDelete) {
        handleFirestoreError(error, OperationType.DELETE, `research_papers/${paperToDelete.id}`);
      }
      showToast("Delete failed", "error");
    }
  };

  const handleShare = (paper: ResearchPaper) => {
    const url = window.location.origin + '?paper=' + paper.id;
    if (navigator.share) {
      navigator.share({
        title: paper.title,
        text: paper.subtitle,
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard", "success");
    }
  };

  const handleResetLibrary = async () => {
    if (!user) return;
    if (!window.confirm("This will permanently delete all your research papers. The demo template will remain. Continue?")) return;
    
    try {
      const q = query(
        collection(db, 'research_papers'), 
        where('ownerId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      showToast("Library reset complete", "info");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'research_papers');
      showToast("Failed to reset library", "error");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#F9F8F4]">
        <Loader2 className="text-stone-900 animate-spin" size={32} />
      </div>
    );
  }

  if (!user && view !== 'viewer') {
    return <LandingPage onSignIn={handleSignIn} isLoading={isSigningIn} />;
  }

  return (
    <div className="min-h-screen bg-[#F9F8F4] overflow-x-hidden selection:bg-stone-900 selection:text-white">
      {/* Integrated Scientific Top Bar */}
      <AnimatePresence>
        {(view === 'dashboard' || view === 'settings') && (
          <motion.nav 
            initial={{ y: -80, opacity: 0 }}
            animate={{ 
              y: isHeaderVisible ? 0 : -80,
              opacity: isHeaderVisible ? 1 : 0
            }}
            exit={{ y: -80, opacity: 0 }}
            style={{ y: headerY }}
            className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-stone-200 z-[150] px-4 md:px-8 flex items-center justify-between"
          >
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => { setView('dashboard'); setSelectedPaperId(null); }}
            >
              <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">M</div>
              <span className="font-serif italic text-xl tracking-tight text-stone-900 hidden sm:block">Maniscript</span>
            </div>

            {/* Profile Centered - Only on Desktop or when header is fully visible */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-3 px-6 py-2 bg-stone-100/50 rounded-full border border-stone-200/50 shadow-inner cursor-pointer hover:bg-stone-200/30 transition-colors"
              onClick={() => setView('settings')}
            >
              {user ? (
                <>
                  <div className="w-5 h-5 rounded-full overflow-hidden border border-stone-300">
                    <img src={user.photoURL || ''} className="w-full h-full object-cover" alt="p" />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                     <span className="text-[9px] font-bold uppercase tracking-widest text-stone-900">{user.displayName || 'Authorized'}</span>
                     <span className="text-[7px] text-stone-400 font-mono">ID: {user.uid.slice(0, 8)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  <UserIcon size={12} />
                  <span>Public Guest</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 font-sans">
               {!isMobile && view !== 'dashboard' && (
                 <button 
                   onClick={() => { setView('dashboard'); setSelectedPaperId(null); }}
                   className="text-[10px] uppercase font-bold tracking-widest text-stone-400 hover:text-stone-900 transition-all px-4 py-2"
                 >
                   Library
                 </button>
               )}
               
               <div className="flex items-center bg-stone-100/50 rounded-xl p-1 gap-1">
                 <button 
                   onClick={() => setView('settings')}
                   className={cn(
                     "p-2 rounded-lg transition-colors",
                     view === 'settings' ? "bg-white shadow-sm text-stone-900" : "text-stone-400 hover:text-stone-900"
                   )}
                 >
                   <SettingsIcon size={18} />
                 </button>
                 <button 
                    onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                    className="p-2 text-stone-400 hover:text-stone-900 transition-colors hidden sm:block"
                    title={isHeaderVisible ? "Minimize Interface" : "Restore Interface"}
                 >
                    <ChevronUp size={18} className={cn("transition-transform duration-500", !isHeaderVisible && "rotate-180")} />
                 </button>
               </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Floating Toggle (visible when minimized or hidden on mobile scroll) */}
      {(!isHeaderVisible || isMobile) && (
        <AnimatePresence>
           {(!isHeaderVisible || scrollY.get() > 50) && (
             <motion.button 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               onClick={() => {
                 setIsHeaderVisible(true);
                 window.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               className="fixed top-4 left-1/2 -translate-x-1/2 z-[160] p-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-stone-200 text-stone-400 hover:text-stone-900 transition-colors"
             >
               <ChevronDown size={14} />
             </motion.button>
           )}
        </AnimatePresence>
      )}

      {/* Mobile Bottom Navigation */}
      <AnimatePresence>
        {isMobile && (view === 'dashboard' || view === 'settings') && (
          <motion.nav 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-xl border-t border-stone-200 z-[200] pb-safe"
          >
            <div className="h-full flex items-center justify-around px-2">
              {[
                { id: 'dashboard', icon: Grid, label: 'Library' },
                { id: 'viewer', icon: BookOpen, label: 'Reading', disabled: !selectedPaperId },
                { id: 'editor', icon: Edit3, label: 'Editor', disabled: !selectedPaperId },
                { id: 'settings', icon: SettingsIcon, label: 'Profile' }
              ].map((item) => (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => setView(item.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 transition-all flex-1 py-2",
                    view === item.id ? "text-stone-900 font-bold" : "text-stone-400",
                    item.disabled && "opacity-20 cursor-not-allowed"
                  )}
                >
                  <item.icon size={20} className={cn(view === item.id && "scale-110")} />
                  <span className="text-[10px] uppercase tracking-tighter">{item.label}</span>
                  {view === item.id && (
                    <motion.div layoutId="mobile-nav-dot" className="w-1 h-1 bg-stone-900 rounded-full mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <div className={cn(
        "transition-all duration-700 ease-in-out", 
        isHeaderVisible ? "pt-16" : "pt-0",
        isMobile ? "pb-24" : "pb-0"
      )}>
        {view === 'settings' && (
          <Settings 
            user={user} 
            onBack={() => setView('dashboard')} 
            onDeleteAccount={() => {
              if (window.confirm("This will sign you out and delete your personal metadata entries. Are you sure?")) {
                auth.signOut();
                setView('dashboard');
              }
            }} 
          />
        )}
        
        {view === 'dashboard' && (
          <Dashboard 
            papers={papers} 
            onSelect={(id) => { setSelectedPaperId(id); setView('viewer'); }}
            onEdit={(id) => { setSelectedPaperId(id); setView('editor'); }}
            onCreate={() => setIsCreateModalOpen(true)}
            onDelete={(paper) => {
              setPaperToDelete(paper);
              setIsDeleteModalOpen(true);
            }}
            onImportPDF={handleImportPDF}
            onResetLibrary={handleResetLibrary}
            onShare={handleShare}
            isImporting={isImporting}
            currentUserId={user?.uid}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && paperToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl border border-red-100"
            >
               <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-3xl">⚠️</span>
               </div>
               <h2 className="text-2xl font-serif text-stone-900 mb-2">Are you sure?</h2>
               <p className="text-stone-500 text-sm mb-8">
                 To permanently delete <span className="font-bold text-stone-900">"{paperToDelete.title}"</span>, please type the title exactly as shown below:
               </p>
               
               <input 
                type="text"
                autoFocus
                placeholder="Type paper title..."
                value={deleteConfirmTitle}
                onChange={(e) => setDeleteConfirmTitle(e.target.value)}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-red-500 transition-colors text-sm font-medium"
               />

               <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setPaperToDelete(null);
                      setDeleteConfirmTitle('');
                    }}
                    className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={deleteConfirmTitle !== paperToDelete.title}
                    onClick={handleDelete}
                    className="flex-1 py-3 bg-red-500 text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-20 shadow-lg shadow-red-200"
                  >
                    Delete Paper
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Paper Creation Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl border border-stone-100"
            >
               {createStep === 0 ? (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-serif text-stone-900">Research Title</h2>
                        <p className="text-stone-500 text-sm">Define the heading of your investigation.</p>
                      </div>
                      <div className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">Step 1/2</div>
                    </div>
                    
                    <input 
                      autoFocus
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && newTitle.trim() && setCreateStep(1)}
                      className="w-full text-4xl font-serif border-b-2 border-stone-100 focus:border-nobel-gold outline-none py-4 transition-colors placeholder:text-stone-100"
                      placeholder="Enter investigative title..."
                    />

                    <div className="flex justify-end pt-8">
                       <button 
                        disabled={!newTitle.trim()}
                        onClick={() => setCreateStep(1)}
                        className="px-8 py-3 bg-stone-900 text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all disabled:opacity-20"
                       >
                        Next: Configure Blocks
                       </button>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-serif text-stone-900">Structure Blocks</h2>
                        <p className="text-stone-500 text-sm">Select initial components for your manuscript.</p>
                      </div>
                      <div className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">Step 2/2</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
                       {[
                         { id: 'text', label: 'Rich Text Paragraph', icon: '🖋️' },
                         { id: 'diagram', label: 'Technical Diagram', icon: '📊' },
                         { id: 'simulation', label: 'Algorithmic Simulation', icon: '⚙️' },
                         { id: 'predictor', label: 'ML Prediction', icon: '🧠' },
                         { id: 'search-researcher', label: 'AI Web Researcher', icon: '🌐' },
                         { id: 'timestamp', label: 'Video Notation', icon: '⏱️' },
                       ].map((block) => (
                         <button
                           key={block.id}
                           onClick={() => {
                             if (selectedBlocks.includes(block.id)) {
                               setSelectedBlocks(selectedBlocks.filter(b => b !== block.id));
                             } else {
                               setSelectedBlocks([...selectedBlocks, block.id]);
                             }
                           }}
                           className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 ${
                             selectedBlocks.includes(block.id) 
                             ? 'border-nobel-gold bg-nobel-gold/5' 
                             : 'border-stone-50 bg-stone-50/50 hover:border-stone-200'
                           }`}
                         >
                            <span className="text-2xl">{block.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">{block.label}</span>
                         </button>
                       ))}
                    </div>

                    <div className="flex justify-between items-center pt-8">
                       <button 
                        onClick={() => setCreateStep(0)}
                        className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                       >
                        Back
                       </button>
                       <button 
                        onClick={handleCreate}
                        className="px-8 py-3 bg-stone-900 text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-all"
                       >
                        Initiate Manuscript
                       </button>
                    </div>
                 </div>
               )}

               <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreateStep(0);
                  setNewTitle('');
                }}
                className="mt-8 w-full py-2 text-stone-200 hover:text-stone-400 text-[8px] font-bold uppercase tracking-[0.3em] transition-colors"
               >
                Discard Creation
               </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'viewer' && activePaper && (
        <div className="relative">
          <ResearchViewer 
            paper={activePaper} 
            onBack={() => { setSelectedPaperId(null); setView('dashboard'); }} 
            onEdit={() => setView('editor')}
          />
        </div>
      )}

      {view === 'editor' && activePaper && (
        <ResearchEditor 
          key={activePaper.id}
          paper={activePaper}
          onSave={handleSave}
          onPreview={() => setView('viewer')}
          onBack={() => { setSelectedPaperId(null); setView('dashboard'); }}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border",
              toast.type === 'success' ? "bg-stone-900/90 text-white border-stone-800" :
              toast.type === 'error' ? "bg-red-500/90 text-white border-red-400" :
              "bg-white/90 text-stone-900 border-stone-200"
            )}
          >
             <div className="w-2 h-2 rounded-full animate-pulse bg-nobel-gold" />
             <span className="text-[10px] font-bold uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
