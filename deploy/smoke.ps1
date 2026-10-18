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
function Assert($condition,$message){if(!$condition){throw $message};Write-Output "PASS: $message"}
function Denied($session,$path,$method='GET',$body=$null){try{CallApi $session $path $method $body ([guid]::NewGuid().ToString())|Out-Null;throw 'Expected denial'}catch{if([int]$_.Exception.Response.StatusCode -notin @(401,403)){throw}}}
for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
$csrf=CallApi $owner '/session/csrf'
Invoke-WebRequest "$Origin/api/v1/auth/login" -Method POST -WebSession $owner -Headers @{$csrf.headerName=$csrf.token} -Body @{username=$config.ADMIN_USERNAME;password=$config.ADMIN_PASSWORD}|Out-Null
Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Admin login'
Denied $guest '/admin/dashboard'
Write-Output 'PASS: Guest cannot access admin'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/draft' PUT @{names='An & Binh (smoke test)';message='Du lieu gia de kiem thu';expectedVersion=$w.version}|Out-Null
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/wedding/publish' POST @{expectedVersion=$w.version}|Out-Null
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
$eventIds=@()
foreach($title in @('Smoke E1','Smoke E2')){
 $e=CallApi $owner '/admin/events' POST @{title=$title;startAt=[DateTime]::UtcNow.AddDays(30).ToString('o');deadline=[DateTime]::UtcNow.AddDays(20).ToString('o');venue='Test venue';address='Test address';timezone='Asia/Ho_Chi_Minh';capacity=100;expectedVersion=0}
 CallApi $owner "/admin/events/$($e.id)/publish" POST @{expectedVersion=0}|Out-Null
 $eventIds+= $e.id
}
$invite=CallApi $owner '/admin/guests' POST @{displayName='Gia dinh test';groupName='Smoke';salutation='Kinh moi';assignments=@(@{eventId=$eventIds[0];maxPeople=3},@{eventId=$eventIds[1];maxPeople=3})}
$id=$invite.id
$link=CallApi $owner "/admin/invitations/$id/link-reveal" POST
$link2=CallApi $owner "/admin/invitations/$id/link-reveal" POST
Assert ($link.url -eq $link2.url) 'Stable link reveal'
$token=($link.url -split '/')[-1]
CallApi $guest '/guest-links/redeem' POST @{token=$token}|Out-Null
Assert (!(CallApi $guest "/guest/invitations/$id/state").opened) 'Backend state before open'
$cookieResponse=Invoke-WebRequest "$Origin/api/v1/session/csrf" -SessionVariable fresh
$cookieHeader=$cookieResponse.Headers['Set-Cookie'] -join ';'
Assert ($cookieHeader -match 'HttpOnly' -and $cookieHeader -match 'SameSite=Lax' -and $cookieHeader -notmatch '(?i)Domain=') 'Session cookie is host-only HttpOnly SameSite=Lax'
Denied $guest "/guest/invitations/$id"
Write-Output 'PASS: Private DTO denied before explicit open'
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
$view=CallApi $guest "/guest/invitations/$id"
Assert ($view.events.Count -eq 2) 'Two assigned events visible'
Assert ((CallApi $guest "/guest/invitations/$id/state").opened) 'Reload state restored from Spring session'
if($RestartBackend){
 $before=& docker compose --env-file "$root/.env" -f "$root/deploy/compose.yml" exec -T db psql -U wedding -d wedding -Atc "SELECT md5(username || password_hash || created_at::text) FROM admin_users WHERE id=1"
 & docker compose --env-file "$root/.env" -f "$root/deploy/compose.yml" restart backend
 if($LASTEXITCODE -ne 0){throw 'Restart failed'}
 for($i=0;$i -lt 30;$i++){try{Invoke-RestMethod "$Origin/api/v1/health"|Out-Null;break}catch{Start-Sleep 2}}
 $after=& docker compose --env-file "$root/.env" -f "$root/deploy/compose.yml" exec -T db psql -U wedding -d wedding -Atc "SELECT md5(username || password_hash || created_at::text) FROM admin_users WHERE id=1"
 Assert ($before -eq $after) 'Owner unchanged after restart'
 Assert ((CallApi $guest "/guest/invitations/$id/state").opened) 'Guest grant and open marker survive restart'
 Assert ((CallApi $owner '/auth/me').username -eq $config.ADMIN_USERNAME) 'Owner session survives restart'
}
$privateResponse=Invoke-WebRequest "$Origin/api/v1/guest/invitations/$id" -WebSession $guest
Assert (($privateResponse.Headers['Cache-Control'] -join ',') -match 'no-store') 'Private DTO no-store'
Denied $guest "/guest/invitations/$([guid]::NewGuid())"
Write-Output 'PASS: Invitation ID tampering denied'
$guest.Headers.Clear()
try { Invoke-WebRequest "$Origin/api/v1/guest/invitations/$id/open" -Method POST -WebSession $guest | Out-Null; throw 'Expected CSRF rejection' } catch { if([int]$_.Exception.Response.StatusCode -ne 403){throw} }
Write-Output 'PASS: Missing CSRF rejected'
$key=[guid]::NewGuid().ToString()
$body=@{status='ATTENDING';totalPeople=2;note='Test';expectedVersion=0}
$first=CallApi $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body $key
$retry=CallApi $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body $key
Assert ($first.version -eq $retry.version) 'Idempotent RSVP retry'
try { CallApi $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body ([guid]::NewGuid().ToString())|Out-Null;throw 'Expected stale version rejection' } catch { if([int]$_.Exception.Response.StatusCode -ne 409){throw} }
Write-Output 'PASS: Stale RSVP version rejected'
CallApi $guest "/guest/invitations/$id/events/$($eventIds[1])/rsvp" PUT @{status='DECLINED';totalPeople=0;note='';expectedVersion=0} ([guid]::NewGuid().ToString())|Out-Null
$dashboard=CallApi $owner '/admin/dashboard'
Assert (($dashboard|Where-Object id -eq $eventIds[0]).confirmed_people -eq 2) 'E1 confirmed people = 2'
Assert (($dashboard|Where-Object id -eq $eventIds[1]).declined -eq 1) 'E2 declined parties = 1'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_CLOSED';expectedVersion=$w.version}|Out-Null
Denied $guest "/guest/invitations/$id"
Write-Output 'PASS: Global close blocks existing session'
Denied $guest "/guest/invitations/$id/state"
Denied $guest "/guest/invitations/$id/open" POST
Denied $guest "/guest/invitations/$id/events/$($eventIds[0])/rsvp" PUT $body
Denied $guest '/guest-links/redeem' POST @{token=$token}
Write-Output 'PASS: Closed gate blocks state/open/RSVP/redeem'
$w=CallApi $owner '/admin/wedding'
CallApi $owner '/admin/access-policy' PUT @{mode='MANUAL_OPEN';expectedVersion=$w.version}|Out-Null
CallApi $guest "/guest/invitations/$id/open" POST|Out-Null
CallApi $owner "/admin/invitations/$id/revoke" POST @{expectedVersion=0}|Out-Null
Denied $guest "/guest/invitations/$id"
Write-Output 'PASS: Revocation blocks existing session'
Assert ((Invoke-WebRequest "$Origin/admin/login").StatusCode -eq 200) 'Next.js served via Caddy'
Write-Output 'Smoke complete. Fake test data retained for inspection; invitation revoked.'