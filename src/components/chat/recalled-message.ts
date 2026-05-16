import type { Message } from '@/lib/types'

export function getEditableRecalledMessageText(message: Message): string | null {
  if (!message.revoked_at) return null
  if (message.content_type !== 'text') return null
  if ((message.attachments || []).length > 0) return null

  const body = message.layers?.data?.body
  const text = typeof body === 'string' ? body : message.layers?.summary
  if (typeof text !== 'string') return null

  const normalized = text.trim()
  return normalized ? normalized : null
}
