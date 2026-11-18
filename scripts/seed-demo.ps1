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
  Message = "Trân trọng kính mời Quý vị và Gia đình tới dự bữa tiệc chung vui mừng Lễ Thành Hôn của hai con chúng tôi.`nSự hiện diện và lời chúc phúc của Quý khách là niềm vinh hạnh lớn lao của hai bên gia đình."
  Story = "Bắt đầu từ một cuộc gặp gỡ tình cờ vào chiều thu Hà Nội năm 2022, dưới mái hiên nhỏ trên phố Phan Đình Phùng khi cơn mưa bất chợt ghé ngang. Từ một tách trà nóng sẻ đôi và những câu chuyện không đầu không cuối, chúng mình nhận ra nhịp đập bình yên nơi ánh mắt người đối diện.`n`nQua hơn một nghìn ngày cùng nhau đi qua bao mùa nắng gió, những chuyến tàu đêm khám phá miền đất mới và cả những ngày bình dị bên căn bếp nhỏ, tình yêu cứ thế lớn dần bằng sự thấu hiểu và bao dung.`n`nHôm nay, Hoàng An và Thanh Bình quyết định nắm tay nhau bước vào lễ đường, viết tiếp chương đẹp nhất của cuộc đời bằng một tổ ấm ngập tràn tiếng cười."
  Footer = 'Cảm ơn bạn đã luôn yêu thương, đồng hành và dành thời gian quý báu đến chung vui cùng vợ chồng mình. Hẹn gặp bạn tại ngày hạnh phúc!'
  Event1Title = 'Lễ Ăn Hỏi & Cơm Thân Mật Hai Gia Đình'
  Event1Venue = 'Tư gia Nhà Gái & Không gian Ẩm thực Sen Tây Hồ'
  Event1Address = 'Số 45 Phố Thái Hà, Quận Đống Đa, Hà Nội'
  Event1Start = '2026-12-24T02:00:00Z'
  Event1Deadline = '2026-12-19T16:59:00Z'
  Event1Capacity = 100
  Event1Maps = 'https://maps.google.com/?q=45+Thai+Ha+Dong+Da+Ha+Noi'
  Event1Lat = 21.0116
  Event1Lng = 105.8214
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
  Event2Lat = 21.0748
  Event2Lng = 105.8142
  Event2Dress = 'Trang phục lịch sự, trang nhã theo tông Trắng kem, Be sáng, Hồng đất hoặc Đen cổ điển.'
  Event2Parking = 'Khuôn viên sảnh chính có bãi đỗ ô tô và xe máy rộng rãi miễn phí (rẽ cổng số 2 hướng Âu Cơ / Võ Chí Công).'
  Event2Note = 'Đón khách và chụp hình Photobooth từ 10:30 sáng; nghi thức Lễ Thành Hôn cử hành đúng 11:15.'
  Event3Title = 'Tiệc Tối Thân Mật Cùng Hội Bạn Thân'
  Event3Venue = 'The Hudson Rooms – Capella Hanoi (Tầng Thượng)'
  Event3Address = '11 Lê Phụng Hiểu, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội'
  Event3Start = '2026-12-26T11:30:00Z'
  Event3Deadline = '2026-12-22T16:59:00Z'
  Event3Capacity = 80
  Event3Maps = 'https://maps.google.com/?q=Capella+Hanoi+11+Le+Phung+Hieu+Hoan+Kiem+Ha+Noi'
  Event3Lat = 21.0268
  Event3Lng = 105.8569
  Event3Dress = 'Cocktail thanh lịch tông Champagne, Đen nhung hoặc Đỏ rượu vang.'
  Event3Parking = 'Có dịch vụ Valet Parking đón xe trực tiếp tại sảnh chính khách sạn Capella.'
  Event3Note = 'Đêm nhạc Jazz & nâng ly thân mật mừng chặng đường mới bên những người bạn gắn bó nhất.'
}

Add-Type -AssemblyName System.Net.Http

function New-Session { New-Object Microsoft.PowerShell.Commands.WebRequestSession }
function Get-Csrf($session) {
  $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/session/csrf" -WebSession $session -Method Get
  return @{ $response.headerName = $response.token }
}
function Invoke-Api($session, [string]$Path, [string]$Method = 'GET', $Body = $null, [hashtable]$Headers = @{}) {
  $params = @{ Uri = "$BaseUrl/api/v1$Path"; Method = $Method; WebSession = $session; Headers = $Headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $params.ContentType = 'application/json; charset=utf-8'; $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 12 -Compress)) }
  try {
    $resp = Invoke-WebRequest @params
    if ($null -eq $resp.RawContentStream -or $resp.RawContentStream.Length -eq 0) { return $null }
    $json = [System.Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray())
    if ([string]::IsNullOrWhiteSpace($json)) { return $null }
    return ($json | ConvertFrom-Json)
  } catch {
    $detail = $_.ErrorDetails.Message
    if (-not $detail) { $detail = $_.Exception.Message }
    throw "API $Method $Path thất bại: $detail"
  }
}
function Invoke-Multipart($session, [string]$Path, [string]$FilePath) {
  $csrf = Get-Csrf $session
  $handler = New-Object System.Net.Http.HttpClientHandler
  $handler.CookieContainer = $session.Cookies
  $client = New-Object System.Net.Http.HttpClient($handler)
  $form = New-Object System.Net.Http.MultipartFormDataContent
  $stream = [System.IO.File]::OpenRead((Resolve-Path $FilePath).Path)
  try {
    foreach ($k in $csrf.Keys) { $client.DefaultRequestHeaders.Add($k, [string]$csrf[$k]) }
    $ext = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
    $mime = if ($ext -eq '.png') { 'image/png' } else { 'image/jpeg' }
    $fileContent = New-Object System.Net.Http.StreamContent($stream)
    $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($mime)
    $form.Add($fileContent, 'file', [System.IO.Path]::GetFileName($FilePath))
    $res = $client.PostAsync("$BaseUrl/api/v1$Path", $form).GetAwaiter().GetResult()
    $text = $res.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    if (-not $res.IsSuccessStatusCode) { throw "HTTP $([int]$res.StatusCode): $text" }
    return ($text | ConvertFrom-Json)
  } catch {
    throw "Không thể tải ảnh $FilePath lên: $($_.Exception.Message)"
  } finally {
    $stream.Dispose()
    $form.Dispose()
    $client.Dispose()
    $handler.Dispose()
  }
}
function Unwrap-List($raw) {
  if ($null -eq $raw) { return @() }
  if ($raw -is [System.Array]) { return $raw }
  return @($raw)
}
function Save-Text($path, $text) { [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false))) }
function Get-Token($url) { return ($url -split '/i/')[1] }

if ($ResetDemo) {
  $compose = Join-Path $root 'deploy/compose.yml'
  $sql = Join-Path $PSScriptRoot 'demo-reset.sql'
  Write-Host 'Đang dọn dữ liệu demo trong PostgreSQL...' -ForegroundColor Yellow
  Get-Content -Raw -Encoding UTF8 $sql | docker compose --env-file (Join-Path $root '.env') -f $compose exec -T db psql -U wedding -d wedding
}

$owner = New-Session
$csrf = Get-Csrf $owner
Invoke-WebRequest -Uri "$BaseUrl/api/v1/auth/login" -Method Post -WebSession $owner -Headers $csrf -UseBasicParsing -ContentType 'application/x-www-form-urlencoded' -Body @{ username = $Username; password = $Password } | Out-Null
Write-Host "Đã đăng nhập Owner: $Username" -ForegroundColor Green

$wedding = Invoke-Api $owner '/admin/wedding'
$design = @{ names=$demo.Names; message=$demo.Message; theme=$demo.Theme; accent=$demo.Accent; story=$demo.Story; footer=$demo.Footer; showStory=$true; musicId=$wedding.draft_music_id; musicAutoplay=$true; showCountdown=$true; expectedVersion=[int64]$wedding.version }
Invoke-Api $owner '/admin/wedding/design' 'PUT' $design (Get-Csrf $owner) | Out-Null

$groomAvatarUrl = '/fallback/groom-portrait.jpg'
$brideAvatarUrl = '/fallback/bride-portrait.jpg'
if ($MediaPath -and (Test-Path $MediaPath)) {
  $existingMedia = @(Unwrap-List (Invoke-Api $owner '/admin/media') | Where-Object { $_.kind -eq 'IMAGE' })
  $byName = @{}
  foreach ($m in $existingMedia) { $byName[[string]$m.original_name] = [string]$m.id }
  $files = @(Get-ChildItem $MediaPath -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' } | Sort-Object Name)
  $albumIds = @()
  foreach ($file in $files) {
    $mediaId = if ($byName.ContainsKey($file.Name)) { $byName[$file.Name] } else { (Invoke-Multipart $owner '/admin/media' $file.FullName).id }
    $byName[$file.Name] = [string]$mediaId
    if ($file.Name -notmatch '^(14|15)-') { $albumIds += [string]$mediaId }
  }
  if ($byName.ContainsKey('14-chan-dung-chu-re-4x5.jpg')) { $groomAvatarUrl = "/media/$($byName['14-chan-dung-chu-re-4x5.jpg']).jpg" }
  if ($byName.ContainsKey('15-chan-dung-co-dau-4x5.jpg')) { $brideAvatarUrl = "/media/$($byName['15-chan-dung-co-dau-4x5.jpg']).jpg" }
  if ($albumIds.Count -gt 0) {
    $heroCandidate = if ($albumIds.Count -ge 2) { $albumIds[1] } else { $albumIds[0] }
    Invoke-Api $owner '/admin/media/hero/DRAFT' 'PUT' @{ id=$heroCandidate } (Get-Csrf $owner) | Out-Null
    Invoke-Api $owner "/admin/media/$heroCandidate/focal/DRAFT" 'PUT' @{ x=52; y=38 } (Get-Csrf $owner) | Out-Null
    Invoke-Api $owner '/admin/media/album/DRAFT' 'PUT' @{ ids=$albumIds } (Get-Csrf $owner) | Out-Null
    Write-Host "Đã đồng bộ $($albumIds.Count) ảnh cho Hero và Album bản nháp (+ chân dung riêng)." -ForegroundColor Green
  }
} else { Write-Host 'Chưa truyền -MediaPath; giữ nguyên lựa chọn ảnh hiện có.' -ForegroundColor Yellow }

$wedding = Invoke-Api $owner '/admin/wedding'
$demoSections = @(
  @{
    kind = 'INTRO'; audience = 'PUBLIC'; enabled = $true
    title = 'Chuyện của An & Bình'
    body = 'Giữa hàng triệu người trên thế gian, thật may mắn vì chúng mình đã tìm thấy nhau và cùng viết nên chương đẹp nhất của cuộc đời.'
    startsAt = $null; color = $null
    payload = @{
      people = @(
        @{ name='Nguyễn Hoàng An'; role='Chú rể · Chàng kỹ sư ấm áp'; note='Điềm đạm, mê nhiếp ảnh phim và thích nấu những bữa cơm chiều ấm cúng. Với An, hạnh phúc luôn bắt đầu từ những điều giản dị và chân thành nhất.'; quote='Bình yên lớn nhất sau mỗi ngày dài là được trở về bên em.'; avatarUrl=$groomAvatarUrl },
        @{ name='Trần Thanh Bình'; role='Cô dâu · Nàng thiết kế mộng mơ'; note='Yêu hoa cỏ, thích những buổi sáng cuối tuần đầy nắng và luôn tràn ngập năng lượng tích cực. Bình tin rằng tổ ấm đẹp nhất là nơi luôn vang tiếng cười.'; quote='Hạnh phúc được vun đắp từ sự thấu hiểu và những cái ôm thật chặt mỗi ngày.'; avatarUrl=$brideAvatarUrl }
      )
      milestones = @(
        @{ dateLabel='Mùa thu · 10/2022'; title='Cơn mưa chiều trên phố Phan Đình Phùng'; description='Từ một tách trà nóng sẻ đôi dưới mái hiên nhỏ khi cơn mưa thu bất chợt ghé ngang, hai ánh mắt chạm nhau mở đầu hành trình yêu thương.'; photoUrl='/fallback/love-story-1.jpg' },
        @{ dateLabel='Mùa hạ · 06/2024'; title='Những chuyến tàu đêm khám phá miền đất mới'; description='Hơn một nghìn ngày đồng hành qua bao mùa nắng gió, từ Đà Lạt mờ sương tới Hội An rực nắng, giúp tụi mình thêm thấu hiểu và bao dung.'; photoUrl='/fallback/hero.jpg' },
        @{ dateLabel='Mùa thu · 09/2026'; title='Lời cầu hôn ngọt ngào dưới ánh hoàng hôn'; description='Dưới vòm hoa khu vườn yên tĩnh, chiếc nhẫn nhỏ trao tay cùng lời hẹn ước nắm tay nhau đi hết cuộc đời.'; photoUrl='/fallback/love-story-2.jpg' },
        @{ dateLabel='Tháng 12 · 2026'; title='Ngày chung đôi — Khởi đầu một tổ ấm'; description='Trước sự chứng kiến và chúc phúc của hai bên gia đình cùng những người thương quý nhất, chúng mình chính thức gọi nhau hai tiếng Gia đình.'; photoUrl='/fallback/reception.jpg' }
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
        @{ label='Nhà Trai'; side='GROOM'; location='Quận Ba Đình, Hà Nội'; welcomeNote='Gia đình Nhà Trai trân trọng đón tiếp và cảm ơn tình cảm quý báu của Quý khách.'; members=@(@{ name='Ông Nguyễn Văn Minh'; note='Thân phụ chú rể' }, @{ name='Bà Lê Thị Thu Hằng'; note='Thân mẫu chú rể' }, @{ name='Nguyễn Minh Khôi'; note='Em trai chú rể' }) },
        @{ label='Nhà Gái'; side='BRIDE'; location='Quận Đống Đa, Hà Nội'; welcomeNote='Gia đình Nhà Gái hân hạnh đón tiếp Quý khách đến chung vui cùng hai con.'; members=@(@{ name='Ông Trần Quốc Tuấn'; note='Thân phụ cô dâu' }, @{ name='Bà Phạm Thị Lan'; note='Thân mẫu cô dâu' }, @{ name='Trần Ngọc Mai'; note='Chị gái cô dâu' }) }
      )
    }
  },
  @{
    kind = 'CEREMONY'; audience = 'PUBLIC'; enabled = $true
    title = 'Các nghi lễ truyền thống'
    body = 'Trân trọng kính mời hai bên gia đình, họ hàng và những người thân thương cùng chứng kiến khoảnh khắc thiêng liêng trước bàn thờ gia tiên.'
    startsAt = $null; color = $null
    payload = @{
      items = @(
        @{ title='Lễ Ăn Hỏi & Nạp Tài'; side='BRIDE'; lead='Đoàn Nhà Trai trao tráp sính lễ truyền thống tại tư gia Nhà Gái'; time='2026-12-24T02:00:00Z'; venue='Tư gia Nhà Gái'; address='Số 45 Phố Thái Hà, Quận Đống Đa, Hà Nội'; mapsUrl='https://maps.google.com/?q=45+Thai+Ha+Dong+Da+Ha+Noi'; dressNote='Áo dài truyền thống hoặc trang phục lịch sự tông ấm'; directions='Đi vào ngõ 45 Thái Hà 30m có cổng vòm hoa tươi; ô tô gửi tại bãi đỗ tòa nhà Việt Tower ngay đầu ngõ.' },
        @{ title='Lễ Vu Quy & Rước Dâu'; side='GROOM'; lead='Đón dâu mới về tư gia Nhà Trai dâng hương gia tiên hai họ'; time='2026-12-25T01:30:00Z'; venue='Tư gia Nhà Trai'; address='Số 18 Phan Đình Phùng, Quận Ba Đình, Hà Nội'; mapsUrl='https://maps.google.com/?q=18+Phan+Dinh+Phung+Ba+Dinh+Ha+Noi'; dressNote='Trang phục trang trọng, lịch thiệp'; directions='Đoàn xe hoa khởi hành đúng giờ lành 08:30 sáng và về tới tư gia Nhà Trai lúc 09:15.' }
      )
    }
  },
  @{
    kind = 'TIMELINE'; audience = 'PUBLIC'; enabled = $true
    title = 'Lịch trình ngày chung đôi'
    body = 'Khung giờ chi tiết theo giờ Việt Nam (GMT+7) để Quý khách thuận tiện sắp xếp thời gian đến chung vui.'
    startsAt = $null; color = $null
    payload = @{
      timeline = @(
        @{ at='2026-12-24T02:00:00Z'; title='Lễ Ăn Hỏi & Chụp ảnh Áo dài truyền thống'; note='Trao nhận sính lễ giữa hai gia đình và lưu lại khoảnh khắc ấm cúng cùng đội bê tráp.'; venue='Tư gia Nhà Gái — 45 Thái Hà, Đống Đa'; side='BRIDE'; mapsUrl='https://maps.google.com/?q=45+Thai+Ha+Dong+Da+Ha+Noi'; audience='PUBLIC'; tentative=$false },
        @{ at='2026-12-25T01:30:00Z'; title='Lễ Vu Quy & Rước Dâu về Dinh'; note='Nghi lễ gia tiên thiêng liêng trong vòng tay chúc phúc của ông bà, cha mẹ hai bên.'; venue='Tư gia Nhà Trai — 18 Phan Đình Phùng, Ba Đình'; side='GROOM'; mapsUrl='https://maps.google.com/?q=18+Phan+Dinh+Phung+Ba+Dinh+Ha+Noi'; audience='PUBLIC'; tentative=$false },
        @{ at='2026-12-25T03:30:00Z'; title='Đón khách, Tiệc trà & Chụp hình Photobooth'; note='Thưởng thức tiệc trà bánh ngọt (Teabreak), ký sổ lưu bút và chụp ảnh lấy liền cùng Cô dâu Chú rể.'; venue='Sảnh Arabian (Tầng 2) — Forevermark Tây Hồ'; side='JOINT'; mapsUrl='https://maps.google.com/?q=Forevermark+614+Lac+Long+Quan+Tay+Ho+Ha+Noi'; audience='PUBLIC'; tentative=$false },
        @{ at='2026-12-25T04:15:00Z'; title='Cử hành Nghi thức Lễ Thành Hôn'; note='Khoảnh khắc tiến vào lễ đường, trao nhẫn cưới, cắt bánh và rót tháp rượu Champagne chúc phúc.'; venue='Khán phòng chính Sảnh Arabian — Forevermark'; side='JOINT'; audience='PUBLIC'; tentative=$false },
        @{ at='2026-12-25T04:45:00Z'; title='Khai tiệc chung vui & Giao lưu âm nhạc Acoustic'; note='Dùng bữa trưa thân mật, tung hoa cưới may mắn và chia sẻ niềm vui trọn vẹn.'; venue='Forevermark — 614 Lạc Long Quân, Tây Hồ'; side='JOINT'; audience='PUBLIC'; tentative=$false }
      )
    }
  },
  @{
    kind = 'DRESS_CODE'; audience = 'PUBLIC'; enabled = $true
    title = 'Gợi ý trang phục & Cẩm nang dự tiệc'
    body = 'Quý khách vui lòng lựa chọn trang phục lịch sự theo các gam màu Trắng kem, Be cát sáng, Hồng đất hoặc Xanh lá Sage để hòa điệu cùng không gian lễ cưới và lên hình kỷ niệm thật trang nhã.'
    startsAt = $null; color = $null
    payload = @{
      palette = @(
        @{ name='Trắng kem (Cream White)'; color='#f5f2eb' },
        @{ name='Be cát sáng (Warm Beige)'; color='#dfd3c3' },
        @{ name='Hồng đất (Dusty Rose)'; color='#c89d94' },
        @{ name='Xanh lá Sage (Sage Green)'; color='#a3b19b' },
        @{ name='Đen lịch lãm (Classic Black)'; color='#2c2c2c' }
      )
      avoid = 'Khách nữ vui lòng hạn chế mặc váy trắng tinh dáng xòe dài trùng váy lễ chính của Cô dâu và các gam màu Neon quá chói.'
      tips = @(
        @{ title='Đón khách & Photobooth lấy liền'; detail='Quầy chụp hình lấy ngay mở cửa từ 10:30 sáng tại tiền sảnh tầng 2 Sảnh Arabian để lưu giữ kỷ niệm cùng gia đình.' },
        @{ title='Bãi đỗ ô tô & xe máy miễn phí'; detail='Khuôn viên Forevermark có bãi đỗ rộng rãi miễn phí (Quý khách đi ô tô rẽ cổng số 2 hướng Võ Chí Công / Âu Cơ).' },
        @{ title='Thực đơn chay & Ghế trẻ em'; detail='Gia đình có chuẩn bị mâm chay riêng và ghế ngồi an toàn cho bé — Quý khách có thể tích chọn nhanh ngay trong mục Xác nhận tham dự.' }
      )
    }
  }
)
Invoke-Api $owner '/admin/wedding/sections' 'PUT' @{ sections=$demoSections; templateVersion=1; contentSchemaVersion=2; expectedVersion=[int64]$wedding.version } (Get-Csrf $owner) | Out-Null
Write-Host 'Đã lưu nội dung 5 phần, chân dung, câu chuyện cột mốc và cẩm nang dự tiệc.' -ForegroundColor Green

function Get-EventByTitle($title) {
  $events = Unwrap-List (Invoke-Api $owner '/admin/events')
  foreach ($candidate in $events) { if ([string]$candidate.title -eq $title) { return $candidate } }
  return $null
}
function Ensure-Event($title, $venue, $address, $start, $deadline, $capacity, $maps = '', $dress = '', $parking = '', $note = '', $lat = $null, $lng = $null) {
  $existing = Get-EventByTitle $title
  if (-not $existing) {
    $body = @{ title=$title; venue=$venue; address=$address; startAt=$start; deadline=$deadline; timezone='Asia/Ho_Chi_Minh'; capacity=$capacity; mapsUrl=$maps; dressCode=$dress; parking=$parking; note=$note; expectedVersion=0 }
    Invoke-Api $owner '/admin/events' 'POST' $body (Get-Csrf $owner) | Out-Null
    $existing = Get-EventByTitle $title
  }
  $eventId = [string](@($existing.id)[0])
  if ($existing.state -eq 'DRAFT') {
    if ($null -ne $lat -and $null -ne $lng) {
      $ver = [int64](@($existing.PSObject.Properties['version'].Value)[0])
      Invoke-Api $owner "/admin/events/$eventId/location" 'PUT' @{ latitude=[double]$lat; longitude=[double]$lng; confirmed=$true; changeNotice=$null; expectedVersion=$ver } (Get-Csrf $owner) | Out-Null
      $existing = Get-EventByTitle $title
    }
    $ver = [int64](@($existing.PSObject.Properties['version'].Value)[0])
    Invoke-Api $owner "/admin/events/$eventId/publish" 'POST' @{ expectedVersion=$ver } (Get-Csrf $owner) | Out-Null
    $existing = Get-EventByTitle $title
  } elseif ($existing.state -eq 'PUBLISHED' -and $null -ne $lat -and $null -ne $lng -and $null -eq $existing.latitude) {
    $ver = [int64](@($existing.PSObject.Properties['version'].Value)[0])
    Invoke-Api $owner "/admin/events/$eventId/location" 'PUT' @{ latitude=[double]$lat; longitude=[double]$lng; confirmed=$true; changeNotice='Bổ sung định vị bản đồ sảnh tiệc để Quý khách thuận tiện tra cứu đường đi.'; expectedVersion=$ver } (Get-Csrf $owner) | Out-Null
    $existing = Get-EventByTitle $title
  }
  return $existing
}

$event1 = Ensure-Event $demo.Event1Title $demo.Event1Venue $demo.Event1Address $demo.Event1Start $demo.Event1Deadline $demo.Event1Capacity $demo.Event1Maps $demo.Event1Dress $demo.Event1Parking $demo.Event1Note $demo.Event1Lat $demo.Event1Lng
$event2 = Ensure-Event $demo.Event2Title $demo.Event2Venue $demo.Event2Address $demo.Event2Start $demo.Event2Deadline $demo.Event2Capacity $demo.Event2Maps $demo.Event2Dress $demo.Event2Parking $demo.Event2Note $demo.Event2Lat $demo.Event2Lng
$event3 = Ensure-Event $demo.Event3Title $demo.Event3Venue $demo.Event3Address $demo.Event3Start $demo.Event3Deadline $demo.Event3Capacity $demo.Event3Maps $demo.Event3Dress $demo.Event3Parking $demo.Event3Note $demo.Event3Lat $demo.Event3Lng
Write-Host "Đã chuẩn bị 3 buổi tiệc kèm tọa độ bản đồ: $($event1.event_code), $($event2.event_code), $($event3.event_code)" -ForegroundColor Green

$wedding = Invoke-Api $owner '/admin/wedding'
Invoke-Api $owner '/admin/wedding/publish' 'POST' @{ expectedVersion=[int64]$wedding.version } (Get-Csrf $owner) | Out-Null
$wedding = Invoke-Api $owner '/admin/wedding'
Invoke-Api $owner '/admin/access-policy' 'PUT' @{ mode='MANUAL_OPEN'; openAt=$null; closeAt=$null; expectedVersion=[int64]$wedding.version } (Get-Csrf $owner) | Out-Null
Write-Host 'Đã phát hành thiệp và mở chính sách truy cập demo.' -ForegroundColor Green

$guestRows = @(
  @{ Name='Gia đình anh Minh'; Group='DEMO · Gia đình'; Salutation='Trân trọng kính mời'; Assign=@(@{ eventId=$event1.id; maxPeople=4 },@{ eventId=$event2.id; maxPeople=4 }); Rsvp='ATTENDING'; People=3; Note='[Đi xe ô tô gia đình] Cả nhà rất mong đến chung vui cùng hai bạn.'; Wish='Chúc Hoàng An và Thanh Bình trăm năm hạnh phúc, tổ ấm nhỏ luôn rộn rã tiếng cười và vẹn tròn yêu thương!'; Pin=$true; WishHearts=24; CardHearts=12 },
  @{ Name='Lan & Huy'; Group='DEMO · Bạn thân'; Salutation='Thân mời'; Assign=@(@{ eventId=$event2.id; maxPeople=2 },@{ eventId=$event3.id; maxPeople=2 }); Rsvp='ATTENDING'; People=2; Note='Hẹn gặp hai bạn trong ngày thật đẹp nhé!'; Wish='Chứng kiến hành trình của hai đứa từ những ngày đầu tiên, tụi mình thực sự xúc động. Chúc đôi trẻ mãi nắm chặt tay nhau như hôm nay nhé! 🥂'; Pin=$true; WishHearts=19; CardHearts=10 },
  @{ Name='Chị Mai'; Group='DEMO · Đồng nghiệp'; Salutation='Trân trọng kính mời'; Assign=@(@{ eventId=$event2.id; maxPeople=1 }); Rsvp='DECLINED'; People=0; Note='Chị có chuyến công tác đột xuất, gửi lời chúc phúc nồng nhiệt nhất tới hai em!'; Wish='Chúc hai em tân hôn viên mãn, vạn sự hanh thông và sớm đón thiên thần nhỏ đáng yêu!'; Pin=$false; WishHearts=11; CardHearts=8 },
  @{ Name='Gia đình cô Hoa'; Group='DEMO · Gia đình'; Salutation='Kính mời'; Assign=@(@{ eventId=$event1.id; maxPeople=5 },@{ eventId=$event2.id; maxPeople=5 }); Rsvp='ATTENDING'; People=4; Note='[Thực đơn chay] Gia đình cô sẽ đến sớm chung vui cùng hai họ.'; Wish='Cô chú chúc hai con trăm năm hòa hợp, hiếu thảo thuận hòa, trọn đời bình an bên nhau.'; Pin=$false; WishHearts=16; CardHearts=10 },
  @{ Name='Anh Quân'; Group='DEMO · Bạn bè'; Salutation='Thân mời'; Assign=@(@{ eventId=$event2.id; maxPeople=1 },@{ eventId=$event3.id; maxPeople=1 }); Rsvp='ATTENDING'; People=1; Note='Rất vui được góp mặt trong ngày trọng đại của hai bạn.'; Wish='Chúc mừng chú rể Hoàng An đã rước được nàng thơ về dinh! Trăm năm hạnh phúc nhé hai bạn ơi!'; Pin=$false; WishHearts=9; CardHearts=8 },
  @{ Name='Phương & Nam'; Group='DEMO · Bạn thân'; Salutation='Thân mời'; Assign=@(@{ eventId=$event1.id; maxPeople=2 },@{ eventId=$event2.id; maxPeople=2 }); Rsvp='ATTENDING'; People=2; Note='[Có trẻ nhỏ (ghế em bé)] Chúc mừng chương mới rực rỡ của hai bạn!'; Wish='Mong mỗi ngày trôi qua trong ngôi nhà nhỏ của An & Bình đều ấm áp như nắng thu Hà Nội ngày hai bạn gặp nhau. 🌸'; Pin=$false; WishHearts=14; CardHearts=10 }
)

$linkLines = @("Dữ liệu demo: $($demo.Names)", "Thiệp chung: $BaseUrl/w/$($demo.Slug)", "Thiệp chung cá nhân hóa mẫu: $BaseUrl/w/$($demo.Slug)?guest=Anh%20Tu%E1%BA%A5n%20%26%20Gia%20%C4%91%C3%ACnh&salutation=Tr%C3%A2n%20tr%E1%BB%8Dng%20k%C3%ADnh%20m%E1%BB%9Di", '')
function Get-InvitationByName($name, $group) {
  $query = "/admin/invitations?archived=false&query=$([uri]::EscapeDataString($name))"
  $rows = Unwrap-List (Invoke-Api $owner $query)
  foreach ($row in $rows) { if ([string]$row.display_name -eq $name -and [string]$row.group_name -eq $group) { return $row } }
  return $null
}

foreach ($guest in $guestRows) {
  $guestSession = New-Session
  $existing = Get-InvitationByName $guest.Name $guest.Group
  if (-not $existing) {
    Invoke-Api $owner '/admin/guests' 'POST' @{ displayName=$guest.Name; groupName=$guest.Group; salutation=$guest.Salutation; assignments=$guest.Assign } (Get-Csrf $owner) | Out-Null
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
  if ($guest.Wish) {
    $mine = Unwrap-List (Invoke-Api $guestSession "/guest/invitations/$invitationId/wishes")
    if ($mine.Count -eq 0) {
      $createdWish = Invoke-Api $guestSession "/guest/invitations/$invitationId/wishes" 'POST' @{ displayName=$guest.Name; message=$guest.Wish } (Get-Csrf $guestSession)
      $wishId = [string]$createdWish.id
      Invoke-Api $owner "/admin/wishes/$wishId" 'POST' @{ state='APPROVED'; expectedVersion=0 } (Get-Csrf $owner) | Out-Null
      if ($guest.Pin) {
        Invoke-Api $owner "/admin/wishes/$wishId/pin" 'PUT' @{ pinned=$true; expectedVersion=1 } (Get-Csrf $owner) | Out-Null
      }
      $remWishHearts = [int]$guest.WishHearts
      while ($remWishHearts -gt 0) {
        $batch = [Math]::Min(10, $remWishHearts)
        Invoke-Api $guestSession "/guest/invitations/$invitationId/approved-wishes/$wishId/hearts" 'POST' @{ count=$batch } (Get-Csrf $guestSession) | Out-Null
        $remWishHearts -= $batch
      }
    }
  }
  if ([int]$guest.CardHearts -gt 0 -and [int]$view.wedding.heart_count -lt 100) {
    $remCardHearts = [int]$guest.CardHearts
    while ($remCardHearts -gt 0) {
      $batch = [Math]::Min(10, $remCardHearts)
      Invoke-Api $guestSession "/guest/invitations/$invitationId/hearts" 'POST' @{ count=$batch } (Get-Csrf $guestSession) | Out-Null
      $remCardHearts -= $batch
    }
  }
  $linkLines += "$($guest.Name): $url"
  Write-Host "Đã chuẩn bị khách & lời chúc demo: $($guest.Name)" -ForegroundColor Green
}

$output = Join-Path $root 'demo-links.txt'
Save-Text $output ($linkLines -join [Environment]::NewLine)
Write-Host "Hoàn tất. Link demo đã lưu tại $output" -ForegroundColor Cyan
