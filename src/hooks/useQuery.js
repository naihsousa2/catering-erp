import { useState, useEffect, useCallback } from 'react'

/**
 * Hook genérico para buscar dados assíncronos.
 * @param {Function} fn - Função assíncrona que retorna os dados
 * @param {Array} deps - Dependências para refetch automático
 */
export function useQuery(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (err) {
      setError(err)
      console.error('useQuery error:', err)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/**
 * Hook genérico para operações de escrita (create, update, delete).
 * @param {Function} fn - Função assíncrona de mutação
 *
 * Retorna `mutate` e `mutateAsync` (alias) — ambos retornam Promise.
 * No caller, use sempre `await mutateAsync(payload)` dentro de try/catch
 * para que erros de validação/CHECK/RLS do Supabase apareçam na tela.
 */
export function useMutation(fn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn(...args)
      return result
    } catch (err) {
      setError(err)
      console.error('useMutation error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fn])

  return { mutate, mutateAsync: mutate, loading, error }
}