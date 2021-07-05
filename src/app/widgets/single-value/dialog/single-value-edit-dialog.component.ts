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

import {Component, Inject, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/internal/operators';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {
    ChartsExportMeasurementModel,
    DeviceWithServiceModel
} from '../../charts/export/shared/charts-export-properties.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {ExportModel, ExportResponseModel} from '../../../modules/exports/shared/export.model';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/exports/shared/export.service';
import {DashboardResponseMessageModel} from '../../../modules/dashboard/shared/dashboard-response-message.model';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DeviceTypeModel} from '../../../modules/metadata/device-types-overview/shared/device-type.model';
import {DeviceInstancesPermSearchModel} from '../../../modules/devices/device-instances/shared/device-instances.model';
import {DeviceInstancesService} from '../../../modules/devices/device-instances/shared/device-instances.service';
import {DeviceTypeService} from '../../../modules/metadata/device-types-overview/shared/device-type.service';
import {ExportDataService} from '../../shared/export-data.service';


@Component({
    templateUrl: './single-value-edit-dialog.component.html',
    styleUrls: ['./single-value-edit-dialog.component.css'],
})
export class SingleValueEditDialogComponent implements OnInit {
    form = this.fb.group({
        id: '',
        name: '',
        type: '',
        properties: this.fb.group({
            group: this.fb.group({
                time: '',
                type: undefined,
            }),
            exportDeviceService: undefined,
            type: '',
            math: '',
            threshold: 64,
            unit: '',
            format: '',
            path: '',
        })
    });

    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;
    exportDeviceServiceOptions: Map<string, DeviceWithServiceModel[] | ChartsExportMeasurementModel[]> = new Map();
    pathOptions: string[] = [];
    disableSave = false;
    groupTypes: string[] = [];
    ready = false;

    constructor(private dialogRef: MatDialogRef<SingleValueEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private deviceInstancesService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
                private fb: FormBuilder,
                private exportDataService: ExportDataService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.groupTypes = this.exportDataService.getGroupTypes();
        this.form.get('properties.format')?.valueChanges.subscribe(format => {
            if (format === 'String') {
                if (this.form.get('properties.format')?.enabled) {
                    this.form.get('properties.format')?.disable();
                }
            } else {
                if (this.form.get('properties.format')?.disabled) {
                    this.form.get('properties.format')?.enable();
                }
            }
        });
        this.form.get('properties.exportDeviceService')?.valueChanges.subscribe(exportDeviceService => {
            this.pathOptions = [];
            this.form.get('properties.path')?.setValue('');
            if (exportDeviceService === undefined || exportDeviceService === null) {
                return;
            }
            if ((exportDeviceService as DeviceWithServiceModel).service !== undefined) {
                (exportDeviceService as DeviceWithServiceModel).service.outputs.forEach(o => {
                    this.pathOptions.push(...this.exportDataService.parseContentVariable(o.content_variable, '').map(x => x.path));
                });
            } else {
                this.pathOptions.push(...(exportDeviceService as ChartsExportMeasurementModel).values.map(x => x.Path));
            }
        });
        const obs: Observable<any>[] = [];
        obs.push(this.initDeployments());
        obs.push(this.getWidgetData());
        forkJoin(obs).subscribe(() => {
            this.form.patchValue({
                name: this.widget.name,
                properties: {
                    group: {
                        time: this.widget.properties?.group?.time || '',
                        type: this.widget.properties?.group?.type,
                    },
                    exportDeviceService: this.widget.properties?.exportDeviceService,
                    type: this.widget.properties?.type,
                    math: this.widget.properties?.math,
                    threshold: this.widget.properties?.threshold,
                    unit: this.widget.properties?.unit,
                    format: this.widget.properties?.format,
                    path: this.widget.properties?.path,
                },
            });
            this.ready = true;
        });
    }

    getWidgetData(): Observable<any> {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(map((widget: WidgetModel) => {
            this.widget = widget;
        }));
    }

    initDeployments(): Observable<any> {
        this.exportService.getExports('', 9999, 0, 'name', 'asc').subscribe((exports: (ExportResponseModel | null)) => {
            if (exports !== null) {
                const validExports: ChartsExportMeasurementModel[] = [];

                exports.instances.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        validExports.push({id: exportModel.ID, name: exportModel.Name, values: exportModel.Values});
                    }
                });
                this.exportDeviceServiceOptions.set('Exports', validExports);
            }
        });


        const obs: Observable<any>[] = [];
        obs.push(this.deviceTypeService.getFullDeviceTypes());
        obs.push(this.deviceInstancesService.getDeviceInstances('', -1, 0, 'name', 'asc'));
        return forkJoin(obs).pipe(map(o => {
            let deviceTypes: DeviceTypeModel[] = [];
            let deviceInstances: DeviceInstancesPermSearchModel[] = [];
            o.forEach((res: any[]) => {
                if (!Array.isArray(res) || res.length === 0) {
                    return;
                }
                if (res[0]['services'] !== undefined) {
                    deviceTypes = res;
                } else {
                    deviceInstances = res;
                }
            });
            deviceInstances.forEach(d => {
                const type = deviceTypes.find(dt => dt.id === d.device_type_id);
                if (type === undefined) {
                    console.error('Got device, but no matching device type', d);
                    return;
                }
                const deviceWithServices: DeviceWithServiceModel[] = [];
                const dws: DeviceWithServiceModel = d as DeviceWithServiceModel;
                type.services.forEach(service => {
                    dws.service = service;
                    deviceWithServices.push(JSON.parse(JSON.stringify(dws)));
                });
                if (deviceWithServices.length === 0) {
                    return;
                }
                if (this.exportDeviceServiceOptions.has(d.name)) {
                    const existing = this.exportDeviceServiceOptions.get(d.name);
                    if (existing === undefined) {
                        return; // Never
                    }
                    this.exportDeviceServiceOptions.delete(d.name);
                    this.exportDeviceServiceOptions.set(d.name + ' (' + existing[0].id + ')', existing);
                    this.exportDeviceServiceOptions.set(d.name + ' (' + deviceWithServices[0].id + ')', existing);
                } else {
                    this.exportDeviceServiceOptions.set(d.name, deviceWithServices);
                }
            });
        }));
    }


    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.widget.name = this.form.get('name')?.value;
        this.widget.properties = this.form.get('properties')?.value;
        this.widget.properties.math = this.widget.properties.math?.replace(/ /g, '');
        console.log(this.widget); // TODO
        this.dashboardService.updateWidget(this.dashboardId, this.widget).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.widget);
            }
        });
    }


    displayFn(input?: ChartsExportMeasurementModel): string {
        return input ? input.name : '';
    }

    compare(a: any, b: any) {
        if (a === undefined || a === null || b === undefined || b === null) {
            return a === b;
        }
        if (a.id !== undefined && a.service?.id !== undefined) {
            return a.id === b.id && a.service.id === b.service.id;
        }
        if (a.id !== undefined) {
            return b.id !== undefined && a.id === b.id;
        }
        return a.InstanceID === b.InstanceID && a.Name === b.Name;
    }

    getExportDeviceServiceOptionViewValue(v: DeviceWithServiceModel | ChartsExportMeasurementModel | null | undefined): string {
        if (v === null || v === undefined) {
            return '';
        }
        return (v as DeviceWithServiceModel).service?.name || v.name;
    }

}
