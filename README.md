# iirose-Forge
蔷薇花园安卓非官方客户端 目标是提供插件与美化功能 是rose-core的安卓注入器   

## 在哪里下载编译好的apk文件
[releases](https://github.com/qwq0/iiroseForge/releases)   

## 开源嘛?
iiroseForge客户端只负责脚本注入 注入器是开源的且提供MIT许可   
rose-core的源码在 [https://qwq0.rthe.xyz/iirose/roseCore.src.js](https://qwq0.rthe.xyz/iirose/roseCore.src.js) (然而并没有上传)   
### 为什么不使用git仓库管理源码
因为 太 少 辽

## 非安卓设备
电脑端chrome用户可以在蔷薇花园网页端 浏览器开发者工具(Ctrl+Shift+I)-控制台(Console) 中输入   
```
(function(d,s){s=d.createElement("script");s.src="//qwq0.rthe.xyz/iirose/l.js";d.body.appendChild(s);})(document)
```
每次重新进入都需要注入脚本   
