import { entityDisplayName } from '@/lib/utils'
import type { Message, Participant } from '@/lib/types'

/** A file that has been selected and is being (or has been) uploaded. */
export interface PendingFile {
  file?: File
  name: string
  type: string
  size: number
  status: 'uploading' | 'uploaded' | 'failed'
  url?: string
}

interface DraftReplyPreview {
  id: number
  sender?: Message['sender']
  layers?: Message['layers']
}

interface ComposerDraftPayload {
  text: string
  replyTo: DraftReplyPreview | null
  mentionIds: number[]
  assignedMentionIds: number[]
  attachments: PendingFile[]
}

function toDraftAttachment(file: PendingFile): PendingFile | null {
  if (file.status !== 'uploaded' || !file.url) return null
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    status: 'uploaded',
    url: file.url,
  }
}

export function serializeComposerDraft(params: {
  text: string
  replyTo?: Message | null
  mentionIds: number[]
  assignedMentionIds?: number[]
  pendingFiles: PendingFile[]
}): string | null {
  const text = params.text.trim()
  const attachments = params.pendingFiles
    .map(toDraftAttachment)
    .filter((item): item is PendingFile => !!item)
  if (!text && !params.replyTo && params.mentionIds.length === 0 && attachments.length === 0) return null
  const assignedMentionIds = params.assignedMentionIds ?? []
  const payload: ComposerDraftPayload = {
    text,
    replyTo: params.replyTo ? { id: params.replyTo.id, sender: params.replyTo.sender, layers: params.replyTo.layers } : null,
    mentionIds: [...params.mentionIds],
    assignedMentionIds: assignedMentionIds.filter((id) => params.mentionIds.includes(id)),
    attachments,
  }
  return JSON.stringify(payload)
}

export function parseComposerDraft(raw: string | null): ComposerDraftPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ComposerDraftPayload>
    return {
      text: typeof parsed.text === 'string' ? parsed.text : '',
      replyTo: parsed.replyTo ?? null,
      mentionIds: Array.isArray(parsed.mentionIds)
        ? parsed.mentionIds.filter((id): id is number => typeof id === 'number')
        : [],
      assignedMentionIds: Array.isArray(parsed.assignedMentionIds)
        ? parsed.assignedMentionIds.filter((id): id is number => typeof id === 'number')
        : [],
      attachments: Array.isArray(parsed.attachments)
        ? parsed.attachments
          .filter((item): item is PendingFile => !!item && typeof item.name === 'string')
          .map((item) => ({
            name: item.name,
            type: item.type || '',
            size: typeof item.size === 'number' ? item.size : 0,
            status: item.status === 'failed' ? 'failed' : 'uploaded',
            url: item.url,
          }))
        : [],
    }
  } catch {
    return {
      text: raw,
      replyTo: null,
      mentionIds: [],
      assignedMentionIds: [],
      attachments: [],
    }
  }
}

function mentionNameExists(text: string, name: string): boolean {
  if (!name.trim()) return false
  return text.includes(`@${name}`)
}

export function normalizeAssignedMentionIds(mentionIds: number[], assignedMentionIds: number[] = []): number[] {
  if (mentionIds.length === 0) return []
  const activeAssignedMentionIds = assignedMentionIds.filter((id) => mentionIds.includes(id))
  return activeAssignedMentionIds.length > 0 ? activeAssignedMentionIds : [mentionIds[0]]
}

export function deriveComposerMentionState(params: {
  text: string
  mentionIds: number[]
  assignedMentionIds: number[]
  participants?: Participant[]
}): { mentionIds: number[]; assignedMentionIds: number[] } {
  const activeMentionIds = params.participants
    ? params.mentionIds.filter((id) => {
      const participant = params.participants?.find((item) => item.entity_id === id)
      if (!participant?.entity) return false
      const displayName = entityDisplayName(participant.entity)
      return mentionNameExists(params.text, displayName) || mentionNameExists(params.text, participant.entity.name)
    })
    : params.mentionIds

  return {
    mentionIds: activeMentionIds,
    assignedMentionIds: normalizeAssignedMentionIds(activeMentionIds, params.assignedMentionIds),
  }
}
