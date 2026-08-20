// ===== app.js =====
// 日曆 LIFF 前端程式

let userId = '';

// ===== LIFF 初始化 =====
document.addEventListener('DOMContentLoaded', async function () {
  try {
    await liff.init({
      liffId: CONFIG.LIFF_ID
    });

    if (!liff.isLoggedIn()) {
      setStatus('請登入 LINE', 'loading');
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    userId = profile.userId;

    console.log('LINE User ID:', userId);

    setStatus('LINE 已連線', 'success');
    document.getElementById('searchBtn').disabled = false;

    // 預設選擇今天
    changeDateType();
  } catch (error) {
    console.error('LIFF 初始化失敗：', error);
    setStatus('LIFF 初始化失敗', 'error');
    showMessage(error.message);
  }
});

// ===== 日期類型變更 =====
function changeDateType() {
  const type = document.getElementById('dateType').value;
  const customDate = document.getElementById('customDate');

  if (type === 'custom') {
    customDate.classList.remove('hidden');

    const today = new Date();
    setDateValue('startDate', today);
    setDateValue('endDate', today);
    updateDateRangeText();
    return;
  }

  customDate.classList.add('hidden');

  const today = new Date();
  let startDate;
  let endDate;

  if (type === 'today') {
    startDate = today;
    endDate = today;
  } else if (type === 'tomorrow') {
    startDate = addDays(today, 1);
    endDate = startDate;
  } else if (type === 'thisWeek') {
    // 本週固定為星期一～星期日
    startDate = getMonday(today);
    endDate = addDays(startDate, 6);
  } else if (type === 'nextWeek') {
    // 下週固定為星期一～星期日
    startDate = addDays(getMonday(today), 7);
    endDate = addDays(startDate, 6);
  }

  setDateValue('startDate', startDate);
  setDateValue('endDate', endDate);
  updateDateRangeText();
}

// ===== 取得星期一 =====
function getMonday(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
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

// ===== 設定日期 =====
function setDateValue(id, date) {
  if (!date) return;

  const input = document.getElementById(id);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  input.value = `${year}-${month}-${day}`;
  updateDateText(id);
}

// ===== 日期顯示星期 =====
function updateDateText(id) {
  const input = document.getElementById(id);
  const output = document.getElementById(id + 'Text');

  if (!input.value) {
    output.textContent = '';
    return;
  }

  const date = new Date(input.value + 'T00:00:00');
  output.textContent = formatDateWithWeek(date);
}

// ===== 更新查詢日期區間 =====
function updateDateRangeText() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const output = document.getElementById('dateRangeText');

  if (!startDate || !endDate) {
    output.textContent = '-';
    return;
  }

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  output.textContent =
    formatDateWithWeek(start) + ' ～ ' + formatDateWithWeek(end);
}

// ===== 日期格式 + 星期 =====
function formatDateWithWeek(date) {
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}/${month}/${day} (${weekNames[date.getDay()]})`;
}

// ===== 開始日期變更 =====
document.getElementById('startDate').addEventListener('change', function () {
  updateDateText('startDate');
  updateDateRangeText();
});

// ===== 結束日期變更 =====
document.getElementById('endDate').addEventListener('change', function () {
  updateDateText('endDate');
  updateDateRangeText();
});

// ===== 查詢日曆 =====
async function searchCalendar() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const useICloud = document.getElementById('icloud').checked;
  const useGoogle = document.getElementById('google').checked;
  const searchBtn = document.getElementById('searchBtn');

  showDebug('');

  if (!userId) {
    showMessage('尚未取得 LINE User ID。');
    return;
  }

  if (!startDate || !endDate) {
    showMessage('請選擇日期。');
    return;
  }

  if (startDate > endDate) {
    showMessage('結束日期不能早於開始日期。');
    return;
  }

  if (!useICloud && !useGoogle) {
    showMessage('請至少選擇一個日曆來源。');
    return;
  }

  searchBtn.disabled = true;
  searchBtn.innerHTML = '<span>查詢中...</span>';
  showMessage('');

  // ===== 傳送給 GAS 的資料 =====
  const requestData = {
    action: 'searchCalendar',
    userId: userId,
    startDate: startDate,
    endDate: endDate,
    useICloud: useICloud,
    useGoogle: useGoogle
  };

  try {
    console.log('Calendar Request:', requestData);

    // ===== 呼叫 GAS =====
    // 使用 text/plain 避免 GitHub Pages → GAS 的 CORS preflight
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestData)
    });

    const responseText = await response.text();

    console.log('GAS Response:', responseText);

    // ===== 顯示 GAS 原始回應 =====
    showDebug({
      httpStatus: response.status,
      response: responseText
    });

    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status + '：' + responseText
      );
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        'GAS 回傳內容不是 JSON：' + responseText
      );
    }

    // ===== 顯示 GAS JSON =====
    showDebug({
      httpStatus: response.status,
      result: result
    });

    if (!result.success) {
      throw new Error(
        result.message || '日曆查詢失敗。'
      );
    }

    showMessage('查詢完成，結果已傳送到 LINE。');
  } catch (error) {
    console.error('日曆查詢失敗：', error);
    showMessage('日曆查詢失敗：' + error.message);
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = '<span>開始查詢</span>';
  }
}

// ===== 顯示 LIFF 狀態 =====
function setStatus(text, type) {
  const status = document.getElementById('status');
  const statusText = status.querySelector('.status-text');

  status.className = 'status';

  if (type === 'success') {
    status.classList.add('status-success');
  } else if (type === 'error') {
    status.classList.add('status-error');
  } else {
    status.classList.add('status-loading');
  }

  statusText.textContent = text;
}

// ===== 顯示訊息 =====
function showMessage(text) {
  document.getElementById('message').textContent = text;
}

// ===== 顯示 Debug =====
function showDebug(data) {
  const panel = document.getElementById('debugPanel');
  const debugInfo = document.getElementById('debugInfo');

  if (!data) {
    panel.classList.add('hidden');
    debugInfo.textContent = '';
    return;
  }

  panel.classList.remove('hidden');

  try {
    debugInfo.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    debugInfo.textContent = String(data);
  }
}
