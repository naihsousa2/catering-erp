import { supabase } from '../lib/supabase'

export const faturasService = {
  async criar({ evento, vencimento, formaPagamento, dadosPix, responsavelNome, responsavelEmail, obs }) {
    // Gera próximo número de fatura
    const { count } = await supabase
      .from('faturas')
      .select('*', { count: 'exact', head: true })
    const numero = `FAT-${String((count || 0) + 1).padStart(3, '0')}`

    const { data: fatura, error } = await supabase
      .from('faturas')
      .insert({
        evento_id: evento.id,
        numero,
        vencimento,
        forma_pagamento: formaPagamento,
        dados_pix: dadosPix,
        responsavel_nome: responsavelNome,
        responsavel_email: responsavelEmail,
        obs_faturamento: obs,
        status: 'aguardando',
        emitida_em: new Date().toISOString()
      })
      .select()
      .single()
    if (error) throw error

    // Atualiza status do evento para "faturado"
    await supabase.from('eventos').update({ status: 'faturado' }).eq('id', evento.id)

    return fatura
  },

  async marcarRecebida(faturaId) {
    const { data: fatura, error } = await supabase
      .from('faturas')
      .update({ status: 'recebido', recebida_em: new Date().toISOString() })
      .eq('id', faturaId)
      .select('evento_id')
      .single()
    if (error) throw error

    // Atualiza status do evento para "recebido"
    await supabase.from('eventos').update({ status: 'recebido' }).eq('id', fatura.evento_id)
  },

  abrirEmailFaturamento({ evento, fatura }) {
    const cliente = evento.clientes
    const dataEvento = new Date(evento.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')
    const vencimento = fatura.vencimento
      ? new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')
      : '—'

    const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
      .format(evento.valor_saldo || evento.valor_total)

    const assunto = encodeURIComponent(`${fatura.numero} — Ordem de Faturamento — ${cliente?.nome || 'Cliente'}`)

    const corpo = encodeURIComponent(
`Olá, ${fatura.responsavel_nome},

Segue abaixo a ordem de faturamento referente ao evento abaixo:

📋 Fatura: ${fatura.numero}
👤 Cliente: ${cliente?.nome || '—'}
📅 Data do evento: ${dataEvento}
📍 Local: ${evento.local || '—'}
👥 Convidados: ${evento.pax || '—'}
💰 Valor a faturar: ${valor}
📆 Vencimento: ${vencimento}
💳 Forma de pagamento: ${fatura.forma_pagamento || '—'}
${fatura.dados_pix ? `🔑 Dados PIX/Banco: ${fatura.dados_pix}` : ''}
${fatura.obs_faturamento ? `\n📝 Observações: ${fatura.obs_faturamento}` : ''}

Catering Noelma Rudolf
`)

    window.location.href = `mailto:${fatura.responsavel_email}?subject=${assunto}&body=${corpo}`
  }
}
