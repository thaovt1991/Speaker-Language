import { TestBed } from '@angular/core/testing';

import { SpeechRecognitionService } from './speech-recognition.service';

describe('SpeechRecognitionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts unsupported when the browser has no SpeechRecognition API', () => {
    const service = TestBed.inject(SpeechRecognitionService);
    expect(service.isSupported()).toBe(false);
    expect(service.isListening()).toBe(false);
  });

  it('merges saved history from localStorage', () => {
    localStorage.setItem(
      'qlat.speech-history',
      JSON.stringify([
        { id: '1', text: 'Xin chào', language: 'vi-VN', createdAt: 1 },
      ]),
    );

    const service = TestBed.inject(SpeechRecognitionService);
    expect(service.history()[0]?.text).toBe('Xin chào');
  });

  it('switches to Japanese recognition language ja-JP', () => {
    const service = TestBed.inject(SpeechRecognitionService);
    service.setLanguage('ja-JP');
    expect(service.language()).toBe('ja-JP');
    expect(service.isJapanese()).toBe(true);
    expect(service.punctuations()).toContain('。');
  });
});
