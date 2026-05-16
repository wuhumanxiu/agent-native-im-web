import type { Participant } from '@/lib/types'

export interface GroupMemberOwnerRow {
  owner: Participant
  bots: Participant[]
}

export interface GroupMemberSections {
  owners: GroupMemberOwnerRow[]
  orphanBots: Participant[]
}

export function buildGroupMemberSections(participants: Participant[]): GroupMemberSections {
  const humans = participants.filter((participant) => participant.entity?.entity_type === 'user')
  const bots = participants.filter((participant) => participant.entity && participant.entity.entity_type !== 'user')
  const humanEntityIds = new Set(humans.map((participant) => participant.entity_id))

  return {
    owners: humans.map((owner) => ({
      owner,
      bots: bots.filter((bot) => bot.entity?.owner_id === owner.entity_id),
    })),
    orphanBots: bots.filter((bot) => {
      const ownerID = bot.entity?.owner_id
      return !ownerID || !humanEntityIds.has(ownerID)
    }),
  }
}
