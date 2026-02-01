# 🚀 GitHub Repository Setup

## 📋 Repository Details
- **Name:** Omega Könyvtár
- **Version:** 0.1.0
- **Description:** Digital Library with Profile System
- **Git Tag:** v0.1.0

## 🔧 Manual GitHub Setup

### Step 1: Create GitHub Repository
1. Go to https://github.com
2. Click "New repository"
3. **Repository name:** `omega-konyvtar`
4. **Description:** `Omega Könyvtár - Digital Library with Profile System`
5. **Visibility:** Private (recommended) or Public
6. **Don't initialize** with README, .gitignore, or license (we already have them)
7. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Run these:

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/omega-konyvtar.git

# Rename branch to main (if not already)
git branch -M main

# Push to GitHub
git push -u origin main

# Push tags
git push origin v0.1.0
```

### Step 3: Update Remote URL (if needed)

If you need to update the remote URL later:
```bash
git remote set-url origin https://github.com/YOUR_USERNAME/omega-konyvtar.git
```

## 🏷️ Version Management

### Current Tags
- `v0.1.0` - Working Profile System (current)

### Future Releases
```bash
# Create new version
git tag -a "v0.2.0" -m "Version 0.2.0: [description]"
git push origin v0.2.0
```

### Restore Previous Version
```bash
git checkout v0.1.0
```

## 🔄 GitHub Workflow

### Daily Development
```bash
# Check current status
npm run snapshot:status

# Stage and commit changes
git add .
git commit -m "feat: [description of changes]"

# Push to GitHub
git push origin main
```

### Release Process
```bash
# Create release tag
git tag -a "v0.2.0" -m "Version 0.2.0: [release notes]"

# Push tag to GitHub
git push origin v0.2.0

# Create GitHub Release (via web interface)
# Go to repository → Releases → Create new release
# Choose tag v0.2.0 and add release notes
```

## 📝 Commit Message Convention

Use conventional commits for better version tracking:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## 🚀 Deployment Integration

### GitHub Actions (Future)
You can add `.github/workflows/deploy.yml` for automatic deployment:

```yaml
name: Deploy to Firebase
on:
  push:
    tags:
      - 'v*'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: kpregisztracio-6fb9d
```

## 🔍 Repository Structure

```
omega-konyvtar/
├── .git/                 # Git version control
├── .gitignore            # Files to ignore
├── package.json          # Project configuration
├── SNAPSHOT_v1.0_WORKING_PROFILE.md  # Version documentation
├── GITHUB_SETUP.md       # This file
├── src/                  # Source code
├── public/               # Static assets
├── firebase.json         # Firebase configuration
└── README.md             # Project documentation
```

## 🎯 Next Steps

1. **Create GitHub repository** using the steps above
2. **Push current code** to establish the baseline
3. **Create GitHub release** for v0.1.0
4. **Set up GitHub Actions** for automated deployment (optional)
5. **Continue development** with proper version control

---

**🎯 Once connected to GitHub, you'll have proper version control and backup for your Omega Könyvtár project!**
