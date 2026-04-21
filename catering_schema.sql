-- ============================================================
--  CATERING NOELMA RUDOLF — Schema PostgreSQL (Supabase)
--  Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELAS
-- ============================================================

-- Perfil de usuário (complementa o Supabase Auth)
create table if not exists public.usuarios (
  id         uuid primary key default uuid_generate_v4(),
  nome       text not null,
  email      text not null unique,
  papel      text not null default 'usuario' check (papel in ('admin', 'usuario')),
  created_at timestamptz not null default now()
);

-- Clientes
create table if not exists public.clientes (
  id            uuid primary key default uuid_generate_v4(),
  nome          text not null,
  nome_contato  text,
  cpf_cnpj      text,
  telefone      text,
  email         text,
  endereco      text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Eventos
create table if not exists public.eventos (
  id            uuid primary key default uuid_generate_v4(),
  cliente_id    uuid not null references public.clientes(id) on delete restrict,
  data_evento   date not null,
  local         text,
  pax           integer,
  valor_total   numeric(12,2) not null default 0,
  valor_sinal   numeric(12,2) not null default 0,
  valor_saldo   numeric(12,2) generated always as (valor_total - valor_sinal) stored,
  status        text not null default 'aguardando'
                  check (status in ('aguardando','confirmado','faturado','recebido','cancelado')),
  cardapio_obs  text,
  created_at    timestamptz not null default now()
);

-- Faturas
create table if not exists public.faturas (
  id                 uuid primary key default uuid_generate_v4(),
  evento_id          uuid not null unique references public.eventos(id) on delete restrict,
  numero             text not null unique,
  vencimento         date,
  forma_pagamento    text,
  dados_pix          text,
  responsavel_nome   text,
  responsavel_email  text,
  obs_faturamento    text,
  status             text not null default 'aguardando'
                       check (status in ('aguardando','recebido')),
  emitida_em         timestamptz not null default now(),
  recebida_em        timestamptz
);

-- Despesas
create table if not exists public.despesas (
  id                  uuid primary key default uuid_generate_v4(),
  descricao           text not null,
  valor               numeric(12,2) not null,
  data                date not null,
  categoria           text not null default 'Outros',
  classificacao       text not null default 'empresa'
                        check (classificacao in ('empresa','casa','rateio50','rateio70','rateio30','rateioM')),
  rateio_empresa_pct  integer not null default 100 check (rateio_empresa_pct between 0 and 100),
  valor_empresa       numeric(12,2) not null default 0,
  valor_casa          numeric(12,2) not null default 0,
  estabelecimento     text,
  via_ocr             boolean not null default false,
  created_at          timestamptz not null default now()
);

-- Cupons OCR
create table if not exists public.ocr_cupons (
  id              uuid primary key default uuid_generate_v4(),
  despesa_id      uuid references public.despesas(id) on delete set null,
  estabelecimento text,
  data_cupom      date,
  total_extraido  numeric(12,2),
  itens_json      jsonb,
  raw_response    text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.usuarios   enable row level security;
alter table public.clientes   enable row level security;
alter table public.eventos    enable row level security;
alter table public.faturas    enable row level security;
alter table public.despesas   enable row level security;
alter table public.ocr_cupons enable row level security;

-- Política: apenas usuários autenticados acessam os dados
create policy "Autenticados podem ler usuarios"
  on public.usuarios for select to authenticated using (true);

create policy "Autenticados podem ler clientes"
  on public.clientes for select to authenticated using (true);
create policy "Autenticados podem inserir clientes"
  on public.clientes for insert to authenticated with check (true);
create policy "Autenticados podem atualizar clientes"
  on public.clientes for update to authenticated using (true);

create policy "Autenticados podem ler eventos"
  on public.eventos for select to authenticated using (true);
create policy "Autenticados podem inserir eventos"
  on public.eventos for insert to authenticated with check (true);
create policy "Autenticados podem atualizar eventos"
  on public.eventos for update to authenticated using (true);

create policy "Autenticados podem ler faturas"
  on public.faturas for select to authenticated using (true);
create policy "Autenticados podem inserir faturas"
  on public.faturas for insert to authenticated with check (true);
create policy "Autenticados podem atualizar faturas"
  on public.faturas for update to authenticated using (true);

create policy "Autenticados podem ler despesas"
  on public.despesas for select to authenticated using (true);
create policy "Autenticados podem inserir despesas"
  on public.despesas for insert to authenticated with check (true);
create policy "Autenticados podem atualizar despesas"
  on public.despesas for update to authenticated using (true);
create policy "Autenticados podem excluir despesas"
  on public.despesas for delete to authenticated using (true);

create policy "Autenticados podem ler ocr_cupons"
  on public.ocr_cupons for select to authenticated using (true);
create policy "Autenticados podem inserir ocr_cupons"
  on public.ocr_cupons for insert to authenticated with check (true);

-- ============================================================
-- ÍNDICES
-- ============================================================

create index if not exists idx_eventos_cliente_id   on public.eventos(cliente_id);
create index if not exists idx_eventos_data_evento  on public.eventos(data_evento);
create index if not exists idx_eventos_status       on public.eventos(status);
create index if not exists idx_faturas_evento_id    on public.faturas(evento_id);
create index if not exists idx_faturas_status       on public.faturas(status);
create index if not exists idx_despesas_data        on public.despesas(data);
create index if not exists idx_despesas_categoria   on public.despesas(categoria);
create index if not exists idx_despesas_classificacao on public.despesas(classificacao);

-- ============================================================
-- DADOS DE EXEMPLO (opcional — remova em produção)
-- ============================================================

-- Para inserir um cliente de teste, descomente e execute:
-- insert into public.clientes (nome, nome_contato, telefone, email)
-- values ('Empresa Exemplo Ltda', 'João Silva', '(11) 99999-9999', 'joao@exemplo.com');
