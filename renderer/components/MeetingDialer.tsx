/**
 * Meeting Dialer Component
 * 
 * UI for joining AI-powered meetings via the /api/meeting proxy.
 * Connects to Modal backend for AI meeting dial-in functionality.
 */

'use client';

import { useState } from 'react';

interface MeetingDialerProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function MeetingDialer({ isVisible, onClose }: MeetingDialerProps) {
  const [roomName, setRoomName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleJoinMeeting = async () => {
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }

    setIsJoining(true);
    setError('');
    setSuccess(false);

    try {
      // Get tenant_id and user_id from localStorage
      const token = localStorage.getItem('sb-access-token') || '';
      const tenantId = localStorage.getItem('tenant-id') || '';
      const userId = localStorage.getItem('user-id') || '';
      const userEmail = localStorage.getItem('user-email') || '';

      if (!tenantId || !userId) {
        throw new Error('Not authenticated. Please log in first.');
      }

      // Call the /api/meeting proxy endpoint
      const response = await fetch('/api/meeting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          room_name: roomName,
          tenant_id: tenantId,
          user_id: userId,
          user_email: userEmail,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to join meeting: ${response.status}`);
      }

      const data = await response.json();
      setSuccess(true);
      console.log('Meeting joined successfully:', data);

      // TODO: Handle meeting connection (e.g., open meeting URL, start audio stream)
      // For now, just show success message
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join meeting';
      console.error('Meeting dialer error:', err);
      setError(message);
    } finally {
      setIsJoining(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Join Meeting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-400 mb-6">
          Join an AI-powered meeting room. The AI assistant will dial in and participate in the meeting.
        </p>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-300 mb-2">
              Room Name
            </label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
              placeholder="Enter meeting room name"
              disabled={isJoining}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-600/20 border border-red-600 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-600/20 border border-green-600 rounded-lg p-3">
              <p className="text-sm text-green-400">Successfully joined meeting!</p>
            </div>
          )}

          <button
            onClick={handleJoinMeeting}
            disabled={isJoining || !roomName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            {isJoining ? 'Joining...' : 'Join Meeting'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-400">
              The AI assistant will join the meeting as a participant and provide real-time assistance.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
