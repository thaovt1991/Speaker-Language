export interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface SpeechLanguageOption {
  code: string;
  label: string;
  shortLabel: string;
  punctuations: readonly string[];
  usesSpaces: boolean;
}

export interface TranscriptHistoryItem {
  id: string;
  text: string;
  language: string;
  createdAt: number;
}

const LATIN_PUNCTUATION = ['.', ',', '?', '!'] as const;
const JAPANESE_PUNCTUATION = ['。', '、', '？', '！'] as const;

export const SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  {
    code: 'vi-VN',
    label: 'Tiếng Việt',
    shortLabel: 'Việt',
    punctuations: LATIN_PUNCTUATION,
    usesSpaces: true,
  },
  {
    code: 'ja-JP',
    label: 'Tiếng Nhật (日本語)',
    shortLabel: '日本語',
    punctuations: JAPANESE_PUNCTUATION,
    usesSpaces: false,
  },
  {
    code: 'en-US',
    label: 'English (US)',
    shortLabel: 'EN',
    punctuations: LATIN_PUNCTUATION,
    usesSpaces: true,
  },
  {
    code: 'en-GB',
    label: 'English (UK)',
    shortLabel: 'UK',
    punctuations: LATIN_PUNCTUATION,
    usesSpaces: true,
  },
  {
    code: 'ko-KR',
    label: '한국어',
    shortLabel: '한국어',
    punctuations: LATIN_PUNCTUATION,
    usesSpaces: true,
  },
  {
    code: 'zh-CN',
    label: '中文 (简体)',
    shortLabel: '中文',
    punctuations: ['。', '，', '？', '！'],
    usesSpaces: false,
  },
  {
    code: 'fr-FR',
    label: 'Français',
    shortLabel: 'FR',
    punctuations: LATIN_PUNCTUATION,
    usesSpaces: true,
  },
  {
    code: 'de-DE',
    label: 'Deutsch',
    shortLabel: 'DE',
    punctuations: LATIN_PUNCTUATION,
    usesSpaces: true,
  },
];

export const QUICK_LANGUAGE_CODES = ['vi-VN', 'ja-JP'] as const;

export function getLanguageOption(code: string): SpeechLanguageOption | undefined {
  return SPEECH_LANGUAGES.find((item) => item.code === code);
}

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}
