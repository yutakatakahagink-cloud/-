param([Parameter(Mandatory=$true)][string]$Sheet1, [Parameter(Mandatory=$true)][string]$Sheet2)
$ext="$env:TEMP\xlsm_check2\out"
$ss=Get-Content "$ext\xl\sharedStrings.xml" -Raw -Encoding UTF8
$siMatches=[regex]::Matches($ss,'<si>(.*?)</si>',[System.Text.RegularExpressions.RegexOptions]::Singleline)
$sst=@()
foreach($m in $siMatches){
  $tMatches=[regex]::Matches($m.Groups[1].Value,'<t[^>]*>([^<]*)</t>')
  $tParts=foreach($x in $tMatches){ $x.Groups[1].Value }
  $sst+=([string]::Join('',$tParts))
}
function Get-Cells($sheet){
  $xml=Get-Content "$ext\xl\worksheets\$sheet" -Raw -Encoding UTF8
  $cells=[regex]::Matches($xml,'<c\s+r="([^"]+)"([^>/]*)(?:/>|>(.*?)</c>)',[System.Text.RegularExpressions.RegexOptions]::Singleline)
  $h=@{}
  foreach($c in $cells){
    $r=$c.Groups[1].Value
    $attrs=$c.Groups[2].Value
    $body=$c.Groups[3].Value
    $tM=[regex]::Match($attrs,'t="([^"]+)"')
    $t=if($tM.Success){$tM.Groups[1].Value}else{''}
    $valM=[regex]::Match($body,'<v>([^<]*)</v>')
    $val=if($valM.Success){$valM.Groups[1].Value}else{''}
    if($val -ne ''){ $h[$r]="$t|$val" }
  }
  return $h
}
$h1=Get-Cells $Sheet1
$h2=Get-Cells $Sheet2
$diff=@()
foreach($k in $h2.Keys){
  $v1=$h1[$k]
  $v2=$h2[$k]
  if($v1 -ne $v2){
    $parts=$v2 -split '\|'
    $t=$parts[0]
    $v=$parts[1]
    if($t -eq 's' -and $v -match '^\d+$'){
      $disp="[S]"+$sst[[int]$v]
    } else {
      $disp="[N]"+$v
    }
    $diff+=("$k = $disp  (sheet1: " + ($h1[$k] -replace '\|',':') + ")")
  }
}
$diff = $diff | Sort-Object
$diff | Out-File "$env:TEMP\user_data_cells.txt" -Encoding UTF8
$diff
