import type { IconName } from '../components/Icons'

// Businesses cannot upload photos (not part of the proposal), so every
// business shows a generic photo and icon for its category.
const BY_CATEGORY: Record<string, { image: string; icon: IconName }> = {
  barbershop: { image: '/images/barbershop.webp', icon: 'scissors' },
  clinic: { image: '/images/clinic.webp', icon: 'clinic' },
  salon: { image: '/images/salon.webp', icon: 'salon' },
  'personal trainer': { image: '/images/trainer.webp', icon: 'dumbbell' },
  consultant: { image: '/images/consultant.webp', icon: 'user' },
}

const FALLBACK = { image: '/images/hero.webp', icon: 'calendar' as IconName }

export function categoryLook(categoryName: string) {
  return BY_CATEGORY[categoryName.toLowerCase()] ?? FALLBACK
}
