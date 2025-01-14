/*
 * Copyright 2021 InfAI (CC SES)
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

import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, Validators } from '@angular/forms';
import { ConceptsService } from '../../concepts/shared/concepts.service';
import { CharacteristicsPermSearchModel } from '../shared/characteristics-perm-search.model';
import { CharacteristicsService } from '../shared/characteristics.service';
import { ConceptsPermSearchModel } from '../../concepts/shared/concepts-perm-search.model';
import { DeviceTypeCharacteristicsModel } from '../../device-types-overview/shared/device-type.model';
import { CharacteristicElementComponent } from './characteristic-element/characteristic-element.component';

@Component({
    templateUrl: './characteristics-edit-dialog.component.html',
    styleUrls: ['./characteristics-edit-dialog.component.css'],
})
export class CharacteristicsEditDialogComponent implements OnInit, AfterViewInit {
    @ViewChild('characteristicElementComponent', { static: false }) characteristicElementComponent!: CharacteristicElementComponent;

    conceptControl = new FormControl({ value: '' }, [Validators.required]);
    characteristicPerm: CharacteristicsPermSearchModel | undefined = undefined;
    concepts: ConceptsPermSearchModel[] = [];

    baseCharacteristic: DeviceTypeCharacteristicsModel | undefined = undefined;

    constructor(
        private conceptsService: ConceptsService,
        private characteristicsService: CharacteristicsService,
        private dialogRef: MatDialogRef<CharacteristicsEditDialogComponent>,
        @Inject(MAT_DIALOG_DATA) data: { characteristic: CharacteristicsPermSearchModel } | null,
    ) {
        if (data !== null) {
            this.characteristicPerm = data.characteristic;
            this.conceptControl.setValue(this.characteristicPerm.concept_id);
            this.conceptControl.disable();
        }
    }

    ngOnInit(): void {
        this.conceptsService.getConcepts('', 9999, 0, 'name', 'asc').subscribe((concepts: ConceptsPermSearchModel[]) => {
            this.concepts = concepts;
        });
        if (this.characteristicPerm !== undefined) {
            this.characteristicsService.getCharacteristic(this.characteristicPerm.id).subscribe((characteristic) => {
                this.baseCharacteristic = characteristic;
                this.characteristicElementComponent.patch(characteristic);
            });
        }
    }

    ngAfterViewInit() {
        this.characteristicElementComponent.valueChange.asObservable().subscribe((value) => {
            this.baseCharacteristic = value;
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        this.dialogRef.close({ conceptId: this.conceptControl.value, characteristic: this.baseCharacteristic });
    }
}
