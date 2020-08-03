/*
 * Copyright 2020 InfAI (CC SES)
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

import {
    DeviceTypeFunctionModel,
    DeviceTypeServiceModel
} from '../../../modules/devices/device-types-overview/shared/device-type.model';
import {DeploymentsPreparedSelectableModel} from '../../../modules/processes/deployments/shared/deployments-prepared.model';
import {ExportValueCharacteristicModel} from '../../../modules/data/export/shared/export.model';

export interface DeviceStatusPropertiesModel {
    refreshTime?: number;
    elements?: DeviceStatusElementModel[];
    convertRules?: DeviceStatusConfigConvertRuleModel[];
}

export interface DeviceStatusElementModel {
    name: string | null;
    aspectId: string | null;
    function: DeviceTypeFunctionModel | null;
    selectable: DeploymentsPreparedSelectableModel | null;
    service: DeviceTypeServiceModel | null;
    deploymentId: string | null;
    exportId: string | null;
    exportValues: ExportValueCharacteristicModel | null;
    requestDevice: boolean;
}


export interface DeviceStatusConfigConvertRuleModel {
    status: string;
    icon: string;
    color: string;
}
