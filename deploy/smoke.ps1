param([string]$Origin='http://localhost:8088',[switch]$RestartBackend)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$config=@{}
Get-Content (Join-Path $root '.env') | ForEach-Object { if($_ -match '^([^#=]+)=(.*)$'){$config[$matches[1]]=$matches[2]} }
$owner=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$guest=New-Object Microsoft.PowerShell.Commands.WebRequestSession
function CallApi($session,$path,$method='GET',$body=$null,$key=$null) {
    $headers=@{}
    if($method -ne 'GET') { $csrf=Invoke-RestMethod "$Origin/api/v1/session/csrf" -WebSession $session; $headers[$csrf.headerName]=$csrf.token }
    if($key){$headers['Idempotency-Key']=$key}
    $args=@{Uri="$Origin/api/v1$path";Method=$method;WebSession=$session;Headers=$headers}
    if($null -ne $body){$args.ContentType='application/json';$args.Body=($body|ConvertTo-Json -Depth 10 -Compress)}
    Invoke-RestMethod @args
}
function Assert($condition,$message){if(!$condition){throw $message};Write-Output "ĐẠT: $message"}
function Denied($session,$path,$method='GET',$body=$null){try{CallApi $session $path $method $body ([guid]::NewGuid().ToString())|Out-Null;throw 'Expected denial'}catch{if([int]$_.Exception.Response.StatusCode -notin @(401,403)){throw}}}
for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
$csrf=CallApi $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -Method POST -WebSession $owner -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Đăng nhập chủ tiệc'
Denied $guest '/admin/dashboard'
Write-Output 'ĐẠT: Khách không thể truy cập khu quản trị'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/draft' PUT @{names='An & Bình (kiểm thử tự động)';message='Dữ liệu giả phục vụ kiểm thử';expectedVersion=$w.version}|Out-Null
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
$eventIds=@()
foreach($title in @('Buổi tiệc gia đình — kiểm thử','Buổi tiệc bạn bè — kiểm thử')){
 $e=CallApi $owner '/admin/events' POST @{title=$title;startAt=[DateTime]::UtcNow.AddDays(30).ToString('o');deadline=[DateTime]::UtcNow.AddDays(20).ToString('o');venue='Nhà hàng kiểm thử';address='Địa chỉ giả phục vụ kiểm thử';timezone='Asia/Ho_Chi_Minh';capacity=100;expectedVersion=0}
 CallApi $owner "/admin/events/$($e.id)/publish" POST @{expectedVersion=0}|Out-Null
 $eventIds+= $e.id
}
$invite=CallApi $owner '/admin/guests' POST @{displayName='Gia đình kiểm thử';groupName='Khách kiểm thử';salutation='Kính mời';assignments=@(@{eventId=$eventIds[0];maxPeople=3},@{eventId=$eventIds[1];maxPeople=3})}
$id=$invite.id
$link=CallApi $owner "/admin/invitations/$id/link-reveal" POST
$link2=CallApi $owner "/admin/invitations/$id/link-reveal" POST
Assert ($link.url -eq $link2.url) 'Link được giữ ổn định khi lấy lại'
$beforeDesign=CallApi $guest '/public/weddings/our-wedding'
$w=CallApi $owner '/admin/wedding'
$theme=if($beforeDesign.theme -eq 'TRADITIONAL'){'MODERN'}else{'TRADITIONAL'}
CallApi $owner '/admin/wedding/design' PUT @{names=$w.draft_names;message=$w.draft_message;theme=$theme;accent='BURGUNDY';story='Câu chuyện phục vụ kiểm thử';footer='Cảm ơn bạn đã kiểm thử';showStory=$true;musicId=$w.draft_music_id;showCountdown=$w.draft_show_countdown;expectedVersion=$w.version}|Out-Null
Assert ((CallApi $guest '/public/weddings/our-wedding').theme -eq $beforeDesign.theme) 'Bản nháp thiết kế không bị lộ ra thiệp công khai'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
Assert ((CallApi $guest '/public/weddings/our-wedding').theme -eq $theme) 'Thiết kế đã phát hành được hiển thị'
Assert ((CallApi $owner "/admin/invitations/$id/link-reveal" POST).url -eq $link.url) 'Phát hành thiết kế không làm đổi link lời mời'
$token=($link.url -split '/')[-1]
CallApi $guest '/guest-links/redeem' POST @{token=$token}|Out-Null
Assert (!(CallApi $guest "/guest/invitations/$id/state").opened) 'Trạng thái phía máy chủ xác nhận thiệp chưa được mở'
$cookieResponse=Invoke-WebRequest "$Origin/api/v1/session/csrf" -SessionVariable fresh
$cookieHeader=$cookieResponse.Headers['Set-Cookie'] -join ';'
Assert ($cookieHeader -match 'HttpOnly' -and $cookieHeader -match 'SameSite=Lax' -and $cookieHeader -notmatch '(?i)Domain=') 'Cookie phiên là host-only, HttpOnly và SameSite=Lax'
Denied $guest "/guest/invitations/$id"
Write-Output 'ĐẠT: Nội dung riêng bị chặn trước khi khách chủ động mở thiệp'
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
$view=CallApi $guest "/guest/invitations/$id"
Assert ($view.events.Count -eq 2) 'Khách chỉ nhìn thấy đúng hai buổi được gán'
Assert ((CallApi $guest "/guest/invitations/$id/state").opened) 'Tải lại trang khôi phục trạng thái từ phiên Spring'
if($RestartBackend){
 $before=& docker compose --env-file "$root/.env" -f "$root/deploy/compose.yml" exec -T db psql -U wedding -d wedding -Atc "SELECT md5(username || password_hash || created_at::text) FROM admin_users WHERE id=1"
 & docker compose --env-file "$root/.env" -f "$root/deploy/compose.yml" restart backend
 if($LASTEXITCODE -ne 0){throw 'Restart failed'}
 for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
 $after=& docker compose --env-file "$root/.env" -f "$root/deploy/compose.yml" exec -T db psql -U wedding -d wedding -Atc "SELECT md5(username || password_hash || created_at::text) FROM admin_users WHERE id=1"
 Assert ($before -eq $after) 'Thông tin chủ tiệc không thay đổi sau khi khởi động lại'
 Assert ((CallApi $guest "/guest/invitations/$id/state").opened) 'Quyền khách và dấu mở thiệp vẫn còn sau khi khởi động lại'
 Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Phiên chủ tiệc vẫn hoạt động sau khi khởi động lại'
}
$privateResponse=Invoke-WebRequest "$Origin/api/v1/guest/invitations/$id" -WebSession $guest
Assert (($privateResponse.Headers['Cache-Control'] -join ',') -match 'no-store') 'Nội dung riêng được trả về với chính sách không lưu bộ nhớ đệm'
Denied $guest "/guest/invitations/$([guid]::NewGuid())"
Write-Output 'ĐẠT: Thử thay đổi mã lời mời bị từ chối'
$guest.Headers.Clear()
try { Invoke-WebRequest "$Origin/api/v1/guest/invitations/$id/open" -Method POST -WebSession $guest | Out-Null; throw 'Expected CSRF rejection' } catch { if([int]$_.Exception.Response.StatusCode -ne 403){throw} }
Write-Output 'ĐẠT: Yêu cầu thiếu mã CSRF bị từ chối'
$key=[guid]::NewGuid().ToString()
$body=@{status='ATTENDING';totalPeople=2;note='Test';expectedVersion=0}
$first=CallApi $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body $key
$retry=CallApi $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body $key
Assert ($first.version -eq $retry.version) 'Gửi lại RSVP không tạo bản ghi trùng'
try { CallApi $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body ([guid]::NewGuid().ToString())|Out-Null;throw 'Expected stale version rejection' } catch { if([int]$_.Exception.Response.StatusCode -ne 409){throw} }
Write-Output 'ĐẠT: Phiên bản RSVP cũ bị từ chối'
CallApi $guest "/guest/invitations/$id/events/$($eventIds[1])/rsvp" PUT @{status='DECLINED';totalPeople=0;note='';expectedVersion=0} ([guid]::NewGuid().ToString())|Out-Null
$dashboard=CallApi $owner '/admin/dashboard'
Assert (($dashboard|Where-Object id -eq $eventIds[0]).confirmed_people -eq 2) 'Buổi thứ nhất có đúng 2 người xác nhận'
Assert (($dashboard|Where-Object id -eq $eventIds[1]).declined -eq 1) 'Buổi thứ hai có đúng 1 lời mời từ chối'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_CLOSED';expectedVersion=$w.version}|Out-Null
Denied $guest "/guest/invitations/$id"
Write-Output 'ĐẠT: Đóng toàn bộ chặn phiên khách đang tồn tại'
Denied $guest "/guest/invitations/$id/state"
Denied $guest "/guest/invitations/$id/open" POST
Denied $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body
Denied $guest '/guest-links/redeem' POST @{token=$token}
Write-Output 'ĐẠT: Chính sách đóng chặn trạng thái, mở thiệp, RSVP và đổi link'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
CallApi $owner "/admin/invitations/$id/revoke" POST @{expectedVersion=0}|Out-Null
Denied $guest "/guest/invitations/$id"
Write-Output 'ĐẠT: Thu hồi link chặn phiên khách đang tồn tại'
Assert ((Invoke-WebRequest "$Origin/admin/login").StatusCode -eq 200) 'Giao diện Next.js được phục vụ qua Caddy'
Write-Output 'Hoàn tất kiểm thử khói. Dữ liệu giả được giữ lại để kiểm tra; lời mời kiểm thử đã bị thu hồi.'