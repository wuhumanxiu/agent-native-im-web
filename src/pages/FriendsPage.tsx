import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { useMessagesStore } from '@/store/messages'
import { useNotificationsStore } from '@/store/notifications'
import * as api from '@/lib/api'
import { cacheFriendsSnapshot, getCachedFriendsSnapshot } from '@/lib/cache'
import type { Conversation, Entity, EntityCardPayload, FriendRequest } from '@/lib/types'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { EntityPopoverCard } from '@/components/entity/EntityPopoverCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { entityDisplayName, cn, isBotOrService } from '@/lib/utils'
import { openOrCreateDirectConversation, conversationRouteFor } from '@/lib/direct-conversation'
import { Bot, Contact, Loader2, Search, UserPlus, UserCheck, X, Users, SendHorizonal, Send } from 'lucide-react'
import { usePresenceStore } from '@/store/presence'

type Tab = 'friends' | 'requests'

export function FriendsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)!
  const me = useAuthStore((s) => s.entity)!
  const conversations = useConversationsStore((s) => s.conversations)
  const addConversation = useConversationsStore((s) => s.addConversation)
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const addMessage = useMessagesStore((s) => s.addMessage)
  const actingEntities = useNotificationsStore((s) => s.actingEntities)
  const removeFriendRequestFromStore = useNotificationsStore((s) => s.removeFriendRequest)
  const markNotificationsDirty = useNotificationsStore((s) => s.markDirty)
  const setPresenceBatch = usePresenceStore((s) => s.setPresenceBatch)
  const setPresenceUnknown = usePresenceStore((s) => s.setPresenceUnknown)
  const [tab, setTab] = useState<Tab>('friends')
  const [actingEntityId, setActingEntityId] = useState<number>(me.id)
  const [friends, setFriends] = useState<Entity[]>([])
  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [discoverable, setDiscoverable] = useState<Entity[]>([])
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCachedSnapshot, setShowCachedSnapshot] = useState(false)
  const [searching, setSearching] = useState(false)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [popoverEntity, setPopoverEntity] = useState<Entity | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null)
  const [removeCandidate, setRemoveCandidate] = useState<Entity | null>(null)
  const [shareCardEntity, setShareCardEntity] = useState<Entity | null>(null)
  const [shareCardSendingId, setShareCardSendingId] = useState<number | null>(null)
  const inboxDirtyVersion = useNotificationsStore((s) => s.dirtyVersion)

  const actingOptions = useMemo(() => {
    if (actingEntities.length === 0) return [me]
    return actingEntities
  }, [actingEntities, me])
  const actingEntity = actingOptions.find((item) => item.id === actingEntityId) || me
  const friendsCacheKey = actingEntity.public_id || String(actingEntityId)

  const loadSocial = useCallback(async (options?: { background?: boolean }) => {
    const background = Boolean(options?.background)
    if (!background) setLoading(true)
    const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
      api.listFriends(token, actingEntity.public_id ? undefined : actingEntityId, actingEntity.public_id),
      api.listFriendRequests(token, { entityId: actingEntity.public_id ? undefined : actingEntityId, publicId: actingEntity.public_id, direction: 'incoming', status: 'pending' }),
      api.listFriendRequests(token, { entityId: actingEntity.public_id ? undefined : actingEntityId, publicId: actingEntity.public_id, direction: 'outgoing', status: 'pending' }),
    ])
    if (friendsRes.ok && friendsRes.data) {
      setFriends(friendsRes.data)
      setShowCachedSnapshot(false)
      const friendIds = friendsRes.data.map((entity) => entity.id)
      const friendPublicIds = friendsRes.data.map((entity) => entity.public_id).filter((value): value is string => !!value)
      if (friendIds.length > 0) {
        const presenceRes = await api.batchPresence(token, friendIds, friendPublicIds.length === friendIds.length ? friendPublicIds : undefined)
        if (presenceRes.ok && presenceRes.data?.presence) {
          const presence = presenceRes.data.presence
          const onlineIds = friendIds.filter((friendId) => !!presence[String(friendId)])
          setPresenceBatch(friendIds, onlineIds)
        } else {
          setPresenceUnknown(friendIds)
        }
      }
    }
    if (incomingRes.ok && incomingRes.data) setIncoming(incomingRes.data)
    if (outgoingRes.ok && outgoingRes.data) setOutgoing(outgoingRes.data)
    if (friendsRes.ok && friendsRes.data && incomingRes.ok && incomingRes.data && outgoingRes.ok && outgoingRes.data) {
      void cacheFriendsSnapshot(friendsCacheKey, {
        friends: friendsRes.data,
        incoming: incomingRes.data,
        outgoing: outgoingRes.data,
        updated_at: new Date().toISOString(),
      })
    }
    if (!background) setLoading(false)
  }, [actingEntity.public_id, actingEntityId, friendsCacheKey, setPresenceBatch, setPresenceUnknown, token])

  useEffect(() => {
    let cancelled = false
    void getCachedFriendsSnapshot(friendsCacheKey).then((snapshot) => {
      if (cancelled) return
      if (!snapshot) {
        void loadSocial()
        return
      }
      setFriends(snapshot.friends || [])
      setIncoming(snapshot.incoming || [])
      setOutgoing(snapshot.outgoing || [])
      setLoading(false)
      setShowCachedSnapshot(true)
      void loadSocial({ background: true })
    })
    return () => { cancelled = true }
  }, [friendsCacheKey, inboxDirtyVersion, loadSocial])

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return
      void loadSocial({ background: true })
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [loadSocial])

  const runSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchedQuery('')
      setDiscoverable([])
      return
    }
    setSearching(true)
    setSearchedQuery(trimmed)
    const res = await api.searchDiscoverableEntities(token, trimmed, 20)
    if (res.ok && res.data) {
      setDiscoverable(res.data.filter((entity) => entity.id !== actingEntityId))
    } else {
      setDiscoverable([])
    }
    setSearching(false)
  }, [actingEntityId, query, token])

  const outgoingTargets = new Set(outgoing.map((req) => req.target_entity_id))
  const friendIds = new Set(friends.map((entity) => entity.id))

  const compactUuid = useCallback((value?: string) => {
    if (!value) return ''
    if (value.length <= 16) return value
    return `${value.slice(0, 8)}…${value.slice(-6)}`
  }, [])

  const secondaryLabelOf = useCallback((entity?: Entity | null) => {
    if (!entity) return ''
    if (entity.bot_id) return entity.bot_id
    if (entity.public_id) return compactUuid(entity.public_id)
    return ''
  }, [compactUuid])

  const shareTargetConversations = useMemo(() => {
    if (!shareCardEntity) return []
    return conversations.filter((conversation) => {
      if (conversation.conv_type === 'direct') {
        return !conversation.participants?.some((participant) => participant.entity_id === shareCardEntity.id)
      }
      return (conversation.participants || []).some((participant) =>
        participant.entity_id !== me.id && participant.entity_id !== shareCardEntity.id
      )
    })
  }, [conversations, me.id, shareCardEntity])

  const buildEntityCardMessage = useCallback((entity: Entity) => {
    const card: EntityCardPayload = {
      entity_id: entity.id,
      public_id: entity.public_id,
      bot_id: entity.bot_id,
      entity_type: entity.entity_type,
      name: entity.name,
      display_name: entityDisplayName(entity),
      avatar_url: entity.avatar_url,
    }
    const summary = t('entityCard.shareSummary', { name: card.display_name })
    return {
      content_type: 'text' as const,
      layers: {
        summary,
        data: { body: summary, entity_card: card },
      },
    }
  }, [t])

  const handleSendEntityCardToConversation = useCallback(async (targetConversation: Conversation) => {
    if (!shareCardEntity || shareCardSendingId !== null) return
    setShareCardSendingId(targetConversation.id)
    const message = buildEntityCardMessage(shareCardEntity)
    try {
      const res = await api.sendMessage(token, {
        conversation_id: targetConversation.id,
        conversation_public_id: targetConversation.public_id || (typeof targetConversation.metadata?.public_id === 'string' ? targetConversation.metadata.public_id : undefined),
        ...message,
      })
      if (res.ok && res.data) {
        addMessage(res.data)
        updateConversation(targetConversation.id, {
          last_message: res.data,
          updated_at: res.data.created_at,
        })
        setShareCardEntity(null)
      }
    } catch {
      // Keep the modal open so the user can retry from the same target list.
    } finally {
      setShareCardSendingId(null)
    }
  }, [addMessage, buildEntityCardMessage, shareCardEntity, shareCardSendingId, token, updateConversation])

  const sendRequest = useCallback(async (targetId: number) => {
    setSubmittingId(targetId)
    const target = discoverable.find((entity) => entity.id === targetId)
    await api.createFriendRequest(token, {
      source_entity_id: actingEntity.public_id || actingEntityId === me.id ? undefined : actingEntityId,
      source_public_id: actingEntity.id === me.id ? undefined : actingEntity.public_id,
      target_entity_id: target?.public_id ? undefined : targetId,
      target_public_id: target?.public_id,
    })
    setSubmittingId(null)
    await loadSocial()
    setQuery('')
    setSearchedQuery('')
    setDiscoverable([])
  }, [actingEntity.id, actingEntity.public_id, actingEntityId, discoverable, loadSocial, me.id, token])

  const acceptRequest = useCallback(async (id: number) => {
    const request = incoming.find((item) => item.id === id)
    setSubmittingId(id)
    if (request) {
      setIncoming((current) => current.filter((item) => item.id !== id))
      if (request.source_entity) {
        setFriends((current) => current.some((item) => item.id === request.source_entity!.id)
          ? current
          : [request.source_entity!, ...current])
      }
      removeFriendRequestFromStore(id)
    }
    const res = await api.acceptFriendRequest(token, id, actingEntity.public_id || actingEntityId === me.id ? undefined : actingEntityId, actingEntity.id === me.id ? undefined : actingEntity.public_id)
    setSubmittingId(null)
    if (!res.ok) {
      await loadSocial()
      return
    }
    markNotificationsDirty()
  }, [actingEntity.id, actingEntity.public_id, actingEntityId, incoming, loadSocial, me.id, removeFriendRequestFromStore, markNotificationsDirty, token])

  const rejectRequest = useCallback(async (id: number) => {
    const request = incoming.find((item) => item.id === id)
    setSubmittingId(id)
    if (request) {
      setIncoming((current) => current.filter((item) => item.id !== id))
      removeFriendRequestFromStore(id)
    }
    const res = await api.rejectFriendRequest(token, id, actingEntity.public_id || actingEntityId === me.id ? undefined : actingEntityId, actingEntity.id === me.id ? undefined : actingEntity.public_id)
    setSubmittingId(null)
    if (!res.ok) {
      await loadSocial()
      return
    }
    markNotificationsDirty()
  }, [actingEntity.id, actingEntity.public_id, actingEntityId, incoming, loadSocial, me.id, removeFriendRequestFromStore, markNotificationsDirty, token])

  const cancelRequest = useCallback(async (id: number) => {
    const request = outgoing.find((item) => item.id === id)
    setSubmittingId(id)
    if (request) {
      setOutgoing((current) => current.filter((item) => item.id !== id))
      removeFriendRequestFromStore(id)
    }
    const res = await api.cancelFriendRequest(token, id, actingEntity.public_id || actingEntityId === me.id ? undefined : actingEntityId, actingEntity.id === me.id ? undefined : actingEntity.public_id)
    setSubmittingId(null)
    if (!res.ok) {
      await loadSocial()
      return
    }
    markNotificationsDirty()
  }, [actingEntity.id, actingEntity.public_id, actingEntityId, loadSocial, me.id, outgoing, removeFriendRequestFromStore, markNotificationsDirty, token])

  const removeFriend = useCallback(async (id: number) => {
    setSubmittingId(id)
    const target = friends.find((entity) => entity.id === id)
    await api.deleteFriend(token, id, actingEntity.public_id || actingEntityId === me.id ? undefined : actingEntityId, actingEntity.id === me.id ? undefined : actingEntity.public_id, target?.public_id)
    setSubmittingId(null)
    await loadSocial()
  }, [actingEntity.id, actingEntity.public_id, actingEntityId, friends, loadSocial, me.id, token])

  const handleOpenDirect = useCallback(async (target: Entity, mode: 'smart' | 'existing' | 'new' = 'smart') => {
    setSubmittingId(target.id)
    const conversation = await openOrCreateDirectConversation({
      token,
      t,
      actingEntity,
      target,
      conversations,
      addConversation,
      mode,
    })
    setSubmittingId(null)
    if (!conversation) return
    navigate(conversationRouteFor(conversation))
  }, [actingEntity, addConversation, conversations, navigate, t, token])

  return (
    <div className="h-full min-h-0 flex flex-col bg-[var(--color-bg-primary)]">
      <div className="px-6 py-5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('friends.title')}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{t('friends.subtitle')}</p>
          </div>
          <select
            value={actingEntityId}
            onChange={(e) => setActingEntityId(Number(e.target.value))}
            className="h-10 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-primary)] focus:outline-none"
          >
            {actingOptions.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.id === me.id ? t('friends.actAsSelf', { name: entityDisplayName(entity) }) : t('friends.actAsBot', { name: entityDisplayName(entity) })}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void runSearch()
              }
            }}
            placeholder={t('friends.searchPlaceholder')}
            className="w-full h-11 pl-10 pr-28 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)]/50"
          />
          <button
            onClick={() => void runSearch()}
            disabled={searching || !query.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {t('friends.searchAction')}
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t('friends.searchHelp')}</p>
        {searchedQuery && (
          <div className="mt-3 grid gap-2">
            {discoverable.length === 0 ? (
              <div className="px-4 py-3 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                {t('friends.noResults')}
              </div>
            ) : (
              discoverable.map((entity) => {
                const pending = outgoingTargets.has(entity.id)
                const isFriend = friendIds.has(entity.id)
                return (
                  <div key={entity.id} className="flex items-start gap-3 px-3 rounded-2xl bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-hover)] transition-colors">
                    <button
                      type="button"
                      onClick={(e) => {
                        setPopoverEntity(entity)
                        setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())
                      }}
                      className="flex-shrink-0 cursor-pointer mt-2"
                    >
                      <EntityAvatar entity={entity} size="sm" showStatus />
                    </button>
                    <div className="min-w-0 flex-1 py-2 border-b border-[var(--color-border)]/70">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(entity)}</div>
                          <div className="text-xs text-[var(--color-text-muted)] truncate">{secondaryLabelOf(entity)}</div>
                        </div>
                        {isFriend ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)] shrink-0">
                            <UserCheck className="w-3.5 h-3.5" />
                            {t('friends.friend')}
                          </span>
                        ) : pending ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] shrink-0">
                            <SendHorizonal className="w-3.5 h-3.5" />
                            {t('friends.requestSent')}
                          </span>
                        ) : (
                          <button
                            onClick={() => void sendRequest(entity.id)}
                            disabled={submittingId === entity.id}
                            aria-label={t('friends.add')}
                            className="h-9 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                          >
                            {submittingId === entity.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{t('friends.add')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      <div className="px-6 pt-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-2xl bg-[var(--color-bg-secondary)] p-1 border border-[var(--color-border)]">
            {(['friends', 'requests'] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'h-9 px-4 rounded-xl text-sm font-medium cursor-pointer transition-colors',
                  tab === key ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {key === 'friends' ? t('friends.friendsTab', { count: friends.length }) : t('friends.requestsTab', { count: incoming.length + outgoing.length })}
              </button>
            ))}
          </div>
          <span
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-opacity',
              showCachedSnapshot ? 'opacity-100' : 'opacity-0',
            )}
            aria-live="polite"
            aria-label={showCachedSnapshot ? t('friends.syncing') : undefined}
          >
            {showCachedSnapshot && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" /></div>
        ) : tab === 'friends' ? (
          friends.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Users className="w-9 h-9 text-[var(--color-text-muted)] mb-3" />
              <div className="text-sm font-medium text-[var(--color-text-primary)]">{t('friends.emptyTitle')}</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">{t('friends.emptyDesc')}</div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {friends.map((entity) => {
                const isBot = isBotOrService(entity)
                return (
                  <button
                    type="button"
                    key={entity.id}
                    onClick={(e) => {
                      setPopoverEntity(entity)
                      setPopoverAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())
                    }}
                    className="group relative overflow-hidden rounded-[22px] bg-[var(--color-bg-secondary)] p-4 text-left ring-1 ring-[var(--color-border)]/70 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--color-bg-hover)] hover:ring-[var(--color-accent)]/25 hover:shadow-md cursor-pointer"
                  >
                    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <EntityAvatar entity={entity} size="md" showStatus />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{entityDisplayName(entity)}</span>
                          {isBot && <Bot className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-muted)]" />}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{secondaryLabelOf(entity)}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid gap-6">
            <section>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">{t('friends.incoming')}</div>
              <div className="grid gap-3">
                {incoming.length === 0 ? (
                  <div className="px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">{t('friends.noIncoming')}</div>
                ) : incoming.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 px-3 rounded-2xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors">
                    <div className="mt-2 flex-shrink-0">
                      <EntityAvatar entity={request.source_entity} size="sm" showStatus />
                    </div>
                    <div className="min-w-0 flex-1 py-2 border-b border-[var(--color-border)]/70">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(request.source_entity)}</div>
                          <div className="text-xs text-[var(--color-text-muted)] truncate">{secondaryLabelOf(request.source_entity)}</div>
                        </div>
                        <div className="flex items-center justify-end gap-2 md:flex-shrink-0">
                          <button onClick={() => void acceptRequest(request.id)} disabled={submittingId === request.id} aria-label={t('friends.accept')} className="h-9 px-3 rounded-xl bg-[var(--color-accent)] text-white text-xs font-medium cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {submittingId === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            <span>{t('friends.accept')}</span>
                          </button>
                          <button onClick={() => void rejectRequest(request.id)} disabled={submittingId === request.id} aria-label={t('friends.reject')} className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                            <X className="w-3.5 h-3.5" />
                            <span>{t('friends.reject')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">{t('friends.outgoing')}</div>
              <div className="grid gap-3">
                {outgoing.length === 0 ? (
                  <div className="px-4 py-3 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">{t('friends.noOutgoing')}</div>
                ) : outgoing.map((request) => (
                  <div key={request.id} className="flex items-start gap-3 px-3 rounded-2xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors">
                    <div className="mt-2 flex-shrink-0">
                      <EntityAvatar entity={request.target_entity} size="sm" showStatus />
                    </div>
                    <div className="min-w-0 flex-1 py-2 border-b border-[var(--color-border)]/70">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{entityDisplayName(request.target_entity)}</div>
                          <div className="text-xs text-[var(--color-text-muted)] truncate">{secondaryLabelOf(request.target_entity)}</div>
                        </div>
                        <div className="flex items-center justify-end md:flex-shrink-0">
                          <button onClick={() => void cancelRequest(request.id)} disabled={submittingId === request.id} aria-label={t('friends.cancel')} className="h-9 px-3 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                            {submittingId === request.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            <span>{t('friends.cancel')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {popoverEntity && popoverAnchor && (
        <EntityPopoverCard
          entity={popoverEntity}
          anchorRect={popoverAnchor}
          onClose={() => { setPopoverEntity(null); setPopoverAnchor(null) }}
          onSendMessage={(entity) => { void handleOpenDirect(entity) }}
          onShareCard={(entity) => setShareCardEntity(entity)}
          onRemoveRelationship={(entity) => setRemoveCandidate(entity)}
          removeLabel={t('friends.remove')}
          onViewDetails={(entity) => navigate(entity.bot_id || entity.public_id ? `/bots/public/${encodeURIComponent(entity.bot_id || entity.public_id!)}` : `/bots/${entity.id}`)}
        />
      )}
      {shareCardEntity && (
        <div
          className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => shareCardSendingId === null && setShareCardEntity(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
              <EntityAvatar entity={shareCardEntity} size="sm" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {t('entityCard.shareTo')}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {entityDisplayName(shareCardEntity)}
                </p>
              </div>
              <button
                onClick={() => setShareCardEntity(null)}
                disabled={shareCardSendingId !== null}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {shareTargetConversations.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Contact className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-2" />
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('entityCard.noShareTargets')}</p>
                </div>
              ) : shareTargetConversations.map((targetConversation) => {
                const targetIsGroup = targetConversation.conv_type === 'group' || targetConversation.conv_type === 'channel'
                const targetEntity = targetConversation.participants?.find((participant) => participant.entity_id !== me.id)?.entity
                const title = targetConversation.title || (targetIsGroup ? t('conversation.groupChat') : entityDisplayName(targetEntity))
                const subtitle = targetIsGroup
                  ? t('conversation.participants', { count: targetConversation.participants?.length || 0 })
                  : targetEntity?.public_id || targetEntity?.bot_id || ''
                const sending = shareCardSendingId === targetConversation.id
                return (
                  <button
                    key={targetConversation.id}
                    onClick={() => void handleSendEntityCardToConversation(targetConversation)}
                    disabled={shareCardSendingId !== null}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {targetIsGroup ? (
                      <div className="w-9 h-9 rounded-full bg-[var(--color-accent-dim)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-[var(--color-accent)]" />
                      </div>
                    ) : (
                      <EntityAvatar entity={targetEntity} size="sm" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{title}</p>
                      {subtitle && <p className="text-xs text-[var(--color-text-muted)] truncate">{subtitle}</p>}
                    </div>
                    {sending ? (
                      <Loader2 className="w-4 h-4 text-[var(--color-accent)] animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-[var(--color-text-muted)]" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!removeCandidate}
        title={t('friends.removeConfirmTitle')}
        message={t('friends.removeConfirmMessage', { name: entityDisplayName(removeCandidate) })}
        confirmLabel={t('friends.remove')}
        variant="danger"
        onCancel={() => setRemoveCandidate(null)}
        onConfirm={() => {
          if (!removeCandidate) return
          void removeFriend(removeCandidate.id)
          setRemoveCandidate(null)
        }}
      />
    </div>
  )
}
