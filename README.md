# Team Data Stories

This is a plain HTML/CSS/JavaScript site that can be deployed directly with GitHub Pages.

## Update points

- **Team name and members:** edit the marked placeholders in `index.html`, plus `[TEAM NAME]`, `[DATE]`, and the member names in `week1.html`.
- **Weekly articles:** copy `week1.html`, rename it (for example `week2.html`), update its content, then add a linked story card in the `Weekly Data Stories` section of `index.html`.
- **Images and charts:** place PNG/JPG files in this folder and update the `src` on the matching `<img>` element. Keep a useful `alt` description and write a caption.
- **Feedback:** replace `YOUR_TEAM_EMAIL@example.com` in `index.html` with the team's real email address, or replace the mail link with a course-approved feedback form URL.

## Preview locally

From this folder, run:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/> in a browser. Stop the server with `Ctrl+C`.

## GitHub Pages

Push the repository to GitHub with `index.html` at the published root. In GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select the main branch and `/ (root)`, then save. GitHub will display the public URL after the deployment finishes.
