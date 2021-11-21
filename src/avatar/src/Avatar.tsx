import { h, ref, computed, defineComponent, PropType, watch } from 'vue'
import { VResizeObserver } from 'vueuc'
import { useConfig, useTheme } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import { avatarLight } from '../styles'
import type { AvatarTheme } from '../styles'
import { createKey } from '../../_utils'
import type { ExtractPublicPropTypes } from '../../_utils'
import style from './styles/index.cssr'
import FallbackImage from '../../_internal/fallback-image'

const avatarProps = {
  ...(useTheme.props as ThemeProps<AvatarTheme>),
  size: {
    type: [String, Number] as PropType<number | 'small' | 'medium' | 'large'>,
    default: 'medium'
  },
  src: String,
  circle: Boolean,
  color: String,
  objectFit: {
    type: String as PropType<
    'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
    >,
    default: 'fill'
  },
  round: Boolean,
  onError: Function as PropType<(e: Event) => void>,
  fallbackSrc: {
    type: String,
    default: undefined
  }
} as const

export const avatarEmits = {
  error: (evt: Event) => evt instanceof Event
}
export type AvatarEmits = typeof avatarEmits

export type AvatarProps = ExtractPublicPropTypes<typeof avatarProps>

export default defineComponent({
  name: 'Avatar',
  props: avatarProps,
  emits: avatarEmits,
  setup (props, { emit }) {
    const { mergedClsPrefixRef } = useConfig(props)
    const hasloadErrorRef = ref(false)
    let memoedTextHtml: string | null = null
    const textRef = ref<HTMLElement | null>(null)
    const selfRef = ref<HTMLElement | null>(null)
    const fitTextTransform = (): void => {
      const { value: textEl } = textRef
      if (textEl) {
        if (memoedTextHtml === null || memoedTextHtml !== textEl.innerHTML) {
          memoedTextHtml = textEl.innerHTML
          const { value: selfEl } = selfRef
          if (selfEl) {
            const { offsetWidth: elWidth, offsetHeight: elHeight } = selfEl
            const { offsetWidth: textWidth, offsetHeight: textHeight } = textEl
            const radix = 0.9
            const ratio = Math.min(
              (elWidth / textWidth) * radix,
              (elHeight / textHeight) * radix,
              1
            )
            textEl.style.transform = `translateX(-50%) translateY(-50%) scale(${ratio})`
          }
        }
      }
    }
    const themeRef = useTheme(
      'Avatar',
      'Avatar',
      style,
      avatarLight,
      props,
      mergedClsPrefixRef
    )
    const handleError = (e: Event): void => {
      hasloadErrorRef.value = true
      const { onError } = props
      if (onError) {
        onError(e)
      }
      emit('error', e)
    }
    watch(
      () => props.src,
      () => (hasloadErrorRef.value = false)
    )
    return {
      textRef,
      selfRef,
      mergedClsPrefix: mergedClsPrefixRef,
      fitTextTransform,
      cssVars: computed(() => {
        const { size, round, circle } = props
        const {
          self: { borderRadius, fontSize, color },
          common: { cubicBezierEaseInOut }
        } = themeRef.value
        let height: string
        if (typeof size === 'number') {
          height = `${size}px`
        } else {
          height = themeRef.value.self[createKey('height', size)]
        }
        return {
          '--font-size': fontSize,
          '--border-radius': round || circle ? '50%' : borderRadius,
          '--color': color,
          '--bezier': cubicBezierEaseInOut,
          '--size': height
        }
      }),
      hasloadErrorRef,
      handleError
    }
  },
  render () {
    const { $slots, src, mergedClsPrefix } = this
    let child = (
      <img
        ref="imageRef"
        src={src}
        onError={this.handleError}
        style={{ objectFit: this.objectFit }}
      />
    )
    if (this.hasloadErrorRef) {
      child = <FallbackImage fallbackSrc={this.fallbackSrc} />
    } else if (!(!$slots.default && src)) {
      child = (
        <VResizeObserver onResize={this.fitTextTransform}>
          {{
            default: () => (
              <span
                ref="textRef"
                class={`${mergedClsPrefix}-avatar__text`}
                style={{ background: this.color }}
              >
                {$slots}
              </span>
            )
          }}
        </VResizeObserver>
      )
    }

    return (
      <span
        ref="selfRef"
        class={`${mergedClsPrefix}-avatar`}
        style={this.cssVars as any}
      >
        {child}
      </span>
    )
  }
})
