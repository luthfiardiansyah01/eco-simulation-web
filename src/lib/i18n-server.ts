import { cookies } from 'next/headers'
import {
  LANGUAGE_COOKIE,
  createTranslator,
  normalizeLanguage,
  type Language,
  type Translator,
} from './i18n'

export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies()
  return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value)
}

export async function getTranslator(): Promise<{
  language: Language
  t: Translator
}> {
  const language = await getLanguage()
  return { language, t: createTranslator(language) }
}
