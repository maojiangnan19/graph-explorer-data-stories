# Week 4 网页制作 SOP
## Social Graphs and Interactions — Communities and Seeing Networks

> **用途**：本文件直接交给 Agent / Codex，按 7 个 Step 分步执行 Week 4 网页。
>
> **核心要求**：Week 4 必须延续 Week 1–3 已有网页的视觉语言，同时围绕 Week 4 的 Communities 主题重新设计内容和交互。
>
> **本周工作位置**：根据当前项目文件夹结构，Week 4 的网页、代码、数据、资源全部放在 `week 4` 文件夹中；Week 3 已生成的网页相关文件全部保留在 `week3` 文件夹中，不移动、不覆盖、不修改。

---

# 1. 项目目标

制作 `graph-explorer-data-stories` 项目的 **Week 4 数据故事网页**。

课程主题：

> **Communities and Seeing Networks**

本周的核心问题：

> **Can we see philosophical traditions as communities in a network?**

Week 3 主要关注单个节点及其重要性；Week 4 要把视角拉回整个网络，观察网络中是否存在结构紧密的 groups / communities，以及这些 communities 是否稳定。

Week 4 使用课程提供的 **Philosopher Network**，不使用 Marvel Network。

网页最终需要形成完整的 Data Story：

```text
Question
↓
What is a Community?
↓
Edge Betweenness
↓
Girvan–Newman
↓
Modularity
↓
Louvain
↓
Interactive Community Explorer
↓
Community Stability
↓
Overlapping Communities
↓
Weights & Backbones
↓
Takeaway
```

不要把网页做成单纯的课程 PPT 或知识点列表。

应该延续前三周：

> **Concept → Visualization → Interaction → Experiment → Interpretation**

---

# 2. 运行方式

## 本地运行

进入项目根目录：

```bash
cd graph-explorer-data-stories
python3 -m http.server 8000
```

然后打开：

```text
http://127.0.0.1:8000/week4/week4.html
```

不要直接双击 HTML。

## GitHub Pages

完成后检查：

```text
https://maojiangnan19.github.io/graph-explorer-data-stories/week4/week4.html
```

---

# 3. 目录结构与文件归属

根据当前桌面项目结构，Week 3 和 Week 4 必须保持完全分开。

建议最终结构：

```text
graph-explorer-data-stories/
│
├── week1/
│   └── Week 1 网页相关文件
│
├── week2/
│   └── Week 2 网页相关文件
│
├── week3/
│   └── Week 3 网页相关文件
│
├── week 4/
│   ├── week4.html
│   ├── week4.css
│   ├── week4.js
│   │
│   ├── data/
│   │   ├── week4_philosophers_nodes.tsv
│   │   └── week4_philosophers_edges.tsv
│   │
│   └── assets/
│       └── Week 4 已有背景图
│
└── ...
```

### 非常重要：Week 3 文件归属

**Week 3 生成的网页相关文件全部属于：**

```text
week3/
```

包括：

- Week 3 HTML
- Week 3 CSS
- Week 3 JS
- Week 3 数据
- Week 3 图片 / assets
- Week 3 其他网页资源

**不要把 Week 3 文件移动到 Week 4。**

---

### Week 4 文件归属

本次生成的全部 Week 4 网页相关文件统一放在：

```text
week 4/
```

包括：

```text
week4.html
week4.css
week4.js
data/
assets/
```

如果当前 `week 4` 文件夹已经存在背景图：

> **直接复用现有背景图，不要重新生成，不要覆盖，不要移动。**

Agent 开始工作前必须先检查 `week 4` 文件夹。

---

# 4. 修改范围

## 允许修改

只允许新增 / 修改：

```text
week 4/
```

及其中的：

```text
HTML
CSS
JS
data
assets
```

## 禁止修改

以下目录不得修改：

```text
week1/
week2/
week3/
```

尤其不要因为复用样式而直接修改 Week 3 CSS。

如果需要参考 Week 3：

> **读取并模仿，不要修改。**

如果需要共用某些视觉规则：

> 在 Week 4 自己的 CSS 中实现。

---

# 5. 视觉风格要求

Week 4 必须让用户一眼看出：

> **这是同一个 Data Stories 项目的第四周。**

Agent 开始编码前，必须先检查 Week 1–3，尤其是 Week 3。

重点继承：

- 深色 / 科幻感
- 背景处理
- 红色 accent
- typography
- 标题层级
- section spacing
- card 风格
- button 风格
- graph visualization 风格
- hover / transition
- scroll storytelling
- 数据图表的视觉语言

### 不能做成

- 普通白色 dashboard
- 与前三周完全不同的 UI
- 过度商业化 SaaS 风格
- 与 Week 3 完全不同的字体和颜色
- 一个单纯的“课程知识点页面”

### 可以改变

Week 4 可以拥有自己的：

- community visualization
- philosopher search
- community filter
- Louvain stability visualization
- weighted network slider

但这些新组件必须使用前三周已有的设计语言。

---

# 6. 7-Step 执行 SOP

---

## STEP 1 — 检查项目 + 锁定 Week 4 工作范围

### 目标

理解前三周的网页系统，再开始制作 Week 4。

### Agent 必须执行

检查：

```text
week1/
week2/
week3/
week 4/
```

重点阅读：

```text
week2/week2.html
week3/week3.html
```

以及相应 CSS / JS。

检查 Week 4 当前已有背景图。

确认：

```text
Week 3 → week3/
Week 4 → week 4/
```

### 必须确认

```text
允许修改：week 4/
禁止修改：week1/、week2/、week3/
```

### 本 Step 验收

Agent 能明确说明：

1. 前三周视觉系统是什么；
2. Week 4 将继承哪些视觉元素；
3. Week 4 背景图在哪里；
4. 哪些文件绝对不能修改。

---

## STEP 2 — 建立 Week 4 页面骨架 + 加载 Philosopher Network

### 目标

先搭建完整网页结构，再逐步加入交互。

建议结构：

```text
HERO
↓
01 THE QUESTION
↓
02 WHAT IS A COMMUNITY?
↓
03 CUTTING THE BRIDGES
↓
04 WHERE SHOULD WE STOP?
↓
05 LOUVAIN FINDS THE COMMUNITIES
↓
06 WHO SITS TOGETHER?
↓
07 ARE COMMUNITIES STABLE?
↓
08 COMMUNITIES CAN OVERLAP
↓
09 WEIGHTS & BACKBONES
↓
10 TAKEAWAY / METHODS
```

### Hero

标题：

```text
COMMUNITIES
```

副标题：

```text
Can we see philosophical traditions as communities in a network?
```

保持前三周 Hero 的布局和视觉语言。

### 数据

使用课程 Week 4 Philosopher Network。

课程数据包括：

- 1,444 philosophers
- 11,135 directed weighted edges in source data
- 转换为 undirected weighted graph
- giant component 约 1,374 nodes
- giant component 约 9,139 links

不要手工伪造数据。

优先从：

```text
week 4/data/
```

加载真实 TSV。

如果数据尚未下载，则从课程官方 Week 4 data 页面获取，并保存到 Week 4 自己的 `data/` 中。

### 本 Step 验收

打开：

```text
http://127.0.0.1:8000/week4/week4.html
```

必须看到：

- Week 4 页面；
- 正确背景；
- 与前三周一致的视觉风格；
- Philosopher Network 成功加载；
- Week 3 页面不受影响。

---

## STEP 3 — 实现 Edge Betweenness → Girvan–Newman → Modularity

### 目标

让用户理解：

> **Communities 可以从网络结构中逐渐显现出来。**

核心逻辑：

```text
Network
↓
Edge Betweenness
↓
Find bridge-like edges
↓
Remove high-betweenness edges
↓
Network splits
↓
Communities appear
↓
Girvan–Newman
↓
Modularity
```

### 03 — CUTTING THE BRIDGES

交互要求：

- 显示 philosopher network；
- hover edge 时显示 edge information；
- 可以突出 high edge-betweenness edges；
- 动画展示边被逐渐删除；
- 网络逐渐分裂。

不要只放静态文字。

### 04 — WHERE SHOULD WE STOP?

解释：

> Modularity 衡量一个 network partition 是否具有比随机连接预期更强的 community structure。

展示：

```text
Q
```

并解释：

```text
Q ≈ 0
```

意味着 partition 没有明显超过随机预期。

较高 Q 表示：

> 社区内部连接相对更多，社区之间连接相对更少。

但严禁写：

```text
High Q = true communities
```

应该写：

```text
Modularity measures the structural quality of a partition.
It does not prove that the detected communities are the “true” communities.
```

### 本 Step 验收

用户可以看到：

```text
bridge edges
→ edge removal
→ fragmentation
→ community structure
```

并理解 Girvan–Newman 和 modularity 的关系。

---

## STEP 4 — Louvain + WHO SITS TOGETHER? Community Explorer

### 目标

制作 Week 4 最重要的互动模块。

不要复制同学的：

```text
SYMPOSIUM / seating plan
```

不要直接照抄对方的文字、布局或代码。

设计自己的：

> **WHO SITS TOGETHER?**

### Community Explorer

左侧：

```text
NETWORK
```

右侧：

```text
COMMUNITY INSPECTOR
```

用户可以搜索：

```text
Search philosopher...
```

选择一个 philosopher 后：

- 高亮该 philosopher；
- 找到所属 community；
- 同 community 节点突出；
- 其他 community 降低 opacity；
- 右侧显示 community 信息。

### Inspector

显示：

```text
COMMUNITY 03

Size
...

Internal links
...

External links
...

Internal / External ratio
...

Modularity contribution
...
```

节点层面显示：

```text
Degree
Community
Internal degree
External degree
```

### REVEAL COMMUNITY

提供：

```text
REVEAL COMMUNITY
```

动画：

```text
Selected philosopher
↓
community members appear
↓
community edges appear
↓
other network fades
↓
community becomes visible
```

### Louvain

使用 Louvain community detection。

课程结果可作为解释参考：

- philosopher giant component 一次运行大约得到 8 个 communities；
- Q 大约在 0.50 左右。

不要硬编码成唯一答案。

Louvain 存在随机性。

### 性能

不要用户每点击一次就重新运行完整 Louvain。

优先：

```text
precompute
↓
save community assignment
↓
browser loads result
```

### 本 Step 验收

用户可以：

```text
Search philosopher
↓
Select
↓
Reveal community
↓
Inspect community
↓
Return to full network
```

整个过程流畅。

---

## STEP 5 — Community Stability + Null Model

### 目标

回答：

> **这些 communities 稳定吗？**

### Stability

运行多个 Louvain seeds，展示：

```text
Run 01
Run 02
Run 03
...
Run 10
```

比较：

```text
Modularity Q
NMI
```

课程材料显示，不同 seed 可以得到结构相近但并不完全相同的 partition。

网页应该强调：

> Different runs can reveal similar but not identical community structures.

不要写：

```text
Louvain found the one true partition.
```

### Null Model

比较：

```text
REAL NETWORK
vs
DEGREE-PRESERVING RANDOM NETWORK
vs
RANDOM NETWORK
```

展示：

```text
Real Q
Randomized Q
```

解释：

> 如果真实网络的 modularity 高于随机对照，可以说明真实网络包含比相应随机网络更明显的 community structure。

但不要进一步说：

> “因此这些就是哲学流派的真实社区。”

### 本 Step 验收

用户可以理解：

1. Louvain 会受随机 seed 影响；
2. community partition 不是唯一答案；
3. real network 与 random network 可以进行结构比较；
4. Q / NMI 是分析工具，而不是“真理证明”。

---

## STEP 6 — Overlapping Communities + Weights & Backbones

### 目标

展示 Week 4 后半部分：

> **Community 不一定是互斥的；网络也不一定应该把所有弱连接全部显示出来。**

### 08 — COMMUNITIES CAN OVERLAP

介绍：

```text
k-clique communities
```

展示一个哲学家同时连接两个 tightly connected groups 的情况。

可以视觉化：

```text
Community A
     ↘
    Philosopher
     ↗
Community B
```

点击节点可以显示：

```text
Community A
Community B
```

不要强行让所有节点只能属于一个 community。

### 09 — WEIGHTS & BACKBONES

哲学家网络是 weighted network。

加入：

```text
Edge Weight Threshold
```

slider。

低阈值：

```text
many edges
↓
dense / hairball network
```

高阈值：

```text
fewer strong edges
↓
clearer backbone
```

用户拖动 slider 时网络实时更新。

重点让用户“看到”：

> filtering weak ties can reveal a network backbone.

---

## STEP 7 — 全面测试、整理、发布

### 功能验收

逐项测试：

- [ ] 页面可以打开
- [ ] philosopher search 正常
- [ ] community highlight 正常
- [ ] reveal community 正常
- [ ] community filter 正常
- [ ] Louvain result 正常
- [ ] Q 正常
- [ ] NMI 正常
- [ ] stability visualization 正常
- [ ] null model comparison 正常
- [ ] overlap demo 正常
- [ ] edge weight slider 正常
- [ ] 动画不卡顿
- [ ] 页面滚动正常
- [ ] responsive 正常

### 数据验收

- [ ] 使用官方 Week 4 Philosopher Network
- [ ] nodes TSV 正确
- [ ] edges TSV 正确
- [ ] directed → undirected projection 正确
- [ ] weighted edges 正确
- [ ] giant component 正确
- [ ] 不因可视化方便而偷偷删除 isolates / smaller components

### 科学表达验收

全文避免：

```text
true community
correct community
best community
only solution
```

使用：

```text
detected community
Louvain partition
network community
community structure
one possible partition
```

同时不要把：

```text
era
philosophical school
Wikidata movement
```

直接当成 community detection 的 ground truth。

应表达为：

> Metadata can provide an external comparison, but it is not automatically the ground truth of network communities.

### 文件验收

最终必须是：

```text
week 4/
├── week4.html
├── week4.css
├── week4.js
├── data/
│   ├── week4_philosophers_nodes.tsv
│   └── week4_philosophers_edges.tsv
└── assets/
    └── 已有 Week 4 背景图
```

并确认：

```text
week1/   unchanged
week2/   unchanged
week3/   unchanged
```

### 最终运行

```bash
python3 -m http.server 8000
```

检查：

```text
http://127.0.0.1:8000/week4/week4.html
```

最终 GitHub Pages：

```text
https://maojiangnan19.github.io/graph-explorer-data-stories/week4/week4.html
```

---

# 7. 最终 Acceptance Criteria

## A. Project Structure

- [ ] Week 4 所有新增网页文件均在 `week 4/`
- [ ] Week 3 所有网页相关文件仍在 `week3/`
- [ ] Week 1–3 未被覆盖
- [ ] Week 4 直接使用已经存在的背景图
- [ ] 没有重新生成或覆盖背景图

## B. Visual Consistency

- [ ] 与 Week 1–3 使用同一视觉语言
- [ ] 深色 / 科幻风格一致
- [ ] typography 一致
- [ ] red accent 一致
- [ ] cards 一致
- [ ] buttons 一致
- [ ] graph visualization 一致
- [ ] animation / transition 风格一致
- [ ] scroll storytelling 一致

## C. Data

- [ ] 使用 Philosopher Network
- [ ] 使用官方 Week 4 nodes data
- [ ] 使用官方 Week 4 edges data
- [ ] weighted network 正确
- [ ] undirected projection 正确
- [ ] giant component 正确
- [ ] 没有为了性能随意删除网络数据

## D. Course Concepts

- [ ] Community
- [ ] Edge Betweenness
- [ ] Girvan–Newman
- [ ] Modularity
- [ ] Louvain
- [ ] NMI / stability
- [ ] Null Model
- [ ] k-clique / overlapping communities
- [ ] Strong / weak ties
- [ ] Backbone

## E. Interaction

- [ ] Philosopher Search
- [ ] Community Highlight
- [ ] Reveal Community
- [ ] Community Inspector
- [ ] Stability Comparison
- [ ] Null Model Comparison
- [ ] Overlap demonstration
- [ ] Weight Threshold Slider

## F. Scientific Quality

- [ ] 不把 community partition 称为绝对真相
- [ ] 不把 metadata 当作 ground truth
- [ ] 不把一次 Louvain run 当作唯一答案
- [ ] 不虚构数据
- [ ] 重要数字来自实际数据 / 预计算结果
- [ ] 交互结果与网络数据一致

## G. Final Output

最终网页：

```text
http://127.0.0.1:8000/week4/week4.html
```

以及：

```text
https://maojiangnan19.github.io/graph-explorer-data-stories/week4/week4.html
```

必须都可以正常访问。

---

# Agent 执行原则

1. **先检查，再修改。**
2. **先搭骨架，再做交互。**
3. **先保证数据正确，再优化视觉。**
4. **Week 4 只能修改 `week 4/`。**
5. **Week 3 文件全部留在 `week3/`。**
6. **Week 4 背景图直接使用已有文件。**
7. **不要复制同学的 Symposium 游戏。**
8. **不要为了好看硬编码假数据。**
9. **重计算算法尽量预计算。**
10. **每完成一个 Step 就运行检查，不要一次性写完整个项目后再排错。**
11. **保持 Week 1–3 的视觉连续性。**
12. **最终以 Data Story 的完整性，而不是页面代码数量作为完成标准。**
