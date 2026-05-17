import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MessageBubble } from './MessageBubble'
import type { Entity, Message } from '@/lib/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values?.name || key }),
}))

const sender: Entity = {
  id: 10,
  entity_type: 'user',
  name: 'alice',
  display_name: 'Alice',
  status: 'active',
  metadata: {},
  created_at: '2026-05-17T00:00:00Z',
  updated_at: '2026-05-17T00:00:00Z',
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  const body = overrides.layers?.data?.body || overrides.layers?.summary || 'hello'
  return {
    id: 1,
    conversation_id: 100,
    sender_id: sender.id,
    sender_type: 'user',
    sender,
    content_type: 'text',
    layers: { summary: String(body), data: { body } },
    created_at: '2026-05-17T00:00:00Z',
    ...overrides,
  }
}

describe('MessageBubble plain text links', () => {
  it('renders URLs inside normal plain text as clickable links', () => {
    render(
      <MessageBubble
        message={makeMessage({ layers: { summary: 'read https://example.com/docs.', data: { body: 'read https://example.com/docs.' } } })}
        isSelf={false}
        showSender={false}
      />,
    )

    const link = screen.getByRole('link', { name: 'https://example.com/docs' })
    expect(link).toHaveAttribute('href', 'https://example.com/docs')
    expect(link).toHaveAttribute('target', '_blank')
    expect(document.body).toHaveTextContent('read https://example.com/docs.')
  })

  it('renders a standalone shared URL as a link preview card', () => {
    render(
      <MessageBubble
        message={makeMessage({ layers: { summary: 'www.example.com/share', data: { body: 'www.example.com/share' } } })}
        isSelf
        showSender={false}
      />,
    )

    const link = screen.getByRole('link', { name: /example.com/i })
    expect(link).toHaveAttribute('href', 'https://www.example.com/share')
    expect(screen.getByText('example.com')).toBeInTheDocument()
  })
})
