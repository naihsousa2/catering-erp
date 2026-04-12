const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

/**
 * Converte um arquivo de imagem para base64
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Envia imagem do cupom fiscal para Claude Vision e retorna dados extraídos
 * @param {File} file - Arquivo de imagem do cupom
 * @returns {{ estabelecimento, data, total, itens }}
 */
export async function extrairCupom(file) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Chave da API Claude não configurada. Defina VITE_ANTHROPIC_API_KEY no .env')
  }

  const base64 = await fileToBase64(file)
  const mediaType = file.type || 'image/jpeg'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 }
            },
            {
              type: 'text',
              text: `Analise este cupom fiscal/nota fiscal e retorne um JSON puro (sem markdown) com os seguintes campos:
{
  "estabelecimento": "nome do estabelecimento/loja",
  "data": "data no formato YYYY-MM-DD",
  "total": valor numérico total da compra (número, sem R$),
  "itens": [
    { "descricao": "...", "quantidade": 1, "valorUnitario": 0.00, "valorTotal": 0.00 }
  ]
}

Se não conseguir ler algum campo, use null. Retorne apenas o JSON, sem explicações.`
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erro na API Claude: ${response.status}`)
  }

  const result = await response.json()
  const text = result.content?.[0]?.text || ''

  try {
    const clean = text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    return JSON.parse(clean)
  } catch {
    throw new Error('Não foi possível interpretar a resposta da IA. Tente novamente.')
  }
}
