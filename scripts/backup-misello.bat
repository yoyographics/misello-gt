@echo off
REM ============================================================
REM BACKUP DE BASE DE DATOS - misello.gt (Windows)
REM ============================================================
REM Este script respalda solo la base de datos PostgreSQL.
REM Para el resto (código, variables) usa GitHub y el checklist.
REM
REM REQUISITOS:
REM   1. Tener pg_dump.exe instalado (viene con PostgreSQL)
REM   2. O usar la versión portable de pg_dump
REM
REM USO:
REM   1. Copia tu DATABASE_URL de Railway Dashboard
REM   2. Reemplaza PEGA_AQUI_TU_DATABASE_URL abajo
REM   3. Ejecuta: backup-misello.bat
REM ============================================================

set "DATABASE_URL=PEGA_AQUI_TU_DATABASE_URL_DE_RAILWAY"

if "%DATABASE_URL%"=="PEGA_AQUI_TU_DATABASE_URL_DE_RAILWAY" (
    echo ❌ ERROR: Debes configurar DATABASE_URL en este archivo
    echo    1. Ve a railway.app → tu proyecto → PostgreSQL → Connect
    echo    2. Copia la 'Connection URL' (postgresql://...)
    echo    3. Edita este archivo .bat y pégala en DATABASE_URL=
    pause
    exit /b 1
)

set "TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_DIR=backups\misello_backup_%TIMESTAMP%"

mkdir "%BACKUP_DIR%" 2>nul

echo.
echo ==========================================
echo   BACKUP DE misello.gt
echo   Fecha: %date% %time%
echo ==========================================
echo.

echo 📦 [1/3] Respaldando base de datos PostgreSQL...
echo    Esto puede tardar unos minutos...

pg_dump "%DATABASE_URL%" --clean --if-exists > "%BACKUP_DIR%\database_full.sql" 2> "%BACKUP_DIR%\pg_dump.log"

if %ERRORLEVEL% EQU 0 (
    echo    ✅ Base de datos respaldada
) else (
    echo    ❌ ERROR al respaldar base de datos
    echo    Revisa: %BACKUP_DIR%\pg_dump.log
    pause
    exit /b 1
)

echo.
echo 📦 [2/3] Comprimiendo backup...

tar -czf "%BACKUP_DIR%\database_full.sql.gz" -C "%BACKUP_DIR%" database_full.sql 2>nul
if %ERRORLEVEL% NEQ 0 (
    powershell -Command "Compress-Archive -Path '%BACKUP_DIR%\database_full.sql' -DestinationPath '%BACKUP_DIR%\database_full.zip' -Force"
    echo    ✅ Comprimido (zip)
) else (
    echo    ✅ Comprimido (gz)
)

echo.
echo 📦 [3/3] Copiando schema y migraciones...

if exist "backend\prisma\schema.prisma" (
    copy "backend\prisma\schema.prisma" "%BACKUP_DIR%\" >nul
    echo    ✅ schema.prisma copiado
)

if exist "backend\prisma\migrations" (
    xcopy /E /I /Q "backend\prisma\migrations" "%BACKUP_DIR%\migrations" >nul
    echo    ✅ Migraciones copiadas
)

echo.
echo ==========================================
echo   ✅ BACKUP COMPLETADO
echo ==========================================
echo.
echo 📁 Ubicacion: %BACKUP_DIR%
echo.
echo Contenido:
dir /b "%BACKUP_DIR%"
echo.
echo ⚠️  ACCIONES PENDIENTES:
echo    1. Ve a railway.app y copia las variables de entorno manualmente
echo    2. Guarda este backup en Drive, Dropbox o disco externo
echo    3. El codigo ya esta en GitHub (no necesita backup)
echo.
pause
