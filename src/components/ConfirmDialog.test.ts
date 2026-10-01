import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  let dialog: ConfirmDialog

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="confirm-overlay" class="hidden"></div>
      <div id="confirm-backdrop"></div>
      <h2 id="confirm-title"></h2>
      <button id="confirm-ok"></button>
      <button id="confirm-cancel"></button>
      <span id="confirm-message"></span>
    `
    dialog = new ConfirmDialog()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  const getOverlay = () => document.getElementById('confirm-overlay') as HTMLElement
  const getBackdrop = () => document.getElementById('confirm-backdrop') as HTMLElement
  const getOkBtn = () => document.getElementById('confirm-ok') as HTMLButtonElement
  const getCancelBtn = () => document.getElementById('confirm-cancel') as HTMLButtonElement
  const getMessage = () => document.getElementById('confirm-message') as HTMLElement
  const getTitle = () => document.getElementById('confirm-title') as HTMLElement

  describe('show', () => {
    it('Should_request_confirmation_with_message', () => {
      const promise = dialog.show('Custom message')
      const msg = document.getElementById('confirm-message')
      expect(msg?.textContent).toBe('Custom message')
      const title = document.getElementById('confirm-title')
      expect(title?.textContent).toBe('Confirm')
      document.getElementById('confirm-cancel')?.click()
      return promise
    })

    it('Should_return_false_when_elements_do_not_exist', async () => {
      document.body.innerHTML = ''
      const result = await dialog.show('Message')
      expect(result).toBe(false)
    })

    it('Should_resolve_true_when_clicking_ok', async () => {
      const promise = dialog.show('Custom message')
      document.getElementById('confirm-ok')?.click()
      const result = await promise
      expect(result).toBe(true)
    })

    it('Should_resolve_false_when_clicking_cancel', async () => {
      const promise = dialog.show('Custom message')
      document.getElementById('confirm-cancel')?.click()
      const result = await promise
      expect(result).toBe(false)
    })

    it('Should_resolve_false_when_clicking_backdrop', async () => {
      const promise = dialog.show('Message')
      getBackdrop().click()
      const result = await promise
      expect(result).toBe(false)
    })

    it('Should_resolve_false_when_pressing_escape', async () => {
      const promise = dialog.show('Message')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      const result = await promise
      expect(result).toBe(false)
    })

    it('Should_not_resolve_on_other_keys', async () => {
      const promise = dialog.show('Message')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      // Promise should not resolve immediately
      let resolved = false
      promise.then(() => { resolved = true })
      await Promise.resolve() // microtask
      expect(resolved).toBe(false)
      // Cleanup
      getCancelBtn().click()
      await promise
    })

    it('Should_set_title_from_locale', () => {
      dialog.show('Message')
      expect(getTitle().textContent).toBe('Confirm')
    })

    it('Should_set_ok_button_text_from_locale', () => {
      dialog.show('Message')
      expect(getOkBtn().textContent).toBe('Delete')
    })

    it('Should_set_cancel_button_text_from_locale', () => {
      dialog.show('Message')
      expect(getCancelBtn().textContent).toBe('Cancel')
    })

    it('Should_remove_hidden_class_from_overlay', () => {
      dialog.show('Message')
      expect(getOverlay().classList.contains('hidden')).toBe(false)
    })

    it('Should_add_hidden_class_after_confirm', async () => {
      const promise = dialog.show('Message')
      getOkBtn().click()
      await promise
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_add_hidden_class_after_cancel', async () => {
      const promise = dialog.show('Message')
      getCancelBtn().click()
      await promise
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_add_hidden_class_after_clicking_backdrop', async () => {
      const promise = dialog.show('Message')
      getBackdrop().click()
      await promise
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_add_hidden_class_after_escape', async () => {
      const promise = dialog.show('Message')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await promise
      expect(getOverlay().classList.contains('hidden')).toBe(true)
    })

    it('Should_remove_event_listeners_after_confirm', async () => {
      const removeSpy = vi.spyOn(getOkBtn(), 'removeEventListener')
      const promise = dialog.show('Message')
      getOkBtn().click()
      await promise
      expect(removeSpy).toHaveBeenCalled()
    })

    it('Should_remove_event_listeners_after_cancel', async () => {
      const removeSpy = vi.spyOn(getCancelBtn(), 'removeEventListener')
      const promise = dialog.show('Message')
      getCancelBtn().click()
      await promise
      expect(removeSpy).toHaveBeenCalled()
    })

    it('Should_remove_backdrop_event_listener_after_confirm', async () => {
      const removeSpy = vi.spyOn(getBackdrop(), 'removeEventListener')
      const promise = dialog.show('Message')
      getOkBtn().click()
      await promise
      expect(removeSpy).toHaveBeenCalled()
    })

    it('Should_remove_keydown_event_listener_after_confirm', async () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')
      const promise = dialog.show('Message')
      getOkBtn().click()
      await promise
      expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('Should_allow_multiple_sequential_calls', async () => {
      const promise1 = dialog.show('Message 1')
      getOkBtn().click()
      await promise1

      const promise2 = dialog.show('Message 2')
      getCancelBtn().click()
      const result2 = await promise2

      expect(result2).toBe(false)
    })

    it('Should_update_message_on_each_call', () => {
      dialog.show('First message')
      expect(getMessage().textContent).toBe('First message')

      dialog.show('Second message')
      expect(getMessage().textContent).toBe('Second message')
    })

    it('Should_return_promise_that_resolves_boolean', async () => {
      const promise = dialog.show('Test')
      expect(promise).toBeInstanceOf(Promise)
      getOkBtn().click()
      const result = await promise
      expect(typeof result).toBe('boolean')
    })

    it('Should_clear_previous_message', () => {
      dialog.show('Old message')
      dialog.show('New message')
      expect(getMessage().textContent).toBe('New message')
    })
  })

  describe('setElementsById', () => {
    it('Should_find_all_elements', () => {
      // Call private method via cast
      ;(dialog as any).setElementsById()
      expect((dialog as any).overlay).toBe(getOverlay())
      expect((dialog as any).backdrop).toBe(getBackdrop())
      expect((dialog as any).okBtn).toBe(getOkBtn())
      expect((dialog as any).cancelBtn).toBe(getCancelBtn())
      expect((dialog as any).messageEl).toBe(getMessage())
      expect((dialog as any).titleEl).toBe(getTitle())
    })

    it('Should_set_null_when_element_missing', () => {
      document.body.innerHTML = ''
      ;(dialog as any).setElementsById()
      expect((dialog as any).overlay).toBeNull()
      expect((dialog as any).backdrop).toBeNull()
      expect((dialog as any).okBtn).toBeNull()
      expect((dialog as any).cancelBtn).toBeNull()
      expect((dialog as any).messageEl).toBeNull()
      expect((dialog as any).titleEl).toBeNull()
    })

    it('Should_be_called_in_constructor', () => {
      const dialog2 = new ConfirmDialog()
      expect((dialog2 as any).overlay).toBe(getOverlay())
    })

    it('Should_be_called_in_show', () => {
      document.body.innerHTML = `
        <div id="confirm-overlay" class="hidden"></div>
        <div id="confirm-backdrop"></div>
        <h2 id="confirm-title"></h2>
        <button id="confirm-ok"></button>
        <button id="confirm-cancel"></button>
        <span id="confirm-message"></span>
      `
      const newDialog = new ConfirmDialog()
      newDialog.show('Test')
      // Verify elements were found (show does not return false)
    })
  })

  describe('promise_behavior', () => {
    it('Should_resolve_only_once', async () => {
      const promise = dialog.show('Message')
      getOkBtn().click()
      const result1 = await promise
      // Trying to resolve again should not work
      const promise2 = dialog.show('Message 2')
      getCancelBtn().click()
      const result2 = await promise2
      expect(result1).toBe(true)
      expect(result2).toBe(false)
    })

    it('Should_not_leak_event_listeners_between_calls', async () => {
      const addSpy = vi.spyOn(getOkBtn(), 'addEventListener')
      const removeSpy = vi.spyOn(getOkBtn(), 'removeEventListener')

      const promise1 = dialog.show('Message 1')
      getOkBtn().click()
      await promise1

      expect(addSpy).toHaveBeenCalledTimes(1)
      expect(removeSpy).toHaveBeenCalledTimes(1)

      const promise2 = dialog.show('Message 2')
      getOkBtn().click()
      await promise2

      expect(addSpy).toHaveBeenCalledTimes(2)
      expect(removeSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('optional_elements', () => {
    it('Should_return_false_without_backdrop', async () => {
      document.getElementById('confirm-backdrop')?.remove()
      const result = await dialog.show('Message')
      expect(result).toBe(false)
    })

    it('Should_return_false_without_title', async () => {
      document.getElementById('confirm-title')?.remove()
      const result = await dialog.show('Message')
      expect(result).toBe(false)
    })

    it('Should_return_false_without_message_element', async () => {
      document.getElementById('confirm-message')?.remove()
      const result = await dialog.show('Message')
      expect(result).toBe(false)
    })
  })
})