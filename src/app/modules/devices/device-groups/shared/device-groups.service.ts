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

import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ErrorHandlerService} from '../../../../core/services/error-handler.service';
import {Observable} from 'rxjs';
import {environment} from '../../../../../environments/environment';
import {catchError, map} from 'rxjs/operators';
import {DeviceGroupsPermSearchModel} from './device-groups-perm-search.model';

@Injectable({
    providedIn: 'root'
})
export class DeviceGroupsService {

    constructor(private http: HttpClient,
                private errorHandlerService: ErrorHandlerService) {
    }

    getDeviceGroups(query: string, limit: number, offset: number, feature: string, order: string): Observable<DeviceGroupsPermSearchModel[]> {
        const params = [
            'limit=' + limit,
            'offset=' + offset,
            'rights=r',
            'sort=' + feature + '.' + order,
            'search=' + encodeURIComponent(query)
        ].join('&');

        return this.http.get<DeviceGroupsPermSearchModel[]>(
            environment.permissionSearchUrl + '/v2/device-groups?' + params).pipe(
                map(resp => resp || []),
                catchError(this.errorHandlerService.handleError(DeviceGroupsService.name, 'getDeviceGroups(search)', []))
            );
    }

}
