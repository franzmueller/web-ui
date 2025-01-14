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

import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {DurationIso, DurationResult} from '../../shared/designer.model';
import * as moment from 'moment';

@Component({
    templateUrl: './duration-dialog.component.html',
    styleUrls: ['./duration-dialog.component.css'],
})
export class DurationDialogComponent implements OnInit {
    initial: string;
    result?: DurationResult;
    valid = false

    constructor(
        private dialogRef: MatDialogRef<DurationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) private dialogParams: { initialDuration: string },
    ) {
        this.initial = dialogParams.initialDuration || '';
        this.valid = this.isValid(moment.duration(this.initial))
    }

    update(updateEvent: DurationResult) {
        this.result = updateEvent;
        this.valid = this.isValid(moment.duration(JSON.parse(JSON.stringify(updateEvent.iso))));
    }

    ngOnInit() {}

    close(): void {
        this.dialogRef.close();
    }

    isValid(duration: moment.Duration): boolean {
        return duration.asSeconds() >= 5;
    }

    ok(): void {
        this.dialogRef.close(this.result);
    }
}
