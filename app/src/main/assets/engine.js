(function (root, factory) {
  const legacy = typeof module === 'object' ? require('./legacy-v3.js') : root.ShoreLegacy;
  const api = factory(legacy);
  if (typeof module === 'object') module.exports = api; else root.Shore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Legacy) {
  'use strict';
  const VERSION = 4, FORMAT = 'cn.shore.ledger', MAX = 100000000000, MAX_BYTES = 32 * 1024 * 1024;
  const copy = x => JSON.parse(JSON.stringify(x));
  const sum = (xs, fn = x => x) => xs.reduce((n, x) => n + fn(x), 0);
  const uid = () => 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  const stamp = () => new Date().toISOString();
  const canonical = x => JSON.stringify(sort(x));
  function sort(x) { if (Array.isArray(x)) return x.map(sort); if (x && typeof x === 'object') return Object.keys(x).sort().reduce((o, k) => { o[k] = sort(x[k]); return o; }, {}); return x; }
  function fail(message, code = 'INVALID') { const e = Error(message); e.code = code; throw e; }
  function money(v, signed = false) { if (!Number.isSafeInteger(v) || Math.abs(v) > MAX || (!signed && v < 0)) fail('金额无效'); return v; }
  function cents(value) {
    const s = String(value ?? '').trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s)) fail('金额需为不超过两位小数的正数');
    const [a, b = ''] = s.split('.'); return money(Number(a) * 100 + Number(b.padEnd(2, '0')));
  }
  function positive(v) { const n = cents(v); if (!n) fail('金额必须大于 0'); return n; }
  function integer(v, min, max, label) { const n = Number(v); if (!Number.isInteger(n) || n < min || n > max) fail(label + '需在 ' + min + '～' + max + ' 之间'); return n; }
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d));
    return y >= 2000 && y <= 2200 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  }
  function date(s) { if (!validDate(s)) fail('日期无效'); return s; }
  function today() {
    try { const a = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); return ['year', 'month', 'day'].map(k => a.find(x => x.type === k).value).join('-'); }
    catch (_) { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10); }
  }
  const monthKey = d => d.slice(0, 7);
  function addMonths(s, n) { date(s); const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0') + '-' + String(Math.min(d, last)).padStart(2, '0'); }
  const monthLabel = s => Number(s.slice(0, 4)) + '年' + Number(s.slice(5, 7)) + '月';
  const remaining = b => Math.max(0, b.amountCents - b.paidCents - b.voidedCents);
  const principal = s => money(sum(s.accounts, a => a.principalCents));
  const payable = a => a.kind === 'friend' && !a.bills.length ? a.principalCents : sum(a.bills, remaining);
  const totalPayable = s => sum(s.accounts, payable);
  function blank(on = today()) {
    date(on); return { format: FORMAT, schemaVersion: VERSION, id: uid(), mode: 'personal', currency: 'CNY', timeZone: 'Asia/Shanghai', createdAt: stamp(), updatedAt: stamp(), revision: 0, trackingSince: on,
      budget: { monthlyCents: 0, incomeCents: 0, livingCents: 0, reserveCents: 0, cashCents: 0, usageOverrides: {} }, accounts: [], events: [], plans: [], baselines: [], extensions: {} };
  }
  function billRows(input, prefix = uid()) {
    const n = integer(input.periods, 1, 600, '剩余期数'), first = date(input.firstDate), value = positive(input.monthlyAmount);
    return Array.from({ length: n }, (_, i) => ({ id: prefix + '-b' + i, dueDate: addMonths(first, i), amountCents: value, principalCents: null, principalSource: 'unknown', paidCents: 0, paidPrincipalCents: 0, voidedCents: 0 }));
  }
  function buildAccount(f, on = today()) {
    const p = positive(f.principal), kind = f.kind === 'friend' ? 'friend' : 'platform';
    const name = String(f.name || f.platform || '').trim().slice(0, 80); if (!name) fail('请填写借款名称');
    const id = f.id || uid(), isNew = f.entryType === 'new', balanceDate = date(f.balanceDate || on);
    if (balanceDate > on) fail('实际余额日期不能晚于今天');
    let bills;
    if (kind === 'friend') bills = f.firstDate ? [{ id: id + '-b0', dueDate: date(f.firstDate), amountCents: p, principalCents: p, principalSource: 'actual', paidCents: 0, paidPrincipalCents: 0, voidedCents: 0 }] : [];
    else if (Array.isArray(f.bills)) bills = f.bills.map((b, i) => ({ id: b.id || id + '-b' + i, dueDate: date(b.dueDate), amountCents: b.amountCents !== undefined ? money(b.amountCents) : positive(b.amount), principalCents: b.principalCents !== undefined ? b.principalCents : (b.principal === '' || b.principal == null ? null : cents(b.principal)), principalSource: (b.principalCents != null || (b.principal !== '' && b.principal != null)) ? 'actual' : 'unknown', paidCents: 0, paidPrincipalCents: 0, voidedCents: 0 }));
    else bills = billRows(f, id);
    if (kind === 'platform' && (!bills.length || sum(bills, b => b.amountCents) < p)) fail('各期账单合计不能小于剩余本金');
    if (bills.length && bills.every(b => b.principalCents != null) && sum(bills, b => b.principalCents) !== p) fail('各期本金合计需等于剩余本金');
    const received = isNew ? (f.received === '' || f.received == null ? p : cents(f.received)) : cents(f.unusedFunds || 0);
    if (received > p) fail('可用借入资金不能超过本金');
    return { id, name, platform: String(f.platform || name).slice(0, 80), kind, principalCents: p, openingPrincipalCents: p, availableCents: received, trackingFrom: balanceDate, balanceAsOf: balanceDate, entryType: isNew ? 'new' : 'existing', allowEarly: !!f.allowEarly, scheduleStatus: 'confirmed', bills, revision: 1, updatedAt: stamp() };
  }
  function account(s, id) { const a = s.accounts.find(x => x.id === id); if (!a) fail('借款记录不存在'); return a; }
  function usedBudget(s, month) {
    const override = s.budget.usageOverrides[month];
    if (override != null) return override;
    return sum(s.events.filter(e => monthKey(e.date) === month), e => e.cashUsedCents || 0);
  }
  function transaction(s, type, label, change, options = {}) {
    const opId = options.opId || uid(), existing = s.events.find(e => e.opId === opId);
    if (existing) return { state: copy(s), event: copy(existing), duplicate: true };
    const on = date(options.date || today()), now = options.now || today(); if (on > now) fail('实际记录不能使用未来日期');
    const n = copy(s), fields = change(n, on) || {};
    const ids = new Set([...s.accounts.map(a => a.id), ...n.accounts.map(a => a.id)]), changes = [];
    for (const id of ids) { const before = s.accounts.find(a => a.id === id), after = n.accounts.find(a => a.id === id); if (canonical(before || null) !== canonical(after || null)) changes.push({ id, before: before ? copy(before) : null }); }
    const undo = { accounts: changes };
    if (canonical(s.budget) !== canonical(n.budget)) undo.budget = copy(s.budget);
    if (canonical(s.baselines) !== canonical(n.baselines)) undo.baselines = copy(s.baselines);
    if (canonical(s.plans) !== canonical(n.plans)) {
      const planIds = new Set([...s.plans.map(p => p.id), ...n.plans.map(p => p.id)]);
      undo.plans = [...planIds].filter(id => canonical(s.plans.find(p => p.id === id) || null) !== canonical(n.plans.find(p => p.id === id) || null)).map(id => ({ id, before: copy(s.plans.find(p => p.id === id) || null) }));
    }
    const e = { id: uid(), opId, type, label, date: on, recordedAt: stamp(), amountCents: 0, principalDeltaCents: 0, cashUsedCents: 0, ...fields, undo };
    n.events.push(e); n.revision++; n.updatedAt = stamp(); validate(n);
    return { state: n, event: e, duplicate: false };
  }
  function addAccount(s, f, options = {}) {
    const on = options.date || today(), a = buildAccount(f, options.now || on);
    return transaction(s, a.entryType === 'new' ? 'borrow' : 'opening', (a.entryType === 'new' ? '新增借入 · ' : '已有借款 · ') + a.name, n => {
      if (n.accounts.some(x => x.id === a.id)) fail('借款标识重复'); n.accounts.push(a);
      return { accountId: a.id, amountCents: a.principalCents, principalDeltaCents: a.entryType === 'new' ? a.principalCents : 0, borrowedPrincipalCents: a.entryType === 'new' ? a.principalCents : 0, createdAccount: copy(a) };
    }, options);
  }
  function principalForPayment(a, value, afterValue, settlement) {
    if (a.kind === 'friend') { if (value > a.principalCents) fail('归还金额超过人情债'); return value; }
    if (afterValue !== '' && afterValue != null) {
      const after = cents(afterValue), p = a.principalCents - after;
      if (p < 0 || p > value) fail('还后本金与还款金额不一致'); if (settlement && after !== 0) fail('提前结清后的本金应为 0'); return p;
    }
    if (settlement) fail('请填写平台确认的还后本金');
    let left = value, p = 0;
    for (const b of [...a.bills].sort((x, y) => x.dueDate.localeCompare(y.dueDate))) {
      const r = remaining(b); if (!r) continue; const pay = Math.min(left, r);
      if (pay !== r || b.principalCents == null || b.principalSource !== 'actual' || b.paidPrincipalCents == null) fail('请核对还款后的剩余本金', 'NEEDS_PRINCIPAL');
      p += b.principalCents - b.paidPrincipalCents; left -= pay; if (!left) break;
    }
    if (left) fail('请填写还后本金及平台结清报价');
    if (p > a.principalCents) fail('账单本金需要核对'); return p;
  }
  function payInto(n, f, on) {
    const a = account(n, f.accountId), value = positive(f.amount), p = principalForPayment(a, value, f.afterPrincipal, !!f.settlement);
    const source = f.source || 'income'; let cashUsed = 0, returned = 0;
    if (source === 'income') {
      returned = a.kind === 'friend' ? Math.min(a.availableCents, value) : 0; cashUsed = value - returned;
      if (cashUsed > n.budget.cashCents) fail('可用自有资金不足，请先记录收入');
      n.budget.cashCents -= cashUsed; a.availableCents -= returned;
    } else if (source === 'loan' || source === 'friend') {
      const fund = account(n, f.fundId);
      if (fund.id === a.id || fund.availableCents < value || (source === 'friend' ? fund.kind !== 'friend' : fund.kind !== 'platform')) fail('借入资金来源或可用金额不正确');
      fund.availableCents -= value; fund.revision++; fund.updatedAt = stamp();
    } else fail('请选择还款来源');
    let left = value; const allocations = [], priorPrincipal = new Map(a.bills.map(b => [b.id, b.paidPrincipalCents]));
    for (const b of [...a.bills].sort((x, y) => x.dueDate.localeCompare(y.dueDate))) {
      const r = remaining(b); if (!r || !left) continue; const paid = Math.min(r, left); b.paidCents += paid; left -= paid; allocations.push({ billId: b.id, amountCents: paid });
      if (b.principalCents != null && b.principalSource === 'actual' && paid === r && b.paidPrincipalCents != null) b.paidPrincipalCents = b.principalCents;
      else b.paidPrincipalCents = null;
    }
    if (left && a.kind !== 'friend' && !f.settlement) fail('金额超出账单，请核对结清报价');
    if (allocations.length === 1) { const b = a.bills.find(b => b.id === allocations[0].billId), previous = priorPrincipal.get(b.id); if (previous != null) { b.paidPrincipalCents = previous + p; if (remaining(b) === 0) { b.principalCents = b.paidPrincipalCents; b.principalSource = 'actual'; } } }
    let waived = 0;
    if (f.settlement) { for (const b of a.bills) { const r = remaining(b); b.voidedCents += r; waived += r; } }
    a.principalCents -= p; a.balanceAsOf = on; a.updatedAt = stamp(); a.revision++;
    if (a.kind === 'platform' && sum(a.bills, remaining) < a.principalCents) a.scheduleStatus = 'needs-review';
    const key = monthKey(on); if (n.budget.usageOverrides[key] != null) n.budget.usageOverrides[key] += cashUsed;
    return { accountId: a.id, amountCents: value, repaidPrincipalCents: p, principalDeltaCents: -p, costCents: value - p, source, fundId: f.fundId || null, cashUsedCents: cashUsed, returnedUnusedCents: returned, waivedCents: waived, allocations };
  }
  function repay(s, f, options = {}) { const a = account(s, f.accountId); return transaction(s, 'repayment', '还款 · ' + a.name, (n, on) => payInto(n, f, on), options); }
  function recordIncome(s, f, options = {}) { return transaction(s, 'income', '自有资金到账', n => { const value = positive(f.amount); n.budget.cashCents = money(n.budget.cashCents + value); return { amountCents: value }; }, options); }
  function updateBudget(s, f, options = {}) { return transaction(s, 'budget', '调整还款预算', n => { for (const [k, v] of Object.entries(f)) if (['monthlyCents', 'incomeCents', 'livingCents', 'reserveCents'].includes(k)) n.budget[k] = cents(v); }, options); }
  function setBaseline(s, f, options = {}) { const key = f.month || monthKey(options.date || today()); if (!/^\d{4}-\d{2}$/.test(key) || !validDate(key + '-01')) fail('月份无效'); return transaction(s, 'baseline', '核对月初本金', n => { n.baselines = n.baselines.filter(x => x.month !== key); n.baselines.push({ id: uid(), month: key, principalCents: cents(f.amount), coverageAccountIds: n.accounts.map(a => a.id), recordedAt: stamp(), source: 'user' }); }, options); }
  function reconcile(s, f, options = {}) { const a = account(s, f.accountId); return transaction(s, 'reconcile', '核对本金 · ' + a.name, (n, on) => { const x = account(n, a.id), value = cents(f.principal), delta = value - x.principalCents; x.principalCents = value; x.balanceAsOf = on; x.revision++; x.updatedAt = stamp(); if (x.kind === 'platform' && payable(x) < value) x.scheduleStatus = 'needs-review'; return { accountId: x.id, amountCents: Math.abs(delta), principalDeltaCents: delta }; }, options); }
  function updateBills(s, f, options = {}) {
    const a = account(s, f.accountId);
    return transaction(s, 'bills', '校对账单 · ' + a.name, n => {
      const x = account(n, a.id);
      if (!Array.isArray(f.bills) || f.bills.length > 600) fail('账单数量无效');
      const old = new Map(x.bills.map(b => [b.id, b]));
      const next = f.bills.map((b, i) => { const before = old.get(b.id); const amount = b.amountCents != null ? money(b.amountCents) : positive(b.amount), pp = b.principal === '' || b.principal == null ? null : cents(b.principal); if (before && amount < before.paidCents + before.voidedCents) fail('账单金额不能小于已还金额'); return { ...(before || { id: b.id || uid(), paidCents: 0, paidPrincipalCents: 0, voidedCents: 0 }), dueDate: date(b.dueDate), amountCents: amount, principalCents: pp, principalSource: pp == null ? 'unknown' : 'actual' }; });
      const retained = new Set(next.map(b => b.id)); for (const b of x.bills) if (!retained.has(b.id) && (b.paidCents || b.voidedCents)) next.push(b);
      if (sum(next, remaining) < x.principalCents) fail('剩余账单合计不能小于本金');
      const unpaid = next.filter(b => remaining(b)); if (unpaid.every(b => b.principalCents != null && b.paidPrincipalCents != null) && sum(unpaid, b => b.principalCents - b.paidPrincipalCents) !== x.principalCents) fail('各期剩余本金合计不一致');
      x.bills = next; x.scheduleStatus = 'confirmed'; x.revision++; x.updatedAt = stamp();
      return { accountId: x.id };
    }, options);
  }
  function monthlyStats(s, on = today()) {
    const key = monthKey(date(on)), first = key + '-01', events = s.events.filter(e => monthKey(e.date) === key && e.date <= on);
    const snapshot = [...s.baselines].reverse().find(x => x.month === key);
    const unknown = events.some(e => e.principalDeltaCents == null), delta = sum(events, e => e.principalDeltaCents || 0);
    const late = s.accounts.filter(a => a.entryType === 'existing' && a.trackingFrom > first);
    const covered = snapshot && late.every(a => snapshot.coverageAccountIds.includes(a.id));
    const complete = !!covered || (!unknown && s.trackingSince <= first && !late.length);
    const current = principal(s), unresolved = unknown && !covered, opening = covered ? snapshot.principalCents : unresolved ? null : money(current - delta);
    return { month: key, currentCents: current, openingCents: opening, deltaCents: unresolved ? null : covered ? current - opening : delta, complete, unknown: unresolved, since: s.trackingSince,
      repaidPrincipalCents: sum(events, e => e.repaidPrincipalCents || 0), borrowedPrincipalCents: sum(events, e => e.borrowedPrincipalCents || 0), paidCents: sum(events, e => ['repayment', 'refinance'].includes(e.type) ? e.amountCents : e.type === 'reversal' && ['repayment', 'refinance'].includes(e.reversesType) ? -e.amountCents : 0),
      costCents: sum(events, e => e.costCents || 0), adjustmentsCents: sum(events.filter(e => e.type === 'reconcile'), e => e.principalDeltaCents || 0), ownPaidCents: usedBudget(s, key) };
  }
  function projectedBills(a) {
    if (a.kind === 'friend' && !a.bills.length) return { bills: [], uncertain: false, unplanned: 0 };
    const bs = a.bills.filter(b => remaining(b) > 0).map(copy), known = bs.filter(b => b.principalCents != null && b.paidPrincipalCents != null);
    let knownP = sum(known, b => Math.max(0, b.principalCents - b.paidPrincipalCents)), unknown = bs.filter(b => !known.includes(b)), uncertain = a.scheduleStatus !== 'confirmed';
    if (knownP > a.principalCents || (unknown.length === 0 && knownP !== a.principalCents)) { unknown = bs; knownP = 0; uncertain = true; }
    let p = a.principalCents - knownP, weight = sum(unknown, remaining);
    for (const b of bs) {
      if (unknown.includes(b)) { const r = remaining(b), assigned = weight ? Math.min(r, Math.round(p * r / weight)) : 0; b.projectedPrincipal = assigned; p -= assigned; weight -= r; b.estimated = true; uncertain = true; }
      else { b.projectedPrincipal = Math.max(0, b.principalCents - b.paidPrincipalCents); b.estimated = b.principalSource !== 'actual'; uncertain ||= b.estimated; }
      b.left = remaining(b);
    }
    return { bills: bs, uncertain, unplanned: Math.max(0, p) };
  }
  function forecast(s, on = today()) {
    const todayMonth = monthKey(date(on)), accounts = s.accounts.map(a => ({ ...copy(a), projection: projectedBills(a) }));
    const rows = []; let gap = 0, uncertain = false, unplanned = 0;
    for (const a of accounts) { uncertain ||= a.projection.uncertain; if (a.kind !== 'friend') unplanned += a.projection.unplanned; }
    for (let m = 0; m < 600; m++) {
      if (!accounts.some(a => a.principalCents > 0 || a.projection.bills.some(b => b.left > 0))) break;
      const key = monthKey(addMonths(todayMonth + '-01', m)), details = [];
      let required = 0, pPaid = 0, cost = 0;
      const limit = Math.max(0, s.budget.monthlyCents - (m === 0 ? usedBudget(s, todayMonth) : 0));
      function pay(a, b, value, extra = false) {
        const p = value === b.left ? b.projectedPrincipal : Math.min(b.projectedPrincipal, Math.round(b.projectedPrincipal * value / b.left));
        b.left -= value; b.projectedPrincipal -= p; a.principalCents = Math.max(0, a.principalCents - p); pPaid += p; cost += value - p;
        details.push({ accountId: a.id, name: a.name, billId: b.id, dueDate: b.dueDate, amountCents: value, principalCents: p, costCents: value - p, estimated: b.estimated, extra });
      }
      for (const a of accounts) for (const b of a.projection.bills) if (b.left && monthKey(b.dueDate) <= key) { const value = b.left; required += value; pay(a, b, value); }
      const monthGap = Math.max(0, required - limit); gap = Math.max(gap, monthGap); let extra = Math.max(0, limit - required);
      for (const a of accounts.filter(a => a.allowEarly)) for (const b of a.projection.bills) { if (!extra) break; const value = Math.min(extra, b.left); if (value) { pay(a, b, value, true); extra -= value; } }
      for (const a of accounts.filter(a => a.kind === 'friend' && !a.bills.length)) { const value = Math.min(extra, a.principalCents); if (!value) continue; a.principalCents -= value; extra -= value; pPaid += value; details.push({ accountId: a.id, name: a.name, billId: null, dueDate: key + '-28', amountCents: value, principalCents: value, costCents: 0, extra: true, estimated: false }); }
      const left = sum(accounts, a => a.principalCents), payTotal = sum(details, d => d.amountCents);
      rows.push({ month: key, amountCents: payTotal, requiredCents: required, principalCents: pPaid, costCents: cost, gapCents: monthGap, principalLeftCents: left, details });
      if (!payTotal && !accounts.some(a => a.projection.bills.some(b => b.left))) break;
    }
    const complete = !accounts.some(a => a.principalCents || a.projection.bills.some(b => b.left)), feasible = complete && !gap && !unplanned;
    const last = rows.length ? rows[rows.length - 1].month : todayMonth;
    return { rows, complete, feasible, gapCents: gap, unplannedCents: unplanned, estimatedPrincipal: uncertain, payoffMonth: feasible ? last : null, months: rows.length, costCents: sum(rows, r => r.costCents), currentMonthPrincipalCents: rows[0]?.principalCents || 0 };
  }
  function scenario(s, f, options = {}) {
    const on = options.date || today(), newId = f.newAccountId || uid();
    let operationId = options.opId;
    if (f.planId) {
      const base = 'record-plan-' + f.planId, attempts = s.events.filter(e => e.planId === f.planId || e.opId === base), last = attempts[attempts.length - 1];
      operationId = last ? (s.events.some(e => e.type === 'reversal' && e.reversesId === last.id) ? base + '-retry-' + last.id : last.opId) : base;
    }
    const newAccount = buildAccount({ ...f, id: newId, entryType: 'new', kind: 'platform', name: f.newName || '试算借款', platform: f.newPlatform || '其他', principal: f.borrowPrincipal, received: f.received, monthlyAmount: f.newMonthlyAmount, periods: f.newPeriods, firstDate: f.newFirstDate }, options.now || on);
    const result = transaction(s, 'refinance', '借贷还款 · ' + account(s, f.accountId).name, (n, date) => {
      n.accounts.push(newAccount);
      const payment = payInto(n, { accountId: f.accountId, amount: f.payment, afterPrincipal: f.afterPrincipal, settlement: !!f.settlement, source: 'loan', fundId: newId }, date);
      if (f.planId) { const plan = n.plans.find(p => p.id === f.planId); if (plan) { if (plan.status === 'recorded') fail('这个方案已执行'); plan.status = 'recorded'; plan.recordedAt = stamp(); } }
      return { ...payment, principalDeltaCents: newAccount.principalCents - payment.repaidPrincipalCents, borrowedPrincipalCents: newAccount.principalCents, planId: f.planId || null, newAccountId: newId, createdAccount: copy(newAccount), originationCostCents: newAccount.principalCents - (f.received === '' || f.received == null ? newAccount.principalCents : cents(f.received)) };
    }, { ...options, opId: operationId });
    const before = forecast(s, on), after = forecast(result.state, on), stats = monthlyStats(s, on), afterP = principal(result.state);
    return { ...result, before, after, operationDeltaCents: result.event.principalDeltaCents, baselineMonthEndCents: principal(s) - before.currentMonthPrincipalCents, monthEndCents: afterP - after.currentMonthPrincipalCents,
      monthDeltaCents: stats.unknown ? null : afterP - after.currentMonthPrincipalCents - stats.openingCents, baselineMonthDeltaCents: stats.unknown ? null : principal(s) - before.currentMonthPrincipalCents - stats.openingCents, monthlyComplete: stats.complete, monthlyUnknown: stats.unknown,
      newCostCents: sum(newAccount.bills, b => b.amountCents) - newAccount.principalCents + (newAccount.principalCents - (f.received === '' || f.received == null ? newAccount.principalCents : cents(f.received))), delayMonths: before.feasible && after.feasible ? after.months - before.months : null };
  }
  function savePlan(s, f, options = {}) {
    scenario(s, f, options);
    const n = copy(s), id = f.planId || uid(), existing = n.plans.find(p => p.id === id);
    if (existing?.status === 'recorded') fail('已执行方案不能修改');
    const plan = { id, name: String(f.planName || f.newName || '借贷方案').slice(0, 80), input: copy(f), status: 'draft', updatedAt: stamp(), revision: (existing?.revision || 0) + 1 };
    if (existing) n.plans[n.plans.indexOf(existing)] = plan; else n.plans.push(plan);
    n.revision++; n.updatedAt = stamp(); validate(n); return { state: n, plan };
  }
  function undoLatest(s, options = {}) {
    const reversed = new Set(s.events.filter(e => e.type === 'reversal').map(e => e.reversesId));
    const target = [...s.events].reverse().find(e => e.undo && !reversed.has(e.id) && e.type !== 'reversal');
    if (!target) fail('没有可撤销的记录');
    return transaction(s, 'reversal', '撤销 · ' + target.label, n => {
      for (const c of target.undo.accounts) { const i = n.accounts.findIndex(a => a.id === c.id); if (c.before) { const restored = copy(c.before); restored.revision = (i >= 0 ? n.accounts[i].revision : restored.revision) + 1; restored.updatedAt = stamp(); if (i < 0) n.accounts.push(restored); else n.accounts[i] = restored; } else if (i >= 0) n.accounts.splice(i, 1); }
      if (target.undo.budget) n.budget = copy(target.undo.budget);
      if (target.undo.baselines) n.baselines = copy(target.undo.baselines);
      if (target.undo.plans) for (const p of target.undo.plans) { const i = n.plans.findIndex(x => x.id === p.id); if (p.before) { if (i >= 0) n.plans[i] = copy(p.before); else n.plans.push(copy(p.before)); } else if (i >= 0) n.plans.splice(i, 1); }
      return { reversesId: target.id, reversesType: target.type, amountCents: target.amountCents, principalDeltaCents: target.principalDeltaCents == null ? null : -target.principalDeltaCents, cashUsedCents: -(target.cashUsedCents || 0), repaidPrincipalCents: -(target.repaidPrincipalCents || 0), borrowedPrincipalCents: -(target.borrowedPrincipalCents || 0), costCents: -(target.costCents || 0) };
    }, options);
  }
  function validate(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('不是有效账本');
    if (raw.schemaVersion > VERSION) fail('此备份来自较新版本，请保留原文件并升级应用', 'FUTURE_VERSION');
    if (raw.format !== FORMAT || raw.schemaVersion !== VERSION) fail('账本格式或版本不支持');
    const s = copy(raw), ids = new Set();
    function id(v) { if (typeof v !== 'string' || !v || v.length > 256 || ids.has(v)) fail('记录标识重复或无效'); ids.add(v); }
    id(s.id); if (s.currency !== 'CNY' || s.timeZone !== 'Asia/Shanghai' || !['personal', 'demo'].includes(s.mode)) fail('币种、时区或账本类型无效'); date(s.trackingSince); integer(s.revision, 0, Number.MAX_SAFE_INTEGER, '版本');
    if (!Array.isArray(s.accounts) || s.accounts.length > 2000 || !Array.isArray(s.events) || s.events.length > 100000 || !Array.isArray(s.plans) || s.plans.length > 2000 || !Array.isArray(s.baselines)) fail('账本记录数量无效');
    if (!s.budget || !s.budget.usageOverrides || typeof s.budget.usageOverrides !== 'object') fail('预算格式无效');
    for (const k of ['monthlyCents', 'incomeCents', 'livingCents', 'reserveCents', 'cashCents']) money(s.budget[k]); for (const v of Object.values(s.budget.usageOverrides)) money(v);
    for (const a of s.accounts) {
      id(a.id); if (typeof a.name !== 'string' || !a.name || a.name.length > 80 || !['platform', 'friend'].includes(a.kind) || !['existing', 'new'].includes(a.entryType) || !['confirmed', 'estimated', 'needs-review'].includes(a.scheduleStatus)) fail('借款字段无效');
      for (const k of ['principalCents', 'openingPrincipalCents', 'availableCents']) money(a[k]); date(a.trackingFrom); date(a.balanceAsOf); integer(a.revision, 1, Number.MAX_SAFE_INTEGER, '借款版本'); if (typeof a.allowEarly !== 'boolean' || !Array.isArray(a.bills) || a.bills.length > 1200) fail('账单格式无效');
      for (const b of a.bills) { id(b.id); date(b.dueDate); for (const k of ['amountCents', 'paidCents', 'voidedCents']) money(b[k]); if (b.paidCents + b.voidedCents > b.amountCents) fail('已还金额超过账单'); if (b.principalCents != null) { money(b.principalCents); if (b.principalCents > b.amountCents) fail('账单本金超过金额'); } if (b.paidPrincipalCents != null) { money(b.paidPrincipalCents); if (b.paidPrincipalCents > b.paidCents) fail('已还本金超过还款'); } if (!['actual', 'estimated', 'unknown'].includes(b.principalSource)) fail('本金来源无效'); }
      if (a.kind === 'platform' && a.scheduleStatus === 'confirmed' && sum(a.bills, remaining) < a.principalCents) fail('剩余账单不足以覆盖本金');
    }
    const opIds = new Set();
    for (const e of s.events) { id(e.id); date(e.date); if (typeof e.type !== 'string' || typeof e.label !== 'string' || typeof e.opId !== 'string' || !e.opId || opIds.has(e.opId)) fail('流水标识或格式无效'); opIds.add(e.opId); money(e.amountCents); if (e.principalDeltaCents != null) money(e.principalDeltaCents, true); for (const k of ['cashUsedCents', 'repaidPrincipalCents', 'borrowedPrincipalCents', 'costCents']) if (e[k] != null) money(e[k], true); }
    for (const p of s.plans) { id(p.id); if (!['draft', 'recorded'].includes(p.status) || !p.input || typeof p.name !== 'string') fail('方案格式无效'); }
    for (const b of s.baselines) { id(b.id); if (!validDate(b.month + '-01') || !Array.isArray(b.coverageAccountIds)) fail('月初余额格式无效'); money(b.principalCents); }
    principal(s); return s;
  }
  function migrateV3(raw, on = today()) {
    const old = Legacy.validate(raw), n = blank(old.asOf); n.mode = old.mode; n.id = 'legacy-' + sha256(canonical(raw)).slice(0, 32);
    n.budget = { monthlyCents: old.budget, incomeCents: old.income, livingCents: old.living, reserveCents: old.reserve, cashCents: old.cash, usageOverrides: { [monthKey(old.asOf)]: old.used } };
    for (const l of old.loans) {
      const f = Legacy.project({ ...copy(old), loans: [copy(l)], used: 0 }, true);
      const bills = f.rows.flatMap((r, i) => r.details.map((d, j) => ({ id: 'legacy-bill-' + l.id + '-' + i + '-' + j, dueDate: Legacy.date(old, i, d.day), amountCents: d.pay, principalCents: d.p, principalSource: 'estimated', paidCents: 0, paidPrincipalCents: 0, voidedCents: 0 })));
      n.accounts.push({ id: l.id, name: l.name, platform: l.name, kind: 'platform', principalCents: l.p, openingPrincipalCents: l.p, availableCents: l.available, trackingFrom: old.asOf, balanceAsOf: on, entryType: 'existing', allowEarly: l.early, scheduleStatus: 'estimated', bills, revision: 1, updatedAt: stamp(), legacyRecord: copy(l) });
    }
    for (const f of old.friends) { const p = f.amount - f.paid; n.accounts.push({ id: f.id, name: f.name, platform: '亲友借款', kind: 'friend', principalCents: p, openingPrincipalCents: p, availableCents: f.available, trackingFrom: old.asOf, balanceAsOf: on, entryType: 'existing', allowEarly: true, scheduleStatus: 'confirmed', bills: f.due && p ? [{ id: 'legacy-friend-bill-' + f.id, dueDate: f.due, amountCents: p, principalCents: p, principalSource: 'actual', paidCents: 0, paidPrincipalCents: 0, voidedCents: 0 }] : [], revision: 1, updatedAt: stamp(), legacyRecord: copy(f) }); }
    const seen = new Set(n.accounts.map(a => a.id));
    for (let i = 0; i < old.events.length; i++) {
      const e = old.events[i]; let delta = 0, type = e.type;
      if (type === 'repay') { type = 'repayment'; delta = Number.isSafeInteger(e.p) ? (e.borrowed || 0) + e.humanDelta - e.p : null; }
      else if (type === 'borrow') delta = e.borrowed || e.amount;
      else if (type === 'support' || type === 'humanpay') delta = e.humanDelta;
      let id = e.id; if (seen.has(id)) id = 'legacy-event-' + i + '-' + e.id; seen.add(id);
      n.events.push({ id, opId: 'legacy-op-' + i + '-' + e.id, type, label: e.label, date: validDate(e.date) ? e.date : old.asOf, recordedAt: stamp(), amountCents: e.amount, principalDeltaCents: delta, cashUsedCents: e.source === 'income' ? e.amount : 0, repaidPrincipalCents: e.p || (e.type === 'humanpay' ? e.amount : 0), borrowedPrincipalCents: e.borrowed || (e.type === 'support' ? e.amount : 0), costCents: e.p == null ? 0 : e.amount - e.p, legacyRecord: copy(e) });
    }
    n.extensions.legacyV3 = { migratedAt: stamp(), original: copy(raw) }; return validate(n);
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function sha256(text) {
    const original = utf8(text), length = original.length * 8, data = new Uint8Array(Math.ceil((original.length + 9) / 64) * 64); data.set(original); data[original.length] = 128; new DataView(data.buffer).setUint32(data.length - 4, length, false);
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], R = (x, n) => x >>> n | x << (32 - n);
    for (let off = 0; off < data.length; off += 64) { const w = []; for (let i = 0; i < 16; i++) w[i] = data[off+i*4]<<24|data[off+i*4+1]<<16|data[off+i*4+2]<<8|data[off+i*4+3]; for (let i = 16; i < 64; i++) { const a = w[i-15], b = w[i-2]; w[i] = (w[i-16]+(R(a,7)^R(a,18)^a>>>3)+w[i-7]+(R(b,17)^R(b,19)^b>>>10))|0; } let [a,b,c,d,e,f,g,h] = H; for (let i=0;i<64;i++) { const t=(h+(R(e,6)^R(e,11)^R(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0, u=((R(a,2)^R(a,13)^R(a,22))+((a&b)^(a&c)^(b&c)))|0; h=g;g=f;f=e;e=(d+t)|0;d=c;c=b;b=a;a=(t+u)|0; } [a,b,c,d,e,f,g,h].forEach((v,i)=>H[i]=(H[i]+v)|0); }
    return H.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
  }
  function exportBackup(s) { validate(s); const envelope = { format: 'cn.shore.backup', backupVersion: 1, schemaVersion: VERSION, exportedAt: stamp(), ledgerId: s.id, checksum: { algorithm: 'sha256', value: sha256(canonical(s)) }, data: copy(s) }; return JSON.stringify(envelope); }
  function load(raw, on = today()) {
    let value = raw;
    if (typeof value === 'string') { if (utf8(value).length > MAX_BYTES) fail('备份超过 32 MB'); value = JSON.parse(value.replace(/^\uFEFF/, '')); }
    if (value?.format === 'cn.shore.backup') { if (value.backupVersion !== 1 || value.checksum?.algorithm !== 'sha256') fail('备份格式需要更新应用'); if (sha256(canonical(value.data)) !== value.checksum.value) fail('备份校验失败，请保留原文件'); if (value.ledgerId !== value.data?.id || value.schemaVersion !== value.data?.schemaVersion) fail('备份信息不一致'); value = value.data; }
    if (value?.version === 3) return { state: migrateV3(value, on), migrated: true, fromVersion: 3 };
    return { state: validate(value), migrated: false, fromVersion: value?.schemaVersion };
  }
  function mergeBackup(current, incoming) {
    const next = load(incoming).state; validate(current); if (next.id !== current.id) fail('这是另一份账本，请选择整本恢复');
    const a = new Map(current.events.map(e => [e.id, e])), b = new Map(next.events.map(e => [e.id, e]));
    for (const [id, e] of a) if (b.has(id) && canonical(e) !== canonical(b.get(id))) fail('相同流水存在冲突，请保留两份备份');
    if (canonical(current) === canonical(next)) return { state: copy(current), changed: false };
    // Saving a plan changes the revision without appending a financial event.
    // Event inclusion alone therefore cannot establish that a backup is a descendant.
    function includesState(older, newer) {
      const prefix = older.events.every((e, i) => newer.events[i] && canonical(e) === canonical(newer.events[i]));
      const plans = older.plans.every(p => newer.plans.some(q => q.id === p.id && canonical(q) === canonical(p)));
      const mutable = new Set(['revision','updatedAt','accounts','budget','events','plans','baselines']);
      const metadata = Object.keys(older).every(k => mutable.has(k) || canonical(older[k]) === canonical(newer[k] ?? null));
      const sameEvents = older.events.length === newer.events.length;
      const finances = !sameEvents || ['accounts','budget','baselines'].every(k => canonical(older[k]) === canonical(newer[k]));
      return prefix && plans && metadata && finances;
    }
    const aInB = includesState(current, next), bInA = includesState(next, current);
    if (aInB && next.revision > current.revision) return { state: next, changed: true };
    if (bInA && current.revision > next.revision) return { state: copy(current), changed: false };
    fail('两份账本包含不同修改，请分别保留后核对');
  }
  function demo(on = today()) {
    const first = monthKey(on) + '-01'; let s = blank(first); s.mode = 'demo'; s.budget = { monthlyCents: 600000, incomeCents: 1500000, livingCents: 600000, reserveCents: 300000, cashCents: 1200000, usageOverrides: {} };
    for (const x of [{ name: '借呗', principal: '39500', periods: 14, monthlyAmount: '3020', firstDate: addMonths(first.slice(0, 7) + '-01', 1).slice(0, 7) + '-10' }, { name: '京东金条', principal: '28500', periods: 24, monthlyAmount: '1350', firstDate: first.slice(0,7)+'-10' }, { name: '京东白条', principal: '12000', periods: 15, monthlyAmount: '850', firstDate: first.slice(0,7)+'-20' }, { name: '家人', principal: '10000', kind: 'friend', firstDate: '' }]) s = addAccount(s, { ...x, platform: x.name, entryType: 'existing', balanceDate: first }, { date: first, now: on }).state;
    const target = s.accounts[0]; s = repay(s, { accountId: target.id, amount: '3800', afterPrincipal: '36000', source: 'income' }, { date: first, now: on }).state;
    return s;
  }
  return { VERSION, FORMAT, MAX_BYTES, copy, sum, uid, canonical, cents, positive, date, validDate, today, monthKey, monthLabel, addMonths, remaining, principal, payable, totalPayable, blank, billRows, buildAccount, account, usedBudget, addAccount, repay, recordIncome, updateBudget, setBaseline, reconcile, updateBills, monthlyStats, forecast, scenario, savePlan, undoLatest, validate, migrateV3, sha256, exportBackup, load, mergeBackup, demo };
});
