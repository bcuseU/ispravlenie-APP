const navigation = document.querySelector("#navigation"),
  fields = document.querySelector("#fields"),
  form = document.querySelector("#record-form");
const formTitle = document.querySelector("#form-title"),
  tableTitle = document.querySelector("#table-title"),
  status = document.querySelector("#status"),
  results = document.querySelector("#results"),
  cancel = document.querySelector("#cancel");
let definitions = {},
  section = "firms",
  records = [],
  editing = null;
const displayFields = {
  firms: ["firm_name"],
  departments: ["dept_short_name"],
  staff: ["staff_name"],
  contracts: ["contract_date", "contract_type"],
  bills: ["bill_date", "bill_sum"],
  prices: ["price_name"],
};
function message(text, ok = false) {
  status.textContent = text;
  status.classList.toggle("ok", ok);
}
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
function keyOf(t, row) {
  return t.keys.map((key) => row[key]).join(",");
}
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
    if ((t.auto && t.keys.includes(f.name)) || (row && t.keys.includes(f.name)))
      continue;
    const label = document.createElement("label");
    label.append(document.createTextNode(f.label + (f.required ? " *" : "")));
    let input;
    if (f.ref || f.choices) {
      input = document.createElement("select");
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = f.required ? "Выберите значение" : "Не указано";
      input.append(empty);
      if (f.ref) {
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
    input.name = f.name;
    input.required = !!f.required;
    if (row && row[f.name] != null) input.value = row[f.name];
    label.append(input);
    fields.append(label);
  }
}
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
    edit.addEventListener("click", async () => {
      try {
        message("");
        await renderForm(row);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        message(e.message);
      }
    });
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
async function refresh() {
  records = await api("/api/" + section);
  renderTable();
}
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
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const t = definitions[section],
    data = Object.fromEntries(new FormData(form));
  try {
    await api(
      "/api/" +
        section +
        (editing ? "/" + encodeURIComponent(keyOf(t, editing)) : ""),
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    const wasEditing = !!editing;
    await renderForm();
    await refresh();
    message(wasEditing ? "Запись изменена" : "Запись добавлена", true);
  } catch (error) {
    message(error.message);
  }
});
cancel.addEventListener("click", async () => {
  try {
    message("");
    await renderForm();
  } catch (e) {
    message(e.message);
  }
});
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
