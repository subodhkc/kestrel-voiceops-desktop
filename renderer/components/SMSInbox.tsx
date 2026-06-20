/**
 * SMS Inbox Component
 * 
 * Displays SMS messages and allows sending new messages.
 * Integrates with /api/sms endpoints for message management.
 */

'use client';

import { useState, useEffect } from 'react';

interface SMSMessage {
  id: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'failed' | 'received';
}

interface SMSInboxProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SMSInbox({ isVisible, onClose }: SMSInboxProps) {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load messages when component opens
  useEffect(() => {
    if (isVisible) {
      loadMessages();
    }
  }, [isVisible]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to /api/sms
      // const response = await fetch('/api/sms');
      // const data = await response.json();
      
      // Simulated data for now
      const simulatedMessages: SMSMessage[] = [
        {
          id: '1',
          phoneNumber: '+1 (555) 123-4567',
          direction: 'inbound',
          content: 'Hi, I have a question about my appointment.',
          timestamp: new Date(Date.now() - 3600000),
          status: 'received',
        },
        {
          id: '2',
          phoneNumber: '+1 (555) 987-6543',
          direction: 'outbound',
          content: 'Your appointment is confirmed for tomorrow at 2pm.',
          timestamp: new Date(Date.now() - 7200000),
          status: 'delivered',
        },
      ];
      setMessages(simulatedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact.trim()) return;

    const message: SMSMessage = {
      id: Date.now().toString(),
      phoneNumber: selectedContact,
      direction: 'outbound',
      content: newMessage,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => [message, ...prev]);
    setNewMessage('');

    try {
      // TODO: Replace with actual API call to /api/sms/send
      // const response = await fetch('/api/sms/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: selectedContact,
      //     body: newMessage,
      //   }),
      // });
      
      console.log('Message sent to:', selectedContact);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update status to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };

  if (!isVisible) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-blue-400';
      case 'delivered':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'received':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">SMS Inbox</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Send Message */}
      <div className="p-4 border-b border-gray-700">
        <div className="space-y-3">
          <input
            type="tel"
            value={selectedContact}
            onChange={(e) => setSelectedContact(e.target.value)}
            placeholder="Phone number"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type message..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !selectedContact.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg ${
                  message.direction === 'outbound'
                    ? 'bg-blue-600 ml-8'
                    : 'bg-gray-700 mr-8'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-white">{message.phoneNumber}</span>
                  <span className={`text-xs ${getStatusColor(message.status)}`}>
                    {message.status}
                  </span>
                </div>
                <p className="text-sm text-white mb-2">{message.content}</p>
                <p className="text-xs text-gray-300">
                  {message.timestamp.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
