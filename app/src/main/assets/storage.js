(function (root, factory) {
  const api = factory();
  if (typeof module === 'object') module.exports = api; else root.ShoreStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function create({ engine: E, native: native, localStorage: web }) {
    const key = 'shore-ledger-v4', legacyKey = 'shore-android-v3', archive = key + '-snapshots';
    let state, raw = '', blocked = false, error = '', migrated = false;
    const read = () => native ? native.loadState() : (web.getItem(key) || web.getItem(legacyKey) || '');
    function persist(next, recovery = false) {
      if (blocked && !recovery) throw Error('请先恢复原账本');
      E.validate(next); const text = JSON.stringify(next);
      if (new TextEncoder().encode(text).length > E.MAX_BYTES) throw Error('账本超过 32 MB，请先导出备份');
      try {
        if (native) { if (!native.saveState(text)) throw Error('保存失败，原账本已保留'); }
        else {
          const previous = web.getItem(key);
          if (previous) { const snapshots = JSON.parse(web.getItem(archive) || '[]'); snapshots.unshift(previous); web.setItem(archive, JSON.stringify(snapshots.slice(0, 20))); }
          web.setItem(key, text);
        }
      } catch (e) {
        let committed = false;
        try { committed = E.canonical(E.load(read()).state) === E.canonical(next); } catch (_) {}
        if (!committed) throw Error('保存失败，原账本已保留');
      }
      state = E.copy(next); raw = text; blocked = false; error = ''; return state;
    }
    try {
      raw = read() || '';
      if (!raw) state = E.blank();
      else { const result = E.load(raw); state = result.state; migrated = result.migrated; if (migrated) persist(state); }
    } catch (e) { blocked = true; error = e.message || '原账本读取失败'; state = null; }
    return {
      get state() { return state; }, get raw() { return raw; }, get blocked() { return blocked; },
      get error() { return error; }, get migrated() { return migrated; }, persist,
      backup(offset = 1) { const value = native ? native.loadBackup(offset) : JSON.parse(web.getItem(archive) || '[]')[offset - 1]; if (!value) throw Error('暂无本地历史备份'); return E.load(value); },
      legacy() { const value = native ? native.loadLegacyState() : web.getItem(legacyKey); if (!value) throw Error('暂无旧版原始数据'); return E.load(value); },
      count() { try { return native ? native.getBackupCount() : JSON.parse(web.getItem(archive) || '[]').length; } catch (_) { return 0; } }
    };
  }
  return { create };
});
