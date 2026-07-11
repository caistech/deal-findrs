'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { useVoiceAssistant } from '@/lib/voice/useVoiceAssistant';
import { VoiceContext, ExtractedField, FIELD_LABELS, INITIAL_PROMPTS } from '@/lib/voice/prompts';

interface VoiceAssistantProps {
  context: VoiceContext;
  contextData?: Record<string, any>;
  customInitialPrompt?: string;
  onFieldExtracted?: (field: string, value: any) => void;
  onClose?: () => void;
  className?: string;
  /** Label shown on the collapsed "tap to start" bar. */
  title?: string;
  /** One-line explanation shown under the title on the collapsed bar. */
  subtitle?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  extractedFields?: ExtractedField[];
  timestamp: Date;
}

export function VoiceAssistant({
  context,
  contextData,
  customInitialPrompt,
  onFieldExtracted,
  onClose,
  className = '',
  title = '🎙️ Voice Assistant',
  subtitle = "Tap to start - I'll help you set up your assessment criteria",
}: VoiceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); // NEW: Track if user has started
  const [lastExtracted, setLastExtracted] = useState<ExtractedField[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false); // NEW: Track permission state
  
  const {
    isListening,
    isSpeaking,
    isProcessing,
    userTranscript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    reset,
  } = useVoiceAssistant({
    autoListen: true,
    onUserSpeech: handleUserSpeech,
  });

  // Handle user speech and extract data
  async function handleUserSpeech(transcript: string) {
    if (!transcript.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: transcript,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    stopListening();
    setIsProcessingAI(true);

    try {
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: transcript,
          context,
          contextData,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Voice processing failed');
      }

      const data = await response.json();
      
      if (data.extractedFields && data.extractedFields.length > 0) {
        setLastExtracted(data.extractedFields);
        
        for (const field of data.extractedFields) {
          if (onFieldExtracted && field.confidence !== 'low') {
            onFieldExtracted(field.field, field.value);
          }
        }
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        extractedFields: data.extractedFields,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      await speak(data.message);

    } catch (err) {
      console.error('Voice chat error:', err);
      const errorMessage = "Sorry, I didn't catch that. Could you say it again?";
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      }]);
      await speak(errorMessage);
    } finally {
      setIsProcessingAI(false);
    }
  }

  // NEW: Handle initial start with user gesture
  const handleStart = useCallback(async () => {
    // First, check/request microphone permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Release immediately
      
      setPermissionDenied(false);
      setHasStarted(true);
      
      // Now we can safely speak the initial prompt (user has interacted)
      const initialPrompt = customInitialPrompt || INITIAL_PROMPTS[context];
      if (initialPrompt) {
        setMessages([{
          role: 'assistant',
          content: initialPrompt,
          timestamp: new Date(),
        }]);
        // Small delay before speaking
        setTimeout(() => speak(initialPrompt), 300);
      }
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionDenied(true);
    }
  }, [context, customInitialPrompt, speak]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, isSpeaking, startListening, stopListening, stopSpeaking]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    setHasStarted(false);
    setMessages([]);
    onClose?.();
  }, [reset, onClose]);

  // Browser not supported
  if (!isSupported) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}>
        <p className="text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Voice requires Chrome, Edge, or Safari with microphone access.
        </p>
      </div>
    );
  }

  // Permission denied state
  if (permissionDenied) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Microphone Access Denied</p>
            <p className="text-red-600 text-sm mt-1">
              To use the Voice Assistant, please allow microphone access in your browser settings.
            </p>
            <div className="mt-3 space-y-2 text-sm text-red-700">
              <p><strong>On mobile:</strong> Check your browser settings → Site Settings → Microphone</p>
              <p><strong>On desktop:</strong> Click the lock/info icon in the address bar → Allow microphone</p>
            </div>
            <button
              onClick={() => {
                setPermissionDenied(false);
                handleStart();
              }}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NEW: Initial "tap to start" state - requires user gesture
  if (!hasStarted) {
    return (
      <div className={`bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl overflow-hidden ${className}`}>
        <button
          onClick={handleStart}
          className="w-full px-6 py-5 flex items-center justify-between hover:from-violet-500 hover:to-indigo-500 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold">{title}</p>
              <p className="text-white/70 text-sm">{subtitle}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-white/20 rounded-lg text-white text-sm font-medium group-hover:bg-white/30 transition-colors">
            Start
          </div>
        </button>
      </div>
    );
  }

  // Active voice assistant state
  return (
    <div className={`bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl overflow-hidden ${className}`}>
      {/* Main Voice Bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            disabled={isProcessing || isProcessingAI}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse scale-110' 
                : isSpeaking
                  ? 'bg-green-400 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {isProcessing || isProcessingAI ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-6 h-6" />
            ) : isSpeaking ? (
              <Volume2 className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
          
          <div className="text-white max-w-lg">
            <p className="font-medium text-sm mb-1">
              {isListening ? '🔴 Listening...' : isSpeaking ? '🔊 Speaking...' : '🎙️ Voice Assistant'}
            </p>
            
            {isListening && interimTranscript ? (
              <p className="text-white/90 italic text-sm">"{interimTranscript}"</p>
            ) : messages.length > 0 ? (
              <p className="text-white/90 text-sm line-clamp-2">
                {messages[messages.length - 1].content}
              </p>
            ) : (
              <p className="text-white/70 text-sm">Tap the mic button to start talking</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastExtracted.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/30 rounded-lg">
              <Check className="w-4 h-4 text-emerald-300" />
              <span className="text-emerald-100 text-xs font-medium">
                {lastExtracted.length} field{lastExtracted.length > 1 ? 's' : ''} captured
              </span>
            </div>
          )}
          
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
              title="Stop speaking"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
          
          {onClose && (
            <button
              onClick={handleClose}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Extracted Fields Display */}
      {lastExtracted.length > 0 && (
        <div className="px-6 py-3 bg-black/20 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {lastExtracted.map((field, i) => (
              <div 
                key={i}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  field.confidence === 'high' 
                    ? 'bg-emerald-500/30 text-emerald-100' 
                    : field.confidence === 'medium'
                      ? 'bg-amber-500/30 text-amber-100'
                      : 'bg-gray-500/30 text-gray-200'
                }`}
              >
                <Check className="w-3 h-3" />
                <span className="opacity-70">{FIELD_LABELS[field.field] || field.field}:</span>
                <span>{String(field.value)}</span>
              </div>
            ))}
          </div>
          <p className="text-white/60 text-xs mt-2">
            ✓ Fields auto-filled. Review and correct if needed, then click Next.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-6 py-2 bg-red-500/30 text-white text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceAssistant;
