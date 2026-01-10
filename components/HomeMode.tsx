import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Sun, Star, Zap } from 'lucide-react';
import { dbService } from '../services/dbService';
import { BrandMark } from './BrandMark';
import { AppFooter } from './AppFooter';

const MESSAGES = {
  default: [
    "Small choices count. One good meal can reset a day.",
    "Consistency beats perfection. You’re building a pattern.",
    "Every bite is a chance to nourish your story.",
    "A balanced plate is a balanced mind.",
    "Nourishment is the best form of self-care.",
    "Slow down and savor the flavors of today.",
    "Wellness starts with a single choice."
  ],
  active: [
    "Amazing streak! You're really mastering your kitchen habits.",
    "Your data shows real progress. Keep that momentum!",
    "Consistency is your superpower. Keep logging!",
    "You're becoming a true nutrition architect."
  ],
  homebound: [
    "Home cooking is your strength. Your body thanks you!",
    "The best meals are made with intention in your own kitchen.",
    "Your home-to-ordered ratio is looking excellent!"
  ]
};

export const HomeMode: React.FC = () => {
  const [message, setMessage] = useState('');
  const [iconIndex, setIconIndex] = useState(0);
  const [stats, setStats] = useState({ weekCount: 0, homeRatio: 0 });

  const icons = [
    <Sparkles className="text-indigo-500" size={48} />,
    <Heart className="text-rose-500" size={48} />,
    <Sun className="text-amber-500" size={48} />,
    <Star className="text-yellow-500" size={48} />,
    <Zap className="text-blue-500" size={48} />
  ];

  useEffect(() => {
    const loadStats = async () => {
      try {
        const meals = await dbService.getMealsForUser({ page: 0, pageSize: 20 });
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const weekMeals = meals.filter(m => new Date(m.date) > weekAgo);
        const homeMeals = weekMeals.filter(m => m.source === 'home');
        
        setStats({
          weekCount: weekMeals.length,
          homeRatio: weekMeals.length > 0 ? homeMeals.length / weekMeals.length : 0
        });
      } catch (e: any) {
        console.error("Home stats load failed:", e.message || e);
      }
    };
    loadStats();
  }, []);

  useEffect(() => {
    let category: keyof typeof MESSAGES = 'default';
    if (stats.weekCount > 5) category = 'active';
    else if (stats.homeRatio > 0.7) category = 'homebound';

    const pool = MESSAGES[category];
    const randomMsg = pool[Math.floor(Math.random() * pool.length)];
    setMessage(randomMsg);
    setIconIndex(Math.floor(Math.random() * icons.length));
  }, [stats]);

  return (
    <div className="h-full flex flex-col overflow-y-auto internal-scroll p-6 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col items-center gap-3 mt-10 shrink-0">
        <BrandMark variant="hero" />
      </header>

      <div className="flex flex-col flex-grow py-6">
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="w-full bg-white dark:bg-slate-900 rounded-[44px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-8 relative overflow-hidden group transition-all duration-500">
            <div className="absolute -top-10 -right-10 bg-indigo-50 dark:bg-indigo-900/10 w-40 h-40 rounded-full opacity-50 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -bottom-10 -left-10 bg-rose-50 dark:bg-rose-900/10 w-40 h-40 rounded-full opacity-50 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
            
            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[32px] relative z-10 shadow-inner group-hover:rotate-6 transition-transform">
              {icons[iconIndex]}
            </div>

            <div className="flex flex-col gap-4 relative z-10">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                "{message}"
              </h2>
              <div className="w-12 h-1.5 bg-indigo-500 dark:bg-indigo-600 rounded-full mx-auto" />
            </div>

            <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">
              Today's Intention
            </p>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
};