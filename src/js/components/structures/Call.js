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


import {EventEmitter} from 'events';
import {createVideoElement} from './utils';

const CALL_ROOM_NAME = 'Matrix VR Demo';

export default class Call extends EventEmitter {
    constructor(options) {
        super(options);

        this.id = options.id || 'c' + new Date().getTime();

        options = options || {};
        // FIXME - validate
        this.client = options.client;
        this.peerId = options.peerId || '';

        this.parentElement = options.parentElement || document.body;

        this.localVideo = options.localVideo || createVideoElement(true, this.id);
        if (!this.localVideo.parentElement) {
            this.parentElement.appendChild(this.localVideo);
        }

        this.remoteVideo = options.remoteVideo ||
            createVideoElement(false, this.id);
        if (!this.remoteVideo.parentElement) {
            this.parentElement.appendChild(this.remoteVideo);
        }
        this.active = this.remoteVideo.videoWidth > 0;
        if (this.active) {
            this.emit('callActive');
        }

        this._addListeners = this._addListeners.bind(this);
        this._callPeer = this._callPeer.bind(this);
        this._cleanUp = this._cleanUp.bind(this);
        this._constructFromMatrixCall = this._constructFromMatrixCall.bind(this);
        this._debugLog = this._debugLog.bind(this);
        this._onError = this._onError.bind(this);
        this._onHangup = this._onHangup.bind(this);
        this._onLoadedMetadata = this._onLoadedMetadata.bind(this);
        this._onUserJoined = this._onUserJoined.bind(this);
        this._prepareCall = this._prepareCall.bind(this);
        this._removeListeners = this._removeListeners.bind(this);

        this.answer = this.answer.bind(this);
        this.callPeer = this.callPeer.bind(this);
        this.getLocalVideoElement = this.getLocalVideoElement.bind(this);
        this.getRemoteVideoElement = this.getRemoteVideoElement.bind(this);
        this.hangUp = this.hangUp.bind(this);

        if (options.matrixCall) {
            this._constructFromMatrixCall(options.matrixCall);
        }
    }

    _debugLog(...args) {
        console.warn(`Call ${this.id}: ${this.call && this.call.callId}:`, ...args);
    }

    _onLoadedMetadata(e) {
        this.active = true;
        this._debugLog(`Call to ${this.peerId} is now active`);
        this.emit('callActive', this.peerId);
    }

    _cleanUp() {
        if (this.call) {
            this.call.removeListener('hangup', this._onHangup);
            this.call.removeListener('error', this._onError);
        }
        this.client.removeListener('syncComplete', this._prepareCall);
        this.client.removeListener('userJoined', this._onUserJoined);
    }

    _onHangup() {
        if (this._replacementCall) {
            this._debugLog(`Observed glare for outgoing call ${this.call.callId}` +
                `, replacing with incoming call ${this._replacementCall.callId}`);
            this._replacementCall = null;
            return;
        }
        this._debugLog(this.client.userId + ': Hang up.' +
            (this._lastError ? ' Last error: ' + this._lastError : ''));
        this.emit('hungUp', this.peerId);
        this._removeListeners();
    }

    _onError(err) {
        this._lastError = err.message;
        this._debugLog(`ERROR: ${err.message}\n${err.stack}`);
        this.call.hangup();
    }

    _addListeners() {
        this.remoteVideo.addEventListener('loadedmetadata', this._onLoadedMetadata);
        this.call.on('hangup', this._onHangup);
        this.call.on('error', this._onError);
    }

    _removeListeners() {
        this.remoteVideo.removeEventListener('loadedmetadata', this._onLoadedMetadata);
        this.call.removeListener('hangup', this._onHangup);
        this.call.removeListener('error', this._onError);
    }

    _constructFromMatrixCall(matrixCall) {
        this.call = matrixCall;
        this._addListeners();
        matrixCall.setLocalVideoElement(this.localVideo);
        matrixCall.setRemoteVideoElement(this.remoteVideo);
    }

    _callPeer(peer) {
        this.call = this.client.createCall(peer.roomId);
        this._debugLog(`${this.client.userId} CALLING ${peer.userId}`);
        this._addListeners();
        const onReplaced = (newCall) => {
            this._debugLog(`Glare detected, replacing call with ${newCall.callId}`);
            this.call.removeListener('replaced', onReplaced);
            this._replacementCall = newCall;
        };
        this.call.on('replaced', onReplaced);
        this.call.placeVideoCall(this.remoteVideo, this.localVideo);
    }

    answer() {
        if (this.call) {
            this.call.answer();
        }
    }

    _onUserJoined(member) {
        if (member.userId === this.peerId) {
            this._callPeer(member);
        }
    }

    _prepareCall() {
        this.client.on('userJoined', this._onUserJoined);

        // check whether we're already in a room with the peer and if so, call them
        const rooms = this.client.getRooms();
        for (let i = 0; i < rooms.length; i++) {
            const members = this.client.getJoinedMembers(rooms[i]);
            if (members.length === 1 && members[0] === this.peerId) {
                this._callPeer({
                    userId: members[0],
                    roomId: rooms[i],
                });
                return;
            }
        }

        // create room as initiator and invite peer
        this.client.createRoom({
            visibility: 'private',
            invite: [this.peerId],
            name: CALL_ROOM_NAME,
        }).then(({roomId}) => {
            this._debugLog(`${this.client.userId} created room ${roomId}`
                + ` and invited ${this.peerId}`);
        }).catch((e) => this._debugLog(this.client.userId + ': ERROR: '
            + e.message + '\n' + e.stack));
    }

    callPeer() {
        console.log(`Calling ${this.peerId}`);
        if (this.client.synced) {
            this._prepareCall();
        } else {
            this.client.on('syncComplete', this._prepareCall);
        }
    }

    getLocalVideoElement() {
        return this.localVideo;
    }

    getRemoteVideoElement() {
        return this.remoteVideo;
    }

    hangUp() {
        if (this.call) {
            console.log(`Hanging up on ${this.peerId}`);
            this.call.hangup();
            this.active = false;
        }
    }
}
