import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { IconPickerService } from './IconPickerService'
import { ApiClient } from '../api/ApiClient'
import { translate } from '../locale'

describe('IconPickerService', () => {
  let service: IconPickerService
  let mockApiClient: ApiClient
  let searchInput: HTMLInputElement
  let gridContainer: HTMLElement
  let grid: HTMLElement
  let selectedDisplay: HTMLElement
  let selectedImg: HTMLImageElement
  let selectedName: HTMLElement
  let formIcon: HTMLInputElement

  const setupDOM = () => {
    document.body.innerHTML = `
      <input id="icon-search" />
      <div id="icon-grid-container"></div>
      <div id="material-icons-grid"></div>
      <div id="icon-selected-display" class="hidden"></div>
      <img id="icon-selected-img" />
      <span id="icon-selected-name"></span>
      <input id="form-icon" />
    `
    searchInput = document.getElementById('icon-search') as HTMLInputElement
    gridContainer = document.getElementById('icon-grid-container') as HTMLElement
    grid = document.getElementById('material-icons-grid') as HTMLElement
    selectedDisplay = document.getElementById('icon-selected-display') as HTMLElement
    selectedImg = document.getElementById('icon-selected-img') as HTMLImageElement
    selectedName = document.getElementById('icon-selected-name') as HTMLElement
    formIcon = document.getElementById('form-icon') as HTMLInputElement
  }

  beforeEach(() => {
    const mockDisconnect = vi.fn()
    const mockObserve = vi.fn()
    const mockUnobserve = vi.fn()

    ; (global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    })) as unknown as typeof IntersectionObserver

    setupDOM()

    mockApiClient = {
      fetchIcons: vi.fn().mockResolvedValue({ icons: ['home', 'settings', 'person', 'menu'], total: 4 }),
      fetchApp: vi.fn(),
      createApp: vi.fn(),
      updateApp: vi.fn(),
      deleteApp: vi.fn(),
      reorderApps: vi.fn(),
    } as unknown as ApiClient

    service = new IconPickerService(mockApiClient)
  })

  afterEach(() => {
    service.destroy()
    vi.useRealTimers()
  })

  describe('init', () => {
    it('Should_initialize_picker_when_elements_exist', () => {
      service.init()
      expect(gridContainer.style.display).toBe('none')
    })

    it('Should_not_initialize_when_elements_missing', () => {
      document.body.innerHTML = ''
      expect(() => service.init()).not.toThrow()
    })

    it('Should_add_focus_event_listener_to_searchInput', () => {
      const focusSpy = vi.spyOn(searchInput, 'addEventListener')
      service.init()
      expect(focusSpy).toHaveBeenCalledWith('focus', expect.any(Function), expect.any(Object))
    })

    it('Should_add_input_event_listener_to_searchInput', () => {
      const inputSpy = vi.spyOn(searchInput, 'addEventListener')
      service.init()
      expect(inputSpy).toHaveBeenCalledWith('input', expect.any(Function), expect.any(Object))
    })

    it('Should_add_click_event_listener_to_selectedDisplay', () => {
      const clickSpy = vi.spyOn(selectedDisplay, 'addEventListener')
      service.init()
      expect(clickSpy).toHaveBeenCalledWith('click', expect.any(Function), expect.any(Object))
    })

    it('Should_add_mousedown_event_listener_to_document', () => {
      const mousedownSpy = vi.spyOn(document, 'addEventListener')
      service.init()
      expect(mousedownSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), expect.any(Object))
    })

    it('Should_set_iconsLoaded_false', () => {
      service.init()
      expect((service as any).iconsLoaded).toBe(false)
    })
  })

  describe('destroy', () => {
    it('Should_abort_eventController', () => {
      service.init()
      const controller = (service as any).eventController
      const abortSpy = vi.spyOn(controller, 'abort')
      service.destroy()
      expect(abortSpy).toHaveBeenCalled()
      expect((service as any).eventController).toBeNull()
    })

    it('Should_disconnect_scrollObserver', async () => {
      service.init()
      await (service as any).loadInitialIcons()
      const mockObserver = (service as any).scrollObserver
      service.destroy()
      expect(mockObserver?.disconnect).toHaveBeenCalled()
      expect((service as any).scrollObserver).toBeNull()
    })

    it('Should_abort_fetchAbortController', () => {
      service.init()
      service.destroy()
      expect((service as any).fetchAbortController).toBeNull()
    })

    it('Should_clear_debounceTimer', () => {
      service.init()
      vi.useFakeTimers()
      searchInput.value = 'test'
      searchInput.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(100)
      service.destroy()
      expect((service as any).debounceTimer).toBeNull()
    })

    it('Should_clear_boundMousedown', () => {
      service.init()
      service.destroy()
      expect((service as any).boundMousedown).toBeNull()
    })
  })

  describe('reset', () => {
    it('Should_reset_counters_and_state', () => {
      service.init()
      ; (service as any).displayedCount = 10
      ; (service as any).totalIcons = 20
      ; (service as any).currentQuery = 'test'
      ; (service as any).iconsLoaded = true
      grid.innerHTML = '<button>icon</button>'

      service.reset()

      expect((service as any).displayedCount).toBe(0)
      expect((service as any).totalIcons).toBe(0)
      expect((service as any).currentQuery).toBe('')
      expect((service as any).iconsLoaded).toBe(false)
      expect(grid.innerHTML).toBe('')
    })
  })

  describe('selectIcon', () => {
    beforeEach(() => {
      service.init()
    })

    it('Should_select_an_icon', () => {
      service.selectIcon('home')

      expect(formIcon.value).toBe('home')
      expect(selectedName.textContent).toBe('home')
      expect(selectedImg.src).toContain('home.svg')
    })

    it('Should_update_selected_icon_highlight', () => {
      grid.innerHTML = `
        <button class="icon-item" data-icon="home"></button>
        <button class="icon-item" data-icon="settings"></button>
      `
      service.selectIcon('home')

      const homeBtn = grid.querySelector('[data-icon="home"]') as HTMLElement
      const settingsBtn = grid.querySelector('[data-icon="settings"]') as HTMLElement

      expect(homeBtn.classList.contains('ring-2')).toBe(true)
      expect(homeBtn.classList.contains('ring-primary')).toBe(true)
      expect(settingsBtn.classList.contains('ring-2')).toBe(false)
    })

    it('Should_hide_gridContainer', () => {
      service.selectIcon('home')
      expect(gridContainer.style.display).toBe('none')
    })

    it('Should_hide_searchInput_and_show_selectedDisplay', () => {
      service.selectIcon('home')
      expect(searchInput.classList.contains('hidden')).toBe(true)
      expect(selectedDisplay.classList.contains('hidden')).toBe(false)
    })

    it('Should_work_without_formIcon', () => {
      document.getElementById('form-icon')?.remove()
      expect(() => service.selectIcon('home')).not.toThrow()
    })

    it('Should_work_without_selectedDisplay', () => {
      selectedDisplay.remove()
      expect(() => service.selectIcon('home')).not.toThrow()
    })
  })

  describe('clearSelection', () => {
    beforeEach(() => {
      service.init()
      grid.innerHTML = `<button class="icon-item" data-icon="home"></button>`
      service.selectIcon('home')
    })

    it('Should_clear_formIcon', () => {
      service.clearSelection()
      expect(formIcon.value).toBe('')
    })

    it('Should_remove_highlights', () => {
      // selectIcon adds ring classes via updateSelectedIconHighlight
      const btn = grid.querySelector('[data-icon="home"]') as HTMLElement
      expect(btn.classList.contains('ring-2')).toBe(true)
      service.clearSelection()
      expect(btn.classList.contains('ring-2')).toBe(false)
    })

    it('Should_show_searchInput_and_hide_selectedDisplay', () => {
      service.clearSelection()
      expect(searchInput.classList.contains('hidden')).toBe(false)
      expect(selectedDisplay.classList.contains('hidden')).toBe(true)
    })

    it('Should_clear_searchInput_value', () => {
      searchInput.value = 'test'
      service.clearSelection()
      expect(searchInput.value).toBe('')
    })

    it('Should_focus_searchInput', () => {
      const focusSpy = vi.spyOn(searchInput, 'focus')
      service.clearSelection()
      expect(focusSpy).toHaveBeenCalled()
    })

    it('Should_work_without_formIcon', () => {
      formIcon.remove()
      expect(() => service.clearSelection()).not.toThrow()
    })

    it('Should_work_without_selectedDisplay', () => {
      selectedDisplay.remove()
      expect(() => service.clearSelection()).not.toThrow()
    })
  })

  describe('loadInitialIcons', () => {
    it('Should_load_initial_icons', async () => {
      service.init()
      await (service as any).loadInitialIcons()

      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('', 0, 10)
      expect(grid.children.length).toBe(4)
      expect((service as any).displayedCount).toBe(4)
      expect((service as any).totalIcons).toBe(4)
      // iconsLoaded is set by the caller (focus handler), not inside loadInitialIcons
    })

    it('Should_show_loading_before_loading', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      service.init()
      const loadPromise = (service as any).loadInitialIcons()
      expect(grid.innerHTML).toContain('Loading...')
      await loadPromise
    })

    it('Should_show_error_when_fetch_fails', async () => {
      mockApiClient.fetchIcons = vi.fn().mockRejectedValue(new Error('Network error'))
      service.init()
      await (service as any).loadInitialIcons()

      expect(grid.innerHTML).toContain('Failed to load icons')
    })

    it('Should_do_nothing_if_grid_or_gridContainer_missing', async () => {
      grid.remove()
      await expect((service as any).loadInitialIcons()).resolves.not.toThrow()
    })

    it('Should_call_setupScrollObserver_after_loading', async () => {
      service.init()
      const spy = vi.spyOn(service as any, 'setupScrollObserver')
      await (service as any).loadInitialIcons()
      expect(spy).toHaveBeenCalled()
    })

    it('Should_create_buttons_with_correct_classes', async () => {
      service.init()
      await (service as any).loadInitialIcons()

      const btn = grid.querySelector('button.icon-item') as HTMLElement
      expect(btn).not.toBeNull()
      expect(btn.className).toContain('icon-item')
      expect(btn.className).toContain('aspect-square')
      expect(btn.className).toContain('rounded-xl')
      expect(btn.className).toContain('bg-surface-container-highest')
      expect(btn.dataset.icon).toBe('home')
    })

    it('Should_create_image_with_correct_src', async () => {
      service.init()
      await (service as any).loadInitialIcons()

      const img = grid.querySelector('img') as HTMLImageElement
      expect(img.src).toContain('/static/icons/home.svg')
      expect(img.alt).toBe('home')
    })

    it('Should_add_mousedown_event_listener_to_button', async () => {
      const selectIconSpy = vi.spyOn(service, 'selectIcon')
      service.init()
      await (service as any).loadInitialIcons()

      const btn = grid.querySelector('button.icon-item') as HTMLElement
      btn.dispatchEvent(new Event('mousedown'))
      expect(selectIconSpy).toHaveBeenCalledWith('home')
    })
  })

  describe('handleSearchInput', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      service.init()
    })

    it('Should_debounce_api_call', async () => {
      searchInput.value = 'set'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(100)
      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()

      vi.advanceTimersByTime(200)
      await Promise.resolve()
      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('set', 0, 10, expect.any(AbortSignal))
    })

    it('Should_cancel_previous_timer_on_new_input', async () => {
      searchInput.value = 'a'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(100)

      searchInput.value = 'ab'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(100)

      searchInput.value = 'abc'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)

      await Promise.resolve()
      expect(mockApiClient.fetchIcons).toHaveBeenCalledTimes(1)
      expect(mockApiClient.fetchIcons).toHaveBeenLastCalledWith('abc', 0, 10, expect.any(AbortSignal))
    })

    it('Should_abort_previous_fetch', async () => {
      searchInput.value = 'first'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()

      const oldController = (service as any).fetchAbortController
      const abortSpy = vi.spyOn(oldController!, 'abort')

      searchInput.value = 'second'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)

      await Promise.resolve()
      expect(abortSpy).toHaveBeenCalled()
    })

    it('Should_reset_state_before_searching', async () => {
      ; (service as any).displayedCount = 10
      ; (service as any).totalIcons = 20
      ; (service as any).currentQuery = 'old'

      searchInput.value = 'new'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()

      expect((service as any).displayedCount).toBe(0)
      expect((service as any).totalIcons).toBe(0)
      expect((service as any).currentQuery).toBe('new')
    })

    it('Should_clear_grid_before_searching', async () => {
      grid.innerHTML = '<button>old</button>'
      searchInput.value = 'test'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()
      expect(grid.innerHTML).not.toContain('old')
    })

    it.skip('Should_update_current_icon_highlight_after_search', async () => {
      formIcon.value = 'settings'
      searchInput.value = 'set'

      let fetchPromise: Promise<{ icons: string[]; total: number }>
      mockApiClient.fetchIcons = vi.fn().mockImplementation(() => {
        fetchPromise = Promise.resolve({ icons: ['home', 'settings', 'person', 'menu'], total: 4 })
        return fetchPromise
      })

      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await fetchPromise!
      await Promise.resolve()

      const btn = grid.querySelector('[data-icon="settings"]') as HTMLElement
      expect(btn).not.toBeNull()
      expect(btn!.classList.contains('ring-2')).toBe(true)
    })

    it('Should_do_nothing_if_grid_or_searchInput_missing', async () => {
      grid.remove()
      searchInput.value = 'test'
      const result = (service as any).handleSearchInput(new AbortController().signal)
      if (result instanceof Promise) {
        await expect(result).resolves.not.toThrow()
      } else {
        expect(result).toBeUndefined()
      }
    })

    it('Should_work_when_formIcon_is_null', async () => {
      formIcon.remove()
      ;(service as any).formIcon = null
      searchInput.value = 'test'
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(grid.children.length).toBeGreaterThan(0))
      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('test', 0, 10, expect.any(AbortSignal))
      expect(consoleErrorSpy).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('Should_not_call_updateSelectedIconHighlight_when_formIcon_value_empty', async () => {
      formIcon.value = ''
      searchInput.value = 'test'
      const highlightSpy = vi.spyOn(service as any, 'updateSelectedIconHighlight')
      ;(service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(grid.children.length).toBeGreaterThan(0))
      expect(highlightSpy).not.toHaveBeenCalled()
    })

    it('Should_call_updateSelectedIconHighlight_when_formIcon_has_value', async () => {
      formIcon.value = 'home'
      searchInput.value = 'test'
      ;(service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(grid.children.length).toBeGreaterThan(0))
      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('test', 0, 10, expect.any(AbortSignal))
      const btn = grid.querySelector('[data-icon="home"]') as HTMLElement
      expect(btn).not.toBeNull()
      expect(btn?.classList.contains('ring-2')).toBe(true)
      expect(btn?.classList.contains('ring-primary')).toBe(true)
    })

    it('Should_abort_previous_fetch_on_new_search', async () => {
      searchInput.value = 'first'
      ;(service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(grid.children.length).toBeGreaterThan(0))

      const oldController = (service as any).fetchAbortController
      const abortSpy = vi.spyOn(oldController!, 'abort')

      searchInput.value = 'second'
      ;(service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await vi.waitFor(() => expect(grid.children.length).toBeGreaterThan(0))

      expect(abortSpy).toHaveBeenCalled()
    })
  })

  describe('loadIconPage', () => {
    it('Should_load_more_icons_when_called', async () => {
      service.init()
      await (service as any).loadInitialIcons()
      ; (service as any).currentQuery = 'test'
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      mockApiClient.fetchIcons = vi.fn().mockResolvedValue({ icons: ['more1', 'more2'], total: 10 })

      await (service as any).loadIconPage()

      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('test', 4, 10)
      expect(grid.children.length).toBe(6)
      expect((service as any).displayedCount).toBe(6)
    })

    it('Should_not_load_when_isLoading_true', async () => {
      service.init()
      ; (service as any).isLoading = true
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      await (service as any).loadIconPage()

      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()
    })

    it('Should_not_load_when_all_already_loaded', async () => {
      service.init()
      ; (service as any).displayedCount = 20
      ; (service as any).totalIcons = 20
      ; (service as any).isLoading = false

      await (service as any).loadIconPage()

      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()
    })

    it('Should_not_load_when_gridContainer_missing', async () => {
      gridContainer.remove()
      ; (service as any).displayedCount = 0
      ; (service as any).totalIcons = 10
      ; (service as any).isLoading = false

      const result = (service as any).loadIconPage()
      if (result instanceof Promise) {
        await expect(result).resolves.not.toThrow()
      } else {
        expect(result).toBeUndefined()
      }
    })

    it('Should_handle_error_and_not_break', async () => {
      service.init()
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      mockApiClient.fetchIcons = vi.fn().mockRejectedValue(new Error('Error'))
      await (service as any).loadIconPage()

      expect((service as any).isLoading).toBe(false)
    })

    it('Should_set_isLoading_true_then_false', async () => {
      service.init()
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 0
      ; (service as any).totalIcons = 10

      const promise = (service as any).loadIconPage()
      expect((service as any).isLoading).toBe(true)
      await promise
      expect((service as any).isLoading).toBe(false)
    })
  })

  describe('updateNoResults', () => {
    it('Should_show_message_when_no_results', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = grid

      ; (service as any).updateNoResults()

      const msg = document.getElementById('no-results-msg')
      expect(msg).not.toBeNull()
      expect(msg?.style.display).toBe('block')
    })

    it('Should_use_correct_translation_key', async () => {
      const translateSpy = vi.spyOn(await import('../locale'), 'translate')
      ;(service as any).displayedCount = 0
      ;(service as any).grid = grid

      ;(service as any).updateNoResults()

      expect(translateSpy).toHaveBeenCalledWith('icon.noResults')
    })

    it('Should_hide_message_when_has_results', () => {
      ; (service as any).displayedCount = 5
      ; (service as any).grid = grid

      const msg = document.createElement('div')
      msg.id = 'no-results-msg'
      msg.style.display = 'block'
      grid.appendChild(msg)

      ; (service as any).updateNoResults()

      expect(msg.style.display).toBe('none')
    })

    it('Should_create_element_if_not_exists', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = grid

      ; (service as any).updateNoResults()

      const msg = document.getElementById('no-results-msg')
      expect(msg).not.toBeNull()
      expect(msg?.className).toContain('col-span-5')
      expect(msg?.className).toContain('text-center')
      expect(msg?.textContent).toBeDefined()
    })

    it('Should_not_create_duplicate_element_when_already_exists', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = grid

      ; (service as any).updateNoResults()
      ; (service as any).updateNoResults()

      const msgs = grid.querySelectorAll('#no-results-msg')
      expect(msgs.length).toBe(1)
    })

    it('Should_do_nothing_if_grid_missing', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = null
      expect(() => (service as any).updateNoResults()).not.toThrow()
    })
  })

  describe('handleOutsideClick', () => {
    beforeEach(() => {
      service.init()
      gridContainer.style.display = 'block'
    })

    const createEvent = (target: Node) => {
      const event = new MouseEvent('mousedown')
      Object.defineProperty(event, 'target', { value: target })
      return event
    }

    it('Should_hide_gridContainer_when_click_outside', () => {
      const event = createEvent(document.body)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).toBe('none')
    })

    it('Should_not_hide_when_click_inside_searchInput', () => {
      const event = createEvent(searchInput)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).not.toBe('none')
    })

    it('Should_not_hide_when_click_inside_gridContainer', () => {
      const event = createEvent(gridContainer)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).not.toBe('none')
    })

    it('Should_not_hide_when_click_inside_selectedDisplay', () => {
      const event = createEvent(selectedDisplay)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).not.toBe('none')
    })

    it('Should_do_nothing_if_gridContainer_missing', () => {
      gridContainer.remove()
      const event = new MouseEvent('mousedown', { target: document.body })
      expect(() => (service as any).handleOutsideClick(event)).not.toThrow()
    })
  })

  describe('appendIconBatch', () => {
    it('Should_add_buttons_for_each_icon', () => {
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['icon1', 'icon2', 'icon3'])

      expect(grid.children.length).toBe(3)
    })

    it('Should_create_button_with_correct_attributes', () => {
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['test-icon'])

      const btn = grid.querySelector('button') as HTMLElement
      expect(btn.type).toBe('button')
      expect(btn.className).toContain('icon-item')
      expect(btn.dataset.icon).toBe('test-icon')
      expect(btn.title).toBe('test-icon')
    })

    it('Should_create_img_with_correct_src_and_alt', () => {
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['my-icon'])

      const img = grid.querySelector('img') as HTMLImageElement
      expect(img.src).toContain('/static/icons/my-icon.svg')
      expect(img.alt).toBe('my-icon')
      expect(img.className).toContain('w-full')
      expect(img.className).toContain('h-full')
      expect(img.className).toContain('object-contain')
    })

    it('Should_do_nothing_if_grid_missing', () => {
      ; (service as any).grid = null
      expect(() => (service as any).appendIconBatch(['icon1'])).not.toThrow()
    })
  })

  describe('updateSelectedIconHighlight', () => {
    it('Should_add_ring_classes_to_selected_icon', () => {
      grid.innerHTML = `
        <button class="icon-item" data-icon="a"></button>
        <button class="icon-item" data-icon="b"></button>
      `
      ; (service as any).grid = grid
      ; (service as any).updateSelectedIconHighlight('b')

      const btnA = grid.querySelector('[data-icon="a"]') as HTMLElement
      const btnB = grid.querySelector('[data-icon="b"]') as HTMLElement

      expect(btnA.classList.contains('ring-2')).toBe(false)
      expect(btnB.classList.contains('ring-2')).toBe(true)
      expect(btnB.classList.contains('ring-primary')).toBe(true)
      expect(btnB.classList.contains('ring-offset-2')).toBe(true)
    })

    it('Should_remove_classes_from_others', () => {
      grid.innerHTML = `
        <button class="icon-item ring-2 ring-primary" data-icon="a"></button>
        <button class="icon-item" data-icon="b"></button>
      `
      ; (service as any).grid = grid
      ; (service as any).updateSelectedIconHighlight('b')

      const btnA = grid.querySelector('[data-icon="a"]') as HTMLElement
      expect(btnA.classList.contains('ring-2')).toBe(false)
    })
  })

  describe('clearIconHighlights', () => {
    it('Should_remove_all_ring_classes', () => {
      grid.innerHTML = `
        <button class="icon-item ring-2 ring-primary ring-offset-2" data-icon="a"></button>
        <button class="icon-item ring-2 ring-primary" data-icon="b"></button>
      `
      ; (service as any).grid = grid
      ; (service as any).clearIconHighlights()

      const btns = grid.querySelectorAll('.icon-item')
      btns.forEach(btn => {
        expect(btn.classList.contains('ring-2')).toBe(false)
        expect(btn.classList.contains('ring-primary')).toBe(false)
        expect(btn.classList.contains('ring-offset-2')).toBe(false)
      })
    })

    it('Should_not_break_without_elements', () => {
      grid.innerHTML = ''
      ; (service as any).grid = grid
      expect(() => (service as any).clearIconHighlights()).not.toThrow()
    })
  })

  describe('setupScrollObserver', () => {
    it('Should_create_new_IntersectionObserver', () => {
      service.init()
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      expect((service as any).scrollObserver).not.toBeNull()
    })

    it('Should_disconnect_previous_observer', async () => {
      service.init()
      await (service as any).loadInitialIcons()
      const oldObserver = (service as any).scrollObserver
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      expect(oldObserver?.disconnect).toHaveBeenCalled()
    })

    it('Should_remove_previous_sentinel', () => {
      service.init()
      const oldSentinel = document.createElement('div')
      oldSentinel.id = 'icon-scroll-sentinel'
      gridContainer.appendChild(oldSentinel)
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      expect(document.getElementById('icon-scroll-sentinel')).not.toBe(oldSentinel)
    })

    it('Should_create_new_sentinel', () => {
      service.init()
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const sentinel = document.getElementById('icon-scroll-sentinel')
      expect(sentinel).not.toBeNull()
      expect(sentinel?.className).toBe('h-1 w-full')
    })

    it('Should_call_loadIconPage_when_intersecting', () => {
      service.init()
      const loadSpy = vi.spyOn(service as any, 'loadIconPage')
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const observerCallback = (global.IntersectionObserver as any).mock.calls[0][0]
      observerCallback([{ isIntersecting: true, target: {} }])

      expect(loadSpy).toHaveBeenCalled()
    })

    it('Should_create_IntersectionObserver_with_correct_options', () => {
      service.init()
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const observerConstructor = (global.IntersectionObserver as any).mock.calls[0]
      const options = observerConstructor[1]
      expect(options.root).toBe(gridContainer)
      expect(options.threshold).toBe(0.1)
    })

    it('Should_not_call_loadIconPage_when_not_intersecting', () => {
      service.init()
      const loadSpy = vi.spyOn(service as any, 'loadIconPage')
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const observerCallback = (global.IntersectionObserver as any).mock.calls[0][0]
      observerCallback([{ isIntersecting: false, target: {} }])

      expect(loadSpy).not.toHaveBeenCalled()
    })
  })

  describe('queryElements', () => {
    it('Should_find_all_elements', () => {
      service.init()

      expect((service as any).searchInput).toBe(searchInput)
      expect((service as any).gridContainer).toBe(gridContainer)
      expect((service as any).grid).toBe(grid)
      expect((service as any).selectedDisplay).toBe(selectedDisplay)
      expect((service as any).selectedImg).toBe(selectedImg)
      expect((service as any).selectedName).toBe(selectedName)
      expect((service as any).formIcon).toBe(formIcon)
    })

    it('Should_set_null_when_element_missing', () => {
      document.body.innerHTML = ''
      ; (service as any).queryElements()

      expect((service as any).searchInput).toBeNull()
      expect((service as any).gridContainer).toBeNull()
      expect((service as any).grid).toBeNull()
    })
  })

  describe('resetEventController', () => {
    it('Should_abort_old_controller', () => {
      service.init()
      const oldController = (service as any).eventController
      const abortSpy = vi.spyOn(oldController, 'abort')
      ; (service as any).resetEventController()

      expect(abortSpy).toHaveBeenCalled()
    })

    it('Should_create_new_controller', () => {
      service.init()
      const oldController = (service as any).eventController
      ; (service as any).resetEventController()

      expect((service as any).eventController).toBeInstanceOf(AbortController)
      expect((service as any).eventController).not.toBe(oldController)
    })
  })

  describe('complete_integration', () => {
    it('Should_work_complete_selection_flow', async () => {
      service.init()
      await (service as any).loadInitialIcons()

      service.selectIcon('home')
      expect(formIcon.value).toBe('home')
      expect(searchInput.classList.contains('hidden')).toBe(true)
      expect(selectedDisplay.classList.contains('hidden')).toBe(false)

      service.clearSelection()
      expect(formIcon.value).toBe('')
      expect(searchInput.classList.contains('hidden')).toBe(false)
      expect(selectedDisplay.classList.contains('hidden')).toBe(true)
    })

    it.skip('Should_work_search_and_pagination_flow', async () => {
      vi.useFakeTimers()
      service.init()

      let fetchPromise: Promise<{ icons: string[]; total: number }>
      mockApiClient.fetchIcons = vi.fn().mockImplementation(() => {
        fetchPromise = Promise.resolve({ icons: ['home', 'settings'], total: 2 })
        return fetchPromise
      })

      searchInput.value = 'home'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await fetchPromise!
      await Promise.resolve()

      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('home', 0, 10, expect.any(AbortSignal))
      expect(grid.children.length).toBeGreaterThan(0)

      vi.useRealTimers()
    })
  })

  describe('init - edge cases for missing elements', () => {
    it('Should_return_early_if_searchInput_missing', () => {
      searchInput.remove()
      expect(() => service.init()).not.toThrow()
    })

    it('Should_return_early_if_gridContainer_missing', () => {
      gridContainer.remove()
      expect(() => service.init()).not.toThrow()
    })

    it('Should_not_add_listeners_if_elements_missing', () => {
      searchInput.remove()
      gridContainer.remove()
      const addSpy = vi.spyOn(document, 'addEventListener')
      service.init()
      expect(addSpy).not.toHaveBeenCalled()
    })

    it('Should_set_iconsLoaded_false_even_without_elements', () => {
      document.body.innerHTML = ''
      service.init()
      expect((service as any).iconsLoaded).toBe(false)
    })
  })

  describe('loadInitialIcons - edge cases', () => {
    it('Should_show_loading_before_loading', async () => {
      service.init()
      const loadPromise = (service as any).loadInitialIcons()
      expect(grid.innerHTML).toContain('Loading')
      await loadPromise
    })

    it('Should_show_error_when_fetch_fails', async () => {
      mockApiClient.fetchIcons = vi.fn().mockRejectedValue(new Error('Network error'))
      service.init()
      await (service as any).loadInitialIcons()
      expect(grid.innerHTML).toContain('Failed to load icons')
    })

    it('Should_do_nothing_if_grid_missing', async () => {
      grid.remove()
      await expect((service as any).loadInitialIcons()).resolves.not.toThrow()
    })

    it('Should_do_nothing_if_gridContainer_missing', async () => {
      gridContainer.remove()
      await expect((service as any).loadInitialIcons()).resolves.not.toThrow()
    })

    it('Should_call_setupScrollObserver_after_loading', async () => {
      service.init()
      const spy = vi.spyOn(service as any, 'setupScrollObserver')
      await (service as any).loadInitialIcons()
      expect(spy).toHaveBeenCalled()
    })

    it('Should_create_buttons_with_correct_classes', async () => {
      service.init()
      await (service as any).loadInitialIcons()

      const btn = grid.querySelector('button.icon-item') as HTMLElement
      expect(btn).not.toBeNull()
      expect(btn.className).toContain('icon-item')
      expect(btn.className).toContain('aspect-square')
      expect(btn.className).toContain('rounded-xl')
      expect(btn.className).toContain('bg-surface-container-highest')
      expect(btn.dataset.icon).toBe('home')
    })

    it('Should_create_image_with_correct_src_and_alt', async () => {
      service.init()
      await (service as any).loadInitialIcons()

      const img = grid.querySelector('img') as HTMLImageElement
      expect(img.src).toContain('/static/icons/home.svg')
      expect(img.alt).toBe('home')
    })

    it('Should_add_mousedown_event_listener_to_button', async () => {
      const selectIconSpy = vi.spyOn(service, 'selectIcon')
      service.init()
      await (service as any).loadInitialIcons()

      const btn = grid.querySelector('button.icon-item') as HTMLElement
      btn.dispatchEvent(new Event('mousedown'))
      expect(selectIconSpy).toHaveBeenCalledWith('home')
    })

    it('Should_reset_state_before_loading', async () => {
      ; (service as any).displayedCount = 10
      ; (service as any).totalIcons = 20
      ; (service as any).currentQuery = 'old'
      ; (service as any).isLoading = true

      service.init()
      await (service as any).loadInitialIcons()

      expect((service as any).displayedCount).toBe(4)
      expect((service as any).totalIcons).toBe(4)
      expect((service as any).currentQuery).toBe('')
      expect((service as any).isLoading).toBe(false)
    })
  })

  describe('handleSearchInput - edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      service.init()
    })

    it('Should_debounce_api_call', async () => {
      searchInput.value = 'set'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(100)
      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()

      vi.advanceTimersByTime(200)
      await Promise.resolve()
      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('set', 0, 10, expect.any(AbortSignal))
    })

    it('Should_cancel_previous_timer_on_new_input', async () => {
      searchInput.value = 'a'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(100)

      searchInput.value = 'ab'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(100)

      searchInput.value = 'abc'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)

      await Promise.resolve()
      expect(mockApiClient.fetchIcons).toHaveBeenCalledTimes(1)
      expect(mockApiClient.fetchIcons).toHaveBeenLastCalledWith('abc', 0, 10, expect.any(AbortSignal))
    })

    it('Should_abort_previous_fetch', async () => {
      searchInput.value = 'first'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()

      const oldController = (service as any).fetchAbortController
      const abortSpy = vi.spyOn(oldController!, 'abort')

      searchInput.value = 'second'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)

      await Promise.resolve()
      expect(abortSpy).toHaveBeenCalled()
    })

    it('Should_reset_state_before_searching', async () => {
      ; (service as any).displayedCount = 10
      ; (service as any).totalIcons = 20
      ; (service as any).currentQuery = 'old'

      searchInput.value = 'new'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()

      expect((service as any).displayedCount).toBe(0)
      expect((service as any).totalIcons).toBe(0)
      expect((service as any).currentQuery).toBe('new')
    })

    it('Should_clear_grid_before_searching', async () => {
      grid.innerHTML = '<button>old</button>'
      searchInput.value = 'test'
      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()
      expect(grid.innerHTML).not.toContain('old')
    })

    it.skip('Should_update_current_icon_highlight_after_search', async () => {
      formIcon.value = 'settings'
      searchInput.value = 'set'

      mockApiClient.fetchIcons = vi.fn().mockResolvedValue({ icons: ['home', 'settings', 'person', 'menu'], total: 4 })

      ; (service as any).handleSearchInput(new AbortController().signal)
      vi.advanceTimersByTime(300)
      await Promise.resolve()

      const btn = grid.querySelector('[data-icon="settings"]') as HTMLElement
      expect(btn).not.toBeNull()
      expect(btn!.classList.contains('ring-2')).toBe(true)
    })

    it('Should_do_nothing_if_grid_or_searchInput_missing', async () => {
      grid.remove()
      searchInput.value = 'test'
      const result = (service as any).handleSearchInput(new AbortController().signal)
      if (result instanceof Promise) {
        await expect(result).resolves.not.toThrow()
      } else {
        expect(result).toBeUndefined()
      }
    })

    it.skip('Should_handle_abort_signal_correctly', async () => {
      const controller = new AbortController()
      searchInput.value = 'test'
      ; (service as any).handleSearchInput(controller.signal)
      
      controller.abort()
      vi.advanceTimersByTime(300)
      
      await Promise.resolve()
      // fetchIcons should not be called because the signal was aborted before the debounce
      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()
    })
  })

  describe('loadIconPage - edge cases', () => {
    it('Should_load_more_icons_when_called', async () => {
      service.init()
      await (service as any).loadInitialIcons()
      ; (service as any).currentQuery = 'test'
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      mockApiClient.fetchIcons = vi.fn().mockResolvedValue({ icons: ['more1', 'more2'], total: 10 })

      await (service as any).loadIconPage()

      expect(mockApiClient.fetchIcons).toHaveBeenCalledWith('test', 4, 10)
      expect(grid.children.length).toBe(6)
      expect((service as any).displayedCount).toBe(6)
    })

    it('Should_not_load_when_isLoading_true', async () => {
      service.init()
      ; (service as any).isLoading = true
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      await (service as any).loadIconPage()

      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()
    })

    it('Should_not_load_when_all_already_loaded', async () => {
      service.init()
      ; (service as any).displayedCount = 20
      ; (service as any).totalIcons = 20
      ; (service as any).isLoading = false

      await (service as any).loadIconPage()

      expect(mockApiClient.fetchIcons).not.toHaveBeenCalled()
    })

    it('Should_not_load_when_gridContainer_missing', async () => {
      gridContainer.remove()
      ; (service as any).displayedCount = 0
      ; (service as any).totalIcons = 10
      ; (service as any).isLoading = false

      const result = (service as any).loadIconPage()
      if (result instanceof Promise) {
        await expect(result).resolves.not.toThrow()
      } else {
        expect(result).toBeUndefined()
      }
    })

    it('Should_handle_error_and_not_break', async () => {
      service.init()
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      mockApiClient.fetchIcons = vi.fn().mockRejectedValue(new Error('Error'))
      await (service as any).loadIconPage()

      expect((service as any).isLoading).toBe(false)
    })

    it('Should_log_error_to_console_when_fetch_fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      service.init()
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      mockApiClient.fetchIcons = vi.fn().mockRejectedValue(new Error('Network error'))
      await (service as any).loadIconPage()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load icons:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })

    it('Should_set_isLoading_true_then_false', async () => {
      service.init()
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 0
      ; (service as any).totalIcons = 10

      const promise = (service as any).loadIconPage()
      expect((service as any).isLoading).toBe(true)
      await promise
      expect((service as any).isLoading).toBe(false)
    })

    it('Should_update_displayedCount_and_totalIcons', async () => {
      service.init()
      ; (service as any).currentQuery = 'test'
      ; (service as any).isLoading = false
      ; (service as any).displayedCount = 4
      ; (service as any).totalIcons = 10

      mockApiClient.fetchIcons = vi.fn().mockResolvedValue({ icons: ['a', 'b', 'c'], total: 15 })
      await (service as any).loadIconPage()

      expect((service as any).displayedCount).toBe(7)
      expect((service as any).totalIcons).toBe(15)
    })
  })

  describe('selectIcon - edge cases', () => {
    beforeEach(() => {
      service.init()
    })

    it('Should_work_without_formIcon', () => {
      document.getElementById('form-icon')?.remove()
      expect(() => service.selectIcon('home')).not.toThrow()
    })

    it('Should_work_without_selectedDisplay', () => {
      selectedDisplay.remove()
      expect(() => service.selectIcon('home')).not.toThrow()
    })

    it('Should_work_without_selectedImg', () => {
      selectedImg.remove()
      expect(() => service.selectIcon('home')).not.toThrow()
    })

    it('Should_work_without_selectedName', () => {
      selectedName.remove()
      expect(() => service.selectIcon('home')).not.toThrow()
    })

    it('Should_update_formIcon_value', () => {
      service.selectIcon('home')
      expect(formIcon.value).toBe('home')
    })

    it('Should_update_selectedImg_src_and_alt', () => {
      service.selectIcon('home')
      expect(selectedImg.src).toContain('/static/icons/home.svg')
      expect(selectedImg.alt).toBe('home')
    })

    it('Should_update_selectedName_textContent', () => {
      service.selectIcon('home')
      expect(selectedName.textContent).toBe('home')
    })

    it('Should_hide_gridContainer', () => {
      service.selectIcon('home')
      expect(gridContainer.style.display).toBe('none')
    })

    it('Should_hide_searchInput_and_show_selectedDisplay', () => {
      service.selectIcon('home')
      expect(searchInput.classList.contains('hidden')).toBe(true)
      expect(selectedDisplay.classList.contains('hidden')).toBe(false)
    })

    it('Should_call_updateSelectedIconHighlight', () => {
      const highlightSpy = vi.spyOn(service as any, 'updateSelectedIconHighlight')
      service.selectIcon('home')
      expect(highlightSpy).toHaveBeenCalledWith('home')
    })
  })

  describe('clearSelection - edge cases', () => {
    beforeEach(() => {
      service.init()
      grid.innerHTML = `<button class="icon-item" data-icon="home"></button>`
      service.selectIcon('home')
    })

    it('Should_work_without_formIcon', () => {
      formIcon.remove()
      expect(() => service.clearSelection()).not.toThrow()
    })

    it('Should_work_without_selectedDisplay', () => {
      selectedDisplay.remove()
      expect(() => service.clearSelection()).not.toThrow()
    })

    it('Should_clear_formIcon_value', () => {
      service.clearSelection()
      expect(formIcon.value).toBe('')
    })

    it('Should_call_clearIconHighlights', () => {
      const clearSpy = vi.spyOn(service as any, 'clearIconHighlights')
      service.clearSelection()
      expect(clearSpy).toHaveBeenCalled()
    })

    it('Should_show_searchInput_and_hide_selectedDisplay', () => {
      service.clearSelection()
      expect(searchInput.classList.contains('hidden')).toBe(false)
      expect(selectedDisplay.classList.contains('hidden')).toBe(true)
    })

    it('Should_clear_searchInput_value', () => {
      searchInput.value = 'test'
      service.clearSelection()
      expect(searchInput.value).toBe('')
    })

    it('Should_focus_searchInput', () => {
      const focusSpy = vi.spyOn(searchInput, 'focus')
      service.clearSelection()
      expect(focusSpy).toHaveBeenCalled()
    })
  })

  describe('handleOutsideClick - edge cases', () => {
    beforeEach(() => {
      service.init()
      gridContainer.style.display = 'block'
    })

    const createEvent = (target: Node) => {
      const event = new MouseEvent('mousedown')
      Object.defineProperty(event, 'target', { value: target })
      return event
    }

    it('Should_hide_gridContainer_when_click_outside_everything', () => {
      const event = createEvent(document.body)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).toBe('none')
    })

    it('Should_not_hide_when_click_inside_searchInput', () => {
const event = createEvent(searchInput)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).not.toBe('none')
    })

    it('Should_not_hide_when_click_inside_gridContainer', () => {
      const event = createEvent(gridContainer)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).not.toBe('none')
    })

    it('Should_not_hide_when_click_inside_selectedDisplay', () => {
      const event = createEvent(selectedDisplay)
      ; (service as any).handleOutsideClick(event)
      expect(gridContainer.style.display).not.toBe('none')
    })

    it('Should_do_nothing_if_gridContainer_missing', () => {
      gridContainer.remove()
      const event = new MouseEvent('mousedown', { target: document.body })
      expect(() => (service as any).handleOutsideClick(event)).not.toThrow()
    })

    it('Should_use_optional_chaining_for_contains', () => {
      ; (service as any).searchInput = null
      const event = createEvent(document.body)
      expect(() => (service as any).handleOutsideClick(event)).not.toThrow()
      
      ; (service as any).gridContainer = null
      expect(() => (service as any).handleOutsideClick(event)).not.toThrow()
      
      ; (service as any).selectedDisplay = null
      expect(() => (service as any).handleOutsideClick(event)).not.toThrow()
    })
  })

  describe('updateNoResults - edge cases', () => {
    it('Should_show_message_when_displayedCount_zero', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = grid

      ; (service as any).updateNoResults()

      const msg = document.getElementById('no-results-msg')
      expect(msg).not.toBeNull()
      expect(msg?.style.display).toBe('block')
    })

    it('Should_hide_message_when_has_results', () => {
      ; (service as any).displayedCount = 5
      ; (service as any).grid = grid

      const msg = document.createElement('div')
      msg.id = 'no-results-msg'
      msg.style.display = 'block'
      grid.appendChild(msg)

      ; (service as any).updateNoResults()

      expect(msg.style.display).toBe('none')
    })

    it('Should_create_element_if_not_exists', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = grid

      ; (service as any).updateNoResults()

      const msg = document.getElementById('no-results-msg')
      expect(msg).not.toBeNull()
      expect(msg?.className).toContain('col-span-5')
      expect(msg?.className).toContain('text-center')
      expect(msg?.textContent).toBeDefined()
    })

    it('Should_do_nothing_if_grid_missing', () => {
      ; (service as any).displayedCount = 0
      ; (service as any).grid = null
      expect(() => (service as any).updateNoResults()).not.toThrow()
    })
  })

  describe('setupScrollObserver - edge cases', () => {
    it('Should_create_new_IntersectionObserver', () => {
      service.init()
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      expect((service as any).scrollObserver).not.toBeNull()
    })

    it('Should_disconnect_previous_observer', async () => {
      service.init()
      await (service as any).loadInitialIcons()
      const oldObserver = (service as any).scrollObserver
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      expect(oldObserver?.disconnect).toHaveBeenCalled()
    })

    it('Should_remove_previous_sentinel', () => {
      service.init()
      const oldSentinel = document.createElement('div')
      oldSentinel.id = 'icon-scroll-sentinel'
      gridContainer.appendChild(oldSentinel)
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      expect(document.getElementById('icon-scroll-sentinel')).not.toBe(oldSentinel)
    })

    it('Should_create_new_sentinel_with_correct_classes', () => {
      service.init()
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const sentinel = document.getElementById('icon-scroll-sentinel')
      expect(sentinel).not.toBeNull()
      expect(sentinel?.className).toBe('h-1 w-full')
    })

    it('Should_call_loadIconPage_when_intersecting', () => {
      service.init()
      const loadSpy = vi.spyOn(service as any, 'loadIconPage')
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const observerCallback = (global.IntersectionObserver as any).mock.calls[0][0]
      observerCallback([{ isIntersecting: true, target: {} }])

      expect(loadSpy).toHaveBeenCalled()
    })

    it('Should_not_call_loadIconPage_when_not_intersecting', () => {
      service.init()
      const loadSpy = vi.spyOn(service as any, 'loadIconPage')
      ; (service as any).gridContainer = gridContainer

      ; (service as any).setupScrollObserver()

      const observerCallback = (global.IntersectionObserver as any).mock.calls[0][0]
      observerCallback([{ isIntersecting: false, target: {} }])

      expect(loadSpy).not.toHaveBeenCalled()
    })

    it('Should_do_nothing_if_gridContainer_missing', () => {
      ; (service as any).gridContainer = null
      expect(() => (service as any).setupScrollObserver()).not.toThrow()
    })
  })

  describe('appendIconBatch - edge cases', () => {
    it('Should_add_buttons_for_each_icon', () => {
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['icon1', 'icon2', 'icon3'])

      expect(grid.children.length).toBe(3)
    })

    it('Should_create_button_with_correct_attributes', () => {
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['test-icon'])

      const btn = grid.querySelector('button') as HTMLElement
      expect(btn.type).toBe('button')
      expect(btn.className).toContain('icon-item')
      expect(btn.dataset.icon).toBe('test-icon')
      expect(btn.title).toBe('test-icon')
    })

    it('Should_create_img_with_correct_src_and_alt', () => {
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['my-icon'])

      const img = grid.querySelector('img') as HTMLImageElement
      expect(img.src).toContain('/static/icons/my-icon.svg')
      expect(img.alt).toBe('my-icon')
      expect(img.className).toContain('w-full')
      expect(img.className).toContain('h-full')
      expect(img.className).toContain('object-contain')
    })

    it('Should_add_mousedown_event_listener', () => {
      const selectIconSpy = vi.spyOn(service, 'selectIcon')
      ; (service as any).grid = grid
      ; (service as any).appendIconBatch(['icon1'])

      const btn = grid.querySelector('button') as HTMLElement
      btn.dispatchEvent(new Event('mousedown'))
      expect(selectIconSpy).toHaveBeenCalledWith('icon1')
    })

    it('Should_do_nothing_if_grid_missing', () => {
      ; (service as any).grid = null
      expect(() => (service as any).appendIconBatch(['icon1'])).not.toThrow()
    })
  })

  describe('updateSelectedIconHighlight - edge cases', () => {
    it('Should_add_ring_classes_to_selected_icon', () => {
      grid.innerHTML = `
        <button class="icon-item" data-icon="a"></button>
        <button class="icon-item" data-icon="b"></button>
      `
      ; (service as any).grid = grid
      ; (service as any).updateSelectedIconHighlight('b')

      const btnA = grid.querySelector('[data-icon="a"]') as HTMLElement
      const btnB = grid.querySelector('[data-icon="b"]') as HTMLElement

      expect(btnA.classList.contains('ring-2')).toBe(false)
      expect(btnB.classList.contains('ring-2')).toBe(true)
      expect(btnB.classList.contains('ring-primary')).toBe(true)
      expect(btnB.classList.contains('ring-offset-2')).toBe(true)
    })

    it('Should_remove_classes_from_others', () => {
      grid.innerHTML = `
        <button class="icon-item ring-2 ring-primary" data-icon="a"></button>
        <button class="icon-item" data-icon="b"></button>
      `
      ; (service as any).grid = grid
      ; (service as any).updateSelectedIconHighlight('b')

      const btnA = grid.querySelector('[data-icon="a"]') as HTMLElement
      expect(btnA.classList.contains('ring-2')).toBe(false)
    })

    it('Should_not_break_if_grid_missing', () => {
      ; (service as any).grid = null
      expect(() => (service as any).updateSelectedIconHighlight('a')).not.toThrow()
    })
  })

  describe('clearIconHighlights - edge cases', () => {
    it('Should_remove_all_ring_classes', () => {
      grid.innerHTML = `
        <button class="icon-item ring-2 ring-primary ring-offset-2" data-icon="a"></button>
        <button class="icon-item ring-2 ring-primary" data-icon="b"></button>
      `
      ; (service as any).grid = grid
      ; (service as any).clearIconHighlights()

      const btns = grid.querySelectorAll('.icon-item')
      btns.forEach(btn => {
        expect(btn.classList.contains('ring-2')).toBe(false)
        expect(btn.classList.contains('ring-primary')).toBe(false)
        expect(btn.classList.contains('ring-offset-2')).toBe(false)
      })
    })

    it('Should_not_break_without_elements', () => {
      grid.innerHTML = ''
      ; (service as any).grid = grid
      expect(() => (service as any).clearIconHighlights()).not.toThrow()
    })

    it('Should_not_break_if_grid_missing', () => {
      ; (service as any).grid = null
      expect(() => (service as any).clearIconHighlights()).not.toThrow()
    })
  })

  describe('queryElements - edge cases', () => {
    it('Should_find_all_elements', () => {
      service.init()

      expect((service as any).searchInput).toBe(searchInput)
      expect((service as any).gridContainer).toBe(gridContainer)
      expect((service as any).grid).toBe(grid)
      expect((service as any).selectedDisplay).toBe(selectedDisplay)
      expect((service as any).selectedImg).toBe(selectedImg)
      expect((service as any).selectedName).toBe(selectedName)
      expect((service as any).formIcon).toBe(formIcon)
    })

    it('Should_set_null_when_element_missing', () => {
      document.body.innerHTML = ''
      ; (service as any).queryElements()

      expect((service as any).searchInput).toBeNull()
      expect((service as any).gridContainer).toBeNull()
      expect((service as any).grid).toBeNull()
    })
  })

  describe('destroy - edge cases', () => {
    it('Should_abort_eventController', () => {
      service.init()
      const controller = (service as any).eventController
      const abortSpy = vi.spyOn(controller, 'abort')
      service.destroy()
      expect(abortSpy).toHaveBeenCalled()
      expect((service as any).eventController).toBeNull()
    })

    it('Should_disconnect_scrollObserver', async () => {
      service.init()
      await (service as any).loadInitialIcons()
      const mockObserver = (service as any).scrollObserver
      service.destroy()
      expect(mockObserver?.disconnect).toHaveBeenCalled()
      expect((service as any).scrollObserver).toBeNull()
    })

    it('Should_abort_fetchAbortController', () => {
      service.init()
      service.destroy()
      expect((service as any).fetchAbortController).toBeNull()
    })

    it('Should_clear_debounceTimer', () => {
      service.init()
      vi.useFakeTimers()
      searchInput.value = 'test'
      searchInput.dispatchEvent(new Event('input'))
      vi.advanceTimersByTime(100)
      service.destroy()
      expect((service as any).debounceTimer).toBeNull()
    })

    it('Should_clear_boundMousedown', () => {
      service.init()
      service.destroy()
      expect((service as any).boundMousedown).toBeNull()
    })
  })

  describe('resetEventController - edge cases', () => {
    it('Should_abort_old_controller', () => {
      service.init()
      const oldController = (service as any).eventController
      const abortSpy = vi.spyOn(oldController, 'abort')
      ; (service as any).resetEventController()

      expect(abortSpy).toHaveBeenCalled()
    })

    it('Should_create_new_controller', () => {
      service.init()
      const oldController = (service as any).eventController
      ; (service as any).resetEventController()

      expect((service as any).eventController).toBeInstanceOf(AbortController)
      expect((service as any).eventController).not.toBe(oldController)
    })
  })
})