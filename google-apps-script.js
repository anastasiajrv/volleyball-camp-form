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

   КАК ПОДКЛЮЧИТЬ:
   1. Впишите ниже ID своей Google Таблицы (SPREADSHEET_ID) — это часть
      её ссылки: https://docs.google.com/spreadsheets/d/ЭТОТ_ID/edit
   2. В Таблице: Расширения → Apps Script.
   3. Удалите содержимое редактора и вставьте туда весь этот файл.
   4. Сохраните (иконка дискеты).
   5. Развернуть (кнопка справа сверху) → Новое развёртывание.
      Тип: "Веб-приложение". Описание — любое.
      "Выполнять как": Я (ваш аккаунт).
      "У кого есть доступ": Все.
      Нажать "Развернуть" → разрешить доступ (Google покажет
      предупреждение "Google не проверил это приложение" — это
      нормально для собственного скрипта, нажимаете "Дополнительно" →
      "Перейти на страницу (небезопасно)" → "Разрешить").
   6. Скопировать полученный URL веб-приложения (заканчивается на /exec)
      и вставить его в CONFIG.scriptUrl в index.html сайта анкеты.
   7. Если позже меняете код скрипта — нужно каждый раз делать
      "Управление развёртываниями" → редактировать → "Новая версия",
      иначе изменения не применятся к уже выданному URL.
   ========================================================== */

const SPREADSHEET_ID = 'ВСТАВЬТЕ_СЮДА_ID_ТАБЛИЦЫ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const timestamp = new Date();
    const camps = Array.isArray(data.camps) ? data.camps : [];

    // 1) сводная строка в "Все заявки"
    writeRow(
      ss,
      'Все заявки',
      ['Дата', 'Имя', 'Телефон', 'Telegram/мессенджер', 'Город', 'Комментарий', 'Кэмпы'],
      [
        timestamp,
        data.name || '',
        data.phone || '',
        data.messenger || '',
        data.city || '',
        data.comment || '',
        camps.map((c) => c.title).join(', ')
      ]
    );

    // 2) отдельная строка на вкладке каждого выбранного кэмпа
    camps.forEach((camp) => {
      if (!camp.sheetName) return;
      writeRow(
        ss,
        camp.sheetName,
        ['Дата', 'Имя', 'Телефон', 'Telegram/мессенджер', 'Город', 'Комментарий'],
        [
          timestamp,
          data.name || '',
          data.phone || '',
          data.messenger || '',
          data.city || '',
          data.comment || ''
        ]
      );
    });

  } catch (err) {
    Logger.log('Error: ' + err);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
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
