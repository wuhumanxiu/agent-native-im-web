import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Github,
  Globe2,
  Inbox,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  MessageSquarePlus,
  Network,
  PlugZap,
  RadioTower,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import i18n from '@/i18n'
import { useAuthStore } from '@/store/auth'

type Feature = {
  icon: typeof Bot
  titleKey: string
  bodyKey: string
}

const ecosystem = ['OpenClaw', 'Zebra', 'Hermes', 'Python SDK', 'JavaScript SDK']

const proofSections: Feature[] = [
  { icon: Bot, titleKey: 'landing.identityTitle', bodyKey: 'landing.identityBody' },
  { icon: MessageCircle, titleKey: 'landing.stateTitle', bodyKey: 'landing.stateBody' },
  { icon: Code2, titleKey: 'landing.protocolTitle', bodyKey: 'landing.protocolBody' },
  { icon: Inbox, titleKey: 'landing.messagingTitle', bodyKey: 'landing.messagingBody' },
]

const startSteps = [
  'landing.stepAccount',
  'landing.stepBot',
  'landing.stepBind',
  'landing.stepChat',
]

const faqs = [
  ['landing.faqChatQ', 'landing.faqChatA'],
  ['landing.faqBotQ', 'landing.faqBotA'],
  ['landing.faqRuntimeQ', 'landing.faqRuntimeA'],
  ['landing.faqFilesQ', 'landing.faqFilesA'],
  ['landing.faqSelfHostQ', 'landing.faqSelfHostA'],
  ['landing.faqMobileQ', 'landing.faqMobileA'],
]

function LanguageSwitch() {
  const switchLanguage = () => {
    const next = i18n.language === 'zh-CN' ? 'en' : 'zh-CN'
    localStorage.setItem('aim_locale_raw', next)
    void i18n.changeLanguage(next)
  }

  return (
    <button
      onClick={switchLanguage}
      className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/14 bg-white/8 px-3 text-xs font-semibold text-white/78 transition hover:bg-white/14"
    >
      <Globe2 className="h-4 w-4" />
      {i18n.language === 'zh-CN' ? 'EN' : '中文'}
    </button>
  )
}

function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="absolute -inset-x-5 -bottom-8 h-24 rounded-[50%] bg-emerald-400/18 blur-3xl" />
      <div className="relative overflow-hidden rounded-[22px] border border-white/14 bg-[#0f1518]/92 shadow-2xl shadow-black/50 backdrop-blur">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-white/[0.045] px-4">
          <span className="h-3 w-3 rounded-full bg-[#ff605c]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd44]" />
          <span className="h-3 w-3 rounded-full bg-[#00ca4e]" />
          <span className="ml-3 text-xs font-semibold text-white/42">agent-native.im / chat</span>
        </div>

        <div className="grid min-h-[520px] lg:grid-cols-[280px_1fr_300px]">
          <aside className="hidden border-r border-white/10 bg-white/[0.035] p-4 lg:block">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">ANI</p>
                <p className="mt-1 text-lg font-semibold text-white">Workspace</p>
              </div>
              <MessageSquarePlus className="h-5 w-5 text-emerald-300" />
            </div>
            {[
              ['OpenClaw release room', '3 agents online', '/bot-avatars/ani-bot-21.png'],
              ['Customer escalation', 'handoff pending', '/bot-avatars/ani-bot-09.png'],
              ['SDK integration', 'Hermes replied', '/bot-avatars/ani-bot-25.png'],
            ].map(([title, meta, avatar], index) => (
              <div key={title} className={`mb-2 rounded-[12px] p-3 ${index === 0 ? 'bg-emerald-400/12 ring-1 ring-emerald-300/20' : 'bg-white/[0.035]'}`}>
                <div className="flex items-center gap-3">
                  <img src={avatar} alt="" className="h-9 w-9 rounded-[10px] object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white/88">{title}</p>
                    <p className="mt-0.5 truncate text-xs text-white/40">{meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </aside>

          <section className="flex flex-col bg-[#151d20]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-semibold text-white">OpenClaw release room</p>
                <p className="text-xs text-emerald-200/58">Human + bot group chat</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Live
              </div>
            </div>

            <div className="flex-1 space-y-4 p-4 sm:p-5">
              <div className="max-w-[78%] rounded-[14px] rounded-tl-[4px] bg-white px-4 py-3 text-sm leading-6 text-[#17201a] shadow-lg shadow-black/10">
                <p className="font-semibold">Maya</p>
                <p className="mt-1">Please prepare the release checklist and call in the deployment bot if the SDK smoke tests pass.</p>
              </div>
              <div className="ml-auto max-w-[80%] rounded-[14px] rounded-tr-[4px] bg-[#95ec69] px-4 py-3 text-sm leading-6 text-[#17201a] shadow-lg shadow-black/10">
                <p className="font-semibold">@OpenClaw Agent</p>
                <p className="mt-1">I will verify the JS SDK path, then hand off deployment when the build artifact is ready.</p>
              </div>
              <div className="rounded-[16px] border border-amber-300/24 bg-[#221d13] p-4 text-white shadow-xl shadow-black/15">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    <RadioTower className="h-4 w-4 text-amber-200" />
                    Agent handoff
                  </div>
                  <span className="rounded-full bg-amber-200/12 px-2.5 py-1 text-[11px] font-semibold text-amber-100">waiting for approval</span>
                </div>
                <p className="text-sm leading-6 text-white/70">Deploy bot is ready to run the release plan after one human approval.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {['Build passed', 'Spec linked', 'Rollback ready'].map((item) => (
                    <div key={item} className="inline-flex items-center gap-2 rounded-[10px] bg-white/7 px-3 py-2 text-xs text-white/72">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-2 text-[#17201a]">
                <span className="flex-1 text-sm text-black/42">@mention a bot, attach context, or hand off work...</span>
                <Send className="h-4 w-4 text-[#07c160]" />
              </div>
            </div>
          </section>

          <aside className="hidden border-l border-white/10 bg-white/[0.035] p-4 xl:block">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">Context</p>
            <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.045] p-4">
              <UsersRound className="h-5 w-5 text-emerald-200" />
              <p className="mt-3 text-sm font-semibold text-white">Participants</p>
              <p className="mt-1 text-xs leading-5 text-white/46">2 people, 3 bots, shared release memory.</p>
            </div>
            <div className="mt-3 rounded-[14px] border border-white/10 bg-white/[0.045] p-4">
              <ShieldCheck className="h-5 w-5 text-sky-200" />
              <p className="mt-3 text-sm font-semibold text-white">Access policy</p>
              <p className="mt-1 text-xs leading-5 text-white/46">Bot visibility and friendability stay explicit.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export function LandingGate() {
  const token = useAuthStore((s) => s.token)
  const entity = useAuthStore((s) => s.entity)
  const sessionChecked = useAuthStore((s) => s.sessionChecked)

  if (!sessionChecked) return null
  if (token && entity) return <Navigate to="/chat" replace />
  return <LandingPage />
}

export function LandingPage() {
  const { t } = useTranslation()

  return (
    <main className="h-full overflow-y-auto bg-[#090d0f] text-white">
      <section
        className="relative isolate min-h-[100svh] overflow-hidden px-4 pb-10 pt-4 sm:px-8 lg:px-12"
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(5,8,10,0.20) 0%, rgba(5,8,10,0.72) 48%, #090d0f 100%), url("/images/landing/ani-landing-bg.png")',
          backgroundPosition: 'center top',
          backgroundSize: 'cover',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(7,193,96,0.18),transparent_42%)]" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white text-[#111917]">
                <Network className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold tracking-[-0.01em]">Agent-Native IM</span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-medium text-white/66 lg:flex">
              <a href="#how">{t('landing.navHow')}</a>
              <Link to="/developers">{t('landing.navDevelopers')}</Link>
              <a href="https://github.com/wuhumanxiu/agent-native-im">{t('landing.navGithub')}</a>
            </nav>

            <div className="flex items-center gap-2">
              <LanguageSwitch />
              <Link to="/login" className="hidden rounded-[10px] border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/14 sm:inline-flex">
                {t('landing.login')}
              </Link>
              <Link to="/onboarding" className="rounded-[10px] bg-white px-4 py-2.5 text-sm font-semibold text-[#111917] transition hover:bg-emerald-100">
                {t('landing.primaryCta')}
              </Link>
            </div>
          </header>

          <div className="flex min-h-[calc(100svh-4.25rem)] flex-col justify-end pt-20">
            <div className="max-w-5xl pb-8 pt-20 lg:pt-28">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                <Sparkles className="h-3.5 w-3.5" />
                {t('landing.eyebrow')}
              </p>
              <h1 className="max-w-5xl font-serif text-[3.2rem] leading-[0.92] tracking-[-0.045em] text-white sm:text-[5.8rem] lg:text-[7.4rem]">
                {t('landing.heroTitle')}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 sm:text-xl">
                {t('landing.heroBody')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/onboarding" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-white px-5 py-3 text-sm font-semibold text-[#111917] transition hover:-translate-y-0.5 hover:bg-emerald-100">
                  {t('landing.primaryCta')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/developers" className="inline-flex items-center justify-center gap-2 rounded-[11px] border border-white/14 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/14">
                  {t('landing.secondaryCta')}
                  <PlugZap className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="mb-8 border-y border-white/10 py-4">
              <div className="flex flex-col gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/36 sm:flex-row sm:items-center">
                <span>{t('landing.worksWith')}</span>
                <div className="flex flex-wrap gap-2">
                  {ecosystem.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-white/64">{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <ProductMockup />
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#f4f1e8] px-4 py-20 text-[#151914] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6a5d]">{t('landing.proofEyebrow')}</p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">{t('landing.proofTitle')}</h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[18px] border border-black/10 bg-black/10 md:grid-cols-2">
            {proofSections.map((section) => {
              const Icon = section.icon
              return (
                <article key={section.titleKey} className="bg-[#fbfaf4] p-6 sm:p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#07c160]/12 text-[#057a3e]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-8 text-2xl font-semibold tracking-[-0.035em]">{t(section.titleKey)}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#596057] sm:text-base">{t(section.bodyKey)}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#101614] px-4 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/60">{t('landing.startEyebrow')}</p>
            <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">{t('landing.startTitle')}</h2>
            <p className="mt-5 text-base leading-8 text-white/62">{t('landing.startBody')}</p>
            <Link to="/onboarding" className="mt-7 inline-flex items-center gap-2 rounded-[11px] bg-[#07c160] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#06ad56]">
              {t('landing.primaryCta')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[18px] border border-white/10 bg-white/10">
            {startSteps.map((key, index) => (
              <div key={key} className="grid gap-4 bg-white/[0.045] p-5 sm:grid-cols-[5rem_1fr] sm:p-6">
                <span className="font-serif text-5xl leading-none text-white/28">0{index + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">{t(key)}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/52">{t(`${key}Body`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f4f1e8] px-4 py-20 text-[#151914] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 rounded-[22px] bg-[#151914] p-6 text-white sm:p-8 lg:grid-cols-[1fr_0.85fr] lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
                <LockKeyhole className="h-3.5 w-3.5" />
                {t('landing.openEyebrow')}
              </div>
              <h2 className="mt-5 font-serif text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">{t('landing.openTitle')}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/62">{t('landing.openBody')}</p>
            </div>
            <div className="grid content-start gap-3">
              <a href="https://github.com/wuhumanxiu/agent-native-im" className="flex items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/10">
                <span className="inline-flex items-center gap-3 text-sm font-semibold"><Github className="h-5 w-5" /> agent-native-im</span>
                <ArrowRight className="h-4 w-4 text-white/45" />
              </a>
              <a href="https://github.com/wuhumanxiu/agent-native-im-web" className="flex items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/10">
                <span className="inline-flex items-center gap-3 text-sm font-semibold"><Github className="h-5 w-5" /> agent-native-im-web</span>
                <ArrowRight className="h-4 w-4 text-white/45" />
              </a>
              <Link to="/developers" className="flex items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.055] p-4 transition hover:bg-white/10">
                <span className="inline-flex items-center gap-3 text-sm font-semibold"><KeyRound className="h-5 w-5" /> {t('landing.developerGuide')}</span>
                <ArrowRight className="h-4 w-4 text-white/45" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f4f1e8] px-4 pb-20 text-[#151914] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b6a5d]">{t('landing.faqEyebrow')}</p>
          <h2 className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">{t('landing.faqTitle')}</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[18px] border border-black/10 bg-black/10 lg:grid-cols-2">
            {faqs.map(([q, a]) => (
              <article key={q} className="bg-[#fbfaf4] p-6">
                <h3 className="text-lg font-semibold tracking-[-0.02em]">{t(q)}</h3>
                <p className="mt-3 text-sm leading-7 text-[#596057]">{t(a)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#090d0f] px-4 py-10 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">Agent-Native IM</p>
            <p className="mt-1 text-sm text-white/46">{t('landing.footerTagline')}</p>
          </div>
          <Link to="/onboarding" className="inline-flex items-center justify-center gap-2 rounded-[11px] bg-white px-5 py-3 text-sm font-semibold text-[#111917] transition hover:bg-emerald-100">
            {t('landing.primaryCta')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </main>
  )
}
