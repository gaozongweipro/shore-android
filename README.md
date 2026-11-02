# 上岸 Android · 2.0.0

一款离线个人负债账本。把剩余本金、每期账单和真实还款放在一起，查看本月本金净变化，并用自己的月度还款预算推算还清时间。

## 安装

Android 8.0 及以上，需要更新后的 Android System WebView。2.0.0 的包名仍是 `cn.shore.ledger`，versionCode 为 3；使用原发布证书签名，可覆盖安装 1.0.0 / 1.0.1。保留原应用直接安装，升级会迁移 v3 账本。不要先卸载或清除应用数据。

## 主要功能

- 固定四个底部入口：总览、借款、试算、记录；设置从右上角进入。
- 录入已有借款或新借款，按剩余本金、期数和每期总额生成账单；支持逐期修改金额、日期、可选的本金拆分，以及亲友借款。
- 本月变化以本金为准，息费单列；月中开始记账时显示「建账以来」，核对月初全部本金后显示完整本月结果。
- 还款使用自有资金或已入账的借款资金。账单没有拆分本金时，需要填写平台显示的还后本金，避免把息费误记为减债。
- 预计还清时间包括亲友借款。资金不足或账单不完整时显示待完善和缺口；未来本金按比例估计的部分有标记。允许提前还款时仍支付账单全额，不擅自减免费用。
- 借贷试算展示借入本金、归还本金、新借款成本、本月预计净变化和还清时间变化。保存方案不记账；确认已发生后，新借款与还款作为一次操作保存，防止重复入账。
- 操作留痕，撤销以冲正记录保留原流水。演示账本仅在内存中运行，不覆盖个人账本。
- SQLite 事务保存与本地历史恢复，保留最近 20 次保存和旧版原始数据；JSON 备份带版本与 SHA-256 校验。导入先预览，再确认整本恢复或合并同一本账本。

## 数据与迭代

金额使用整数分，账本格式为 v4。升级保留原 v3 数据、账户与流水标识、现金、借入资金余额和已结清的亲友记录。旧版按利率推算的账单标记为待核对，请按平台实际账单校正。读取失败或遇到未来版本时进入恢复页，禁止用空账本覆盖。

备份保存完整账本，包含历史原始数据，未加密。卸载或清除应用数据前请导出。没有账号、云同步、联网权限、通知提醒或自动账单抓取。

详细字段与迁移策略见 [docs/data-format.md](docs/data-format.md)，验证范围见 [VALIDATION.md](VALIDATION.md)。

## 源码与构建

| 路径 | 内容 |
| --- | --- |
| `app/src/main/assets/` | 本地界面、v4 账本引擎、v3 迁移与持久化适配 |
| `app/src/main/java/` | Android WebView、SQLite 快照、系统文件选择器 |
| `offline/` | 与 Java 对应的 Smali 和资源清单 |
| `tools/` | 离线构建与 ZIP 对齐脚本 |
| `tests/` | 无 npm 依赖的 Node 测试与 Python SQLite 验证 |

标准工程：JDK 17、Android SDK 35、Gradle 8.9、Android Gradle Plugin 8.7.3，min SDK 26、target SDK 34。

```powershell
gradle :app:assembleRelease
node --test tests/*.test.cjs
python tests/sqlite_test.py
```

本次 APK 使用本地 Apktool 2.11.1 组装 Smali，经 Python ZIP 对齐后使用 apksigner 签名。`tools/build-offline.ps1` 接收 Java、Apktool、apksigner、密钥、密码文件及 Python 路径。离线修改原生层时必须同时维护 Java 与 Smali。

Git 不包含安装包、签名密钥、密码和个人账本。原 `private-signing/` 请私下保留，用于后续覆盖升级；标准 release 构建在存在该目录时使用原签名。debug 使用独立签名。
