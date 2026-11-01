(function(){
 'use strict';const E=Shore,$=id=>document.getElementById(id),KEY='shore-android-v3';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>'¥'+(n/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}),signed=n=>(n>0?'+':n<0?'−':'')+money(Math.abs(n));
 const native=typeof ShoreNative!=='undefined';let S=E.blank(),storageOK=true,loadError='',undo=null,F={},page='home',calView='plan',transfer='',toastTimer;const drafts={},scrollPositions={};
 try{const raw=native?ShoreNative.loadState():localStorage.getItem(KEY);if(raw)S=E.validate(JSON.parse(raw));}catch(e){storageOK=false;loadError='原账本读取失败，已保留原数据。请先导出恢复，不会自动覆盖。';}
 let canWrite=!loadError;
 function persist(){if(!canWrite)return false;try{const text=JSON.stringify(S);if(new TextEncoder().encode(text).length>2000000)throw Error('账本超过 2 MB');if(native){if(!ShoreNative.saveState(text))throw Error('写入失败');}else localStorage.setItem(KEY,text);storageOK=true;return true;}catch(e){storageOK=false;toast('保存失败，请先备份当前账本');return false;}}
 function toast(t){clearTimeout(toastTimer);$('toast').innerHTML='<div>'+esc(t)+'</div>';toastTimer=setTimeout(()=>$('toast').innerHTML='',5500);}
 function confirm(title,body,fn){const d=$('confirm');$('confirmBody').innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(body)+'</p><div class="actions"><button class="btn" id="cancelConfirm">取消</button><button class="btn primary" id="acceptConfirm">确认</button></div>';d.showModal();$('cancelConfirm').onclick=()=>d.close();$('acceptConfirm').onclick=()=>{d.close();fn();};}
 function commit(next,message){if(!canWrite){toast(loadError);return false;}const old=S;undo=E.copy(S);S=next;if(!persist()){S=old;undo=null;return false;}toast(message);return true;}
 const btn=(t,a,c='')=>'<button type="button" class="btn '+c+'" data-action="'+a+'">'+t+'</button>';
 const goBtn=(t,p,c='')=>'<button type="button" class="btn '+c+'" data-go="'+p+'">'+t+'</button>';
 const row=(l,v,c='')=>'<div class="row"><span>'+l+'</span><strong class="'+c+'">'+v+'</strong></div>';
 const heading=(t,s='',a='')=>'<div class="heading"><h1>'+t+'</h1>'+(a?'<div class="actions">'+a+'</div>':'')+'</div>';
 const options=(xs,v)=>xs.map(x=>{const a=Array.isArray(x)?x:[x,x];return '<option value="'+esc(a[0])+'" '+(String(v)===String(a[0])?'selected':'')+'>'+esc(a[1])+'</option>';}).join('');
 const input=(label,key,val,attrs='',type='number')=>'<label class="field">'+label+'<input type="'+type+'" data-f="'+key+'" value="'+esc(val)+'" '+(type==='number'?'inputmode="decimal" enterkeyhint="next" ':'')+attrs+'></label>';
 const select=(label,key,xs,v)=>'<label class="field">'+label+'<select data-f="'+key+'">'+options(xs,v)+'</select></label>';
 const platforms=['借呗','花呗','京东金条','京东白条','分期乐','马上金融','美团借钱','美团月付','抖音借钱','抖音月付','信用卡','其他'];
 const active=()=>S.loans.filter(l=>l.p+l.i+l.f>0);
 function chart(f,c){const max=Math.max(1,E.principal(S)),n=Math.max(1,f.rows.length,c.rows.length);const points=rs=>[[40,18],...rs.map((r,i)=>[40+(i+1)*330/n,18+125*(1-r.left/max)])];const path=ps=>'M'+ps.map(p=>p.join(',')).join(' L');return '<svg viewBox="0 0 400 185" class="chart" role="img" aria-label="按计划与按合同的剩余本金预测">'+[0,1,2].map(i=>'<line x1="40" x2="370" y1="'+(18+i*62.5)+'" y2="'+(18+i*62.5)+'"/><text x="0" y="'+(22+i*62.5)+'">'+(max/1000000*(1-i/2)).toFixed(1)+'万</text>').join('')+'<path d="'+path(points(c.rows))+'" fill="none" stroke="#b9bdca" stroke-width="1.7" stroke-dasharray="4 5"/><path d="'+path(points(f.rows))+'" fill="none" stroke="#6853cc" stroke-width="2.8" stroke-linejoin="round"/><text x="40" y="174">'+E.month(S)+'</text><text x="370" y="174" text-anchor="end">'+E.month(S,n-1)+'</text></svg><div class="legend"><span><b></b>按我的计划</span><span><b class="gray"></b>仅按合同</span></div>';}

function home() {
  const f = E.project(S), c = E.project(S, true), m = f.rows[0] || { scheduled: 0, gap: 0 };
  const ev = S.events.filter(e => e.date.startsWith(S.asOf.slice(0, 7)));
  return heading('总览', '', goBtn('＋ 新增借款', 'borrow') + goBtn('记还款', 'repay', 'primary')) +
    '<div class="page-meta">' + E.month(S) + (S.mode === 'demo' ? '<span class="tag purple">演示</span>' : '') + '</div>' +
    '<div class="kpis"><section class="panel hero"><span class="label">平台债务</span><div class="num big">' + money(E.total(S)) + '</div>' +
    row('剩余本金', money(E.principal(S))) + row('已出账息费', money(E.total(S) - E.principal(S))) +
    '</section><section class="panel"><span class="label">本月待还</span><div class="num">' + money(m.scheduled) + '</div><button class="link" data-go="calendar">明细 →</button></section>' +
    '<section class="panel"><span class="label">预计平台结清</span><div class="num date">' + E.end(S, f) + '</div><button class="link" data-go="plan">调整计划 →</button></section></div>' +
    (loadError ? '<div class="callout">' + esc(loadError) + '</div>' : '') +
    (m.gap ? '<div class="callout">本月资金缺口 ' + money(m.gap) + '</div>' : '') +
    '<div class="cols"><section class="panel"><div class="sectionhead"><h2>债务趋势</h2><span class="tag purple">本金</span></div>' + chart(f, c) + '</section>' +
    '<section class="panel"><div class="sectionhead"><h2>本月资金</h2><button class="link" data-go="plan">调整</button></div>' +
    row('预计收入', money(S.income)) + row('开支与预留', money(S.living + S.reserve)) + row('还款预算', money(S.budget)) + row('实际可用收入', money(S.cash)) + '</section></div>' +
    '<section class="panel"><div class="sectionhead"><h2>本月待还</h2><button class="link" data-go="loans">全部 →</button></div>' +
    (active().length ? active().map(l => '<div class="row"><div class="account"><span class="mark">' + esc(l.name[0]) + '</span><div>' + esc(l.name) +
      '<div class="note">每月 ' + l.day + ' 日</div></div></div><div class="right"><strong>' + money(l.currentP + l.i + l.f) + '</strong><br><button class="link" data-repay="' + l.id + '">记还款</button></div></div>').join('') :
      '<div class="empty"><strong>暂无借款</strong>' + goBtn('录入已有借款', 'borrow', 'soft') + '</div>') + '</section>' +
    '<div class="twocols"><section class="panel"><h2>本月记录</h2>' + row('已还款', money(E.sum(ev.filter(e => e.type === 'repay'), e => e.amount))) +
    row('新借入', money(E.sum(ev, e => e.borrowed || 0))) + row('平台债务变化', signed(E.sum(ev, e => e.formalDelta))) + '</section>' +
    '<section class="panel"><div class="sectionhead"><h2>全部债务</h2><button class="link" data-go="friends">人情账本 →</button></div>' +
    row('人情债', money(E.human(S))) + row('合计', money(E.total(S) + E.human(S))) + '</section></div>';
}

function loans() {
  return heading('借款账本', '', goBtn('＋ 新增借款', 'borrow', 'primary')) +
    '<div class="cards">' + active().map(l => '<section class="panel"><div class="sectionhead"><div class="account"><span class="mark">' + esc(l.name[0]) +
      '</span><h2>' + esc(l.name) + '</h2></div><span class="tag">' + E.modes[l.mode] + '</span></div>' +
      '<div class="mini"><div><span class="label">剩余本金</span><strong>' + money(l.p) + '</strong></div><div><span class="label">本月待还</span><strong>' + money(l.currentP + l.i + l.f) + '</strong></div></div>' +
      '<div class="note">' + (l.mode === 'flat' ? '每期费用 ' + money(l.flat) : '年利率 ' + l.rate + '%') + ' · ' + l.n + ' 期 · 每月 ' + l.day + ' 日</div>' +
      (l.available ? '<div class="note green">可用借入资金 ' + money(l.available) + '</div>' : '') +
      '<div class="cardfoot"><span class="tag">' + (l.early ? '可提前还本' : '按期还款') + '</span><button class="btn soft" data-repay="' + l.id + '">记还款</button></div></section>').join('') + '</div>' +
    (active().length ? '' : '<section class="panel empty">暂无借款</section>') +
    '<section class="panel"><h2>快速建档</h2><div class="actions">' + platforms.map(p => '<button class="btn" data-platform="' + p + '">' + p + '</button>').join('') + '</div></section>';
}

function calendar() {
  const f = E.project(S, calView === 'contract');
  return heading('月度还款') + '<div class="sectionhead"><div class="switcher"><button data-cal="plan" class="' + (calView === 'plan' ? 'active' : '') + '">按计划</button>' +
    '<button data-cal="contract" class="' + (calView === 'contract' ? 'active' : '') + '">按合同</button></div><span class="label">息费 ' + money(f.cost) + '</span></div>' +
    (f.gap ? '<div class="callout">部分月份有资金缺口</div>' : '') +
    (f.rows.length ? f.rows.map((m, i) => '<details class="month" ' + (!i ? 'open' : '') + '><summary><div><strong>' + E.month(S, i) + '</strong><div class="note">本金 ' + money(m.p) +
      ' · 息费 ' + money(m.i + m.f) + '</div></div><div class="right"><strong>' + money(m.pay) + '</strong><div class="note">' + (m.gap ? '缺口 ' + money(m.gap) : '剩余本金 ' + money(m.left)) +
      ' ⌄</div></div></summary><div class="monthbody"><div class="scroll"><table><thead><tr><th>日期 / 账户</th><th>本金</th><th>息费</th><th>合计</th></tr></thead><tbody>' +
      m.details.map(d => '<tr><td>' + E.date(S, i, d.day).slice(5) + '<br>' + esc(d.name) + (d.extra ? '<div class="note">追加 ' + money(d.extra) + '</div>' : '') + '</td><td>' + money(d.p) +
        '</td><td>' + money(d.i + d.f) + '</td><td>' + money(d.pay) + '</td></tr>').join('') + '</tbody></table></div></div></details>').join('') : '<section class="panel empty">暂无平台待还</section>');
}

function plan() {
  return heading('还款计划') + '<div class="cols"><section class="panel"><div class="formgrid">' +
    ['income', 'living', 'reserve', 'budget'].map((k, i) => '<label class="field">' + ['月收入（元）', '生活开支（元）', '每月预留（元）', '每月还款（元）'][i] +
      '<input data-plan="' + k + '" type="number" inputmode="decimal" enterkeyhint="next" min="0" step="100" value="' + S[k] / 100 + '"></label>').join('') +
    '</div><div id="planAlerts"></div></section><section class="panel" id="planSummary" aria-live="polite"></section></div>' +
    '<section class="panel"><h2>实际资金</h2>' + row('可用收入', money(S.cash)) + row('本月已用计划额度', money(S.used)) +
    '<div class="actions" style="margin-top:16px">' + goBtn('记录收入', 'income') + goBtn('记还款', 'repay', 'primary') + '</div></section>';
}

function updatePlan() {
  if (!$('planSummary')) return;
  const f = E.project(S), available = S.income - S.living - S.reserve;
  $('planSummary').innerHTML = '<h2>还款预测</h2>' + row('每月可安排', money(Math.max(0, available))) + row('预计平台结清', E.end(S, f)) +
    row('预计息费', money(f.cost)) + row('人情债', money(E.human(S)));
  $('planAlerts').innerHTML = (S.budget > available ? '<div class="callout" style="margin-top:16px">预算超出可安排收入 ' + money(S.budget - available) + '</div>' : '') +
    (f.gap ? '<div class="callout" style="margin-top:16px">合同应还超出预算</div>' : '');
}

function friends() {
  return heading('人情账本', '', goBtn('＋ 记录支持', 'support', 'primary')) +
    '<section class="panel hero"><span class="label">待归还</span><div class="num big">' + money(E.human(S)) + '</div></section>' +
    '<section class="panel">' + (S.friends.length ? S.friends.map(f => '<div class="row"><div><strong>' + esc(f.name) + '</strong>' +
      (f.due ? '<div class="note">约定 ' + esc(f.due) + '</div>' : '') + (f.available ? '<div class="note green">可用 ' + money(f.available) + '</div>' : '') +
      '</div><div class="right"><strong>' + money(f.amount - f.paid) + '</strong><br>' + (f.amount > f.paid ? '<button class="link" data-human="' + f.id + '">记录归还</button>' :
        '<span class="tag green">已归还</span>') + '</div></div>').join('') : '<div class="empty">暂无记录</div>') + '</section>';
}

function history() {
  return heading('收支记录', '', undo ? btn('撤销最近操作', 'undo') : goBtn('记录收入', 'income', 'primary')) +
    '<section class="panel">' + (S.events.length ? '<div class="timeline">' + S.events.slice().reverse().map(e => '<div class="event"><div class="row"><strong>' + esc(e.label) +
      '</strong><strong>' + money(e.amount) + '</strong></div><div class="note">' + esc(e.date) + '</div><div class="note">平台 ' + signed(e.formalDelta) + ' · 人情 ' +
      signed(e.humanDelta) + '</div></div>').join('') + '</div>' : '<div class="empty">暂无记录</div>') + '</section>';
}

function borrowForm() {
  return heading('记录借款') + '<div class="cols"><section class="panel"><div class="formgrid">' +
    select('借款类型', 'kind', [['existing', '已有借款'], ['new', '本次新借入']], F.kind) + select('平台', 'platform', platforms, F.platform) +
    input('待还本金（元）', 'amount', F.amount, 'min="0.01" step="100"') + input('剩余期数（月）', 'months', F.months, 'min="1" max="120" step="1"') +
    select('计费方式', 'mode', Object.entries(E.modes), F.mode) + input('每月还款日', 'day', F.day, 'min="1" max="31" step="1"') +
    (F.mode === 'flat' ? input('每期费用（元）', 'flat', F.flat, 'min="0" step="1"') : input('年利率（%）', 'rate', F.rate, 'min="0" max="100" step="0.1"')) +
    (F.kind === 'existing' ? input('已出账利息（元）', 'interest', F.interest, 'min="0" step="0.01"') + input('已出账费用（元）', 'fee', F.fee, 'min="0" step="0.01"') : '') +
    (F.mode !== 'flat' ? '<label class="field check full"><input data-f="early" type="checkbox" ' + (F.early ? 'checked' : '') + '>允许提前还本（无额外费用）</label>' : '') +
    '</div></section><section class="panel"><h2>借款试算</h2><div id="borrowPreview" aria-live="polite"></div></section></div><div class="formfoot">' +
    goBtn('取消', 'loans') + '<button type="button" class="btn primary" id="submitAction" data-action="saveBorrow" disabled>确认记录</button></div>';
}

function setSubmit(enabled) { const el = $('submitAction'); if (el) el.disabled = !enabled; }

function updateBorrow() {
  if (!$('borrowPreview')) return;
  if (F.amount === '' || F.amount == null) { $('borrowPreview').innerHTML = row('本次金额', '—'); setSubmit(false); return; }
  try {
    const l = E.makeLoan(F), next = E.copy(S); next.loans.push(l);
    const f = E.project({ ...E.copy(S), loans: [l], used: 0 }, true), first = f.rows.find(r => r.pay);
    $('borrowPreview').innerHTML = '<div class="preview"><span class="label">' + (F.kind === 'new' ? '新增债务' : '已有债务') + '</span><div class="num purpletext">+' + money(l.p + l.i + l.f) + '</div>' +
      row('记录后平台债务', money(E.total(next))) + row('预计息费', money(f.cost)) + row('首期应还', money(first ? first.pay : 0)) +
      row('预计结清变化', E.timeChange(S, E.project(S), E.project(next))) + '</div>';
    setSubmit(true);
  } catch (e) { $('borrowPreview').innerHTML = '<p class="error" role="alert">' + esc(e.message) + '</p>'; setSubmit(false); }
}

function repayForm() {
  if (!active().length) return heading('暂无平台待还', '', goBtn('录入借款', 'borrow', 'primary'));
  const funds = F.source === 'loan' ? S.loans.filter(l => l.available > 0 && l.id !== F.loan).map(l => [l.id, l.name + ' · ' + money(l.available)]) :
    S.friends.filter(f => f.available > 0).map(f => [f.id, f.name + ' · ' + money(f.available)]);
  return heading('记录还款') + '<section class="panel"><div class="segment">' + [['income', '收入还款'], ['loan', '借贷还款'], ['support', '亲友支持']].map(([v, t]) =>
    '<button data-source="' + v + '" class="' + (F.source === v ? 'active' : '') + '" aria-pressed="' + (F.source === v) + '">' + t + '</button>').join('') +
    '</div><div class="cols"><div><div class="formgrid"><label class="field full">还款账户<select data-f="loan">' +
    options(active().map(l => [l.id, l.name + ' · ' + money(l.p + l.i + l.f)]), F.loan) + '</select></label>' +
    input('还款金额（元）', 'amount', F.amount, 'min="0.01" step="100"') +
    (F.source === 'income' ? '<div class="field">可用收入<strong class="num" style="font-size:20px">' + money(S.cash) + '</strong></div>' +
      '<label class="field check full"><input type="checkbox" data-f="extra" ' + (F.extra ? 'checked' : '') + '>计划外追加</label>' :
      '<label class="field full">资金来源<select data-f="fund">' + options([['new', F.source === 'loan' ? '本次新借' : '本次新增支持'], ...funds], F.fund) + '</select></label>' +
      (F.fund === 'new' ? (F.source === 'loan' ? input('新借年利率（%）', 'rate', F.rate, 'min="0" max="100" step="0.1"') +
        input('新借期数（月）', 'months', F.months, 'min="1" max="120" step="1"') : input('支持人', 'person', F.person, 'maxlength="40"', 'text')) : '')) +
    '</div></div><div id="repayPreview" aria-live="polite"></div></div></section><div class="formfoot">' + goBtn('取消', 'home') +
    '<button type="button" class="btn primary" id="submitAction" data-action="saveRepay" disabled>确认还款</button></div>';
}

function updateRepay() {
  if (!$('repayPreview')) return;
  if (F.amount === '' || F.amount == null) { $('repayPreview').innerHTML = '<div class="preview">' + row('债务变化', '—') + '</div>'; setSubmit(false); return; }
  try {
    const p = E.repay(S, F);
    $('repayPreview').innerHTML = '<div class="preview"><h3>还款结果</h3>' + row('实际还款', money(p.amount)) + row('冲抵本金', money(p.p), 'green') +
      row('利息 / 费用', money(p.interest) + ' / ' + money(p.fee)) + row('平台债务变化', signed(p.formalDelta), p.formalDelta < 0 ? 'green' : '') +
      row('人情债变化', signed(p.humanDelta)) + row('全部债务变化', signed(p.totalDelta)) + row('预计结清变化', E.timeChange(S, p.before, p.after)) + '</div>';
    setSubmit(true);
  } catch (e) { $('repayPreview').innerHTML = '<div class="preview"><p class="error" role="alert">' + esc(e.message) + '</p></div>'; setSubmit(false); }
}

function simpleForm() {
  if (page === 'humanpay') {
    const f = S.friends.find(x => x.id === F.id);
    if (!f) return heading('未找到记录', '', goBtn('返回', 'friends'));
    return heading('归还支持') + '<section class="panel"><h2>' + esc(f.name) + '</h2><div class="formgrid">' +
      input('归还金额（元）', 'amount', F.amount, 'min="0.01" step="100"') + '</div>' + row('待归还', money(f.amount - f.paid)) + row('可用收入', money(S.cash)) +
      '<div id="simpleError"></div></section><div class="formfoot">' + goBtn('取消', 'friends') + btn('确认归还', 'saveHuman', 'primary') + '</div>';
  }
  const support = page === 'support';
  return heading(support ? '记录支持' : '记录收入') + '<section class="panel"><div class="formgrid">' +
    (support ? input('支持人', 'person', F.person, 'maxlength="40"', 'text') : '') + input('到账金额（元）', 'amount', F.amount, 'min="0.01" step="100"') +
    (support ? input('约定归还日期', 'due', F.due, '', 'date') : '') + '</div><div id="simpleError"></div></section><div class="formfoot">' +
    goBtn('取消', support ? 'friends' : 'home') + btn('确认记录', support ? 'saveSupport' : 'saveIncome', 'primary') + '</div>';
}

function settings() {
  return heading('数据与设置') + '<section class="panel"><div class="sectionhead"><h2>我的账本</h2><span class="tag ' + (storageOK ? 'green' : 'red') + '">' +
    (storageOK ? '已保存' : '保存异常') + '</span></div>' + row('账本月份', E.month(S)) + row('账本类型', S.mode === 'demo' ? '演示' : '个人') +
    row('版本', '1.0.1') + '</section><section class="panel"><h2>备份与恢复</h2><div class="actions">' +
    (native ? btn('保存备份', 'nativeExport', 'primary') + btn('恢复备份', 'nativeImport') : btn('生成备份', 'export', 'primary')) +
    '</div><details class="month" style="margin-top:18px"><summary><strong>文本备份</strong><span>⌄</span></summary><div class="monthbody"><label class="field">备份文本' +
    '<textarea id="transfer" rows="5" placeholder="粘贴备份文本">' + esc(transfer) + '</textarea></label><div class="actions" style="margin-top:14px">' +
    btn('生成', 'export') + btn('复制', 'copy') + btn('导入', 'import') + '</div></div></details><div id="transferError"></div></section>' +
    '<section class="panel"><h2>账本管理</h2><div class="actions">' + btn('载入演示', 'demo') + btn('新建空白账本', 'blank', 'danger') + '</div></section>';
}

function more() {
  return heading('更多') + [['friends', '人情账本'], ['history', '收支记录'], ['income', '记录收入'], ['settings', '数据与设置']].map(([p, t]) =>
    '<button type="button" class="menu-card" data-go="' + p + '"><span>' + t + '</span><span aria-hidden="true">›</span></button>').join('');
}

 const views={home,loans,calendar,plan,friends,history,settings,more,borrow:borrowForm,repay:repayForm,income:simpleForm,support:simpleForm,humanpay:simpleForm};
 function render(){
  const position=$('content').scrollTop;
  const navPage=({borrow:'loans',repay:'home',friends:'more',history:'more',settings:'more',income:'more',support:'more',humanpay:'more'})[page]||page;
  $('nav').querySelectorAll('[data-go]').forEach(b=>{const selected=b.dataset.go===navPage;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('content').innerHTML=(views[page]||home)();
  updatePlan();updateBorrow();updateRepay();$('content').scrollTop=position;
 }
 function initForm(p){if(p==='borrow')F={kind:'existing',platform:'借呗',amount:'',months:12,mode:'equal',rate:18,day:25,early:false,interest:0,fee:0,flat:0};if(p==='repay')F={loan:active()[0]?.id||'',amount:'',source:'income',extra:false,fund:'new',rate:18,months:12,person:''};if(p==='income')F={amount:''};if(p==='support')F={amount:'',person:'',due:''};}
 const isForm=p=>['borrow','repay','income','support','humanpay'].includes(p);
 function saveView(){scrollPositions[page]=$('content').scrollTop;if(isForm(page))drafts[page]=E.copy(F);}
 function go(p){
  if(p===page&&!isForm(p)){$('content').scrollTop=0;return;}
  saveView();initForm(p);page=p;if(isForm(p))drafts[p]=E.copy(F);
  if($('confirm').open)$('confirm').close();if(location.hash!=='#'+p)location.hash=p;
  render();$('content').scrollTop=isForm(p)?0:(scrollPositions[p]||0);
 }
 window.addEventListener('hashchange',()=>{
  const requested=location.hash.slice(1),p=views[requested]?requested:'home';if(p===page)return;
  saveView();page=p;if(drafts[p])F=E.copy(drafts[p]);else initForm(p);
  if($('confirm').open)$('confirm').close();render();$('content').scrollTop=scrollPositions[p]||0;
 });
 function err(id,e){const el=$(id);if(el)el.innerHTML='<p class="error" role="alert">'+esc(e.message||e)+'</p>';}
 function importText(text){if(text.length>2000000)throw Error('备份超过 2 MB，请检查文件');const next=E.validate(JSON.parse(text));confirm('替换当前账本？','导入 '+next.loans.length+' 笔借款、'+next.events.length+' 条流水。请先保留现有账本备份。',()=>{if(!canWrite){canWrite=true;}if(commit(next,'账本已恢复')){transfer='';render();}});}
 window.receiveBackup=text=>{transfer=text;go('settings');setTimeout(()=>{try{importText(text);}catch(e){err('transferError',e);}},20);};
 window.nativeMessage=t=>toast(t);
 document.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.go){go(b.dataset.go);return;}if(b.dataset.platform){go('borrow');F.platform=b.dataset.platform;page='borrow';render();return;}if(b.dataset.repay){go('repay');F.loan=b.dataset.repay;page='repay';render();return;}if(b.dataset.source){F.source=b.dataset.source;F.fund='new';render();return;}if(b.dataset.cal){calView=b.dataset.cal;render();return;}if(b.dataset.human){const f=S.friends.find(x=>x.id===b.dataset.human);go('humanpay');F={id:f.id,amount:''};page='humanpay';render();return;}const a=b.dataset.action;if(!a)return;
 try{if(a==='saveBorrow'){const next=E.borrow(S,F);if(commit(next,'借款已记录'))go('loans');}
 if(a==='saveRepay'){const p=E.repay(S,F);if(commit(p.next,'冲抵本金 '+money(p.p)+'；全部债务变化 '+signed(p.totalDelta)+'。'))go('home');}
 if(a==='saveIncome'&&commit(E.income(S,F),'收入已记录'))go('home');
 if(a==='saveSupport'&&commit(E.support(S,F),'支持已记录'))go('friends');
 if(a==='saveHuman'&&commit(E.repayHuman(S,F),'归还已记录'))go('friends');
 if(a==='undo'&&undo){const prev=undo;if(commit(prev,'已撤销')){undo=null;render();}}
 if(a==='export'){transfer=loadError&&native?ShoreNative.loadState():JSON.stringify(S);render();const box=$('transfer');if(box){box.closest('details').open=true;box.scrollIntoView?.({block:'nearest'});}toast('备份已生成');}
 if(a==='copy'){transfer=$('transfer').value;if(!transfer)throw Error('请先生成备份');if(native)ShoreNative.copyText(transfer);else{try{await navigator.clipboard.writeText(transfer);}catch(e){$('transfer').focus();$('transfer').select();if(!document.execCommand('copy'))throw Error('请长按选中文本后手动复制');}}toast('备份已复制');}
 if(a==='import')importText($('transfer').value);
 if(a==='nativeExport'){const text=loadError?ShoreNative.loadState():JSON.stringify(S);location.href='shore://export?data='+encodeURIComponent(text);}
 if(a==='nativeImport')location.href='shore://import';
 if(a==='blank'||a==='demo')confirm(a==='blank'?'新建空白账本？':'载入虚拟演示？','将替换当前账本及流水，请先备份。',()=>{canWrite=true;if(commit(a==='blank'?E.blank():E.demo(),a==='blank'?'空白账本已建立':'已载入虚拟演示'))go('home');});
 }catch(e){err(a==='saveBorrow'?'borrowPreview':a==='saveRepay'?'repayPreview':a==='import'||a==='copy'?'transferError':'simpleError',e);toast(e.message);}});
 document.addEventListener('input',ev=>{const el=ev.target;if(el.id==='transfer'){transfer=el.value;return;}if(el.tagName==='SELECT')return;if(el.dataset.plan){try{const n=E.cents(el.value);if(!canWrite)return;const previous=S[el.dataset.plan];S[el.dataset.plan]=n;if(!persist())S[el.dataset.plan]=previous;updatePlan();}catch(e){toast(e.message);}return;}if(el.dataset.f){F[el.dataset.f]=el.type==='checkbox'?el.checked:el.value;if(el.tagName==='SELECT'&&['kind','mode','fund'].includes(el.dataset.f))render();else{updateBorrow();updateRepay();}}});
 document.addEventListener('change',ev=>{const el=ev.target;if(el.tagName==='SELECT'&&el.dataset.f){F[el.dataset.f]=el.value;if(el.dataset.f==='loan'&&F.fund===F.loan)F.fund='new';if(['kind','mode','fund','loan'].includes(el.dataset.f))render();else{updateBorrow();updateRepay();}}});
 document.addEventListener('focusin',e=>{const el=e.target;if(el.matches?.('input:not([type=checkbox]),textarea'))setTimeout(()=>{if(document.activeElement===el)el.scrollIntoView({block:'nearest',behavior:'auto'});},250);});
 page=views[location.hash.slice(1)]?location.hash.slice(1):'home';initForm(page);render();if(loadError)toast(loadError);
})();
