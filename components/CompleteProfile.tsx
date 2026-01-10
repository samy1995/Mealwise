import React, { useState } from 'react';
import { dbService } from '../services/dbService';
import { User } from '../types';
import { BrandMark } from './BrandMark';
import { Calendar, Loader2, Save, AlertCircle } from 'lucide-react';

interface CompleteProfileProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

export const CompleteProfile: React.FC<CompleteProfileProps> = ({ user, onComplete }) => {
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) return;

    const birthDate = new Date(dob);
    const today = new Date();
    
    if (birthDate > today) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const isUnderage = age < 13 || (age === 13 && monthDiff < 0);

    if (isUnderage) {
      setError("You must be at least 13 years old to use Mealwise.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await dbService.updateProfile(user.id, { date_of_birth: dob });
      const refreshed = await dbService.getUser();
      if (refreshed) {
        onComplete(refreshed);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <BrandMark variant="hero" />
      
      <div className="mt-12 max-w-sm w-full bg-white dark:bg-slate-900 p-8 rounded-[44px] shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Complete Your Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed font-medium">
          “We use age to personalize insights — not to judge your eating.”
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-left">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
              <input 
                type="date" 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-base outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-100 dark:border-red-900/40 flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || !dob}
            className="bg-slate-900 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
            Continue to App
          </button>
        </form>
      </div>
    </div>
  );
};