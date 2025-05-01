const vscode = acquireVsCodeApi();
let columns = [];

// Recebe dados iniciais da extensão
window.addEventListener('message', event => {
    console.log("Mensagem recebida do VSCode:", event.data);
    const { type, payload } = event.data;

    columns = event.data.payload.columns;

    if (type === 'renderTable') {
        renderTable(event.data.payload.columns, event.data.payload.data)
        populateSearchColumnSelect(event.data.payload.columns);
        tableName = payload.tableName;
        dbName = payload.dbName;
        currentData = payload.data;
    }
});

// Eventos iniciais
const $ = (id) => document.getElementById(id);
$('insertBtn').addEventListener("click", () => {/* openModal(columns, 'insert', null); */ });
$('refreshBtn').addEventListener("click", () => vscode.postMessage({ type: 'refresh' }));
$('searchBtn').addEventListener("click", sendSearchMessage);
$('searchInput').addEventListener("input", e => e.target.classList.remove('invalid'));
$('searchColumn').addEventListener("change", e => e.target.classList.remove('invalid'));

// fetch('data.json')
//     .then(res => res.json())
//     .then(data => {
//         populateSearchColumnSelect(data.payload.columns);
//         renderTable(data.payload.columns, data.payload.data)
//     })
//     .catch(err => console.error('Erro ao buscar dados:', err));

function sendSearchMessage() {
    const column = $('searchColumn');
    const input = $('searchInput');

    let valid = true;

    if (!column.value) {
        column.classList.add('invalid');
        valid = false;
    }

    if (!input.value.trim()) {
        input.classList.add('invalid');
        valid = false;
    }

    if (valid) {
        vscode.postMessage({ type: 'search', value: input.value, column: column.value });
    }

    console.log('Valor da pesquisa:', value);
    console.log('Coluna da pesquisa:', column);
    // vscode.postMessage({ type: 'search', value, column });
}


function renderTable(cols, rows) {
    const table = createTable(cols, rows);
    const container = $('container-table');
    container.innerHTML = '';
    container.appendChild(table);
}

function createTable(cols, rows) {
    const table = document.createElement('table');
    table.classList.add('data-table');
    table.id = 'data-table';
    table.appendChild(createTHead(cols));
    table.appendChild(createTBody(rows));
    table.appendChild(document.createElement('tfoot')).id = 'table-footer';
    return table;
}

function createTHead(cols) {
    const thead = document.createElement('thead');
    const row = thead.insertRow();
    row.appendChild(createElement('th', 'Ações'));
    cols.forEach((col, i) => row.appendChild(createColumnHeader(col, i)));
    return thead;
}

function createColumnHeader(col, i) {
    const th = createElement('th');
    th.style.cursor = 'pointer';
    th.innerHTML = `${col.columnName} <br><small>${[(col.notNull && '*'), col.primaryKey && 'PK', col.foreignKey && 'FK'].filter(Boolean).join(' ')} ${col.dataType}</small>`;
    th.onclick = () => sortTableByColumn(i);
    return th;
}

function createTBody(rows) {
    const tbody = createElement('tbody');
    tbody.id = 'table-body';
    rows.forEach((row, idx) => {
        const tr = createRow(row, false, idx);
        tr.dataset.index = idx;
        tbody.appendChild(tr);
    });

    // tbody.addEventListener('click', tableClickHandler);
    tbody.addEventListener('input', tableInputHandler);
    tbody.addEventListener('focusout', e => validateRow(e.target.closest('tr')));
    return tbody;
}

function createRow(data = {}, isNew = false, index = null) {
    const tr = createElement('tr');
    if (isNew) tr.classList.add('new-row');
    if (index !== null) tr.dataset.index = index;

    tr.appendChild(createActionsCell(tr));
    columns.forEach(col => tr.appendChild(createDataCell(col, data[col.columnName] ?? null, tr)));

    return tr;
}

function createActionsCell(tr) {
    const td = createElement('td');
    td.innerHTML = `
        <span class="action-icon" onclick="saveRow(this)">💾</span>
        <span class="action-icon" onclick="deleteRow(this)">🗑️</span>
    `;
    return td;
}

function createDataCell(col, value, tr) {
    const td = createElement('td');
    Object.assign(td.dataset, {
        column: col.columnName,
        type: col.dataType,
        notNull: col.notNull,
        autoIncrement: col.isAutoIncrement,
        value: value ?? '',
        placeholder: col.isAutoIncrement ? 'Auto Increment [NULL]' : 'NULL',
        primaryKey: col.primaryKey,
        foreignKey: col.foreignKey,
    });

    if (col.dataType === 'boolean') {
        const input = createElement('input');
        input.type = 'checkbox';
        setCheckboxState(input, `${value}`);
        td.appendChild(input);
        td.contentEditable = false;
    } else if (col.dataType === 'date') {
        const input = createElement('input');
        input.type = 'date';
        input.value = `${value ?? null}`;
        td.appendChild(input);
        td.contentEditable = false;
    } else {
        // td.contentEditable = true;
        td.contentEditable = !col.isAutoIncrement;
        td.innerText = value ?? '';
        td.onkeydown = (e) => {
            if (e.key === 'Enter' && $('autoSave')?.checked) {
                e.preventDefault();
                saveRow(tr.querySelector('.action-icon'));
            }
        };
    }


    return td;
}

function saveRow(icon) {
    const tr = icon.closest('tr');
    const footer = $('table-footer');
    footer.innerHTML = '';
    if (!validateRow(tr)) {
        footer.innerHTML = `<tr><th colspan="${tr.children.length}">Há campos obrigatórios não preenchidos ou com formato inválido!</th></tr>`;
        return;
    }

    const pkCell = tr.querySelector('[data-primary-key="true"]');
    if (!pkCell) {
        console.error("Chave primária não encontrada na linha.");
        return;
    }

    const primaryKey = pkCell.dataset.column;
    const primaryKeyValue = pkCell.dataset.value.trim();
    const isNewRow = tr.classList.contains('new-row');
    const isEditedRow = tr.classList.contains('edited');
    const data = getRowData(tr);

    if (isNewRow) {
        vscode.postMessage({
            type: 'insert',
            data,
        });
    } else if (isEditedRow && primaryKeyValue) {
        vscode.postMessage({
            type: 'update',
            primaryKey,
            primaryKeyValue,
            data,
        });
    }

    tr.classList.remove('edited', 'new-row');
}

function deleteRow(icon) {
    const tr = icon.closest('tr');
    const pkCell = tr.querySelector('[data-primary-key="true"]');

    if (!pkCell) {
        console.error("Chave primária não encontrada na linha.");
        return;
    }

    const primaryKey = pkCell.getAttribute('data-column');
    // const primaryKeyValue = pkCell.textContent.trim();
    const primaryKeyValue = pkCell.dataset.value.trim();

    tr.remove();
    vscode.postMessage({
        type: 'delete',
        primaryKey,
        primaryKeyValue,
    });
}

function validateRow(tr) {

    let valid = true;

    columns.forEach((col, i) => {
        const td = tr.children[i + 1]; // +1 por causa da coluna de ações
        const type = col.dataType;
        const notNull = col.notNull;
        const isAutoIncrement = col.isAutoIncrement;
        const value = td.dataset.value?.trim();
        const isEmpty = !value || value === 'null';

        if (isAutoIncrement) return; // pular validação se for autoIncrement

        if (notNull && isEmpty) {
            td.classList.add('invalid');
            valid = false;
        } else if (type === 'integer' && value !== '' && isNaN(parseInt(value))) {
            td.classList.add('invalid');
            valid = false;
        } else {
            td.classList.remove('invalid');
        }

    });

    return valid;
}

function getRowData(tr) {
    return Object.fromEntries(
        columns.map((col, i) => {
            const td = tr.children[i + 1];
            const raw = td?.dataset.value?.trim();
            return [col.columnName, parseValue(raw, col.dataType)];
        })
    );
}

function parseValue(value, type) {
    if (value === undefined || value === '' || value === 'null') return null;

    const parsers = {
        integer: v => parseInt(v, 10),
        bigint: v => parseInt(v, 10),
        smallint: v => parseInt(v, 10),
        real: v => parseFloat(v),
        float: v => parseFloat(v),
        double: v => parseFloat(v),
        numeric: v => parseFloat(v),
        decimal: v => parseFloat(v),
        boolean: v => v === 'true' ? true : v === 'false' ? false : null,
        date: v => isNaN(Date.parse(v)) ? null : v,
        timestamp: v => isNaN(Date.parse(v)) ? null : v
    };

    return parsers[type]?.(value) ?? value;
};

function sortTableByColumn(index) {
    const tbody = $('table-body');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const asc = !(sortTableByColumn.sortOrder ??= {})[index];
    sortTableByColumn.sortOrder[index] = asc;

    rows.sort((a, b) => {
        const aVal = a.children[index + 1];
        const bVal = b.children[index + 1];
        const aText = aVal.querySelector('input')?.value || aVal.innerText;
        const bText = bVal.querySelector('input')?.value || bVal.innerText;
        return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}

function getNextBooleanState(state) {
    return state === 'null' ? 'true' : state === 'true' ? 'false' : 'null';
}

function setCheckboxState(input, state) {
    input.value = state;
    input.checked = state === 'true';
    input.indeterminate = state === 'null';
}

function createElement(tag, text = '') {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    return el;
}

function addNewRow() {
    $('table-body').appendChild(createRow({}, true));
}


function saveAll() {
    const update = [];
    const insert = [];

    document.querySelectorAll('tr').forEach(tr => {
        if (tr.classList.contains('edited') || tr.classList.contains('new-row')) {
            if (!validateRow(tr)) {
                tr.classList.add('invalid');
                return;
            }

            const rowData = getRowData(tr);

            if (tr.classList.contains('new-row')) {
                insert.push(rowData);
            } else {
                update.push(rowData);
            }

            tr.classList.remove('edited', 'new-row', 'invalid');
        }
    });

    const payload = { insert, update };


    vscode.postMessage({
        type: 'saveAll',
        insert, update
    });
    console.log('Salvar para API:', payload);
}

function tableInputHandler(e) {
    const td = e.target.closest('td');
    if (!td) return;

    // Se TD for contenteditable=true e estiver vazio, remove <br> da dentro da TD
    if (td.matches('td[contenteditable=true]') && td.innerText.trim() === '') {
        td.innerHTML = '';
    }

    const tr = td.closest('tr');
    if (!tr) return;

    tr.classList.add('edited');

    const type = td.dataset.type;
    const input = td.querySelector('input');

    if (input && type === 'boolean') {
        const nextState = getNextBooleanState(input.value);
        setCheckboxState(input, nextState);
        td.dataset.value = `${nextState}`;
    } else if (input && type === 'date') {
        td.dataset.value = input?.value;
    } else {
        td.dataset.value = td.innerText.trim();
    }

}

function populateSearchColumnSelect(cols) {
    const select = $('searchColumn');
    select.innerHTML = '<option value="" disabled selected>Escolha uma coluna</option>'; // valor vazio para pesquisar em todas
    cols.forEach(col => {
        const opt = createElement('option', col.columnName);
        opt.value = col.columnName;
        select.appendChild(opt);
    });
}