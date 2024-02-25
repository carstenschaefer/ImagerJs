const esbuild = require("esbuild");
const { existsSync, readdirSync } = require("fs");
const loaders = require("./loaders");

const dev = process.argv.includes("--dev");
const analyze = process.argv.includes("--analyze");
const port = 8989;

/**
 * @type {import("esbuild").BuildOptions}
 */
const config = {
  entryPoints: ["src/main.js"],
  bundle: true,
  outdir: "public/build",
  minify: !dev,
  metafile: analyze,
  plugins: [],
  sourcemap: "external",
  loader: loaders,
  define: { server_port: String(port) },
  inject: [dev && "live-reload.js"].filter(Boolean),
};

(async () => {
  if (process.argv.includes("--serve")) {
    const context = await esbuild.context(config);
    await context.watch();

    await context.serve({ servedir: "public", port });

    console.log("serving: ");
    console.log(`  http://localhost:${port}`);
    readdirSync("./public").forEach(
      (s) => s == "index.html" || console.log(`  http://localhost:${port}/${s}`)
    );
  } else {
    let out = process.argv[2]?.trim();
    if (out) {
      if (existsSync(out)) config.outdir = out;
      else {
        console.log("outdir not found: ", out);
      }
    }
    const result = await esbuild.build(config);
    if (analyze) {
      console.log(await esbuild.analyzeMetafile(result.metafile));
    }

    console.log("built in: ", config.outdir);
  }
})();
