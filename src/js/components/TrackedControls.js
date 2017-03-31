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
import {Entity} from 'aframe-react';
import React from 'react';
import {default as dispatcher} from '../common/dispatcher';

import 'aframe';
import 'aframe-controller-cursor-component';
import 'aframe-auto-detect-controllers-component';
import 'aframe-teleport-controls';

export default class TrackedControls extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.gripDown = this.gripDown.bind(this);
        this.triggerDown = this.triggerDown.bind(this);
    }

    componentWillUnmount() {
        console.warn('Tracked controls unmounting', this);
    }

    gripDown() {
        console.warn('Controller back button pressed');
        dispatcher.emit('keyEvent', 'l');
    }

    triggerDown(e) {
        dispatcher.emit('controllerTrigger', {hand: e.target.id});
    }

    render() {
        const visible = (this.props.room === 'lobby' ? true : false);

        let rightHand;
        const leftHand = <Entity
            id='lefthand'
            ref='lefthand'
            auto-detect-controllers="hand: left"
            events={{
                gripdown: this.gripDown,
                triggerdown: this.triggerDown,
            }}
            teleport-controls
            visible={visible}></Entity>;
        if (this.props.room === 'lobby') {
            rightHand = <Entity
                id='righthand'
                ref='righthand'
                vive-controls={{hand: 'right'}}
                events={{
                    gripdown: this.gripDown,
                    triggerdown: this.triggerDown,
                }}
                teleport-controls
                controller-cursor='color: #f00'
                raycaster='objects: [interactive]'
                visible={visible}></Entity>;
        } else {
            rightHand = <Entity
                id='righthand'
                ref='righthand'
                auto-detect-controllers="hand: right"
                events={{
                    gripdown: this.gripDown,
                    triggerdown: this.triggerDown,
                }}
                teleport-controls
                visible={visible}></Entity>;
        }

        return (<Entity>
            {leftHand}
            {rightHand}
        </Entity>);
    }
}

TrackedControls.defaultProps = {
    room: '',
};

TrackedControls.propTypes = {
    room: React.PropTypes.string,
};
