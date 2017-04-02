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

export default class Assets extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        if (this.props.assetLoadingProgress) {
            this.refs.assets.addEventListener('progress', this.props.assetLoadingProgress());
        }
        if (this.props.assetsLoadingFinished) {
            this.refs.assets.addEventListener('loaded', this.props.assetsLoadingFinished());
        }
        if (this.props.assetsLoadingTimeout) {
            this.refs.assets.addEventListener('timeout', this.props.assetsLoadingTimeout());
        }
    }

    componentWillUnmount() {
        if (this.props.assetLoadingProgress) {
            this.refs.assets.removeEventListener('progress', this.props.assetLoadingProgress());
        }
        if (this.props.assetsLoadingFinished) {
            this.refs.assets.removeEventListener('loaded', this.props.assetsLoadingFinished());
        }
        if (this.props.assetsLoadingTimeout) {
            this.refs.assets.removeEventListener('timeout', this.props.assetsLoadingTimeout());
        }
    }

    render() {
        return (
            <a-assets ref="assets" id='assets'>

                {/* Models */}
                <a-asset-item
                    id='lobby'
                    src='https://matrix.org/vrdemo_resources/models/holodeck/holodeck.dae'
                    preload='auto'
                    crossOrigin></a-asset-item>
                <a-asset-item
                    id='object-phonebox'
                    src='https://matrix.org/vrdemo_resources/models/phonebox/phonebox.dae'
                    preload='auto'
                    crossOrigin></a-asset-item>
                <a-asset-item
                    id='object-skis'
                    src='https://matrix.org/vrdemo_resources/models/skis/skis.dae'
                    preload='auto'
                    crossOrigin></a-asset-item>

                {/* Sounds */}
                <audio id='blip1-sound'
                    src='https://matrix.org/vrdemo_resources/audio/blip1.mp3'
                    preload='auto'
                    crossOrigin>
                </audio>
                <audio id='blip2-sound'
                    src='https://matrix.org/vrdemo_resources/audio/blip2.mp3'
                    preload='auto'
                    crossOrigin>
                </audio>
                <audio id='stone-in'
                    src='https://matrix.org/vrdemo_resources/audio/stone_in.mp3'
                    preload='auto'
                    crossOrigin>
                </audio>
                <audio id='stone-out'
                    src='https://matrix.org/vrdemo_resources/audio/stone_out.mp3'
                    preload='auto'
                    crossOrigin>
                </audio>
                <audio id='ski-sunday-music'
                    src='https://matrix.org/vrdemo_resources/audio/ski_sunday_clip.mp3'
                    preload='auto' loop
                    crossOrigin>
                </audio>

                {/* Video call assets */}
                <video id='local' autoPlay muted></video>
                <video id='lobbyVideo' autoPlay></video>

                {/* Tourism scene video playlist */}
                <span id='tourism'>
                    <video id='ski-video1' muted crossOrigin></video>
                    <video id='ski-video2' muted crossOrigin></video>
                    <video id='ski-video3' muted crossOrigin></video>
                    <video id='ski-video4' muted crossOrigin></video>
                    <a-mixin id='ski-video1-mixin' rotation='-5 -90 30' />
                    <a-mixin id='ski-video2-mixin' rotation='-10 -90 15' />
                    <a-mixin id='ski-video3-mixin' rotation='0 -90 30' />
                    <a-mixin id='ski-video4-mixin' rotation='0.5 87 -35' />
                </span>

                {/* Ringback video playlist */}
                <span id='ringback'>
                    <video id='ringback-welcome'
                        src='https://matrix.org/vrdemo_resources/video/ringback/Welcome%20to%20the%20Matrix.mp4'
                        preload='auto' crossOrigin></video>
                    <video id='ringback-connecting'
                        src='https://matrix.org/vrdemo_resources/video/ringback/Connecting%20to%20agent%20-%20please%20wait.mp4'
                        preload='auto' crossOrigin></video>
                    <video id='ringback-connecting2'
                        src='https://matrix.org/vrdemo_resources/video/ringback/Connect%20to%20agent.mp4'
                        preload='auto' crossOrigin></video>
                    <video id='ringback-hang-on-in-there'
                        src='https://matrix.org/vrdemo_resources/video/ringback/Hang%20on%20in%20there3.mp4'
                        preload='auto' crossOrigin></video>
                    <video id='ringback-ring-ring-ring'
                        src='https://matrix.org/vrdemo_resources/video/ringback/Ring%20ring%20ring.mp4'
                        preload='auto' crossOrigin></video>
                    <video id='ringback-not-waiting'
                        src='https://matrix.org/vrdemo_resources/video/ringback/Not%20waiting%20any%20longer.mp4'
                        preload='auto' crossOrigin></video>
                    <video id='ringback-while-you-are-here'
                        src='https://matrix.org/vrdemo_resources/video/ringback/While%20you%20are%20here.mp4'
                        preload='auto' crossOrigin></video>

                    <a-mixin id='ringback-connecting-mixin' delay='1000' />
                    <a-mixin id='ringback-connecting2-mixin' delay='1000' />
                    <a-mixin id='ringback-hang-on-in-there-mixin' delay='1000' />
                    <a-mixin id='ringback-ring-ring-ring-mixin' delay='1000' />
                    <a-mixin id='ringback-not-waiting-mixin' delay='0' />
                    <a-mixin id='ringback-while-you-are-here-mixin' delay='10000' />
                </span>

            </a-assets>
        );
    }
}

Assets.propTypes = {
    assetLoadingProgress: React.PropTypes.func,
    assetsLoadingFinished: React.PropTypes.func,
    assetsLoadingTimeout: React.PropTypes.func,
};
