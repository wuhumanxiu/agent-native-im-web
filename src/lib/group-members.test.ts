import { describe, expect, it } from 'vitest'
import { buildGroupMemberSections } from './group-members'
import type { Participant } from './types'

function participant(id: number, entityType: 'user' | 'bot', ownerID?: number): Participant {
  return {
    id,
    conversation_id: 1,
    entity_id: id,
    role: id === 1 ? 'owner' : 'member',
    subscription_mode: 'mention_only',
    joined_at: '2026-05-15T00:00:00Z',
    entity: {
      id,
      public_id: `public-${id}`,
      entity_type: entityType,
      name: entityType === 'user' ? `user_${id}` : `bot_${id}`,
      display_name: entityType === 'user' ? `User ${id}` : `Bot ${id}`,
      status: 'active',
      metadata: {},
      owner_id: ownerID,
      created_at: '2026-05-15T00:00:00Z',
      updated_at: '2026-05-15T00:00:00Z',
    },
  }
}

describe('buildGroupMemberSections', () => {
  it('nests bots under their owner and keeps external owner bots separate', () => {
    const sections = buildGroupMemberSections([
      participant(1, 'user'),
      participant(2, 'user'),
      participant(3, 'bot', 1),
      participant(4, 'bot', 9),
      participant(5, 'bot'),
    ])

    expect(sections.owners).toHaveLength(2)
    expect(sections.owners[0].owner.entity_id).toBe(1)
    expect(sections.owners[0].bots.map((item) => item.entity_id)).toEqual([3])
    expect(sections.owners[1].owner.entity_id).toBe(2)
    expect(sections.owners[1].bots).toEqual([])
    expect(sections.orphanBots.map((item) => item.entity_id)).toEqual([4, 5])
  })
})
