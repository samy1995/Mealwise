import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { MealLog, User } from '../types';
import { Loader2, BrainCircuit, Home, ShoppingBag, Lightbulb, Sparkles, ChevronLeft, ChevronRight, Calendar, Info } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';

interface FoodMemoryProps {
  user: User;
  onHomeClick?: () => void;
}

export const FoodMemory: React.FC<FoodMemoryProps> = ({ user, onHomeClick }) => {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<MealLog[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const ageBucket = useMemo(() => {
    if (!user.dateOfBirth) return null;
    const birthDate = new Date(user.dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    
    if (age >= 18 && age <= 29) return '18-29';
    if (age >= 30 && age <= 49) return '30-49';
    if (age >= 50) return '50+';
    return null;
  }, [user.dateOfBirth]);

  const ageInsight = useMemo(() => {
    switch (ageBucket) {
      case '18-29': return "Many people in this range feel best with consistent meals across the day.";
      case '30-49': return "A steady rhythm and a bit more protein earlier can feel more grounding for energy.";
      case '50+': return "Many people enjoy simpler, consistent meals that keep energy steady.";
      default: return null;
    }
  }, [ageBucket]);

  const lastPlanKey = useMemo(() => {
    return `mealwise_last_action_plan_${user.id}_${selectedMonth}`;
  }, [user.id, selectedMonth]);

  const filteredHistory = useMemo(() => {
    return history.filter(m => m.date.startsWith(selectedMonth));
  }, [history, selectedMonth]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const sinceISO = `${selectedMonth}-01T00:00:00Z`;
        const meals = await dbService.getMealsForUser({ sinceISO, limit: 100 });
        setHistory(meals);

        if (meals.length >= 3) {
          const lastActionPlan = localStorage.getItem(lastPlanKey) || '';
          const result = await geminiService.analyzeMonthlyBehavior(meals, lastActionPlan);

          if (result) {
            localStorage.setItem(lastPlanKey, result.actionPlan);
            setReport(result);
          }
        } else {
          setReport(null);
        }
      } catch (e: any) {
        console.error("FoodMemory Error:", e instanceof Error ? e.message : JSON.stringify(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user.id, selectedMonth, lastPlanKey]);

  const localStats = useMemo(() => {
    const homeCount = filteredHistory.filter(m => m.source === 'home').length;
    const orderedCount = filteredHistory.filter(m => m.source === 'ordered').length;
    const totalMeals = homeCount + orderedCount;

    const totals = filteredHistory.reduce((acc, m) => ({
      p: acc.p + (m.totals?.protein || 0),
      f: acc.f + (m.totals?.fat || 0),
      c: acc.c + (m.totals?.carbs || 0)
    }), { p: 0, f: 0, c: 0 });

    const macroSum = totals.p + totals.f + totals.c || 1;

    return {
      homeCount,
      orderedCount,
      totalMeals,
      macros: {
        protein: Math.round((totals.p / macroSum) * 100),
        fat: Math.round((totals.f / macroSum) * 100),
        carbs: Math.round((totals.c / macroSum) * 100)
      }
    };
  }, [filteredHistory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center animate-in fade-in duration-500">
        <div className="relative">
          <Loader2 className="animate-spin text-indigo-500" size={64} />
          <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-300" size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Analyzing your food patterns...</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">Building a non-judgmental map of your kitchen habits.</p>
      </div>
    );
  }

  const macroData = [
    { name: 'Protein', value: localStats.macros.protein, color: '#10b981' },
    { name: 'Carbs', value: localStats.macros.carbs, color: '#3b82f6' },
    { name: 'Fat', value: localStats.macros.fat, color: '#f59e0b' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      <div className="px-4 flex flex-col flex-shrink-0">
        <PageHeader title="Food Memory" onHomeClick={onHomeClick} />
        <div className="flex items-center justify-between mt-[-16px] mb-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 dark:text-slate-600 hover:text-indigo-500 transition-colors"><ChevronLeft size={20}/></button>
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest text-xs">
            <Calendar size={14} className="text-indigo-500" />
            {monthLabel}
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 dark:text-slate-600 hover:text-indigo-500 transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>

      <main className="flex-1 internal-scroll px-4 pb-[120px]">
        {filteredHistory.length < 3 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[40px] border border-slate-100 dark:border-slate-800 text-center flex flex-col items-center gap-6">
             <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full text-slate-200 dark:text-slate-700">
                <Sparkles size={48} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">A Fresh Canvas</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Log {3 - filteredHistory.length} more meals in {monthLabel} to unlock pattern recognition.</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {report && (
              <section className="flex flex-col gap-4">
                <div className="bg-slate-900 dark:bg-indigo-950 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles size={16} className="text-indigo-400" />
                      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Monthly Narrative</h2>
                    </div>
                    <p className="text-xl font-medium leading-relaxed italic">
                      "{report.behaviorSummary}"
                    </p>
                  </div>
                </div>

                {ageInsight && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-4">
                    <div className="bg-indigo-500 text-white p-2 rounded-xl shrink-0">
                      <Info size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Age-aware Insight</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {ageInsight}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-emerald-500 p-6 rounded-[32px] text-white shadow-lg flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Action Plan</span>
                    <p className="font-bold text-lg leading-tight">{report.actionPlan}</p>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-6 text-center">Macro Distribution</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around mt-4">
                {macroData.map((d) => (
                  <div key={d.name} className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{d.name}</span>
                    <span className="text-lg font-black text-slate-800 dark:text-white">{Math.round(d.value)}%</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
                 <Home className="text-indigo-500 mb-2" size={24} />
                 <span className="text-2xl font-black text-slate-800 dark:text-white">{localStats.homeCount}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Home Meals</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
                 <ShoppingBag className="text-orange-500 mb-2" size={24} />
                 <span className="text-2xl font-black text-slate-800 dark:text-white">{localStats.orderedCount}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ordered Out</span>
              </div>
            </div>
            <AppFooter />
          </div>
        )}
      </main>
    </div>
  );
};
