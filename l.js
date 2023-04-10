(function ()
{
	if (location.host != "iirose.com")
		return;
	let doc = null;
	if (location.pathname == "/")
		doc = document;
	else if (location.pathname == "/messages.html")
		doc = parent.document;
	else
		return;
	let script = doc.createElement("script");
	script.type = "text/javascript";
	script.src = "https://qwq0.github.io/iiroseForge/iiroseForge.js?" + Math.random();
	doc.body.appendChild(script);
})();
