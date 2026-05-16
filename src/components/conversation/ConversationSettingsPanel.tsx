import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EntityAvatar } from '@/components/entity/EntityAvatar'
import { entityDisplayName, cn, isBotOrService } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { useConversationsStore } from '@/store/conversations'
import { usePresenceStore } from '@/store/presence'
import { AgentConfigSection } from '@/components/conversation/AgentConfigSection'
import { MemorySection } from '@/components/conversation/MemorySection'
import { InviteLinkSection } from '@/components/conversation/InviteLinkSection'
import * as api from '@/lib/api'
import { loadAddableGroupMembers } from '@/lib/addable-members'
import { buildGroupMemberSections } from '@/lib/group-members'
import type { Conversation, Entity, Participant } from '@/lib/types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  X, UserMinus, Bell, BellOff, Crown, Shield, Eye,
  Pencil, Check, LogOut, Archive, VolumeX, Volume2, Loader2, Copy, ArrowLeft, Search, Bot, UserRound,
  ChevronDown, Plus, Settings2,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Props {
  conversation: Conversation
  onClose: () => void
  onLeave?: () => void
  isArchived?: boolean
}

export function ConversationSettingsPanel({ conversation, onClose, onLeave, isArchived }: Props) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const token = useAuthStore((s) => s.token)!
  const myEntity = useAuthStore((s) => s.entity)!
  const updateConversation = useConversationsStore((s) => s.updateConversation)
  const toggleMute = useConversationsStore((s) => s.toggleMute)
  const isMuted = useConversationsStore((s) => s.isMuted)
  const online = usePresenceStore((s) => s.online)

  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleValue, setTitleValue] = useState(conversation.title || '')
  const [descValue, setDescValue] = useState(conversation.description || '')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null)
  const [idCopied, setIdCopied] = useState(false)
  const [idCopyError, setIdCopyError] = useState<string | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [addableEntities, setAddableEntities] = useState<Entity[]>([])
  const [addMemberSearch, setAddMemberSearch] = useState('')
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const publicId = (conversation.metadata as Record<string, unknown> | undefined)?.public_id
  const displayConversationId = (typeof publicId === 'string' && publicId) || conversation.public_id || ''

  const participants = useMemo(() => conversation.participants || [], [conversation.participants])
  const memberSections = useMemo(() => buildGroupMemberSections(participants), [participants])
  const myParticipant = participants.find((p) => p.entity_id === myEntity.id)
  const canManage = myParticipant?.role === 'owner' || myParticipant?.role === 'admin'
  const canAddMember = Boolean(myParticipant)
  const isGroup = conversation.conv_type === 'group' || conversation.conv_type === 'channel'
  const muted = isMuted(conversation.id)
  const filteredAddableEntities = useMemo(() => {
    if (!addMemberSearch) return addableEntities
    const q = addMemberSearch.toLowerCase()
    return addableEntities.filter((e) =>
      entityDisplayName(e).toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    )
  }, [addMemberSearch, addableEntities])

  const handleSaveTitle = async () => {
    if (!titleValue.trim() || titleValue === conversation.title) {
      setEditingTitle(false)
      return
    }
    setSaving(true)
    const res = await api.updateConversation(token, conversation.id, { title: titleValue.trim() })
    if (res.ok && res.data) {
      updateConversation(conversation.id, { title: res.data.title })
    }
    setSaving(false)
    setEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    if (descValue === conversation.description) {
      setEditingDesc(false)
      return
    }
    setSaving(true)
    const res = await api.updateConversation(token, conversation.id, { description: descValue.trim() })
    if (res.ok && res.data) {
      updateConversation(conversation.id, { description: res.data.description })
    }
    setSaving(false)
    setEditingDesc(false)
  }

  const handleSubscriptionChange = async (mode: string) => {
    await api.updateSubscription(token, conversation.id, mode)
  }

  const handleOpenAddMember = async () => {
    setShowAddMember(true)
    setAddMemberLoading(true)
    setAddableEntities(await loadAddableGroupMembers(token, myEntity.id, participants))
    setAddMemberLoading(false)
  }

  const handleAddMember = async (entityId: number) => {
    setAddMemberLoading(true)
    const entity = addableEntities.find((item) => item.id === entityId)
    await api.addParticipant(token, conversation.id, entityId, 'member', entity?.public_id)
    setShowAddMember(false)
    setAddMemberSearch('')
    setAddMemberLoading(false)
    // Refresh happens through parent via websocket events
  }

  const participantPublicId = (participant?: Participant) => participant?.entity_public_id || participant?.entity?.public_id

  const handleRemoveMember = async (entityId: number) => {
    const participant = participants.find((item) => item.entity_id === entityId)
    const res = await api.removeParticipant(token, conversation.id, entityId, participantPublicId(participant))
    if (res.ok) {
      updateConversation(conversation.id, {
        participants: participants.filter((participant) => participant.entity_id !== entityId),
      })
      const refreshed = await api.getConversation(token, conversation.id)
      if (refreshed.ok && refreshed.data) {
        updateConversation(conversation.id, { participants: refreshed.data.participants })
      }
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    const res = await api.leaveConversation(token, conversation.id)
    setLoading(false)
    if (res.ok) {
      onLeave?.()
      onClose()
    }
  }

  const handleArchive = async () => {
    setLoading(true)
    const res = await api.archiveConversation(token, conversation.id)
    setLoading(false)
    if (res.ok) {
      onLeave?.()
      onClose()
    }
  }

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-amber-400" />
    if (role === 'admin') return <Shield className="w-3 h-3 text-blue-400" />
    if (role === 'observer') return <Eye className="w-3 h-3 text-[var(--color-text-muted)]" />
    return null
  }

  const ownerName = (entity?: Entity) => entity?.owner_display_name || entity?.owner_name || ''
  const showAddMemberTile = canAddMember && !isArchived
  const previewLimit = showAddMemberTile ? 14 : 15
  const previewParticipants = participants.slice(0, previewLimit)

  const renderMemberRow = (p: Participant, options?: { nested?: boolean; orphanBot?: boolean }) => {
    const nested = Boolean(options?.nested)
    const orphanBot = Boolean(options?.orphanBot)
    const isBot = isBotOrService(p.entity)

    return (
      <div
        key={p.entity_id}
        className={cn(
          'flex items-center gap-2.5 py-1.5 group',
          nested && 'pl-4 py-1',
        )}
      >
        <div className="relative">
          {nested && (
            <span className="absolute -left-3 top-1/2 h-px w-2 bg-[var(--color-border)]" aria-hidden="true" />
          )}
          <EntityAvatar entity={p.entity} size="xs" />
          {online.has(p.entity_id) && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-bg-secondary)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {!nested && roleIcon(p.role)}
            {isBot ? (
              <Bot className="w-3 h-3 text-[var(--color-bot)] flex-shrink-0" />
            ) : (
              <UserRound className="w-3 h-3 text-[var(--color-text-muted)] flex-shrink-0" />
            )}
            <span className={cn(
              'text-xs font-medium text-[var(--color-text-primary)] truncate',
              nested && 'text-[11px]',
            )}>
              {entityDisplayName(p.entity)}
            </span>
            {p.entity_id === myEntity.id && (
              <span className="text-[9px] text-[var(--color-text-muted)]">{t('common.you')}</span>
            )}
          </div>
          {orphanBot && ownerName(p.entity) && (
            <div className="text-[9px] text-[var(--color-text-muted)] truncate mt-0.5">{ownerName(p.entity)}</div>
          )}
        </div>
        {canManage && p.entity_id !== myEntity.id && p.role !== 'owner' && !isArchived && (
          <select
            value={p.role}
            onChange={(e) => api.updateParticipantRole(token, conversation.id, p.entity_id, e.target.value, participantPublicId(p))}
            className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-muted)] cursor-pointer focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <option value="admin">{t('settings.roleAdmin')}</option>
            <option value="member">{t('settings.roleMember')}</option>
            <option value="observer">{t('settings.roleObserver')}</option>
          </select>
        )}
        {canManage && p.entity_id !== myEntity.id && p.role !== 'owner' && !isArchived && (
          <button
            onClick={() => setRemoveMemberId(p.entity_id)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-error)]/15 rounded cursor-pointer transition-opacity"
          >
            <UserMinus className="w-3 h-3 text-[var(--color-text-muted)]" />
          </button>
        )}
      </div>
    )
  }

  const renderMemberTile = (p: Participant) => {
    const isBot = isBotOrService(p.entity)
    return (
      <button
        key={p.entity_id}
        type="button"
        onClick={() => setShowAllMembers(true)}
        className="min-w-0 rounded-xl px-1.5 py-2 text-center hover:bg-[var(--color-bg-hover)] transition-colors"
      >
        <div className="relative mx-auto w-fit">
          <EntityAvatar entity={p.entity} size="sm" />
          {online.has(p.entity_id) && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--color-success)] border-2 border-[var(--color-bg-secondary)]" />
          )}
          {isBot && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--color-bot)]/15 border border-[var(--color-border)] flex items-center justify-center">
              <Bot className="w-2.5 h-2.5 text-[var(--color-bot)]" />
            </div>
          )}
        </div>
        <p className="mt-1 truncate text-[10px] text-[var(--color-text-secondary)]">{entityDisplayName(p.entity)}</p>
      </button>
    )
  }

  const renderAddMemberPanel = () => (
    <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/45 p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        <input
          value={addMemberSearch}
          onChange={(e) => setAddMemberSearch(e.target.value)}
          placeholder={t('conversation.search')}
          autoFocus
          className="w-full h-8 pl-8 pr-3 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]/50"
        />
      </div>
      {addMemberLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin" />
        </div>
      ) : (
        <div className="mt-2 max-h-44 overflow-y-auto space-y-0.5">
          {filteredAddableEntities.map((e) => (
            <button
              key={e.id}
              onClick={() => handleAddMember(e.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors text-left"
            >
              <EntityAvatar entity={e} size="xs" />
              <span className="text-xs text-[var(--color-text-primary)] truncate flex-1">{entityDisplayName(e)}</span>
              <span className="text-[9px] text-[var(--color-text-muted)]">
                {isBotOrService(e) ? t('friends.yourBot') : t('friends.friend')}
              </span>
            </button>
          ))}
          {filteredAddableEntities.length === 0 && (
            <p className="text-[10px] text-[var(--color-text-muted)] text-center py-3">{t('common.noEntities')}</p>
          )}
        </div>
      )}
      <button
        onClick={() => { setShowAddMember(false); setAddMemberSearch('') }}
        className="mt-2 w-full text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] py-1 cursor-pointer"
      >
        {t('common.cancel')}
      </button>
    </div>
  )

  return (
    <div className={cn(
      'border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col h-full overflow-hidden flex-shrink-0',
      isMobile ? 'fixed inset-0 z-50 w-full border-l-0' : 'w-80',
    )} style={isMobile ? { animation: 'slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1)' } : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
              <ArrowLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
          )}
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t('settings.title')}{isArchived && <span className="text-xs text-[var(--color-text-muted)] ml-2">({t('common.archived')})</span>}
          </h3>
        </div>
        {!isMobile && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-[var(--color-bg-hover)] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Members: primary group settings content */}
        {isGroup && (
          <div className="px-4 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                  {t('settings.members')} ({participants.length})
                </label>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{t('conversation.participants', { count: participants.length })}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllMembers((value) => !value)}
                className="text-[11px] font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer"
              >
                {showAllMembers ? t('common.hideDetails') : t('common.showDetails')}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1">
              {previewParticipants.map(renderMemberTile)}
              {showAddMemberTile && (
                <button
                  type="button"
                  onClick={handleOpenAddMember}
                  className="rounded-xl px-1.5 py-2 text-center hover:bg-[var(--color-bg-hover)] transition-colors"
                  title={t('common.addMember')}
                >
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg-input)] border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-[var(--color-text-secondary)]">{t('common.addMember')}</p>
                </button>
              )}
            </div>

            {showAddMember && renderAddMemberPanel()}

            {showAllMembers && (
              <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/45 overflow-hidden">
                <div className="px-3 py-2 space-y-1">
                  {memberSections.owners.map(({ owner, bots }) => (
                    <div key={owner.entity_id}>
                      {renderMemberRow(owner)}
                      {bots.map((bot) => renderMemberRow(bot, { nested: true }))}
                    </div>
                  ))}
                  {memberSections.orphanBots.length > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center gap-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        <span>{t('composer.mentionBots')}</span>
                        <span className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>
                      {memberSections.orphanBots.map((bot) => renderMemberRow(bot, { orphanBot: true }))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.name')}</label>
          {editingTitle ? (
            <div className="flex items-center gap-1 mt-1">
              <input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                className="flex-1 h-8 px-2 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-accent)]/50 text-sm text-[var(--color-text-primary)] focus:outline-none"
                autoFocus
              />
              <button onClick={handleSaveTitle} disabled={saving} className="p-1 hover:bg-[var(--color-success)]/20 rounded cursor-pointer">
                <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-1 hover:bg-[var(--color-error)]/20 rounded cursor-pointer">
                <X className="w-3.5 h-3.5 text-[var(--color-error)]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1 group">
              <p className="text-sm text-[var(--color-text-primary)] flex-1">{conversation.title || 'Untitled'}</p>
              {canManage && !isArchived && (
                <button onClick={() => { setTitleValue(conversation.title || ''); setEditingTitle(true) }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-opacity">
                  <Pencil className="w-3 h-3 text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {isGroup && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.description')}</label>
            {editingDesc ? (
              <div className="mt-1 space-y-1">
                <textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-accent)]/50 text-xs text-[var(--color-text-primary)] focus:outline-none resize-none"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button onClick={handleSaveDesc} disabled={saving} className="px-2 py-1 text-[10px] bg-[var(--color-accent)] text-white rounded cursor-pointer">{t('common.save')}</button>
                  <button onClick={() => setEditingDesc(false)} className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer">{t('common.cancel')}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-1 group">
                <p className="text-xs text-[var(--color-text-secondary)] flex-1 leading-relaxed">
                  {conversation.description || t('settings.noDescription')}
                </p>
                {canManage && !isArchived && (
                  <button onClick={() => { setDescValue(conversation.description || ''); setEditingDesc(true) }} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-opacity flex-shrink-0">
                    <Pencil className="w-3 h-3 text-[var(--color-text-muted)]" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notification settings */}
        {myParticipant && (
          <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-3">
            <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.notifications')}</label>

            {/* Mute toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{t('settings.mute')}</span>
              </div>
              <button
                onClick={() => toggleMute(conversation.id)}
                disabled={isArchived}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors relative',
                  muted ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
                  isArchived ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-all',
                  muted ? 'left-[18px]' : 'left-0.5',
                )} />
              </button>
            </div>

            {/* Subscription mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {myParticipant.subscription_mode === 'subscribe_all' || myParticipant.subscription_mode === 'mention_with_context'
                  ? <Bell className="w-3.5 h-3.5" />
                  : <BellOff className="w-3.5 h-3.5" />}
                <span>{t('settings.mode')}</span>
              </div>
              <select
                value={myParticipant.subscription_mode}
                onChange={(e) => handleSubscriptionChange(e.target.value)}
                disabled={isArchived}
                className={cn(
                  "text-[11px] px-2 py-1 rounded-md bg-[var(--color-bg-input)] border border-[var(--color-border)] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)]/50",
                  isArchived ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                )}
              >
                <option value="mention_only">{t('settings.mentionOnly')}</option>
                <option value="subscribe_all">{t('settings.allMessages')}</option>
                <option value="mention_with_context">{t('settings.mentionContext')}</option>
                <option value="subscribe_digest">{t('settings.digest')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Advanced conversation settings */}
        <div className="border-b border-[var(--color-border)]">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings((value) => !value)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">{t('settings.advancedSettings')}</span>
            </div>
            <ChevronDown className={cn('w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform', showAdvancedSettings && 'rotate-180')} />
          </button>
          {showAdvancedSettings && (
            <div className="border-t border-[var(--color-border)]">
              <div className="px-4 py-2 border-b border-[var(--color-border)]">
                <label className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{t('settings.conversationId')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs text-[var(--color-text-secondary)] font-mono bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">
                    {displayConversationId || '—'}
                  </code>
                  {displayConversationId ? (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(displayConversationId)
                          setIdCopyError(null)
                          setIdCopied(true)
                          setTimeout(() => setIdCopied(false), 2000)
                        } catch {
                          setIdCopied(false)
                          setIdCopyError(t('common.copyFailed'))
                        }
                      }}
                      className="p-1 hover:bg-[var(--color-bg-hover)] rounded cursor-pointer transition-colors"
                      title={t('settings.conversationId')}
                    >
                      {idCopied
                        ? <Check className="w-3 h-3 text-[var(--color-success)]" />
                        : <Copy className="w-3 h-3 text-[var(--color-text-muted)]" />
                      }
                    </button>
                  ) : null}
                  {displayConversationId && idCopied ? <span className="text-[10px] text-[var(--color-success)]">{t('settings.idCopied')}</span> : null}
                  {idCopyError && <span className="text-[10px] text-red-400">{idCopyError}</span>}
                </div>
              </div>

              <AgentConfigSection conversationId={conversation.id} canManage={canManage && !isArchived} />
              <MemorySection conversationId={conversation.id} canManage={canManage && !isArchived} />
              {canManage && isGroup && !isArchived && (
                <InviteLinkSection conversationId={conversation.id} />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 space-y-1">
          {isGroup && !isArchived && (
            <button
              onClick={handleArchive}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              {t('settings.archive')}
            </button>
          )}
          {isGroup && myParticipant?.role !== 'owner' && !isArchived && (
            <button
              onClick={() => setConfirmLeave(true)}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 cursor-pointer transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              {t('settings.leave')}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLeave}
        title={t('settings.leave')}
        message={t('settings.leaveConfirm')}
        variant="danger"
        confirmLabel={t('settings.leave')}
        onConfirm={() => { setConfirmLeave(false); handleLeave() }}
        onCancel={() => setConfirmLeave(false)}
      />

      <ConfirmDialog
        open={removeMemberId !== null}
        title={t('common.removeMember')}
        message={t('settings.removeMemberConfirm', { name: entityDisplayName(participants.find((p) => p.entity_id === removeMemberId)?.entity) })}
        variant="danger"
        confirmLabel={t('common.removeMember')}
        onConfirm={async () => {
          if (removeMemberId !== null) {
            await handleRemoveMember(removeMemberId)
          }
          setRemoveMemberId(null)
        }}
        onCancel={() => setRemoveMemberId(null)}
      />
    </div>
  )
}
