import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey });

export const handler = async (event: any) => {
  try {
    // Only accept POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: "Method not allowed" })
      };
    }

    const { action, payload } = JSON.parse(event.body || "{}");

    console.log(`[Gemini Function] Processing action: ${action}`);

    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Action is required" })
      };
    }

    let result: any;

    switch (action) {
      case "detectFood":
        result = await detectFood(payload.base64Image);
        break;
      case "calculateNutrition":
        result = await calculateNutritionForManualItems(payload.text);
        break;
      case "detectFridgeIngredients":
        result = await detectFridgeIngredients(payload.base64Image);
        break;
      case "generateRecipes":
        result = await generateRecipes(
          payload.ingredients,
          payload.dietPreference,
          payload.allergens
        );
        break;
      case "generateFoodImage":
        result = await generateFoodImage(payload.prompt);
        break;
      case "analyzeMonthlyBehavior":
        result = await analyzeMonthlyBehavior(
          payload.meals,
          payload.lastActionPlan
        );
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: `Unknown action: ${action}` })
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, data: result })
    };
  } catch (error: any) {
    console.error(`[Gemini Function] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message || "Internal server error"
      })
    };
  }
};

async function detectFood(base64Image: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        {
          text: "Analyze this meal photo. Identify all food items, their estimated portion sizes, and detailed nutrition (calories, protein, fat, carbs, fiber, sugar). Provide confidence scores for each detection. Return as JSON."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          foods: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fiber: { type: Type.NUMBER },
                sugar: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER }
              },
              required: [
                "name",
                "quantity",
                "calories",
                "protein",
                "fat",
                "carbs",
                "fiber",
                "sugar",
                "confidence"
              ]
            }
          },
          summary: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fiber: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER }
            },
            required: [
              "calories",
              "protein",
              "fat",
              "carbs",
              "fiber",
              "sugar"
            ]
          }
        },
        required: ["foods", "summary"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}

async function calculateNutritionForManualItems(text: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Calculate detailed nutrition for these manually entered ingredients: "${text}". Provide estimated quantity and per-item nutrition (calories, protein, fat, carbs, fiber, sugar). Set confidence to 1.0. Return as a JSON array of FoodItem objects.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER },
            sugar: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER }
          },
          required: [
            "name",
            "quantity",
            "calories",
            "protein",
            "fat",
            "carbs",
            "fiber",
            "sugar",
            "confidence"
          ]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

async function detectFridgeIngredients(base64Image: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        {
          text: "Identify all visible raw ingredients in this fridge or pantry photo. Return a simple JSON array of strings containing just the ingredient names."
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

async function generateRecipes(
  ingredients: string[],
  dietPreference: string = "no_preference",
  allergens: string[] = []
): Promise<any> {
  const allergenList =
    allergens.length > 0 ? allergens.join(", ") : "none";
  const dietPrompt =
    dietPreference !== "no_preference"
      ? `The user strictly follows a ${dietPreference} diet.`
      : "";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 3 healthy recipes using some or all of these ingredients: ${ingredients.join(", ")}.
      ${dietPrompt}
      CRITICAL: You MUST strictly exclude the following allergens: ${allergenList}.
      If available ingredients conflict with these restrictions, suggest safe substitutions.
      Include cooking time, difficulty, step-by-step instructions with nutritional highlights for each step, drink pairings, and nutrition info per ingredient.
      Return as JSON array of recipes.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            cookingTime: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  calories: { type: Type.NUMBER },
                  protein: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fiber: { type: Type.NUMBER },
                  sugar: { type: Type.NUMBER },
                  confidence: { type: Type.NUMBER }
                }
              }
            },
            instructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING },
                  nutritionalHighlight: { type: Type.STRING },
                  stepCalories: { type: Type.NUMBER }
                }
              }
            },
            optionalIngredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            drinkPairings: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }
  });

  const recipes: any[] = JSON.parse(response.text || "[]");
  return Promise.all(
    recipes.map(async (r) => {
      const imgUrl = await generateFoodImage(r.name);
      return {
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        imageUrl: imgUrl
      };
    })
  );
}

async function generateFoodImage(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: `A professional, appetizing studio photo of ${prompt}. Realistic food photography.`
          }
        ]
      },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) {
        return `data:image/png;base64,${(part as any).inlineData.data}`;
      }
    }
  } catch (e) {
    console.error("[Gemini Function] Image generation failed:", e);
  }
  return "https://picsum.photos/400/400";
}

async function analyzeMonthlyBehavior(
  meals: any[],
  lastActionPlan?: string
): Promise<any> {
  const recentMeals = meals.slice(0, 30).map((m) => ({
    date: m.date,
    type: m.type,
    source: m.source,
    restaurant: m.restaurantName,
    foods: m.foods?.map((f: any) => f.name).join(", "),
    totals: m.totals
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these meal logs: ${JSON.stringify(recentMeals)}. 
        You are a non-judgmental nutrition architect. 
        1) behaviorSummary: 1-2 sentence high-level behavioral insight (e.g. "You tend to cook more mid-week and order out on weekends"). Avoid starting with calories.
        2) patterns: 2-3 specific behavioral bullet points (plain language). Examples: "Protein dips on days you order lunch", "Late meals tend to be heavier".
        3) actionPlan: Exactly 1 simple, actionable one-liner suggestion. 
           CRITICAL: The action plan MUST be different from the previous one: "${lastActionPlan || "none"}". Choose a fresh recommendation.
        Also return macroDistributions, sourceDistributions, trends, and consistencyScore. Return as JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          behaviorSummary: { type: Type.STRING },
          patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionPlan: { type: Type.STRING },
          macroDistribution: {
            type: Type.OBJECT,
            properties: {
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER }
            },
            required: ["protein", "fat", "carbs"]
          },
          sourceDistribution: {
            type: Type.OBJECT,
            properties: {
              home: { type: Type.NUMBER },
              ordered: { type: Type.NUMBER }
            },
            required: ["home", "ordered"]
          },
          trends: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.NUMBER },
                direction: { type: Type.STRING }
              },
              required: ["label", "value", "direction"]
            }
          },
          consistencyScore: { type: Type.NUMBER }
        },
        required: [
          "behaviorSummary",
          "patterns",
          "actionPlan",
          "macroDistribution",
          "sourceDistribution",
          "trends",
          "consistencyScore"
        ]
      }
    }
  });
  return JSON.parse(response.text || "{}");
}
