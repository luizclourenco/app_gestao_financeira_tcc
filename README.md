# App de Gestão Financeira (TCC)

Repositório  provisório do projeto de Conclusão de Curso (TCC) em Engenharia de Software.

O **Grana em Dia / Meu Controle** é um aplicativo de gestão financeira pessoal desenvolvido para otimizar o controle orçamentário, o acompanhamento de metas e o registro analítico de receitas e despesas. O projeto adota uma arquitetura limpa em camadas, consultas otimizadas com **SQL nativo**, padrões rigorosos de segurança e diretrizes de acessibilidade web.

---

## 📂 Documentação Completa (Pasta `/docs`)

Para uma avaliação aprofundada de todas as etapas de planejamento, arquitetura e engenharia do sistema, a pasta **`/docs`** deste repositório disponibiliza a documentação integral do projeto, contendo:
- O **Modelo Conceitual e de Dados (DER)** detalhado.
- O **Modelo Funcional (YFrame)** estruturado em Entradas, Processamento e Saídas.
- Os fluxogramas, especificações e wireframes das **6 telas principais** do aplicativo.

---

## 🏗️ Arquitetura do Sistema

A aplicação separa de forma estrita as responsabilidades entre interface, lógica de negócio e persistência de dados:

```text
       ┌─────────────────────────────────────────┐
       │   Frontend Web (HTML5, CSS3, JS)        │
       │         [Hospedado no GitHub Pages]     │
       └────────────────────┬────────────────────┘
                            │
                     HTTP / JSON (REST API)
                            │
       ┌────────────────────▼────────────────────┐
       │   Backend API (Python + FastAPI)        │
       │         [Hospedado no Render]           │
       └────────────────────┬────────────────────┘
                            │
                       Psycopg2 (SQL Nativo)
                            │
       ┌────────────────────▼────────────────────┐
       │   Banco de Dados PostgreSQL             │
       │         [Hospedado no Neon.tech]        │
       └─────────────────────────────────────────┘
