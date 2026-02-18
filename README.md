# 🐉 Dragon SX2000

Navegador desktop customizável desenvolvido com Electron, com página inicial personalizada e integração com Google Search.

---

## 📁 Estrutura do Projeto

```
Dragon-SX2000/
├── Frontend/                 # Frontend da aplicação
│   └── src/
│       ├── index.html       # HTML principal
│       ├── css/
│       │   └── styles.css   # Estilos da aplicação
│       └── js/
│           ├── app.js       # Lógica principal e inicialização
│           ├── tabs.js      # Gerenciamento de abas
│           └── search.js    # Lógica de busca
│
├── Backend/                  # Backend (API opcional)
│   ├── server.js            # Servidor Express
│   └── package.json         # Dependências do backend
│
├── main.js                  # Processo principal do Electron
├── preload.js               # Script de pré-carregamento
├── package.json             # Configuração do projeto Electron
└── README.md                # Este arquivo
```

---

## 🎯 Funcionalidades

- ✅ **Página Inicial Personalizada**: Interface moderna com gradiente e animações
- ✅ **Sistema de Abas**: Gerenciamento completo de abas com botão de fechar
- ✅ **Busca no Google**: Pesquisa integrada que abre resultados em nova aba
- ✅ **Links Rápidos**: Acesso rápido a sites populares (YouTube, GitHub, etc.)
- ✅ **Interface Moderna**: Design com glassmorphism e animações suaves

---

## 🛠️ Tecnologias Utilizadas

- **Electron**: Framework para aplicações desktop
- **Node.js**: Runtime JavaScript
- **HTML5/CSS3**: Interface e estilização
- **JavaScript (Vanilla)**: Lógica da aplicação
- **Express** (Backend opcional): API para funcionalidades futuras

---

## 💻 Como Executar

### Pré-requisitos

- Node.js (versão LTS recomendada)
- npm

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/Yacsu77/Dragon-SX2000.git
cd Dragon-SX2000
```

2. Instale as dependências do Electron:
```bash
npm install
```

3. (Opcional) Instale as dependências do Backend:
```bash
cd Backend
npm install
cd ..
```

### Executar a Aplicação

```bash
npm start
```

### Executar o Backend (se necessário)

```bash
cd Backend
npm start
```

---

## 📂 Organização do Código

### Frontend

- **`index.html`**: Estrutura HTML da aplicação
- **`css/styles.css`**: Todos os estilos organizados por seções
- **`js/app.js`**: Inicialização e gerenciamento geral da aplicação
- **`js/tabs.js`**: Funções para criar, ativar e fechar abas
- **`js/search.js`**: Lógica de busca e integração com Google

### Backend

- **`server.js`**: Servidor Express (atualmente usado para API de busca opcional)

### Electron

- **`main.js`**: Processo principal que cria a janela do Electron
- **`preload.js`**: Script de pré-carregamento para segurança

---

## 🎨 Características da Interface

- **Design Moderno**: Gradiente roxo/azul com efeitos visuais
- **Glassmorphism**: Efeitos de vidro fosco (backdrop-filter)
- **Animações Suaves**: Transições e hover effects
- **Responsivo**: Interface adaptável

---

## 🚀 Próximos Passos

- [ ] Histórico de navegação
- [ ] Favoritos/Bookmarks
- [ ] Modo escuro/claro
- [ ] Extensões personalizadas
- [ ] Sincronização de dados
- [ ] Timer de produtividade
- [ ] Relatórios de uso

---

## 📝 Licença

ISC

---

## 👨‍💻 Autor

Desenvolvido com ❤️ para uma experiência de navegação única.