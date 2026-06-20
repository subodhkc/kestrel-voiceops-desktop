/**
 * Settings Dialog Component
 * 
 * Basic settings that can be managed in desktop app.
 * Advanced settings redirect to web dashboard.
 */

'use client';

import { useState } from 'react';

interface SettingsDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isVisible, onClose }: SettingsDialogProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [startOnStartup, setStartOnStartup] = useState(false);

  const handleOpenWebSettings = () => {
    window.open('https://kestrelvoice.com/dashboard/settings', '_blank');
  };

  const handleSaveSettings = () => {
    // TODO: Save settings to electron-store via IPC
    console.log('Saving settings:', {
      notificationsEnabled,
      minimizeToTray,
      startOnStartup,
    });
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Desktop Settings */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Desktop Settings</h3>
          
          <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
            <div>
              <p className="font-medium text-white">Enable Notifications</p>
              <p className="text-sm text-gray-400">Show desktop notifications for incoming calls</p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
            <div>
              <p className="font-medium text-white">Minimize to System Tray</p>
              <p className="text-sm text-gray-400">Minimize app to tray instead of closing</p>
            </div>
            <button
              onClick={() => setMinimizeToTray(!minimizeToTray)}
              className={`w-12 h-6 rounded-full transition-colors ${
                minimizeToTray ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  minimizeToTray ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
            <div>
              <p className="font-medium text-white">Start on System Startup</p>
              <p className="text-sm text-gray-400">Launch app when computer starts</p>
            </div>
            <button
              onClick={() => setStartOnStartup(!startOnStartup)}
              className={`w-12 h-6 rounded-full transition-colors ${
                startOnStartup ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  startOnStartup ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Advanced Settings Redirect */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Advanced Settings</h3>
          <p className="text-sm text-gray-400 mb-3">
            Account, billing, AI configuration, and team settings are managed in the web dashboard.
          </p>
          <button
            onClick={handleOpenWebSettings}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Open Web Settings →
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
