# App de Gestão Financeira (TCC)

Repositório do nosso projeto de TCC de Engenharia de Software.

O sistema é um aplicativo de controle financeiro pessoal, com foco no gerenciamento de receitas, despesas e relatórios financeiros. O projeto é desenvolvido com ênfase em uma arquitetura organizada, separação de responsabilidades e utilização de SQL nativo.

Para organizar o desenvolvimento e separar as responsabilidades entre as equipes, o repositório é dividido em duas frentes:

- **/backend:** API desenvolvida em Python utilizando FastAPI, com PostgreSQL como banco de dados e acesso ao banco por meio do Psycopg2.
- **/frontend:** Interface web desenvolvida em HTML, CSS e JavaScript, responsável pela interação com o usuário e pelo consumo dos endpoints disponibilizados pela API. O frontend será hospedado pelo GitHub Pages.

## Tecnologias Utilizadas

### Backend
- Python
- FastAPI
- Psycopg2
- PostgreSQL
- SQL

### Frontend
- HTML5
- CSS3
- JavaScript

### Infraestrutura
- GitHub / GitHub Pages
- Render

## Arquitetura

A aplicação utiliza uma arquitetura baseada na separação entre frontend, API e banco de dados:

```text
Frontend (GitHub Pages)
        ↓
     HTTP/JSON
        ↓
Backend (FastAPI)
        ↓
      Psycopg2
        ↓
    PostgreSQL
