@echo off
rem Ejecuta el respaldo de SIGTOC. Lo usa el Programador de tareas de Windows.
cd /d "%~dp0"
node backup.mjs %*
