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


import {Entity} from 'aframe-react';
import React from 'react';
import 'aframe';
import LobbyLights from './LobbyLights';
import './Interactive';
import {default as dispatcher} from '../common/dispatcher';

import Ringback from './views/Ringback';
import CallView from './views/CallView';
import ConferenceView from './views/ConferenceView';
import Call from './structures/Call';
import FullMeshConference from './structures/FullMeshConference';

export default class Lobby extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showPlaygroundGeometry: false,
            ringbackVisible: false,
        };

        this.triggerDown = this.triggerDown.bind(this);
        this.enteredVr = this.enteredVr.bind(this);
        this.ringbackDidMount = this.ringbackDidMount.bind(this);
        this.ringbackDidUnmount = this.ringbackDidUnmount.bind(this);
        this.ringbackDidHide = this.ringbackDidHide.bind(this);
        this.togglePlaygroundGeometry = this.togglePlaygroundGeometry.bind(this);
        this.navigateToLobby = this.navigateToLobby.bind(this);

        this.phoneboxPosition = '-3.25 0 -5';
        this.phoneboxPositionStart = '-3 0 -5';
        this.phoneboxHighlightPosition = '-3.25 1.5 -5';
        this.skisPosition = '3.25 0 -5';
        this.skisPositionStart = '3 0 -5';
        this.skisHighlightPosition = '3.25 1.5 -5';
    }

    onLoaded(e) {
        console.log('Lobby loaded');

        if (this.props.room === 'lobby') {
            this.setState({showPlaygroundGeometry: false});

            // Navigation UI toggle
            this.refs['navigationSphere'].removeEventListener('click', this.navigateToLobby);
            this.refs['navigationSphere'].addEventListener('click', this.togglePlaygroundGeometry);
        } else if (this.props.room === 'videoConf') {
            // Bind sphere click to navigate to lobby event
            this.refs['navigationSphere'].removeEventListener('click', this.togglePlaygroundGeometry);
            this.refs['navigationSphere'].addEventListener('click', this.navigateToLobby);
        }
    }

    componentDidMount() {
        this.scene = document.querySelector('#main-scene');
        this.stoneIn = document.querySelector('#stone-in');
        this.stoneOut = document.querySelector('#stone-out');

        // Detect entering VR (and hide playground geometry)
        this.scene.addEventListener('enter-vr', this.enteredVr);
    }

    componentWillUnmount() {
        // Event listeners might not be registered if scene transition occurs before scene load is complete
        try {
            this.refs.door.removeEventListener('click', this.navigateToLobby);
            this.refs.navigationSphere.removeEventListener('click',
                this.togglePlaygroundGeometry);
            this.refs.navigationSphere.removeEventListener('click',
                this.navigateToLobby);
            this.scene.removeEventListener('enter-vr', this.enteredVr);
        } catch (e) {
            console.warn('Failed to remove event listeners');
        }
    }

    componentWillReceiveProps(nextProps) {
        if ((this.props.room !== nextProps.room) && this.state.showPlaygroundGeometry) {
            this.setState({showPlaygroundGeometry: false});
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.room !== 'lobby' && this.props.room === 'lobby') {
            // Navigation UI toggle
            this.refs['navigationSphere'].removeEventListener('click', this.navigateToLobby);
            this.refs['navigationSphere'].addEventListener('click', this.togglePlaygroundGeometry);
        } else if (prevProps.room != 'videoConf' && this.props.room === 'videoConf') {
            // Bind sphere click to navigate to lobby event
            this.refs['navigationSphere'].removeEventListener('click', this.togglePlaygroundGeometry);
            this.refs['navigationSphere'].addEventListener('click', this.navigateToLobby);
        }
    }

    enteredVr() {
        this.setState({showPlaygroundGeometry: false, enteringVr: true});
    }

    togglePlaygroundGeometry(e) {
        const newState = !this.state.showPlaygroundGeometry;
        this.setState({
            showPlaygroundGeometry: newState,
        });

        console.warn("toggle playground geometry", newState, this);

        if (newState) {
            this.refs['pg-skis'].emit('show-playground-geometry');
            this.refs['pg-box'].emit('show-playground-geometry');

            this.stoneOut.pause();
            this.stoneIn.currentTime = 0;
            this.stoneIn.play();
        } else {
            this.refs['pg-skis'].emit('hide-playground-geometry');
            this.refs['pg-box'].emit('hide-playground-geometry');

            this.stoneIn.pause();
            this.stoneOut.currentTime = 0;
            this.stoneOut.play();
        }
    }

    navigateToLobby() {
        console.warn("Door click triggering navigation to lobby");
        dispatcher.emit('keyEvent', 'l');
    }

    triggerDown() {
        console.warn('Lobby detected trigger event');
    }

    ringbackDidMount() {
        console.warn("Ringback visible");
        this.setState({ringbackVisible: true});
    }

    ringbackDidUnmount() {
        console.warn("Ringback unmounted");
        this.setState({ringbackVisible: false});
    }

    ringbackDidHide() {
        console.warn("Ringback hidden");
        this.setState({ringbackVisible: false});
    }

    render() {
        const videoPos = [0, 2.25, -5];
        const videoRot = [10, 0, 0];
        return (
            <Entity events={{
                loaded: this.onLoaded.bind(this),
            }}>
                <LobbyLights/>
                <a-collada-model src='#lobby' position='0 0 -6'
                    shader='flat'></a-collada-model>

                { this.props.room === 'lobby' && (!this.props.call || !this.props.call.active || this.state.ringbackVisible) && (
                    <Ringback
                        width={1.6}
                        height={0.9}
                        position={videoPos}
                        rotation={videoRot}
                        opacity={0.8}
                        faceCamera={false}
                        call={this.props.call}
                        ringbackDidMount={this.ringbackDidMount}
                        ringbackDidUnmount={this.ringbackDidUnmount}
                        ringbackDidHide={this.ringbackDidHide}
                        ringbackPlayed={this.props.ringbackPlayed}
                        ringbackDidPlay={this.props.ringbackDidPlay}
                    />
                )}

                { this.props.room === 'lobby' && this.props.call && !this.state.ringbackVisible && (
                    <CallView
                        call={this.props.call}
                        width={1.6}
                        height={0.9}
                        position={videoPos}
                        rotation={videoRot}
                        opacity={0.8}
                        faceCamera={true}
                    />
                )}

                { this.props.room === 'videoConf' && this.props.conference &&
                    <ConferenceView
                        conference={this.props.conference}
                        position={[0, 1, 0]}
                        fov={120}
                        radius={1.5}
                        scaleThreshold={2}
                        showTable={true}
                    />
                }


                {/* Playground geometry */}
                {/* Only show playgrounbd geometry in the lobby */}
                { this.props.room === 'lobby' && (
                <Entity>

                    {/* Tourism scene UI */}
                    <Entity>
                        {/* Hitbox */}
                        {this.state.showPlaygroundGeometry && (
                        <a-cylinder
                            color='crimson'
                            opacity='0'
                            visible='false'
                            height='3'
                            radius='1'
                            position={this.skisHighlightPosition}
                            interactive='opacity: 0; highlightOpacity: 0.35; highlightColor: crimson'
                            onClick={() => {dispatcher.emit('keyEvent', 't');}}>
                            <a-animation
                                begin='100'
                                attribute='visible'
                                from='false'
                                to='true'></a-animation>
                        </a-cylinder>)}
                        {/* Skis icon / model */}
                        <a-collada-model
                                ref='pg-skis'
                                id='skis'
                                src='#object-skis'
                                position={this.skisPosition}
                                scale='0 0 0'>
                            {/*  Animate skis in */}
                            <a-animation
                                id='transitionSkisGrow'
                                attribute='scale'
                                dur='1500'
                                from='0 0 0'
                                to='1 1 1'
                                begin='show-playground-geometry'></a-animation>
                            <a-animation
                                id='transitionSkisPosition'
                                attribute='position'
                                dur='1500'
                                from={this.skisPositionStart}
                                to={this.skisPosition}
                                begin='show-playground-geometry'></a-animation>

                            {/*  Animate skis out */}
                            <a-animation
                                id='transitionSkisGrow'
                                attribute='scale'
                                dur='750'
                                from='1 1 1'
                                to='0 0 0'
                                begin='hide-playground-geometry'></a-animation>
                            <a-animation
                                id='transitionSkisPosition'
                                attribute='position'
                                dur='750'
                                from={this.skisPosition}
                                to={this.skisPositionStart}
                                begin='hide-playground-geometry'></a-animation>
                        </a-collada-model>
                    </Entity>

                    {/* VC UI */}
                    <Entity>
                        {/* Hitbox -- Only show if conference is ready */}
                        {this.state.showPlaygroundGeometry && this.props.conference && this.props.conference.roomId && (
                        <a-cylinder
                            color="crimson"
                            opacity="0"
                            visible='false'
                            height="3"
                            radius="1"
                            position={this.phoneboxHighlightPosition}
                            interactive='opacity: 0; highlightOpacity: 0.35; highlightColor: crimson'
                            onClick={() => {dispatcher.emit('keyEvent', 'v');}}>
                            <a-animation
                                begin='100'
                                attribute='visible'
                                from='false'
                                to='true'></a-animation>
                        </a-cylinder>)}
                        {/* Phonebox icon / model */}
                        <a-collada-model
                                ref='pg-box'
                                id='box'
                                src='#object-phonebox'
                                position={this.phoneboxPosition}
                                rotation='0 45 0'
                                scale='0 0 0'>
                            {/* Conference not ready sign */}
                            {(!this.props.conference || !this.props.conference.roomId) && (<a-entity
                                position='0 1.5 1'
                                geometry='primitive: plane; height: 1; width: 1'
                                material='side: double; src: #blocked; transparent: true; opacity: 0.8'
                            ></a-entity>)}
                            {/*  Animate phonebox in */}
                            <a-animation
                                id='transitionBoxGrowDepth'
                                attribute='scale'
                                dur='1500'
                                from='0 0 0'
                                to='1 1 1'
                                begin='show-playground-geometry'></a-animation>
                            <a-animation
                                id='transitionBoxPosition'
                                attribute='position'
                                dur='1500'
                                from={this.phoneboxPositionStart}
                                to={this.phoneboxPosition}
                                begin='show-playground-geometry'></a-animation>

                            {/*  Animate phonebox out */}
                            <a-animation
                                id='transitionBoxGrowDepth'
                                attribute='scale'
                                dur='750'
                                from='1 1 1'
                                to='0 0 0'
                                begin='hide-playground-geometry'></a-animation>
                            <a-animation
                                id='transitionBoxPosition'
                                attribute='position'
                                dur='750'
                                from={this.phoneboxPosition}
                                to={this.phoneboxPositionStart}
                                begin='hide-playground-geometry'></a-animation>
                        </a-collada-model>
                    </Entity>
                </Entity>)}

                {/* Navigation sphere */}
                <a-sphere
                    id='navigationSphere'
                    ref='navigationSphere'
                    radius='0.5'
                    position='0 0.75 -7.5'
                    material='color: blue; opacity: 0.5'
                    light='type: point; intensity: 1; distance: 2; decay: 1'
                    interactive='opacity: 0.5; highlightOpacity: 0.7; highlightColor: crimson'>
                </a-sphere>
            </Entity>
        );
    }
}

Lobby.propTypes = {
    call: React.PropTypes.instanceOf(Call),
    conference: React.PropTypes.instanceOf(FullMeshConference),
    room: React.PropTypes.string.isRequired,
    ringbackPlayed: React.PropTypes.bool,
    ringbackDidPlay: React.PropTypes.func,
};
