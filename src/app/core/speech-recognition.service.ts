import { Injectable, computed, signal } from '@angular/core';

import {
  QUICK_LANGUAGE_CODES,
  SPEECH_LANGUAGES,
  SpeechRecognitionLike,
  TranscriptHistoryItem,
  getLanguageOption,
  getSpeechRecognitionConstructor,
} from './speech-recognition.types';

const HISTORY_STORAGE_KEY = 'qlat.speech-history';
const LANGUAGE_STORAGE_KEY = 'qlat.speech-language';
const MAX_HISTORY_ITEMS = 30;

@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
  private recognition: SpeechRecognitionLike | null = null;
  private shouldKeepListening = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  readonly languages = SPEECH_LANGUAGES;
  readonly quickLanguages = SPEECH_LANGUAGES.filter((item) =>
    QUICK_LANGUAGE_CODES.includes(item.code as (typeof QUICK_LANGUAGE_CODES)[number]),
  );
  readonly isSupported = signal(!!getSpeechRecognitionConstructor());
  readonly isListening = signal(false);
  readonly language = signal(this.readLanguage());
  readonly errorMessage = signal<string | null>(null);
  readonly finalText = signal('');
  readonly interimText = signal('');
  readonly lastConfidence = signal<number | null>(null);
  readonly copied = signal(false);
  readonly history = signal<TranscriptHistoryItem[]>(this.readHistory());

  readonly languageOption = computed(
    () => getLanguageOption(this.language()) ?? this.languages[0],
  );
  readonly languageLabel = computed(() => this.languageOption().label);
  readonly punctuations = computed(() => this.languageOption().punctuations);
  readonly isJapanese = computed(() => this.language().startsWith('ja'));

  readonly hasTranscript = computed(
    () => this.finalText().trim().length > 0 || this.interimText().trim().length > 0,
  );

  start(): void {
    if (!this.isSupported()) {
      this.errorMessage.set('Trình duyệt không hỗ trợ nhận dạng tiếng nói. Hãy dùng Chrome hoặc Edge.');
      return;
    }

    this.errorMessage.set(null);
    this.interimText.set('');
    this.shouldKeepListening = true;
    this.ensureRecognition();

    try {
      this.recognition?.start();
    } catch {
      // Chrome throws if recognition is already running.
    }
  }

  stop(): void {
    this.shouldKeepListening = false;
    this.clearRestartTimer();
    this.recognition?.stop();
    this.isListening.set(false);
  }

  toggle(): void {
    if (this.isListening()) {
      this.stop();
      return;
    }

    this.start();
  }

  setLanguage(code: string): void {
    if (this.language() === code) {
      return;
    }

    this.language.set(code);
    this.persistLanguage(code);

    if (!this.isListening()) {
      return;
    }

    this.stop();
    this.start();
  }

  appendPunctuation(mark: string): void {
    const current = this.finalText().trimEnd();
    if (!current) {
      return;
    }

    const suffix = this.languageOption().usesSpaces ? ' ' : '';
    this.finalText.set(`${current}${mark}${suffix}`);
  }

  clearTranscript(): void {
    this.finalText.set('');
    this.interimText.set('');
    this.lastConfidence.set(null);
    this.errorMessage.set(null);
  }

  saveToHistory(): void {
    const text = this.finalText().trim();
    if (!text) {
      return;
    }

    const item: TranscriptHistoryItem = {
      id: crypto.randomUUID(),
      text,
      language: this.language(),
      createdAt: Date.now(),
    };

    this.history.update((items) => [item, ...items].slice(0, MAX_HISTORY_ITEMS));
    this.persistHistory();
  }

  restoreHistoryItem(id: string): void {
    const item = this.history().find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    this.finalText.set(item.text);
    this.interimText.set('');
    this.setLanguage(item.language);
  }

  removeHistoryItem(id: string): void {
    this.history.update((items) => items.filter((item) => item.id !== id));
    this.persistHistory();
  }

  clearHistory(): void {
    this.history.set([]);
    this.persistHistory();
  }

  async copyTranscript(): Promise<void> {
    const text = this.finalText().trim();
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  downloadTranscript(): void {
    const text = this.finalText().trim();
    if (!text) {
      return;
    }

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ban-ghi-${stamp}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private ensureRecognition(): void {
    if (this.recognition) {
      this.recognition.lang = this.language();
      return;
    }

    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      this.isSupported.set(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = this.language();

    recognition.onstart = () => {
      this.isListening.set(true);
      this.errorMessage.set(null);
    };

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      let confidence: number | null = null;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result[0];
        if (!alternative) {
          continue;
        }

        if (result.isFinal) {
          finalChunk += alternative.transcript;
          confidence = alternative.confidence;
        } else {
          interimChunk += alternative.transcript;
        }
      }

      if (finalChunk) {
        this.finalText.update((current) => this.mergeTranscript(current, finalChunk));
        this.lastConfidence.set(confidence);
      }

      this.interimText.set(interimChunk);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      this.shouldKeepListening = false;
      this.errorMessage.set(this.mapError(event.error));
    };

    recognition.onend = () => {
      this.isListening.set(false);
      this.interimText.set('');

      if (!this.shouldKeepListening) {
        return;
      }

      this.clearRestartTimer();
      this.restartTimer = setTimeout(() => {
        if (!this.shouldKeepListening) {
          return;
        }

        try {
          recognition.start();
        } catch {
          this.shouldKeepListening = false;
        }
      }, 180);
    };

    this.recognition = recognition;
  }

  private mergeTranscript(current: string, incoming: string): string {
    const option = this.languageOption();
    const next = option.usesSpaces ? incoming.trim() : incoming.replace(/\s+/g, '').trim();
    if (!next) {
      return current;
    }

    if (!current.trim()) {
      const prepared = option.usesSpaces ? this.capitalize(next) : next;
      return prepared + (option.usesSpaces && this.endsWithSentence(next) ? ' ' : '');
    }

    if (!option.usesSpaces) {
      return `${current.trimEnd()}${next}`;
    }

    const separator = current.endsWith(' ') || current.endsWith('\n') ? '' : ' ';
    return `${current}${separator}${next} `;
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private endsWithSentence(value: string): boolean {
    return /[.!?…。？！]$/.test(value.trim());
  }

  private mapError(code: string): string {
    switch (code) {
      case 'not-allowed':
        return 'Trình duyệt đã chặn micro. Hãy cho phép quyền microphone rồi thử lại.';
      case 'audio-capture':
        return 'Không tìm thấy micro. Kiểm tra thiết bị thu âm rồi thử lại.';
      case 'network':
        return 'Nhận dạng cần kết nối mạng (Chrome/Edge dùng dịch vụ nhận dạng trực tuyến).';
      case 'language-not-supported':
        return 'Ngôn ngữ này chưa được trình duyệt hỗ trợ.';
      case 'service-not-allowed':
        return 'Dịch vụ nhận dạng không khả dụng trên trình duyệt hiện tại.';
      default:
        return `Không nhận dạng được giọng nói (${code}).`;
    }
  }

  private readHistory(): TranscriptHistoryItem[] {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as TranscriptHistoryItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private readLanguage(): string {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && getLanguageOption(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage errors (private mode, tests without a full storage API).
    }

    return 'vi-VN';
  }

  private persistLanguage(code: string): void {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  }

  private persistHistory(): void {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history()));
  }

  private clearRestartTimer(): void {
    if (!this.restartTimer) {
      return;
    }

    clearTimeout(this.restartTimer);
    this.restartTimer = null;
  }
}
