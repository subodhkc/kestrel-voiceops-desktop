/**
 * Contact Lookup Component
 * 
 * Search and view contacts from /api/contacts.
 * Allows quick dialing and SMS from contact list.
 */

'use client';

import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  company?: string;
  tags?: string[];
}

interface ContactLookupProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectContact?: (phoneNumber: string) => void;
}

export default function ContactLookup({ isVisible, onClose, onSelectContact }: ContactLookupProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadContacts();
    }
  }, [isVisible]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to /api/contacts
      // const response = await fetch('/api/contacts');
      // const data = await response.json();
      
      // Simulated data for now
      const simulatedContacts: Contact[] = [
        {
          id: '1',
          name: 'John Smith',
          phoneNumber: '+1 (555) 123-4567',
          email: 'john@example.com',
          company: 'Acme Corp',
          tags: ['VIP', 'Customer'],
        },
        {
          id: '2',
          name: 'Jane Doe',
          phoneNumber: '+1 (555) 987-6543',
          email: 'jane@example.com',
          company: 'Tech Solutions',
          tags: ['Lead'],
        },
        {
          id: '3',
          name: 'Bob Johnson',
          phoneNumber: '+1 (555) 456-7890',
          email: 'bob@example.com',
          company: 'Global Inc',
        },
      ];
      setContacts(simulatedContacts);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDial = (phoneNumber: string) => {
    if (onSelectContact) {
      onSelectContact(phoneNumber);
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed right-[500px] top-0 h-full w-[400px] bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Contacts</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-400 mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No contacts found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium text-white">{contact.name}</h3>
                    <p className="text-sm text-gray-400">{contact.phoneNumber}</p>
                  </div>
                  <button
                    onClick={() => handleDial(contact.phoneNumber)}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                    title="Call"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                </div>
                
                {contact.email && (
                  <p className="text-xs text-gray-400 mb-2">{contact.email}</p>
                )}
                
                {contact.company && (
                  <p className="text-xs text-gray-400 mb-2">{contact.company}</p>
                )}
                
                {contact.tags && contact.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
