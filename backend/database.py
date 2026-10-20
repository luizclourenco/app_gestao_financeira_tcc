import os

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

load_dotenv()


def get_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("A variável de ambiente DATABASE_URL não está configurada.")

    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)
