# Mihomo Sub Manager

[English](README.md) | 简体中文

Mihomo Sub Manager 是一个自托管的 Mihomo 订阅聚合与配置发布工具。它把多个机场/服务商订阅源拉取到本地节点库，再通过代理组、规则、规则集和基础配置生成可直接被 Mihomo / Clash Meta 客户端导入的 YAML 订阅。

项目定位是个人自用的订阅管理后台：单用户、本地优先、自托管，不内置账号体系。后台访问通过一个 `API_KEY` 保护，前端首次使用时只需要填写后台地址和密钥。

## 功能概览

### 订阅源管理

- 添加、编辑、删除订阅源。
- 添加订阅源后自动拉取一次。
- 支持手动刷新和定时刷新。
- 支持按订阅源配置节点名排除关键字，用于过滤“到期时间”“剩余流量”“官网地址”等非真实节点。
- 刷新订阅时会保留已有节点和代理组之间的关系。

### 节点库

- 支持从 Base64、URI 列表和 Clash YAML 中解析节点。
- 已支持 `vmess`、`vless`、`trojan`、`ss`，并对 `ssr`、`http` 做透传处理。
- 支持节点列表、搜索、协议筛选、启用/禁用和删除。
- 节点原始配置会保存在本地数据库中，发布时用于生成 Mihomo YAML。

### 代理组

- 支持 `select`、`url-test`、`fallback`、`load-balance` 代理组。
- 支持维护代理组成员节点。
- 支持测速地址、测速间隔、容差、懒测速、正则过滤等 Mihomo 常用字段。

### 配置方案

- 支持创建多个 Profile，每个 Profile 有独立发布 token。
- 支持启用/禁用 Profile。
- 支持绑定代理组。
- 支持维护 Profile 级规则，并提供默认 `MATCH` 兜底策略。
- 支持 Profile 级基础配置，包括 `mixed-port`、`mode`、DNS、fake-ip 等常用 general / dns 配置。

### 规则与规则集

- 支持规则模板，可批量维护常用规则并导入到 Profile。
- 支持 Rule Provider，生成 Mihomo `rule-providers` 配置。
- 支持 `http`、`file`、`inline` 类型规则集。
- 支持 `domain`、`ipcidr`、`classical` behavior，以及 `yaml`、`text`、`mrs` format。

### 订阅发布

- 发布地址格式：

```text
GET /publish/:token.yaml
```

- 发布结果是 Mihomo 兼容 YAML，包含：

```text
general
dns
proxies
proxy-groups
rule-providers
rules
```

### 操作日志

- 记录订阅源、节点、代理组、配置方案等关键操作。
- 记录订阅刷新结果，便于排查拉取或解析问题。

## 技术栈

- Monorepo：pnpm workspace
- 后端：NestJS 11、Prisma 7、SQLite、`@nestjs/schedule`
- 前端：Vue 3、TypeScript、Vite、Pinia、Vue Router、Arco Design Vue
- 数据库：SQLite，默认文件为 `data/app.db`
- 部署：Docker Compose

## 仓库结构

```text
apps/server       NestJS REST API
apps/web          Vue 前端应用
packages/shared   共享包目录，当前暂未使用
data/             本地 SQLite 数据目录
docker/           Docker 构建配置
doc/              任务说明和设计文档
```

核心数据流：

```text
SubscriptionSource -> 拉取/解析 -> ProxyNode
ProxyNode + ProxyGroup + RuleProvider + ProfileRule -> Profile
Profile -> 生成 Mihomo YAML -> /publish/:token.yaml
```

## 环境要求

- Node.js v24，见 [.nvmrc](.nvmrc)
- pnpm 10.26.0
- Docker 和 Docker Compose，部署时需要

建议使用 nvm：

```bash
nvm use
corepack enable
corepack prepare pnpm@10.26.0 --activate
```

## 本地开发

安装依赖：

```bash
pnpm install
```

创建后端环境变量文件：

```bash
cp apps/server/.env.example apps/server/.env
```

默认示例内容：

```env
DATABASE_URL="file:../../data/app.db"
API_KEY="dev-key"
PORT=3000
```

初始化数据库：

```bash
cd apps/server
pnpm prisma generate
pnpm prisma migrate dev
```

从仓库根目录同时启动前后端：

```bash
pnpm run dev
```

也可以分别启动。

后端：

```bash
cd apps/server
pnpm run start:dev
```

前端：

```bash
cd apps/web
pnpm run dev
```

开发环境默认访问：

```text
前端: http://localhost:5173
后端: http://localhost:3000
Swagger: http://localhost:3000/swagger
```

首次打开前端时，在初始化页面填写：

```text
后台地址: http://localhost:3000
访问密钥: apps/server/.env 中的 API_KEY
```

## 常用命令

后端命令：

```bash
cd apps/server
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

前端命令：

```bash
cd apps/web
pnpm run dev
pnpm run build
pnpm run preview
```

## Docker Compose 部署

项目提供两种 compose 文件：

- [docker-compose.yml](docker-compose.yml)：本机构建镜像，适合开发机、NAS 或 VPS 直接部署。
- [docker-compose.prod.yml](docker-compose.prod.yml)：拉取 GHCR 镜像，适合有 CI 镜像发布流程后在 VPS 上部署。

### 本机构建部署

在仓库根目录执行：

```bash
API_KEY=请替换成高强度随机密钥 docker compose up -d --build
```

默认端口：

```text
前端: http://服务器地址:8080
后端: http://服务器地址:3000
```

可以通过环境变量修改端口：

```bash
API_KEY=请替换成高强度随机密钥 \
WEB_PORT=8080 \
SERVER_PORT=3000 \
docker compose up -d --build
```

数据会持久化到宿主机：

```text
./data/app.db
```

### 使用预构建镜像部署

如果你已经通过 CI 推送了镜像：

```bash
API_KEY=请替换成高强度随机密钥 TAG=latest docker compose -f docker-compose.prod.yml up -d
```

使用开发标签示例：

```bash
API_KEY=请替换成高强度随机密钥 TAG=dev docker compose -f docker-compose.prod.yml up -d
```

### 部署后的初始化

打开前端：

```text
http://服务器地址:8080
```

填写：

```text
后台地址: http://服务器地址:3000
访问密钥: 启动 compose 时传入的 API_KEY
```

如果前端和后端都放在公网，建议使用反向代理统一接入 HTTPS。

### 运维命令

查看日志：

```bash
docker compose logs -f
docker compose logs -f server
docker compose logs -f web
```

停止服务：

```bash
docker compose down
```

升级并重建：

```bash
git pull
API_KEY=原来的密钥 docker compose up -d --build
```

备份数据库：

```bash
cp data/app.db data/app.db.backup
```

## 安全与隐私

这个项目按个人自托管工具设计，不适合作为公开多用户 SaaS 直接暴露。

- 后端管理 API 通过 `X-Api-Key` 鉴权，密钥来自 `API_KEY` 环境变量。
- 未设置 `API_KEY` 时后端不会启用鉴权，只建议本地开发使用。
- 前端会把后台地址和 API Key 保存在浏览器 `localStorage` 中，换设备需要重新填写。
- 发布订阅地址使用 Profile token，拿到 token 的人可以读取对应 YAML，务必把发布链接当作敏感信息处理。
- 订阅源 URL、节点信息、规则、操作日志都保存在本地 SQLite 数据库中，项目本身不上传遥测数据。
- 不建议直接把后端 3000 端口裸露到公网；更推荐用 Nginx、Caddy、Traefik 等反向代理加 HTTPS。
- 如果必须公网访问，请使用高强度随机 `API_KEY`，并限制安全组、防火墙或反向代理访问来源。
- 不要把 `data/app.db`、`.env`、真实订阅链接、真实 API Key 提交到公开仓库。

## 当前限制

- 当前没有多用户、角色权限和审计审批流程。
- SQLite 适合个人使用和轻量部署，不适合高并发共享服务。
- 订阅解析覆盖常见格式，但不同服务商可能存在非标准字段，需要按实际样本继续兼容。
- Docker 部署默认前后端分端口暴露；如果需要同域名部署，建议在外层反向代理中配置路由。

## 开源许可

本项目基于 [MIT License](LICENSE) 开源。

你可以自由下载、使用、复制、修改、分发和商用本项目，但需要在副本或主要部分中保留原始版权声明和许可文本。

## 致谢

感谢以下项目和生态：

- [Mihomo](https://github.com/MetaCubeX/mihomo)
- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [Vue](https://vuejs.org/)
- [Vite](https://vite.dev/)
- [Arco Design Vue](https://arco.design/vue)
- [pnpm](https://pnpm.io/)
- [OpenAI Codex](https://openai.com/codex/)
- [Claude Code](https://www.anthropic.com/claude-code)

也感谢 Clash / Mihomo 社区长期沉淀的订阅格式、规则集和客户端生态。
