# Operator Vault — Portfolio & Project Showcase

A modern, lightweight, responsive web showcase to present and distribute personal software projects, tools, and technical research artifacts.

---

## 1. Running Locally

You can test the site in two ways:

### Option A: Local Python Server (Recommended)
From PowerShell or Bash in this directory:
```bash
python -m http.server 8080
```
Open your browser at: **http://localhost:8080**

### Option B: Direct File Opening
Double-click `index.html`. A built-in fallback automatically loads your projects even without an HTTP server.

---

## 2. Deploying to the Web

### Via GitHub Pages
1. Create a repository on GitHub (e.g. `<user>.github.io` or `projects-hub`).
2. Push the files:
   ```bash
   git init
   git add .
   git commit -m "Initial release Operator Vault"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```
3. In repository **Settings** -> **Pages**: select the `main` branch and `/ (root)` directory.
4. Click **Save**.

### Via Vercel or Netlify
- Drag and drop this folder onto [app.netlify.com/drop](https://app.netlify.com/drop) or import the repository in [vercel.com](https://vercel.com).
- Deployment is instantaneous with zero build configuration needed.

---

## 3. Customizing Projects

Edit `projects.json` directly to update descriptions, repositories, and download links.
