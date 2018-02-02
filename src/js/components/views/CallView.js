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
import VideoView from './VideoView';
import Call from '../structures/Call';

export default class CallView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            callActive: false,
            hasVideo: false,
        };

        this._onCallActive = this._onCallActive.bind(this);
        this._onCallHungUp = this._onCallHungUp.bind(this);
        this._hasVideoTrack = this._hasVideoTrack.bind(this);
    }

    _hasVideoTrack() {
        const element = this.props.showLocal ? this.props.call.getLocalVideoElement() :
            this.props.call.getRemoteVideoElement();
        if (!element || !element.srcObject) {
            return false;
        }
        return element.srcObject.getVideoTracks().length > 0;
    }

    componentDidMount() {
        if (this.props.call.active) {
            console.warn(`Call for ${this.props.call.peerId} became active`);
            this.setState({
                callActive: true,
                hasVideo: this._hasVideoTrack(),
            });
        }
        this.props.call.on('callActive', this._onCallActive);
        this.props.call.on('hungUp', this._onCallHungUp);
    }

    _onCallActive(peerId) {
        console.warn(`Call for ${peerId} became active`);
        this.setState({
            callActive: true,
            hasVideo: this._hasVideoTrack(),
        });
    }

    _onCallHungUp() {
        console.warn(`Call for ${this.props.call.peerId} hung up`);
        this.setState({
            callActive: false,
            hasVideo: this._hasVideoTrack(),
        });
    }

    componentWillUnmount() {
        this.props.call.removeListener('callActive', this._onCallActive);
        this.props.call.removeListener('hungUp', this._onCallHungUp);
    }

    render() {
        let videoElement = null;
        let videoDepthElement = null;
        if (this.props.call) {
            videoElement = this.props.showLocal ? this.props.call.getLocalVideoElement() :
                    this.props.call.getRemoteVideoElement();
            videoDepthElement = this.props.showLocal ? null : this.props.call.getRemoteDepthElement();
        }
        return (
            <Entity>
                {this.state.callActive &&
                    <VideoView
                        video={videoElement ? videoElement.id : ''}
                        depth={videoDepthElement ? videoDepthElement.id : ''}
                        width={this.props.width}
                        height={this.props.height}
                        position={this.props.position}
                        rotation={this.props.rotation}
                        opacity={this.props.opacity}
                        faceCamera={this.props.faceCamera}
                        text={this.props.text}
                        hasVideo={this.state.hasVideo} />
                }
            </Entity>
        );
    }
}

CallView.defaultProps = {
    faceCamera: true,
    height: 0.9,
    opacity: 1,
    position: [0, 0, -3],
    rotation: [0, 0, 0],
    showLocal: false,
    text: '',
    width: 1.6,
};

CallView.propTypes = {
    call: React.PropTypes.instanceOf(Call).isRequired,
    faceCamera: React.PropTypes.bool,
    height: React.PropTypes.number,
    opacity: React.PropTypes.number,
    position: React.PropTypes.array,
    rotation: React.PropTypes.array,
    showLocal: React.PropTypes.bool,
    text: React.PropTypes.string,
    width: React.PropTypes.number,
};
