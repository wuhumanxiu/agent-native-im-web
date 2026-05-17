import type { Attachment, Message, Participant } from '@/lib/types'
import type { PendingFile } from './MessageComposerDraft'

export interface RecalledDraft {
  text: string
  attachments: PendingFile[]
  mentionIds: number[]
  assignedMentionIds: number[]
}

function recalledText(message: Message): string | null {
  const body = message.layers?.data?.body
  const text = typeof body === 'string' ? body : message.layers?.summary
  if (typeof text !== 'string') return null

  const normalized = text.trim()
  return normalized ? normalized : null
}

function attachmentToPendingFile(attachment: Attachment): PendingFile | null {
  if (!attachment.url) return null
  const type = attachment.mime_type || (attachment.type === 'image' ? 'image/*' : attachment.type) || ''
  return {
    name: attachment.filename || attachment.url.split('/').pop() || 'attachment',
    type,
    size: attachment.size || 0,
    status: 'uploaded',
    url: attachment.url,
  }
}

function idsFromPublicIds(publicIds: string[] | undefined, participants?: Participant[]): number[] {
  if (!publicIds?.length || !participants?.length) return []
  const ids: number[] = []
  for (const publicId of publicIds) {
    const participant = participants.find((item) =>
      item.entity_public_id === publicId || item.entity?.public_id === publicId
    )
    if (participant && !ids.includes(participant.entity_id)) ids.push(participant.entity_id)
  }
  return ids
}

function normalizeMentionIds(message: Message, participants?: Participant[]): number[] {
  const ids = (message.mentions || []).filter((id): id is number => typeof id === 'number')
  const publicIds = idsFromPublicIds(message.mention_public_ids, participants)
  return Array.from(new Set([...ids, ...publicIds]))
}

function normalizeAssignedMentionIds(message: Message, mentionIds: number[], participants?: Participant[]): number[] {
  const assignedPublicIds = idsFromPublicIds(message.assigned_public_ids, participants)
  const assigned = assignedPublicIds.length > 0 ? assignedPublicIds : mentionIds
  return assigned.filter((id) => mentionIds.includes(id))
}

export function getRecalledDraft(message: Message, participants?: Participant[]): RecalledDraft | null {
  if (!message.revoked_at) return null
  if (message.content_type !== 'text' && message.content_type !== 'image' && message.content_type !== 'file') return null

  const text = recalledText(message) || ''
  const attachments = (message.attachments || [])
    .map(attachmentToPendingFile)
    .filter((item): item is PendingFile => !!item)
  if (!text && attachments.length === 0) return null
  if ((message.attachments || []).length !== attachments.length) return null

  const mentionIds = normalizeMentionIds(message, participants)
  const assignedMentionIds = normalizeAssignedMentionIds(message, mentionIds, participants)

  return { text, attachments, mentionIds, assignedMentionIds }
}

export function getEditableRecalledMessageText(message: Message): string | null {
  return getRecalledDraft(message)?.text || null
}
