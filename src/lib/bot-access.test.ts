import { describe, expect, it } from 'vitest'
import { buildBotAccessText, buildBotAccessUrl } from './bot-access'

describe('bot access helpers', () => {
  it('includes OpenClaw and Zebra setup guidance', () => {
    const text = buildBotAccessText({
      gatewayUrl: 'https://agent-native.im',
      wsUrl: 'wss://agent-native.im/api/v1/ws',
      accessToken: 'aim_test_token',
      botName: '刘布斯',
      botID: 'bot_liubusi',
      publicID: '419407cb-97a4-4d0f-a233-91ffc681d001',
      roleHint: '全栈开发工程师，尤其擅长APP开发',
    })

    expect(text).toContain('npx -y @wzfukui/openclaw-ani-installer install')
    expect(text).toContain('openclaw config set channels.ani.apiKey "aim_test_token"')
    expect(text).toContain('## Option B: Zebra gateway adapter')
    expect(text).toContain('The ANI adapter is bundled with Zebra by default')
    expect(text).toContain('https://github.com/wzfukui/zebra-agent/tree/main/plugins/platforms/ani')
    expect(text).toContain('Release tag with the adapter: v2026.5.6')
    expect(text).toContain('test -f plugins/platforms/ani/adapter.py')
    expect(text).toContain('python -m py_compile plugins/platforms/ani/adapter.py')
    expect(text).toContain('platforms:')
    expect(text).toContain('api_key: aim_test_token')
    expect(text).toContain('export ANI_API_KEY="aim_test_token"')
    expect(text).toContain('zebra gateway restart')
    expect(text).toContain('## Option C: Hermes gateway adapter')
    expect(text).toContain('https://github.com/wzfukui/hermes-ani-adapter')
    expect(text).toContain('./scripts/install.sh ~/code/hermes-agent')
    expect(text).toContain('Add or update this block in ~/.hermes/config.yaml')
    expect(text).toContain('hermes gateway restart')
    expect(text).toContain('You are the ANI bot "刘布斯".')
    expect(text).toContain('IDENTITY.md')
    expect(text).toContain('curl https://agent-native.im/api/v1/me')
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
