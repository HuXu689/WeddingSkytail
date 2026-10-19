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
function Find($items,$id){ return ($items|Where-Object { $_.id -eq $id -or $_.invitation_id -eq $id }|Select-Object -First 1) }
for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
$csrf=CallApi $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -Method POST -WebSession $owner -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Đăng nhập chủ tiệc'
$w=CallApi $owner '/admin/wedding'
if(-not $w.published){CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null;$w=CallApi $owner '/admin/wedding'}
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
$stamp=[DateTime]::UtcNow.ToString('HHmmss')
$e=CallApi $owner '/admin/events' POST @{title="Tiệc kiểm thử lời chúc $stamp";startAt=[DateTime]::UtcNow.AddDays(50).ToUniversalTime().ToString('o');deadline=[DateTime]::UtcNow.AddDays(40).ToUniversalTime().ToString('o');venue='Nhà hàng kiểm thử';address='Địa chỉ giả phục vụ kiểm thử';timezone='Asia/Ho_Chi_Minh';capacity=60;expectedVersion=0}
$events=CallApi $owner '/admin/events'
CallApi $owner "/admin/events/$($e.id)/publish" POST @{expectedVersion=(Find $events $e.id).version}|Out-Null
$name="Gia đình lời chúc $stamp"
$invite=CallApi $owner '/admin/guests' POST @{displayName=$name;groupName='Khách lời chúc';salutation='Kính mời';assignments=@(@{eventId=$e.id;maxPeople=2})}
$id=$invite.id
$link=(CallApi $owner "/admin/invitations/$id/link-reveal" POST).url
$token=($link -split '/i/')[1]
Write-Output '=== Lời chúc: mặc định ẩn, chỉ hiện sau khi duyệt ==='
Expect $guest "/guest/invitations/$id/wishes" POST @{displayName='Khách';message='Chúc mừng'} 403 'Chưa nhận link thì không gửi được lời chúc'
CallApi $guest '/guest-links/redeem' POST @{token=$token}|Out-Null
Expect $guest "/guest/invitations/$id/wishes" POST @{displayName='Khách';message='Chúc mừng'} 403 'Đã nhận link nhưng chưa mở thiệp thì vẫn không gửi được'
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
Expect $guest "/guest/invitations/$id/wishes" POST @{displayName='Khách';message='a'} 422 'Lời chúc quá ngắn bị từ chối'
$otherEvent=[guid]::NewGuid().ToString()
Expect $guest "/guest/invitations/$id/wishes" POST @{displayName='Khách';message='Chúc mừng';eventId=$otherEvent} 422 'Buổi tiệc không thuộc lời mời bị từ chối'
$first=CallApi $guest "/guest/invitations/$id/wishes" POST @{displayName='';message="Chúc hai bạn trăm năm hạnh phúc $stamp"}
Assert ($first.state -eq 'PENDING') 'Lời chúc mới ở trạng thái chờ duyệt'
Assert ($first.displayName -eq $name) 'Để trống tên hiển thị thì dùng tên trên thiệp'
$queue=CallApi $owner '/admin/wishes?state=PENDING'
Assert ($null -ne (Find $queue.rows $first.id)) 'Lời chúc chờ duyệt xuất hiện trong hàng chờ'
Assert ($queue.counts.pending -ge 1) 'Bộ đếm chờ duyệt tăng'
Assert (@((CallApi $guest "/guest/invitations/$id").wishes).Count -eq 0) 'Lời chúc chưa duyệt KHÔNG hiện trên thiệp khách'
Assert (@((CallApi $guest '/public/weddings/our-wedding').wishes|Where-Object { $_.message -eq $first.message }).Count -eq 0) 'Lời chúc chưa duyệt KHÔNG hiện trên thiệp chung'
Assert ((Find (CallApi $guest "/guest/invitations/$id/wishes") $first.id).state -eq 'PENDING') 'Chính khách gửi vẫn thấy lời chúc đang chờ duyệt'
Write-Output '=== Sửa, duyệt và công khai ==='
$row=Find (CallApi $owner '/admin/wishes?state=PENDING').rows $first.id
Expect $owner "/admin/wishes/$($first.id)" PUT @{message='Chúc mừng hạnh phúc';expectedVersion=$row.revision-1} 409 'Sửa với phiên bản cũ bị từ chối'
CallApi $owner "/admin/wishes/$($first.id)" PUT @{message="Chúc mừng hạnh phúc $stamp";expectedVersion=$row.revision}|Out-Null
$row=Find (CallApi $owner '/admin/wishes?state=PENDING').rows $first.id
Assert ($row.message -like "*hạnh phúc $stamp*") 'Chủ tiệc sửa được nội dung trước khi duyệt'
Expect $owner "/admin/wishes/$($first.id)" POST @{state='PENDING';expectedVersion=$row.revision} 422 'Không thể đưa lời chúc về trạng thái chờ'
Expect $owner "/admin/wishes/$($first.id)" POST @{state='SPAM';expectedVersion=$row.revision} 422 'Trạng thái duyệt không hợp lệ bị từ chối'
CallApi $owner "/admin/wishes/$($first.id)" POST @{state='APPROVED';expectedVersion=$row.revision}|Out-Null
Assert (@((CallApi $guest "/guest/invitations/$id").wishes|Where-Object { $_.message -like "*hạnh phúc $stamp*" }).Count -eq 1) 'Sau khi duyệt, lời chúc hiện trên thiệp khách'
$publicWishes=(CallApi $guest '/public/weddings/our-wedding').wishes
Assert (@($publicWishes|Where-Object { $_.message -like "*hạnh phúc $stamp*" }).Count -eq 1) 'Sau khi duyệt, lời chúc hiện trên thiệp chung'
Assert (@($publicWishes|Where-Object { $_.message -like '*trăm năm*' }).Count -eq 0) 'Nội dung cũ đã bị thay thế không còn hiển thị'
Assert ((Find (CallApi $guest "/guest/invitations/$id/wishes") $first.id).state -eq 'APPROVED') 'Khách gửi thấy trạng thái đã duyệt'
Write-Output '=== Từ chối, giới hạn và xóa ==='
$second=CallApi $guest "/guest/invitations/$id/wishes" POST @{displayName='Bạn thân';message='Chúc mừng nhé'}
CallApi $owner "/admin/wishes/$($second.id)" POST @{state='REJECTED';expectedVersion=(Find (CallApi $owner '/admin/wishes?state=PENDING').rows $second.id).revision}|Out-Null
Assert (@((CallApi $guest "/guest/invitations/$id").wishes|Where-Object { $_.message -eq 'Chúc mừng nhé' }).Count -eq 0) 'Lời chúc bị từ chối không hiện trên thiệp'
Assert ($null -ne (Find (CallApi $owner '/admin/wishes?state=REJECTED').rows $second.id)) 'Lời chúc bị từ chối vẫn nằm trong sổ để đối chiếu'
$third=CallApi $guest "/guest/invitations/$id/wishes" POST @{displayName='';message='Một lời chúc khác'}
Assert ($null -ne $third.id) 'Gửi được lời chúc thứ ba'
Expect $guest "/guest/invitations/$id/wishes" POST @{displayName='';message='Lời chúc thứ tư'} 422 'Mỗi lời mời chỉ gửi được tối đa 3 lời chúc'
Expect $owner '/admin/wishes/00000000-0000-0000-0000-000000000000' POST @{state='APPROVED';expectedVersion=0} 422 'Không thao tác được với lời chúc không tồn tại'
Write-Output '=== Dọn dẹp ==='
foreach($wishId in @($first.id,$second.id,$third.id)){ try{ CallApi $owner "/admin/wishes/$wishId" DELETE|Out-Null }catch{} }
Assert ($null -eq (Find (CallApi $owner "/admin/wishes?query=$stamp").rows $first.id)) 'Xóa lời chúc kiểm thử khỏi sổ'
$mine=Find (CallApi $owner "/admin/invitations?query=$([uri]::EscapeDataString($name))") $id
CallApi $owner "/admin/invitations/$id/revoke" POST @{expectedVersion=$mine.version}|Out-Null
Write-Output 'Hoàn tất xác minh sổ lời chúc. Lời mời kiểm thử đã bị thu hồi.'