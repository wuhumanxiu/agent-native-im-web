import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, ChevronLeft, ChevronRight, Upload, Loader2, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { cn, previewAvatarUrl } from '@/lib/utils'
import { reportError } from '@/lib/errors'

// Lightweight emoji presets are kept for user avatars; bot flows use system PNG assets.
const PRESET_AVATARS = [
  '🤖', '🧠', '⚡', '🔮', '🎯', '🛡️', '📊', '💬',
  '🔧', '📋', '🎨', '🔍', '📝', '🚀', '💡', '🌐',
]

const SYSTEM_BOT_AVATARS = Array.from({ length: 32 }, (_, index) => {
  const id = String(index + 1).padStart(2, '0')
  return `/bot-avatars/ani-bot-${id}.png`
})

const SYSTEM_BOT_AVATARS_PER_PAGE = 12

interface Props {
  currentUrl?: string
  onSelect: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
  presetMode?: 'emoji' | 'bot'
}

function generatePresetSvg(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="50" fill="%23374151"/>
    <text x="50" y="58" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function AvatarPicker({ currentUrl, onSelect, size = 'md', presetMode = 'emoji' }: Props) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)!
  const displayUrl = previewAvatarUrl(currentUrl)
  const [uploading, setUploading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [systemAvatarPage, setSystemAvatarPage] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const systemAvatarPageCount = Math.ceil(SYSTEM_BOT_AVATARS.length / SYSTEM_BOT_AVATARS_PER_PAGE)
  const visibleSystemBotAvatars = SYSTEM_BOT_AVATARS.slice(
    systemAvatarPage * SYSTEM_BOT_AVATARS_PER_PAGE,
    (systemAvatarPage + 1) * SYSTEM_BOT_AVATARS_PER_PAGE,
  )

  // Handle click outside
  useEffect(() => {
    if (!showPicker) return

    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showPicker])

  useEffect(() => {
    if (!showPicker || presetMode !== 'bot' || !currentUrl) return

    const selectedIndex = SYSTEM_BOT_AVATARS.indexOf(currentUrl)
    if (selectedIndex >= 0) {
      setSystemAvatarPage(Math.floor(selectedIndex / SYSTEM_BOT_AVATARS_PER_PAGE))
    }
  }, [currentUrl, presetMode, showPicker])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size with error reporting
    if (!file.type.startsWith('image/')) {
      reportError({ message: t('error.invalidImageType') || 'Please select a valid image file' })
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB max
      reportError({ message: t('error.fileTooLarge') || 'File size must be less than 5MB' })
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const res = await api.uploadFile(token, file)
      if (res.ok && res.data?.url) {
        onSelect(res.data.url)
        setShowPicker(false)
      } else {
        reportError({ message: t('error.uploadFailed') || 'Failed to upload image' })
      }
    } catch {
      reportError({ message: t('error.uploadFailed') || 'Failed to upload image' })
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePresetSelect = (emoji: string) => {
    const url = generatePresetSvg(emoji)
    onSelect(url)
    setShowPicker(false)
  }

  const handleSystemAvatarSelect = (url: string) => {
    onSelect(url)
    setShowPicker(false)
  }

  const sizeClasses = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-14 h-14'
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={cn(
          sizeClasses,
          'rounded-full border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent)] flex items-center justify-center cursor-pointer transition-colors overflow-hidden group',
        )}
      >
        {displayUrl ? (
          <>
            <img src={displayUrl} alt="" className="w-full h-full rounded-full object-cover" />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className={cn(iconSize, 'text-white')} />
            </div>
          </>
        ) : (
          <Camera className={cn(iconSize, 'text-[var(--color-text-muted)]')} />
        )}
      </button>

      {showPicker && (
        <div className={cn(
          'absolute top-full left-0 mt-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden',
          presetMode === 'bot' ? 'w-64' : 'w-56',
        )}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase">{t('bot.avatar')}</span>
            <button onClick={() => setShowPicker(false)} className="cursor-pointer">
              <X className="w-3 h-3 text-[var(--color-text-muted)]" />
            </button>
          </div>

          {/* Upload button */}
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full py-1.5 rounded-lg bg-[var(--color-bg-input)] border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[11px] text-[var(--color-text-secondary)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {t('bot.uploadAvatar')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {presetMode === 'bot' ? (
            <div className="px-3 py-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {t('bot.systemAvatars')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSystemAvatarPage((page) => Math.max(0, page - 1))}
                    disabled={systemAvatarPage === 0}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Previous system avatars"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-[10px] tabular-nums text-[var(--color-text-muted)]">
                    {systemAvatarPage + 1}/{systemAvatarPageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSystemAvatarPage((page) => Math.min(systemAvatarPageCount - 1, page + 1))}
                    disabled={systemAvatarPage === systemAvatarPageCount - 1}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Next system avatars"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {visibleSystemBotAvatars.map((url, index) => {
                  const avatarNumber = systemAvatarPage * SYSTEM_BOT_AVATARS_PER_PAGE + index + 1
                  const selected = currentUrl === url
                  return (
                    <button
                      key={url}
                      onClick={() => handleSystemAvatarSelect(url)}
                      className={cn(
                        'aspect-square rounded-xl border bg-[var(--color-bg-input)] p-1 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-sm',
                        selected ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20' : 'border-[var(--color-border)]',
                      )}
                      title={`${t('bot.systemAvatar')} ${avatarNumber}`}
                    >
                      <img src={url} alt="" className="h-full w-full rounded-lg object-cover" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="px-3 py-2">
              <div className="grid grid-cols-8 gap-1">
                {PRESET_AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handlePresetSelect(emoji)}
                    className="w-6 h-6 rounded-md hover:bg-[var(--color-bg-hover)] flex items-center justify-center text-sm cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
