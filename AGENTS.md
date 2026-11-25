# LaunchPulse 工程协作指引（AGENTS.md）

本仓库为 LaunchPulse SaaS 源码仓（线上地址：`https://pulse.statementflow.win`）。
> 若需查看完整的跨项目商业目标与本地滚动执行日志，请读取本地桌面总控目录（非 Git 追踪）：`/Users/wangguo/Desktop/overseas-growth-hq/AGENTS.md`。

## 工程与视觉红线
1. **UI 规范**：全部页面与组件统一基于 `src/components/ui/*` 官方 `shadcn/ui`、`Recharts 3` 与 `@tanstack/react-table` v8 构建，严禁手写割裂的旧版自定义按钮/变量样式，严禁在生产顶栏暴露开源模板多主题选择器（`ThemeSelector`）。
2. **AI 调用安全**：所有大模型调用（`POST /api/dashboard/radar/generate-reply`）必须严格执行超时控制、有限指数退避重试、输出长度/零链接校验与诚实降级，严禁在源码、日志或前端中硬编码或暴露任何密钥。
3. **验证与上线**：每次修改均需通过 `npx tsc --noEmit && npm run build` 与真实 Chrome 多页面截图验证后，再运行 `npx wrangler deploy`。
