/* ==========================================================
   ПРЕДЗАПИСЬ НА ВОЛЕЙБОЛЬНЫЙ КЭМП — приём заявок в Google Таблицу
   + уведомление в Telegram-канал

   ЧТО ДЕЛАЕТ:
   Каждая заявка с сайта попадает:
     1) в сводную вкладку "Все заявки" — одна строка на заявку,
        кэмпы через запятую;
     2) отдельно в вкладку каждого выбранного кэмпа (например "Сочи",
        "Таиланд 1 смена" и т.д.) — так один человек может оказаться
        сразу в нескольких вкладках, если отметил несколько кэмпов;
     3) сообщением в Telegram-канал (если настроен — см. ниже).
   Вкладки создаются автоматически при первой заявке — заранее
   создавать их руками не нужно.

   КАК ПОДКЛЮЧИТЬ ТАБЛИЦУ (ID уже вписан ниже, редактировать не нужно):
   1. Откройте свою Google Таблицу → Расширения → Apps Script.
   2. Удалите содержимое редактора и вставьте туда весь этот файл целиком.
   3. Сохраните (иконка дискеты).
   4. Развернуть (кнопка справа сверху) → Новое развёртывание.
      Тип: "Веб-приложение". "Выполнять как": Я. "У кого есть доступ": Все.
      (Если развёртывание уже было — Развернуть → Управление развёртываниями →
      карандаш → версия "Новая версия" → Начать развёртывание.)

   КАК ПОДКЛЮЧИТЬ УВЕДОМЛЕНИЯ В TELEGRAM:
   Токен бота — это пароль, поэтому он НЕ хранится в этом файле (файл лежит
   в публичном репозитории). Вместо этого он берётся из приватных настроек
   самого проекта Apps Script:
   1. В редакторе Apps Script слева нажмите ⚙️ "Настройки проекта".
   2. Внизу раздел "Свойства скрипта" → "Добавить свойство".
   3. Добавьте два свойства:
        TELEGRAM_BOT_TOKEN  →  токен вашего бота (выдаёт @BotFather)
        TELEGRAM_CHAT_ID    →  ID канала, например -1001234567890
   4. Сохранить свойства скрипта.
   Как узнать TELEGRAM_CHAT_ID канала: добавьте бота в канал администратором,
   напишите в канал любое сообщение и откройте в браузере
   https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates — там будет "chat":{"id":-100...}.
   Если свойства не заданы — заявки всё равно спокойно сохраняются в таблицу,
   просто без уведомления.
   ========================================================== */

const SPREADSHEET_ID = '1vwfNUmeTN7G-vRCY5MaLlVfp8dUc5iFEx8-_F2soZwQ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const timestamp = new Date();
    const camps = Array.isArray(data.camps) ? data.camps : [];

    const name = str(data.name);
    const phone = str(data.phone);
    const messenger = str(data.messenger);
    const city = str(data.city);
    const comment = str(data.comment);
    const campTitles = camps.map((c) => str(c.title)).filter(Boolean);

    // ===== 1. Записываем заявку в таблицу =====
    // safeText() защищает телефон от превращения в #ERROR! —
    // Google Таблицы читают "+7 999..." как формулу.
    const sheetRow = [
      timestamp,
      safeText(name),
      safeText(phone),
      safeText(messenger),
      safeText(city),
      safeText(comment)
    ];

    // сводная строка в "Все заявки"
    writeRow(
      ss,
      'Все заявки',
      ['Дата', 'Имя', 'Телефон', 'Telegram/мессенджер', 'Город', 'Комментарий', 'Кэмпы'],
      sheetRow.concat([campTitles.join(', ')])
    );

    // отдельная строка на вкладке каждого выбранного кэмпа
    camps.forEach((camp) => {
      if (!camp.sheetName) return;
      writeRow(
        ss,
        str(camp.sheetName),
        ['Дата', 'Имя', 'Телефон', 'Telegram/мессенджер', 'Город', 'Комментарий'],
        sheetRow
      );
    });

    // ===== 2. Шлём уведомление в Telegram =====
    // Отдельно от записи в таблицу и в своём try/catch: если Telegram недоступен
    // или не настроен, заявка всё равно уже сохранена в таблице.
    notifyTelegram({ name, phone, messenger, city, comment, campTitles });

  } catch (err) {
    Logger.log('Error: ' + err);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Отправляет сообщение о новой заявке в Telegram-канал.
// Токен и ID канала берутся из свойств скрипта (см. инструкцию вверху файла).
function notifyTelegram(lead) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return; // уведомления просто не настроены — это не ошибка

    const lines = [
      '🏐 Новая заявка на кэмп!',
      '',
      '👤 ' + (lead.name || '—'),
      '📱 ' + (lead.phone || '—')
    ];
    if (lead.messenger) lines.push('✈️ ' + lead.messenger);
    if (lead.city) lines.push('📍 ' + lead.city);
    if (lead.comment) lines.push('💬 ' + lead.comment);

    lines.push('', 'Интересные кэмпы:');
    if (lead.campTitles.length) {
      lead.campTitles.forEach((title) => lines.push('• ' + title));
    } else {
      lines.push('• —');
    }

    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        disable_web_page_preview: true
      }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Telegram error: ' + err);
  }
}

// Приводит любое значение к строке (null/undefined → пустая строка)
function str(value) {
  return (value === undefined || value === null) ? '' : String(value);
}

// Если строка начинается с "+", "-", "=" или "@" — Google Таблицы пытаются
// прочитать её как формулу и показывают #ERROR!. Ведущий апостроф — это
// стандартный способ Таблиц пометить значение "это точно текст"; сам апостроф
// в отображении ячейки не виден.
function safeText(value) {
  const s = str(value);
  return /^[+\-=@]/.test(s) ? "'" + s : s;
}

// Пишет строку в лист sheetName; если листа ещё нет — создаёт его и добавляет заголовок
function writeRow(ss, sheetName, header, row) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(header);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  }
  sheet.appendRow(row);
}
