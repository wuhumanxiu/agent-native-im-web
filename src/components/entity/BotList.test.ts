import { describe, expect, it } from 'vitest'
import { buildBotInteractionTimes, compareBotsForList, compareBotsStable } from './BotList'
import type { Conversation, Entity, PresenceStateValue } from '@/lib/types'

function bot(id: number, displayName: string): Entity {
  return {
    id,
    public_id: `bot-${id}`,
    bot_id: `bot_${id}`,
    entity_type: 'bot',
    name: displayName.toLowerCase(),
    display_name: displayName,
    status: 'active',
    metadata: {},
    created_at: '2026-05-16T00:00:00Z',
    updated_at: '2026-05-16T00:00:00Z',
  }
}

describe('compareBotsStable', () => {
  it('keeps bot list order deterministic regardless of refresh order', () => {
    const refreshed = [
      bot(49, 'Chen Yan'),
      bot(48, 'Wang Lu'),
      bot(47, 'Liu Xiang'),
      bot(13, 'PotatoWire'),
      bot(12, 'Alice'),
      bot(9, 'Huang Yaoshi'),
    ]

    expect(refreshed.sort(compareBotsStable).map((item) => item.id)).toEqual([9, 12, 13, 47, 48, 49])
  })

  it('keeps the deterministic fallback independent of online flags', () => {
    const offline = bot(9, 'Huang Yaoshi')
    const online = { ...bot(12, 'Alice'), online: true }

    expect([online, offline].sort(compareBotsStable).map((item) => item.id)).toEqual([9, 12])
  })
})

describe('buildBotInteractionTimes', () => {
  it('uses the newest conversation activity for each bot participant', () => {
    const conversations: Conversation[] = [
      {
        id: 1,
        conv_type: 'direct',
        title: '',
        description: '',
        prompt: '',
        metadata: {},
        created_at: '2026-05-15T00:00:00Z',
        updated_at: '2026-05-15T01:00:00Z',
        participants: [
          { id: 1, conversation_id: 1, entity_id: 12, role: 'member', subscription_mode: 'subscribe_all', joined_at: '', entity: bot(12, 'Alice') },
        ],
      },
      {
        id: 2,
        conv_type: 'group',
        title: '',
        description: '',
        prompt: '',
        metadata: {},
        created_at: '2026-05-16T00:00:00Z',
        updated_at: '2026-05-16T01:00:00Z',
        last_message: {
          id: 1,
          conversation_id: 2,
          sender_id: 9,
          sender_type: 'bot',
          content_type: 'text',
          layers: {},
          created_at: '2026-05-16T02:00:00Z',
        },
        participants: [
          { id: 2, conversation_id: 2, entity_id: 9, role: 'member', subscription_mode: 'subscribe_all', joined_at: '', entity: bot(9, 'Huang Yaoshi') },
          { id: 3, conversation_id: 2, entity_id: 100, role: 'member', subscription_mode: 'subscribe_all', joined_at: '', entity: { ...bot(100, 'User'), entity_type: 'user' } },
        ],
      },
    ]

    expect(buildBotInteractionTimes(conversations)).toEqual({
      9: new Date('2026-05-16T02:00:00Z').getTime(),
      12: new Date('2026-05-15T01:00:00Z').getTime(),
    })
  })
})

describe('compareBotsForList', () => {
  const getPresenceState = (onlineIds: number[]) => (entityId: number): PresenceStateValue =>
    onlineIds.includes(entityId) ? 'online' : 'offline'

  it('orders online bots before offline bots', () => {
    const offlineRecent = bot(9, 'Huang Yaoshi')
    const onlineOlder = bot(12, 'Alice')

    const sorted = [offlineRecent, onlineOlder].sort((a, b) => compareBotsForList(a, b, {
      interactionTimes: {
        9: new Date('2026-05-16T00:00:00Z').getTime(),
        12: new Date('2026-05-15T00:00:00Z').getTime(),
      },
      getPresenceState: getPresenceState([12]),
    }))

    expect(sorted.map((item) => item.id)).toEqual([12, 9])
  })

  it('orders bots with the same presence by last interaction time', () => {
    const older = bot(9, 'Huang Yaoshi')
    const newer = bot(12, 'Alice')

    const sorted = [older, newer].sort((a, b) => compareBotsForList(a, b, {
      interactionTimes: {
        9: new Date('2026-05-15T00:00:00Z').getTime(),
        12: new Date('2026-05-16T00:00:00Z').getTime(),
      },
      getPresenceState: getPresenceState([]),
    }))

    expect(sorted.map((item) => item.id)).toEqual([12, 9])
  })
})
