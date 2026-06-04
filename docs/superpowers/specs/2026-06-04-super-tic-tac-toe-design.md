# 超级井字棋 — 设计文档

## 概述

**超级井字棋** 是基于传统井字棋的扩展变体。棋盘整体为 9×9 的网格，内部分成 9 个 3×3 的小棋盘（以 3×3 排列）。玩家在一个小棋盘内落子后，该格在小棋盘内的坐标决定对手下一步必须去哪个小棋盘下棋。在整体 9×9 网格上率先连成三子（横/竖/斜，可跨小棋盘边界）方获胜。

## 游戏规则

1. **棋盘结构**：整体 9×9 网格，内含 9 个 3×3 小棋盘，呈 3×3 排列
2. **首步规则**：先手方只能在中心小棋盘 (1,1) 内任意空格落子
3. **移动约束**：玩家在小棋盘内落子的位置 (row, col) 决定对手下一步必须去对应的第 row 行、第 col 列的小棋盘下棋
4. **满盘处理**：当对手被送到的小棋盘已满（9 格全被占），对手可在任意有空格的小棋盘自由落子
5. **胜利条件**：在整体 9×9 棋盘上，任意连续三格（横/竖/斜）均为己方棋子即获胜，可跨小棋盘边界
6. **平局条件**：全部 81 格填满且无人获胜

## 平台

网页版单页应用，同设备双人对战，响应式设计适配桌面与移动端。通过 GitHub Pages 部署，发链接即玩。

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | React 18 + TypeScript | 类型安全，组件化利于后续扩展换肤等功能 |
| 构建 | Vite | 快构建，支持 HMR，内置 GitHub Pages 部署配置 |
| 样式 | CSS Modules | 组件级隔离样式，换肤通过切换 CSS 类实现 |
| 状态管理 | useReducer + Context | 游戏状态逻辑集中管理，不引入额外依赖 |
| 部署 | GitHub Pages (gh-pages) | 免费托管，发链接即玩 |

## 架构

### 数据模型

```typescript
// 棋盘坐标：整体 9×9 网格
// bigRow, bigCol: 小棋盘在 3×3 排列中的位置 (0..2)
// smallRow, smallCol: 格在小棋盘内的位置 (0..2)
// 全局坐标: globalRow = bigRow * 3 + smallRow, globalCol = bigCol * 3 + smallCol

interface GameState {
  board: (string | null)[9][9];        // 整体 9×9，'X' | 'O' | null
  currentPlayer: 'X' | 'O';
  nextBoard: { row: number; col: number } | null;  // null = 可任意落子（仅满盘时）
  // 初始值为 { row: 1, col: 1 }（先手限中心棋盘）
  winner: 'X' | 'O' | 'draw' | null;
  moveHistory: Move[];
}

interface Move {
  player: 'X' | 'O';
  globalRow: number;
  globalCol: number;
}
```

### 核心逻辑 (gameLogic.ts)

纯函数，不依赖 React：

- `isValidMove(state, globalRow, globalCol)` — 检查落子是否合法（目标格为空 & 在允许的小棋盘内或允许任意棋盘）
- `getNextBoard(smallRow, smallCol)` — 返回对手下一步的目标小棋盘；若棋盘已满则返回 null
- `isSmallBoardFull(board, bigRow, bigCol)` — 检测指定小棋盘是否已满
- `checkWin(board, lastRow, lastCol)` — 从最后落子位置向四个方向（横/竖/两对角线）扫描，检查是否构成三连
- `createInitialState()` — 生成初始 GameState

### 状态管理 (gameReducer.ts)

使用 `useReducer` 管理全局 GameState：

- `PLACE_MARK { globalRow, globalCol }` — 落子，切换玩家，计算 nextBoard，检测胜利
- `UNDO` — 还原 moveHistory 中最后一步
- `RESET` — 回到初始状态

### 组件树

```
App
├── ThemeProvider (Context)
├── GameHeader          // 当前回合指示、送入目标棋盘提示
├── BigBoard            // 整体 3×3 排布，内含 9 个 SmallBoard
│   └── SmallBoard × 9  // 每个 3×3，高亮/灰显表示是否可下
│       └── Cell × 9    // 单格渲染，根据 theme 显示 X/O 或图标
├── GameStatus          // 胜利/平局弹窗（条件渲染）
└── ActionBar           // 重新开始、悔棋按钮
```

### 换肤系统 (theme/)

```
theme = {
  boardSkin: 'classic' | 'grass' | ...    // SmallBoard 背景样式
  pieceSet:  'X-O' | 'cat-dog' | ...      // 棋子图标映射
}

// ThemeContext 提供全局 theme 状态和切换方法
// SmallBoard / Cell 根据 theme 参数渲染对应 CSS class 和图标
// 新增皮肤：添加一个 theme 配置对象 + 对应 CSS Module —— 核心逻辑零改动
```

### 布局

```
┌────────────────────────────┐
│  🎮 超级井字棋               │
│  轮到: X (🐱)  → 请下在      │
│  棋盘 (1,1)                 │
├────────────────────────────┤
│  ┌──┬──┬──┐ ┌──┬──┬──┐    │
│  │·│·│·│ │·│·│·│          │
│  ├──┼──┼──┤ ├──┼──┼──┤    │  ← 高亮边框 = 可下
│  │·│·│·│ │·│·│·│          │    灰显 = 不可下
│  ├──┼──┼──┤ ├──┼──┼──┤    │
│  │·│·│·│ │·│·│·│          │
│  └──┴──┴──┘ └──┴──┴──┘    │
│  ┌──┬──┬──┐ ┌──┬──┬──┐    │
│  │·│·│·│ │·│·│·│          │
│  ...                        │
├────────────────────────────┤
│  [重新开始]    [悔棋]        │
└────────────────────────────┘
```

桌面端棋盘居中，手机端缩放占满屏幕视口。

### 文件结构

```
super-tic-tac-toe/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.module.css
│   ├── state/
│   │   ├── gameLogic.ts          // 纯函数：移动合法性、胜利检测
│   │   ├── gameReducer.ts        // useReducer actions & reducer
│   │   └── types.ts             // GameState, Move 等类型
│   ├── components/
│   │   ├── GameHeader.tsx
│   │   ├── BigBoard.tsx
│   │   ├── SmallBoard.tsx
│   │   ├── Cell.tsx
│   │   ├── GameStatus.tsx
│   │   └── ActionBar.tsx
│   ├── theme/
│   │   ├── ThemeContext.tsx
│   │   └── themes.ts            // 主题配置
│   └── styles/
│       ├── BigBoard.module.css
│       ├── SmallBoard.module.css
│       ├── Cell.module.css
│       └── themes/
│           ├── classic.css
│           └── grass.css
└── public/
    └── favicon.svg
```

## 版本规划

- **v1.0**：基础对战 + classic 皮肤 + 悔棋/重新开始
- **v1.1**：换肤系统（grass 皮肤、cat-dog 棋子等）
- **v2.0（未来）**：网络对战（房间匹配、WebSocket 同步）
