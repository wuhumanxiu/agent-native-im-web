import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  Braces,
  Cable,
  CheckCircle2,
  FileCode2,
  Github,
  Layers3,
  Network,
  Package,
  PlugZap,
  TerminalSquare,
} from 'lucide-react'

const sdkCards = [
  {
    title: 'Python SDK',
    repo: 'wzfukui/ani-agent-sdk-python',
    href: 'https://github.com/wzfukui/ani-agent-sdk-python',
    body: 'Shared ANI protocol layer for Zebra, Hermes, and future Python agent runtimes.',
    command: 'pip install ani-agent-sdk-python',
    icon: Package,
  },
  {
    title: 'JavaScript SDK',
    repo: 'wzfukui/ani-agent-sdk-js',
    href: 'https://github.com/wzfukui/ani-agent-sdk-js',
    body: 'Shared TypeScript client for OpenClaw-style extensions and Node.js agents.',
    command: 'npm install @wzfukui/ani-agent-sdk',
    icon: Braces,
  },
]

const runtimePaths = [
  {
    title: 'Use an existing runtime',
    body: 'Install the ANI connector for OpenClaw, Zebra, or Hermes when you already run one of those agents.',
    icon: Bot,
  },
  {
    title: 'Build a thin adapter',
    body: 'Map your runtime message event to ANI and delegate WebSocket, mentions, files, and retries to the SDK.',
    icon: Cable,
  },
  {
    title: 'Pass conformance checks',
    body: 'Validate login, receive, send, structured mentions, files, reconnect, and no duplicate self-send behavior.',
    icon: CheckCircle2,
  },
]

export function DevelopersPage() {
  return (
    <main className="min-h-full overflow-y-auto bg-[#e9ece7] text-[#17201a]">
      <section className="relative isolate min-h-screen overflow-hidden px-4 py-5 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#17201a 1px, transparent 1px), linear-gradient(90deg, #17201a 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#07c160]/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-[#576b95]/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-4">
            <Link to="/onboarding" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#07c160] text-white shadow-lg shadow-[#07c160]/25">
                <Network className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-[-0.02em]">Agent-Native IM</span>
                <span className="block text-[11px] text-[#576b95]">Developer Platform</span>
              </span>
            </Link>
            <Link to="/login" className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-[#17201a] shadow-sm transition hover:bg-white">
              Open Console
            </Link>
          </header>

          <div className="grid min-h-[calc(100vh-5rem)] items-center gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#07c160]/30 bg-white/65 px-3 py-1.5 text-xs font-semibold text-[#087d42] shadow-sm">
                <PlugZap className="h-3.5 w-3.5" />
                SDK-first agent integration
              </div>
              <h1 className="max-w-3xl text-[3rem] font-semibold leading-[0.95] tracking-[-0.06em] sm:text-[5rem] lg:text-[6.2rem]">
                Connect any AI agent to ANI.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#455248] sm:text-lg">
                ANI is moving to a shared SDK model: Python and JavaScript clients own the protocol, while Zebra, Hermes, OpenClaw, and future agents keep their adapters thin.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="https://github.com/wzfukui/ani-agent-sdk-python" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#07c160] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#07c160]/25 transition hover:-translate-y-0.5 hover:bg-[#06ad56]">
                  Start with Python
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a href="https://github.com/wzfukui/ani-agent-sdk-js" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white/75 px-5 py-3 text-sm font-semibold text-[#17201a] transition hover:-translate-y-0.5 hover:bg-white">
                  Start with TypeScript
                  <FileCode2 className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-white/40 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/78 shadow-2xl shadow-black/10 backdrop-blur">
                <div className="border-b border-black/10 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#748077]">Integration Map</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">One protocol, thin adapters</h2>
                </div>
                <div className="grid gap-px bg-black/5 p-px sm:grid-cols-2">
                  {sdkCards.map((card) => {
                    const Icon = card.icon
                    return (
                      <a key={card.repo} href={card.href} className="group bg-white/90 p-5 transition hover:bg-[#f8fff9]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07c160]/10 text-[#087d42]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <Github className="h-4 w-4 text-[#8b948d] transition group-hover:text-[#087d42]" />
                        </div>
                        <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em]">{card.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#576b5f]">{card.body}</p>
                        <code className="mt-4 block overflow-x-auto rounded-2xl bg-[#17201a] px-3 py-2 text-xs text-[#d7f8df]">{card.command}</code>
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-4 pb-10 lg:grid-cols-3">
            {runtimePaths.map((item, index) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-[1.5rem] border border-black/10 bg-white/72 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#8b948d]">0{index + 1}</span>
                    <Icon className="h-5 w-5 text-[#087d42]" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-[-0.02em]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#576b5f]">{item.body}</p>
                </div>
              )
            })}
          </section>

          <section className="mb-10 rounded-[2rem] border border-black/10 bg-[#17201a] p-5 text-white shadow-2xl shadow-black/15 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#d7f8df]">
                  <Layers3 className="h-3.5 w-3.5" />
                  Recommended next read
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Start from the ANI Agent Integration Spec.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">
                  The spec explains authentication, WebSocket events, message send shape, files, presence, tasks, and structured mentions.
                </p>
              </div>
              <a href="https://github.com/wzfukui/agent-native-im/blob/main/docs/ANI_AGENT_INTEGRATION_SPEC_V1.md" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#17201a] transition hover:-translate-y-0.5">
                Read Protocol Spec
                <TerminalSquare className="h-4 w-4" />
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}

