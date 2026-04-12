import { useState, useMemo } from 'react'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useQuery'
import { eventosService } from '../services/eventosService'
import { faturasService } from '../services/faturasService'
import { clientesService } from '../services/clientesService'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function AgendaPage() {
  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(hoje.getMonth())
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [eventoSelecionado, setEventoSelecionado] = useState(null)
  const [modo, setModo] = useState('calendario') // 'calendario' | 'detalhe' | 'novoEvento' | 'faturamento'

  const { data: eventos, refetch } = useQuery(
    () => eventosService.listar({ mes: mesAtual + 1, ano: anoAtual }),
    [mesAtual, anoAtual]
  )

  const { data: clientes } = useQuery(() => clientesService.listar(), [])

  const mudarStatus = useMutation(({ id, status }) => eventosService.mudarStatus(id, status))
  const criarEvento = useMutation((evento) => eventosService.criar(evento))
  const criarFatura = useMutation((dados) => faturasService.criar(dados))

  // Mapa de dia → eventos
  const eventosPorDia = useMemo(() => {
    const mapa = {}
    ;(eventos || []).forEach(e => {
      const dia = parseInt(e.data_evento.split('-')[2])
      if (!mapa[dia]) mapa[dia] = []
      mapa[dia].push(e)
    })
    return mapa
  }, [eventos])

  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate()
  const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay()

  const navMes = (delta) => {
    const d = new Date(anoAtual, mesAtual + delta, 1)
    setMesAtual(d.getMonth())
    setAnoAtual(d.getFullYear())
    setDiaSelecionado(null)
  }

  const abrirDia = (dia) => {
    setDiaSelecionado(dia)
    const evsDia = eventosPorDia[dia] || []
    if (evsDia.length === 1) {
      setEventoSelecionado(evsDia[0])
      setModo('detalhe')
    } else {
      setModo('calendario')
    }
  }

  // Componente de calendário
  if (modo === 'calendario') {
    const evsDia = diaSelecionado ? (eventosPorDia[diaSelecionado] || []) : []
    return (
      <div className="p-4 space-y-4 pb-6">
        {/* Header mês */}
        <div className="flex items-center justify-between">
          <button onClick={() => navMes(-1)} className="p-2 rounded-lg hover:bg-gray-100">‹</button>
          <h2 className="font-bold text-gray-800">
            {new Date(anoAtual, mesAtual).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={() => navMes(1)} className="p-2 rounded-lg hover:bg-gray-100">›</button>
        </div>

        {/* Grade */}
        <div className="card p-3">
          <div className="grid grid-cols-7 text-center mb-2">
            {['D','S','T','Q','Q','S','S'].map((d, i) => (
              <span key={i} className="text-xs text-gray-400 font-semibold">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array(primeiroDia).fill(null).map((_, i) => <div key={`e-${i}`} />)}
            {Array(diasNoMes).fill(null).map((_, i) => {
              const dia = i + 1
              const evs = eventosPorDia[dia] || []
              const isHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()
              const isSel = dia === diaSelecionado
              return (
                <button
                  key={dia}
                  onClick={() => abrirDia(dia)}
                  className={`relative flex flex-col items-center py-1 rounded-lg transition-colors ${
                    isSel ? 'bg-orange-500 text-white' :
                    isHoje ? 'bg-orange-100 text-orange-600' :
                    'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">{dia}</span>
                  {evs.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {evs.slice(0, 3).map((e, i) => (
                        <span key={i} className={`w-1 h-1 rounded-full ${
                          e.status === 'recebido' ? 'bg-green-400' :
                          e.status === 'faturado' ? 'bg-orange-400' :
                          e.status === 'confirmado' ? 'bg-blue-400' : 'bg-gray-300'
                        } ${isSel ? 'bg-white' : ''}`} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Eventos do dia selecionado */}
        {diaSelecionado && (
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">
              {diaSelecionado}/{mesAtual + 1}/{anoAtual}
            </p>
            {evsDia.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum evento neste dia.</p>
            ) : (
              <div className="space-y-2">
                {evsDia.map(e => (
                  <div key={e.id} className="card" onClick={() => { setEventoSelecionado(e); setModo('detalhe') }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{e.clientes?.nome || '—'}</p>
                        <p className="text-xs text-gray-500">{e.local} · {e.pax} pax</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{fmt(e.valor_total)}</p>
                        <span className={`badge-${e.status}`}>{e.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botão novo evento */}
        <button
          onClick={() => setModo('novoEvento')}
          className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-orange-600 transition-colors"
        >
          +
        </button>
      </div>
    )
  }

  // Detalhe do evento
  if (modo === 'detalhe' && eventoSelecionado) {
    const e = eventoSelecionado
    const statusOpcoes = ['aguardando', 'confirmado', 'faturado', 'recebido', 'cancelado']
    return (
      <div className="p-4 space-y-4 pb-6">
        <button onClick={() => setModo('calendario')} className="text-orange-500 text-sm font-semibold flex items-center gap-1">
          ‹ Voltar
        </button>

        <div className="card space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">{e.clientes?.nome || '—'}</h2>
              {e.clientes?.nome_contato && <p className="text-gray-500 text-sm">{e.clientes.nome_contato}</p>}
            </div>
            <span className={`badge-${e.status}`}>{e.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Data</p>
              <p className="font-medium">{new Date(e.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Local</p>
              <p className="font-medium">{e.local || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Convidados</p>
              <p className="font-medium">{e.pax || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Valor total</p>
              <p className="font-medium text-green-600">{fmt(e.valor_total)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Sinal</p>
              <p className="font-medium">{fmt(e.valor_sinal)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Saldo</p>
              <p className="font-medium text-orange-600">{fmt(e.valor_saldo)}</p>
            </div>
          </div>

          {e.cardapio_obs && (
            <div>
              <p className="text-gray-400 text-xs">Cardápio / Obs</p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{e.cardapio_obs}</p>
            </div>
          )}

          {e.faturas && e.faturas.id && (
            <div className="bg-orange-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-orange-700">Fatura {e.faturas.numero}</p>
              <p className="text-gray-600">Vencimento: {e.faturas.vencimento ? new Date(e.faturas.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
              <p className="text-gray-600">Status: <span className={`badge-${e.faturas.status}`}>{e.faturas.status}</span></p>
            </div>
          )}
        </div>

        {/* Alterar status */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 mb-2">Alterar status</p>
          <div className="flex flex-wrap gap-2">
            {statusOpcoes.map(s => (
              <button
                key={s}
                onClick={async () => {
                  await mudarStatus.mutate({ id: e.id, status: s })
                  await refetch()
                  setEventoSelecionado(prev => ({ ...prev, status: s }))
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  e.status === s
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Gerar faturamento */}
        {e.status === 'confirmado' && !e.faturas?.id && (
          <button
            onClick={() => setModo('faturamento')}
            className="btn-primary w-full text-center"
          >
            Gerar Ordem de Faturamento
          </button>
        )}
      </div>
    )
  }

  // Novo evento
  if (modo === 'novoEvento') {
    return <NovoEventoForm clientes={clientes || []} onSalvar={async (dados) => {
      await criarEvento.mutate(dados)
      await refetch()
      setModo('calendario')
    }} onCancelar={() => setModo('calendario')} />
  }

  // Faturamento
  if (modo === 'faturamento' && eventoSelecionado) {
    return <FaturamentoForm evento={eventoSelecionado} onSalvar={async (dados) => {
      await criarFatura.mutate(dados)
      await refetch()
      setModo('calendario')
    }} onCancelar={() => setModo('detalhe')} />
  }

  return null
}

// --- Subcomponentes ---

function NovoEventoForm({ clientes, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    cliente_id: '',
    data_evento: '',
    local: '',
    pax: '',
    valor_total: '',
    valor_sinal: '',
    cardapio_obs: '',
    status: 'aguardando'
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar({
        ...form,
        pax: form.pax ? parseInt(form.pax) : null,
        valor_total: form.valor_total ? parseFloat(form.valor_total) : 0,
        valor_sinal: form.valor_sinal ? parseFloat(form.valor_sinal) : 0,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <button onClick={onCancelar} className="text-orange-500 text-sm font-semibold">‹ Voltar</button>
      <h2 className="font-bold text-gray-800 text-lg">Novo Evento</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Cliente</label>
          <select className="input" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)} required>
            <option value="">Selecionar...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Data do evento</label>
          <input type="date" className="input" value={form.data_evento} onChange={e => set('data_evento', e.target.value)} required />
        </div>
        <div>
          <label className="label">Local</label>
          <input type="text" className="input" value={form.local} onChange={e => set('local', e.target.value)} placeholder="Endereço do evento" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Convidados</label>
            <input type="number" className="input" value={form.pax} onChange={e => set('pax', e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="aguardando">Aguardando</option>
              <option value="confirmado">Confirmado</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor total (R$)</label>
            <input type="number" step="0.01" className="input" value={form.valor_total} onChange={e => set('valor_total', e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="label">Sinal (R$)</label>
            <input type="number" step="0.01" className="input" value={form.valor_sinal} onChange={e => set('valor_sinal', e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div>
          <label className="label">Cardápio / Observações</label>
          <textarea className="input" rows={3} value={form.cardapio_obs} onChange={e => set('cardapio_obs', e.target.value)} placeholder="Cardápio, restrições alimentares, etc." />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : 'Salvar evento'}
        </button>
      </form>
    </div>
  )
}

function FaturamentoForm({ evento, onSalvar, onCancelar }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    vencimento: '',
    formaPagamento: 'PIX',
    dadosPix: '',
    responsavelNome: '',
    responsavelEmail: '',
    obs: ''
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleFinalizar = async () => {
    setLoading(true)
    try {
      await onSalvar({ evento, ...form })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <button onClick={onCancelar} className="text-orange-500 text-sm font-semibold">‹ Voltar</button>
      <div className="flex gap-2 mb-2">
        {[1,2,3,4].map(s => (
          <div key={s} className={`flex-1 h-1 rounded-full ${step >= s ? 'bg-orange-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800">Dados do evento</h2>
          <div className="card space-y-2 text-sm">
            <p><span className="text-gray-400">Cliente:</span> <strong>{evento.clientes?.nome}</strong></p>
            <p><span className="text-gray-400">Data:</span> {new Date(evento.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><span className="text-gray-400">Local:</span> {evento.local}</p>
            <p><span className="text-gray-400">Valor a faturar:</span> <strong className="text-orange-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(evento.valor_saldo || evento.valor_total)}
            </strong></p>
          </div>
          <button className="btn-primary w-full" onClick={() => setStep(2)}>Próximo</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800">Cobrança</h2>
          <div>
            <label className="label">Vencimento</label>
            <input type="date" className="input" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} required />
          </div>
          <div>
            <label className="label">Forma de pagamento</label>
            <select className="input" value={form.formaPagamento} onChange={e => set('formaPagamento', e.target.value)}>
              <option>PIX</option>
              <option>Transferência</option>
              <option>Boleto</option>
              <option>Dinheiro</option>
              <option>Cheque</option>
            </select>
          </div>
          <div>
            <label className="label">Chave PIX / Dados bancários</label>
            <input type="text" className="input" value={form.dadosPix} onChange={e => set('dadosPix', e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Informações adicionais..." />
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setStep(1)}>Voltar</button>
            <button className="btn-primary flex-1" onClick={() => setStep(3)}>Próximo</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800">Responsável</h2>
          <div>
            <label className="label">Nome</label>
            <input type="text" className="input" value={form.responsavelNome} onChange={e => set('responsavelNome', e.target.value)} placeholder="Nome de quem vai faturar" required />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" className="input" value={form.responsavelEmail} onChange={e => set('responsavelEmail', e.target.value)} placeholder="email@exemplo.com" required />
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setStep(2)}>Voltar</button>
            <button className="btn-primary flex-1" onClick={() => setStep(4)}>Revisar</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800">Revisão</h2>
          <div className="card space-y-2 text-sm">
            <p><span className="text-gray-400">Cliente:</span> {evento.clientes?.nome}</p>
            <p><span className="text-gray-400">Vencimento:</span> {form.vencimento ? new Date(form.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</p>
            <p><span className="text-gray-400">Pagamento:</span> {form.formaPagamento}</p>
            <p><span className="text-gray-400">PIX/Banco:</span> {form.dadosPix || '—'}</p>
            <p><span className="text-gray-400">Responsável:</span> {form.responsavelNome}</p>
            <p><span className="text-gray-400">E-mail:</span> {form.responsavelEmail}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setStep(3)}>Voltar</button>
            <button
              className="btn-primary flex-1"
              disabled={loading}
              onClick={handleFinalizar}
            >
              {loading ? 'Gerando...' : 'Finalizar e enviar e-mail'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
