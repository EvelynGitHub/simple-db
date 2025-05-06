# ![Simple DB Logo](https://raw.githubusercontent.com/EvelynGitHub/simple-db/main/media/logo.png)


![image](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black) ![image](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white) ![image](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white) ![image](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![image](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![image](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white) ![image](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) ![image](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white) ![image](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)

# Simple DB – VSCode Extension

Extensão para Visual Studio Code para explorar e manipular bancos de dados locais de forma simples e prática.

> Inspirada em extensões como [Database Client](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2) e ferramentas como DBeaver, com foco em leveza, simplicidade e funcionalidades essenciais.

---
# ![Conexão](https://raw.githubusercontent.com/EvelynGitHub/simple-db/main/media/conexao.gif)


# ![Exibição tabela](https://raw.githubusercontent.com/EvelynGitHub/simple-db/main/media/exibi_tabela.gif)


# ![Edição tabela](https://raw.githubusercontent.com/EvelynGitHub/simple-db/main/media/edita_tabela.gif)

# ![Execução de Query](https://raw.githubusercontent.com/EvelynGitHub/simple-db/main/media/query_run.gif)
---

## 📦 Instalação

### Via `.vsix` (Instalação Local)
> Nova versão 0.0.2 liberada

1. Clone o repositório ou baixe o `.vsix` gerado <a href="https://github.com/EvelynGitHub/simple-db/raw/refs/heads/main/simple-db-0.0.2.vsix" download>download aqui</a>:
    ```bash
    git clone https://github.com/EvelynGitHub/simple-db.git
    cd simple-db
    npm install
    npm run package

    # Caso queira gerar seu próprio .vsix depois de uma modificação
    sudo npm install -g @vscode/vsce # ou npx @vscode/vsce package

    npm run build
    vsce package
    
    ``` 

2. No VSCode:
    - Vá até a aba de extensões (`Ctrl+Shift+X`)
    - Clique nos três pontinhos `⋮` → “Instalar via VSIX…”
    - Selecione o arquivo gerado `simple-db-0.0.2.vsix`


### Via Marketplace (em breve)
A extensão será publicada futuramente no Marketplace do VSCode.

---

## 🚀 Funcionalidades

- [x] Conectar a bancos SQLite, PostgresSQL e MySql
- [x] Navegar por bancos, tabelas e colunas na **barra lateral**
- [x] Visualizar os dados das tabelas ao clicar
- [x] Inserir, editar e excluir registros
- [x] Executar comandos SQL
- [x] Atualizar a visualização da tabela com botão de **refresh**

---

## 📂 Estrutura do Projeto
```
simple-db/ 
├── src/
|   ├── commands/            # Todos os comandos registrados
|   │   ├── DatabaseCommands.ts
|   │   ├── TableCommands.ts
|   │   ├── RecordCommands.ts
|   │   └── ConnectionCommands.ts
|   │
|   ├── database/            # Lógica de conexão e drivers
|   │   ├── ConnectionManager.ts
|   │   ├── DriverFactory.ts
|   │   ├── drivers/
|   │   │   ├── DatabaseDriver.ts
|   │   │   ├── SQLiteDriver.ts
|   │   │   ├── MySQLDriver.ts
|   │   │   └── PostgresDriver.ts
|   │
|   ├── tree/                # Itens exibidos na árvore
|   │   ├── DatabaseTreeProvider.ts
|   │   ├── DatabaseItem.ts
|   │   ├── TableItem.ts
|   │   └── ColumnItem.ts
|   │
|   ├── views/               # Webviews (telas de interação)(.html, .css e .js movidos para media por limitação do VScode)
|   │   ├── connection/       # Tudo relacionado a Conexões
|   │   │   ├── ConnectionFormPanel.ts
|   │   │   └── connectionForm.html
|   │   │
|   │   ├── database/         # Telas de criação de Banco de Dados
|   │   │   ├── CreateDatabasePanel.ts
|   │   │   └── createDatabase.html
|   │   │
|   │   ├── table/            # Telas de criação de Tabela
|   │   │   ├── CreateTablePanel.ts
|   │   │   └── createTable.html
|   │   │
|   │   ├── record/           # Telas de CRUD de registros
|   │   │   ├── RecordTablePanel.ts
|   │   │   └── recordTable.html
|   │
|   ├── utils/               # Funções utilitárias
|   │   ├── Config.ts
|   │   └── Helpers.ts
|   ├── extension.ts         # Ponto principal da extensão
├── media/ # Arquivos estáticos 
│   └── logo.svg # Ícone/Logo da extensão 
├── types.ts             # Definições globais de tipos
├── tsconfig.json
├── package.json
├── README.md
```


---

## 💻 Atalhos & Comandos

| Comando                     | Ação                                |
|----------------------------|-------------------------------------|
| `Simple DB: Connect`       | Selecionar arquivo SQLite           |
| Clique em uma tabela       | Visualizar dados da tabela          |
| Botões no topo do painel   | `Insert`, `Update`, `Delete`, `Refresh` |

---

## 🛣️ Roadmap

- [x] Suporte a SQLite
- [x] Suporte a PostgreSQL e MySQL
- [x] Autocompletar SQL
- [x] Auto save ao pressionar Enter
- [ ] Editor SQL completo

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas!  
Sinta-se à vontade para abrir issues, PRs ou sugerir melhorias.

```bash
# Instale dependências
npm install

# Rode o ambiente de desenvolvimento
npm run watch
code .
```


## ⚖️ Licença
MIT

## 📌 Autor
Feito com 💙 por [Evelyn FB]
🔗 GitHub: github.com/EvelynGitHub