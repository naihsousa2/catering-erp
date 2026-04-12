import { supabase } from '../lib/supabase'

export const clientesService = {
  async listar() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, eventos(id, valor_total, status)')
      .eq('ativo', true)
      .order('nome')
    if (error) throw error
    return data
  },

  async buscar(id) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, eventos(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async criar(cliente) {
    const { data, error } = await supabase
      .from('clientes')
      .insert(cliente)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id, campos) {
    const { data, error } = await supabase
      .from('clientes')
      .update(campos)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async inativar(id) {
    const { error } = await supabase
      .from('clientes')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
  },

  async topPorFaturamento() {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, nome_contato, eventos(valor_total, status)')
      .eq('ativo', true)
    if (error) throw error

    return data
      .map(c => ({
        ...c,
        totalFaturado: (c.eventos || [])
          .filter(e => ['faturado', 'recebido'].includes(e.status))
          .reduce((acc, e) => acc + (e.valor_total || 0), 0)
      }))
      .sort((a, b) => b.totalFaturado - a.totalFaturado)
      .slice(0, 10)
  }
}
