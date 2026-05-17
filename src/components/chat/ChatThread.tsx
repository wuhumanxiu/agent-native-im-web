import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageList } from './MessageList'
import { MessageComposer, type ComposerEditPrefill, type UploadedAttachment } from './MessageComposer'
import { GroupMembersPanel } from '@/components/conversation/GroupMembersPanel'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { GroupAvatar } from '@/components/conversation/GroupAvatar'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/auth'
import { useMessagesStore } from '@/store/messages'
import { usePresenceStore } from '@/store/presence'
import { useConversationsStore } from '@/store/conversations'
import * as api from '@/lib/api'
import type { Conversation, ActiveStream, Message, PresenceStateValue, MentionRef, Entity, EntityCardPayload } from '@/lib/types'
import { entityDisplayName, isBotOrService, cn } from '@/lib/utils'
import { cacheMessages, getCachedMessages, enqueueOutboxMessage, getOutboxMessageByTempId, deleteOutboxMessage, updateOutboxMessage } from '@/lib/cache'
import { DotsAnimation } from '@/components/ui/DotsAnimation'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { Search, ArrowLeft, Loader2, X, Settings, ListTodo, Bug, Check, Contact, Send, Forward, CheckSquare } from 'lucide-react'
import { useSettingsStore } from '@/store/settings'
import { inspectChatBubbles, copyToClipboard } from '@/lib/layout-inspector'
import { getRecalledDraft } from './recalled-message'

const EMPTY_MESSAGES: Message[] = []
const REVOKE_NOTICE_KEY = 'ani:revoke-notice:v1'
type ForwardMode = 'merged' | 'separate'

interface Props {
  conversation: Conversation
  onBack?: () => void
  onCancelStream?: (streamId: string, conversationId: number) => void
  onTyping?: (conversationId: number) => void
  typingEntities?: Map<number, { name: string; expiresAt: number; isProcessing?: boolean; phase?: string }>
  onToggleSettings?: () => void
  onToggleTasks?: () => void
  onEntitySendMessage?: (entity: import('@/lib/types').Entity) => void
  onEntityViewDetails?: (entity: import('@/lib/types').Entity) => void
  isArchived?: boolean
}

export function ChatThread({ conversation, onBack, onCancelStream, onTyping, typingEntities, onToggleSettings, onToggleTasks, onEntitySendMessage, onEntityViewDetails, isArchived }: Props) {
  const { t } = useTranslation()
  const devMode = useSettingsStore((s) => s.devMode)
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const messages = useMessagesStore((s) => s.byConv[conversation.id] ?? EMPTY_MESSAGES)
  const hasMore = useMessagesStore((s) => s.hasMore[conversation.id] ?? true)
  const streams = useMessagesStore((s) => s.streams)
  const progress = useMessagesStore((s) => s.progress[conversation.id])
  const setMessages = useMessagesStore((s) => s.setMessages)
  const prependMessages = useMessagesStore((s) => s.prependMessages)
  const addMessage = useMessagesStore((s) => s.addMessage)
  const revokeMessage = useMessagesStore((s) => s.revokeMessage)
  const updateMessageReactions = useMessagesStore((s) => s.updateMessageReactions)
  const addOptimisticMessage = useMessagesStore((s) => s.addOptimisticMessage)
  const replaceOptimisticMessage = useMessagesStore((s) => s.replaceOptimisticMessage)

  const removeOptimisticMessage = useMessagesStore((s) => s.removeOptimisticMessage)
  const setOptimisticState = useMessagesStore((s) => s.setOptimisticState)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editPrefill, setEditPrefill] = useState<ComposerEditPrefill | null>(null)
  const [showRevokeNotice, setShowRevokeNotice] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [debugCopied, setDebugCopied] = useState(false)
  const [debugLogged, setDebugLogged] = useState(false)
  const [debugMenuOpen, setDebugMenuOpen] = useState(false)
  const [debugStatusKey, setDebugStatusKey] = useState<string | null>(null)
  const [initialLastRead, setInitialLastRead] = useState<number | undefined>(undefined)
  const [botThinkingEntity, setBotThinkingEntity] = useState<import('@/lib/types').Entity | null>(null)
  const [shareCardEntity, setShareCardEntity] = useState<Entity | null>(null)
  const [shareCardSendingId, setShareCardSendingId] = useState<number | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set())
  const [forwardingMessages, setForwardingMessages] = useState<Message[] | null>(null)
  const [forwardMode, setForwardMode] = useState<ForwardMode>('merged')
  const [forwardNote, setForwardNote] = useState('')
  const [forwardTargetId, setForwardTargetId] = useState<number | null>(null)
  const [forwardSending, setForwardSending] = useState(false)
  const botThinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragCountRef = useRef(0)
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const conversations = useConversationsStore((s) => s.conversations)
  const readReceipts = useConversationsStore((s) => s.readReceipts[conversation.id])
  const getPresenceState = usePresenceStore((s) => s.getPresenceState)
  const wsConnected = usePresenceStore((s) => s.wsConnected)

  const outboxCount = useMemo(
    () => messages.filter((msg) => msg.temp_id && (msg.client_state === 'queued' || msg.client_state === 'failed')).length,
    [messages],
  )
  const outboxFailedCount = useMemo(
    () => messages.filter((msg) => msg.temp_id && msg.client_state === 'failed').length,
    [messages],
  )

  // Determine other participant for direct chats
  const otherParticipant = conversation.participants?.find((p) => p.entity_id !== myEntity.id)?.entity
  const isGroup = conversation.conv_type === 'group' || conversation.conv_type === 'channel'
  const otherPresence: PresenceStateValue = otherParticipant ? getPresenceState(otherParticipant.id) : 'unknown'
  const conversationPublicId = typeof conversation.metadata?.public_id === 'string'
    ? conversation.metadata.public_id
    : conversation.public_id
  const shareTargetConversations = useMemo(() => {
    if (!shareCardEntity) return []
    return conversations.filter((item) => {
      if (item.id === conversation.id) return false
      if (item.conv_type === 'direct') {
        return !item.participants?.some((participant) => participant.entity_id === shareCardEntity.id)
      }
      return (item.participants || []).some((participant) =>
        participant.entity_id !== myEntity.id && participant.entity_id !== shareCardEntity.id
      )
    })
  }, [conversation.id, conversations, myEntity.id, shareCardEntity])
  const forwardTargetConversations = useMemo(() => conversations, [conversations])

  // Check if current user is observer
  const myParticipant = conversation.participants?.find((p) => p.entity_id === myEntity.id)
  const isObserver = myParticipant?.role === 'observer'

  const botParticipants = useMemo(() => {
    return (conversation.participants || [])
      .filter((participant) => participant.entity_id !== myEntity.id && isBotOrService(participant.entity))
      .map((participant) => participant.entity)
      .filter((participantEntity): participantEntity is NonNullable<typeof participantEntity> => !!participantEntity)
  }, [conversation.participants, myEntity.id])

  const directBotParticipant = !isGroup ? (botParticipants[0] || null) : null
  const composerTargetBot = useMemo(() => {
    if (!isGroup) return directBotParticipant
    return botParticipants.length === 1 ? botParticipants[0] : null
  }, [isGroup, directBotParticipant, botParticipants])

  // Start bot thinking indicator with auto-timeout
  const startBotThinking = useCallback((target?: import('@/lib/types').Entity | null) => {
    if (!target) return
    if (botThinkingTimerRef.current) clearTimeout(botThinkingTimerRef.current)
    setBotThinkingEntity(target)
    botThinkingTimerRef.current = setTimeout(() => setBotThinkingEntity(null), 60000)
  }, [])

  const stopBotThinking = useCallback(() => {
    if (botThinkingTimerRef.current) {
      clearTimeout(botThinkingTimerRef.current)
      botThinkingTimerRef.current = null
    }
    setBotThinkingEntity(null)
  }, [])

  const resolveProcessingEntity = useCallback((mentions?: number[]) => {
    if (!isGroup) return directBotParticipant
    if (!mentions || mentions.length === 0) return null
    const mentionedBots = botParticipants.filter((participant) => mentions.includes(participant.id))
    return mentionedBots.length === 1 ? mentionedBots[0] : null
  }, [isGroup, directBotParticipant, botParticipants])

  const buildConversationRefPayload = useCallback(() => {
    return conversationPublicId
      ? { conversation_public_id: conversationPublicId }
      : { conversation_id: conversation.id }
  }, [conversation.id, conversationPublicId])

  const buildMentionPayload = useCallback((mentions?: number[], assignedMentions?: number[]) => {
    const uniqueMentionIds = Array.from(new Set((mentions || []).filter((id): id is number => typeof id === 'number')))
    if (uniqueMentionIds.length === 0) return {}
    const assignedMentionIds = Array.from(new Set(
      (assignedMentions ?? uniqueMentionIds).filter((id): id is number => uniqueMentionIds.includes(id)),
    ))

    const mentionRefs: MentionRef[] = []
    const mentionPublicIds: string[] = []
    let missingPublicId = false

    for (const id of uniqueMentionIds) {
      const participant = conversation.participants?.find((item) => item.entity_id === id || item.entity?.id === id)
      const entity = participant?.entity
      const publicId = participant?.entity_public_id || entity?.public_id
      if (!publicId) {
        missingPublicId = true
        continue
      }
      mentionPublicIds.push(publicId)
      const handle = entity?.bot_id || entity?.name || publicId
      mentionRefs.push({
        public_id: publicId,
        handle,
        display_name: entity ? entityDisplayName(entity) : undefined,
        entity_type: entity?.entity_type,
        text: `@${entity ? entityDisplayName(entity) : handle}`,
      })
    }

    if (missingPublicId || mentionPublicIds.length !== uniqueMentionIds.length) {
      return { mentions: assignedMentions ? assignedMentionIds : uniqueMentionIds }
    }

    const assignedPublicIds = assignedMentionIds
      .map((id) => {
        const participant = conversation.participants?.find((item) => item.entity_id === id || item.entity?.id === id)
        return participant?.entity_public_id || participant?.entity?.public_id
      })
      .filter((id): id is string => !!id)

    return {
      mention_public_ids: mentionPublicIds,
      mention_refs: mentionRefs,
      assigned_public_ids: assignedPublicIds,
    }
  }, [conversation.participants])

  const getMessageForwardText = useCallback((msg: Message) => {
    const body = (msg.layers?.data?.body as string) || msg.layers?.summary || ''
    if (body.trim()) return body.trim()
    if (msg.content_type === 'audio') return t('message.forwardAudio')
    if (msg.attachments?.length) {
      return msg.attachments.map((att) => att.filename || att.type || t('message.forwardAttachment')).join(', ')
    }
    return t('message.forwardUnsupported')
  }, [t])

  const buildForwardBodies = useCallback((items: Message[], mode: ForwardMode, note: string) => {
    const cleanNote = note.trim()
    if (mode === 'merged') {
      const merged = items.map((msg) => {
        const senderName = entityDisplayName(msg.sender)
        return `${senderName}: ${getMessageForwardText(msg)}`
      }).join('\n\n')
      return [cleanNote ? `${merged}\n\n${cleanNote}` : merged]
    }
    const bodies = items.map(getMessageForwardText)
    return cleanNote ? [...bodies, cleanNote] : bodies
  }, [getMessageForwardText])

  const resolveForwardMentionIds = useCallback((target: Conversation | undefined, note: string) => {
    if (!target || !note.includes('@')) return []
    const ids = new Set<number>()
    for (const participant of target.participants || []) {
      const entity = participant.entity
      if (!entity) continue
      const names = [entity.display_name, entity.name, entity.bot_id].filter(Boolean) as string[]
      if (names.some((name) => note.includes(`@${name}`))) ids.add(participant.entity_id)
    }
    return [...ids]
  }, [])

  const startForward = useCallback((items: Message[]) => {
    if (items.length === 0) return
    setForwardingMessages(items)
    setForwardMode(items.length > 1 ? 'merged' : 'separate')
    setForwardNote('')
    setForwardTargetId(conversation.id)
  }, [conversation.id])

  const handleSelectMessage = useCallback((msg: Message) => {
    setSelectionMode(true)
    setSelectedMessageIds(new Set([msg.id]))
  }, [])

  const toggleSelectedMessage = useCallback((msg: Message) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(msg.id)) next.delete(msg.id)
      else next.add(msg.id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionMode(false)
    setSelectedMessageIds(new Set())
  }, [])

  const handleForwardSelected = useCallback(() => {
    const selected = messages.filter((msg) => selectedMessageIds.has(msg.id))
    startForward(selected)
  }, [messages, selectedMessageIds, startForward])

  const submitForward = useCallback(async () => {
    if (!forwardingMessages || forwardingMessages.length === 0 || !forwardTargetId || forwardSending) return
    const target = conversations.find((item) => item.id === forwardTargetId)
    if (!target) return
    setForwardSending(true)
    const mentionIds = resolveForwardMentionIds(target, forwardNote)
    const bodies = buildForwardBodies(forwardingMessages, forwardMode, forwardNote)
    try {
      for (const body of bodies) {
        const res = await api.sendMessage(token, {
          conversation_id: target.id,
          conversation_public_id: target.public_id || (typeof target.metadata?.public_id === 'string' ? target.metadata.public_id : undefined),
          content_type: 'text',
          layers: {
            summary: body,
            data: { body, forwarded: { source_conversation_id: conversation.id, message_ids: forwardingMessages.map((msg) => msg.id), mode: forwardMode } },
          },
          mentions: mentionIds,
        })
        if (res.ok && res.data) {
          addMessage(res.data)
          updateConversation(target.id, {
            last_message: res.data,
            updated_at: res.data.created_at,
          })
        }
      }
      setForwardingMessages(null)
      setForwardNote('')
      clearSelection()
    } finally {
      setForwardSending(false)
    }
  }, [addMessage, buildForwardBodies, clearSelection, conversation.id, conversations, forwardMode, forwardNote, forwardSending, forwardingMessages, forwardTargetId, resolveForwardMentionIds, token, updateConversation])

  // Active streams for this conversation
  const convStreams = useMemo<ActiveStream[]>(
    () => Object.values(streams).filter((s) => s?.conversation_id === conversation.id),
    [streams, conversation.id],
  )

  const buildLayoutReport = useCallback(() => inspectChatBubbles('chat-message-list'), [])
  const buildNetworkReport = useCallback(() => {
    const lines = [
      '# ANI Web Network Debug Report',
      `generated_at=${new Date().toISOString()}`,
      `conversation_id=${conversation.id}`,
      `conversation_type=${conversation.conv_type}`,
      `message_count=${messages.length}`,
      `outbox_count=${outboxCount}`,
      `outbox_failed_count=${outboxFailedCount}`,
      `navigator_online=${String(navigator.onLine)}`,
      `ws_connected=${String(wsConnected)}`,
      `peer_presence=${otherPresence}`,
      `stream_count=${convStreams.length}`,
      `url=${window.location.href}`,
    ]

    return lines.join('\n')
  }, [conversation.conv_type, conversation.id, convStreams.length, messages.length, otherPresence, outboxCount, outboxFailedCount, wsConnected])

  const buildFullDebugReport = useCallback(() => {
    return [
      buildNetworkReport(),
      '',
      buildLayoutReport(),
    ].join('\n')
  }, [buildLayoutReport, buildNetworkReport])

  const handleCopyDebug = useCallback(async (_kind: 'full' | 'network' | 'layout', report: string, successKey: string) => {
    const ok = await copyToClipboard(report)
    if (!ok) return
    setDebugMenuOpen(false)
    setDebugCopied(true)
    setDebugStatusKey(successKey)
    setTimeout(() => setDebugCopied(false), 2000)
  }, [])

  const handleLogDebug = useCallback(() => {
    const report = buildLayoutReport()
    console.group('[ANI] Chat Layout Debug')
    console.log(report)
    console.groupEnd()
    setDebugMenuOpen(false)
    setDebugLogged(true)
    setDebugStatusKey('settings.debugLogged')
    setTimeout(() => setDebugLogged(false), 2000)
  }, [buildLayoutReport])

  // Consolidated: clear botThinking when a bot message arrives, typing starts, streaming starts, or conversation switches
  useEffect(() => {
    if (!botThinkingEntity) return

    // Bot message arrived
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.sender_id !== myEntity.id && (lastMsg.sender_type === 'bot' || lastMsg.sender_type === 'service')) {
        queueMicrotask(() => stopBotThinking())
        return
      }
    }

    // Typing indicator takes over
    if (typingEntities && typingEntities.size > 0) {
      const now = Date.now()
      for (const [eid, v] of typingEntities) {
        if (eid !== myEntity.id && v.expiresAt > now) {
          queueMicrotask(() => stopBotThinking())
          return
        }
      }
    }

    // Streaming started
    if (convStreams.length > 0) {
      queueMicrotask(() => stopBotThinking())
      return
    }

    // Cleanup on conversation switch
    return () => stopBotThinking()
  }, [messages, botThinkingEntity, myEntity.id, stopBotThinking, typingEntities, convStreams.length, conversation.id])

  // Typing/processing indicator (computed via callback to avoid impure Date.now() in memo)
  const computeTypingInfo = useCallback(() => {
    if (!typingEntities || typingEntities.size === 0) return null
    const now = Date.now()
    const typingNames: string[] = []
    let processingEntry: { name: string; phase?: string } | null = null
    typingEntities.forEach((v, eid) => {
      if (eid !== myEntity.id && v.expiresAt > now) {
        if (v.isProcessing) {
          processingEntry = { name: v.name, phase: v.phase }
        } else {
          typingNames.push(v.name)
        }
      }
    })
    if (processingEntry) {
      const phaseKey = (processingEntry as { phase?: string }).phase
      const phaseText = phaseKey ? t(`chat.${phaseKey}`, { defaultValue: t('chat.processing') }) : t('chat.processing')
      return { text: `${(processingEntry as { name: string }).name} ${phaseText}`, isProcessing: true }
    }
    if (typingNames.length === 0) return null
    if (typingNames.length === 1) return { text: t('message.isTyping', { name: typingNames[0] }), isProcessing: false }
    return { text: t('message.areTyping', { names: typingNames.slice(0, 2).join(', ') }), isProcessing: false }
  }, [typingEntities, myEntity.id, t])
  const typingInfo = computeTypingInfo()

  // Save draft before switching away, restore on switch
  const prevConvIdRef = useRef<number | null>(null)

  useEffect(() => {
    // Restore draft for new conversation
    try {
      const raw = localStorage.getItem(`draft:${conversation.id}`)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.replyTo) queueMicrotask(() => setReplyTo(draft.replyTo))
      }
    } catch { /* corrupt draft data */ }

    return () => {
      // Will be saved by MessageComposer's own draft logic
    }
  }, [conversation.id])

  // Reset search and reply state on conversation switch
  useEffect(() => {
    if (prevConvIdRef.current !== null && prevConvIdRef.current !== conversation.id) {
      queueMicrotask(() => {
        setSearching(false)
        setSearchQuery('')
        setSearchResults(null)
        setEditPrefill(null)
        // replyTo is restored from draft above, only reset if no draft
        const raw = localStorage.getItem(`draft:${conversation.id}`)
        if (!raw) setReplyTo(null)
      })
    }
    prevConvIdRef.current = conversation.id
  }, [conversation.id])

  const refreshMessages = useCallback(async (options?: { hydrateCache?: boolean; showSpinner?: boolean }) => {
    const hydrateCache = options?.hydrateCache ?? false
    const showSpinner = options?.showSpinner ?? false

    if (showSpinner) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    queueMicrotask(() => setInitialLastRead(undefined))

    try {
      if (hydrateCache) {
        const cached = await getCachedMessages(conversation.id)
        if (cached.length > 0) {
          setMessages(conversation.id, cached, true)
        }
      }
      const res = await api.listMessages(token, conversation.id)
      if (res.ok && res.data) {
        const msgs = (res.data.messages || []).reverse()
        setMessages(conversation.id, msgs, res.data.has_more)
        void cacheMessages(conversation.id, msgs)
        const unread = conversation.unread_count ?? 0
        if (unread > 0 && msgs.length > unread) {
          setInitialLastRead(msgs[msgs.length - 1 - unread].id)
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [conversation.id, conversation.unread_count, setMessages, token])

  // Load messages
  useEffect(() => {
    void refreshMessages({ hydrateCache: true })
  }, [refreshMessages])

  // Persist in-memory messages for offline read (debounced to batch IndexedDB writes)
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (messages.length === 0) return
    if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    cacheTimerRef.current = setTimeout(() => {
      void cacheMessages(conversation.id, messages)
    }, 3000)
    return () => {
      if (cacheTimerRef.current) clearTimeout(cacheTimerRef.current)
    }
  }, [conversation.id, messages])

  // Mark as read when viewing messages (debounced to avoid excessive API calls)
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    const timer = setTimeout(() => {
      api.markAsRead(token, conversation.id, lastMsg.id).then((res) => {
        if (res.ok) {
          updateConversation(conversation.id, { unread_count: 0 })
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [messages, token, conversation.id, updateConversation])

  // Load more
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return
    const oldest = messages[0]
    if (!oldest) return
    setLoading(true)
    const res = await api.listMessages(token, conversation.id, oldest.id)
    if (res.ok && res.data) {
      prependMessages(conversation.id, (res.data.messages || []).reverse(), res.data.has_more)
    }
    setLoading(false)
  }, [loading, hasMore, messages, token, conversation.id, prependMessages])

  // Debounced search
  useEffect(() => {
    if (!searching || !searchQuery.trim()) {
      queueMicrotask(() => setSearchResults(null))
      return
    }
    queueMicrotask(() => setSearchLoading(true))
    const timeout = setTimeout(async () => {
      const res = await api.searchMessages(token, conversation.id, searchQuery.trim())
      if (res.ok && res.data) {
        setSearchResults(res.data.messages || [])
      }
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchQuery, searching, token, conversation.id])

  // Send message
  const handleFileUpload = useCallback(async (file: File): Promise<string | null> => {
    const res = await api.uploadFile(token, file, conversation.id)
    if (res.ok && res.data) return res.data.url
    return null
  }, [conversation.id, token])

  const handleSend = useCallback(async (text: string, uploadedAttachments?: UploadedAttachment[], mentions?: number[], assignedMentions?: number[]) => {
    // Capture reply target before clearing
    const currentReplyTo = replyTo
    setReplyTo(null)
    setEditPrefill(null)
    // Clear draft on send
    localStorage.removeItem(`draft:${conversation.id}`)

    // Generate a temporary ID for optimistic message
    const tempId = `temp-${Date.now()}-${Math.random()}`

    const hasAttachments = uploadedAttachments && uploadedAttachments.length > 0
    const contentType = hasAttachments && uploadedAttachments.some((a) => a.type === 'image') ? 'image' : 'text'
    const mentionPayload = buildMentionPayload(mentions, assignedMentions)

    // Create optimistic message with attachments (already uploaded)
    const optimisticMsg: Message = {
      id: -Math.floor(Math.random() * 1000000),
      conversation_id: conversation.id,
      conversation_public_id: conversationPublicId,
      sender_id: myEntity.id,
      sender_public_id: myEntity.public_id,
      sender_type: myEntity.entity_type,
      sender: myEntity,
      content_type: contentType,
      layers: {
        summary: text,
        data: { body: text },
      },
      created_at: new Date().toISOString(),
      attachments: hasAttachments ? uploadedAttachments : [],
      mentions,
      mention_public_ids: 'mention_public_ids' in mentionPayload ? mentionPayload.mention_public_ids : undefined,
      mention_refs: 'mention_refs' in mentionPayload ? mentionPayload.mention_refs : undefined,
      assigned_public_ids: 'assigned_public_ids' in mentionPayload ? mentionPayload.assigned_public_ids : undefined,
      reply_to: currentReplyTo?.id,
    }

    // Add optimistic message immediately (with attachments visible)
    addOptimisticMessage(tempId, optimisticMsg)

    const queueForOffline = async (state: 'queued' | 'failed') => {
      const queuedId = await enqueueOutboxMessage({
        temp_id: tempId,
        conversation_id: conversation.id,
        content_type: contentType,
        text,
        mentions,
        mention_public_ids: 'mention_public_ids' in mentionPayload ? mentionPayload.mention_public_ids : undefined,
        mention_refs: 'mention_refs' in mentionPayload ? mentionPayload.mention_refs : undefined,
        assigned_public_ids: 'assigned_public_ids' in mentionPayload ? mentionPayload.assigned_public_ids : undefined,
        reply_to: currentReplyTo?.id,
        created_at: new Date().toISOString(),
        attempts: 0,
        sync_state: state,
      })
      setOptimisticState(tempId, queuedId ? state : 'failed')
    }

    if (!navigator.onLine) {
      await queueForOffline('queued')
      return
    }

    try {
      const res = await api.sendMessage(token, {
        ...buildConversationRefPayload(),
        content_type: contentType,
        layers: {
          summary: text,
          data: { body: text },
        },
        attachments: hasAttachments ? uploadedAttachments : undefined,
        ...mentionPayload,
        reply_to: currentReplyTo?.id,
      })

      if (res.ok && res.data) {
        replaceOptimisticMessage(tempId, res.data)
        startBotThinking(resolveProcessingEntity(assignedMentions ?? mentions))
      } else {
        if (hasAttachments) {
          removeOptimisticMessage(tempId, conversation.id)
        } else {
          await queueForOffline('failed')
        }
      }
    } catch {
      if (hasAttachments) {
        removeOptimisticMessage(tempId, conversation.id)
      } else {
        await queueForOffline('failed')
      }
    }
  }, [token, conversation.id, conversationPublicId, myEntity, replyTo, addOptimisticMessage, replaceOptimisticMessage, removeOptimisticMessage, setOptimisticState, startBotThinking, resolveProcessingEntity, buildMentionPayload, buildConversationRefPayload])

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

  const handleShareEntityCard = useCallback((entity: Entity) => {
    setShareCardEntity(entity)
  }, [])

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
      // Global API error handling will surface the failure when available.
    } finally {
      setShareCardSendingId(null)
    }
  }, [addMessage, buildEntityCardMessage, shareCardEntity, shareCardSendingId, token, updateConversation])

  const handleRetryOutbox = useCallback(async (tempId: string) => {
    const item = await getOutboxMessageByTempId(tempId)
    if (!item || !item.id) return
    if (!navigator.onLine) {
      setOptimisticState(tempId, 'queued')
      return
    }

    setOptimisticState(tempId, 'sending')
    await updateOutboxMessage(item.id, {
      sync_state: 'sending',
      attempts: (item.attempts || 0) + 1,
      last_attempt_at: new Date().toISOString(),
      last_error: '',
    })
    const res = await api.sendMessage(token, {
      conversation_id: item.conversation_id,
      content_type: item.content_type || 'text',
      layers: {
        summary: item.text,
        data: { body: item.text },
      },
      mentions: item.mention_public_ids?.length ? undefined : item.mentions,
      mention_public_ids: item.mention_public_ids,
      mention_refs: item.mention_refs,
      assigned_public_ids: item.assigned_public_ids,
      reply_to: item.reply_to,
    })
    if (res.ok && res.data) {
      replaceOptimisticMessage(tempId, res.data)
      await deleteOutboxMessage(item.id)
    } else {
      setOptimisticState(tempId, 'failed')
      await updateOutboxMessage(item.id, {
        sync_state: 'failed',
        last_attempt_at: new Date().toISOString(),
        last_error: typeof res.error === 'string' ? res.error : (res.error?.message || 'send failed'),
      })
    }
  }, [token, replaceOptimisticMessage, setOptimisticState])

  // Revoke message
  const handleRevoke = useCallback(async (msgId: number) => {
    if (isArchived) return // Block revoke for archived conversations
    const res = await api.revokeMessage(token, msgId)
    if (res.ok) {
      revokeMessage(conversation.id, msgId)
      if (!localStorage.getItem(REVOKE_NOTICE_KEY)) {
        localStorage.setItem(REVOKE_NOTICE_KEY, '1')
        setShowRevokeNotice(true)
      }
    }
  }, [token, conversation.id, isArchived, revokeMessage])

  const handleEditRecalled = useCallback((msg: Message) => {
    const draft = getRecalledDraft(msg, conversation.participants)
    if (!draft) return
    setReplyTo(null)
    setEditPrefill({ id: msg.id, ...draft })
  }, [conversation.participants])

  const handleReact = useCallback(async (msgId: number, emoji: string) => {
    const res = await api.toggleReaction(token, msgId, emoji)
    if (res.ok && res.data) {
      updateMessageReactions(conversation.id, msgId, res.data.reactions)
    }
  }, [token, conversation.id, updateMessageReactions])

  // Send audio message
  const handleAudioSend = useCallback(async (blob: Blob, duration: number) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`
    const file = new File([blob], `voice_${Date.now()}.webm`, { type: blob.type })

    // Optimistic message — show immediately
    const optimisticMsg: Message = {
      id: -Math.floor(Math.random() * 1000000),
      conversation_id: conversation.id,
      conversation_public_id: conversationPublicId,
      sender_id: myEntity.id,
      sender_public_id: myEntity.public_id,
      sender_type: myEntity.entity_type,
      sender: myEntity,
      content_type: 'audio',
      layers: { summary: `Voice message (${duration}s)` },
      created_at: new Date().toISOString(),
      attachments: [{ type: 'audio', filename: file.name, mime_type: blob.type, size: blob.size, duration }],
    }
    addOptimisticMessage(tempId, optimisticMsg)

    try {
      const uploadRes = await api.uploadFile(token, file, conversation.id)
      if (!uploadRes.ok || !uploadRes.data) {
        setOptimisticState(tempId, 'failed')
        return
      }
      const res = await api.sendMessage(token, {
        ...buildConversationRefPayload(),
        content_type: 'audio',
        layers: { summary: `Voice message (${duration}s)` },
        attachments: [{
          type: 'audio', url: uploadRes.data.url,
          filename: file.name, mime_type: blob.type, size: blob.size, duration,
        }],
      })
      if (res.ok && res.data) {
        replaceOptimisticMessage(tempId, res.data)
      } else {
        setOptimisticState(tempId, 'failed')
      }
    } catch {
      setOptimisticState(tempId, 'failed')
    }
  }, [token, conversation.id, conversationPublicId, myEntity, addOptimisticMessage, replaceOptimisticMessage, setOptimisticState, buildConversationRefPayload])

  // Interaction reply
  const handleInteractionReply = useCallback(async (msgId: number, choice: string, label: string) => {
    const sourceMessage = messages.find((message) => message.id === msgId)
    const processingEntity = sourceMessage?.sender && isBotOrService(sourceMessage.sender)
      ? sourceMessage.sender
      : null
    const tempId = `interaction-${conversation.id}-${msgId}-${Date.now()}`
    const optimisticId = -Date.now()
    addOptimisticMessage(tempId, {
      id: optimisticId,
      conversation_id: conversation.id,
      conversation_public_id: conversationPublicId,
      sender_id: myEntity.id,
      sender_public_id: myEntity.public_id,
      sender: myEntity,
      content_type: 'text',
      layers: {
        summary: label,
        data: { interaction_reply: { reply_to: msgId, choice } },
      },
      reply_to: msgId,
      created_at: new Date().toISOString(),
    })

    const res = await api.sendMessage(token, {
      ...buildConversationRefPayload(),
      content_type: 'text',
      layers: {
        summary: label,
        data: { interaction_reply: { reply_to: msgId, choice } },
      },
      reply_to: msgId,
    })
    if (res.ok && res.data) {
      replaceOptimisticMessage(tempId, res.data)
      startBotThinking(processingEntity)
      return
    }
    setOptimisticState(tempId, 'failed')
  }, [token, conversation.id, conversationPublicId, messages, myEntity, addOptimisticMessage, replaceOptimisticMessage, setOptimisticState, startBotThinking, buildConversationRefPayload])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current--
    if (dragCountRef.current === 0) setDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current = 0
    setDragging(false)
    if (isArchived) return // Block file drop for archived conversations
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return
    // Upload dropped files concurrently
    const results = await Promise.allSettled(
      droppedFiles.map(async (file) => {
        const url = await handleFileUpload(file)
        if (!url) throw new Error('Upload failed')
        return {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          url,
          filename: file.name,
          mime_type: file.type,
          size: file.size,
        } as UploadedAttachment
      })
    )
    const uploaded = results
      .filter((r): r is PromiseFulfilledResult<UploadedAttachment> => r.status === 'fulfilled')
      .map((r) => r.value)
    if (uploaded.length > 0) {
      handleSend('', uploaded)
    }
  }, [handleSend, handleFileUpload, isArchived])

  return (
    <div
      className="flex flex-col h-full bg-[var(--color-bg-primary)] relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-40 bg-[var(--color-accent)]/10 border-2 border-dashed border-[var(--color-accent)] rounded-lg flex items-center justify-center pointer-events-none">
          <p className="text-sm font-medium text-[var(--color-accent)]">{t('message.dropFiles')}</p>
        </div>
      )}

      {/* Header */}
      <div className="relative z-20 overflow-visible flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl">
        {onBack && (
          <button onClick={onBack} aria-label={t('a11y.back')} className="md:hidden w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer min-w-[32px]">
            <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {/* Clickable title area — opens settings/detail panel */}
        <button
          onClick={() => isGroup ? setShowMembers(true) : onToggleSettings?.()}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded-2xl px-1.5 py-1 hover:bg-[var(--color-bg-hover)]/60 transition-colors"
        >
          {isGroup ? (
            <GroupAvatar participants={conversation.participants} size="sm" />
          ) : (
            <EntityAvatar entity={otherParticipant} size="sm" showStatus />
          )}

          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
              {conversation.title || entityDisplayName(otherParticipant)}
            </h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {isGroup
                ? t('conversation.participants', { count: conversation.participants?.length || 0 })
                : otherPresence === 'online' ? (
                    <span className="text-[var(--color-success)]">{t('common.online')}</span>
                  ) : otherPresence === 'offline'
                    ? t('common.offline')
                    : t('common.unknown')
              }
            </p>
          </div>
        </button>

        <button
          onClick={() => {
            if (searching) {
              setSearching(false)
              setSearchQuery('')
              setSearchResults(null)
            } else {
              setSearching(true)
            }
          }}
          aria-label={t('a11y.search')}
          className={cn(
            'w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors min-w-[32px]',
            searching ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          )}
        >
          <Search className="w-4 h-4" />
        </button>

        {onToggleTasks && !isArchived && (
          <button
            onClick={onToggleTasks}
            aria-label={t('a11y.tasks')}
            className="w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] min-w-[32px]"
          >
            <ListTodo className="w-4 h-4" />
          </button>
        )}
        {/* Debug button — opens layout debug tools (dev mode only) */}
        {devMode && (
          <div className="relative z-30">
            <button
              onClick={() => setDebugMenuOpen((open) => !open)}
              className={cn(
                'w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors min-w-[32px]',
                debugCopied || debugLogged ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]',
              )}
              title={t('settings.devMode')}
            >
              {debugCopied || debugLogged ? <Check className="w-4 h-4" /> : <Bug className="w-4 h-4" />}
            </button>
            {debugMenuOpen && (
              <div className="absolute right-0 top-10 z-[120] w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] shadow-2xl overflow-hidden">
                <button
                  onClick={() => void handleCopyDebug('full', buildFullDebugReport(), 'settings.debugCopied')}
                  className="block w-full whitespace-nowrap px-4 py-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  {t('settings.debugCopyFull')}
                </button>
                <button
                  onClick={() => void handleCopyDebug('network', buildNetworkReport(), 'settings.debugNetworkCopied')}
                  className="block w-full whitespace-nowrap px-4 py-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors border-t border-[var(--color-border)]"
                >
                  {t('settings.debugCopyNetwork')}
                </button>
                <button
                  onClick={() => void handleCopyDebug('layout', buildLayoutReport(), 'settings.debugLayoutCopied')}
                  className="block w-full whitespace-nowrap px-4 py-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors border-t border-[var(--color-border)]"
                >
                  {t('settings.debugCopyLayout')}
                </button>
                <button
                  onClick={handleLogDebug}
                  className="block w-full whitespace-nowrap px-4 py-3 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors border-t border-[var(--color-border)]"
                >
                  {t('settings.debugLogLayout')}
                </button>
              </div>
            )}
          </div>
        )}
        {onToggleSettings && (
          <button
            onClick={onToggleSettings}
            aria-label={t('a11y.settings')}
            className="w-8 h-8 rounded-xl hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] min-w-[32px]"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {(debugCopied || debugLogged) && (
        <div className="px-4 py-1.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl">
          <p className="text-[11px] text-[var(--color-success)]">
            {debugCopied ? t(debugStatusKey || 'settings.debugCopied') : t(debugStatusKey || 'settings.debugLogged')}
          </p>
        </div>
      )}

      {selectionMode && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-xl flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
          <span className="text-xs font-medium text-[var(--color-text-primary)] flex-1">
            {t('message.selectedCount', { count: selectedMessageIds.size })}
          </span>
          <button
            onClick={handleForwardSelected}
            disabled={selectedMessageIds.size === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 disabled:cursor-default cursor-pointer"
          >
            <Forward className="w-3.5 h-3.5" />
            {t('message.forward')}
          </button>
          <button
            onClick={clearSelection}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Search bar */}
      {searching && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('conversation.searchMessages')}
              autoFocus
              className="flex-1 h-8 px-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
            />
            {searchLoading && <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin flex-shrink-0" />}
            {searchQuery && !searchLoading && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null) }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-[var(--color-bg-hover)] cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </button>
            )}
          </div>
          {searchResults !== null && !searchLoading && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1 px-1">
              {searchResults.length === 0 ? t('conversation.noResults') : t('conversation.resultsFound', { count: searchResults.length })}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <SkeletonLoader variant="chat-messages" />
      ) : (
        <MessageList
          conversationId={conversation.id}
          messages={searchResults ?? messages}
          myEntityId={myEntity.id}
          loading={searchResults !== null ? searchLoading : loading}
          refreshing={searchResults !== null ? false : refreshing}
          hasMore={searchResults !== null ? false : hasMore}
          lastReadMessageId={searchResults ? undefined : initialLastRead}
          streams={searchResults ? undefined : convStreams}
          participants={conversation.participants}
          readReceipts={searchResults ? undefined : readReceipts}
          onLoadMore={searchResults !== null ? undefined : handleLoadMore}
          onRefresh={searchResults !== null ? undefined : () => refreshMessages({ showSpinner: true })}
          onInteractionReply={handleInteractionReply}
          onRevoke={isArchived ? undefined : handleRevoke}
          onEditRecalled={isArchived ? undefined : handleEditRecalled}
          onReply={isArchived ? undefined : (msg) => setReplyTo(msg)}
          onReact={isArchived ? undefined : handleReact}
          onRetryOutbox={isArchived ? undefined : handleRetryOutbox}
          onCancelStream={onCancelStream}
          onEntitySendMessage={onEntitySendMessage}
          onEntityViewDetails={onEntityViewDetails}
          onEntityShareCard={isArchived ? undefined : handleShareEntityCard}
          onForward={isArchived ? undefined : (msg) => startForward([msg])}
          onSelect={isArchived ? undefined : handleSelectMessage}
          selectionMode={selectionMode}
          selectedMessageIds={selectedMessageIds}
          onToggleSelected={toggleSelectedMessage}
          thinkingEntity={botThinkingEntity || undefined}
          progress={progress}
        />
      )}

      {/* Group members panel */}
      {showMembers && isGroup && (
        <GroupMembersPanel
          conversation={conversation}
          onClose={() => setShowMembers(false)}
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
                const targetEntity = targetConversation.participants?.find((participant) => participant.entity_id !== myEntity.id)?.entity
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
                      <GroupAvatar participants={targetConversation.participants} size="sm" />
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

      {forwardingMessages && (
        <div
          className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !forwardSending && setForwardingMessages(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
              <Forward className="w-4 h-4 text-[var(--color-accent)]" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {t('message.forwardMessages')}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t('message.selectedCount', { count: forwardingMessages.length })}
                </p>
              </div>
              <button
                onClick={() => setForwardingMessages(null)}
                disabled={forwardSending}
                aria-label={t('common.close')}
                className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4 text-[var(--color-text-muted)]" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--color-bg-tertiary)] p-1">
                {(['merged', 'separate'] as ForwardMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setForwardMode(mode)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors',
                      forwardMode === mode
                        ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                    )}
                  >
                    {t(`message.forwardMode.${mode}`)}
                  </button>
                ))}
              </div>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {forwardTargetConversations.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setForwardTargetId(item.id)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--color-bg-hover)] cursor-pointer flex items-center gap-2',
                      forwardTargetId === item.id && 'bg-[var(--color-accent)]/10',
                    )}
                  >
                    <span className="flex-1 truncate text-[var(--color-text-primary)]">{item.title || `#${item.id}`}</span>
                    {forwardTargetId === item.id && <Check className="w-4 h-4 text-[var(--color-accent)]" />}
                  </button>
                ))}
              </div>
              <textarea
                value={forwardNote}
                onChange={(event) => setForwardNote(event.target.value)}
                placeholder={t('message.forwardNotePlaceholder')}
                className="w-full min-h-20 resize-none rounded-xl bg-[var(--color-bg-input)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
              />
            </div>
            <div className="px-4 py-3 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button
                onClick={() => setForwardingMessages(null)}
                disabled={forwardSending}
                className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void submitForward()}
                disabled={!forwardTargetId || forwardSending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50 disabled:cursor-default cursor-pointer"
              >
                {forwardSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {t('message.forwardSend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Typing / Processing indicator */}
      {typingInfo && (
        <div
          aria-live="polite"
          className={cn(
          'px-4 py-1 text-[11px] italic flex items-center gap-1.5',
          typingInfo.isProcessing ? 'text-[var(--color-bot)]' : 'text-[var(--color-text-muted)]',
        )}>
          {typingInfo.isProcessing && (
            <DotsAnimation size="sm" />
          )}
          {typingInfo.text}
        </div>
      )}

      {/* Composer */}
      <MessageComposer
        conversationId={conversation.id}
        onSend={handleSend}
        onAudioSend={handleAudioSend}
        onFileUpload={handleFileUpload}
        attachmentsEnabled={navigator.onLine}
        onTyping={onTyping ? () => onTyping(conversation.id) : undefined}
        placeholder={t('conversation.typeMessage')}
        participants={conversation.participants}
        isObserver={isObserver || isArchived}
        enableMentions={conversation.conv_type !== 'direct'}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        targetBot={composerTargetBot}
        editPrefill={editPrefill}
      />
      <ConfirmDialog
        open={showRevokeNotice}
        title={t('message.revokeNoticeTitle')}
        message={t('message.revokeNotice')}
        confirmLabel={t('common.confirm')}
        onConfirm={() => setShowRevokeNotice(false)}
        onCancel={() => setShowRevokeNotice(false)}
      />
    </div>
  )
}
