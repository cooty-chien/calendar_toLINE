const LIFF_ID = '你的_LIFF_ID';

let userId = '';

document.addEventListener('DOMContentLoaded', async function () {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    userId = profile.userId;

    console.log('LINE User ID:', userId);

    setDefaultDates();
  } catch (error) {
    console.error(error);
    showMessage('LIFF 初始化失敗。');
  }
});

function selectRange(type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start;
  let end;

  switch (type) {
    case 'today':
      start = today;
      end = addDays(today, 1);
      break;

    case 'tomorrow':
      start = addDays(today, 1);
      end = addDays(start, 1);
      break;

    case 'thisWeek':
      start = getMonday(today);
      end = addDays(start, 7);
      break;

    case 'nextWeek':
      start = addDays(getMonday(today), 7);
      end = addDays(start, 7);
      break;

    case 'custom':
      document.getElementById('customArea').classList.remove('hidden');
      return;
  }

  document.getElementById('customArea').classList.remove('hidden');

  setDateValue('startDate', start);
  setDateValue('endDate', addDays(end, -1));
}

function setDefaultDates() {
  selectRange('today');
}

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setDateValue(id, date) {
  const input = document.getElementById(id);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  input.value = `${year}-${month}-${day}`;
  updateDateText(id);
}

function updateDateText(id) {
  const input = document.getElementById(id);
  const text = document.getElementById(id + 'Text');

  if (!input.value) {
    text.textContent = '';
    return;
  }

  const date = new Date(input.value + 'T00:00:00');
  const weekNames = ['日', '一', '二', '三', '四', '五', '六'];

  text.textContent =
    `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} (${weekNames[date.getDay()]})`;
}

document.getElementById('startDate').addEventListener('change', function () {
  updateDateText('startDate');
});

document.getElementById('endDate').addEventListener('change', function () {
  updateDateText('endDate');
});

async function searchCalendar() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

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

  console.log({
    action: 'searchCalendar',
    userId: userId,
    startDate: startDate,
    endDate: endDate
  });

  showMessage('查詢中...');

  // 下一步接 GAS API
}

function showMessage(text) {
  document.getElementById('message').textContent = text;
}
