/*
 * Copyright 2021 InfAI (CC SES)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DeviceInstancesModel } from '../shared/device-instances.model';
import { DeviceInstancesService } from '../shared/device-instances.service';
import { MatTable } from '@angular/material/table';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs/internal/operators';
import { Sort } from '@angular/material/sort';

@Component({
    templateUrl: './device-instances-select-dialog.component.html',
    styleUrls: ['./device-instances-select-dialog.component.css'],
})
export class DeviceInstancesSelectDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<DeviceInstancesModel>;

    devices: DeviceInstancesModel[] = [];
    dataReady = false;
    sortBy = 'name';
    sortOrder = 'asc';
    searchControl = new FormControl('');
    limitInit = 100;
    limit = this.limitInit;
    offset = 0;

    selectedDevices: string[] = [];

    constructor(
        private dialogRef: MatDialogRef<DeviceInstancesSelectDialogComponent>,
        private deviceInstancesService: DeviceInstancesService,
    ) {}

    ngOnInit() {
        this.load();
        this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => this.reload());
    }

    matSortChange($event: Sort) {
        this.sortBy = $event.active;
        this.sortOrder = $event.direction;
        this.reload();
    }

    load() {
        this.deviceInstancesService
            .getDeviceInstances(this.searchControl.value, this.limit, this.offset, this.sortBy, this.sortOrder)
            .subscribe((devices) => {
                this.devices.push(...devices);
                if (this.table !== undefined) {
                    this.table.renderRows();
                }
                this.dataReady = true;
            });
    }

    reload() {
        this.limit = this.limitInit;
        this.offset = 0;
        this.devices = [];
        this.load();
    }

    resetSearch() {
        this.searchControl.setValue('');
    }

    onScroll() {
        this.limit += this.limitInit;
        this.offset = this.devices.length;
        this.load();
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close(this.selectedDevices);
    }

    isSelected(id: string): boolean {
        return this.selectedDevices.indexOf(id) !== -1;
    }

    select(checked: boolean, id: string) {
        if (checked) {
            // add
            this.selectedDevices.push(id);
        } else {
            // remove
            const index = this.selectedDevices.indexOf(id);
            if (index > -1) {
                this.selectedDevices.splice(index, 1);
            }
        }
        // remove duplicates
        this.selectedDevices = this.selectedDevices.filter((item: string, index: number) => this.selectedDevices.indexOf(item) === index);
    }
}
