/**
 * =====================================================================
 * 幾何陀螺對戰 Geometry Spin Battle — Google Apps Script 成績接收器
 * ---------------------------------------------------------------------
 * 功能：接收遊戲以 POST 送來的 JSON，寫入 Google Sheet 的「Scores」工作表。
 *
 * 綁定 Google Sheet 的步驟（詳見 README.md）：
 *   1. 建立一個新的 Google 試算表（Google Sheet）。
 *   2. 選單「擴充功能 Extensions」→「Apps Script」。
 *   3. 刪除預設內容，把本檔案全部貼上，按「儲存」。
 *   4. （可選）在編輯器選 testDoPost 按「執行」，授權後檢查試算表有沒有多一行測試資料。
 *   5. 右上角「部署 Deploy」→「新增部署作業 New deployment」→ 類型選「網頁應用程式 Web app」
 *        · 執行身分 Execute as：我 Me
 *        · 存取權 Who has access：任何人 Anyone
 *   6. 按「部署」，複製「網頁應用程式網址」（以 /exec 結尾）。
 *   7. 把網址貼到 index.html 的 CONFIG.GAS_URL。
 *
 * ⚠ 每次修改本程式後，要「部署 → 管理部署作業 → 編輯（鉛筆）→ 版本：新版本 → 部署」，
 *   網址才會套用新程式碼（網址本身不變）。
 * =====================================================================
 */

const SHEET_NAME = 'Scores';          // 工作表名稱（不存在會自動建立）
const TIMEZONE = 'Asia/Hong_Kong';    // 時間戳記時區

// 表頭（最後一欄必須是 Submission ID，用作防重複）
const HEADERS = [
  'Timestamp 時間', 'Name 姓名', 'Class 班別', 'Class No. 學號', 'Score 分數',
  'Correct 答對題數', 'Total Q 總題數', 'Rounds Won 勝出回合', 'Recovery Correct 補救題答對',
  'Launch Angles 發射角度', 'Language 語言', 'Voice 語音', 'Submission ID'
];

/**
 * 接收遊戲 POST 的資料
 * 遊戲端以 Content-Type: text/plain 傳送 JSON 字串（避免 CORS preflight），
 * 所以這裡用 e.postData.contents 讀取再 JSON.parse。
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);               // 多位學生同時提交時，逐個寫入，避免互相覆蓋
  } catch (err) {
    return json_({ result: 'error', message: 'Server busy, please retry.' });
  }
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('No POST data');
    const data = JSON.parse(e.postData.contents);

    // 基本檢查：姓名、班別、學號必須有值
    if (!data.name || !data.className || !data.classNo) throw new Error('Missing name / class / class number');

    const sheet = getSheet_();

    // 防重複：同一個 submissionId 只記錄一次（遊戲在網絡不穩時可能重送）
    const last = sheet.getLastRow();
    if (data.submissionId && last > 1) {
      const ids = sheet.getRange(2, HEADERS.length, last - 1, 1).getValues().flat();
      if (ids.indexOf(String(data.submissionId)) !== -1) {
        return json_({ result: 'success', duplicate: true });
      }
    }

    sheet.appendRow([
      Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      safe_(data.name),
      safe_(data.className),
      safe_(data.classNo),
      Number(data.score) || 0,
      Number(data.correct) || 0,
      Number(data.total) || 0,
      Number(data.roundsWon) || 0,
      Number(data.remedialCorrect) || 0,
      safe_(data.launchAngles),
      safe_(data.language),
      safe_(data.voice),
      safe_(data.submissionId)
    ]);

    return json_({ result: 'success', row: sheet.getLastRow() });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** 用瀏覽器打開 Web App 網址時顯示，用來確認部署成功 */
function doGet() {
  return json_({ result: 'ok', message: 'Geometry Spin Battle endpoint is running.' });
}

/** 取得（或建立）成績工作表，並在第一次使用時加上表頭 */
function getSheet_() {
  // 由試算表的「擴充功能 > Apps Script」建立的專案會自動綁定該試算表。
  // 若你用的是獨立 Apps Script 專案，改為：
  //   const ss = SpreadsheetApp.openById('你的試算表 ID');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold').setBackground('#0b2a52').setFontColor('#ffffff');
    sh.autoResizeColumns(1, HEADERS.length);
  }
  return sh;
}

/** 清理輸入：限制長度，並防止「公式注入」（以 = + - @ 開頭的文字前加 '） */
function safe_(v) {
  v = String(v == null ? '' : v).slice(0, 100);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

/** 回傳 JSON */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 在編輯器內手動執行，測試寫入是否正常（會新增一行測試資料） */
function testDoPost() {
  const fake = {
    postData: {
      contents: JSON.stringify({
        name: '測試學生', className: '2A', classNo: '99', score: 888, correct: 4, total: 5,
        roundsWon: 3, remedialCorrect: 1, launchAngles: '52, 118, 75, 30, 140',
        language: 'bi', voice: 'yue', submissionId: 'test-' + Date.now()
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
