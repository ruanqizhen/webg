# WebG — 浏览器中的 LabVIEW 式可视化数据流编程环境

> **Dataflow programming, elegantly in the browser.**  
> 零安装、跨平台、JSON 原生可版本管理，用拖拽与连线构建算法与交互界面。

**在线体验：** https://webg.qizhen.xyz  
**源码：** https://github.com/ruanqizhen/webg  
**许可：** MIT · 作者个人学习项目

---

## 目录

- [WebG 是什么 / 核心特性](#webg-是什么--核心特性)
- [与 LabVIEW 的关系与差异](#与-labview-的关系与差异)
- [快速开始](#快速开始)
- [界面与交互](#界面与交互)
- [组件与控制结构参考](#组件与控制结构参考)
- [循环与条件 —— LabVIEW 对标](#循环与条件--labview-对标)
- [快捷键与右键菜单](#快捷键与右键菜单)
- [进阶技巧与边界语义](#进阶技巧与边界语义)
- [系统架构](#系统架构)
- [文件格式与兼容性](#文件格式与兼容性)
- [本地开发](#本地开发)
- [扩展自定义节点](#扩展自定义节点)
- [技术栈](#技术栈)
- [FAQ](#faq)
- [更新日志](#更新日志)

---

## WebG 是什么 / 核心特性

WebG 是一款**运行在浏览器**的可视化数据流编程 IDE。灵感来自 NI LabVIEW，但完全基于 Web 技术栈，无需安装 LabVIEW Runtime 或任何桌面软件。

### 设计目标

- **零门槛**：打开浏览器即编程，适合教学、原型、IoT 仪表盘快速搭建
- **双视图实时同步**：UI 前面板（人机界面）与 Logic 框图（算法逻辑）一体化，端子自动绑定
- **专业级数据流语义**：支持 Auto-Indexing、Shift Register、Conditional Terminal、Stop/Continue 模式切换等 LabVIEW 核心语义
- **生产可用**：Token 化设计系统、完整暗色模式、60fps 拖拽、批量历史、10万次循环安全保护、拓扑调度、死锁检测

### 核心特性一览

| 维度 | 特性 |
|------|------|
| **数据流** | 拓扑调度、端口就绪触发、并行天然并发 |
| **循环** | For/While 双结构，N / i / 条件终端，Shift Register 配对，隧道 Indexing 切换，For 默认 indexing=true / While 默认 false（对标 LabVIEW） |
| **条件** | Case 结构 Boolean/Number 双模式，Default 分支，Case 隧道 Last Value 语义 |
| **隧道** | 跨层自动创建 Input/Output 双隧道，支持 bothHaveParents 桥接，边框交点 Y 计算，isFullyWired 实心/空心区分，`[]` 索引符号 |
| **数组** | 细/粗双线区分标量/数组，`source.array` 常量可 Drop 元素模板，`array` 控件容器吸收，索引 Stepper |
| **端子** | io.terminal 自动绑定 UI 控件，Control=输出、Indicator=输入，类型 Integer/Real 可切换 |
| **运行** | Batch 模式端口值缓冲、节点状态 idle/running/done/error、Stop 中断、Reset、Step 单步调试、断点 |
| **交互** | 左键拖拽、滚轮缩放、Space 平移、Shift 框选多选、Ctrl+C/V 复制粘贴（保留 ID 映射）、Ctrl+Z/Y Undo/Redo 单次历史、Delete/Backspace 删除（Logic 由 GraphEditor 统一批量历史）、UI 控件右键菜单 |
| **右键菜单** | Logic：BaseNode/StructureNode/TunnelNode/CustomEdge 统一 `bg-popover rounded-lg shadow-xl border`，支持 Delete、Enable/Disable Indexing、Replace with Shift Register、Revert to Tunnel；UI 面板控件支持 Delete/Duplicate/Properties，输入框保留原生菜单 |
| **设计系统** | oklch 变量 --panel/--canvas-bg/--data-*/--status-*，Panel/Field/BadgeDot/Kbd 原语，Button cva 变体，light/dark/system 主题，Geist Variable 字体，tabular-nums 数值 |
| **存储** | localStorage 自动保存（30s interval + 2s 初始）、.webg JSON 文件导入导出（20MB 限）、Blob URL 延迟回收避免下载中断 |

---

## 与 LabVIEW 的关系与差异

| LabVIEW 概念 | WebG 实现 | 差异说明 |
|--------------|-----------|----------|
| **For Loop N** | ✅ 显式 I32，trunc，`max(0,N)` | N 未连时取最短 auto-indexed 数组长度，否则 0 次，LabVIEW 同 |
| **For Loop i** | ✅ 左下蓝色 `i`，I32，0..N-1 | 位置接近 LabVIEW 内侧左下 |
| **For Conditional** | ✅ 右下条件终端，可 Enable，模式 Stop if True / Continue if True，提前 break | LabVIEW 默认不显示，需右键添加 |
| **For Auto-Indexing Input** | ✅ 数组逐元素 `arr[i]`，越界返回类型默认值而非 undefined，warn | LabVIEW 越界返回 default(T)，WebG 已对齐 |
| **For Auto-Indexing Output** | ✅ 每轮收集，结束为数组，0 次时 `[]` | 非 indexing 为 Last Value，0 次时 default 而非 undefined（已修复） |
| **While Stop/Continue** | ✅ 右下条件终端，param `conditionMode`，Badge 显示 Stop if T / Cont if T，图标 ■/↻ 区分 | LabVIEW 右键切换 Continue/Stop，本实现已对齐 |
| **While 至少执行1次** | ✅ do-while 语义，runIteration 先于条件检查 | 一致 |
| **Shift Register** | ✅ pairId 配对，初始化外部连线，未连默认 0，跨迭代 left←right，循环后向外传播，删除自动删 pair | While 未初始化跨 VI 记忆暂未实现（每次重置），可接受 |
| **Case 输出 Last Value** | ✅ 输出隧道非 indexing 时取最后一次值 | 已实现，多分支同 caseId 覆盖、异 case 保留 |
| **Feedback Node** | ❌ 暂未实现 | SR 已满足图灵完备，FN 为语法糖，后续可加 |
| **Parallel For (P Terminal)** | ❌ 串行 `for await` | 大数组性能差，后续可 Promise.all |
| **外观** | For/While 实线 `border-border rounded-lg bg-canvas-bg/50`，N 在左上外侧蓝方块 `N`，i 在左下 `bg-data-integer/10`，条件在右下 Badge | 接近 LabVIEW 但更现代扁平，选中 `ring-ring` token 化 |

---

## 快速开始

### 浏览器直接使用

打开 https://webg.qizhen.xyz → 无需登录。

### 5 分钟第一个程序：(A+B)×C

**UI 视图**：拖入 3 个 Number Input 重命名 A/B/C，1 个 Number Indicator 命名“结果”。

**Logic 视图**：可见 4 个自动端子，拖入 Add + Multiply，连线 `A→Add.A, B→Add.B, Add.result→Multiply.A, C→Multiply.B, Multiply.result→结果`，点击 **Run**，回 UI 改值即时更新。

###  For Loop 累加（Shift Register 示例）

目标：0+1+…+(N-1)

1. UI：Slider 命名 N，Number Indicator 命名 结果
2. Logic：For Loop，N 终端连 Slider 端子，左侧边框右键 **Add Shift Register**，左 SR 外接 Number Constant 0
3. 内部：`左SR → Add.A, i → Add.B, Add.result → 右SR`
4. 外部：右 SR → 结果
5. Run，拖动 N 看累加。

### While Loop 计数至阈值

1. While Loop 右侧边框已固定条件终端（Stop/Cond），左下 i
2. 左侧 SR 初值 0，内部 `左SR + 1 → 右SR`，`右SR → Greater A, Threshold(5) → Greater B, Greater.result → While stop`
3. 条件模式 Properties 设 Stop if True，Max Iterations 1000
4. Run，Display 观察 0..6

### 数组求和（Auto-Indexing）

Source Array `[1,2,3,4,5]` → For Loop Input Tunnel（默认 indexing true，`[]` 符号）→ 内部 Add 与 SR 累加 → Output Tunnel 非 indexing 输出 sum；若 Output Tunnel 启用 indexing 则得到每轮部分和数组。

菜单：Toolbar **Loop Demo** 按钮（Repeat 图标）一键加载上述 For+While 双示例。

---

## 界面与交互

### 整体布局

```
┌──────────────────────────────────────────────────────────────┐
│ Toolbar h-12 bg-card border-b: [W WebG] [Save Load Fit | Run Step Stop Reset] [BadgeDot Idle] [Example LoopDemo Clear | Theme Console Help]
├──────────┬──────────────────────────────────────┬────────────┤
│ Palette  │ Tabs: [UI (border-b-2 active) ] [Logic] │ Properties │
│ w-64     │ Canvas: bg-canvas-bg radial-grid    │ w-64       │
│ bg-panel │ ReactFlow Background hsl(border) 24 │ bg-panel   │
│ border-r │ Controls bg-card border shadow-sm   │ border-l   │
└──────────┴──────────────────────────────────────┴────────────┘
│ Output Console  border-t bg-panel h-160  PanelHeader h-8 + logs mono 12px │
└──────────────────────────────────────────────────────────────┘
```

### 工具栏

| 区域 | 按钮 | 说明 |
|------|------|------|
| 品牌 | W | `bg-foreground text-background` 7x7 圆角 |
| File | Save/Load/Fit | `secondary sm h-7`，Save 生成 `project_YYYY-MM-DD.webg`，Blob 延迟 2s 回收 |
| Execution | Run/Step/Continue | `default h-7`，Run `ExecutionEngine(..., batchMode=true)`，Step 启用 `waitForStep` 断点，Continue 恢复 |
| | Stop/Reset | `secondary/ghost h-7`，Stop 调用 `abort()` + `resetDebug()` |
| 状态 | BadgeDot | `idle/running/paused/error` token 色，pulse 动画 |
| 右侧 | Example/LoopDemo | Lightbulb/Repeat 图标，`ghost h-7 w-7` |
| | Clear | `hover:text-destructive` |
| | Theme | Sun/Moon/Monitor 循环 light→dark→system |
| | Console/Help | Terminal/HelpCircle |

Error Banner：`bg-destructive/10 border-destructive/20` + `BadgeDot error` + 关闭 X。

### 画布操作

| 操作 | 行为 |
|------|------|
| Palette 拖拽 | `screenToFlowPosition` 全局坐标累加祖先链，检测是否在结构内（最深嵌套优先），自动设 parent/caseId，`resolveNodeOverlaps` 避免堆叠 |
| 滚轮 | Ctrl/⌘+滚轮以鼠标为中心缩放（`Math.pow(0.999, deltaY)`），否则平移 |
| 平移 | 空白处左/中键拖拽，`clientX - tx` 差值累积，避免 `movementX` pointer capture 为 0 的坑 |
| 点击节点 | `setSelectedNodeId`，Properties 更新 |
| Delete/Backspace | **Logic**：GraphEditor `deleteKeyCode=["Backspace","Delete"]` → `onNodesChange/remove` 批量收集 → `removeNodes(ids)` 单次历史 + confirm 结构；**UI**：`useKeyboardShortcuts` 仅处理 `selectedControlId`（检测 `.react-flow` 内则交回 GraphEditor），调用 `removeUIControl` 单次历史 |
| 输入框 | `INPUT/TEXTAREA/contentEditable` 时 Delete 不删节点，仅删文字 |
| 框选 | Shift + 拖拽空白，`onSelectionChange → setSelectedNodeIds` |
| 右键 | 见下一节 |

### 连线

- Handle：输入 Left，输出 Right，尺寸 12px，`border-foreground/15`
- 颜色：`getTypeColor` — number `#D97706` amber, integer `#1565C0` blue, boolean `#2E7D32` green, string `#F9A825` yellow, array `#E65100` orange，复用 `--data-*` token
- 类型检查：`sourcePort.type !== any && targetPort.type !== any && type !==` → `typeMismatch` 提示 `bg-destructive text-destructive-foreground rounded-lg shadow-float animate-in`
- 单输入单连：新连自动替换旧连，Case 隧道同 caseId 覆盖、异 case 保留
- 跨层自动隧道：检测 `isBoundaryCrossing`（parent 不同且非 internal port），单层跨越生成 1 隧道，双结构跨越生成双隧道 + 3 边，交点 Y 按 `dy*((borderX-sx)/dx)` 计算，回退 `sGlobal.y`，索引默认值 For true / While false（LabVIEW）

---

## 组件与控制结构参考

### UI 输入（Control → Logic 输出端子）

| 控件 | 类型 | 默认尺寸 | 说明 |
|------|------|----------|------|
| Number Input | number | 140×36 | `bg-card border-input rounded-md`，tabular-nums，Min/Max/Step 可配，整数/实数切换 |
| Button | boolean | 80×36 | Switch 风格 `w-12 h-6 bg-input peer-checked:bg-primary`，轨道+thumb，脉冲信号 |
| Slider | number | 160×44 | `h-1.5 bg-muted accent-primary`，两端 Min/Max + 中间 `bg-muted px-1 rounded` 数值 |
| Knob | number | 72×72 | `bg-card border shadow-sm rounded-full`，旋转 `2.7*percent-135deg`，指针 `bg-foreground` |
| Array Control | array | 160×64 | 左侧 `w-9` 索引列 `▲/▼`，`min 36px`，Drop Element `border-dashed bg-muted/30`，拖入普通控件作元素模板，自动扩宽 |

### UI 输出（Indicator → Logic 输入端子）

| 控件 | 类型 | 默认尺寸 | 说明 |
|------|------|----------|------|
| Number Indicator | number | 120×36 | `bg-muted border rounded-md tabular-nums text-right`，保留 2 位小数 |
| Text Label | string | 140×32 | `bg-card border-dashed rounded-md text-xs` 去螺丝装饰 |
| Gauge | number | 120×90 | 扁平化 `bg-card border rounded-t-full`，刻度 `stroke-muted-foreground/40` 11 档，针 `bg-destructive 0.5px`，中心 `bg-card border`，值 `bg-card border tabular-nums` |
| Indicator Light | boolean | 48×48 | `bg-card border shadow-sm p-1`，内圆 `background: colorOn/Off` + `boxShadow colorOn80` 发光 |
| Tank | number | 56×140 | `bg-muted border rounded-md shadow-inner`，填充 `backgroundColor` + 1px 高光，底部 `bg-foreground/60` 数值 |
| Array Indicator | array | 同 Control | 翻页查看 `arr[index] ?? elementDefault` |

所有控件 `ControlItem` 容器：`rounded-md`，未选中 `hover:outline-border`，选中 `bg-accent/40 outline-ring z-10`，标签 `text-[11px] font-medium tracking-wide text-muted-foreground`，Resize Handles `w-2 hover:bg-ring/20` + `bg-card border-ring rounded-full` SE。

### Logic 逻辑节点

**Math**：Add/Sub/Mul/Div（Div 0 时抛 Error，除数 `isFinite && !=0`，Mul 修复 `B=0 → 0` 而非 `||1` 误判为 1）

**Logic**：Greater/Less/Equal/And/Or/Not

**Sources**：Number/Boolean/String/Array Constant，Array Constant `flex row bg-[#F3F4F6]...` 已保留拟物但 Drop 逻辑 token 化，`innerVal ?? ''` 修复 0 显示空

**Sink**：Display/Console Log（`runtimeLog(formatLogValue, type, nodeId, label)` → `useLogStore`）

**Terminal**：`io.terminal` 动态端口，`params.value` 与 `uiControls.defaultValue` 双向同步，整数/实数切换影响边色

**Tunnel**：`io.tunnel` 透传 `input→output`，`indexing` bool，For 默认 true / While 默认 false，右键菜单 `Enable/Disable Indexing + Replace with Shift Register + Delete`

**Shift Register**：`io.shiftRegister` pairId 关联 left/right，`side` left/right，回退 `Tunnel`，删除自动删 pair

---

## 循环与条件 —— LabVIEW 对标

### For Loop

- **N**：左上外侧 `-left-2 top-3` 小方块 `w-18 h-14 bg-data-integer rounded-[2px] border shadow-sm` 带 `N`，I32，`trunc + max(0)`，未连时取最短索引输入数组长度，否则 0 次
- **i**：左下内部 `bottom-2 left-2 bg-data-integer/10 border-data-integer/30 rounded-md px-1.5 h-18` 蓝色 `i`，I32，0-based
- **Conditional（可选）**：右下 `bottom-2 right-2`，`hasConditional` 开关控制显隐，模式 `stopIfTrue` 红 `bg-destructive/10` / `continueIfTrue` 绿 `bg-emerald-500/10`，图标 `?` + `Stop/Cont` 文字，执行每轮后检查 `shouldBreak = mode==='stopIfTrue'?cond:!cond`
- **Max Iterations**：Properties 可设，0=无限制，超限 `clamped warn`
- **输入越界**：`arr[i]` 超长返回 `defaultForAny(sample)`（number 0 / bool false / string ""）而非 undefined，warn
- **输出**：indexing 收集 `[]`，0 次时空数组；non-indexing 为 Last Value，0 次时 default 0

### While Loop

- **i**：同 For 左下
- **Condition**：右下内部固定，`conditionMode` 切换 Stop/Continue，Badge 显示，红 `■ Stop` / 绿 `↻ Cont`，图标颜色 `var(--status-error/paused)`
- **至少执行1次**：`runIteration` 先于条件检查，do-while
- **Auto-Indexing 默认 false**：与 LabVIEW一致，避免未知次数累积数组
- **Max Iterations**：默认 100k 安全保护，可配置，超时抛 Error

### Shift Register

- 左外初始化 `portValues[left_input] ?? defaultForType`，传播 via `edgeByNodePort`
- 每轮 `right_input → right_output + left_output` 且传播左输出到内部
- 循环后最终值向外传播，若 `right_input` 未连则保持左值避免 NaN
- 未连初值默认 0/false/""，比 undefined→NaN 健壮

### Case Structure

- Boolean 模式 `true/false`，Number 模式 `0/1/2 + Default`
- Selector 绿色 `?` 方块 `16px`，其余端口 `12px`，`getTypeColor`
- 隧道输出 Last Value，多分支同 case 覆盖异 case 保留，`isFullyWired` 检查每 case 是否已连

---

## 快捷键与右键菜单

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| Delete / Backspace | 删除选中（Logic 由 GraphEditor 批量单历史，UI 由 hook） |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z / Ctrl+Y | Redo |
| Ctrl+C | 复制选中节点（单/多） |
| Ctrl+V | 粘贴至 200,200 |
| Ctrl+A | 全选 Logic 节点 |
| Ctrl+0 / Ctrl+= | Zoom Fit |
| Ctrl+F / Ctrl+P | 搜索节点 |
| ? | 快捷键帮助 |
| Shift+Drag 空白 | 框选多节点 |
| Esc | 清空选区 |

输入框聚焦时 Delete/Backspace 仅删文字，不删节点（`tagName INPUT/TEXTAREA/contentEditable` guard）。

### 右键菜单（统一 `bg-popover rounded-lg shadow-xl border py-1 min-w-[160px] text-xs animate-in fade-in zoom-in-95`）

**Logic 面板：**
- **BaseNode**：Properties + 分割线 + Delete Node（destructive）
- **StructureNode**：Properties + Delete For/While/Structure（含子节点 confirm）
- **TunnelNode**：Enable/Disable Indexing + Replace with Shift Register + 分割线 + Delete Tunnel / Revert to Tunnel + Delete Shift Register
- **Edge（CustomEdge）**：g 上右键 Delete Connection，选中时另有红色圆形 `×` 按钮（`bg-destructive`）

**UI 面板（FrontPanel ControlItem）：**
- 空白/标签处右键呼出，输入框内保留原生菜单（`closest('input,textarea,select')` 判断）
- 菜单：头 `label (type)` + 分割线 + Properties + Duplicate（`generateId` 复制 terminal+control 偏移 +20px） + 分割线 + Delete Control（destructive）
- Array 特殊：Stepper `▲/▼` 右键不改索引（`button!==0` 过滤），右键 index 区和内容区均可删整个 Array
- 右键不触发拖拽（`onPointerDown` 首行 `if e.button===2 return`）

---

## 进阶技巧与边界语义

### 类型与线型
- 细单实线标量，粗双实线（中空 `stroke #f8fafc width 2` + 外层 `strokeWidth 5`）数组，颜色随基本类型
- Token 化 `DATA_COLORS` 8 种，`arrayModifiers` 统计 input `--` output `++` 判断是否数组

### N 的确定（For）
```
explicitN = isFinite(Number(inputs.N)) ? trunc : undefined
if explicitN !== undefined → N = max(0, explicitN)
else if For && autoN>=0 (最短索引输入数组) → N = autoN
else N = 0
Warn if explicitN > autoN → out-of-range 将用 default
```

### 空数组/N=0 输出
- Indexing 输出：0 次 → `[]`
- Non-indexing 输出：0 次 → default 0（原 undefined 已修复）

### 输入数组长度不等
取最短，超长部分按 default 补。

### 隧道索引默认值
- For 隧道生成 `indexingDefault = true`，While `false`，其余无；`TunnelNode` fallback 同规则

### Shift Register 未初始化
左侧未连 → `defaultForTunnelType` 0（LabVIEW 应按类型 0/false/“”/[]，当前简化为 0，比 NaN 好）

### 循环超时
- For `maxIterations` 0=无限制，否则 clamp
- While 默认 100k，超限抛 `Exceeded maxIterations`，配置可在 Properties 改

### UI 控件布局
- 智能碰撞：新控件若与现有 `AABB` 重叠且非 Array 吸收 → 弹回原位
- Array 吸收：拖入 Array 容器且同 direction 且非 Array 自身 → `updateUIControl(elementDef + 扩宽) + updateNode(terminal type[] ) + removeNode(被吸收 terminal)`，边自动清理

---

## 系统架构

### 分层

```
┌──────────────────────────────────────────────┐
│ UI 层 React 19 + Tailwind 4 + shadcn/ui     │  IdeLayout, Toolbar, Palette, Properties, FrontPanel, GraphEditor, NodeSearch...
├──────────────────────────────────────────────┤
│ 图管理 Zustand 5                             │  nodes/edges/uiControls CRUD, deepClone 历史栈 50 条, localStorage auto-save 30s
├──────────────────────────────────────────────┤
│ 执行引擎 ExecutionEngine (scheduler.ts)      │  buildMaps edgeByNodePort/nodeMap, detectCycles 按 parent+caseId 分组忽略 tunnel/SR, executeSubgraph 拓扑+runIteration
├──────────────────────────────────────────────┤
│ 节点注册 Registry (registry.ts)              │  source.* / math.* / logic.* / sink.* / io.* / structure.* executor
├──────────────────────────────────────────────┤
│ 运行时 Runtime (useRuntimeStore)             │  portValues[nodeId_port], nodeState idle/running/done/error, waitForStep Promise 竞态用 reject 覆盖, checkIsPaused
└──────────────────────────────────────────────┘
```

### 执行生命周期

1. **Run**：`isRunning=true, error=null, stepMode=false`，`new ExecutionEngine({nodes,edges,uiControls}, runtime, setNodeState, setPortValue, debugCallbacks, batchMode=true)`
2. **环检测**：`detectCycles()` 按 `parent::caseId` 分组，忽略 `io.tunnel/shiftRegister`，DFS `visited/recStack`，有环抛 `Circular Dependency`
3. **初始化**：所有 `nodeState idle`，UI 控件 `portValues[terminal_output]=params.value ?? defaultValue`（control=true 时）
4. **调度** `executeSubgraph(parentId, caseId, activeCase)`：过滤 `nodesInLevel = parent===parentId && (case ? caseId===activeCase)`, 建 `inDegree/deps` 仅同层边（通过 `getAncestorInLevel` 将跨层边映射为层内依赖），`queue` 0 入度，`processedNodes` 追踪，`shouldPause` 断点，`batchMode` 时 `updateNodeState` 跳过仅内存，`executor` 产生 outputs，`setPortValue` + 边传播，`inDegree--`
5. **死锁检测**：剩余 `!processedNodes` → `Deadlock Detected`
6. **Flush**：`batchMode` 时 `flushPortValues` 一次性同步 store
7. **结构**：For/While 分支见上，Case 仅执行 `activeCase`

### 关键数据结构

```ts
NodeInstance { id, type, position:{x,y}, inputs:Port[], outputs:Port[], params:Record, parent?, width?, height?, caseId?, breakpoint? }
Edge { id, sourceNode, sourcePort, targetNode, targetPort }
UIControl { id, type, direction, label, defaultValue, bindingNodeId, x?,y?,width?,height?, min?,max?,step?, colorOn?,colorOff?, numberType?, elementDef? }
RuntimeMemory { portValues: Record<string,any>, nodeState: Record<string,NodeState> }
```

### 错误策略

| 错误 | 条件 | 处理 | 提示 |
|------|------|------|------|
| 除零 | Divide B=0 或 !isFinite | throw, nodeState error | 红环 + tooltip |
| 循环依赖 | 同层 DFS 环 | 执行前检测 | 工具栏红 + Error banner |
| 无限循环 | While count>=max | throw Timeout | Banner |
| 类型不匹配 | Connect 时 `any` 外类型不等 | 前端阻止 + `typeMismatch` `bg-destructive` toast 3s 自动消失 |
| 死锁 | 拓扑剩节点 | throw Deadlock |

---

## 文件格式与兼容性

`.webg` JSON：

```json
{
  "version": "1.1",
  "graph": { "nodes": [...], "edges": [...], "uiControls": [...] },
  "ui": { "panelLayout": {}, "viewport": {} }
}
```

- `version 1.1` 保持，新增 `hasConditional/conditionalMode/conditionMode/maxIterations` 为可选 params，旧文件加载时默认 `false/stopIfTrue/100000`，兼容
- `localStorage` key `webg-project`，含 `version/timestamp/graph`，`loadFromStorage` 校验 `nodes/edges/uiControls` 数组有效性
- 导出：`Blob(JSON.stringify(fileData, null, 2))`，`URL.createObjectURL` 延迟 2s 回收，文件名 `project_YYYY-MM-DD.webg`
- 导入：`FileReader.readAsText`，20MB 限，`data.graph` 或 `data.nodes` 双格式兼容

---

## 本地开发

### 环境

- Node ≥ 18
- 包管理器 pnpm / npm / yarn

### 启动

```bash
git clone https://github.com/ruanqizhen/webg.git
cd webg
pnpm install
pnpm dev
pnpm build
```

### 结构

```
src/
├── components/
│   ├── layout/IdeLayout.tsx (ReactFlowProvider + 双视图 + tabs border-b-2 激活)
│   ├── logic/GraphEditor.tsx (Background hsl(border) gap 24, Controls/MiniMap card, deleteKeyCode, onNodesChange/removeNodes 单历史, validateConnection)
│   ├── logic/nodes/BaseNode.tsx (icon + OptimizedHandle + ArrayConstantNode + 右键 Delete)
│   ├── logic/nodes/StructureNode.tsx (For/While N/i/条件终端 LabVIEW 风格, case 切换, 右键 Delete)
│   ├── logic/nodes/TunnelNode.tsx (类型追踪50层, 索引/ SR 三角, 右键 Indexing/SR/Delete, 订阅式 getState)
│   ├── logic/CustomEdge.tsx (resolveEdgeVisuals, arrayModifiers, 订阅式, 右键 Delete)
│   ├── shared/Toolbar.tsx (Token化 h-12 bg-card, BadgeDot, Example/LoopDemo, Save/Load Fit, Run/Step/Stop/Reset, Theme/Console/Help ghost)
│   ├── shared/Palette.tsx (Panel + FieldInput, accent dot, getNodeColor, deterministic placement)
│   ├── shared/PropertiesPanel.tsx (Panel + Field*, For/While 条件/Max 配置, 批量 orphan 清理 removeNodes)
│   ├── shared/OutputConsole.tsx (PanelHeader + BadgeDot, mono 12px)
│   ├── shared/NodeSearch.tsx & ShortcutCheatsheet.tsx (bg-popover rounded-xl shadow-xl + Kbd)
│   └── ui/ (button cva, panel, field, badge-dot, kbd, FrontPanel flat)
├── engine/
│   ├── registry.ts (forLoop conditional + conditionMode, while conditionMode)
│   └── scheduler.ts (detectCycles 分组忽略 tunnel/SR, for conditional break, while stop/continue, SR 默认值, 越界 default, N=0 LastValue default, While 输入不参与 autoN)
├── store/
│   ├── useGraphStore.ts (copyNodes 保留原ID + idMap, pasteNodes 仅映射在选区内的边, removeNodes/removeEdges 单历史, spawnTunnel For true/While false, saveToStorage/loadFromStorage/startAutoSave 清理 timeout)
│   ├── useRuntimeStore.ts (waitForStep reject superseded, resetDebug reject reset)
│   ├── useUIStore.ts (viewMode, selectedNodeIds/Control/Edge)
│   └── useThemeStore.ts (system 监听单例防 HMR 泄漏)
├── lib/
│   ├── colors.ts (DATA_COLORS/TOKENS, NODE_CATEGORY, STATUS)
│   ├── controlDefaults.ts (专业 muted 调色, 尺寸补全)
│   ├── tokens.ts / index.css (--panel --canvas-bg --data-* --status-* --shadow-*)
│   └── exampleProject.ts & loopExampleProject.ts (温度转换 + For/While 求和/计数示例)
├── types/
│   ├── graph.ts & runtime.ts
│   └── ...
└── hooks/useKeyboardShortcuts.ts (仅处理 UI 控件 Delete，canvas 交回 GraphEditor避免双推)
```

### 扩展节点

```ts
// registry.ts
NodeRegistry['math.pow'] = {
  type: 'math.pow',
  label: 'Power',
  inputs: [{ name: 'Base', type: 'number' }, { name: 'Exp', type: 'number' }],
  outputs: [{ name: 'result', type: 'number' }],
  executor: (ctx) => ({ outputs: { result: Math.pow(Number(ctx.inputs.Base ?? 0), Number(ctx.inputs.Exp ?? 1)) } })
}
```
Palette 自动收录（过滤 io.terminal/tunnel/shiftRegister 后按 `type.split('.')[0]` 分组）。

---

## 技术栈

| 层 | 技术 | 版本 | 备注 |
|----|------|------|------|
| UI | React | 19.2.4 |  |
|  | React DOM | 19.2.4 |  |
| 类型 | TypeScript | 5.9.3 |  |
| 图形 | ReactFlow | 11.11.4 |  |
| 状态 | Zustand | 5.0.12 |  |
| 样式 | Tailwind CSS | 4.2.2 | @tailwindcss/vite |
|  | tailwind-merge / clsx / cva | latest |  |
| 组件 | shadcn/ui + Base UI + Radix Slot + lucide-react 1.7.0 |  | Button cva, Panel 原语自建 |
| 字体 | @fontsource-variable/geist 5.2.8 |  |  |
| 构建 | Vite | 8.0.1 | + @vitejs/plugin-react 6.0.1 |
| Lint | ESLint 9 + typescript-eslint 8.57 |  |  |

---

## FAQ

**Q: 为什么 For Loop 默认 indexing true 而 While 默认 false？**  
A: 对标 LabVIEW：For 次数确定，输入数组自动拆分、输出自动收集为数组是高频；While 次数未知，默认不自动累积，需手动启用。

**Q: 右键菜单不出来？**  
A: 输入框内保留原生菜单，右键标签/空白处才出自定义；隧道非 Loop 内右键被禁用（仅 loop 内可切换 indexing/SR）。

**Q: 删除后 Undo 多次才恢复？**  
A: 已修复为批量单历史：`removeNodes/removeEdges/removeUIControl` 均 `saveToHistory` 一次，多选删除 Undo 一次恢复。

**Q: While 至少执行1次吗？**  
A: 是，do-while 语义，即使 stop 为 true 也先执行一次再检查。

**Q: N=0 时输出是什么？**  
A: Indexing 输出 `[]` 空数组，非 indexing 输出默认值 `0`（原 undefined 已修复）。

**Q: 数组越界呢？**  
A: 返回类型默认值（number 0 / bool false / string ""）并 warn，不再返回 undefined 导致 NaN 传播。

**Q: 如何添加自定义控件？**  
A: 在 `controlDefaults.ts` 加默认，在 `Palette.tsx` `UI_CONTROLS` 加定义，在 `FrontPanel.tsx` `InnerControlRender` 加渲染分支。

---

## 更新日志

### v0.1.1 — Loop 完善 + 删除修复 + UI 右键（当前）
- **For**: 新增条件终端（可 Enable，模式 Stop/Continue），Block 图标 `? Stop/Cont`，Properties 配置，执行期提前 break
- **While**: 新增 conditionMode 切换 Stop if True / Continue if True，Badge 变色，执行期 `shouldStop` 按模式取反
- **Auto-Indexing**: While 输入不参与 autoN，For true / While false 默认值，越界 default 而非 undefined
- **SR 默认值**: 未连初值回落 0 而非 undefined，避免 NaN，右未连保持左值
- **N=0 Last Value**: 非 indexing 输出 0 次时 default 0 而非 undefined
- **外观**: StructureNode 重构 — N 左上外侧蓝方块，i 左下 `bg-data-integer/10`，条件右下 `destructive/10` 或 `emerald/10`，边框实线 `border-border rounded-lg bg-canvas-bg/50`，Header `bg-muted/60` 带 Repeat/RefreshCw 图标和模式 Badge
- **示例**: 新增 `loopExampleProject.ts`，Toolbar Loop Demo 按钮（Repeat 图标）一键加载 For 求和 + While 计数示例
- **删除修复**: GraphEditor 恢复 `deleteKeyCode=["Backspace","Delete"]`，`onNodesChange/remove` 批量 `removeNodes/removeEdges` 单历史，`useKeyboardShortcuts` 仅处理 UI 控件避免双推，解决 Logic 面板 Delete 键失效
- **右键菜单**: BaseNode/StructureNode/TunnelNode/CustomEdge 统一 `bg-popover rounded-lg shadow-xl border`，Delete/Properties/Indexing/Replace SR，其中 BaseNode/StructureNode 新增 Delete，Tunnel 追加 Delete，Edge 右键 Delete Connection
- **UI 面板右键**: FrontPanel ControlItem 新增右键菜单 Delete Control / Duplicate / Properties，右键不触发拖拽（`button===2 return`），输入框内保留原生菜单，Array Stepper 右键不改索引

### v0.1.0 — 设计系统与 Bug 修复
- **Token 化**: `index.css` 补全 `--border/--accent--panel--canvas-bg--data-*/--status-*--shadow-*`，dark 完整
- **原语**: `panel/field/badge-dot/kbd` 抽离，`colors.ts` DATA/NODE/STATUS 集中
- **框架层**: Toolbar `h-12 bg-card` + BadgeDot，Palette 卡片 `border w-0.5 accent dot` 不再 `border-l-4`，Properties 全 Field*，OutputConsole `PanelHeader + BadgeDot`，NodeSearch/ShortcutCheatsheet `bg-popover rounded-xl shadow-xl`
- **画布**: GraphEditor Background `hsl(border) gap 24`，Controls/MiniMap `bg-card border rounded-lg`，typeMismatch `bg-destructive`
- **节点**: BaseNode 选中 `ring-ring` token，Tunnel 选中 `ring-ring`，Structure 去 `#424242` 改 `bg-muted`
- **FrontPanel**: 800 行拟物（金属渐变、内阴影、螺丝、气泡）重写为扁平 `bg-card border-input rounded-md`，Button Switch 风格，Gauge 去 `border-[3px] #d1d5db #111 #0f0` 改 `bg-card border tabular-nums`，Slider/Knob/Tank 简化
- **Bug 58+ 修复**: `copyNodes` 保留原ID + idMap、`pasteNodes` 仅映射选区内边、孤儿 control 跳过、`math.multiply` `||1` → `??1` 误判 0、`substr`→`slice`、Gauge 除零 guard `range===0?0`、`displayVal ||` → `??` 误判 false/0、`waitForStep` 竞态 reject superseded、`queueMicrotask` → `setTimeout(0)` 让出主线程、GraphEditor 多层 parent 坐标全祖先累加、`autoSave` timeout 清理、`inDegree.get!` → existence check NaN、`App.css` 未导入导致 `dashdraw` 失效、`vite.config __dirname` ESM、`getState()` 反模式订阅失效、Case 隧道同 caseId 但多源误删、`controlDefaults` 去重到共享文件、`movementX` pointer capture 0 改 clientX 差值、`Math.random()` render 纯度、`detectCycles` 全局误判跨层隧道为环改为按 parent+caseId 分组忽略 tunnel/SR 等

---

## 版权许可

MIT license — 仅用于学习交流。
