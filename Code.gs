/**
 * 因式鍊金術 Factor Alchemy — 遊戲記錄後端（Google Apps Script）
 *
 * 用法：
 * 1. 開一個新嘅 Google Sheet → 擴充功能 → Apps Script，將呢個檔案全部貼入去。
 * 2. 部署 → 新增部署作業 → 類型揀「網頁應用程式」
 *    - 執行身分：我
 *    - 存取權：所有人
 * 3. 複製「網頁應用程式網址」（…/exec），貼入 index.html 嘅 CONFIG.scriptUrl。
 *
 * 前端用 fetch POST（Content-Type: text/plain;charset=utf-8）或 navigator.sendBeacon，
 * body 係 JSON.stringify(record)。每局寫一行入「Games」，每次合成嘗試寫一行入「Attempts」。
 */

var GAME_HEADERS = [
  'gameId', 'receivedAt', 'class', 'studentNo', 'name',
  'startTime', 'endTime', 'durationSec',
  'players', 'difficulty', 'stars', 'language', 'character',
  'score', 'rank', 'result', 'status',
  'success1', 'success2', 'success3', 'successTotal',
  'wrongCount', 'incompleteCount', 'snipeSuccess', 'snipeMissed',
  'destroyedCount', 'hintsUsed', 'turns', 'attemptCount', 'version', 'rules'
];
var ATTEMPT_HEADERS = [
  'gameId', 'class', 'studentNo', 'name', 'attemptNo', 'time',
  'target', 'stars', 'cards', 'result', 'gameStatus'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ ok: false, error: 'empty body' });
    var rec = JSON.parse(e.postData.contents);
    if (!rec || !rec.gameId) return json_({ ok: false, error: 'missing gameId' });

    lock.waitLock(30000);            // 全班同時提交都唔會寫亂
    locked = true;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var games = getSheet_(ss, 'Games', GAME_HEADERS);
    var attempts = getSheet_(ss, 'Attempts', ATTEMPT_HEADERS);

    var row = findGameRow_(games, rec.gameId);
    if (row) {
      // 同一局再傳（離線重傳 / sendBeacon 之後又完成）：只有「abandoned → completed」先更新
      var oldStatus = games.getRange(row, GAME_HEADERS.indexOf('status') + 1).getValue();
      if (oldStatus === 'completed' || rec.status !== 'completed') return json_({ ok: true, duplicate: true });
      games.getRange(row, 1, 1, GAME_HEADERS.length).setValues([gameRow_(rec)]);
      appendAttempts_(attempts, rec, countAttempts_(attempts, rec.gameId));
      return json_({ ok: true, updated: true });
    }

    games.appendRow(gameRow_(rec));
    appendAttempts_(attempts, rec, 0);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: 'Factor Alchemy records' });
}

/* 工作表唔存在就自動建立並加入標題列 */
function getSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3e6c4');
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < headers.length) {
    // 舊版工作表少咗新欄位（例如 rules）：補返標題
    var have = sh.getLastColumn();
    sh.getRange(1, have + 1, 1, headers.length - have).setValues([headers.slice(have)])
      .setFontWeight('bold').setBackground('#f3e6c4');
  }
  return sh;
}

function findGameRow_(sheet, gameId) {
  if (sheet.getLastRow() < 2) return 0;
  var cell = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(gameId)).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

function countAttempts_(sheet, gameId) {
  if (sheet.getLastRow() < 2) return 0;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(gameId)).matchEntireCell(true).findAll().length;
}

function gameRow_(r) {
  var s1 = num_(r.success1), s2 = num_(r.success2), s3 = num_(r.success3);
  var values = {
    gameId: r.gameId, receivedAt: new Date(), 'class': r['class'], studentNo: r.studentNo, name: r.name,
    startTime: r.startTime, endTime: r.endTime, durationSec: num_(r.durationSec),
    players: num_(r.players), difficulty: r.difficulty, stars: r.stars, language: r.language, character: r.character,
    score: num_(r.score), rank: num_(r.rank), result: r.result, status: r.status,
    success1: s1, success2: s2, success3: s3, successTotal: s1 + s2 + s3,
    wrongCount: num_(r.wrongCount), incompleteCount: num_(r.incompleteCount),
    snipeSuccess: num_(r.snipeSuccess), snipeMissed: num_(r.snipeMissed),
    destroyedCount: num_(r.destroyedCount), hintsUsed: num_(r.hintsUsed),
    turns: num_(r.turns), attemptCount: (r.attempts || []).length, version: r.version,
    rules: r.rules || 'full'
  };
  return GAME_HEADERS.map(function (h) { return safe_(values[h]); });
}

function appendAttempts_(sheet, r, skip) {
  var list = (r.attempts || []).slice(skip);
  if (!list.length) return;
  var rows = list.map(function (a, i) {
    return [r.gameId, r['class'], r.studentNo, r.name, skip + i + 1, a.time, a.target, a.stars, a.cards, a.result, r.status].map(safe_);
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ATTEMPT_HEADERS.length).setValues(rows);
}

function num_(v) { var n = Number(v); return isFinite(n) ? n : 0; }

/* 防止 =、+、-、@ 開頭嘅文字被當成公式 */
function safe_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    v = v.slice(0, 500);
    if (/^[=+\-@]/.test(v)) return "'" + v;
  }
  return v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
