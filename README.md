# WebG

WebG 是一款基于网页端的创新型可视化数据流编程工具，设计灵感源自 LabVIEW。它能够帮助用户在“逻辑视图”与“UI 面板视图”之间无缝切换，以连线条（Wires）连接功能节点构建程序，并在纯前端执行所有拓扑算法与循环逻辑。

## ✨ 核心特性 

- **双视图架构 (Dual-View)**
  - **Front Panel (UI)**：全自由拖放的页面画板。提供数据输入框（Number Input）、按钮（Button）、指示灯（Indicator Light）等交互界面元素。
  - **Block Diagram (逻辑流)**：可视化展示所有的算法过程。前台增加控件会自动对应生成在逻辑视图的 Terminal 端子。
  
- **安全沙盒级的执行引擎 (Dataflow Engine)**
  - 基于深度优先搜索的防循环死锁与环路检测机制。
  - 支持 Kahn 拓扑排序解析非线性执行树。
  - **高级控制结构**：包含无限次 `While Loop`、定量迭代 `For Loop` 和基于选择条件的 `Case Structure` 的容器沙盒解析，自动支持无限级嵌套结构内的代码运行逻辑。

- **动态数据隧道代理 (Automatic Data Tunneling)**
  - 使用了自适应边界的 Tunnel 引擎。当一条数据连线穿越任意控制结构的边界时（比如将外部节点直接连入 For Loop 等内部结构），会自动降解并转接给安全 Tunnel 代理，确保数据穿越时的上下文安全性。
  - 严格且美观的类型检测（TypeScript + React Flow）。不同的数值和信号连线均有高亮展示和类型匹配验证。

---

## 🚀 快速启动

应用完全使用 Vite + React + TypeScript 所编写，无复杂的后端依赖。

1. **安装依赖**
   ```bash
   npm install
   ```

2. **启动本地开发模式**
   ```bash
   npm run dev
   ```
   启动后，在浏览器中访问您的 `http://localhost:5173/` 即可直接使用。

3. **构建生产版本包**
   ```bash
   npm run build
   ```

## 🛠 技术栈

- **React 18**：核心生命周期驱动
- **React Flow**：底层图状结构展现（Graph Editor）与高阶互动操作 API
- **Zustand**：分离化/模块化的多 Store 模式
  - `useGraphStore.ts` 解决元件的编排
  - `useUIStore.ts` 解决系统状态及界面的编辑焦点
  - `useRuntimeStore.ts` 解决运行期时的数据与节点状态的高频更新
- **Tailwind CSS + Lucide Icons**: UI 界面的原子化样式和高清图标
- **Vite**：闪电般快速的构建工具

## 📖 架构简析
```text
src/
 ├── store/            # 状态与模型库分离，保证修改图节点不触发 React Context 灾难
 ├── engine/           # 框架中立的运行时系统
 │      ├── registry.ts   // 所有原子化节点 (math/logic) 与复合结构配置注册机制
 │      └── scheduler.ts  // 基于 DAG 与 Hierarchy parentNode 解析的多层递归调度运行引擎
 ├── components/       # 视图渲染隔离
 │      ├── logic/        // Block Diagram 的 Node 与 Edge 重绘
 │      └── ui/           // Front Panel 独立画布展示
 └── types/            # 数据域类型标准定义
```

## 📝 贡献与许可

