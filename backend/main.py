import base64
import hashlib
import hmac
import html
import logging
import os
import secrets
from contextlib import asynccontextmanager, closing
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal
from urllib.parse import quote, urlsplit

from fastapi import Depends, FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from pydantic import BaseModel, EmailStr, Field
from psycopg2 import IntegrityError
from psycopg2.extras import Json, RealDictCursor
import requests

from database import get_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.auth_secret = _obter_segredo_autenticacao()
    yield


app = FastAPI(lifespan=lifespan)
bearer_scheme = HTTPBearer(auto_error=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UsuarioAuth(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    nome: str | None = Field(default=None, max_length=100)


class UsuarioPerfilAtualizacao(BaseModel):
    nome: str = Field(min_length=1, max_length=100)
    email: EmailStr = Field(max_length=150)


class SolicitarRecuperacaoSenha(BaseModel):
    email: EmailStr


class RedefinirSenha(BaseModel):
    token: str = Field(min_length=40, max_length=200)
    senha: str = Field(min_length=8, max_length=128)


class TransacaoCreate(BaseModel):
    categoria_id: int | None = Field(default=None, gt=0)
    categoria: str | None = Field(default=None, min_length=1, max_length=50)
    descricao: str = Field(min_length=1, max_length=150)
    valor: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    tipo: Literal["receita", "despesa"]
    data: date = Field(default_factory=date.today)


class CategoriaPreferencia(BaseModel):
    nome: str = Field(min_length=1, max_length=50)
    icone: str = Field(min_length=1, max_length=50)
    cor: str = Field(min_length=1, max_length=50)


class MetaFinanceira(BaseModel):
    id: int = Field(gt=0)
    nome: str = Field(min_length=1, max_length=100)
    icone: str = Field(min_length=1, max_length=50)
    meta: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    atual: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class LancamentoRecorrente(BaseModel):
    id: int = Field(gt=0)
    tipo: Literal["receita", "despesa"]
    descricao: str = Field(min_length=1, max_length=150)
    categoria: str = Field(min_length=1, max_length=50)
    valor: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class PreferenciasUsuario(BaseModel):
    categorias: list[CategoriaPreferencia] = Field(default_factory=list)
    limites_categoria: dict[str, Decimal] = Field(default_factory=dict)
    orcamento_mensal: Decimal = Field(default=Decimal("5000"), ge=0, max_digits=10, decimal_places=2)
    metas: list[MetaFinanceira] = Field(default_factory=list)
    recorrentes: list[LancamentoRecorrente] = Field(default_factory=list)


def _obter_segredo_autenticacao() -> bytes:
    segredo = os.getenv("AUTH_SECRET")
    if not segredo or len(segredo.encode("utf-8")) < 32:
        raise RuntimeError("AUTH_SECRET deve ter pelo menos 32 bytes.")
    return segredo.encode("utf-8")


def criar_token_acesso(usuario_id: int) -> str:
    return jwt.encode(
        {
            "sub": str(usuario_id),
            "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        },
        app.state.auth_secret,
        algorithm="HS256",
    )


def obter_usuario_autenticado(
    credenciais: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int:
    if not credenciais or credenciais.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credenciais.credentials,
            app.state.auth_secret,
            algorithms=["HS256"],
            options={"require": ["sub", "exp"]},
        )
        usuario_id = int(payload["sub"])
        if usuario_id <= 0:
            raise ValueError("ID de usuário inválido.")
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    return usuario_id


def exigir_usuario_da_rota(
    usuario_id: int = Path(gt=0),
    usuario_autenticado: int = Depends(obter_usuario_autenticado),
) -> int:
    if usuario_id != usuario_autenticado:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    return usuario_autenticado


def resposta_autenticacao(usuario: dict) -> dict:
    return {
        key: usuario[key]
        for key in ("id", "nome", "email")
    } | {
        "access_token": criar_token_acesso(usuario["id"]),
        "token_type": "bearer",
    }


def hash_senha(senha: str) -> str:
    salt = secrets.token_bytes(16)
    senha_hash = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, 600_000)
    salt_codificado = base64.urlsafe_b64encode(salt).decode("ascii")
    hash_codificado = base64.urlsafe_b64encode(senha_hash).decode("ascii")
    return f"pbkdf2_sha256$600000${salt_codificado}${hash_codificado}"


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        algoritmo, iteracoes, salt_codificado, hash_codificado = senha_hash.split("$")
        if algoritmo != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_codificado.encode("ascii"))
        hash_esperado = base64.urlsafe_b64decode(hash_codificado.encode("ascii"))
        hash_recebido = hashlib.pbkdf2_hmac(
            "sha256", senha.encode("utf-8"), salt, int(iteracoes)
        )
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(hash_recebido, hash_esperado)


def _garantir_tabela_tokens_recuperacao(cursor: RealDictCursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tokens_recuperacao_senha (
            id BIGSERIAL PRIMARY KEY,
            usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expira_em TIMESTAMPTZ NOT NULL,
            usado_em TIMESTAMPTZ,
            criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )
    cursor.execute(
        """
        ALTER TABLE tokens_recuperacao_senha
        ADD COLUMN IF NOT EXISTS usado_em TIMESTAMPTZ
        """
    )
    cursor.execute(
        """
        SELECT format_type(atttypid, atttypmod) AS tipo
        FROM pg_attribute
        WHERE attrelid = to_regclass('tokens_recuperacao_senha')
          AND attname = 'usado'
          AND NOT attisdropped
        """
    )
    coluna_legada_usado = cursor.fetchone()
    if coluna_legada_usado and coluna_legada_usado["tipo"] == "boolean":
        cursor.execute(
            """
            UPDATE tokens_recuperacao_senha
            SET usado_em = NOW()
            WHERE usado IS TRUE AND usado_em IS NULL
            """
        )
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tokens_recuperacao_usuario_criado
        ON tokens_recuperacao_senha (usuario_id, criado_em DESC)
        """
    )


def _enviar_email_recuperacao(email: str, token: str) -> None:
    api_key = os.getenv("BREVO_API_KEY")
    remetente = os.getenv("BREVO_FROM_EMAIL")
    nome_remetente = os.getenv("BREVO_FROM_NAME", "Meu Bolso")
    frontend_url = os.getenv("FRONTEND_URL")
    if not api_key or not remetente or not remetente.strip() or not frontend_url:
        logger.error(
            "Configura\u00e7\u00e3o de e-mail ausente: BREVO_API_KEY, BREVO_FROM_EMAIL ou FRONTEND_URL."
        )
        raise RuntimeError("O servi\u00e7o de e-mail n\u00e3o est\u00e1 configurado corretamente.")

    partes_url = urlsplit(frontend_url)
    if (
        partes_url.scheme != "https"
        or not partes_url.netloc
        or partes_url.query
        or partes_url.fragment
    ):
        raise RuntimeError("FRONTEND_URL deve ser uma URL HTTPS sem query ou fragmento.")

    link = f"{frontend_url.rstrip('/')}/#reset_token={quote(token, safe='')}"
    link_seguro = html.escape(link, quote=True)
    corpo_texto = (
        "Recebemos uma solicita\u00e7\u00e3o para redefinir a senha da sua conta Meu Bolso. "
        f"Acesse este link em at\u00e9 30 minutos: {link}"
    )
    corpo_html = (
        "<p>Recebemos uma solicita\u00e7\u00e3o para redefinir a senha da sua conta Meu Bolso.</p>"
        f'<p><a href="{link_seguro}">Redefinir minha senha</a></p>'
        "<p>O link expira em 30 minutos. Se voc\u00ea n\u00e3o fez esta solicita\u00e7\u00e3o, ignore este e-mail.</p>"
    )
    payload = {
        "sender": {"name": nome_remetente, "email": remetente.strip()},
        "to": [{"email": email}],
        "subject": "Recupera\u00e7\u00e3o de Senha - Meu Bolso",
        "textContent": corpo_texto,
        "htmlContent": corpo_html,
    }

    try:
        resposta = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            json=payload,
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
            },
            timeout=15,
        )
    except requests.RequestException as erro:
        logger.error(
            "Nao foi possivel conectar ao servico Brevo: %s", erro.__class__.__name__
        )
        raise RuntimeError("Nao foi possivel conectar ao servico de e-mail.") from None

    if resposta.status_code not in (200, 201, 202):
        try:
            erro_brevo = resposta.json()
        except ValueError:
            erro_brevo = {}
        codigo_erro = (
            erro_brevo.get("code")
            if isinstance(erro_brevo, dict)
            else None
        )
        mensagem_erro = (
            erro_brevo.get("message")
            if isinstance(erro_brevo, dict)
            else None
        )
        logger.error(
            "Brevo recusou o envio (HTTP %s, code=%s, message=%s).",
            resposta.status_code,
            codigo_erro or "indisponivel",
            str(mensagem_erro).replace("\r", " ").replace("\n", " ")[:300]
            if mensagem_erro
            else "indisponivel",
        )
        raise RuntimeError("O servico de e-mail recusou o envio.")

    try:
        resposta_brevo = resposta.json()
    except ValueError:
        resposta_brevo = {}
    logger.info(
        "Brevo aceitou e-mail de recuperacao (HTTP %s, messageId=%s).",
        resposta.status_code,
        resposta_brevo.get("messageId", "indisponivel"),
    )
MENSAGEM_RECUPERACAO = (
    "Se o e-mail estiver cadastrado, enviaremos instruções para recuperar a senha."
)


def _garantir_tabela_preferencias_usuario(cursor: RealDictCursor) -> None:
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS preferencias_usuario (
            usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
            dados JSONB NOT NULL DEFAULT '{}'::jsonb,
            atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )


def _obter_categoria_id(cursor: RealDictCursor, nome: str, tipo: str) -> int:
    cursor.execute(
        """
        SELECT id
        FROM categorias
        WHERE nome = %s AND tipo = %s
        ORDER BY id
        LIMIT 1
        """,
        (nome, tipo),
    )
    categoria = cursor.fetchone()
    if categoria:
        return categoria["id"]

    cursor.execute(
        """
        INSERT INTO categorias (nome, tipo)
        VALUES (%s, %s)
        RETURNING id
        """,
        (nome, tipo),
    )
    return cursor.fetchone()["id"]


@app.post("/api/auth/cadastro")
def cadastro(user: UsuarioAuth):
    try:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM usuarios WHERE email = %s",
                    (user.email,),
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Este e-mail já está cadastrado no sistema!",
                    )

                cursor.execute(
                    """
                    INSERT INTO usuarios (nome, email, senha_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id, nome, email
                    """,
                    (user.nome, user.email, hash_senha(user.senha)),
                )
                novo_usuario = cursor.fetchone()
            conn.commit()
            return resposta_autenticacao(novo_usuario)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado.") from exc


@app.post("/api/auth/login")
def login(user: UsuarioAuth):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, nome, email, senha_hash FROM usuarios WHERE email = %s",
                (user.email,),
            )
            usuario = cursor.fetchone()

    if not usuario or not verificar_senha(user.senha, usuario["senha_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas.")

    return resposta_autenticacao(usuario)


@app.post("/api/auth/recuperar-senha", status_code=202)
def solicitar_recuperacao_senha(solicitacao: SolicitarRecuperacaoSenha):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            _garantir_tabela_tokens_recuperacao(cursor)
            cursor.execute(
                "DELETE FROM tokens_recuperacao_senha WHERE expira_em < NOW() - INTERVAL '1 day'"
            )
            cursor.execute(
                "SELECT id FROM usuarios WHERE LOWER(email) = LOWER(%s) FOR UPDATE",
                (solicitacao.email,),
            )
            usuario = cursor.fetchone()
            if not usuario:
                logger.info(
                    "Solicitação de recuperação concluída sem envio: conta não localizada."
                )
                conn.commit()
                return {"mensagem": MENSAGEM_RECUPERACAO}

            cursor.execute(
                """
                SELECT 1
                FROM tokens_recuperacao_senha
                WHERE usuario_id = %s
                  AND criado_em > NOW() - INTERVAL '1 minute'
                LIMIT 1
                """,
                (usuario["id"],),
            )
            if cursor.fetchone():
                logger.info(
                    "Solicitação de recuperação ignorada pelo limite de uma por minuto."
                )
                conn.commit()
                return {"mensagem": MENSAGEM_RECUPERACAO}

            cursor.execute(
                """
                INSERT INTO tokens_recuperacao_senha (usuario_id, token_hash, expira_em)
                VALUES (%s, %s, NOW() + INTERVAL '30 minutes')
                """,
                (usuario["id"], token_hash),
            )
        conn.commit()

    try:
        logger.info("Enviando e-mail de recuperação pelo Brevo.")
        _enviar_email_recuperacao(str(solicitacao.email), token)
    except RuntimeError as erro:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM tokens_recuperacao_senha WHERE token_hash = %s",
                    (token_hash,),
                )
            conn.commit()
        logger.error("Falha no envio do e-mail de recuperação: %s", erro)
        raise HTTPException(
            status_code=503,
            detail="Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.",
        ) from None

    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE tokens_recuperacao_senha
                SET usado_em = NOW()
                WHERE usuario_id = %s
                  AND token_hash <> %s
                  AND usado_em IS NULL
                """,
                (usuario["id"], token_hash),
            )
        conn.commit()

    return {"mensagem": MENSAGEM_RECUPERACAO}


@app.post("/api/auth/redefinir-senha")
def redefinir_senha(solicitacao: RedefinirSenha):
    token_hash = hashlib.sha256(solicitacao.token.encode("utf-8")).hexdigest()
    nova_senha_hash = hash_senha(solicitacao.senha)

    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            _garantir_tabela_tokens_recuperacao(cursor)
            cursor.execute(
                """
                SELECT id, usuario_id
                FROM tokens_recuperacao_senha
                WHERE token_hash = %s
                  AND usado_em IS NULL
                  AND expira_em > NOW()
                FOR UPDATE
                """,
                (token_hash,),
            )
            token = cursor.fetchone()
            if not token:
                raise HTTPException(
                    status_code=400,
                    detail="O link de redefinição é inválido ou expirou. Solicite outro.",
                )

            cursor.execute(
                "UPDATE usuarios SET senha_hash = %s WHERE id = %s",
                (nova_senha_hash, token["usuario_id"]),
            )
            cursor.execute(
                """
                UPDATE tokens_recuperacao_senha
                SET usado_em = NOW()
                WHERE usuario_id = %s AND usado_em IS NULL
                """,
                (token["usuario_id"],),
            )
        conn.commit()

    return {"mensagem": "Senha redefinida. Você já pode entrar com a nova senha."}


@app.put("/api/auth/perfil")
def atualizar_perfil(
    perfil: UsuarioPerfilAtualizacao,
    usuario_id: int = Depends(obter_usuario_autenticado),
):
    try:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE usuarios
                    SET nome = %s, email = %s
                    WHERE id = %s
                    RETURNING id, nome, email
                    """,
                    (perfil.nome, perfil.email, usuario_id),
                )
                usuario = cursor.fetchone()
                if not usuario:
                    raise HTTPException(status_code=404, detail="Usuário não encontrado.")
            conn.commit()
            return usuario
    except IntegrityError as exc:
        raise HTTPException(
            status_code=409,
            detail="Este e-mail já está cadastrado em outra conta.",
        ) from exc


@app.get("/api/preferencias")
def obter_preferencias_usuario(
    usuario_id: int = Depends(obter_usuario_autenticado),
):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            _garantir_tabela_preferencias_usuario(cursor)
            cursor.execute(
                "SELECT dados FROM preferencias_usuario WHERE usuario_id = %s",
                (usuario_id,),
            )
            registro = cursor.fetchone()
        conn.commit()

    configurado = registro is not None
    dados = registro["dados"] if configurado else {}
    preferencias = PreferenciasUsuario.model_validate(dados)
    return {
        "configurado": configurado,
        **preferencias.model_dump(mode="json"),
    }


@app.put("/api/preferencias")
def salvar_preferencias_usuario(
    preferencias: PreferenciasUsuario,
    usuario_id: int = Depends(obter_usuario_autenticado),
):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            _garantir_tabela_preferencias_usuario(cursor)
            cursor.execute(
                """
                INSERT INTO preferencias_usuario (usuario_id, dados, atualizado_em)
                VALUES (%s, %s, NOW())
                ON CONFLICT (usuario_id)
                DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = NOW()
                """,
                (usuario_id, Json(preferencias.model_dump(mode="json"))),
            )
        conn.commit()

    return preferencias.model_dump(mode="json")


@app.get("/api/transacoes/{usuario_id}")
def listar_transacoes(usuario_id: int = Depends(exigir_usuario_da_rota)):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT t.id, t.descricao, t.valor, t.data, t.tipo,
                       CASE WHEN t.tipo = 'receita' THEN 'Receita' ELSE c.nome END AS categoria,
                       c.icone, c.cor
                FROM transacoes t
                LEFT JOIN categorias c ON t.categoria_id = c.id
                WHERE t.usuario_id = %s
                ORDER BY t.data DESC
                """,
                (usuario_id,),
            )
            return cursor.fetchall()


@app.post("/api/transacoes")
def criar_transacao(
    transacao: TransacaoCreate,
    usuario_id: int = Depends(obter_usuario_autenticado),
):
    try:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                categoria_id = transacao.categoria_id
                if transacao.categoria:
                    categoria_id = _obter_categoria_id(
                        cursor, transacao.categoria, transacao.tipo
                    )
                elif categoria_id is None:
                    raise HTTPException(
                        status_code=400,
                        detail="Informe uma categoria válida para a transação.",
                    )

                cursor.execute(
                    """
                    INSERT INTO transacoes
                        (usuario_id, categoria_id, descricao, valor, tipo, data)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        usuario_id,
                        categoria_id,
                        transacao.descricao,
                        transacao.valor,
                        transacao.tipo,
                        transacao.data,
                    ),
                )
                novo_id = cursor.fetchone()["id"]
            conn.commit()
            return {"mensagem": "Sucesso", "id": novo_id}
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400, detail="Usuário ou categoria inválidos para a transação."
        ) from exc


@app.put("/api/transacoes/{transacao_id}")
def atualizar_transacao(
    transacao: TransacaoCreate,
    transacao_id: int = Path(gt=0),
    usuario_id: int = Depends(obter_usuario_autenticado),
):
    nome_categoria = "Salário" if transacao.tipo == "receita" else transacao.categoria
    if not nome_categoria:
        raise HTTPException(status_code=400, detail="Informe uma categoria válida.")

    try:
        with closing(get_db()) as conn:
            with conn.cursor() as cursor:
                categoria_id = _obter_categoria_id(
                    cursor, nome_categoria, transacao.tipo
                )
                cursor.execute(
                    """
                    UPDATE transacoes
                    SET categoria_id = %s, descricao = %s, valor = %s,
                        data = %s, tipo = %s
                    WHERE id = %s AND usuario_id = %s
                    RETURNING id
                    """,
                    (
                        categoria_id,
                        transacao.descricao,
                        transacao.valor,
                        transacao.data,
                        transacao.tipo,
                        transacao_id,
                        usuario_id,
                    ),
                )
                atualizado = cursor.fetchone()
            conn.commit()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400, detail="Usuário ou categoria inválidos para a transação."
        ) from exc

    if not atualizado:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")
    return {"mensagem": "Lançamento atualizado.", "id": atualizado["id"]}


@app.delete("/api/transacoes/{transacao_id}", status_code=204)
def excluir_transacao(
    transacao_id: int = Path(gt=0),
    usuario_id: int = Depends(obter_usuario_autenticado),
):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM transacoes WHERE id = %s AND usuario_id = %s RETURNING id",
                (transacao_id, usuario_id),
            )
            excluida = cursor.fetchone()
        conn.commit()

    if not excluida:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")


@app.get("/api/resumo/{usuario_id}")
def resumo_dashboard(
    usuario_id: int = Depends(exigir_usuario_da_rota),
    ano: int | None = Query(default=None, ge=2000, le=9999),
    mes: int | None = Query(default=None, ge=1, le=12),
):
    if (ano is None) != (mes is None):
        raise HTTPException(
            status_code=400, detail="Informe ano e mês juntos para filtrar o resumo."
        )
    inicio_mes = date(ano, mes, 1) if ano is not None and mes is not None else None
    proximo_mes = (
        (inicio_mes.replace(day=28) + timedelta(days=4)).replace(day=1)
        if inicio_mes is not None
        else None
    )

    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            consulta = """
                SELECT
                    COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0)
                        AS total_receitas,
                    COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
                        AS total_despesas
                FROM transacoes
                WHERE usuario_id = %s
            """
            parametros: tuple = (usuario_id,)
            if inicio_mes is not None and proximo_mes is not None:
                consulta += " AND data >= %s AND data < %s"
                parametros = (usuario_id, inicio_mes, proximo_mes)
            cursor.execute(consulta, parametros)
            totais = cursor.fetchone()

    receitas = totais["total_receitas"]
    despesas = totais["total_despesas"]
    return {
        "saldo_atual": float(receitas - despesas),
        "total_receitas": float(receitas),
        "total_despesas": float(despesas),
    }


@app.get("/api/relatorios/evolucao-saldo/{usuario_id}")
def relatorio_evolucao_saldo(
    usuario_id: int = Depends(exigir_usuario_da_rota),
):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH dias AS (
                    SELECT generate_series(
                        CURRENT_DATE - INTERVAL '6 days',
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::date AS data
                ),
                saldo_anterior AS (
                    SELECT COALESCE(
                        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END),
                        0
                    ) AS saldo
                    FROM transacoes
                    WHERE usuario_id = %s
                      AND data < CURRENT_DATE - INTERVAL '6 days'
                ),
                movimentos AS (
                    SELECT
                        data,
                        SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END)
                            AS movimento
                    FROM transacoes
                    WHERE usuario_id = %s
                      AND data >= CURRENT_DATE - INTERVAL '6 days'
                      AND data <= CURRENT_DATE
                    GROUP BY data
                )
                SELECT
                    dias.data,
                    saldo_anterior.saldo
                        + SUM(COALESCE(movimentos.movimento, 0))
                            OVER (ORDER BY dias.data) AS saldo
                FROM dias
                CROSS JOIN saldo_anterior
                LEFT JOIN movimentos ON movimentos.data = dias.data
                ORDER BY dias.data
                """,
                (usuario_id, usuario_id),
            )
            dias = cursor.fetchall()

    return [
        {"data": dia["data"].isoformat(), "saldo": float(dia["saldo"])}
        for dia in dias
    ]


@app.get("/api/relatorios/mensal/{usuario_id}")
def relatorio_mensal(
    usuario_id: int = Depends(exigir_usuario_da_rota),
    ano: int = Query(default=date.today().year, ge=2000, le=9999),
    mes: int = Query(default=date.today().month, ge=1, le=12),
):
    inicio = date(ano, mes, 1)
    proximo_mes = (inicio.replace(day=28) + timedelta(days=4)).replace(day=1)

    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    t.data,
                    COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END), 0)
                        AS receitas,
                    COALESCE(SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END), 0)
                        AS despesas
                FROM transacoes t
                WHERE t.usuario_id = %s
                  AND t.data >= %s
                  AND t.data < %s
                GROUP BY t.data
                ORDER BY t.data
                """,
                (usuario_id, inicio, proximo_mes),
            )
            dias = cursor.fetchall()

    return [
        {
            "data": dia["data"].isoformat(),
            "receitas": float(dia["receitas"]),
            "despesas": float(dia["despesas"]),
        }
        for dia in dias
    ]


@app.get("/api/relatorios/categorias/{usuario_id}")
def relatorio_categorias(
    usuario_id: int = Depends(exigir_usuario_da_rota),
    ano: int = Query(default=date.today().year, ge=2000, le=9999),
    mes: int = Query(default=date.today().month, ge=1, le=12),
):
    inicio = date(ano, mes, 1)
    proximo_mes = (inicio.replace(day=28) + timedelta(days=4)).replace(day=1)

    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.nome AS categoria, SUM(t.valor) AS total
                FROM transacoes t
                LEFT JOIN categorias c ON t.categoria_id = c.id
                WHERE t.usuario_id = %s
                  AND t.tipo = 'despesa'
                  AND t.data >= %s
                  AND t.data < %s
                GROUP BY c.nome
                ORDER BY total DESC
                """,
                (usuario_id, inicio, proximo_mes),
            )
            categorias = cursor.fetchall()

    return [
        {"categoria": categoria["categoria"] or "Sem categoria", "total": float(categoria["total"])}
        for categoria in categorias
    ]


@app.get("/api/relatorios/comparativos/{usuario_id}")
def relatorio_comparativos(usuario_id: int = Depends(exigir_usuario_da_rota)):
    with closing(get_db()) as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH meses AS (
                    SELECT generate_series(
                        date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                        date_trunc('month', CURRENT_DATE),
                        INTERVAL '1 month'
                    )::date AS inicio
                )
                SELECT
                    to_char(m.inicio, 'YYYY-MM') AS mes,
                    COALESCE(SUM(CASE WHEN t.tipo = 'receita' THEN t.valor ELSE 0 END), 0)
                        AS receitas,
                    COALESCE(SUM(CASE WHEN t.tipo = 'despesa' THEN t.valor ELSE 0 END), 0)
                        AS despesas
                FROM meses m
                LEFT JOIN transacoes t
                    ON t.usuario_id = %s
                    AND t.data >= m.inicio
                    AND t.data < m.inicio + INTERVAL '1 month'
                GROUP BY m.inicio
                ORDER BY m.inicio
                """,
                (usuario_id,),
            )
            meses = cursor.fetchall()

    return [
        {
            "mes": mes["mes"],
            "receitas": float(mes["receitas"]),
            "despesas": float(mes["despesas"]),
        }
        for mes in meses
    ]
