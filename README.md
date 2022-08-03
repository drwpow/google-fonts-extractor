# Google Fonts Extractor

Deno script to extract a copy of a Google Font locally.

To use:

1. Clone this repo locally (`git clone git@github.com:drwpow/google-fonts-extractor.git`)
1. Select your fonts from [fonts.google.com](https://fonts.google.com). You can select all your faces/options as you would normally.
1. In the **Use on the web** sidepanel, copy the URL inside `<link href="https://fonts.googleapis.com/…">` (just the HREF part)
1. Paste it to the script via the `--url` flag:

```
deno run --allow-net --allow-write ./extract.ts --url="https://fonts.googleapis.com/css2?family=Roboto:…"
```

This will download everything to the `./downloads/` folder in this directory. You’ll also find a `./downloads/fonts.css` file generated for you with links to everything.

## Extracting other fonts

This could be used to extract fonts from any CSS file, really, but that hasn’t been tested.

## Why not use [google webfonts helper](https://github.com/majodev/google-webfonts-helper)?

That doesn’t preserve subsetting as carefully as this does. The files downloaded from that tool end up more bloated than usual.
