param([string]$Origin='http://localhost:8099')
$ErrorActionPreference='Stop'
if($Origin -ne 'http://localhost:8099'){throw 'Chỉ chạy trên QA cô lập.'}
$config=@{};Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) '.env') | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$config[$matches[1]]=$matches[2]}}
$owner=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$guest=New-Object Microsoft.PowerShell.Commands.WebRequestSession
function Call($session,$path,$method='GET',$body=$null){
 $headers=@{};if($method -ne 'GET'){$csrf=Invoke-RestMethod "$Origin/api/v1/session/csrf" -WebSession $session;$headers[$csrf.headerName]=$csrf.token}
 $args=@{Uri="$Origin/api/v1$path";Method=$method;WebSession=$session;Headers=$headers}
 if($null -ne $body){$args.ContentType='application/json';$args.Body=ConvertTo-Json -InputObject $body -Depth 10 -Compress}
 Invoke-RestMethod @args
}
function Assert($value,$message){if(!$value){throw $message};Write-Output "ĐẠT: $message"}
$csrf=Call $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -WebSession $owner -Method POST -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
$before=Call $guest '/public/weddings/our-wedding'
$original=@((Call $owner '/admin/wedding/layout')|ForEach-Object {@{section=$_.section;enabled=$_.enabled}})
$layout=@('THANKS','ALBUM','CONTENT','STORY','COUNTDOWN','MUSIC')|ForEach-Object {@{section=$_;enabled=($_ -ne 'ALBUM')}}
$w=Call $owner '/admin/wedding'
Call $owner '/admin/wedding/layout' PUT @{layout=$layout;templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null
Assert (((Call $guest '/public/weddings/our-wedding').layout|ConvertTo-Json -Compress) -eq ($before.layout|ConvertTo-Json -Compress)) 'Đổi nháp bố cục không thay bản công khai'
try{Call $owner '/admin/wedding/layout' PUT @{layout=$layout;templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null;throw 'Thiếu conflict'}catch{if([int]$_.Exception.Response.StatusCode -ne 409){throw}}
Write-Output 'ĐẠT: Bố cục version cũ bị từ chối'
$w=Call $owner '/admin/wedding';Call $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
$published=Call $guest '/public/weddings/our-wedding'
Assert ($published.layout[0].section -eq 'THANKS') 'Thứ tự bố cục đã phát hành đúng'
Assert (-not ($published.layout|Where-Object section -eq 'ALBUM').enabled) 'Tắt album không xóa lựa chọn ảnh'
$invalid=@($layout|ForEach-Object {@{section=$_.section;enabled=$_.enabled}});$invalid[0].section='EVENTS'
$w=Call $owner '/admin/wedding'
try{Call $owner '/admin/wedding/layout' PUT @{layout=$invalid;templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null;throw 'Thiếu validation'}catch{if([int]$_.Exception.Response.StatusCode -ne 422){throw}}
Write-Output 'ĐẠT: Không thể điều khiển/che EVENTS hoặc RSVP qua cấu hình'
Call $owner '/admin/wedding/layout' PUT @{layout=$original;templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null
$w=Call $owner '/admin/wedding';Call $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
Write-Output 'Hoàn tất QA bố cục; đã khôi phục bố cục ban đầu trên QA.'