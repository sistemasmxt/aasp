@echo off
REM Script para fazer deploy usando WinSCP
echo open sftp://weffprog@wefferson.dev.br/ -hostkey=* -password=%%FTP_PASSWORD%% > deploy.txt
echo option batch abort >> deploy.txt
echo option confirm off >> deploy.txt
echo option transfer binary >> deploy.txt
echo synchronize remote dist/ /home/weffprog/aasp.app.br/ >> deploy.txt
echo exit >> deploy.txt

REM Execute WinSCP com o script
"C:\Program Files (x86)\WinSCP\WinSCP.com" /script=deploy.txt

REM Limpe o arquivo de script
del deploy.txt