@echo off
echo ============================================
echo  Rangao.bd - Fix Deployment & Push to Git
echo ============================================
echo.

echo [1/5] Removing stale dist/ folder from git tracking...
git rm -r --cached dist/
echo.

echo [2/5] Staging all changes...
git add -A
echo.

echo [3/5] Committing...
git commit -m "fix: remove stale dist from git, correct all branding to Rangao

- Remove stale dist/ folder from git (was causing 404s with wrong chunk hashes)
- Add buildCommand/outputDirectory/installCommand to vercel.json so Vercel always runs vite build
- Fix Cache-Control for HTML to no-store so CDN never caches index.html
- Fix .gitignore merge conflict (<<< HEAD markers were breaking the file)
- Fix README: replace Lovable boilerplate with Rangao project documentation
- dist/ is now properly gitignored; rebuilt fresh on each Vercel deploy"
echo.

echo [4/5] Pushing to GitHub...
git push
echo.

echo [5/5] Done! Vercel will now trigger a fresh build.
echo    - Check your Vercel dashboard for the build progress.
echo    - https://www.rangao.bd will load correctly after deployment completes.
echo.
pause
