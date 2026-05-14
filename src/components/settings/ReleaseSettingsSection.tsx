import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellDot, Check, ExternalLink, Loader2, Megaphone, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { ReleaseItem, ReleaseSectionKind } from '@/lib/types'

interface ReleaseSettingsSectionProps {
  token: string
  isMobile: boolean
}

function formatReleaseDate(value: string) {
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

function sectionTone(kind: ReleaseSectionKind) {
  if (kind === 'new') return 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
  if (kind === 'fixed') return 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
  if (kind === 'security') return 'bg-red-500/10 text-red-500'
  if (kind === 'known_issue') return 'bg-amber-500/10 text-amber-600'
  return 'bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
}

export function ReleaseSettingsSection({ token, isMobile }: ReleaseSettingsSectionProps) {
  const { t } = useTranslation()
  const [items, setItems] = useState<ReleaseItem[]>([])
  const [selected, setSelected] = useState<ReleaseItem | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReleases = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await api.listReleases(token, { limit: 50 })
    if (res.ok && res.data) {
      const next = res.data.items || []
      setItems(next)
      setUnreadCount(res.data.unread_count || 0)
      setSelected((prev) => prev && next.some((item) => item.id === prev.id) ? prev : next[0] || null)
    } else {
      setError(getErrorMessage(res) || t('settings.releasesLoadError'))
    }
    setLoading(false)
  }, [t, token])

  useEffect(() => {
    void loadReleases()
  }, [loadReleases])

  const openRelease = async (release: ReleaseItem) => {
    setSelected(release)
    if (!release.read_at) {
      const res = await api.markReleaseRead(token, release.id)
      if (res.ok) {
        setItems((prev) => prev.map((item) => item.id === release.id ? { ...item, read_at: new Date().toISOString() } : item))
        setSelected((prev) => prev && prev.id === release.id ? { ...prev, read_at: new Date().toISOString() } : prev)
        setUnreadCount((count) => Math.max(0, count - 1))
      }
    }
  }

  const list = (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('settings.releases')}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">{t('settings.releasesUnread', { count: unreadCount })}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadReleases()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('common.reload')}
        </button>
      </div>
      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-5 text-xs text-[var(--color-text-muted)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t('common.loading')}
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">{t('settings.releasesEmpty')}</div>
      ) : (
        <div className="max-h-[560px] overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openRelease(item)}
              className={cn(
                'flex w-full gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--color-bg-hover)]',
                selected?.id === item.id && 'bg-[var(--color-accent)]/5',
              )}
            >
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
                {item.read_at ? <Megaphone className="h-4 w-4" /> : <BellDot className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{item.version}</p>
                  {!item.read_at ? <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" /> : null}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-secondary)]">{item.title}</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">{item.component} · {formatReleaseDate(item.published_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const detail = (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      {!selected ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <Megaphone className="mb-3 h-9 w-9 text-[var(--color-accent)]/70" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.releasesSelectTitle')}</p>
          <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">{t('settings.releasesSelectDesc')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--color-accent)]">{selected.component}</span>
              <span className="rounded-full bg-[var(--color-bg-hover)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]">{formatReleaseDate(selected.published_at)}</span>
              {selected.read_at ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2.5 py-1 text-[11px] text-[var(--color-success)]">
                  <Check className="h-3 w-3" />
                  {t('settings.releaseRead')}
                </span>
              ) : null}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-[var(--color-text-primary)]">{selected.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{selected.summary}</p>
          </div>

          {selected.sections.map((section, index) => (
            <section key={`${section.kind}-${index}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', sectionTone(section.kind))}>
                  {t(`settings.releaseSection.${section.kind}`, { defaultValue: section.kind })}
                </span>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{section.title}</p>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-5 text-[var(--color-text-secondary)]">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {selected.required_actions.length > 0 ? (
            <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="mb-2 text-xs font-semibold text-amber-700">{t('settings.releaseActionRequired')}</p>
              <div className="space-y-2">
                {selected.required_actions.map((action) => (
                  <div key={`${action.component}-${action.title}`} className="rounded-lg bg-[var(--color-bg-secondary)]/80 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{action.title}</p>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{action.component}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{action.body}</p>
                    {action.url ? (
                      <a href={action.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-accent)]">
                        {t('settings.releaseOpenLink')} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {selected.known_issues.length > 0 ? (
            <section className="rounded-xl border border-[var(--color-border)] p-3">
              <p className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">{t('settings.releaseKnownIssues')}</p>
              <ul className="space-y-1.5">
                {selected.known_issues.map((issue) => (
                  <li key={issue} className="text-xs leading-5 text-[var(--color-text-muted)]">{issue}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {!isMobile && <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.releases')}</h3>}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('settings.releasesTitle')}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{t('settings.releasesDesc')}</p>
          </div>
        </div>
      </div>
      {error ? <p className="rounded-xl bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]">{error}</p> : null}
      <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-[minmax(300px,0.8fr)_minmax(420px,1.2fr)]')}>
        {list}
        {detail}
      </div>
    </div>
  )
}
