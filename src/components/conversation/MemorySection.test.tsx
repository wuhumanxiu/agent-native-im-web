import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemorySection } from './MemorySection'
import { useAuthStore } from '@/store/auth'
import { useMessagesStore } from '@/store/messages'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('lucide-react', () => {
  const Icon = () => null
  return {
    Plus: Icon,
    Trash2: Icon,
    Loader2: Icon,
    BarChart3: Icon,
    Eraser: Icon,
  }
})

const listMemories = vi.fn()

vi.mock('@/lib/api', () => ({
  listMemories: (...args: unknown[]) => listMemories(...args),
  upsertMemory: vi.fn(),
  deleteMemory: vi.fn(),
}))

describe('MemorySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: 'test-token',
      entity: {
        id: 1,
        entity_type: 'user',
        name: 'chris',
        status: 'active',
        metadata: {},
        created_at: '',
        updated_at: '',
      } as any,
      sessionChecked: true,
    })
    useMessagesStore.setState({
      byConv: {},
      hasMore: {},
      streams: {},
      optimistic: {},
      progress: {},
      latestMessageId: 0,
    })
    listMemories.mockResolvedValue({
      ok: true,
      data: { memories: [] },
    })
  })

  it('renders when the conversation has no cached messages yet', async () => {
    render(<MemorySection conversationId={12345} canManage />)

    await waitFor(() => {
      expect(listMemories).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByText('memory.memories (0)')).toBeInTheDocument()
  })
})
