CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    icone VARCHAR(50) DEFAULT 'fa-ellipsis',
    cor VARCHAR(50) DEFAULT 'outros',
    UNIQUE (nome, tipo)
);

CREATE TABLE IF NOT EXISTS transacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    categoria_id INT NOT NULL REFERENCES categorias(id),
    descricao VARCHAR(150) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
    data DATE DEFAULT CURRENT_DATE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa'))
);

CREATE INDEX IF NOT EXISTS idx_transacoes_usuario_data
    ON transacoes (usuario_id, data DESC);

INSERT INTO categorias (nome, tipo, icone, cor) VALUES
    ('Moradia', 'despesa', 'fa-house', 'moradia'),
    ('Alimentação', 'despesa', 'fa-cart-shopping', 'alimentacao'),
    ('Transporte', 'despesa', 'fa-car', 'transporte'),
    ('Salário', 'receita', 'fa-sack-dollar', 'outros')
ON CONFLICT (nome, tipo) DO NOTHING;
