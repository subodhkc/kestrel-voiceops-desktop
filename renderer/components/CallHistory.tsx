/**
 * Call History Component
 * 
 * Displays call history with filtering and search.
 * Integrates with call recording playback via custom protocol.
 */

'use client';

import { useState, useEffect } from 'react';

interface CallRecord {
  id: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  timestamp: Date;
  status: 'completed' | 'missed' | 'failed';
  recordingUrl?: string;
  transcript?: string;
}

interface CallHistoryProps {
  isVisible: boolean;
  onClose: () => void;
  onPlaybackRequest?: (recordingUrl: string) => void;
}

export default function CallHistory({ isVisible, onClose, onPlaybackRequest }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound' | 'missed'>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadCallHistory();
    }
  }, [isVisible]);

  const loadCallHistory = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to /api/calls/history
      // const response = await fetch('/api/calls/history');
      // const data = await response.json();
      
      // Simulated data for now
      const simulatedCalls: CallRecord[] = [
        {
          id: '1',
          phoneNumber: '+1 (555) 123-4567',
          direction: 'inbound',
          duration: 180,
          timestamp: new Date(Date.now() - 3600000),
          status: 'completed',
          recordingUrl: 'kestrel://recording/CA-sample',
        },
        {
          id: '2',
          phoneNumber: '+1 (555) 987-6543',
          direction: 'outbound',
          duration: 240,
          timestamp: new Date(Date.now() - 7200000),
          status: 'completed',
        },
        {
          id: '3',
          phoneNumber: '+1 (555) 456-7890',
          direction: 'inbound',
          duration: 0,
          timestamp: new Date(Date.now() - 10800000),
          status: 'missed',
        },
      ];
      setCalls(simulatedCalls);
    } catch (error) {
      console.error('Failed to load call history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCalls = calls.filter((call) => {
    const matchesSearch = call.phoneNumber.includes(searchQuery);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'inbound' && call.direction === 'inbound') ||
      (filter === 'outbound' && call.direction === 'outbound') ||
      (filter === 'missed' && call.status === 'missed');
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Missed';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'missed':
        return 'text-red-400';
      case 'failed':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-[900px] top-0 h-full w-[400px] bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Call History</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search calls..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {(['all', 'inbound', 'outbound', 'missed'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading call history...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p>No calls found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCalls.map((call) => (
              <div
                key={call.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{call.phoneNumber}</span>
                      <span className={`text-xs ${getStatusColor(call.status)}`}>
                        {call.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">
                      {call.direction.charAt(0).toUpperCase() + call.direction.slice(1)} • {call.timestamp.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{formatDuration(call.duration)}</p>
                  </div>
                  
                  {call.recordingUrl && (
                    <button
                      onClick={() => onPlaybackRequest?.(call.recordingUrl!)}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                      title="Play Recording"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
