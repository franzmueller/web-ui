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

import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';
import { PermissionsEditModel } from '../../shared/permissions-edit.model';
import { FormControl } from '@angular/forms';
import { AuthorizationService } from '../../../../core/services/authorization.service';
import { PermissionsGroupModel, PermissionsUserModel } from '../../shared/permissions-user.model';
import { HttpClient } from '@angular/common/http';
import { PermissionsService } from '../../shared/permissions.service';
import { MatTable } from '@angular/material/table';

@Component({
    templateUrl: './permission-dialog.component.html',
    styleUrls: ['./permission-dialog.component.css'],
})
export class PermissionDialogComponent implements OnInit {
    @ViewChild(MatTable, { static: false }) table!: MatTable<PermissionsEditModel>;
    formControl = new FormControl('');
    groupFormControl = new FormControl('');
    roles: PermissionsGroupModel[] = [];
    name: string;
    userId: null | string = null;
    displayedColumns: string[] = ['user', 'isRole', 'read', 'write', 'execute', 'administrate', 'action'];
    permissions: PermissionsEditModel[] = [];
    deletedPermissions: PermissionsEditModel[] = [];

    constructor(
        private dialogRef: MatDialogRef<PermissionDialogComponent>,
        private errorHandlerService: ErrorHandlerService,
        private authorizationService: AuthorizationService,
        private http: HttpClient,
        private permissionsService: PermissionsService,
        @Inject(MAT_DIALOG_DATA)
        data: {
            name: string;
            permissions: PermissionsEditModel[];
        },
    ) {
        this.name = data.name;
        this.permissions = data.permissions;
    }

    ngOnInit() {
        this.getUserId();
        this.permissionsService.getRoles().subscribe((roles) => {
            this.roles = roles.filter((r) => this.permissions.findIndex((p) => p.isRole === true && p.userName === r.name) === -1);
        });
    }

    close(): void {
        this.dialogRef.close();
    }

    save(): void {
        const permissionOut: PermissionsEditModel[] = [];
        let index = 0;
        this.deletedPermissions.forEach((deletedPerm: PermissionsEditModel) => {
            permissionOut.push(deletedPerm);
            permissionOut[index++].deleted = true;
        });

        this.permissions.forEach((permission: PermissionsEditModel) => {
            permissionOut.push(permission);
            permissionOut[index++].deleted = false;
        });

        this.dialogRef.close(permissionOut);
    }

    deleteRow(index: number) {
        this.deletedPermissions = this.deletedPermissions.concat(this.permissions.splice(index, 1));
        this.table.renderRows();
    }

    addColumn() {
        let userExists = false;
        this.permissions.forEach((data: PermissionsEditModel) => {
            if (data.userName === this.formControl.value) {
                userExists = true;
            }
        });

        if (userExists) {
            this.formControl.setErrors({ userExists: true });
        } else {
            this.permissionsService.getUserByName(this.formControl.value).subscribe((userPermission: PermissionsUserModel | null) => {
                if (userPermission !== null) {
                    this.permissions.push({
                        userId: userPermission.id,
                        userName: userPermission.username,
                        userRights: {
                            administrate: false,
                            execute: false,
                            write: false,
                            read: false,
                        },
                    });
                    this.formControl.setValue('');
                    this.table.renderRows();
                    this.formControl.updateValueAndValidity();
                } else {
                    this.formControl.setErrors({ invalid: true });
                }
            });
        }
    }

    private getUserId(): void {
        this.userId = this.authorizationService.getUserId() as string;
    }

    addRole() {
        if (this.groupFormControl.value === '') {
            return;
        }
        this.permissions.push({
            userId: this.groupFormControl.value.id,
            userName: this.groupFormControl.value.name,
            userRights: {
                administrate: false,
                execute: false,
                write: false,
                read: false,
            },
            isRole: true,
        });
        this.table.renderRows();

        this.roles = this.roles.filter((r) => this.permissions.findIndex((p) => p.isRole === true && p.userId === r.id) === -1);
    }
}
