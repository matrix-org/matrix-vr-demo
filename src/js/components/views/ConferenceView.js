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
import {Entity} from 'aframe-react';
import CallView from './CallView';
import FullMeshConference from '../structures/FullMeshConference';

const PLANE_WIDTH = 1;
const PLANE_SPACING = PLANE_WIDTH * 0.2;
const PLANE_HEIGHT_FROM_GROUND = PLANE_WIDTH / 2;

function radiansToDegrees(angle) {
    return angle * 180 / Math.PI;
}

function indexToAngleAndScale(n, index, fov, radius, scaleThreshold) {
    const offset = index - Math.floor((n - 1) / 2);
    const tableArcLength = radius * radiansToDegrees(fov);
    const arcLength = offset * (PLANE_WIDTH + PLANE_SPACING) - (n % 2 === 0
        ? ((PLANE_WIDTH + PLANE_SPACING) / 2)
        : 0);
    const angle = radiansToDegrees(fov) * arcLength / tableArcLength;
    let scale = tableArcLength / ((n * PLANE_WIDTH) + ((n - 1) * PLANE_SPACING));
    if (scale > scaleThreshold) {
        scale = scaleThreshold;
    }

    return {
        angle: -radiansToDegrees(angle * scale),
        scale,
    };
}

export default class ConferenceView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            calls: props.conference.getParticipantCalls(),
        };

        this._participantsChanged = this._participantsChanged.bind(this);
        props.conference.on('participantsChanged', this._participantsChanged);

        this.peerIdToGuest = {};
    }

    _participantsChanged() {
        console.warn('participantsChanged');
        this.setState({
            calls: this.props.conference.getParticipantCalls(),
        });
    }

    componentWillUnmount() {
        this.props.conference.removeListener('participantsChanged',
            this._participantsChanged);
        this.props.conference.hangUp();
    }

    render() {
        const calls = this.state.calls.filter((call) => call.active);
        let callViews = [];
        if (calls.length) {
            callViews = calls.map((call, index) => {
                const {angle, scale} = indexToAngleAndScale(calls.length + 1, index,
                    this.props.fov, this.props.radius, this.props.scaleThreshold);
                const localpart = call.peerId.match(/@([a-zA-Z0-9_-]+):.*/)[1];
                let peerName;
                if (localpart.match(/^mxvr[0-9]+$/)) {
                    peerName = this.peerIdToGuest[call.peerId];
                    if (!peerName) {
                        peerName = `Guest ${Object.keys(this.peerIdToGuest).length + 1}`;
                        this.peerIdToGuest[call.peerId] = peerName;
                    }
                } else {
                    peerName = localpart;
                }

                return (
                    <CallView
                        key={call.id}
                        call={call}
                        width={scale * PLANE_WIDTH}
                        height={scale * PLANE_WIDTH * 0.9 / 1.6}
                        position={[0, PLANE_HEIGHT_FROM_GROUND, -this.props.radius]}
                        rotation={[0, angle, 0]}
                        faceCamera={false}
                        text={peerName} />
                );
            });

            const {angle, scale} = indexToAngleAndScale(calls.length + 1, calls.length,
                this.props.fov, this.props.radius, this.props.scaleThreshold);
            callViews.push(<CallView
                key={`local-${calls[0].id}`}
                showLocal={true}
                call={calls[0]}
                width={scale * PLANE_WIDTH}
                height={scale * PLANE_WIDTH * 0.9 / 1.6}
                position={[0, PLANE_HEIGHT_FROM_GROUND, -this.props.radius]}
                rotation={[0, angle, 0]}
                faceCamera={false}
                text='You' />);
        }
        console.warn('Rendering ConferenceView');

        return (
            <Entity position={this.props.position}>
                {callViews}
                {this.props.showTable &&
                    <a-circle
                        radius={this.props.radius}
                        position={[0, PLANE_HEIGHT_FROM_GROUND - 0.75, 0].join(' ')}
                        rotation='-90 0 0'
                        color='#444'
                        opacity='0.75'></a-circle>
                }
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
