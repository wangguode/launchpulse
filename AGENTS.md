# LaunchPulse 工程协作指引（AGENTS.md）

本仓库为 LaunchPulse SaaS 源码仓（线上地址：`https://pulse.statementflow.win`）。
> 若需查看完整的跨项目商业目标与本地滚动执行日志，请读取本地桌面总控目录（非 Git 追踪）：`/Users/wangguo/Desktop/overseas-growth-hq/AGENTS.md`。

## 工程与视觉红线（V8 五层光学磨砂设计系统）
1. **UI 与材质规范**：全站基于 V8 五层光学磨砂栈（`AmbientFrostStage` 环境柔光场 + `2.5%` SVG 亚克力微噪点 + `backdrop-filter: blur(26px) saturate(185%)` + `1px` 顶部高光内描边）构建，统一使用 `src/components/ui/*`、`src/components/frosted/*`、`motion/react` 弹簧布局与 `Recharts 3`。
2. **中英双轨字体规范**：西文与数字统一采用 `Plus Jakarta Sans`（强制 `tabular-nums` 等宽数字），中文统一采用 `MiSans` 屏幕级开源商用字体并全局开启 `font-synthesis: none`，严禁浏览器算法伪加粗。
3. **3% 色彩预算铁律**：主行动按钮采用深曜石棱角高光（暗黑模式为银白高光胶囊），严禁彩色侧栏胶囊与多色徽章堆砌；钴蓝（`--accent-cobalt`）仅赋予核心数据曲线与高优焦点。
4. **AI 调用安全**：所有大模型调用（`POST /api/dashboard/radar/generate-reply`）必须严格执行超时控制、有限指数退避重试、输出长度/零链接校验与诚实降级，严禁在源码、日志或前端中硬编码或暴露任何密钥。
5. **验证与上线**：每次修改均需通过 `npx tsc --noEmit && npm run build` 与真实 Chrome 多页面/多视口零报错核验后，再运行 `npx wrangler deploy`。
