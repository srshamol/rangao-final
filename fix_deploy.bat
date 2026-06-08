@echo off
echo ============================================
echo  Rangao.bd - Fix Deployment ^& Push to Git
echo ============================================
echo.

echo [1/5] Removing stale dist/ folder from git tracking...
git rm -r --cached dist/ 2>nul
echo.

echo [2/5] Staging all changes...
git add -A
echo.

echo [3/5] Committing...
git commit -m "fix: resolve deployment issues and update configuration"
echo.

echo [4/5] Pushing to GitHub...
git push
echo.

echo [5/5] Done! Vercel will now trigger a fresh build.
   echo    - Check your Vercel dashboard for the build progress.
   echo    - https://www.rangao.bd will load correctly after deployment completes.
echo.
pause
