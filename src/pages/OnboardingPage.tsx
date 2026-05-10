import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Copy,
  Globe2,
  KeyRound,
  LogIn,
  MessageSquarePlus,
  Network,
  PlugZap,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import i18n from '@/i18n'
import { useAuthStore } from '@/store/auth'

type Step = {
  icon: typeof LogIn
  titleKey: string
  bodyKey: string
  detailKey: string
}

const steps: Step[] = [
  { icon: LogIn, titleKey: 'onboarding.fullStepRegisterTitle', bodyKey: 'onboarding.fullStepRegisterBody', detailKey: 'onboarding.fullStepRegisterDetail' },
  { icon: Bot, titleKey: 'onboarding.fullStepCreateBotTitle', bodyKey: 'onboarding.fullStepCreateBotBody', detailKey: 'onboarding.fullStepCreateBotDetail' },
  { icon: KeyRound, titleKey: 'onboarding.fullStepBindTitle', bodyKey: 'onboarding.fullStepBindBody', detailKey: 'onboarding.fullStepBindDetail' },
  { icon: MessageSquarePlus, titleKey: 'onboarding.fullStepChatTitle', bodyKey: 'onboarding.fullStepChatBody', detailKey: 'onboarding.fullStepChatDetail' },
]

const practices = [
  { icon: UsersRound, key: 'onboarding.practiceMention' },
  { icon: ShieldCheck, key: 'onboarding.practicePermissions' },
  { icon: Copy, key: 'onboarding.practiceCopy' },
]

export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)
  const isAuthed = Boolean(token && entity)

  const switchLanguage = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN'
    localStorage.setItem('aim_locale_raw', next)
    void i18n.changeLanguage(next)
  }

  return (
    <main className="h-full overflow-y-auto overscroll-contain bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <section className="relative isolate min-h-screen overflow-hidden px-4 py-5 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute left-[-12%] top-[-16%] h-96 w-96 rounded-full bg-[var(--color-accent)]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-18%] right-[-12%] h-[32rem] w-[32rem] rounded-full bg-[var(--color-bot)]/12 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(var(--color-text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-text-primary) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col">
          <header className="flex items-center justify-between gap-3">
            <Link to={isAuthed ? '/chat' : '/login'} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-[-0.02em]">Agent-Native IM</span>
                <span className="block text-[11px] text-[var(--color-text-muted)]">{t('onboarding.pageNavSubtitle')}</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={switchLanguage}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)]"
              >
                <Globe2 className="h-4 w-4" />
                {i18n.language === 'zh-CN' ? 'EN' : '中文'}
              </button>
              <Link
                to={isAuthed ? '/chat' : '/login'}
                className="hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] sm:inline-flex"
              >
                {isAuthed ? t('onboarding.backToApp') : t('auth.signIn')}
              </Link>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:py-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent-dim)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
                <Network className="h-3.5 w-3.5" />
                {t('onboarding.fullEyebrow')}
              </div>
              <h1 className="max-w-3xl text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--color-text-primary)] sm:text-[4.5rem] lg:text-[5.25rem]">
                {t('onboarding.fullTitle')}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-text-secondary)] sm:text-lg">
                {t('onboarding.fullDescription')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate(isAuthed ? '/bots' : '/register')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
                >
                  {isAuthed ? t('onboarding.goCreateBot') : t('onboarding.startRegister')}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate(isAuthed ? '/chat' : '/login')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] transition-all hover:-translate-y-0.5 hover:bg-[var(--color-bg-hover)]"
                >
                  {isAuthed ? t('onboarding.goFirstChat') : t('auth.signIn')}
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-[var(--color-accent)]/8 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl shadow-black/10">
                <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/70 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">{t('onboarding.flowLabel')}</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{t('onboarding.flowTitle')}</h2>
                </div>
                <div className="divide-y divide-[var(--color-border-subtle)]">
                  {steps.map((step, index) => {
                    const Icon = step.icon
                    return (
                      <div key={step.titleKey} className="group grid gap-4 p-5 transition-colors hover:bg-[var(--color-bg-hover)]/55 sm:grid-cols-[3rem_1fr]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--color-text-muted)]">0{index + 1}</span>
                            <h3 className="text-base font-semibold tracking-[-0.02em]">{t(step.titleKey)}</h3>
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-[var(--color-text-secondary)]">{t(step.bodyKey)}</p>
                          <p className="mt-2 rounded-2xl bg-[var(--color-bg-tertiary)] px-3 py-2 text-xs leading-5 text-[var(--color-text-muted)]">{t(step.detailKey)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-4 pb-8 lg:grid-cols-[1fr_1fr_1fr]">
            {practices.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.key} className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 p-5">
                  <Icon className="h-5 w-5 text-[var(--color-accent)]" />
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{t(item.key)}</p>
                </div>
              )
            })}
          </section>

          <section className="mb-8 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                  {t('onboarding.doneTitle')}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                  {t('onboarding.doneBody')}
                </p>
              </div>
              <Link
                to={isAuthed ? '/chat' : '/register'}
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                {isAuthed ? t('onboarding.goFirstChat') : t('onboarding.startRegister')}
                <PlugZap className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
