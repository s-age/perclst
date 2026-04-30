import { useState, useEffect } from 'react'
import { useInput } from 'ink'
import type { QuestionPipeService } from '@src/services/questionPipeService'
import type { ChoiceRequest } from '@src/types/questionPipe'

export type UseChoiceResult = {
  choiceRequest: ChoiceRequest | null
  isTextMode: boolean
  textInput: string
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

    if (isTextMode) {
      if (key.return) {
        service.respond({ type: 'other', message: textInput })
        setChoiceRequest(null)
        setTextInput('')
        setIsTextMode(false)
      } else if (key.backspace || key.delete) {
        setTextInput((prev) => prev.slice(0, -1))
      } else if (!key.ctrl && !key.meta && input) {
        setTextInput((prev) => prev + input)
      }
      return
    }

    const num = parseInt(input, 10)
    if (isNaN(num)) return

    if (num >= 1 && num <= choiceRequest.choices.length) {
      const idx = num - 1
      service.respond({ type: 'choice', selected: choiceRequest.choices[idx], index: idx })
      setChoiceRequest(null)
    } else if (num === choiceRequest.choices.length + 1) {
      setIsTextMode(true)
    }
  })

  return { choiceRequest, isTextMode, textInput }
}
