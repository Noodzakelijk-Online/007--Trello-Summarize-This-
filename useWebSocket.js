import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import adminApi from '../api/adminApi';

const WEBSOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

export function useWebSocket(options = {}) {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onMessage,
    onError,
    onOpen,
    onClose
  } = options;

  const { isAuthenticated, token } = useAuth();
  const [connectionState, setConnectionState] = useState(WEBSOCKET_STATES.CLOSED);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WEBSOCKET_STATES.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          startHeartbeat();
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval]);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Handle pong response
      if (data.type === 'pong') {
        return;
      }
      
      setLastMessage(data);
      if (onMessage) {
        onMessage(data);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      setError(error);
    }
  }, [onMessage]);

  const handleOpen = useCallback(() => {
    console.log('WebSocket connected');
    setConnectionState(WEBSOCKET_STATES.OPEN);
    setError(null);
    reconnectAttemptsRef.current = 0;
    
    startHeartbeat();
    
    if (onOpen) {
      onOpen();
    }
  }, [onOpen, startHeartbeat]);

  const handleError = useCallback((error) => {
    console.error('WebSocket error:', error);
    setError(error);
    
    if (onError) {
      onError(error);
    }
  }, [onError]);

  const handleClose = useCallback((event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    setConnectionState(WEBSOCKET_STATES.CLOSED);
    clearTimeouts();
    
    if (onClose) {
      onClose(event);
    }

    // Attempt to reconnect if not manually closed and still authenticated
    if (!isManuallyClosedRef.current && 
        isAuthenticated && 
        reconnectAttemptsRef.current < reconnectAttempts) {
      
      reconnectAttemptsRef.current += 1;
      console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    }
  }, [onClose, clearTimeouts, isAuthenticated, reconnectAttempts, reconnectInterval]);

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      console.log('Cannot connect WebSocket: not authenticated');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WEBSOCKET_STATES.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      setConnectionState(WEBSOCKET_STATES.CONNECTING);
      isManuallyClosedRef.current = false;
      
      wsRef.current = adminApi.connectWebSocket(
        handleMessage,
        handleError,
        handleClose
      );

      wsRef.current.onopen = handleOpen;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError(error);
      setConnectionState(WEBSOCKET_STATES.CLOSED);
    }
  }, [isAuthenticated, token, handleMessage, handleError, handleClose, handleOpen]);

  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearTimeouts();
    
    if (wsRef.current) {
      if (wsRef.current.readyState === WEBSOCKET_STATES.OPEN) {
        setConnectionState(WEBSOCKET_STATES.CLOSING);
        wsRef.current.close(1000, 'Manual disconnect');
      } else {
        setConnectionState(WEBSOCKET_STATES.CLOSED);
      }
      wsRef.current = null;
    }
  }, [clearTimeouts]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WEBSOCKET_STATES.OPEN) {
      try {
        const messageString = typeof message === 'string' 
          ? message 
          : JSON.stringify(message);
        wsRef.current.send(messageString);
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        setError(error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected');
      return false;
    }
  }, []);

  const subscribe = useCallback((channel) => {
    return sendMessage({
      type: 'subscribe',
      channel: channel
    });
  }, [sendMessage]);

  const unsubscribe = useCallback((channel) => {
    return sendMessage({
      type: 'unsubscribe',
      channel: channel
    });
  }, [sendMessage]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && token) {
      connect();
    } else if (!isAuthenticated) {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, token, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [clearTimeouts]);

  return {
    // Connection state
    connectionState,
    isConnecting: connectionState === WEBSOCKET_STATES.CONNECTING,
    isConnected: connectionState === WEBSOCKET_STATES.OPEN,
    isClosing: connectionState === WEBSOCKET_STATES.CLOSING,
    isClosed: connectionState === WEBSOCKET_STATES.CLOSED,
    
    // Data
    lastMessage,
    error,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    
    // Reconnection info
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts: reconnectAttempts
  };
}

// Specialized hook for real-time metrics
export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState({});

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'metrics_update':
        setMetrics(prevMetrics => ({
          ...prevMetrics,
          ...data.payload
        }));
        break;
        
      case 'alert':
        setAlerts(prevAlerts => [data.payload, ...prevAlerts.slice(0, 49)]); // Keep last 50 alerts
        break;
        
      case 'system_health':
        setSystemHealth(data.payload);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  const ws = useWebSocket({
    onMessage: handleMessage,
    onOpen: () => {
      console.log('Real-time metrics WebSocket connected');
    },
    onError: (error) => {
      console.error('Real-time metrics WebSocket error:', error);
    }
  });

  // Subscribe to metrics channels on connection
  useEffect(() => {
    if (ws.isConnected) {
      ws.subscribe('system_metrics');
      ws.subscribe('user_metrics');
      ws.subscribe('transaction_metrics');
      ws.subscribe('alerts');
      ws.subscribe('system_health');
    }
  }, [ws.isConnected, ws.subscribe]);

  return {
    ...ws,
    metrics,
    alerts,
    systemHealth,
    clearAlerts: () => setAlerts([])
  };
}

// Specialized hook for user activity monitoring
export function useUserActivity() {
  const [activities, setActivities] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'user_activity':
        setActivities(prevActivities => 
          [data.payload, ...prevActivities.slice(0, 99)] // Keep last 100 activities
        );
        break;
        
      case 'online_users_count':
        setOnlineUsers(data.payload.count);
        break;
        
      default:
        console.log('Unknown user activity message:', data.type);
    }
  }, []);

  const ws = useWebSocket({
    onMessage: handleMessage
  });

  useEffect(() => {
    if (ws.isConnected) {
      ws.subscribe('user_activity');
      ws.subscribe('online_users');
    }
  }, [ws.isConnected, ws.subscribe]);

  return {
    ...ws,
    activities,
    onlineUsers,
    clearActivities: () => setActivities([])
  };
}

export default useWebSocket;

