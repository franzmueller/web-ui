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
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {DashboardService} from '../../../modules/dashboard/shared/dashboard.service';
import {WidgetModel} from '../../../modules/dashboard/shared/dashboard-widget.model';
import {DashboardManipulationEnum} from '../../../modules/dashboard/shared/dashboard-manipulation.enum';
import {Observable} from 'rxjs';
import {ProcessSchedulerModel} from './process-scheduler.model';
import {ProcessModel} from '../../../modules/processes/process-repo/shared/process.model';
import {ProcessRepoService} from '../../../modules/processes/process-repo/shared/process-repo.service';
import {environment} from '../../../../environments/environment';
import {catchError, map} from 'rxjs/internal/operators';
import {HttpClient, HttpResponseBase} from '@angular/common/http';
import {ErrorHandlerService} from '../../../core/services/error-handler.service';
import {ProcessSchedulerScheduleDialogComponent} from '../dialogs/process-scheduler-schedule-dialog.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ProcessSchedulerScheduleEditDialogComponent} from '../dialogs/process-scheduler-schedule-edit-dialog.component';


@Injectable({
    providedIn: 'root'
})
export class ProcessSchedulerService {

    constructor(private dialog: MatDialog,
                private dashboardService: DashboardService,
                private processRepoService: ProcessRepoService,
                private http: HttpClient,
                private errorHandlerService: ErrorHandlerService,
                private snackBar: MatSnackBar) {
    }

    openEditDialog(dashboardId: string, widgetId: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.data = {
            widgetId: widgetId,
            dashboardId: dashboardId,
        };
        const editDialogRef = this.dialog.open(ProcessSchedulerScheduleEditDialogComponent, dialogConfig);

        editDialogRef.afterClosed().subscribe((widget: WidgetModel) => {
            if (widget !== undefined) {
                this.dashboardService.manipulateWidget(DashboardManipulationEnum.Update, widget.id, widget);
            }
        });
    }

    getSchedules(): Observable<ProcessSchedulerModel[]> {
        return this.http.get<ProcessSchedulerModel[]>(environment.processSchedulerUrl + '/schedules').pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'getSchedules()', []))
        );
    }

    deleteSchedule(scheduleId: string): Observable<{status: number}> {
        return this.http.delete<HttpResponseBase>(environment.processSchedulerUrl + '/schedules/' + scheduleId, {observe: 'response'}).pipe(
            map(resp => {
                return {status: resp.status};
            }),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteSchedule', {status: 500}))
        );
    }

    createSchedule(schedule: ProcessSchedulerModel): Observable<ProcessSchedulerModel | null> {
        return this.http.post<ProcessSchedulerModel>(environment.processSchedulerUrl + '/schedules', schedule).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'deleteSchedule', null))
        );
    }

    updateSchedule(schedule: ProcessSchedulerModel): Observable<ProcessSchedulerModel | null> {
        return this.http.put<ProcessSchedulerModel>(environment.processSchedulerUrl + '/schedules/' + schedule.id, schedule).pipe(
            map(resp => resp || []),
            catchError(this.errorHandlerService.handleError(ProcessRepoService.name, 'updateSchedule', null))
        );
    }

}
