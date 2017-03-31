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
import Call from './Call';
import {createVideoElement} from './utils';

const VC_ROOM_NAME = 'Matrix VR Demo';
const MEMBER_LIMIT = 9;

export default class FullMeshConference extends EventEmitter {
    constructor(options) {
        super(options);
        options = options || {};
        if (!options.client) {
            throw new Error('FullMeshConference requires a valid client');
        }
        this.client = options.client;
        this.roomAlias = options.roomAlias;

        this.active = false;

        this.peersToCall = new Set();
        this.calledPeers = new Map();
        this.callsPendingAnswer = new Map();

        this._callNewPeer = this._callNewPeer.bind(this);
        this._hangUpPeer = this._hangUpPeer.bind(this);
        this._addClientListeners = this._addClientListeners.bind(this);
        this._updatePeersToCall = this._updatePeersToCall.bind(this);
        this._onCallActive = this._onCallActive.bind(this);
        this._onCallHungUp = this._onCallHungUp.bind(this);
        this._getOrRemovePendingCall = this._getOrRemovePendingCall.bind(this);

        this.getParticipantCalls = this.getParticipantCalls.bind(this);
        this.hangUp = this.hangUp.bind(this);
        this.start = this.start.bind(this);
        this.stop = this.stop.bind(this);

        const preparePeers = () => {
            this.client.removeListener('syncComplete', preparePeers);
            this._addClientListeners();
            console.warn(`Joining conference room ${this.roomAlias}`);
            this.client.joinRoomWithAlias(this.roomAlias, {
                visibility: 'private', // not listed
                preset: 'public_chat', // join without invite, history has shared visibility
                name: `${this.roomAlias.match(/#(.+):.+/)[1]} - ${VC_ROOM_NAME}`,
                room_alias_name: this.roomAlias.match(/#(.+):.+/)[1],
            }).then((room) => {
                if (!room || !room.roomId) {
                    throw new Error('Client.joinRoom resolved:', room);
                }
                const memberCount = this.client.getJoinedMembers(room.roomId).length;
                if (memberCount > MEMBER_LIMIT) {
                    alert(`WARNING: It is not allowed to start a video conference with ` +
                        `more than ${MEMBER_LIMIT} other members. (${memberCount} ` +
                        `attempted.)\nRefresh and try a room with fewer members.`);
                    return;
                }
                console.warn('Joined conference room');
                this.roomId = room.roomId;
            }).catch((e) => console.error(`ERROR: ${e.message}`, e));
        };
        if (this.client.synced) {
            preparePeers();
        } else {
            this.client.on('syncComplete', preparePeers);
        }
    }

    _updatePeersToCall() {
        if (!this.roomId) {
            throw new Error('Cannot update room members for unknown conf room');
        }
        const peers = this.client.getJoinedMembers(this.roomId);

        // add new peers to peersToCall
        peers.reduce((acc, peer) => {
            if (!this.peersToCall.has(peer) && !this.calledPeers.has(peer)) {
                return acc.add(peer);
            }
            return acc;
        }, this.peersToCall);

        // remove peers from peersToCall who are no longer in the conf room
        this.peersToCall.forEach((peerToCall) => {
            if (!peers.find((peer) => peer === peerToCall)) {
                this.peersToCall.delete(peerToCall);
            }
        });

        // hang up on calledPeers who left the conf room
        this.calledPeers.forEach((call, calledPeer) => {
            if (!peers.find((peer) => peer === calledPeer)) {
                this._hangUpPeer(calledPeer, call);
            }
        });
    }

    _hangUpPeer(peer, call) {
        call.hangUp();
        console.warn('Emitting HANG UP');
        this.emit('participantsChanged', peer);
        call.removeListener('callActive', this._onCallActive);
        call.removeListener('hungUp', this._onCallHungUp);
        // call._cleanUp();
        this.calledPeers.delete(peer);
    }

    _getOrRemovePendingCall(call) {
        // NOTE: re-assigning call from the Map below so we can use this function
        // with the call argument as {peerId}
        call = this.callsPendingAnswer.get(call.peerId);
        call.removeListener('hangup', this._getOrRemovePendingCall);
        this.callsPendingAnswer.delete(call.peerId);
        return call;
    }

    _addClientListeners() {
        this.client.on('userJoined', (member) => {
            if (this.roomId && member.roomId === this.roomId) {
                if (!this.peersToCall.has(member.userId)) {
                    // this is needed for house keeping in _callNewPeer
                    this.peersToCall.add(member.userId);
                }
                if (this.active) {
                    this._callNewPeer(member.userId);
                }
            }
        });

        this.client.on('userLeft', (member) => {
            if (this.roomId && member.roomId === this.roomId) {
                if (this.calledPeers.has(member.userId)) {
                    const call = this.calledPeers.get(member.userId);
                    this._hangUpPeer(member.userId, call);
                }
                if (this.peersToCall.has(member.userId)) {
                    this.peersToCall.delete(member.userId);
                }
            }
        });

        this.client.on('incomingCall', (matrixCall) => {
            if (this.roomId) {
                this._updatePeersToCall();
            }
            const members = this.client.getJoinedMembers(matrixCall.roomId);
            if (members.length === 1 &&
                    (!this.roomId || this.peersToCall.has(members[0]))) {
                if (this.active && this.roomId) {
                    // auto-answer when called
                    console.warn(`${members[0]} CALLED ${this.client.userId}`);
                    this._callNewPeer(members[0], matrixCall);
                } else {
                    matrixCall.peerId = members[0];
                    this.callsPendingAnswer.set(members[0], matrixCall);
                    matrixCall.on('hangup', this._getOrRemovePendingCall);
                }
            }
        });
    }

    _onCallActive(peerId) {
        console.warn(`participantsChanged: ${peerId} joined`);
        this.emit('participantsChanged', peerId);
    }

    _onCallHungUp(peerId) {
        console.warn(`participantsChanged: ${peerId} left`);
        const call = this.calledPeers.get(peerId);
        call.removeListener('callActive', this._onCallActive);
        call.removeListener('hungUp', this._onCallHungUp);
        // call._cleanUp();
        this.calledPeers.delete(peerId);
        this.peersToCall.add(peerId);
        this.emit('participantsChanged', peerId);
    }

    _callNewPeer(peerId, matrixCall) {
        const assetsElement = document.getElementById('assets');
        const id = peerId.replace(/[^a-zA-Z0-9]/g, '');
        const localVideo = createVideoElement(true, id);
        const remoteVideo = createVideoElement(false, id);

        const opts = {
            id: id,
            client: this.client,
            parentElement: assetsElement,
            localVideo: localVideo,
            remoteVideo: remoteVideo,
            peerId: peerId,
        };

        if (this.callsPendingAnswer.has(peerId)) {
            matrixCall = this._getOrRemovePendingCall({peerId});
        }

        if (matrixCall) {
            // incoming call
            opts.matrixCall = matrixCall;
        }

        const call = new Call(opts);
        call.on('callActive', this._onCallActive);
        call.on('hungUp', this._onCallHungUp);

        if (matrixCall) {
            // incoming call
            call.answer();
        } else {
            // outgoing call
            call.callPeer();
        }

        this.calledPeers.set(peerId, call);
        this.peersToCall.delete(peerId);
    }

    start() {
        this.active = true;
    }

    stop() {
        this.active = false;
    }

    callPeers() {
        const doIt = () => {
            this.client.removeListener('syncComplete', doIt);
            this._updatePeersToCall();
            this.peersToCall.forEach((peer) => {
                console.warn(`${this.client.userId} MAKING CALL TO ${peer}`);
                this._callNewPeer(peer);
            });
        };
        if (this.client.synced) {
            doIt();
        } else {
            this.client.on('syncComplete', doIt);
        }
    }

    hangUp() {
        this.calledPeers.forEach((call, peer) => {
            this._hangUpPeer(peer, call);
            this.peersToCall.add(peer);
        });
    }

    getParticipantCalls() {
        const calls = [];
        this.calledPeers.forEach((call) => calls.push(call));
        return calls;
    }
}
