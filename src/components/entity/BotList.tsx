import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import { usePresenceStore } from '@/store/presence'
import * as api from '@/lib/api'
import { getCachedEntities, cacheEntities } from '@/lib/cache'
import type { Conversation, Entity, PresenceStateValue } from '@/lib/types'
import { EntityAvatar } from './EntityAvatar'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { entityDisplayName, cn } from '@/lib/utils'
import { getEntityPresenceSemantic, getEntityStatusLabel } from '@/lib/entity-status'
import { CreateBotDialog } from './CreateBotDialog'
import { Bot, Plus, Search, PowerOff } from 'lucide-react'

interface Props {
  selectedId: number | null
  onSelect: (id: number) => void
  onStartChat: (entityId: number) => void
  onCreated: (result: { entity: Entity; key: string; doc: string }) => void
  refreshTrigger?: number
}

function botStableSortKey(entity: Entity): string {
  return [
    entity.id.toString().padStart(12, '0'),
    entity.display_name || entity.name || entity.bot_id || entity.public_id || '',
  ].join(':')
}

export function compareBotsStable(a: Entity, b: Entity): number {
  return botStableSortKey(a).localeCompare(botStableSortKey(b))
}

type BotInteractionTimes = Record<number, number>

function conversationActivityTime(conversation: Conversation): number {
  return new Date(conversation.last_message?.created_at || conversation.updated_at || conversation.created_at).getTime()
}

export function buildBotInteractionTimes(conversations: Conversation[]): BotInteractionTimes {
  const times: BotInteractionTimes = {}

  for (const conversation of conversations) {
    const activityTime = conversationActivityTime(conversation)
    if (!Number.isFinite(activityTime)) continue

    for (const participant of conversation.participants || []) {
      if (participant.entity?.entity_type === 'user') continue
      times[participant.entity_id] = Math.max(times[participant.entity_id] || 0, activityTime)
    }
  }

  return times
}

export function compareBotsForList(
  a: Entity,
  b: Entity,
  options: {
    interactionTimes: BotInteractionTimes
    getPresenceState: (entityId: number) => PresenceStateValue
  },
): number {
  const onlineA = options.getPresenceState(a.id) === 'online'
  const onlineB = options.getPresenceState(b.id) === 'online'
  if (onlineA !== onlineB) return onlineA ? -1 : 1

  const interactionA = options.interactionTimes[a.id] || 0
  const interactionB = options.interactionTimes[b.id] || 0
  if (interactionA !== interactionB) return interactionB - interactionA

  return compareBotsStable(a, b)
}

export function BotList({ selectedId, onSelect, onCreated, refreshTrigger }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const getPresenceState = usePresenceStore((s) => s.getPresenceState)
  const presenceVersion = usePresenceStore((s) => `${Array.from(s.known).join(',')}|${Array.from(s.online).join(',')}`)
  const [entities, setEntities] = useState<Entity[]>([])
  const [botInteractionTimes, setBotInteractionTimes] = useState<BotInteractionTimes>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const setPresenceBatch = usePresenceStore((s) => s.setPresenceBatch)
  const setPresenceUnknown = usePresenceStore((s) => s.setPresenceUnknown)

  const fetchPresence = useCallback(async (list: Entity[]) => {
    const botIds = list.filter((e) => e.entity_type !== 'user').map((e) => e.id)
    if (botIds.length > 0) {
      const presRes = await api.batchPresence(token, botIds)
      if (presRes.ok && presRes.data?.presence) {
        const onlineIds = Object.entries(presRes.data.presence)
          .filter(([, isOn]) => !!isOn)
          .map(([idStr]) => Number(idStr))
        setPresenceBatch(botIds, onlineIds)
      } else {
        setPresenceUnknown(botIds)
      }
    }
  }, [setPresenceBatch, setPresenceUnknown, token])

  const loadEntities = useCallback(async () => {
    try {
      const res = await api.listEntities(token)
      const list = res.ok && res.data ? (Array.isArray(res.data) ? res.data : []) : []
      setEntities(list)
      setLoading(false)

      const preloaded = list
        .filter((entity) => entity.entity_type !== 'user' && typeof entity.online === 'boolean')
        .map((entity) => ({ id: entity.id, online: !!entity.online }))
      if (preloaded.length > 0) {
        setPresenceBatch(
          preloaded.map((item) => item.id),
          preloaded.filter((item) => item.online).map((item) => item.id),
        )
      }

      // Cache entities for offline use
      if (list.length > 0) {
        cacheEntities(list)
      }

      try {
        const convRes = await api.listConversations(token)
        if (convRes.ok && convRes.data) {
          setBotInteractionTimes(buildBotInteractionTimes(Array.isArray(convRes.data) ? convRes.data : []))
        }
      } catch {
        // Keep entity list usable if conversation metadata is temporarily unavailable.
      }

      // Fetch presence for all bot entities so the online dot is accurate
      await fetchPresence(list)
    } catch (error) {
      void error
      // Network failed — keep any cached data already displayed
      if (entities.length === 0) {
        setEntities([])
      }
    } finally {
      setLoading(false)
    }
  }, [entities.length, fetchPresence, setPresenceBatch, token])

  // Stale-while-revalidate: show cached entities instantly, then refresh from network
  useEffect(() => {
    let cancelled = false
    getCachedEntities().then((cached) => {
      if (!cancelled && cached.length > 0) {
        setEntities(cached)
        setLoading(false)
      }
    })
    loadEntities()
    return () => { cancelled = true }
  }, [loadEntities, refreshTrigger])

  useEffect(() => {
    if (entities.length === 0) return

    const refreshVisiblePresence = () => {
      if (document.hidden) return
      void fetchPresence(entities)
    }

    const onFocus = () => refreshVisiblePresence()
    const onVisibility = () => refreshVisiblePresence()
    const timer = window.setInterval(refreshVisiblePresence, 15000)

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [entities, fetchPresence])

  const bots = entities.filter((e) => e.entity_type !== 'user')
  const filtered = search
    ? bots.filter((e) =>
        e.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.name?.toLowerCase().includes(search.toLowerCase())
      )
    : bots

  const getPresenceStateForSort = useCallback((entityId: number) => getPresenceState(entityId), [getPresenceState, presenceVersion])

  // Product priority: online bots first, then most recently interacted bots.
  const activeBots = filtered
    .filter((e) => e.status !== 'disabled')
    .sort((a, b) => compareBotsForList(a, b, {
      interactionTimes: botInteractionTimes,
      getPresenceState: getPresenceStateForSort,
    }))
  const disabledBots = filtered
    .filter((e) => e.status === 'disabled')
    .sort(compareBotsStable)

  const renderBotItem = (entity: Entity) => {
    const presence: PresenceStateValue = getPresenceState(entity.id)
    const statusSemantic = getEntityPresenceSemantic(entity, presence)
    const statusLabel = getEntityStatusLabel(t, entity, presence)
    const isActive = entity.id === selectedId
    const meta = entity.metadata as Record<string, unknown> | undefined
    const tags = Array.isArray(meta?.tags) ? (meta.tags as string[]) : []
    const description = (meta?.description as string) || ''
    return (
      <button
        key={entity.id}
        onClick={() => onSelect(entity.id)}
        data-testid={`bot-list-item-${entity.id}`}
        className={cn(
          'w-full flex items-start gap-3 px-3 rounded-xl transition-all text-left cursor-pointer',
          isActive
            ? 'bg-[var(--color-accent-dim)] shadow-sm'
            : 'hover:bg-[var(--color-bg-hover)]',
          statusSemantic === 'disabled' && 'opacity-50'
        )}
      >
        <div className="relative flex-shrink-0 self-start mt-2">
          <EntityAvatar entity={entity} size="md" />
          {/* Online status dot */}
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--color-bg-secondary)]',
            statusSemantic === 'disabled' || statusSemantic === 'pending'
              ? 'bg-[var(--color-warning)]'
              : statusSemantic === 'online'
                ? 'bg-[var(--color-success)]'
                : 'bg-[var(--color-text-muted)]/50'
          )} />
        </div>
        <div className={cn(
          'flex-1 min-w-0 py-2 border-b border-[var(--color-border)]/70',
          isActive && 'border-[var(--color-accent)]/20',
        )}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {entityDisplayName(entity)}
            </p>
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[9px] font-medium flex-shrink-0',
              statusSemantic === 'disabled' || statusSemantic === 'pending'
                ? 'bg-[var(--color-warning)]/12 text-[var(--color-warning)]'
                : statusSemantic === 'online'
                  ? 'bg-[var(--color-success)]/12 text-[var(--color-success)]'
                  : 'bg-[var(--color-text-muted)]/12 text-[var(--color-text-muted)]'
            )}>
              {statusLabel}
            </span>
          </div>
          {description && (
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{description}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded-md bg-[var(--color-bot)]/8 text-[var(--color-bot)] text-[9px]">
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-[9px] text-[var(--color-text-muted)]">+{tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4.5 h-4.5 text-[var(--color-bot)]" />
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('bot.agents')}</h2>
          <span className="text-xs text-[var(--color-text-muted)]">({activeBots.length})</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
        >
          <Plus className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Create bot dialog */}
      {showCreate && (
        <CreateBotDialog
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setShowCreate(false)
            loadEntities()
            onSelect(result.entity.id)
            onCreated(result)
          }}
        />
      )}

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('bot.searchPlaceholder')}
            className="w-full h-8 pl-8.5 pr-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-transparent focus:border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Bot list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <SkeletonLoader variant="bot-list" />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
            <Bot className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">{search ? t('common.noMatches') : t('bot.noAgents')}</p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                <Plus className="h-4 w-4" />
                {t('onboarding.createBotAction')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Active bots (online first) — card grid, 2-col on desktop */}
            <div className="grid grid-cols-1 gap-2">
              {activeBots.map((entity) => renderBotItem(entity))}
            </div>

            {/* Divider + Disabled bots */}
            {disabledBots.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 py-3 mt-2">
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                    <PowerOff className="w-2.5 h-2.5" />
                    {t('bot.disabledSection')} ({disabledBots.length})
                  </span>
                  <div className="flex-1 h-px bg-[var(--color-border)]" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {disabledBots.map((entity) => renderBotItem(entity))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
