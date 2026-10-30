# Webmail (React 19 + Go + Stalwart JMAP)

[![GitHub Release](https://img.shields.io/github/v/release/zen-box/webmail)](https://github.com/zen-box/webmail/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

基于 **React 19** + **HeroUI** + **Tailwind CSS v4** 前端，结合 **Go (Golang)** 与 **Stalwart Mail Server (JMAP RFC 8620 / 8621 / 8622)** 构建的现代化、极简自托管单二进制邮件客户端。

---

## 🌟 核心架构与设计特点

1. **单二进制全栈交付 (Single Binary)**：
   - 前端 React 静态资产通过 Go 的 `//go:embed` 完整编译嵌入至单个二进制文件中。
   - 最终可执行文件仅 **7.5 MB**，零外部依赖（无需 Node.js、PHP、Nginx/Apache），双击即可运行。
2. **现代 JMAP 协议支持 (RFC 8620 / RFC 8621)**：
   - 彻底摒弃传统繁琐低效的 IMAP/SMTP 协议，拥抱 Rust 开发的现代全功能邮局 **Stalwart**。
   - 通过 HTTP/JSON 一次往返完成邮件查询与拉取。
3. **汲取 Roundcube 核心安全精髓 (`rcube_washtml`)**：
   - 后端内置 `bluemonday` 策略引擎深度清洗邮件富文本中的 XSS、恶意标签与 CSS 注入。
   - 默认拦截外部图片（Web Beacons 反隐私追踪），保护用户真实 IP。
4. **前端体验 (HeroUI v3 + React 19.3)**：
   - 1:1 还原 HeroUI 官方 Pro 邮箱模板，沉浸式三栏工作流。
   - 乐观更新（Optimistic UI）：标星、标记已读、归档、删除无感瞬时响应。
   - 离线/开发优雅降级：本地未启动 Stalwart 时自动启用内置真实会话演示模式。

---

## 📂 项目结构

```
mail/
├── build.bat                    # Windows 一键完整打包脚本
├── Makefile                     # Linux / macOS 一键构建
├── docker-compose.yml           # Stalwart + Webmail 一键编排模板
├── Dockerfile                   # 极简 Distroless 多阶段构建 (< 25MB)
├── task.md                      # 阶段开发任务规划清单
│
├── frontend/                    # [前端] React 19.3 + HeroUI v3 + Tailwind v4
│   ├── src/
│   │   ├── api/client.ts        # 前端 API 统一调用封装
│   │   ├── components/          # Sidebar, EmailList, EmailDetail, ComposeModal
│   │   ├── types.ts             # 强类型定义
│   │   └── App.tsx              # 邮箱主视窗
│   └── package.json
│
└── backend/                     # [后端] Go BFF 服务 + JMAP 网关 + 静态嵌入
    ├── main.go                  # 主服务入口与路由调度
    ├── embed.go                 # //go:embed 静态资源打包
    ├── internal/
    │   ├── config/              # 配置管理
    │   ├── jmap/                # Stalwart JMAP 客户端 (RFC 8620 / 8621)
    │   ├── sanitize/            # Roundcube 级 HTML 安全清洗与防追踪
    │   ├── auth/                # Session 与 HttpOnly Cookie 鉴权
    │   └── handlers/            # REST API 路由实现
    └── mail-server.exe          # 编译完成的 7.5MB 单二进制程序
```

---

## 🚀 编译与运行

### 方式一：直接运行已编译的单二进制文件
```powershell
.\backend\mail-server.exe
```
打开浏览器访问 `http://localhost:8080` 即可开始使用！

### 方式二：一键全流程重新打包（前端 + 后端）
在 Windows 终端中运行：
```cmd
build.bat
```
在 Linux / macOS 终端中运行：
```bash
make
```

### 方式三：独立前端开发模式 (Vite HMR 热重载)
```powershell
cd frontend
pnpm dev
```

### 方式四：与 Stalwart 邮局一键容器化启动
```bash
docker compose up -d
```
- Stalwart 邮局管理与 JMAP 端口：`http://localhost:8080`
- Webmail 网页邮箱界面：`http://localhost:3000`
