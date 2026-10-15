import {
  BriefcaseBusiness,
  Church,
  Coffee,
  Croissant,
  HeartPulse,
  type LucideIcon,
  Package,
  Scissors,
  ShoppingBasket,
  Shirt,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import type { Category } from "./types"

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  restaurant: { label: "Restaurants", icon: UtensilsCrossed },
  bakery: { label: "Bakeries", icon: Croissant },
  grocery: { label: "Groceries", icon: ShoppingBasket },
  cafe: { label: "Cafés & desserts", icon: Coffee },
  remittance: { label: "Remittance & cargo", icon: Package },
  beauty: { label: "Beauty & barbers", icon: Scissors },
  church: { label: "Churches", icon: Church },
  community: { label: "Community", icon: Users },
  services: { label: "Services", icon: BriefcaseBusiness },
  health: { label: "Health", icon: HeartPulse },
  retail: { label: "Fashion & retail", icon: Shirt },
}

export const SEARCH_SUGGESTIONS = ["adobo", "pandesal", "halo-halo", "balikbayan box", "lechon", "Tagalog mass"]
