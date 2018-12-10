/*
 * Copyright 2018 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component} from '@angular/core';
import {ParserService} from '../shared/parser.service';
import {ActivatedRoute} from '@angular/router';
import {ParseModel} from '../shared/parse.model';
import {DeviceInstancesModel} from '../../../devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../devices/device-instances/shared/device-instances.service';
import {DeviceTypeModel, DeviceTypeServiceModel} from '../../../devices/device-types/shared/device-type.model';
import {DeviceTypeService} from '../../../devices/device-types/shared/device-type.service';
import {FlowEngineService} from '../shared/flow-engine.service';
import {NodeInput, NodeModel, NodeValue, PipelineRequestModel} from './shared/pipeline-request.model';

@Component({
    selector: 'senergy-deploy-flow',
    templateUrl: './deploy-flow.component.html',
    styleUrls: ['./deploy-flow.component.css']
})

export class DeployFlowComponent {

    ready = false;
    inputs: ParseModel[] = [];
    id = '' as string;

    deviceTypes = [] as any;
    devices: DeviceInstancesModel [] = [];

    selectedValues = new Map();

    pipeReq: PipelineRequestModel = {} as PipelineRequestModel;

    constructor(private parserService: ParserService,
                private route: ActivatedRoute,
                private deviceInstanceService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
                private flowEngineService: FlowEngineService
    ) {
        const id = this.route.snapshot.paramMap.get('id');
        if (id !== null) {
            this.id = id;
        }
        this.loadDevices();

        this.pipeReq = {id: this.id, nodes: []};

        this.parserService.getInputs(this.id).subscribe((resp: ParseModel []) => {
            this.inputs = resp;
            this.ready = true;
            this.inputs.map((value: ParseModel, key) => {
                this.pipeReq.nodes[key] = {nodeId: value.id, inputs: []} as NodeModel;
                value.inPorts.map((port: string) => {
                    if (!this.selectedValues.has(value.id)) {
                        this.selectedValues.set(value.id, new Map());
                    }
                    if (this.deviceTypes[value.id] === undefined) {
                        this.deviceTypes[value.id] = [];
                    }
                    this.selectedValues.get(value.id).set(port, {device: {} as DeviceInstancesModel,
                        service: {} as DeviceTypeServiceModel, path: ''});
                    this.deviceTypes[value.id][port] = {} as DeviceTypeModel;
                });

            });
        });
    }

    startPipeline() {
        this.pipeReq.nodes.forEach((node: NodeModel) => {
            for (const entry of this.selectedValues.get(node.nodeId).entries()) {
                if (entry[1].device.id !== undefined && entry[1].service.id !==  undefined) {
                    const x = {name: entry [0], path: entry[1].path} as NodeValue;
                    const y = [] as NodeValue [];
                    y.push(x);
                    const z = {
                        deviceId: entry[1].device.id,
                        topicName: entry[1].service.id.replace(/#/g, '_'),
                        values: y
                    } as NodeInput;
                    if (node.inputs.length > 0) {
                        node.inputs.forEach((input: NodeInput) => {
                            if (input.deviceId === entry[1].device.id) {
                                if (input.values.length > 0) {
                                    input.values.push(x);
                                }
                            }
                        });
                    } else {
                        node.inputs.push(z);
                    }
                }
            }
        });
        this.flowEngineService.startPipeline(this.pipeReq).subscribe();
    }

    loadDevices() {
        this.deviceInstanceService.getDeviceInstances('', 50, 0, 'name', 'asc').subscribe((resp: DeviceInstancesModel []) => {
            this.devices = resp;
        });
    }

    deviceChanged(device: DeviceInstancesModel, inputId: string, port: string) {
        if (this.selectedValues.get(inputId).get(port).device !== device) {
            this.deviceTypeService.getDeviceType(device.devicetype).subscribe((resp: DeviceTypeModel | null) => {
                if (resp !== null) {
                    this.deviceTypes[inputId][port] = resp;
                }
            });
        }
    }
}