# WebG - 可视化数据流编程环境

## 目录

- [简介](#简介)
- [核心概念](#核心概念)
- [快速上手](#快速上手)
- [界面与操作](#界面与操作)
- [组件参考](#组件参考)
- [控制结构](#控制结构)
- [进阶技巧](#进阶技巧)
- [系统架构](#系统架构)
- [文件格式](#文件格式)
- [本地开发](#本地开发)

---

## 简介

**WebG** 是一款运行在浏览器中的可视化数据流编程工具，灵感来源于 NI LabVIEW。它让用户无需编写传统代码，只需通过**拖拽节点、连接数据线**即可构建完整的算法逻辑与交互界面。

与传统可视化编程工具不同，WebG 完全基于 Web 技术栈，无需安装任何桌面软件，项目文件以标准 JSON 格式保存，天然具备跨平台与版本管理友好性。

**体验地址**：

https://webg.qizhen.xyz


**适合谁使用？**

- 本软件为作者的个人学习项目，仅用于学习交流。

---

## 核心概念

### 数据流范式

WebG 采用**数据流（Dataflow）**执行模型：节点不按代码顺序执行，而是在**所有输入端口均就绪后**自动触发。这意味着并行路径天然并发，执行顺序完全由数据依赖决定。

```
Number(10) ──┐
             ├──► Add ──► Multiply ──► Display
Number(5)  ──┘             ▲
                           │
                      Number(2) ────────┘
```

### 双视图同步架构

程序由两个视图共同描述，二者**实时双向同步**：

| 视图 | 职责 | 核心元素 |
| --- | --- | --- |
| **UI（前面板）** | 设计人机交互界面 | 输入控件、输出指示器 |
| **Logic（逻辑框图）** | 编排程序数据流逻辑 | 节点、连线、结构容器 |

每个 UI 控件在 Logic 视图中都有一个自动绑定的**端子（Terminal）**节点。修改任意一侧，另一侧即时同步；删除其中一个，对应的另一个也随之移除。

---

## 快速上手

### 五分钟运行第一个程序：计算 (A + B) × C

**第一步：设计界面（UI 视图）**

1. 从左侧控件函数选板拖入 3 个 **Number Input**，分别命名为 `A`、`B`、`C`。
2. 拖入 1 个 **Number Indicator**，命名为 `结果`。

**第二步：编排逻辑（Logic 视图）**

3. 切换到 **Logic** 视图，可以看到 4 个自动生成的端子节点。
4. 从控件函数选板拖入 1 个 **Add** 节点和 1 个 **Multiply** 节点。
5. 连线：`A` → `Add.A`，`B` → `Add.B`，`Add.result` → `Multiply.A`，`C` → `Multiply.B`，`Multiply.result` → `结果`。

**第三步：运行**

6. 点击顶部工具栏的 **Run**，切回 **UI** 视图，修改输入值，`结果` 指示器实时更新。

### 进阶示例：用 For Loop 实现 0 到 N 的累加

```
[Slider: N] ──► For Loop (N)
                  │  Shift Register ◄── [Constant: 0]
                  │       │
                  └── Add ─┘
                       │
               [Number Indicator: 结果]
```

详细步骤见[进阶技巧 · 累加示例](#如何编写累加程序)。

---

## 界面与操作

### 整体布局

```
┌──────────────────────────────────────────────────┐
│  Toolbar：[UI] [Logic] │ [▶ Run] [■ Stop] [↺ Reset] │ ● Idle
├──────────┬─────────────────────────────┬──────────┤
│          │                             │          │
│ Palette  │         Canvas              │ Properties│
│ (节点库) │        (中央画布)            │ (属性面板)│
│          │                             │          │
└──────────┴─────────────────────────────┴──────────┘
```

### 工具栏

| 按钮 | 功能 |
| --- | --- |
| UI / Logic | 切换前面板与逻辑框图视图 |
| ▶ Run | 启动执行引擎，开始运行程序 |
| ■ Stop | 中断当前运行，释放运行时状态 |
| ↺ Reset | 清空所有节点运行状态（保留图结构） |
| 🗑 Clear | 清空画布上全部节点与连线 |
| ⊞ Zoom Fit | 自动缩放视图以完整显示所有节点 |

工具栏右侧显示运行状态指示灯：`● Idle`（灰）· `● Running`（蓝）· `● Error`（红）

### 画布操作

| 操作 | 行为 |
| --- | --- |
| 从 Palette 拖拽 | 在释放位置创建节点/控件 |
| 鼠标滚轮 | 以鼠标为中心缩放画布 |
| Space + 拖拽 | 平移画布 |
| 单击节点 | 选中，属性面板更新 |
| Delete / Backspace | 删除选中项及其所有关联连线 |
| Ctrl + C / V | 复制粘贴（含参数，不含连线） |
| Ctrl + Z / Y | 撤销 / 重做 |
| 拖拽空白区域 | 框选多个节点 |

### 连线操作

在 Logic 视图中，将鼠标移到节点端口上，出现连接手柄后**按住左键拖动**到目标端口即可建立数据线。

- 端口颜色：**蓝色** = Number，**绿色** = Boolean，**黄色** = String
- 左侧端口为输入，右侧端口为输出
- 连线必须从 Output 连向 Input，类型不兼容时连线变红并阻止建立
- 每个 Input 端口只接受一条连线；新连线自动替换旧连线

---

## 组件参考

### UI 输入控件（Control）

在 Logic 视图中，输入控件对应**输出类端子**（将用户输入的值输出到图中）。

| 控件 | 数据类型 | 功能说明 |
| --- | --- | --- |
| **Number Input** | Number | 数字输入框，支持键盘直接输入，可配置 Min / Max / Step |
| **Button** | Boolean | 机械式按钮，点击输出一次 `true` 脉冲信号 |
| **Slider** | Number | 滑块控件，直观调节指定范围内的数值 |
| **Knob** | Number | 旋钮控件，模拟硬件调节体验，支持角度限位 |
| **Array Control** | Array | 数组容器。拖入一个普通控件作为元素模板，生成动态长度的同类型数组输入 |

### UI 输出指示器（Indicator）

在 Logic 视图中，指示器对应**输入类端子**（接收图中的计算结果并显示）。

| 控件 | 数据类型 | 功能说明 |
| --- | --- | --- |
| **Number Indicator** | Number | 数字表盘，实时显示数值计算结果 |
| **Text Label** | String | 文本显示区域，支持多行输出 |
| **Gauge** | Number | 半圆形量规，适合监控在 Min~Max 范围内的关键指标 |
| **Indicator Light** | Boolean | 状态灯，`true` 亮起、`false` 熄灭，颜色可配置 |
| **Tank** | Number | 储液罐，垂直模拟水位或容量占比 |
| **Array Indicator** | Array | 数组结果容器，以列表形式展示 Logic 层输出的完整数组，支持翻页查看 |

### Logic 逻辑节点

**数学运算（Math）**

| 节点 | 输入 | 输出 | 功能 |
| --- | --- | --- | --- |
| Add | A, B: Number | result: Number | A + B |
| Subtract | A, B: Number | result: Number | A − B |
| Multiply | A, B: Number | result: Number | A × B |
| Divide | A, B: Number | result: Number | A ÷ B（B = 0 时报错） |

**逻辑运算（Logic）**

| 节点 | 输入 | 输出 | 功能 |
| --- | --- | --- | --- |
| Greater | A, B: Number | result: Boolean | A > B |
| Less | A, B: Number | result: Boolean | A < B |
| Equal | A, B: Any | result: Boolean | A == B |
| And | A, B: Boolean | result: Boolean | A AND B |
| Or | A, B: Boolean | result: Boolean | A OR B |
| Not | A: Boolean | result: Boolean | NOT A |

**常量（Sources）**

| 节点 | 输出类型 | 说明 |
| --- | --- | --- |
| Number Constant | Number | 在参数面板填入固定数值 |
| Boolean Constant | Boolean | 在参数面板选择 true / false |
| String Constant | String | 在参数面板填入固定文本 |
| Array Constant | Array | 在参数面板定义静态数组内容 |

**输出（Sink）**

| 节点 | 说明 |
| --- | --- |
| Display | 在节点上实时显示值，并同步更新绑定的 UI 指示器 |
| Log | 将值输出到控制台（调试用），不影响 UI 显示 |

---

## 控制结构

结构容器是特殊的**容器节点**，内部可放置任意其他节点（包括嵌套结构），形成独立的子图作用域。

### For Loop · 计次循环

```
┌─ For Loop ──────────────────────┐
│  [N] ── 总迭代次数               │
│  [i] ── 当前索引（0 起，只读）   │
│                                  │
│   子图逻辑...                    │
│                                  │
└──────────────────────────────────┘
```

**自动索引（Auto-Indexing）**：将数组连入循环边界，隧道显示 `[ ]`，循环自动按元素逐个拆分，`N` 默认取数组长度。将内部数据连出边界，循环结束后自动将每轮结果拼合成数组输出。

**强制次数**：手动给 `N` 端口连线，可覆盖自动索引的默认次数。

### While Loop · 条件循环

```
┌─ While Loop ────────────────────┐
│                                  │
│   子图逻辑...                    │
│                                  │
│   [stop?] ── 停止条件（Boolean） │
└──────────────────────────────────┘
```

循环持续执行，直到子图内部的 `stop` 端口输出 `true`。同样支持隧道自动索引模式。

> ⚠️ 内置安全机制：超过 **100,000 次**迭代后自动中断，防止浏览器无响应。

### Case Structure · 条件分支

```
┌─ Case: True ──────── [◀ ▶] ─┐
│                               │
│   True 分支的子图逻辑...      │
│                               │
└───────────────────────────────┘
```

类似 `if-else` 或 `switch-case`：

- **Boolean 模式**：Selector 接收 Boolean，执行 True 或 False 分支。
- **Number 模式**：Selector 接收 Number，执行对应编号的分支；需设置 Default 分支处理无匹配情况。
- 点击顶部 ◀ ▶ 箭头切换分支编辑视图；未被选中的分支不参与本次执行。

### Shift Register · 移位寄存器

在循环边框上右键 → **Add Shift Register** 添加。用于在**相邻迭代之间传递数据**：右侧端口的值在本轮结束后，自动成为下一轮左侧端口的输入值。

典型用途：数值累加、状态机、滑动窗口计算。

```
初始值(0) ──► [左端口] ──► Add ──► [右端口]
                              ▲
                              └── i (当前索引)
```

### 数据隧道（Tunnel）

当连线穿越结构容器的边界时，系统自动在边框上生成 Tunnel 节点作为代理，无需手动操作。

```
外部节点 ──► [▶ Input Tunnel] ──► 内部节点 ──► [Output Tunnel ▶] ──► 外部节点
```

删除穿越边界的连线时，对应 Tunnel 自动清除。

---

## 进阶技巧

### 线型与数据类型

WebG 根据数据维度自动调整连线外观：

| 线型 | 含义 |
| --- | --- |
| 细单实线 | 标量数据（Number / Boolean / String） |
| 粗双实线（中空管路） | 数组数据，颜色随基本类型变化（数字蓝、布尔绿） |

### UI 控件布局规则

- UI 视图具备**智能重叠检测**：控件不能互相堆叠，若释放位置已有控件，当前控件自动弹回原位。
- 将普通控件拖入 **Array Control** 容器，该控件自动转变为数组的元素模板。

### 如何编写累加程序

目标：计算 0 + 1 + 2 + ... + (N−1)

1. **UI 视图**：拖入 **Slider**（命名 `N`）和 **Number Indicator**（命名 `结果`）。
2. **Logic 视图**：拖入 **For Loop**，将 `N` 端子连入循环的 `N` 端口。
3. 在循环左侧边框右键 → **Add Shift Register**，在左侧端口连接 **Number Constant(0)** 作为初始值。
4. 循环内部：将 `左侧移位寄存器` 和 `i` 分别连入 **Add** 节点的两个输入。
5. 将 **Add** 的 `result` 连接到 `右侧移位寄存器`。
6. 将右侧移位寄存器（循环外部）连接到 `结果` 端子。
7. 点击 **Run**，拖动 Slider 即可实时看到累加结果。

---

## 系统架构

### 架构分层

```
┌─────────────────────────────────────────┐
│  UI 层 (React + Tailwind)               │  拖拽、连线渲染、控件显示
├─────────────────────────────────────────┤
│  图管理层 (Zustand Store)               │  nodes / edges / uiControls CRUD
├─────────────────────────────────────────┤
│  执行引擎 (Scheduler + Registry)        │  调度、节点逻辑定义
├─────────────────────────────────────────┤
│  运行时内存 (Runtime)                   │  portValues / nodeState 高频更新
└─────────────────────────────────────────┘
```

### 执行生命周期

每次点击 **Run**，引擎按以下步骤处理：

1. **图解析**：将 JSON 存储结构转化为运行时节点表与邻接关系。
2. **环路检测**：DFS 遍历检测有向环，发现则立即中止并定位环路路径。
3. **拓扑排序**：按数据依赖关系排序，确保每个节点在所有上游节点完成后执行。
4. **层级调度**：递归调用 `executeSubgraph`，为循环和条件结构建立独立作用域。
5. **数据传播**：节点执行结果通过连线推送到下游端口，触发 UI 实时更新。

### 核心数据结构

```ts
// 节点实例
interface NodeInstance {
  id:       string;
  type:     string;
  position: { x: number; y: number };
  inputs:   Port[];
  outputs:  Port[];
  params:   Record<string, any>;
  parent?:  string;  // 父容器节点 ID，支持嵌套
}

// 连线
interface Edge {
  id:         string;
  sourceNode: string;
  sourcePort: string;
  targetNode: string;
  targetPort: string;
}

// UI 控件
interface UIControl {
  id:            string;
  type:          string;
  label:         string;
  bindingNodeId: string;   // 对应 Logic 层端子节点 ID
  defaultValue:  any;
}

// 运行时内存
interface RuntimeMemory {
  portValues: Map<string, any>;        // portId → 当前值
  nodeState:  Map<string, NodeState>;  // nodeId → 执行状态
}

type NodeState = 'idle' | 'ready' | 'running' | 'done' | 'error';
```

### 节点注册机制

在 `src/engine/registry.ts` 中注册自定义节点：

```ts
registry.register({
  type:    'math.add',
  label:   'Add',
  inputs:  [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
  outputs: [{ name: 'result', type: 'number' }],
  executor: (ctx) => ({
    outputs: { result: ctx.inputs.A + ctx.inputs.B }
  })
});
```

### 错误处理策略

| 错误类型 | 触发条件 | 处理方式 | 用户提示 |
| --- | --- | --- | --- |
| 除零 | Divide 节点 B = 0 | 节点置为 Error，停止向下传播 | 节点变红，tooltip 显示原因 |
| 循环依赖 | 图中存在有向环路 | 执行前强制检测，中止整个流程 | 工具栏变红，提示环路节点 |
| 类型不匹配 | 连接不兼容端口 | 前端实时阻止建立连线 | 连线变红，显示类型说明 |
| 无限循环 | While Loop 超出阈值 | 强制中断，节点置为 Error | 提示超时次数 |
| 死锁 | 无节点可调度 | 引擎主动检测并报错 | 提示 Deadlock |

---

## 文件格式

项目保存为 `.webg` 文件（本质为 JSON），具备完整的可序列化与版本管理友好性：

```json
{
  "version": "1.1",
  "graph": {
    "nodes": [...],
    "edges": [...],
    "uiControls": [...]
  },
  "ui": {
    "panelLayout": {},
    "viewport": {}
  }
}
```

---

## 本地开发

### 环境要求

- Node.js ≥ 18
- pnpm / npm / yarn

### 启动步骤

```bash
# 克隆仓库
git clone https://github.com/ruanqizhen/webg.git
cd webg

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

### 项目结构

```
src/
├── components/          # React UI 组件
│   ├── canvas/          # 画布与节点渲染
│   ├── palette/         # 左侧节点库
│   └── properties/      # 右侧属性面板
├── engine/
│   ├── registry.ts      # 节点注册表
│   ├── scheduler.ts     # 执行调度器
│   └── runtime.ts       # 运行时内存管理
├── store/
│   ├── graphStore.ts    # 图结构状态（Zustand）
│   ├── runtimeStore.ts  # 运行时状态
│   └── uiStore.ts       # 界面状态
└── types/               # TypeScript 类型定义
```

### 扩展自定义节点

1. 在 `src/engine/registry.ts` 中调用 `registry.register()` 注册节点定义。
2. 在 `src/components/palette/` 中将新节点加入对应分类的控件函数选板列表。
3. （可选）在 `src/components/canvas/` 中提供自定义节点渲染组件。

---

## 技术栈

| 层 | 技术 | 版本 |
| --- | --- | --- |
| UI 框架 | React | 18 |
| 类型系统 | TypeScript | 5 |
| 图形引擎 | React Flow | 11 |
| 状态管理 | Zustand | 4 |
| UI 组件 | shadcn/ui | latest |
| 样式 | Tailwind CSS | 3 |
| 构建工具 | Vite | 5 |

---

## License

MIT © WebG Contributors