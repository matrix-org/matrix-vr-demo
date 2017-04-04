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


import AFRAME from 'aframe';
import {Entity} from 'aframe-react';
import React from 'react';
import TrackedControls from './TrackedControls';
import CallView from './views/CallView';
import Call from './structures/Call';
import 'aframe-mouse-cursor-component';
import {default as dispatcher} from '../common/dispatcher';

export default class Person extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            transitioning: true,
        };
        this.transitionDuration = 1000;
        this.transitionBackDelay = 500;
    }

    componentWillReceiveProps(nextprops) {
        // Reset the camera position when re-entering the lobby
        if (this.props.room !== 'lobby' && nextprops.room === 'lobby') {
            this.refs.camera.setAttribute('rotation', {x: 0, y: 0, z: 0});
        }
    }

    componentDidMount() {
        this.scene = document.querySelector('#main-scene');

        this.scene.addEventListener('scene-change', this.onSceneChange.bind(this));
        this.scene.addEventListener('loaded', this.onSceneLoaded.bind(this));

        this.refs.transitionSphere.addEventListener('animationend',
            this.onSceneTransitionAnimationEnded.bind(this));
    }

    onSceneTransitionAnimationEnded(e) {
        // console.warn('Scene transition animation end event', e);
        const ele = e.target || e.srcElement; // for IE
        if (ele.id === 'transitionInOpacity') {        // Transition in complete
            console.warn('Transition in complete');
            dispatcher.emit('transitionInComplete');
            this.setState({
                transitionIn: false,
                transitionBack: false,
                transitioning: false,
            });
        } else if (ele.id === 'transitionOutOpacity') {    // Transition out complete
            console.warn('Transition out complete');
            dispatcher.emit('transitionOutComplete');
            this.setState({
                transitioningOut: false,
            });
            if (this.state.transitionBack) {
                setTimeout(this.transitionIn.bind(this), this.transitionBackDelay);
            } else {
                this.setState({
                    transitioning: false,
                });
            }
        }
    }

    onSceneChange(e) {
        this.transitionOut();
    }

    transitionOut(transitionBack) {
        transitionBack = transitionBack || true;

        console.warn('Trigger transition OUT animation');
        this.setState({
            transitioning: true,
            transitioningOut: true,
            transitionBack: transitionBack,
        });
        this.refs.transitionSphere.emit('scene-change-out-animation');
    }

    transitionIn() {
        console.warn('Scene transition in started');
        this.setState({
            transitioning: true,
            transitioningIn: true,
            transitionBack: false,
        });
        this.refs.transitionSphere.emit('scene-change-in-animation');
    }

    onSceneLoaded(e) {
        console.warn('Person handling scene loaded');
        setTimeout(this.transitionIn.bind(this), 1000);
    }

    onLoaded(e) {
        console.log('Person loaded');
    }

    render() {
        let controls;
        let camera;

        const cursor = <a-entity
            cursor='fuse: false; fuseTimeout: 500'
            position='0 0 -0.25'
            geometry='primitive: ring; radiusInner: 0.002; radiusOuter: 0.003'
            material='color: #559955; opacity: 0.5; shader: flat;'
            animation_click='property: scale; startEvents: click; from: 0.5 0.5 0.5; to: 1 1 1; dur: 150'
            visible='false'>
            <a-animation
                attribute='visible'
                begin='2000'
                dur='2000'
                from='false'
                to='true'>
            </a-animation>
            <a-animation begin="click" easing="ease-in" attribute="scale"
                         fill="backwards" from="0.1 0.1 0.1" to="1 1 1" dur="150"></a-animation>
            <a-animation begin="cursor-fusing" easing="ease-in" attribute="scale"
                         from="1 1 1" to="0.1 0.1 0.1" dur="1500"></a-animation>
        </a-entity>;

        const transitionSphere = <a-entity
                ref='transitionSphere'
                key='ts'
                id='transitionSphere'
                geometry='primitive: sphere; radius: 0.5'
                position='0 0 0'
                material='side: back; opacity: 1'
                light='type: point; intensity: 1'
                visible={this.state.transitioning}>

            <a-animation
                key='tol'
                id='transitionOutLight'
                attribute='light.intensity'
                dur='1000'
                from='0'
                to='1'
                begin='scene-change-out-animation'></a-animation>
            <a-animation
                key='too'
                id='transitionOutOpacity'
                attribute='material.opacity'
                dur='1000'
                from='0'
                to='1'
                begin='scene-change-out-animation'></a-animation>

            <a-animation
                key='til'
                id='transitionInLight'
                attribute='light.intensity'
                dur='1000'
                from='1'
                to='0'
                begin='scene-change-in-animation'></a-animation>
            <a-animation
                key='tio'
                id='transitionInOpacity'
                attribute='material.opacity'
                dur='1000'
                from='1'
                to='0'
                begin='scene-change-in-animation'></a-animation>

        </a-entity>;

        if (!AFRAME.utils.device.isMobile() && AFRAME.utils.device.checkHeadsetConnected() && this.props.vrMode) {
            controls = <TrackedControls visible={true} room={this.props.room}/>;
        }

        if (this.props.room === 'tourismDemo') {
            camera = <a-camera
                    ref='camera'
                    id='camera'
                    wasd-controls
                    look-controls>
                {this.props.call && (
                    <CallView
                        call={this.props.call}
                        width={0.16}
                        height={0.09}
                        position={[0.15, 0.15, -0.4]}
                        opacity={0.75}
                        faceCamera={false}
                    />
                )}
                {transitionSphere}
            </a-camera>;
        } else {
            camera = <a-camera
                    ref='camera'
                    id='camera'
                    wasd-controls
                    look-controls
                    mouse-cursor>
                { AFRAME.utils.device.isMobile() && cursor}
                {transitionSphere}
            </a-camera>;
        }

        return (
            <Entity id='person' events={{
                loaded: this.onLoaded.bind(this),
            }}>
                {controls}
                {camera}
            </Entity>
        );
    }
}

Person.defaultProps = {
    room: 'lobby',
    vrMode: false,
};

Person.propTypes = {
    call: React.PropTypes.instanceOf(Call),
    room: React.PropTypes.string,
    vrMode: React.PropTypes.bool,
};
