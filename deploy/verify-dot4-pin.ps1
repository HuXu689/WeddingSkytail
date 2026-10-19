param([string]$Origin='http://localhost:8088')
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
function Assert($condition,$message){if(!$condition){throw "HỎNG: $message"};Write-Output "ĐẠT: $message"}
function Expect($session,$path,$method,$body,$code,$message){
    try{ CallApi $session $path $method $body ([guid]::NewGuid().ToString())|Out-Null }
    catch { $actual=[int]$_.Exception.Response.StatusCode; if($actual -ne $code){throw "Mong đợi mã $code nhưng nhận $actual cho $path"}; Write-Output "ĐẠT: $message"; return }
    throw "Yêu cầu phải bị từ chối với mã ${code}: $path"
}
function Find($items,$id){ return ($items|Where-Object { $_.id -eq $id }|Select-Object -First 1) }
function NewInvitation($name){
    $invite=CallApi $owner '/admin/guests' POST @{displayName=$name;groupName='Khách PIN';salutation='Kính mời';assignments=@(@{eventId=$script:eventId;maxPeople=2})}
    $link=(CallApi $owner "/admin/invitations/$($invite.id)/link-reveal" POST).url
    return @{ id=$invite.id; token=($link -split '/i/')[1]; name=$name }
}
for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
$csrf=CallApi $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -Method POST -WebSession $owner -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Đăng nhập chủ tiệc'
$w=CallApi $owner '/admin/wedding'
if(-not $w.published){CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null;$w=CallApi $owner '/admin/wedding'}
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
$stamp=[DateTime]::UtcNow.ToString('HHmmss')
$e=CallApi $owner '/admin/events' POST @{title="Buổi tiệc kiểm thử PIN $stamp";startAt=[DateTime]::UtcNow.AddDays(50).ToString('o');deadline=[DateTime]::UtcNow.AddDays(40).ToString('o');venue='Nhà hàng kiểm thử';address='Địa chỉ giả phục vụ kiểm thử';timezone='Asia/Ho_Chi_Minh';capacity=60;expectedVersion=0}
$script:eventId=$e.id
$events=CallApi $owner '/admin/events'
CallApi $owner "/admin/events/$($e.id)/publish" POST @{expectedVersion=(Find $events $e.id).version}|Out-Null
Write-Output '=== PIN: bật, chặn khi chưa xác nhận, xác nhận đúng ==='
$a=NewInvitation "Gia đình PIN A $stamp"
CallApi $guest '/guest-links/redeem' POST @{token=$a.token}|Out-Null
$issued=CallApi $owner "/admin/invitations/$($a.id)/pin" PUT @{pin=''}
Assert ($issued.enabled -eq $true) 'Bật PIN thành công'
Assert ($issued.pin -match '^\d{6}$') 'Máy chủ trả mã PIN 6 chữ số đúng một lần'
$status=CallApi $owner "/admin/invitations/$($a.id)/pin"
Assert ($status.enabled -eq $true) 'Đọc trạng thái PIN thấy đang bật'
Assert (-not ($status.PSObject.Properties.Name -contains 'pin')) 'API trạng thái không trả lại mã PIN'
Assert (-not ($status.PSObject.Properties.Name -contains 'pin_hash')) 'API trạng thái không trả bản băm'
$list=CallApi $owner "/admin/invitations?query=$([uri]::EscapeDataString("Gia đình PIN A $stamp"))"
Assert ((Find $list $a.id).pin_enabled -eq $true) 'Danh sách khách hiển thị lời mời đang bật PIN'
Expect $guest "/guest/invitations/$($a.id)/state" GET $null 428 'Trạng thái trả 428 khi chưa xác nhận PIN'
Expect $guest "/guest/invitations/$($a.id)/open" POST $null 428 'Mở thiệp trả 428 khi chưa xác nhận PIN'
Expect $guest "/guest/invitations/$($a.id)" GET $null 403 'Nội dung thiệp vẫn bị chặn vì chưa mở thiệp'
Expect $guest "/guest/invitations/$($a.id)/events/$($e.id)/rsvp" PUT @{status='ATTENDING';totalPeople=2;note='';expectedVersion=0} 403 'RSVP vẫn bị chặn vì chưa mở thiệp'
$wrong=if($issued.pin -eq '100000'){'200000'}else{'100000'}
Expect $guest "/guest/invitations/$($a.id)/pin" POST @{pin=$wrong} 403 'Mã PIN sai bị từ chối với thông báo chung'
$verified=CallApi $guest "/guest/invitations/$($a.id)/pin" POST @{pin=$issued.pin}
Assert ($verified.verified -eq $true) 'Mã PIN đúng được chấp nhận'
Assert ((CallApi $guest "/guest/invitations/$($a.id)/state").opened -eq $false) 'Xác nhận PIN không tự ghi nhận lượt mở thiệp'
CallApi $guest "/guest/invitations/$($a.id)/open" POST|Out-Null
$view=CallApi $guest "/guest/invitations/$($a.id)"
Assert ($view.displayName -eq "Gia đình PIN A $stamp") 'Sau khi xác nhận PIN mới đọc được nội dung thiệp'
CallApi $guest "/guest/invitations/$($a.id)/events/$($e.id)/rsvp" PUT @{status='ATTENDING';totalPeople=2;note='';expectedVersion=0} ([guid]::NewGuid().ToString())|Out-Null
$after=CallApi $guest "/guest/invitations/$($a.id)"
Assert ((Find $after.events $e.id).status -eq 'ATTENDING') 'Sau khi xác nhận PIN, RSVP lưu được bình thường'
Write-Output '=== PIN: đổi mã hủy phiên đã xác nhận, tắt PIN trả lại quyền thường ==='
$rotated=CallApi $owner "/admin/invitations/$($a.id)/pin/reset" POST
Assert ($rotated.pin -match '^\d{6}$') 'Đổi mã PIN sinh mã 6 chữ số'
Assert ($rotated.pin -ne $issued.pin) 'Mã PIN mới khác mã cũ'
Expect $guest "/guest/invitations/$($a.id)/state" GET $null 428 'Đổi mã PIN hủy phiên đã xác nhận trước đó'
CallApi $guest "/guest/invitations/$($a.id)/pin" POST @{pin=$rotated.pin}|Out-Null
Assert ((CallApi $guest "/guest/invitations/$($a.id)/state").opened -eq $true) 'Xác nhận mã mới đọc lại được trạng thái'
CallApi $owner "/admin/invitations/$($a.id)/pin" DELETE|Out-Null
Assert ((CallApi $owner "/admin/invitations/$($a.id)/pin").enabled -eq $false) 'Tắt PIN thành công'
$b=NewInvitation "Gia đình PIN B $stamp"
CallApi $guest '/guest-links/redeem' POST @{token=$b.token}|Out-Null
Assert ((CallApi $guest "/guest/invitations/$($b.id)/state").opened -eq $false) 'Lời mời chưa bật PIN thì khách vào thẳng, không cần mã'
CallApi $owner "/admin/invitations/$($b.id)/pin" PUT @{pin='482915'}|Out-Null
Assert ((CallApi $owner "/admin/invitations/$($b.id)/pin").enabled -eq $true) 'Bật PIN theo mã chủ tiệc tự đặt'
Expect $guest "/guest/invitations/$($b.id)/state" GET $null 428 'PIN tự đặt cũng chặn khi chưa xác nhận'
CallApi $guest "/guest/invitations/$($b.id)/pin" POST @{pin='482915'}|Out-Null
Assert ((CallApi $guest "/guest/invitations/$($b.id)/state").opened -eq $false) 'Mã tự đặt xác nhận đúng'
CallApi $owner "/admin/invitations/$($b.id)/pin" DELETE|Out-Null
Assert ((CallApi $guest "/guest/invitations/$($b.id)/state").opened -eq $false) 'Tắt PIN trả lại quyền truy cập bình thường'
Write-Output '=== PIN: chặn dò mã liên tục ==='
$c=NewInvitation "Gia đình PIN C $stamp"
CallApi $guest '/guest-links/redeem' POST @{token=$c.token}|Out-Null
CallApi $owner "/admin/invitations/$($c.id)/pin" PUT @{pin=''}|Out-Null
$throttled=$false
for($i=0;$i -lt 14;$i++){
    try{ CallApi $guest "/guest/invitations/$($c.id)/pin" POST @{pin='111111'} | Out-Null }
    catch { if([int]$_.Exception.Response.StatusCode -eq 429){$throttled=$true;break} }
}
Assert $throttled 'Nhập sai liên tục bị chặn bằng mã 429'
Write-Output '=== Dọn dẹp ==='
foreach($item in @($a,$b,$c)){
    try{ CallApi $owner "/admin/invitations/$($item.id)/pin" DELETE | Out-Null }catch{}
    $mine=CallApi $owner "/admin/invitations?query=$([uri]::EscapeDataString($item.name))"
    $found=Find $mine $item.id
    if($found){ CallApi $owner "/admin/invitations/$($item.id)/revoke" POST @{expectedVersion=$found.version}|Out-Null }
}
Write-Output 'Hoàn tất xác minh PIN. Các lời mời kiểm thử đã bị thu hồi.'