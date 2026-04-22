import { useState } from 'react'
import { useQuery, useMutation } from '../hooks/useQuery'
import { clientesService } from '../services/clientesService'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function ClientesPage() {
  const [modo, setModo] = useState('lista') // 'lista' | 'novo' | 'detalhe'
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [busca, setBusca] = useState('')
    const [tipoRanking, setTipoRanking] = useState('faturamento') // 'faturamento' | 'frequencia'

  const { data: clientes, refetch } = useQuery(() => clientesService.listar(), [])
  const { data: ranking } = useQuery(() => clientesService.topPorFaturamento(), [])
    const { data: rankingFreq } = useQuery(() => clientesService.topPorFrequencia(), [])
  const criarCliente = useMutation((c) => clientesService.criar(c))

  const listaFiltrada = (clientes || []).filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.nome_contato || '').toLowerCase().includes(busca.toLowerCase())
  )

  if (modo === 'novo') {
    return <NovoClienteForm onSalvar={async (dados) => {
      await criarCliente.mutate(dados)
      await refetch()
      setModo('lista')
    }} onCancelar={() => setModo('lista')} />
  }

  if (modo === 'detalhe' && clienteSelecionado) {
    return <DetalheCliente cliente={clienteSelecionado} onVoltar={() => setModo('lista')} />
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Busca */}
      <div className="flex gap-2">
        <input
          type="search"
          className="input flex-1"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Ranking (quando não há busca) */}
      {!busca && (ranking?.length > 0 || rankingFreq?.length > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">🏆 Top clientes</p>
            <div className="flex gap-1">
              <button onClick={() => setTipoRanking('faturamento')} className={`text-xs px-2 py-1 rounded-full border transition-colors ${tipoRanking === 'faturamento' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>💰 Faturamento</button>
              <button onClick={() => setTipoRanking('frequencia')} className={`text-xs px-2 py-1 rounded-full border transition-colors ${tipoRanking === 'frequencia' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>🔢 Frequência</button>
            </div>
          </div>
          <div className="space-y-2">
            {(tipoRanking === 'faturamento' ? (ranking || []) : (rankingFreq || [])).slice(0, 5).map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => { setClienteSelecionado(c); setModo('detalhe') }}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-yellow-400 text-yellow-900' :
                  i === 1 ? 'bg-gray-300 text-gray-700' :
                  i === 2 ? 'bg-orange-300 text-orange-800' :
                  'bg-gray-100 text-gray-500'
                }`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                  {c.nome_contato && <p className="text-xs text-gray-400">{c.nome_contato}</p>}
                </div>
                {tipoRanking === 'faturamento'
                  ? <p className="text-sm font-bold text-green-600">{fmt(c.totalFaturado)}</p>
                  : <p className="text-sm font-bold text-blue-600">{c.totalEventos} evento{c.totalEventos !== 1 ? 's' : ''}</p>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
          {listaFiltrada.length} cliente{listaFiltrada.length !== 1 ? 's' : ''}
        </p>
        <div className="space-y-2">
          {listaFiltrada.map(c => (
            <div
              key={c.id}
              className="card flex justify-between items-center cursor-pointer active:bg-gray-50"
              onClick={() => { setClienteSelecionado(c); setModo('detalhe') }}
            >
              <div>
                <p className="font-semibold text-gray-800">{c.nome}</p>
                {c.nome_contato && <p className="text-xs text-gray-500">{c.nome_contato}</p>}
                {c.telefone && <p className="text-xs text-gray-400">{c.telefone}</p>}
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setModo('novo')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-orange-600 transition-colors"
      >
        +
      </button>
    </div>
  )
}

function DetalheCliente({ cliente: c, onVoltar }) {
  return (
    <div className="p-4 space-y-4 pb-6">
      <button onClick={onVoltar} className="text-orange-500 text-sm font-semibold">‹ Voltar</button>
      <div className="card space-y-3">
        <h2 className="font-bold text-gray-800 text-lg">{c.nome}</h2>
        {c.nome_contato && (
          <div>
            <p className="label">Contato</p>
            <p className="text-sm text-gray-700">{c.nome_contato}</p>
          </div>
        )}
        {c.cpf_cnpj && (
          <div>
            <p className="label">CPF/CNPJ</p>
            <p className="text-sm text-gray-700">{c.cpf_cnpj}</p>
          </div>
        )}
        {c.telefone && (
          <div>
            <p className="label">Telefone</p>
            <a href={`tel:${c.telefone}`} className="text-sm text-orange-500">{c.telefone}</a>
          </div>
        )}
        {c.email && (
          <div>
            <p className="label">E-mail</p>
            <a href={`mailto:${c.email}`} className="text-sm text-orange-500">{c.email}</a>
          </div>
        )}
        {c.endereco && (
          <div>
            <p className="label">Endereço</p>
            <p className="text-sm text-gray-700">{c.endereco}</p>
          </div>
        )}
      </div>

      {c.eventos && c.eventos.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-3">Histórico de eventos</p>
          <div className="space-y-2">
            {c.eventos.map(e => (
              <div key={e.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{new Date(e.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  <span className={`badge-${e.status}`}>{e.status}</span>
                </div>
                <p className="font-semibold text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.valor_total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NovoClienteForm({ onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    nome: '', nome_contato: '', cpf_cnpj: '', telefone: '', email: '', endereco: ''
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await onSalvar(form) } finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <button onClick={onCancelar} className="text-orange-500 text-sm font-semibold">‹ Voltar</button>
      <h2 className="font-bold text-gray-800 text-lg">Novo Cliente</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Nome *</label>
          <input className="input" value={form.nome} onChange={e => set('nome', e.target.value)} required placeholder="Razão social ou nome completo" />
        </div>
        <div>
          <label className="label">Contato</label>
          <input className="input" value={form.nome_contato} onChange={e => set('nome_contato', e.target.value)} placeholder="Pessoa de referência" />
        </div>
        <div>
          <label className="label">CPF/CNPJ</label>
          <input className="input" value={form.cpf_cnpj} onChange={e => set('cpf_cnpj', e.target.value)} placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="cliente@email.com" />
        </div>
        <div>
          <label className="label">Endereço</label>
          <input className="input" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, cidade" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : 'Cadastrar cliente'}
        </button>
      </form>
    </div>
  )
}
