# Week 3 Marvel Network Explorer — 7-Step SOP

## 1. 项目目标

在现有 `graph-explorer-data-stories` 项目的基础上，新增 **Week 3 页面**。

Week 1 和 Week 2 已经完成，**本次任务只新增 Week 3，不修改或重做前两周页面**。

Week 3 的核心主题：

> **Who Holds the Marvel Network Together?**

通过 Marvel network 的交互式 node-removal experiment，让用户理解：

- Degree：谁连接最多？
- Closeness：谁离其他节点更近？
- Betweenness：谁更像 bridge / broker / bottleneck？
- PageRank / Eigenvector：谁连接了重要节点？
- Connected Components：删除节点后网络如何碎裂？
- Null Model：一个 centrality 数值到底意味着什么？
- Assortativity / Homophily / Cliques：网络中节点之间还有什么结构关系？

核心 data-story：

```text
Popularity ≠ Structural Importance
```

用户最终应该通过交互自己发现：

> 一个节点连接很多，并不意味着它一定是维持网络结构的关键节点。

---

# 2. Week 3 工作目录与文件规则

## 2.1 唯一工作目录

**Week 3 的所有新生成网页相关文件必须放在项目的 `week3/` 文件夹中。**

推荐结构：

```text
graph-explorer-data-stories/
│
├── index.html
├── styles.css
├── week1.html
│
├── week2/
│   ├── week2.html
│   ├── week1_nodes.tsv
│   └── week1_edges.tsv
│
└── week3/
    ├── week3.html
    ├── week3.css
    ├── week3.js
    ├── [Week 3 background image]
    └── [other Week 3 assets]
```

如果现有项目使用单文件 HTML，也可以：

```text
week3/
└── week3.html
```

不强制拆 CSS / JS。

## 2.2 特别要求

不要把 Week 3 新文件散落到：

```text
/
week2/
```

或其他目录。

Week 3 的：

- HTML
- CSS
- JavaScript
- 背景图片
- icon
- SVG
- 其他专属资源

全部放在：

```text
week3/
```

## 2.3 背景图片

Week 3 背景图片已经放在 `week3/` 文件夹中。

开发时：

> **直接使用已有背景图片，不要重新生成、替换或复制到其他目录。**

如果需要修改图片显示方式，只调整 CSS。

---

# 3. STEP 1 — 检查现有项目并锁定修改范围

首先检查：

```text
graph-explorer-data-stories/
week2/
week3/
```

确认 Week 2 已有：

```text
week2.html
week1_nodes.tsv
week1_edges.tsv
```

确认 Week 3 背景图已经存在。

同时检查 Week 1 / Week 2 的：

- 字体
- typography
- navigation
- page width
- spacing
- colors
- card style
- section layout
- responsive behavior

### 这一阶段的原则

**不要重新设计视觉系统。**

Week 3 必须看起来是：

> 同一个项目的第三周。

而不是一个全新的游戏网站。

### 验收

- [ ] Week 1 正常
- [ ] Week 2 正常
- [ ] Week 3 文件夹存在
- [ ] 背景图存在
- [ ] 没有修改 Week 1 / Week 2
- [ ] 已确认现有视觉系统

---

# 4. STEP 2 — 建立 Week 3 页面骨架，并继承现有风格

创建：

```text
week3/week3.html
```

页面结构：

```text
Hero
│
├── Our Question
│
├── From Paths to Centrality
│
├── Interactive Network Breaker
│
├── What the Game Reveals
│
├── Compared to What?
│
├── Beyond One Node
│
├── Takeaway
│
└── Methods
```

## 视觉要求

Week 3 必须继承 Week 1 / Week 2：

- header / navigation
- font
- font hierarchy
- page width
- margins
- section spacing
- editorial layout
- data-story style
- existing color palette
- mobile responsive behavior

### 背景图

使用：

```text
week3/[existing background image]
```

作为 Week 3 的背景视觉元素。

不要：

- 重新生成背景
- 更换背景
- 把背景图复制到根目录
- 引入完全不同的视觉主题

### 验收

打开：

```text
http://127.0.0.1:8000/week3/week3.html
```

确认：

- [ ] 页面能打开
- [ ] 风格和 Week 2 明显属于同一个网站
- [ ] 背景图正确显示
- [ ] 导航正常
- [ ] 页面在 desktop / mobile 下都不会严重破版

---

# 5. STEP 3 — 接入 Marvel 数据并建立 Network Visualization

Week 3 尽量复用已有 Marvel 数据。

读取：

```text
../week2/week1_nodes.tsv
../week2/week1_edges.tsv
```

不要复制数据文件到 Week 3。

使用：

```javascript
fetch('../week2/week1_nodes.tsv')
fetch('../week2/week1_edges.tsv')
```

建立：

```text
nodes
edges
adjacency list
```

然后使用 SVG 或现有项目已经使用的 visualization 技术绘制：

```text
nodes + edges
```

需要支持：

- hover node
- 显示角色名称
- zoom
- pan
- click node

### Network 规则

Week 3 的 network-removal game 使用：

```text
Marvel directed links
        ↓
undirected projection
        ↓
connected components
```

因为游戏关注的是：

> 删除角色后，网络是否被切断。

### 验收

- [ ] Marvel 数据成功加载
- [ ] 节点数量合理
- [ ] edges 成功显示
- [ ] node hover 正常
- [ ] node name 正常
- [ ] zoom / pan 正常
- [ ] 页面没有因为数据加载失败而空白

---

# 6. STEP 4 — 实现核心 Network Breaker Interaction

这是 Week 3 的核心。

页面标题建议：

> **Can you break the Marvel network?**

用户有有限次数的 node removal。

例如：

```text
3 hits
5 hits
8 hits
```

## 用户操作

点击一个角色：

```text
click node
    ↓
remove node
    ↓
remove all incident edges
    ↓
recalculate connected components
    ↓
calculate largest component
    ↓
update visualization
```

页面实时显示：

```text
Nodes
Core
Hits Left
```

其中：

> **Core = largest surviving connected component**

## Game 目标

让：

```text
Largest Connected Component
```

尽可能小。

### Hint

提供：

```text
Hint
```

点击后：

> 高亮当前 surviving network 中 betweenness 最高的节点。

并解释：

```text
Many shortest paths pass through this node.
```

### 验收

- [ ] 可以选择攻击次数
- [ ] 可以点击 node
- [ ] node 被删除
- [ ] incident edges 消失
- [ ] connected component 自动重新计算
- [ ] Core 自动更新
- [ ] Hits Left 自动更新
- [ ] Hint 可以工作
- [ ] Restart 可以重新开始

---

# 7. STEP 5 — 加入 Centrality Strategy Comparison

游戏结束后，比较三种策略。

## Strategy A — You

用户自己选择节点。

## Strategy B — Hub Strategy

每一步删除：

> 当前 degree 最高的节点。

也就是：

```text
Choose max degree
→ remove
→ recalculate
→ repeat
```

它代表：

> “优先攻击连接最多的节点。”

## Strategy C — Broker Strategy

每一步删除：

> 当前 betweenness 最高的节点。

也就是：

```text
Calculate betweenness
→ choose highest
→ remove
→ recalculate
→ repeat
```

它代表：

> “优先攻击 shortest paths 上的关键 bridge / broker。”

## Strategy D — Random

随机选择节点。

建议运行多个 random trials：

```text
20 runs
```

然后计算：

```text
Random average
```

## 最终结果

显示：

```text
Your strategy
Hub strategy
Broker strategy
Random average
```

例如：

```text
Strategy          Largest component

You                     XX
Hub                     XX
Broker                  XX
Random average          XX
```

### 重要学术要求

不要在页面文案中提前宣布：

> “Betweenness is always the best.”

页面应该让用户通过 experiment 自己观察不同策略的结果。

因为 Week 3 的重点是：

> **不同 centrality measure 回答不同问题。**

### 验收

- [ ] Hub strategy 正常
- [ ] Broker strategy 正常
- [ ] Random strategy 正常
- [ ] 四种结果可比较
- [ ] 所有策略使用相同初始 network
- [ ] 所有策略使用相同 removal count
- [ ] Random 使用多次运行
- [ ] 没有预设“唯一正确答案”

---

# 8. STEP 6 — 补齐 Week 3 Data Story

互动完成之后，用文字把实验和课程理论连接起来。

## 8.1 From Paths to Centrality

解释：

### Degree

> How many direct connections?

### Closeness

> How close am I to everyone else?

### Betweenness

> How often am I on shortest paths?

### PageRank / Eigenvector

> Are my neighbours important?

---

## 8.2 What the Game Reveals

解释：

```text
High Degree
≠
High Structural Importance
```

一个 hub 可能连接很多节点，但如果周围节点之间存在其他路径，它并不一定是 network bottleneck。

另一个节点可能只有少数连接，但如果它连接两个 network regions：

```text
Cluster A
    |
 Bridge
    |
Cluster B
```

那么它可能具有较高 betweenness。

---

## 8.3 Compared to What?

加入 Week 2 的 null model 思想：

> A high centrality value does not automatically mean a node is structurally unusual.

解释：

```text
Real network
     vs
Degree-preserving null model
```

需要强调：

> 如果一个节点 degree 本身就很高，那么高 betweenness 可能部分由 degree structure 解释。

因此需要问：

> **Compared to what?**

---

## 8.4 Beyond One Node

简要介绍：

### Assortativity

> Do high-degree nodes connect to high-degree nodes?

### Homophily

> Do similar nodes connect to similar nodes?

### Clique

> Is everyone in this group connected to everyone else?

公式：

\[
E=\frac{k(k-1)}{2}
\]

---

## 8.5 Takeaway

最终不要写：

> “Betweenness is the best centrality.”

而写：

> **There is no single “most important” node. Different centrality measures answer different questions.**

对于本实验：

> 如果问题是“删除哪些节点最可能让网络碎裂”，那么 betweenness 是一个值得比较的 structural measure。

### 验收

- [ ] Week 3 核心理论都出现
- [ ] 理论与 interaction 有连接
- [ ] 没有把某一种 centrality 描述成普遍最优
- [ ] Null model 有明确解释
- [ ] Assortativity / Homophily / Clique 有介绍
- [ ] 页面故事从问题 → 实验 → 解释 → takeaway 连贯

---

# 9. STEP 7 — 测试、整理并发布

## 9.1 本地运行

在项目根目录：

```bash
python3 -m http.server 8000
```

打开：

```text
http://127.0.0.1:8000/week3/week3.html
```

## 9.2 Functional test

逐项检查：

### 页面

- [ ] Week 3 可以打开
- [ ] 背景图正常
- [ ] 风格与 Week 1 / Week 2 一致
- [ ] 导航正常

### Data

- [ ] Marvel data 加载
- [ ] node / edge 正常
- [ ] 没有 console error

### Interaction

- [ ] hover
- [ ] zoom
- [ ] pan
- [ ] node removal
- [ ] component recalculation
- [ ] hint
- [ ] restart

### Comparison

- [ ] Hub
- [ ] Broker
- [ ] Random
- [ ] User

### Responsive

至少检查：

```text
Desktop
Laptop
Mobile
```

---

# 10. 修改范围最终确认

完成以后，Git diff 应该主要集中在：

```text
week3/
```

如果为了导航新增 Week 3 link，可以修改：

```text
index.html
```

但不要修改：

```text
week2/week2.html
```

以及 Week 2 数据文件。

最终推荐结构：

```text
graph-explorer-data-stories/
│
├── index.html                 ← 仅必要时加入 Week 3 link
├── styles.css                 ← 尽量不改
│
├── week1.html                 ← 不修改
│
├── week2/
│   ├── week2.html             ← 不修改
│   ├── week1_nodes.tsv        ← 不修改
│   └── week1_edges.tsv        ← 不修改
│
└── week3/
    ├── week3.html
    ├── week3.css              ← optional
    ├── week3.js               ← optional
    ├── [existing background]
    └── [other Week 3 assets]
```

---

# 11. Git / GitHub Pages

完成测试后：

```bash
git status
```

确认没有意外修改 Week 1 / Week 2。

然后：

```bash
git add week3/
```

如果修改了首页导航：

```bash
git add index.html
```

提交：

```bash
git commit -m "Add Week 3 Marvel network centrality story"
```

推送：

```bash
git push origin main
```

最终检查：

```text
https://maojiangnan19.github.io/graph-explorer-data-stories/week3/week3.html
```

---

# 12. Definition of Done

Week 3 只有满足以下条件才算完成：

```text
[ ] Week 1 unchanged
[ ] Week 2 unchanged
[ ] All new Week 3 assets are inside week3/
[ ] Existing Week 3 background image is reused
[ ] Week 3 visual style matches Week 1 / Week 2
[ ] Marvel data successfully loads
[ ] Network visualization works
[ ] Node removal works
[ ] Connected component updates
[ ] User strategy works
[ ] Hub strategy works
[ ] Broker strategy works
[ ] Random strategy works
[ ] Results can be compared
[ ] Hint works
[ ] Degree explained
[ ] Closeness explained
[ ] Betweenness explained
[ ] PageRank / Eigenvector explained
[ ] Null model explained
[ ] Assortativity introduced
[ ] Homophily introduced
[ ] Cliques introduced
[ ] Methods section exists
[ ] Desktop layout works
[ ] Mobile layout works
[ ] Local server works
[ ] GitHub Pages works
```

---

# 13. 执行原则

## 最重要的 5 条规则

### 1. 不重做前两周

Week 1 和 Week 2 是已经完成的作品。

### 2. Week 3 必须像同一个网站

不要因为增加 game 就突然变成完全不同的视觉风格。

### 3. 所有 Week 3 文件集中管理

```text
week3/
```

是 Week 3 的唯一资源目录。

### 4. 先功能，后视觉

推荐顺序：

```text
Data
→ Network
→ Interaction
→ Strategy
→ Story
→ Visual polish
```

### 5. 每一步完成后立即测试

不要一次生成整个项目。

推荐：

```text
STEP 1 → test
STEP 2 → test
STEP 3 → test
...
STEP 7 → final test
```

---

# 14. 最终故事线

最终用户看到的不是“一个游戏”，而是一篇完整的 Week 3 data story：

```text
WHO HOLDS THE MARVEL NETWORK TOGETHER?
              ↓
Popularity ≠ Importance
              ↓
How do network scientists measure importance?
              ↓
Degree / Closeness / Betweenness / PageRank
              ↓
CAN YOU BREAK THE NETWORK?
              ↓
Remove nodes
              ↓
Watch the largest component shrink
              ↓
Compare Hub vs Broker vs Random
              ↓
Compared to what?
              ↓
Null Models
              ↓
Assortativity / Homophily / Cliques
              ↓
There is no single “most important” node.
```

**最终目标不是做一个“好玩的小游戏”，而是用 interaction 让用户自己理解 Week 3 的 network science concepts。**
