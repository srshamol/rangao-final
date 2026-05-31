@echo off
echo ===================================================
echo   Pushing GadgetGram to GitHub
echo   Target: https://github.com/srshamol/rangao-final.git
echo ===================================================
echo.

:: Check if git is initialized
if not exist .git (
    echo Initializing Git repository...
    git init
)

:: Add remote URL
echo Configuring remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/srshamol/rangao-final.git

:: Stage files
echo Staging files...
git add .

:: Commit
echo Committing files...
git commit -m "Pushing to rangao-final repository" 2>nul

:: Rename branch to main
git branch -M main

:: Push
echo Pushing to GitHub...
git push -u origin main

echo.
echo ===================================================
echo Done! If you had authorization prompts, please complete them in the terminal.
echo ===================================================
pause
