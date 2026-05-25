import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export function getTrialStatus(profile: Profile) {
  const now = new Date()
  const trialEnd = new Date(profile.trial_ends_at)
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    isActive: profile.is_subscribed || now < trialEnd,
    isSubscribed: profile.is_subscribed,
    isTrial: !profile.is_subscribed && now < trialEnd,
    isExpired: !profile.is_subscribed && now >= trialEnd,
    daysLeft: Math.max(0, daysLeft),
    trialEnd,
  }
}
