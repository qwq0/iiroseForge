import fs from "fs/promises";
import * as rollup from "rollup";
import * as terser from "terser";


(async () =>
{
    // build injector
    try
    {
        let bundle = await rollup.rollup({
            input: "./src/injector/injector.js"
        });
        let codeStr = (await bundle.generate({ format: "iife" })).output[0].code;
        await bundle.close();
        let minifyCodeStr = (await terser.minify(codeStr, {
            compress: true,
            mangle: true
        })).code;
        await fs.writeFile("./generate/injectScript.js", `export let injectorScript = ${JSON.stringify(minifyCodeStr)};`, { encoding: "utf-8" });
        await fs.writeFile("./dist/forge-injector.min.js", minifyCodeStr, { encoding: "utf-8" });
    }
    catch (error)
    {
        console.error(error);
        process.exit(-1);
    }
    process.exit(0);
})();