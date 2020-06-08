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
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DeploymentsService} from '../../../modules/processes/deployments/shared/deployments.service';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {ExportService} from '../../../modules/data/export/shared/export.service';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {DeviceTypeAspectModel, DeviceTypeServiceModel} from '../../../modules/devices/device-types-overview/shared/device-type.model';
import {DeviceTypeService} from '../../../modules/devices/device-types-overview/shared/device-type.service';
import {DeviceStatusElementModel} from '../shared/device-status-properties.model';


@Component({
    templateUrl: './device-status-edit-dialog.component.html',
    styleUrls: ['./device-status-edit-dialog.component.css'],
})
export class DeviceStatusEditDialogComponent implements OnInit {

    aspects: DeviceTypeAspectModel[] = [];
    dashboardId: string;
    widgetId: string;
    widget: WidgetModel = {} as WidgetModel;

    formGroup = this.fb.group({
        name: ['', Validators.required],
        elements: this.fb.array([]),
    });

    constructor(private dialogRef: MatDialogRef<DeviceStatusEditDialogComponent>,
                private deploymentsService: DeploymentsService,
                private dashboardService: DashboardService,
                private exportService: ExportService,
                private fb: FormBuilder,
                private deviceTypeService: DeviceTypeService,
                @Inject(MAT_DIALOG_DATA) data: { dashboardId: string, widgetId: string }) {
        this.dashboardId = data.dashboardId;
        this.widgetId = data.widgetId;
        this.getWidgetData();
    }

    ngOnInit() {

        this.getAspects();
    }

    trackByFn(index: any) {
        return index;
    }

    getWidgetData() {
        this.dashboardService.getWidget(this.dashboardId, this.widgetId).subscribe((widget: WidgetModel) => {
            this.widget = widget;
            this.formGroup.patchValue({'name': widget.name});
            this.formGroup.patchValue({'elements': []});
        });
    }

    get elements(): FormArray {
        return this.formGroup.get('elements') as FormArray;
    }


    addElement(element: DeviceStatusElementModel) {
        // console.log(this.elements);
        // console.log(this.elements);
        // this.elements.controls.push(this.setElement(element));
        // this.elements.push();
        console.log(element);

        const formArray = <FormArray>this.formGroup.controls['elements'];
        formArray.push(this.setElement(element));

    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        console.log(this.formGroup.value);
    }

    addNewMeasurement() {
        this.addElement({} as DeviceStatusElementModel);
    }

    compare(a: any, b: any) {
        return a.InstanceID === b.InstanceID && a.Name === b.Name && a.Path === b.Path;
    }

    private getAspects(): void {
        this.deviceTypeService.getAspectsWithMeasuringFunction().subscribe(
            (aspects: DeviceTypeAspectModel[]) => {
                this.aspects = aspects;
            });
    }

    private setElement(element: DeviceStatusElementModel): FormGroup {
        return this.fb.group({
            name: [element.name, Validators.required],
            aspect: [],
        });
    }
}
