/* ==========================================================
   ПРЕДЗАПИСЬ НА ВОЛЕЙБОЛЬНЫЙ КЭМП — приём заявок в Google Таблицу

   ЧТО ДЕЛАЕТ:
   Каждая заявка с сайта попадает:
     1) в сводную вкладку "Все заявки" — одна строка на заявку,
        кэмпы через запятую;
     2) отдельно в вкладку каждого выбранного кэмпа (например "Сочи",
        "Таиланд 1 смена" и т.д.) — так один человек может оказаться
        сразу в нескольких вкладках, если отметил несколько кэмпов.
   Вкладки создаются автоматически при первой заявке — заранее
   создавать их руками не нужно.

   КАК ПОДКЛЮЧИТЬ (ID вашей таблицы уже вписан ниже, редактировать не нужно):
   1. Откройте свою Google Таблицу → Расширения → Apps Script.
   2. Удалите содержимое редактора и вставьте туда весь этот файл целиком.
   3. Сохраните (иконка дискеты).
   4. Развернуть (кнопка справа сверху) → Новое развёртывание.
      Тип: "Веб-приложение". Описание — любое.
      "Выполнять как": Я (ваш аккаунт).
      "У кого есть доступ": Все.
      Нажать "Развернуть" → разрешить доступ (Google покажет
      предупреждение "Google не проверил это приложение" — это
      нормально для собственного скрипта, нажимаете "Дополнительно" →
      "Перейти на страницу (небезопасно)" → "Разрешить").
   5. Скопировать полученный URL веб-приложения (заканчивается на /exec)
      и прислать его — дальше вставка в сайт и проверка уже не ваша забота.
   6. Если позже меняете код скрипта — нужно каждый раз делать
      "Управление развёртываниями" → редактировать → "Начать развёртывание"
      (версия "Новая версия"), иначе изменения не применятся к уже
      выданному URL.
   ========================================================== */

const SPREADSHEET_ID = '1vwfNUmeTN7G-vRCY5MaLlVfp8dUc5iFEx8-_F2soZwQ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const timestamp = new Date();
    const camps = Array.isArray(data.camps) ? data.camps : [];

    // safeText() защищает телефон (и любое другое поле) от превращения
    // в #ERROR! — Google Таблицы читают "+7 999..." как формулу.
    const name = safeText(data.name);
    const phone = safeText(data.phone);
    const messenger = safeText(data.messenger);
    const city = safeText(data.city);
    const comment = safeText(data.comment);

    // 1) сводная строка в "Все заявки"
    writeRow(
      ss,
      'Все заявки',
      ['Дата', 'Имя', 'Телефон', 'Telegram/мессенджер', 'Город', 'Комментарий', 'Кэмпы'],
      [timestamp, name, phone, messenger, city, comment, camps.map((c) => c.title).join(', ')]
    );

    // 2) отдельная строка на вкладке каждого выбранного кэмпа
    camps.forEach((camp) => {
      if (!camp.sheetName) return;
      writeRow(
        ss,
        camp.sheetName,
        ['Дата', 'Имя', 'Телефон', 'Telegram/мессенджер', 'Город', 'Комментарий'],
        [timestamp, name, phone, messenger, city, comment]
      );
    });

  } catch (err) {
    Logger.log('Error: ' + err);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Если строка начинается с "+", "-", "=" или "@" — Google Таблицы пытаются
// прочитать её как формулу и показывают #ERROR!. Ведущий апостроф — это
// стандартный способ Таблиц пометить значение "это точно текст"; сам апостроф
// в отображении ячейки не виден.
function safeText(value) {
  const str = (value === undefined || value === null) ? '' : String(value);
  return /^[+\-=@]/.test(str) ? "'" + str : str;
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
