NOHS website - deploy guide
===========================
The files inside this folder must sit at the ROOT of your GitHub repo:

  index.html  about.html  gallery.html  members.html  contact.html
  vercel.json
  assets/   (style.css, nohs.js, gallery.js, contact.js, music.mp3, sfx.wav, img/..., video/campus-tour.mp4)

GitHub: create a repo, upload EVERYTHING in this folder (drag the files and the
"assets" folder together). index.html must show at the top level of the repo, not
inside another folder.

Vercel: Add New > Project > import the repo. Framework Preset: "Other".
Build Command: leave empty. Output Directory: leave empty (or "."). Deploy.

Do not upload nohs-merged.html on its own: Vercel only opens a file named index.html.
