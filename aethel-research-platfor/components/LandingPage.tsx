import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, Sparkles, BookOpen, Share2, ShieldCheck, ArrowRight } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading }) => {
  return (
    <div className="min-h-screen bg-[#F9F8F4] flex flex-col items-center justify-center p-6 relative overflow-hidden text-stone-900">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-stone-200 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-stone-300 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full text-center relative z-10"
      >
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full border border-stone-200 shadow-inner">
          <Sparkles size={14} className="text-stone-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">The Future of Scientific Narrative</span>
        </div>

        <h1 className="text-7xl font-serif italic mb-8 tracking-tight leading-tight">
          Transcend the Static <br />
          <span className="text-stone-400">Manuscript.</span>
        </h1>

        <p className="text-xl text-stone-500 font-serif max-w-2xl mx-auto mb-12 leading-relaxed">
          Maniscript is an immersive research platform designed for the next generation of researchers. 
          Transform your data into cinematic narratives with quantum-inspired visuals.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
          <button 
            onClick={onSignIn}
            disabled={isLoading}
            className="group flex items-center gap-3 px-10 py-5 bg-stone-900 text-white rounded-full hover:bg-stone-800 transition-all font-medium text-lg shadow-xl shadow-stone-200/50 disabled:opacity-50"
          >
            {isLoading ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <LogIn size={20} />
              </motion.div>
            ) : (
              <LogIn size={20} />
            )}
            <span>Connect Researcher Identity</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Features Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: BookOpen, title: "Narrative Logic", desc: "Structured writing blocks designed for scientific clarity and impact." },
            { icon: Share2, title: "Peer Diffusion", desc: "Instantly share immersive visualizations with your global research network." },
            { icon: ShieldCheck, title: "Verified Identity", desc: "Secure provenance and ownership of your intellectual property." }
          ].map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="p-8 bg-white border border-stone-200 rounded-3xl"
            >
              <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center mb-6 text-stone-900">
                <f.icon size={20} />
              </div>
              <h3 className="text-lg font-serif mb-2">{f.title}</h3>
              <p className="text-sm text-stone-400 leading-relaxed font-serif">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
      
      <footer className="mt-24 text-[10px] uppercase font-bold tracking-[0.3em] text-stone-300">
        © 2026 Maniscript Industrial Labs
      </footer>
    </div>
  );
};
