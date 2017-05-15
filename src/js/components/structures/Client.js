/*
Copyright 2017 Vector Creations Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


import {default as matrixcs} from 'matrix-js-sdk';
import {EventEmitter} from 'events';

const localStorage = window.localStorage;

export default class Client extends EventEmitter {
    constructor(options) {
        super(options);

        this.synced = false;

        options = options || {};
        // FIXME - validate
        if (options.guest) {
            this.homeserver = 'https://conf.matrix.org:8448';
            this.guest = true;
        } else {
            this.username = options.username || '';
            this.password = options.password || '';
            this.accessToken = options.accessToken;
            this.homeserver = options.homeserver || '';
        }
        this.peerId = options.peerId || '';
        this.roomAlias = options.roomAlias || '';

        this._persist = options.hasOwnProperty('persistCredentials') ?
            options.persistCredentials : true;

        this._debugLog = this._debugLog.bind(this);
        this._persistCredentials = this._persistCredentials.bind(this);
        this._initClient = this._initClient.bind(this);
        this._syncClient = this._syncClient.bind(this);
        this._makeRoomEventPromise = this._makeRoomEventPromise.bind(this);
        this._makeRoomStateEventPromise = this._makeRoomStateEventPromise.bind(this);
        this._waitForRoom = this._waitForRoom.bind(this);
        this._waitForRoomAndAliases = this._waitForRoomAndAliases.bind(this);

        this.createCall = this.createCall.bind(this);
        this.createRoom = this.createRoom.bind(this);
        this.joinRoomWithAlias = this.joinRoomWithAlias.bind(this);
        this.joinRoomWithId = this.joinRoomWithId.bind(this);
        this.leaveRoom = this.leaveRoom.bind(this);
        this.getDisplayNameForUser = this.getDisplayNameForUser.bind(this);
        this.getRooms = this.getRooms.bind(this);
        this.getRoomAliases = this.getRoomAliases.bind(this);
        this.getRoomIdForAlias = this.getRoomIdForAlias.bind(this);

        this._initClient();
    }

    _debugLog(...args) {
        console.warn(`Client: ${this.username}:`, ...args);
    }

    _persistCredentials() {
        this._debugLog('Persisting credentials to localStorage');
        localStorage.setItem('mxvr_user_id', this.userId);
        localStorage.setItem('mxvr_access_token', this.accessToken);
        localStorage.setItem('mxvr_hs_url', this.homeserver);
        if (this.peerId) {
            localStorage.setItem('mxvr_peer_id', this.peerId);
        } else if (localStorage.getItem('mxvr_peer_id')) {
            localStorage.removeItem('mxvr_peer_id');
        }
        if (this.roomAlias) {
            localStorage.setItem('mxvr_conf_room_alias', this.roomAlias);
        }
        localStorage.setItem('mxvr_device_id', this.deviceId);
    }

    _initClient() {
        setTimeout(() => {
            if (this.accessToken) {
                this.userId = localStorage.getItem('mxvr_user_id');
                this.deviceId = localStorage.getItem('mxvr_device_id');

                this._debugLog('Logged in successfully');
                if (this._persist) {
                    this._persistCredentials();
                }
                this._syncClient();
                return;
            }
            const loginClient = matrixcs.createClient(this.homeserver);
            let loginPromise;
            if (this.guest) {
                this.username = 'mxvr' + Date.now();
                this._debugLog('Registering guest user:', this.username);
                loginPromise = loginClient.register(
                    this.username,
                    Math.random().toString(36).substring(7),
                    null,
                    {type: 'm.login.dummy'},
                );
            } else {
                this._debugLog('Logging in...');
                loginPromise = loginClient.loginWithPassword(this.username,
                    this.password);
            }
            loginPromise.then((data) => {
                this.accessToken = data.access_token;
                this.userId = data.user_id;
                this.deviceId = data.device_id;

                this._debugLog('Logged in successfully');
                if (this._persist) {
                    this._persistCredentials();
                }
                this._syncClient();
            }, (e) => console.error('ERROR: Failed to log in:', e));
        }, 0);
    }

    _syncClient() {
        const opts = {
            baseUrl: this.homeserver,
            accessToken: this.accessToken,
            userId: this.userId,
            deviceId: this.deviceId,
        };
        this.client = matrixcs.createClient(opts);
        this.client.on('sync', (state, prevState, data) => {
            switch (state) {
                case 'PREPARED':
                    this._debugLog('Sync completed');
                    this.synced = true;
                    this.emit('syncComplete');
                    break;
            }
        });

        this.client.on('RoomMember.membership', (event, member) => {
            const room = this.client.getRoom(member.roomId);
            switch (member.membership) {
                case 'invite':
                    if (member.userId === this.userId) {
                        if (!room || room.getJoinedMembers()
                                .filter((m) => m.userId === this.userId).length === 0) {
                            this._debugLog(`${member.userId} not yet a member` +
                                ` - joining ${member.roomId}`);
                            // auto-join when invited and not a member
                            this.joinRoomWithId(member.roomId)
                            .then((room) => {
                                this._debugLog(`Auto-joined room ${member.roomId}`);
                            }).catch((e) => console.error(e));
                        }
                    }
                    break;
                case 'join':
                    if (this.synced) {
                        // too chatty
                        // this._debugLog(`Remote user ${member.userId} joined room ${member.roomId}`);
                        this.emit('userJoined', {
                            roomId: member.roomId,
                            userId: member.userId,
                        });
                    }
                    break;
                case 'leave':
                    if (this.synced) {
                        // too chatty
                        // this._debugLog(`Remote user ${member.userId} left room ${member.roomId}`);
                        this.emit('userLeft', {
                            roomId: member.roomId,
                            userId: member.userId,
                        });
                    }
                    break;
                default:
                    break;
            }
        });

        this.client.on('Room', (room) => {
            this._debugLog(`${this.userId} joined ${room.roomId}`);
            this.emit('joinedRoom', room.roomId);
        });

        this.client.on('Call.incoming', (call) => {
            if (this.synced) {
                this._debugLog(`Incoming call in room ${call.roomId}`);
                this.emit('incomingCall', call);
            }
        });

        this.client.on('Room.timeline', (event, room, toStartOfTimeline,
                removed, data) => {
            if (this.synced && !toStartOfTimeline && data.liveEvent) {
                switch (event.getType()) {
                    case 'm.room.message':
                        this.emit('message', {
                            roomId: room.roomId,
                            userId: event.getSender(),
                            content: event.getContent(),
                        });
                        break;
                    default:
                        // too chatty: this._debugLog('Event received', event.getType());
                }
            }
        });

        this.client.startClient();
    }

    createCall(roomId) {
        return matrixcs.createNewMatrixCall(this.client, roomId);
    }

    async createRoom(options) {
        try {
            const createdRoom = await this.client.createRoom(options);
            const room = await this._waitForRoom(createdRoom.room_id, 'createRoom');
            return room;
        } catch (e) {
            throw e;
        }
    }

    _makeRoomEventPromise(roomId, caller) {
        let timeoutId;
        let roomCallback;
        const promise = new Promise((resolve, reject) => {
            roomCallback = (room) => {
                if (room && room.roomId === roomId) {
                    this._debugLog('JS SDK received Room event:', room);
                    clearTimeout(timeoutId);
                    this.client.removeListener('Room', roomCallback);
                    resolve(room);
                }
            };
            timeoutId = setTimeout(() => {
                this.client.removeListener('Room', roomCallback);
                reject(new Error(`Timed out waiting for sync event for ${caller} ` +
                    `room ${roomId}`));
            }, 30 * 1000); // 30 seconds because maybe matrix.org is struggling
            this.client.on('Room', roomCallback);
        });
        return {
            promise,
            timeoutId,
            roomCallback,
        };
    }

    _makeRoomStateEventPromise(roomAlias, caller) {
        let timeoutId;
        let roomStateCallback;
        const promise = new Promise((resolve, reject) => {
            roomStateCallback = (event, state) => {
                const events = state.getStateEvents('m.room.aliases');
                if (!events) {
                    return;
                }
                events.map((event) => {
                    if (!event) {
                        return;
                    }
                    event.getContent().aliases.map((alias) => {
                        if (alias === roomAlias) {
                            // room exists and we are joined
                            this._debugLog(`JS SDK (${caller}) received alias`, alias);
                            clearTimeout(timeoutId);
                            this.client.removeListener('RoomState.events',
                                roomStateCallback);
                            resolve(true);
                        }
                    });
                });
            };
            timeoutId = setTimeout(() => {
                this.client.removeListener('RoomState.events', roomStateCallback);
                reject(new Error(`Timed out waiting for sync event for ${caller} ` +
                    `room ${roomAlias}`));
            }, 30 * 1000); // 30 seconds because maybe matrix.org is struggling
            this.client.on('RoomState.events', roomStateCallback);
        });
        return {
            promise,
            timeoutId,
            roomStateCallback,
        };
    }

    async _waitForRoom(roomId, caller) {
        try {
            let room = this.client.getRoom(roomId);
            if (!room) {
                const roomEvent = this._makeRoomEventPromise(roomId, caller);
                room = await roomEvent.promise;
            }
            if (!room) {
                throw new Error(`JS SDK (${caller}) did not receive Room event` +
                    'and so does not have the room');
            }
            return room;
        } catch (e) {
            throw e;
        }
    }

    async _waitForRoomAndAliases(caller, roomAlias, roomId) {
        try {
            const room = await this._waitForRoom(roomId, caller);
            let hasAlias = room.getAliases().find((alias) => alias === roomAlias);
            if (!hasAlias) {
                const roomStateEvent = this._makeRoomStateEventPromise(roomAlias, caller);
                hasAlias = await roomStateEvent.promise;
            }
            if (!hasAlias) {
                throw new Error(`JS SDK (${caller}) did not receive aliases for room`);
            }
            this._debugLog('JS SDK joined', roomAlias, ':', room);
            // room exists and we are joined
            this._debugLog(`${this.userId} joined ${roomAlias} (${caller})`);
            return room;
        } catch (e) {
            throw e;
        }
    }

    async joinRoomWithAlias(roomAlias, createOptions) {
        try {
            this._debugLog(`Attempting to join room ${roomAlias}`);
            const joinedRoom = await this.client.joinRoom(roomAlias);
            const room = await this._waitForRoomAndAliases('joinRoom',
                roomAlias, joinedRoom.roomId);
            return room;
        } catch (e) {
            if (e.errcode === 'M_NOT_FOUND') {
                this._debugLog(`IGNORE THE 404 - Attempting to create room ${roomAlias}`);
                // room does not exist
                const createdRoom = await this.client.createRoom(createOptions);
                const room = await this._waitForRoomAndAliases('createRoom',
                    roomAlias, createdRoom.room_id);
                return room;
            } else {
                throw e;
            }
        }
    }

    async joinRoomWithId(roomId) {
        this._debugLog(`Attempting to join room ${roomId}`);
        try {
            const joinedRoom = await this.client.joinRoom(roomId);
            const room = await this._waitForRoom(joinedRoom.roomId, 'joinRoom');
            return room;
        } catch (e) {
            throw e;
        }
    }

    leaveRoom(roomId) {
        return this.client.leave(roomId);
    }

    getDisplayNameForUser(userId) {
        const user = this.client.getUser(userId);
        return user && user.displayName ? user.displayName : userId;
    }

    getJoinedMembers(roomId) {
        const room = this.client.getRoom(roomId);
        if (!room) {
            this._debugLog(`Room ${roomId} not found`);
            return [];
        }

        return room.getJoinedMembers()
        .map((m) => m.userId)
        .filter((m) => m !== this.userId);
    }

    getRooms() {
        return this.client.getRooms().map((room) => room.roomId);
    }

    getRoomAliases(roomId) {
        const room = this.client.getRoom(roomId);
        if (!room) {
            this._debugLog(`Room ${roomId} not found`);
            return [];
        }
        return room.getAliases();
    }

    getRoomIdForAlias(alias) {
        return this.client.getRoomIdForAlias(alias).then((roomId) => roomId);
    }

    mxcUrlToHttp(mxcUrl) {
        return this.client.mxcUrlToHttp(mxcUrl);
    }
}
