// ===== app.js =====
// 日曆 LIFF 前端程式

// LINE User ID
let userId = '';


// ===== 頁面初始化 =====

document.addEventListener('DOMContentLoaded', async function () {
  try {
    // 初始化 LINE LIFF
    await liff.init({
      liffId: CONFIG.LIFF_ID
    });

    // 如果尚未登入 LINE，要求登入
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 取得 LINE 使用者資料
    const profile = await liff.getProfile();

    // 儲存 LINE User ID
    userId = profile.userId;

    console.log('LINE User ID:', userId);

    // 預設顯示今天
    selectRange('today');

  } catch (error) {
    console.error('LIFF 初始化失敗：', error);
    showMessage('LIFF 初始化失敗，請重新開啟。');
  }
});


// ===== 選擇查詢區間 =====

function selectRange(type) {
  const today = new Date();

  // 將時間歸零，避免時間造成日期計算誤差
  today.setHours(0, 0, 0, 0);

  let start;
  let end;

  switch (type) {

    // 今天
    case 'today':
      start = today;
      end = today;
      break;

    // 明天
    case 'tomorrow':
      start = addDays(today, 1);
      end = start;
      break;

    // 本週：固定星期一～星期日
    case 'thisWeek':
      start = getMonday(today);
      end = addDays(start, 6);
      break;

    // 下週：固定星期一～星期日
    case 'nextWeek':
      start = addDays(getMonday(today), 7);
      end = addDays(start, 6);
      break;

    // 自訂
    case 'custom':
      // 自訂模式不修改目前日期
      return;

    default:
      return;
  }

  // 設定開始日期
  setDateValue('startDate', start);

  // 設定結束日期
  setDateValue('endDate', end);

  // 清除訊息
  showMessage('');
}


// ===== 取得星期一 =====

function getMonday(date) {
  const result = new Date(date);

  const day = result.getDay();

  // 星期日 = 0
  // 星期一 = 1
  // ...
  // 星期六 = 6
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
}


// ===== 日期加減 =====

function addDays(date, days) {
  const result = new Date(date);

  result.setDate(result.getDate() + days);

  return result;
}


// ===== 設定日期輸入框 =====

function setDateValue(id, date) {
  const input = document.getElementById(id);

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  // input[type=date] 使用 yyyy-MM-dd
  input.value = `${year}-${month}-${day}`;

  // 更新星期文字
  updateDateText(id);
}


// ===== 更新日期顯示 =====

function updateDateText(id) {
  const input = document.getElementById(id);
  const text = document.getElementById(id + 'Text');

  if (!input.value) {
    text.textContent = '';
    return;
  }

  const date = new Date(
    input.value + 'T00:00:00'
  );

  const weekNames = [
    '日',
    '一',
    '二',
    '三',
    '四',
    '五',
    '六'
  ];

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  text.textContent =
    `${year}/${month}/${day} (${weekNames[date.getDay()]})`;
}


// ===== 開始日期變更 =====

document
  .getElementById('startDate')
  .addEventListener('change', function () {

    updateDateText('startDate');

  });


// ===== 結束日期變更 =====

document
  .getElementById('endDate')
  .addEventListener('change', function () {

    updateDateText('endDate');

  });


// ===== 查詢日曆 =====

async function searchCalendar() {

  const startDate =
    document.getElementById('startDate').value;

  const endDate =
    document.getElementById('endDate').value;

  const searchButton =
    document.getElementById('searchButton');


  // 尚未取得 LINE User ID
  if (!userId) {
    showMessage('尚未取得 LINE User ID。');
    return;
  }


  // 未選擇日期
  if (!startDate || !endDate) {
    showMessage('請選擇日期。');
    return;
  }


  // 結束日期不可早於開始日期
  if (startDate > endDate) {
    showMessage('結束日期不能早於開始日期。');
    return;
  }


  // 顯示查詢中
  showMessage('查詢中...');

  // 防止重複點擊
  searchButton.disabled = true;


  try {

    // 傳送給 GAS
    const response = await fetch(CONFIG.GAS_URL, {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({

        // GAS 用這個 action 判斷要執行什麼功能
        action: 'searchCalendar',

        // LINE User ID
        userId: userId,

        // 查詢開始日期
        startDate: startDate,

        // 查詢結束日期
        endDate: endDate

      })

    });


    // 取得 GAS 回應
    const result = await response.json();

    console.log('GAS Response:', result);


    // GAS 回傳成功
    if (result.success) {

      showMessage(
        '✅ 查詢完成\n日曆結果已傳送到 LINE。'
      );

    } else {

      showMessage(
        result.message || '查詢失敗。'
      );

    }

  } catch (error) {

    console.error('日曆查詢失敗：', error);

    showMessage(
      '日曆查詢失敗，請稍後再試。'
    );

  } finally {

    // 恢復查詢按鈕
    searchButton.disabled = false;

  }
}


// ===== 顯示訊息 =====

function showMessage(text) {
  document.getElementById('message').textContent = text;
}
