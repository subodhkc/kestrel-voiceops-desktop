/**
 * Live Transcript Viewer Component
 * 
 * Displays real-time call transcript from Supabase Realtime.
 * Shows speaker identification and timestamps.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface TranscriptSegment {
  id: string;
  speaker: 'caller' | 'ai' | 'operator';
  content: string;
  timestamp: Date;
  confidence?: number;
}

interface LiveTranscriptViewerProps {
  isVisible: boolean;
  onClose: () => void;
  callSid?: string;
}

export default function LiveTranscriptViewer({ isVisible, onClose, callSid }: LiveTranscriptViewerProps) {
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [isLive, setIsLive] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript]);

  // Simulate live transcript updates
  useEffect(() => {
    if (!isVisible || !callSid) return;

    setIsLive(true);

    // Add initial segments
    const initialSegments: TranscriptSegment[] = [
      {
        id: '1',
        speaker: 'caller',
        content: 'Hello, I\'d like to schedule an appointment.',
        timestamp: new Date(),
        confidence: 0.95,
      },
      {
        id: '2',
        speaker: 'ai',
        content: 'I can help you with that. What date would work best for you?',
        timestamp: new Date(Date.now() + 2000),
        confidence: 0.98,
      },
    ];

    setTranscript(initialSegments);

    // Simulate live updates
    const interval = setInterval(() => {
      const newSegment: TranscriptSegment = {
        id: Date.now().toString(),
        speaker: Math.random() > 0.5 ? 'caller' : 'ai',
        content: `Simulated transcript segment ${transcript.length + 1}`,
        timestamp: new Date(),
        confidence: 0.9 + Math.random() * 0.1,
      };
      setTranscript((prev) => [...prev, newSegment]);
    }, 5000);

    return () => {
      clearInterval(interval);
      setIsLive(false);
    };
  }, [isVisible, callSid]);

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'caller':
        return 'bg-blue-600';
      case 'ai':
        return 'bg-purple-600';
      case 'operator':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'caller':
        return 'Caller';
      case 'ai':
        return 'AI Agent';
      case 'operator':
        return 'Operator';
      default:
        return speaker;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-96 top-0 h-full w-96 bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>Live Transcript</span>
            {isLive && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </h2>
          {callSid && (
            <p className="text-xs text-gray-400 font-mono">{callSid.substring(0, 12)}...</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {transcript.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Waiting for transcript...</p>
          </div>
        )}

        {transcript.map((segment) => (
          <div key={segment.id} className="flex gap-3">
            <div className={`w-8 h-8 rounded-full ${getSpeakerColor(segment.speaker)} flex items-center justify-center flex-shrink-0`}>
              {segment.speaker === 'caller' ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">{getSpeakerLabel(segment.speaker)}</span>
                <span className="text-xs text-gray-400">
                  {segment.timestamp.toLocaleTimeString()}
                </span>
                {segment.confidence && (
                  <span className="text-xs text-gray-500">
                    {Math.round(segment.confidence * 100)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-200">{segment.content}</p>
            </div>
          </div>
        ))}

        <div ref={transcriptEndRef} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{transcript.length} segments</span>
          {isLive && <span className="text-green-400">● Live</span>}
        </div>
      </div>
    </div>
  );
}
