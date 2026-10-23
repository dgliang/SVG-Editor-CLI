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
