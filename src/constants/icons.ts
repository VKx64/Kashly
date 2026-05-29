import type { LucideIcon } from "lucide-react";
import {
  Wallet, Banknote, Coins, PiggyBank, CreditCard, Landmark, TrendingUp, DollarSign, Receipt,
  Home, Lightbulb, Zap, Droplet, Flame, Wifi, Phone, Smartphone, Plug,
  Utensils, Coffee, ShoppingCart, ShoppingBag, Apple, Pizza, Beer, Wine,
  Car, Bus, Train, Plane, Fuel, Bike, MapPin,
  Heart, Stethoscope, Pill, Dumbbell, Activity,
  Shirt, Gift, Gamepad2, Music, Film, Book, Camera, Headphones, Tv,
  Target, Trophy, Star, Flag, Gem, Rocket, Sparkles,
  Baby, Dog, Cat, PawPrint, GraduationCap, Users,
  Briefcase, Laptop, Wrench, Scissors, Package, Tag, Calendar, Globe,
} from "lucide-react";

// A curated, consistent icon family (lucide — the clean, Notion-style line set
// already used across the app). Categories, needs/budgets, and goals all pick
// from this single registry and store the string key; rendering resolves the
// key back to a component via getIcon().
export const ICON_GROUPS: { label: string; icons: Record<string, LucideIcon> }[] = [
  { label: "Money", icons: { wallet: Wallet, banknote: Banknote, coins: Coins, piggybank: PiggyBank, card: CreditCard, bank: Landmark, income: TrendingUp, dollar: DollarSign, receipt: Receipt } },
  { label: "Home & Bills", icons: { home: Home, bulb: Lightbulb, power: Zap, water: Droplet, gas: Flame, wifi: Wifi, phone: Phone, mobile: Smartphone, plug: Plug } },
  { label: "Food", icons: { food: Utensils, coffee: Coffee, cart: ShoppingCart, groceries: ShoppingBag, apple: Apple, pizza: Pizza, beer: Beer, wine: Wine } },
  { label: "Transport", icons: { car: Car, bus: Bus, train: Train, plane: Plane, fuel: Fuel, bike: Bike, map: MapPin } },
  { label: "Health", icons: { heart: Heart, doctor: Stethoscope, pill: Pill, gym: Dumbbell, activity: Activity } },
  { label: "Lifestyle", icons: { clothes: Shirt, gift: Gift, games: Gamepad2, music: Music, movie: Film, book: Book, camera: Camera, headphones: Headphones, tv: Tv } },
  { label: "Goals", icons: { target: Target, trophy: Trophy, star: Star, flag: Flag, gem: Gem, rocket: Rocket, sparkles: Sparkles } },
  { label: "Family", icons: { baby: Baby, dog: Dog, cat: Cat, pet: PawPrint, school: GraduationCap, family: Users } },
  { label: "Other", icons: { work: Briefcase, laptop: Laptop, tools: Wrench, scissors: Scissors, package: Package, tag: Tag, calendar: Calendar, globe: Globe } },
];

export const ICON_REGISTRY: Record<string, LucideIcon> = Object.assign({}, ...ICON_GROUPS.map((group) => group.icons));

export const DEFAULT_ICON_KEY = "tag";

export function getIcon(key?: string | null): LucideIcon {
  if (key && ICON_REGISTRY[key]) return ICON_REGISTRY[key];
  return ICON_REGISTRY[DEFAULT_ICON_KEY] ?? Tag;
}
