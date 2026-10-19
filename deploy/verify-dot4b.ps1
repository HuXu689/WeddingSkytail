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
function Upload($session,$path,$file) {
    $csrf=Invoke-RestMethod "$Origin/api/v1/session/csrf" -WebSession $session
    Invoke-RestMethod -Uri "$Origin/api/v1$path" -Method POST -WebSession $session -Headers @{$csrf.headerName=$csrf.token} -Form @{file=Get-Item $file}
}
function Raw($session,$path) { Invoke-WebRequest -Uri "$Origin/api/v1$path" -WebSession $session -SkipHttpErrorCheck }
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
$start=[DateTime]::UtcNow.AddDays(45)
$e=CallApi $owner '/admin/events' POST @{title="Tiệc kiểm thử nhắc $stamp";startAt=$start.ToUniversalTime().ToString('o');deadline=[DateTime]::UtcNow.AddDays(35).ToUniversalTime().ToString('o');venue='Nhà hàng kiểm thử';address='Địa chỉ giả phục vụ kiểm thử';timezone='Asia/Ho_Chi_Minh';capacity=80;mapsUrl='https://maps.google.com/?q=kiem-thu';dressCode='Áo dài';parking='Bãi xe tầng hầm';note='Ghi chú kiểm thử';changeNotice='Đổi giờ đón khách';expectedVersion=0}
$events=CallApi $owner '/admin/events'
CallApi $owner "/admin/events/$($e.id)/publish" POST @{expectedVersion=(Find $events $e.id).version}|Out-Null
$start=$start.AddHours(2)
$current=Find (CallApi $owner '/admin/events') $e.id
CallApi $owner "/admin/events/$($e.id)/revise" PUT @{title=$current.title;startAt=$start.ToUniversalTime().ToString('o');deadline=$current.deadline;timezone=$current.timezone;venue=$current.venue;address=$current.address;capacity=$current.capacity;mapsUrl=$current.maps_url;dressCode=$current.dress_code;parking=$current.parking;note=$current.note;changeNotice='Đổi giờ đón khách';expectedVersion=$current.version}|Out-Null
$revised=Find (CallApi $owner '/admin/events') $e.id
Assert ($revised.revision -ge 1) 'Sửa buổi tiệc đã phát hành làm tăng revision'
Assert ($revised.change_notice -eq 'Đổi giờ đón khách') 'Lưu ý thay đổi được lưu trên buổi tiệc'
$name="Gia đình nhắc $stamp"
$invite=CallApi $owner '/admin/guests' POST @{displayName=$name;groupName='Khách nhắc';salutation='Kính mời';assignments=@(@{eventId=$e.id;maxPeople=3})}
$id=$invite.id
$link=(CallApi $owner "/admin/invitations/$id/link-reveal" POST).url
$token=($link -split '/i/')[1]
CallApi $guest '/guest-links/redeem' POST @{token=$token}|Out-Null
Write-Output '=== Worklist nhắc: chưa mở, chưa phản hồi ==='
$list=CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=UNANSWERED"
$row=Find $list.rows $id
Assert ($null -ne $row) 'Danh sách nhắc có lời mời vừa tạo'
Assert ($row.message -like "*$name*") 'Nội dung nhắc soạn sẵn có tên khách'
Assert ($row.message -like "*$($e.title)*") 'Nội dung nhắc nêu đúng tên buổi tiệc'
Assert ($null -eq $row.contacted_at) 'Lời mời mới chưa được đánh dấu đã nhắc'
Assert ($row.open_count -eq 0) 'Lời mời mới chưa có lượt mở nào'
Assert ($list.counts.unanswered -ge 1) 'Bộ đếm chưa phản hồi tính đúng'
Assert ($null -ne (Find (CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=NO_OPEN").rows $id)) 'Lời mời chưa mở nằm trong nhóm chưa ghi nhận mở'
Assert ($null -eq (Find (CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=OPENED_NO_RESPONSE").rows $id)) 'Lời mời chưa mở không nằm trong nhóm đã mở'
Write-Output '=== Đánh dấu đã nhắc tách biệt hoàn toàn với lượt mở ==='
CallApi $owner "/admin/reminders/$id/$($e.id)" POST @{note='Đã nhắn Zalo'}|Out-Null
$marked=Find (CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=NO_OPEN").rows $id
Assert ($null -ne $marked.contacted_at) 'Đánh dấu đã nhắc lưu thời điểm liên hệ'
Assert ($marked.contacted_by -eq $config.ADMIN_USERNAME) 'Ghi nhận đúng người đã nhắc'
Assert ($marked.open_count -eq 0) 'Đánh dấu đã nhắc KHÔNG tạo lượt mở thiệp'
Assert ($null -eq $marked.last_opened_at) 'Đánh dấu đã nhắc không ghi nhận thời điểm mở'
$invRow=Find (CallApi $owner "/admin/invitations?query=$([uri]::EscapeDataString($name))") $id
Assert ($null -eq $invRow.first_opened_at) 'Trang Khách & lời mời cũng không thấy lượt mở sau khi đánh dấu nhắc'
Write-Output '=== Tệp lịch (ICS) tuân thủ cổng truy cập và đúng giờ UTC ==='
$icsPath="/guest/invitations/$id/events/$($e.id)/calendar.ics"
Expect $guest $icsPath GET $null 403 'Chưa mở thiệp thì tệp lịch bị chặn'
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
$ics=Raw $guest $icsPath
$icsText=$ics.Content -replace "`r`n ",''
Assert ($ics.StatusCode -eq 200) 'Sau khi mở thiệp, tải được tệp lịch'
Assert (($ics.Headers['Content-Type'] -join ';') -like 'text/calendar*') 'Tệp lịch trả đúng kiểu text/calendar'
Assert (($ics.Headers['Content-Disposition'] -join ';') -like '*attachment*') 'Tệp lịch tải về dưới dạng tệp đính kèm'
Assert ($icsText -like '*BEGIN:VCALENDAR*') 'Nội dung ICS có VCALENDAR'
Assert ($icsText -like "*UID:$($e.id)*") 'UID tệp lịch gắn với buổi tiệc và lời mời'
Assert ($icsText -like "*Tiệc cưới: Tiệc kiểm thử nhắc $stamp*") 'Tiêu đề ICS có tên buổi tiệc'
$expected=$start.ToUniversalTime().ToString("yyyyMMdd'T'HHmmss'Z'")
Assert ($icsText -like "*DTSTART:$expected*") 'DTSTART khớp giờ buổi tiệc quy đổi UTC'
Assert ($icsText -like '*Nhà hàng kiểm thử\, Địa chỉ giả phục vụ kiểm thử*') 'Địa điểm ICS gồm tên và địa chỉ, dấu phẩy được thoát theo chuẩn'
Assert ($icsText -like '*https://maps.google.com/?q=kiem-thu*') 'ICS có link bản đồ'
Assert ($icsText -like '*Đổi giờ đón khách*') 'ICS có lưu ý thay đổi'
$other=CallApi $owner '/admin/events' POST @{title="Buổi khác $stamp";startAt=[DateTime]::UtcNow.AddDays(60).ToUniversalTime().ToString('o');deadline=[DateTime]::UtcNow.AddDays(50).ToUniversalTime().ToString('o');venue='Nơi khác';address='Địa chỉ khác';timezone='Asia/Ho_Chi_Minh';capacity=40;expectedVersion=0}
Expect $guest "/guest/invitations/$id/events/$($other.id)/calendar.ics" GET $null 403 'Không tải được lịch của buổi không được gán'
Write-Output '=== Khách mở thiệp thì rời nhóm "chưa ghi nhận mở" ==='
Assert ($null -eq (Find (CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=NO_OPEN").rows $id)) 'Sau khi khách mở thiệp, lời mời rời nhóm chưa ghi nhận mở'
$openedRow=Find (CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=OPENED_NO_RESPONSE").rows $id
Assert ($null -ne $openedRow) 'Lời mời đã mở nhưng chưa phản hồi vào đúng nhóm'
Assert ($openedRow.open_count -ge 1) 'Bộ đếm lượt mở do khách tạo, không do đánh dấu nhắc'
CallApi $owner "/admin/reminders/$id/$($e.id)" DELETE|Out-Null
Assert ($null -eq (Find (CallApi $owner "/admin/reminders?eventId=$($e.id)&filter=OPENED_NO_RESPONSE").rows $id).contacted_at) 'Bỏ ghi nhận nhắc xóa dấu liên hệ'
Write-Output '=== Nhạc nền: tải lên, kiểm tra loại tệp, chọn và phát hành ==='
$mp3=Join-Path $env:TEMP 'verify-dot4b.mp3'
[System.IO.File]::WriteAllBytes($mp3,[byte[]](0x49,0x44,0x33,0x03,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00))
$notMusic=Join-Path $env:TEMP 'verify-dot4b.txt'
[System.IO.File]::WriteAllText($notMusic,'day khong phai tep nhac')
$rejected=$false
try{ Upload $owner '/admin/media/audio' $notMusic|Out-Null }catch{ $rejected=$true }
Assert $rejected 'Tệp không phải nhạc bị máy chủ từ chối'
$music=Upload $owner '/admin/media/audio' $mp3
Assert ($null -ne $music.id) 'Tải tệp nhạc MP3 lên thư viện'
$media=CallApi $owner '/admin/media'
$asset=Find $media $music.id
Assert ($asset.kind -eq 'AUDIO') 'Thư viện phân loại tệp nhạc là AUDIO'
Assert ($asset.mime_type -eq 'audio/mpeg') 'Loại tệp nhận diện từ magic bytes, không tin trình duyệt'
$w=CallApi $owner '/admin/wedding'
$image=$media|Where-Object { $_.kind -eq 'IMAGE' }|Select-Object -First 1
if($image){ Expect $owner '/admin/wedding/design' PUT @{names=$w.draft_names;message=$w.draft_message;theme=$w.draft_theme;accent=$w.draft_accent;story=$w.draft_story;footer=$w.draft_footer;showStory=$w.draft_show_story;musicId=$image.id;showCountdown=$false;expectedVersion=$w.version} 422 'Không thể chọn ảnh làm nhạc nền' }
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/design' PUT @{names=$w.draft_names;message=$w.draft_message;theme=$w.draft_theme;accent=$w.draft_accent;story=$w.draft_story;footer=$w.draft_footer;showStory=$w.draft_show_story;musicId=$music.id;showCountdown=$true;expectedVersion=$w.version}|Out-Null
$w=CallApi $owner '/admin/wedding'
Assert ($w.draft_music_id -eq $music.id) 'Bản nháp ghi nhớ tệp nhạc đã chọn'
Assert ($w.draft_show_countdown -eq $true) 'Bản nháp ghi nhớ bật đếm ngược'
Assert ($w.musicUrl -like '*/admin/media/audio') 'URL nhạc của bản nháp trỏ tới bản nháp'
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
$beforePublish=CallApi $guest "/guest/invitations/$id"
Assert ($null -eq $beforePublish.wedding.musicUrl) 'Khách chưa thấy nhạc trước khi phát hành: lưu bản nháp không đổi thiệp đang chạy'
Expect $owner "/admin/media/$($music.id)" DELETE $null 422 'Không xóa được tệp nhạc đang được chọn'
CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
$after=CallApi $guest "/guest/invitations/$id"
Assert ($after.wedding.musicUrl -like '*/api/v1/media/audio') 'Sau khi phát hành, thiệp khách có URL nhạc'
Assert ($after.wedding.show_countdown -eq $true) 'Sau khi phát hành, thiệp khách bật đếm ngược'
$audio=Raw $guest '/media/audio'
Assert ($audio.StatusCode -eq 200) 'Tệp nhạc đã phát hành tải được'
Assert (($audio.Headers['Content-Type'] -join ';') -like 'audio/*') 'Tệp nhạc trả đúng kiểu âm thanh'
Assert ($audio.Content.Length -gt 0) 'Nội dung tệp nhạc không rỗng'
Write-Output '=== Dọn dẹp ==='
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/design' PUT @{names=$w.draft_names;message=$w.draft_message;theme=$w.draft_theme;accent=$w.draft_accent;story=$w.draft_story;footer=$w.draft_footer;showStory=$w.draft_show_story;musicId=$null;showCountdown=$false;expectedVersion=$w.version}|Out-Null
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
CallApi $owner "/admin/media/$($music.id)" DELETE|Out-Null
Assert ($null -eq (Find (CallApi $owner '/admin/media') $music.id)) 'Bỏ chọn xong thì xóa được tệp nhạc kiểm thử'
Remove-Item $mp3,$notMusic -ErrorAction SilentlyContinue
$mine=Find (CallApi $owner "/admin/invitations?query=$([uri]::EscapeDataString($name))") $id
CallApi $owner "/admin/invitations/$id/revoke" POST @{expectedVersion=$mine.version}|Out-Null
Write-Output 'Hoàn tất xác minh đợt 4B. Lời mời kiểm thử đã bị thu hồi.'