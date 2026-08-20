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

    // 預設選擇今天
    selectRange('today');

  } catch (error) {
    console.error('LIFF 初始化失敗：', error);
    showMessage('LIFF 初始化失敗，請重新開啟。');
  }
});


// ===== 選擇查詢區間 =====

function selectRange(type) {
  const today = new Date();
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
      // 自訂模式保留目前日期
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

  // 星期日為 0，所以星期日需要往前 6 天
  // 其他日期直接計算距離星期一的天數
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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // input[type="date"] 使用 yyyy-MM-dd
  input.value = `${year}-${month}-${day}`;

  // 更新星期顯示
  updateDateText(id);
}


// ===== 更新日期星期 =====

function updateDateText(id) {
  const input = document.getElementById(id);
  const text = document.getElementById(id + 'Text');

  if (!input.value) {
    text.textContent = '';
    return;
  }

  // 加上時間避免部分瀏覽器時區造成日期偏移
  const date = new Date(input.value + 'T00:00:00');

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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // 顯示格式：2026/08/20 (四)
  text.textContent =
    `${year}/${month}/${day} (${weekNames[date.getDay()]})`;
}


// ===== 開始日期變更 =====

document.getElementById('startDate').addEventListener('change', function () {
  updateDateText('startDate');
});


// ===== 結束日期變更 =====

document.getElementById('endDate').addEventListener('change', function () {
  updateDateText('endDate');
});


// ===== 查詢日曆 =====

async function searchCalendar() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const searchButton = document.getElementById('searchButton');

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
    // 建立傳給 GAS 的資料
    const requestData = {
      action: 'searchCalendar',
      userId: userId,
      startDate: startDate,
      endDate: endDate
    };

    console.log('GAS URL:', CONFIG.GAS_URL);
    console.log('Request:', requestData);

    // 呼叫 GAS Web App
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    console.log('HTTP Status:', response.status);

    // 先以文字方式取得回應
    const responseText = await response.text();

    console.log('GAS Response:', responseText);

    // HTTP 狀態不是 200～299
    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status + '：' + responseText
      );
    }

    let result;

    try {
      // 將 GAS 回傳內容轉成 JSON
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        'GAS 回傳內容不是 JSON：' + responseText
      );
    }

    console.log('GAS Result:', result);

    // GAS 回傳成功
    if (result.success) {
      showMessage(
        '✅ 查詢完成\n日曆結果已傳送到 LINE。'
      );
    } else {
      // GAS 回傳失敗
      showMessage(
        result.message || '查詢失敗。'
      );
    }

  } catch (error) {
    // 顯示實際錯誤，方便目前測試
    console.error('日曆查詢失敗：', error);

    showMessage(
      '日曆查詢失敗：' + error.message
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
