# ANI Landing 页面调研报告

> 日期：2026-05-18  
> 范围：只做调研报告和实现思路，不做代码功能开发。  
> 参考站点：https://multica.ai/

## 1. 任务背景

本次需求是为 https://agent-native.im 的正式产品 Landing 首页做前期调研。当前指令明确要求：先启动调研，把报告和思路放到 `docs/`，暂不做页面功能开发。

原始方向是参考 Multica 首页，可以先较高程度复用其风格、元素、布局、背景图处理和 Hero 产品截图处理。Hero 区域的产品截图可以先用 ANI 项目自身绘制或生成一个占位图，等正式产品截图准备好后再替换。

当前 ANI Web 事实：

- 子仓：`agent-native-im-web`
- 技术栈：React 19、TypeScript 5.9、Vite 7、Tailwind CSS 4、React Router 7
- 现有公开路由包括 `/login`、`/register`、`/onboarding`、`/developers`、`/public/bots/:identifier`
- 当前已有公开页面偏功能说明和开发者入口，还没有真正的营销型首页
- README 中的产品定位是：ANI 是 agent-native communication system，不是普通 IM 外挂 AI

## 2. Multica 首页结构拆解

Multica 首页是典型的长页 SaaS 产品 Landing 结构：

1. 顶部导航
   - 左侧品牌 wordmark
   - 右侧辅助链接：Changelog、GitHub
   - 主操作：Log in
   - Header 透明叠在深色 Hero 上

2. Hero 首屏
   - 深色全屏背景图
   - 超大 serif 标题："Your next 10 hires won't be human."
   - 一段短产品定位
   - 主 CTA 和次 CTA
   - "Works with" 生态 Logo 条
   - 首屏下方接一张大产品截图

3. 功能证明区
   - 每个区块用一个强产品主张搭配 UI mockup 或截图
   - 当前 Multica 的主要主题包括：
     - 像分配同事一样分配 agent
     - agent 可以异步执行任务
     - skill 可以复用和积累
     - runtime dashboard 管理计算资源

4. Get started
   - 四步编号流程
   - 从注册到创建 agent，再到分配任务

5. Open source
   - 自托管、无锁定、透明、社区驱动

6. FAQ
   - 回答实际购买/试用前的阻碍问题

7. Footer
   - 品牌总结、CTA、Product/Resources/Company 链接、语言切换

## 3. 视觉语言观察

Multica 当前页面的关键视觉特征：

- 首屏是深色真实背景图，不是单纯渐变背景
- H1 使用很大的 editorial serif 字体，行高紧、对比强
- 按钮圆角克制，约 11-12px；产品截图外框更大、更有展示感
- Hero 文字主体为白色，辅助文案和生态条使用低透明白色
- 产品 UI 截图是主要证明资产，不依赖抽象插画
- 功能区使用密集、可信的产品 UI 卡片和 mock 数据
- 文案直接、具体、偏工作流，不走空泛概念
- 页面节奏是“情绪化大标题 + 具体产品证据”交替推进
- 从 HTML 里可观察到当前 Landing 资产名：
  - `/images/landing-bg.jpg`
  - `/images/landing-hero.png`

## 4. ANI 的定位转换

ANI 不应照搬 Multica 的“project management for agents”定位。Multica 是 agent 项目管理层，ANI 是通信层。建议只借鉴视觉语法和页面结构，把产品含义换成 ANI 自身：

- 类目：agent-native 通信与协作层
- 核心对象：conversation、Bot 身份、私聊/群聊、mention、文件、上下文、交接状态
- 用户承诺：让人和 AI agent 在同一个消息流里工作，并把状态显式呈现出来
- 差异化：ANI 是 agent 能真正进入和长期驻留的 IM/protocol layer，不是单 assistant 聊天页

可选 H1 方向：

- "Your next teammate is already in the chat."
- "Agent-native messaging for human + AI teams."
- "Where humans and agents talk, decide, and hand off work."

建议支持文案方向：

ANI is a real-time communication layer for people, bots, and agent runtimes. Create bot identities, bind agents, share files, mention teammates, and keep handoffs visible inside the conversation.

中文方向可以是：

ANI 是面向人类和 AI agent 的实时通信层。创建 Bot 身份，绑定 agent runtime，共享文件、发起提及、沉淀上下文，并把任务交接状态保留在同一条会话流里。

## 5. 建议的 ANI Landing 页面结构

### 5.1 顶部导航

建议导航项：

- Brand：Agent-Native IM 或 ANI
- How it works
- Developers
- GitHub 或 Docs
- Log in
- 主 CTA：Start using ANI

### 5.2 Hero 首屏

目标：借鉴 Multica 的强第一印象，但让用户第一眼知道 ANI 是通信产品。

建议内容：

- H1：Agent-native messaging for human + AI teams.
- 支持文案：强调人、Bot、文件、mention、上下文、交接状态在一个实时会话层里协作
- 主 CTA：Start with ANI
- 次 CTA：Read developer guide 或 Connect an agent
- 生态条：
  - OpenClaw
  - Zebra
  - Hermes
  - Python SDK
  - JavaScript SDK

建议视觉：

- 深色全幅背景图，建议使用 ANI 自有或生成资产，不直接热链 Multica 资源
- Hero 产品截图占位：
  - 桌面 chat surface
  - 左侧 conversation list
  - 主线程展示 human 与 bot 消息
  - interaction card 或 task handover card
  - Bot online/presence 状态
  - attachment 或 artifact preview

### 5.3 产品证明区

Section 1：Give every agent a real communication identity

- 画面：Bot profile / bot management UI
- 证明点：
  - Bot identity、头像、凭证
  - 好友策略和 direct-message policy
  - public bot session links

Section 2：Keep work state inside the conversation

- 画面：conversation 中的 interaction card、task handover、context card
- 证明点：
  - mention 和 assignment
  - 显式交接状态
  - conversation memory/context

Section 3：Connect agents through one protocol

- 画面：参考现有 `DevelopersPage` 的 integration map
- 证明点：
  - Python SDK
  - JavaScript SDK
  - OpenClaw、Zebra、Hermes adapters

Section 4：Built for real team messaging

- 画面：Inbox / groups / friends surfaces
- 证明点：
  - 私聊和群聊
  - Inbox notifications
  - Attachments 与 offline queue
  - PWA/mobile continuity

### 5.4 Getting Started

建议四步：

1. 创建人类账号
2. 创建 Bot 身份
3. 绑定 agent runtime 或 SDK adapter
4. 开始私聊或群聊

这个流程可以直接对应当前 `OnboardingPage` 和已有产品行为。

### 5.5 Open Source / Self-host

可以复用 Multica 的开源信任结构，但换成 ANI 自身承诺：

- 自托管通信层
- 会话数据留在自己的部署里
- 自带 agent runtime
- 通过 SDK 和 adapter 扩展

### 5.6 FAQ

首版建议问题：

- ANI 是普通聊天软件吗？
- Bot 和 agent 的区别是什么？
- 目前支持哪些 agent runtime？
- agent 能接收文件吗？
- ANI 可以自托管吗？
- 是否有移动端？

## 6. 后续实现思路

本轮不做代码开发。后续进入实现时，建议用低风险方式推进：

1. 新增 `src/pages/LandingPage.tsx`
2. 将 `/` 路由到 Landing 页面，保持已登录 app 路由仍受保护
3. `/onboarding` 保留为更深的使用指南页，不再承担首页职责
4. 继续使用现有 Tailwind 4 和 lucide-react
5. 如果首版需要中英双语，文案放进 `src/i18n/en.json` 与 `src/i18n/zh-CN.json`；否则先单语上线，再补 i18n
6. 自有视觉资产放在 `public/images/landing/`
7. UI mockup 优先用 CSS/Tailwind 组件搭建；只有氛围背景建议用生成或自有 bitmap
8. Hero 产品截图占位应通过单独组件或单一路径隔离，方便后续替换正式截图

潜在实现文件：

- `src/pages/LandingPage.tsx`
- `src/App.tsx`
- `src/i18n/en.json`
- `src/i18n/zh-CN.json`
- `public/images/landing/ani-hero-bg.*`
- `public/images/landing/ani-hero-product.*`

## 7. ANI 设计约束

- 不要让 Landing 看起来像当前后台控制台，需要更强的公开产品第一印象
- 不要用抽象插画替代产品本体，首屏必须有 ANI chat/product 信号
- 不要过度使用现有微信绿；可以保留 ANI 识别度，但要加入深色 editorial 对比和中性产品 UI 密度
- 不要把 ANI 实体写成 Agent；在 ANI 产品模型里，通信身份是 Bot，agent/runtime 是执行层
- 不要在公开文案或 mock 数据里带旧路径、旧包名、旧账号
- 不要在截图或 mock 数据里暴露 token、私有主机名、内部部署细节

## 8. 资产计划

建议首版资产：

- Hero 背景：自有或生成 bitmap，深色、通信/协作氛围，细节不要抢正文
- Hero 产品截图占位：ANI desktop chat mockup，可由本地组件渲染后截图，也可作为静态 mockup 设计
- Section mockups：
  - Bot profile card
  - Conversation handover card
  - SDK/protocol cards
  - Inbox/groups preview

正式产品截图准备好后，只替换 Hero 占位资产或对应组件，不影响页面结构。

## 9. 待确认问题

1. 首版首页是英文优先、中文优先，还是必须中英双语？
2. `/` 是否无论登录状态都展示 Landing，还是已登录用户自动进入 `/chat`？
3. 哪些 GitHub/docs 链接可以在公开发布前展示？
4. 主 CTA 应指向注册、onboarding guide，还是 developer integration？
5. Multica 与 ANI 是否同属可复用视觉资产的范围？如果不是，建议只复用结构和风格，使用 ANI 自有资产。

## 10. 建议下一步

写代码前建议先确认：

- 最终 H1 和 CTA 文案
- `/` 的路由策略
- 首版是否必须双语
- Hero 产品图占位采用生成图、静态 mockup，还是基于现有 ANI UI 组件渲染

确认后可以进入一个独立前端 PR，只实现 Landing 页面，不改核心 IM 行为。
