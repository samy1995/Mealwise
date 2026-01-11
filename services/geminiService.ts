import { FoodItem, NutritionInfo, Recipe, RecipeStep } from "../types";

const API_URL = "/.netlify/functions/gemini";

async function callGeminiFunction(action: string, payload: any): Promise<any> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, payload })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.error || "Unknown error from Gemini function");
    }

    return result.data;
  } catch (error) {
    console.error(`[geminiService] Error calling ${action}:`, error);
    throw error;
  }
}

export const geminiService = {
  detectFood: async (base64Image: string): Promise<{ foods: FoodItem[], summary: NutritionInfo }> => {
    return callGeminiFunction("detectFood", { base64Image });
  },

  calculateNutritionForManualItems: async (text: string): Promise<FoodItem[]> => {
    return callGeminiFunction("calculateNutrition", { text });
  },

  detectFridgeIngredients: async (base64Image: string): Promise<string[]> => {
    return callGeminiFunction("detectFridgeIngredients", { base64Image });
  },

  generateRecipes: async (ingredients: string[], dietPreference: string = 'no_preference', allergens: string[] = []): Promise<Recipe[]> => {
    return callGeminiFunction("generateRecipes", {
      ingredients,
      dietPreference,
      allergens
    });
  },

  generateFoodImage: async (prompt: string): Promise<string> => {
    return callGeminiFunction("generateFoodImage", { prompt });
  },

  analyzeMonthlyBehavior: async (meals: any[], lastActionPlan?: string): Promise<any> => {
    return callGeminiFunction("analyzeMonthlyBehavior", {
      meals,
      lastActionPlan
    });
  }
};