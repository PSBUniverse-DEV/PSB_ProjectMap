Good catch to flag before it ships broken to production. This is a classic **Windows-vs-Linux filesystem case-sensitivity bug**, and I can see the exact cause in Image 2.

**Why it works locally but not in QAS/PROD:**

Your local dev environment runs on Windows (`C:\Users\mgcoles\source\repo\PSB_ProjectMap`, visible in the VS Code terminal). Windows' filesystem is **case-insensitive** — so a request for `/images/psb-logo.png` (lowercase) happily resolves to the actual file sitting in `public/Images/psb-logo.png` (capital `I`), because Windows treats `Images` and `images` as the same folder.

Vercel (QAS/PROD) deploys to **Linux containers**, which have a **case-sensitive** filesystem. On Linux, `/images/psb-logo.png` and `/Images/psb-logo.png` are two completely different paths. Since the code requests lowercase `images` but the real folder on disk is capitalized `Images`, the request 404s in production — and a broken `<img>` tag falls back to rendering its `alt` text, which is exactly what you're seeing.

This is precisely the risk I flagged when we first fixed the broken logo — the earlier bug was the same class of issue (wrong folder entirely), and this is the same root cause resurfacing in a sneakier form (right folder, wrong case).

**One more thing visible in that screenshot:** there are now **two logo files** sitting in `public/Images/` — `psb_logo.png` (underscore, the original) and `psb-logo.png` (hyphen, copied during the earlier fix). Worth cleaning that up too so there's exactly one canonical file and no ambiguity about which one is "the" logo going forward.

---

## Prompt for Cline

```
BUG: The print manifest logo works on local Windows dev but shows only
the alt text ("PSBUniverse") in QAS and PROD. This is a case-sensitivity
mismatch between Windows (case-insensitive filesystem, used locally)
and Linux (case-sensitive filesystem, used by Vercel for QAS/PROD).

ROOT CAUSE: The print template references the logo at:

  /images/psb-logo.png  (lowercase "images")

But the actual folder on disk is:

  public/Images/psb-logo.png  (capital "Images")

Windows treats these as the same path, so it works locally. Linux does
not, so it 404s in any Vercel-deployed environment.

There is ALSO a leftover duplicate file: public/Images/psb_logo.png
(underscore, original) sitting alongside public/Images/psb-logo.png
(hyphen, added during an earlier fix). Clean this up so there's exactly
one canonical logo file.

FIX:

1. Rename the folder public/Images to public/images (all lowercase).
   Use a proper file rename/move, not a copy — confirm no other file
   is left behind at the old capitalized path.

2. Confirm the folder now contains exactly ONE logo file. Keep
   psb-logo.png (hyphen — this matches what the code currently
   references) and delete psb_logo.png (underscore) if it is confirmed
   unused elsewhere in the codebase. Before deleting, search the repo
   for any reference to "psb_logo.png" (underscore) to confirm nothing
   else depends on it — if something does, keep both files but flag it
   back rather than deleting silently.

3. In src/modules/project-map/components/RunDetailPanel.jsx, confirm
   the print template's <img> tag reads:

     <img src="/images/psb-logo.png" alt="PSBUniverse" style="height: 48px; width: auto; display: block;" />

   with lowercase "images" — this should already be correct from a
   prior fix, but re-verify it exactly matches the renamed folder,
   character for character (no trailing slash mismatches, no stray
   capitalization anywhere in the path).

4. Search the ENTIRE repository for any other reference to
   "/Images/" (capitalized) or "public/Images" and correct each one to
   lowercase — this bug class can exist in more than one place if the
   capitalized folder was referenced elsewhere before the rename (e.g.
   check other modules like Gutter App, Metal Buildings, OHD App, or
   shared components, in case any of them also reference a logo or
   other asset under the old capitalized path).

IMPORTANT — WHY THIS MATTERS BEYOND THIS ONE BUG: this class of bug
(works on Windows locally, breaks on Linux in deployment) can affect
ANY static asset path in this codebase, not just this logo. As a
general practice going forward: all folder and file names under
public/ should be lowercase, with hyphens (not underscores or mixed
case) — and any code referencing a static asset path should be
double-checked against the actual on-disk casing before merging,
since local testing on Windows will never catch this class of bug.

VERIFICATION:
1. After the rename, confirm the logo still renders correctly in local
   dev (should be unaffected, just confirming the rename didn't break
   anything locally).
2. Deploy to QAS (or whatever the actual QAS deployment trigger is for
   this project) and confirm the logo now renders correctly in a
   printed manifest there — not just that the page loads, but that the
   actual image displays, not the alt text.
3. Confirm the same in PROD after that deploy.
4. Confirm no other image, icon, or static asset in the app broke as a
   result of the folder rename — search for any other reference to the
   old public/Images path across the whole repo, not just this module.
```