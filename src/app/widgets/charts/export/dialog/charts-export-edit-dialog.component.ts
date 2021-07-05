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
import {WidgetModel} from '../../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../../modules/dashboard/shared/dashboard.service';
import {DashboardResponseMessageModel} from '../../../../modules/dashboard/shared/dashboard-response-message.model';
import {FormArray, FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {ExportService} from '../../../../modules/exports/shared/export.service';
import {ExportModel, ExportResponseModel, ExportValueModel} from '../../../../modules/exports/shared/export.model';
import {
    ChartsExportMeasurementModel,
    ChartsExportVAxesModel,
    DeviceWithServiceModel
} from '../shared/charts-export-properties.model';
import {SelectionModel} from '@angular/cdk/collections';
import {ChartsExportRangeTimeTypeEnum} from '../shared/charts-export-range-time-type.enum';
import {MatTableDataSource} from '@angular/material/table';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {forkJoin, Observable, of} from 'rxjs';
import {DeviceTypeModel} from '../../../../modules/metadata/device-types-overview/shared/device-type.model';
import {DeviceInstancesService} from '../../../../modules/devices/device-instances/shared/device-instances.service';
import {DeviceTypeService} from '../../../../modules/metadata/device-types-overview/shared/device-type.service';
import {DeviceInstancesPermSearchModel} from '../../../../modules/devices/device-instances/shared/device-instances.model';
import {MatOption} from '@angular/material/core';
import {map} from 'rxjs/internal/operators';
import {ExportDataService} from '../../../shared/export-data.service';


@Component({
    templateUrl: './charts-export-edit-dialog.component.html',
    styleUrls: ['./charts-export-edit-dialog.component.css'],
})
export class ChartsExportEditDialogComponent implements OnInit {
    widget: WidgetModel = {} as WidgetModel;

    formGroupController = new FormGroup({});
    exportList: ChartsExportMeasurementModel[] = [];
    deviceServiceList: Map<string, DeviceWithServiceModel[]> = new Map();
    dashboardId: string;
    widgetId: string;
    chartTypes = ['LineChart', 'ColumnChart', 'ScatterChart'];
    timeRangeEnum = ChartsExportRangeTimeTypeEnum;
    timeRangeTypes = [this.timeRangeEnum.Relative, this.timeRangeEnum.Absolute];
    groupTypes: string[] = [];
    groupTypeIsDifference = false;

    displayedColumns: string[] = ['select', 'exportName', 'valueName', 'valueType', 'valueAlias', 'color', 'math', 'conversions', 'filterType', 'filterValue', 'tags', 'displayOnSecondVAxis', 'duplicate-delete'];
    dataSource = new MatTableDataSource<ChartsExportVAxesModel>();
    selection = new SelectionModel<ChartsExportVAxesModel>(true, []);
    exportTags: Map<string, Map<string, { value: string; parent: string }[]>> = new Map();

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    LIST = 'https://schema.org/ItemList';
    typeMap = new Map<string, string>();

    constructor(private dialogRef: MatDialogRef<ChartsExportEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private _formBuilder: FormBuilder,
                private deviceInstancesService: DeviceInstancesService,
                private deviceTypeService: DeviceTypeService,
                private exportDataService: ExportDataService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
    }

    ngOnInit() {
        this.groupTypes = this.exportDataService.getGroupTypes();
        this.typeMap.set(this.STRING, 'string');
        this.typeMap.set(this.INTEGER, 'int');
        this.typeMap.set(this.FLOAT, 'float');
        this.typeMap.set(this.BOOLEAN, 'bool');

        this.initFormGroup({
            name: '', properties: {
                chartType: '',
                curvedFunction: false,
                exports: [] as ChartsExportMeasurementModel[],
                timeRangeType: '',
            }
        } as WidgetModel);
        const obs: Observable<any>[] = [];
        obs.push(this.getWidgetData());
        obs.push(this.initDeployments());
        forkJoin(obs).subscribe(() => {
            if (this.widget.properties.exports !== undefined) {
                this.widget.properties.exports = this.widget.properties.exports
                    ?.filter(selected => this.exportList.findIndex(existing => existing.id === selected.id) !== -1);

                // exports values or names might have changed
                this.widget.properties.exports?.forEach(selected => {
                    const latestExisting = this.exportList.find(existing => existing.id === selected.id);
                    if (latestExisting !== undefined && latestExisting.name !== undefined && latestExisting.id !== undefined) {
                        selected.values = latestExisting.values;
                        selected.name = latestExisting.name;
                    }
                });
            }
            this.initFormGroup(this.widget);
            this.selectionChange(this.widget.properties.exports || []);
            this.selectionDeviceChange(this.widget.properties.devices || []);
        });
    }

    getWidgetData(): Observable<any> {
        return this.dashboardService.getWidget(this.dashboardId, this.widgetId).pipe(map((widget: WidgetModel) => {
            this.widget = widget;
            this.setDefaultValues(widget);
            if (widget.properties.vAxes) {
                widget.properties.vAxes.forEach(row => this.selection.select(row));
            }
        }));
    }

    initFormGroup(widget: WidgetModel): void {
        this.formGroupController = this._formBuilder.group({
            id: widget.id,
            name: widget.name,
            type: widget.type,
            properties: this._formBuilder.group({
                chartType: widget.properties.chartType,
                curvedFunction: this._formBuilder.control(widget.properties.curvedFunction),
                exports: this._formBuilder.control(widget.properties.exports),
                devices: this._formBuilder.control(widget.properties.devices),
                timeRangeType: widget.properties.timeRangeType,
                time: this._formBuilder.group({
                    last: widget.properties.time ? widget.properties.time.last : '',
                    start: widget.properties.time ? widget.properties.time.start : '',
                    end: widget.properties.time ? widget.properties.time.end : '',
                }),
                group: this._formBuilder.group({
                    time: widget.properties.group ? widget.properties.group.time : '',
                    type: widget.properties.group ? widget.properties.group.type : undefined,
                }),
                hAxisLabel: widget.properties.hAxisLabel,
                hAxisFormat: widget.properties.hAxisFormat,
                vAxisLabel: widget.properties.vAxisLabel,
                secondVAxisLabel: widget.properties.secondVAxisLabel,
                vAxes: widget.properties.vAxes,
            })
        });
        this.groupTypeIsDifference = widget.properties.group?.type?.startsWith('difference') || false;
        this.formGroupController.get('properties.group.type')?.valueChanges.subscribe(val => {
            this.groupTypeIsDifference = val.startsWith('difference');
            if (this.groupTypeIsDifference) {
                this.dataSource.data.forEach(element => element.math = '');
            }
        });
        widget.properties.exports?.forEach(exp => this.preloadExportTags(exp.id || '').subscribe());
        this.formGroupController.get('properties.exports')?.valueChanges.subscribe((exports: ChartsExportMeasurementModel[]) => {
            exports.forEach(exp => this.preloadExportTags(exp.id || '').subscribe());
        });
    }

    initDeployments(): Observable<any> {
        this.exportService.getExports('', 9999, 0, 'name', 'asc').subscribe((exports: (ExportResponseModel | null)) => {
            if (exports !== null) {
                exports.instances.forEach((exportModel: ExportModel) => {
                    if (exportModel.ID !== undefined && exportModel.Name !== undefined) {
                        this.exportList.push({id: exportModel.ID, name: exportModel.Name, values: exportModel.Values});
                    }
                });
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
                if (this.deviceServiceList.has(d.name)) {
                    const existing = this.deviceServiceList.get(d.name);
                    if (existing === undefined) {
                        return; // Never
                    }
                    this.deviceServiceList.delete(d.name);
                    this.deviceServiceList.set(d.name + ' (' + existing[0].id + ')', existing);
                    this.deviceServiceList.set(d.name + ' (' + deviceWithServices[0].id + ')', existing);
                } else {
                    this.deviceServiceList.set(d.name, deviceWithServices);
                }
            });
        }));
    }

    getDeviceServiceTrigger(d: MatOption | MatOption[] | undefined): string {
        if (d === undefined) {
            return '';
        }
        if (!Array.isArray(d)) {
            d = [d];
        }
        return d.map(o => o.group.label + ': ' + o.value.service.name).join(', ');
    }

    compare(a: any, b: any): boolean {
        return a && b && a.id === b.id && a.name === b.name;
    }

    compareDeviceWithService(a: DeviceWithServiceModel, b: DeviceWithServiceModel): boolean {
        return a && b && a.id === b.id && a.service.id === b.service.id;
    }

    compareFilterTypes(a: string, b: string): boolean {
        return a === b;
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.formGroupController.patchValue({'properties': {'vAxes': this.selection.selected}});
        this.dashboardService.updateWidget(this.dashboardId, this.formGroupController.value).subscribe((resp: DashboardResponseMessageModel) => {
            if (resp.message === 'OK') {
                this.dialogRef.close(this.formGroupController.value);
            }
        });
    }

    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    masterToggle() {
        this.isAllSelected() ?
            this.selection.clear() :
            this.dataSource.data.forEach(row => this.selection.select(row));
    }

    async selectionChange(selectedExports: ChartsExportMeasurementModel[]) {
        const newData: ChartsExportVAxesModel[] = [];
        const newSelection: ChartsExportVAxesModel[] = [];
        selectedExports.forEach((selectedExport: ChartsExportMeasurementModel) => {
            selectedExport.values?.forEach((value: ExportValueModel) => {
                const newVAxis: ChartsExportVAxesModel = {
                    instanceId: value.InstanceID,
                    exportName: selectedExport.name,
                    valueName: value.Name,
                    valueType: value.Type,
                    color: '',
                    math: '',
                    displayOnSecondVAxis: false,
                    tagSelection: [],
                };
                const index = this.selection.selected.findIndex(
                    item => item.instanceId === newVAxis.instanceId &&
                        item.exportName === newVAxis.exportName &&
                        item.valueName === newVAxis.valueName &&
                        item.valueType === newVAxis.valueType);
                if (index === -1) {
                    newData.push(newVAxis);
                } else {
                    newSelection.push(this.selection.selected[index]);
                    newData.push(this.selection.selected[index]);
                }
                // Add duplicates of this export value
                const duplicates = this.selection.selected.filter(item => item.isDuplicate && item.instanceId === newVAxis.instanceId &&
                    item.exportName === newVAxis.exportName &&
                    item.valueName === newVAxis.valueName &&
                    item.valueType === newVAxis.valueType);
                newSelection.push(...duplicates);
                newData.push(...duplicates);
            });
        });
        // Add devices
        newData.push(...this.dataSource.data.filter(v => v.deviceId !== undefined));
        newSelection.push(...this.selection.selected.filter(v => v.deviceId !== undefined));
        this.dataSource.data = newData;
        this.selection.clear();
        newSelection.forEach(row => this.selection.select(row));
    }

    selectionDeviceChange(selectedDeviceServices: DeviceWithServiceModel[]) {
        const newData: ChartsExportVAxesModel[] = [];
        const newSelection: ChartsExportVAxesModel[] = [];
        selectedDeviceServices.forEach((selectedDeviceService: DeviceWithServiceModel) => {
            selectedDeviceService.service.outputs.forEach(o => {
                const paths = this.exportDataService.parseContentVariable(o.content_variable, '');
                paths.forEach(p => {
                    const type = this.typeMap.get(p.type || '');
                    if (type === undefined) {
                        console.error('Unsupported type', p.type);
                        return;
                    }
                    const newVAxis: ChartsExportVAxesModel = {
                        exportName: selectedDeviceService.name,
                        deviceId: selectedDeviceService.id,
                        serviceId: selectedDeviceService.service.id,
                        valueName: p.path,
                        valueType: type,
                        color: '',
                        math: '',
                        displayOnSecondVAxis: false,
                        tagSelection: [],
                    };
                    const index = this.selection.selected.findIndex(
                        item => item.deviceId === newVAxis.deviceId &&
                            item.serviceId === newVAxis.serviceId &&
                            item.valueName === newVAxis.valueName &&
                            item.valueType === newVAxis.valueType);
                    if (index === -1) {
                        newData.push(newVAxis);
                    } else {
                        newSelection.push(this.selection.selected[index]);
                        newData.push(this.selection.selected[index]);
                    }
                    // Add duplicates of this export value
                    const duplicates = this.selection.selected.filter(item => item.isDuplicate && item.deviceId === newVAxis.deviceId &&
                        item.serviceId === newVAxis.serviceId &&
                        item.valueName === newVAxis.valueName &&
                        item.valueType === newVAxis.valueType);
                    newSelection.push(...duplicates);
                    newData.push(...duplicates);
                });
            });
        });
        // Add exports
        newData.push(...this.dataSource.data.filter(v => v.instanceId !== undefined));
        newSelection.push(...this.selection.selected.filter(v => v.instanceId !== undefined));
        this.dataSource.data = newData;
        this.selection.clear();
        newSelection.forEach(row => this.selection.select(row));
    }


    filerTypeSelected(element: ChartsExportVAxesModel) {
        if (element.filterType === undefined) {
            element.filterValue = undefined;
        }
    }


    duplicate(element: ChartsExportVAxesModel, index: number) {
        const newElement = JSON.parse(JSON.stringify(element)) as ChartsExportVAxesModel;
        newElement.isDuplicate = true;
        this.dataSource.data.splice(index + 1, 0, newElement);
        if (this.selection.isSelected(element)) {
            this.selection.select(newElement);
        }
        this.reloadTable();
    }

    deleteDuplicate(element: ChartsExportVAxesModel, index: number) {
        this.selection.deselect(element);
        this.dataSource.data.splice(index, 1);
        this.reloadTable();
    }

    private reloadTable() {
        this.dataSource._updateChangeSubscription();
    }

    private setDefaultValues(widget: WidgetModel): void {
        if (widget.properties.chartType === undefined) {
            widget.properties.chartType = this.chartTypes[0];
        }

        if (widget.properties.time === undefined) {
            widget.properties.timeRangeType = 'relative';
            widget.properties.time = {
                last: '1d',
                start: '',
                end: ''
            };
        }

        if (widget.properties.group === undefined) {
            widget.properties.group = {
                time: '',
                type: '',
            };
        }
    }

    get chartType(): FormControl {
        return this.formGroupController.get(['properties', 'chartType']) as FormControl;
    }

    get exports(): FormArray {
        return this.formGroupController.get(['properties', 'exports']) as FormArray;
    }

    get timeRangeType(): FormControl {
        return this.formGroupController.get(['properties', 'timeRangeType']) as FormControl;
    }

    deleteConversion(element: ChartsExportVAxesModel, index: number, $event: MouseEvent) {
        element.conversions?.splice(index, 1);
        $event.stopPropagation();
    }

    addConversion(element: any) {
        if (element.conversions === undefined) {
            element.conversions = [];
        }
        element.conversions.push({from: element.__from, to: element.__to});
        element.__from = undefined;
        element.__to = undefined;
    }

    getTags(element: ChartsExportVAxesModel): Map<string, { value: string, parent: string }[]> {
        return this.exportTags.get(element.instanceId || '') || new Map();
    }

    private preloadExportTags(exportId: string): Observable<any> {
        if (this.exportTags.get(exportId) !== undefined) {
            return of(this.exportTags.get(exportId));
        }
        this.exportTags?.set(exportId, new Map());
        return this.exportService.getExportTags(exportId).pipe(map(res => {
            const m = new Map<string, { value: string, parent: string }[]>();
            res.forEach((v, k) => m.set(k, v.map(t => {
                return {value: t, parent: k};
            })));
            this.exportTags?.set(exportId, m);
            return m;
        }));
    }

    getTagOptionDisabledFunction(tab: ChartsExportVAxesModel): ((option: { value: string, parent: string }) => boolean) {
        return ((option: { value: string, parent: string }) => {
            const selection = tab.tagSelection;
            if (selection === null || selection === undefined || Object.keys(selection).length === 0) {
                return false;
            }
            const existing = selection.find(s => s.startsWith(option.parent) && this.getTagValue(option) !== s);
            return existing !== undefined;
        });
    }

    getTagValue(a: { value: string, parent: string }): string {
        return a.parent + '!' + a.value;
    }

    trackByIndex(index: number, _: any) {
        return index;
    }
}
