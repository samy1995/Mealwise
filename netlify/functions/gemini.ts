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
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const { action, payload } = JSON.parse(event.body || "{}");

    console.log(`[Gemini Function] Processing action: ${action}`);

    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Action is required" }),
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
        result = await analyzeMonthlyBehavior(payload.meals, payload.lastActionPlan);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: `Unknown action: ${action}` }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, data: result }),
    };
  } catch (error: any) {
    console.error(`[Gemini Function] Error:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: error.message || "Internal server error",
      }),
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
          text:
            "Analyze this meal photo. Identify all food items, their estimated portion sizes, and detailed nutrition " +
            "(calories, protein, fat, carbs, fiber, sugar). Provide confidence scores for each detection. Return as JSON.",
        },
      ],
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
                confidence: { type: Type.NUMBER },
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
                "confidence",
              ],
            },
          },
          summary: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fiber: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER },
            },
            required: ["calories", "protein", "fat", "carbs", "fiber", "sugar"],
          },
        },
        required: ["foods", "summary"],
      },
    },
  });

  return JSON.parse((response as any).text || "{}");
}

async function calculateNutritionForManualItems(text: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents:
      `Calculate detailed nutrition for these manually entered ingredients: "${text}". ` +
      "Provide estimated quantity and per-item nutrition (calories, protein, fat, carbs, fiber, sugar). " +
      "Set confidence to 1.0. Return as a JSON array of FoodItem objects.",
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
            confidence: { type: Type.NUMBER },
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
            "confidence",
          ],
        },
      },
    },
  });

  return JSON.parse((response as any).text || "[]");
}

async function detectFridgeIngredients(base64Image: string): Promise<any> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        {
          text:
            "Identify all visible raw ingredients in this fridge or pantry photo. " +
            "Return a simple JSON array of strings containing just the ingredient names.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
  });

  return JSON.parse((response as any).text || "[]");
}

async function generateRecipes(
  ingredients: string[],
  dietPreference: string = "no_preference",
  allergens: string[] = []
): Promise<any> {
  const allergenList = allergens.length > 0 ? allergens.join(", ") : "none";
  const dietPrompt =
    dietPreference !== "no_preference"
      ? `The user strictly follows a ${dietPreference} diet.`
      : "";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents:
      `Generate 3 healthy recipes using some or all of these ingredients: ${ingredients.join(", ")}.\n` +
      `${dietPrompt}\n` +
      `CRITICAL: You MUST strictly exclude the following allergens: ${allergenList}.\n` +
      "If available ingredients conflict with these restrictions, suggest safe substitutions.\n" +
      "Include cooking time, difficulty, step-by-step instructions with nutritional highlights for each step, " +
      "drink pairings, and nutrition info per ingredient. Return as JSON array of recipes.",
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
                  confidence: { type: Type.NUMBER },
                },
              },
            },
            instructions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  instruction: { type: Type.STRING },
                  nutritionalHighlight: { type: Type.STRING },
                  stepCalories: { type: Type.NUMBER },
                },
              },
            },
            optionalIngredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            drinkPairings: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
      },
    },
  });

  const recipes: any[] = JSON.parse((response as any).text || "[]");

  // IMPORTANT: Always generate a STABLE image for cook module recipes:
  // - Prefer Gemini inline image (data URL) so it never changes later.
  // - If Gemini image generation fails, return a deterministic food placeholder (still food-themed).
  return Promise.all(
    recipes.map(async (r) => {
      const imgUrl = await generateFoodImage(r.name);
      return {
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        imageUrl: imgUrl,
      };
    })
  );
}

async function generateFoodImage(prompt: string): Promise<string> {
  const safePrompt = (prompt || "").trim() || "food";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text:
              `Generate ONLY a realistic studio food photo of: ${safePrompt}. ` +
              "No scenery, no nature, no people, no text, no logos. Neutral background. Close-up food framing.",
          },
        ],
      },
      config: {
        // Force image output
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "1:1" },
      } as any,
    });

    const parts = (response as any)?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inline = (part as any)?.inlineData;
      const b64 = inline?.data;

      if (typeof b64 === "string" && b64.length > 1000) {
        const base64LooksValid = /^[A-Za-z0-9+/=\s]+$/.test(b64);
        if (base64LooksValid) {
          const mime = inline?.mimeType || "image/png";
          return `data:${mime};base64,${b64.replace(/\s/g, "")}`;
        }
      }
    }

    console.warn("[Gemini Function] No valid inline image returned for prompt:", safePrompt);
  } catch (e) {
    console.error("[Gemini Function] Image generation failed:", e);
  }

  // Stable, food-specific fallback (non-random). If remote is blocked, UI should show a placeholder.
  // This avoids picsum nature randomness and avoids cache-busters that change on refresh.
  return `https://placehold.co/512x512/png?text=${encodeURIComponent(
    `Mealwise: ${safePrompt}`
  )}`;
}

async function analyzeMonthlyBehavior(meals: any[], lastActionPlan?: string): Promise<any> {
  const recentMeals = (meals || []).slice(0, 30).map((m) => ({
    date: m.date,
    type: m.type,
    source: m.source,
    restaurant: m.restaurantName,
    foods: m.foods?.map((f: any) => f.name).join(", "),
    totals: m.totals,
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents:
      `Analyze these meal logs: ${JSON.stringify(recentMeals)}.\n` +
      "You are a non-judgmental nutrition architect.\n" +
      "Return JSON with:\n" +
      "1) behaviorSummary: 1-2 sentence high-level behavioral insight. Avoid starting with calories.\n" +
      "2) patterns: 2-3 plain-language pattern bullets.\n" +
      `3) actionPlan: Exactly 1 simple, actionable one-liner. MUST be different from previous: "${lastActionPlan || "none"}".\n` +
      "4) positiveQuotes: 2-3 short, upbeat foodie-friendly lines (no judgment, no medical claims).\n" +
      "Also include macroDistribution, sourceDistribution, trends, consistencyScore.\n" +
      "No prescriptive or medical language. No strict targets. Keep it encouraging.\n",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          behaviorSummary: { type: Type.STRING },
          patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionPlan: { type: Type.STRING },

          // NEW: bring back positive quotes in Memory module
          positiveQuotes: { type: Type.ARRAY, items: { type: Type.STRING } },

          macroDistribution: {
            type: Type.OBJECT,
            properties: {
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
            },
            required: ["protein", "fat", "carbs"],
          },
          sourceDistribution: {
            type: Type.OBJECT,
            properties: {
              home: { type: Type.NUMBER },
              ordered: { type: Type.NUMBER },
            },
            required: ["home", "ordered"],
          },
          trends: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.NUMBER },
                direction: { type: Type.STRING },
              },
              required: ["label", "value", "direction"],
            },
          },
          consistencyScore: { type: Type.NUMBER },
        },
        required: [
          "behaviorSummary",
          "patterns",
          "actionPlan",
          "positiveQuotes",
          "macroDistribution",
          "sourceDistribution",
          "trends",
          "consistencyScore",
        ],
      },
    },
  });

  return JSON.parse((response as any).text || "{}");
}