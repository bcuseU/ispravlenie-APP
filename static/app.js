// Находим элементы страницы, в которых будем показывать форму, таблицу и сообщения.
const navigation = document.querySelector("#navigation"),
  fields = document.querySelector("#fields"),
  form = document.querySelector("#record-form");
const formTitle = document.querySelector("#form-title"),
  tableTitle = document.querySelector("#table-title"),
  status = document.querySelector("#status"),
  results = document.querySelector("#results"),
  cancel = document.querySelector("#cancel");
// definitions — описание таблиц от сервера; section — выбранный раздел.
// records — текущие записи; editing хранит редактируемую запись или null.
let definitions = {},
  section = "firms",
  records = [],
  editing = null;
// Эти поля добавляются к номеру записи в списках связанных данных.
const displayFields = {
  firms: ["firm_name"],
  departments: ["dept_short_name"],
  staff: ["staff_name"],
  contracts: ["contract_date", "contract_type"],
  bills: ["bill_date", "bill_sum"],
  prices: ["price_name"],
};
// Показываем сообщение пользователю; ok меняет его цвет на зелёный.
function message(text, ok = false) {
  status.textContent = text;
  status.classList.toggle("ok", ok);
}
// Все запросы к серверу проходят через эту функцию. fetch отправляет HTTP-запрос,
// затем мы читаем ответ как JSON и передаём ошибки вызывающему коду.
async function api(url, options) {
  const response = await fetch(url, options);
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("Сервер вернул некорректный ответ");
  }
  if (!response.ok) throw Error(data.error || "Ошибка запроса");
  return data;
}
// Собираем ключ записи из одного или нескольких полей через запятую.
function keyOf(t, row) {
  return t.keys.map((key) => row[key]).join(",");
}
// Формируем понятное название для пункта выпадающего списка.
function labelOf(section, row) {
  const t = definitions[section],
    names = displayFields[section] || [];
  return (
    "#" +
    keyOf(t, row) +
    " — " +
    names
      .map((k) => row[k] ?? "")
      .filter(Boolean)
      .join(", ")
  );
}
// Строим форму по описанию полей с сервера. Без row создаём новую запись,
// с row заполняем поля данными существующей записи для редактирования.
async function renderForm(row = null) {
  editing = row;
  fields.replaceChildren();
  const t = definitions[section];
  formTitle.textContent =
    (row ? "Изменить запись — " : "Новая запись — ") + t.label;
  form.querySelector("[type=submit]").textContent = row
    ? "Сохранить"
    : "Добавить";
  cancel.hidden = !row;
  for (const f of t.fields) {
    // Автоматический номер не вводится вручную; ключи при изменении не показываем.
    if ((t.auto && t.keys.includes(f.name)) || (row && t.keys.includes(f.name)))
      continue;
    const label = document.createElement("label");
    label.append(document.createTextNode(f.label + (f.required ? " *" : "")));
    let input;
    // Для ссылки на другую таблицу или набора допустимых значений создаём список.
    if (f.ref || f.choices) {
      input = document.createElement("select");
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = f.required ? "Выберите значение" : "Не указано";
      input.append(empty);
      if (f.ref) {
        // Загружаем связанные записи с сервера и добавляем их в список выбора.
        const related = await api("/api/" + f.ref);
        for (const item of related) {
          const opt = document.createElement("option");
          opt.value = item[definitions[f.ref].keys[0]];
          opt.textContent = labelOf(f.ref, item);
          input.append(opt);
        }
      } else
        for (const value of f.choices) {
          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = value;
          input.append(opt);
        }
    } else {
      input = document.createElement("input");
      // Тип поля формы зависит от типа данных в описании таблицы.
      input.type =
        f.type === "date"
          ? "date"
          : f.type === "int" || f.type === "decimal"
            ? "number"
            : "text";
      if (f.type === "int") {
        input.step = "1";
        input.min = "0";
      }
      if (f.type === "decimal") {
        input.step = "0.01";
        input.min = "0";
      }
      if (f.max) input.maxLength = f.max;
    }
    // Имя поля используется при сборе данных формы перед отправкой на сервер.
    input.name = f.name;
    input.required = !!f.required;
    if (row && row[f.name] != null) input.value = row[f.name];
    label.append(input);
    fields.append(label);
  }
}
// Создаём таблицу на странице из загруженных записей и описания полей.
function renderTable() {
  const t = definitions[section];
  tableTitle.textContent = t.label;
  results.replaceChildren();
  if (!records.length) {
    results.textContent = "Записей пока нет.";
    return;
  }
  const table = document.createElement("table"),
    head = table.createTHead().insertRow();
  for (const f of t.fields) {
    const th = document.createElement("th");
    th.textContent = f.label;
    head.append(th);
  }
  const actions = document.createElement("th");
  actions.textContent = "Действия";
  head.append(actions);
  const body = table.createTBody();
  for (const row of records) {
    const tr = body.insertRow();
    for (const f of t.fields) {
      const td = tr.insertCell();
      td.textContent = row[f.name] ?? "—";
    }
    const cell = tr.insertCell(),
      edit = document.createElement("button"),
      remove = document.createElement("button");
    edit.type = remove.type = "button";
    edit.textContent = "Изменить";
    remove.textContent = "Удалить";
    remove.className = "danger";
    // Кнопка изменения открывает форму с данными выбранной строки.
    edit.addEventListener("click", async () => {
      try {
        message("");
        await renderForm(row);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        message(e.message);
      }
    });
    // После подтверждения отправляем DELETE с ключом записи и обновляем таблицу.
    remove.addEventListener("click", async () => {
      if (!confirm("Удалить эту запись?")) return;
      try {
        await api("/api/" + section + "/" + encodeURIComponent(keyOf(t, row)), {
          method: "DELETE",
        });
        await refresh();
        message("Запись удалена", true);
      } catch (e) {
        message(e.message);
      }
    });
    cell.append(edit, remove);
  }
  results.append(table);
}
// GET загружает актуальные записи выбранного раздела и обновляет таблицу.
async function refresh() {
  records = await api("/api/" + section);
  renderTable();
}
// При выборе раздела обновляем активную кнопку, форму и список записей.
async function selectSection(name) {
  section = name;
  message("");
  for (const b of navigation.children)
    b.classList.toggle("active", b.dataset.section === section);
  try {
    await renderForm();
    await refresh();
  } catch (e) {
    message(e.message);
  }
}
// Обрабатываем отправку формы без перезагрузки страницы.
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  // FormData собирает значения полей, а Object.fromEntries превращает их в объект.
  const t = definitions[section],
    data = Object.fromEntries(new FormData(form));
  try {
    await api(
      "/api/" +
        section +
        (editing ? "/" + encodeURIComponent(keyOf(t, editing)) : ""),
      {
        // Для новой записи используем POST, для существующей — PUT.
        method: editing ? "PUT" : "POST",
        // Сообщаем серверу, что отправляем JSON, и превращаем объект в строку.
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    // После успешного ответа очищаем форму и заново загружаем данные.
    const wasEditing = !!editing;
    await renderForm();
    await refresh();
    message(wasEditing ? "Запись изменена" : "Запись добавлена", true);
  } catch (error) {
    message(error.message);
  }
});
// Отмена возвращает форму в режим добавления новой записи.
cancel.addEventListener("click", async () => {
  try {
    message("");
    await renderForm();
  } catch (e) {
    message(e.message);
  }
});
// При открытии страницы получаем описание таблиц, создаём кнопки разделов
// и загружаем первый раздел.
(async () => {
  try {
    definitions = await api("/api/tables");
    for (const [name, t] of Object.entries(definitions)) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.section = name;
      b.textContent = t.label;
      b.addEventListener("click", () => selectSection(name));
      navigation.append(b);
    }
    await selectSection(section);
  } catch (error) {
    message(error.message);
  }
})();
