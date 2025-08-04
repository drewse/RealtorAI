
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureGate } from '@/lib/feature-flags';
import SmartAlertsPanel from './SmartAlertsPanel';

interface SmartAlert {
  id: string;
  type: 'property-match';
  clientId: string;
  propertyId: string;
  timestamp: any;
  matchScore: number;
  read: boolean;
  matchReasons: string[];
  clientName?: string;
  propertyAddress?: string;
}

export default function Header() {
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const { user } = useAuth();
  const { isEnabled: smartAlertsEnabled } = useFeatureGate('smartAlerts');

  useEffect(() => {
    if (!user || !smartAlertsEnabled) {
      setAlerts([]);
      return;
    }

    console.log('🔔 Loading smart alerts for user:', user.uid);

    const alertsQuery = query(
      collection(db, 'alerts'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alertsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SmartAlert[];

      // Sort by timestamp (newest first) and match score (highest first)
      const sortedAlerts = alertsData.sort((a, b) => {
        // First sort by read status (unread first)
        if (a.read !== b.read) {
          return a.read ? 1 : -1;
        }
        // Then by match score (highest first)
        if (a.matchScore !== b.matchScore) {
          return b.matchScore - a.matchScore;
        }
        // Finally by timestamp (newest first)
        return b.timestamp?.seconds - a.timestamp?.seconds;
      });

      setAlerts(sortedAlerts);
      console.log(`🔔 Loaded ${alertsData.length} smart alerts (${alertsData.filter(a => !a.read).length} unread)`);
    }, (error) => {
      console.error('❌ Error loading smart alerts:', error);
    });

    return unsubscribe;
  }, [user, smartAlertsEnabled]);

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, {
        read: true,
        readAt: new Date()
      });
      console.log('✅ Alert marked as read:', alertId);
    } catch (error) {
      console.error('❌ Error marking alert as read:', error);
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <>
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold font-['Pacifico'] text-sm">S</span>
            </div>
            <span className="text-white font-bold font-['Pacifico'] text-xl">ShowAI</span>
          </div>
          
          {/* Smart Alerts Notification Bell - Only show if feature is enabled */}
          {smartAlertsEnabled && (
            <button
              onClick={() => setShowAlertsPanel(true)}
              className="relative p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-notification-line text-xl"></i>
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Smart Alerts Panel */}
      {showAlertsPanel && (
        <SmartAlertsPanel
          alerts={alerts}
          onClose={() => setShowAlertsPanel(false)}
          onMarkAsRead={handleMarkAsRead}
        />
      )}
    </>
  );
}
