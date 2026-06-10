# Mihomo Sub Manager

[English](README.md) | 简体中文

Mihomo Sub Manager 是一个自托管的代理订阅聚合工具。项目目标是让用户添加多个机场/服务商订阅地址，将节点拉取并写入本地节点库，再通过代理组、规则和配置方案生成一份 Mihomo 兼容的 YAML 订阅链接。

## MVP 目标

支持添加多个订阅源，并生成一个可被 Mihomo 客户端导入使用的订阅地址。

## 技术栈

- Monorepo：pnpm workspaces
- 后端：NestJS 11、Prisma 7、SQLite
- 前端：Vue 3、TypeScript、Vite、Arco Design Vue
- 数据库：`data/app.db`
- 计划部署方式：Docker Compose

## 仓库结构

```text
apps/server      NestJS REST API
apps/web         Vue 前端
packages/shared  共享包目录，目前为空
data/app.db      本地 SQLite 数据库
doc/tasks.md     开发任务清单
```

## 核心流程

```text
SubscriptionSource -> 拉取并解析 -> ProxyNode
ProxyNode + ProxyGroup + Rule -> Profile
Profile -> 生成 Mihomo YAML
GET /publish/:token.yaml -> 客户端导入订阅
```

## 当前进度

已完成：

- Prisma schema 已包含 `SubscriptionSource`、`ProxyNode`、`ProxyGroup`、`Rule`、`Profile`。
- 已创建初始 schema 和代理组关系相关 SQLite 迁移。
- 后端订阅源 CRUD 已实现。
- 前端已接入 Vue Router、Arco Design Vue 按需导入、顶部导航布局、明暗主题切换，以及包含四个状态卡片的首页 Dashboard。

未完成 / 待实现：

- 订阅拉取和解析：`vmess`、`vless`、`trojan`、`ss`。
- 节点库管理接口。
- 代理组管理接口。
- 规则管理接口。
- 配置方案管理和 token 生成。
- Mihomo YAML 生成。
- `/publish/:token.yaml` 发布接口。
- 订阅源、节点库、代理组、规则、配置方案等完整前端管理页面。
- Docker 部署文件。

详细任务见 [doc/tasks.md](doc/tasks.md)。

## 环境要求

- Node.js v22，见 `.nvmrc`
- pnpm 10.26.0

## 开发命令

安装依赖：

```bash
pnpm install
```

在仓库根目录同时启动前后端：

```bash
pnpm run dev
```

只启动后端：

```bash
cd apps/server
pnpm run start:dev
```

只启动前端：

```bash
cd apps/web
pnpm run dev
```

## 数据库

Prisma 命令需要在 `apps/server` 下执行：

```bash
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

后端通过 `apps/server/.env` 读取 `DATABASE_URL`。项目文档默认使用：

```env
DATABASE_URL="file:../../data/app.db"
```

## 验证命令

后端：

```bash
cd apps/server
pnpm run test
pnpm run build
```

前端：

```bash
cd apps/web
pnpm run build
```
