/**
 * 分析シート：ストレス要因・職場環境分析（全国平均比較）
 */
(function(global){
  var STRESS_GROUPS=[
    {n:'仕事の要求度',k:['workload','overtime','hardwork'],na:6.69,c:'var(--rd)'},
    {n:'疲労感',k:['fatigue','exhausted','sluggish'],na:8.54,c:'var(--ac)'},
    {n:'不安感',k:['tense','anxiety','restless'],na:9.06,c:'var(--yl)'},
    {n:'抑うつ感',k:['depressed','bothered','gloomy'],na:9.50,c:'var(--pr)'},
    {n:'身体愁訴',k:['appetite','sleep'],na:9.96,c:'var(--bl)'}
  ];
  var WORK_GROUPS=[
    {n:'仕事のコントロール',k:['pace','autonomy','voice'],na:8.04,c:'var(--gn)'},
    {n:'上司の支援',k:['boss_talk','boss_help','boss_consult'],na:8.60,c:'var(--bl)'},
    {n:'同僚の支援',k:['peer_talk','peer_help','peer_consult'],na:8.72,c:'var(--pr)'},
    {n:'ワーク・エンゲイジメント',k:['vigor','pride','happiness'],na:7.02,c:'var(--yl)'}
  ];
  function avgField(reports,keys,field){
    if(!reports.length)return 0;
    var s=0,ct=0;
    reports.forEach(function(r){
      var d=field==='st'?(r.st||{}):(r.we||{});
      keys.forEach(function(k){s+=(d[k]||0);ct++});
    });
    return ct?(s/ct):0;
  }
  function toScale(v){return(v/4)*12;}
  function renderGroups(groups,field,reports){
    var h='';
    groups.forEach(function(g){
      var sc=toScale(avgField(reports,g.k,field));
      h+='<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:600;color:'+g.c+';margin-bottom:3px">'+g.n+'</div>';
      h+='<div style="display:flex;align-items:center;gap:5px;margin-bottom:2px"><span style="width:36px;font-size:9px;color:var(--t3)">現場</span><div class="crt"><div class="crf" style="width:'+(sc/12)*100+'%;background:'+g.c+'"></div></div><span class="crv" style="color:'+g.c+'">'+sc.toFixed(1)+'</span></div>';
      h+='<div style="display:flex;align-items:center;gap:5px"><span style="width:36px;font-size:9px;color:var(--t3)">全国</span><div class="crt"><div class="crf" style="width:'+(g.na/12)*100+'%;background:'+g.c+';opacity:.3"></div></div><span class="crv" style="color:var(--t3)">'+g.na.toFixed(1)+'</span></div></div>';
    });
    return h;
  }
  function buildAnlStressWorkplaceHtml(reports,opts){
    opts=opts||{};
    reports=reports||[];
    var lock=opts.showLock?' 🔒':'';
    var h='';
    h+='<div class="cb"><div class="cht"><span class="chd" style="background:var(--ac)"></span>ストレス要因分析（全国平均比較）'+lock+'</div>';
    h+='<p style="font-size:10px;color:var(--t3);margin-bottom:12px">あなたの状態（1=そうだ〜4=ちがう）・上=現場平均 下=全国平均（建災防R2年調査換算値）</p>';
    h+=renderGroups(STRESS_GROUPS,'st',reports);
    h+='<div class="guide-box"><b>📊 活用法：</b>現場平均が全国より<b>低い（1に近い）</b>項目は、疲労・負荷・不安が報告に反映されている可能性があります。要求度・疲労感・不安感を委員会で優先議論してください。</div></div>';
    h+='<div class="cb"><div class="cht"><span class="chd" style="background:var(--gn)"></span>職場環境分析（全国平均比較）'+lock+'</div>';
    h+='<p style="font-size:10px;color:var(--t3);margin-bottom:12px">仕事・職場環境（1=そうだ〜4=ちがう）・上=現場平均 下=全国平均（建災防R2年調査換算値）</p>';
    h+=renderGroups(WORK_GROUPS,'we',reports);
    h+='<div class="guide-box"><b>📊 活用法：</b>現場平均が全国より<b>低い</b>項目（4=ちがうに近いほど不満・不足）は、職場支援や満足度の課題です。<b>上司の支援</b>・同僚の支援・仕事のコントロールが低い場合、現場責任者のマネジメント改善や声掛けルールの見直しを検討してください。</div></div>';
    return h;
  }
  global.buildAnlStressWorkplaceHtml=buildAnlStressWorkplaceHtml;
})(typeof window!=='undefined'?window:this);
