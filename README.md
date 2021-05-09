# iirose-Forge
蔷薇花园安卓非官方客户端 目标是提供插件与美化功能 是rose-core的安卓注入器   

## 在哪里阔以下载编译好的apk文件呐?
[最新调试版v2.0-alpha](https://github.com/qwq0/iiroseForge/releases/download/v2.0-alpha/iirose-forge-v2.0-alpha-debug.apk)   
[所有版本](https://github.com/qwq0/iiroseForge/releases)   

## 开源嘛?
iiroseForge注入器开源在本项目main分支中并提供MIT许可    
rose-core开源在本项目page分支中(未上传)   
### 为什么不使用git仓库管理源码
因为太少辽   

## 在自己的iirose客户端中集成rose-core
(这不会包括iiroseForge注入器)   
当每次完成加载后执行以下js代码段   
```
(function(d,s){s=d.createElement("script");s.src="http://me.qwq7.net/iiroseForge/l.js";d.body.appendChild(s);})(document)
```
请仅仅在url为 https://iirose.com 时注入脚本 否者可能损坏注入的页面 rose-core将不会进行判断   

## 对于浏览器用户
已停止对浏览器用户的支持   
旧的注入方式将不再生效 因为无法在https页面中以http获取脚本   
