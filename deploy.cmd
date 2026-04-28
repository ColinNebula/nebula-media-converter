@echo off

:: Deployment script for Azure App Service
:: This script is called by Azure's Kudu deployment engine

echo Starting deployment...

:: 1. KuduSync
echo Syncing files...
IF /I "%IN_PLACE_DEPLOYMENT%" NEQ "1" (
  call :ExecuteCmd "%KUDU_SYNC_CMD%" -v 50 -f "%DEPLOYMENT_SOURCE%\build" -t "%DEPLOYMENT_TARGET%" -n "%NEXT_MANIFEST_PATH%" -p "%PREVIOUS_MANIFEST_PATH%" -i ".git;.hg;.deployment;deploy.cmd"
  IF !ERRORLEVEL! NEQ 0 goto error
)

:: 2. Copy web.config
echo Copying web.config...
IF EXIST "%DEPLOYMENT_SOURCE%\web.config" (
  call :ExecuteCmd copy /Y "%DEPLOYMENT_SOURCE%\web.config" "%DEPLOYMENT_TARGET%\web.config"
  IF !ERRORLEVEL! NEQ 0 goto error
)

echo Deployment completed successfully!
goto end

:: Execute command routine
:ExecuteCmd
setlocal
set _CMD_=%*
call %_CMD_%
if "%ERRORLEVEL%" NEQ "0" echo Failed exitCode=%ERRORLEVEL%, command=%_CMD_%
exit /b %ERRORLEVEL%

:error
endlocal
echo An error has occurred during deployment.
exit /b 1

:end
endlocal
echo Finished successfully.
