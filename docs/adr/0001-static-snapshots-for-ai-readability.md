# Separate portable links from static AI-readable snapshots

GitHub Pages serves static responses and cannot render arbitrary URL fragment data into the initial HTML. Many AI readers also do not execute client-side JavaScript. SkillsLink therefore keeps two explicit delivery forms.

The CLI and browser create a portable `/view/#document=v2...` URL. The fragment contains the complete versioned, compact, optionally zlib-compressed Base64URL payload. It remains outside the HTTP request and lets the viewer read and edit the document without uploading the source. CommonMark and GFM blocks also produce compact divided-part links. This form requires JavaScript for rendering.

Documents reviewed into `content/*.json` are a separate repository concern. Next.js exports each snapshot as content-complete HTML plus an exact raw `.md` file and lists it in `llms.txt`. Ordinary HTTP readers can read this form without JavaScript. The text index is infrastructure and does not make `.txt` an accepted document format.

Keeping the forms separate avoids hidden network writes in the CLI and makes the AI-readability boundary testable and honest.
