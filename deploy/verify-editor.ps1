param([string]$Origin='http://localhost:8088')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$config=@{}
Get-Content (Join-Path $root '.env') | ForEach-Object { if($_ -match '^([^#=]+)=(.*)$'){$config[$matches[1]]=$matches[2]} }
$owner=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$editor=New-Object Microsoft.PowerShell.Commands.WebRequestSession
function CallApi($session,$path,$method='GET',$body=$null,$key=$null) {
    $headers=@{}
    if($method -ne 'GET') { $csrf=Invoke-RestMethod "$Origin/api/v1/session/csrf" -WebSession $session; $headers[$csrf.headerName]=$csrf.token }
    if($key){$headers['Idempotency-Key']=$key}
    $args=@{Uri="$Origin/api/v1$path";Method=$method;WebSession=$session;Headers=$headers}
    if($null -ne $body){$args.ContentType='application/json';$args.Body=($body|ConvertTo-Json -Depth 10 -Compress)}
    Invoke-RestMethod @args
}
function Login($session,$username,$password) {
    $csrf=Invoke-RestMethod "$Origin/api/v1/session/csrf" -WebSession $session
    $response=Invoke-WebRequest "$Origin/api/v1/auth/login" -Method POST -WebSession $session -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$username;password=$password} -SkipHttpErrorCheck
    return $response.StatusCode
}
function Assert($condition,$message){if(!$condition){throw "HỎNG: $message"};Write-Output "ĐẠT: $message"}
function Expect($session,$path,$method,$body,$code,$message){
    try{ CallApi $session $path $method $body ([guid]::NewGuid().ToString())|Out-Null }
    catch { $actual=[int]$_.Exception.Response.StatusCode; if($actual -ne $code){throw "Mong đợi mã $code nhưng nhận $actual cho $path"}; Write-Output "ĐẠT: $message"; return }
    throw "Yêu cầu phải bị từ chối với mã ${code}: $path"
}
function Find($items,$id){ return ($items|Where-Object { $_.id -eq $id -or $_.username -eq $id }|Select-Object -First 1) }
for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
Login $owner $config.ADMIN_USERNAME $config.ADMIN_PASSWORD | Out-Null
Assert ((CallApi $owner '/auth/me').role -eq 'OWNER') 'Chủ tiệc đăng nhập với vai trò OWNER'
$stamp=[DateTime]::UtcNow.ToString('HHmmss')
$editorUser="editor.$stamp"
$editorPassword='matkhau-troly-2026'
$editorNewPassword='matkhau-troly-2027'
Write-Output '=== Chủ tiệc tạo tài khoản trợ lý nội dung ==='
CallApi $owner '/admin/users' POST @{username=$editorUser;displayName='Trợ lý kiểm thử';password=$editorPassword;role='EDITOR'}|Out-Null
$users=CallApi $owner '/admin/users'
$created=Find $users $editorUser
Assert ($null -ne $created) 'Tài khoản trợ lý xuất hiện trong danh sách'
Assert ($created.role -eq 'EDITOR') 'Vai trò trợ lý được lưu đúng'
Assert ($created.enabled -eq $true) 'Tài khoản mới đang hoạt động'
Assert (-not ($created.PSObject.Properties.Name -contains 'password_hash')) 'API không bao giờ trả bản băm mật khẩu'
Expect $owner '/admin/users' POST @{username=$editorUser;displayName='';password=$editorPassword;role='EDITOR'} 422 'Tên đăng nhập trùng bị từ chối'
Expect $owner '/admin/users' POST @{username="ngan.$stamp";displayName='';password='ngan';role='EDITOR'} 400 'Mật khẩu ngắn hơn 12 ký tự bị từ chối'
Expect $owner '/admin/users' POST @{username="sai.$stamp";displayName='';password=$editorPassword;role='ADMIN'} 422 'Vai trò không hợp lệ bị từ chối'
$events=CallApi $owner '/admin/events'
$published=$events|Where-Object { $_.state -eq 'PUBLISHED' }|Select-Object -First 1
Assert ($null -ne $published) 'Có buổi tiệc đã phát hành để kiểm thử quyền'
$name="Gia đình vai trò $stamp"
$invite=CallApi $owner '/admin/guests' POST @{displayName=$name;groupName='Khách vai trò';salutation='Kính mời';assignments=@(@{eventId=$published.id;maxPeople=2})}
$id=$invite.id
Write-Output '=== Trợ lý đăng nhập và làm được phần việc nội dung/khách ==='
Assert ((Login $editor $editorUser $editorPassword) -eq 204) 'Trợ lý đăng nhập thành công'
Assert ((CallApi $editor '/auth/me').role -eq 'EDITOR') 'Phiên trợ lý mang vai trò EDITOR'
CallApi $editor '/admin/dashboard'|Out-Null
Assert $true 'Trợ lý xem được tổng quan'
CallApi $editor '/admin/invitations?page=0'|Out-Null
CallApi $editor '/admin/wishes'|Out-Null
CallApi $editor '/admin/reminders'|Out-Null
CallApi $editor '/admin/media'|Out-Null
Assert $true 'Trợ lý xem được khách, lời chúc, nhắc nhở và thư viện'
$w=CallApi $editor '/admin/wedding'
CallApi $editor '/admin/wedding/design' PUT @{names=$w.draft_names;message=$w.draft_message;theme=$w.draft_theme;accent=$w.draft_accent;story=$w.draft_story;footer=$w.draft_footer;showStory=$w.draft_show_story;musicId=$w.draft_music_id;showCountdown=$w.draft_show_countdown;expectedVersion=$w.version}|Out-Null
Assert $true 'Trợ lý lưu được bản nháp thiết kế'
CallApi $editor "/admin/invitations/$id/sent" POST @{expectedVersion=(Find (CallApi $owner "/admin/invitations?page=0&query=$([uri]::EscapeDataString($name))") $id).version}|Out-Null
Assert $true 'Trợ lý đánh dấu được trạng thái đã gửi thiệp'
Expect $editor '/admin/wishes/00000000-0000-0000-0000-000000000000' POST @{state='APPROVED';expectedVersion=0} 422 'Trợ lý vào được hàng duyệt lời chúc (bị chặn bởi nghiệp vụ, không phải bởi quyền)'
Write-Output '=== Trợ lý bị chặn đúng ma trận quyền (T25) ==='
Expect $editor '/admin/users' GET $null 403 'Trợ lý không xem được danh sách tài khoản'
Expect $editor '/admin/audit' GET $null 403 'Trợ lý không xem được nhật ký'
Expect $editor "/admin/invitations/$id/pin" GET $null 403 'Trợ lý không xem được trạng thái PIN'
Expect $editor "/admin/invitations/$id/link-reveal" POST $null 403 'Trợ lý không lấy được link riêng của khách'
Expect $editor "/admin/invitations/$id/revoke" POST @{expectedVersion=0} 403 'Trợ lý không thu hồi được lời mời'
Expect $editor '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=0} 403 'Trợ lý không đổi được chính sách truy cập chung'
Expect $editor "/admin/invitations/bulk-policy" POST @{ids=@($id);mode='MANUAL_OPEN';dryRun=$true} 403 'Trợ lý không dùng được thao tác truy cập hàng loạt'
Expect $editor '/admin/wedding/publish' POST @{expectedVersion=0} 403 'Trợ lý không phát hành được thiết kế'
Expect $editor '/admin/wedding/tracking' POST @{enabled=$false;expectedVersion=0} 403 'Trợ lý không đổi được cài đặt ghi nhận lượt mở'
Expect $editor '/admin/exports' POST @{format='GUEST_CSV'} 403 'Trợ lý không tạo được báo cáo xuất'
Expect $editor '/admin/reports/guests.csv' GET $null 403 'Trợ lý không tải được báo cáo khách'
Expect $editor '/admin/imports/commit' POST @{batchId=[guid]::NewGuid().ToString();idempotencyKey=[guid]::NewGuid().ToString()} 403 'Trợ lý không ghi dữ liệu nhập hàng loạt'
Expect $editor "/admin/events/$($published.id)/publish" POST @{expectedVersion=0} 403 'Trợ lý không phát hành được buổi tiệc'
Expect $editor "/admin/events/$($published.id)/cancel" POST @{reason='Thử nâng quyền';expectedVersion=0} 403 'Trợ lý không hủy được buổi tiệc'
Expect $editor "/admin/users/$editorUser/role" PUT @{role='OWNER'} 403 'Trợ lý không thể tự nâng quyền thành chủ tiệc'
Write-Output '=== Đổi mật khẩu tự phục vụ ==='
Expect $editor '/auth/password' PUT @{currentPassword='sai-mat-khau-123456';newPassword=$editorNewPassword} 422 'Đổi mật khẩu với mật khẩu hiện tại sai bị từ chối'
CallApi $editor '/auth/password' PUT @{currentPassword=$editorPassword;newPassword=$editorNewPassword}|Out-Null
Assert $true 'Trợ lý đổi được mật khẩu của chính mình'
$fresh=New-Object Microsoft.PowerShell.Commands.WebRequestSession
Assert ((Login $fresh $editorUser $editorNewPassword) -eq 204) 'Đăng nhập bằng mật khẩu mới thành công'
Assert ((Login (New-Object Microsoft.PowerShell.Commands.WebRequestSession) $editorUser $editorPassword) -eq 401) 'Mật khẩu cũ không còn dùng được'
Write-Output '=== Chủ tiệc cuối cùng không thể tự hạ quyền, tự khóa hay tự xóa ==='
Expect $owner "/admin/users/$($config.ADMIN_USERNAME)/role" PUT @{role='EDITOR'} 422 'Không hạ được vai trò của chủ tiệc cuối cùng'
Expect $owner "/admin/users/$($config.ADMIN_USERNAME)/enabled" PUT @{enabled=$false} 422 'Không tự khóa được tài khoản đang dùng'
Expect $owner "/admin/users/$($config.ADMIN_USERNAME)" DELETE $null 422 'Không tự xóa được tài khoản chủ tiệc cuối cùng'
Write-Output '=== Khóa tài khoản hủy phiên đang mở ngay lập tức ==='
CallApi $owner "/admin/users/$editorUser/enabled" PUT @{enabled=$false}|Out-Null
Assert ((Find (CallApi $owner '/admin/users') $editorUser).enabled -eq $false) 'Tài khoản trợ lý đã bị khóa'
Expect $editor '/admin/dashboard' GET $null 401 'Phiên cũ của tài khoản bị khóa mất hiệu lực ngay'
Assert ((Login (New-Object Microsoft.PowerShell.Commands.WebRequestSession) $editorUser $editorNewPassword) -eq 401) 'Tài khoản bị khóa không đăng nhập được nữa'
Write-Output '=== Dọn dẹp ==='
CallApi $owner "/admin/users/$editorUser" DELETE|Out-Null
Assert ($null -eq (Find (CallApi $owner '/admin/users') $editorUser)) 'Đã xóa tài khoản trợ lý kiểm thử'
$mine=Find (CallApi $owner "/admin/invitations?page=0&query=$([uri]::EscapeDataString($name))") $id
CallApi $owner "/admin/invitations/$id/revoke" POST @{expectedVersion=$mine.version}|Out-Null
Write-Output 'Hoàn tất xác minh vai trò trợ lý. Tài khoản và lời mời kiểm thử đã được dọn.'