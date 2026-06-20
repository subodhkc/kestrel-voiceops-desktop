/**
 * After-Call Workspace Component
 * 
 * Post-call workspace for reviewing call summary, transcript, and action items.
 * Displays call metadata, AI-generated summary, and next steps.
 */

'use client';

import { useState } from 'react';

interface ActionItem {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  assignedTo?: string;
}

interface CallSummary {
  callSid: string;
  phoneNumber: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  actionItems: ActionItem[];
}

interface AfterCallWorkspaceProps {
  isVisible: boolean;
  onClose: () => void;
  callSummary?: CallSummary;
}

export default function AfterCallWorkspace({ isVisible, onClose, callSummary }: AfterCallWorkspaceProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>(callSummary?.actionItems || []);
  const [newAction, setNewAction] = useState('');

  const handleAddAction = () => {
    if (!newAction.trim()) return;
    
    const action: ActionItem = {
      id: Date.now().toString(),
      title: newAction,
      status: 'pending',
    };
    
    setActionItems((prev) => [...prev, action]);
    setNewAction('');
  };

  const handleToggleAction = (id: string) => {
    setActionItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: item.status === 'pending' ? 'completed' : 'pending' } : item
      )
    );
  };

  const handleDeleteAction = (id: string) => {
    setActionItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isVisible) return null;

  const summary = callSummary || {
    callSid: 'CA-sample',
    phoneNumber: '+1 (555) 123-4567',
    duration: 180,
    startTime: new Date(Date.now() - 180000),
    endTime: new Date(),
    summary: 'Call discussed scheduling an appointment. Customer interested in next Tuesday at 2pm.',
    sentiment: 'positive' as const,
    actionItems: [],
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-600';
      case 'negative':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Call Summary</h2>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{summary.phoneNumber}</span>
              <span>•</span>
              <span>{formatDuration(summary.duration)}</span>
              <span>•</span>
              <span>{summary.startTime.toLocaleTimeString()}</span>
            </div>
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

        {/* Sentiment Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(summary.sentiment)}`}>
            {summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)} Sentiment
          </span>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
          <p className="text-gray-300">{summary.summary}</p>
        </div>

        {/* Action Items */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Action Items</h3>
          
          <div className="space-y-2 mb-4">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleAction(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.status === 'completed'
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {item.status === 'completed' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {item.title}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteAction(item.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            
            {actionItems.length === 0 && (
              <p className="text-sm text-gray-400 italic">No action items yet</p>
            )}
          </div>

          {/* Add Action Item */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddAction()}
              placeholder="Add action item..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddAction}
              disabled={!newAction.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
