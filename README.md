Mealwise
Eat smarter, not stricter.
Mealwise is a personal nutrition and food-logging app built around one idea: people don’t need more rules, they need a better understanding.
Most food apps track numbers. Mealwise tracks patterns, context, and behaviour.
Users log meals by taking photos, scanning their fridge, or cooking from AI-generated recipes. Over time, Mealwise turns those logs into monthly “Food Memory” reports that explain how someone actually eats, rather than scolding them for what they ate.

What makes Mealwise different
Mealwise is not a calorie counter.
It’s a decision support system for eating habits.
Instead of:
* “You went over 2,000 calories.”
* “You are missing iron.”
Mealwise shows:
* “You tend to order out more on weekends.”
* “Protein is lower on days you skip breakfast.”
* “Home-cooked meals have more fibre for you.”
No guilt. No red bars. Just patterns.

Core Features
Eat Mode
* Take a photo of your meal
* AI detects each food item and estimates:
    * calories
    * protein
    * fat
    * carbs
    * fiber
    * sugar
* Manually add ingredients if something was missed
* Mark meals as:
    * home-cooked
    * ordered out (with restaurant name)

Cook Mode
* Upload a fridge or pantry photo
* Or type ingredients manually
* AI suggests healthy recipes using what you already have
* Each recipe includes:
    * step-by-step cooking flow
    * nutrition per ingredient
    * drink pairings
* Cooked meals can be logged into history

History
* Every meal is stored with:
    * time
    * nutrition
    * source (home vs ordered)
    * photo
* Paginated by day
* Meals can be deleted and are removed from Supabase

Food Memory
Monthly behavioural analysis instead of raw totals.
Shows:
* Behaviour summary
* 2–3 eating patterns
* One simple action plan
* Macro mix (protein/fat/carbs)
* Home vs ordered ratio
* Trend indicators
* Consistency score
Optional age-aware insights are included without medical claims.

User Profiles
Each user has:
* first name
* last name
* email
* phone
* country & region
* date of birth
* diet preference
* allergies
Used for:
* personalized recipe filtering
* allergy warnings
* age-aware memory insights
All data is protected with Supabase Row Level Security.

Tech Stack
Frontend
* React
* TypeScript
* Tailwind CSS
* Recharts
Backend
* Supabase
    * Auth
    * Postgres
    * Row Level Security
    * SQL migrations
* Gemini API (via serverless proxy)
Architecture
* Cloud-backed user accounts
* Per-user data isolation
* JSONB nutrition storage + macro columns
* Timezone-safe logging
* Versioned feature updates

Why this exists
Mealwise was built as a real product, not a tutorial.
It was used to practice:
* schema design
* secure auth flows
* migrations
* data modelling
* UX tradeoffs
* AI integration
* behavioural analytics
This is not a demo. This is a working system with real constraints.

Status
Mealwise is an actively evolving personal project.
The goal is not to compete with existing apps. The goal is to explore how data, UX, and trust can coexist in consumer products.
