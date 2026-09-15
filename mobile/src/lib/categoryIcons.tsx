/**
 * Category icon mapping — maps category names to Lucide icons.
 * Used when rendering categories from the database.
 */
import React from 'react';
import {
  Package,
  Shirt,
  Laptop,
  Home,
  Utensils,
  Heart,
  Dumbbell,
  Book,
  Briefcase,
  Music,
  Gamepad2,
  Baby,
  Car,
  Watch,
  Smartphone,
  Monitor,
  Headphones,
  Camera,
  ShoppingBag,
  Coffee,
  Pizza,
  Candy,
  Milk,
  Wine,
  Flower2,
  Leaf,
  Hammer,
  Wrench,
  Paintbrush,
  Scissors,
  PenTool,
  Stethoscope,
  Pill,
  Sparkles,
  Palette,
  Trophy,
  Gift,
  PartyPopper,
} from 'lucide-react-native';

// Icon component map
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  // Apparel & Fashion
  apparel: Shirt,
  clothing: Shirt,
  fashion: Shirt,
  shirts: Shirt,
  'men-apparel': Shirt,
  'women-apparel': Shirt,
  shoes: ShoppingBag,
  accessories: Watch,
  jewelry: Sparkles,
  watches: Watch,

  // Electronics & Tech
  electronics: Laptop,
  computers: Monitor,
  laptops: Laptop,
  phones: Smartphone,
  mobile: Smartphone,
  smartphones: Smartphone,
  audio: Headphones,
  headphones: Headphones,
  cameras: Camera,
  photography: Camera,
  gadgets: Smartphone,
  tech: Laptop,

  // Home & Living
  home: Home,
  furniture: Home,
  'home-decor': Home,
  kitchen: Utensils,
  appliances: Home,
  bedding: Home,
  bath: Home,

  // Food & Beverages
  food: Utensils,
  beverages: Coffee,
  drinks: Coffee,
  coffee: Coffee,
  tea: Coffee,
  snacks: Candy,
  candy: Candy,
  chocolate: Candy,
  bakery: Pizza,
  dairy: Milk,
  frozen: Milk,
  alcohol: Wine,
  wine: Wine,
  beer: Wine,

  // Health & Beauty
  health: Heart,
  beauty: Sparkles,
  cosmetics: Palette,
  skincare: Sparkles,
  haircare: Scissors,
  personal: Heart,
  wellness: Heart,
  supplements: Pill,
  vitamins: Pill,
  pharmacy: Stethoscope,
  medical: Stethoscope,

  // Sports & Outdoors
  sports: Dumbbell,
  fitness: Dumbbell,
  outdoor: Leaf,
  camping: Leaf,
  hiking: Leaf,
  cycling: Car,
  gym: Dumbbell,

  // Books & Media
  books: Book,
  media: Music,
  music: Music,
  movies: Music,
  games: Gamepad2,
  gaming: Gamepad2,
  toys: PartyPopper,

  // Baby & Kids
  baby: Baby,
  kids: Baby,
  children: Baby,
  infant: Baby,
  nursery: Baby,

  // Automotive
  automotive: Car,
  auto: Car,
  'car-parts': Car,
  vehicles: Car,

  // Office & Stationery
  office: Briefcase,
  stationery: PenTool,
  supplies: Briefcase,
  business: Briefcase,

  // Arts & Crafts
  arts: Paintbrush,
  crafts: Scissors,
  art: Palette,
  painting: Paintbrush,
  drawing: PenTool,

  // Tools & Hardware
  tools: Hammer,
  hardware: Wrench,
  construction: Hammer,
  plumbing: Wrench,
  electrical: Wrench,

  // Garden & Plants
  garden: Flower2,
  plants: Leaf,
  flowers: Flower2,
  gardening: Flower2,

  // Gifts & Special
  gifts: Gift,
  party: PartyPopper,
  celebrations: Trophy,
  awards: Trophy,

  // Default fallback
  default: Package,
};

/**
 * Get the appropriate icon component for a category name.
 * Normalizes the name (lowercase, trim, replace spaces/hyphens) before lookup.
 */
export function getCategoryIcon(
  categoryName: string | null | undefined,
): React.ComponentType<any> {
  if (!categoryName) {
    return ICON_MAP.default;
  }

  // Normalize: lowercase, trim, replace spaces/underscores with hyphens
  const normalized = categoryName
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-');

  return ICON_MAP[normalized] || ICON_MAP.default;
}

/**
 * Render a category icon with the specified size and color.
 */
export function CategoryIcon({
  category,
  size = 20,
  color,
  strokeWidth = 1.75,
}: {
  category: string | null | undefined;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const Icon = getCategoryIcon(category);
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
