import React, { useMemo, useState, useEffect, useRef } from 'react';
import { dbService } from '../services/dbService';
import { MealLog, User } from '../types';
import { TrendIndicator } from './TrendIndicator';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';
import {
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Utensils,
  X,
  MapPin,
  Clock,
  Plus
} from 'lucide-react';

interface HistoryModeProps {
  user: User;
  onHomeClick?: () => void;
}

const PAGE_SIZE = 30;

export const HistoryMode: React.FC<HistoryModeProps> = ({ user, onHomeClick }) => {
  const [history, setHistory] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const didFetchRef = useRef(false);

  const toLocalYMD = (d: Date) => d.toLocaleDateString('en-CA');

  const fetchHistory = async (pageToFetch: number) => {
    if (pageToFetch === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await dbService.getMealsForUser({ page: pageToFetch, pageSize: PAGE_SIZE });
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (pageToFetch === 0) {
        setHistory(data);
      } else {
        setHistory(prev => [...prev, ...data]);
      }
    } catch (e) {
      console.error('Fetch history failed:', e);
      setToast({ message: 'Failed to load history.', type: 'error' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchHistory(0);
  }, [user.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!pendingDeleteId) return;
    const t = setTimeout(() => setPendingDeleteId(null), 2500);
    return () => clearTimeout(t);
  }, [pendingDeleteId]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, MealLog[]> = {};
    history.forEach(meal => {
      const localDate = new Date(meal.date);
      const ymd = toLocalYMD(localDate);
      if (!groups[ymd]) groups[ymd] = [];
      groups[ymd].push(meal);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [history]);

  const dailyTotals = useMemo(() => {
    const todayLocal = toLocalYMD(new Date());
    const todayMeals = history.filter(m => toLocalYMD(new Date(m.date)) === todayLocal);

    return todayMeals.reduce(
      (acc, curr) => ({
        calories: acc.calories + (curr.totals?.calories || 0),
        protein: acc.protein + (curr.totals?.protein || 0),
        carbs: acc.carbs + (curr.totals?.carbs || 0),
        fat: acc.fat + (curr.totals?.fat || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [history]);

  const handleDeleteConfirmed = async (id: string) => {
    try {
      await dbService.deleteMeal(id);
      setHistory(prev => prev.filter(m => m.id !== id));
      setToast({ message: 'Meal deleted', type: 'success' });
      if (selectedMeal?.id === id) setSelectedMeal(null);
    } catch (e: any) {
      setToast({ message: `Failed to delete meal.`, type: 'error' });
    }
  };

  const handleDeleteClick = (id: string) => {
    if (pendingDeleteId === id) {
      handleDeleteConfirmed(id);
    } else {
      setPendingDeleteId(id);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchHistory(nextPage);
  };

  const todayLocal = toLocalYMD(new Date());

  const SkeletonLoader = () => (
    <div className="flex flex-col gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-[28px] p-2 flex items-center animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[20px]" />
          <div className="ml-4 flex-grow flex flex-col gap-2">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
          </div>
          <div className="w-12 h-10 bg-slate-100 dark:bg-slate-800 rounded ml-2" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-y-auto internal-scroll p-4 gap-6 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="History" 
        subtitle="Tracking your culinary patterns" 
        onHomeClick={onHomeClick}
      />
      
      <section className="bg-white dark:bg-slate-900 p-6 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-4 ml-1">
          Today's Totals
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <TrendIndicator direction="stable" label="Kcal" value={Math.round(dailyTotals.calories)} />
          <TrendIndicator direction="up" label="Protein" value={`${Math.round(dailyTotals.protein)}g`} />
          <TrendIndicator direction="stable" label="Carbs" value={`${Math.round(dailyTotals.carbs)}g`} />
          <TrendIndicator direction="down" label="Fat" value={`${Math.round(dailyTotals.fat)}g`} />
        </div>
      </section>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-bold text-xs flex items-center gap-2 border bg-slate-900 dark:bg-indigo-600 text-white animate-in slide-in-from-top-4">
          {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col gap-10">
        {loading && <SkeletonLoader />}
        
        {!loading && groupedHistory.length === 0 && (
          <div className="text-center py-20 opacity-30 flex flex-col items-center gap-5">
            <Utensils size={64} className="text-slate-300 dark:text-slate-700" />
            <p className="font-black uppercase tracking-widest text-xs">Awaiting first log</p>
          </div>
        )}

        {groupedHistory.map(([date, meals]) => (
          <div key={date} className="flex flex-col gap-4">
            <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">
              {date === todayLocal ? 'Today' : new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </h2>

            <div className="flex flex-col gap-3">
              {meals.map(meal => (
                <div
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal)}
                  className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 flex items-center p-3 pr-5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all active:scale-[0.98] group"
                >
                  <div className="w-20 h-20 flex-shrink-0 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-700">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} loading="lazy" alt="Meal" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <Utensils className="text-slate-200 dark:text-slate-700" size={24} />
                    )}
                  </div>

                  <div className="ml-5 flex-grow flex flex-col justify-center gap-1 overflow-hidden">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm">
                      {meal.foods?.map(f => f.name).join(', ') || 'Unnamed Log'}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-widest">
                        <Clock size={10} />
                        {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {meal.source === 'ordered' && (
                        <span className="text-[8px] font-black text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 px-2 py-0.5 rounded-full uppercase tracking-widest border border-orange-100 dark:border-orange-900/40">
                          Ordered
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                     <p className="font-black text-slate-900 dark:text-slate-100 text-base">{Math.round(meal.totals?.calories || 0)}</p>
                     <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">kcal</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && !loading && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full mt-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs text-slate-600 dark:text-slate-400 active:scale-95 transition-all shadow-sm"
        >
          {loadingMore ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
          Load older entries
        </button>
      )}

      <AppFooter />

      {/* Detail Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setSelectedMeal(null)} />
           <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[44px] sm:rounded-[44px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-10 duration-500">
              <button 
                onClick={() => setSelectedMeal(null)}
                className="absolute top-5 right-5 z-10 bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-full text-slate-900 dark:text-white backdrop-blur-md shadow-xl border border-slate-100 dark:border-slate-700"
              >
                <X size={20} />
              </button>

              <div className="h-56 w-full bg-slate-100 dark:bg-slate-800 relative">
                {selectedMeal.imageUrl ? (
                  <img src={selectedMeal.imageUrl} className="w-full h-full object-cover" alt="Meal" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                    <Utensils size={80} />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                  <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-1">
                    {new Date(selectedMeal.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <h2 className="text-3xl font-black text-white truncate leading-tight">
                    {selectedMeal.foods?.[0]?.name || 'Logged Entry'}
                  </h2>
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-8 flex flex-col gap-8 pb-12">
                <section>
                   <div className="flex justify-between items-center mb-5">
                      <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Composition</h3>
                      <div className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                        {selectedMeal.source === 'home' ? 'Home' : 'Ordered'}
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-[36px] flex flex-col items-center border border-slate-100 dark:border-slate-700 shadow-inner">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{Math.round(selectedMeal.totals?.calories || 0)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Kcal</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-2xl flex flex-col items-center border border-emerald-100 dark:border-emerald-900/40">
                           <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{Math.round(selectedMeal.totals?.protein || 0)}g</span>
                           <span className="text-[8px] font-black text-emerald-600/40 uppercase tracking-widest">Pro</span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-2xl flex flex-col items-center border border-blue-100 dark:border-blue-900/40">
                           <span className="font-black text-blue-600 dark:text-blue-400 text-sm">{Math.round(selectedMeal.totals?.carbs || 0)}g</span>
                           <span className="text-[8px] font-black text-blue-600/40 uppercase tracking-widest">Carb</span>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-2xl flex flex-col items-center border border-amber-100 dark:border-amber-900/40">
                           <span className="font-black text-amber-600 dark:text-amber-400 text-sm">{Math.round(selectedMeal.totals?.fat || 0)}g</span>
                           <span className="text-[8px] font-black text-amber-600/40 uppercase tracking-widest">Fat</span>
                        </div>
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-3 rounded-2xl flex flex-col items-center border border-indigo-100 dark:border-indigo-900/40">
                           <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{Math.round(selectedMeal.totals?.fiber || 0)}g</span>
                           <span className="text-[8px] font-black text-indigo-600/40 uppercase tracking-widest">Fib</span>
                        </div>
                      </div>
                   </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Components</h3>
                  <div className="flex flex-col gap-3">
                    {selectedMeal.foods?.map((f, i) => (
                      <div key={i} className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                         <div>
                            <p className="font-bold text-slate-900 dark:text-white capitalize text-sm">{f.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{f.quantity}</p>
                         </div>
                         <div className="text-right">
                            <p className="font-black text-slate-900 dark:text-white text-sm">{f.calories} <span className="text-[10px] opacity-60">kcal</span></p>
                            <div className="flex gap-1.5 justify-end mt-1">
                               <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">P:{f.protein}g</span>
                               <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">C:{f.carbs}g</span>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </section>

                {selectedMeal.restaurantName && (
                   <section className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-[36px] flex items-center gap-5 border border-orange-100 dark:border-orange-900/40 shadow-sm">
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-md border border-orange-50 dark:border-slate-800">
                        <MapPin className="text-orange-500" size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-orange-400 dark:text-orange-600 uppercase tracking-[0.2em]">Ordered From</p>
                        <p className="font-black text-slate-900 dark:text-white text-lg leading-tight">{selectedMeal.restaurantName}</p>
                      </div>
                   </section>
                )}

                <button 
                  onClick={() => handleDeleteClick(selectedMeal.id)}
                  className={`flex items-center justify-center gap-2 p-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all shadow-xl mt-4 ${
                    pendingDeleteId === selectedMeal.id 
                    ? 'bg-red-600 text-white animate-pulse' 
                    : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40'
                  }`}
                >
                  <Trash2 size={18} />
                  {pendingDeleteId === selectedMeal.id ? 'Tap to delete forever' : 'Delete this entry'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};