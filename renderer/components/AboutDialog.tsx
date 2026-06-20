/**
 * About Dialog Component
 * 
 * Displays app version, system info, and links to support.
 */

'use client';

import { useState, useEffect } from 'react';

interface AboutDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function AboutDialog({ isVisible, onClose }: AboutDialogProps) {
  const [appVersion, setAppVersion] = useState('Loading...');
  const [systemInfo, setSystemInfo] = useState('Loading...');

  useEffect(() => {
    if (isVisible && window.desktopAPI) {
      window.desktopAPI.getAppVersion().then(setAppVersion);
      window.desktopAPI.getSystemInfo().then(setSystemInfo);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">About Kestrel VoiceOps</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* App Info */}
        <div className="space-y-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Kestrel VoiceOps Desktop</h3>
                <p className="text-sm text-gray-400">Version {appVersion}</p>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              AI-powered voice operations platform for service businesses.
            </p>
          </div>

          {/* System Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2">System Information</h4>
            <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono">
              {systemInfo}
            </pre>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-2 mb-6">
          <a
            href="https://kestrelvoice.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:text-blue-300 text-sm"
          >
            Visit Website →
          </a>
          <a
            href="https://kestrelvoice.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:text-blue-300 text-sm"
          >
            Documentation →
          </a>
          <a
            href="https://kestrelvoice.com/support"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:text-blue-300 text-sm"
          >
            Get Support →
          </a>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
