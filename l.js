(function () {
	if (window["p_QwQ"] == "loaded")
		return;
	window["p_QwQ"] = "loaded";
	var f = function () {
		var cw = document.getElementById("mainFrame").contentWindow;
		if (cw["p_QwQ"] == "loaded")
			return;
		cw["p_QwQ"] = "loaded";
		var scr = cw.document.createElement("script");
		scr.setAttribute("type", "text/javascript");
		scr.setAttribute("src", "https://qwq0.rthe.xyz/iirose/main.js?" + Math.random());
		cw.document.body.appendChild(scr);
	};
	setTimeout(f, 1000);
	setInterval(f, 10000);
})();
