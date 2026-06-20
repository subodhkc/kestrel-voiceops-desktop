/**
 * Action Items Component
 * 
 * Displays and manages action items from calls.
 * Integrates with Supabase for persistent storage.
 */

'use client';

import { useState, useEffect } from 'react';

interface ActionItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  assignedTo?: string;
  relatedCallId?: string;
  relatedPhoneNumber?: string;
}

interface ActionItemsProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function ActionItems({ isVisible, onClose }: ActionItemsProps) {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadActionItems();
    }
  }, [isVisible]);

  const loadActionItems = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to /api/action-items
      // const response = await fetch('/api/action-items');
      // const data = await response.json();
      
      // Simulated data for now
      const simulatedItems: ActionItem[] = [
        {
          id: '1',
          title: 'Schedule follow-up call',
          description: 'Customer requested callback next week',
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 604800000),
          relatedPhoneNumber: '+1 (555) 123-4567',
        },
        {
          id: '2',
          title: 'Send invoice',
          description: 'Invoice #1234 needs to be sent',
          status: 'in_progress',
          priority: 'medium',
          dueDate: new Date(Date.now() + 172800000),
        },
        {
          id: '3',
          title: 'Update CRM',
          description: 'Add new contact information',
          status: 'completed',
          priority: 'low',
        },
      ];
      setItems(simulatedItems);
    } catch (error) {
      console.error('Failed to load action items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;

    const item: ActionItem = {
      id: Date.now().toString(),
      title: newItem.title,
      description: newItem.description,
      status: 'pending',
      priority: newItem.priority,
    };

    setItems((prev) => [item, ...prev]);
    setNewItem({ title: '', description: '', priority: 'medium' });
    setShowAddForm(false);
  };

  const handleUpdateStatus = (id: string, status: ActionItem['status']) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'in_progress':
        return 'text-blue-400';
      case 'pending':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-[1300px] top-0 h-full w-[400px] bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Action Items</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            title="Add Item"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-700 bg-gray-750">
          <input
            type="text"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder="Action item title..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Description (optional)..."
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-2 mb-2">
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => setNewItem({ ...newItem, priority })}
                className={`flex-1 py-1 px-2 rounded text-sm font-medium transition-colors ${
                  newItem.priority === priority
                    ? getPriorityColor(priority)
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              disabled={!newItem.title.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Action Items List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading action items...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p>No action items yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-medium text-white">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    )}
                    {item.dueDate && (
                      <p className="text-xs text-gray-400 mt-1">
                        Due: {item.dueDate.toLocaleDateString()}
                      </p>
                    )}
                    {item.relatedPhoneNumber && (
                      <p className="text-xs text-gray-400 mt-1">
                        Related to: {item.relatedPhoneNumber}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors ml-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'in_progress')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
                      item.status === 'in_progress'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(item.id, 'completed')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
                      item.status === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    }`}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
