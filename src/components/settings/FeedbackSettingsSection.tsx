import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'
import * as api from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Attachment, FeedbackDetailResponse, FeedbackItem, FeedbackLevel, FeedbackStatus, FeedbackType } from '@/lib/types'

const feedbackTypes: FeedbackType[] = ['bug', 'feature', 'question', 'account', 'other']
const feedbackLevels: FeedbackLevel[] = ['low', 'normal', 'high', 'urgent']
const feedbackStatuses: FeedbackStatus[] = ['open', 'triaged', 'planned', 'in_progress', 'resolved', 'closed']

interface FeedbackSettingsSectionProps {
  token: string
  isMobile: boolean
}

interface FeedbackFormState {
  type: FeedbackType
  severity: FeedbackLevel
  title: string
  description: string
  contact: string
}

const initialForm: FeedbackFormState = {
  type: 'bug',
  severity: 'normal',
  title: '',
  description: '',
  contact: '',
}

function formatFeedbackTime(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function attachmentFromUpload(file: File, upload: { url: string; filename?: string; mime_type?: string; size?: number }): Attachment {
  const mimeType = upload.mime_type || file.type
  return {
    type: mimeType.startsWith('image/') ? 'image' : 'file',
    url: upload.url,
    filename: upload.filename || file.name,
    mime_type: mimeType,
    size: upload.size ?? file.size,
  }
}

function statusTone(status: FeedbackStatus) {
  if (status === 'resolved' || status === 'closed') return 'text-[var(--color-success)] bg-[var(--color-success)]/10'
  if (status === 'in_progress' || status === 'planned') return 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
  if (status === 'triaged') return 'text-amber-600 bg-amber-500/10'
  return 'text-[var(--color-text-muted)] bg-[var(--color-bg-hover)]'
}

export function FeedbackSettingsSection({ token, isMobile }: FeedbackSettingsSectionProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FeedbackFormState>(initialForm)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [detail, setDetail] = useState<FeedbackDetailResponse | null>(null)
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<FeedbackType | ''>('')
  const [searchDraft, setSearchDraft] = useState('')
  const [query, setQuery] = useState('')
  const [comment, setComment] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)

  const loadFeedback = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await api.listFeedback(token, {
      status: statusFilter,
      type: typeFilter,
      q: query,
      limit: 80,
    })
    if (res.ok && res.data) {
      setItems(res.data.items || [])
      setAdmin(res.data.admin)
      if (detail && !res.data.items.some((item) => item.id === detail.item.id)) {
        setDetail(null)
      }
    } else {
      setError(getErrorMessage(res) || t('settings.feedbackLoadError'))
    }
    setLoading(false)
  }, [detail, query, statusFilter, t, token, typeFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFeedback()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadFeedback])

  const openFeedback = async (item: FeedbackItem) => {
    setError('')
    const res = await api.getFeedback(token, item.id)
    if (res.ok && res.data) {
      setDetail(res.data)
      setComment('')
      setCommentInternal(false)
    } else {
      setError(getErrorMessage(res) || t('settings.feedbackLoadError'))
    }
  }

  const submitFeedback = async () => {
    setError('')
    setSuccess('')
    if (!form.title.trim() || !form.description.trim()) {
      setError(t('settings.feedbackRequired'))
      return
    }
    setSubmitting(true)
    const res = await api.createFeedback(token, {
      type: form.type,
      severity: form.severity,
      title: form.title.trim(),
      description: form.description.trim(),
      contact: form.contact.trim(),
      attachments,
    })
    setSubmitting(false)
    if (res.ok && res.data) {
      setForm(initialForm)
      setAttachments([])
      setSuccess(t('settings.feedbackSubmitted'))
      await loadFeedback()
      await openFeedback(res.data)
      window.setTimeout(() => setSuccess(''), 2400)
    } else {
      setError(getErrorMessage(res) || t('settings.feedbackSubmitError'))
    }
  }

  const uploadAttachment = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setError('')
    const res = await api.uploadFile(token, file)
    setUploading(false)
    if (res.ok && res.data?.url) {
      setAttachments((prev) => [...prev, attachmentFromUpload(file, res.data!)])
    } else {
      setError(getErrorMessage(res) || t('settings.feedbackUploadError'))
    }
  }

  const updateFeedback = async (patch: Partial<Pick<FeedbackItem, 'status' | 'priority' | 'severity' | 'type'>>) => {
    if (!detail) return
    setError('')
    const res = await api.updateFeedbackAdmin(token, detail.item.id, patch)
    if (res.ok && res.data) {
      setDetail((prev) => prev ? { ...prev, item: res.data! } : prev)
      setItems((prev) => prev.map((item) => item.id === res.data!.id ? res.data! : item))
    } else {
      setError(getErrorMessage(res) || t('settings.feedbackUpdateError'))
    }
  }

  const submitComment = async () => {
    if (!detail || !comment.trim()) return
    setError('')
    const res = await api.createFeedbackComment(token, detail.item.id, {
      body: comment.trim(),
      visibility: admin && commentInternal ? 'internal' : 'public',
    })
    if (res.ok && res.data) {
      setDetail((prev) => prev ? { ...prev, comments: res.data!.comments || [] } : prev)
      setComment('')
      setCommentInternal(false)
      await loadFeedback()
    } else {
      setError(getErrorMessage(res) || t('settings.feedbackCommentError'))
    }
  }

  const renderAttachment = (attachment: Attachment, index: number) => (
    <a
      key={`${attachment.url || attachment.filename}-${index}`}
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40"
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{attachment.filename || attachment.url}</span>
    </a>
  )

  const listPanel = (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{admin ? t('settings.feedbackAll') : t('settings.feedbackMine')}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">{t('settings.feedbackCount', { count: items.length })}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadFeedback()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          {t('common.reload')}
        </button>
      </div>
      <div className="space-y-2 border-b border-[var(--color-border)] p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setQuery(searchDraft.trim())
              }}
              placeholder={t('settings.feedbackSearch')}
              className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] pl-9 pr-3 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
            />
          </div>
          <button
            type="button"
            onClick={() => setQuery(searchDraft.trim())}
            className="h-9 rounded-xl bg-[var(--color-accent)] px-3 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)]"
          >
            {t('settings.feedbackFilter')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | '')}
            className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-xs text-[var(--color-text-primary)] outline-none"
          >
            <option value="">{t('settings.feedbackAnyStatus')}</option>
            {feedbackStatuses.map((status) => <option key={status} value={status}>{t(`settings.feedbackStatus.${status}`)}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as FeedbackType | '')}
            className="h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-xs text-[var(--color-text-primary)] outline-none"
          >
            <option value="">{t('settings.feedbackAnyType')}</option>
            {feedbackTypes.map((type) => <option key={type} value={type}>{t(`settings.feedbackType.${type}`)}</option>)}
          </select>
        </div>
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5 text-xs text-[var(--color-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('common.loading')}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">{t('settings.feedbackEmpty')}</div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openFeedback(item)}
              className={cn(
                'flex w-full gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--color-bg-hover)]',
                detail?.item.id === item.id && 'bg-[var(--color-accent)]/5',
              )}
            >
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
                <MessageSquarePlus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{item.title}</p>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusTone(item.status))}>
                    {t(`settings.feedbackStatus.${item.status}`)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--color-text-muted)]">{item.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-[var(--color-text-muted)]">
                  <span>{t(`settings.feedbackType.${item.type}`)} · {t(`settings.feedbackLevel.${item.severity}`)}</span>
                  <span>{formatFeedbackTime(item.updated_at)}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )

  const detailPanel = (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      {!detail ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <ShieldCheck className="mb-3 h-9 w-9 text-[var(--color-accent)]/70" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.feedbackSelectTitle')}</p>
          <p className="mt-1 max-w-sm text-xs text-[var(--color-text-muted)]">{t('settings.feedbackSelectDesc')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', statusTone(detail.item.status))}>
                {t(`settings.feedbackStatus.${detail.item.status}`)}
              </span>
              <span className="rounded-full bg-[var(--color-bg-hover)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]">
                #{detail.item.public_id.slice(0, 8)}
              </span>
              {admin && detail.item.submitter ? (
                <span className="rounded-full bg-[var(--color-accent)]/10 px-2.5 py-1 text-[11px] text-[var(--color-accent)]">
                  {detail.item.submitter.display_name || detail.item.submitter.name}
                </span>
              ) : null}
            </div>
            <h4 className="text-base font-semibold text-[var(--color-text-primary)]">{detail.item.title}</h4>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{detail.item.description}</p>
            {(detail.item.attachments || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">{detail.item.attachments!.map(renderAttachment)}</div>
            ) : null}
          </div>

          {admin ? (
            <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] p-3 sm:grid-cols-3">
              <select
                value={detail.item.status}
                onChange={(event) => void updateFeedback({ status: event.target.value as FeedbackStatus })}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {feedbackStatuses.map((status) => <option key={status} value={status}>{t(`settings.feedbackStatus.${status}`)}</option>)}
              </select>
              <select
                value={detail.item.priority}
                onChange={(event) => void updateFeedback({ priority: event.target.value as FeedbackLevel })}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {feedbackLevels.map((level) => <option key={level} value={level}>{t(`settings.feedbackLevel.${level}`)}</option>)}
              </select>
              <select
                value={detail.item.type}
                onChange={(event) => void updateFeedback({ type: event.target.value as FeedbackType })}
                className="h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {feedbackTypes.map((type) => <option key={type} value={type}>{t(`settings.feedbackType.${type}`)}</option>)}
              </select>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{t('settings.feedbackComments')}</p>
            {detail.comments.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)]">{t('settings.feedbackNoComments')}</p>
            ) : (
              detail.comments.map((item) => (
                <div key={item.id} className="rounded-xl bg-[var(--color-bg-input)] px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                      {item.author?.display_name || item.author?.name || t('settings.feedbackSupport')}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {item.visibility === 'internal' ? t('settings.feedbackInternal') : formatFeedbackTime(item.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--color-text-secondary)]">{item.body}</p>
                </div>
              ))
            )}
            <div className="space-y-2">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={t('settings.feedbackCommentPlaceholder')}
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
              />
              <div className="flex items-center justify-between gap-2">
                {admin ? (
                  <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={commentInternal}
                      onChange={(event) => setCommentInternal(event.target.checked)}
                      className="accent-[var(--color-accent)]"
                    />
                    {t('settings.feedbackInternalNote')}
                  </label>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => void submitComment()}
                  disabled={!comment.trim()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  {t('settings.feedbackSendComment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      {!isMobile && <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{t('settings.feedback')}</h3>}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
            <MessageSquarePlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('settings.feedbackTitle')}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{t('settings.feedbackDesc')}</p>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]">{error}</p> : null}
      {success ? <p className="rounded-xl bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]">{success}</p> : null}

      <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-[minmax(320px,0.85fr)_minmax(380px,1.15fr)]')}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t('settings.feedbackNew')}</p>
              <span className="text-[10px] text-[var(--color-text-muted)]">{t('settings.feedbackNewHint')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as FeedbackType }))}
                className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {feedbackTypes.map((type) => <option key={type} value={type}>{t(`settings.feedbackType.${type}`)}</option>)}
              </select>
              <select
                value={form.severity}
                onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value as FeedbackLevel }))}
                className="h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-xs text-[var(--color-text-primary)] outline-none"
              >
                {feedbackLevels.map((level) => <option key={level} value={level}>{t(`settings.feedbackLevel.${level}`)}</option>)}
              </select>
            </div>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={t('settings.feedbackTitlePlaceholder')}
              className="mt-3 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t('settings.feedbackDescPlaceholder')}
              rows={5}
              className="mt-3 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 py-2 text-sm leading-6 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
            />
            <input
              value={form.contact}
              onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
              placeholder={t('settings.feedbackContactPlaceholder')}
              className="mt-3 h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] px-3 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50"
            />
            {attachments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <span key={`${attachment.url}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[var(--color-bg-hover)] px-2.5 py-1.5 text-[11px] text-[var(--color-text-secondary)]">
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{attachment.filename}</span>
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                {t('settings.feedbackAttach')}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    void uploadAttachment(file)
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => void submitFeedback()}
                disabled={submitting || !form.title.trim() || !form.description.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-semibold text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t('settings.feedbackSubmit')}
              </button>
            </div>
          </div>

          {listPanel}
        </div>
        {detailPanel}
      </div>
    </div>
  )
}
