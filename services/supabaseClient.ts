
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxsfrphjichycakhhoya.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14c2ZycGhqaWNoeWNha2hob3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMjUzNDYsImV4cCI6MjA4MjkwMTM0Nn0.cA7BrK6CQyBmZuUIFXUkheP6_q9bp5Vve7mSxgpDL6o';

export const supabase = createClient(supabaseUrl, supabaseKey);
