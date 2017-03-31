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

export default class InputEventHandler {
    constructor(options) {
        this.client = options.client;

        this.client.on('message', (event) => {
            if (event.userId === this.client.peerId &&
                event.content.msgtype === 'm.text' &&
                event.content.body.length === 1) {
                dispatcher.emit('keyEvent', event.content.body);
            }
        });

        window.addEventListener('keydown', (event) => {
            // Handle keyCodes in Safari
            const key = event.key || String.fromCharCode(event.keyCode).toLowerCase();
            dispatcher.emit('keyEvent', key);
        });
    }
}
