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

export default class LobbyLights extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Entity>
                <Entity light={{type: 'ambient', color: '#888'}}/>
                <Entity
                    light={{
                        type: 'spot',
                        intensity: 3.3,
                        angle: 45,
                        color: '#ffefc5',
                        distance: 3.3,
                        decay: 0.6,
                    }}
                    position='0 2.75 -6.4'
                    rotation='-25 0 0'/>
            </Entity>
        );
    }
}
