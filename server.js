// Express обрабатывает HTTP-запросы, mysql2 выполняет запросы к MySQL.
const express = require('express');
const mysql = require('mysql2/promise');
// path помогает составить путь к папке интерфейса независимо от рабочей директории.
const path = require('path');

// Принимаем JSON от браузера и отдаём файлы интерфейса из папки static.
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'static')));
// Пул хранит соединения с MySQL. Настройки можно передать через переменные окружения.
const db = mysql.createPool({
  // Если переменная окружения не задана, используется значение после ||.
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kont4_1is_kuchenkov',
  // Кодировка поддерживает русский текст; даты возвращаются строками.
  charset: 'utf8mb4', dateStrings: true, connectionLimit: 5
});

// Описываем только известные таблицы и поля. Имена из запроса в SQL не подставляются.
// Здесь заданы имена таблиц, ключи, поля и ссылки на связанные записи.
const field = (name, label, options = {}) => ({ name, label, ...options });
const tables = {
  // keys — первичный ключ, auto — его создаёт MySQL; required — обязательное поле.
  // ref указывает раздел, из которого выбирается связанная запись.
  firms: { label: 'Предприятия', table: 'k_firm', keys: ['firm_num'], auto: true, fields: [
    field('firm_num','Номер',{type:'int'}), field('firm_name','Название',{required:true,max:45}),
    field('firm_addr','Адрес',{max:45}), field('firm_phone','Телефон',{max:20}) ] },
  departments: { label:'Отделы', table:'k_dept', keys:['dept_num'], auto:true, fields:[
    field('dept_num','Номер',{type:'int'}), field('dept_full_name','Полное название',{max:45}),
    field('dept_short_name','Краткое название',{required:true,max:10}),
    field('k_staff_staff_num','Руководитель',{type:'int',ref:'staff'}) ] },
  staff: { label:'Сотрудники', table:'k_staff', keys:['staff_num'], auto:true, fields:[
    field('staff_num','Номер',{type:'int'}), field('staff_name','Имя',{required:true,max:45}),
    field('staff_post','Должность',{max:45}), field('staff_hiredate','Дата начала',{type:'date'}),
    field('staff_termdate','Дата окончания',{type:'date'}), field('K_dept_dept_num','Отдел',{type:'int',ref:'departments'}) ] },
  contracts: { label:'Договоры', table:'k_contract', keys:['contract_num'], auto:true, fields:[
    field('contract_num','Номер',{type:'int'}), field('contract_date','Дата',{type:'date',required:true}),
    field('contract_type','Тип',{required:true,choices:['A','B','C']}),
    field('k_firm_firm_num','Предприятие',{type:'int',ref:'firms',required:true}),
    field('k_staff_staff_num','Ответственный',{type:'int',ref:'staff',required:true}) ] },
  bills: { label:'Счета', table:'k_bill', keys:['bill_num'], auto:true, fields:[
    field('bill_num','Номер',{type:'int'}), field('bill_date','Дата',{type:'date'}),
    field('bill_sum','Сумма',{type:'decimal'}), field('bill_term','Срок оплаты',{type:'date'}),
    field('bill_peni','Пени',{type:'decimal'}),
    field('k_contract_contract_num','Договор',{type:'int',ref:'contracts',required:true}) ] },
  // У платежей и состава счетов составной ключ: запись определяют два поля.
  payments: { label:'Платежи', table:'k_payment', keys:['k_bill_bill_num','payment_num'], fields:[
    field('k_bill_bill_num','Счёт',{type:'int',ref:'bills',required:true}),
    field('payment_num','Номер платежа в счёте',{type:'int',required:true}),
    field('payment_date','Дата',{type:'date'}), field('payment_sum','Сумма',{type:'decimal'}) ] },
  prices: { label:'Прайс-лист', table:'k_price', keys:['price_num'], auto:true, fields:[
    field('price_num','Номер',{type:'int'}), field('price_name','Название',{required:true,max:45}),
    field('price_sum','Цена',{type:'decimal'}), field('price_type','Тип',{choices:['Т','У']}) ] },
  items: { label:'Состав счетов', table:'k_protokol', keys:['k_bill_bill_num','k_price_price_num'], fields:[
    field('k_bill_bill_num','Счёт',{type:'int',ref:'bills',required:true}),
    field('k_price_price_num','Позиция прайса',{type:'int',ref:'prices',required:true}),
    field('kolvo','Количество',{type:'int',required:true}), field('price_sum','Цена в счёте',{type:'decimal',required:true}) ] }
};

// Добавляем обратные кавычки к именам таблиц и полей из разрешённого списка.
const quote = name => '`' + name + '`';
// Отдаём интерфейсу описание таблиц и полей для построения форм.
app.get('/api/tables', (req,res) => res.json(tables));
// Выбираем таблицу только из списка разрешённых.
function tableFor(req,res) {
  const table = Object.hasOwn(tables, req.params.section) ? tables[req.params.section] : null;
  if (!table) res.status(404).json({error:'Таблица не найдена'});
  return table;
}
// Проверяем ключ записи; для составного ключа значения разделяются запятой.
function keyFor(req, table) {
  // Например, ключ платежа 5,2 означает счёт 5 и номер платежа 2.
  const parts = req.params.key.split(',');
  if (parts.length !== table.keys.length || parts.some(x => !/^\d+$/.test(x) || Number(x) > 2147483647)) {
    const error = new Error('Некорректный номер записи'); error.status = 400; throw error;
  }
  return parts.map(Number);
}
// Проверяем данные из тела запроса перед записью в базу.
function valuesFor(table, body, editing) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) { const e = new Error('Ожидается объект с данными'); e.status=400; throw e; }
  // Собираем пары [имя поля, значение] для будущего SQL-запроса.
  const result = [];
  for (const f of table.fields) {
    // Автоматический ключ создаёт MySQL, а существующие ключи не редактируем.
    if ((table.auto && table.keys.includes(f.name)) || (editing && table.keys.includes(f.name))) continue;
    let value = body[f.name];
    if (value === undefined || value === null || value === '') value = null;
    if (typeof value === 'string') value = value.trim() || null;
    if (f.required && value === null) { const e = new Error('Заполните поле «'+f.label+'»'); e.status=400; throw e; }
    if (value !== null) {
      if (typeof value !== 'string' && typeof value !== 'number') { const e = new Error('Некорректное значение поля «'+f.label+'»'); e.status=400; throw e; }
      value = String(value);
      // Проверяем длину и допустимые значения, а также формат чисел и дат.
      if ((f.max && value.length > f.max) || (f.choices && !f.choices.includes(value)) ||
          (f.type === 'int' && (!/^\d+$/.test(value) || Number(value)>2147483647)) ||
          (f.type === 'decimal' && !/^\d{1,7}(\.\d{1,2})?$/.test(value)) ||
          (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
        const e = new Error('Проверьте поле «'+f.label+'»'); e.status=400; throw e;
      }
    }
    result.push([f.name, value]);
  }
  return result;
}
// Условия для поиска по ключу. Вместо ? значения передаются отдельно в db.execute.
const where = table => table.keys.map(k => quote(k)+' = ?').join(' AND ');
// GET: получить все записи выбранной таблицы.
app.get('/api/:section', async (req,res,next) => {
  const t=tableFor(req,res); if(!t) return;
  // section берётся из адреса, например /api/firms; результат отправляется как JSON.
  try { const [rows]=await db.query('SELECT * FROM '+quote(t.table)+' ORDER BY '+t.keys.map(quote).join(', ')); res.json(rows); } catch(e){next(e)}
});
// GET: получить одну запись по ключу.
app.get('/api/:section/:key', async (req,res,next) => {
  const t=tableFor(req,res); if(!t) return;
  // Параметры после SQL передаются отдельно и подставляются на место ?.
  try { const [rows]=await db.execute('SELECT * FROM '+quote(t.table)+' WHERE '+where(t),keyFor(req,t)); if(!rows.length) return res.status(404).json({error:'Запись не найдена'}); res.json(rows[0]); } catch(e){next(e)}
});
// POST: проверить данные из req.body и добавить запись через INSERT.
app.post('/api/:section', async (req,res,next) => {
  const t=tableFor(req,res); if(!t) return;
  // req.body содержит JSON из формы; ответ 201 означает создание записи.
  try { const v=valuesFor(t,req.body,false); const [r]=await db.execute('INSERT INTO '+quote(t.table)+' ('+v.map(x=>quote(x[0])).join(', ')+') VALUES ('+v.map(()=>'?').join(', ')+')',v.map(x=>x[1])); res.status(201).json({message:'Запись добавлена',id:t.auto?r.insertId:t.keys.map(k=>req.body[k])}); } catch(e){next(e)}
});
// PUT: найти запись по ключу и изменить её через UPDATE.
app.put('/api/:section/:key', async (req,res,next) => {
  const t=tableFor(req,res); if(!t) return;
  // Сначала проверяем наличие записи, затем передаём значения и ключ в UPDATE.
  try { const key=keyFor(req,t), v=valuesFor(t,req.body,true); const [found]=await db.execute('SELECT 1 FROM '+quote(t.table)+' WHERE '+where(t),key); if(!found.length) return res.status(404).json({error:'Запись не найдена'}); await db.execute('UPDATE '+quote(t.table)+' SET '+v.map(x=>quote(x[0])+' = ?').join(', ')+' WHERE '+where(t),[...v.map(x=>x[1]),...key]); res.json({message:'Запись изменена'}); } catch(e){next(e)}
});
// DELETE: удалить запись по ключу.
app.delete('/api/:section/:key', async (req,res,next) => {
  const t=tableFor(req,res); if(!t) return;
  // affectedRows показывает, была ли найдена и удалена запись.
  try { const [r]=await db.execute('DELETE FROM '+quote(t.table)+' WHERE '+where(t),keyFor(req,t)); if(!r.affectedRows) return res.status(404).json({error:'Запись не найдена'}); res.json({message:'Запись удалена'}); } catch(e){next(e)}
});
// Превращаем ошибки проверки и MySQL в понятные ответы для интерфейса.
app.use((err,req,res,next) => {
  if (err.status) return res.status(err.status).json({error:err.message});
  // Ошибки внешних ключей и дубликатов преобразуются в понятные сообщения.
  if (err.errno === 1451) return res.status(409).json({error:'Удаление невозможно: на запись ссылаются другие данные. Сначала измените или удалите связанные записи.'});
  if (err.errno === 1452) return res.status(400).json({error:'Связанная запись не найдена. Обновите страницу и выберите существующее значение.'});
  if (err.errno === 1062) return res.status(409).json({error:'Запись с таким ключом уже существует, либо этот сотрудник уже руководит другим отделом.'});
  if ([1048,1264,1292,1366,1406].includes(err.errno)) return res.status(400).json({error:'MySQL не принял данные. Проверьте значения полей.'});
  // Остальные ошибки записываются в консоль сервера, клиент получает общий ответ.
  console.error(err.message); res.status(503).json({error:'Ошибка подключения или запроса к MySQL. Проверьте сервер и настройки.'});
});
// Запускаем сервер локально; при импорте файла сервер автоматически не стартует.
const port = Number(process.env.PORT || 5000);
if (require.main === module) app.listen(port, '127.0.0.1', () => console.log('Приложение: http://127.0.0.1:'+port));
// Экспорт позволяет использовать приложение и подключение в других файлах.
module.exports = { app, db };
