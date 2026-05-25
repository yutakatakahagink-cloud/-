# 一時的なセル抽出スクリプト
param([Parameter(Mandatory=$true)][string]$Sheet)
$ext="$env:TEMP\xlsm_check2\out"
$xml=Get-Content "$ext\xl\worksheets\$Sheet" -Raw -Encoding UTF8
$ss=Get-Content "$ext\xl\sharedStrings.xml" -Raw -Encoding UTF8
$siMatches=[regex]::Matches($ss,'<si>(.*?)</si>',[System.Text.RegularExpressions.RegexOptions]::Singleline)
$sst=@()
foreach($m in $siMatches){
  $tMatches=[regex]::Matches($m.Groups[1].Value,'<t[^>]*>(.*?)</t>')
  $tParts=foreach($x in $tMatches){ $x.Groups[1].Value }
  $sst+=([string]::Join('',$tParts))
}
$cells=[regex]::Matches($xml,'<c r="([^"]+)"(?:[^>]*t="([^"]+)")?[^>]*>(.*?)</c>',[System.Text.RegularExpressions.RegexOptions]::Singleline)
$lines=@()
foreach($c in $cells){
  $r=$c.Groups[1].Value
  $t=$c.Groups[2].Value
  $body=$c.Groups[3].Value
  $valM=[regex]::Match($body,'<v>([^<]*)</v>')
  $val=if($valM.Success){$valM.Groups[1].Value}else{''}
  $disp=if($t -eq 's' -and $val -match '^\d+$'){ $sst[[int]$val] } else { $val }
  if($disp){ $lines+="$r=$disp" }
}
$lines | Out-File "$env:TEMP\sheet_cells_$Sheet.txt" -Encoding UTF8
$lines | Select-Object -First 200
