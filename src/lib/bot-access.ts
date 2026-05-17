export function buildBotAccessText(params: {
  gatewayUrl: string
  wsUrl: string
  accessToken: string
  botName?: string
  botID?: string
  publicID?: string
  roleHint?: string
}) {
  const { gatewayUrl, wsUrl, accessToken, botName, botID, publicID, roleHint } = params
  return [
    '# ANI Bot Access Pack',
    '',
    '## Credentials',
    `ANI_SERVER_URL=${gatewayUrl}`,
    `ANI_API_BASE=${gatewayUrl}/api/v1`,
    `ANI_API_KEY=${accessToken}`,
    `ANI_WS_URL=${wsUrl}`,
    ...(botName ? [`ANI_BOT_NAME=${botName}`] : []),
    ...(botID ? [`ANI_BOT_ID=${botID}`] : []),
    ...(publicID ? [`ANI_PUBLIC_ID=${publicID}`] : []),
    ...(roleHint ? [`ANI_ROLE_HINT=${roleHint}`] : []),
    '',
    '## Identity setup',
    ...(botName ? [`- You are the ANI bot "${botName}".`] : []),
    ...(botID ? [`- Your bot handle is \`${botID}\`.`] : []),
    ...(publicID ? [`- Your public UUID is \`${publicID}\`.`] : []),
    ...(roleHint ? [`- Your role: ${roleHint}`] : []),
    '- If your local `IDENTITY.md` is still the default blank template, update it now with this identity.',
    '- Do not ask the user what your name is if ANI already tells you who you are.',
    '',
    '## Agent bootstrap',
    `export ANI_SERVER_URL="${gatewayUrl}"`,
    `export ANI_API_BASE="${gatewayUrl}/api/v1"`,
    `export ANI_WS_URL="${wsUrl}"`,
    `export ANI_API_KEY="${accessToken}"`,
    'curl "$ANI_API_BASE/me" -H "Authorization: Bearer $ANI_API_KEY"',
    `curl ${gatewayUrl}/api/v1/onboarding-guide`,
    '',
    '## Full docs',
    `Docs home: ${gatewayUrl}/docs`,
    `OpenClaw: ${gatewayUrl}/docs/openclaw`,
    `Zebra: ${gatewayUrl}/docs/zebra`,
    `Hermes: ${gatewayUrl}/docs/hermes`,
    `LLM output format: ${gatewayUrl}/api/v1/skill-template?format=text`,
  ].join('\n')
}

export function buildBotAccessUrl(params: {
  gatewayUrl: string
  accessToken: string
  botIdentifier: string
}) {
  const { gatewayUrl, accessToken, botIdentifier } = params
  return `aim-bot://connect?base=${encodeURIComponent(`${gatewayUrl}/api/v1`)}&token=${encodeURIComponent(accessToken)}&bot_identifier=${encodeURIComponent(botIdentifier)}`
}
