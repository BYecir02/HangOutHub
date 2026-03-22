$ErrorActionPreference = 'Stop'

$base = ''

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Login-SeedUser {
  param(
    [string]$Email,
    [string]$Password
  )

  return Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body (
    @{ email = $Email; password = $Password } | ConvertTo-Json
  )
}

function Get-BookableEventId {
  param(
    [array]$PublicEvents,
    [array]$OrganizerEvents
  )

  $nowUtc = [DateTime]::UtcNow

  foreach ($event in $PublicEvents) {
    if (-not $event.id) {
      continue
    }
    try {
      if ($event.endTime) {
        $end = [DateTime]::Parse($event.endTime).ToUniversalTime()
        if ($end -gt $nowUtc) {
          return [string]$event.id
        }
      }
    } catch {
      continue
    }
  }

  foreach ($event in $OrganizerEvents) {
    if (-not $event.id) {
      continue
    }
    try {
      if ($event.endTime) {
        $end = [DateTime]::Parse($event.endTime).ToUniversalTime()
        if ($end -gt $nowUtc) {
          return [string]$event.id
        }
      }
    } catch {
      continue
    }
  }

  return ''
}

Write-Output 'V_REGRESSION_START=true'

# 1) API availability + active port detection
$candidatePorts = 3000..3010
$resolved = $false
foreach ($port in $candidatePorts) {
  $probeBase = "http://localhost:$port/api/v1"
  try {
    $ping = Invoke-WebRequest -UseBasicParsing -Uri "$probeBase/categories" -TimeoutSec 3
    if ($ping.StatusCode -eq 200) {
      $base = $probeBase
      $resolved = $true
      Write-Output "V_API_BASE=$base"
      break
    }
  } catch {
    # try next port
  }
}

if (-not $resolved) {
  throw 'API ping failed on ports 3000..3010'
}
Write-Output 'V_API_PING=PASS'

# 2) Seed users login
$organizer = Login-SeedUser -Email 'nova@hangouthub.dev' -Password 'Demo12345!'
$participant = Login-SeedUser -Email 'amina@hangouthub.dev' -Password 'Demo12345!'
Assert-True ([bool]$organizer.access_token) 'Organizer login failed'
Assert-True ([bool]$participant.access_token) 'Participant login failed'
Write-Output 'V_LOGIN_SEEDS=PASS'

$organizerHeaders = @{ Authorization = "Bearer $($organizer.access_token)"; 'Content-Type' = 'application/json' }
$participantHeaders = @{ Authorization = "Bearer $($participant.access_token)"; 'Content-Type' = 'application/json' }

# 3) Role gate: USER cannot create event
$blocked = $false
$statusCode = ''
try {
  Invoke-RestMethod -Method Post -Uri "$base/events" -Headers $participantHeaders -Body (
    @{
      title = 'Regression V user create event'
      description = 'forbidden check'
      startTime = '2026-05-22T18:00:00.000Z'
      endTime = '2026-05-22T20:00:00.000Z'
      entryFee = 0
    } | ConvertTo-Json
  ) | Out-Null
} catch {
  $blocked = $true
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode.value__
  }
}
Assert-True ($blocked -and $statusCode -eq 403) 'Role gate regression: USER can create events'
Write-Output 'V_ROLE_GATE_CREATE_EVENT=PASS'

# 4) Resolve event ids for booking and scans checks
$mine = Invoke-RestMethod -Method Get -Uri "$base/events/mine" -Headers $organizerHeaders
Assert-True ($mine.Count -gt 0) 'No organizer event found for regression checks'
$organizerEventId = [string]$mine[0].id
$publicEvents = Invoke-RestMethod -Method Get -Uri "$base/events"
$bookingEventId = Get-BookableEventId -PublicEvents $publicEvents -OrganizerEvents $mine
Assert-True ([bool]$bookingEventId) 'No non-ended event available for booking checks'
Write-Output "V_BOOKING_EVENT_ID=$bookingEventId"
Write-Output "V_SCANS_EVENT_ID=$organizerEventId"

# 5) Booking creation and idempotence for participant
$booking1 = Invoke-RestMethod -Method Post -Uri "$base/events/$bookingEventId/book" -Headers $participantHeaders -Body (@{} | ConvertTo-Json)
$booking2 = Invoke-RestMethod -Method Post -Uri "$base/events/$bookingEventId/book" -Headers $participantHeaders -Body (@{} | ConvertTo-Json)

Assert-True ([bool]$booking1.id) 'Booking 1 missing id'
Assert-True ($booking1.id -eq $booking2.id) 'Booking idempotence failed: duplicate booking ids'

$status = [string]$booking1.status
$hasQr = [bool]$booking1.qrCode
$isQrExpected = @('CONFIRMED', 'PAID', 'USED', 'CHECKED_IN') -contains $status
if ($isQrExpected) {
  Assert-True $hasQr 'QR missing for a confirmed-like booking status'
}
Write-Output 'V_BOOKING_IDEMPOTENCE=PASS'

# 6) Participant list contains event booking
$myBookings = Invoke-RestMethod -Method Get -Uri "$base/events/my-bookings" -Headers $participantHeaders
$containsBooking = $false
foreach ($b in $myBookings) {
  if ($b.id -eq $booking1.id) {
    $containsBooking = $true
    break
  }
}
Assert-True $containsBooking 'Booking missing from /events/my-bookings'
Write-Output 'V_MY_BOOKINGS_LISTING=PASS'

# 7) Organizer scans endpoint authorization and schema
$scans = Invoke-RestMethod -Method Get -Uri "$base/events/$organizerEventId/scans" -Headers $organizerHeaders
Assert-True ($null -ne $scans.counters) 'Scans response missing counters'
Assert-True ($null -ne $scans.scans) 'Scans response missing scans list'
Write-Output 'V_SCANS_ENDPOINT_ORGANIZER=PASS'

$participantForbidden = $false
$participantForbiddenCode = ''
try {
  Invoke-RestMethod -Method Get -Uri "$base/events/$organizerEventId/scans" -Headers $participantHeaders | Out-Null
} catch {
  $participantForbidden = $true
  if ($_.Exception.Response) {
    $participantForbiddenCode = [int]$_.Exception.Response.StatusCode.value__
  }
}
Assert-True ($participantForbidden -and $participantForbiddenCode -eq 403) 'Scans endpoint authorization regression: USER not forbidden'
Write-Output 'V_SCANS_ENDPOINT_FORBIDDEN_USER=PASS'

Write-Output 'V_REGRESSION_RESULT=PASS'