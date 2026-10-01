import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ThemeService } from './ThemeService'

describe('ThemeService', () => {
  let service: ThemeService

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    document.body.innerHTML = `
      <div id="theme-icon"></div>
      <button id="theme-btn"></button>
    `
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
    service = new ThemeService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('init', () => {
    it('Deve_aplicar_modo_escuro_salvo_no_localStorage', () => {
      localStorage.setItem('darkMode', 'true')
      service.init()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.getElementById('theme-icon')?.textContent).toBe('light_mode')
    })

    it('Deve_aplicar_modo_escuro_padrao_quando_preferir_sistema_escuro', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
      } as MediaQueryList)

      service.init()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('Deve_toggle_modo_entre_claro_e_escuro', () => {
      service.init()
      ;(service as any).toggle()
      expect(localStorage.getItem('darkMode')).toBe('true')
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      ;(service as any).toggle()
      expect(localStorage.getItem('darkMode')).toBe('false')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('init - edge cases', () => {
    it('Deve_nao_aplicar_modo_escuro_quando_localStorage_false', () => {
      localStorage.setItem('darkMode', 'false')
      service.init()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      // applyDark nao e chamado, entao textContent permanece vazio
      expect(document.getElementById('theme-icon')?.textContent).toBe('')
    })

    it('Deve_nao_aplicar_modo_escuro_quando_localStorage_ausente_e_sistema_claro', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: false,
      } as MediaQueryList)

      service.init()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(document.getElementById('theme-icon')?.textContent).toBe('')
    })

    it('Deve_nao_lancar_erro_quando_iconElement_ausente', () => {
      document.getElementById('theme-icon')?.remove()
      expect(() => service.init()).not.toThrow()
    })

    it('Deve_nao_lancar_erro_quando_buttonElement_ausente', () => {
      document.getElementById('theme-btn')?.remove()
      expect(() => service.init()).not.toThrow()
    })

    it('Deve_nao_adicionar_listener_quando_button_ausente', () => {
      document.getElementById('theme-btn')?.remove()
      const addSpy = vi.spyOn(document, 'addEventListener')
      service.init()
      expect(addSpy).not.toHaveBeenCalled()
    })

    it('Deve_adicionar_click_listener_ao_button', () => {
      const btn = document.getElementById('theme-btn')!
      const addSpy = vi.spyOn(btn, 'addEventListener')
      service.init()
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })

  describe('applyDark - edge cases', () => {
    it('Deve_adicionar_classe_dark_quando_true', () => {
      ;(service as any).applyDark(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('Deve_remover_classe_dark_quando_false', () => {
      document.documentElement.classList.add('dark')
      ;(service as any).applyDark(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('Deve_definir_icon_textContent_light_mode_quando_true', () => {
      ;(service as any).applyDark(true)
      expect(document.getElementById('theme-icon')?.textContent).toBe('light_mode')
    })

    it('Deve_definir_icon_textContent_dark_mode_quando_false', () => {
      ;(service as any).applyDark(false)
      expect(document.getElementById('theme-icon')?.textContent).toBe('dark_mode')
    })

    it('Deve_nao_lancar_erro_quando_icon_ausente', () => {
      document.getElementById('theme-icon')?.remove()
      expect(() => (service as any).applyDark(true)).not.toThrow()
      expect(() => (service as any).applyDark(false)).not.toThrow()
    })
  })

  describe('toggle - edge cases', () => {
    it('Deve_alternar_de_false_para_true', () => {
      service.init()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      ;(service as any).toggle()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem('darkMode')).toBe('true')
    })

    it('Deve_alternar_de_true_para_false', () => {
      service.init()
      ;(service as any).toggle()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      ;(service as any).toggle()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorage.getItem('darkMode')).toBe('false')
    })

    it('Deve_chamar_applyDark_com_valor_correto', () => {
      service.init()
      const applyDarkSpy = vi.spyOn(service as any, 'applyDark')
      ;(service as any).toggle()
      expect(applyDarkSpy).toHaveBeenCalledWith(true)
      ;(service as any).toggle()
      expect(applyDarkSpy).toHaveBeenCalledWith(false)
    })
  })

  describe('constructor - edge cases', () => {
    it('Deve_definir_iconElement_null_quando_ausente', () => {
      document.body.innerHTML = '<button id="theme-btn"></button>'
      const newService = new ThemeService()
      expect((newService as any).iconElement).toBeNull()
    })

    it('Deve_definir_buttonElement_null_quando_ausente', () => {
      document.body.innerHTML = '<div id="theme-icon"></div>'
      const newService = new ThemeService()
      expect((newService as any).buttonElement).toBeNull()
    })

    it('Deve_definir_ambos_null_quando_ausentes', () => {
      document.body.innerHTML = ''
      const newService = new ThemeService()
      expect((newService as any).iconElement).toBeNull()
      expect((newService as any).buttonElement).toBeNull()
    })
  })
})