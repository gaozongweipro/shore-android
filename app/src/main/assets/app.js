(function () {
  'use strict';
  const E = Shore, $ = id => document.getElementById(id), native = typeof ShoreNative !== 'undefined' ? ShoreNative : null;
  const store = ShoreStore.create({ engine: E, native, localStorage: native ? null : localStorage });
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yuan = v => (v / 100).toFixed(2).replace(/\.00$/, ''), money = v => Number(v / 100).toLocaleString('zh-CN', { minimumFractionDigits: v % 100 ? 2 : 0, maximumFractionDigits: 2 });
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + '¥' + money(Math.abs(n));
  const tone = n => n > 0 ? 'warn' : n < 0 ? 'good' : 'muted';
  const icons = { plus:'M12 5v14 M5 12h14', down:'M12 4v16 M5 13l7 7 7-7', up:'M12 20V4 M5 11l7-7 7 7', back:'m14 5-7 7 7 7', next:'m9 5 7 7-7 7', check:'m5 12 4 4L19 6', wallet:'M20 7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h15V7 M20 12h-6v5h6', calendar:'M4 5h16v16H4Z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2', person:'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M4 21v-3a8 8 0 0 1 16 0v3', shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z M8 12l3 3 5-6', export:'M12 15V3 M7 8l5-5 5 5 M4 14v7h16v-7', import:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4', undo:'M4 9h9a7 7 0 0 1 0 14 M9 3 3 9l6 6', chart:'M4 3v17h17 M7 15l5-5 4 3 5-7', edit:'m4 16 12-12 4 4L8 20H4Z M13 7l4 4', book:'M5 3h14v18H5Z M9 7h6 M9 11h6 M9 15h3' };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (icons[name] || icons.book) + '"/></svg>';
  const button = (text, action, cls = '', extra = '') => '<button type="button" class="btn ' + cls + '" data-action="' + action + '" ' + extra + '>' + text + '</button>';
  const goButton = (text, go, cls = '', extra = '') => '<button type="button" class="btn ' + cls + '" data-go="' + go + '" ' + extra + '>' + text + '</button>';
  const link = (text, go) => '<button class="link" data-go="' + go + '">' + text + icon('next') + '</button>';
  const top = (title, parent = '', action = '') => (parent ? '<button class="back" data-go="' + parent + '">' + icon('back') + '返回</button>' : '') + '<div class="page-top"><h1>' + title + '</h1>' + action + '</div>';
  const metric = (label, value, cls = '') => '<div class="metric"><span>' + label + '</span><strong class="' + cls + '">' + value + '</strong></div>';
  const pair = (label, value, cls = '') => '<div class="row"><span class="muted">' + label + '</span><strong class="' + cls + '">' + value + '</strong></div>';
  let page = 'home', scroll = {}, drafts = {}, demoState = null, pending = null, saving = false, imported = null, selected = '', toastTimer;
  const state = () => demoState || store.state;
  const on = () => E.today(), opts = f => ({ date: f?.date || on(), opId: f?.opId || E.uid() });
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3000); }
  window.nativeMessage = toast;
  function modal(title, body, fn, label = '确认') {
    pending = fn; $('confirmBody').innerHTML = '<h2>' + esc(title) + '</h2>' + body + '<div class="actions">' + button('取消', 'closeDialog', 'ghost') + button(esc(label), 'confirmDialog', 'green') + '</div>';
    if (!$('confirm').open) $('confirm').showModal();
  }
  function closeDialog() { $('confirm').close(); pending = null; }
  function commit(result, message, route = 'home', recovery = false) {
    if (saving) return false; saving = true;
    try {
      if (demoState && !recovery) demoState = result.state;
      else store.persist(result.state, recovery);
      if (drafts[page]) delete drafts[page];
      closeDialog(); if(page===route)$('content').scrollTop=0;scroll[route]=0;navigate(route,false); toast(demoState ? '演示操作 · 未写入个人账本' : message); return true;
    } catch (e) { toast(e.message); return false; } finally { saving = false; }
  }
  function field(label, key, value = '', type = 'text', extra = '') {
    const numeric = type === 'money' || type === 'integer';
    return '<label class="field"><span>' + label + '</span><input data-f="' + key + '" type="' + (numeric ? 'text' : type) + '" ' + (numeric ? 'inputmode="' + (type === 'integer' ? 'numeric' : 'decimal') + '" autocomplete="off" ' : '') + 'value="' + esc(value) + '" ' + extra + '></label>';
  }
  function select(label, key, value, values) { return '<label class="field"><span>' + label + '</span><select data-f="' + key + '">' + values.map(([v, t]) => '<option value="' + esc(v) + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select></label>'; }
  const check = (label, key, value) => '<label class="check"><input type="checkbox" data-f="' + key + '"' + (value ? ' checked' : '') + '>' + label + '</label>';
  const active = () => state().accounts.filter(a => a.principalCents > 0 || E.payable(a) > 0);
  function draft(route) {
    if (drafts[route]) return drafts[route];
    const s = state(), a = s ? active()[0] : null, first = a?.bills.find(b => E.remaining(b));
    const common = { date: on(), opId: E.uid() };
    if (route === 'borrow') drafts[route] = { ...common, name:'', platform:'', kind:'platform', entryType:'existing', principal:'', periods:'12', monthlyAmount:'', firstDate:on(), balanceDate:on(), received:'', unusedFunds:'', allowEarly:false };
    else if (route === 'repay') drafts[route] = { ...common, accountId:a?.id || '', amount:first ? yuan(E.remaining(first)) : '', afterPrincipal:'', fund:'income', settlement:false };
    else if (route === 'simulate') drafts[route] = { ...common, accountId:a?.id || '', borrowPrincipal:'', received:'', payment:'', afterPrincipal:'', newPeriods:'12', newMonthlyAmount:'', newFirstDate:E.addMonths(on(),1), newName:'', settlement:false };
    else if (route === 'budget') drafts[route] = { ...common, monthlyCents:yuan(s.budget.monthlyCents), incomeCents:yuan(s.budget.incomeCents), livingCents:yuan(s.budget.livingCents), reserveCents:yuan(s.budget.reserveCents) };
    else if (route === 'baseline') drafts[route] = { ...common, amount:'' };
    else if (route === 'income') drafts[route] = { ...common, amount:'' };
    else if (route === 'reconcile') drafts[route] = { ...common, accountId:selected || a?.id, principal:yuan(E.account(s,selected || a?.id).principalCents) };
    else if (route === 'editBills') { const x=E.account(s,selected); drafts[route]={...common,accountId:x.id,bills:E.copy(x.bills).map(b=>({...b,amount:yuan(b.amountCents),principal:b.principalCents == null ? '' : yuan(b.principalCents)}))}; }
    else drafts[route] = { ...common };
    return drafts[route];
  }
  function alias(route) { return ({plan:'simulate',history:'records',more:'settings',friends:'loans',support:'settings'})[route] || route; }
  function navigate(route, repeat = true) {
    route=alias(route); if (!renderers[route]) route='home';
    if (route === page && repeat) { $('content').scrollTop=0; return; }
    scroll[page]=$('content').scrollTop; page=route;
    if (location.hash !== '#'+route) location.hash=route;
    render();
  }
  function render() {
    let html;
    try { html=store.blocked && !demoState ? recovery() : renderers[page](); }
    catch(e) { html=top('暂时无法打开','home')+'<div class="error">'+esc(e.message)+'</div>'; }
    const demo=demoState ? '<div class="demo-banner"><span>演示账本</span><button data-action="exitDemo">回到我的账本</button></div>' : '';
    $('content').innerHTML='<div class="view">'+demo+html+'</div>';
    $('content').scrollTop=scroll[page] || 0;
    const group=({borrow:'loans',detail:'loans',repay:'loans',editBills:'loans',reconcile:'loans',calendar:'home',forecast:'home',budget:'home',baseline:'home',income:'home'})[page] || page;
    $('nav').querySelectorAll('[data-go]').forEach(b=>{ const yes=b.dataset.go===group;b.classList.toggle('active',yes); if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current'); });
    refreshPreview(false);
  }
  function empty(title, text, action) { return '<div class="card empty">'+icon('wallet')+'<h2>'+title+'</h2><p>'+text+'</p>'+action+'</div>'; }
  function home() {
    const s=state(), stat=E.monthlyStats(s), forecast=E.forecast(s), p=E.principal(s), budget=s.budget.monthlyCents, used=E.usedBudget(s,E.monthKey(on()));
    if(!s.accounts.length) return top('从这一笔开始')+empty('把负债放在眼前','录入剩余本金和各期账单',goButton(icon('plus')+'录入第一笔','borrow','green'))+'<div class="card">'+settingRow('budget','每月还款预算','wallet')+settingRow('import','导入已有账本','import',true)+'</div><button class="link" data-action="demo">看看演示账本</button>';
    let net=stat.unknown?'待核对':stat.deltaCents<0?'减少了':stat.deltaCents>0?'增加了':'暂无变化';
    const due=upcoming().slice(0,3), caption=stat.complete?'本月本金':'建账以来本金';
    return top('每一步，都算数','', '<span class="pill gray">'+Number(on().slice(5,7))+'月</span>')+
      '<div class="card hero"><div class="eyebrow">剩余本金</div><div class="amount '+(money(p).length>11?'compact':'')+'"><span class="currency">¥</span>'+money(p)+'</div><div class="hero-line"></div><div class="net"><span>'+caption+net+'</span><strong class="'+tone(stat.deltaCents)+'">'+(stat.unknown?'—':(stat.deltaCents<0?'−':stat.deltaCents>0?'+':'')+'¥'+money(Math.abs(stat.deltaCents)))+'</strong></div><div class="hero-foot"><span>'+(stat.complete?'月初 ¥'+money(stat.openingCents):'从 '+stat.since.slice(5).replace('-','.')+' 开始记录')+'</span>'+link(stat.complete?'查看明细':'核对月初本金',stat.complete?'records':'baseline')+'</div></div>'+
      (stat.deltaCents<0&&!stat.unknown?'<div class="encourage">'+icon('check')+'又靠近岸边一点，已还本金 ¥'+money(stat.repaidPrincipalCents)+'</div>':'')+
      '<div class="card"><div class="two">'+metric('预计全部还清',forecast.payoffMonth?E.monthLabel(forecast.payoffMonth):p?'待完善预算':'已还清','good')+metric('还需要',forecast.payoffMonth?forecast.months+'<small> 个月</small>':forecast.gapCents?'有资金缺口':'—')+'</div><div class="caption">'+(forecast.gapCents?'单月最大缺口 ¥'+money(forecast.gapCents):forecast.unplannedCents?'有未覆盖本金，请核对账单':forecast.estimatedPrincipal?'按账单与当前预算预计 · 部分本金按比例分配':'按账单与当前预算预计')+'</div>'+link('查看还款路径','forecast')+'</div>'+
      '<div class="card"><div class="row"><h2>本月自有还款</h2>'+link('调整预算','budget')+'</div><div class="two" style="margin-top:10px">'+metric('已还','¥'+money(used),'good')+metric('预算','¥'+money(budget))+'</div><div class="progress '+(used>budget?'amber':'')+'"><i style="width:'+Math.min(100,budget?used/budget*100:0)+'%"></i></div><div class="caption">'+(budget?'还可安排 ¥'+money(Math.max(0,budget-used)):'设置每月还款预算')+'</div></div>'+
      '<div class="quick-actions">'+goButton(icon('plus')+'录入借款','borrow','secondary')+goButton(icon('down')+'记一笔还款','repay','green')+'</div><div class="section-head"><h2>接下来要还</h2>'+link('全部账单','calendar')+'</div><div class="card">'+(due.length?due.map(billItem).join(''):'<div class="caption">近期没有待还账单</div>')+'</div>';
  }
  function upcoming() { return state().accounts.flatMap(a=>a.bills.filter(b=>E.remaining(b)).map(b=>({...b,accountId:a.id,name:a.name}))).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)); }
  function billItem(b) { return '<div class="bill"><div class="row"><div class="date-tile"><small>'+Number(b.dueDate.slice(5,7))+'月</small><b>'+Number(b.dueDate.slice(8))+'</b></div><div class="left"><div class="name">'+esc(b.name||'待还账单')+'</div><div class="caption">'+(b.dueDate<on()?'<span class="warn">待处理 · </span>':'')+b.dueDate+'</div></div><div class="right"><strong>¥'+money(E.remaining(b))+'</strong><div><button class="link" data-action="payAccount" data-id="'+esc(b.accountId)+'">还款</button></div></div></div></div>'; }
  function loans() {
    const s=state(); return top('我的借款','',goButton(icon('plus')+'录入','borrow','small'))+
      '<div class="eyebrow">'+active().length+' 笔待还 · 本金 ¥'+money(E.principal(s))+'</div>'+
      (s.accounts.length?s.accounts.map(a=>{const bs=a.bills.filter(b=>E.remaining(b)),next=bs.sort((x,y)=>x.dueDate.localeCompare(y.dueDate))[0];return '<div class="card loan-card"><div class="row"><div class="loan-icon '+(a.kind==='friend'?'friend':'')+'">'+icon(a.kind==='friend'?'person':'wallet')+'</div><div class="left"><div class="name">'+esc(a.name)+'</div><div class="caption">'+(a.kind==='friend'?'亲友借款':esc(a.platform))+'</div></div><span class="pill '+(a.scheduleStatus==='confirmed'?'gray':'amber')+'">'+(a.principalCents===0&&!E.payable(a)?'已结清':a.scheduleStatus==='confirmed'?(bs.length?bs.length+' 期':'灵活还款'):'待核账单')+'</span></div><div class="loan-total">¥'+money(a.principalCents)+'</div><div class="caption">剩余本金'+(E.payable(a)>a.principalCents?' · 待还总额 ¥'+money(E.payable(a)):'')+'</div><div class="loan-bottom"><span class="caption">'+(next?next.dueDate+' 待还 ¥'+money(E.remaining(next)):'')+'</span><button class="link" data-action="detail" data-id="'+esc(a.id)+'">查看'+icon('next')+'</button></div></div>';}).join(''):empty('还没有借款','从剩余本金开始记',goButton('录入借款','borrow','green')));
  }
  function detail() {
    const a=E.account(state(),selected), bills=[...a.bills].sort((x,y)=>x.dueDate.localeCompare(y.dueDate));
    return top(esc(a.name),'loans')+'<div class="card hero"><div class="eyebrow">剩余本金</div><div class="amount '+(money(a.principalCents).length>11?'compact':'')+'"><span class="currency">¥</span>'+money(a.principalCents)+'</div><div class="divider"></div><div class="two">'+metric('剩余待还总额','¥'+money(E.payable(a)))+metric('剩余期数',a.bills.filter(b=>E.remaining(b)).length+'<small> 期</small>')+'</div><div class="caption">剩余利息及费用 ¥'+money(Math.max(0,E.payable(a)-a.principalCents))+'</div><div class="actions">'+button('记还款','payAccount','green','data-id="'+esc(a.id)+'"')+goButton('核对本金','reconcile','secondary')+'</div></div>'+
      (a.scheduleStatus!=='confirmed'?'<div class="preview"><span class="warn">'+(a.scheduleStatus==='estimated'?'旧版推算账单':'账单待核对')+'</span><div>'+link('按平台账单校正','editBills')+'</div></div>':'')+
      '<div class="section-head"><h2>各期账单</h2>'+link('编辑账单','editBills')+'</div><div class="card">'+(bills.length?bills.map((b,i)=>'<div class="bill"><div class="row"><div class="left"><h3>第 '+(i+1)+' 期</h3><div class="caption">'+b.dueDate+'</div></div><div class="right"><strong>¥'+money(E.remaining(b))+'</strong><div class="caption">'+(!E.remaining(b)?(b.voidedCents?'已结清':'已还'):b.principalCents!=null?'本期本金 ¥'+money(Math.max(0,b.principalCents-(b.paidPrincipalCents||0))):'含利息及费用')+'</div></div></div></div>').join(''):'<div class="caption">亲友借款 · 灵活还款</div>')+'</div>';
  }
  function borrow() {
    const f=draft('borrow'); return top('录入借款','loans')+'<div class="segmented"><button data-action="entryType" data-value="existing" class="'+(f.entryType==='existing'?'selected':'')+'">已有借款</button><button data-action="entryType" data-value="new" class="'+(f.entryType==='new'?'selected':'')+'">新发生借款</button></div><div class="card">'+select('借款类型','kind',f.kind,[['platform','平台 / 银行'],['friend','亲友借款']])+field(f.kind==='friend'?'借给我的人':'借款名称','name',f.name,'text','maxlength="80" placeholder="例如：借呗"')+field(f.entryType==='new'?'新增借款本金（元）':'剩余本金（元）','principal',f.principal,'money','placeholder="0.00"')+
      (f.entryType==='new'?field('实际到账（元）','received',f.received,'money','placeholder="默认等于本金"'):'')+
      (f.kind==='platform'?'<div class="two">'+field('剩余期数','periods',f.periods,'integer')+field('每期待还总额（元）','monthlyAmount',f.monthlyAmount,'money')+'</div>'+field('第一期待还日','firstDate',f.firstDate,'date')+'<div class="field-note">每期不同，可逐期修改</div>'+button('查看各期账单','generateBills','secondary full')+'<div id="billEditor">'+borrowBillEditor(f)+'</div>':field('约定还款日（可空）','firstDate',f.firstDate,'date'))+
      '<details><summary>更多</summary>'+field(f.entryType==='new'?'借入日期':'本金核对日期','date',f.date,'date','max="'+on()+'"')+(f.entryType==='existing'?field('尚未动用的借款资金（元）','unusedFunds',f.unusedFunds,'money','placeholder="0"'):'')+(f.kind==='platform'?check('允许按当前账单提前还款','allowEarly',f.allowEarly):'')+'</details></div><div id="preview"></div>'+button('保存借款','saveBorrow','green full','id="submitAction"')+'<div class="note-line">'+(f.entryType==='existing'?'已有借款计入初始负债':'新借款计入本月新增本金')+'</div>';
  }
  function billsEditor(bills) { return bills.map((b,i)=>'<div class="bill-editor"><h3>第 '+(i+1)+' 期'+(b.paidCents?' · 已还 ¥'+money(b.paidCents):'')+'</h3><div class="two">'+field('还款日','b.'+i+'.dueDate',b.dueDate,'date')+field('账单总额（元）','b.'+i+'.amount',b.amount ?? yuan(b.amountCents),'money')+'</div><details><summary>本期本金（可选）</summary>'+field('本金（元）','b.'+i+'.principal',b.principal ?? (b.principalCents==null?'':yuan(b.principalCents)),'money','placeholder="平台未拆分时留空"')+'</details></div>').join(''); }
  function borrowBillEditor(f) { return f.bills?'<details open><summary>'+f.bills.length+' 期待还账单</summary>'+billsEditor(f.bills)+'</details>':''; }
  function repayInput(f) { const fund=f.fund||'income',parts=fund.split(':'); return {...f,source:parts[0],fundId:parts[1]||null}; }
  function repay() {
    if(!active().length) return top('记还款','home')+empty('暂无待还借款','先录入一笔借款',goButton('录入借款','borrow','green'));
    const f=draft('repay'),a=E.account(state(),f.accountId),funds=state().accounts.filter(x=>x.id!==a.id&&x.availableCents>0);
    return top('记一笔还款','loans')+'<div class="card">'+select('还给谁','accountId',f.accountId,active().map(x=>[x.id,x.name]))+field('还款金额（元）','amount',f.amount,'money')+
      (a.kind==='platform'?field('平台显示的还后剩余本金（元）','afterPrincipal',f.afterPrincipal,'money','placeholder="账单已拆分本金时可留空"'):'')+
      select('资金来源','fund',f.fund,[['income','自有资金 · ¥'+money(state().budget.cashCents)],...funds.map(x=>[(x.kind==='friend'?'friend:':'loan:')+x.id,x.name+' · 可用 ¥'+money(x.availableCents)])])+
      (f.fund==='income'?'<div class="field-note">'+link('记入可用自有资金','income')+'</div>':'')+
      (a.kind==='platform'?check('使用平台结清报价，全部结清','settlement',f.settlement):'')+field('还款日期','date',f.date,'date','max="'+on()+'"')+'</div><div id="preview"></div>'+button('确认还款','saveRepay','green full','id="submitAction"');
  }
  function simulate() {
    if(!active().length) return top('借贷试算')+empty('先有账本，再做选择','录入当前借款后即可试算',goButton('录入借款','borrow','green'));
    const f=draft('simulate');return top('借贷试算')+'<div class="card"><h2 style="margin-bottom:20px">准备借入</h2><div class="two">'+field('借款本金（元）','borrowPrincipal',f.borrowPrincipal,'money')+field('实际到账（元）','received',f.received,'money','placeholder="同本金"')+'</div><div class="two">'+field('新借款期数','newPeriods',f.newPeriods,'integer')+field('每期待还（元）','newMonthlyAmount',f.newMonthlyAmount,'money')+'</div>'+field('新借款首期还款日','newFirstDate',f.newFirstDate,'date')+field('新借款名称','newName',f.newName,'text','placeholder="例如：银行分期" maxlength="80"')+'<div class="divider"></div><h2 style="margin-bottom:20px">用来归还</h2>'+select('待还借款','accountId',f.accountId,active().map(a=>[a.id,a.name]))+field('本次还款（元）','payment',f.payment,'money')+(E.account(state(),f.accountId).kind==='platform'?field('还后剩余本金（元）','afterPrincipal',f.afterPrincipal,'money','placeholder="按平台显示填写"')+check('使用平台报价全部结清','settlement',f.settlement):'')+'</div><div id="preview" aria-live="polite"></div><div class="actions">'+button('保存方案','savePlan','secondary','id="submitAction"')+button('记为已发生','recordScenario','green','id="recordAction"')+'</div><div class="note-line">保存方案不改变账本 · 发生后再记账</div>'+plans();
  }
  function plans() { const plans=state().plans; return plans.length?'<div class="section-head"><h2>我的方案</h2></div>'+[...plans].reverse().map(p=>'<div class="card plan-card"><div class="row"><div class="left"><div class="name">'+esc(p.name)+'</div><div class="caption">借入 ¥'+money(E.cents(p.input.borrowPrincipal))+' · 还款 ¥'+money(E.cents(p.input.payment))+'</div></div>'+(p.status==='recorded'?'<span class="pill">已记账</span>':button('继续试算','openPlan','small secondary','data-id="'+esc(p.id)+'"'))+'</div></div>').join(''):''; }
  function scenarioHTML(r) {
    const d=r.operationDeltaCents,month=r.monthDeltaCents;
    return '<div class="plan-result"><div class="result-label">借入并还款后，剩余本金'+(d>0?'增加':d<0?'减少':'不变')+'</div><div class="result-amount '+tone(d)+'">'+signed(d)+'</div>'+pair('新增本金','¥'+money(r.event.borrowedPrincipalCents))+pair('归还本金','−¥'+money(r.event.repaidPrincipalCents))+pair('新借款利息及费用','¥'+money(r.newCostCents),'warn')+'<div class="divider"></div>'+pair('按计划执行后月末本金','¥'+money(r.monthEndCents))+pair((r.monthlyComplete?'本月最终':'建账以来至月末')+'预计净变化',month==null?'待核对月初本金':signed(month),tone(month))+pair('原计划净变化',r.baselineMonthDeltaCents==null?'待核对月初本金':signed(r.baselineMonthDeltaCents),tone(r.baselineMonthDeltaCents))+pair('预计全部还清',r.after.payoffMonth?E.monthLabel(r.after.payoffMonth):'预算或账单待完善')+pair('相比原计划',r.delayMonths==null?'暂无法比较':r.delayMonths>0?'延后 '+r.delayMonths+' 个月':r.delayMonths<0?'提前 '+Math.abs(r.delayMonths)+' 个月':'时间不变')+(r.after.gapCents?'<div class="caption warn">月度最大缺口 ¥'+money(r.after.gapCents)+'</div>':'')+'<div class="caption">按当前预算及剩余账单预计'+(r.after.estimatedPrincipal?' · 部分本金按比例分配':'')+'</div></div>';
  }
  function budget() { const f=draft('budget');return top('每月还款预算','home')+'<div class="card">'+field('每月收入（元）','incomeCents',f.incomeCents,'money')+'<div class="two">'+field('生活开支（元）','livingCents',f.livingCents,'money')+field('保留备用（元）','reserveCents',f.reserveCents,'money')+'</div><div id="budgetSuggested" class="preview"></div>'+field('每月自有资金还款（元）','monthlyCents',f.monthlyCents,'money')+'</div><div id="preview"></div>'+button('保存预算','saveBudget','green full','id="submitAction"')+'<div class="note-line">收入预算不计入可用现金</div>'; }
  function income() { const f=draft('income');return top('记入自有资金','home')+'<div class="card">'+field('可用资金增加（元）','amount',f.amount,'money')+field('到账日期','date',f.date,'date','max="'+on()+'"')+'<div class="caption">当前可用 ¥'+money(state().budget.cashCents)+'</div></div><div id="preview"></div>'+button('确认记入','saveIncome','green full','id="submitAction"'); }
  function baseline() { const f=draft('baseline'),stat=E.monthlyStats(state());return top('核对月初本金','home')+'<div class="card"><div class="eyebrow">'+E.monthLabel(E.monthKey(on()))+'</div>'+field('月初全部剩余本金（元）','amount',f.amount,'money')+'<div class="caption">包含平台借款和亲友借款</div><div class="divider"></div>'+pair('当前本金','¥'+money(stat.currentCents))+'</div><div id="preview"></div>'+button('确认月初本金','saveBaseline','green full','id="submitAction"'); }
  function reconcile() { const f=draft('reconcile');return top('核对实际本金','detail')+'<div class="card">'+field('平台当前剩余本金（元）','principal',f.principal,'money')+'<div class="caption">本金差额记为核对调整</div></div><div id="preview"></div>'+button('保存核对','saveReconcile','green full','id="submitAction"'); }
  function editBills() { const f=draft('editBills');return top('编辑各期账单','detail')+'<div class="card">'+billsEditor(f.bills)+button(icon('plus')+'添加一期','addBill','secondary full')+'</div><div id="preview"></div>'+button('保存账单','saveBills','green full','id="submitAction"'); }
  function forecastPage() { const r=E.forecast(state());return top('还款路径','home')+'<div class="card"><div class="eyebrow">预计全部还清</div><h1 class="good">'+(r.payoffMonth?E.monthLabel(r.payoffMonth):E.principal(state())?'待完善预算':'已还清')+'</h1><div class="caption">'+(r.gapCents?'最大月度资金缺口 ¥'+money(r.gapCents):'包含所有平台与亲友借款')+'</div><div class="caption">'+(r.estimatedPrincipal?'部分账单本金按比例分配 · 实际以平台为准':'按当前账单和预算预计')+'</div>'+link('调整每月预算','budget')+'</div><div class="card table-scroll"><table><thead><tr><th>月份</th><th>安排还款</th><th>剩余本金</th><th>缺口</th></tr></thead><tbody>'+r.rows.map(row=>'<tr><td>'+row.month+'</td><td>'+money(row.amountCents)+'</td><td>'+money(row.principalLeftCents)+'</td><td class="'+(row.gapCents?'warn':'muted')+'">'+(row.gapCents?money(row.gapCents):'—')+'</td></tr>').join('')+'</tbody></table></div>'; }
  function calendar() {const all=upcoming();let last='';return top('待还账单','home')+(all.length?all.map(b=>{const m=b.dueDate.slice(0,7),head=m!==last?'<div class="section-head"><h2>'+E.monthLabel(m)+'</h2></div>':'';last=m;return head+'<div class="card">'+billItem(b)+'</div>';}).join(''):empty('没有待还账单','每一笔还款都在靠近目标','')); }
  function records() {
    const f=draft('records'),s=state(),months=[...new Set([E.monthKey(on()),...s.events.map(e=>E.monthKey(e.date))])].sort().reverse();
    if(!f.month) f.month=E.monthKey(on()); const list=s.events.filter(e=>e.date.slice(0,7)===f.month).reverse();
    const stat=E.monthlyStats(s), summary=f.month===E.monthKey(on())?'<div class="card">'+pair(stat.complete?'本月本金净变化':'建账以来本金净变化',stat.unknown?'待核对':signed(stat.deltaCents),tone(stat.deltaCents))+'<div class="divider"></div>'+pair('新增借款本金','¥'+money(stat.borrowedPrincipalCents))+pair('已还本金','¥'+money(stat.repaidPrincipalCents),'good')+pair('已付利息及费用','¥'+money(stat.costCents))+pair('本金核对调整',signed(stat.adjustmentsCents),tone(stat.adjustmentsCents))+'</div>':'';
    return top('每一笔，记得清','',button(icon('undo'),'undo','small ghost','aria-label="撤销最近一笔"'))+select('月份','month',f.month,months.map(m=>[m,E.monthLabel(m)]))+summary+'<div class="card">'+(list.length?list.map(e=>'<button class="record row" style="width:100%;text-align:left" data-action="eventDetail" data-id="'+esc(e.id)+'"><span class="record-icon '+(e.principalDeltaCents>0?'amber':'')+'">'+icon(e.principalDeltaCents>0?'up':e.principalDeltaCents<0?'down':'book')+'</span><div class="left"><div class="name">'+esc(e.label)+'</div><div class="caption">'+e.date+' · '+(e.principalDeltaCents==null?'本金待核对':'本金变化')+'</div></div><div class="right"><strong class="'+tone(e.principalDeltaCents)+'">'+(e.principalDeltaCents==null?'—':signed(e.principalDeltaCents))+'</strong></div></button>').join(''):'<div class="empty"><p>这个月还没有记录</p></div>')+'</div>';
  }
  function settingRow(go,text,symbol,action=false) {return '<button class="list-button" '+(action?'data-action':'data-go')+'="'+go+'">'+icon(symbol)+'<span>'+text+'</span><svg class="chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>'; }
  function settings() {return top('设置与备份','home')+'<div class="card">'+settingRow('budget','每月还款预算','wallet')+settingRow('income','记入自有资金','plus')+settingRow('baseline','核对月初本金','edit')+'</div><div class="section-head"><h2>我的数据</h2><span class="pill gray">仅存本机</span></div><div class="card">'+settingRow('export','导出完整备份','export',true)+settingRow('import','从文件导入','import',true)+settingRow('restoreLocal','恢复历史版本 · '+store.count()+' 份','undo',true)+settingRow('restoreLegacy','查看旧版原始账本','book',true)+'</div><details id="transferDetails"><summary>备份文本</summary><textarea id="transfer" class="transfer" spellcheck="false" placeholder="粘贴备份内容"></textarea><div class="actions">'+button('复制','copyBackup','secondary')+button('读取备份','readText','secondary')+'</div></details><div class="card">'+settingRow('demo','查看演示账本','chart',true)+'</div><div class="note-line">上岸 2.0.0 · 数据格式 v4<br>本地自动保留最近 20 次保存，旧版原始数据另存。卸载或清除应用数据前，请导出备份。</div>'; }
  function recovery() {return top('恢复我的账本')+'<div class="card">'+icon('shield')+'<h2 style="margin:16px 0 12px">原数据已保留</h2><div class="error">'+esc(store.error)+'</div>'+button('导出原始数据','exportRaw','secondary full')+'</div><div class="card">'+settingRow('restoreLocal','查看本地历史备份','undo',true)+settingRow('restoreLegacy','查看旧版原始账本','book',true)+settingRow('import','导入备份文件','import',true)+'</div><details><summary>从文本恢复</summary><textarea id="transfer" class="transfer" placeholder="粘贴备份"></textarea>'+button('读取备份','readText','secondary full')+'</details>'; }
  const renderers={home,loans,detail,borrow,repay,simulate,records,settings,budget,income,baseline,reconcile,editBills,calendar,forecast:forecastPage};
  function calculate() {
    const s=state(),f=draft(page);
    switch(page){
      case 'borrow': return E.addAccount(s,{...f,balanceDate:f.date,bills:f.bills?.map(b=>({id:b.id,dueDate:b.dueDate,amount:b.amount,principal:b.principal}))},opts(f));
      case 'repay':return E.repay(s,repayInput(f),opts(f));
      case 'simulate':return E.scenario(s,f,opts(f));
      case 'budget':return E.updateBudget(s,f,opts(f));
      case 'income':return E.recordIncome(s,f,opts(f));
      case 'baseline':return E.setBaseline(s,f,opts(f));
      case 'reconcile':return E.reconcile(s,f,opts(f));
      case 'editBills':return E.updateBills(s,{...f,bills:f.bills.map(b=>({id:b.id,dueDate:b.dueDate,amount:b.amount,principal:b.principal}))},opts(f));
    }
  }
  function refreshPreview(touched=true) {
    if(!$('preview') || store.blocked&&!demoState) return;
    const f=draft(page),submit=$('submitAction'),record=$('recordAction');
    try {
      let html='',r=calculate();
      if(page==='borrow'){const a=r.state.accounts.at(-1); html='<div class="preview">'+pair('剩余待还总额','¥'+money(E.payable(a)))+pair('剩余利息及费用','¥'+money(Math.max(0,E.payable(a)-a.principalCents)))+(f.entryType==='new'?pair('本月新增本金','+¥'+money(a.principalCents),'warn'):'')+'</div>';}
      else if(page==='simulate')html=scenarioHTML(r);
      else if(page==='repay')html='<div class="preview">'+pair('本次归还本金','−¥'+money(r.event.repaidPrincipalCents),'good')+pair('利息及费用','¥'+money(r.event.costCents))+pair('还后全部本金','¥'+money(E.principal(r.state)))+'</div>';
      else if(page==='baseline')html='<div class="preview">'+pair('本月本金净变化',signed(E.principal(safeState())-E.cents(f.amount)),tone(E.principal(safeState())-E.cents(f.amount)))+'</div>';
      else if(page==='budget'){const available=E.cents(f.incomeCents)-E.cents(f.livingCents)-E.cents(f.reserveCents);$('budgetSuggested').innerHTML=pair('收入扣除开支及备用','¥'+money(available),available<0?'warn':'good');if(E.cents(f.monthlyCents)>available)html='<div class="preview warn">还款预算高于每月结余</div>';}
      else if(page==='reconcile')html='<div class="preview">'+pair('本金调整',signed(r.event.principalDeltaCents),tone(r.event.principalDeltaCents))+'</div>';
      $('preview').innerHTML=html; if(submit)submit.disabled=false;if(record)record.disabled=false;
    }catch(e){$('preview').innerHTML=touched?'<div class="error">'+esc(e.message)+'</div>':'<div class="blank-preview">填写后即可查看结果</div>';if(submit)submit.disabled=true;if(record)record.disabled=true;}
  }
  const safeState=()=>state();
  function rerenderKeep() {scroll[page]=$('content').scrollTop;render();}
  function prepareImport(text) {
    try { const result=E.load(text);imported=result;const s=result.state;
      $('confirmBody').innerHTML='<h2>备份已校验</h2>'+pair('借款',s.accounts.length+' 笔')+pair('记录',s.events.length+' 笔')+pair('剩余本金','¥'+money(E.principal(s)))+'<p style="margin-top:15px">'+(result.migrated?'旧版数据将迁移。':'')+'恢复前，当前账本会留存本地快照。</p><div class="actions">'+button('取消','closeDialog','ghost')+button('整本恢复','restoreImported','green')+'</div>'+(!store.blocked&&s.id===state().id?button('合并同一本账本','mergeImported','secondary full','style="margin-top:10px"'):'');
      if(!$('confirm').open)$('confirm').showModal();
    }catch(e){toast('无法读取：'+e.message);}
  }
  window.receiveBackup=prepareImport;
  function exportText(text) {
    if(!text)throw Error('暂无可导出数据');
    if(native){if(native.stageBackup){if(!native.stageBackup(text))throw Error('备份过大');location.href='shore://export';}else location.href='shore://export?data='+encodeURIComponent(text);}
    else {const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=url;a.download='shore-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    if($('transfer')){$('transfer').value=text;if($('transferDetails'))$('transferDetails').open=true;}
  }
  document.addEventListener('input',e=>{
    const t=e.target,key=t.dataset.f;if(!key)return;const f=draft(page),v=t.type==='checkbox'?t.checked:t.value;
    if(key.startsWith('b.')){const[,i,k]=key.split('.');f.bills[Number(i)][k]=v;}
    else {f[key]=v;if(page==='borrow'&&['periods','firstDate','monthlyAmount'].includes(key)) {delete f.bills;if($('billEditor'))$('billEditor').innerHTML='';}}
    refreshPreview(true);
  });
  document.addEventListener('change',e=>{
    const t=e.target,key=t.dataset.f;if(!key||key.startsWith('b.'))return;const f=draft(page);f[key]=t.type==='checkbox'?t.checked:t.value;
    if(page==='borrow'&&key==='kind'){f.firstDate=f.kind==='friend'?'':on();delete f.bills;rerenderKeep();}
    else if((page==='repay'||page==='simulate')&&key==='accountId'){f.afterPrincipal='';if(page==='repay'){const b=E.account(state(),f.accountId).bills.find(b=>E.remaining(b));f.amount=b?yuan(E.remaining(b)):'';}rerenderKeep();}
    else if(key==='fund'||page==='records'&&key==='month')rerenderKeep();
    else if(t.tagName==='SELECT'||t.type==='checkbox')refreshPreview(true);
  });
  document.addEventListener('focusin',e=>{if(e.target.matches?.('input,select,textarea'))setTimeout(()=>e.target.scrollIntoView({block:'nearest',behavior:'smooth'}),220);});
  document.addEventListener('click',e=>{
    const target=e.target.closest('button[data-go],button[data-action]');if(!target||target.disabled)return;
    const d=target.dataset;
    try {
      if(d.go){navigate(d.go);return;}
      switch(d.action){
        case 'closeDialog':closeDialog();break;
        case 'confirmDialog':{const fn=pending;if(fn)fn();break;}
        case 'entryType':draft('borrow').entryType=d.value;rerenderKeep();break;
        case 'generateBills':{const f=draft('borrow');f.bills=E.billRows(f).map(b=>({...b,amount:yuan(b.amountCents),principal:''}));rerenderKeep();break;}
        case 'addBill':{const f=draft('editBills'),last=f.bills.at(-1);f.bills.push({id:E.uid(),dueDate:last?E.addMonths(last.dueDate,1):on(),amount:last?.amount||'',principal:'',paidCents:0,voidedCents:0});rerenderKeep();break;}
        case 'detail':selected=d.id;delete drafts.reconcile;delete drafts.editBills;navigate('detail',false);break;
        case 'payAccount':delete drafts.repay;draft('repay').accountId=d.id;{const b=E.account(state(),d.id).bills.find(b=>E.remaining(b));draft('repay').amount=b?yuan(E.remaining(b)):'';}navigate('repay',false);break;
        case 'saveBorrow':commit(calculate(),'借款已保存','loans');break;
        case 'saveRepay':{const r=calculate();modal('确认这笔还款','<p>还款与本金变化将记入账本。</p>'+pair('归还本金','¥'+money(r.event.repaidPrincipalCents))+pair('利息及费用','¥'+money(r.event.costCents)),()=>commit(r,'还款已记录','home'),'确认还款');break;}
        case 'saveIncome':commit(calculate(),'自有资金已记入','home');break;
        case 'saveBudget':commit(calculate(),'预算已保存','home');break;
        case 'saveBaseline':commit(calculate(),'月初本金已核对','home');break;
        case 'saveReconcile':commit(calculate(),'本金已核对','detail');break;
        case 'saveBills':commit(calculate(),'账单已更新','detail');break;
        case 'savePlan':commit(E.savePlan(state(),draft('simulate'),opts(draft('simulate'))),'方案已保存','simulate');break;
        case 'recordScenario':{const r=calculate();modal('这笔借贷已经发生？','<p>同时记入新借款和这笔还款。</p>'+pair('新增本金','¥'+money(r.event.borrowedPrincipalCents))+pair('归还本金','¥'+money(r.event.repaidPrincipalCents))+pair('本金净变化',signed(r.operationDeltaCents),tone(r.operationDeltaCents)),()=>commit(r,'借入与还款已同时记账','home'),'确认已发生');break;}
        case 'openPlan':{const p=state().plans.find(p=>p.id===d.id);if(!p||p.status==='recorded')break;drafts.simulate={...E.copy(p.input),planId:p.id,opId:'record-plan-'+p.id,date:on()};navigate('simulate',false);break;}
        case 'undo':{const r=E.undoLatest(state());modal('撤销最近一笔？','<p>'+esc(r.event.label)+'。撤销会保留原记录。</p>',()=>commit(r,'已撤销','records'),'撤销');break;}
        case 'eventDetail':{const x=state().events.find(x=>x.id===d.id);modal(x.label,'<p>'+x.date+'</p>'+pair('记录金额','¥'+money(x.amountCents))+pair('本金变化',x.principalDeltaCents==null?'待核对':signed(x.principalDeltaCents),tone(x.principalDeltaCents))+(x.costCents!=null?pair('利息及费用','¥'+money(x.costCents)):'')+pair('自有资金支出','¥'+money(x.cashUsedCents||0)),closeDialog,'知道了');break;}
        case 'demo':demoState=E.demo();drafts={};scroll={};navigate('home',false);break;
        case 'exitDemo':demoState=null;drafts={};scroll={};navigate('home',false);break;
        case 'export':exportText(E.exportBackup(state()));break;
        case 'exportRaw':exportText(store.raw);break;
        case 'import':if(native)location.href='shore://import';else{$('transferDetails')&&($('transferDetails').open=true);$('transfer')?.focus();toast('请粘贴备份文本');}break;
        case 'readText':prepareImport($('transfer').value);break;
        case 'copyBackup':{const text=$('transfer').value||E.exportBackup(state());if(native)native.copyText(text);else navigator.clipboard.writeText(text);toast('备份已复制');break;}
        case 'restoreLocal':{const count=store.count();if(!count)throw Error('暂无本地历史备份');$('confirmBody').innerHTML='<h2>本地历史备份</h2><p>选择版本，核对后恢复。</p>'+Array.from({length:Math.min(count,19)},(_,i)=>button('第 '+(i+1)+' 个历史版本','previewLocal','secondary full','data-offset="'+(i+1)+'" style="margin-bottom:9px"')).join('')+button('取消','closeDialog','ghost full');$('confirm').showModal();break;}
        case 'previewLocal':prepareImport(E.exportBackup(store.backup(Number(d.offset)).state));break;
        case 'restoreLegacy':prepareImport(E.exportBackup(store.legacy().state));break;
        case 'restoreImported':{const r=imported;if(!r)break;modal('恢复这本账本？','<p>当前账本保留在本地历史备份中。</p>',()=>{demoState=null;drafts={};scroll={};commit(r,'账本已恢复','home',true);},'确认恢复');break;}
        case 'mergeImported':{const r=E.mergeBackup(state(),imported.state);if(!r.changed){closeDialog();toast('账本已是最新');}else commit(r,'账本已合并','home');break;}
      }
    }catch(error){toast(error.message);}
  });
  window.addEventListener('hashchange',()=>{const route=alias(location.hash.slice(1)||'home');if(route!==page){scroll[page]=$('content').scrollTop;page=renderers[route]?route:'home';render();}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!$('confirm').open)rerenderKeep();});
  $('confirm').addEventListener('cancel',()=>{pending=null;});
  page=alias(location.hash.slice(1)||'home');if(!renderers[page])page='home';render();
  if(store.migrated&&!store.blocked)toast('旧账本已保留并升级，请核对各期账单');
})();
