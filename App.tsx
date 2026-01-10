import React, { useState, useEffect } from 'react';
import { User, ProfileData } from './types';
import { TabId, NAVIGATION_TABS, APP_VERSION, DIET_OPTIONS, COMMON_ALLERGENS } from './constants';
import { dbService } from './services/dbService';
import { HomeMode } from './components/HomeMode';
import { EatMode } from './components/EatMode';
import { CookMode } from './components/CookMode';
import { HistoryMode } from './components/HistoryMode';
import { FoodMemory } from './components/FoodMemory';
import { ProfileMode } from './components/ProfileMode';
import { CompleteProfile } from './components/CompleteProfile';
import { BrandMark } from './components/BrandMark';
import { COUNTRIES, REGIONS } from './services/countryData';
import { 
  ChevronRight, Mail, Lock, Sparkles, Loader2, AlertCircle, 
  CheckCircle2, User as UserIcon, Phone, Globe, Plus, X, 
  Calendar
} from 'lucide-react';

const SESSION_MAX_AGE_DAYS = 10;
const SESSION_START_KEY = "mealwise_session_started_at";
const REMEMBERED_EMAIL_KEY = "mealwise_saved_email";

interface StatusMessage {
  text: string;
  type: 'success' | 'error';
}

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(true);
  
  // Signup Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [dietPreference, setDietPreference] = useState('no_preference');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [customAllergen, setCustomAllergen] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState<StatusMessage | null>(null);

  // Prefill email if remembered
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberEmail(true);
    }
  }, []);

  // Check session expiry on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionStartedAt = localStorage.getItem(SESSION_START_KEY);
        if (sessionStartedAt) {
          const start = new Date(sessionStartedAt).getTime();
          const now = new Date().getTime();
          const ageDays = (now - start) / (1000 * 60 * 60 * 24);
          
          if (ageDays > SESSION_MAX_AGE_DAYS) {
            await dbService.signOut();
            localStorage.removeItem(SESSION_START_KEY);
            setMessage({ text: "Session expired. Please sign in again.", type: 'error' });
            setLoading(false);
            return;
          }
        }

        const u = await dbService.getUser();
        if (u) {
          setUser(u);
        }
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const toggleAllergen = (key: string) => {
    setSelectedAllergens(prev => {
      if (prev.includes(key)) return prev.filter(a => a !== key);
      return [...prev, key];
    });
  };

  const addCustomAllergen = () => {
    const val = customAllergen.trim().toLowerCase();
    if (!val) return;
    if (!selectedAllergens.some(a => a.toLowerCase() === val)) {
      setSelectedAllergens([...selectedAllergens, val]);
    }
    setCustomAllergen('');
  };

  const removeAllergen = (key: string) => {
    setSelectedAllergens(prev => prev.filter(a => a !== key));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage(null);

    try {
      if (authMode === 'login') {
        await dbService.signIn(email, password);
        localStorage.setItem(SESSION_START_KEY, new Date().toISOString());
        if (rememberEmail) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
        const u = await dbService.getUser();
        setUser(u);
      } else {
        // Signup validation
        if (!dateOfBirth) throw new Error("Date of Birth is required.");
        
        const birthDate = new Date(dateOfBirth);
        const today = new Date();
        if (birthDate > today) throw new Error("Date of birth cannot be in the future.");
        
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (age < 13 || (age === 13 && monthDiff < 0)) throw new Error("You must be at least 13 years old.");

        const authUser = await dbService.signUp(email, password);
        if (authUser) {
          const profileData: ProfileData = {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            country_region: `${country} | ${region}`,
            email: email,
            diet_preference: dietPreference || 'no_preference',
            allergens: selectedAllergens,
            date_of_birth: dateOfBirth
          };
          await dbService.upsertProfile(authUser.id, profileData);
          localStorage.setItem(SESSION_START_KEY, new Date().toISOString());
          const u = await dbService.getUser();
          setUser(u);
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  // Authentication & Gating
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="py-12 flex flex-col items-center w-full">
          <BrandMark variant="hero" />
          <div className="mt-12 w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[44px] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4">
            <header className="mb-10 text-center">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {authMode === 'login' ? 'Welcome Back' : 'Join Mealwise'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {authMode === 'login' ? 'Your AI kitchen awaits.' : 'Eat smarter, not stricter.'}
              </p>
            </header>

            <form onSubmit={handleAuth} className="flex flex-col gap-5">
              {authMode === 'signup' && (
                <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meal Preference</label>
                    <select 
                      value={dietPreference} 
                      onChange={(e) => setDietPreference(e.target.value)} 
                      required 
                      className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
                    >
                      {DIET_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allergens / Exclusions</label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_ALLERGENS.map(a => (
                        <button 
                          key={a.key} type="button" onClick={() => toggleAllergen(a.key)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border uppercase tracking-widest ${
                            selectedAllergens.includes(a.key) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <input 
                        type="text" placeholder="Other allergen..."
                        className="flex-grow bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 px-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        value={customAllergen} onChange={(e) => setCustomAllergen(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergen())}
                      />
                      <button type="button" onClick={addCustomAllergen} className="bg-indigo-600 text-white p-2.5 rounded-2xl"><Plus size={18} /></button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold animate-in zoom-in-95 ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                  <AlertCircle size={14} />
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={authLoading} className="mt-4 bg-slate-900 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform disabled:opacity-70">
                {authLoading ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={20} />}
                {authMode === 'login' ? 'Secure Login' : 'Create Account'}
              </button>
            </form>

            <footer className="mt-8 text-center flex flex-col gap-3">
              <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors">
                {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </button>
            </footer>
          </div>
        </div>
      </div>
    );
  }

  // Profile Gating: If DOB is missing, show completion screen
  if (!user.dateOfBirth) {
    return <CompleteProfile user={user} onComplete={setUser} />;
  }

  const navigateToHome = () => setActiveTab('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeMode />;
      case 'eat': return <EatMode user={user} onLogged={() => setActiveTab('history')} onHomeClick={navigateToHome} />;
      case 'cook': return <CookMode user={user} onLogged={() => setActiveTab('history')} onHomeClick={navigateToHome} />;
      case 'history': return <HistoryMode user={user} onHomeClick={navigateToHome} />;
      case 'memory': return <FoodMemory user={user} onHomeClick={navigateToHome} />;
      case 'profile': return <ProfileMode user={user} onLogout={() => { setUser(null); dbService.signOut(); }} onUpdate={setUser} onHomeClick={navigateToHome} />;
      default: return <HomeMode />;
    }
  };

  return (
    <div className="flex flex-col h-[100svh] bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <main className="flex-1 w-full max-w-md mx-auto relative overflow-hidden">
        {renderContent()}
      </main>

      <nav className="h-[84px] shrink-0 w-full max-w-md mx-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-900 z-[100] safe-area-bottom flex items-center justify-around px-4">
        {NAVIGATION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${activeTab === tab.id ? 'text-indigo-600 scale-110' : 'text-slate-400 dark:text-slate-600'}`}
          >
            <div className={`p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-950 shadow-sm' : ''}`}>
              {tab.icon}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
            {activeTab === tab.id && <div className="absolute -top-1 w-1 h-1 bg-indigo-600 rounded-full" />}
          </button>
        ))}
      </nav>
    </div>
  );
};