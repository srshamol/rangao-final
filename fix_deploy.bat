@echo off
echo ============================================
echo  Rangao.bd - Fix Stale Deployment
echo ============================================
echo.

echo [1/5] Removing stale dist/ folder from git tracking...
git rm -r --cached dist/
echo.

echo [2/5] Staging all changes...
git add -A
echo.

echo [3/5] Committing...
git commit -m "fix: remove stale dist from git, fix vercel build config and cache headers

- Remove stale 'GadgetGram' dist/ folder from git tracking (was causing 404s)
- Add explicit buildCommand/outputDirectory to vercel.json so Vercel runs vite build
- Fix Cache-Control for HTML to no-store so CDN never caches index.html
- Fix .gitignore merge conflict (<<< HEAD markers were breaking the file)
- dist/ is now properly gitignored and will be built fresh on each Vercel deploy"
echo.

echo [4/5] Pushing to GitHub...
git push
echo.

echo [5/5] Done! Vercel will now trigger a fresh build.
echo    - Check your Vercel dashboard for the build progress.
echo    - The 404 errors will be gone once the new deployment is live.
echo.
pause
