export const CATEGORIES = [
  "restaurant",
  "bakery",
  "grocery",
  "cafe",
  "remittance",
  "beauty",
  "church",
  "community",
  "services",
  "health",
  "retail",
] as const
export type Category = (typeof CATEGORIES)[number]

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
export type Weekday = (typeof WEEKDAYS)[number]

export type UserRole = "user" | "admin" | "super_admin"

export interface EstablishmentSummary {
  id: string
  slug: string
  name: string
  category: Category
  tagline: string | null
  neighbourhood: string
  address: string
  latitude: number
  longitude: number
  rating: number | null
  reviewCount: number
  priceLevel: number | null
  isFilipinoOwned: boolean
  coverPhotoUrl: string | null
}

export interface EstablishmentPhoto {
  id: string
  url: string
  caption: string | null
}

export interface EstablishmentDetail extends EstablishmentSummary {
  description: string
  city: string
  postalCode: string | null
  phone: string | null
  email: string | null
  website: string | null
  hours: Partial<Record<Weekday, string>>
  tags: string[]
  establishedYear: number | null
  photos: EstablishmentPhoto[]
  commentCount: number
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  body: string
  createdAt: string
  author: { id: string; name: string; role: UserRole }
}

export interface Me {
  id: string
  email: string
  displayName: string | null
  role: UserRole
  emailVerified: boolean
}

export interface PlatformStats {
  registeredUsers: number
  pendingVerification: number
  newUsersLast7Days: number
  admins: number
  establishments: number
  filipinoOwned: number
  comments: number
  commentsLast7Days: number
  byCategory: Array<{ category: Category; count: number }>
  topNeighbourhoods: Array<{ neighbourhood: string; count: number }>
}

export interface EstablishmentInput {
  name: string
  category: Category
  tagline?: string
  description: string
  address: string
  neighbourhood: string
  postalCode?: string
  latitude: number
  longitude: number
  phone?: string
  email?: string
  website?: string
  priceLevel?: number
  tags?: string[]
  isFilipinoOwned?: boolean
  establishedYear?: number
}
