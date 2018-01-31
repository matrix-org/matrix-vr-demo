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
import 'aframe';
import {Entity} from 'aframe-react';
import 'aframe-look-at-component';

export default class VideoView extends React.Component {
    constructor(props) {
        super(props);

        this.vertexShader = `
            uniform float time;
            uniform sampler2D tex1;
            varying vec2 vUv;
            varying float outDepth;

            const float np = 512.0;
            const float w = 65536.0;
            const float p = np / w;

            int m(in float L) {
                return int(mod(floor((4.0 * (L / p)) - 0.5), 4.0));
            }

            float lzero(float L) {
                return L - mod(L - (p / 8.0), p) + (((p / 4.0) * float(m(L))) - (p / 8.0));
            }

            float delta(float L, float Ha, float Hb) {
                int mL = m(L);
                if (mL == 0) {
                    return (p / 2.0) * Ha;
                } else if (mL == 1) {
                    return (p / 2.0) * Hb;
                } else if (mL == 2) {
                    return (p / 2.0) * (1.0 - Ha);
                } else if (mL == 3) {
                    return (p / 2.0) * (1.0 - Hb);
                }
            }

            float d(float L, float Ha, float Hb) {
                return w * (lzero(L) + delta(L, Ha, Hb));
            }

            void main() {
                vUv = vec2(position.x / 854.0, position.y / 480.0);

                vec4 color = texture2D(tex1, vUv);
                //float depth = ( color.r + color.g + color.b ) * 50.0;// / 3.0;
                outDepth = d((color.b + 0.3) / 4.0, color.g, color.r);
                //float depth = d(color.b, color.g, color.r);

                //noise = 10.0 *  -.10 * turbulence( .5 * normal + time / 3.0 );
                //float b = 5.0 * pnoise3( 0.05 * position, vec3( 100.0 ) );
                //float displacement = mod(time, 2.0);//(- 10. * noise + b) / 50.0;
               
                //vec3 newPosition = position + normal;// * depth;
                vec3 newPosition = ( position + vec3(-427, -240, outDepth / 32.0) ) * vec3(0.002, 0.002, 0.002);
                gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
                gl_PointSize = 1.5;
            }
        `;

        this.fragmentShader = `
            const float w = 65536.0;

            uniform sampler2D tex1;
            varying vec2 vUv;
            varying float outDepth;
            void main() {
                //gl_FragColor = texture2D(tex1, vUv);
                //vec3 color = vec3(1. - 2.);
                //vec3 color = vec3(1.);
                //gl_FragColor = vec4( color.rgb, 1.0 );
                gl_FragColor = vec4( 0.0, outDepth / w, 0.0, 1.0 );
            }
        `;
    }

    componentDidMount() {
        const video = document.getElementById(this.props.src);
        if (video && (video.paused || video.videoWidth <= 0)) {
            const playPromise = video.play();
            if (playPromise instanceof Promise) {
                playPromise.then(() => {}, console.warn);
            }
        }

        const self = this;

        
        AFRAME.registerComponent('videocloud', {
            schema: {
                src: {
                    type: 'string',
                },
            },

            init: function() {
                this.geometry = new THREE.Geometry();
                for (let x = 0; x < 854; ++x) {
                    for (let y = 0; y < 480; ++y) {
                        this.geometry.vertices.push(new THREE.Vector3(x, y, 0));
                    }
                }


                const tex = new THREE.VideoTexture(document.getElementById(this.data.src));
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.format = THREE.RGBFormat;

                this.material = new THREE.ShaderMaterial({
                    uniforms: {
                        tex1: {
                            type: 't',
                            value: tex,
                        },
                    },
                    vertexShader: self.vertexShader,
                    fragmentShader: self.fragmentShader,
                });

                /*this.material = new THREE.PointsMaterial({
                  color: '#f00',
                  size: 1.0,
                  sizeAttenuation: false,
                });*/


                this.points = new THREE.Points(this.geometry, this.material);
                this.el.setObject3D('mesh', this.points);
            },
        });

        AFRAME.registerPrimitive('a-videomesh', {
            defaultComponents: {
                videocloud: {},
            },
            mappings: {
                src: 'videocloud.src',
            },
        });
    }

    componentWillUnmount() {
        const video = document.getElementById(this.props.src);
        if (video) {
            video.pause();
        }
    }

    render() {
        let text;
        if (this.props.text.length > 0 || !this.props.hasVideo) {
            const textValue = this.props.hasVideo ?
                this.props.text : this.props.text.length > 0 ?
                `No video for:\n${this.props.text}` : 'No video';
            const textYPos = this.props.hasVideo ?
                -(this.props.height / 2) - 0.1 :
                0.0;
            text = <a-text
                    value={textValue}
                    width='3'
                    scale='0 0 0'
                    color='#ffffff'
                    align='center'
                    position={[0, textYPos, 0].join(' ')}>
                <a-animation
                    attribute='opacity'
                    dur='500'
                    from='0'
                    to={this.props.opacity}></a-animation>
                <a-animation
                    attribute='scale'
                    dur='1000'
                    from='0 0 0'
                    to='0.8 0.8 1'></a-animation>
            </a-text>;
        }

        const videoPlaneProps = {
            //'width': this.props.width,
            //'height': this.props.height,
            'scale': '0 0 0',
            'position': this.props.position.join(' '),
            //'look-at': this.props.faceCamera ? '[camera]' : null,
        };

        if (this.props.hasVideo) {
            videoPlaneProps.src = this.props.src;
        } else {
            videoPlaneProps.color = '#444';
        }

        const videoPlane = <a-videomesh {...videoPlaneProps} >
            <a-animation
                attribute='opacity'
                dur='500'
                from='0'
                to={this.props.hasVideo ? this.props.opacity : 0.75}></a-animation>
            <a-animation
                attribute='scale'
                dur='1000'
                from='0 0 0'
                to='1 1 1'></a-animation>
            {text}
        </a-videomesh>;

        return (
            <Entity rotation={this.props.rotation}>
                {videoPlane}
            </Entity>
        );
    }
}

VideoView.defaultProps = {
    faceCamera: true,
    height: 0.9,
    hasVideo: true,
    opacity: 1.0,
    position: [0, 0, -2],
    rotation: [0, 0, 0],
    text: '',
    width: 1.6,
};

VideoView.propTypes = {
    faceCamera: React.PropTypes.bool,
    height: React.PropTypes.number,
    hasVideo: React.PropTypes.bool,
    opacity: React.PropTypes.number,
    position: React.PropTypes.array,
    rotation: React.PropTypes.array,
    src: React.PropTypes.string,
    text: React.PropTypes.string,
    width: React.PropTypes.number,
};
