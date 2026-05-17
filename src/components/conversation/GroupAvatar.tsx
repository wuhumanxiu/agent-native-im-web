import { useMemo, useState } from 'react'
import type { Participant, Entity } from '@/lib/types'
import { entityColor, entityDisplayName, getInitials, publicAvatarUrl } from '@/lib/utils'

interface Props {
  participants?: Participant[]
  size?: 'sm' | 'md'
  className?: string
}

const sizeClass = {
  sm: 'w-9 h-9 text-[9px]',
  md: 'w-10 h-10 text-[10px]',
}

function gridColumns(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 2
  return 3
}

function participantKey(participant: Participant, index: number): string {
  return String(participant.entity?.public_id || participant.entity_id || participant.id || index)
}

export function GroupAvatar({ participants = [], size = 'md', className }: Props) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set())
  const members = useMemo(() => participants.slice(0, 9), [participants])
  const cols = gridColumns(members.length)
  const gapPx = cols === 1 ? 0 : 1
  const tileSize = `calc((100% - ${(cols - 1) * gapPx}px) / ${cols})`

  return (
    <div
      className={`${sizeClass[size]} ${className || ''} flex-shrink-0 overflow-hidden rounded-full border border-[var(--color-border)] bg-transparent p-[2px]`}
      aria-hidden="true"
    >
      <div
        className="flex h-full w-full flex-wrap items-center justify-center"
        style={{ gap: gapPx }}
      >
        {members.length > 0 ? members.map((participant, index) => {
          const entity = participant.entity
          const avatarUrl = publicAvatarUrl(entity?.avatar_url)
          const imageFailed = !!avatarUrl && failedUrls.has(avatarUrl)
          return (
            <GroupAvatarTile
              key={participantKey(participant, index)}
              entity={entity}
              avatarUrl={imageFailed ? '' : avatarUrl}
              size={tileSize}
              onImageError={() => {
                if (!avatarUrl) return
                setFailedUrls((prev) => new Set(prev).add(avatarUrl))
              }}
            />
          )
        }) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
          >
            #
          </div>
        )}
      </div>
    </div>
  )
}

function GroupAvatarTile({
  entity,
  avatarUrl,
  size,
  onImageError,
}: {
  entity?: Entity
  avatarUrl: string
  size: string
  onImageError: () => void
}) {
  const name = entityDisplayName(entity)
  const color = entityColor(entity)

  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-[35%] font-semibold leading-none"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}22`,
        color,
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={onImageError}
        />
      ) : (
        <span>{getInitials(name || '?')}</span>
      )}
    </div>
  )
}
