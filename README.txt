DISRUPT.COM — RECEPTION / SECURITY PORTAL
=========================================

FILES IN THIS ZIP
- index.html                    → the portal (MUST stay named index.html for hosting)
- google-sheet-apps-script.gs   → paste into your Google Sheet for backup/sync
- supabase-setup.sql            → optional: full Supabase backend (roles + isolation)
- README.txt                    → this file

--------------------------------------------------------------------
DEPLOY (get a shareable link) — pick ONE, both are free
--------------------------------------------------------------------

EASIEST — Netlify Drop (no account signup needed to try):
  1. Go to  https://app.netlify.com/drop
  2. Drag the WHOLE unzipped folder (the one containing index.html) onto the page.
  3. You get a live URL instantly. Share it with reception/security.

VERCEL:
  1. Go to  https://vercel.com/new
  2. Drag the folder (containing index.html), or import it.
  3. Deploy → you get a live URL.
  * Important: the file MUST be named index.html so it opens at the root URL.
    (If you upload "disrupt-reception-portal.html", the root link shows nothing.)

LOCAL TEST (no hosting):
  Just double-click index.html — it runs in any browser.

--------------------------------------------------------------------
PASSCODES
--------------------------------------------------------------------
  Courier log ....... 1122
  Records ........... 2547
  Analytics ......... 2547
  Guest feedback .... 2547
  Admin ............. 2547

--------------------------------------------------------------------
GOOGLE SHEET BACKUP (all data -> one sheet, separate tabs)
--------------------------------------------------------------------
  1. Open your Google Sheet → Extensions → Apps Script → paste
     google-sheet-apps-script.gs → Save.
  2. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
     → Deploy → authorise.
  3. Copy the Web app URL (ends with /exec).
  4. Portal → Admin (2547) → Google Sheet sync → paste URL → Save → Test.
  Auto-creates tabs: Guests, Employees, Courier, Feedback, Analytics.
  NIC photos go to a Drive folder ("Disrupt NIC Photos"); links land in Guests tab.

--------------------------------------------------------------------
NOTES
--------------------------------------------------------------------
- NIC auto-read (OCR) and Google Sheet sync need internet (best on the hosted URL).
- Data is saved per-browser/device. For shared multi-desk data + true role
  separation (Security vs Reception) + real-time, run supabase-setup.sql and
  wire the app to Supabase (ask to finish this step).
- If you edit the Apps Script later: Deploy → Manage deployments → Edit → New version.
