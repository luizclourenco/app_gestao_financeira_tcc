# App de Gestão Financeira (TCC)

## Recuperação de senha em produção

No Render, configure `BREVO_API_KEY` como segredo, `BREVO_FROM_EMAIL` com um
remetente/domínio verificado no Brevo, `BREVO_FROM_NAME` opcional e `FRONTEND_URL`
com `https://luizclourenco.github.io/app_gestao_financeira_tcc/`. A chave do
Brevo fica somente no backend e não deve ser adicionada ao frontend ou ao Git.

Na primeira solicitação de recuperação, o backend cria no Neon a tabela
`tokens_recuperacao_senha` e seu índice, sem alterar os dados existentes. O
usuário PostgreSQL de `DATABASE_URL` precisa ter permissão para criar esses
objetos. O link enviado expira em 30 minutos e só pode ser usado uma vez.

O endpoint responde `202 Accepted` mesmo quando o e-mail não corresponde a uma
conta ou quando uma solicitação foi limitada; esse status, por si só, não
confirma envio. Para diagnosticar, consulte os logs do Render: eles informam se
a conta não foi localizada, se houve limite de uma solicitação por minuto, se
a chamada ao Brevo foi iniciada, aceita (com o ID do provedor) ou recusada.

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
