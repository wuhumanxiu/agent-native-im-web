import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { LoginForm } from '@/components/auth/LoginForm'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { ForgotPasswordPage } from '@/components/auth/ForgotPasswordPage'
import { TermsPage } from '@/components/legal/TermsPage'
import { PrivacyPage } from '@/components/legal/PrivacyPage'
import { ConsentBanner } from '@/components/ui/ConsentBanner'
import * as api from '@/lib/api'
import { getErrorMessage } from '@/lib/errors'
import { useTranslation } from 'react-i18next'
import type { Entity } from '@/lib/types'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)

  const [loginError, setLoginError] = useState('')
  const [authPage, setAuthPage] = useState<'login' | 'register' | 'forgot' | 'terms' | 'privacy'>('login')
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)

  useEffect(() => {
    const onOnline = () => setIsOffline(false)
    const onOffline = () => setIsOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // If already logged in, redirect
  if (token && entity) {
    navigate('/chat', { replace: true })
    return null
  }

  const handleLogin = async (username: string, password: string) => {
    setLoginError('')
    try {
      const res = await api.login(username, password)
      if (res.ok && res.data) {
        setAuth(res.data.token, res.data.entity)
        navigate('/chat', { replace: true })
      } else {
        setLoginError(getErrorMessage(res) || t('auth.loginError'))
      }
    } catch {
      setLoginError(t('auth.networkError'))
    }
  }

  const handleWechatLogin = async () => {
    setLoginError('')
    try {
      const res = await api.getOnePassConfig()
      if (!res.ok || !res.data?.enabled || !res.data.site_id || !res.data.start_url) {
        setLoginError(t('auth.wechatUnavailable'))
        return
      }
      const stateBytes = new Uint8Array(16)
      crypto.getRandomValues(stateBytes)
      const state2 = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
      sessionStorage.setItem('aim_1pass_state2', state2)
      const target = new URL(res.data.start_url)
      target.searchParams.set('site_id', res.data.site_id)
      target.searchParams.set('state2', state2)
      window.location.href = target.toString()
    } catch {
      setLoginError(t('auth.networkError'))
    }
  }

  const handleRegister = (regToken: string, regEntity: Entity) => {
    setAuth(regToken, regEntity)
    navigate('/chat', { replace: true })
  }

  if (authPage === 'terms') return <TermsPage onBack={() => setAuthPage('login')} />
  if (authPage === 'privacy') return <PrivacyPage onBack={() => setAuthPage('login')} />
  if (authPage === 'forgot') return <ForgotPasswordPage onBack={() => setAuthPage('login')} />
  if (authPage === 'register') {
    return <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setAuthPage('login')} />
  }

  return (
    <>
      <LoginForm
        onLogin={handleLogin}
        error={loginError}
        offlineHint={isOffline ? t('auth.offlineFirstLoginHint') : undefined}
        onWechatLogin={handleWechatLogin}
        onSwitchToRegister={() => setAuthPage('register')}
        onForgotPassword={() => setAuthPage('forgot')}
        onTerms={() => setAuthPage('terms')}
        onPrivacy={() => setAuthPage('privacy')}
      />
      <ConsentBanner onPrivacy={() => setAuthPage('privacy')} />
    </>
  )
}
