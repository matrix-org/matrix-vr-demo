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


import {default as dispatcher} from '../../common/dispatcher';
import React from 'react';
import {Entity} from 'aframe-react';
import 'aframe-html-shader';
import CallView from './CallView';
import FullMeshConference from '../structures/FullMeshConference';

const PLANE_WIDTH = 1;
const PLANE_HEIGHT = PLANE_WIDTH * 0.9 / 1.6;
const PLANE_SPACING = PLANE_WIDTH * 0.2;
const PLANE_HEIGHT_FROM_GROUND = PLANE_WIDTH / 2;
const ROW_LENGTH = 3;

function indexToAngle(n, index, fov, radius) {
    const offset = index - Math.floor((n - 1) / 2);
    const tableArcLength = radius * fov * Math.PI / 180.0;
    const arcLength = offset * (PLANE_WIDTH + PLANE_SPACING) - (n % 2 === 0
        ? ((PLANE_WIDTH + PLANE_SPACING) / 2)
        : 0);
    return fov * arcLength / tableArcLength;
}

export default class ConferenceView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            calls: props.conference.getParticipantCalls(),
            messages: [],
            useLocalPart: false,
        };

        this._onKeyEvent = this._onKeyEvent.bind(this);
        this._onMessage = this._onMessage.bind(this);
        this._participantsChanged = this._participantsChanged.bind(this);

        dispatcher.addListener('keyEvent', this._onKeyEvent);
        dispatcher.addListener('message', this._onMessage);
        props.conference.on('participantsChanged', this._participantsChanged);

        this.peerIdToGuest = {};
    }

    _participantsChanged() {
        console.warn('participantsChanged');
        this.setState({
            calls: this.props.conference.getParticipantCalls(),
        });
    }

    _onKeyEvent(key) {
        if (key === 'g') {
            this.setState({
                useLocalPart: !this.state.useLocalPart,
            });
        }
    }

    _onMessage(message) {
        let newMessages = this.state.messages.slice(0);
        if (newMessages.length === 10) {
            newMessages = newMessages.slice(1, 10);
        }
        newMessages.push(message);
        this.setState({
            messages: newMessages,
        });
    }

    componentWillUnmount() {
        this.props.conference.removeListener('participantsChanged',
            this._participantsChanged);
        dispatcher.removeListener('keyEvent', this._onKeyEvent);
    }

    render() {
        const calls = this.state.calls.filter((call) => call.active);
        let callViews = [];
        if (calls.length) {
            let modRemainder = calls.length + 1;
            callViews = calls.map((call, index) => {
                if (index && index % ROW_LENGTH === 0) {
                    modRemainder -= ROW_LENGTH;
                }
                const angle = indexToAngle(
                    modRemainder > ROW_LENGTH ? ROW_LENGTH : modRemainder,
                    index % ROW_LENGTH, this.props.fov, this.props.radius,
                );
                const localpart = call.peerId.match(/@([a-zA-Z0-9_-]+):.*/)[1];
                let peerName;
                if (!this.state.useLocalPart && localpart.match(/^mxvr[0-9]+$/)) {
                    peerName = this.peerIdToGuest[call.peerId];
                    if (!peerName) {
                        peerName = `Guest ${Object.keys(this.peerIdToGuest).length + 1}`;
                        this.peerIdToGuest[call.peerId] = peerName;
                    }
                } else {
                    peerName = localpart;
                }

                const planeYPos = PLANE_HEIGHT_FROM_GROUND +
                    Math.floor(index / ROW_LENGTH) * (PLANE_SPACING + PLANE_HEIGHT);
                return (
                    <CallView
                        key={call.id}
                        call={call}
                        width={PLANE_WIDTH}
                        height={PLANE_HEIGHT}
                        position={[0, planeYPos, -this.props.radius]}
                        rotation={[0, angle, 0]}
                        faceCamera={false}
                        text={peerName} />
                );
            });


            if (calls.length % ROW_LENGTH === 0) {
                modRemainder -= ROW_LENGTH;
            }
            const angle = indexToAngle(
                modRemainder > ROW_LENGTH ? ROW_LENGTH : modRemainder,
                calls.length % ROW_LENGTH, this.props.fov, this.props.radius,
            );
            const planeYPos = PLANE_HEIGHT_FROM_GROUND +
                Math.floor(calls.length / ROW_LENGTH) * (PLANE_SPACING + PLANE_HEIGHT);
            callViews.push(<CallView
                key={`local-${calls[0].id}`}
                showLocal={true}
                call={calls[0]}
                width={PLANE_WIDTH}
                height={PLANE_HEIGHT}
                position={[0, planeYPos, -this.props.radius]}
                rotation={[0, angle, 0]}
                faceCamera={false}
                text={this.state.useLocalPart ? this.props.conference.client.username : 'You'} />);
        }
        console.warn('Rendering ConferenceView');

        const tableYPos = PLANE_HEIGHT_FROM_GROUND - (PLANE_SPACING + 0.5 * PLANE_HEIGHT);

        const messages = this.state.messages.map((message, index) => {
            return <p className='message'>{message}</p>;
        });
        // FIXME: We have to wait for the render updates of the messages to have been written to the DOM before doing this.
        setTimeout(() => {
            const el = document.getElementById('oneToOneMessages');
            el.scrollTop = el.scrollHeight;
        }, 100);

        return (
            <Entity position={this.props.position}>
                {callViews}
                {this.props.showTable &&
                    <a-circle
                        radius={this.props.radius}
                        position={[0, tableYPos, 0].join(' ')}
                        rotation='-90 0 0'
                        color='#444'
                        opacity='0.75'>
                        {this.props.conference.roomAlias &&
                                this.props.conference.roomAlias.length > 0 &&
                            <a-text
                                value={this.props.conference.roomAlias}
                                width={this.props.radius}
                                position={[0, 0.56 * this.props.radius, 0].join(' ')}
                                color='#ffffff'
                                align='center'></a-text>
                        }
                    </a-circle>
                }
                <div className='oneToOneMessages' id='oneToOneMessages'>
                    {messages}
                </div>
                <a-entity
                    geometry='primitive: plane; width: 0.8; height: 0.225;'
                    position={[0, 0.17, -0.5 * this.props.radius].join(' ')}
                    material='shader: html; target: #oneToOneMessages; transparent: true; fps: 1.5;'></a-entity>
            </Entity>
        );
    }
}

ConferenceView.defaultProps = {
    fov: 180,
    position: [0, 0, 0],
    radius: 3,
    scaleThreshold: 1,
    showTable: false,
};

ConferenceView.propTypes = {
    conference: React.PropTypes.instanceOf(FullMeshConference).isRequired,
    fov: React.PropTypes.number,
    position: React.PropTypes.array,
    radius: React.PropTypes.number,
    scaleThreshold: React.PropTypes.number,
    showTable: React.PropTypes.bool,
};
