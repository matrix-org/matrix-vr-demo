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


/*jshint esversion: 6 */

import 'aframe';
import 'babel-polyfill';
import {Entity, Scene} from 'aframe-react';
import React from 'react';
import ReactDOM from 'react-dom';

import {default as dispatcher} from './common/dispatcher';

import Assets from './components/Assets';
import Loader from 'react-loader';
import Lobby from './components/Lobby';
import Person from './components/Person';
import TourismScene from './components/TourismScene';

import Call from './components/structures/Call';
import Client from './components/structures/Client';
import FullMeshConference from './components/structures/FullMeshConference';
import InputEventHandler from './components/structures/InputEventHandler';

import Login from './components/views/Login';

const SCENE_TRANSITION_DURATION = 1000;
const defaultRoom = 'lobby';
let firstLoad = true;
let currentRoom = defaultRoom;
let confReady = false;

window.setConfReady = function() {
    console.warn('Conference ready');
    confReady = true;
};

class VRScene extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            call: null,
            loaded: false,
            assetsLoaded: false,
            stats: window.location.hostname === '127.0.0.1' ||
                window.location.hostname === 'localhost',
            vrMode: false,
            ringbackPlayed: false,
        };

        this.ringbackDidPlay = this.ringbackDidPlay.bind(this);
    }

    onLoaded() {
        console.log('Scene loaded');
        this.setState({loaded: true});

        let call;
        if (this.props.client.peerId) {
            call = new Call({
                client: this.props.client,
                parentElement: document.getElementById('assets'),
                localVideo: document.getElementById('local'),
                remoteVideo: document.getElementById('lobbyVideo'),
                peerId: this.props.client.peerId,
            });
        }

        const conference = new FullMeshConference({
            client: this.props.client,
            roomAlias: this.props.client.roomAlias,
        });

        conference.on('ready', window.setConfReady);

        const newState = {
            call: call,
            conference: conference,
        };

        if (this.props.client.synced) {
          newState.clientSynced = true;
        } else {
          this.props.client.on('syncComplete', this._onSyncComplete.bind(this));
        }
        this.setState(newState);

        // Play some annoying welcome sounds
        if (firstLoad) {
            setTimeout(() => document.querySelector('#blip1-sound').play(), 2000);
            setTimeout(() => document.querySelector('#blip2-sound').play(), 2300);
            firstLoad = false;
        }

        // Detect and handle VR mode
        const s = document.querySelector('a-scene');
        s.addEventListener('enter-vr', () => {
            console.warn('Entered VR');
            this.setState({vrMode: true});
        });
        s.addEventListener('exit-vr', () => {
            console.warn('Exited VR');
            this.setState({vrMode: false});
        });
    }

    _onSyncComplete() {
        console.warn('Matrix client sync complete');
        this.setState({clientSynced: true});
    }

    assetsLoadingProgress() {
        console.log('Progress loading assets');
    }

    assetsLoadingFinished() {
        console.warn('Assets loaded');
        this.setState({assetsLoaded: true});
    }

    assetsLoadingTimeout() {
        console.warn('Asset loading timed out ... proceeding anyway');
        this.setState({assetsLoaded: true});
    }

    _onHashChange() {
        window.location.reload();
    }

    _onKeyEvent(key) {
        switch (key) {
            case 'i':
                this.setState({stats: !this.state.stats});
                break;
            default:
                break;
        }
    }

    componentDidMount() {
        window.addEventListener('hashchange', this._onHashChange);
        dispatcher.on('keyEvent', this._onKeyEvent.bind(this));
    }

    componentWillUnmount() {
        if (this.conference) {
            this.conference.removeListener('ready', window.setConfReady);
        }
        dispatcher.removeListener('keyEvent', this._onKeyEvent.bind(this));
        window.removeEventListener('hashchange', this._onHashChange);
    }

    componentWillUpdate(nextProps, nextState) {
        if (this.state.call && this.state.conference) {
            if (this.props.room !== 'videoConf' && nextProps.room === 'videoConf') {
                console.warn('Stopping video call');
                this.state.call.hangUp();
                console.warn('Starting video conference');
                this.state.conference.start();
                this.state.conference.callPeers();
            } else if (this.props.room === 'videoConf' &&
                    nextProps.room !== 'videoConf') {
                console.warn('Stopping video conference');
                this.state.conference.hangUp();
                this.state.conference.stop();
                console.warn('Starting video call');
                this.state.call.callPeer();
            }
        } else {
            if (nextState.call && nextProps.room !== 'videoConf') {
                console.warn('Starting video call');
                nextState.call.callPeer();
            } else if (nextState.conference && nextProps.room === 'videoConf') {
                console.warn('Starting video conference');
                this.state.conference.start();
                nextState.conference.callPeers();
            }
        }
    }

    ringbackDidPlay() {
        this.setState({ringbackPlayed: true});
    }

    render() {
        console.warn('Rendering main scene');

        return (
            <Scene
                    ref='mainscene'
                    id='main-scene'
                    stats={this.state.stats}
                    events={{loaded: () => this.onLoaded()}}>
                <Assets
                    assetsLoadingProgress={this.assetsLoadingProgress.bind(this)}
                    assetsLoadingFinished={this.assetsLoadingFinished.bind(this)}
                    assetsLoadingTimeout={this.assetsLoadingTimeout.bind(this)}
                />
                <Loader
                    color='#FFF'
                    loaded={
                        this.state.assetsLoaded &&
                        this.state.loaded &&
                        this.state.clientSynced}>
                </Loader>
                { this.state.assetsLoaded && (<Entity>
                    <Person
                        room={this.props.room}
                        vrMode={this.state.vrMode}
                        call={this.state.call}
                        visible={this.state.assetsLoaded}
                    />

                    { (this.props.room === 'lobby' || this.props.room === 'videoConf') && (
                        <Lobby
                            room={this.props.room}
                            call={this.state.call}
                            conference={this.state.conference}
                            ringbackPlayed={this.state.ringbackPlayed}
                            ringbackDidPlay={this.ringbackDidPlay}
                        />
                    ) }
                    { this.props.room === 'tourismDemo' &&
                        <TourismScene />
                    }
                </Entity> )}
            </Scene>
        );
    }
}

VRScene.defaultProps = {
    client: null,
    room: defaultRoom,
};

VRScene.propTypes = {
    client: React.PropTypes.instanceOf(Client).isRequired,
    room: React.PropTypes.string,
};

function selectScene(scene, client) {
    if (scene === currentRoom) {
        console.warn('Already in room %s, ignoring keypress', scene);
        return;
    }

    // Check that the VC is ready
    if (scene === 'videoConf' && !confReady) {
        console.warn("VC not ready. Not changing scene");
        return;
    }

    console.log(`Setting room to ${scene}`);
    document.getElementById('main-scene').emit('scene-change');
    setTimeout(() => {
        ReactDOM.render(<VRScene room={scene} client={client} />, sceneContainer);
    }, SCENE_TRANSITION_DURATION);
    currentRoom = scene;
}

function switchScene(key, client) {
    switch (key) {
        case 'l':
            selectScene('lobby', client);
            break;
        case 't':
            selectScene('tourismDemo', client);
            break;
        case 'v':
            selectScene('videoConf', client);
            break;
        default:
    }
}

const CONF_HOME_SERVER = 'https://conf.matrix.org:8448';
const VC_ROOM_NAME = 'Matrix VR Demo';

let keyHandler;

function finalClientInit(options) {
    const client = new Client(options);
    keyHandler = new InputEventHandler({client});

    ReactDOM.render(<VRScene client={client} />, sceneContainer);

    dispatcher.on('keyEvent', (key) => switchScene(key, client));
}

let confClient;

function onLoginSubmit(options) {
    const continueInit = (options, confClient, syncCompleteCallback) => {
        if (confClient && syncCompleteCallback) {
            confClient.removeListener('syncComplete', syncCompleteCallback);

            confClient.joinRoomWithAlias(confClient.roomAlias, {
                visibility: 'private', // not listed
                preset: 'public_chat', // join without invite, history has shared visibility
                name: `${confClient.roomAlias.match(/#(.+):.+/)[1]} - ${VC_ROOM_NAME}`,
                room_alias_name: confClient.roomAlias.match(/#(.+):.+/)[1],
            }).then(({roomId}) => {
                console.warn(`${confClient.userId} created room ${roomId}`);
                confClient = null;
                finalClientInit(options);
            }).catch((e) => console.warn(confClient.userId + ': ERROR: '
                + e.message, e));
            return;
        }

        finalClientInit(options);
    };

    // if user is not authed to CONF_HOME_SERVER, create an anonymous user to
    // create the conf room
    if (options.homeserver.indexOf(CONF_HOME_SERVER) < 0 &&
            options.roomAlias.indexOf('conf.matrix.org') > -1) {
        confClient = new Client({
            guest: true,
            homeserver: CONF_HOME_SERVER,
            persistCredentials: false,
            roomAlias: options.roomAlias,
        });

        if (confClient.synced) {
            continueInit(options);
        } else {
            const syncCompleteCallback = () =>
                continueInit(options, confClient, syncCompleteCallback);
            confClient.on('syncComplete', syncCompleteCallback);
        }
    } else {
        continueInit(options);
    }
}

const sceneContainer = document.querySelector('.scene-container');
ReactDOM.render(<Login onSubmit={onLoginSubmit} />, sceneContainer);
