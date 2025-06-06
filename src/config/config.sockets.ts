// socketManager.ts - Backend WebSocket Manager
import { Server, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Server as HttpServer } from 'http';

// Type definitions for socket events
interface AuthenticateData {
    token: string;
    userId: string;
}

interface AuthenticatedResponse {
    success: boolean;
    message: string;
    socketId: string;
}

interface AuthenticationFailedResponse {
    message: string;
}

interface DeviceConnectionData {
    newDeviceSocketId?: string;
    disconnectedSocketId?: string;
    timestamp: Date;
}

interface SyncRequestData {
    requestedBy: string;
    timestamp: Date;
}

interface GameStateData {
    [key: string]: any; // Generic object for game state
}

interface ProfileData {
    [key: string]: any; // Generic object for profile data
}

// Custom JWT payload interface
interface CustomJwtPayload extends JwtPayload {
    id: string;
}

// Socket interface with custom properties
interface CustomSocket extends Socket {
    userId?: string;
}

// Server to client events
interface ServerToClientEvents {
    authenticated: (data: AuthenticatedResponse) => void;
    authentication_failed: (data: AuthenticationFailedResponse) => void;
    device_connected: (data: DeviceConnectionData) => void;
    device_disconnected: (data: DeviceConnectionData) => void;
    sync_game_state: (data: GameStateData) => void;
    sync_profile: (data: ProfileData) => void;
    sync_requested: (data: SyncRequestData) => void;
}

// Client to server events
interface ClientToServerEvents {
    authenticate: (data: AuthenticateData) => void;
    game_state_changed: (data: GameStateData) => void;
    profile_updated: (data: ProfileData) => void;
    request_sync: () => void;
}

class SocketManager {
    private io: Server<ClientToServerEvents, ServerToClientEvents>;
    
    // Store mapping of userId to array of socket IDs (multiple devices)
    private userSockets: Map<string, string[]>;
    
    // Store mapping of socket ID to user ID for cleanup
    private socketUsers: Map<string, string>;
    
    constructor(server: HttpServer) {
        this.io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        
        this.userSockets = new Map<string, string[]>();
        this.socketUsers = new Map<string, string>();
        
        this.setupSocketHandlers();
    }
    
    private setupSocketHandlers(): void {
        this.io.on('connection', (socket: CustomSocket) => {
            console.log(`Socket connected: ${socket.id}`);
            
            // Handle user authentication and registration
            socket.on('authenticate', async (data: AuthenticateData) => {
                try {
                    const { token, userId } = data;
                    
                    // Verify JWT token
                    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as CustomJwtPayload;
                    
                    if (decoded.id === userId) {
                        this.registerUserSocket(userId, socket.id);
                        socket.userId = userId;
                        
                        socket.emit('authenticated', { 
                            success: true, 
                            message: 'Successfully authenticated',
                            socketId: socket.id 
                        });
                        
                        // Notify other devices of new connection
                        this.broadcastToUserDevices(userId, 'device_connected', {
                            newDeviceSocketId: socket.id,
                            timestamp: new Date()
                        }, socket.id); // Exclude current socket
                        
                        console.log(`User ${userId} authenticated with socket ${socket.id}`);
                    } else {
                        socket.emit('authentication_failed', { message: 'Invalid token' });
                    }
                } catch (error) {
                    console.error('Authentication error:', error);
                    socket.emit('authentication_failed', { message: 'Authentication failed' });
                }
            });
            
            // Handle user game state changes
            socket.on('game_state_changed', (data: GameStateData) => {
                if (socket.userId) {
                    this.broadcastToUserDevices(socket.userId, 'sync_game_state', data, socket.id);
                }
            });
            
            // Handle user profile updates
            socket.on('profile_updated', (data: ProfileData) => {
                if (socket.userId) {
                    this.broadcastToUserDevices(socket.userId, 'sync_profile', data, socket.id);
                }
            });
            
            // Handle manual sync requests
            socket.on('request_sync', () => {
                if (socket.userId) {
                    this.broadcastToUserDevices(socket.userId, 'sync_requested', {
                        requestedBy: socket.id,
                        timestamp: new Date()
                    }, socket.id);
                }
            });
            
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`Socket disconnected: ${socket.id}`);
                this.unregisterUserSocket(socket.id);
            });
        });
    }
    
    // Register a socket for a user
    private registerUserSocket(userId: string, socketId: string): void {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
        }
        
        const userSocketIds = this.userSockets.get(userId)!;
        if (!userSocketIds.includes(socketId)) {
            userSocketIds.push(socketId);
        }
        
        this.socketUsers.set(socketId, userId);
        
        console.log(`Registered socket ${socketId} for user ${userId}. Total devices: ${userSocketIds.length}`);
    }
    
    // Unregister a socket
    private unregisterUserSocket(socketId: string): void {
        const userId = this.socketUsers.get(socketId);
        
        if (userId) {
            const userSocketIds = this.userSockets.get(userId);
            if (userSocketIds) {
                const index = userSocketIds.indexOf(socketId);
                if (index > -1) {
                    userSocketIds.splice(index, 1);
                }
                
                // Clean up if no more sockets for this user
                if (userSocketIds.length === 0) {
                    this.userSockets.delete(userId);
                }
            }
            
            this.socketUsers.delete(socketId);
            
            // Notify other devices of disconnection
            this.broadcastToUserDevices(userId, 'device_disconnected', {
                disconnectedSocketId: socketId,
                timestamp: new Date()
            });
            
            console.log(`Unregistered socket ${socketId} for user ${userId}`);
        }
    }
    
    // Broadcast message to all devices of a specific user
    private broadcastToUserDevices<K extends keyof ServerToClientEvents>(
        userId: string, 
        event: K, 
        data: Parameters<ServerToClientEvents[K]>[0], 
        excludeSocketId: string | null = null
    ): void {
        const userSocketIds = this.userSockets.get(userId);
        
        if (userSocketIds) {
            userSocketIds.forEach(socketId => {
                if (socketId !== excludeSocketId) {
                    this.io.to(socketId).emit(event, ...[data] as Parameters<ServerToClientEvents[K]>);
                }
            });
        }
    }
    
    // Broadcast to specific socket
    public emitToSocket<K extends keyof ServerToClientEvents>(
        socketId: string, 
        event: K, 
        data: Parameters<ServerToClientEvents[K]>[0]
    ): void {
        this.io.to(socketId).emit(event, ...[data] as Parameters<ServerToClientEvents[K]>);
    }
    
    // Get all socket IDs for a user
    public getUserSockets(userId: string): string[] {
        return this.userSockets.get(userId) || [];
    }
    
    // Get connected device count for a user
    public getUserDeviceCount(userId: string): number {
        const sockets = this.userSockets.get(userId);
        return sockets ? sockets.length : 0;
    }
    
    // Check if user is online
    public isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId) && this.userSockets.get(userId)!.length > 0;
    }
}

export default SocketManager;