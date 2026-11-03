# HALDER (हलधर) — 农场直连消费者市场与物流生态系统

[![HALDER CI/CD Pipeline](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/ci.yml)
[![Build Android APK & AAB](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml/badge.svg)](https://github.com/lavesh69/halder-app/actions/workflows/build-apk.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%E2%89%A522.5.0-brightgreen.svg)](https://nodejs.org/)

**HALDER** (हलधर) 是一个企业级的高性能农业市场系统，旨在将印度各地的小农户和商业农场与零售消费者、大宗采购商、餐饮机构直接连接。通过消除多级中间商，HALDER在为终端消费者提供300公里区域内晨采生鲜农产品的同时，最大化农民的利润空间。

---

## 🌾 核心系统模块

### 1. 消费者与零售采购体验
- **超本地地理定位探索：** 基于球面正弦（Haversine）公式计算的300公里地理半径圈。
- **生鲜与采摘透明度：** 晨间采摘标签、有机认证及可追溯的农田到餐桌信息。
- **智能购物车与多农户结算：** 支持农场直送、冷链配送或自提的分组结账流程。
- **安全交付：** 基于动态一次性密码（OTP）的实物交接核验与实时配送状态。
- **实时农户沟通：** 原生双向 WebSocket 聊天，支持5种语言（英语、印地语、旁遮普语、孟加拉语、马拉地语）。

### 2. 农民企业与经营生态
- **农场档案与土地登记：** 农场地块详情、土壤类型、灌溉设施、认证资质与收获日历。
- **产品与库存管理：** 批量定价、多单位换算（公斤、捆、箱、升）、当季在售开关及多图管理。
- **曼迪价格行情与基准比对：** 实时 APMC 市场报价、历史基准趋势追踪、主流价格指标及 CSV 报表导出。
- **财务账本与结算：** 实时收入归集、订单总额计算、10%服务费自动核算与可核查的提现账本。

### 3. 物流与 Kisan 配送车队
- **车队入驻与资质审核：** 包含两轮车、微卡、冷藏车、拖拉机的车辆登记，驾驶证审核与营运网格设定。
- **司机遥测与实时追踪：** 实时 GPS 经纬度校验（-90 <= lat <= 90, -180 <= lng <= 180）与用户身份权限校验。
- **车队分析引擎：** 实际数据库派生指标（平均在途时长、准时交付率与遥测指标统计）。
- **Kisan 农户自主配送：** 零佣金的农户自营直达配送服务。

### 4. B2B 批发与订单农业
- **大宗询价与 RFQ 系统：** 起订量（MOQ）控制、批发阶梯定价与自动化报价单。
- **订单农业预售：** 附带里程碑交付计划的远期农产品采购协议。

### 5. 管理治理与安全运维
- **基于角色的权限控制 (RBAC)：** 严格隔离消费者、农户、配送员与管理员权限。
- **零信任 IDOR 防护：** 杜绝越权访问订单、商品及物流遥测信息。
- **农户实名认证 (KYC)：** 身份证件、土地证明与资质审核流程。
- **操作审计日志：** 不可篡改的操作审计记录。

---

## 🛠️ 技术栈

- **前端:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **移动端:** Capacitor 8 Android SDK
- **后端:** Node.js (>=22.5.0), Express.js, TypeScript
- **数据库:** 原生 SQLite 3 (`node:sqlite` DatabaseSync) 开启 WAL 模式
- **实时通信:** WebSocket (`ws`)
- **国际化:** 多语言本地化（英、印地、旁遮普、孟加拉、马拉地）

---

## 🚀 快速启动

```bash
# 安装依赖
npm install

# 初始化并填充数据库
npm run server:seed

# 启动后端服务 (http://localhost:5000)
npm run server

# 启动前端开发服务器 (http://localhost:5173)
npm run dev
```

## 📄 授权协议

本项目基于 [MIT License](LICENSE) 开源发布。
