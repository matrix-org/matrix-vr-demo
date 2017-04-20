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


import React from 'react';
import {default as SillyId} from 'sillyid';
import {default as webglDetect} from 'webgl-detect';

import {getParameterByName} from '../structures/utils';

const localStorage = window.localStorage;

const USERNAME_REGEX = /@(.+):(.+)/;
const ROOM_ALIAS_REGEX = /#\/room\/(#[^:]+:[^?]+)/;
const CONF_HOME_SERVER = 'https://conf.matrix.org:8448';

function postAlert(message) {
    const msg = 'ERROR: ' + message;
    alert(msg);
    console.warn(msg);
}

function getRoomAlias(roomAlias, homeserver) {
    if (roomAlias && roomAlias.length > 0) {
        const roomAliasMatches = roomAlias.match(/#(.+):(.+)/);
        if (roomAliasMatches && roomAliasMatches.length === 3) {
            return roomAlias;
        } else if (roomAlias[0] !== '#' &&
                roomAlias.indexOf(':') < 0) {
            let hsHostname = '[HOME SERVER MUST BE SET]';
            if (homeserver) {
                const a = document.createElement('a');
                a.href = homeserver;
                hsHostname = a.hostname;
            }
            let prefix = 'vrvc_';
            if (roomAlias.indexOf(prefix) > -1) {
                prefix = '';
            }
            return `#${prefix}${roomAlias}:${hsHostname}`;
        }
    }
    return '';
}

function makeHash(roomAlias, peerId) {
    let queryParams = '';
    if (peerId && peerId.length > 0) {
        queryParams = `?guideId=${peerId}`;
    }
    return `/room/${getRoomAlias(roomAlias, CONF_HOME_SERVER)}${queryParams}`;
}

export default class Login extends React.Component {
    constructor(props) {
        super(props);
        this.onSubmitForm = this.onSubmitForm.bind(this);
        this.onUsernameChanged = this.onUsernameChanged.bind(this);
        this.onPasswordChanged = this.onPasswordChanged.bind(this);
        this.onHomeserverChanged = this.onHomeserverChanged.bind(this);
        this.onPeerIdBlur = this.onPeerIdBlur.bind(this);
        this.onPeerIdChanged = this.onPeerIdChanged.bind(this);
        this.onRoomAliasBlur = this.onRoomAliasBlur.bind(this);
        this.onRoomAliasChanged = this.onRoomAliasChanged.bind(this);
        this.onGuestLoginClicked = this.onGuestLoginClicked.bind(this);
        this.onMatrixLoginClicked = this.onMatrixLoginClicked.bind(this);
        this.onGenerateRoomNameClicked = this.onGenerateRoomNameClicked.bind(this);
        this.onClearLocalStorageClicked = this.onClearLocalStorageClicked.bind(this);
        this.canPlayH264 = this.canPlayH264.bind(this);

        this.generateRoomAlias = this.generateRoomAlias.bind(this);

        this._onHashChange = this._onHashChange.bind(this);

        this.sid = new SillyId([
            {type: 'adj', letter: '*'},
            {type: 'noun', letter: '*'},
        ], '-', false);

        const state = {
            username: '',
            password: '',
            accessToken: null,
            homeserver: CONF_HOME_SERVER,
            peerId: getParameterByName('guideId'),
            roomAlias: null,
            loginType: 'guest',
        };

        const roomAliasFromUrl = window.location.hash.match(ROOM_ALIAS_REGEX);
        if (roomAliasFromUrl) {
            state.roomAlias = roomAliasFromUrl[1];
        }

        if (localStorage) {
            state.peerId = state.peerId ||
                localStorage.getItem('mxvr_peer_id');
            state.roomAlias = state.roomAlias ||
                localStorage.getItem('mxvr_conf_room_alias');

            const hsUrl = localStorage.getItem('mxvr_hs_url');
            const accessToken = localStorage.getItem('mxvr_access_token');
            const userId = localStorage.getItem('mxvr_user_id');

            if (hsUrl && accessToken && userId) {
                state.username = userId.match(USERNAME_REGEX)[1];
                state.password = '';
                state.accessToken = accessToken;
                state.homeserver = hsUrl;
            }
        }

        if (!state.roomAlias) {
            state.roomAlias = this.generateRoomAlias();
        }

        window.location.hash = makeHash(state.roomAlias, state.peerId);

        this.state = state;
    }

    _onHashChange() {
        const newState = {};
        const roomAlias = window.location.hash.match(ROOM_ALIAS_REGEX);
        if (roomAlias) {
            newState.roomAlias = roomAlias[1];
        }
        const guideId = getParameterByName('guideId');
        if (guideId) {
            newState.peerId = guideId;
        }
        if (Object.keys(newState).length > 0) {
            this.setState(newState);
        }
    }

    componentDidMount() {
        window.addEventListener('hashchange', this._onHashChange);
    }

    componentWillUnmount() {
        window.removeEventListener('hashchange', this._onHashChange);
    }

    generateRoomAlias() {
        let alias;
        do {
            alias = this.sid.generate();
        } while (alias.length > 20);
        return alias;
    }

    onGenerateRoomNameClicked() {
        window.location.hash = makeHash(this.generateRoomAlias(), this.state.peerId);
    }

    onClearLocalStorageClicked() {
        [
            'access_token',
            'conf_room_alias',
            'hs_url',
            'peer_id',
            'room_alias',
            'user_id',
        ].map((key) => localStorage.removeItem(`mxvr_${key}`));
    }

    onSubmitForm(event) {
        event.preventDefault();

        // note: password or access token set below
        const formData = {};

        if (this.state.homeserver.length < 1) {
            postAlert('Home server must be set.');
            return false;
        }
        formData.homeserver = this.state.homeserver;

        if (this.state.peerId.length >= 4) { // '@a:b'.length === 4
            const peerIdMatches = this.state.peerId.match(USERNAME_REGEX);
            if (!peerIdMatches || peerIdMatches.length < 3) {
                postAlert('Invalid 1:1 peer ID.');
                return false;
            }
            if (peerIdMatches[1] === this.state.username &&
                    this.state.homeserver.indexOf(peerIdMatches[2]) > -1) {
                postAlert('1:1 peer and user name must not be the same user.');
                return false;
            }
            formData.peerId = this.state.peerId;
        }

        // FIXME - validation
        const roomAlias = getRoomAlias(this.state.roomAlias, this.state.homeserver);
        if (!roomAlias || roomAlias.length < 4) { // '#a:b'.length === 4
            postAlert('Invalid room alias - are the room name and homeserver valid?');
            return false;
        }
        formData.roomAlias = roomAlias;

        const localStorageUserId = localStorage.getItem('mxvr_user_id');
        const localStorageUsername =
            (localStorageUserId && localStorageUserId.length > 0) ?
            localStorageUserId.match(USERNAME_REGEX)[1] : '';

        const usernameChanged = this.state.username.length > 0 &&
            localStorageUsername.length > 0 &&
            this.state.username !== localStorageUsername;
        const homeserverChanged = this.state.homeserver.length > 0 &&
            this.state.homeserver !== localStorage.getItem('mxvr_hs_url');
        const accessTokenIsSet = this.state.accessToken &&
            this.state.accessToken.length > 0;


        if (this.state.loginType === 'userId') {
            if (this.state.username.length < 1) {
                postAlert('User name must be set.');
                return false;
            }
            formData.username = this.state.username;

            // either username and/or homeserver changed and password is set
            // or username and homeserver did not change and password or accessToken is set
            const passwordIsSet = this.state.password.length > 0;

            if (usernameChanged || homeserverChanged) {
                if (!passwordIsSet) {
                    postAlert('User name or home server has been changed, ' +
                        'password required.');
                    return false;
                }
            } else {
                if (!passwordIsSet && !accessTokenIsSet) {
                    postAlert('No accessToken nor password set. Provide password.');
                    return false;
                }
            }

            if (passwordIsSet) {
                formData.password = this.state.password;
            } else {
                formData.accessToken = this.state.accessToken;
            }
        } else {
            if (!usernameChanged && !homeserverChanged && accessTokenIsSet &&
                    this.state.username.length > 0 &&
                    this.state.username.match(/mxvr[0-9]+/)) {
                console.warn('Reusing guest client credentials stored in localStorage:',
                    this.state.username);
                formData.username = this.state.username;
                formData.accessToken = this.state.accessToken;
            } else {
                formData.guest = true;
            }
        }

        console.warn('user name:\t' + formData.username);
        console.warn('home server:\t' + formData.homeserver);
        console.warn('1:1 guide ID:\t' + (formData.peerId || 'not set'));
        console.warn('room alias:\t' + (formData.roomAlias || 'not set'));

        this.props.onSubmit(formData);

        return true;
    }

    onUsernameChanged(event) {
        this.setState({username: event.target.value});
    }

    onPasswordChanged(event) {
        this.setState({password: event.target.value});
    }

    onHomeserverChanged(event) {
        this.setState({homeserver: event.target.value});
    }

    onPeerIdBlur() {
        window.location.hash = makeHash(this.state.roomAlias, this.state.peerId);
    }

    onPeerIdChanged(event) {
        this.setState({peerId: event.target.value});
    }

    onRoomAliasBlur() {
        window.location.hash = makeHash(this.state.roomAlias, this.state.peerId);
    }

    onRoomAliasChanged(event) {
        this.setState({roomAlias: event.target.value});
    }

    onGuestLoginClicked() {
        this.matrixHomeserver = this.state.homeserver;
        this.setState({
            loginType: 'guest',
            homeserver: CONF_HOME_SERVER,
        });
        window.location.hash = makeHash(this.state.roomAlias, this.state.peerId);
    }

    onMatrixLoginClicked() {
        this.setState({
            loginType: 'userId',
            homeserver: this.matrixHomeserver || 'https://matrix.org',
        });
        window.location.hash = makeHash(this.state.roomAlias, this.state.peerId);
        this.matrixHomeserver = null;
    }

    canPlayH264() {
        const v = document.createElement('video');
        return !!(v.canPlayType && v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"').replace(/no/, ''));
    }

    render() {
        const roomAlias = getRoomAlias(this.state.roomAlias, this.state.homeserver);
        const link = `${window.location.origin}${window.location.pathname}#` +
            makeHash(roomAlias, this.state.peerId);

        const noWebVrWarning = <div className="panel infoPanel-trans small">
            If you would like to use VR headset devices (such as the HTC Vive or Oculus Rift) you will need to use a browser with <a href="https://webvr.rocks/">WebVR support</a>
        </div>;

        const noWebGlWarning = <div className="panel errorPanel">
            This demo requires WebGL. Please make sure that it supported by your browser and that it is enabled in your settings!
        </div>;

        const noWebRtcWarning = <div className="panel warningPanel">
            Your browser does not support WebRTC. You can proceed anyway, but none of the video calling will work, and the demo will be almost useless! Please try using latest Chrome or Firefox.
        </div>;

        const noH264Warning = <div className="panel warningPanel">
            Your browser does not support the H.264 video codec. You can proceed anyway, but some videos in the lobby and tourism scenes will not work. Please try using latest Chrome or Firefox.
        </div>;

        const loginForm = <div>
            {/* Provide an info. panel warning if browser does not support WebVR */}
            {!window.hasNativeWebVRImplementation && noWebVrWarning}
            {/* Warn if browser does not support WebRTC */}
            {!window.navigator.getUserMedia && !window.navigator.webkitGetUserMedia &&
                    !window.navigator.mozGetUserMedia && noWebRtcWarning}
            {/* Warn if browser does not support H.264, required for static videos */}
            {!this.canPlayH264() && noH264Warning}

            <h2>Configure the demo</h2>

                <form onSubmit={this.onSubmitForm}>

                    <p>
                        To try out 1:1 calls in VR and have a guide-like call going throughout the demo enter the Matrix ID of someone
                        you would like to call. If left empty you will be all alone :)
                    </p>

                    <input
                        type="text"
                        size="48"
                        name="peerId"
                        placeholder="@user:domain.com"
                        value={this.state.peerId}
                        onBlur={this.onPeerIdBlur}
                        onChange={this.onPeerIdChanged} />

                    <br/>
                    <br/>
                    <div>
                        The demo lets you do a VR video conference when clicking on the phonebox.
                        You will need to invite people to join you in the conference room:
                        copy the link below and share it with whoever you want to test with.

                        <div className="login_share">
                            { roomAlias && <a href={link}>{link}</a> }
                        </div>

                        Use the input box below to customise the ID or generate a new one.
                        (N.B. VR Conferencing does not yet work with other Matrix clients like Riot)
                    </div>
                    <br/>

                    <input
                        type="text"
                        size="48"
                        name="roomAlias"
                        placeholder="#room:domain.com"
                        value={this.state.roomAlias}
                        onBlur={this.onRoomAliasBlur}
                        onChange={this.onRoomAliasChanged} />
                    &nbsp;
                    <button
                        type="button"
                        onClick={this.onGenerateRoomNameClicked}>
                        Invent a name
                    </button>

                    <div className="login_go">
                        <input type="submit" value="Go VR!!" />
                    </div>
                </form>
            </div>;

        return (
            <div className="login">
                <a href="https://matrix.org">
                    <img className="login_logo" src="images/matrix.svg" width="200"/>
                </a>
                <h1>Matrix + WebVR + WebRTC</h1>

                <div className="description">
                    <div>
                        This demo showcases <a href="https://matrix.org">Matrix</a> as an open decentralised comms layer for the open VR web, illustrating:
                        <ul>
                            <li>1:1 calls between WebVR apps and arbitrary Matrix users, in a "VR tour guide" scenario.</li>
                            <li>Video conferencing within WebVR using WebRTC calls signalled over Matrix</li>
                        </ul>
                        The point of the demo is to show what happens when you plug <a href="https://github.com/matrix-org/matrix-js-sdk">matrix-js-sdk</a>
                        , <a href="https://webvr.rocks">WebVR</a> and <a href="https://aframe.io">A-Frame</a> together, and take one step closer to an
                        open standards based VR metaverse :D  For more details, see <a href="https://matrix.org/blog">the blog post</a>.
                        Source code available (Apache License) on <a href="https://github.com/matrix-org/matrix-vr-demo">Github</a>.
                    </div>
                    <p>
                        The demo should work on any browser capable of WebVR & WebRTC - i.e. Chrome or Firefox on
                        Desktop or Android.  Browsers on iOS sadly still have no WebRTC, and nor does Safari on macOS.
                        It runs on plain phones & desktop/laptops, as well as <a href="https://vr.google.com/cardboard">Google Cardboard</a> devices,
                        all the way up to the <a href="https://vive.com">HTC Vive</a> and <a href="https://oculus.com">Oculus Rift</a>.
                        If you have a Vive or Rift you'll need to <a href="https://webvr.rocks">enable full WebVR support in your browser</a>.
                        N.B. that WebVR Chromium builds do not include H.264 which is required for video playback in the demo.
                    </p>
                    <p>
                        To discuss the demo, come hang out in <a href="https://riot.im/app/#/room/#vr:matrix.org">#vr:matrix.org</a>.
                    </p>
                </div>

                <div className="screenies">
                    <img src="images/s1.jpg" width="240" height="150"/> <img src="images/s2.jpg" width="240" height="150"/> <img src="images/s3.jpg" width="240" height="150"/>
                </div>

                {webglDetect ? loginForm : noWebGlWarning}

                <div>
                    If you don’t have a way to run the demo, you can checkout the demo tour video below.

                    <div className="video">
                        <iframe width="560" height="315" src="https://www.youtube.com/embed/nk0nMlVXkbk" frameBorder="0" allowFullScreen="allowFullScreen"></iframe>
                    </div>
                </div>

                <div className="description">
                    Controls:
                    <table>
                        <tbody>
                            <tr>
                                <td style={{ textAlign: 'center' }}><b>Keyboard</b></td>
                                <td style={{ textAlign: 'center' }}><b>Phone</b></td>
                                <td style={{ textAlign: 'center' }}><b>Vive / Rift</b></td>
                                <td><b>Action</b></td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>W A S D</td>
                                <td></td>
                                <td style={{ textAlign: 'center' }}>Walk around, or teleport with controller trackpad</td>
                                <td>Move around the scene. (Beware: no collision detection yet!)</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>Drag the mouse</td>
                                <td style={{ textAlign: 'center' }}>Rotate the phone</td>
                                <td style={{ textAlign: 'center' }}>Look around</td>
                                <td>Change your line of sight</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>Click</td>
                                <td style={{ textAlign: 'center' }}>Tap</td>
                                <td style={{ textAlign: 'center' }}>Zap with lasers</td>
                                <td>Interact with the entity in the centre of your field of view.
                                    Zap the door to show your demo options; zap an option to enter the demo;
                                    zap to skip through the demo.</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>G</td>
                                <td></td>
                                <td></td>
                                <td>Toggle guest or actual Matrix names in video conference.</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>I</td>
                                <td></td>
                                <td></td>
                                <td>Toggle stats on & off.</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>L</td>
                                <td></td>
                                <td></td>
                                <td>Jumps back to the holodeck lobby.</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>M</td>
                                <td style={{ textAlign: 'center' }}></td>
                                <td style={{ textAlign: 'center' }}></td>
                                <td>Mute/un-mute lobby video or 'VR tourism' music.</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>P</td>
                                <td style={{ textAlign: 'center' }}></td>
                                <td style={{ textAlign: 'center' }}></td>
                                <td>Pause/un-pause lobby video</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>T</td>
                                <td></td>
                                <td></td>
                                <td>Jump to the 'VR tour guide' demo.
                                    Plays 360 degree videos whilst video-calling a guide of your choice</td>
                            </tr>
                            <tr>
                                <td style={{ textAlign: 'center' }}>V</td>
                                <td></td>
                                <td></td>
                                <td>Jump to the 'VR video conferencing' demo.
                                    Places calls to everyone in the room specified below.
                                    <i>They need to be using this app for the full effect to work.</i></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                { (window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1') &&
                    <div>
                        <h3>Advanced</h3>
                        <button
                            type="button"
                            onClick={this.onClearLocalStorageClicked}>
                            Clear localStorage
                        </button>
                    </div>
                }
                <br/>
                <div className="copyright">
                    &copy; 2017 Matrix.org
                </div>
            </div>
        );
    }
}

Login.propTypes = {
    guideId: React.PropTypes.string,
    onSubmit: React.PropTypes.func.isRequired, // fn({username, password, homeserver, peerId, roomAlias, accessToken})
    roomAlias: React.PropTypes.string,
};
