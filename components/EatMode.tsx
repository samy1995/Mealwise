import React, { useState, useRef, useMemo } from 'react';
import { Camera, Check, Loader2, Sparkles, Home, ShoppingBag, MapPin, Plus, X, AlertCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import { FoodItem, NutritionInfo, User } from '../types';
import { processImageFileToDataUrl } from '../utils/image';
import { PageHeader } from './PageHeader';
import { AppFooter } from './AppFooter';

interface EatModeProps {
  user: User;
  onLogged: () => void;
  onHomeClick?: () => void;
}

export const EatMode: React.FC<EatModeProps> = ({ user, onLogged, onHomeClick }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{ foods: FoodItem[], summary: NutritionInfo } | null>(null);
  const [source, setSource] = useState<'home' | 'ordered' | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [manualText, setManualText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dismissedAllergens, setDismissedAllergens] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectedAllergenWarnings = useMemo(() => {
    if (!analysis || !user.allergens || user.allergens.length === 0) return [];
    
    const warnings: string[] = [];
    const normalizedUserAllergenList = user.allergens.map(a => a.toLowerCase().trim());
    
    analysis.foods.forEach(food => {
      const foodName = food.name.toLowerCase();
      normalizedUserAllergenList.forEach(allergen => {
        if (foodName.includes(allergen) || allergen.includes(foodName)) {
          if (!warnings.includes(allergen)) warnings.push(allergen);
        }
      });
    });
    
    return warnings;
  }, [analysis, user.allergens]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setError(null);
      setDismissedAllergens(false);
      try {
        const { dataUrl } = await processImageFileToDataUrl(file);
        setImage(dataUrl);
        await analyzeImage(dataUrl);
      } catch (err: any) {
        console.error("Image process error:", err);
        setError(err.message || "Failed to process image. Make sure it's a valid photo.");
        setLoading(false);
      }
    }
  };

  const analyzeImage = async (dataUrl: string) => {
    try {
      const base64 = dataUrl.split(',')[1];
      const result = await geminiService.detectFood(base64);
      setAnalysis(result);
    } catch (e) {
      setError("AI analysis failed. Please try again with a clearer photo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualIngredient = async () => {
    if (!manualText.trim() || !analysis) return;
    setManualLoading(true);
    setError(null);
    try {
      const newItems = await geminiService.calculateNutritionForManualItems(manualText);
      const updatedFoods = [...analysis.foods, ...newItems];
      const updatedSummary = updatedFoods.reduce((acc, curr) => ({
        calories: acc.calories + curr.calories,
        protein: acc.protein + curr.protein,
        fat: acc.fat + curr.fat,
        carbs: acc.carbs + curr.carbs,
        fiber: (acc.fiber || 0) + (curr.fiber || 0),
        sugar: (acc.sugar || 0) + (curr.sugar || 0),
      }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 });

      setAnalysis({
        foods: updatedFoods,
        summary: updatedSummary
      });
      setManualText('');
    } catch (e) {
      setError("Manual calculation failed.");
    } finally {
      setManualLoading(false);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    if (!analysis) return;
    const updatedFoods = analysis.foods.filter((_, i) => i !== index);
    const updatedSummary = updatedFoods.reduce((acc, curr) => ({
      calories: acc.calories + curr.calories,
      protein: acc.protein + curr.protein,
      fat: acc.fat + curr.fat,
      carbs: acc.carbs + curr.carbs,
      fiber: (acc.fiber || 0) + (curr.fiber || 0),
      sugar: (acc.sugar || 0) + (curr.sugar || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 });

    setAnalysis({
      foods: updatedFoods,
      summary: updatedSummary
    });
  };

  const handleSave = async () => {
    if (!analysis || !source) return;
    setSaveLoading(true);
    setError(null);
    try {
      await dbService.saveMeal({
        type: 'meal',
        foods: analysis.foods,
        totals: analysis.summary,
        confidence: analysis.foods.reduce((acc, curr) => acc + curr.confidence, 0) / analysis.foods.length,
        imageUrl: image || undefined,
        source: source,
        restaurantName: source === 'ordered' ? restaurantName : undefined
      });
      setAnalysis(null);
      setImage(null);
      setSource(null);
      setRestaurantName('');
      onLogged();
    } catch (e: any) {
      setError(e.message || "Failed to log meal. Cloud sync issue.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto internal-scroll p-4 gap-6 animate-in fade-in duration-500 pb-20">
      <PageHeader 
        title="Log a Meal" 
        subtitle="Capture your plate, we'll do the rest." 
        onHomeClick={onHomeClick}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-2xl flex items-start gap-3 text-red-800 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={20} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!image ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors shadow-sm"
        >
          <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-full text-indigo-500">
            <Camera size={48} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Take a photo of your food</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">Tap to upload</p>
          <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="relative aspect-video rounded-3xl overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <img 
              src={image} 
              alt="Food" 
              className="w-full h-full object-cover" 
            />
            {loading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                <Loader2 className="animate-spin" size={40} />
                <p className="font-bold uppercase tracking-widest text-sm">Analyzing plate...</p>
              </div>
            )}
          </div>

          {analysis && !source && (
            <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center">Where did this come from?</h2>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setSource('home')}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 hover:border-indigo-500 transition-all group shadow-sm"
                >
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-full text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <Home size={32} />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Home Cooked</span>
                </button>
                <button 
                  onClick={() => setSource('ordered')}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 hover:border-indigo-500 transition-all group shadow-sm"
                >
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-full text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <ShoppingBag size={32} />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Ordered Out</span>
                </button>
              </div>
            </div>
          )}

          {analysis && source && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 pb-10">
              {source === 'ordered' && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/40 flex items-center gap-3 shadow-sm">
                  <MapPin className="text-orange-500" size={20} />
                  <input 
                    type="text"
                    placeholder="Restaurant Name"
                    className="flex-grow outline-none text-slate-800 dark:text-white bg-transparent font-medium text-base"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                  />
                </div>
              )}

              <div className="bg-indigo-600 p-5 rounded-3xl text-white flex justify-between items-center shadow-xl">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Calories</span>
                  <span className="text-3xl font-black">{Math.round(analysis.summary.calories)} <span className="text-sm opacity-60">kcal</span></span>
                </div>
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Result</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center shadow-sm">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Protein</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">{Math.round(analysis.summary.protein)}g</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center shadow-sm">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Carbs</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">{Math.round(analysis.summary.carbs)}g</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center shadow-sm">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black tracking-widest">Fat</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">{Math.round(analysis.summary.fat)}g</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Detected Items</h3>
                <div className="flex flex-col gap-2">
                  {analysis.foods.map((food, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 capitalize text-sm">{food.name}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{food.quantity}</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div className="flex flex-col">
                          <p className="font-black text-slate-700 dark:text-slate-300 text-sm">{food.calories} <span className="text-[10px] opacity-60">kcal</span></p>
                          <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">{Math.round(food.confidence * 100)}% Conf</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveIngredient(i)}
                          className="text-slate-300 dark:text-slate-700 hover:text-red-500 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-2">
                  <input 
                    type="text"
                    placeholder="Missing something? (e.g. 1 egg)"
                    className="flex-grow bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-base outline-none focus:border-indigo-500 transition-all dark:text-white shadow-sm"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualIngredient()}
                  />
                  <button 
                    onClick={handleAddManualIngredient}
                    disabled={manualLoading || !manualText.trim()}
                    className="bg-indigo-600 text-white p-3 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
                  >
                    {manualLoading ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
                  </button>
                </div>
              </div>

              {detectedAllergenWarnings.length > 0 && !dismissedAllergens && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-5 rounded-[24px] flex flex-col gap-3 animate-in shake duration-500 shadow-sm mt-2">
                   <div className="flex items-start gap-3 text-amber-900 dark:text-amber-400">
                     <AlertCircle size={24} className="flex-shrink-0 mt-0.5 text-amber-600" />
                     <div className="flex flex-col gap-1">
                       <h4 className="font-black uppercase tracking-widest text-xs">Allergen Warning</h4>
                       <p className="text-xs leading-relaxed font-medium">
                         Detected: <span className="font-black underline">{detectedAllergenWarnings.join(', ')}</span>.
                         Ensure these are safe for your consumption.
                       </p>
                     </div>
                   </div>
                   <div className="flex gap-3 pt-1">
                      <button 
                        onClick={() => setDismissedAllergens(true)}
                        className="flex-1 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-sm"
                      >
                        Confirm & Log
                      </button>
                      <button 
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex-1 bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl shadow-sm"
                      >
                        Review Plate
                      </button>
                   </div>
                </div>
              )}

              <button 
                onClick={handleSave}
                disabled={saveLoading}
                className="bg-slate-900 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black text-lg flex items-center justify-center gap-2 mt-6 active:scale-95 transition-transform shadow-2xl disabled:opacity-70"
              >
                {saveLoading ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />}
                SAVE MEAL LOG
              </button>

              <button 
                onClick={() => { setAnalysis(null); setImage(null); setSource(null); setError(null); }}
                className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] py-4 text-center hover:text-indigo-500 transition-colors"
              >
                Reset Capture
              </button>
            </div>
          )}
        </div>
      )}
      <AppFooter />
    </div>
  );
};