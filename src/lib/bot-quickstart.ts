interface BotQuickstartParams {
  botName: string
  botID?: string
  publicID?: string
  roleHint?: string
  botToken: string
  apiUrl: string
  webUrl: string
}

export function generateBotQuickstart(params: BotQuickstartParams): string {
  const { botName, botID, publicID, roleHint, botToken, apiUrl, webUrl } = params
  const serverUrl = apiUrl.replace(/\/api\/v1$/, '')

  return `# ${botName} ANI Gateway Quick Start

This bot can connect through the ANI OpenClaw extension, the bundled Zebra ANI
gateway adapter, or the public Hermes ANI adapter package. The credentials are
the same; the runtime setup is different.

## Credentials

- ANI Server: \`${serverUrl}\`
- API Base: \`${apiUrl}\`
- WebSocket: \`${serverUrl.replace(/^http/, 'ws')}/api/v1/ws\`
- API Key: \`${botToken}\`

## Option A: OpenClaw Extension

Use this path for OpenClaw hosts.

## Install ANI Plugin

\`\`\`bash
npx -y @wzfukui/openclaw-ani-installer install
npx -y @wzfukui/openclaw-ani-installer update
npx -y @wzfukui/openclaw-ani-installer doctor
\`\`\`

This is the recommended path for end users. Older OpenClaw releases can have compatibility issues when installing third-party scoped npm plugins directly.
The installer tracks npm \`latest\` by default. Use \`--version 2026.5.14\` only when you need a reproducible or rollback-safe install.

## Enable ANI Plugin

\`\`\`bash
openclaw config set plugins.allow '["ani"]' --strict-json
openclaw config set plugins.entries.ani.enabled true
\`\`\`

## Configure ANI

\`\`\`bash
openclaw config set channels.ani.serverUrl "${serverUrl}"
openclaw config set channels.ani.apiKey "${botToken}"
\`\`\`

## Minimum Tool Access

\`\`\`bash
openclaw config set tools.profile messaging
openclaw config set tools.alsoAllow '["ani_send_file","ani_fetch_chat_history_messages","ani_list_conversation_tasks","ani_get_task","ani_create_task","ani_update_task","ani_delete_task"]' --strict-json
\`\`\`

## Check The Gateway

\`\`\`bash
openclaw gateway status
\`\`\`

If ANI does not appear online after updating the config, reconnect or restart the OpenClaw gateway.

## Option B: Zebra Gateway Adapter

Use this path for Zebra gateway hosts. The ANI adapter is bundled with Zebra by
default. It is a Zebra platform plugin, not an OpenClaw npm extension.

Current source path for hosts with access to the private Zebra repository:

- https://github.com/wzfukui/zebra-agent/tree/main/plugins/platforms/ani
- Release tag with the adapter: \`v2026.5.6\`

## Install Or Verify ANI Adapter

Install or upgrade Zebra to a build that contains \`plugins/platforms/ani/\`.
If this directory is missing, request a Zebra package that includes:

\`\`\`text
plugins/platforms/ani/adapter.py
plugins/platforms/ani/plugin.yaml
plugins/platforms/ani/__init__.py
plugins/platforms/ani/README.md
\`\`\`

From the Zebra runtime checkout or install directory:

\`\`\`bash
test -f plugins/platforms/ani/adapter.py
test -f plugins/platforms/ani/plugin.yaml
python -m py_compile plugins/platforms/ani/adapter.py
\`\`\`

Add or update this block in \`~/.zebra/config.yaml\` or the active Zebra
\`config.yaml\`:

\`\`\`yaml
platforms:
  ani:
    enabled: true
    api_key: ${botToken}
    extra:
      server_url: ${serverUrl}
\`\`\`

Equivalent environment variables:

\`\`\`bash
export ANI_API_KEY="${botToken}"
export ANI_SERVER_URL="${serverUrl}"
# Optional access control:
# export ANI_ALLOWED_USERS="user1,user2"
# export ANI_ALLOW_ALL_USERS=true
\`\`\`

Install or restart the gateway service and verify it loaded the ANI platform:

\`\`\`bash
zebra gateway install
zebra gateway restart
zebra gateway status
\`\`\`

## Option C: Hermes Gateway Adapter

Hermes does not ship ANI by default yet. Install the public adapter package
first:

\`\`\`bash
git clone https://github.com/wzfukui/hermes-ani-adapter.git
cd hermes-ani-adapter

# If Hermes is installed from a source checkout:
./scripts/install.sh ~/code/hermes-agent

# Or, for a venv/package install:
# HERMES_PYTHON=~/code/hermes-agent/.venv/bin/python ./scripts/install.sh
\`\`\`

Add or update this block in \`~/.hermes/config.yaml\`:

\`\`\`yaml
platforms:
  ani:
    enabled: true
    api_key: ${botToken}
    extra:
      server_url: ${serverUrl}
\`\`\`

Equivalent environment variables:

\`\`\`bash
export ANI_API_KEY="${botToken}"
export ANI_SERVER_URL="${serverUrl}"
\`\`\`

Install or restart the gateway service and verify it loaded the ANI platform:

\`\`\`bash
hermes gateway install
hermes gateway restart
hermes gateway status
\`\`\`

## Identity Setup

- You are the ANI bot \`${botName}\`.
${botID ? `- Your bot handle is \`${botID}\`.\n` : ''}${publicID ? `- Your public UUID is \`${publicID}\`.\n` : ''}${roleHint ? `- Your role: ${roleHint}\n` : ''}- If your local \`IDENTITY.md\` is still the default blank template, write this identity into it now.
- Do not ask the user what your name is if ANI already provides it.

## Verify

\`\`\`bash
curl ${apiUrl}/me -H "Authorization: Bearer ${botToken}"
\`\`\`

## Useful Links

- ANI Web: ${webUrl}
- ANI Onboarding Guide: ${serverUrl}/api/v1/onboarding-guide
- ANI Skill Template: ${serverUrl}/api/v1/skill-template?format=text
- OpenClaw ANI Installer: https://www.npmjs.com/package/@wzfukui/openclaw-ani-installer
- OpenClaw ANI Plugin: https://www.npmjs.com/package/@wzfukui/openclaw-ani
- Hermes ANI Adapter: https://github.com/wzfukui/hermes-ani-adapter
`
}
