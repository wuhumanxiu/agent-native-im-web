import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageList } from './MessageList'
import type { Message } from '@/lib/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('./MessageBubble', () => ({
  MessageBubble: ({ message }: { message: Message }) => <div data-testid={`message-${message.id}`}>{message.layers.summary}</div>,
}))

const makeMsg = (id: number, conversationId = 100): Message => ({
  id,
  conversation_id: conversationId,
  sender_id: 10,
  content_type: 'text',
  layers: { summary: `message ${id}` },
  created_at: `2026-05-08T00:00:${String(id).padStart(2, '0')}Z`,
})

describe('MessageList scrolling', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    scrollIntoView = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
  })

  it('scrolls when the latest message id changes without a length change', async () => {
    const { rerender } = render(
      <MessageList conversationId={100} messages={[makeMsg(1)]} myEntityId={1} loading={false} />,
    )

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    scrollIntoView.mockClear()

    rerender(<MessageList conversationId={100} messages={[makeMsg(2)]} myEntityId={1} loading={false} />)

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  })

  it('scrolls to the bottom when switching conversations', async () => {
    const { rerender } = render(
      <MessageList conversationId={100} messages={[makeMsg(1, 100)]} myEntityId={1} loading={false} />,
    )

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    scrollIntoView.mockClear()

    rerender(<MessageList conversationId={200} messages={[makeMsg(5, 200)]} myEntityId={1} loading={false} />)

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
  })
})
