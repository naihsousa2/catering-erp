import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation } from '../hooks/useQuery'
import { despesasService } from '../services/despesasService'
import { extrairCupom } from '../services/ocrService'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

const CATEGORIAS = ['Insumos', 'Embalagens', 'Transporte', 'Energia', 'Mão de obra', 'Água', 'Gás', 'Impostos', 'Honorários Contábeis', 'Telefonia', 'Manut. Maquinas e Equip.', 'Manutenção Veículos', 'Consórcio', 'Despesa Bancária', 'Investimentos', 'Alimentação/restaurantes', 'Internet', 'IPTU', 'Educação', 'Esportes', 'Saúde', 'Streaming', 'Empréstimos', 'Roupas/Calç.', 'Manutenção Casa', 'Presentes', 'Entretenimento', 'Seguro Casa', 'Despesas Judiciais' ]
const CLASSIFICACOES = [
  { value: 'empresa',  label: 'Empresa (100%)' },
  { value: 'casa',     label: 'Casa (100%)' },
  { value: 'rateio50', label: 'Rateio 50/50' },
  { value: 'rateio70', label: 'Rateio 70/30' },
  { value: 'rateio30', label: 'Rateio 30/70' },
  { value: 'rateioM',  label: 'Rateio manual' },
]
const CORES = ['#f97316','#3b82f6','#22c55e','#a855f7','#ef4444','#eab308','#6b7280']

export default function DespesasPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [filtroClass, setFiltroClass] = useState('todos')
  const [modo, setModo] = useState('lista') // 'lista' | 'novo'
  const [editando, setEditando] = useState(null)
  const [categoriasAbertas, setCategoriasAbertas] = useState({})

  const { data: despesas, refetch } = useQuery(
    () => despesasService.listar({ mes, ano, classificacao: filtroClass }),
    [mes, ano, filtroClass]
  )

  const { data: resumo } = useQuery(
    () => despesasService.resumo(mes, ano),
    [mes, ano]
  )

  const criarDespesa = useMutation((d) => despesasService.criar(d))
  const atualizarDespesa = useMutation(({ id, d }) => despesasService.atualizar(id, d))
  const excluirDespesa = useMutation((id) => despesasService.excluir(id))

  // Agrupar por categoria
  const porCategoria = useMemo(() => {
    const mapa = {}
    ;(despesas || []).forEach(d => {
      if (!mapa[d.categoria]) mapa[d.categoria] = []
      mapa[d.categoria].push(d)
    })
    return mapa
  }, [despesas])

  const toggleCategoria = (cat) => {
    setCategoriasAbertas(p => ({ ...p, [cat]: !p[cat] }))
  }

  const navMes = (delta) => {
    const d = new Date(ano, mes - 1 + delta, 1)
    setMes(d.getMonth() + 1)
    setAno(d.getFullYear())
  }

  const handleExcluir = async (id) => {
    if (!confirm('Excluir esta despesa?')) return
    await excluirDespesa.mutate(id)
    await refetch()
  }

  if (modo === 'novo' || editando) {
    return (
      <NovaDespesaForm
        inicial={editando}
        onSalvar={async (dados) => {
          if (editando) {
            await atualizarDespesa.mutate({ id: editando.id, d: dados })
          } else {
            await criarDespesa.mutate(dados)
          }
          await refetch()
          setModo('lista')
          setEditando(null)
        }}
        onCancelar={() => { setModo('lista'); setEditando(null) }}
      />
    )
  }

  const pieData = resumo?.porCategoria?.map(({ categoria, valor }, i) => ({
    name: categoria, value: valor, fill: CORES[i % CORES.length]
  })) || []

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Navegação mês */}
      <div className="flex items-center justify-between">
        <button onClick={() => navMes(-1)} className="p-2 rounded-lg hover:bg-gray-100">‹</button>
        <p className="font-bold text-gray-800">
          {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => navMes(1)} className="p-2 rounded-lg hover:bg-gray-100">›</button>
      </div>

      {/* Métricas */}
      {resumo && (
        <div className="grid grid-cols-3 gap-2">
          <div className="card text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-sm font-bold text-gray-800">{fmt(resumo.totalGeral)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-400">Empresa</p>
            <p className="text-sm font-bold text-orange-600">{fmt(resumo.totalEmpresa)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-400">Casa</p>
            <p className="text-sm font-bold text-blue-600">{fmt(resumo.totalCasa)}</p>
          </div>
        </div>
      )}

      {/* Gráfico pizza */}
      {pieData.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-2">Por categoria</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                  <span className="text-xs text-gray-600 flex-1 truncate">{d.name}</span>
                  <span className="text-xs font-semibold text-gray-700">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtro classificação */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['todos', ...CLASSIFICACOES.map(c => c.value)].map(v => (
          <button
            key={v}
            onClick={() => setFiltroClass(v)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors ${
              filtroClass === v
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {v === 'todos' ? 'Todos' : CLASSIFICACOES.find(c => c.value === v)?.label || v}
          </button>
        ))}
      </div>

      {/* Lista agrupada */}
      <div className="space-y-2">
        {Object.keys(porCategoria).length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Nenhuma despesa neste período.</p>
        )}
        {Object.entries(porCategoria).map(([cat, itens]) => {
          const aberta = categoriasAbertas[cat] !== false // aberta por padrão
          const total = itens.reduce((a, d) => a + (d.valor_empresa || 0), 0)
          return (
            <div key={cat} className="card p-0 overflow-hidden">
              <button
                onClick={() => toggleCategoria(cat)}
                className="w-full flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{cat}</span>
                  <span className="text-xs text-gray-400">({itens.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-orange-600">{fmt(total)}</span>
                  <span className="text-gray-400 text-xs">{aberta ? '▲' : '▼'}</span>
                </div>
              </button>
              {aberta && (
                <div className="border-t border-gray-100">
                  {itens.map(d => (
                    <div key={d.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm text-gray-800">{d.descricao}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          {d.estabelecimento ? ` · ${d.estabelecimento}` : ''}
                          {d.via_ocr ? ' 📷' : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          Empresa: {fmt(d.valor_empresa)} · Casa: {fmt(d.valor_casa)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <p className="text-sm font-bold">{fmt(d.valor)}</p>
                        <button
                          onClick={() => setEditando(d)}
                          className="text-gray-300 hover:text-orange-400 text-xs p-1"
                          title="Editar"
                        >✏️</button>
                        <button
                          onClick={() => handleExcluir(d.id)}
                          className="text-gray-300 hover:text-red-400 text-xs p-1"
                          title="Excluir"
                        >🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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

// --- Formulário de nova/editar despesa ---

function NovaDespesaForm({ inicial, onSalvar, onCancelar }) {
  const fileRef = useRef()
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrErro, setOcrErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    descricao: inicial?.descricao || '',
    valor: inicial?.valor?.toString() || '',
    data: inicial?.data || new Date().toISOString().split('T')[0],
    categoria: inicial?.categoria || 'Insumos',
    classificacao: inicial?.classificacao || 'empresa',
    rateio_empresa_pct: inicial?.rateio_empresa_pct ?? 50,
    estabelecimento: inicial?.estabelecimento || '',
    via_ocr: inicial?.via_ocr || false,
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleOCR = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    setOcrErro('')
    try {
      const dados = await extrairCupom(file)
      setForm(p => ({
        ...p,
        estabelecimento: dados.estabelecimento || p.estabelecimento,
        valor: dados.total?.toString() || p.valor,
        data: dados.data || p.data,
        descricao: dados.estabelecimento ? `Compra em ${dados.estabelecimento}` : p.descricao,
        via_ocr: true,
      }))
    } catch (err) {
      setOcrErro(err.message)
    } finally {
      setOcrLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSalvar({
        ...form,
        valor: parseFloat(form.valor),
        rateio_empresa_pct: parseInt(form.rateio_empresa_pct),
      })
    } finally {
      setLoading(false)
    }
  }

  const isRateioManual = form.classificacao === 'rateioM'
  const pct = isRateioManual ? form.rateio_empresa_pct : {
    empresa: 100, casa: 0, rateio50: 50, rateio70: 70, rateio30: 30
  }[form.classificacao] ?? 50

  const valEmpresa = form.valor ? ((parseFloat(form.valor) * pct) / 100).toFixed(2) : '—'
  const valCasa = form.valor ? ((parseFloat(form.valor) * (100 - pct)) / 100).toFixed(2) : '—'

  return (
    <div className="p-4 space-y-4 pb-6">
      <button onClick={onCancelar} className="text-orange-500 text-sm font-semibold">‹ Voltar</button>
      <h2 className="font-bold text-gray-800 text-lg">{inicial ? 'Editar despesa' : 'Nova despesa'}</h2>

      {/* OCR */}
      {!inicial && (
        <div>
          <input type="file" ref={fileRef} accept="image/*" capture="environment" className="hidden" onChange={handleOCR} />
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            disabled={ocrLoading}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            {ocrLoading ? '⏳ Lendo cupom...' : '📷 Fotografar cupom fiscal'}
          </button>
          {ocrErro && <p className="text-red-500 text-xs mt-1">{ocrErro}</p>}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Descrição *</label>
          <input className="input" value={form.descricao} onChange={e => set('descricao', e.target.value)} required placeholder="Ex: Compra de insumos no mercado" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (R$) *</label>
            <input type="number" step="0.01" className="input" value={form.valor} onChange={e => set('valor', e.target.value)} required placeholder="0,00" />
          </div>
          <div>
            <label className="label">Data *</label>
            <input type="date" className="input" value={form.data} onChange={e => set('data', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Estabelecimento</label>
          <input className="input" value={form.estabelecimento} onChange={e => set('estabelecimento', e.target.value)} placeholder="Nome do fornecedor" />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Classificação</label>
          <select className="input" value={form.classificacao} onChange={e => set('classificacao', e.target.value)}>
            {CLASSIFICACOES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {isRateioManual && (
          <div>
            <label className="label">Rateio empresa: {form.rateio_empresa_pct}% / Casa: {100 - form.rateio_empresa_pct}%</label>
            <input
              type="range" min="0" max="100" step="5"
              className="w-full accent-orange-500"
              value={form.rateio_empresa_pct}
              onChange={e => set('rateio_empresa_pct', parseInt(e.target.value))}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Empresa: {fmt(valEmpresa)}</span>
              <span>Casa: {fmt(valCasa)}</span>
            </div>
          </div>
        )}

        {!isRateioManual && form.valor && (
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 flex justify-between">
            <span>Empresa: {fmt(valEmpresa)}</span>
            <span>Casa: {fmt(valCasa)}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Salvando...' : inicial ? 'Salvar alterações' : 'Lançar despesa'}
        </button>
      </form>
    </div>
  )
}
