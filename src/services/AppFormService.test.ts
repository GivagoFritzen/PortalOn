import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AppFormService } from './AppFormService'
import { ApiClient } from '../api/ApiClient'

describe('AppFormService', () => {
  let service: AppFormService
  let mockApiClient: ApiClient

  const setupDOM = () => {
    document.body.innerHTML = `
      <div id="modal-overlay" class="hidden"></div>
      <div id="modal-content"></div>
      <template id="modal-template">
        <h3 id="modal-title">Novo App</h3>
        <form id="app-form">
          <input id="form-id" />
          <input id="form-name" />
          <input id="form-url" />
          <input id="form-gradient" />
          <input id="form-icon" />
          <div id="form-name-error"></div>
          <div id="form-url-error"></div>
          <button id="save-btn" type="submit">
            <span id="save-btn-text">Save App</span>
          </button>
        </form>
      </template>
    `
  }

  beforeEach(() => {
    setupDOM()

    mockApiClient = {
      fetchApp: vi.fn().mockResolvedValue({ id: 1, name: 'Loaded App', url: 'https://loaded.com', icon: 'home', gradient: 'grad-1' }),
      fetchIcons: vi.fn().mockResolvedValue({ icons: ['icon1', 'icon2'], total: 2 }),
      createApp: vi.fn().mockResolvedValue({}),
      updateApp: vi.fn().mockResolvedValue({}),
      deleteApp: vi.fn().mockResolvedValue({}),
      reorderApps: vi.fn().mockResolvedValue({}),
    } as unknown as ApiClient

    service = new AppFormService(mockApiClient)
  })

  afterEach(() => {
    service.close()
    vi.restoreAllMocks()
  })

  const getFormName = () => document.getElementById('form-name') as HTMLInputElement
  const getFormUrl = () => document.getElementById('form-url') as HTMLInputElement
  const getFormGradient = () => document.getElementById('form-gradient') as HTMLInputElement
  const getFormId = () => document.getElementById('form-id') as HTMLInputElement
  const getSaveBtn = () => document.getElementById('save-btn') as HTMLButtonElement
  const getSaveBtnText = () => document.getElementById('save-btn-text') as HTMLElement
  const getNameError = () => document.getElementById('form-name-error') as HTMLElement
  const getUrlError = () => document.getElementById('form-url-error') as HTMLElement
  const getOverlay = () => document.getElementById('modal-overlay') as HTMLElement
  const getTitle = () => document.getElementById('modal-title') as HTMLElement

  describe('open & close', () => {
    it('Should_open_modal_for_new_app', async () => {
      await service.open()
      const overlay = document.getElementById('modal-overlay')
      expect(overlay?.classList.contains('hidden')).toBe(false)
      expect(getTitle().textContent).toBe('Add App')
    })

    it('Should_open_modal_for_editing_existing_app', async () => {
      await service.open(1)
      expect(mockApiClient.fetchApp).toHaveBeenCalledWith(1)
      expect(getFormName().value).toBe('Loaded App')
      expect(getFormUrl().value).toBe('https://loaded.com')
      expect(getFormGradient().value).toBe('grad-1')
    })

    it('Should_close_modal', async () => {
      await service.open()
      service.close()
      const overlay = document.getElementById('modal-overlay')
      expect(overlay?.classList.contains('hidden')).toBe(true)
    })

    it('Should_throw_error_when_elements_do_not_exist', async () => {
      document.body.innerHTML = ''
      await expect(service.open()).rejects.toThrow('Required form element not found')
    })

    it('Should_clear_form_id_in_new_mode', async () => {
      await service.open()
      expect(getFormId().value).toBe('')
    })

    it('Should_set_form_id_in_edit_mode', async () => {
      await service.open(42)
      expect(getFormId().value).toBe('42')
    })
  })

  describe('validate', () => {
    beforeEach(async () => {
      await service.open()
    })

    it('Should_return_false_when_name_is_empty', () => {
      expect(service.validate()).toBe(false)
    })

    it('Should_return_false_when_url_is_empty', () => {
      getFormName().value = 'Test App'
      expect(service.validate()).toBe(false)
    })

    it('Should_return_false_when_url_without_http', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'example.com'
      expect(service.validate()).toBe(false)
    })

    it('Should_return_true_when_all_data_valid', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'https://example.com'
      expect(service.validate()).toBe(true)
    })

    it('Should_accept_url_with_http', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'http://localhost:8080'
      expect(service.validate()).toBe(true)
    })

    it('Should_accept_url_with_https', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'https://example.com'
      expect(service.validate()).toBe(true)
    })

    it('Should_reject_url_with_ftp', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'ftp://example.com'
      expect(service.validate()).toBe(false)
    })

    it('Should_show_required_name_error', () => {
      service.validate()
      expect(getNameError().classList.contains('hidden')).toBe(false)
      expect(getNameError().textContent).toBeDefined()
    })

    it('Should_show_required_url_error', () => {
      getFormName().value = 'Test'
      service.validate()
      expect(getUrlError().classList.contains('hidden')).toBe(false)
      expect(getUrlError().textContent).toBeDefined()
    })

    it('Should_show_invalid_url_error', () => {
      getFormName().value = 'Test'
      getFormUrl().value = 'invalid'
      service.validate()
      expect(getUrlError().classList.contains('hidden')).toBe(false)
      expect(getUrlError().textContent).toContain('valid')
    })

    it('Should_add_error_classes_to_inputs', () => {
      service.validate()
      expect(getFormName().classList.contains('border-red-500')).toBe(true)
      expect(getFormName().classList.contains('focus:ring-red-500')).toBe(true)
      expect(getFormUrl().classList.contains('border-red-500')).toBe(true)
    })

    it('Should_clear_previous_errors_when_validating', () => {
      getFormName().value = 'Test'
      getFormUrl().value = 'https://valid.com'
      service.validate() // valid - clears errors
      expect(getFormName().classList.contains('border-red-500')).toBe(false)
      expect(getFormUrl().classList.contains('border-red-500')).toBe(false)
    })

    it('Should_clear_name_error_on_input', () => {
      service.validate() // shows error
      getFormName().value = 'Test'
      getFormName().dispatchEvent(new Event('input'))
      expect(getFormName().classList.contains('border-red-500')).toBe(false)
      expect(getNameError().classList.contains('hidden')).toBe(true)
    })

    it('Should_clear_url_error_on_input', () => {
      service.validate() // shows error
      getFormName().value = 'Test'
      getFormUrl().value = 'https://valid.com'
      getFormUrl().dispatchEvent(new Event('input'))
      expect(getFormUrl().classList.contains('border-red-500')).toBe(false)
      expect(getUrlError().classList.contains('hidden')).toBe(true)
    })
  })

  describe('getFormData', () => {
    beforeEach(async () => {
      await service.open()
    })

    it('Should_return_form_data', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'https://example.com'
      getFormGradient().value = 'linear-gradient'
      getFormId().value = '1'

      const data = service.getFormData()
      expect(data.data.name).toBe('Test App')
      expect(data.data.url).toBe('https://example.com')
      expect(data.data.gradient).toBe('linear-gradient')
      expect(data.id).toBe('1')
    })

    it('Should_trim_values', () => {
      getFormName().value = '  Test App  '
      getFormUrl().value = '  https://example.com  '
      getFormGradient().value = '  grad  '
      getFormId().value = '  2  '

      const data = service.getFormData()
      expect(data.data.name).toBe('Test App')
      expect(data.data.url).toBe('https://example.com')
      expect(data.data.gradient).toBe('grad')
      expect(data.id).toBe('2')
    })

    it('Should_return_icon_from_form_icon', () => {
      getFormName().value = 'Test'
      getFormUrl().value = 'https://test.com'
      const data = service.getFormData()
      expect(data.data.icon).toBeDefined()
    })

    it('Should_return_empty_string_when_icon_not_defined', () => {
      const iconInput = document.getElementById('form-icon') as HTMLInputElement
      iconInput.value = ''
      getFormName().value = 'Test'
      getFormUrl().value = 'https://test.com'
      const data = service.getFormData()
      expect(data.data.icon).toBe('')
    })
  })

  describe('setSubmitting', () => {
    beforeEach(async () => {
      await service.open()
    })

    it('Should_set_button_as_submitting', () => {
      service.setSubmitting(true)
      const saveBtn = getSaveBtn()
      const saveBtnText = getSaveBtnText()

      expect(saveBtn.disabled).toBe(true)
      expect(saveBtnText.textContent).toBe('Saving...')
    })

    it('Should_restore_button_text_after_submitting_in_new_mode', () => {
      service.setSubmitting(false)
      const saveBtn = getSaveBtn()
      const saveBtnText = getSaveBtnText()

      expect(saveBtn.disabled).toBe(false)
      expect(saveBtnText.textContent).toBe('Save App')
    })

    it('Should_show_updating_text_in_edit_mode', async () => {
      await service.open(1)
      service.setSubmitting(true)
      expect(getSaveBtnText().textContent).toBe('Updating...')
    })

    it('Should_show_update_text_in_edit_mode_when_not_submitting', async () => {
      await service.open(1)
      service.setSubmitting(false)
      expect(getSaveBtnText().textContent).toBe('Update App')
    })

    it('Should_do_nothing_if_saveBtn_does_not_exist', () => {
      document.getElementById('save-btn')?.remove()
      expect(() => service.setSubmitting(true)).not.toThrow()
    })

    it('Should_do_nothing_if_saveBtnText_does_not_exist', () => {
      document.getElementById('save-btn-text')?.remove()
      expect(() => service.setSubmitting(true)).not.toThrow()
    })
  })

  describe('close', () => {
    it('Should_add_hidden_to_overlay', async () => {
      await service.open()
      service.close()
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_work_without_opening_before', () => {
      expect(() => service.close()).not.toThrow()
    })
  })

  describe('open edit mode', () => {
    it('Should_load_app_data', async () => {
      await service.open(1)
      expect(mockApiClient.fetchApp).toHaveBeenCalledWith(1)
      expect(getFormName().value).toBe('Loaded App')
      expect(getFormUrl().value).toBe('https://loaded.com')
      expect(getFormGradient().value).toBe('grad-1')
    })

    it('Should_keep_modal_closed_if_fetch_fails', async () => {
      mockApiClient.fetchApp = vi.fn().mockRejectedValue(new Error('Not found'))
      await service.open(999)
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_log_error_if_fetch_fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockApiClient.fetchApp = vi.fn().mockRejectedValue(new Error('Network error'))
      await service.open(999)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load app:', expect.any(Error))
    })
  })

  describe('setMode', () => {
    it('Should_set_add_title_in_new_mode', async () => {
      await service.open()
      expect(getTitle().textContent).toBe('Add App')
    })

    it('Should_set_edit_title_in_edit_mode', async () => {
      await service.open(1)
      expect(getTitle().textContent).toBe('Edit App')
    })

    it('Should_set_save_button_text_in_new_mode', async () => {
      await service.open()
      expect(getSaveBtnText().textContent).toBe('Save App')
    })

    it('Should_set_update_button_text_in_edit_mode', async () => {
      await service.open(1)
      expect(getSaveBtnText().textContent).toBe('Update App')
    })

    it('Should_clear_form_id_in_new_mode', async () => {
      await service.open()
      expect(getFormId().value).toBe('')
    })

    it('Should_keep_form_id_in_edit_mode', async () => {
      await service.open(42)
      expect(getFormId().value).toBe('42')
    })
  })

  describe('integration', () => {
    it('Should_complete_flow_create_app', async () => {
      await service.open()
      getFormName().value = 'New App'
      getFormUrl().value = 'https://new.com'
      expect(service.validate()).toBe(true)

      const formData = service.getFormData()
      expect(formData.data.name).toBe('New App')
      expect(formData.data.url).toBe('https://new.com')
      expect(formData.id).toBe('')

      service.close()
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_complete_flow_edit_app', async () => {
      await service.open(1)
      expect(getFormName().value).toBe('Loaded App')

      getFormName().value = 'Updated App'
      expect(service.validate()).toBe(true)

      const formData = service.getFormData()
      expect(formData.data.name).toBe('Updated App')
      expect(formData.id).toBe('1')

      service.close()
    })

    it('Should_maintain_state_between_open_close', async () => {
      await service.open()
      getFormName().value = 'Test'
      service.close()

      await service.open()
      expect(getFormName().value).toBe('')
    })
  })

  describe('open - edge cases for missing DOM elements', () => {
    it('Should_return_early_if_overlay_missing', async () => {
      document.getElementById('modal-overlay')?.remove()
      const newService = new AppFormService(mockApiClient)
      await newService.open()
      expect(mockApiClient.fetchApp).not.toHaveBeenCalled()
    })

    it('Should_return_early_if_template_missing', async () => {
      document.getElementById('modal-template')?.remove()
      const newService = new AppFormService(mockApiClient)
      await newService.open()
      expect(mockApiClient.fetchApp).not.toHaveBeenCalled()
    })

    it('Should_return_early_if_content_missing', async () => {
      document.getElementById('modal-content')?.remove()
      const newService = new AppFormService(mockApiClient)
      await newService.open()
      expect(mockApiClient.fetchApp).not.toHaveBeenCalled()
    })

    it('Should_log_error_when_elements_missing', async () => {
      document.body.innerHTML = ''
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const newService = new AppFormService(mockApiClient)
      await newService.open()
      expect(consoleSpy).toHaveBeenCalledWith('App form modal elements not found.')
    })
  })

  describe('close - edge cases', () => {
    it('Should_work_without_saveBtn_and_saveBtnHandler', () => {
      expect(() => service.close()).not.toThrow()
    })

    it('Should_remove_saveBtn_event_listener_when_exists', async () => {
      await service.open()
      const saveBtn = getSaveBtn()
      const removeSpy = vi.spyOn(saveBtn, 'removeEventListener')
      service.close()
      expect(removeSpy).toHaveBeenCalled()
    })

    it('Should_call_iconPicker_destroy', async () => {
      await service.open()
      const destroySpy = vi.spyOn((service as any).iconPicker, 'destroy')
      service.close()
      expect(destroySpy).toHaveBeenCalled()
    })

    it('Should_add_hidden_using_optional_chaining', async () => {
      await service.open()
      const overlay = getOverlay()
      overlay.classList.remove('hidden')
      service.close()
      expect(overlay.classList.contains('hidden')).toBe(true)
    })
  })

  describe('validate - additional edge cases', () => {
    beforeEach(async () => {
      await service.open()
    })

    it('Should_accept_url_with_http_only', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = 'http://example.com'
      expect(service.validate()).toBe(true)
    })

    it('Should_accept_url_with_spaces_at_start_end_because_it_trims', () => {
      getFormName().value = 'Test App'
      getFormUrl().value = '  https://example.com  '
      expect(service.validate()).toBe(true)
    })

    it('Should_return_false_when_only_name_valid', () => {
      getFormName().value = 'Valid Name'
      getFormUrl().value = ''
      expect(service.validate()).toBe(false)
    })

    it('Should_return_false_when_only_url_valid', () => {
      getFormName().value = ''
      getFormUrl().value = 'https://valid.com'
      expect(service.validate()).toBe(false)
    })

    it('Should_show_name_error_with_correct_message', () => {
      service.validate()
      expect(getNameError().textContent).toContain('required')
    })

    it('Should_show_url_error_with_correct_message_when_empty', () => {
      getFormName().value = 'Test'
      service.validate()
      expect(getUrlError().textContent).toContain('required')
    })

    it('Should_show_url_error_with_correct_message_when_invalid', () => {
      getFormName().value = 'Test'
      getFormUrl().value = 'invalid'
      service.validate()
      expect(getUrlError().textContent).toContain('valid')
    })

    it('Should_not_add_error_classes_when_valid', () => {
      getFormName().value = 'Test'
      getFormUrl().value = 'https://valid.com'
      service.validate()
      expect(getFormName().classList.contains('border-red-500')).toBe(false)
      expect(getFormUrl().classList.contains('border-red-500')).toBe(false)
    })
  })

  describe('getFormData - edge cases', () => {
    beforeEach(async () => {
      await service.open()
    })

    it('Should_return_empty_string_when_form_icon_missing', () => {
      document.getElementById('form-icon')?.remove()
      getFormName().value = 'Test'
      getFormUrl().value = 'https://test.com'
      const data = service.getFormData()
      expect(data.data.icon).toBe('')
    })

    it('Should_trim_icon_value', () => {
      const iconInput = document.getElementById('form-icon') as HTMLInputElement
      iconInput.value = '  home  '
      getFormName().value = 'Test'
      getFormUrl().value = 'https://test.com'
      const data = service.getFormData()
      expect(data.data.icon).toBe('home')
    })
  })

  describe('setMode - edge cases', () => {
    it('Should_preserve_form_id_in_edit_mode', async () => {
      await service.open(123)
      expect(getFormId().value).toBe('123')
    })

    it('Should_set_correct_title_and_button_in_edit_mode', async () => {
      await service.open(1)
      expect(getTitle().textContent).toBe('Edit App')
      expect(getSaveBtnText().textContent).toBe('Update App')
    })

    it('Should_set_correct_title_and_button_in_new_mode', async () => {
      await service.open()
      expect(getTitle().textContent).toBe('Add App')
      expect(getSaveBtnText().textContent).toBe('Save App')
    })
  })

  describe('showFieldError and clearFieldError - edge cases', () => {
    beforeEach(async () => {
      await service.open()
    })

    it('Should_work_when_errorEl_is_null', () => {
      const input = getFormName()
      ;(service as any).showFieldError(input, null, 'Error message')
      expect(input.classList.contains('border-red-500')).toBe(true)
      expect(input.classList.contains('focus:ring-red-500')).toBe(true)
    })

    it('Should_clear_error_when_errorEl_is_null', () => {
      const input = getFormName()
      ;(service as any).showFieldError(input, null, 'Error message')
      ;(service as any).clearFieldError(input, null)
      expect(input.classList.contains('border-red-500')).toBe(false)
      expect(input.classList.contains('focus:ring-red-500')).toBe(false)
    })

    it('Should_set_textContent_empty_when_clearing', () => {
      service.validate()
      expect(getNameError().textContent).not.toBe('')
      ;(service as any).clearFieldError(getFormName(), getNameError())
      expect(getNameError().textContent).toBe('')
    })

    it('Should_add_hidden_when_clearing_error', () => {
      service.validate()
      expect(getNameError().classList.contains('hidden')).toBe(false)
      ;(service as any).clearFieldError(getFormName(), getNameError())
      expect(getNameError().classList.contains('hidden')).toBe(true)
    })

    it('Should_remove_specific_classes_when_clearing', () => {
      service.validate()
      ;(service as any).clearFieldError(getFormName(), getNameError())
      expect(getFormName().classList.contains('border-red-500')).toBe(false)
      expect(getFormName().classList.contains('focus:ring-red-500')).toBe(false)
    })
  })

  describe('initializeForm - event listeners', () => {
    it('Should_add_input_event_listener_to_formName', async () => {
      const inputSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      await service.open()
      expect(inputSpy).toHaveBeenCalledWith('input', expect.any(Function))
    })

    it('Should_add_input_event_listener_to_formUrl', async () => {
      const inputSpy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener')
      await service.open()
      expect(inputSpy).toHaveBeenCalledWith('input', expect.any(Function))
    })

    it('Should_initialize_iconPicker', async () => {
      const initSpy = vi.spyOn((service as any).iconPicker, 'init')
      await service.open()
      expect(initSpy).toHaveBeenCalled()
    })

    it('Should_configure_saveBtnHandler_for_requestSubmit', async () => {
      await service.open()
      const saveBtn = getSaveBtn()
      // Mock requestSubmit since jsdom doesn't implement it
      const form = getFormName().form!
      form.requestSubmit = vi.fn()
      saveBtn.click()
      expect(form.requestSubmit).toHaveBeenCalled()
    })

    it('Should_remove_previous_handler_before_adding_new', async () => {
      await service.open()
      // Call initializeForm directly to test handler removal
      const saveBtn = getSaveBtn()
      const removeSpy = vi.spyOn(saveBtn, 'removeEventListener')
      ;(service as any).initializeForm()
      expect(removeSpy).toHaveBeenCalled()
    })
  })

  describe('getElement - error handling', () => {
    it('Should_throw_error_when_element_not_found', async () => {
      document.body.innerHTML = ''
      await expect(service.open()).rejects.toThrow('Required form element not found')
    })
  })
})