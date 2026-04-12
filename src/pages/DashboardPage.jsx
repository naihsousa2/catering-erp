import { useMemo } from 'react'
import { useQuery } from '../hooks/useQuery'
import { eventosService } from '../services/eventosService'
import { despesasService } from '../services/despesasService'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function DashboardPage() {
  const hoje = new Date()
  const mes = hoje.getMonth() + 1
  const ano = hoje.getFullYear()

  const { data: proximosEventos } = useQuery(
    () => eventosService.listar({ mes, ano }),
    [mes, ano]
  )

  const { data: resumoDespesas } = useQuery(
    () => despesasService.resumo(mes, ano),
    [mes, ano]
  )

  const { data: historicoEventos } = useQuery(
    () => eventosService.historicoMensal(6),
    []
  )

  const { data: historicoDespesas } = useQuery(
    () => despesasService.resumoMensal(6),
    []
  )

  const receitaMes = useMemo(() => {
    if (!proximosEventos) return 0
    return proximosEventos
      .filter(e => ['faturado', 'recebido'].includes(e.status))
      .reduce((acc, e) => acc + (e.valor_total || 0), 0)
  }, [proximosEventos])

  const despesaMes = resumoDespesas?.totalEmpresa || 0

  const confirmadosFaturados = useMemo(() => {
    if (!proximosEventos) return []
    return proximosEventos
      .filter(e => ['confirmado', 'faturado'].includes(e.status))
      .slice(0, 5)
  }, [proximosEventos])

  // Mescla histórico de receita e despesa por mês
  const graficoData = useMemo(() => {
    if (!historicoEventos || !historicoDespesas) return []
    return historicoEventos.map((ev, i) => ({
      mes: ev.mes,
      receita: ev.receita,
      despesa: historicoDespesas[i]?.despesa || 0
    }))
  }, [historicoEventos, historicoDespesas])

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Cabeçalho */}
      <div>
        <p className="text-gray-500 text-sm">{hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        <h2 className="text-xl font-bold text-gray-800">Visão geral</h2>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Receita do mês</p>
          <p className="text-lg font-bold text-green-600">{fmt(receitaMes)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Despesas do mês</p>
          <p className="text-lg font-bold text-red-500">{fmt(despesaMes)}</p>
        </div>
        <div className="card col-span-2">
          <p className="text-xs text-gray-500 mb-1">Resultado do mês</p>
          <p className={`text-xl font-bold ${receitaMes - despesaMes >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {fmt(receitaMes - despesaMes)}
          </p>
        </div>
      </div>

      {/* Gráfico 6 meses */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-700 mb-3">Últimos 6 meses</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={graficoData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v) => fmt(v)}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="despesa" name="Despesa" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Próximos eventos */}
      <div className="card">
        <p className="text-sm font-semibold text-gray-700 mb-3">Próximos eventos</p>
        {confirmadosFaturados.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum evento confirmado ou faturado este mês.</p>
        ) : (
          <div className="space-y-2">
            {confirmadosFaturados.map(e => (
              <div key={e.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.clientes?.nome || '—'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(e.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')} · {e.local || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">{fmt(e.valor_total)}</p>
                  <span className={`badge-${e.status}`}>{e.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top despesas por categoria */}
      {resumoDespesas?.porCategoria?.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-3">Despesas por categoria</p>
          <div className="space-y-2">
            {resumoDespesas.porCategoria.slice(0, 5).map(({ categoria, valor }) => {
              const pct = Math.round((valor / resumoDespesas.totalEmpresa) * 100)
              return (
                <div key={categoria}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>{categoria}</span>
                    <span>{fmt(valor)} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
