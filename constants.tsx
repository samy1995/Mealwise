import React from 'react';
import { Camera, Utensils, History, PieChart, User as UserIcon, Home as HomeIcon } from 'lucide-react';

export const APP_VERSION = "v1.6.9+";

export const NAVIGATION_TABS = [
  { id: 'home', label: 'Home', icon: <HomeIcon size={24} /> },
  { id: 'eat', label: 'Eat', icon: <Camera size={24} /> },
  { id: 'cook', label: 'Cook', icon: <Utensils size={24} /> },
  { id: 'history', label: 'History', icon: <History size={24} /> },
  { id: 'memory', label: 'Memory', icon: <PieChart size={24} /> },
  { id: 'profile', label: 'Profile', icon: <UserIcon size={24} /> },
] as const;

export type TabId = (typeof NAVIGATION_TABS)[number]['id'];

export const MOCK_DIETARY_PREFERENCES = [
  'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'High Protein'
];

export const DIET_OPTIONS = [
  { key: 'no_preference', label: 'No Preference' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'eggetarian', label: 'Eggetarian' },
  { key: 'non_vegetarian', label: 'Non-Vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'chicken_eggs_only', label: 'Chicken & Eggs Only' }
];

export const COMMON_ALLERGENS = [
  { key: 'peanut', label: 'Peanuts' },
  { key: 'tree_nut', label: 'Tree Nuts' },
  { key: 'milk', label: 'Milk/Dairy' },
  { key: 'egg', label: 'Eggs' },
  { key: 'wheat', label: 'Wheat' },
  { key: 'soy', label: 'Soy' },
  { key: 'fish', label: 'Fish' },
  { key: 'shellfish', label: 'Shellfish' },
  { key: 'sesame', label: 'Sesame' }
];