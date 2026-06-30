# Controlador de mídia Windows via SMTC (System Media Transport Controls).
# Mesma API usada pelo capturador — funciona com Spotify, Chrome, Edge, etc.
#
# Uso one-shot:
#   powershell -File windows-smtc-control.ps1 -Action play_pause
#
# Uso servidor (stdin):
#   powershell -File windows-smtc-control.ps1 -Server

param(
  [ValidateSet('play_pause', 'play', 'pause', 'next', 'prev', 'stop')]
  [string]$Action,
  [switch]$Server
)

$ErrorActionPreference = 'Stop'

function Initialize-Smtc {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction Stop
  [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
  [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSession, Windows.Media.Control, ContentType=WindowsRuntime]
}

function Wait-IAsyncOperation {
  param($AsyncOp, [Type]$ResultType)
  $methods = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1
  }
  $method = $methods | Where-Object {
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  } | Select-Object -First 1
  if (-not $method) { throw 'AsTask(IAsyncOperation) not found' }
  $generic = $method.MakeGenericMethod($ResultType)
  $task = $generic.Invoke($null, @($AsyncOp))
  $null = $task.GetAwaiter().GetResult()
  return $task.GetAwaiter().GetResult()
}

function Send-SmtcAction {
  param([string]$Name)

  $manager = Wait-IAsyncOperation `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) `
    ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

  $session = $manager.GetCurrentSession()
  if ($null -eq $session) {
    throw 'no_active_session'
  }

  $result = $false
  switch ($Name) {
    'play_pause' { $result = Wait-IAsyncOperation ($session.TryTogglePlayPauseAsync()) ([bool]) }
    'play'       { $result = Wait-IAsyncOperation ($session.TryPlayAsync()) ([bool]) }
    'pause'      { $result = Wait-IAsyncOperation ($session.TryPauseAsync()) ([bool]) }
    'next'       { $result = Wait-IAsyncOperation ($session.TrySkipNextAsync()) ([bool]) }
    'prev'       { $result = Wait-IAsyncOperation ($session.TrySkipPreviousAsync()) ([bool]) }
    'stop'       { $result = Wait-IAsyncOperation ($session.TryStopAsync()) ([bool]) }
    default      { throw "unsupported_action:$Name" }
  }

  if (-not $result) {
    throw "command_rejected:$Name"
  }
}

if ($Server) {
  try {
    Initialize-Smtc
  } catch {
    Write-Error $_.Exception.Message
    exit 1
  }

  Write-Output 'ready'
  while ($null -ne ($line = [Console]::In.ReadLine())) {
    $line = $line.Trim()
    if ($line -eq 'exit') { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
      Send-SmtcAction -Name $line
      Write-Output "ok:$line"
    } catch {
      Write-Output "fail:$line $($_.Exception.Message)"
    }
  }
  exit 0
}

if (-not $Action) {
  Write-Error 'Action is required when not using -Server'
  exit 1
}

try {
  Initialize-Smtc
  Send-SmtcAction -Name $Action
  exit 0
} catch {
  Write-Error $_.Exception.Message
  exit 2
}
