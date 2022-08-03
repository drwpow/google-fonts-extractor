import { writableStreamFromWriter } from "https://deno.land/std@0.150.0/streams/mod.ts";
import { green, red } from "https://deno.land/std@0.150.0/fmt/colors.ts";

// CLI stuffs

if (Deno.args.includes("--help")) {
  console.log([
    "--help   Display this message",
    "--url    (required) URL to extract CSS from",
  ]);
  Deno.exit(0);
}

// Fetching stuffs

let url: string | null =
  Deno.args.find((arg) => arg.startsWith("--url=")) ||
  Deno.args[Deno.args.indexOf("--url") + 1];

if (!url) {
  console.error(red(`✘ --url not specified!`));
  Deno.exit(1);
}

if (url.startsWith("--url=")) url = url.substring("--url=".length);

let css = "";

try {
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "User-Agent":
        "Mozilla/5.0 AppleWebKit/537.36 Chrome/104.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    console.error(
      red(`✘ Server responded with ${res.status}: ${await res.text()}`)
    );
    Deno.exit(1);
  }
  const contentType = res.headers.get("Content-Type");
  if (!contentType || !contentType.toLowerCase().includes("css")) {
    console.error(red(`✘ Not valid CSS: ${url}`));
    Deno.exit(1);
  }
  css = await res.text();
} catch {
  console.error(red(`✘ Unreachable: ${url}`));
  Deno.exit(1);
}

if (!css) {
  console.error(red(`✘ Not valid CSS: ${url}`));
  Deno.exit(1);
}

// Parsing stuffs

const FONT_FAMILY_RE = /font-family:\s*([^;]+)/;
const FONT_STYLE_RE = /font-style:\s*([^;]+)/;
const FONT_WEIGHT_RE = /font-weight:\s*([^;]+)/;
const FONT_SRC_RE = /src:\s*url\(([^\)]+)/;
const EXT_RE = /[^.]+$/;
const QUOTE_RE = /['"]/g;

const fontMap: { [originalURL: string]: string } = {};
const fontFaces = css.split("/* ");

for (const fontBlock of fontFaces) {
  if (!fontBlock) continue;
  try {
    const charset = fontBlock.substring(0, fontBlock.indexOf(" "));
    const family = fontBlock
      .match(FONT_FAMILY_RE)[1]
      .trim()
      .replace(QUOTE_RE, "");
    const style = fontBlock.match(FONT_STYLE_RE)[1].trim();
    const weight = fontBlock.match(FONT_WEIGHT_RE)[1].trim();
    const src = fontBlock.match(FONT_SRC_RE)[1];
    const ext = src.match(EXT_RE)[0];
    const srcParts = src.substring("https://".length).split("/");
    const slug = srcParts[2];
    const version = srcParts[3];
    const basename = [slug, version, weight, style, charset].join("-");
    if (!fontMap[src]) fontMap[src] = `${basename}.${ext}`;
  } catch {
    console.error(`${red("✘ Could not parse font block:")}\n\n/* ${fontBlock}`);
  }
}

// Writing stuffs

await Deno.mkdir("./downloads/", { recursive: true });
// note: yes this is sequential because Google Fonts will block too many parallel requests at once
for (const [url, filename] of Object.entries(fontMap)) {
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "none",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "User-Agent":
        "Mozilla/5.0 AppleWebKit/537.36 Chrome/104.0.0.0 Safari/537.36",
    },
  });
  const contentType = res.headers.get("Content-Type");
  if (
    !res.body ||
    !contentType ||
    !contentType.toLowerCase().includes("woff2")
  ) {
    console.error(red(`✘ Not woff2 font: ${url}`));
    Deno.exit(1);
  }
  const f = await Deno.open(`./downloads/${filename}`, {
    write: true,
    create: true,
    truncate: true,
  });
  const writableStream = writableStreamFromWriter(f);
  await res.body.pipeTo(writableStream);
  console.log(green(`✔ ${filename} - ${res.headers.get("Content-Length")}B`));
}

let cssContents = css;
for (const [url, filename] of Object.entries(fontMap)) {
  cssContents = cssContents.replace(new RegExp(url, "g"), `./${filename}`);
}
await Deno.writeTextFile(`./downloads/fonts.css`, cssContents);

const count = Object.keys(fontMap).length;
console.log(
  green(`✔ ${count} font${count === 1 ? "" : "s"} downloaded to ./downloads/`)
);
