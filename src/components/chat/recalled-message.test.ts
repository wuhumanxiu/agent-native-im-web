import { describe, expect, it } from 'vitest'
import { getEditableRecalledMessageText, getRecalledDraft } from './recalled-message'
import type { Message, Participant } from '@/lib/types'

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

function participant(id: number, publicId: string): Participant {
  return {
    id,
    conversation_id: 10,
    entity_id: id,
    entity_public_id: publicId,
    role: 'member',
    subscription_mode: 'mention_only',
    joined_at: '2026-05-16T00:00:00Z',
  }
}

describe('getRecalledDraft', () => {
  it('returns text from recalled plain text messages', () => {
    expect(getEditableRecalledMessageText(message())).toBe('hello')
  })

  it('restores mention and assignment metadata', () => {
    const draft = getRecalledDraft(message({
      mentions: [12],
      mention_public_ids: ['public-12', 'public-13'],
      assigned_public_ids: ['public-13'],
    }), [participant(12, 'public-12'), participant(13, 'public-13')])

    expect(draft?.mentionIds).toEqual([12, 13])
    expect(draft?.assignedMentionIds).toEqual([13])
  })

  it('restores already-uploaded attachments', () => {
    const draft = getRecalledDraft(message({
      content_type: 'image',
      attachments: [{
        type: 'image',
        url: '/files/a.png',
        filename: 'a.png',
        mime_type: 'image/png',
        size: 123,
      }],
    }))

    expect(draft?.attachments).toEqual([{
      name: 'a.png',
      type: 'image/png',
      size: 123,
      status: 'uploaded',
      url: '/files/a.png',
    }])
  })

  it('does not restore non-recalled messages or attachments without URLs', () => {
    expect(getRecalledDraft(message({ revoked_at: undefined }))).toBeNull()
    expect(getRecalledDraft(message({ attachments: [{ type: 'file', filename: 'a.txt' }] }))).toBeNull()
  })
})
