# WebG 可视化编程工具

产品需求文档 & 系统设计规范 · v1.1

---

# 第一部分：产品定义

## 1. 产品概述

WebG 是一个受 **LabVIEW** 启发的网页可视化编程环境。用户可以通过**拖拽节点 + 连线**构建数据流程序，并通过 **UI 控件**与程序交互。

系统包含两个核心视图，二者**自动同步绑定**：

- **Front Panel（前面板）**：用于设计用户界面，放置输入与输出控件。
- **Block Diagram（逻辑图）**：用于构建数据流逻辑节点与连线关系。

用户最终可以：

- 拖拽 UI 控件，配置标签与默认值
- 搭建逻辑节点，建立数据流图
- 构建循环（For / While）与条件（Case）结构
- 一键运行程序，在 UI 上实时查看结果

---

## 2. 目标用户

| 用户类型 | 主要使用场景 |
| --- | --- |
| 作者本人 | 技术实验与系统设计探索 |

---

## 3. 核心设计范式

### 3.1 数据流编程（Dataflow）

节点只有在**所有输入端口均就绪**时才会执行。执行顺序由**数据依赖关系**决定，而非代码书写顺序。

```
A ----\
       Add ----> Multiply ----> Display
B ----/
```

上例中，Add 节点等待 A 与 B 均就绪后执行，结果流向 Multiply，再传至 Display。

### 3.2 双视图架构（Front Panel / Block Diagram）

两个视图同步绑定，规则如下：

- 在 Front Panel 新建 UI 控件 → Block Diagram 中**自动生成**对应的 Terminal Node
- 在 Block Diagram 删除 Terminal Node → **同步删除** Front Panel 中对应的 UI 控件
- 修改控件属性（Label、默认值等）→ 两视图**即时同步**

### 3.3 层级图结构（Hierarchical DAG）

逻辑图支持两类节点：

- **普通节点**：数学运算、逻辑判断、输入/输出等
- **容器节点（结构）**：Case、For Loop、While Loop，内部可嵌套任意节点，形成**层级有向无环图（DAG）**

---

# 第二部分：界面与交互

## 4. 整体界面布局

采用经典 IDE 三栏布局：

```
+--------------------------------------------------+
| Toolbar                                          |
+------------+----------------------+--------------+
| Palette    | Canvas               | Properties   |
| (左侧节点库) | (中央画布)            | (右侧属性面板) |
+------------+----------------------+--------------+
```

| 区域 | 说明 |
| --- | --- |
| Toolbar（顶部工具栏） | 视图切换、运行控制、画布操作 |
| Palette（左侧节点库） | 可拖拽的节点/控件分类列表 |
| Canvas（中央画布） | Front Panel UI 画布 或 Block Diagram 节点图 |
| Properties（右侧属性面板） | 当前选中对象的属性配置 |

---

## 5. 顶部工具栏（Toolbar）

| 按钮/元素 | 功能说明 |
| --- | --- |
| UI / Logic 切换 | 在 Front Panel 与 Block Diagram 之间切换视图 |
| Run | 触发执行引擎，开始运行当前程序图 |
| Stop | 中断当前运行，释放运行时状态 |
| Reset | 清空所有节点的运行状态（不清除图结构） |
| Clear Canvas | 清空画布上所有节点与连线 |
| Zoom Fit | 将视图缩放并平移至完整显示所有节点 |

### 运行状态指示

工具栏右侧显示当前程序状态：

| 状态 | 颜色 | 说明 |
| --- | --- | --- |
| ● Idle | 灰色 | 程序未运行，等待用户触发 |
| ● Running | 蓝色 | 程序正在执行中 |
| ● Error | 红色 | 执行过程中遇到错误，已停止 |

---

## 6. 画布通用交互

| 操作 | 行为 |
| --- | --- |
| 从 Palette 拖拽节点/控件 | 在鼠标释放位置创建节点 |
| 鼠标滚轮 | 缩放画布（以鼠标位置为中心） |
| Space + 拖拽 | 平移画布 |
| 点击节点/控件 | 选中，右侧属性面板更新 |
| Delete / Backspace | 删除选中节点及其所有关联连线 |
| Ctrl + C / V | 复制粘贴节点（含参数，不含连线） |
| Ctrl + Z / Y | 撤销 / 重做 |
| 框选（空白区域拖拽） | 多选节点 |

---

# 第三部分：Front Panel（UI 设计界面）

## 7. 界面说明

Front Panel 画布是一个可拖拽布局的网格区域，用户在此放置 UI 控件，设计程序的人机交互界面。控件分为两类：

- **控制器（Control）**：接收用户输入，在 Block Diagram 中对应**输出类 Terminal**（向图中输出值）。
- **指示器（Indicator）**：显示程序输出，在 Block Diagram 中对应**输入类 Terminal**（从图中接收值）。

---

## 8. 支持的 UI 控件

| 控件名称 | 数据类型 | 控件分类 | 说明 |
| --- | --- | --- | --- |
| 按钮（Button） | Boolean | 控制器 | 点击切换 true/false，触发逻辑 |
| 数字输入框（Number Input） | Number | 控制器 | 输入数值，支持 Min/Max/Step 约束 |
| 数字指示器（Number Indicator） | Number | 指示器 | 只读显示数字运算结果 |
| 文本标签（Text Label） | String | 指示器 | 显示字符串输出 |
| 仪表盘（Gauge） | Number | 指示器 | 圆形表盘可视化数值，支持 Min/Max 范围 |
| 灯泡（Indicator Light） | Boolean | 指示器 | 点亮/熄灭表示 true/false 状态 |

---

## 9. 控件属性配置

在 Front Panel 中选中控件后，右侧属性面板显示以下可配置项：

| 属性 | 类型 | 适用控件 | 示例 |
| --- | --- | --- | --- |
| Label | String | 所有控件 | "循环次数" |
| Default Value | Any | 所有控件 | 10 |
| Min | Number | 数字类控件、仪表盘 | 0 |
| Max | Number | 数字类控件、仪表盘 | 100 |
| Step | Number | 数字输入框 | 1 |
| Width / Height | Number (px) | 所有控件 | 200 |
| Color (On/Off) | Color | 按钮、灯泡 | #4CAF50 / #ccc |

---

## 10. UI → Logic 自动绑定

每个 UI 控件在 Block Diagram 中自动生成一个对应的 Terminal Node，示例：

```
Front Panel:  [ 数字输入框：循环次数，默认值 = 10 ]

Block Diagram 自动生成：
  Terminal Node
    id:        terminal_xxxx
    label:     循环次数
    type:      Number
    direction: output   （控制器 → 向图中输出值）
```

> ⚠️ **删除规则**：在 Block Diagram 中删除 Terminal Node，同步删除对应 UI 控件；在 Front Panel 删除控件，同步删除对应 Terminal Node。两视图始终保持一致。

---

# 第四部分：Block Diagram（逻辑编排）

## 11. 界面说明

Block Diagram 使用 **React Flow** 构建，是程序逻辑的核心编辑区域。用户在此拖拽节点、连接端口，搭建数据流图。节点可嵌套在结构容器（Case / For Loop / While Loop）中形成子图。

---

## 12. 节点解剖（Node Anatomy）

### 12.1 节点结构

```
+--------------------------------------+
| [图标]  节点名称           [类型标签]  |  ← Header
|--------------------------------------|
| ● input_A        result ●            |  ← Body / Ports
| ● input_B                            |
+--------------------------------------+
```

### 12.2 Header 颜色规范

| 节点类型 | 颜色 | 代表含义 |
| --- | --- | --- |
| Source | 绿色 `#388E3C` | 数据来源（常量、Terminal 输出） |
| Math | 蓝色 `#1565C0` | 数学运算（加减乘除等） |
| Logic | 紫色 `#6A1B9A` | 逻辑判断（比较、布尔运算） |
| Control | 橙色 `#E65100` | 控制流（Display、Log 等 Sink 节点） |
| Structure | 灰色 `#546E7A` | 容器结构（Case、For Loop、While Loop） |

### 12.3 端口颜色规范

| 数据类型 | 端口颜色 | 说明 |
| --- | --- | --- |
| Number | 蓝色 `#1565C0` | 整数或浮点数 |
| Boolean | 绿色 `#388E3C` | true / false |
| String | 黄色 `#F9A825` | 文本字符串 |
| Array | 橙色 `#E65100` | 数组（未来扩展） |

端口位置：**左侧为输入端口，右侧为输出端口**。端口悬停时显示端口名称与类型 tooltip。

---

## 13. 基础节点库

### 13.1 Sources（数据源）

| 节点 | 输出端口 | 功能说明 |
| --- | --- | --- |
| Number Constant | value: Number | 用户在 params 中填入一个固定数字，节点运行时直接输出该值 |
| Boolean Constant | value: Boolean | 用户选择 true 或 false，节点运行时直接输出该值 |
| String Constant | value: String | 用户填入一段文本，节点运行时直接输出 |

### 13.2 Math（数学运算）

| 节点 | 输入 | 输出 | 功能 |
| --- | --- | --- | --- |
| Add | A: Number, B: Number | result: Number | result = A + B |
| Subtract | A: Number, B: Number | result: Number | result = A - B |
| Multiply | A: Number, B: Number | result: Number | result = A × B |
| Divide | A: Number, B: Number | result: Number | result = A ÷ B；除数为 0 时节点报错 |

### 13.3 Logic（逻辑运算）

| 节点 | 输入 | 输出 | 功能 |
| --- | --- | --- | --- |
| Greater | A: Number, B: Number | result: Boolean | result = A > B |
| Less | A: Number, B: Number | result: Boolean | result = A < B |
| Equal | A: Any, B: Any | result: Boolean | result = A == B（类型需一致） |
| And | A: Boolean, B: Boolean | result: Boolean | result = A AND B |
| Or | A: Boolean, B: Boolean | result: Boolean | result = A OR B |
| Not | A: Boolean | result: Boolean | result = NOT A |

### 13.4 Sink（输出节点）

| 节点 | 输入端口 | 功能说明 |
| --- | --- | --- |
| Display | value: Any | 将接收到的值显示在节点上，同时同步更新 Front Panel 中绑定的指示器控件 |
| Log | value: Any | 将值输出到控制台（开发者调试用），不影响 UI |

---

# 第五部分：控制结构（Structures）

## 14. 概述

控制结构是特殊的**容器节点**，内部可放置任意其他节点（包括嵌套结构），形成子图。当连线需要穿越结构边界时，系统自动生成**数据隧道（Tunnel）**作为代理。

---

## 15. Case Structure（条件分支）

### 15.1 视觉布局

```
+----------------------------------+
| Case: True           [◀  ▶]      |
|                                  |
|   (子节点区域 — True 分支)        |
|                                  |
+----------------------------------+
```

### 15.2 端口与属性

| 属性/端口 | 说明 |
| --- | --- |
| Selector 输入端口 | 接收 Boolean 或 Number 类型，决定执行哪个分支 |
| Case 列表 | 支持 True/False（Boolean 模式）或 Case 0/1/2...（Number 模式） |
| 子图区域 | 每个 Case 有独立的子图，通过顶部标签页切换编辑 |
| 默认 Case | Number 模式下须设置一个 Default Case，selector 无匹配时执行 |

### 15.3 执行规则

```
selector = evaluate(input)
if selector == true  →  执行 True 子图
else                 →  执行 False 子图

// Number 模式：
switch(selector):
  case 0  →  执行 Case 0 子图
  case 1  →  执行 Case 1 子图
  default →  执行 Default 子图
```

> ⚠️ 只有被选中的分支子图参与本次执行，其余分支不执行。若某分支存在 Output Tunnel，未执行分支仍需提供默认值以保证下游节点可以就绪。

---

## 16. For Loop（计次循环）

### 16.1 视觉布局

```
+---------------------------+
| For Loop                  |
|  [N] ─── 迭代总次数        |
|  [i] ─── 当前索引（只读）  |
|                           |
|   (子节点逻辑)             |
|                           |
+---------------------------+
```

### 16.2 端口说明

| 端口 | 方向 | 类型 | 说明 |
| --- | --- | --- | --- |
| N | 输入 | Number | 循环总次数，必须为正整数；运行前需已就绪 |
| i | 输出 | Number | 当前循环索引，从 0 开始，可在子图内使用 |

### 16.3 执行算法

```
N = input(N)  // 取整，N 需 >= 0
for i = 0; i < N; i++:
    runtime.set("i", i)
    execute(subgraph)
```

---

## 17. While Loop（条件循环）

### 17.1 视觉布局

```
+---------------------------+
| While Loop                |
|                           |
|   (子节点逻辑)             |
|                           |
| [stop?] ── 停止条件输入    |
+---------------------------+
```

### 17.2 端口说明

| 端口 | 方向 | 类型 | 说明 |
| --- | --- | --- | --- |
| stop | 输入（来自子图内部） | Boolean | 每轮执行结束后检查：true = 停止，false = 继续 |

### 17.3 执行算法

```
iteration = 0
while true:
    execute(subgraph)
    iteration++
    if stop == true: break
    if iteration > maxLoopIterations: raise TimeoutError
```

> ⚠️ **安全机制**：`maxLoopIterations` 默认为 **100,000** 次。超出后程序自动停止并显示 Timeout 错误，防止无限循环挂起浏览器。

---

## 18. 数据隧道（Tunnel）

### 18.1 概述

当连线需要穿越结构容器的边界时，系统自动生成 Tunnel 节点作为代理：

```
外部节点 ──► [Input Tunnel] ──► 内部节点 ──► [Output Tunnel] ──► 外部节点
```

### 18.2 Tunnel 类型

| 类型 | 位置 | 功能 |
| --- | --- | --- |
| Input Tunnel | 结构容器左侧边框 | 将外部节点的输出值注入子图，供内部节点使用 |
| Output Tunnel | 结构容器右侧边框 | 将子图内部节点的输出值传出，供外部节点使用 |

### 18.3 自动创建规则

- 用户将外部节点的输出端口连接至结构内部节点的输入端口时，系统自动在边界创建 Input Tunnel。
- 用户将内部节点的输出端口连接至结构外部节点的输入端口时，系统自动在边界创建 Output Tunnel。
- 删除穿越边界的连线时，对应 Tunnel 自动删除。

---

# 第六部分：连线规则

## 19. 方向规则

连线方向必须为：

```
Output 端口  →  Input 端口
```

| 连接方式 | 是否合法 | 说明 |
| --- | --- | --- |
| Output → Input | ✅ 合法 | 数据从源流向目标 |
| Input → Input | ❌ 非法 | 无法建立连接 |
| Output → Output | ❌ 非法 | 无法建立连接 |

---

## 20. 类型匹配规则

连线两端的数据类型必须一致，否则系统阻止连接并显示类型错误提示。

| 源端口类型 | 目标端口类型 | 连接结果 |
| --- | --- | --- |
| Number | Number | ✅ 允许 |
| Boolean | Boolean | ✅ 允许 |
| String | String | ✅ 允许 |
| Number | Boolean | ❌ 阻止，连线变红并显示类型不匹配提示 |
| Boolean | Number | ❌ 阻止 |
| String | Number | ❌ 阻止 |

---

## 21. 单输入限制

每个 Input 端口只能接受**一条连线**。若已有连线，新连线会替换旧连线（而非并联），旧连线自动删除。

---

## 22. 连线视觉反馈

| 状态 | 视觉表现 |
| --- | --- |
| 正常连线 | 蓝灰色曲线，悬停高亮 |
| 类型不匹配（拖拽中） | 连线变红，端口显示错误提示 tooltip |
| 选中连线 | 加粗高亮，显示删除按钮 |
| 运行时数据流动 | 动画闪烁，颜色与端口数据类型一致 |

---

# 第七部分：执行引擎

## 23. 执行模型总览

WebG 采用**分层数据流执行模型（Hierarchical Dataflow Engine）**。每次运行时，引擎解析当前 Graph，生成执行计划后顺序驱动节点执行。

| 执行步骤 | 说明 |
| --- | --- |
| 1. Graph Parsing | 从 Graph JSON 解析节点列表与连线关系 |
| 2. Cycle Detection | 使用 DFS 检测有向环，有环则中止并报错 |
| 3. Topological Sort | 对节点按数据依赖关系做拓扑排序，得到合法执行顺序 |
| 4. Node Execution | 按顺序执行节点，每个节点读取输入、运行 executor、写入输出 |
| 5. Data Propagation | 将节点输出值通过连线传递到下游节点的输入端口 |

---

## 24. 系统架构分层

```
+------------------------------------+
| UI Layer                           |  Front Panel / Block Diagram Editor
+------------------------------------+
| Graph Editor Layer                 |  Graph Manager / Node Registry
+------------------------------------+
| Execution Engine                   |  Dataflow Engine / Scheduler
+------------------------------------+
| Runtime State / Memory             |  portValues / nodeState Map
+------------------------------------+
```

| 模块 | 职责 |
| --- | --- |
| Graph Manager | 管理节点图的 CRUD，维护 nodes / edges / uiControls 数据 |
| Node Registry | 注册所有节点类型及其执行器（executor） |
| Execution Engine | 解析图、拓扑排序、驱动节点执行、传播数据 |
| Runtime Memory | 存储端口值与节点运行状态，供 UI 层实时渲染 |

---

## 25. 核心数据结构

### 25.1 Graph

```ts
interface Graph {
  nodes:      NodeInstance[]
  edges:      Edge[]
  uiControls: UIControl[]
}
```

### 25.2 NodeInstance

```ts
interface NodeInstance {
  id:       string           // UUID
  type:     string           // 节点类型，对应 NodeDefinition.type
  position: { x: number, y: number }
  inputs:   Port[]
  outputs:  Port[]
  params:   Record<string, any>  // 节点参数（如常量值）
  parent?:  string           // 父容器节点 ID（可选）
}
```

### 25.3 Edge

```ts
interface Edge {
  id:         string
  sourceNode: string   // 源节点 ID
  sourcePort: string   // 源端口 ID
  targetNode: string   // 目标节点 ID
  targetPort: string   // 目标端口 ID
}
```

### 25.4 Port

```ts
interface Port {
  id:        string
  name:      string
  type:      DataType         // number | boolean | string | array
  direction: 'input' | 'output'
}
```

### 25.5 UIControl

```ts
interface UIControl {
  id:            string
  type:          'numberInput' | 'button' | 'numberIndicator'
                 | 'textLabel' | 'gauge'  | 'indicatorLight'
  label:         string
  defaultValue:  any
  bindingNodeId: string   // 对应 Block Diagram 中的 Terminal Node ID
}
```

---

## 26. Node Registry（节点注册系统）

### 26.1 注册结构

```ts
interface NodeDefinition {
  type:     string
  label:    string
  inputs:   PortDefinition[]
  outputs:  PortDefinition[]
  params?:  ParamDefinition[]
  executor: NodeExecutor
}

type NodeExecutor = (ctx: NodeContext) => NodeResult

interface NodeContext {
  inputs:  Record<string, any>
  params:  Record<string, any>
  runtime: RuntimeContext
}
```

### 26.2 示例：Add 节点

```ts
const AddNode: NodeDefinition = {
  type:    'math.add',
  label:   'Add',
  inputs:  [{ name: 'A', type: 'number' }, { name: 'B', type: 'number' }],
  outputs: [{ name: 'result', type: 'number' }],
  executor(ctx) {
    return { outputs: { result: ctx.inputs.A + ctx.inputs.B } }
  }
}
```

---

## 27. Runtime Memory

```ts
interface RuntimeMemory {
  portValues: Map<string, any>       // portId → 当前值
  nodeState:  Map<string, NodeState> // nodeId → 执行状态
}

type NodeState = 'idle' | 'ready' | 'running' | 'done' | 'error'
```

---

## 28. 循环依赖检测

执行前使用 DFS 遍历节点图，检测是否存在有向环路。一旦发现环路（如 A → B → C → A），立即中止并报错：

```
Error: Circular Dependency Detected
  Cycle: NodeA → NodeB → NodeC → NodeA
```

---

# 第八部分：调试与状态反馈

## 29. 节点运行状态可视化

| 状态 | 颜色 | 说明 |
| --- | --- | --- |
| Idle | 灰色 | 未执行，等待中 |
| Running | 蓝色 | 正在执行（闪烁动画） |
| Success | 绿色 | 执行成功，值已传播 |
| Error | 红色 | 执行出错，节点显示错误详情 |

---

## 30. 实时数据流动画

运行时，连线上会显示数据流动动画：流动方向与数据传播方向一致，颜色与端口数据类型颜色相同。引擎通过事件实现：

```ts
engine.emit('nodeStart',  { nodeId })
engine.emit('nodeFinish', { nodeId, outputs })
```

---

## 31. 端口值查看

运行完成后，鼠标**悬停在任意端口**上，tooltip 显示该端口当前运行值，方便用户快速验证中间结果。

---

## 32. 调试工具

| 功能 | 说明 |
| --- | --- |
| 单步执行（Step） | 每次点击仅执行一个节点，逐步追踪数据流向 |
| 断点（Breakpoint） | 在节点上设置断点，运行到该节点时自动暂停，等待用户手动继续 |
| 端口值查看 | 悬停端口实时显示当前值，帮助定位中间数据错误 |

---

# 第九部分：错误处理

## 33. 错误类型与处理策略

| 错误类型 | 触发条件 | 处理方式 | 用户提示 |
| --- | --- | --- | --- |
| 除零错误 | Divide 节点 B = 0 | 节点状态置为 Error，停止向下传播 | 节点变红，tooltip 显示 "Division by zero" |
| 循环依赖 | 图中存在有向环路 | 拓扑排序前检测，中止整个执行 | 工具栏状态变红，提示环路路径 |
| 类型错误 | 连接不兼容类型的端口 | 阻止连线，不进入运行时 | 连线变红，显示类型不匹配 tooltip |
| 无限循环 | While Loop 超出 maxIterations | 超出阈值后强制中断，节点置为 Error | 提示 "Loop timeout (100000 iterations)" |
| 死锁 | 所有节点均未就绪，执行停滞 | 引擎检测到无节点可调度，抛出死锁错误 | 提示 "Deadlock: no node ready to execute" |
| 节点执行异常 | executor 抛出未捕获异常 | 捕获异常，节点置为 Error，停止向下传播 | 节点变红，显示异常消息 |

---

# 第十部分：状态管理与前端架构

## 34. 技术栈

| 层/职责 | 技术选型 | 说明 |
| --- | --- | --- |
| UI 框架 | React 18 | 组件化渲染，Hooks 驱动状态 |
| 类型系统 | TypeScript | 全代码库类型安全 |
| 图编辑器 | React Flow | 节点拖拽、连线、缩放、平移 |
| 状态管理 | Zustand | 轻量全局状态，替代 Redux |
| UI 组件库 | shadcn/ui | 可定制的 Radix UI 封装 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 构建工具 | Vite | 极快的 HMR 与构建 |

---

## 35. Zustand Store 设计

| Store | 职责 |
| --- | --- |
| useGraphStore | 管理 Graph JSON（nodes、edges、uiControls）的 CRUD，处理节点/连线的增删改 |
| useRuntimeStore | 管理执行状态（nodeState、portValues），供 UI 实时渲染高亮 |
| useUIStore | 管理界面状态（当前视图、选中节点、工具栏状态、属性面板展示内容） |

---

## 36. React Flow 集成

React Flow 负责图编辑器的底层交互：节点拖拽放置、端口连线、框选、缩放与平移。Graph JSON 与 React Flow 的内部状态保持**双向同步**：

- Graph JSON → React Flow nodes/edges：从 store 映射到 React Flow 格式
- React Flow onChange → Graph JSON：用户操作后回写到 useGraphStore

---

# 第十一部分：非功能需求

## 37. 性能要求

| 指标 | 目标值 | 说明 |
| --- | --- | --- |
| 支持节点数量 | ≥ 50（目标 100） | 同屏节点数 |
| 支持连线数量 | ≥ 100（目标 200） | 同屏连线数 |
| 拖拽帧率 | ≥ 60 fps | 节点拖动流畅度 |
| 运行延迟 | < 100 ms | 点击 Run 到执行完毕（小图） |

优化策略：节点渲染 memoization、运行时状态批量更新、未来可引入 WebWorker 执行引擎。

---

## 38. 安全机制

| 机制 | 参数 | 说明 |
| --- | --- | --- |
| 无限循环保护 | maxLoopIterations = 100,000 | While Loop 超出阈值自动停止，防止浏览器挂起 |
| 死锁检测 | — | 引擎调度时检测无节点就绪的状态，主动报错 |
| 类型安全连线 | — | 连线时前端阻止类型不匹配，执行前再次校验 |
| 循环依赖检测 | — | 执行前 DFS 检测，有环则中止运行 |

---

## 39. 文件存储格式

项目保存为 `.webg` 文件，本质为 JSON：

```json
{
  "version": "1.1",
  "graph": {
    "nodes":      [...],
    "edges":      [...],
    "uiControls": [...]
  },
  "ui": {
    "panelLayout": {},
    "viewport":    {}
  }
}
```

---

# 第十二部分：验收测试

## 40. 测试 1：基础数学运算

| 项目 | 内容 |
| --- | --- |
| 目标 | 验证基础节点连线与执行是否正确 |
| 图结构 | `Number Constant(10) → Add → Multiply → Display` / `Number Constant(5) ↗` / `Number Constant(2) ↗` |
| 期望输出 | Display 显示 **30** |

---

## 41. 测试 2：For Loop 循环计算

| 项目 | 内容 |
| --- | --- |
| 目标 | 验证 For Loop 结构与 Terminal 绑定 |
| Front Panel 配置 | Number Input：N = 5 |
| 图结构 | `Terminal(N) → For Loop (i)` / 内部：`Multiply(i × 2) → Display` |
| 期望输出 | 最后一次迭代：i = 4，Display 显示 **8** |

---

## 42. 测试 3：Case 条件分支

| 项目 | 内容 |
| --- | --- |
| 目标 | 验证 Case Structure 条件选择 |
| 图结构 | `Boolean Constant(true) → Case Structure` / True 分支：`Number Constant(100) → Display` / False 分支：`Number Constant(0) → Display` |
| 期望输出 | Display 显示 **100** |

---

## 43. 测试 4：错误处理

| 项目 | 内容 |
| --- | --- |
| 目标 | 验证除零错误与无限循环保护 |
| 除零图结构 | `Number Constant(10) → Divide(A)` ；`Number Constant(0) → Divide(B) → Display` |
| 除零期望 | Divide 节点变红，工具栏状态置为 Error，程序不崩溃 |
| 无限循环图结构 | While Loop，stop 端口连接 `Boolean Constant(false)` |
| 无限循环期望 | 执行 100,000 次后自动停止，提示 Timeout 错误 |

---

# 第十三部分：未来架构扩展

## 44. 规划路线

| 方向 | 说明 |
| --- | --- |
| 自定义节点 SDK | 开放 `registerNode()` API，允许用户/插件注册自定义节点类型与执行器 |
| WebAssembly 节点 | 引入高性能计算节点，将耗时 executor 编译为 WASM 执行 |
| WebWorker 引擎 | 将执行引擎迁移至 Worker 线程，避免主线程阻塞，提升大图执行性能 |
| 云端运行 | 将 Graph JSON 上传至服务器执行，支持服务端数据接入与跨设备运行 |
| 实时协作 | 引入 CRDT 协议同步 Graph 状态，支持多人同时编辑同一程序图 |
| 数组数据类型 | 完整支持 Array 类型端口，引入 Array 相关节点（Map、Filter、Reduce） |