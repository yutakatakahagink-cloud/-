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
$cells=[regex]::Matches($xml,'<c\s+r="([^"]+)"([^>/]*)(?:/>|>(.*?)</c>)',[System.Text.RegularExpressions.RegexOptions]::Singleline)
$lines=@()
foreach($c in $cells){
  $r=$c.Groups[1].Value
  $attrs=$c.Groups[2].Value
  $body=$c.Groups[3].Value
  $tM=[regex]::Match($attrs,'t="([^"]+)"')
  $t=if($tM.Success){$tM.Groups[1].Value}else{''}
  $valM=[regex]::Match($body,'<v>([^<]*)</v>')
  $val=if($valM.Success){$valM.Groups[1].Value}else{''}
  $isM=[regex]::Match($body,'<is><t[^>]*>([^<]*)</t></is>')
  if($isM.Success){ $val=$isM.Groups[1].Value; $t='inlineStr' }
  $type='?'
  $disp=$val
  if($t -eq 's' -and $val -match '^\d+$'){ $disp="[label]"+$sst[[int]$val]; $type='S' }
  elseif($t -eq 'inlineStr'){ $disp="[str]"+$val; $type='I' }
  elseif($val -ne ''){ $disp="[num]"+$val; $type='N' }
  if($disp -ne $val -or $val -ne ''){ $lines+="$r ($type) = $disp" }
}
$lines | Out-File "$env:TEMP\sheet_cells2_$Sheet.txt" -Encoding UTF8
$lines | Select-Object -First 300
