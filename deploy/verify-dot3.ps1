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
function Versions($preview){$v=@{};$preview.versions.PSObject.Properties|ForEach-Object{$v[$_.Name]=$_.Value};$v}
# Tìm một bản ghi theo id. Luôn gán kết quả API vào biến trước khi lọc: gọi hàm trực tiếp trong pipeline cho kết quả sai.
function Find($items,$id){ return ($items|Where-Object { $_.id -eq $id }|Select-Object -First 1) }
for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
$csrf=CallApi $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -Method POST -WebSession $owner -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Đăng nhập chủ tiệc'
$w=CallApi $owner '/admin/wedding'
if(-not $w.published){CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null;$w=CallApi $owner '/admin/wedding'}
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
$stamp=[DateTime]::UtcNow.ToString('HHmmss')
$guestName="Gia đình kiểm thử đợt 3 $stamp"
Write-Output '=== Buổi tiệc: trường mới, bản đồ, phát hành phiên bản mới ==='
$e=CallApi $owner '/admin/events' POST @{title="Buổi tiệc kiểm thử đợt 3 $stamp";startAt=[DateTime]::UtcNow.AddDays(40).ToString('o');deadline=[DateTime]::UtcNow.AddDays(30).ToString('o');venue='Nhà hàng kiểm thử';address='Địa chỉ giả phục vụ kiểm thử';timezone='Asia/Ho_Chi_Minh';capacity=120;mapsUrl='https://maps.google.com/?q=kiem-thu';dressCode='Áo dài';parking='Bãi xe tầng hầm';note='Ghi chú kiểm thử';expectedVersion=0}
$events=CallApi $owner '/admin/events'
$draft=Find $events $e.id
Assert ($draft.state -eq 'DRAFT') 'Buổi tiệc mới tạo ở trạng thái nháp'
Assert ($draft.maps_url -eq 'https://maps.google.com/?q=kiem-thu') 'Liên kết bản đồ được lưu ngay khi tạo buổi tiệc'
$revise=@{title=$draft.title;startAt=[DateTime]::UtcNow.AddDays(41).ToString('o');deadline=[DateTime]::UtcNow.AddDays(30).ToString('o');venue=$draft.venue;address=$draft.address;timezone='Asia/Ho_Chi_Minh';capacity=$draft.capacity;mapsUrl=$draft.maps_url;dressCode=$draft.dress_code;parking=$draft.parking;note=$draft.note;expectedVersion=$draft.version}
Expect $owner "/admin/events/$($e.id)/revise" PUT $revise 422 'Buổi còn là nháp thì không phát hành phiên bản mới'
CallApi $owner "/admin/events/$($e.id)/publish" POST @{expectedVersion=$draft.version}|Out-Null
$events=CallApi $owner '/admin/events'
$live=Find $events $e.id
Assert ($live.state -eq 'PUBLISHED') 'Buổi tiệc được phát hành'
$revise['expectedVersion']=$live.version
$revise['startAt']=[DateTime]::UtcNow.AddDays(42).ToString('o')
Expect $owner "/admin/events/$($e.id)/revise" PUT $revise 422 'Đổi giờ buổi đã phát hành phải kèm thông báo thay đổi'
$revise['changeNotice']='Giờ khai tiệc đổi sang 18:30, địa điểm giữ nguyên.'
CallApi $owner "/admin/events/$($e.id)/revise" PUT $revise|Out-Null
$events=CallApi $owner '/admin/events'
$row=Find $events $e.id
Assert ($row.revision -eq 1) 'Phát hành phiên bản mới tăng revision lên 1'
Assert ($row.change_notice -eq 'Giờ khai tiệc đổi sang 18:30, địa điểm giữ nguyên.') 'Thông báo thay đổi được lưu để hiện trên thiệp khách'
Assert ($row.dress_code -eq 'Áo dài') 'Trang phục gợi ý được lưu'
Assert ($row.parking -eq 'Bãi xe tầng hầm') 'Lưu ý đỗ xe được lưu'
Assert ($row.note -eq 'Ghi chú kiểm thử') 'Ghi chú cho khách được lưu'
Expect $owner '/admin/events' POST @{title='Buổi sai bản đồ';startAt=[DateTime]::UtcNow.AddDays(10).ToString('o');deadline=[DateTime]::UtcNow.AddDays(5).ToString('o');venue='Địa điểm giả';address='Địa chỉ giả';timezone='Asia/Ho_Chi_Minh';capacity=10;mapsUrl='http://maps.google.com';expectedVersion=0} 422 'Liên kết bản đồ phải bắt đầu bằng https://'
Expect $owner "/admin/events/$($e.id)/cancel" POST @{reason='';expectedVersion=$row.version} 422 'Hủy buổi tiệc phải có lý do'
Write-Output '=== Lời mời: thao tác truy cập hàng loạt không đổi QR ==='
$invite=CallApi $owner '/admin/guests' POST @{displayName=$guestName;groupName='Khách kiểm thử';salutation='Kính mời';assignments=@(@{eventId=$e.id;maxPeople=3})}
$id=$invite.id
$linkBefore=(CallApi $owner "/admin/invitations/$id/link-reveal" POST).url
$preview=CallApi $owner '/admin/invitations/bulk-policy' POST @{ids=@($id);mode='MANUAL_CLOSED';dryRun=$true}
Assert ($preview.applicable -eq 1) 'Xem trước hàng loạt thấy đúng 1 lời mời áp dụng được'
Assert ($preview.rows[0].afterState -eq 'CLOSED_MANUAL') 'Xem trước cho biết trạng thái sau khi áp dụng là đóng thủ công'
Assert ($preview.qrUnchanged -eq $true) 'Xem trước khẳng định QR đã in vẫn dùng được'
CallApi $owner '/admin/invitations/bulk-policy' POST @{ids=@($id);mode='MANUAL_CLOSED';dryRun=$false;expectedVersions=(Versions $preview)}|Out-Null
$linkAfter=(CallApi $owner "/admin/invitations/$id/link-reveal" POST).url
Assert ($linkBefore -eq $linkAfter) 'Đóng hàng loạt không tạo link mới nên QR đã in vẫn dùng được'
$filtered=CallApi $owner "/admin/invitations?accessState=CLOSED_MANUAL&query=$([uri]::EscapeDataString($guestName))"
Assert ((Find $filtered $id).access_state -eq 'CLOSED_MANUAL') 'Lọc theo trạng thái truy cập trả về đúng lời mời vừa đóng'
$reopen=CallApi $owner '/admin/invitations/bulk-policy' POST @{ids=@($id);mode='MANUAL_OPEN';dryRun=$true}
CallApi $owner '/admin/invitations/bulk-policy' POST @{ids=@($id);mode='MANUAL_OPEN';dryRun=$false;expectedVersions=(Versions $reopen)}|Out-Null
Expect $owner '/admin/invitations/bulk-policy' POST @{ids=@($id);mode='INHERIT';dryRun=$true} 422 'Thao tác hàng loạt không cho chế độ INHERIT'
Write-Output '=== Báo cáo CSV ==='
$csv=Invoke-WebRequest "$Origin/api/v1/admin/reports/guests.csv" -WebSession $owner
Assert ($csv.StatusCode -eq 200) 'Tải được báo cáo khách'
Assert ($csv.Content -match 'Người nhận') 'Báo cáo khách có tiêu đề tiếng Việt'
Assert (-not ($csv.Content -match '/i/')) 'Báo cáo khách không chứa link hay token'
$rcsv=Invoke-WebRequest "$Origin/api/v1/admin/reports/responses.csv?eventId=$($e.id)" -WebSession $owner
Assert ($rcsv.Content -match 'Phản hồi') 'Báo cáo phản hồi theo buổi có dữ liệu'
Write-Output '=== Trung tâm in: mẫu nhãn chỉ QR ==='
$job=CallApi $owner '/admin/exports' POST @{format='PDF';invitationIds=@($id);labelStyle='QR_ONLY'}
Assert ($job.labelStyle -eq 'QR_ONLY') 'Bản in ghi nhận mẫu nhãn chỉ QR'
Assert ($job.rowCount -eq 1) 'Bản in có đúng 1 nhãn'
Assert ($job.pageCount -eq 1) 'Nhãn đầu tiên nằm gọn trong 1 trang A4'
Expect $owner '/admin/exports' POST @{format='PDF';invitationIds=@($id);labelStyle='FULL'} 422 'Mẫu nhãn in không hợp lệ bị từ chối'
$pdf=Invoke-WebRequest "$Origin/api/v1/admin/exports/$($job.id)/download" -WebSession $owner
Assert ($pdf.Headers['Content-Type'] -match 'application/pdf') 'Tải được PDF nhãn in'
Assert ($pdf.RawContentLength -gt 3000) 'PDF nhãn in có kích thước hợp lệ'
Assert ((CallApi $owner "/admin/exports/$($job.id)").labelStyle -eq 'QR_ONLY') 'Xem lại bản xuất thấy đúng mẫu nhãn'
CallApi $owner "/admin/exports/$($job.id)/revoke" POST|Out-Null
Write-Output '=== Thiệp khách: thay đổi buổi tiệc, bản đồ, tiến độ phản hồi ==='
$token=($linkAfter -split '/i/')[1]
CallApi $guest '/guest-links/redeem' POST @{token=$token}|Out-Null
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
$view=CallApi $guest "/guest/invitations/$id"
$ev=Find $view.events $e.id
Assert ($ev.revision -eq 1) 'Thiệp khách thấy buổi tiệc đã được cập nhật'
Assert ($ev.change_notice -match '18:30') 'Thiệp khách thấy thông báo thay đổi'
Assert ($ev.maps_url -like 'https://*') 'Thiệp khách có liên kết bản đồ cho nút Xem đường đi'
Assert ($ev.dress_code -eq 'Áo dài') 'Thiệp khách thấy trang phục gợi ý'
Assert ($ev.parking -eq 'Bãi xe tầng hầm') 'Thiệp khách thấy lưu ý đỗ xe'
Write-Output '=== Dọn dẹp ==='
$mine=CallApi $owner "/admin/invitations?query=$([uri]::EscapeDataString($guestName))"
$mineRow=Find $mine $id
CallApi $owner "/admin/invitations/$id/revoke" POST @{expectedVersion=$mineRow.version}|Out-Null
Write-Output 'Hoàn tất xác minh đợt 3. Lời mời kiểm thử đã bị thu hồi.'