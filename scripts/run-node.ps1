param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$ScriptPath
)

$bundledNode = "C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$resolvedScript = Resolve-Path -LiteralPath $ScriptPath

if (Get-Command node -ErrorAction SilentlyContinue) {
  & node $resolvedScript @args
  exit $LASTEXITCODE
}

& $bundledNode $resolvedScript @args
exit $LASTEXITCODE
