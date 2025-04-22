// media/script.js

// Armazena os dados da tabela
let currentData = [];
let columns = [];
let tableName = '';
let dbName = '';
let currentSelectedRow = null;

const vscode = acquireVsCodeApi();


document.getElementById("insertBtn").addEventListener("click", () => {
    openModal(columns, 'insert', null);
});

document.getElementById("refreshBtn").addEventListener("click", () => {
    vscode.postMessage({ type: 'refresh' });
});

document.getElementById("searchInput").addEventListener("input", (e) => {
    vscode.postMessage({ type: 'search', value: e.target.value });
});


// Recebe dados iniciais da extensão
window.addEventListener('message', event => {
    console.log("Mensagem recebida do VSCode:", event.data);

    const { type, payload } = event.data;

    if (type === 'renderTable') {
        tableName = payload.tableName;
        dbName = payload.dbName;
        currentData = payload.data;
        columns = payload.columns;
        renderTable();
    }
});

// Renderiza a tabela
function renderTable() {
    const container = document.getElementById('tableContainer');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('data-table');

    // Cabeçalho
    const thead = table.createTHead();
    const headRow = thead.insertRow();
    columns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col;
        headRow.appendChild(th);
    });

    // Corpo
    const tbody = table.createTBody();

    currentData.forEach((row, index) => {

        const tr = tbody.insertRow();
        tr.dataset.index = index;

        columns.forEach(col => {
            const td = tr.insertCell();
            td.contentEditable = true;
            td.textContent = row[col] ?? '';
            td.dataset.col = col; // Adiciona o nome da coluna como atributo data-col
            tr.appendChild(td);
        });
        tbody.appendChild(tr);

    });

    table.appendChild(tbody);
    container.appendChild(table);

    table.addEventListener("dblclick", handleDoubleClickTable)
}

function handleDoubleClickTable(event) {
    const tr = event.target.closest('tr');
    const tds = tr.querySelectorAll('td');
    const primaryKey = tds[0]?.dataset.col;
    const primaryKeyValue = tds[0]?.innerText;
    const data = getRowData(tds);

    openModal(columns, 'edit', data);
}

// Obter dados da linha editada
function getRowData(tr) {
    const data = {};
    tr.forEach(td => {
        data[td.dataset.col] = td.innerText;
    });
    return data;
}


function openModal(columnsForm, mode = 'insert', rowData = null) {
    const modal = document.getElementById("modal");
    const form = document.getElementById("modalForm");
    const title = document.getElementById("modalTitle");
    const btnSubmit = document.getElementById("btnSubmit");

    // título
    title.textContent = mode === 'insert' ? 'Inserir Dados' : 'Editar Dados';

    // limpa o form
    form.innerHTML = '';

    // cria campos dinamicamente
    columnsForm.forEach(col => {
        const label = document.createElement("label");
        label.textContent = col;

        const input = document.createElement("input");
        input.name = col;
        input.value = rowData?.[col] ?? '';

        label.appendChild(input);
        form.appendChild(label);
        form.appendChild(document.createElement("br"));
    });

    if (mode === 'edit') {
        const btnDelete = document.createElement("button");
        btnDelete.textContent = "Deletar";
        btnDelete.classList.add("btn-delete");
        btnDelete.type = "button";
        btnDelete.onclick = submitModalDelete;
        form.appendChild(btnDelete);
    }

    btnSubmit.innerText = "Salvar " + mode;
    btnSubmit.onclick = mode === 'insert' ? submitModalInsert : submitModalUpdate;

    modal.classList.remove("hidden");
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

function resetModal() {
    openModal(currentColumns, 'insert', null);
}

// você pode substituir essa função por qualquer lógica de submit real
function submitModalInsert() {
    const form = document.getElementById("modalForm");
    const formData = {};

    columns.forEach(col => {
        formData[col] = form.elements[col].value;
    });

    console.log(`Submit Insert:`, formData, form);

    vscode.postMessage({
        type: 'insert',
        data: formData
    });

    closeModal();
}

// você pode substituir essa função por qualquer lógica de submit real
function submitModalUpdate() {
    const form = document.getElementById("modalForm");
    const formData = {};

    columns.forEach(col => {
        formData[col] = form.elements[col].value;
    });

    console.log(`Submit Update:`, formData);

    vscode.postMessage({
        type: 'update',
        primaryKey: "id",
        primaryKeyValue: formData["id"],
        data: formData
    });

    closeModal();
}


function submitModalDelete() {
    const form = document.getElementById("modalForm");
    const formData = {};

    columns.forEach(col => {
        formData[col] = form.elements[col].value;
    });

    console.log(`Submit Delete:`, formData);

    vscode.postMessage({
        type: 'delete',
        primaryKey: "id",
        primaryKeyValue: formData["id"],
    });

    closeModal();
}
