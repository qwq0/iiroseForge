!function(){"use strict";function e(e,t){return(...i)=>{if(1!=t(i,e))return e(...i)}}let t={iframeWindow:null,iframeDocument:null,socket:null,iframeBody:null,socketApi:{send:e=>{t.socket.send(e)}}},i=class{cbList=[];onceCbList=[];add(e){this.cbList.push(e)}addOnce(e){this.onceCbList.push(e)}remove(e){let t=this.cbList.indexOf(e);t>-1?this.cbList.splice(t,1):(t=this.onceCbList.indexOf(e),t>-1&&this.onceCbList.splice(t,1))}removeAll(){this.cbList=[],this.onceCbList=[]}trigger(e){this.cbList.forEach((async t=>{t(e)})),this.onceCbList.forEach((async t=>{t(e)})),this.onceCbList=[]}};const n={operation:{getUserName:()=>t.iframeWindow?.myself2?t.iframeWindow.myself2:null,getUserUid:()=>t.iframeWindow?.uid?t.iframeWindow.uid:null,getUserRoomId:()=>t.iframeWindow?.roomn?t.iframeWindow.roomn:null,getUserProfilePictureUrl:()=>t.iframeWindow?.avatar2&&t.iframeWindow?.avatarconv?t.iframeWindow.avatarconv(t.iframeWindow.avatar2):null,getUserInputColor:()=>t.iframeWindow?.inputcolorhex?t.iframeWindow.inputcolorhex:null,sendRoomMessage:e=>{(e=String(e))&&t.socketApi.send(JSON.stringify({m:e,mc:n.operation.getUserInputColor(),i:String(Date.now()).slice(-5)+String(Math.random()).slice(-7)}))},sendPrivateMessageSilence:(e,i)=>{e=String(e),(i=String(i))&&e&&t.socketApi.send(JSON.stringify({g:e,m:i,mc:n.operation.getUserInputColor(),i:String(Date.now()).slice(-5)+String(Math.random()).slice(-7)}))},sendPrivateMessage:(e,i)=>{if(e=String(e),!((i=String(i))&&e&&t.iframeWindow?.msgfetch&&t.iframeWindow?.Variable?.pmObjJson&&t.iframeWindow?.Utils?.service?.buildPmHelper))return;let n=t.iframeDocument.getElementById("moveinput"),a=n.value,o=t.iframeWindow.pmFull;n.value=i,t.iframeWindow.pmFull=!0,t.iframeWindow.Variable.pmObjJson?.[e]||t.iframeWindow.Utils.service.buildPmHelper(1,e,e),t.iframeWindow.msgfetch(0,t.iframeWindow.Variable.pmObjJson?.[e],e,""),t.iframeWindow.pmFull=o,n.value=a},sendSelfPrivateMessageSilence:e=>{n.operation.sendPrivateMessageSilence(n.operation.getUserUid(),e)},giveALike:(e,i="")=>{e=String(e),i=String(i),e&&t.socketApi.send(`+*${e}${i?" "+i:""}`)},switchRoom:e=>{e=String(e),t.iframeWindow?.Objs?.mapHolder?.function?.roomchanger&&t.iframeWindow.Objs.mapHolder.function.roomchanger(e)}},event:{roomMessage:new i,privateMessage:new i,selfPrivateMessage:new i}};window.iiroseForgeApi=n;const a={diFull:e=>"calc(100% - "+e+")",rgb:(e,t,i,n=1)=>"rgba("+e+", "+t+", "+i+", "+n+")"};function o(e,t){if(!e)return!1;for(let i=0,n=e.length;i<n;i++)if(null!=e[i]&&t(e[i],i))return!0;return!1}const s=new WeakMap,r=new FinalizationRegistry((e=>{e.destroy()}));class l{proxyObj=null;srcObj=null;keys=[];hookMap=null;ctFunc=null;constructor(e,t,i,n,a){this.proxyObj=e,this.srcObj=t,this.keys=i,this.hookMap=n,this.ctFunc=a}getValue(){return this.ctFunc?this.ctFunc(...this.keys.map((e=>this.srcObj[e]))):this.srcObj[this.keys[0]]}addHook(e){this.keys.forEach((t=>{let i=this.hookMap.get(t);null==i&&(i=new Set,this.hookMap.set(t,i)),i.add(e)}))}removeHook(e){this.keys.forEach((t=>{let i=this.hookMap.get(t);i&&(i.delete(e),0==i.size&&this.hookMap.delete(t))}))}bindToValue(e,t){return new d(this,e,t)}bindToCallback(e){return new c(this,e)}}class c{info=null;cbRef=null;callback=null;constructor(e,t){this.info=e,this.cbRef=new WeakRef(t),this.callback=t,e.addHook(this)}emit(){let e=this.cbRef.deref();if(e)try{e(this.info.getValue())}catch(e){console.error(e)}}destroy(){this.info.removeHook(this),r.unregister(this)}bindDestroy(e){let t=s.get(e);return null==t&&(t=new Set,s.set(e,t)),t.add(this.callback),this.callback=null,r.register(e,this,this),this}}class d{info=null;targetRef=null;targetKey="";constructor(e,t,i){this.info=e,this.targetRef=new WeakRef(t),this.targetKey=i,e.addHook(this),r.register(t,this,this)}emit(){let e=this.targetRef.deref();if(null!=e)try{e[this.targetKey]=this.info.getValue()}catch(e){console.error(e)}}destroy(){this.info.removeHook(this),r.unregister(this)}}const h=Symbol("NElement");class p{element=null;styleHooks=new Map;constructor(e){this.element=e}addChild(e){e instanceof p?this.element.appendChild(e.element):this.element.appendChild(e)}addChilds(...e){e.forEach((e=>{Array.isArray(e)?e.forEach((e=>this.addChild(e))):"object"==typeof e&&this.addChild(e)}))}insChild(e,t){let i=this.element;"number"==typeof t?t>=0||t<i.childElementCount?i.insertBefore(e.element,i.children[t]):t<0||t>=-i.childElementCount?i.insertBefore(e.element,i.children[i.childElementCount+t]):i.appendChild(e.element):i.insertBefore(e.element,t.element)}childInd(e){let t=-1;return o(this.element.children,((i,n)=>{if(i==e.element)return t=n,!0})),t}remove(){this.element.remove()}removeChilds(e=0,t=1/0){let i=this.element;t>i.childElementCount&&(t=i.childElementCount);for(let n=e;n<t;n++)i.children[e].remove()}getChilds(){return Array.from(this.element.children).map((e=>m(e)))}getChild(e){return m(this.element.children[e])}setStyle(e,t,i){i!=this.styleHooks.get(e)&&(this.styleHooks.get(e)?.destroy(),null!=i?this.styleHooks.set(e,i):this.styleHooks.delete(e)),t instanceof l?t.bindToCallback((t=>{this.setStyle(e,t,i)})).bindDestroy(this).emit():this.element.style[e]=t}getStyle(e){if("string"==typeof e)return this.element.style[e]}setStyles(e){o(Object.keys(e),(t=>{(function(e,...t){return o(t,(t=>t==e))})(typeof e[t],"number","string")&&(this.element.style[t]=e[t])}))}setText(e){this.element.innerText=e}addText(e){return this.element.appendChild(document.createTextNode(e))}setAttrs(e){o(Object.keys(e),(t=>{this.element[t]=e[t]}))}setDisplay(e){this.setStyle("display",e)}addEventListener(e,t,i){this.element.addEventListener(e,t,i)}removeEventListener(e,t,i){this.element.removeEventListener(e,t,i)}animate(e,t){this.element.animate(e,t)}asse(e){return e(this),this}getTagName(){return this.element.tagName.toLowerCase()}static byElement(e){return e[h]?e[h]:e[h]=new p(e)}}function m(e){return p.byElement(e)}function f(e){let t=m(document.createElement(e.tagName?e.tagName:"div"));return["height","width","position","top","left","right","bottom","display","overflow"].forEach((i=>{e[i]&&t.setStyle(i,e[i])})),e.style&&t.setStyles(e.style),e.text&&t.setText(e.text),e.attr&&t.setAttrs(e.attr),e.classList&&t.element.classList.add(...e.classList),e.event&&Object.keys(e.event).forEach((i=>{e.event[i]&&t.addEventListener(i,e.event[i])})),e.child&&e.child.forEach((e=>{e&&(e instanceof p?t.addChild(e):t.addChild(f(e)))})),e.assembly&&e.assembly.forEach((e=>{let i=e(t);i&&(t=i)})),t}function u(e,t){let i={},n={};return Object.keys(t).forEach((e=>i[e]=t[e])),Object.keys(e).forEach((a=>{if("child"!=a)if("$"==a[0]){let o=a.slice(1);n[o]=t[o],i[o]=t[o]=e[a]}else if("$"==a.slice(-1)){let i=a.slice(0,-1);n[i]=t[i],t[i]=e[a]}else i[a]=e[a]})),i.left&&i.right&&i.width&&delete i.width,i.top&&i.bottom&&i.height&&delete i.height,e.child&&(i.child=[],e.child.forEach((e=>{e&&(e instanceof p?i.child.push(e):i.child.push(u(e,t)))}))),Object.keys(n).forEach((e=>t[e]=n[e])),i}function g(e){return f(u(e,{}))}class b{eventName=null;callback=null;constructor(e,t){this.eventName=e,this.callback=t}apply(e){e.addEventListener(this.eventName,this.callback)}}class y{callback=null;constructor(e){this.callback=e}apply(e){this.callback(e)}}class w{key=null;value=null;constructor(e,t){this.key=e,this.value=t}apply(e){if("function"==typeof this.value){let t=this.value(e.element[this.key]);null!=t&&(e.element[this.key]=t)}else e.element[this.key]=this.value}}class x{tagName=null;constructor(e){this.tagName=e.toLowerCase()}}class v{list=null;flatFlag=!1;constructor(e){this.list=e}apply(e){const t=e.getTagName();this.list.forEach((i=>{if("string"==typeof i)e.addText(i);else switch(Object.getPrototypeOf(i)?.constructor){case l:{const t=i,n=e.addText(t.getValue());t.bindToValue(n,"data");break}case x:if(t!=i.tagName)throw"(NList) The feature tagName does not match the element";break;case k:case w:case b:case y:i.apply(e);break;case p:e.addChild(i);break;case v:{const t=i;t.flatFlag?t.apply(e):e.addChild(t.getElement());break}case Array:e.addChild(v.getElement(i));break;default:throw"(NList) Untractable feature types were found"}}))}getTagName(){let e="";return this.list.forEach((t=>{let i="";if(t instanceof x?i=t.tagName:t instanceof v&&t.flatFlag&&(i=t.getTagName()),i)if(e){if(e!=i)throw"(NList) Multiple TagNames exist in a feature list"}else e=i})),e}getElement(){let e=this.getTagName();""==e&&(e="div");let t=m(document.createElement(e));return this.apply(t),t}static flat(e){let t=new v(e);return t.flatFlag=!0,t}static getElement(e){return new v(e).getElement()}}class k{key=null;value=null;constructor(e,t){this.key=e,this.value=t}apply(e){e.setStyle(this.key,this.value)}}function S(e,t){return new k(e,t)}function E(e){return v.flat(Object.keys(e).map((t=>new k(t,e[t]))))}class M{x=0;y=0;vx=0;vy=0;sx=0;sy=0;hold=!1;pressing=!1;constructor(e,t,i,n,a,o,s,r){this.x=e,this.y=t,this.vx=i,this.vy=n,this.sx=a,this.sy=o,this.hold=s,this.pressing=r}}function C(e,t,i=0){e.addEventListener("mousedown",(e=>function(e){e.cancelable&&e.preventDefault();r=o=e.clientX,l=s=e.clientY,window.addEventListener("mousemove",n,!0),window.addEventListener("mouseup",a,!0),e.button==i&&(c=!0,t(new M(o,s,0,0,o,s,!0,!0)))}(e)),!1);let n=e=>function(e){if(c){let i=e.clientX-o,n=e.clientY-s;o=e.clientX,s=e.clientY,t(new M(o,s,i,n,r,l,!0,!1))}}(e),a=e=>function(e){let d=e.clientX-o,h=e.clientY-s;o=e.clientX,s=e.clientY,window.removeEventListener("mousemove",n,!1),window.removeEventListener("mouseup",a,!1),c&&e.button==i&&(c=!1,t(new M(o,s,d,h,r,l,!1,!1)))}(e),o=0,s=0,r=0,l=0,c=!1}function L(e,t){e.addEventListener("touchstart",(e=>function(e){e.cancelable&&e.preventDefault();o(e.touches,(e=>{let n={id:e.identifier,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY};i.push(n),t(new M(n.x,n.y,0,0,n.sx,n.sy,!0,!0))}))}(e)),{capture:!1,passive:!1}),e.addEventListener("touchmove",(e=>function(e){o(e.touches,(e=>{let a=n(e.identifier);if(a>-1){let n=i[a],o=e.clientX-n.x,s=e.clientY-n.y;n.x=e.clientX,n.y=e.clientY,t(new M(n.x,n.y,o,s,n.sx,n.sy,!0,!1))}}))}(e)),{capture:!1,passive:!0}),e.addEventListener("touchend",(e=>function(e){o(e.touches,(e=>{let a=n(e.identifier);if(a>-1){let n=i[a];i.splice(a,1);let o=e.clientX-n.x,s=e.clientY-n.y;n.x=e.clientX,n.y=e.clientY,t(new M(n.x,n.y,o,s,n.sx,n.sy,!1,!1))}}))}(e)),{capture:!1,passive:!0});let i=[];function n(e){let t=-1;return i.forEach(((i,n)=>{e==i.id&&(t=n)})),t}}function F(e){let t=!1;return(...i)=>t?null:(t=!0,e(...i))}class j{#e=new P;addPath(e,t){this.#e.addPath(e,0,t)}matchPrefix(e){this.#e.matchPrefix(e,0)}}class P{#t=new Map;#i=null;addPath(e,t,i){if(t>=e.length)this.#i=i;else{let n=this.#t.get(e[t]);null==n&&(n=new P,this.#t.set(e[t],n)),n.addPath(e,t+1,i)}}matchPrefix(e,t){if(t>=e.length)this.#i?.("",e);else{let i=this.#t.get(e[t]);null!=i?i.matchPrefix(e,t+1):this.#i?.(e.slice(t),e)}}}let W=new j,O=new j;O.addPath('"',(e=>{e.split("<").forEach((e=>{let t=e.split(">");"s"!=t[4]&&"'"!=t[3][0]&&n.event.roomMessage.trigger({senderId:t[8],senderName:t[2],content:t[3]})}))})),O.addPath('""',(e=>{e.split("<").forEach((e=>{let t=e.split(">");if(""==t[6]){let e=n.operation.getUserUid();t[1]!=e?n.event.privateMessage.trigger({senderId:t[1],senderName:t[2],content:t[4]}):t[1]==e&&t[11]==e&&n.event.selfPrivateMessage.trigger({content:t[4]})}}))}));let H=m(document.body);H.setStyle("cursor","default");const z={version:"alpha v1.0.0"};let I="https://qwq0.github.io/iiroseForge/l.js",A=`<script type="text/javascript" src="${I}"><\/script>`;let R='!function(){"use strict";function e(e=2){var t=Math.floor(Date.now()).toString(36);for(let a=0;a<e;a++)t+="-"+Math.floor(1e12*Math.random()).toString(36);return t}function t(t,a){let r=new Map;let n=function t(n){if("function"==typeof n){let t={},s=e();return a.set(s,n),r.set(t,s),t}if("object"==typeof n){if(Array.isArray(n))return n.map(t);{let e={};return Object.keys(n).forEach((a=>{e[a]=t(n[a])})),e}}return n}(t);return{result:n,fnMap:r}}const a=new FinalizationRegistry((({id:e,port:t})=>{t.postMessage({type:"rF",id:e})}));function r(r,n,s,i,o){let p=new Map;n.forEach(((r,n)=>{if(!p.has(r)){let n=(...a)=>new Promise(((n,p)=>{let l=t(a,i),d=e();i.set(d,n),o.set(d,p),s.postMessage({type:"fn",id:r,param:l.result,fnMap:l.fnMap.size>0?l.fnMap:void 0,cb:d})}));p.set(r,n),a.register(n,{id:r,port:s})}}));const l=e=>{if("object"==typeof e){if(n.has(e))return p.get(n.get(e));if(Array.isArray(e))return e.map(l);{let t={};return Object.keys(e).forEach((a=>{t[a]=l(e[a])})),t}}return e};return{result:l(r)}}(()=>{let e=null,a=new Map,n=new Map;window.addEventListener("message",(s=>{"setMessagePort"==s.data&&null==e&&(e=s.ports[0],Object.defineProperty(window,"iframeSandbox",{configurable:!1,writable:!1,value:{}}),e.addEventListener("message",(async s=>{let i=s.data;switch(i.type){case"execJs":new Function(...i.paramList,i.js)(i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param);break;case"fn":if(a.has(i.id)){let s=i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param;try{let r=await a.get(i.id)(...s);if(i.cb){let n=t(r,a);e.postMessage({type:"sol",id:i.cb,param:[n.result],fnMap:n.fnMap.size>0?n.fnMap:void 0})}}catch(t){i.cb&&e.postMessage({type:"rej",id:i.cb,param:[t]})}}break;case"rF":a.delete(i.id);break;case"sol":{let t=i.fnMap?r(i.param,i.fnMap,e,a,n).result:i.param;a.has(i.id)&&a.get(i.id)(...t),a.delete(i.id),n.delete(i.id);break}case"rej":n.has(i.id)&&n.get(i.id)(...i.param),a.delete(i.id),n.delete(i.id)}})),e.start(),e.postMessage({type:"ready"}))})),window.addEventListener("load",(e=>{console.log("sandbox onload")}))})()}();';function N(e=2){var t=Math.floor(Date.now()).toString(36);for(let i=0;i<e;i++)t+="-"+Math.floor(1e12*Math.random()).toString(36);return t}function T(e,t){let i=new Map;let n=function e(n){if("function"==typeof n){let e={},a=N();return t.set(a,n),i.set(e,a),e}if("object"==typeof n){if(Array.isArray(n))return n.map(e);{let t={};return Object.keys(n).forEach((i=>{t[i]=e(n[i])})),t}}return n}(e);return{result:n,fnMap:i}}const U=new FinalizationRegistry((({id:e,port:t})=>{t.postMessage({type:"rF",id:e})}));function D(e,t,i,n,a){let o=new Map;t.forEach(((e,t)=>{if(!o.has(e)){let t=(...t)=>new Promise(((o,s)=>{let r=T(t,n),l=N();n.set(l,o),a.set(l,s),i.postMessage({type:"fn",id:e,param:r.result,fnMap:r.fnMap.size>0?r.fnMap:void 0,cb:l})}));o.set(e,t),U.register(t,{id:e,port:i})}}));const s=e=>{if("object"==typeof e){if(t.has(e))return o.get(t.get(e));if(Array.isArray(e))return e.map(s);{let t={};return Object.keys(e).forEach((i=>{t[i]=s(e[i])})),t}}return e};return{result:s(e)}}class B{cbList=[];onceCbList=[];add(e){this.cbList.push(e)}addOnce(e){this.onceCbList.push(e)}remove(e){let t=this.cbList.indexOf(e);t>-1?this.cbList.splice(t,1):(t=this.onceCbList.indexOf(e),t>-1&&this.onceCbList.splice(t,1))}removeAll(){this.cbList=[],this.onceCbList=[]}trigger(e){this.cbList.forEach((t=>{t(e)})),this.onceCbList.forEach((t=>{t(e)})),this.onceCbList=[]}}class Y{#n=null;#a=null;#o=!1;#s=!1;#r=new AbortController;#l=new B;apiObj={};#c=new Map;#d=new Map;constructor(e=document.body){if(!("sandbox"in HTMLIFrameElement.prototype)||!Object.hasOwn(HTMLIFrameElement.prototype,"contentDocument"))throw"sandbox property are not supported";let t=document.createElement("iframe");t.sandbox.add("allow-scripts"),t.style.display="none",t.srcdoc=["<!DOCTYPE html>","<html>","<head>",'<meta charset="utf-8" />',"<title>iframe sandbox</title>",'<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />',"</head>","<body>","<script>",R,"<\/script>","</body>","</html>"].join("");let i=new MessageChannel,n=i.port1;n.addEventListener("message",(async e=>{let t=e.data;switch(t.type){case"ready":this.#o=!0,this.#l.trigger();break;case"fn":if(this.#c.has(t.id)){let e=t.fnMap?D(t.param,t.fnMap,n,this.#c,this.#d).result:t.param;try{let i=await this.#c.get(t.id)(...e);if(t.cb){let e=T(i,this.#c);n.postMessage({type:"sol",id:t.cb,param:[e.result],fnMap:e.fnMap.size>0?e.fnMap:void 0})}}catch(e){t.cb&&n.postMessage({type:"rej",id:t.cb,param:[e]})}}break;case"rF":this.#c.delete(t.id);break;case"sol":{let e=t.fnMap?D(t.param,t.fnMap,n,this.#c,this.#d).result:t.param;this.#c.has(t.id)&&this.#c.get(t.id)(...e),this.#c.delete(t.id),this.#d.delete(t.id);break}case"rej":this.#d.has(t.id)&&this.#d.get(t.id)(...t.param),this.#c.delete(t.id),this.#d.delete(t.id)}}),{signal:this.#r.signal}),t.addEventListener("load",(()=>{if(!this.#o&&!this.#s){if(t.contentDocument)throw"sandbox isolation failed";n.start(),t.contentWindow.postMessage("setMessagePort","*",[i.port2])}}),{signal:this.#r.signal}),e.appendChild(t),this.#n=t,this.#a=n}async waitAvailable(){return new Promise(((e,t)=>{this.#o?e():this.#l.addOnce(e)}))}async execJs(e){this.#o||await this.waitAvailable();let t=T(this.apiObj,this.#c);this.#a.postMessage({type:"execJs",js:e,param:t.result,fnMap:t.fnMap.size>0?t.fnMap:void 0,paramList:["api"]})}get iframe(){return this.#n}destroy(){this.#s||(this.#s=!0,this.#n.remove(),this.#n=null,this.#r.abort(),this.#r=null,this.#a.close(),this.#a=null,this.#c=null,this.#d=null,this.#l.removeAll(),this.#l=null,this.#o=!1)}}function $(e){e.setStyle("transition","transform 50ms linear, text-shadow 150ms linear"),e.addEventListener("mousedown",(()=>{e.setStyle("transform","scale(0.95) translateY(2px)")})),e.addEventListener("mouseup",(()=>{e.setStyle("transform","")})),e.addEventListener("mouseenter",(()=>{e.setStyle("textShadow",`0 0 0.3em ${a.rgb(255,255,255,.5)}`),e.setStyle("transform","translateY(-1px)")})),e.addEventListener("mouseleave",(()=>{e.setStyle("textShadow",""),e.setStyle("transform","")}))}var X=g({position:"absolute",right:"0px",style:{userSelect:"none",pointerEvents:"none",zIndex:"30000"}});function J(e,t,i="iiroseForge"){var n=g({style:{backgroundColor:a.rgb(255,255,255,.95),marginRight:"1em",marginTop:"1em",marginLeft:"1em",float:"right",clear:"both",overflow:"hidden hidden",padding:"1em",boxSizing:"border-box",minWidth:"180px",borderRadius:"0.2em",boxShadow:`${a.rgb(0,0,0,.5)} 5px 5px 10px`},position:"relative",child:[{tagName:"i",classList:["fa","fa-info-circle"]},{text:e,style:{fontSize:"1.2em",lineHeight:"1.5em",fontWeight:"bolder"}},{text:t},{text:i,style:{fontSize:"0.9em",float:"right"}},{text:"×",position:"absolute",right:"4px",top:"1px",assembly:[$],style:{fontSize:"25px",lineHeight:"1em"},event:{click:F((()=>{o()}))}}]});function o(){n.setStyle("pointerEvents","none"),n.animate([{},{transform:"translateX(180%)"}],{duration:270,fill:"forwards"}),setTimeout((()=>{n.setStyle("visibility","hidden"),n.animate([{height:n.element.clientHeight+"px"},{marginTop:0,height:0,padding:0}],{duration:150,fill:"forwards"}),setTimeout((()=>{n.remove()}),150)}),270)}X.addChild(n),n.animate([{transform:"translateX(180%) translateY(10%) scale(0.6)"},{}],{duration:180}),setTimeout((()=>{n.setStyle("pointerEvents","auto")}),180),setTimeout((()=>{o()}),3900+Math.min(1e4,115*t.length))}H.addChild(X);const V={iiroseForge:{plugInfo:[]}};!function(){try{let e=localStorage.getItem("iiroseForge");if(!e)return;let t=JSON.parse(e);Object.keys(t).forEach((e=>{V.iiroseForge[e]=t[e]}))}catch(e){J("错误","无法读入储存 这可能导致iiroseForge配置丢失")}}();const _={operation:{getUserName:"获取你的昵称",getUserUid:"获取你的uid",getUserRoomId:"获取所在房间id",getUserProfilePictureUrl:"获取你的头像",getUserInputColor:"获取你的主题色",sendRoomMessage:"在房间中发送信息",sendPrivateMessageSilence:"[危险]静默发送私聊消息",sendPrivateMessage:"[危险]发送私聊消息",sendSelfPrivateMessageSilence:"向自己静默发送私聊消息(同账号多设备间通信)",giveALike:"进行点赞",switchRoom:"切换所在房间"},event:{roomMessage:"接收房间消息",privateMessage:"[危险]接收私聊消息",selfPrivateMessage:"接收自己(其他设备)发送给自己的私聊消息"}};function K(e,t,i=!1,...n){return new Promise((o=>{var s=void 0,r=g({width:"100%",height:"100%",$position:"absolute",style:{userSelect:"none",backgroundColor:a.rgb(0,0,0,.7),alignItems:"center",justifyContent:"center",zIndex:"30001"},assembly:[e=>{e.animate([{opacity:.1},{opacity:1}],{duration:120})}],display:"flex",child:[{style:{border:"1px white solid",backgroundColor:a.rgb(255,255,255,.95),color:a.rgb(0,0,0),alignItems:"center",justifyContent:"center",flexFlow:"column",lineHeight:"35px",minHeight:"190px",minWidth:"280px",maxWidth:"95%",boxSizing:"border-box",padding:"20px",borderRadius:"7px",pointerEvents:"none"},assembly:[e=>{e.animate([{transform:"scale(0.9) translateY(-100px)"},{}],{duration:120}),setTimeout((()=>{e.setStyle("pointerEvents","auto")}),120)},e=>{s=e}],position$:"static",display:"flex",child:[{text:e},{text:t},...n,{text:"确定",assembly:[$],event:{click:()=>{l(),o(!0)}}},i?{text:"取消",assembly:[$],event:{click:()=>{l(),o(!1)}}}:null]}]});function l(){s.setStyle("pointerEvents","none"),s.animate([{},{transform:"scale(0.9) translateY(-100px)"}],{duration:120,fill:"forwards"}),r.animate([{opacity:1},{opacity:.1}],{duration:120,fill:"forwards"}),setTimeout((()=>{r.remove()}),120)}H.addChild(r)}))}async function q(e,t,i){let{sandbox:a,windowElement:o}=function(){let e=0,t=0,i=null,n=null,a=v.getElement([E({display:"none",position:"fixed",overflow:"hidden",border:"1px white solid",backgroundColor:"rgba(30, 30, 30, 0.85)",backdropFilter:"blur(2px)",color:"rgba(255, 255, 255)",alignItems:"center",justifyContent:"center",flexFlow:"column",lineHeight:"1.1em",boxSizing:"border-box",padding:"10px",borderRadius:"3px",pointerEvents:"none",resize:"both",boxShadow:"rgba(0, 0, 0, 0.5) 5px 5px 10px",zIndex:"20001",height:"190px",width:"280px"}),["plug-in",E({position:"absolute",left:"0",top:"0",right:"0",cursor:"move",lineHeight:"1.5em",backgroundColor:"rgba(100, 100, 100, 0.2)"}),new y((i=>{var o=0,s=0,r=i=>{i.hold?(i.pressing&&(o=e,s=t),e=o+i.x-i.sx,t=s+i.y-i.sy,e<0?e=0:e>=H.element.clientWidth-a.element.offsetWidth&&(e=H.element.clientWidth-a.element.offsetWidth),t<0?t=0:t>=H.element.clientHeight-a.element.offsetHeight&&(t=H.element.clientHeight-a.element.offsetHeight),a.setStyle("left",`${e}px`),a.setStyle("top",`${t}px`),n.setStyle("pointerEvents","none")):n.setStyle("pointerEvents","auto")};C(i,r),L(i,r)}))],["-",E({position:"absolute",right:"4px",top:"1px",cursor:"default",fontSize:"1.5em",lineHeight:"1em"}),new b("click",(()=>{a.setDisplay("none")}))],[E({position:"absolute",top:"1.5em",bottom:"0",left:"0",right:"0",overflow:"auto"}),new y((e=>{i=e}))]]);H.addChild(a),new ResizeObserver((()=>{e>H.element.clientWidth-a.element.offsetWidth&&a.setStyle("width",H.element.clientWidth-e+"px"),t>H.element.clientHeight-a.element.offsetHeight&&a.setStyle("height",H.element.clientHeight-t+"px"),e<0&&(e=0,a.setStyle("left",`${e}px`)),t<0&&(t=0,a.setStyle("top",`${t}px`))})).observe(a.element);let o=new Y(i.element);return n=m(o.iframe),n.setStyles({display:"block",border:"none",height:"100%",width:"100%"}),{windowElement:a,sandbox:o}}();await a.waitAvailable();let s=i?.operationPermissionSet?i?.operationPermissionSet:new Set,r=i?.eventPermissionSet?i?.eventPermissionSet:new Set,l={applyPermission:async(t,i)=>{if(t=t.filter((e=>Boolean(_.operation[e]))),i=i.filter((e=>Boolean(_.event[e]))),t.filter((e=>s.has(e)))&&i.every((e=>r.has(e))))return!0;let n=await K("权限申请",[`是否允许 ${e} 获取以下权限?`,...t.map((e=>"+ "+_.operation[e])),...i.map((e=>"+ "+_.event[e]))].join("\n"),!0);return n&&(t.forEach((e=>{_.operation[e]&&s.add(e)})),i.forEach((e=>{_.event[e]&&r.add(e)})),G.savePlugList()),!!n}};Object.keys(n.operation).forEach((e=>{_.operation[e]&&(l[e]=(...t)=>{if(s.has(e))return n.operation[e](...t)})})),l.addEventListener=(e,t)=>{_.event[e]&&n.event[e]&&r.has(e)&&n.event[e].add(t)},a.apiObj={iiroseForge:l};let c=await(await fetch(t)).text();return a.execJs(c),{sandbox:a,windowElement:o,operationPermissionSet:s,eventPermissionSet:r}}const G=new class{map=new Map;async addPlug(e,t,i){this.map.has(e)||this.map.set(e,{url:t,...await q(e,t,i)})}showPlugWindow(e){if(this.map.has(e)){let t=this.map.get(e).windowElement;t.setDisplay("block"),t.setStyle("pointerEvents","auto")}}removePlug(e){this.map.has(e)&&(this.map.get(e).sandbox.destroy(),this.map.delete(e))}savePlugList(){let e=[];this.map.forEach(((t,i)=>{e.push([i,t.url,Array.from(t.operationPermissionSet.values()),Array.from(t.eventPermissionSet.values())])})),V.iiroseForge.plugInfo=e,function(){try{let e=JSON.stringify(V.iiroseForge);localStorage.setItem("iiroseForge",e)}catch(e){J("错误","无法写入储存 这可能导致iiroseForge配置丢失")}}()}readPlugList(){try{let e=V.iiroseForge.plugInfo;e.length>0&&(e.forEach((([e,t,i,n])=>{this.addPlug(e,t,{operationPermissionSet:new Set(i),eventPermissionSet:new Set(n)})})),J("iiroseForge plug-in",`已加载 ${e.length} 个插件`))}catch(e){}}};function Q(e){let t=e.split(" ");return new y((e=>{t.forEach((t=>{e.element.classList.add(t)}))}))}function Z(e){return new Promise((t=>{var i=null,n=g({width:"100%",height:"100%",$position:"absolute",style:{userSelect:"none",backgroundColor:a.rgb(0,0,0,.7),alignItems:"center",justifyContent:"center",zIndex:"30001"},assembly:[e=>{e.animate([{opacity:.1},{opacity:1}],{duration:120})}],display:"flex",child:[{style:{border:"1px white solid",backgroundColor:a.rgb(255,255,255,.95),color:a.rgb(0,0,0),alignItems:"stretch",justifyContent:"center",flexFlow:"column",lineHeight:"45px",minHeight:"10px",minWidth:"280px",maxHeight:"100%",maxWidth:"95%",boxSizing:"border-box",padding:"10px",borderRadius:"7px",pointerEvents:"none"},assembly:[e=>{e.animate([{transform:"scale(0.9) translateY(-100px)"},{}],{duration:120}),setTimeout((()=>{e.setStyle("pointerEvents","auto")}),120),e.getChilds().forEach((e=>{e.addEventListener("click",o),$(e)}))},e=>{i=e}],position$:"static",overflow:"auto",child:e,event:{click:e=>{e.stopPropagation()}}}],event:{click:o}});function o(){i.setStyle("pointerEvents","none"),i.animate([{},{transform:"scale(0.9) translateY(-100px)"}],{duration:120,fill:"forwards"}),n.animate([{opacity:1},{opacity:.1}],{duration:120,fill:"forwards"}),setTimeout((()=>{n.remove()}),120)}H.addChild(n)}))}function ee(){let e=v.getElement([S("position","fixed"),S("top","0"),S("left","0"),S("zIndex","91000"),S("height","100%"),S("width","100%"),S("backgroundColor","rgba(255, 255, 255, 0.75)"),S("backdropFilter","blur(3px)"),[S("opacity","0.8"),S("backgroundColor","#303030"),S("width","100%"),S("boxShadow","0 0 1px rgb(0, 0, 0, 0.12), 0 1px 1px rgb(0, 0, 0, 0.24)"),S("zIndex","2"),S("fontFamily","md"),S("height","40px"),S("lineHeight","40px"),S("fontSize","26px"),S("padding","0 16px 0 16px"),S("whiteSpace","nowrap"),S("boxSizing","border-box"),S("position","relative"),S("color","#fff"),[Q("mdi-anvil"),E({display:"inline",opacity:"0.8",backgroundColor:"#303030",boxShadow:"0 0 1px rgb(0,0,0,0.12), 0 1px 1px rgb(0,0,0,0.24)",zIndex:"2",fontFamily:"md",height:"40px",lineHeight:"40px",fontSize:"26px",padding:"0 0 0 0",whiteSpace:"nowrap",boxSizing:"border-box",position:"relative",color:"#fff"})],[S("display","inline"),S("fontSize","16px"),S("opacity","0.7"),S("fontWeight","bold"),S("marginLeft","16px"),S("height","100%"),S("lineHeight","40px"),S("display","inline"),S("verticalAlign","top"),`欢迎使用 iirose-Forge   version ${z.version}`]],[S("position","absolute"),S("width","100%"),S("top","40px"),S("bottom","40px"),[...[{title:"管理插件",text:"管理插件",icon:"puzzle",onClick:async()=>{Z([v.getElement(["[ 添加插件 ]",new b("click",(async()=>{let e=await async function(e,t,i=!1,n=""){var a=g({tagName:"input",assembly:[$],style:{textAlign:"center",margin:"15px"},attr:{value:n}});return a.addEventListener("keydown",(e=>{e.stopPropagation()}),!0),await K(e,t,i,a)?a.element.value:void 0}("添加插件","请输入插件地址\n插件会自动进行更新",!0);null!=e&&(await G.addPlug(e,e),G.savePlugList())}))]),...Array.from(G.map.keys()).map((e=>v.getElement([`${e}`,new b("click",(async()=>{Z([v.getElement(["显示插件窗口",new b("click",(()=>{G.showPlugWindow(e)}))]),v.getElement(["移除插件",new b("click",(()=>{G.removePlug(e),G.savePlugList()}))])])}))])))])}},{title:"安装iiroseForge",text:"下次使用无需注入",icon:"puzzle",onClick:async()=>{!async function(){let e=await caches.open("v"),t=await(await caches.match("/")).text();if(t.indexOf(A)>-1)return;let i=t.indexOf("</body></html>");if(-1==i)return;let n=t.slice(0,i)+A+t.slice(i);await e.put("/",new Response(new Blob([n],{type:"text/html"}),{status:200,statusText:"OK"}))}(),K("安装iiroseForge","已完成")}},{title:"卸载iiroseForge",text:"下次启动清除iiroseForge",icon:"puzzle",onClick:async()=>{!async function(){let e=await caches.open("v"),t=await(await caches.match("/")).text(),i=t.indexOf(A);if(-1==i)return;let n=t.slice(0,i)+t.slice(i+A.length);await e.put("/",new Response(new Blob([n],{type:"text/html"}),{status:200,statusText:"OK"}))}(),K("卸载iiroseForge","已完成")}}].map((e=>[Q("commonBox"),S("maxWidth","calc(100% - 24px)"),S("minWidth","355.2px"),S("minHeight","200px"),S("float","left"),S("boxShadow","0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),S("margin","24px 12px 0px 12px"),S("position","relative"),[Q("commonBoxHead"),S("backgroundColor","rgba(255,255,255,0.2)"),S("color","rgba(0,0,0,0.4)"),S("height","100px"),S("width","100%"),S("display","flex"),S("justifyContent","center"),S("padding","0 24px"),S("boxSizing","border-box"),[Q("mdi-"+e.icon),S("lineHeight","100px"),S("fontSize","30px"),S("fontFamily","md"),S("display","inline-block"),S("verticalAlign","top"),S("height","100%"),S("opacity","0.7")],[S("lineHeight","100px"),S("fontSize","20px"),S("display","inline-block"),S("verticalAlign","top"),S("height","100%"),S("fontWeight","bold"),S("marginLeft","22px"),S("overflow","hidden"),S("whiteSpace","pre"),S("textOverflow","ellipsis"),e.title]],[Q("textColor"),S("width","100%"),S("minHeight","100px"),S("backgroundColor","rgba(255,255,255,0.5)"),S("color","rgba(0,0,0,0.75)"),[S("fontWeight","bold"),S("width","100%"),S("height","100%"),S("lineHeight","1.8em"),S("textAlign","center"),S("padding","2.2em"),S("boxSizing","border-box"),S("whiteSpace","pre-wrap"),S("fontSize","16px"),S("color","rgba(0,0,0,0.7)"),e.text]],new b("click",e.onClick)]))]],[S("color","#303030"),S("background","#fff"),S("opacity","0.8"),S("display","flex"),S("height","40px"),S("position","absolute"),S("bottom","0"),S("width","100%"),S("boxShadow","0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),S("zIndex","2"),...[{text:"< 返回",onClick:()=>{e.remove()}}].map((e=>[S("width","0"),S("flexGrow","1"),S("justifyContent","center"),S("padding","0 24px"),S("boxSizing","border-box"),new b("click",e.onClick),[],[S("display","inline-block"),S("verticalAlign","top"),S("height","100%"),S("fontWeight","bold"),S("marginLeft","22px"),S("fontSize","14px"),S("lineHeight","40px"),S("overflow","hidden"),S("whiteSpace","pre"),S("textOverflow","ellipsis"),e.text]]))]]);return e.element.id="iiroseForgeMenu",e}function te(){!function(e,t,i=!1){let n=0,a=Date.now(),o=null,s=()=>{n++;try{return e(n,Date.now()-a),void(null!=o&&clearInterval(o))}catch(e){}};o=setInterval(s,t),i&&s()}((()=>{let i=document.getElementById("mainFrame"),n=i.contentWindow,a=i.contentDocument;if(!n.iiroseForgeInjected){if(null!=n.socket.__onmessage||null==n.socket._onmessage||null==n.socket._send)throw"main iframe is not ready";(()=>{let e=m(a.getElementById("functionHolder").childNodes[0]),i=function(){let e=v.getElement([S("background","#fff"),S("boxShadow","0 0 1px rgb(0,0,0,0.12),0 1px 1px rgb(0,0,0,0.24)"),S("position","relative"),S("zIndex","1"),S("color","#212121"),S("paddingLeft","16px"),S("paddingRight","56px"),S("transition","background-color 0.1s ease 0s, color 0.1s ease 0s"),S("cursor","url(images/cursor/2.cur), pointer"),S("width","100%"),S("height","56px"),S("boxSizing","border-box"),S("lineHeight","56px"),S("whiteSpace","nowrap"),new b("click",(()=>{t.iframeWindow?.functionHolderDarker?.click(),t.iframeBody.addChild(ee())})),[new x("span"),new y((e=>e.element.classList.add("functionBtnIcon","mdi-anvil")))],[new x("span"),"Forge菜单",new y((e=>e.element.classList.add("functionBtnFont")))],[new x("span"),S("transform","rotate(-90deg)"),new y((e=>e.element.classList.add("functionBtnGroupIcon")))]]);return e.element.id="iiroseForgeMenuButton",e}();e.insChild(i,1)})(),t.iframeDocument=a,t.iframeWindow=n,t.iframeBody=m(a.body),t.socket=n.socket,t.socket._onmessage=e(t.socket._onmessage.bind(t.socket),(e=>{let t=e[0];try{!function(e){O.matchPrefix(e)}(t)}catch(e){return console.error("[iiroseForge]",e),!1}return!1})),t.socket.send=e(t.socket.send.bind(t.socket),(e=>{let t=e[0];try{!function(e){W.matchPrefix(e)}(t)}catch(e){return console.error("[iiroseForge]",e),!1}return!1})),n.iiroseForgeInjected=!0,console.log("[iiroseForge] 成功将iiroseForge注入iframe")}}),1e3)}if(G.readPlugList(),"iirose.com"==location.host)if("/"==location.pathname)if(window.iiroseForgeInjected)console.log("[iiroseForge] 已阻止重复注入");else{console.log("[iiroseForge] iiroseForge已启用"),document.getElementById("mainFrame").addEventListener("load",(()=>{console.log("[iiroseForge] 已重载 正在将iiroseForge注入iframe"),te()})),console.log("[iiroseForge] 正在将iiroseForge注入iframe"),te(),window.iiroseForgeInjected=!0}else if("/messages.html"==location.pathname){if(console.log("[iiroseForge] iiroseForge需要注入至主上下文中"),"iirose.com"==parent?.location?.host&&"/"==parent?.location?.pathname){let e=parent.document,t=e.createElement("script");t.src=I,e.body.appendChild(t),console.log("[iiroseForge] 修正注入")}}else console.log("[iiroseForge] 已阻止注入 iiroseForge需要注入至根页面的主上下文中");else console.log("[iiroseForge] 已阻止注入 iiroseForge仅支持蔷薇花园(iirose.com)")}();
