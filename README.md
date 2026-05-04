# Chef Calculator – Deployment Instructions

## One-time setup (takes ~5 minutes)

### 1. Create a GitHub repository
- Go to github.com → click the "+" → "New repository"
- Name it: `chef-calculator`
- Set to **Public** (required for free GitHub Pages)
- Click "Create repository"

### 2. Update the repo name in vite.config.ts
Open `vite.config.ts` and make sure the base matches your repo name:
```
base: '/chef-calculator/',
```
If you named it something different, update this line.

### 3. Upload these files to GitHub
- On your new repo page, click "uploading an existing file"
- Drag and drop ALL files and folders from this zip
- Click "Commit changes"

### 4. Enable GitHub Pages
- In your repo, go to **Settings** → **Pages**
- Under "Source", select **GitHub Actions**
- Save

### 5. Wait ~2 minutes
GitHub will automatically build and deploy. Your live URL will be:
`https://YOUR-GITHUB-USERNAME.github.io/chef-calculator/`

After that, any time you upload an updated file to the repo, it redeploys automatically.
