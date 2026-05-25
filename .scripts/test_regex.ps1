# JSZip 内部の文字列置換ロジックと同じ正規表現で sheet1.xml を編集して検証
$sheet=Get-Content "$env:TEMP\xlsm_check2\out\xl\worksheets\sheet1.xml" -Raw -Encoding UTF8

function Set-CellNum($xml, $addr, $value){
  $pattern='<c\s+r="' + $addr + '"([^/>]*)\s*/>'
  if($xml -match $pattern){
    $attrs=$matches[1]
    $replacement='<c r="' + $addr + '"' + $attrs + '><v>' + $value + '</v></c>'
    return [regex]::Replace($xml, $pattern, $replacement)
  }
  return $xml
}
function Set-CellStr($xml, $addr, $value){
  $pattern='<c\s+r="' + $addr + '"([^/>]*)\s*/>'
  if($xml -match $pattern){
    $attrs=$matches[1]
    $replacement='<c r="' + $addr + '"' + $attrs + ' t="inlineStr"><is><t xml:space="preserve">' + $value + '</t></is></c>'
    return [regex]::Replace($xml, $pattern, $replacement)
  }
  return $xml
}

$tests=@(
  @{addr='K11'; type='n';  val='2026'},
  @{addr='P11'; type='n';  val='4'},
  @{addr='S11'; type='n';  val='16'},
  @{addr='W11'; type='s';  val='木'},
  @{addr='Y11'; type='n';  val='16'},
  @{addr='AB11'; type='n'; val='46'},
  @{addr='H9';  type='s';  val='テスト工事'},
  @{addr='H17'; type='s';  val='山田太郎'},
  @{addr='AI19'; type='s'; val='工具を運搬しているとき'},
  @{addr='BL47'; type='s'; val='対策テスト本文 & 改行ありのテスト'},
  @{addr='C55'; type='s';  val='段差'},
  @{addr='BR63'; type='s'; val='テスト責任者'}
)

$matched=0; $missed=0
foreach($t in $tests){
  $before=$sheet
  if($t.type -eq 'n'){ $sheet=Set-CellNum $sheet $t.addr $t.val }
  else { $sheet=Set-CellStr $sheet $t.addr $t.val }
  if($sheet -ne $before){
    Write-Host "OK  $($t.addr) ($($t.type)) replaced"
    $matched++
  } else {
    Write-Host "MISS $($t.addr) ($($t.type)) NOT replaced"
    $missed++
  }
}
Write-Host ""
Write-Host "Matched: $matched / Total: $($tests.Count) / Missed: $missed"

# 出力を抜粋表示
foreach($t in $tests){
  $m=[regex]::Match($sheet,'<c\s+r="' + $t.addr + '"[^>]*?(?:/>|>.*?</c>)',[System.Text.RegularExpressions.RegexOptions]::Singleline)
  if($m.Success){
    Write-Host ("  -> "+$t.addr+": "+($m.Value.Substring(0,[Math]::Min(140,$m.Value.Length))))
  }
}
