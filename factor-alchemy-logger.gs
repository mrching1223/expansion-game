/**
 * 因式鍊金術 Factor Alchemy — 學生成績記錄（Google Apps Script，專用新試算表）
 *
 * 安裝步驟：
 * 1. 開一份新嘅 Google 試算表（例如叫「因式鍊金術 成績」）→ 擴充功能 → Apps Script
 * 2. 刪除原有內容，貼上呢個檔案全部程式碼，按「儲存」
 * 3. 揀函式「testDoPost」→ 按「執行」→ 授權；試算表會出現三個分頁同一行測試紀錄（可以刪走）
 * 4. 部署 → 新增部署作業 → 齒輪揀「網頁應用程式」
 *    執行身分：我；誰可以存取：所有人 → 部署
 * 5. 複製「網頁應用程式網址」（…/exec），貼到 index.html 嘅 SHEET_ENDPOINT
 *
 * 試算表會自動建立三個分頁：
 *   「學生總覽 Summary」 每位學生一行：遊戲次數、遊玩分鐘、一次答對率、四個關卡最佳成績同徽章
 *   「答題紀錄 Events」  每次答題、用提示、完成關卡嘅詳細紀錄
 *   「關卡結果 Stages」  每次完成關卡一行（第一次答對幾多題、有冇攞到徽章）
 *
 * 遊戲傳嚟嘅欄位（同「數學小島物語」格式一樣，v:2）：
 *   v, game, badgeTotal, sid, cls, no, name, ev, bells, badges, t, dev
 *   answer：place, qid, topic, ok, attempt, first, hint, secs, review, fixed
 *   hint：qid, topic；house_result：place, topic, score, total, badge, newBadge
 */

const EVENT_TAB = '答題紀錄 Events';
const SUMMARY_TAB = '學生總覽 Summary';
const STAGE_TAB = '關卡結果 Stages';

const LEVELS = ['common', 'group', 'diffSq', 'perfSq'];
const PLACE = {
  common: '★ 提取公因式', group: '★★ 分組分解', diffSq: '★★★ 平方差恆等式', perfSq: '★★★ 完全平方恆等式',
  mixed: '綜合對戰', notebook: '📒 錯題本'
};
const EVENT_NAME = { start: '開始遊戲', answer: '答題', hint: '用提示', house_result: '完成關卡', win: '集齊徽章' };

const EVENT_HEAD = ['時間 Time', '班別 Class', '學號 No.', '姓名 Name', '事件 Event', '關卡 Stage', '題號 QID', '方法 Method',
  '答對 Correct', '第幾次 Attempt', '第一次答對 First try', '用提示 Hint', '用時秒 Secs', '錯題重做 Review', '錯題改正 Fixed',
  '關卡成績 Stage score', '鈴錢 Bells', '徽章 Badges', '設備 Device', 'Session', '遊戲 Game'];
const SUM_HEAD = ['班別 Class', '學號 No.', '姓名 Name', '首次登入 First seen', '最後活動 Last seen', '遊戲次數 Sessions',
  '遊玩分鐘 Minutes', '答對題數 Correct', '第一次答對 First-try', '一次答對率 Accuracy', '答錯次數 Wrong', '用提示 Hints',
  '錯題改正 Fixed', '鈴錢 Bells', '徽章 Badges',
  '提取公因式 最佳', '分組分解 最佳', '平方差 最佳', '完全平方 最佳', '集齊徽章 All badges'];
const LEVEL_COL = { common: 15, group: 16, diffSq: 17, perfSq: 18 };   // SUM_HEAD 嘅 0-based 位置
const STAGE_HEAD = ['時間 Time', '班別 Class', '學號 No.', '姓名 Name', '關卡 Stage', '第一次答對 Score', '總題數 Total',
  '攞到徽章 Badge', '新徽章 New badge', '鈴錢 Bells', 'Session'];

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out('bad request'); }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return out('busy');
  try {
    const ss = getBook();
    const cls = clip(d.cls, 6).toUpperCase();
    const no = String(parseInt(d.no, 10) || clip(d.no, 3));
    const name = clip(d.name, 20);
    if (!cls || !no) return out('missing class / number');
    const now = new Date();
    const total = num(d.badgeTotal) || 4;

    if (d.ev !== 'heartbeat') {
      const ev = getSheet(ss, EVENT_TAB, EVENT_HEAD);
      ev.appendRow([now, cls, no, name, EVENT_NAME[d.ev] || clip(d.ev, 20), PLACE[d.place] || clip(d.place, 20),
        clip(d.qid, 8), clip(d.topic, 40),
        d.ok === undefined ? '' : (d.ok ? '✓' : '✗'), num(d.attempt) || '', d.first ? '✓' : '', d.hint ? '✓' : '',
        d.secs === undefined ? '' : num(d.secs), d.review ? '✓' : '', d.fixed ? '✓' : '',
        d.total ? num(d.score) + '/' + num(d.total) + (d.newBadge ? ' 🏅new' : '') : '',
        num(d.bells), num(d.badges) + '/' + total, clip(d.dev, 15), clip(d.sid, 12), clip(d.game, 30)]);
    }
    if (d.ev === 'house_result') {
      const st = getSheet(ss, STAGE_TAB, STAGE_HEAD);
      st.appendRow([now, cls, no, name, PLACE[d.place] || clip(d.place, 20), num(d.score), num(d.total),
        d.badge ? '🏅' : '', d.newBadge ? '✓' : '', num(d.bells), clip(d.sid, 12)]);
    }
    updateSummary(ss, d, cls, no, name, now, total);
  } finally {
    lock.releaseLock();
  }
  return out('ok');
}

function doGet() {
  const ss = getBook();
  const link = '<a href="' + ss.getUrl() + '" target="_blank">' + ss.getName() + '</a>';
  return HtmlService.createHtmlOutput('<div style="font:17px/1.7 sans-serif;padding:16px">' +
    '<p>✓ 因式鍊金術 Factor Alchemy logger is running</p><p>成績試算表 Score sheet：' + link + '</p></div>');
}

// 喺編輯器執行，於「執行記錄」睇試算表網址
function showSheetLink() { Logger.log(getBook().getUrl()); }

// 喺試算表入面建立嘅 Apps Script → 就用嗰份試算表；獨立建立嘅 → 自動開一份新試算表並記住
function getBook() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('因式鍊金術 學生成績 Factor Alchemy Scores');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function updateSummary(ss, d, cls, no, name, now, total) {
  const sh = getSheet(ss, SUMMARY_TAB, SUM_HEAD);
  const last = sh.getLastRow();
  let row = -1;
  if (last > 1) {
    const keys = sh.getRange(2, 1, last - 1, 2).getDisplayValues();
    for (let i = 0; i < keys.length; i++) if (keys[i][0] === cls && keys[i][1] === no) { row = i + 2; break; }
  }
  let r;
  if (row < 0) { r = [cls, no, name, now, now, 0, 0, 0, 0, '', 0, 0, 0, 0, '0/' + total, '', '', '', '', '']; row = last + 1; }
  else r = sh.getRange(row, 1, 1, SUM_HEAD.length).getValues()[0];

  if (name) r[2] = name;
  r[4] = now;
  if (d.ev === 'start') r[5] = num(r[5]) + 1;
  if (d.ev === 'heartbeat') r[6] = num(r[6]) + 1;          // 每 60 秒一次 → 分鐘
  if (d.ev === 'answer') {
    if (d.ok) { r[7] = num(r[7]) + 1; if (d.first) r[8] = num(r[8]) + 1; if (d.fixed) r[12] = num(r[12]) + 1; }
    else r[10] = num(r[10]) + 1;
  }
  if (d.ev === 'hint') r[11] = num(r[11]) + 1;
  r[9] = num(r[7]) > 0 ? Math.round(num(r[8]) / num(r[7]) * 100) + '%' : '';
  if (d.bells !== undefined) r[13] = num(d.bells);
  if (d.badges !== undefined) r[14] = num(d.badges) + '/' + total;
  const c = LEVEL_COL[d.place];
  if (d.ev === 'house_result' && c !== undefined) {
    const prevBest = parseInt(String(r[c] || ''), 10) || 0;
    const hadBadge = String(r[c] || '').indexOf('🏅') >= 0;
    r[c] = Math.max(prevBest, num(d.score)) + '/' + num(d.total) + (d.badge || hadBadge ? ' 🏅' : '');
  }
  if (d.ev === 'win' && !r[19]) r[19] = '🏆 ' + Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm');
  sh.getRange(row, 1, 1, SUM_HEAD.length).setValues([r]);
}

function getSheet(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f3e6c4');
    sh.setFrozenRows(1);
    sh.getRange(2, 2, 2000, 1).setNumberFormat('@');              // 班別當文字
    sh.getRange(2, 1, 2000, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    if (name === SUMMARY_TAB) sh.getRange(2, 4, 2000, 2).setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return sh;
}

/* 測試：喺編輯器揀「testDoPost」再按「執行」，三個分頁會各出現測試紀錄（之後可以刪走） */
function testDoPost() {
  const base = { v: 2, game: 'factor-alchemy', badgeTotal: 4, sid: 'test0001', cls: '2A', no: '0', name: '測試學生', dev: 'computer' };
  const send = (x) => doPost({ postData: { contents: JSON.stringify(Object.assign({}, base, x, { t: new Date().toISOString() })) } });
  send({ ev: 'start', bells: 0, badges: 0 });
  send({ ev: 'answer', bells: 0, badges: 0, place: 'diffSq', qid: 'd03', topic: '平方差恆等式', ok: false, attempt: 1, first: false, hint: false, secs: 25, review: false, fixed: false });
  send({ ev: 'hint', bells: 0, badges: 0, qid: 'd03', topic: '平方差恆等式' });
  send({ ev: 'answer', bells: 150, badges: 0, place: 'diffSq', qid: 'd03', topic: '平方差恆等式', ok: true, attempt: 2, first: false, hint: true, secs: 12, review: false, fixed: false });
  send({ ev: 'heartbeat', bells: 150, badges: 0 });
  send({ ev: 'house_result', bells: 150, badges: 1, place: 'diffSq', topic: '平方差恆等式', score: 3, total: 10, badge: true, newBadge: true });
  Logger.log('完成，請打開試算表睇三個分頁：' + getBook().getUrl());
}

// 學生輸入嘅文字：限長度，唔俾當成公式
function clip(v, n) { return String(v == null ? '' : v).slice(0, n).replace(/^[=+\-@]/, "'$&"); }
function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
function out(s) { return ContentService.createTextOutput(s); }
