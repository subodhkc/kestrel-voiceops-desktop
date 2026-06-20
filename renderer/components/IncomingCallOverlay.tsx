/**
 * Incoming Call Overlay Component
 * 
 * Displays an overlay when an incoming call is received via Supabase Realtime.
 * Shows caller information and provides accept/reject buttons.
 */

'use client';

import { useEffect } from 'react';

interface IncomingCallOverlayProps {
  incomingCall: { callSid: string; phoneNumber: string } | null;
  onAccept: (callSid: string) => void;
  onReject: (callSid: string) => void;
}

export default function IncomingCallOverlay({
  incomingCall,
  onAccept,
  onReject,
}: IncomingCallOverlayProps) {
  useEffect(() => {
    // Play ringtone when incoming call is received
    if (incomingCall && typeof window !== 'undefined' && window.desktopAPI) {
      window.desktopAPI.playRingtone();
    }

    // Stop ringtone when overlay closes
    return () => {
      if (typeof window !== 'undefined' && window.desktopAPI) {
        window.desktopAPI.stopRingtone();
      }
    };
  }, [incomingCall]);

  if (!incomingCall) {
    return null;
  }

  const { callSid, phoneNumber } = incomingCall;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Incoming Call</h2>
          <p className="text-gray-400 text-lg">{phoneNumber}</p>
        </div>

        {/* Call Information */}
        <div className="bg-gray-700 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Call ID:</span>
            <span className="text-gray-300 font-mono">{callSid.substring(0, 12)}...</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => onReject(callSid)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Decline
          </button>
          <button
            onClick={() => onAccept(callSid)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
