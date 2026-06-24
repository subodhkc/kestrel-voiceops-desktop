/**
 * Desktop Dialer Component
 * 
 * Main dialer interface for the desktop app.
 * Uses the hooks created in Phase 1:
 * - useDeviceLifecycle for device management
 * - useAudioDevices for device selection
 * - useAuth for authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDeviceLifecycle } from '../hooks/useDeviceLifecycle';
import { useAudioDevices } from '../hooks/useAudioDevices';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';
import { getLogger } from '../lib/desktop-logger';
import IncomingCallOverlay from './IncomingCallOverlay';
import CopilotChatPanel from './CopilotChatPanel';
import LiveTranscriptViewer from './LiveTranscriptViewer';
import AIModeControls from './AIModeControls';
import AfterCallWorkspace from './AfterCallWorkspace';
import SMSInbox from './SMSInbox';
import ContactLookup from './ContactLookup';
import CallHistory from './CallHistory';
import ActionItems from './ActionItems';
import TodayWorkspace from './TodayWorkspace';
import MeetingDialer from './MeetingDialer';
import OnboardingScreen from './OnboardingScreen';
import AboutDialog from './AboutDialog';
import SettingsDialog from './SettingsDialog';
import OfflineBanner from './OfflineBanner';
import { getDesktopDialerCore } from '../lib/twilio/DialerCore';

const logger = getLogger();

export default function Dialer() {
  const { isAuthenticated, isLoading: authLoading, user, login, logout } = useAuth();
  const [incomingCall, setIncomingCall] = useState<{ callSid: string; phoneNumber: string } | null>(null);
  
  // Get token and tenant ID from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb-access-token') || '' : '';
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('kestrel_active_tenant_v1') || '' : '';
  
  const { deviceReady, deviceError, isRegistering, initializeDevice } = useDeviceLifecycle({
    token,
    tenantId,
    onDeviceReady: () => {
      logger.info('Device ready for calls');
    },
    onDeviceError: (error) => {
      logger.error('Device error', error);
    },
    onIncomingCall: (data) => {
      logger.info('Incoming call', data);
      setIncomingCall({ callSid: (data as any).callSid || '', phoneNumber: (data as any).phoneNumber || '' });
    },
  });
  
  // Setup Supabase Realtime subscriptions
  useSupabaseRealtime({
    tenantId,
    onIncomingCall: (data) => {
      logger.info('Incoming call via realtime', data);
      setIncomingCall({ callSid: data.callSid, phoneNumber: data.phoneNumber || '' });
    },
  });
  
  const {
    inputDevices,
    outputDevices,
    selectedInput,
    selectedOutput,
    selectInputDevice,
    selectOutputDevice,
  } = useAudioDevices();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [showCopilotChat, setShowCopilotChat] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [aiMode, setAIMode] = useState<'adaptive' | 'streaming' | 'hybrid' | 'copilot' | 'none'>('none');
  const [showAfterCall, setShowAfterCall] = useState(false);
  const [showSMSInbox, setShowSMSInbox] = useState(false);
  const [showContactLookup, setShowContactLookup] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showActionItems, setShowActionItems] = useState(false);
  const [showTodayWorkspace, setShowTodayWorkspace] = useState(false);
  const [showMeetingDialer, setShowMeetingDialer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Initialize DialerCore when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      getDesktopDialerCore().initialize(token).catch((error) => {
        logger.error('Failed to initialize DialerCore', error);
      });
    }
  }, [isAuthenticated, token]);
  
  // Check first-run status for onboarding
  useEffect(() => {
    if (isAuthenticated && window.desktopAPI) {
      window.desktopAPI.getFirstRun().then((firstRun: boolean) => {
        if (firstRun) {
          setShowOnboarding(true);
        }
      });
    }
  }, [isAuthenticated]);
  
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (window.desktopAPI) {
      await window.desktopAPI.setFirstRunComplete();
    }
  };
  
  // Get DialerCore instance and setup event listeners
  useEffect(() => {
    const dialerCore = getDesktopDialerCore();
    
    const unsubscribeIncoming = dialerCore.on('callIncoming', (event, data) => {
      logger.info('Incoming call via DialerCore', data);
      const callData = data as { callSid: string };
      setIncomingCall({ callSid: callData.callSid, phoneNumber: '' });
    });
    
    const unsubscribeConnecting = dialerCore.on('callConnecting', (event, data) => {
      logger.info('Call connecting', data);
      setCallStatus('connecting');
    });
    
    const unsubscribeConnected = dialerCore.on('callConnected', () => {
      logger.info('Call connected');
      setCallStatus('connected');
      setIsCalling(true);
    });
    
    const unsubscribeEnded = dialerCore.on('callEnded', () => {
      logger.info('Call ended');
      setCallStatus('ended');
      setIsCalling(false);
      setIsMuted(false);
      setIsOnHold(false);
      setTimeout(() => setCallStatus('idle'), 1000);
      // Show after-call workspace when call ends
      setTimeout(() => setShowAfterCall(true), 500);
    });
    
    return () => {
      unsubscribeIncoming();
      unsubscribeConnecting();
      unsubscribeConnected();
      unsubscribeEnded();
    };
  }, []);

  // Incoming call handlers
  const handleAcceptCall = async (callSid: string) => {
    logger.info('Accepting incoming call', { callSid });
    try {
      const dialerCore = getDesktopDialerCore();
      await dialerCore.acceptIncomingCall();
      setIncomingCall(null);
    } catch (error) {
      logger.error('Failed to accept call', error);
    }
  };

  const handleRejectCall = async (callSid: string) => {
    logger.info('Rejecting incoming call', { callSid });
    try {
      const dialerCore = getDesktopDialerCore();
      await dialerCore.rejectIncomingCall();
      setIncomingCall(null);
    } catch (error) {
      logger.error('Failed to reject call', error);
    }
  };
  
  // Outgoing call handler
  const handleMakeCall = async () => {    if (!deviceReady) {      logger.error('Device not ready for call');      alert('Device not ready. Please wait for device registration to complete.');      return;    }        if (!phoneNumber) {      logger.error('Phone number is empty');      alert('Please enter a phone number');      return;    }    const cleanedNumber = phoneNumber.replace(/\D/g, '');    if (cleanedNumber.length < 10) {      logger.error('Phone number too short', { phoneNumber, cleanedLength: cleanedNumber.length });      alert('Please enter a valid phone number (at least 10 digits)');      return;    }    try {      const dialerCore = getDesktopDialerCore();      await dialerCore.makeCall({        phoneNumber,        enableRecording: true,      });      setCallStatus('connecting');    } catch (error) {      logger.error('Failed to make call', error);      alert('Failed to make call: ' + (error instanceof Error ? error.message : 'Unknown error'));      setCallStatus('idle');    }  };    }

  };

  

  // Call control handlers

  const handleEndCall = async () => {

    try {

      const dialerCore = getDesktopDialerCore();

      await dialerCore.endCall();

    } catch (error) {

      logger.error('Failed to end call', error);

    }

  };

  

  const handleMuteToggle = () => {

    // Mute/unmute implementation would go here

    // DialerCore notes this is typically handled at UI layer with audio elements

    setIsMuted(!isMuted);

  };

  

  // DTMF keypad handler

  const handleKeypadPress = (digit: string) => {

    logger.info('DTMF digit pressed', { digit });

    // TODO: Implement DTMF sending via DialerCore when call is active

  };



  const handleSendLogs = async () => {

    try {

      await window.desktopAPI.sendLogs();

      alert('Logs sent successfully! Your email client should have opened with the logs.');

    } catch (error) {

      console.error('Failed to send logs:', error);

      alert('Failed to send logs. Please try again.');

    }

  };



  // Show login screen if not authenticated

  if (authLoading) {

    return (

      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>

          <p>Loading...</p>

        </div>

      </div>

    );

  }



  if (!isAuthenticated) {

    return (

      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">

        <div className="text-center max-w-md p-8">

          <h1 className="text-3xl font-bold mb-4">Kestrel VoiceOps</h1>

          <p className="text-gray-400 mb-8">Sign in to access the dialer</p>

          <button

            onClick={login}

            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"

          >

            Sign In

          </button>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gray-900 text-white">

      {/* Offline Banner */}

      <OfflineBanner />

      

      {/* Incoming Call Overlay */}

      <IncomingCallOverlay

        incomingCall={incomingCall}

        onAccept={handleAcceptCall}

        onReject={handleRejectCall}

      />

      

      {/* Copilot Chat Panel */}

      <CopilotChatPanel

        isVisible={showCopilotChat}

        onClose={() => setShowCopilotChat(false)}

        callSid={isCalling ? 'active-call' : undefined}

      />

      

      {/* Live Transcript Viewer */}

      <LiveTranscriptViewer

        isVisible={showTranscript}

        onClose={() => setShowTranscript(false)}

        callSid={isCalling ? 'active-call' : undefined}

      />

      

      {/* After-Call Workspace */}

      <AfterCallWorkspace

        isVisible={showAfterCall}

        onClose={() => setShowAfterCall(false)}

      />

      

      {/* SMS Inbox */}

      <SMSInbox

        isVisible={showSMSInbox}

        onClose={() => setShowSMSInbox(false)}

      />

      

      {/* Contact Lookup */}

      <ContactLookup

        isVisible={showContactLookup}

        onClose={() => setShowContactLookup(false)}

        onSelectContact={(phoneNumber) => setPhoneNumber(phoneNumber)}

      />

      

      {/* Call History */}

      <CallHistory

        isVisible={showCallHistory}

        onClose={() => setShowCallHistory(false)}

      />

      

      {/* Action Items */}

      <ActionItems

        isVisible={showActionItems}

        onClose={() => setShowActionItems(false)}

      />

      

      {/* Today Workspace */}

      <TodayWorkspace

        isVisible={showTodayWorkspace}

        onClose={() => setShowTodayWorkspace(false)}

      />

      

      {/* Meeting Dialer */}

      <MeetingDialer

        isVisible={showMeetingDialer}

        onClose={() => setShowMeetingDialer(false)}

      />

      

      {/* Onboarding Screen */}

      <OnboardingScreen

        isVisible={showOnboarding}

        onComplete={handleOnboardingComplete}

      />

      

      {/* About Dialog */}

      <AboutDialog

        isVisible={showAboutDialog}

        onClose={() => setShowAboutDialog(false)}

      />

      

      {/* Settings Dialog */}

      <SettingsDialog

        isVisible={showSettingsDialog}

        onClose={() => setShowSettingsDialog(false)}

      />



      <div className="container mx-auto p-8">

        {/* Header */}

        <div className="flex justify-between items-center mb-8">

          <h1 className="text-2xl font-bold">Dialer</h1>

          <div className="flex items-center gap-4">

            <div className="flex items-center gap-2">

              <div className={`w-2 h-2 rounded-full ${deviceReady ? 'bg-green-500' : 'bg-red-500'}`}></div>

              <span className="text-sm text-gray-400">

                {deviceReady ? 'Device Ready' : 'Device Not Ready'}

              </span>

            </div>

            <button

              onClick={() => setShowCopilotChat(!showCopilotChat)}

              className={`p-2 rounded-lg transition-colors ${

                showCopilotChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="AI Copilot"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />

              </svg>

            </button>

            <button

              onClick={() => setShowTranscript(!showTranscript)}

              className={`p-2 rounded-lg transition-colors ${

                showTranscript ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="Live Transcript"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

              </svg>

            </button>

            <button

              onClick={() => setShowSMSInbox(!showSMSInbox)}

              className={`p-2 rounded-lg transition-colors ${

                showSMSInbox ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="SMS Inbox"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />

              </svg>

            </button>

            <button

              onClick={() => setShowContactLookup(!showContactLookup)}

              className={`p-2 rounded-lg transition-colors ${

                showContactLookup ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="Contacts"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />

              </svg>

            </button>

            <button

              onClick={() => setShowCallHistory(!showCallHistory)}

              className={`p-2 rounded-lg transition-colors ${

                showCallHistory ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="Call History"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />

              </svg>

            </button>

            <button

              onClick={() => setShowActionItems(!showActionItems)}

              className={`p-2 rounded-lg transition-colors ${

                showActionItems ? 'bg-pink-600 hover:bg-pink-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="Action Items"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />

              </svg>

            </button>

            <button

              onClick={() => setShowTodayWorkspace(!showTodayWorkspace)}

              className={`p-2 rounded-lg transition-colors ${

                showTodayWorkspace ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-700 hover:bg-gray-600'

              }`}

              title="Today Workspace"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />

              </svg>

            </button>

            <button

              onClick={() => setShowMeetingDialer(true)}

              className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors"

              title="Join Meeting"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />

              </svg>

            </button>

            <button

              onClick={logout}

              className="text-sm text-gray-400 hover:text-white transition-colors"

            >

              Sign Out

            </button>

            <button

              onClick={() => setShowSettingsDialog(true)}

              className="p-2 text-gray-400 hover:text-white transition-colors"

              title="Settings"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />

              </svg>

            </button>

            <button

              onClick={() => setShowAboutDialog(true)}

              className="p-2 text-gray-400 hover:text-white transition-colors"

              title="About"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

              </svg>

            </button>

            <button

              onClick={handleSendLogs}

              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"

              title="Send Logs to Support"

            >

              Send Logs

            </button>

          </div>

        </div>



        {/* Device Status */}

        {!deviceReady && (

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6">

            <p className="text-yellow-200 text-sm">

              {isRegistering ? 'Registering device...' : 'Device not registered'}

            </p>

            {deviceError && (

              <p className="text-red-400 text-sm mt-2">{deviceError.message}</p>

            )}

            {!deviceReady && !isRegistering && token && tenantId && (

              <button

                onClick={() => initializeDevice()}

                className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-4 rounded transition-colors"

              >

                Initialize Device

              </button>

            )}

          </div>

        )}



        {/* Dialer Keypad */}

        <div className="max-w-md mx-auto">

          <div className="bg-gray-800 rounded-lg p-6">

            {/* Phone Number Input */}

            <input

              type="tel"

              value={phoneNumber}

              onChange={(e) => setPhoneNumber(e.target.value)}

              placeholder="Enter phone number"

              className="w-full bg-gray-700 text-white text-2xl text-center py-4 px-4 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"

              disabled={!deviceReady || isCalling}

            />



            {/* Call Button */}

            <button

              onClick={isCalling ? handleEndCall : handleMakeCall}

              disabled={!deviceReady || !phoneNumber || (!isCalling && callStatus === 'connecting')}

              className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${

                isCalling

                  ? 'bg-red-600 hover:bg-red-700'

                  : 'bg-green-600 hover:bg-green-700'

              } disabled:opacity-50 disabled:cursor-not-allowed`}

            >

              {callStatus === 'connecting' ? 'Calling...' : isCalling ? 'End Call' : 'Call'}

            </button>

            

            {/* Call Controls - Only show when call is active */}

            {isCalling && (

              <div className="mt-4 flex justify-center gap-4">

                <button

                  onClick={handleMuteToggle}

                  className={`p-4 rounded-full transition-colors ${

                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'

                  }`}

                  title={isMuted ? 'Unmute' : 'Mute'}

                >

                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    {isMuted ? (

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />

                    ) : (

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />

                    )}

                  </svg>

                </button>

                <button

                  onClick={() => setIsOnHold(!isOnHold)}

                  className={`p-4 rounded-full transition-colors ${

                    isOnHold ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 hover:bg-gray-700'

                  }`}

                  title={isOnHold ? 'Resume' : 'Hold'}

                >

                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                  </svg>

                </button>

              </div>

            )}

            

            {/* DTMF Keypad - Only show during active call */}

            {isCalling && (

              <div className="mt-6">

                <h3 className="text-sm text-gray-400 mb-3 text-center">Keypad</h3>

                <div className="grid grid-cols-3 gap-2">

                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (

                    <button

                      key={digit}

                      onClick={() => handleKeypadPress(digit)}

                      className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 rounded-lg transition-colors"

                    >

                      {digit}

                    </button>

                  ))}

                </div>

              </div>

            )}

          </div>



          {/* Audio Device Selection */}

          <div className="mt-6 bg-gray-800 rounded-lg p-6">

            <h2 className="text-lg font-semibold mb-4">Audio Devices</h2>

            

            <div className="mb-4">

              <label className="block text-sm text-gray-400 mb-2">Input Device (Microphone)</label>

              <select

                value={selectedInput || ''}

                onChange={(e) => selectInputDevice(e.target.value)}

                className="w-full bg-gray-700 text-white py-2 px-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"

              >

                <option value="">Select input device</option>

                {inputDevices.map((device) => (

                  <option key={device.deviceId} value={device.deviceId}>

                    {device.label}

                  </option>

                ))}

              </select>

            </div>



            <div>

              <label className="block text-sm text-gray-400 mb-2">Output Device (Speaker)</label>

              <select

                value={selectedOutput || ''}

                onChange={(e) => selectOutputDevice(e.target.value)}

                className="w-full bg-gray-700 text-white py-2 px-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"

              >

                <option value="">Select output device</option>

                {outputDevices.map((device) => (

                  <option key={device.deviceId} value={device.deviceId}>

                    {device.label}

                  </option>

                ))}

              </select>

            </div>

          </div>



          {/* AI Mode Controls */}

          <AIModeControls

            currentMode={aiMode}

            onModeChange={setAIMode}

            disabled={!isCalling}

          />

        </div>

      </div>

    </div>

  );

}

