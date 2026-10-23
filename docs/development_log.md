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