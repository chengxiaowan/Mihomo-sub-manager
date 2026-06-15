# Mihomo Sub Manager

[English](README.md) | 简体中文

Mihomo Sub Manager 是一个自托管的代理订阅聚合工具。项目目标是让用户添加多个机场/服务商订阅地址，将节点拉取并写入本地节点库，再通过代理组、规则和配置方案生成一份 Mihomo 兼容的 YAML 订阅链接。

## MVP 目标

支持添加多个订阅源，并生成一个可被 Mihomo 客户端导入使用的订阅地址。

## 技术栈

- Monorepo：pnpm workspaces
- 后端：NestJS 11（自动更新用 `@nestjs/schedule`）、Prisma 7、SQLite
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

## 功能特性

**订阅源**

- 添加 / 编辑 / 删除订阅地址，支持手动刷新。
- 添加后自动拉取一次。
- 按间隔自动更新（关闭 / 30 分钟 / 1 小时 / 6 小时 / 12 小时 / 24 小时），由定时任务驱动。
- 按关键字排除节点（每个订阅源各自配置，丢弃机场塞入的「到期 / 剩余流量 / 官网」等伪节点）。

**节点库**

- 从 base64、URI 列表或 Clash YAML 解析 `vmess` / `vless` / `trojan` / `ss`（及 `ssr` / `http` 透传）。
- 列表、搜索、按协议筛选、启用/禁用、删除；刷新时保留节点的代理组归属。

**代理组**

- `select` / `url-test` / `fallback` / `load-balance` 四类代理组的增删改，管理成员节点。

**配置方案**

- 增删改，带唯一发布 token 与启用/禁用。
- 绑定代理组、管理方案级规则（含默认 `MATCH` 兜底策略）。
- 方案级通用配置（general + dns：`mixed-port`、`mode`、DNS nameserver、fake-ip 等），写入时归一化补齐默认值。
- 主从式 UI，标签页：概览 / 代理组 / 规则 / 基础设置 / 发布。

**规则市场**

- 规则模板批量维护条目，可追加或覆盖导入到配置方案。

**操作日志**

- 记录订阅 / 代理组 / 配置方案的增删改与刷新结果，前端可查看。

**订阅发布**

- `GET /publish/:token.yaml` 生成标准 Mihomo YAML（`general` + `dns` + `proxies` + `proxy-groups` + `rules`）。

尚未完成：Docker 部署文件。详细任务见 [doc/tasks.md](doc/tasks.md)。

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
