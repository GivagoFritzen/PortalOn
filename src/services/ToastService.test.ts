import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { toast } from './ToastService'
import { TOAST_CONFIG } from '../types/ToastConfig'
import type { ToastTypeConfig } from '../types/ToastTypeConfig'

describe('ToastService', () => {
  let originalInnerHTML: string | null

  beforeEach(() => {
    originalInnerHTML = document.body?.innerHTML
    ;(document.body as any).innerHTML = ''
    ;(toast as any).container = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    ;(document.body as any).innerHTML = originalInnerHTML!
    ;(toast as any).container = null
    vi.useRealTimers()
  })

  const getToast = () => document.querySelector('#toast-container > div') as HTMLElement
  const getTimerBar = () => document.querySelector('#toast-container .absolute.bottom-0') as HTMLElement
  const getTimerFill = () => document.querySelector('#toast-container .timer-drain') as HTMLElement
  const getCloseBtn = () => document.querySelector('[data-toast-close]') as HTMLButtonElement
  const getSquircle = () => document.querySelector('#toast-container .w-10.h-10') as HTMLElement
  const getTitle = () => document.querySelector('#toast-container h4') as HTMLElement
  const getDescription = () => document.querySelector('#toast-container p') as HTMLElement

  describe('success', () => {
    it('Should_show_success_message', () => {
      toast.success('Success!', 'Operation completed successfully.')
      const container = document.getElementById('toast-container')
      expect(container).not.toBeNull()
    })

    it('Should_have_correct_classes_for_success', () => {
      toast.success('Title', 'Desc')
      const t = getToast()
      expect(t.className).toContain('bg-surface-container-lowest')
      expect(t.className).toContain('rounded-2xl')
      expect(t.className).toContain('border-outline-variant')
      expect(t.className).toContain('shadow-xl')
    })

    it('Should_have_squircle_with_success_colors', () => {
      toast.success('Title', 'Desc')
      const s = getSquircle()
      expect(s.className).toContain('bg-emerald-50')
      expect(s.className).toContain('border-emerald-100')
      expect(s.className).toContain('text-emerald-600')
      expect(s.textContent).toContain('check_circle')
    })

    it('Should_have_timer_bar_with_success_color', () => {
      toast.success('Title', 'Desc')
      const tf = getTimerFill()
      expect(tf.className).toContain('bg-emerald-500')
    })

    it('Should_have_timer_bar_visible_by_default', () => {
      toast.success('Title', 'Desc')
      const tb = getTimerBar()
      expect(tb.style.display).not.toBe('none')
    })
  })

  describe('error', () => {
    it('Should_show_error_message', () => {
      toast.error('Error!', 'An error occurred.')
      const container = document.getElementById('toast-container')
      expect(container).not.toBeNull()
    })

    it('Should_have_squircle_with_error_colors', () => {
      toast.error('Title', 'Desc')
      const s = getSquircle()
      expect(s.className).toContain('bg-red-50')
      expect(s.className).toContain('border-red-200')
      expect(s.className).toContain('text-error')
      expect(s.textContent).toContain('error')
    })

    it('Should_have_timer_bar_with_error_color', () => {
      toast.error('Title', 'Desc')
      const tf = getTimerFill()
      expect(tf.className).toContain('bg-error')
    })

    it('Should_hide_timer_bar_by_default_persistent', () => {
      toast.error('Title', 'Desc')
      const tb = getTimerBar()
      expect(tb.style.display).toBe('none')
    })
  })

  describe('warning', () => {
    it('Should_show_warning_message', () => {
      toast.warning('Warning!', 'Check the data.')
      const container = document.getElementById('toast-container')
      expect(container).not.toBeNull()
    })

    it('Should_have_squircle_with_warning_colors', () => {
      toast.warning('Title', 'Desc')
      const s = getSquircle()
      expect(s.className).toContain('bg-amber-50')
      expect(s.className).toContain('border-amber-200')
      expect(s.className).toContain('text-amber-600')
      expect(s.textContent).toContain('warning')
    })

    it('Should_have_timer_bar_with_warning_color', () => {
      toast.warning('Title', 'Desc')
      const tf = getTimerFill()
      expect(tf.className).toContain('bg-amber-500')
    })

    it('Should_have_timer_bar_visible_by_default', () => {
      toast.warning('Title', 'Desc')
      const tb = getTimerBar()
      expect(tb.style.display).not.toBe('none')
    })
  })

  describe('info', () => {
    it('Should_show_info_message', () => {
      toast.info('Information', 'Here is some information.')
      const container = document.getElementById('toast-container')
      expect(container).not.toBeNull()
    })

    it('Should_have_squircle_with_info_colors', () => {
      toast.info('Title', 'Desc')
      const s = getSquircle()
      expect(s.className).toContain('bg-blue-50')
      expect(s.className).toContain('border-blue-200')
      expect(s.className).toContain('text-primary')
      expect(s.textContent).toContain('sync')
    })

    it('Should_have_icon_with_animate_spin', () => {
      toast.info('Title', 'Desc')
      const icon = getSquircle().querySelector('.material-symbols-outlined')
      expect(icon?.className).toContain('animate-spin')
    })

    it('Should_have_timer_bar_with_info_color', () => {
      toast.info('Title', 'Desc')
      const tf = getTimerFill()
      expect(tf.className).toContain('bg-primary')
    })

    it('Should_have_timer_bar_visible_by_default', () => {
      toast.info('Title', 'Desc')
      const tb = getTimerBar()
      expect(tb.style.display).not.toBe('none')
    })
  })

  describe('getContainer', () => {
    it('Should_create_container_if_not_exist', () => {
      const container = toast['getContainer']()
      expect(container.id).toBe('toast-container')
    })

    it('Should_reuse_existing_container', () => {
      toast['getContainer']()
      const container2 = toast['getContainer']()
      expect(container2).toBe(document.getElementById('toast-container'))
    })
  })

  describe('toast with custom duration', () => {
    it('Should_accept_custom_duration', () => {
      toast.success('Title', 'Description', { durationMs: 5000 })
      const container = document.getElementById('toast-container')
      expect(container).not.toBeNull()
    })

    it('Should_use_custom_durationMs_for_timeout', () => {
      toast.success('Title', 'Desc', { durationMs: 10000 })
      vi.advanceTimersByTime(5000)
      expect(getToast()).not.toBeNull()
      vi.advanceTimersByTime(5000)
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })
  })

  describe('content rendering', () => {
    it('Should_display_title_and_description_in_toast', () => {
      toast.success('Test Title', 'Test Description')
      const container = document.getElementById('toast-container')
      expect(container?.textContent).toContain('Test Title')
      expect(container?.textContent).toContain('Test Description')
    })

    it('Should_not_display_description_when_undefined', () => {
toast.success('Title Only')
      expect(getDescription()).toBeNull()
    })

    it('Should_display_title_with_correct_class', () => {
      toast.success('My Title')
      const title = getTitle()
      expect(title.className).toContain('font-bold')
      expect(title.className).toContain('text-on-surface')
      expect(title.textContent).toBe('My Title')
    })

    it('Should_display_description_with_correct_class', () => {
      toast.success('Title', 'My description')
      const desc = getDescription()
      expect(desc.className).toContain('text-on-surface-variant')
      expect(desc.className).toContain('text-xs')
      expect(desc.textContent).toBe('My description')
    })
  })

  describe('close button', () => {
    it('Should_have_close_button_with_correct_attributes', () => {
      toast.success('Title')
      const btn = getCloseBtn()
      expect(btn).not.toBeNull()
      expect(btn.getAttribute('data-toast-close')).toBe('')
      expect(btn.getAttribute('aria-label')).toBeDefined()
      expect(btn.innerHTML).toContain('close')
    })

    it('Should_close_toast_when_clicking_button', () => {
      toast.success('Title')
      const btn = getCloseBtn()
      btn.click()
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })
  })

  describe('timer bar behavior', () => {
    it('Should_have_timer_bar_when_not_persistent', () => {
      toast.success('Title')
      expect(getTimerBar()).not.toBeNull()
      expect(getTimerFill()).not.toBeNull()
    })

    it('Should_hide_timer_bar_when_config_persistent_true', () => {
      toast.error('Title')
      expect(getTimerBar().style.display).toBe('none')
    })

    it('Should_show_timer_bar_for_success_warning_info', () => {
      toast.success('S')
      expect(getTimerBar().style.display).not.toBe('none')
      ;(toast as any).container = null
      document.body.innerHTML = ''
      toast.warning('W')
      expect(getTimerBar().style.display).not.toBe('none')
      ;(toast as any).container = null
      document.body.innerHTML = ''
      toast.info('I')
      expect(getTimerBar().style.display).not.toBe('none')
    })
  })

  describe('actions', () => {
    it('Should_render_actions_when_provided', () => {
      const actionFn = vi.fn()
      toast.success('Title', 'Desc', {
        actions: [{ label: 'Undo', onClick: actionFn }]
      })
      const btn = document.querySelector('#toast-container button:not([data-toast-close])')
      expect(btn).not.toBeNull()
      expect(btn?.textContent).toBe('Undo')
    })

    it('Should_call_action_onClick', () => {
      const actionFn = vi.fn()
      toast.success('Title', 'Desc', {
        actions: [{ label: 'Action', onClick: actionFn }]
      })
      const btn = document.querySelector('#toast-container button:not([data-toast-close])')
      btn?.click()
      expect(actionFn).toHaveBeenCalled()
    })

    it('Should_have_correct_styles_for_action_error', () => {
      const actionFn = vi.fn()
      toast.error('Title', 'Desc', {
        actions: [{ label: 'Retry', onClick: actionFn }]
      })
      const btn = document.querySelector('#toast-container button:not([data-toast-close])')
      expect(btn?.className).toContain('bg-red-50')
      expect(btn?.className).toContain('text-error')
    })

    it('Should_have_correct_styles_for_action_success', () => {
      const actionFn = vi.fn()
      toast.success('Title', 'Desc', {
        actions: [{ label: 'View', onClick: actionFn }]
      })
      const btn = document.querySelector('#toast-container button:not([data-toast-close])')
      expect(btn?.className).toContain('bg-emerald-50')
      expect(btn?.className).toContain('text-emerald-800')
    })

    it('Should_have_correct_styles_for_action_warning', () => {
      const actionFn = vi.fn()
      toast.warning('Title', 'Desc', {
        actions: [{ label: 'Dismiss', onClick: actionFn }]
      })
      const btn = document.querySelector('#toast-container button:not([data-toast-close])')
      expect(btn?.className).toContain('bg-amber-50')
      expect(btn?.className).toContain('text-amber-800')
    })

    it('Should_have_correct_styles_for_action_info', () => {
      const actionFn = vi.fn()
      toast.info('Title', 'Desc', {
        actions: [{ label: 'Learn More', onClick: actionFn }]
      })
      const btn = document.querySelector('#toast-container button:not([data-toast-close])')
      expect(btn?.className).toContain('bg-surface-container')
      expect(btn?.className).toContain('text-on-surface-variant')
    })
  })

  describe('animation', () => {
    it('Should_have_initial_animation_classes', () => {
      toast.success('Title')
      const t = getToast()
      expect(t.className).toContain('opacity-0')
      expect(t.className).toContain('scale-95')
    })

    it('Should_remove_toast_after_dismiss', () => {
      toast.success('Title', 'Desc', { durationMs: 1000 })
      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })

    it('Should_add_exit_classes_before_removing', () => {
      toast.success('Title', 'Desc', { durationMs: 1000 })
      const t = getToast()
      vi.advanceTimersByTime(1000)
      expect(t.className).toContain('opacity-0')
      expect(t.className).toContain('scale-95')
    })
  })

  describe('icon styles', () => {
    it('Should_apply_fontVariationSettings_FILL_1_for_success', () => {
      toast.success('Title')
      const icon = getSquircle().querySelector('.material-symbols-outlined')
      expect(icon?.style.fontVariationSettings).toBe("'FILL' 1")
    })

    it('Should_apply_fontVariationSettings_FILL_1_for_error', () => {
      toast.error('Title')
      const icon = getSquircle().querySelector('.material-symbols-outlined')
      expect(icon?.style.fontVariationSettings).toBe("'FILL' 1")
    })

    it('Should_apply_fontVariationSettings_FILL_1_for_warning', () => {
      toast.warning('Title')
      const icon = getSquircle().querySelector('.material-symbols-outlined')
      expect(icon?.style.fontVariationSettings).toBe("'FILL' 1")
    })

    it('Should_not_apply_FILL_for_info', () => {
      toast.info('Title')
      const icon = getSquircle().querySelector('.material-symbols-outlined')
      expect(icon?.style.fontVariationSettings).not.toBe("'FILL' 1")
    })
  })

  describe('multiple toasts', () => {
    it('Should_allow_multiple_toasts', () => {
      toast.success('First')
      toast.error('Second')
      toast.warning('Third')
      const container = document.getElementById('toast-container')
      expect(container?.children.length).toBe(3)
    })

    it('Should_keep_single_container', () => {
      toast.success('A')
      toast.success('B')
      const c1 = document.getElementById('toast-container')
      toast.success('C')
      const c2 = document.getElementById('toast-container')
      expect(c1).toBe(c2)
    })
  })

  describe('TOAST_CONFIG integration', () => {
    it('Should_use_correct_config_for_each_type', () => {
      expect(TOAST_CONFIG.success.icon).toBe('check_circle')
      expect(TOAST_CONFIG.error.icon).toBe('error')
      expect(TOAST_CONFIG.warning.icon).toBe('warning')
      expect(TOAST_CONFIG.info.icon).toBe('sync')
    })

    it('Should_have_persistent_true_for_error', () => {
      expect(TOAST_CONFIG.error.persistent).toBe(true)
    })

    it('Should_have_persistent_false_for_success', () => {
      expect(TOAST_CONFIG.success.persistent).toBe(false)
    })

    it('Should_have_positive_durationMs_for_success', () => {
      expect(TOAST_CONFIG.success.durationMs).toBeGreaterThan(0)
    })

    it('Should_have_durationMs_0_for_error', () => {
      expect(TOAST_CONFIG.error.durationMs).toBe(0)
    })

    it('Should_have_squircleBg_for_each_type', () => {
      expect(TOAST_CONFIG.success.squircleBg).toBe('bg-emerald-50')
      expect(TOAST_CONFIG.error.squircleBg).toBe('bg-red-50')
      expect(TOAST_CONFIG.warning.squircleBg).toBe('bg-amber-50')
      expect(TOAST_CONFIG.info.squircleBg).toBe('bg-blue-50')
    })

    it('Should_have_squircleBorder_for_each_type', () => {
      expect(TOAST_CONFIG.success.squircleBorder).toBe('border-emerald-100')
      expect(TOAST_CONFIG.error.squircleBorder).toBe('border-red-200')
      expect(TOAST_CONFIG.warning.squircleBorder).toBe('border-amber-200')
      expect(TOAST_CONFIG.info.squircleBorder).toBe('border-blue-200')
    })

    it('Should_have_iconColor_for_each_type', () => {
      expect(TOAST_CONFIG.success.iconColor).toBe('text-emerald-600')
      expect(TOAST_CONFIG.error.iconColor).toBe('text-error')
      expect(TOAST_CONFIG.warning.iconColor).toBe('text-amber-600')
      expect(TOAST_CONFIG.info.iconColor).toBe('text-primary')
    })

    it('Should_have_timerColor_for_each_type', () => {
      expect(TOAST_CONFIG.success.timerColor).toBe('bg-emerald-500')
      expect(TOAST_CONFIG.error.timerColor).toBe('bg-error')
      expect(TOAST_CONFIG.warning.timerColor).toBe('bg-amber-500')
      expect(TOAST_CONFIG.info.timerColor).toBe('bg-primary')
    })
  })

  describe('timer behavior - edge cases', () => {
    it('Should_not_start_timer_when_durationMs_zero_or_negative', () => {
      toast.success('Title', 'Desc', { durationMs: 0 })
      vi.advanceTimersByTime(1000)
      expect(getToast()).not.toBeNull()

      ;(toast as any).container = null
      document.body.innerHTML = ''

      toast.success('Title', 'Desc', { durationMs: -100 })
      vi.advanceTimersByTime(1000)
      expect(getToast()).not.toBeNull()
    })

    it('Should_use_durationMs_from_config_when_not_provided', () => {
      const configDuration = TOAST_CONFIG.success.durationMs
      toast.success('Title', 'Desc')
      vi.advanceTimersByTime(configDuration)
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })

    it('Should_pause_and_resume_timer_correctly', () => {
      toast.success('Title', 'Desc', { durationMs: 5000 })
      const timerFill = getTimerFill()
      
      // Pause
      getToast().dispatchEvent(new Event('mouseenter'))
      expect(timerFill.style.animationPlayState).toBe('paused')
      
      // Resume
      getToast().dispatchEvent(new Event('mouseleave'))
      expect(timerFill.style.animationPlayState).toBe('running')
    })

    it('Should_not_pause_if_already_paused', () => {
      toast.success('Title', 'Desc', { durationMs: 5000 })
      const timerFill = getTimerFill()
      
      getToast().dispatchEvent(new Event('mouseenter'))
      const firstPause = timerFill.style.animationPlayState
      
      getToast().dispatchEvent(new Event('mouseenter'))
      expect(timerFill.style.animationPlayState).toBe(firstPause)
    })

    it('Should_not_start_timer_for_persistent_toast', () => {
      toast.error('Title', 'Desc')
      vi.advanceTimersByTime(10000)
      expect(getToast()).not.toBeNull()
    })

    it('Should_allow_override_durationMs_for_non_persistent_type', () => {
      toast.success('Title', 'Desc', { durationMs: 1000 })
      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })
  })

  describe('dismissToast - edge cases', () => {
    it('Should_clear_timeoutId_on_dismiss', () => {
      toast.success('Title', 'Desc', { durationMs: 1000 })
      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })

    it('Should_add_exit_classes_and_remove_after_200ms', () => {
      toast.success('Title', 'Desc', { durationMs: 1000 })
      const t = getToast()
      
      vi.advanceTimersByTime(1000)
      expect(t.className).toContain('opacity-0')
      expect(t.className).toContain('scale-95')
      
      vi.advanceTimersByTime(200)
      expect(getToast()).toBeNull()
    })
  })

  describe('createToastElement - edge cases', () => {
    it('Should_create_toast_base_with_all_classes', () => {
      toast.success('Title')
      const t = getToast()
      expect(t.className).toContain('pointer-events-auto')
      expect(t.className).toContain('relative')
      expect(t.className).toContain('group')
      expect(t.className).toContain('overflow-hidden')
      expect(t.className).toContain('bg-surface-container-lowest')
      expect(t.className).toContain('rounded-2xl')
      expect(t.className).toContain('border')
      expect(t.className).toContain('border-outline-variant/40')
      expect(t.className).toContain('shadow-xl')
      expect(t.className).toContain('p-4')
      expect(t.className).toContain('transition-all')
      expect(t.className).toContain('duration-200')
      expect(t.className).toContain('hover:shadow-2xl')
      expect(t.className).toContain('hover:translate-y-[-2px]')
      expect(t.className).toContain('opacity-0')
      expect(t.className).toContain('scale-95')
      expect(t.className).toContain('transform-gpu')
    })

    it('Should_create_flex_row_with_gap', () => {
      toast.success('Title')
      const flexRow = getToast().querySelector('.flex.items-start.gap-3\\.5')
      expect(flexRow).not.toBeNull()
    })

    it('Should_create_squircle_with_correct_classes', () => {
      toast.success('Title')
      const s = getSquircle()
      expect(s.className).toContain('w-10')
      expect(s.className).toContain('h-10')
      expect(s.className).toContain('rounded-xl')
      expect(s.className).toContain('flex')
      expect(s.className).toContain('items-center')
      expect(s.className).toContain('justify-center')
      expect(s.className).toContain('shrink-0')
      expect(s.className).toContain('shadow-xs')
      expect(s.className).toContain('border')
    })

    it('Should_apply_icon_styles_for_each_type', () => {
      const types: Array<{type: string, checkFill: boolean, checkSpin: boolean}> = [
        { type: 'success', checkFill: true, checkSpin: false },
        { type: 'error', checkFill: true, checkSpin: false },
        { type: 'warning', checkFill: true, checkSpin: false },
        { type: 'info', checkFill: false, checkSpin: true },
      ]
      
      for (const {type, checkFill, checkSpin} of types) {
        ;(toast as any).container = null
        document.body.innerHTML = ''
        ;(toast as any)[type]('Title')
        const icon = getSquircle().querySelector('.material-symbols-outlined')
        
        if (checkFill) {
          expect(icon?.style.fontVariationSettings).toBe("'FILL' 1")
        } else {
          expect(icon?.style.fontVariationSettings).not.toBe("'FILL' 1")
        }
        
        if (checkSpin) {
          expect(icon?.className).toContain('animate-spin')
        } else {
          expect(icon?.className).not.toContain('animate-spin')
        }
      }
    })

    it('Should_create_content_with_title_and_description', () => {
      toast.success('My Title', 'My description')
      const content = getToast().querySelector('.flex-1.min-w-0.pr-2')
      expect(content).not.toBeNull()
      
      const title = getTitle()
      expect(title.className).toContain('font-label-md')
      expect(title.className).toContain('text-label-md')
      expect(title.className).toContain('font-bold')
      expect(title.className).toContain('text-on-surface')
      expect(title.textContent).toBe('My Title')
      
      const desc = getDescription()
      expect(desc.className).toContain('font-body-md')
      expect(desc.className).toContain('text-on-surface-variant')
      expect(desc.className).toContain('mt-0.5')
      expect(desc.className).toContain('text-xs')
      expect(desc.textContent).toBe('My description')
    })

    it('De_criar_actions_container_quando_actions_fornecidas', () => {
      const actionFn = vi.fn()
      toast.success('Title', 'Desc', {
        actions: [{ label: 'Action1', onClick: actionFn }, { label: 'Action2', onClick: actionFn }]
      })
      
      const actionsContainer = getToast().querySelector('.mt-3.flex.items-center.gap-2')
      expect(actionsContainer).not.toBeNull()
      
      const buttons = actionsContainer?.querySelectorAll('button:not([data-toast-close])')
      expect(buttons?.length).toBe(2)
      expect(buttons?.[0].textContent).toBe('Action1')
      expect(buttons?.[1].textContent).toBe('Action2')
    })

    it('De_criar_close_button_com_atributos_corretos', () => {
      toast.success('Title')
      const btn = getCloseBtn()
      expect(btn.type).toBe('button')
      expect(btn.getAttribute('data-toast-close')).toBe('')
      expect(btn.getAttribute('aria-label')).toBeDefined()
      expect(btn.className).toContain('text-outline')
      expect(btn.className).toContain('hover:text-on-surface')
      expect(btn.className).toContain('rounded-lg')
      expect(btn.className).toContain('p-1')
      expect(btn.className).toContain('transition-colors')
      expect(btn.className).toContain('shrink-0')
      expect(btn.innerHTML).toContain('close')
    })

    it('De_criar_timer_bar_com_timer_fill', () => {
      toast.success('Title')
      const timerBar = getTimerBar()
      const timerFill = getTimerFill()
      
      expect(timerBar.className).toContain('absolute')
      expect(timerBar.className).toContain('bottom-0')
      expect(timerBar.className).toContain('left-0')
      expect(timerBar.className).toContain('right-0')
      expect(timerBar.className).toContain('h-1')
      expect(timerBar.className).toContain('bg-surface-container')
      
      expect(timerFill.className).toContain('h-full')
      expect(timerFill.className).toContain('timer-drain')
      expect(timerFill.style.animationDuration).toBe(`${TOAST_CONFIG.success.durationMs}ms`)
    })

    it('De_ocultar_timer_bar_quando_persistent', () => {
      toast.error('Title')
      const timerBar = getTimerBar()
      expect(timerBar.style.display).toBe('none')
    })

    it('De_aplicar_estilos_action_por_tipo', () => {
      const types = [
        { type: 'error', bg: 'bg-red-50', text: 'text-error', hover: 'hover:bg-red-100' },
        { type: 'warning', bg: 'bg-amber-50', text: 'text-amber-800', hover: 'hover:bg-amber-100' },
        { type: 'success', bg: 'bg-emerald-50', text: 'text-emerald-800', hover: 'hover:bg-emerald-100' },
        { type: 'info', bg: 'bg-surface-container', text: 'text-on-surface-variant', hover: 'hover:bg-surface-container-high' },
      ]
      
      for (const {type, bg, text, hover} of types) {
        ;(toast as any).container = null
        document.body.innerHTML = ''
        const actionFn = vi.fn()
        ;(toast as any)[type]('Title', 'Desc', { actions: [{ label: 'Action', onClick: actionFn }] })
        
        const btn = document.querySelector('#toast-container button:not([data-toast-close])')
        expect(btn?.className).toContain(bg)
        expect(btn?.className).toContain(text)
        expect(btn?.className).toContain(hover)
      }
    })
  })

  describe('animateIn', () => {
    it('De_ter_classes_iniciais_de_animacao', () => {
      toast.success('Title')
      const t = getToast()
      
      // Initially has opacity-0 and scale-95
      expect(t.className).toContain('opacity-0')
      expect(t.className).toContain('scale-95')
    })
  })

  describe('getActionStyles', () => {
    it('De_retornar_estilos_corretos_para_cada_tipo', () => {
      const service = toast as any
      expect(service.getActionStyles('error')).toBe('bg-red-50 text-error hover:bg-red-100')
      expect(service.getActionStyles('warning')).toBe('bg-amber-50 text-amber-800 hover:bg-amber-100')
      expect(service.getActionStyles('success')).toBe('bg-emerald-50 text-emerald-800 hover:bg-emerald-100')
      expect(service.getActionStyles('info')).toBe('bg-surface-container text-on-surface-variant hover:bg-surface-container-high')
      expect(service.getActionStyles('unknown')).toBe('bg-surface-container text-on-surface-variant hover:bg-surface-container-high')
    })
  })

  describe('applyIconStyles', () => {
    it('De_aplicar_FILL_1_para_success_error_warning', () => {
      const service = toast as any
      const icon = document.createElement('span')
      
      service.applyIconStyles(icon, 'success')
      expect(icon.style.fontVariationSettings).toBe("'FILL' 1")
      
      service.applyIconStyles(icon, 'error')
      expect(icon.style.fontVariationSettings).toBe("'FILL' 1")
      
      service.applyIconStyles(icon, 'warning')
      expect(icon.style.fontVariationSettings).toBe("'FILL' 1")
    })

    it('De_aplicar_animate_spin_para_info', () => {
      const service = toast as any
      const icon = document.createElement('span')
      icon.className = 'material-symbols-outlined'
      
      service.applyIconStyles(icon, 'info')
      expect(icon.className).toContain('animate-spin')
      expect(icon.className).toContain('text-base')
    })

    it('De_nao_aplicar_FILL_para_info', () => {
      const service = toast as any
      const icon = document.createElement('span')
      
      service.applyIconStyles(icon, 'info')
      expect(icon.style.fontVariationSettings).not.toBe("'FILL' 1")
    })
  })

  describe('createTimerBar', () => {
    it('De_definir_animationDuration_quando_nao_persistent', () => {
      const service = toast as any
      const config = TOAST_CONFIG.success
      const { timerFill } = service.createTimerBar(config)
      expect(timerFill.style.animationDuration).toBe(`${config.durationMs}ms`)
    })

    it('De_nao_definir_animationDuration_quando_persistent', () => {
      const service = toast as any
      const config = TOAST_CONFIG.error
      const { timerFill } = service.createTimerBar(config)
      expect(timerFill.style.animationDuration).toBe('')
    })
  })

  describe('pauseTimer e resumeTimer', () => {
    it('De_nao_fazer_nada_se_persistent', () => {
      toast.error('Title')
      const timerFill = getTimerFill()
      const initialState = timerFill.style.animationPlayState
      
      getToast().dispatchEvent(new Event('mouseenter'))
      expect(timerFill.style.animationPlayState).toBe(initialState)
    })

    it('De_nao_pausar_se_ja_pausado', () => {
      toast.success('Title', 'Desc', { durationMs: 5000 })
      const timerFill = getTimerFill()
      
      getToast().dispatchEvent(new Event('mouseenter'))
      const firstPause = timerFill.style.animationPlayState
      
      getToast().dispatchEvent(new Event('mouseenter'))
      expect(timerFill.style.animationPlayState).toBe(firstPause)
    })

    it('De_manter_animationPlayState_running_quando_nao_pausado', () => {
      toast.success('Title', 'Desc', { durationMs: 5000 })
      const timerFill = getTimerFill()
      
      getToast().dispatchEvent(new Event('mouseleave'))
      // Default is 'running' or empty (which means running)
      expect(timerFill.style.animationPlayState).not.toBe('paused')
    })
  })

  describe('createContent - edge cases', () => {
    it('De_nao_criar_description_quando_undefined', () => {
      toast.success('Apenas Titulo')
      expect(getDescription()).toBeNull()
    })

    it('De_nao_criar_actions_container_quando_vazio', () => {
      toast.success('Title', 'Desc', { actions: [] })
      const actionsContainer = getToast().querySelector('.mt-3.flex.items-center.gap-2')
      expect(actionsContainer).toBeNull()
    })

    it('De_nao_criar_actions_container_quando_undefined', () => {
      toast.success('Title', 'Desc')
      const actionsContainer = getToast().querySelector('.mt-3.flex.items-center.gap-2')
      expect(actionsContainer).toBeNull()
    })
  })
})