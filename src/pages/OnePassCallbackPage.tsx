import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/auth'
import * as api from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'

export function OnePassCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function completeLogin() {
      const params = new URLSearchParams(window.location.search)
      const ticket = params.get('ticket')
      const state2 = params.get('state2')
      const savedState2 = sessionStorage.getItem('aim_1pass_state2')
      sessionStorage.removeItem('aim_1pass_state2')

      if (!ticket) {
        setError(t('auth.wechatMissingTicket'))
        return
      }
      if (!state2 || !savedState2 || state2 !== savedState2) {
        setError(t('auth.wechatStateMismatch'))
        return
      }

      try {
        const res = await api.loginWithOnePass(ticket, state2)
        if (cancelled) return
        if (res.ok && res.data) {
          setAuth(res.data.token, res.data.entity)
          navigate('/chat', { replace: true })
          return
        }
        setError(getErrorMessage(res) || t('auth.wechatLoginError'))
      } catch {
        if (!cancelled) setError(t('auth.networkError'))
      }
    }

    void completeLogin()
    return () => {
      cancelled = true
    }
  }, [navigate, setAuth, t])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="w-full max-w-sm text-center">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t('auth.wechatLoginError')}</h1>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 h-10 px-4 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {t('auth.backToLogin')}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
            <p className="text-sm">{t('auth.wechatCompleting')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
