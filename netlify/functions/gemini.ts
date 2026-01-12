import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey });

export const handler = async (event: any) => {
  try {
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: "GEMINI_API_KEY is not set on the server" }),
      };
    }

    // Only accept POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
      };
    }

    const { action, payload } = parsed;

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
        result = await detectFood(payload?.base64Image);
        break;

      case "calculateNutrition":
        result = await calculateNutritionForManualItems(payload?.text);
        break;

      case "detectFridgeIngredients":
        result = await detectFridgeIngredients(payload?.base64Image);
        break;

      case "generateRecipes":
        result = await generateRecipes(
          payload?.ingredients || [],
          payload?.dietPreference || "no_preference",
          payload?.allergens || []
        );
        break;

      case "generateFoodImage":
        result = await generateFoodImage(payload?.prompt || "");
        break;

      case "analyzeMonthlyBehavior":
        // Ensure Memory always has a narrative + patterns + actionPlan (even if Gemini fails)
        result = await analyzeMonthlyBehaviorSafe(payload?.meals || [], payload?.lastActionPlan);
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
        error: error?.message || "Internal server error",
      }),
    };
  }
};

async function detectFood(base64Image: string): Promise<any> {
  if (!base64Image) return { foods: [], summary: emptyNutrition() };

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        {
          text:
            "Analyze this meal photo. Identify all food items, their estimated portion sizes, and detailed nutrition (calories, protein, fat, carbs, fiber, sugar). Provide confidence scores for each detection. Return as JSON.",
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

  try {
    return JSON.parse((response as any).text || "{}");
  } catch {
    return { foods: [], summary: emptyNutrition() };
  }
}

async function calculateNutritionForManualItems(text: string): Promise<any> {
  if (!text?.trim()) return [];

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

  try {
    return JSON.parse((response as any).text || "[]");
  } catch {
    return [];
  }
}

async function detectFridgeIngredients(base64Image: string): Promise<any> {
  if (!base64Image) return [];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        {
          text:
            "Identify all visible raw ingredients in this fridge or pantry photo. Return a simple JSON array of strings containing just the ingredient names.",
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

  try {
    return JSON.parse((response as any).text || "[]");
  } catch {
    return [];
  }
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
    contents: `Generate 3 healthy recipes using some or all of these ingredients: ${ingredients.join(", ")}.
${dietPrompt}
CRITICAL: You MUST strictly exclude the following allergens: ${allergenList}.
If available ingredients conflict with these restrictions, suggest safe substitutions.
Return as JSON array of recipes with:
name, description, cookingTime, difficulty,
ingredients (array of objects with name, quantity, calories, protein, fat, carbs, fiber, sugar, confidence),
instructions (array of objects with instruction, nutritionalHighlight, stepCalories),
optionalIngredients (array of strings),
drinkPairings (array of strings).`,
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

  let recipes: any[] = [];
  try {
    recipes = JSON.parse((response as any).text || "[]");
  } catch {
    recipes = [];
  }

  // Add images (best-effort). If image gen fails, keep a safe food placeholder.
  const withImages = await Promise.all(
    recipes.map(async (r) => {
      const name = (r?.name || "").toString().trim();
      const imgUrl = await generateFoodImageSafe(
        name ? `Studio food photo of ${name}` : "Studio food photo of a healthy meal"
      );

      return {
        ...r,
        id: Math.random().toString(36).slice(2, 11),
        imageUrl: imgUrl,
      };
    })
  );

  return withImages;
}

/**
 * FIX: Use Gemini native image generation correctly.
 * Your old version often returned no inlineData, so you fell back to picsum or broke images.
 */
async function generateFoodImage(prompt: string): Promise<string> {
  const cleanPrompt = (prompt || "").trim();
  if (!cleanPrompt) return foodFallbackUrl();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    // IMPORTANT: pass contents as a string (per official examples)
    contents: `Create a realistic, appetizing food photo: ${cleanPrompt}. Clean background. No text. No people. No nature-only scenes.`,
    // Best-effort: request image modality (some SDKs accept this)
    config: {
      // If the SDK ignores it, it’s fine. It still returns inlineData in many cases.
      responseModalities: ["IMAGE"],
    } as any,
  });

  const parts =
    (response as any)?.candidates?.[0]?.content?.parts ||
    (response as any)?.candidates?.[0]?.content?.parts ||
    [];

  for (const part of parts) {
    if ((part as any).inlineData?.data) {
      const b64 = (part as any).inlineData.data;
      return `data:image/png;base64,${b64}`;
    }
  }

  // If Gemini returns only text (rare), don’t break the UI.
  return foodFallbackUrl();
}

async function generateFoodImageSafe(prompt: string): Promise<string> {
  try {
    return await generateFoodImage(prompt);
  } catch (e) {
    console.error("[Gemini Function] Image generation failed:", e);
    return foodFallbackUrl();
  }
}

async function analyzeMonthlyBehaviorSafe(meals: any[], lastActionPlan?: string): Promise<any> {
  try {
    const result = await analyzeMonthlyBehavior(meals, lastActionPlan);
    if (
      result &&
      typeof result.behaviorSummary === "string" &&
      Array.isArray(result.patterns) &&
      typeof result.actionPlan === "string"
    ) {
      return result;
    }
  } catch (e) {
    console.error("[Gemini Function] analyzeMonthlyBehavior failed:", e);
  }

  // Fallback: keep Memory “quotes” alive even if Gemini fails.
  const fallback = buildMonthlyFallback(meals, lastActionPlan);
  return fallback;
}

async function analyzeMonthlyBehavior(meals: any[], lastActionPlan?: string): Promise<any> {
  const recentMeals = (meals || []).slice(0, 60).map((m) => ({
    date: m.date,
    type: m.type,
    source: m.source,
    restaurant: m.restaurantName,
    foods: m.foods?.map((f: any) => f.name).join(", "),
    totals: m.totals,
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these meal logs (JSON): ${JSON.stringify(recentMeals)}.

Tone rules:
- descriptive, not prescriptive
- positive, no guilt, no judgement
- avoid medical claims, avoid strict targets, avoid “deficiency” language

Return JSON tells the story in this exact order:
1) behaviorSummary: 1–2 sentence “quote-like” monthly reflection that feels screenshot-worthy.
2) patterns: exactly 2–3 short plain-language patterns.
3) actionPlan: exactly ONE simple action plan line (fresh vs previous).
   Previous action plan to avoid repeating: "${lastActionPlan || "none"}"

Also return:
- macroDistribution: percent split protein/fat/carbs (numbers, sum ~ 100)
- sourceDistribution: counts home/ordered (numbers)
- trends: array of 1–3 objects {label, value, direction} direction in ["up","down","stable"]
- consistencyScore: number 0..1`,

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
          "macroDistribution",
          "sourceDistribution",
          "trends",
          "consistencyScore",
        ],
      },
    },
  });

  try {
    return JSON.parse((response as any).text || "{}");
  } catch {
    return buildMonthlyFallback(meals, lastActionPlan);
  }
}

function emptyNutrition() {
  return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0 };
}

function buildMonthlyFallback(meals: any[], lastActionPlan?: string) {
  const list = Array.isArray(meals) ? meals : [];
  const total = list.length;

  const home = list.filter((m) => m?.source === "home").length;
  const ordered = list.filter((m) => m?.source === "ordered").length;

  const behaviorSummary =
    total >= 3
      ? `You logged ${total} meals this month. That’s consistency, not perfection.`
      : "Keep logging. Patterns show up once you have a little more data.";

  const patterns: string[] = [];
  if (home + ordered > 0) {
    const pctHome = Math.round((home / (home + ordered)) * 100);
    patterns.push(`Home meals made up about ${pctHome}% of your logs.`);
  }
  patterns.push("Your data is building a clearer picture with every meal logged.");

  const options = [
    "Try: add one easy protein to one meal this week (yogurt, lentils, tofu, or eggs).",
    "Try: add a fruit or handful of nuts twice this week, just to keep it simple.",
    "Try: pick one meal to make “repeatable” this week, so cooking feels easier.",
    "Try: drink a full glass of water before one meal per day for 3 days this week.",
  ].filter((x) => x !== (lastActionPlan || ""));

  const actionPlan = options[Math.floor(Math.random() * options.length)] || options[0] || "Try: keep logging. Consistency wins.";

  // Rough macro distribution from totals if available
  const totals = list.reduce(
    (acc, m) => {
      const t = m?.totals || {};
      acc.p += Number(t.protein || 0);
      acc.f += Number(t.fat || 0);
      acc.c += Number(t.carbs || 0);
      return acc;
    },
    { p: 0, f: 0, c: 0 }
  );
  const sum = totals.p + totals.f + totals.c || 1;

  return {
    behaviorSummary,
    patterns: patterns.slice(0, 3),
    actionPlan,
    macroDistribution: {
      protein: Math.round((totals.p / sum) * 100),
      fat: Math.round((totals.f / sum) * 100),
      carbs: Math.round((totals.c / sum) * 100),
    },
    sourceDistribution: { home, ordered },
    trends: [{ label: "Tracked Meals", value: total, direction: "stable" }],
    consistencyScore: Math.max(0.25, Math.min(1, total / 30)),
  };
}

function foodFallbackUrl() {
  // A stable, always-food placeholder (not random nature)
  return "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=60";
}