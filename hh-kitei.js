/**
 * 規定関連: 運営規程・安全担当資料のポップアップ表示
 */
(function(global){
  'use strict';

  var DOCS={
    unei:{
      title:'安全衛生委員会運営規程',
      html:
        '<p class="kt-note">（ドラフト）</p>'+
        '<h2>第1条（目的）</h2>'+
        '<p>本規程は、労働安全衛生法に基づく安全衛生委員会の運営について、労働者の危険及び健康障害を防止し、労働者が仕事しやすく災害のない環境を実現するため、必要な事項を定めることを目的とする。</p>'+
        '<h2>第2条（設置根拠）</h2>'+
        '<p>安全衛生委員会は、労働安全衛生法第18条に基づき設置する。</p>'+
        '<h2>第3条（委員会の目的）</h2>'+
        '<ol><li>労働者の危険及び健康障害を防止するための基本となるべき対策について、労働者の意見を反映させるよう十分な調査審議を行う。</li>'+
        '<li>労働災害の原因及び再発防止対策を協議し、職場の安全衛生水準の向上を図る。</li>'+
        '<li>委員会で決定した事項を各事業所の末端まで確実に伝達し、全労働者に周知する。</li>'+
        '<li>労働者からの安全衛生に関する要望を吸い上げ、改善につなげる。</li></ol>'+
        '<h2>第4条（委員の構成）</h2>'+
        '<h3>1. 常時参加者（法定委員）</h3>'+
        '<ul><li>安全管理者（議長）</li><li>衛生管理者</li><li>産業医</li>'+
        '<li>労働者代表（労働組合又は労働者の過半数を代表する者の推薦に基づき指名した者）</li></ul>'+
        '<h3>2. 追加参加者</h3>'+
        '<ul><li><b>各事業所の安全担当</b>：各事業所の管理責任者とする。必須参加。委員会の情報を各事業所に持ち帰り、末端まで伝達する役割を担う。</li>'+
        '<li><b>必要に応じた労働者</b>：特定議題（ヒヤリハット事例、設備改善、要望検討等）の当事者又は関係者を都度招へいする。</li></ul>'+
        '<h3>3. 委員の指名</h3>'+
        '<p>委員の指名は、事業者が行う。労働者代表の委員の半数については、労働者の過半数で組織する労働組合とする。</p>'+
        '<h2>第5条（開催）</h2>'+
        '<ol><li>委員会は、毎月1回以上開催する。</li>'+
        '<li>開催日時は、委員（特に各事業所安全担当及び産業医）の出席が可能な日時を選定する。</li>'+
        '<li>議長は、安全管理者が務める。議長は毎回出席し、方針及び施策を責任を持って決定する。</li></ol>'+
        '<h2>第6条（議題）</h2>'+
        '<p>委員会では、次に掲げる事項を調査審議する。</p>'+
        '<ol><li>労働者の危険を防止するための基本となるべき対策に関すること</li>'+
        '<li>労働者の健康障害を防止するための基本となるべき対策に関すること</li>'+
        '<li>労働者の健康の保持増進を図るための基本となるべき対策に関すること</li>'+
        '<li>労働災害の原因及び再発防止対策に関すること</li>'+
        '<li>安全パトロール時の指摘事項や参考事項の報告及び対策の検討</li>'+
        '<li>安全衛生管理システムに基づく協議（報告件数、発生原因分析、現場別ストレス傾向、高ストレス×高リスク一覧等）</li>'+
        '<li>労働者からの要望・相談の報告と検討</li>'+
        '<li>安全衛生に関する規程の作成に関すること</li>'+
        '<li>危険性又は有害性等の調査及びその結果に基づき講ずる措置に関すること</li>'+
        '<li>安全衛生に関する計画の作成、実施、評価及び改善に関すること</li>'+
        '<li>安全衛生教育の実施計画の作成に関すること</li>'+
        '<li>季節・時事に応じた議題（熱中症対策、冬季の転倒防止、法改正、業界動向等）</li>'+
        '<li>その他、労働者の安全衛生に関する重要事項</li></ol>'+
        '<h2>第7条（標準アジェンダ）</h2>'+
        '<p>毎月の委員会では、原則として次の構成で進行する。</p>'+
        '<div class="kt-table-wrap"><table class="kt-table"><thead><tr><th>順番</th><th>議題</th><th>所要時間</th></tr></thead><tbody>'+
        '<tr><td>1</td><td>前回議事録の確認</td><td>5分</td></tr>'+
        '<tr><td>2</td><td>安全パトロール時の指摘事項・参考事項の報告と検討</td><td>5〜10分</td></tr>'+
        '<tr><td>3</td><td>安全衛生管理システムに基づく協議</td><td>15〜20分</td></tr>'+
        '<tr><td>4</td><td>労働者からの要望・相談の報告と検討</td><td>10〜15分</td></tr>'+
        '<tr><td>5</td><td>法定調査審議事項</td><td>10〜15分</td></tr>'+
        '<tr><td>6</td><td>季節・時事に応じた議題</td><td>5〜10分</td></tr>'+
        '<tr><td>7</td><td>対策の進捗確認・次回までのアクション</td><td>5分</td></tr>'+
        '<tr><td>8</td><td>その他・閉会</td><td>5分</td></tr>'+
        '</tbody></table></div>'+
        '<h2>第8条（議事録の作成及び保管）</h2>'+
        '<ol><li>委員会の開催の都度、議事録を作成する。</li>'+
        '<li>議事録には、次を記録する（様式は「議事録様式」に準拠）。'+
        '<ul><li>開催日時と開催場所</li><li>出席者の氏名と役職（使用者側・労働者側を区別して記載）</li>'+
        '<li>報告事項（前回確認、安全パトロール時の指摘事項・参考事項、安全衛生管理システムに基づく協議、労働者からの要望・相談、法定事項、季節・時事の議題 等）</li>'+
        '<li>委員会の意見、講じた措置の内容及び議事で重要なものに係る事項</li></ul></li>'+
        '<li>議事録は3年間保管する。</li>'+
        '<li>労働基準監督署等の調査時には、3年分の議事録の提出を求められる場合がある。</li></ol>'+
        '<h2>第9条（労働者への周知）</h2>'+
        '<ol><li>委員会の開催の都度、議事の概要を労働者に遅滞なく周知する。</li>'+
        '<li>周知は、次により行う。'+
        '<ul><li>各事業所安全担当に対し、議事録（又は議事録の要約）を交付する。</li>'+
        '<li>各事業所の掲示板に議事録を掲示する。</li>'+
        '<li>各事業所安全担当が、朝礼又は週次ミーティング等で要点を口頭説明する。</li></ul></li>'+
        '<li>各事業所安全担当は、次回委員会において、伝達状況（掲示日、実施した朝礼・ミーティングの日等）を簡潔に報告する。</li></ol>'+
        '<h2>第10条（安全衛生管理システムの活用）</h2>'+
        '<ol><li>委員会における協議は、安全衛生管理システム（委員会ページ）を基に行う。</li>'+
        '<li>会議前に、管理者が委員会ページを開き、当月・累計のサマリを確認する。</li>'+
        '<li>会議中は、プロジェクター等で画面を共有し、発生原因の分析、現場別ストレス傾向、高ストレス×高リスク一覧等を協議する。</li>'+
        '<li>会議後は、決定した対策をシステムの対策進捗に反映し、次回委員会でフォローする。</li></ol>'+
        '<h2>第11条（運営の評価）</h2>'+
        '<ol><li>委員会の運営は、年間計画に基づき実施する。</li>'+
        '<li>年1回、委員会の運営状況、目標達成度等を評価し、必要に応じて改善する。</li></ol>'+
        '<h2>附則</h2>'+
        '<p>本規程は、〇〇年〇〇月〇〇日から施行する。</p>'
    },
    tanto:{
      title:'各営業所安全担当 役割・教育資料',
      html:
        '<h2>1. 安全担当とは</h2>'+
        '<p>安全担当は<b>各事業所の管理責任者</b>とする。</p>'+
        '<p>各事業所の管理責任者である安全担当は、<b>安全衛生委員会と現場（末端労働者）をつなぐ重要な役割</b>を担います。</p>'+
        '<p>委員会で協議された内容を各事業所に持ち帰り、すべての労働者に確実に伝達することで、災害防止と労働者の働きやすい環境づくりに貢献します。</p>'+
        '<h2>2. 安全担当の3つの役割</h2>'+
        '<h3>役割① 委員会への参加（必須）</h3>'+
        '<ul><li>安全衛生委員会に<b>毎回必ず参加</b>してください。</li>'+
        '<li>やむを得ず欠席する場合は、代理者を立てるか、事前に安全管理に連絡してください。</li>'+
        '<li>委員会の開催日時は、安全担当の出席が可能な日時に調整されています。</li></ul>'+
        '<h3>役割② 現場の声を委員会へ届ける</h3>'+
        '<p class="kt-sub">委員会前にやること</p>'+
        '<ul><li>自事業所で発生したヒヤリハットの傾向を把握する</li>'+
        '<li>労働者から聞いた要望があれば、安全衛生管理システムでの入力を案内する（入力が難しい場合はメモして委員会で報告する）</li>'+
        '<li>委員会で報告する内容を整理する</li></ul>'+
        '<p class="kt-sub">委員会でやること</p>'+
        '<ul><li>自事業所の状況を発言する（ヒヤリハットの傾向、要望の内容等）</li>'+
        '<li>他事業所の事例を共有し、自事業所での参考にする</li></ul>'+
        '<h3>役割③ 委員会の内容を末端へ伝達する</h3>'+
        '<p class="kt-sub">委員会後にやること</p>'+
        '<ol><li>議事録を受け取る</li>'+
        '<li>自事業所の掲示板に議事録を掲示する（法定の「労働者への周知」を満たす）</li>'+
        '<li>朝礼または週次ミーティングで要点を口頭説明する</li>'+
        '<li>労働者からの質問や追加要望があれば、次回委員会で報告する（要望は安全衛生管理システムでの入力を案内する）</li></ol>'+
        '<h2>3. 情報伝達の流れ（チェックリスト）</h2>'+
        '<h3>委員会前</h3>'+
        '<ul><li>自事業所のヒヤリハット状況を確認した</li>'+
        '<li>労働者から聞いた要望があれば、安全衛生管理システムでの入力を案内した（又はメモした）</li>'+
        '<li>委員会で報告する内容を整理した</li></ul>'+
        '<h3>委員会中</h3>'+
        '<ul><li>自事業所の状況を発言した</li><li>議事録を受け取った</li><li>不明点があれば質問した</li></ul>'+
        '<h3>委員会後（1週間以内に実施）</h3>'+
        '<ul><li>掲示板に議事録を掲示した</li><li>朝礼またはミーティングで口頭説明した</li>'+
        '<li>伝達実施日を記録した（次回委員会で報告するため）</li></ul>'+
        '<h3>次回委員会</h3>'+
        '<ul><li>伝達実施状況を報告した（例：「〇〇事業所では〇月〇日に朝礼で共有済み」）</li></ul>'+
        '<h2>4. 伝達のポイント</h2>'+
        '<h3>掲示するとき</h3>'+
        '<ul><li>見やすい場所（休憩室、更衣室、事務所入口等）に掲示する</li>'+
        '<li>掲示期間は少なくとも1ヶ月間</li><li>汚れや破損があれば張り替える</li></ul>'+
        '<h3>口頭説明するとき</h3>'+
        '<ul><li>1〜3分程度で要点を説明する</li><li>特に重要な決定事項や対策は強調する</li>'+
        '<li>「何か質問はありますか？」と声をかける</li>'+
        '<li>質問や要望があれば、メモして次回委員会で報告する</li></ul>'+
        '<h3>報告するとき</h3>'+
        '<ul><li>事実を簡潔に伝える</li>'+
        '<li>「〇〇という要望がありました」「〇〇の傾向が目立ちました」など、具体的に</li></ul>'+
        '<h2>5. よくある質問</h2>'+
        '<div class="kt-qa"><b>Q. 委員会を欠席する場合は？</b><p>A. 代理者を立てるか、事前に安全管理室に連絡してください。議事概要は後日共有しますが、可能な限り出席してください。</p></div>'+
        '<div class="kt-qa"><b>Q. 労働者から要望を聞いたが、委員会まで待てない場合は？</b><p>A. 緊急を要する内容は、安全管理室または上司にすぐ連絡してください。委員会では定期的な要望の報告・検討を行います。</p></div>'+
        '<div class="kt-qa"><b>Q. ヒヤリハット報告が少ない事業所では何を報告すればよい？</b><p>A. 報告件数が少ない理由（報告の仕組みの課題、現場の雰囲気等）や、労働者から聞いた安全に関する声を報告してください。</p></div>'+
        '<div class="kt-qa"><b>Q. 議事録を紛失した場合は？</b><p>A. 安全管理室に連絡し、再発行を依頼してください。</p></div>'+
        '<div class="kt-qa"><b>Q. 労働者から要望を聞いた場合は？</b><p>A. 安全衛生管理システムの自由記述欄に入力してもらうよう案内してください。緊急の場合は委員会で口頭報告も可です。</p></div>'+
        '<h2>6. 連絡先</h2>'+
        '<ul><li>安全管理室：（連絡先を記載）</li><li>安全衛生委員会担当：（連絡先を記載）</li></ul>'+
        '<p class="kt-foot"><b>安全担当の皆様の積極的なご協力をお願いいたします。</b><br>'+
        '委員会で決まったことを末端まで届けることで、災害のない働きやすい職場づくりに貢献しています。</p>'
    }
  };

  var STYLE=
    '#kiteiModal{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;'+
    'background:rgba(15,20,25,.55);backdrop-filter:blur(3px);padding:12px;box-sizing:border-box}'+
    '#kiteiModal.show{display:flex}'+
    '#kiteiModal .kt-panel{background:#fff;border-radius:14px;width:100%;max-width:720px;max-height:min(88vh,900px);'+
    'display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.28);overflow:hidden}'+
    '#kiteiModal .kt-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #E2E8F0;'+
    'background:linear-gradient(180deg,#F8FAFC,#fff);flex-shrink:0}'+
    '#kiteiModal .kt-title{flex:1;font-size:15px;font-weight:700;color:#1E293B;line-height:1.35}'+
    '#kiteiModal .kt-close{border:none;background:#F1F5F9;color:#475569;width:36px;height:36px;border-radius:10px;'+
    'font-size:18px;cursor:pointer;line-height:1;flex-shrink:0}'+
    '#kiteiModal .kt-close:hover{background:#E2E8F0;color:#1E293B}'+
    '#kiteiModal .kt-body{padding:16px 18px 28px;overflow-y:auto;-webkit-overflow-scrolling:touch;font-size:13px;'+
    'line-height:1.7;color:#334155}'+
    '#kiteiModal .kt-body h2{font-size:14px;font-weight:700;color:#1E293B;margin:18px 0 8px;padding-bottom:4px;'+
    'border-bottom:1px solid #E2E8F0}'+
    '#kiteiModal .kt-body h2:first-child{margin-top:0}'+
    '#kiteiModal .kt-body h3{font-size:13px;font-weight:700;color:#2563EB;margin:14px 0 6px}'+
    '#kiteiModal .kt-body p{margin:0 0 10px}'+
    '#kiteiModal .kt-body ol,#kiteiModal .kt-body ul{margin:0 0 10px;padding-left:1.35em}'+
    '#kiteiModal .kt-body li{margin:3px 0}'+
    '#kiteiModal .kt-note{font-size:11px;color:#94A3B8;margin:0 0 8px}'+
    '#kiteiModal .kt-sub{font-weight:700;color:#475569;margin:8px 0 4px!important}'+
    '#kiteiModal .kt-qa{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:10px 12px;margin:0 0 8px}'+
    '#kiteiModal .kt-qa p{margin:6px 0 0;color:#475569}'+
    '#kiteiModal .kt-foot{margin-top:16px;padding:12px;background:rgba(37,99,235,.06);border-radius:10px;'+
    'color:#1E293B;line-height:1.6}'+
    '#kiteiModal .kt-table-wrap{overflow-x:auto;margin:0 0 12px}'+
    '#kiteiModal .kt-table{width:100%;border-collapse:collapse;font-size:12px}'+
    '#kiteiModal .kt-table th,#kiteiModal .kt-table td{border:1px solid #E2E8F0;padding:8px 10px;text-align:left}'+
    '#kiteiModal .kt-table th{background:#F1F5F9;font-weight:700;color:#1E293B;white-space:nowrap}'+
    '@media(max-width:767px){#kiteiModal{padding:0;align-items:stretch}'+
    '#kiteiModal .kt-panel{max-width:none;max-height:none;height:100%;border-radius:0}'+
    '#kiteiModal .kt-title{font-size:14px}}';

  function ensureModal(){
    if(document.getElementById('kiteiModal'))return;
    if(!document.getElementById('kiteiModalStyle')){
      var st=document.createElement('style');
      st.id='kiteiModalStyle';
      st.textContent=STYLE;
      document.head.appendChild(st);
    }
    var el=document.createElement('div');
    el.id='kiteiModal';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.innerHTML=
      '<div class="kt-panel" onclick="event.stopPropagation()">'+
        '<div class="kt-head">'+
          '<div class="kt-title" id="kiteiModalTitle"></div>'+
          '<button type="button" class="kt-close" aria-label="閉じる" onclick="closeKiteiDoc()">×</button>'+
        '</div>'+
        '<div class="kt-body" id="kiteiModalBody"></div>'+
      '</div>';
    el.addEventListener('click',function(e){
      if(e.target===el)closeKiteiDoc();
    });
    document.body.appendChild(el);
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&el.classList.contains('show'))closeKiteiDoc();
    });
  }

  global.openKiteiDoc=function(id){
    var doc=DOCS[id];
    if(!doc)return;
    ensureModal();
    var modal=document.getElementById('kiteiModal');
    var title=document.getElementById('kiteiModalTitle');
    var body=document.getElementById('kiteiModalBody');
    if(title)title.textContent=doc.title;
    if(body){body.innerHTML=doc.html;body.scrollTop=0}
    modal.classList.add('show');
    document.body.style.overflow='hidden';
  };

  global.closeKiteiDoc=function(){
    var modal=document.getElementById('kiteiModal');
    if(modal)modal.classList.remove('show');
    document.body.style.overflow='';
  };
})(typeof window!=='undefined'?window:this);
