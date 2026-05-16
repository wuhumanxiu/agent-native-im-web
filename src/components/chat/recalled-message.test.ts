import { describe, expect, it } from 'vitest'
import { getEditableRecalledMessageText } from './recalled-message'
import type { Message } from '@/lib/types'

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 1,
    conversation_id: 10,
    sender_id: 3,
    sender_type: 'user',
    content_type: 'text',
    layers: { summary: 'hello', data: { body: 'hello' } },
    created_at: '2026-05-16T00:00:00Z',
    revoked_at: '2026-05-16T00:01:00Z',
    ...overrides,
  }
}

describe('getEditableRecalledMessageText', () => {
  it('returns text from recalled plain text messages', () => {
    expect(getEditableRecalledMessageText(message())).toBe('hello')
  })

  it('does not restore non-recalled messages', () => {
    expect(getEditableRecalledMessageText(message({ revoked_at: undefined }))).toBeNull()
  })

  it('does not silently restore attachments or rich message types', () => {
    expect(getEditableRecalledMessageText(message({ attachments: [{ type: 'file', filename: 'a.txt' }] }))).toBeNull()
    expect(getEditableRecalledMessageText(message({ content_type: 'image' }))).toBeNull()
  })
})
