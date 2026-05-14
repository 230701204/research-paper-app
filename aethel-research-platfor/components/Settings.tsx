import React from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Palette, ArrowLeft, Trash2, Sliders, Monitor, Globe } from 'lucide-react';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

interface SettingsProps {
  onBack: () => void;
  onDeleteAccount: () => void;
  user: any;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, onDeleteAccount, user }) => {
  const [activeTab, setActiveTab] = React.useState<'profile' | 'app' | 'security'>('profile');

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'app', icon: Palette, label: 'Preferences' },
    { id: 'security', icon: Shield, label: 'Security' },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F4] pt-24 pb-24 text-stone-900">
      <div className="max-w-4xl mx-auto px-6">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="p-3 bg-white border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-4xl font-serif italic tracking-tight">Settings</h1>
              <p className="text-sm text-stone-400 font-mono tracking-widest mt-1">Configure your research environment</p>
            </div>
          </div>
        </header>

        <div className="flex gap-12">
          {/* Sidebar */}
          <aside className="w-64 flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-2xl transition-all text-sm font-medium",
                  activeTab === tab.id 
                    ? "bg-stone-900 text-white shadow-lg" 
                    : "text-stone-400 hover:text-stone-900 hover:bg-stone-100"
                )}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white border border-stone-200 rounded-[32px] p-12 shadow-sm min-h-[500px]">
              {activeTab === 'profile' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-8 pb-4 border-b border-stone-100">Identity Details</h3>
                    <div className="flex items-center gap-8">
                       <div className="w-24 h-24 rounded-full border-4 border-stone-50 overflow-hidden shadow-xl">
                          <img src={user?.photoURL} alt="p" className="w-full h-full object-cover" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-2xl font-serif">{user?.displayName}</p>
                          <p className="text-stone-400 text-sm font-mono">{user?.email}</p>
                          <p className="text-[10px] uppercase text-stone-300 font-bold tracking-widest mt-2">Verified Researcher</p>
                       </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-4">Research Meta</h3>
                    <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-stone-500 font-medium">Institution ID</span>
                        <span className="text-xs text-stone-900 font-mono">{auth.currentUser?.uid.slice(0, 12)}...</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-stone-100">
                        <span className="text-xs text-stone-500 font-medium">Account Created</span>
                        <span className="text-xs text-stone-900 font-mono tracking-tighter">MAY 04 2026</span>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'app' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-10"
                >
                   <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-8 pb-4 border-b border-stone-100">Visual Interaction</h3>
                    <div className="space-y-4">
                       {[
                         { icon: Monitor, label: "GPU Accelerated Transitions", desc: "Enable motion-blur effects for manuscript switching.", active: true },
                         { icon: Globe, label: "Researcher Global Sync", desc: "Allow other researchers to view public draft IDs.", active: false },
                         { icon: Sliders, label: "Advanced Formatting", desc: "Show advanced CSS hooks in the block editor.", active: true }
                       ].map((pref, i) => (
                         <div key={i} className="flex items-center justify-between p-6 bg-stone-50 rounded-2xl hover:border-stone-400 transition-colors border border-transparent">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-stone-400">
                                  <pref.icon size={18} />
                               </div>
                               <div>
                                  <p className="text-sm font-medium text-stone-900">{pref.label}</p>
                                  <p className="text-xs text-stone-400">{pref.desc}</p>
                               </div>
                            </div>
                            <div className={cn(
                              "w-12 h-6 rounded-full p-1 transition-colors relative cursor-pointer",
                              pref.active ? "bg-stone-900" : "bg-stone-200"
                            )}>
                               <div className={cn(
                                 "w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                                 pref.active ? "translate-x-6" : "translate-x-0"
                               )} />
                            </div>
                         </div>
                       ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  <section>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-8 pb-4 border-b border-stone-100">Identity Protection</h3>
                    <div className="p-8 bg-stone-50 rounded-[2rem] border border-stone-200">
                       <p className="text-sm font-serif mb-6 leading-relaxed">
                         Encryption for all manuscripts is handled via AES-256 protocols. Your session is signed by Google Identity Services and periodically rotated.
                       </p>
                       <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100 w-fit">
                          <Shield size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Active & Fully Encrypted</span>
                       </div>
                    </div>
                  </section>

                  <section className="pt-8 border-t border-red-50">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-400 mb-6">Danger Narrative</h3>
                    <div className="p-8 border border-red-100 bg-red-50/20 rounded-[2rem]">
                       <p className="text-sm text-red-500 font-serif mb-6 leading-relaxed">
                          Deleting your researcher profile will permanently scrub all drafts, visualizations, and identity links from the Maniscript network. This action is irreversible.
                       </p>
                       <button 
                         onClick={onDeleteAccount}
                         className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all font-bold text-[10px] tracking-widest shadow-xl shadow-red-200 uppercase"
                       >
                         <Trash2 size={16} />
                         Destroy Researcher Data
                       </button>
                    </div>
                  </section>
                </motion.div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
