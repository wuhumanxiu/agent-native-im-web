import { describe, expect, it } from 'vitest'
import { compareBotsStable } from './BotList'
import type { Entity } from '@/lib/types'

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

  it('does not let online flags influence ordering', () => {
    const offline = bot(9, 'Huang Yaoshi')
    const online = { ...bot(12, 'Alice'), online: true }

    expect([online, offline].sort(compareBotsStable).map((item) => item.id)).toEqual([9, 12])
  })
})
