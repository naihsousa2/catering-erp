import { supabase } from '../lib/supabase'

const RATEIO_MAP = {
  empresa:  100,
  casa:     0,
  rateio50: 50,
  rateio70: 70,
  rateio30: 30,
  rateioM:  null // percentual livre
}

function calcularRateio(classificacao, rateioManualPct, valor) {
  const pct = classificacao === 'rateioM'
    ? (rateioManualPct ?? 50)
    : (RATEIO_MAP[classificacao] ?? 100)

  return {
    rateio_empresa_pct: pct,
    valor_empresa: parseFloat(((valor * pct) / 100).toFixed(2)),
    valor_casa: parseFloat(((valor * (100 - pct)) / 100).toFixed(2))
  }
}

export const despesasService = {
  async listar({ mes, ano, classificacao } = {}) {
    let query = supabase
      .from('despesas')
      .select('*')
      .order('data', { ascending: false })

    if (mes && ano) {
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
      const fim = new Date(ano, mes, 0).toISOString().split('T')[0]
      query = query.gte('data', inicio).lte('data', fim)
    }

    if (classificacao && classificacao !== 'todos') {
      query = query.eq('classificacao', classificacao)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async criar(despesa) {
    const { classificacao, rateio_empresa_pct: manualPct, valor } = despesa
    const rateio = calcularRateio(classificacao, manualPct, valor)
    const { data, error } = await supabase
      .from('despesas')
      .insert({ ...despesa, ...rateio })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id, despesa) {
    const { classificacao, rateio_empresa_pct: manualPct, valor } = despesa
    const rateio = calcularRateio(classificacao, manualPct, valor)
    const { data, error } = await supabase
      .from('despesas')
      .update({ ...despesa, ...rateio })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async excluir(id) {
    const { error } = await supabase.from('despesas').delete().eq('id', id)
    if (error) throw error
  },

  async resumo(mes, ano) {
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const fim = new Date(ano, mes, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('despesas')
      .select('categoria, classificacao, valor, valor_empresa, valor_casa')
      .gte('data', inicio)
      .lte('data', fim)
    if (error) throw error

    const totalEmpresa = data.reduce((acc, d) => acc + (d.valor_empresa || 0), 0)
    const totalCasa = data.reduce((acc, d) => acc + (d.valor_casa || 0), 0)
    const totalGeral = data.reduce((acc, d) => acc + (d.valor || 0), 0)

    const porCategoria = data.reduce((acc, d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + (d.valor_empresa || 0)
      return acc
    }, {})

    return {
      totalGeral,
      totalEmpresa,
      totalCasa,
      porCategoria: Object.entries(porCategoria).map(([categoria, valor]) => ({ categoria, valor }))
        .sort((a, b) => b.valor - a.valor)
    }
  },

  async resumoMensal(meses = 6) {
    const resultados = []
    const hoje = new Date()
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mes = d.getMonth() + 1
      const ano = d.getFullYear()
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
      const fim = new Date(ano, mes, 0).toISOString().split('T')[0]

      const { data } = await supabase
        .from('despesas')
        .select('valor_empresa')
        .gte('data', inicio)
        .lte('data', fim)

      const despesa = (data || []).reduce((acc, d) => acc + (d.valor_empresa || 0), 0)
      resultados.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        despesa
      })
    }
    return resultados
  }
}
