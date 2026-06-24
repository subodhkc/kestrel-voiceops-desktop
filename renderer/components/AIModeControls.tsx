/**
 * AI Mode Controls Component
 * 
 * Controls for AI Copilot modes during calls.
 * Allows switching between adaptive, streaming, hybrid, copilot, and none modes.
 */

'use client';

import { useState } from 'react';

type AIMode = 'adaptive' | 'streaming' | 'hybrid' | 'copilot' | 'none';

interface AIModeControlsProps {
  currentMode: AIMode;
  onModeChange: (mode: AIMode) => void;
  disabled?: boolean;
}

export default function AIModeControls({ currentMode, onModeChange, disabled = false }: AIModeControlsProps) {
  const modes: { value: AIMode; label: string; description: string; color: string }[] = [
    {
      value: 'none',
      label: 'None',
      description: 'AI disabled',
      color: 'gray',
    },
    {
      value: 'copilot',
      label: 'Copilot',
      description: 'AI suggestions only',
      color: 'blue',
    },
    {
      value: 'adaptive',
      label: 'Adaptive',
      description: 'AI adapts to context',
      color: 'green',
    },
    {
      value: 'streaming',
      label: 'Streaming',
      description: 'Real-time AI responses',
      color: 'purple',
    },
    {
      value: 'hybrid',
      label: 'Hybrid',
      description: 'Mixed AI modes',
      color: 'orange',
    },
  ];

  const getColorClass = (color: string, isActive: boolean) => {
    const baseClass = isActive ? 'bg-' : 'bg-gray-700 hover:bg-gray-600';
    const colorMap: Record<string, string> = {
      gray: isActive ? 'bg-gray-600' : '',
      blue: isActive ? 'bg-blue-600' : '',
      green: isActive ? 'bg-green-600' : '',
      purple: isActive ? 'bg-purple-600' : '',
      orange: isActive ? 'bg-orange-600' : '',
    };
    return colorMap[color] || '';
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/20">
      <h3 className="text-lg font-semibold mb-4 text-white">AI Mode</h3>
      
      <div className="space-y-2">
        {modes.map((mode) => (
          <button
            key={mode.value}
            onClick={() => onModeChange(mode.value)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-xl transition-all backdrop-blur-sm border border-white/10 shadow-lg ${
              currentMode === mode.value
                ? getColorClass(mode.color, true)
                : 'bg-gray-700/60 hover:bg-gray-600/60'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{mode.label}</div>
                <div className="text-sm text-gray-400">{mode.description}</div>
              </div>
              {currentMode === mode.value && (
                <div className="w-4 h-4 bg-white rounded-full"></div>
              )}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          Current mode: <span className="text-white font-medium">{modes.find(m => m.value === currentMode)?.label}</span>
        </p>
      </div>
    </div>
  );
}
