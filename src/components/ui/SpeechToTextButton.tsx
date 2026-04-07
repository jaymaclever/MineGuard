import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface SpeechToTextButtonProps {
  currentValue: string;
  onTranscript: (value: string) => void;
  className?: string;
  language?: string;
}

const resolveSpeechLocale = (language: string) => {
  if (language.toLowerCase().startsWith('pt')) return 'pt-PT';
  return 'en-US';
};

export const SpeechToTextButton: React.FC<SpeechToTextButtonProps> = ({ currentValue, onTranscript, className, language = 'pt' }) => {
  const recognitionRef = useRef<any>(null);
  const baselineRef = useRef('');
  const [isListening, setIsListening] = useState(false);
  const [SpeechRecognitionCtor, setSpeechRecognitionCtor] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSpeechRecognitionCtor(window.SpeechRecognition || window.webkitSpeechRecognition || null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const startListening = () => {
    if (!SpeechRecognitionCtor) {
      toast.error('Ditado por voz não suportado neste navegador.');
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      baselineRef.current = currentValue?.trim() || '';
      recognition.lang = resolveSpeechLocale(language || 'pt');
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('A ouvir... fale agora.');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results || [])
          .map((result: any) => result?.[0]?.transcript || '')
          .join(' ')
          .trim();

        const base = baselineRef.current;
        onTranscript(base ? `${base}${transcript ? ' ' : ''}${transcript}`.trim() : transcript);
      };

      recognition.onerror = (event: any) => {
        if (event?.error === 'not-allowed') toast.error('O navegador bloqueou o acesso ao microfone.');
        else if (event?.error === 'no-speech') toast.error('Nenhuma fala foi detetada.');
        else toast.error('Falha no ditado por voz.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível iniciar o ditado por voz.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setIsListening(false);
  };

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
        isListening
          ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15'
          : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
      title={isListening ? 'Parar ditado' : 'Ditar por voz'}
      disabled={!SpeechRecognitionCtor && !isListening}
    >
      {isListening ? <Square size={12} /> : <Mic size={12} />}
      {isListening ? 'Parar' : 'Ditar'}
    </button>
  );
};
