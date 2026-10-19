param(
  [string]$BaseUrl = "http://localhost:8088",
  [string]$Username = "",
  [string]$Password = "",
  [string]$MediaPath = "",
  [switch]$ResetDemo
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Username) { $Username = $env:ADMIN_USERNAME }
if (-not $Password) { $Password = $env:ADMIN_PASSWORD }
if (-not $Username -or -not $Password) { throw "Hãy truyền -Username/-Password hoặc đặt ADMIN_USERNAME và ADMIN_PASSWORD." }

# Chỉ cần sửa block này khi dùng cho một cặp đôi khác. Script không ghi các giá trị này vào migration.
$demo = @{
  Names = 'Minh & An'
  Slug = 'our-wedding'
  Theme = 'ELEGANT'
  Accent = 'OLIVE'
  Message = "Trân trọng kính mời bạn đến chung vui\ntrong ngày hạnh phúc của chúng mình.\nSự hiện diện của bạn là món quà thật quý giá."
  Story = "Chúng mình gặp nhau vào một chiều mưa rất nhẹ, khi cả hai đều vô tình trú dưới cùng một mái hiên. Từ một lời hỏi thăm giản dị, những cuộc trò chuyện dài dần trở thành điều không thể thiếu trong mỗi ngày.\n\nSau những chuyến đi, những bữa cơm muộn và rất nhiều lần cùng nhau lựa chọn, chúng mình quyết định viết tiếp câu chuyện này bằng một lời hứa trọn đời. Cảm ơn bạn đã đến và chứng kiến khoảnh khắc đặc biệt ấy."
  Footer = 'Cảm ơn bạn đã là một phần trong ngày hạnh phúc của chúng mình.'
  Event1Title = 'Lễ gia tiên & tiệc thân mật'
  Event1Venue = 'The Olive Garden'
  Event1Address = '32 Nguyễn Huệ, Quận 1, Thành phố Hồ Chí Minh'
  Event1Start = '2027-04-18T10:30:00Z'
  Event1Deadline = '2027-04-10T16:00:00Z'
  Event1Capacity = 80
  Event2Title = 'Tiệc mừng cùng bạn bè'
  Event2Venue = 'The Bloom Wedding House'
  Event2Address = '88 Trần Phú, Hải Châu, Đà Nẵng'
  Event2Start = '2027-04-24T17:30:00Z'
  Event2Deadline = '2027-04-15T16:00:00Z'
  Event2Capacity = 160
}

function New-Session { New-Object Microsoft.PowerShell.Commands.WebRequestSession }
function Get-Csrf($session) {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/session/csrf" -WebSession $session -Method Get
  return @{ $response.headerName = $response.token }
}
function Invoke-Api($session, [string]$Path, [string]$Method = 'GET', $Body = $null, [hashtable]$Headers = @{}) {
  $params = @{ Uri = "$BaseUrl/api/v1$Path"; Method = $Method; WebSession = $session; Headers = $Headers }
  if ($null -ne $Body) { $params.ContentType = 'application/json'; $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress) }
  try { return Invoke-RestMethod @params } catch {
    $detail = $_.ErrorDetails.Message
    throw "API $Method $Path thất bại: $detail"
  }
}
function Invoke-Multipart($session, [string]$Path, [string]$FilePath) {
  $csrf = Get-Csrf $session
  try { return Invoke-RestMethod -Uri "$BaseUrl/api/v1$Path" -Method Post -WebSession $session -Headers $csrf -Form @{ file = Get-Item $FilePath } } catch {
    throw "Không thể tải ảnh $FilePath lên: $($_.ErrorDetails.Message)"
  }
}
function Save-Text($path, $text) { $text | Set-Content -Path $path -Encoding utf8 }
function Get-Token($url) { return ($url -split '/i/')[1] }

if ($ResetDemo) {
  $compose = Join-Path $root 'deploy/compose.yml'
  $sql = Join-Path $PSScriptRoot 'demo-reset.sql'
  Write-Host 'Đang dọn dữ liệu demo trong PostgreSQL...' -ForegroundColor Yellow
  Get-Content -Raw $sql | docker compose --env-file (Join-Path $root '.env') -f $compose exec -T db psql -U wedding -d wedding
}

$owner = New-Session
$csrf = Get-Csrf $owner
Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/login" -Method Post -WebSession $owner -Headers $csrf -ContentType 'application/x-www-form-urlencoded' -Body @{ username = $Username; password = $Password } | Out-Null
Write-Host "Đã đăng nhập Owner: $Username" -ForegroundColor Green

$wedding = Invoke-Api $owner '/admin/wedding'
$design = @{ names=$demo.Names; message=$demo.Message; theme=$demo.Theme; accent=$demo.Accent; story=$demo.Story; footer=$demo.Footer; showStory=$true; musicId=$wedding.draft_music_id; showCountdown=$wedding.draft_show_countdown; expectedVersion=[int64]$wedding.version }
Invoke-Api $owner '/admin/wedding/design' 'PUT' $design (Get-Csrf $owner) | Out-Null
Write-Host 'Đã lưu nội dung và thiết kế demo.' -ForegroundColor Green

function Get-EventByTitle($title, $venue) {
  $raw = Invoke-Api $owner '/admin/events'
  $events = @($raw | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
  foreach ($candidate in $events) { if ([string]$candidate.title -eq $title -and [string]$candidate.venue -eq $venue) { return [string](@($candidate.id)[0]) } }
  return $null
}
function Ensure-Event($title, $venue, $address, $start, $deadline, $capacity) {
  $existing = Get-EventByTitle $title $venue
  if ($null -ne $existing) { return $existing }
  $body = @{ title=$title; venue=$venue; address=$address; startAt=$start; deadline=$deadline; timezone='Asia/Ho_Chi_Minh'; capacity=$capacity; expectedVersion=0 }
  $created = Invoke-Api $owner '/admin/events' 'POST' $body (Get-Csrf $owner)
  return [string]$created.id
}
function Get-EventById($id) {
  $raw = Invoke-Api $owner '/admin/events'
  $events = @($raw | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
  foreach ($candidate in $events) { if ([string](@($candidate.id)[0]) -eq [string]$id) { return $candidate } }
  throw "Không tìm thấy buổi tiệc có mã $id."
}
function Publish-Event($eventId, $title, $venue) {
  $raw = Invoke-Api $owner '/admin/events'
  $events = @($raw | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
  $event = $null
  foreach ($candidate in $events) { if ([string](@($candidate.id)[0]) -eq [string]$eventId -or ([string]$candidate.title -eq $title -and [string]$candidate.venue -eq $venue)) { $event = $candidate; break } }
  if ($null -eq $event) { throw "Không tìm thấy buổi tiệc demo: $title" }
  $eventId = [string](@($event.id)[0])
  if ($event.state -eq 'DRAFT') { $rawVersion = $event.PSObject.Properties['version'].Value; $version = [int64](@($rawVersion)[0]); Invoke-Api $owner "/admin/events/$eventId/publish" 'POST' @{ expectedVersion=$version } (Get-Csrf $owner) | Out-Null }
  $freshRaw = Invoke-Api $owner '/admin/events'
  $fresh = @($freshRaw | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
  foreach ($candidate in $fresh) { if ([string](@($candidate.id)[0]) -eq $eventId) { return $candidate } }
  throw "Không đọc lại được buổi tiệc demo: $title"
}
$event1Draft = Ensure-Event $demo.Event1Title $demo.Event1Venue $demo.Event1Address $demo.Event1Start $demo.Event1Deadline $demo.Event1Capacity
$event1 = Publish-Event $event1Draft $demo.Event1Title $demo.Event1Venue
$event2Draft = Ensure-Event $demo.Event2Title $demo.Event2Venue $demo.Event2Address $demo.Event2Start $demo.Event2Deadline $demo.Event2Capacity
$event2 = Publish-Event $event2Draft $demo.Event2Title $demo.Event2Venue
Write-Host "Đã chuẩn bị 2 buổi tiệc: $($event1.event_code), $($event2.event_code)" -ForegroundColor Green

if ($MediaPath -and (Test-Path $MediaPath)) {
  $files = @(Get-ChildItem $MediaPath -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' })
  $uploaded = @()
  foreach ($file in $files) { $uploaded += (Invoke-Multipart $owner '/admin/media' $file.FullName).id }
  if ($uploaded.Count -gt 0) {
    Invoke-Api $owner '/admin/media/hero/DRAFT' 'PUT' @{ id=$uploaded[0] } (Get-Csrf $owner) | Out-Null
    Invoke-Api $owner '/admin/media/album/DRAFT' 'PUT' @{ ids=$uploaded } (Get-Csrf $owner) | Out-Null
    Write-Host "Đã tải và chọn $($uploaded.Count) ảnh cho hero/album bản nháp." -ForegroundColor Green
  }
} else { Write-Host 'Chưa có MediaPath; bỏ qua ảnh. Có thể chạy lại với -MediaPath .\scripts\demo-media.' -ForegroundColor Yellow }

$wedding = Invoke-Api $owner '/admin/wedding'
Invoke-Api $owner '/admin/wedding/publish' 'POST' @{ expectedVersion=[int64]$wedding.version } (Get-Csrf $owner) | Out-Null
$wedding = Invoke-Api $owner '/admin/wedding'
Invoke-Api $owner '/admin/access-policy' 'PUT' @{ mode='MANUAL_OPEN'; openAt=$null; closeAt=$null; expectedVersion=[int64]$wedding.version } (Get-Csrf $owner) | Out-Null
Write-Host 'Đã phát hành thiệp và mở chính sách truy cập demo.' -ForegroundColor Green

$guestRows = @(
  @{ Name='Gia đình anh Minh'; Group='DEMO · Gia đình'; Salutation='Trân trọng kính mời'; Assign=@(@{ eventId=$event1.id; maxPeople=4 },@{ eventId=$event2.id; maxPeople=4 }); Rsvp='ATTENDING'; People=3; Note='Cả nhà rất mong đến chung vui cùng hai bạn.' },
  @{ Name='Lan & Huy'; Group='DEMO · Bạn thân'; Salutation='Thân mời'; Assign=@(@{ eventId=$event2.id; maxPeople=2 }); Rsvp='ATTENDING'; People=2; Note='Hẹn gặp hai bạn trong ngày thật đẹp nhé!'},
  @{ Name='Chị Mai'; Group='DEMO · Đồng nghiệp'; Salutation='Trân trọng kính mời'; Assign=@(@{ eventId=$event1.id; maxPeople=1 }); Rsvp='DECLINED'; People=0; Note='Chúc hai bạn trăm năm hạnh phúc.'},
  @{ Name='Gia đình cô Hoa'; Group='DEMO · Gia đình'; Salutation='Kính mời'; Assign=@(@{ eventId=$event1.id; maxPeople=5 }); Rsvp='ATTENDING'; People=4; Note='Gia đình cô sẽ đến đầy đủ.'},
  @{ Name='Anh Quân'; Group='DEMO · Bạn bè'; Salutation='Thân mời'; Assign=@(@{ eventId=$event2.id; maxPeople=1 }); Rsvp='ATTENDING'; People=1; Note='Rất vui được góp mặt trong ngày vui.'},
  @{ Name='Phương & Nam'; Group='DEMO · Bạn thân'; Salutation='Thân mời'; Assign=@(@{ eventId=$event1.id; maxPeople=2 },@{ eventId=$event2.id; maxPeople=2 }); Rsvp='ATTENDING'; People=2; Note='Chúc mừng chương mới của hai bạn!'}
)
$guestSession = New-Session
$linkLines = @("Dữ liệu demo: $($demo.Names)", "Thiệp chung: $BaseUrl/w/$($demo.Slug)", '')
function Get-InvitationByName($name, $group) {
  $query = "/admin/invitations?archived=false&query=$([uri]::EscapeDataString($name))"
  $raw = Invoke-Api $owner $query
  $rows = @($raw | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
  foreach ($row in $rows) { if ([string]$row.display_name -eq $name -and [string]$row.group_name -eq $group) { return $row } }
  return $null
}
foreach ($guest in $guestRows) {
  $existing = Get-InvitationByName $guest.Name $guest.Group
  if (-not $existing) {
    $created = Invoke-Api $owner '/admin/guests' 'POST' @{ displayName=$guest.Name; groupName=$guest.Group; salutation=$guest.Salutation; assignments=$guest.Assign } (Get-Csrf $owner)
    $existing = Get-InvitationByName $guest.Name $guest.Group
  }
  if ($null -eq $existing) { throw "Không đọc lại được lời mời demo: $($guest.Name)" }
  $invitationId = [string](@($existing.id)[0])
  $url = (Invoke-Api $owner "/admin/invitations/$invitationId/link-reveal" 'POST' $null (Get-Csrf $owner)).url
  $token = Get-Token $url
  $guestCsrf = Get-Csrf $guestSession
  Invoke-Api $guestSession '/guest-links/redeem' 'POST' @{ token=$token } $guestCsrf | Out-Null
  Invoke-Api $guestSession "/guest/invitations/$invitationId/open" 'POST' $null (Get-Csrf $guestSession) | Out-Null
  $view = Invoke-Api $guestSession "/guest/invitations/$invitationId"
  foreach ($assignment in $guest.Assign) {
    if ($guest.Rsvp -eq 'DECLINED' -or $guest.People -gt 0) {
      $evt = $view.events | Where-Object id -eq $assignment.eventId
      if ($evt -and $null -eq $evt.status) {
        $rsvpHeaders = Get-Csrf $guestSession; $rsvpHeaders['Idempotency-Key'] = [guid]::NewGuid().ToString()
        Invoke-Api $guestSession "/guest/invitations/$invitationId/events/$($assignment.eventId)/rsvp" 'PUT' @{ status=$guest.Rsvp; totalPeople=$guest.People; note=$guest.Note; expectedVersion=$evt.response_version } $rsvpHeaders | Out-Null
      }
    }
  }
  $linkLines += "$($guest.Name): $url"
  Write-Host "Đã tạo khách demo: $($guest.Name)" -ForegroundColor Green
}

$output = Join-Path $root 'demo-links.txt'
Save-Text $output ($linkLines -join [Environment]::NewLine)
Write-Host "Hoàn tất. Link demo đã lưu tại $output" -ForegroundColor Cyan