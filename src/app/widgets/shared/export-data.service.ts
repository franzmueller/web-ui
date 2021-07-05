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
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {
    LastValuesRequestElementModel, LastValuesRequestElementModelV3,
    QueriesRequestElementModel,
    QueriesRequestElementModelV3,
    TimeValuePairModel,
    ContentVariableWithPath,
} from './export-data.model';
import {HttpClient} from '@angular/common/http';
import {DeviceTypeContentVariableModel} from '../../modules/metadata/device-types-overview/shared/device-type.model';

@Injectable({
    providedIn: 'root'
})
export class ExportDataService {
    STRUCTURE = 'https://schema.org/StructuredValue';

    groupTypes = ['mean', 'sum', 'count', 'median', 'min', 'max', 'first', 'last', 'difference-first', 'difference-last', 'difference-min', 'difference-max', 'difference-count', 'difference-mean', 'difference-sum', 'difference-median'];

    constructor(private http: HttpClient) {
    }

    /** @deprecated **/
    getLastValues(requestElements: LastValuesRequestElementModel[]): Observable<TimeValuePairModel[]> {
        return this.http.post<TimeValuePairModel[]>(environment.influxAPIURL + '/v2/last-values', requestElements);
    }

    /** @deprecated **/
    query(query: QueriesRequestElementModel[]): Observable<any[][][]> {
        return this.http.post<any[][][]>(environment.influxAPIURL + '/v2/queries?format=per_query', query);
    }

    /** @deprecated **/
    queryAsTable(query: QueriesRequestElementModel[], orderColumnIndex: Number = 0, orderDirection: 'asc' | 'desc' = 'desc')
        : Observable<any[][] | null> {

        return this.http.post<any[][] | null>(environment.influxAPIURL + '/v2/queries?format=table&order_column_index='
            + orderColumnIndex + '&order_direction=' + orderDirection, query);
    }

    queryV3(query: QueriesRequestElementModelV3[]): Observable<any[][][]> {
        return this.http.post<any[][][]>(environment.timescaleAPIURL + '/queries?format=per_query', query);
    }

    queryAsTableV3(query: QueriesRequestElementModelV3[], orderColumnIndex: Number = 0, orderDirection: 'asc' | 'desc' = 'desc')
        : Observable<any[][] | null> {

        return this.http.post<any[][] | null>(environment.timescaleAPIURL + '/queries?format=table&order_column_index='
            + orderColumnIndex + '&order_direction=' + orderDirection, query);
    }

    getLastValuesV3(requestElements: LastValuesRequestElementModelV3[]): Observable<TimeValuePairModel[]> {
        return this.http.post<TimeValuePairModel[]>(environment.timescaleAPIURL + '/last-values', requestElements);
    }

    parseContentVariable(c: DeviceTypeContentVariableModel, prefix: string): ContentVariableWithPath[] {
        if (prefix.length > 0) {
            prefix += '.';
        }
        prefix += c.name;
        const cvwp: ContentVariableWithPath = c as ContentVariableWithPath;
        cvwp.path = prefix;
        if (c.type !== this.STRUCTURE) {
            return [cvwp];
        }
        const res:  ContentVariableWithPath[] = [];
        c.sub_content_variables?.forEach(sub => res.push(...this.parseContentVariable(sub, prefix)));
        return res;
    }

    getGroupTypes(): string[] {
        return JSON.parse(JSON.stringify(this.groupTypes)); // copy
    }
}
