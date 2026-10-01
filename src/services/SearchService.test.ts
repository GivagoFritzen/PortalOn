import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SearchService } from './SearchService'
import { translate } from '../locale'

describe('SearchService', () => {
  let service: SearchService
  let input: HTMLInputElement
  let grid: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <input id="search-input" />
      <div id="app-grid"></div>
    `
    input = document.getElementById('search-input') as HTMLInputElement
    grid = document.getElementById('app-grid') as HTMLDivElement
    service = new SearchService()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    service.destroy()
  })

  describe('init', () => {
    it('Should_register_input_event_on_search_field', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<div>Result</div>'),
      } as any)

      input.value = 'test'
      input.dispatchEvent(new Event('input'))

      vi.advanceTimersByTime(300)
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=test')
    })

    it('Should_not_register_event_when_elements_missing', () => {
      document.body.innerHTML = ''
      service.init()
      expect(() => service.destroy()).not.toThrow()
    })

    it('Should_set_input_placeholder', () => {
      service.init()
      expect(input.placeholder).toBe('Search apps...')
    })

    it('Should_add_input_event_listener', () => {
      const addEventListenerSpy = vi.spyOn(input, 'addEventListener')
      service.init()
      expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function))
    })
  })

  describe('performSearch', () => {
    it('Should_perform_search_and_update_grid', async () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<div class="app-card">Portal</div>'),
      } as any)

      input.value = 'portal'
      await (service as any).performSearch()

      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=portal')
      expect(grid.innerHTML).toBe('<div class="app-card">Portal</div>')
    })

    it('Should_handle_error_when_fetch_fails', async () => {
      service.init()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      input.value = 'portal'
      await (service as any).performSearch()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Search failed:', expect.any(Error))
    })

    it('Should_return_without_doing_anything_if_elements_missing', async () => {
      global.fetch = vi.fn()
      await (service as any).performSearch()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('Should_encode_query_with_special_characters', async () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>Result</div>') } as any)

      input.value = 'test & query'
      await (service as any).performSearch()

      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=test%20%26%20query')
    })

    it('Should_clear_grid_before_searching', async () => {
      service.init()
      grid.innerHTML = '<div>Old content</div>'
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>New</div>') } as any)

      input.value = 'test'
      await (service as any).performSearch()

      expect(grid.innerHTML).not.toContain('Old content')
    })

    it('Should_do_nothing_if_grid_missing', async () => {
      grid.remove()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>New</div>') } as any)
      input.value = 'test'
      await (service as any).performSearch()
      // Should not throw error
    })
  })

  describe('debounce', () => {
    it('Should_group_multiple_inputs_into_single_search', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<div>Result</div>'),
      } as any)

      input.value = 'test'
      input.dispatchEvent(new Event('input'))
      input.value = 'test2'
      input.dispatchEvent(new Event('input'))
      input.value = 'test3'
      input.dispatchEvent(new Event('input'))

      vi.advanceTimersByTime(300)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=test3')
    })

    it('Should_allow_search_with_empty_query', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<div>Result</div>'),
      } as any)

      input.value = ''
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)

      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=')
    })

    it('Should_cancel_previous_timer', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<div>Result</div>'),
      } as any)

      input.value = 'a'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(100)

      input.value = 'ab'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(100)

      input.value = 'abc'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('destroy', () => {
    it('Should_clear_debounce_timer', () => {
      service.init()
      input.value = 'test'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(100)

      service.destroy()

      vi.advanceTimersByTime(300)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('Should_remove_event_listener', () => {
      service.init()
      const removeSpy = vi.spyOn(input, 'removeEventListener')
      service.destroy()
      expect(removeSpy).toHaveBeenCalledWith('input', expect.any(Function))
    })

    it('Should_stop_pending_timers', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({
        text: () => Promise.resolve('<div>Result</div>'),
      } as any)

      input.value = 'test'
      input.dispatchEvent(new Event('input'))
      service.destroy()
      vi.advanceTimersByTime(300)

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('handleInput', () => {
    it('Should_call_performSearch_after_debounce', async () => {
      service.init()
      const performSearchSpy = vi.spyOn(service as any, 'performSearch').mockResolvedValue(undefined)

      input.value = 'test'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)

      await vi.waitFor(() => expect(performSearchSpy).toHaveBeenCalledTimes(1))
    })

    it('Should_pass_correct_query_to_performSearch', async () => {
      service.init()
      const performSearchSpy = vi.spyOn(service as any, 'performSearch').mockResolvedValue(undefined)

      input.value = 'custom query'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)

      await vi.waitFor(() => expect(performSearchSpy).toHaveBeenCalled())
    })
  })

  describe('init - edge cases', () => {
    it('Should_return_early_if_searchInput_missing', () => {
      document.getElementById('search-input')?.remove()
      service.init()
      expect(() => service.destroy()).not.toThrow()
    })

    it('Should_return_early_if_gridContainer_missing', () => {
      document.getElementById('app-grid')?.remove()
      service.init()
      expect(() => service.destroy()).not.toThrow()
    })

    it('Should_return_early_if_both_missing', () => {
      document.body.innerHTML = ''
      service.init()
      expect(() => service.destroy()).not.toThrow()
    })

    it('Should_not_add_listener_when_elements_missing', () => {
      document.body.innerHTML = ''
      const addSpy = vi.spyOn(document, 'addEventListener')
      service.init()
      expect(addSpy).not.toHaveBeenCalled()
    })

    it('Should_set_placeholder_from_locale', () => {
      service.init()
      expect(input.placeholder).toBe(translate('search.placeholder'))
    })
  })

  describe('performSearch - edge cases', () => {
    it('Should_return_early_if_searchInput_missing', async () => {
      input.remove()
      global.fetch = vi.fn()
      await (service as any).performSearch()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('Should_return_early_if_gridContainer_missing', async () => {
      grid.remove()
      global.fetch = vi.fn()
      await (service as any).performSearch()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('Should_trim_query', async () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>Result</div>') } as any)
      input.value = '  test query  '
      await (service as any).performSearch()
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=test%20query')
    })

    it('Should_encode_special_characters', async () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>Result</div>') } as any)
      input.value = 'test & query = 1'
      await (service as any).performSearch()
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=test%20%26%20query%20%3D%201')
    })
  })

  describe('handleInput - edge cases', () => {
    it('Should_do_nothing_if_searchInput_missing', () => {
      input.remove()
      global.fetch = vi.fn()
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('Should_do_nothing_if_gridContainer_missing', () => {
      grid.remove()
      global.fetch = vi.fn()
      input.value = 'test'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('Should_use_searchInput_value', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>Result</div>') } as any)
      input.value = 'direct value'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=direct%20value')
    })
  })

  describe('debounce - edge cases', () => {
    it('Should_cancel_previous_timer_quickly', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>Result</div>') } as any)

      input.value = 'a'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(50)

      input.value = 'ab'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(50)

      input.value = 'abc'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(50)

      input.value = 'abcd'
      input.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(300)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=abcd')
    })

    it('Should_keep_last_timer_if_many_rapid_inputs', () => {
      service.init()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>Result</div>') } as any)

      for (let i = 1; i <= 10; i++) {
        input.value = 'a'.repeat(i)
        input.dispatchEvent(new Event('input'))
        vi.advanceTimersByTime(20)
      }

      vi.advanceTimersByTime(300)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=aaaaaaaaaa')
    })
  })

  describe('destroy - edge cases', () => {
    it('Should_work_without_previous_init', () => {
      expect(() => service.destroy()).not.toThrow()
    })

    it('Should_clear_debounceTimer_even_if_not_started', () => {
      service.destroy()
      expect(() => service.destroy()).not.toThrow()
    })
  })
})