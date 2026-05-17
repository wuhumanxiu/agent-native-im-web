import { describe, expect, it } from 'vitest'
import { deriveComposerMentionState, normalizeAssignedMentionIds, parseComposerDraft, serializeComposerDraft, type PendingFile } from './MessageComposerDraft'
import type { Participant } from '@/lib/types'

describe('composer draft helpers', () => {
  it('serializes text, mentions, reply preview, and uploaded attachments', () => {
    const payload = serializeComposerDraft({
      text: '  Investigate this thread  ',
      replyTo: {
        id: 42,
        conversation_id: 7,
        sender_id: 1,
        sender_type: 'user',
        content_type: 'text',
        layers: { summary: 'Original reply target' },
        created_at: '2026-04-06T00:00:00Z',
        sender: {
          id: 1,
          entity_type: 'user',
          name: 'alice',
          display_name: 'Alice',
          status: 'active',
          metadata: {},
          created_at: '',
          updated_at: '',
        },
      },
      mentionIds: [2, 3],
      assignedMentionIds: [2],
      pendingFiles: [
        {
          name: 'brief.md',
          type: 'text/markdown',
          size: 512,
          status: 'uploaded',
          url: 'https://example.test/brief.md',
        } satisfies PendingFile,
        {
          name: 'draft.txt',
          type: 'text/plain',
          size: 10,
          status: 'uploading',
          file: new File(['draft'], 'draft.txt', { type: 'text/plain' }),
        } satisfies PendingFile,
      ],
    })

    expect(payload).not.toBeNull()
    expect(parseComposerDraft(payload)).toEqual({
      text: 'Investigate this thread',
      replyTo: {
        id: 42,
        sender: {
          id: 1,
          entity_type: 'user',
          name: 'alice',
          display_name: 'Alice',
          status: 'active',
          metadata: {},
          created_at: '',
          updated_at: '',
        },
        layers: { summary: 'Original reply target' },
      },
      mentionIds: [2, 3],
      assignedMentionIds: [2],
      attachments: [
        {
          name: 'brief.md',
          type: 'text/markdown',
          size: 512,
          status: 'uploaded',
          url: 'https://example.test/brief.md',
        },
      ],
    })
  })

  it('falls back to plain text when draft payload is legacy raw text', () => {
    expect(parseComposerDraft('legacy raw draft')).toEqual({
      text: 'legacy raw draft',
      replyTo: null,
      mentionIds: [],
      assignedMentionIds: [],
      attachments: [],
    })
  })

  it('does not assign mentions by default when draft payload omits assigned ids', () => {
    const payload = serializeComposerDraft({
      text: '@Alice please review',
      mentionIds: [2],
      pendingFiles: [],
    })

    expect(parseComposerDraft(payload)?.assignedMentionIds).toEqual([])
  })

  it('defaults the first active mention to the follow-up owner', () => {
    expect(normalizeAssignedMentionIds([2], [])).toEqual([2])
    expect(normalizeAssignedMentionIds([2, 3], [])).toEqual([2])
    expect(normalizeAssignedMentionIds([2, 3], [3])).toEqual([3])
  })

  it('prunes mention and assignment state when mention text is removed', () => {
    const participants = [
      {
        id: 1,
        conversation_id: 7,
        entity_id: 2,
        role: 'member',
        subscription_mode: 'mention_only',
        joined_at: '',
        entity: {
          id: 2,
          entity_type: 'user',
          name: 'alice',
          display_name: 'Alice',
          status: 'active',
          metadata: {},
          created_at: '',
          updated_at: '',
        },
      },
      {
        id: 2,
        conversation_id: 7,
        entity_id: 3,
        role: 'member',
        subscription_mode: 'mention_only',
        joined_at: '',
        entity: {
          id: 3,
          entity_type: 'bot',
          name: 'triage-bot',
          display_name: 'Triage Bot',
          status: 'active',
          metadata: {},
          created_at: '',
          updated_at: '',
        },
      },
    ] satisfies Participant[]

    expect(deriveComposerMentionState({
      text: '@Alice please check',
      mentionIds: [2, 3],
      assignedMentionIds: [2, 3],
      participants,
    })).toEqual({
      mentionIds: [2],
      assignedMentionIds: [2],
    })
  })
})
