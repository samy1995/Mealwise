import React, { useMemo, useRef, useState } from 'react';
import { ChefHat, Plus, Loader2, BarChart, ChevronRight, Camera, X, GlassWater, Flame, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { Recipe, User } from '../types';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';

interface CookModeProps {
  user: User;
  onLogged?: () => void;
  onHomeClick?: () => void;
}

type BusyState = 'idle' | 'scanning' | 'generating' | 'logging';

export const CookMode: React.FC<CookModeProps> = ({ user, onLogged, onHomeClick }) => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [busy, setBusy] = useState<BusyState>('idle');

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCooking, setIsCooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addIngredient = () => {
    const v = inputValue.trim();
    if (!v) return;
    setIngredients(prev => Array.from(new Set([...prev, v])));
    setInputValue('');
  };

  const handleFridgePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy('scanning');
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const detected = await geminiService.detectFridgeIngredients(base64);
      if (Array.isArray(detected)) {
        setIngredients(prev => Array.from(new Set([...prev, ...detected])));
      }
    } catch (err) {
      setError("Could not scan ingredients.");
    } finally {
      setBusy('idle');
      e.target.value = '';
    }
  };

  const generateRecipes = async () => {
    if (ingredients.length === 0) return;
    setBusy('generating');
    setError(null);
    try {
      const results = await geminiService.generateRecipes(ingredients, user.dietPreference, user.allergens);
      setRecipes(results);
    } catch (err) {
      setError("Failed to generate recipes.");
    } finally {
      setBusy('idle');
    }
  };

  const logRecipe = async () => {
    if (!selectedRecipe) return;
    setBusy('logging');
    try {
      const totals = selectedRecipe.ingredients.reduce((acc, curr) => ({
        calories: acc.calories + (curr.calories || 0),
        protein: acc.protein + (curr.protein || 0),
        fat: acc.fat + (curr.fat || 0),
        carbs: acc.carbs + (curr.carbs || 0),
        fiber: (acc.fiber || 0) + (curr.fiber || 0),
        sugar: (acc.sugar || 0) + (curr.sugar || 0),
      }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 });

      await dbService.saveMeal({
        type: 'recipe',
        foods: selectedRecipe.ingredients,
        totals,
        source: 'home',
        imageUrl: selectedRecipe.imageUrl,
        drinkPairings: selectedRecipe.drinkPairings,
        confidence: 1.0
      });
      setIsCooking(false);
      setSelectedRecipe(null);
      if (onLogged) onLogged();
    } catch (err) {
      setError("Failed to log recipe.");
    } finally {
      setBusy('idle');
    }
  };

  // 1. ACTIVE COOKING VIEW (Step-by-Step)
  // Changed from absolute/fixed fullscreen to relative layout that respects App's footer
  if (isCooking && selectedRecipe) {
    const step = selectedRecipe.instructions[currentStep];
    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button 
            onClick={() => setIsCooking(false)} 
            className="text-slate-400 dark:text-slate-500 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Step {currentStep + 1} of {selectedRecipe.instructions.length}</span>
             <h2 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[200px]">{selectedRecipe.name}</h2>
          </div>
          <div className="w-10"></div>
        </header>

        {/* Scrollable Instruction Area */}
        <main className="flex-1 overflow-y-auto internal-scroll px-6 py-10">
          <div className="max-w-md mx-auto flex flex-col items-center gap-8">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] text-indigo-500 shadow-xl border border-slate-100 dark:border-slate-800">
               <ChefHat size={64} className="animate-pulse" />
            </div>
            
            <div className="flex flex-col gap-4 text-center">
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {step.instruction}
              </p>
              
              {step.nutritionalHighlight && (
                <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-5 py-2.5 rounded-full mx-auto text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/40">
                  <Flame size={14} />
                  {step.nutritionalHighlight}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Local Footer Navigation - Inside the main area, sitting above global tabs */}
        <footer className="shrink-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-10 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`flex-1 min-h-[56px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all text-xs disabled:opacity-30`}
          >
            Back
          </button>
          
          {currentStep < selectedRecipe.instructions.length - 1 ? (
            <button 
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="flex-[2] min-h-[56px] bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all text-xs"
            >
              Next Step
            </button>
          ) : (
            <button 
              onClick={logRecipe}
              disabled={busy === 'logging'}
              className="flex-[2] min-h-[56px] bg-slate-900 dark:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center text-xs disabled:opacity-70"
            >
              {busy === 'logging' ? <Loader2 className="animate-spin" /> : 'Finish & Log'}
            </button>
          )}
        </footer>
      </div>
    );
  }

  // 2. RECIPE DETAIL PREVIEW
  // Changed from absolute/fixed fullscreen to relative layout that respects App's footer
  if (selectedRecipe) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-950 animate-in slide-in-from-right duration-300">
        <div className="flex-1 overflow-y-auto internal-scroll">
          <div className="relative aspect-video">
            <img src={selectedRecipe.imageUrl} className="w-full h-full object-cover" alt={selectedRecipe.name} />
            <button 
              onClick={() => setSelectedRecipe(null)}
              className="absolute top-4 left-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2 rounded-full text-slate-900 dark:text-white shadow-xl"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
          </div>
          
          <div className="p-8 bg-white dark:bg-slate-950 rounded-t-[40px] -mt-10 relative z-10 flex flex-col gap-8 border-t border-slate-100 dark:border-slate-800">
            <header>
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full">{selectedRecipe.difficulty}</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full">{selectedRecipe.cookingTime}</span>
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{selectedRecipe.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-medium">{selectedRecipe.description}</p>
            </header>

            <section className="pb-10">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Ingredients</h3>
              <ul className="flex flex-col gap-3">
                {selectedRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <span className="text-slate-700 dark:text-slate-300 font-bold text-sm">{ing.name}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">{ing.quantity}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <footer className="shrink-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 z-10">
          <button 
            onClick={() => {
              setCurrentStep(0);
              setIsCooking(true);
            }}
            className="w-full min-h-[56px] bg-slate-900 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black text-base uppercase tracking-widest shadow-2xl active:scale-95 transition-transform"
          >
            Start Cooking
          </button>
        </footer>
      </div>
    );
  }

  // 3. MAIN COOK MODE SCREEN (Ingredients list + inputs)
  return (
    <div className="h-full flex flex-col overflow-y-auto internal-scroll p-4 gap-6 animate-in fade-in duration-500 pb-20">
      <PageHeader title="Cook Mode" subtitle="AI-driven meal suggestions." onHomeClick={onHomeClick} />
      
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl flex items-center gap-3 text-red-800 dark:text-red-400 text-sm border border-red-100 dark:border-red-900/40">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 h-16">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 p-5 rounded-3xl flex items-center justify-center shrink-0 w-16 active:scale-95 transition-transform shadow-sm"
          >
            {busy === 'scanning' ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFridgePhoto} 
          />
          
          <input 
            type="text" 
            placeholder="Add ingredient..." 
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl px-5 outline-none focus:border-indigo-500 dark:text-white text-base shadow-sm"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
          />
          <button onClick={addIngredient} className="bg-indigo-600 text-white p-4 rounded-3xl shrink-0 active:scale-95 transition-transform">
            <Plus size={24} />
          </button>
        </div>

        {ingredients.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap gap-2 animate-in zoom-in-95">
            {ingredients.map((ing, i) => (
              <span key={i} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                {ing}
                <button onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} className="hover:text-red-500 transition-colors"><X size={14} /></button>
              </span>
            ))}
          </div>
        )}

        <button 
          onClick={generateRecipes}
          disabled={ingredients.length < 1 || busy !== 'idle'}
          className="bg-slate-900 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform shadow-xl"
        >
          {busy === 'generating' ? <Loader2 className="animate-spin" /> : <ChefHat size={20} />}
          {busy === 'generating' ? 'Searching Recipes...' : 'Generate Recipes'}
        </button>
      </div>

      <div className="flex flex-col gap-6 mt-4 pb-10">
        {recipes.map((recipe) => (
          <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]">
            <div className="h-40 relative">
              <img src={recipe.imageUrl} className="w-full h-full object-cover" alt={recipe.name} />
              <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                {recipe.cookingTime}
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg leading-tight">{recipe.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed font-medium">{recipe.description}</p>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <BarChart size={14} />
                  <span>{recipe.difficulty}</span>
                </div>
                <div className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
                  Cook this <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AppFooter />
    </div>
  );
};
