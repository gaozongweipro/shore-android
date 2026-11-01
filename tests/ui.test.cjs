const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../app/src/main/assets/engine.js');

function setup(raw = '', saveOK = true) {
  const elements = {}, listeners = {}, windowListeners = {}, saved = [], owned = {};
  class Element {
    constructor(id) { this.id = id; this._html = ''; this.value = ''; this.scrollTop = 0; this.open = false; this.disabled = false; this.details = { open: false }; }
    set innerHTML(html) {
      this._html = html;
      if (this.id !== 'content' && this.id !== 'confirmBody') return;
      for (const id of owned[this.id] || []) delete elements[id];
      owned[this.id] = [];
      for (const m of html.matchAll(/\bid="([^"]+)"/g)) { elements[m[1]] = new Element(m[1]); owned[this.id].push(m[1]); }
      for (const m of html.matchAll(/<textarea[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g)) elements[m[1]].value = m[2];
    }
    get innerHTML() { return this._html; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    closest(selector) { return selector === 'details' ? this.details : null; }
    scrollIntoView() { this.revealed = true; }
  }
  for (const id of ['content', 'nav', 'toast', 'confirm', 'confirmBody']) elements[id] = new Element(id);
  const markup = fs.readFileSync('app/src/main/assets/index.html', 'utf8').match(/<nav id="nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  elements.nav.innerHTML = markup;
  const buttons = [...markup.matchAll(/data-go="([^"]+)"/g)].map(m => {
    const classes = new Set(), attrs = {};
    return { dataset: { go: m[1] }, classes, attrs, classList: { toggle(k, on) { on ? classes.add(k) : classes.delete(k); } }, setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; } };
  });
  elements.nav.querySelectorAll = () => buttons;
  const context = {
    Shore: E, console, TextEncoder, location: { hash: '' }, setTimeout: () => 1, clearTimeout() {}, navigator: {},
    ShoreNative: { loadState: () => raw, saveState: text => { if (saveOK) saved.push(text); return saveOK; }, copyText() {} },
    document: { getElementById: id => elements[id] || null, addEventListener(t, fn) { listeners[t] = fn; } },
    window: { addEventListener(t, fn) { windowListeners[t] = fn; }, scrollTo() { throw Error('The outer page must not scroll'); } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('app/src/main/assets/app.js', 'utf8'), context);
  return {
    elements, saved, context, buttons, markup,
    async click(dataset) {
      if (dataset.action && elements.submitAction?.disabled && elements.content.innerHTML.includes('data-action="' + dataset.action + '"')) return;
      await listeners.click({ target: { closest: () => ({ dataset }) } });
    },
    input(key, value, type = 'number') { listeners.input({ target: { dataset: { f: key }, value, type, tagName: 'INPUT' } }); },
    change(key, value) { listeners.change({ target: { dataset: { f: key }, value, tagName: 'SELECT' } }); },
    back(page) { context.location.hash = '#' + page; windowListeners.hashchange(); },
    html: () => elements.content.innerHTML
  };
}

test('主要页面正常渲染，未知路由回总览', async () => {
  const a = setup(JSON.stringify(E.demo()));
  for (const page of ['loans', 'calendar', 'plan', 'friends', 'history', 'settings', 'more', 'borrow', 'repay', 'income', 'support', 'home']) {
    await a.click({ go: page });
    assert.ok(a.html().length > 100, page);
    assert.ok(!a.html().includes('NaN'), page);
    assert.ok(!a.html().includes('class="sub"'), page);
  }
  a.back('unknown');
  assert.match(a.html(), /<h1>总览<\/h1>/);
});

test('借款表单空白时不报错，填写后可提交并保存', async () => {
  const a = setup();
  await a.click({ go: 'borrow' });
  assert.equal(a.elements.submitAction.disabled, true);
  assert.ok(!a.elements.borrowPreview.innerHTML.includes('class="error"'));
  a.input('amount', '1000'); a.input('interest', '10');
  assert.equal(a.elements.submitAction.disabled, false);
  await a.click({ action: 'saveBorrow' });
  assert.equal(a.saved.length, 1);
  const s = E.validate(JSON.parse(a.saved[0]));
  assert.equal(s.loans[0].p, 100000); assert.equal(s.loans[0].i, 1000); assert.equal(s.cash, 0);
  assert.match(a.html(), /借款账本/);
});

test('原生保存失败保留表单和原账本', async () => {
  const a = setup('', false);
  await a.click({ go: 'income' }); a.input('amount', '2000'); await a.click({ action: 'saveIncome' });
  assert.equal(a.saved.length, 0); assert.match(a.elements.toast.innerHTML, /保存失败/); assert.match(a.html(), /记录收入/);
});

test('损坏原账本不会被新操作自动覆盖', async () => {
  const a = setup('{bad');
  await a.click({ go: 'income' }); a.input('amount', '2000'); await a.click({ action: 'saveIncome' });
  assert.equal(a.saved.length, 0); assert.match(a.elements.toast.innerHTML, /读取失败/);
});

test('返回表单恢复草稿和内容滚动位置', async () => {
  const a = setup();
  await a.click({ go: 'borrow' }); a.input('amount', '4321'); a.elements.content.scrollTop = 260;
  await a.click({ go: 'income' }); a.input('amount', '999'); a.back('borrow');
  assert.match(a.html(), /value="4321"/); assert.equal(a.elements.content.scrollTop, 260);
});

test('切换 Tab 保留导航节点并恢复各页滚动位置', async () => {
  const a = setup(JSON.stringify(E.demo())), nav = a.elements.nav;
  a.elements.content.scrollTop = 450;
  await a.click({ go: 'calendar' }); assert.equal(a.elements.content.scrollTop, 0);
  a.elements.content.scrollTop = 210;
  await a.click({ go: 'home' }); assert.equal(a.elements.content.scrollTop, 450);
  assert.equal(a.elements.nav, nav); assert.equal(nav.innerHTML, a.markup);
  assert.deepEqual(a.buttons.filter(b => b.classes.has('active')).map(b => b.dataset.go), ['home']);
  await a.click({ go: 'calendar' }); assert.equal(a.elements.content.scrollTop, 210);
});

test('再次点当前 Tab 回到顶部，输入试算不重置滚动位置', async () => {
  const a = setup();
  a.elements.content.scrollTop = 300; await a.click({ go: 'home' }); assert.equal(a.elements.content.scrollTop, 0);
  await a.click({ go: 'borrow' }); a.elements.content.scrollTop = 330; a.input('amount', '1000');
  assert.equal(a.elements.content.scrollTop, 330); assert.equal(a.elements.submitAction.disabled, false);
});

test('超出可用收入时禁用还款，修改为有效金额后恢复', async () => {
  const s = E.demo(), a = setup(JSON.stringify(s));
  await a.click({ go: 'repay' }); assert.equal(a.elements.submitAction.disabled, true);
  a.input('amount', '9000'); assert.equal(a.elements.submitAction.disabled, true); assert.match(a.elements.repayPreview.innerHTML, /可用收入不足/);
  a.input('amount', '1000'); assert.equal(a.elements.submitAction.disabled, false);
  await a.click({ action: 'saveRepay' }); assert.equal(JSON.parse(a.saved[0]).cash, s.cash - 100000);
});

test('选择计费方式后保留金额和滚动位置', async () => {
  const a = setup(); await a.click({ go: 'borrow' }); a.input('amount', '2000'); a.elements.content.scrollTop = 180;
  a.change('mode', 'flat'); assert.match(a.html(), /每期费用/); assert.match(a.html(), /value="2000"/); assert.equal(a.elements.content.scrollTop, 180);
});

test('生成文本备份后展开备份区域', async () => {
  const a = setup(JSON.stringify(E.demo())); await a.click({ go: 'settings' }); await a.click({ action: 'export' });
  assert.equal(a.elements.transfer.details.open, true); assert.equal(a.elements.transfer.revealed, true);
});
