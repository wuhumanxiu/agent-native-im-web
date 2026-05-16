import type { NotificationRecord, NotificationReleasePayload, ReleaseItem } from './types'

function localeKeys(language: string): string[] {
  if (language.toLowerCase().startsWith('zh')) return ['zh-CN', 'zh', 'en']
  return ['en', 'zh-CN', 'zh']
}

function pickString(values: Record<string, string> | undefined, language: string, fallback: string): string {
  if (!values) return fallback
  for (const key of localeKeys(language)) {
    const value = values[key]?.trim()
    if (value) return value
  }
  return fallback
}

function pickArray<T>(values: Record<string, T[]> | undefined, language: string, fallback: T[]): T[] {
  if (!values) return fallback
  for (const key of localeKeys(language)) {
    const value = values[key]
    if (Array.isArray(value) && value.length > 0) return value
  }
  return fallback
}

export function localizeRelease(release: ReleaseItem, language: string): ReleaseItem {
  return {
    ...release,
    title: pickString(release.title_i18n, language, release.title),
    summary: pickString(release.summary_i18n, language, release.summary),
    sections: pickArray(release.sections_i18n, language, release.sections),
    required_actions: pickArray(release.required_actions_i18n, language, release.required_actions),
    known_issues: pickArray(release.known_issues_i18n, language, release.known_issues),
  }
}

function releasePayload(notification: NotificationRecord): NotificationReleasePayload {
  return (notification.data || {}) as NotificationReleasePayload
}

export function localizedReleaseNotificationTitle(notification: NotificationRecord, language: string, fallback: string): string {
  return pickString(releasePayload(notification).title_i18n, language, notification.title || fallback)
}

export function localizedReleaseNotificationBody(notification: NotificationRecord, language: string, fallback: string): string {
  return pickString(releasePayload(notification).body_i18n, language, notification.body || fallback)
}

export function releaseNotificationPath(notification: NotificationRecord): string {
  const path = releasePayload(notification).path
  return typeof path === 'string' && path.startsWith('/settings') ? path : '/settings/releases'
}
