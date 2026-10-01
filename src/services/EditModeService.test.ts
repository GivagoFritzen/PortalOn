import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EditModeService } from './EditModeService'
import { ApiClient } from '../api/ApiClient'
import { translate } from '../locale'

describe('EditModeService', () => {
  let service: EditModeService
  let mockApiClient: ApiClient

  beforeEach(() => {
    mockApiClient = {
      reorderApps: vi.fn().mockResolvedValue({} as any),
      fetchApp: vi.fn(),
      createApp: vi.fn(),
      updateApp: vi.fn(),
      deleteApp: vi.fn(),
      fetchIcons: vi.fn(),
    } as unknown as ApiClient

    document.body.innerHTML = `
      <div id="app-grid"></div>
      <button id="edit-btn"></button>
    `
    service = new EditModeService(mockApiClient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  describe('toggle', () => {
    it('Should_activate_edit_mode', () => {
      const grid = document.getElementById('app-grid')!
      const btn = document.getElementById('edit-btn')!

      service.toggle()
      expect(service.isActive()).toBe(true)
      expect(grid.classList.contains('edit-mode')).toBe(true)
      expect(btn.classList.contains('bg-primary')).toBe(true)
    })

    it('Should_deactivate_edit_mode', () => {
      const grid = document.getElementById('app-grid')!
      const btn = document.getElementById('edit-btn')!

      service.toggle() // activate
      service.toggle() // deactivate

      expect(service.isActive()).toBe(false)
      expect(grid.classList.contains('edit-mode')).toBe(false)
      expect(btn.classList.contains('bg-primary')).toBe(false)
    })

    it('Should_do_nothing_when_elements_do_not_exist', () => {
      document.body.innerHTML = ''
      service.toggle()
      expect(service.isActive()).toBe(true)
    })
  })

  describe('isActive', () => {
    it('Should_return_false_initially', () => {
      expect(service.isActive()).toBe(false)
    })

    it('Should_return_true_when_active', () => {
      service.toggle()
      expect(service.isActive()).toBe(true)
    })
  })

  describe('initSortable', () => {
    it('Should_initialize_sortable_when_sortable_available', () => {
      ;(window as any).Sortable = class {
        element: HTMLElement
        options?: Record<string, unknown>
        constructor(element: HTMLElement, options?: Record<string, unknown>) {
          this.element = element
          this.options = options
        }
        destroy(): void {}
      }

      ;(service as any).initSortable()
      expect((service as any).sortableInstance).toBeDefined()
    })

    it('Should_show_warning_when_sortable_not_available', () => {
      ;(window as any).Sortable = undefined
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      ;(service as any).initSortable()
      expect(warnSpy).toHaveBeenCalledWith('SortableJS library is not available.')
    })

    it('Should_clear_previous_instance_before_initializing', () => {
      const destroyMock = vi.fn()
      ;(service as any).sortableInstance = { destroy: destroyMock }

      ;(window as any).Sortable = class {
        element: HTMLElement
        constructor(element: HTMLElement) {
          this.element = element
        }
        destroy(): void {}
      }

      ;(service as any).initSortable()
      expect(destroyMock).toHaveBeenCalled()
      expect((service as any).sortableInstance).toBeDefined()
    })
  })

  describe('onEnd callback', () => {
    it('Should_call_reorder_api_when_drag_ends_with_cards', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      const grid = document.getElementById('app-grid')!
      const card1 = document.createElement('div')
      card1.className = 'app-card'
      card1.dataset.id = '1'
      grid.appendChild(card1)

      const card2 = document.createElement('div')
      card2.className = 'app-card'
      card2.dataset.id = '2'
      grid.appendChild(card2)

      ;(service as any).initSortable()

      expect(capturedOptions).not.toBeNull()
      await capturedOptions.onEnd({
        target: card1,
        item: card1,
        originalEvent: new MouseEvent('mouseup'),
      })

      expect(mockApiClient.reorderApps).toHaveBeenCalledWith([1, 2])
    })

    it('Should_not_call_api_when_no_cards', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      ;(service as any).initSortable()

      expect(capturedOptions).not.toBeNull()
      await capturedOptions.onEnd({
        target: document.createElement('div'),
        item: document.createElement('div'),
        originalEvent: new MouseEvent('mouseup'),
      })

      expect(mockApiClient.reorderApps).not.toHaveBeenCalled()
    })
  })

  describe('toggle - edge cases', () => {
    it('Should_return_early_if_grid_missing', () => {
      document.getElementById('app-grid')?.remove()
      service.toggle()
      expect(service.isActive()).toBe(true)
    })

    it('Should_return_early_if_btn_missing', () => {
      document.getElementById('edit-btn')?.remove()
      service.toggle()
      expect(service.isActive()).toBe(true)
    })

    it('Should_return_early_if_both_missing', () => {
      document.body.innerHTML = ''
      service.toggle()
      expect(service.isActive()).toBe(true)
    })

    it('Should_set_button_title_when_activating', () => {
      const btn = document.getElementById('edit-btn')!
      const titleKey = 'topAppBar.toggleEditMode'
      
      service.toggle()
      expect(btn.title).toBe(translate(titleKey))
    })

    it('Should_set_button_title_when_deactivating', () => {
      const btn = document.getElementById('edit-btn')!
      const titleKey = 'topAppBar.toggleEditMode'
      
      service.toggle()
      service.toggle()
      expect(btn.title).toBe(translate(titleKey))
    })
  })

  describe('initSortable - edge cases', () => {
    it.skip('Should_use_Sortable_from_window_if_available', () => {
      const CustomSortable = class {
        element: HTMLElement
        options?: Record<string, unknown>
        constructor(element: HTMLElement, options?: Record<string, unknown>) {
          this.element = element
          this.options = options
        }
        destroy(): void {}
      }
      ;(window as any).Sortable = CustomSortable
      ;(global as any).Sortable = undefined

      ;(service as any).initSortable()
      expect((service as any).sortableInstance).toBeInstanceOf(CustomSortable)
    })

    it.skip('Should_use_global_Sortable_if_window_does_not_have', () => {
      const GlobalSortable = class {
        element: HTMLElement
        options?: Record<string, unknown>
        constructor(element: HTMLElement, options?: Record<string, unknown>) {
          this.element = element
          this.options = options
        }
        destroy(): void {}
      }
      ;(global as any).Sortable = GlobalSortable
      ;(window as any).Sortable = undefined

      ;(service as any).initSortable()
      expect((service as any).sortableInstance).toBeInstanceOf(GlobalSortable)
    })

    it('Should_configure_sortable_options_correctly', () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      ;(service as any).initSortable()

      expect(capturedOptions).not.toBeNull()
      expect(capturedOptions.animation).toBe(150)
      expect(capturedOptions.ghostClass).toBe('sortable-ghost')
      expect(capturedOptions.chosenClass).toBe('sortable-chosen')
      expect(typeof capturedOptions.onEnd).toBe('function')
    })

    it('Should_destroy_previous_instance', () => {
      const destroyMock = vi.fn()
      ;(service as any).sortableInstance = { destroy: destroyMock }

      ;(window as any).Sortable = class {
        element: HTMLElement
        constructor(element: HTMLElement) {
          this.element = element
        }
        destroy(): void {}
      }

      ;(service as any).initSortable()
      expect(destroyMock).toHaveBeenCalled()
    })
  })

  describe('onEnd callback - edge cases', () => {
    it('Should_filter_valid_ids_only', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      const grid = document.getElementById('app-grid')!
      
      // Card with valid id
      const card1 = document.createElement('div')
      card1.className = 'app-card'
      card1.dataset.id = '1'
      grid.appendChild(card1)

      // Card without data-id
      const card2 = document.createElement('div')
      card2.className = 'app-card'
      grid.appendChild(card2)

      // Card with invalid data-id
      const card3 = document.createElement('div')
      card3.className = 'app-card'
      card3.dataset.id = 'abc'
      grid.appendChild(card3)

      // Card with empty data-id
      const card4 = document.createElement('div')
      card4.className = 'app-card'
      card4.dataset.id = ''
      grid.appendChild(card4)

      // Card with id 0
      const card5 = document.createElement('div')
      card5.className = 'app-card'
      card5.dataset.id = '0'
      grid.appendChild(card5)

      // Card with negative id
      const card6 = document.createElement('div')
      card6.className = 'app-card'
      card6.dataset.id = '-1'
      grid.appendChild(card6)

      ;(service as any).initSortable()

      expect(capturedOptions).not.toBeNull()
      await capturedOptions.onEnd({
        target: card1,
        item: card1,
        originalEvent: new MouseEvent('mouseup'),
      })

      // Only id 1 should be valid (parseInt > 0 and !isNaN)
      expect(mockApiClient.reorderApps).toHaveBeenCalledWith([1])
    })

    it('Should_not_call_api_when_no_valid_id', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      const grid = document.getElementById('app-grid')!
      
      const card1 = document.createElement('div')
      card1.className = 'app-card'
      card1.dataset.id = 'invalid'
      grid.appendChild(card1)

      ;(service as any).initSortable()

      await capturedOptions.onEnd({
        target: card1,
        item: card1,
        originalEvent: new MouseEvent('mouseup'),
      })

      expect(mockApiClient.reorderApps).not.toHaveBeenCalled()
    })

    it('Should_not_call_api_if_grid_missing_in_onEnd', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      const grid = document.getElementById('app-grid')!
      const card1 = document.createElement('div')
      card1.className = 'app-card'
      card1.dataset.id = '1'
      grid.appendChild(card1)

      ;(service as any).initSortable()

      // Remove grid before onEnd
      grid.remove()

      await capturedOptions.onEnd({
        target: card1,
        item: card1,
        originalEvent: new MouseEvent('mouseup'),
      })

      expect(mockApiClient.reorderApps).not.toHaveBeenCalled()
    })

    it('Should_handle_api_error_gracefully', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      const grid = document.getElementById('app-grid')!
      const card1 = document.createElement('div')
      card1.className = 'app-card'
      card1.dataset.id = '1'
      grid.appendChild(card1)

      mockApiClient.reorderApps = vi.fn().mockRejectedValue(new Error('API Error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      ;(service as any).initSortable()

      await capturedOptions.onEnd({
        target: card1,
        item: card1,
        originalEvent: new MouseEvent('mouseup'),
      })

      expect(consoleSpy).toHaveBeenCalledWith('Reorder failed:', expect.any(Error))
    })

    it('Should_map_cards_to_ids_using_Array_from_and_map', async () => {
      let capturedOptions: any = null
      ;(window as any).Sortable = class {
        element: HTMLElement
        options: Record<string, unknown>
        constructor(element: HTMLElement, options: Record<string, unknown>) {
          this.element = element
          this.options = options
          capturedOptions = options
        }
        destroy(): void {}
      }

      const grid = document.getElementById('app-grid')!
      const card1 = document.createElement('div')
      card1.className = 'app-card'
      card1.dataset.id = '10'
      grid.appendChild(card1)

      const card2 = document.createElement('div')
      card2.className = 'app-card'
      card2.dataset.id = '20'
      grid.appendChild(card2)

      ;(service as any).initSortable()

      await capturedOptions.onEnd({
        target: card1,
        item: card1,
        originalEvent: new MouseEvent('mouseup'),
      })

      expect(mockApiClient.reorderApps).toHaveBeenCalledWith([10, 20])
    })
  })

  describe('getGridElement and getButtonElement', () => {
    it('Should_return_grid_element', () => {
      const grid = (service as any).getGridElement()
      expect(grid).toBe(document.getElementById('app-grid'))
    })

    it('Should_return_button_element', () => {
      const btn = (service as any).getButtonElement()
      expect(btn).toBe(document.getElementById('edit-btn'))
    })

    it('Should_return_null_if_grid_does_not_exist', () => {
      document.getElementById('app-grid')?.remove()
      const grid = (service as any).getGridElement()
      expect(grid).toBeNull()
    })

    it('Should_return_null_if_button_does_not_exist', () => {
      document.getElementById('edit-btn')?.remove()
      const btn = (service as any).getButtonElement()
      expect(btn).toBeNull()
    })
  })
})