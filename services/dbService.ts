import { supabase } from './supabaseClient';
import { MealLog, User, UserRole, ProfileData } from '../types';

const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isNetworkError = error.message?.includes('fetch') || error.message?.includes('Network') || !navigator.onLine;
    const isSchemaError = error.code === 'PGRST204';
    const isTimeoutError = error.code === '57014' || error.message?.includes('timeout');
    
    if (retries > 0 && (isNetworkError || isSchemaError || isTimeoutError)) {
      console.warn(`Database query failed (code: ${error.code}). Retrying... ${retries} left.`);
      await new Promise(res => setTimeout(res, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const dbService = {
  isCloudMode: () => true,

  /* ---------------- AUTH ---------------- */

  getAuthUserId: async (): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      throw new Error('Not authenticated');
    }
    return data.session.user.id;
  },

  getUser: async (): Promise<User | null> => {
    return fetchWithRetry(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;
      if (!authUser) return null;

      // Self-heal: Ensure profile row exists
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', JSON.stringify(error, null, 2));
        throw error;
      }

      if (!profile) {
        // Create initial profile if missing
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ 
            id: authUser.id, 
            email: authUser.email, 
            created_at: new Date().toISOString(),
            diet_preference: 'no_preference',
            allergens: []
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('Profile creation failed:', createError);
        } else {
          profile = newProfile;
        }
      }

      if (!profile) {
        return {
          id: authUser.id,
          email: authUser.email ?? '',
          role: UserRole.USER,
          preferences: [],
          name: authUser.email?.split('@')[0] ?? 'New User',
        };
      }

      return {
        id: profile.id,
        email: profile.email,
        role: UserRole.USER,
        preferences: [],
        name: profile.first_name || profile.email.split('@')[0],
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        countryRegion: profile.country_region,
        dietPreference: profile.diet_preference,
        allergens: profile.allergens || [],
        dateOfBirth: profile.date_of_birth
      };
    });
  },

  signUp: async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (error) throw error;
    return data.user;
  },

  upsertProfile: async (userId: string, profileData: ProfileData) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        country_region: profileData.country_region,
        email: profileData.email,
        diet_preference: profileData.diet_preference,
        allergens: profileData.allergens,
        date_of_birth: profileData.date_of_birth,
        updated_at: new Date().toISOString()
      });
    if (error) {
      console.error('Profile upsert failed:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  updateProfile: async (userId: string, profileData: Partial<ProfileData>) => {
    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);
    
    if (error) {
      console.error('Profile update failed:', JSON.stringify(error, null, 2));
      throw error;
    }
  },

  signIn: async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return data.user;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  /* ---------------- MEALS ---------------- */

  saveMeal: async (meal: any) => {
    const userId = await dbService.getAuthUserId();
    
    let rawImage = meal.imageUrl || meal.image || meal.photoUrl || null;
    
    if (rawImage && !rawImage.startsWith('http') && !rawImage.startsWith('data:')) {
      rawImage = `data:image/jpeg;base64,${rawImage}`;
    }

    let finalImageUrl = rawImage;

    if (rawImage && rawImage.startsWith('data:image')) {
      try {
        const base64Data = rawImage.split(',')[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        const fileName = `${userId}/${Date.now()}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meal-images')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) {
          console.warn('Supabase Storage upload failed, falling back to local representation:', uploadError.message);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('meal-images')
            .getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
        }
      } catch (e) {
        console.error('Image processing failed during save:', e);
      }
    }

    let meal_type: 'Eat' | 'Cooked' | 'Ordered' = 'Eat';
    if (meal.type === 'recipe') {
      meal_type = 'Cooked';
    } else if (meal.source === 'ordered') {
      meal_type = 'Ordered';
    }

    const payload = {
      user_id: userId,
      meal_type,
      ingredients: meal.foods || [],
      nutrition: meal.totals || {},
      calories: meal.totals?.calories ?? 0,
      protein: meal.totals?.protein ?? 0,
      carbs: meal.totals?.carbs ?? 0,
      fat: meal.totals?.fat ?? 0,
      fiber: meal.totals?.fiber ?? 0,
      sugar: meal.totals?.sugar ?? 0,
      restaurant_name: meal.restaurantName || null,
      drink_suggestions: meal.drinkPairings || null,
      notes: meal.notes || null,
      confidence: meal.confidence || 1.0,
      image_url: finalImageUrl,
      logged_at: meal.date ? new Date(meal.date).toISOString() : new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('meals')
      .insert([payload])
      .select()
      .single();

    if (error) {
      const detail = JSON.stringify(error, null, 2);
      console.error('MEAL INSERT FAILED:', detail);
      throw new Error(`Meal save failed: ${error.message || detail}`);
    }

    return data;
  },

  getMealsForUser: async (options?: { 
    page?: number; 
    pageSize?: number;
    limit?: number;
    sinceISO?: string;
  }): Promise<MealLog[]> => {
    return fetchWithRetry(async () => {
      const userId = await dbService.getAuthUserId();
      const pageSize = options?.limit ?? options?.pageSize ?? 100;
      const page = options?.page ?? 0;

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });

      if (options?.sinceISO) {
        query = query.gte('logged_at', options.sinceISO);
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        console.error('FETCH MEALS FAILED:', JSON.stringify(error, null, 2));
        throw error;
      }

      return (data ?? []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        date: m.logged_at,
        type: m.meal_type === 'Cooked' ? 'recipe' : 'meal',
        foods: m.ingredients,
        totals: m.nutrition || {
          calories: m.calories || 0,
          protein: m.protein || 0,
          carbs: m.carbs || 0,
          fat: m.fat || 0,
          fiber: m.fiber || 0,
          sugar: m.sugar || 0
        },
        source: m.meal_type === 'Ordered' ? 'ordered' : 'home',
        restaurantName: m.restaurant_name || undefined,
        confidence: m.confidence || 1.0,
        imageUrl: m.image_url || undefined,
      }));
    });
  },

  deleteMeal: async (mealId: string) => {
    const userId = await dbService.getAuthUserId();
    const { error: mealError } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', userId);
    
    if (mealError) {
      console.error('DELETE MEAL FAILED:', JSON.stringify(mealError, null, 2));
      throw mealError;
    }
  },
};
