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
```

## Persistência dos dados

Transações, totais e relatórios são consultados no backend e persistidos no
Neon. Edição e exclusão de transações também atualizam o banco. Metas,
categorias personalizadas, limites por categoria, orçamento mensal e regras
recorrentes são sincronizados por conta na tabela `preferencias_usuario`
(JSONB). O backend cria essa tabela com `IF NOT EXISTS` na primeira consulta;
o usuário PostgreSQL configurado em `DATABASE_URL` precisa poder criar tabelas.

A tabela de recuperação de senha é compatibilizada automaticamente: se ela já
existir com a coluna legada `usado` (boolean), o backend adiciona `usado_em` e
preserva como usados os tokens que já estavam marcados dessa forma.

As preferências já existentes no navegador são migradas para a conta na
primeira autenticação. O botão de recorrências gera os próximos lançamentos
sob demanda; não existe execução automática mensal no servidor.
