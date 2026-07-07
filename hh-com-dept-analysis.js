/**
 * 委員会シート：本部別 背景要因・職場環境の自動分析
 */
(function(global){
  var HONBU_LIST=['総務部','土木本部','建材本部'];
  var HONBU_COLOR={'総務部':'var(--bl)','土木本部':'var(--ac)','建材本部':'var(--yl)'};

  var ST_LABELS={
    workload:'仕事量過多',overtime:'時間不足',hardwork:'労働強度',fatigue:'疲労',exhausted:'消耗',
    sluggish:'倦怠',tense:'緊張',anxiety:'不安',restless:'焦り',depressed:'抑うつ',bothered:'意欲低下',
    gloomy:'気分不良',appetite:'食欲低下',sleep:'不眠'
  };
  var WE_LABELS={
    pace:'作業ペース',autonomy:'裁量・やり方',voice:'意見反映',boss_talk:'上司との対話',
    peer_talk:'同僚との対話',boss_help:'上司の支援',peer_help:'同僚の支援',boss_consult:'上司への相談',
    peer_consult:'同僚への相談',vigor:'活力',pride:'誇り',happiness:'充実感'
  };
  var ST_IMPROVE={
    workload:'工程管理と適正人員配置を見直し、ピーク時の負荷分散を図る。',
    overtime:'残業・時間外の把握と削減策を委員会議題に上げ、締切前の突発作業を減らす。',
    hardwork:'重作業の分担・機械化・交代制を検討し、連続した高強度作業を避ける。',
    fatigue:'定期休憩の徹底と、暑熱・長時間作業時の休息ルールを明確化する。',
    exhausted:'連続勤務日数の上限と休日確保ルールを整備し、消耗状態の申告を促す。',
    sluggish:'体調不良の早期申告と、無理な工程からの一時離脱を可能にする。',
    tense:'KY・始業前点検の時間確保と、心理的安全性を高める声掛けルールを定める。',
    anxiety:'不安要因のヒアリングと、メンタルヘルス相談窓口の周知を強化する。',
    restless:'工程余裕の確保と、急ぎ作業が常態化していないか点検する。',
    depressed:'産業医・上司との面談機会を設け、孤立しやすい配置を見直す。',
    bothered:'成功体験の共有・安全表彰など、モチベーション向上の仕組みを設ける。',
    gloomy:'休憩環境（照明・温度・清潔）と、定期的な1on1を改善する。',
    appetite:'食事・水分補給の時間確保と、栄養面の注意喚起を行う。',
    sleep:'勤務間インターバルと、夜間・早朝作業の調整を検討する。'
  };
  var WE_IMPROVE={
    pace:'工程計画に余裕を持たせ、現場が無理のないペースで動けるよう調整する。',
    autonomy:'標準手順を示しつつ、現場判断を尊重する運用ルールを明文化する。',
    voice:'朝礼・現場MTで意見を拾い上げ、反映結果をフィードバックする。',
    boss_talk:'現場巡回・短時間面談を増やし、上司と気軽に話せる機会を設ける。',
    peer_talk:'チーム内の声掛け・相互確認を習慣化し、孤立作業を減らす。',
    boss_help:'困りごと時の連絡先・判断基準を明示し、上司の支援体制を整える。',
    peer_help:'ベテランと若手のペアリングや、助け合いを促すルールを設ける。',
    boss_consult:'個人的な相談窓口（上司・安全担当）を周知し、利用しやすくする。',
    peer_consult:'同僚相談がしやすい雰囲気づくりと、匿名相談ルートの整備を検討する。',
    vigor:'休暇取得・休息の促進と、過密工程の見直しで活力を回復させる。',
    pride:'安全改善の成果共有や、良い報告事例の横展開で誇りを醸成する。',
    happiness:'無理のない目標設定と、達成体験が得られる工程管理を心がける。'
  };

  function esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function honbuOf(r){
    var p=(r&&r.dept)?String(r.dept).split('/'):[];
    return p[0]||'';
  }
  function hasStressData(r){
    var st=r.st||{},we=r.we||{};
    return Object.keys(st).some(function(k){return+st[k]>=1&&+st[k]<=4})||
      Object.keys(we).some(function(k){return+we[k]>=1&&+we[k]<=4});
  }
  function avgScores(reports,key){
    var sums={},counts={};
    reports.forEach(function(r){
      var o=r[key]||{};
      Object.keys(o).forEach(function(k){
        var v=+o[k];
        if(!(v>=1&&v<=4))return;
        sums[k]=(sums[k]||0)+v;
        counts[k]=(counts[k]||0)+1;
      });
    });
    var avgs={};
    Object.keys(sums).forEach(function(k){avgs[k]=sums[k]/counts[k];});
    return avgs;
  }
  function overallAvg(avgs){
    var v=Object.values(avgs);
    if(!v.length)return null;
    return v.reduce(function(a,b){return a+b;},0)/v.length;
  }
  function topEntries(avgs,n){
    return Object.entries(avgs).sort(function(a,b){return b[1]-a[1]}).slice(0,n||3);
  }
  function stressLevelText(avg){
    if(avg==null)return '背景要因データなし';
    if(avg>=2.6)return '背景要因が<strong style="color:var(--rd)">高い状態</strong>（疲労・負荷・不安が報告に反映）';
    if(avg>=2.2)return '背景要因が<strong style="color:var(--yl)">やや高め</strong>';
    return '背景要因は<strong style="color:var(--gn)">おおむね安定</strong>';
  }
  function workplaceLevelText(avg){
    if(avg==null)return '職場環境データなし';
    if(avg>=2.6)return '職場環境・支援面に<strong style="color:var(--rd)">課題が目立つ</strong>（満足度が低い項目が多い）';
    if(avg>=2.2)return '職場環境に<strong style="color:var(--yl)">改善の余地</strong>あり';
    return '職場環境・支援は<strong style="color:var(--gn)">比較的良好</strong>';
  }
  function analyzeHonbu(reports,name){
    var sub=reports.filter(function(r){return honbuOf(r)===name;});
    var withData=sub.filter(hasStressData);
    var stAv=avgScores(withData,'st');
    var weAv=avgScores(withData,'we');
    var stAll=overallAvg(stAv);
    var weAll=overallAvg(weAv);
    var hiRisk=sub.filter(function(r){return+r.l>=7}).length;
    var topSt=topEntries(stAv,3);
    var topWe=topEntries(weAv,3);
    var suggestions=[];
    topSt.forEach(function(e){if(ST_IMPROVE[e[0]])suggestions.push(ST_IMPROVE[e[0]]);});
    topWe.forEach(function(e){if(WE_IMPROVE[e[0]])suggestions.push(WE_IMPROVE[e[0]]);});
    suggestions=suggestions.filter(function(s,i,a){return a.indexOf(s)===i}).slice(0,5);
    if(!suggestions.length&&withData.length){
      suggestions.push('報告内容を踏まえ現場ヒアリングを行い、重点課題を特定してください。');
    }
    return {
      name:name,color:HONBU_COLOR[name]||'var(--t2)',
      total:sub.length,dataCount:withData.length,hiRisk:hiRisk,
      stAll:stAll,weAll:weAll,topSt:topSt,topWe:topWe,suggestions:suggestions
    };
  }
  function scoreBar(score,color){
    if(score==null)return '';
    var w=Math.max(4,Math.min(100,(score/4)*100));
    return '<div style="display:flex;gap:6px;align-items:center;margin:3px 0"><div class="crt" style="flex:1"><div class="crf" style="width:'+w+'%;background:'+color+'"></div></div><span class="crv" style="color:'+color+';min-width:28px">'+score.toFixed(1)+'</span></div>';
  }
  function buildDeptBlock(a,compact){
    if(!a.dataCount){
      if(compact){
        return '<div style="margin-bottom:8px;padding:8px 10px;border-left:3px solid '+a.color+';background:rgba(21,101,192,.04);border-radius:var(--rs)"><div style="font-size:12px;font-weight:700;color:'+a.color+'">'+esc(a.name)+'</div><div style="font-size:10px;color:var(--t3);margin-top:4px">報告'+a.total+'件（背景要因・職場環境データなし）</div></div>';
      }
      return '<div class="com-section"><strong style="color:'+a.color+'">'+esc(a.name)+'</strong><p style="font-size:12px;color:var(--t3)">該当期間の報告'+a.total+'件（背景要因・職場環境の入力データなし）</p></div>';
    }
    if(compact){
      return '<div style="margin-bottom:8px;padding:8px 10px;border-left:3px solid '+a.color+';background:rgba(21,101,192,.04);border-radius:var(--rs)"><div style="font-size:12px;font-weight:700;color:'+a.color+'">'+esc(a.name)+' <span style="font-weight:500;color:var(--t2)">（分析'+a.dataCount+'件）</span></div><div style="font-size:10px;color:var(--t2);margin-top:4px;line-height:1.55">'+stressLevelText(a.stAll).replace(/<\/?strong[^>]*>/g,'')+' ／ '+workplaceLevelText(a.weAll).replace(/<\/?strong[^>]*>/g,'')+'</div></div>';
    }
    var h='<div class="com-section" style="border-left:3px solid '+a.color+';padding-left:12px;margin-bottom:16px"><strong style="color:'+a.color+';font-size:14px">'+esc(a.name)+'</strong>';
    h+='<p style="font-size:11px;color:var(--t3);margin:6px 0 10px">報告'+a.total+'件（うち背景要因・職場環境データ '+a.dataCount+'件）・高レベル(Lv.7+) '+a.hiRisk+'件</p>';
    h+='<p style="font-size:12px;line-height:1.6;margin-bottom:8px"><b>現在の状態：</b>'+stressLevelText(a.stAll)+'。'+workplaceLevelText(a.weAll)+'。</p>';
    if(a.stAll!=null)h+='<div style="margin-bottom:6px"><span style="font-size:10px;color:var(--t3)">背景要因 平均</span>'+scoreBar(a.stAll,a.color)+'</div>';
    if(a.weAll!=null)h+='<div style="margin-bottom:10px"><span style="font-size:10px;color:var(--t3)">職場環境 平均</span>'+scoreBar(a.weAll,a.color)+'</div>';
    if(a.topSt.length){
      h+='<p style="font-size:11px;font-weight:600;margin:8px 0 4px">背景要因で目立つ項目（1に近いほど「そうだ」＝負荷大）</p><ul style="margin:0 0 8px 18px;font-size:11px;line-height:1.55;color:var(--t2)">';
      a.topSt.forEach(function(e){h+='<li>'+esc(ST_LABELS[e[0]]||e[0])+'（平均 '+e[1].toFixed(1)+'/4）</li>';});
      h+='</ul>';
    }
    if(a.topWe.length){
      h+='<p style="font-size:11px;font-weight:600;margin:8px 0 4px">職場環境で課題の項目（4に近いほど「ちがう」＝不満・不足）</p><ul style="margin:0 0 8px 18px;font-size:11px;line-height:1.55;color:var(--t2)">';
      a.topWe.forEach(function(e){h+='<li>'+esc(WE_LABELS[e[0]]||e[0])+'（平均 '+e[1].toFixed(1)+'/4）</li>';});
      h+='</ul>';
    }
    if(a.suggestions.length){
      h+='<p style="font-size:11px;font-weight:600;margin:8px 0 4px;color:var(--gn)">推奨する改善策</p><ul style="margin:0 0 0 18px;font-size:11px;line-height:1.6;color:var(--t2)">';
      a.suggestions.forEach(function(s){h+='<li>'+esc(s)+'</li>';});
      h+='</ul>';
    }
    h+='</div>';
    return h;
  }
  function buildComDeptAnalysisHtml(reports,compact){
    reports=reports||[];
    var analyses=HONBU_LIST.map(function(h){return analyzeHonbu(reports,h);});
    var anyData=analyses.some(function(a){return a.dataCount>0});
    if(!anyData){
      return '<p style="color:var(--t3);font-size:12px;padding:8px 0">背景要因・職場環境が入力されたヒヤリハット報告がありません。新形式の報告が蓄積されると自動分析されます。</p>';
    }
    var intro=compact
      ? '<p style="font-size:10px;color:var(--t3);margin-bottom:8px">新ヒヤリハットの背景要因・職場環境から自動分析（1=そうだ〜4=ちがう）</p>'
      : '<div class="com-section"><p style="font-size:12px;line-height:1.6;color:var(--t2);margin:0">ヒヤリハット報告の<strong>背後要因（あなたの状態）</strong>と<strong>仕事・職場環境</strong>を、総務部・土木本部・建材本部ごとに集計した自動分析です。スコアは1（そうだ）〜4（ちがう）。背景要因は高いほど負荷・症状が強く、職場環境は高いほど満足度が低い傾向を示します。</p></div>';
    return intro+analyses.map(function(a){return buildDeptBlock(a,!!compact);}).join('');
  }
  function renderComDeptAnalysis(reports,cardEl,fullEl){
    var card=buildComDeptAnalysisHtml(reports,true);
    var full=buildComDeptAnalysisHtml(reports,false);
    if(cardEl)cardEl.innerHTML=card;
    if(fullEl)fullEl.innerHTML='<div class="com-detail">'+full+'</div>';
  }
  global.renderComDeptAnalysis=renderComDeptAnalysis;
  global.buildComDeptAnalysisHtml=buildComDeptAnalysisHtml;
})(typeof window!=='undefined'?window:this);
