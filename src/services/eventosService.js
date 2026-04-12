import { supabase } from '../lib/supabase'

export const eventosService = {
      async listar({ mes, ano } = {}) {
              let query = supabase
                .from('eventos')
                .select('*, clientes(id, nome, nome_contato), faturas(id, status, numero)')
                .order('data_evento', { ascending: true })
              if (mes && ano) {
                        const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
                        const fim = new Date(ano, mes, 0).toISOString().split('T')[0]
                        query = query.gte('data_evento', inicio).lte('data_evento', fim)
              }
              const { data, error } = await query
              if (error) throw error
              return data
      },

      async buscar(id) {
              const { data, error } = await supabase
                .from('eventos')
                .select('*, clientes(*), faturas(*)')
                .eq('id', id)
                .single()
              if (error) throw error
              return data
      },

      async criar(evento) {
              const payload = { ...evento }
                      delete payload.valor_saldo
              const { data, error } = await supabase
                .from('eventos')
                .insert(payload)
                .select()
                .single()
              if (error) throw error
              return data
      },

      async atualizar(id, campos) {
              const payload = { ...campos }
                      delete payload.valor_saldo
              const { data, error } = await supabase
                .from('eventos')
                .update(payload)
                .eq('id', id)
                .select()
                .single()
              if (error) throw error
              return data
      },

      async mudarStatus(id, status) {
              const { data, error } = await supabase
                .from('eventos')
                .update({ status })
                .eq('id', id)
                .select()
                .single()
              if (error) throw error
              return data
      },

      async excluir(id) {
              const { error } = await supabase
                .from('eventos')
                .delete()
                .eq('id', id)
              if (error) throw error
      },

      async porStatus() {
              const { data, error } = await supabase
                .from('eventos')
                .select('*, clientes(id, nome, nome_contato), faturas(id, status, numero, vencimento)')
                .in('status', ['confirmado', 'faturado', 'recebido'])
                .order('data_evento', { ascending: false })
              if (error) throw error
              return {
                        faltaFaturar: data.filter(e => e.status === 'confirmado'),
                        aguardando: data.filter(e => e.status === 'faturado'),
                        recebido: data.filter(e => e.status === 'recebido'),
              }
      },

      async historicoMensal(meses = 6) {
              const resultados = []
                      const hoje = new Date()
              for (let i = meses - 1; i >= 0; i--) {
                        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
                        const mes = d.getMonth() + 1
                        const ano = d.getFullYear()
                        const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`
                        const fim = new Date(ano, mes, 0).toISOString().split('T')[0]
                        const { data } = await supabase
                          .from('eventos')
                          .select('valor_total, status')
                          .gte('data_evento', inicio)
                          .lte('data_evento', fim)
                          .in('status', ['faturado', 'recebido'])
                        const receita = (data || []).reduce((acc, e) => acc + (e.valor_total || 0), 0)
                        resultados.push({
                                    mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                                    receita
                        })
              }
              return resultados
      }
}
