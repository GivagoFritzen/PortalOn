import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PortalOnApp } from './portalonapp'
import { toast } from './services/ToastService'

describe('PortalOnApp', () => {
  let app: PortalOnApp

  const setupDOM = () => {
    document.body.innerHTML = `
      <div id="search-input-container">
        <input id="search-input" />
      </div>
      <div id="app-grid">
        <div class="app-card" data-id="1" data-url="https://google.com">
          <button data-action="edit-app" data-app-id="1">Edit</button>
          <button data-action="delete-app" data-app-id="1">Delete</button>
        </div>
      </div>
      <button data-action="open-modal">Add</button>
      <button data-action="close-modal">Close</button>
      <button data-action="toggle-edit-mode">Edit Mode</button>
      <div id="confirm-overlay" class="hidden"></div>
      <div id="confirm-backdrop"></div>
      <button id="confirm-ok"></button>
      <button id="confirm-cancel"></button>
      <span id="confirm-message"></span>
      <div id="modal-overlay" class="hidden"></div>
      <div id="modal-content"></div>
      <template id="modal-template">
        <h3 id="modal-title">New App</h3>
        <form id="app-form">
          <input id="form-id" />
          <input id="form-name" />
          <input id="form-url" />
          <input id="form-gradient" />
          <input id="form-icon" />
          <button id="save-btn" type="submit"><span id="save-btn-text">Save</span></button>
        </form>
      </template>
    `
  }

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    setupDOM()
    app = new PortalOnApp()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const createMouseEvent = (target: HTMLElement) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: target })
    return event
  }

  const createKeyboardEvent = (key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean } = {}) => {
    return new KeyboardEvent('keydown', { key, ...modifiers, bubbles: true, cancelable: true })
  }

  describe('init', () => {
    it('Should_call_services_init', () => {
      const themeInitSpy = vi.spyOn(app['themeService'], 'init')
      const searchInitSpy = vi.spyOn(app['searchService'], 'init')
      const setupSpy = vi.spyOn(app as any, 'setupEventListeners')

      app.init()

      expect(themeInitSpy).toHaveBeenCalled()
      expect(searchInitSpy).toHaveBeenCalled()
      expect(setupSpy).toHaveBeenCalled()
    })
  })

  describe('setupEventListeners', () => {
    it('Should_add_event_listeners', () => {
      const clickSpy = vi.spyOn(document, 'addEventListener')
      const submitSpy = vi.spyOn(document, 'addEventListener')
      const keydownSpy = vi.spyOn(document, 'addEventListener')

      ;(app as any).setupEventListeners()

      expect(clickSpy).toHaveBeenCalledWith('click', expect.any(Function))
      expect(submitSpy).toHaveBeenCalledWith('submit', expect.any(Function))
      expect(keydownSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })
  })

  describe('isInputElement', () => {
    it('Should_return_false_when_element_is_null', () => {
      expect(app['isInputElement'](null)).toBe(false)
    })

    it('Should_return_true_when_element_is_input', () => {
      const input = document.createElement('input')
      expect(app['isInputElement'](input)).toBe(true)
    })

    it('Should_return_true_when_element_is_textarea', () => {
      const textarea = document.createElement('textarea')
      expect(app['isInputElement'](textarea)).toBe(true)
    })

    it('Should_return_true_when_element_is_select', () => {
      const select = document.createElement('select')
      expect(app['isInputElement'](select)).toBe(true)
    })

    it('Should_return_true_when_element_is_contenteditable', () => {
      const editable = { tagName: 'DIV', isContentEditable: true } as unknown as HTMLElement
      expect(app['isInputElement'](editable)).toBe(true)
    })
  })

  describe('actions and clicks', () => {
    it('Should_open_and_close_modal_via_handleAction', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})

      const btnOpen = document.createElement('button')
      btnOpen.dataset.action = 'open-modal'
      ;(app as any).handleAction('open-modal', btnOpen)
      expect(openSpy).toHaveBeenCalled()

      ;(app as any).handleAction('close-modal', btnOpen)
      expect(closeSpy).toHaveBeenCalled()
    })

    it('Should_toggle_edit_mode', () => {
      const toggleSpy = vi.spyOn(app['editModeService'], 'toggle').mockImplementation(() => {})
      const btn = document.createElement('button')
      ;(app as any).handleAction('toggle-edit-mode', btn)
      expect(toggleSpy).toHaveBeenCalled()
    })

    it('Should_open_edit_when_action_edit_app', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      const btn = document.createElement('button')
      btn.dataset.appId = '5'
      ;(app as any).handleAction('edit-app', btn)
      expect(openSpy).toHaveBeenCalledWith(5)
    })

    it('Should_open_modal_via_action_open_modal', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      const btn = document.createElement('button')
      btn.dataset.action = 'open-modal'
      ;(app as any).handleClick(createMouseEvent(btn))
      expect(openSpy).toHaveBeenCalled()
    })

    it('Should_close_modal_via_action_close_modal', () => {
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      const btn = document.createElement('button')
      btn.dataset.action = 'close-modal'
      ;(app as any).handleClick(createMouseEvent(btn))
      expect(closeSpy).toHaveBeenCalled()
    })

    it('Should_toggle_edit_mode_via_action', () => {
      const toggleSpy = vi.spyOn(app['editModeService'], 'toggle').mockImplementation(() => {})
      const btn = document.createElement('button')
      btn.dataset.action = 'toggle-edit-mode'
      ;(app as any).handleClick(createMouseEvent(btn))
      expect(toggleSpy).toHaveBeenCalled()
    })

    it('Should_open_edit_via_action_edit_app', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      const btn = document.createElement('button')
      btn.dataset.action = 'edit-app'
      btn.dataset.appId = '42'
      ;(app as any).handleClick(createMouseEvent(btn))
      expect(openSpy).toHaveBeenCalledWith(42)
    })

    it('Should_handle_click_on_normal_card', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      vi.spyOn(app['editModeService'], 'isActive').mockReturnValue(false)

      const card = document.querySelector('.app-card') as HTMLElement
      const event = createMouseEvent(card)

      ;(app as any).handleClick(event)
      expect(windowOpenSpy).toHaveBeenCalledWith('https://google.com', '_blank', 'noopener,noreferrer')
    })

    it('Should_prevent_link_opening_in_edit_mode', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      vi.spyOn(app['editModeService'], 'isActive').mockReturnValue(true)

      const card = document.querySelector('.app-card') as HTMLElement
      const event = createMouseEvent(card)

      ;(app as any).handleClick(event)
      expect(windowOpenSpy).not.toHaveBeenCalled()
    })

    it('Should_ignore_click_outside_card', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      const event = createMouseEvent(document.body)

      ;(app as any).handleClick(event)
      expect(windowOpenSpy).not.toHaveBeenCalled()
    })

    it('Should_ignore_click_on_edit_controls', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      vi.spyOn(app['editModeService'], 'isActive').mockReturnValue(false)

      const card = document.querySelector('.app-card') as HTMLElement
      const editBtn = card.querySelector('[data-action="edit-app"]') as HTMLElement
      const event = createMouseEvent(editBtn)

      ;(app as any).handleClick(event)
      expect(windowOpenSpy).not.toHaveBeenCalled()
    })

    it('Should_ignore_invalid_url', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      vi.spyOn(app['editModeService'], 'isActive').mockReturnValue(false)

      const card = document.createElement('div')
      card.className = 'app-card'
      card.dataset.url = 'invalid-url'
      document.body.appendChild(card)

      const event = createMouseEvent(card)
      ;(app as any).handleClick(event)
      expect(windowOpenSpy).not.toHaveBeenCalled()

      card.remove()
    })

    it('Should_ignore_url_without_protocol', () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      vi.spyOn(app['editModeService'], 'isActive').mockReturnValue(false)

      const card = document.createElement('div')
      card.className = 'app-card'
      card.dataset.url = 'example.com'
      document.body.appendChild(card)

      const event = createMouseEvent(card)
      ;(app as any).handleClick(event)
      expect(windowOpenSpy).not.toHaveBeenCalled()

      card.remove()
    })

    it('Should_prevent_default_when_opening_link', () => {
      vi.spyOn(app['editModeService'], 'isActive').mockReturnValue(false)

      const card = document.querySelector('.app-card') as HTMLElement
      const event = createMouseEvent(card)
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      ;(app as any).handleClick(event)
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('handleDeleteApp', () => {
    it('Deve_excluir_app_quando_confirmado', async () => {
      vi.spyOn(app['confirmDialog'], 'show').mockResolvedValue(true)
      const deleteSpy = vi.spyOn(app['apiClient'], 'deleteApp').mockResolvedValue({} as any)

      await (app as any).handleDeleteApp(1)
      expect(deleteSpy).toHaveBeenCalledWith(1)
      expect(document.querySelector('.app-card')).toBeNull()
    })

    it('Deve_cancelar_exclusao_quando_rejeitado', async () => {
      vi.spyOn(app['confirmDialog'], 'show').mockResolvedValue(false)
      const deleteSpy = vi.spyOn(app['apiClient'], 'deleteApp')

      await (app as any).handleDeleteApp(1)
      expect(deleteSpy).not.toHaveBeenCalled()
      expect(document.querySelector('.app-card')).not.toBeNull()
    })

    it('Deve_mostrar_toast_sucesso_apos_excluir', async () => {
      vi.spyOn(app['confirmDialog'], 'show').mockResolvedValue(true)
      vi.spyOn(app['apiClient'], 'deleteApp').mockResolvedValue({} as any)
      const toastSpy = vi.spyOn(toast, 'success')

      await (app as any).handleDeleteApp(1)
      expect(toastSpy).toHaveBeenCalled()
    })

    it('Deve_mostrar_toast_erro_se_delete_falhar', async () => {
      vi.spyOn(app['confirmDialog'], 'show').mockResolvedValue(true)
      vi.spyOn(app['apiClient'], 'deleteApp').mockRejectedValue(new Error('Network error'))
      const toastSpy = vi.spyOn(toast, 'error')

      await (app as any).handleDeleteApp(1)
      expect(toastSpy).toHaveBeenCalled()
    })

    it('Deve_remover_card_correto_pelo_data_id', async () => {
      vi.spyOn(app['confirmDialog'], 'show').mockResolvedValue(true)
      vi.spyOn(app['apiClient'], 'deleteApp').mockResolvedValue({} as any)

      const grid = document.getElementById('app-grid')!
      const card2 = document.createElement('div')
      card2.className = 'app-card'
      card2.dataset.id = '2'
      card2.dataset.url = 'https://example.com'
      grid.appendChild(card2)

      await (app as any).handleDeleteApp(1)

      expect(document.querySelector('[data-id="1"]')).toBeNull()
      expect(document.querySelector('[data-id="2"]')).not.toBeNull()
    })
  })

  describe('handleSubmit', () => {
    it('Deve_criar_novo_app_com_sucesso', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(true)
      vi.spyOn(app['appFormService'], 'getFormData').mockReturnValue({
        id: '',
        data: { name: 'App', url: 'https://app.com', icon: 'home', gradient: '' }
      })
      const createSpy = vi.spyOn(app['apiClient'], 'createApp').mockResolvedValue({} as any)
      vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div id="new-grid"></div>') } as any)

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(createSpy).toHaveBeenCalled()
    })

    it('Deve_atualizar_app_existente_com_sucesso', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(true)
      vi.spyOn(app['appFormService'], 'getFormData').mockReturnValue({
        id: '1',
        data: { name: 'App Updated', url: 'https://app.com', icon: 'home', gradient: '' }
      })
      const updateSpy = vi.spyOn(app['apiClient'], 'updateApp').mockResolvedValue({} as any)
      vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div id="new-grid"></div>') } as any)

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(updateSpy).toHaveBeenCalledWith(1, expect.any(Object))
    })

    it('Deve_exibir_erro_se_formulario_invalido', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(false)
      const createSpy = vi.spyOn(app['apiClient'], 'createApp').mockResolvedValue({} as any)

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('Deve_prevenir_default_no_submit', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(true)
      vi.spyOn(app['appFormService'], 'getFormData').mockReturnValue({
        id: '',
        data: { name: 'App', url: 'https://app.com', icon: 'home', gradient: '' }
      })
      vi.spyOn(app['apiClient'], 'createApp').mockResolvedValue({} as any)
      vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div id="new-grid"></div>') } as any)

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })
      const preventSpy = vi.spyOn(event, 'preventDefault')

      await (app as any).handleSubmit(event)
      expect(preventSpy).toHaveBeenCalled()
    })

    it('Deve_ignorar_submit_de_form_nao_app_form', async () => {
      const createSpy = vi.spyOn(app['apiClient'], 'createApp')

      const form = document.createElement('form')
      form.id = 'other-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('Deve_mostrar_toast_erro_se_create_falhar', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(true)
      vi.spyOn(app['appFormService'], 'getFormData').mockReturnValue({
        id: '',
        data: { name: 'App', url: 'https://app.com', icon: 'home', gradient: '' }
      })
      vi.spyOn(app['apiClient'], 'createApp').mockRejectedValue(new Error('Network error'))
      vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      const toastSpy = vi.spyOn(toast, 'error')

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(toastSpy).toHaveBeenCalled()
    })

    it('Deve_mostrar_toast_erro_se_update_falhar', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(true)
      vi.spyOn(app['appFormService'], 'getFormData').mockReturnValue({
        id: '1',
        data: { name: 'App', url: 'https://app.com', icon: 'home', gradient: '' }
      })
      vi.spyOn(app['apiClient'], 'updateApp').mockRejectedValue(new Error('Network error'))
      vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      const toastSpy = vi.spyOn(toast, 'error')

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(toastSpy).toHaveBeenCalled()
    })

    it('Deve_chamar_setSubmitting_true_e_depois_false', async () => {
      vi.spyOn(app['appFormService'], 'validate').mockReturnValue(true)
      vi.spyOn(app['appFormService'], 'getFormData').mockReturnValue({
        id: '',
        data: { name: 'App', url: 'https://app.com', icon: 'home', gradient: '' }
      })
      vi.spyOn(app['apiClient'], 'createApp').mockResolvedValue({} as any)
      vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div id="new-grid"></div>') } as any)

      const setSubmittingSpy = vi.spyOn(app['appFormService'], 'setSubmitting')

      const form = document.createElement('form')
      form.id = 'app-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)

      expect(setSubmittingSpy).toHaveBeenCalledWith(true)
      expect(setSubmittingSpy).toHaveBeenCalledWith(false)
    })

    it('Deve_ignorar_submit_de_form_nao_app_form', async () => {
      const createSpy = vi.spyOn(app['apiClient'], 'createApp')

      const form = document.createElement('form')
      form.id = 'other-form'
      const event = new Event('submit', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'target', { value: form })

      await (app as any).handleSubmit(event)
      expect(createSpy).not.toHaveBeenCalled()
    })
  })

describe('handleKeydown', () => {
    it('Should_close_modal_with_esc', () => {
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      ;(app as any).handleKeydown(createKeyboardEvent('Escape'))
      expect(closeSpy).toHaveBeenCalled()
    })

    it('Should_not_close_modal_if_confirm_open', () => {
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      const confirmOverlay = document.getElementById('confirm-overlay')!
      confirmOverlay.classList.remove('hidden')

      ;(app as any).handleKeydown(createKeyboardEvent('Escape'))

      expect(closeSpy).not.toHaveBeenCalled()
    })

    it('Should_focus_search_with_slash', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      ;(app as any).handleKeydown(createKeyboardEvent('/'))
      expect(focusSpy).toHaveBeenCalled()
    })

    it('Should_focus_search_with_ctrl_k', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      ;(app as any).handleKeydown(createKeyboardEvent('k', { ctrlKey: true }))
      expect(focusSpy).toHaveBeenCalled()
    })

    it('Should_focus_search_with_meta_k', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      ;(app as any).handleKeydown(createKeyboardEvent('k', { metaKey: true }))
      expect(focusSpy).toHaveBeenCalled()
    })

    it.skip('Should_not_focus_if_already_in_input (jsdom limitation)', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      searchInput.focus()

      ;(app as any).handleKeydown(createKeyboardEvent('/'))

      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('Should_not_focus_if_already_in_textarea', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      const textarea = document.createElement('textarea')
      document.body.appendChild(textarea)
      textarea.focus()

      ;(app as any).handleKeydown(createKeyboardEvent('/'))

      expect(focusSpy).not.toHaveBeenCalled()
      textarea.remove()
    })

    it('Should_not_focus_if_already_in_select', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      const select = document.createElement('select')
      document.body.appendChild(select)
      select.focus()

      ;(app as any).handleKeydown(createKeyboardEvent('/'))

      expect(focusSpy).not.toHaveBeenCalled()
      select.remove()
    })

    it('Should_prevent_default_when_focusing_search', () => {
      const event = createKeyboardEvent('/')
      const preventSpy = vi.spyOn(event, 'preventDefault')

      ;(app as any).handleKeydown(event)

      expect(preventSpy).toHaveBeenCalled()
    })

    it('Should_select_text_in_input', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const selectSpy = vi.spyOn(searchInput, 'select')
      ;(app as any).handleKeydown(createKeyboardEvent('/'))
      expect(selectSpy).toHaveBeenCalled()
    })

    it('Should_ignore_other_keys', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')

      ;(app as any).handleKeydown(createKeyboardEvent('a'))
      ;(app as any).handleKeydown(createKeyboardEvent('Enter'))
      ;(app as any).handleKeydown(createKeyboardEvent('Tab'))

      expect(focusSpy).not.toHaveBeenCalled()
    })
  })

  describe('refreshAppGrid', () => {
    it('Should_fetch_and_update_grid', async () => {
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>New Grid</div>') } as any)

      await (app as any).refreshAppGrid()

      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=')
      const grid = document.getElementById('app-grid')
      expect(grid?.innerHTML).toBe('<div>New Grid</div>')
    })

    it('Should_do_nothing_if_grid_missing', async () => {
      document.getElementById('app-grid')?.remove()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>New Grid</div>') } as any)

      await expect((app as any).refreshAppGrid()).resolves.not.toThrow()
    })
  })

  describe('handleAction', () => {
    it('Should_open_modal', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      ;(app as any).handleAction('open-modal', document.createElement('button'))
      expect(openSpy).toHaveBeenCalled()
    })

    it('Should_close_modal', () => {
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      ;(app as any).handleAction('close-modal', document.createElement('button'))
      expect(closeSpy).toHaveBeenCalled()
    })

    it('Should_toggle_edit_mode', () => {
      const toggleSpy = vi.spyOn(app['editModeService'], 'toggle').mockImplementation(() => {})
      ;(app as any).handleAction('toggle-edit-mode', document.createElement('button'))
      expect(toggleSpy).toHaveBeenCalled()
    })

    it('Should_open_edit_with_id', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      const btn = document.createElement('button')
      btn.dataset.appId = '99'
      ;(app as any).handleAction('edit-app', btn)
      expect(openSpy).toHaveBeenCalledWith(99)
    })

    it('Should_ignore_edit_app_without_id', () => {
      const openSpy = vi.spyOn(app['appFormService'], 'open').mockImplementation(() => Promise.resolve())
      const btn = document.createElement('button')
      ;(app as any).handleAction('edit-app', btn)
      expect(openSpy).not.toHaveBeenCalled()
    })

    it('Should_call_handleDeleteApp', async () => {
      const deleteSpy = vi.spyOn(app as any, 'handleDeleteApp').mockResolvedValue(undefined)
      const btn = document.createElement('button')
      btn.dataset.appId = '5'
      await (app as any).handleAction('delete-app', btn)
      expect(deleteSpy).toHaveBeenCalledWith(5)
    })

    it('Should_ignore_delete_app_without_id', async () => {
      const deleteSpy = vi.spyOn(app as any, 'handleDeleteApp').mockResolvedValue(undefined)
      const btn = document.createElement('button')
      await (app as any).handleAction('delete-app', btn)
      expect(deleteSpy).not.toHaveBeenCalled()
    })

    it('Should_ignore_invalid_action', () => {
      expect(() => (app as any).handleAction('invalid-action', document.createElement('button'))).not.toThrow()
    })
  })

  describe('handleKeydown', () => {
    it('Should_close_modal_with_esc', () => {
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      ;(app as any).handleKeydown(createKeyboardEvent('Escape'))
      expect(closeSpy).toHaveBeenCalled()
    })

    it('Should_not_close_modal_if_confirm_open', () => {
      const closeSpy = vi.spyOn(app['appFormService'], 'close').mockImplementation(() => {})
      const confirmOverlay = document.getElementById('confirm-overlay')!
      confirmOverlay.classList.remove('hidden')

      ;(app as any).handleKeydown(createKeyboardEvent('Escape'))

      expect(closeSpy).not.toHaveBeenCalled()
    })

    it('Should_focus_search_with_slash', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      ;(app as any).handleKeydown(createKeyboardEvent('/'))
      expect(focusSpy).toHaveBeenCalled()
    })

    it('Should_focus_search_with_ctrl_k', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      ;(app as any).handleKeydown(createKeyboardEvent('k', { ctrlKey: true }))
      expect(focusSpy).toHaveBeenCalled()
    })

    it('Should_focus_search_with_meta_k', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')
      ;(app as any).handleKeydown(createKeyboardEvent('k', { metaKey: true }))
      expect(focusSpy).toHaveBeenCalled()
    })

    it('Should_prevent_default_when_focusing_search', () => {
      const event = createKeyboardEvent('/')
      const preventSpy = vi.spyOn(event, 'preventDefault')

      ;(app as any).handleKeydown(event)

      expect(preventSpy).toHaveBeenCalled()
    })

    it('Should_select_text_in_input', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const selectSpy = vi.spyOn(searchInput, 'select')
      ;(app as any).handleKeydown(createKeyboardEvent('/'))
      expect(selectSpy).toHaveBeenCalled()
    })

    it('Should_ignore_other_keys', () => {
      const searchInput = document.getElementById('search-input') as HTMLInputElement
      const focusSpy = vi.spyOn(searchInput, 'focus')

      ;(app as any).handleKeydown(createKeyboardEvent('a'))
      ;(app as any).handleKeydown(createKeyboardEvent('Enter'))
      ;(app as any).handleKeydown(createKeyboardEvent('Tab'))

      expect(focusSpy).not.toHaveBeenCalled()
    })
  })

  describe('refreshAppGrid', () => {
    it('Should_fetch_and_update_grid', async () => {
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>New Grid</div>') } as any)

      await (app as any).refreshAppGrid()

      expect(global.fetch).toHaveBeenCalledWith('/api/apps/search?q=')
      const grid = document.getElementById('app-grid')
      expect(grid?.innerHTML).toBe('<div>New Grid</div>')
    })

    it('Should_do_nothing_if_grid_missing', async () => {
      document.getElementById('app-grid')?.remove()
      global.fetch = vi.fn().mockResolvedValue({ text: () => Promise.resolve('<div>New Grid</div>') } as any)

      await expect((app as any).refreshAppGrid()).resolves.not.toThrow()
    })
  })

  describe('integration init', () => {
    it('Should_initialize_app_completely', () => {
      app.init()

      const card = document.querySelector('.app-card') as HTMLElement
      const event = createMouseEvent(card)

      expect(() => app['handleClick'](event)).not.toThrow()
    })
  })
})