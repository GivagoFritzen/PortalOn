import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApiClient } from './ApiClient'

describe('ApiClient', () => {
  let apiClient: ApiClient
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    apiClient = new ApiClient()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const createMockResponse = (overrides: Partial<Response> = {}): Response => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue(''),
    headers: new Headers(),
    ...overrides,
  } as Response)

  describe('apiFetch', () => {
    it('Should_make_default_GET_request', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await (apiClient as any).apiFetch('/test')
      expect(fetchMock).toHaveBeenCalledWith('/test', undefined)
    })

    it('Should_pass_custom_options', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await (apiClient as any).apiFetch('/test', { method: 'POST', headers: { 'X-Custom': 'value' } })
      expect(fetchMock).toHaveBeenCalledWith('/test', { method: 'POST', headers: { 'X-Custom': 'value' } })
    })

    it('Should_throw_error_when_response_not_ok', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 404, text: vi.fn().mockResolvedValue('Not Found') }))
      await expect((apiClient as any).apiFetch('/test')).rejects.toThrow('Not Found')
    })

    it('Should_throw_error_with_status_when_no_error_text', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 500, text: vi.fn().mockResolvedValue('') }))
      await expect((apiClient as any).apiFetch('/test')).rejects.toThrow('HTTP 500')
    })

    it('Should_return_response_when_ok', async () => {
      const mockResp = createMockResponse()
      fetchMock.mockResolvedValue(mockResp)
      const result = await (apiClient as any).apiFetch('/test')
      expect(result).toBe(mockResp)
    })
  })

  describe('fetchApp', () => {
    it('Should_fetch_app_by_id', async () => {
      const appData = { id: 1, name: 'Test App', url: 'https://example.com', icon: 'home', gradient: 'grad' }
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue(appData) }))

      const result = await apiClient.fetchApp(42)

      expect(fetchMock).toHaveBeenCalledWith('/api/apps/42', undefined)
      expect(result).toEqual(appData)
    })

    it('Should_throw_error_if_api_fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 404, text: vi.fn().mockResolvedValue('App not found') }))
      await expect(apiClient.fetchApp(999)).rejects.toThrow('App not found')
    })
  })

  describe('createApp', () => {
    it('Should_create_app_with_valid_data', async () => {
      const data = { name: 'Test App', url: 'https://example.com', icon: 'home', gradient: 'grad' }
      fetchMock.mockResolvedValue(createMockResponse({ status: 201 }))

      const result = await apiClient.createApp(data)

      expect(fetchMock).toHaveBeenCalledWith('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      expect(result.status).toBe(201)
    })

    it('Should_serialize_data_as_JSON', async () => {
      const data = { name: 'App', url: 'https://test.com', icon: 'icon', gradient: '' }
      fetchMock.mockResolvedValue(createMockResponse())

      await apiClient.createApp(data)

      const call = fetchMock.mock.calls[0]
      expect(call[1]?.body).toBe(JSON.stringify(data))
    })

    it('Should_throw_error_if_api_fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 400, text: vi.fn().mockResolvedValue('Validation error') }))
      await expect(apiClient.createApp({ name: '', url: '', icon: '', gradient: '' })).rejects.toThrow('Validation error')
    })
  })

  describe('updateApp', () => {
    it('Should_update_app_with_valid_data', async () => {
      const data = { name: 'Updated App', url: 'https://example.com', icon: 'home', gradient: 'grad' }
      fetchMock.mockResolvedValue(createMockResponse({ status: 200 }))

      const result = await apiClient.updateApp(5, data)

      expect(fetchMock).toHaveBeenCalledWith('/api/apps/5', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      expect(result.status).toBe(200)
    })

    it('Should_use_PUT_method', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.updateApp(1, { name: 'A', url: 'https://a.com', icon: 'i', gradient: '' })
      expect(fetchMock.mock.calls[0][1]?.method).toBe('PUT')
    })

    it('Should_throw_error_if_api_fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 404, text: vi.fn().mockResolvedValue('Not found') }))
      await expect(apiClient.updateApp(999, { name: 'A', url: 'https://a.com', icon: 'i', gradient: '' })).rejects.toThrow('Not found')
    })
  })

  describe('deleteApp', () => {
    it('Should_delete_app', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ status: 204 }))
      await apiClient.deleteApp(10)
      expect(fetchMock).toHaveBeenCalledWith('/api/apps/10', { method: 'DELETE' })
    })

    it('Should_use_DELETE_method', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.deleteApp(1)
      expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE')
    })

    it('Should_throw_error_if_api_fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 403, text: vi.fn().mockResolvedValue('Forbidden') }))
      await expect(apiClient.deleteApp(1)).rejects.toThrow('Forbidden')
    })

    it('Should_not_send_body', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.deleteApp(1)
      expect(fetchMock.mock.calls[0][1]?.body).toBeUndefined()
    })
  })

  describe('reorderApps', () => {
    it('Should_reorder_apps', async () => {
      const ids = [3, 1, 2]
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.reorderApps(ids)
      expect(fetchMock).toHaveBeenCalledWith('/api/apps/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
    })

    it('Should_send_array_of_ids', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.reorderApps([5, 6, 7])
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(body.ids).toEqual([5, 6, 7])
    })

    it('Should_throw_error_if_api_fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Server error') }))
      await expect(apiClient.reorderApps([1])).rejects.toThrow('Server error')
    })

    it('Should_work_with_empty_array', async () => {
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.reorderApps([])
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
      expect(body.ids).toEqual([])
    })
  })

  describe('fetchIcons', () => {
    it('Should_fetch_icons_with_query', async () => {
      const iconsData = { icons: ['icon1', 'icon2', 'icon3'], total: 100 }
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue(iconsData) }))

      const result = await apiClient.fetchIcons('search', 0, 10)

      expect(fetchMock).toHaveBeenCalledWith('/api/icons?search=search&offset=0&limit=10', { signal: undefined })
      expect(result).toEqual(iconsData)
    })

    it('Should_fetch_icons_without_query', async () => {
      const iconsData = { icons: ['a', 'b'], total: 2 }
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue(iconsData) }))

      const result = await apiClient.fetchIcons('', 0, 5)

      expect(fetchMock).toHaveBeenCalledWith('/api/icons?search=&offset=0&limit=5', { signal: undefined })
      expect(result).toEqual(iconsData)
    })

    it('Should_encode_special_query', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue({ icons: [], total: 0 }) }))
      await apiClient.fetchIcons('test & query', 10, 20)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('search=test+%26+query')
      expect(url).toContain('offset=10')
      expect(url).toContain('limit=20')
    })

    it('Should_pass_signal_to_fetch', async () => {
      const controller = new AbortController()
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue({ icons: [], total: 0 }) }))
      await apiClient.fetchIcons('test', 0, 10, controller.signal)
      expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
    })

    it('Should_throw_error_if_api_fails', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ ok: false, status: 500, text: vi.fn().mockResolvedValue('Icons error') }))
      await expect(apiClient.fetchIcons('test', 0, 10)).rejects.toThrow('Icons error')
    })

    it('Should_handle_abort_signal', async () => {
      const controller = new AbortController()
      fetchMock.mockImplementation(() => Promise.reject(new DOMException('Aborted', 'AbortError')))
      await expect(apiClient.fetchIcons('test', 0, 10, controller.signal)).rejects.toThrow('Aborted')
    })

    it('Should_use_correct_offset_and_limit', async () => {
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue({ icons: [], total: 0 }) }))
      await apiClient.fetchIcons('query', 50, 25)
      const url = fetchMock.mock.calls[0][0] as string
      expect(url).toContain('offset=50')
      expect(url).toContain('limit=25')
    })
  })

  describe('exported_functions', () => {
    it('fetchApp_should_call_instance_method', async () => {
      const { fetchApp } = await import('./ApiClient')
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue({ id: 1 }) }))
      const result = await fetchApp(1)
      expect(result.id).toBe(1)
    })

    it('createApp_should_call_instance_method', async () => {
      const { createApp } = await import('./ApiClient')
      fetchMock.mockResolvedValue(createMockResponse({ status: 201 }))
      const result = await createApp({ name: 'A', url: 'https://a.com', icon: 'i', gradient: '' })
      expect(result.status).toBe(201)
    })

    it('updateApp_should_call_instance_method', async () => {
      const { updateApp } = await import('./ApiClient')
      fetchMock.mockResolvedValue(createMockResponse({ status: 200 }))
      const result = await updateApp(1, { name: 'A', url: 'https://a.com', icon: 'i', gradient: '' })
      expect(result.status).toBe(200)
    })

    it('deleteApp_should_call_instance_method', async () => {
      const { deleteApp } = await import('./ApiClient')
      fetchMock.mockResolvedValue(createMockResponse({ status: 204 }))
      await deleteApp(1)
      expect(fetchMock).toHaveBeenCalledWith('/api/apps/1', { method: 'DELETE' })
    })

    it('reorderApps_should_call_instance_method', async () => {
      const { reorderApps } = await import('./ApiClient')
      fetchMock.mockResolvedValue(createMockResponse())
      await reorderApps([1, 2])
      expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({ ids: [1, 2] }))
    })

    it('fetchIcons_should_call_instance_method', async () => {
      const { fetchIcons } = await import('./ApiClient')
      fetchMock.mockResolvedValue(createMockResponse({ json: vi.fn().mockResolvedValue({ icons: ['a'], total: 1 }) }))
      const result = await fetchIcons('q', 0, 5)
      expect(result.icons).toEqual(['a'])
    })
  })

  describe('network_error_handling', () => {
    it('Should_propagate_network_error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Network error'))
      await expect(apiClient.fetchApp(1)).rejects.toThrow('Network error')
    })

    it('Should_propagate_timeout_error', async () => {
      fetchMock.mockRejectedValue(new DOMException('Timeout', 'TimeoutError'))
      await expect(apiClient.createApp({ name: 'A', url: 'https://a.com', icon: 'i', gradient: '' })).rejects.toThrow('Timeout')
    })
  })

  describe('JSON_serialization', () => {
    it('Should_escape_special_characters_in_JSON', async () => {
      const data = { name: 'App "quotes"', url: 'https://test.com', icon: 'icon', gradient: '' }
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.createApp(data)
      const body = fetchMock.mock.calls[0][1]?.body as string
      expect(body).toContain('\\"quotes\\"')
    })

    it('Should_preserve_unicode', async () => {
      const data = { name: 'App 日本語', url: 'https://test.com', icon: 'icon', gradient: '' }
      fetchMock.mockResolvedValue(createMockResponse())
      await apiClient.createApp(data)
      const body = fetchMock.mock.calls[0][1]?.body as string
      expect(body).toContain('日本語')
    })
  })
})