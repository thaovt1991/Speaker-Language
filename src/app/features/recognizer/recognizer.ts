import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';

import { SpeechRecognitionService } from '../../core/speech-recognition.service';

@Component({
  selector: 'app-recognizer',
  imports: [DatePipe],
  templateUrl: './recognizer.html',
  styleUrl: './recognizer.scss',
})
export class Recognizer {
  protected readonly speech = inject(SpeechRecognitionService);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.speech.stop());
  }

  protected confidencePercent(): string {
    const confidence = this.speech.lastConfidence();
    if (confidence === null || Number.isNaN(confidence)) {
      return '—';
    }

    return `${Math.round(confidence * 100)}%`;
  }

  protected onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.speech.setLanguage(select.value);
  }
}
