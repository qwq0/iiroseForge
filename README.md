# iirose-Forge
蔷薇花园美化+插件管理器   

附带自动注入的安卓版   
## 在哪里阔以下载编译好的apk文件呐?
[最新调试版v2.0-alpha](https://github.com/qwq0/iiroseForge/releases/download/v2.0-alpha/iirose-forge-v2.0-alpha-debug.apk)   
[所有版本](https://github.com/qwq0/iiroseForge/releases)   

## 关于源码
请查看本仓库的dev分支

## 浏览器用户 (PC)
打开浏览器console并键入   
```
(function(d,s){s=d.createElement("script");s.src="//qwq0.github.io/iiroseForge/l.js";d.body.appendChild(s);})(document)
```

## 在自己的iirose客户端中集成iirose-Forge
(这不会包括iiroseForge注入器)   
当每次完成加载后执行以下js代码段   
```
(function(d,s){s=d.createElement("script");s.src="//qwq0.github.io/iiroseForge/l.js";d.body.appendChild(s);})(document)
```
请仅仅在url为 https://iirose.com 时注入脚本   

