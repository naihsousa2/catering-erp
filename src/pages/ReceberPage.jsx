import { useState } from 'react'
import { useQuery, useMutation } from '../hooks/useQuery'
import { eventosService } from '../services/eventosService'
import { faturasService } from '../services/faturasService'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function ReceberPage() {
  const [aba, setAba] = useState('faltaFaturar')
  const { data, refetch } = useQuery(() => eventosService.porStatus(), [])
  const confirmarRecebimento = useMutation((faturaId) => faturasService.marcarRecebida(faturaId))

  const abas = [
    { key: 'faltaFaturar', label: 'Faturar', cor: 'text-blue-600' },
    { key: 'aguardando',   label: 'Aguardando', cor: 'text-orange-500' },
    { key: 'recebido',     label: 'Recebido', cor: 'text-green-600' },
  ]

  const lista = data?.[aba] || []

  const totais = {
    faltaFaturar: data?.faltaFaturar?.reduce((a, e) => a + (e.valor_saldo || e.valor_total || 0), 0) || 0,
    aguardando: data?.aguardando?.reduce((a, e) => a + (e.valor_saldo || e.valor_total || 0), 0) || 0,
    recebido: data?.recebido?.reduce((a, e) => a + (e.valor_total || 0), 0) || 0,
  }

  const handleConfirmar = async (faturaId) => {
    await confirmarRecebimento.mutate(faturaId)
    await refetch()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Abas */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {abas.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-colors ${
              aba === a.key
                ? `border-orange-500 ${a.cor}`
                : 'border-transparent text-gray-400'
            }`}
          >
            {a.label}
            <span className={`ml-1 ${aba === a.key ? '' : 'text-gray-300'}`}>
              ({data?.[a.key]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Métrica do total */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <p className="text-xs text-gray-500">Total em {abas.find(a => a.key === aba)?.label.toLowerCase()}</p>
        <p className={`text-xl font-bold ${
          aba === 'faltaFaturar' ? 'text-blue-600' :
          aba === 'aguardando' ? 'text-orange-500' : 'text-green-600'
        }`}>{fmt(totais[aba])}</p>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <span className="text-4xl mb-2">✓</span>
            <p className="text-sm">Nada aqui por enquanto</p>
          </div>
        ) : (
          lista.map(e => (
            <EventoCard
              key={e.id}
              evento={e}
              aba={aba}
              onConfirmar={handleConfirmar}
            />
          ))
        )}
      </div>
    </div>
  )
}

function EventoCard({ evento: e, aba, onConfirmar }) {
  const [confirmando, setConfirmando] = useState(false)

  const handleConfirmar = async () => {
    setConfirmando(true)
    try {
      await onConfirmar(e.faturas?.id)
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{e.clientes?.nome || '—'}</p>
          <p className="text-xs text-gray-500">
            {new Date(e.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')} · {e.local || '—'}
          </p>
        </div>
        <div className="text-right ml-2">
          <p className="font-bold text-gray-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(e.valor_saldo || e.valor_total || 0)}</p>
          {e.pax && <p className="text-xs text-gray-400">{e.pax} convidados</p>}
        </div>
      </div>

      {aba === 'aguardando' && e.faturas && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Fatura {e.faturas.numero}</p>
            {e.faturas.vencimento && (
              <p className="text-xs text-gray-400">
                Vence em {new Date(e.faturas.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <button
            onClick={handleConfirmar}
            disabled={confirmando}
            className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            {confirmando ? '...' : 'Confirmar recebimento'}
          </button>
        </div>
      )}

      {aba === 'recebido' && e.faturas?.recebida_em && (
        <p className="text-xs text-green-600 mt-1">
          ✓ Recebido em {new Date(e.faturas.recebida_em).toLocaleDateString('pt-BR')}
        </p>
      )}
    </div>
  )
}
