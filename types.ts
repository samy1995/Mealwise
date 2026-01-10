export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  email: string;
  preferences: string[];
  role: UserRole;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryRegion?: string;
  dietPreference?: string;
  allergens?: string[];
  dateOfBirth?: string | null;
}

export interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  country_region: string;
  email: string;
  diet_preference: string;
  allergens: string[];
  date_of_birth: string | null;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  sugar?: number;
}

export interface FoodItem extends NutritionInfo {
  name: string;
  quantity: string;
  confidence: number;
}

export type MealType = 'Eat' | 'Cooked' | 'Ordered';

export interface MealLog {
  id: string;
  userId: string;
  date: string; 
  type: 'meal' | 'recipe'; // 'recipe' maps to 'Cooked', 'meal' maps to 'Eat' or 'Ordered'
  foods: FoodItem[];
  totals: NutritionInfo;
  confidence: number;
  imageUrl?: string;
  source?: 'home' | 'ordered';
  restaurantName?: string;
}

export interface RecipeStep {
  instruction: string;
  nutritionalHighlight?: string;
  stepCalories?: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  cookingTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: FoodItem[];
  instructions: RecipeStep[];
  optionalIngredients: string[];
  imageUrl: string;
  drinkPairings: string[];
}

export interface MonthlyReport {
  month: string;
  behaviorSummary: string;
  patterns: string[];
  actionPlan: string;
  macroDistribution: {
    protein: number;
    fat: number;
    carbs: number;
  };
  sourceDistribution: {
    home: number;
    ordered: number;
  };
  trends: {
    label: string;
    value: number;
    direction: 'up' | 'down' | 'stable';
  }[];
  consistencyScore: number;
  insights: string[];
}