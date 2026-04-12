# WebG - 可视化数据流编程环境

WebG 是一款受 **LabVIEW** 启发的现代化、基于网页的可视化编程工具。它允许用户在 **UI (界面面板)** 与 **Logic (逻辑框图)** 之间无缝切换，通过连接节点（Nodes）和数据线（Wires）来构建复杂的算法和交互界面。

---

## 🚀 核心架构

WebG 采用经典的**双视图同步**架构：
- **UI (前面板)**：用于设计人机交互界面。在此放置输入控件（如按钮、旋钮）和显示指标（如仪表盘、图表）。
- **Logic (逻辑框图)**：用于编排程序逻辑。每个 UI 控件在此都有一个对应的**端子 (Terminal)**，通过连线实现数据传递。

---

## 🛠 操作指南

### 1. 界面切换
使用顶部工具栏的 **UI** 和 **Logic** 标签在两个视图间切换。
- 在 **UI** 视图中，左侧调色板显示交互控件。
- 在 **Logic** 视图中，左侧调色板显示数学、逻辑和结构节点。

### 2. 放置与布局
- **拖放操作**：从左侧调色板拖拽组件到画布上，或点击组件图标直接在默认位置创建。
- **自动对齐**：UI 视图具备智能重叠检测。控件不能互相堆叠，若释放位置已有控件，当前控件将自动弹回。
- **容器化**：将普通控件拖入 **Array Control** 容器中，该控件将自动转变为数组的元素模板。

### 3. 连接逻辑
- 在 Logic 视图中，将鼠标移动到节点的端口（Port）上，按下左键并拖动到另一个兼容端口以建立**数据线 (Wire)**。
- 端口左侧为输入，右侧为输出。**蓝色表示数值，绿色表示布尔值。**
- **数据隧道 (Tunnel)**：当连线穿越循环或条件结构的边界时，会自动生成隧道。

---

## 📦 组件参考

### UI 控件 (Input)
| 控件 | 功能说明 |
| :--- | :--- |
| **Number Input** | 基础数字输入框，支持直接键入。 |
| **Button** | 机械式按钮，提供布尔脉冲信号。 |
| **Slider** | 滑块控件，用于直观调节数值范围（如 0-100）。 |
| **Knob** | 旋钮控件，模拟硬件调节体验。 |
| **Array Control** | **数组容器**。可吸纳一个普通控件作为模板，生成动态长度的同类型数组输入。 |

### UI 指示器 (Output)
| 控件 | 功能说明 |
| :--- | :--- |
| **Number Indicator** | 显示数值结果的数字表盘。 |
| **Text Label** | 文本显示区域。 |
| **Gauge** | 半圆形量规显示器，用于监控关键指标。 |
| **Indicator Light** | 状态灯，根据布尔值亮起/熄灭。 |
| **Tank** | 储液罐显示器，垂直模拟水位或容量。 |
| **Array Indicator** | **数组结果容器**。显示 Logic 层收集到的数组全集，支持翻页查看。 |

### Logic 逻辑节点
- **Math（数学）**: `Add` (+), `Subtract` (-), `Multiply` (×), `Divide` (÷)。
- **Logic（逻辑）**: `Greater` (>), `Less` (<), `Equal` (=), `And`, `Or`, `Not`。
- **Sources（常量）**: 支持数字、布尔、字符串以及**数组常量**的静态定义。

---

## 🔄 结构容器 (Structures)

WebG 提供了强大的流程控制能力：

### 1. For Loop (计次循环)
- **自动索引 (Indexing)**：将数组连入循环，入口隧道显示 `[ ]`。循环将自动按元素拆分，执行次数 `N` 默认为数组长度。
- **结果收集**：将内部数据连出循环，出口隧道显示 `[ ]`。循环结束后会自动拼合成一个数组输出。
- **强制次数**：也可手动给 `N` 端口连线来指定固定运行次数。

### 2. While Loop (条件循环)
- 执行直到满足停止条件。通过内部的 **Stop** 端口控制。
- 同样支持隧道索引和非索引模式切换。

### 3. Case Structure (条件结构)
- 类似于 `if-else` 或 `switch-case`。
- 支持 **Boolean (真/假)** 和 **Number (多分支)** 模式。
- 点击顶部的左右箭头可切换不同分支的编辑视图。

### 4. Shift Register (移位寄存器)
- 用于在循环的相邻迭代之间传递数据（例如：实现数值累加）。
- 右侧端口的值会被“移位”到下一轮迭代的左侧端口。

---

## 🎨 编程进阶技巧

### 数组与线型 (Wires)
WebG 会根据数据维度自动调整线型：
- **普通数据线**：细单实线。
- **数组数据线**：蓝白相间的**粗双实线**（类似于中空的管路），颜色随基本类型变化（数字蓝、布尔绿）。

### 如何编写第一个程序 (累加示例)
1. 在 **UI** 放置一个 **Slider** (输入 N) 和 **Number Indicator** (显示结果)。
2. 切换到 **Logic**。
3. 放置一个 **For Loop**。将 Slider 连入 `N`。
4. 在 For Loop 左侧边框右键点击选择 **Add Shift Register**。
5. 在左侧端子初始值连接一个 `0` 常量。
6. 在循环内部：将 `左侧移位寄存器` + `i (迭代索引)` 连接到 `Add`。
7. 将 `Add` 的输出连接到 `右侧移位寄存器`。
8. 将最终输出连出循环到 **Number Indicator**。
9. 点击 **Run** 即可看到自动计算 0 到 N 的累加和。

---

## 🛠 开发环境
- **核心框架**: React 18 + TypeScript
- **图形引擎**: React Flow
- **状态管理**: Zustand
- **样式**: Tailwind CSS

---


## 🎨 视觉与交互规范

### 1. 节点解剖 (Node Anatomy)

```text
+--------------------------------------+
| [图标]  节点名称           [类型标签]  |  ← Header
|--------------------------------------|
| ● input_A        result ●            |  ← Body / Ports
| ● input_B                            |
+--------------------------------------+
```

| 节点类型 | 颜色 | 代表含义 |
| :--- | :--- | :--- |
| **Source** | 绿色 | 数据来源（常量、Terminal 输出） |
| **Math** | 蓝色 | 数学运算（加减乘除等） |
| **Logic** | 紫色 | 逻辑判断（比较、布尔运算） |
| **Control** | 橙色 | 运行流控制（Display、Log） |
| **Structure** | 灰色 | 容器结构（Loop、Case） |

### 2. 连线规则 (Wiring Rules)

- **方向性**: 必须从 `Output` 端口连接到 `Input` 端口。
- **单输入限制**: 每个 `Input` 端口只能接受一根连线。新连线会自动替换旧连线。
- **类型安全**: 引擎在连线时会自动校验端点类型。

---

## 🏗️ 系统设计与技术细节 (Technical Deep Dive)

### 1. 执行驱动模型 (Execution Engine)

WebG 采用**分层数据流执行模型 (Hierarchical Dataflow Engine)**。每次运行都会经历以下生命周期：

1. **图解析 (Graph Parsing)**: 将 JSON 存储结构转化为运行时节点表。
2. **环路检测 (Cycle Detection)**: 使用深度优先搜索 (DFS) 检测死锁环路。
3. **拓扑排序 (Topological Sort)**: 对节点按数据依赖关系进行排序，确保下游节点在输入就绪后执行。
4. **层级调度 (Hierarchical Scheduling)**: 引擎通过递归调用 `executeSubgraph`，实现嵌套结构（如循环内部）的独立作用域管理。
5. **异步传播 (Data Propagation)**: 执行结果通过线连接异步推送到目标端口，触发 UI 实时更新。

### 2. 系统架构分层

| 模块 | 职责 |
| :--- | :--- |
| **UI 层** | 基于 React + Tailwind，处理拖拽、连线视觉及控件渲染。 |
| **图管理层 (Store)** | 使用 Zustand 维护 `nodes`, `edges`, `uiControls` 的 CRUD。 |
| **执行引擎 (Engine)** | 包含 `scheduler` (核心调度) 与 `registry` (节点逻辑定义)。 |
| **运行时内存 (Runtime)** | 存储高频更新的 `portValues` 与节点状态。 |

### 3. 核心数据结构

```ts
// 节点实例定义
interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  inputs: Port[];
  outputs: Port[];
  params: Record<string, any>;
  parent?: string; // 支持嵌套
}

// UI 控件定义
interface UIControl {
  id: string;
  type: string;
  label: string;
  bindingNodeId: string; // 绑定到逻辑端子的 ID
  defaultValue: any;
  // ...位置与样式属性
}
```

### 4. 节点注册机制 (Node Registry)

开发者可以通过在 `src/engine/registry.ts` 中注册新节点来扩展功能。每个节点定义包含输入输出端口声明及 `executor` 同步/异步函数：

```ts
'math.add': {
  type: 'math.add',
  label: 'Add',
  inputs: [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
  outputs: [{ name: 'result', type: 'number' }],
  executor: (ctx) => ({ outputs: { result: ctx.inputs.A + ctx.inputs.B } })
}
```

### 5. 错误处理策略

| 错误类型 | 处理方式 |
| :--- | :--- |
| **除零错误** | 节点状态置为 `Error`，并在连接处显示提示。 |
| **循环依赖** | 运行前强制检测，中止整个执行流程，保护浏览器。 |
| **类型不匹配** | 连线时前端实时阻止，执行期进行强制类型转换保护。 |
| **无限循环** | 设置 `maxLoopIterations` (默认 100,000 次) 超时自动中断。 |

---

## 📅 文件存储格式

项目保存逻辑采用 `.webg` (JSON) 格式，包含 `version`, `nodes`, `edges`, `uiControls` 四个顶层字段，确保工程可序列化与离线存储。
