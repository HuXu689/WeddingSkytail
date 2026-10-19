param([string]$Origin='http://localhost:8099')
$ErrorActionPreference='Stop'
if($Origin -ne 'http://localhost:8099'){throw 'Chỉ chạy dữ liệu giả trên stack QA cô lập cổng 8099.'}
$config=@{}
Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) '.env') | ForEach-Object {if($_ -match '^([^#=]+)=(.*)$'){$config[$matches[1]]=$matches[2]}}
$owner=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$guest=New-Object Microsoft.PowerShell.Commands.WebRequestSession
function Call($session,$path,$method='GET',$body=$null){
 $headers=@{};if($method -ne 'GET'){$csrf=Invoke-RestMethod "$Origin/api/v1/session/csrf" -WebSession $session;$headers[$csrf.headerName]=$csrf.token}
 $args=@{Uri="$Origin/api/v1$path";Method=$method;WebSession=$session;Headers=$headers}
 if($null -ne $body){$args.ContentType='application/json';$args.Body=ConvertTo-Json -InputObject $body -Depth 12 -Compress}
 Invoke-RestMethod @args
}
function Assert($condition,$message){if(!$condition){throw $message};Write-Output "ĐẠT: $message"}
$csrf=Call $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -WebSession $owner -Method POST -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
$w=Call $owner '/admin/wedding'
$sections=@(
 @{kind='FAMILY';audience='PRIVATE';enabled=$true;title='Nội dung riêng QA';body='Không xuất hiện trên thiệp chung';startsAt=$null;color=$null},
 @{kind='INTRO';audience='PUBLIC';enabled=$true;title='Giới thiệu QA công khai';body='Dữ liệu giả chỉ trên QA';startsAt=$null;color=$null},
 @{kind='TIMELINE';audience='PUBLIC';enabled=$true;title='Mốc QA';body='Nội dung lịch trình giả';startsAt=[DateTime]::UtcNow.AddDays(30).ToString('o');color=$null},
 @{kind='DRESS_CODE';audience='PUBLIC';enabled=$true;title='Trang phục QA';body='Màu kem, hướng dẫn minh họa';startsAt=$null;color='#eee4ce'}
)
Call $owner '/admin/wedding/sections' PUT @{sections=$sections;templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null
$before=Call $guest '/public/weddings/our-wedding'
Assert (@($before.sections | Where-Object title -eq 'Giới thiệu QA công khai').Count -eq 0) 'Nháp section chưa lộ ra công khai'
try{Call $owner '/admin/wedding/sections' PUT @{sections=@();templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null;throw 'Thiếu conflict'}catch{if([int]$_.Exception.Response.StatusCode -ne 409){throw}}
Write-Output 'ĐẠT: Version cũ không ghi đè section'
$w=Call $owner '/admin/wedding'
Call $owner '/admin/wedding/design' PUT @{names='Trần Thị Thu Hà & Nguyễn Hoàng Anh';message='Dữ liệu giả phục vụ kiểm thử trình duyệt.';theme='ELEGANT';accent='OLIVE';story='Câu chuyện minh họa trên QA.';footer='Cảm ơn bạn.';showStory=$true;showCountdown=$false;expectedVersion=$w.version}|Out-Null
$w=Call $owner '/admin/wedding';Call $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
$public=Call $guest '/public/weddings/our-wedding'
Assert (@($public.sections).Count -eq 3) 'Chỉ section công khai đã bật xuất hiện sau publish'
Assert (@($public.sections | Where-Object audience -eq 'PRIVATE').Count -eq 0) 'Không lộ nội dung gia đình riêng tư'
$w=Call $owner '/admin/wedding';Call $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
$event=Call $owner '/admin/events' POST @{title='Buổi QA riêng';startAt=[DateTime]::UtcNow.AddDays(30).ToString('o');deadline=[DateTime]::UtcNow.AddDays(20).ToString('o');venue='Địa điểm QA';address='Địa chỉ giả';timezone='Asia/Ho_Chi_Minh';capacity=20;expectedVersion=0}
Call $owner "/admin/events/$($event.id)/publish" POST @{expectedVersion=0}|Out-Null
$invite=Call $owner '/admin/guests' POST @{displayName='Khách QA';groupName='QA';salutation='Kính mời';assignments=@(@{eventId=$event.id;maxPeople=2})}
$link=Call $owner "/admin/invitations/$($invite.id)/link-reveal" POST
$token=($link.url -split '/')[-1]
Call $guest '/guest-links/redeem' POST @{token=$token}|Out-Null
try{Call $guest "/guest/invitations/$($invite.id)"|Out-Null;throw 'Thiếu gate'}catch{if([int]$_.Exception.Response.StatusCode -notin @(403,404)){throw}}
Call $guest "/guest/invitations/$($invite.id)/open" POST|Out-Null
$view=Call $guest "/guest/invitations/$($invite.id)"
Assert (@($view.wedding.sections).Count -eq 4) 'Section riêng chỉ xem được sau open gate'
$w=Call $owner '/admin/wedding';Call $owner '/admin/wedding/sections' PUT @{sections=@();templateVersion=1;contentSchemaVersion=1;expectedVersion=$w.version}|Out-Null
Assert (@((Call $guest '/public/weddings/our-wedding').sections).Count -eq 3) 'Sửa nháp không thay snapshot đã phát hành'
Write-Output 'Hoàn tất section privacy/version/draft/publish QA.'