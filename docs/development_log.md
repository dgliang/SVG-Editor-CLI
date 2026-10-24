# step 0
完成 design.md，根据 phase_cli_1.md 细化需求规则，并完成框架设计
# step 1
Step 1-1：修复 tsconfig(拼与+jsx)、更新 package.json (vitest、scripts、devDep) 
Step 1-2：创建 model/支撑类型 (DomainError / SvgNodeData / ShapeSnapshot / NumberFormat) 
Step 1-3：创建 Shape 抽象基类
Step 1-4：创建 ShapeProvider / ShapeRegistry 接口 
Step 1-5：创建 Group 与 Document(核心索引) 
Step 1-6：vitest 初始化 + Document 单测(attach/detach/reparent/duplicate id/parent 指针/find/has/count) 
Step 1-7：运行 build 与 test 修正问题后提交
# step 2
Step 2-0: 收尾—NumberFormat 抛 DomainError、Document.reparent 同父 early-return、.gitattributes 
Step 2-1: Rect.ts 模板(Shape 实现 + RectProvider) 
Step 2-2: Circle / Ellipse / Line / Text 同模式实现 
Step 2-3: BuiltinShapes.ts 注册 6 个 provider
Step 2-4: test/shapes/单测(30用例全绿)
Step 2-5: build + test 全绿后单 commit (442be61)
# Step 3
Step 3-1: 装fast-xml-parser; model 加 Transform2D + Shape.applyTransform (move/scale委托)
Step 3-2: io/SvgSerializer.ts(缩进/自闭合/转义/属性顺序/固定头部) 
Step 3-3: io/SvgParser.ts (preserveOrder解析、id补全/重名警告、未支持标签跳过、transform 扁平化) 
Step 3-4: io/FileStore.ts + NodeFileStore.ts(错误文案转换)
Step 3-5: test/io/单测(parser/serializer/round-trip/FileStore) 
Step 3-6: build + test 全绿后单 commit
# Step 4
Step 4-1: Shape 加 positionAnchor() 抽象(move 回显锚点: rect/text (x,y)、circle/ellipse (cx,cy)、line (x1,y1)、组 null)，6 子类 + MockLeaf 实现
Step 4-2: commands/Command.ts (Command 接口 + CommandResult) 与 CommandHistory (undo/redo 双栈 + io 锁固定文案、失败不入栈、新编辑清 redo 并解锁)
Step 4-3: Create/Delete/Move/Scale/Set 命令(先校验后改树; Scale/Set 用快照 undo 避免浮点漂移与旧值缺省问题)
Step 4-4: Group/Ungroup/AddTo/ZOrder 命令(锚点=首成员摘除后索引、祖先成环检查、undo 按原索引升序插回)
Step 4-5: test/commands/ 单测(22+5 用例全绿: execute→undo→redo 往返、回显文案比对、失败不改状态、io 锁)
Step 4-6: build + test 全绿后单 commit (25d9651)
# Step 5
Step 5-1: view/TreeRenderer.ts(全文档 `svg (WxH)` 根行、├──/└── 连接符、│ 前缀延续、同份输出按最宽标签全局对齐、tree <id> 子树重画)
Step 5-2: view/ShapeDetailRenderer.ts(parent 标签: 根级显示 svg、明细缩进 2 空格; 字段来自 detailFields)
Step 5-3: app/Editor.ts(门面: init/read/save/canvas + providerFor + execute/undo/redo; 文档类命令 truncateAndLock、canvas 只读不锁)
Step 5-4: test/view 与 test/app 单测(19 用例: tree 逐字比对需求 5.1、show 示例、Editor 文件往返与 io 锁)
Step 5-5: build + test 全绿后单 commit (c78ff32)
# Step 6
Step 6-1: cli/Tokenizer.ts(双引号保留空格 + quoted 标记; 未闭合引号容错)
Step 6-2: cli/CommandHandler.ts(接口 + BaseHandler: usage / invalid number / 画布尺寸正数校验)
Step 6-3: cli/handlers/ 19 个 handler(create 的 in 子句仅在未加引号时识别; front/back 各一类; help 清单)
Step 6-4: cli/CommandDispatcher.ts(Map 分派, unknown command) + cli/BuiltinHandlers.ts(命令清单，组合根与测试复用)
Step 6-5: cli/Repl.ts(注入 AsyncIterable 与输出函数; 注释/空行忽略; DomainError → error: 行) + src/index.ts 组合根
Step 6-6: test/cli/ 单测(Tokenizer 7 + Repl 会话 7) + 管道冒烟(init/create/tree/show/move/undo/save/read)
Step 6-7: build + test 全绿后单 commit (09861c0)
