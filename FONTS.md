# Fonts

scribe is set in **GT Alpina**, licensed from
[Grilli Type](https://www.grillitype.com/). A Grilli Type webfont licence
permits serving the files from the licensee's own site. It does not permit
redistributing them, and a public git repository is redistribution — including
from its history, where a deleted file is still downloadable.

So the `.woff2` files are not in this repository, and must never be added to it.
`.gitignore` carries `public/fonts/` for that reason.

## Running it with the real faces

If you hold a GT Alpina licence, put the eight files `styles/theme.css` names
into `public/fonts/`:

```text
GT-Alpina-Standard-Light.woff2
GT-Alpina-Standard-Light-Italic.woff2
GT-Alpina-Standard-Regular.woff2
GT-Alpina-Standard-Regular-Italic.woff2
GT-Alpina-Standard-Medium.woff2
GT-Alpina-Standard-Bold.woff2
GT-Alpina-Standard-Bold-Italic.woff2
GT-Alpina-Condensed-Regular.woff2
```

`vite build` copies `public/` into `dist/` unchanged, so nothing else is needed.

## Where production's copy lives

The licensed files are in R2, in alexandria's bucket, under a prefix of their
own:

```text
antisocial-media-files/scribe-fonts/<file>.woff2
```

The `Fetch licensed fonts` step in `.github/workflows/deploy-production.yml`
copies every face `styles/theme.css` names from there into `public/fonts/`
before the build. It reads the list from the stylesheet, so adding a face to
`theme.css` without uploading it fails the next deploy — deliberately, because
the alternative is production quietly set in Georgia.

To get them locally, or to add or replace a face:

```bash
# download all eight into public/fonts/
for face in $(grep -oE 'GT-Alpina-[A-Za-z-]+[.]woff2' src/styles/theme.css | sort -u); do
  npx wrangler r2 object get "antisocial-media-files/scribe-fonts/$face" --remote --file "public/fonts/$face"
done

# upload one
npx wrangler r2 object put "antisocial-media-files/scribe-fonts/<file>.woff2" \n  --remote --file public/fonts/<file>.woff2 --content-type font/woff2
```

The bucket is private. Nothing serves this prefix to the public: the only route
into the bucket is alexandria's signed `/files/*`, and scribe never signs one of
these keys — the fonts reach readers from scribe's own Pages deployment.

## Running it without them

The stack in `--font-read` falls through to Iowan Old Style, then Georgia, then
a generic serif, and `--font-app` falls through to GT Alpina Standard and then
Georgia. The interface works. It is a different object, and two things that
matter here degrade:

- **Condensed has no fallback of its own.** `--font-app` lands on Georgia, which
  is wider, so the margin notes and the shelf run longer than they were drawn
  to.
- **`work-title` sets `font-synthesis: none`** on purpose, so a fallback family
  with no true italic will show a book's name in roman rather than a sheared
  upright. A title is a slant here, so a family without a real italic loses the
  distinction entirely. Georgia and Iowan Old Style both have one; a substitute
  without one is not a substitute.

`styles/theme.test.ts` asserts that `index.html` preloads the two italics on
screen at first paint. Those preload tags name `/fonts/…` paths, which 404
harmlessly when the files are absent — the browser falls back and the page is
otherwise unaffected.
