import * as api from '@/lib/api'
import { getCachedEntities } from '@/lib/cache'
import type { Entity, Participant } from '@/lib/types'

export async function loadAddableGroupMembers(token: string, myEntityId: number, participants: Participant[]): Promise<Entity[]> {
  const existing = new Set(participants.map((participant) => participant.entity_id))
  const addable = new Map<number, Entity>()
  const addCandidate = (entity: Entity) => {
    if (entity.id === myEntityId || existing.has(entity.id)) return
    addable.set(entity.id, entity)
  }

  try {
    const [entitiesRes, friendsRes] = await Promise.all([api.listEntities(token), api.listFriends(token)])
    if (friendsRes.ok && friendsRes.data) {
      friendsRes.data.forEach(addCandidate)
    }
    if (entitiesRes.ok && entitiesRes.data) {
      entitiesRes.data
        .filter((entity) => entity.entity_type !== 'user')
        .forEach(addCandidate)
    }
  } catch {
    const cached = await getCachedEntities()
    cached
      .filter((entity) => entity.entity_type !== 'user')
      .forEach(addCandidate)
  }

  return Array.from(addable.values())
}
