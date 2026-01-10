import React, { useState } from 'react';
import { User, ProfileData } from '../types';
import { dbService } from '../services/dbService';
import { COUNTRIES, REGIONS } from '../services/countryData';
import { DIET_OPTIONS, COMMON_ALLERGENS } from '../constants';
import { LogOut, Cloud, AlertCircle, Save, Loader2, CheckCircle, Phone as PhoneIcon, User as UserIcon, Globe, X, Plus, Calendar } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';

interface ProfileModeProps {
  user: User;
  onLogout: () => void;
  onUpdate: (updatedUser: User) => void;
  onHomeClick?: () => void;
}

export const ProfileMode: React.FC<ProfileModeProps> = ({ user, onLogout, onUpdate, onHomeClick }) => {
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  
  const initialCountry = user.countryRegion?.split(' | ')[0] || '';
  const initialRegion = user.countryRegion?.split(' | ')[1] || '';
  
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(initialRegion);
  const [dietPreference, setDietPreference] = useState(user.dietPreference || '');
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(user.allergens || []);
  const [customAllergen, setCustomAllergen] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!dateOfBirth) throw new Error("Date of Birth is required.");
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      if (birthDate > today) throw new Error("DOB cannot be in the future.");
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13) throw new Error("Must be at least 13 years old.");

      const updatedData: Partial<ProfileData> = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        country_region: `${country} | ${region}`,
        diet_preference: dietPreference,
        allergens: selectedAllergens,
        date_of_birth: dateOfBirth
      };

      await dbService.updateProfile(user.id, updatedData);
      
      const refreshedUser = await dbService.getUser();
      if (refreshedUser) {
        onUpdate(refreshedUser);
        setMessage({ text: "Profile updated successfully!", type: 'success' });
      }
    } catch (e: any) {
      setMessage({ text: e.message || "Failed to update profile.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const availableRegions = country ? REGIONS[country] : null;

  return (
    <div className="h-full flex flex-col overflow-y-auto internal-scroll p-4 gap-6 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="Profile" 
        subtitle="Cloud sync & meal preferences" 
        onHomeClick={onHomeClick}
      />

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 flex flex-col gap-8 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center font-black text-3xl shadow-inner shrink-0">
            {firstName?.[0]?.toUpperCase() || user.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-grow min-w-0">
            <p className="font-black text-slate-900 dark:text-slate-100 text-xl leading-tight truncate">{firstName} {lastName}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-widest uppercase mt-1 truncate">{user.email}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
             <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/40">
               <Cloud size={14} />
               Live
             </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="flex flex-col gap-8 pt-4 border-t border-slate-50 dark:border-slate-800">
          <section className="flex flex-col gap-5">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
                  <input 
                    type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                <input 
                  type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
                <input 
                  type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Phone</label>
              <div className="relative">
                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={16} />
                <input 
                  type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Country</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 pointer-events-none" size={16} />
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none dark:text-white"
                    value={country} onChange={(e) => { setCountry(e.target.value); setRegion(''); }} required
                  >
                    <option value="">Select</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Region</label>
                {availableRegions ? (
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none dark:text-white"
                    value={region} onChange={(e) => setRegion(e.target.value)} required
                  >
                    <option value="">Select</option>
                    {availableRegions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" placeholder="Region"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    value={region} onChange={(e) => setRegion(e.target.value)} disabled={!country} required
                  />
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-5 pt-6 border-t border-slate-50 dark:border-slate-800">
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Dietary Logic</h3>
             
             <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Preference</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none dark:text-white"
                  value={dietPreference} onChange={(e) => setDietPreference(e.target.value)} required
                >
                  <option value="">Select preference...</option>
                  {DIET_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
             </div>

             <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Active Restrictions</label>
                <div className="flex flex-wrap gap-2">
                   {COMMON_ALLERGENS.map(a => (
                     <button 
                       key={a.key} type="button" onClick={() => toggleAllergen(a.key)}
                       className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border uppercase tracking-widest ${
                         selectedAllergens.includes(a.key) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700'
                       }`}
                     >
                       {a.label}
                     </button>
                   ))}
                </div>
                
                <div className="flex gap-2 mt-1">
                  <input 
                    type="text" placeholder="Custom exclusion..."
                    className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white shadow-inner"
                    value={customAllergen} onChange={(e) => setCustomAllergen(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergen())}
                  />
                  <button 
                    type="button" 
                    onClick={addCustomAllergen}
                    className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-transform shrink-0"
                  >
                    <Plus size={24} />
                  </button>
                </div>
             </div>
             
             <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex items-start gap-3 border border-slate-100 dark:border-slate-700">
                <AlertCircle size={18} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed uppercase tracking-wider">Parameters are used for behavior modeling & recipe safety. Consult professionals for health advice.</p>
             </div>
          </section>

          {message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in zoom-in-95 border ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900'
            }`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="mt-2 bg-slate-900 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl active:scale-95 transition-transform disabled:opacity-70 shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            Synchronize Profile
          </button>
        </form>
      </div>

      <button 
        onClick={onLogout}
        className="mt-6 w-full bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-5 rounded-[40px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/40 shadow-sm active:scale-95 transition-transform shrink-0"
      >
        <LogOut size={24} />
        Sign Out Securely
      </button>
      <AppFooter />
    </div>
  );
};