from contextlib import contextmanager
import os
from threading import BoundedSemaphore, Lock

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

load_dotenv()

_POOL_MIN_CONNECTIONS = 1
_POOL_MAX_CONNECTIONS = 10
_pool = None
_pool_lock = Lock()
_connection_slots = BoundedSemaphore(_POOL_MAX_CONNECTIONS)


def _get_pool():
    global _pool

    if _pool is None:
        with _pool_lock:
            if _pool is None:
                database_url = os.getenv("DATABASE_URL")
                if not database_url:
                    raise RuntimeError(
                        "A variável de ambiente DATABASE_URL não está configurada."
                    )
                _pool = ThreadedConnectionPool(
                    _POOL_MIN_CONNECTIONS,
                    _POOL_MAX_CONNECTIONS,
                    database_url,
                    cursor_factory=RealDictCursor,
                )
    return _pool


@contextmanager
def get_db():
    pool = _get_pool()
    _connection_slots.acquire()
    conn = None
    try:
        conn = pool.getconn()
        yield conn
    finally:
        if conn is None:
            _connection_slots.release()
        else:
            try:
                if conn.closed:
                    pool.putconn(conn, close=True)
                else:
                    try:
                        conn.rollback()
                    except psycopg2.Error:
                        pool.putconn(conn, close=True)
                        raise
                    pool.putconn(conn)
            finally:
                _connection_slots.release()


def close_db_pool():
    global _pool

    with _pool_lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None
