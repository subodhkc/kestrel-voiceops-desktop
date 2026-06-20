/**
 * TodayWorkspace Component
 * 
 * Dashboard view with stats cards, attention list, live calls indicator,
 * and quick actions for the desktop application.
 */

'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  totalCalls: number;
  booked: number;
  blocked: number;
  answerRate: number;
  activeLeads: number;
  appointments: number;
  revenue: number;
  conversionRate: number;
  avgCallDuration: number;
}

interface AttentionItem {
  id: string;
  type: 'action_item' | 'missed_call' | 'unread_message';
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface LiveCall {
  id: string;
  phoneNumber: string;
  duration: number;
  status: 'connecting' | 'connected';
}

interface TodayWorkspaceProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function TodayWorkspace({ isVisible, onClose }: TodayWorkspaceProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadDashboardData();
    }
  }, [isVisible]);

  // Poll for updates every 30 seconds
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const consolidatedResponse = await fetch('/api/dashboard/consolidated');
      // const activityResponse = await fetch('/api/dashboard/activity');
      
      // Simulated data for now
      setStats({
        totalCalls: 20,
        booked: 8,
        blocked: 2,
        answerRate: 75,
        activeLeads: 15,
        appointments: 8,
        revenue: 12000,
        conversionRate: 40,
        avgCallDuration: 180,
      });

      setAttentionItems([
        {
          id: '1',
          type: 'action_item',
          title: 'Schedule follow-up call',
          description: 'Customer requested callback for tomorrow',
          priority: 'high',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          type: 'missed_call',
          title: 'Missed call from +1 (555) 123-4567',
          description: 'Called 30 minutes ago',
          priority: 'high',
          timestamp: new Date(Date.now() - 1800000),
        },
        {
          id: '3',
          type: 'unread_message',
          title: 'New SMS from +1 (555) 987-6543',
          description: 'Hi, I have a question about pricing',
          priority: 'medium',
          timestamp: new Date(Date.now() - 7200000),
        },
      ]);

      setLiveCalls([]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-600';
      case 'medium':
        return 'bg-yellow-600';
      case 'low':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'action_item':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'missed_call':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 01-1.21-.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 01.502-1.21l1.498-4.493a1 1 0 01.948-.684H7a2 2 0 002-2z" />
          </svg>
        );
      case 'unread_message':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-[1700px] top-0 h-full w-[500px] bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Today's Workspace</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Live Calls Indicator */}
      {liveCalls.length > 0 && (
        <div className="p-4 bg-green-600 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">{liveCalls.length} Active Call{liveCalls.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Calls</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCalls}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Appointments</p>
                  <p className="text-2xl font-bold text-white">{stats.appointments}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Answer Rate</p>
                  <p className="text-2xl font-bold text-white">{stats.answerRate}%</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-1">Revenue</p>
                  <p className="text-2xl font-bold text-white">${stats.revenue.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Attention List */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Attention Required</h3>
              {attentionItems.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No items requiring attention</p>
              ) : (
                <div className="space-y-3">
                  {attentionItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getPriorityColor(item.priority)} text-white`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{item.title}</h4>
                          {item.description && (
                            <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {item.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm font-medium">New Call</span>
                </button>
                <button className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-sm font-medium">Send SMS</span>
                </button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">Add Task</span>
                </button>
                <button className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium">Contacts</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
