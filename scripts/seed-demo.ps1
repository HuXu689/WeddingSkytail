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
  Names = 'Hoàng An & Thanh Bình'
  Slug = 'our-wedding'
  Theme = 'ELEGANT'
  Accent = 'BURGUNDY'
  Message = "Trân trọng kính mời Quý vị và Gia đình tới dự bữa tiệc chung vui mừng Lễ Thành Hôn của hai con chúng tôi.\nSự hiện diện và lời chúc phúc của Quý khách là niềm vinh hạnh lớn lao của gia đình."
  Story = "Bắt đầu từ một cuộc gặp gỡ tình cờ vào chiều thu Hà Nội năm 2022, dưới mái hiên nhỏ trên phố Phan Đình Phùng khi cơn mưa bất chợt ghé ngang. Từ một tách trà nóng sẻ đôi và những câu chuyện không đầu không cuối, chúng mình nhận ra nhịp đập bình yên nơi ánh mắt người đối diện.\n\nQua hơn một nghìn ngày cùng nhau đi qua bao mùa nắng gió, những chuyến tàu đêm khám phá miền đất mới và cả những ngày bình dị bên căn bếp nhỏ, tình yêu cứ thế lớn dần bằng sự thấu hiểu và bao dung.\n\nHôm nay, Hoàng An và Thanh Bình quyết định nắm tay nhau bước vào lễ đường, viết tiếp chương đẹp nhất của cuộc đời bằng một tổ ấm ngập tràn tiếng cười."
  Footer = 'Cảm ơn bạn đã luôn yêu thương, đồng hành và dành thời gian quý báu đến chung vui cùng vợ chồng mình. Hẹn gặp bạn tại ngày hạnh phúc!'
  Event1Title = 'Lễ Ăn Hỏi & Tiệc Thân Mật Hai Gia Đình'
  Event1Venue = 'Tư gia Nhà Gái & Không gian Sen Tây Hồ'
  Event1Address = 'Số 45 Phố Thái Hà, Quận Đống Đa, Hà Nội'
  Event1Start = '2026-12-24T02:00:00Z'
  Event1Deadline = '2026-12-19T16:59:00Z'
  Event1Capacity = 100
  Event1Maps = 'https://maps.google.com/?q=45+Thai+Ha+Dong+Da+Ha+Noi'
  Event1Dress = 'Áo dài truyền thống hoặc trang phục lịch sự tông màu ấm (Đỏ trầm, Vàng kem, Xanh olive).'
  Event1Parking = 'Ô tô gửi tại bãi đỗ tòa nhà Việt Tower đầu ngõ 45 Thái Hà; có đội bê tráp hướng dẫn.'
  Event1Note = 'Sau nghi lễ nạp tài lúc 09:00 sáng, kính mời gia đình hai bên dùng bữa trưa thân mật lúc 11:30.'
  Event2Title = 'Lễ Thành Hôn & Tiệc Cưới Chính Thức'
  Event2Venue = 'Trung tâm Hội nghị & Tiệc cưới Forevermark – Sảnh Arabian (Tầng 2)'
  Event2Address = '614 Lạc Long Quân, Phường Nhật Tân, Quận Tây Hồ, Hà Nội'
  Event2Start = '2026-12-25T04:00:00Z'
  Event2Deadline = '2026-12-20T16:59:00Z'
  Event2Capacity = 260
  Event2Maps = 'https://maps.google.com/?q=Forevermark+614+Lac+Long+Quan+Tay+Ho+Ha+Noi'
  Event2Dress = 'Trang phục lịch sự, trang nhã theo tông Trắng kem, Be sáng, Hồng đất hoặc Đen cổ điển.'
  Event2Parking = 'Khuôn viên sảnh chính có bãi đỗ ô tô và xe máy rộng rãi miễn phí (rẽ cổng số 2 hướng Âu Cơ / Võ Chí Công).'
  Event2Note = 'Đón khách và chụp hình Photobooth từ 10:30 sáng; nghi thức Lễ Thành Hôn cử hành đúng 11:15.'
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
$design = @{ names=$demo.Names; message=$demo.Message; theme=$demo.Theme; accent=$demo.Accent; story=$demo.Story; footer=$demo.Footer; showStory=$true; musicId=$wedding.draft_music_id; musicAutoplay=$true; showCountdown=$true; expectedVersion=[int64]$wedding.version }
Invoke-Api $owner '/admin/wedding/design' 'PUT' $design (Get-Csrf $owner) | Out-Null

$wedding = Invoke-Api $owner '/admin/wedding'
$demoSections = @(
  @{
    kind = 'INTRO'; audience = 'PUBLIC'; enabled = $true
    title = 'Chuyện của An & Bình'
    body = 'Giữa hàng triệu người trên thế gian, thật may mắn vì chúng mình đã tìm thấy nhau và cùng viết nên chương đẹp nhất của cuộc đời.'
    startsAt = $null; color = $null
    payload = @{
      people = @(
        @{ name='Nguyễn Hoàng An'; role='Chú rể · Chàng kỹ sư ấm áp'; note='Điềm đạm, mê nhiếp ảnh phim và thích nấu những bữa cơm chiều ấm cúng.'; quote='Bình yên lớn nhất sau mỗi ngày dài là được trở về bên em.'; avatarUrl='/fallback/groom-portrait.jpg' },
        @{ name='Trần Thanh Bình'; role='Cô dâu · Nàng thiết kế mộng mơ'; note='Yêu hoa cỏ, thích những buổi sáng cuối tuần đầy nắng và luôn tràn ngập năng lượng tích cực.'; quote='Hạnh phúc được vun đắp từ sự thấu hiểu và những cái ôm thật chặt mỗi ngày.'; avatarUrl='/fallback/bride-portrait.jpg' }
      )
      milestones = @(
        @{ dateLabel='Mùa thu 2022'; title='Cơn mưa chiều trên phố Phan Đình Phùng'; description='Từ một tách trà nóng sẻ đôi dưới mái hiên nhỏ, hai ánh mắt chạm nhau mở đầu hành trình yêu thương.'; photoUrl='/fallback/love-story-1.jpg' },
        @{ dateLabel='Tháng 06 · 2024'; title='Những chuyến tàu đêm khám phá miền đất mới'; description='Hơn một nghìn ngày đồng hành qua bao mùa nắng gió giúp tụi mình thêm thấu hiểu và bao dung.'; photoUrl='/fallback/hero.jpg' },
        @{ dateLabel='Tháng 09 · 2026'; title='Lời cầu hôn ngọt ngào dưới ánh hoàng hôn'; description='Chiếc nhẫn nhỏ trao tay cùng lời hẹn ước nắm tay nhau đi hết cuộc đời.'; photoUrl='/fallback/love-story-2.jpg' }
      )
    }
  },
  @{
    kind = 'FAMILY'; audience = 'PUBLIC'; enabled = $true
    title = 'Gia đình hai bên'
    body = 'Nơi khởi nguồn của yêu thương và là điểm tựa vững chắc cho tổ ấm mới của hai con.'
    startsAt = $null; color = $null
    payload = @{
      groups = @(
        @{ label='Nhà Trai'; side='GROOM'; location='Quận Ba Đình, Hà Nội'; welcomeNote='Gia đình Nhà Trai trân trọng đón tiếp quý khách.'; members=@(@{ name='Ông Nguyễn Văn Minh'; note='Thân phụ' }, @{ name='Bà Lê Thị Thu Hằng'; note='Thân mẫu' }) },
        @{ label='Nhà Gái'; side='BRIDE'; location='Quận Đống Đa, Hà Nội'; welcomeNote='Gia đình Nhà Gái hân hạnh đón tiếp quý khách.'; members=@(@{ name='Ông Trần Quốc Tuấn'; note='Thân phụ' }, @{ name='Bà Phạm Thị Lan'; note='Thân mẫu' }) }
      )
    }
  },
  @{
    kind = 'CEREMONY'; audience = 'PRIVATE'; enabled = $true
    title = 'Nghi lễ truyền thống hai gia đình'
    body = 'Trân trọng kính mời đại gia đình và người thân tham dự lễ gia tiên ấm cúng.'
    startsAt = $null; color = $null
    payload = @{
      items = @(
        @{ title='Lễ Ăn Hỏi & Nạp Tài'; side='BRIDE'; lead='Cử hành tại tư gia Nhà Gái'; time='2026-12-24T02:00:00Z'; venue='Tư gia Nhà Gái'; address='Số 45 Phố Thái Hà, Quận Đống Đa, Hà Nội'; mapsUrl='https://maps.google.com/?q=45+Thai+Ha+Dong+Da+Ha+Noi'; dressNote='Áo dài truyền thống hoặc trang phục lịch sự'; directions='Có đội bê tráp hướng dẫn gửi xe đầu ngõ 45 Thái Hà.' },
        @{ title='Lễ Vu Quy & Rước Dâu'; side='GROOM'; lead='Đón dâu về tư gia Nhà Trai làm lễ gia tiên'; time='2026-12-25T01:30:00Z'; venue='Tư gia Nhà Trai'; address='Số 18 Phan Đình Phùng, Quận Ba Đình, Hà Nội'; mapsUrl='https://maps.google.com/?q=18+Phan+Dinh+Phung+Ba+Dinh+Ha+Noi'; dressNote='Trang phục trang trọng'; directions='Đoàn xe rước dâu khởi hành đúng giờ lành.' }
      )
    }
  },
  @{
    kind = 'TIMELINE'; audience = 'PUBLIC'; enabled = $true
    title = 'Chương trình ngày chung đôi'
    body = 'Khung giờ chính thức để quý khách thuận tiện sắp xếp thời gian đến chung vui.'
    startsAt = $null; color = $null
    payload = @{
      timeline = @(
        @{ at='2026-12-25T03:30:00Z'; title='Đón khách & Chụp hình Photobooth'; note='Tiệc trà đón tiếp và chụp ảnh lưu niệm lấy ngay cùng cô dâu chú rể.'; venue='Sảnh Arabian (Tầng 2) — Forevermark'; side='JOINT'; mapsUrl='https://maps.google.com/?q=Forevermark+614+Lac+Long+Quan+Tay+Ho+Ha+Noi'; audience='PUBLIC'; tentative=$false },
        @{ at='2026-12-25T04:15:00Z'; title='Nghi thức Lễ Thành Hôn'; note='Khoảnh khắc trao nhẫn cưới và nâng ly rượu hồng chúc phúc.'; venue='Khán phòng chính Sảnh Arabian'; side='JOINT'; audience='PUBLIC'; tentative=$false },
        @{ at='2026-12-25T04:45:00Z'; title='Khai tiệc & Giao lưu âm nhạc'; note='Dùng bữa thân mật, tung hoa cưới và chia sẻ niềm vui.'; venue='Forevermark — 614 Lạc Long Quân'; side='JOINT'; audience='PUBLIC'; tentative=$false }
      )
    }
  },
  @{
    kind = 'DRESS_CODE'; audience = 'PUBLIC'; enabled = $true
    title = 'Gợi ý trang phục & Cẩm nang dự tiệc'
    body = 'Quý khách vui lòng lựa chọn trang phục lịch sự theo các gam màu Trắng kem, Be cát sáng, Hồng đất hoặc Xanh lá Sage để hòa điệu cùng không gian buổi lễ.'
    startsAt = $null; color = $null
    payload = @{
      palette = @(
        @{ name='Trắng kem (Cream White)'; color='#f5f2eb' },
        @{ name='Be cát sáng (Warm Beige)'; color='#dfd3c3' },
        @{ name='Hồng đất (Dusty Rose)'; color='#c89d94' },
        @{ name='Xanh lá Sage (Sage Green)'; color='#a3b19b' },
        @{ name='Đen lịch lãm (Classic Black)'; color='#2c2c2c' }
      )
      avoid = 'Khách nữ vui lòng hạn chế mặc váy trắng tinh dáng xòe dài trùng váy lễ chính của Cô dâu.'
      tips = @(
        @{ title='Đón khách & Photobooth'; detail='Quầy chụp hình lấy liền mở cửa từ 10:30 sáng tại tiền sảnh tầng 2.' },
        @{ title='Bãi đỗ xe rộng rãi'; detail='Miễn phí gửi ô tô và xe máy tại khuôn viên Forevermark (rẽ cổng số 2 hướng Võ Chí Công).' },
        @{ title='Thực đơn chay & Trẻ nhỏ'; detail='Gia đình có chuẩn bị cỗ chay riêng và ghế trẻ em — quý khách có thể chọn nhanh trong mục Xác nhận tham dự.' }
      )
    }
  }
)
Invoke-Api $owner '/admin/wedding/sections' 'PUT' @{ sections=$demoSections; templateVersion=1; contentSchemaVersion=2; expectedVersion=[int64]$wedding.version } (Get-Csrf $owner) | Out-Null
Write-Host 'Đã lưu nội dung, câu chuyện cột mốc và thiết kế demo.' -ForegroundColor Green

function Get-EventByTitle($title, $venue) {
  $raw = Invoke-Api $owner '/admin/events'
  $events = @($raw | ConvertTo-Json -Depth 20 | ConvertFrom-Json)
  foreach ($candidate in $events) { if ([string]$candidate.title -eq $title -and [string]$candidate.venue -eq $venue) { return [string](@($candidate.id)[0]) } }
  return $null
}
function Ensure-Event($title, $venue, $address, $start, $deadline, $capacity, $maps = '', $dress = '', $parking = '', $note = '') {
  $existing = Get-EventByTitle $title $venue
  if ($null -ne $existing) { return $existing }
  $body = @{ title=$title; venue=$venue; address=$address; startAt=$start; deadline=$deadline; timezone='Asia/Ho_Chi_Minh'; capacity=$capacity; mapsUrl=$maps; dressCode=$dress; parking=$parking; note=$note; expectedVersion=0 }
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
$event1Draft = Ensure-Event $demo.Event1Title $demo.Event1Venue $demo.Event1Address $demo.Event1Start $demo.Event1Deadline $demo.Event1Capacity $demo.Event1Maps $demo.Event1Dress $demo.Event1Parking $demo.Event1Note
$event1 = Publish-Event $event1Draft $demo.Event1Title $demo.Event1Venue
$event2Draft = Ensure-Event $demo.Event2Title $demo.Event2Venue $demo.Event2Address $demo.Event2Start $demo.Event2Deadline $demo.Event2Capacity $demo.Event2Maps $demo.Event2Dress $demo.Event2Parking $demo.Event2Note
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