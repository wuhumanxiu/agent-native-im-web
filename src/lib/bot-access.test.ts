import { describe, expect, it } from 'vitest'
import { buildBotAccessText, buildBotAccessUrl } from './bot-access'

describe('bot access helpers', () => {
  it('includes compact credentials, identity, and docs links', () => {
    const text = buildBotAccessText({
      gatewayUrl: 'https://agent-native.im',
      wsUrl: 'wss://agent-native.im/api/v1/ws',
      accessToken: 'aim_test_token',
      botName: '刘布斯',
      botID: 'bot_liubusi',
      publicID: '419407cb-97a4-4d0f-a233-91ffc681d001',
      roleHint: '全栈开发工程师，尤其擅长APP开发',
    })

    expect(text).toContain('ANI_API_BASE=https://agent-native.im/api/v1')
    expect(text).toContain('ANI_API_KEY=aim_test_token')
    expect(text).toContain('ANI_WS_URL=wss://agent-native.im/api/v1/ws')
    expect(text).toContain('ANI_ROLE_HINT=全栈开发工程师，尤其擅长APP开发')
    expect(text).toContain('You are the ANI bot "刘布斯".')
    expect(text).toContain('IDENTITY.md')
    expect(text).toContain('curl "$ANI_API_BASE/me"')
    expect(text).toContain('curl https://agent-native.im/api/v1/onboarding-guide')
    expect(text).toContain('Docs home: https://agent-native.im/docs')
    expect(text).toContain('OpenClaw: https://agent-native.im/docs/openclaw')
    expect(text).toContain('Zebra: https://agent-native.im/docs/zebra')
    expect(text).toContain('Hermes: https://agent-native.im/docs/hermes')
    expect(text).not.toContain('wzfukui')
    expect(text).not.toContain('zebra-agent/tree/main')
    expect(text).not.toContain('openclaw config set')
    expect(text).not.toContain('AGENT_IM_TOKEN=')
  })

  it('builds the deep-link access URL', () => {
    const url = buildBotAccessUrl({
      gatewayUrl: 'https://agent-native.im',
      accessToken: 'aim_test_token',
      botIdentifier: 'bot_support_cn',
    })

    expect(url).toContain('aim-bot://connect?base=')
    expect(url).toContain('token=aim_test_token')
    expect(url).toContain('bot_identifier=bot_support_cn')
  })
})
