# ![Simple DB Logo](./media/logo.png)  
# Simple DB – VSCode Extension

Extensão para Visual Studio Code para explorar e manipular bancos de dados locais de forma simples e prática.

> Inspirada em extensões como [Database Client](https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-database-client2) e ferramentas como DBeaver, com foco em leveza, simplicidade e funcionalidades essenciais.

---

## 📦 Instalação

### Via `.vsix` (Instalação Local)

1. Clone o repositório ou baixe o `.vsix` gerado [aqui](./):
    ```bash
    git clone https://github.com/EvelynGitHub/simple-db.git
    cd simple-db
    npm install
    npm run package

    # Caso queira gerar seu próprio .vsix depois de uma modificação
    sudo npm install -g @vscode/vsce # ou npx @vscode/vsce package

    vsce package
    
    ``` 

2. No VSCode:
    - Vá até a aba de extensões (`Ctrl+Shift+X`)
    - Clique nos três pontinhos `⋮` → “Instalar via VSIX…”
    - Selecione o arquivo gerado `simple-db-0.0.1.vsix`


### Via Marketplace (em breve)
A extensão será publicada futuramente no Marketplace do VSCode.

---

## 🚀 Funcionalidades

- [x] Conectar a bancos SQLite (outros bancos em breve)
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
│ ├── extension.ts # Entry point da extensão 
│ ├── tree/ # Itens da árvore do explorer 
│ │ ├── DatabaseTreeProvider.ts 
│ │ ├── DatabaseItem.ts 
│ │ ├── TableItem.ts 
│ │ └── ColumnItem.ts 
│ ├── views/ 
│ │ └── TableViewPanel.ts # Painel que exibe os dados da tabela 
│ ├── database/ 
│ │ ├── ConnectionManager.ts # Gerencia conexões com bancos 
│ │ ├── QueryRunner.ts # Executa comandos SQL 
│ ├── commands/ 
│ │ ├── RegisterCommands.ts # Registro e lógica dos comandos 
│ └── utils/ 
│ └── Config.ts # Utilitários e helpers 
├── media/ 
│ └── logo.svg # Ícone/Logo da extensão 
├── package.json 
├── tsconfig.json 
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
- [ ] Suporte a PostgreSQL e MySQL
- [ ] Exportar dados como CSV/JSON
- [ ] Histórico de queries
- [ ] Autocompletar SQL
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