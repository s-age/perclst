import { useState, useEffect } from 'react'
import { useInput } from 'ink'
import type { Key } from 'ink'
import type { QuestionPipeService } from '@src/services/questionPipeService'
import type { ChoiceRequest } from '@src/types/questionPipe'

export type UseChoiceResult = {
  choiceRequest: ChoiceRequest | null
  isTextMode: boolean
  textInput: string
}

type ChoiceInputState = {
  isTextMode: boolean
  textInput: string
}

type ChoiceKeyResult = ChoiceInputState & { responded: boolean }

type ChoiceInputEvent = { input: string; key: Key }

export function handleChoiceKey(
  state: ChoiceInputState,
  choiceRequest: ChoiceRequest,
  event: ChoiceInputEvent,
  service: Pick<QuestionPipeService, 'respond'>
): ChoiceKeyResult {
  const { input, key } = event
  if (state.isTextMode) {
    if (key.return) {
      service.respond({ type: 'other', message: state.textInput })
      return { isTextMode: false, textInput: '', responded: true }
    } else if (key.backspace || key.delete) {
      return { ...state, textInput: state.textInput.slice(0, -1), responded: false }
    } else if (!key.ctrl && !key.meta && input) {
      return { ...state, textInput: state.textInput + input, responded: false }
    }
    return { ...state, responded: false }
  }

  const num = parseInt(input, 10)
  if (isNaN(num)) return { ...state, responded: false }

  if (num >= 1 && num <= choiceRequest.choices.length) {
    const idx = num - 1
    service.respond({ type: 'choice', selected: choiceRequest.choices[idx], index: idx })
    return { isTextMode: false, textInput: '', responded: true }
  } else if (num === choiceRequest.choices.length + 1) {
    return { isTextMode: true, textInput: state.textInput, responded: false }
  }
  return { ...state, responded: false }
}

export function useChoice(service: QuestionPipeService | null): UseChoiceResult {
  const [choiceRequest, setChoiceRequest] = useState<ChoiceRequest | null>(null)
  const [isTextMode, setIsTextMode] = useState(false)
  const [textInput, setTextInput] = useState('')

  useEffect(() => {
    if (!service) return
    const interval = setInterval(() => {
      const req = service.pollRequest()
      if (req) setChoiceRequest(req)
    }, 100)
    return (): void => clearInterval(interval)
  }, [service])

  useInput((input, key): void => {
    if (!choiceRequest || !service) return
    const next = handleChoiceKey({ isTextMode, textInput }, choiceRequest, { input, key }, service)
    if (next.responded) setChoiceRequest(null)
    setIsTextMode(next.isTextMode)
    setTextInput(next.textInput)
  })

  return { choiceRequest, isTextMode, textInput }
}
