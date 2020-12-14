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
import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormArray, FormBuilder, FormGroup} from '@angular/forms';
import {
    ImportTypeConfigModel,
    ImportTypeContentVariableModel,
    ImportTypeModel
} from '../import-types/shared/import-types.model';
import {ImportTypesService} from '../import-types/shared/import-types.service';
import {FunctionsService} from '../../devices/functions/shared/functions.service';
import {FunctionsPermSearchModel} from '../../devices/functions/shared/functions-perm-search.model';
import {AspectsService} from '../../devices/aspects/shared/aspects.service';
import {AspectsPermSearchModel} from '../../devices/aspects/shared/aspects-perm-search.model';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {ContentVariableDialogComponent} from './content-variable-dialog/content-variable-dialog.component';
import {environment} from '../../../../environments/environment';
import {CharacteristicsPermSearchModel} from '../../devices/characteristics/shared/characteristics-perm-search.model';
import {CharacteristicsService} from '../../devices/characteristics/shared/characteristics.service';
import {MatTree, MatTreeNestedDataSource} from '@angular/material/tree';
import {NestedTreeControl} from '@angular/cdk/tree';
import {Observable} from 'rxjs';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
    selector: 'senergy-import-types-create-edit',
    templateUrl: './import-types-create-edit.component.html',
    styleUrls: ['./import-types-create-edit.component.css']
})
export class ImportTypesCreateEditComponent implements OnInit {

    constructor(private route: ActivatedRoute,
                private router: Router,
                private fb: FormBuilder,
                private importTypesService: ImportTypesService,
                private aspectsService: AspectsService,
                private characteristicsService: CharacteristicsService,
                private dialog: MatDialog,
                private changeDetectorRef: ChangeDetectorRef,
                private snackBar: MatSnackBar,
                private functionsService: FunctionsService) {
    }

    ready = false;
    id: string | null = null;
    editMode = false;
    detailsMode = false;
    functions: FunctionsPermSearchModel[] = [];
    aspects: AspectsPermSearchModel[] = [];
    characteristics: CharacteristicsPermSearchModel[] = [];

    STRING = 'https://schema.org/Text';
    INTEGER = 'https://schema.org/Integer';
    FLOAT = 'https://schema.org/Float';
    BOOLEAN = 'https://schema.org/Boolean';
    STRUCTURE = 'https://schema.org/StructuredValue';
    LIST = 'https://schema.org/ItemList';

    types: { id: string; name: string }[] = [
        {id: this.STRING, name: 'string'},
        {id: this.INTEGER, name: 'int'},
        {id: this.FLOAT, name: 'float'},
        {id: this.BOOLEAN, name: 'bool'},
        {id: this.STRUCTURE, name: 'Structure'},
        {id: this.LIST, name: 'List'},
    ];


    form = this.fb.group({
        id: '',
        name: '',
        description: '',
        image: '',
        default_restart: true,
        configs: this.fb.array([]),
        aspect_ids: [],
        function_ids: [],
        owner: '',
    });

    usesDefaultOutput = true;
    defaultOutput: ImportTypeContentVariableModel = {
        name: 'root',
        type: this.STRUCTURE,
        characteristic_id: '',
        use_as_tag: false,
        sub_content_variables: [
            {
                name: 'import_id',
                type: this.STRING,
                sub_content_variables: [],
                characteristic_id: '',
                use_as_tag: false,
            },
            {
                name: 'time',
                type: this.STRING,
                sub_content_variables: [],
                characteristic_id: environment.timeStampCharacteristicId,
                use_as_tag: false,
            },
            {
                name: 'value',
                type: this.STRUCTURE,
                sub_content_variables: [],
                characteristic_id: '',
                use_as_tag: false,
            },
        ],
    };

    treeControl = new NestedTreeControl<ImportTypeContentVariableModel>(node => node.sub_content_variables);
    dataSource = new MatTreeNestedDataSource<ImportTypeContentVariableModel>();

    @ViewChild(MatTree, {static: false}) tree !: MatTree<ImportTypeContentVariableModel>;
    hasChild = (_: number, node: ImportTypeContentVariableModel) => !!node.sub_content_variables && node.sub_content_variables.length > 0;

    ngOnInit(): void {
        this.route.url.subscribe(url => {
            if (url[url.length - 1]?.toString() === 'new') {
                this.editMode = false;
                if (this.defaultOutput.sub_content_variables !== null) {
                    this.dataSource.data = this.defaultOutput.sub_content_variables[2].sub_content_variables || [];
                }
                this.ready = true;
            } else {
                this.id = this.route.snapshot.paramMap.get('id');
                if (this.id === null || !this.id.startsWith('urn:infai:ses:import-type:')) {
                    console.error('edit mode opened with invalid id', this.id);
                }
                if (url[url.length - 2]?.toString() === 'details') {
                    this.detailsMode = true;
                    this.form.disable();
                } else if (url[url.length - 2]?.toString() === 'edit') {
                    this.editMode = true;
                }
                this.importTypesService.getImportType(this.id || '').subscribe(type => {
                    this.form.patchValue(type);
                    type.configs.forEach(config => this.addConfig(config));
                    const value = type.output.sub_content_variables?.find(sub => sub.name === 'value' && sub.type === this.STRUCTURE);
                    if (type.output.name === 'root' && type.output.sub_content_variables?.length === 3 && value !== undefined) {
                        this.dataSource.data = value.sub_content_variables || [];
                    } else {
                        this.usesDefaultOutput = false;
                        this.dataSource.data = [type.output];
                    }

                    this.ready = true;
                }, err => {
                    console.log(err);
                    this.snackBar.open('Error loading import type', 'OK', {duration: 3000});
                    this.navigateToList();
                });
            }
        });
        this.functionsService.getFunctions('', 10000, 0, 'name', 'asc')
            .subscribe(functions => this.functions = functions, err => {
                console.log(err);
                this.snackBar.open('Error loading functions', 'OK', {duration: 3000});
                this.navigateToList();
            });
        this.aspectsService.getAspects('', 10000, 0, 'name', 'asc')
            .subscribe(aspects => this.aspects = aspects, err => {
                console.log(err);
                this.snackBar.open('Error loading aspects', 'OK', {duration: 3000});
                this.navigateToList();
            });
        this.characteristicsService.getCharacteristics('', 10000, 0, 'name', 'asc')
            .subscribe(chacteristics => this.characteristics = chacteristics, err => {
                console.log(err);
                this.snackBar.open('Error loading characteristics', 'OK', {duration: 3000});
                this.navigateToList();
            });
    }


    save() {
        this.ready = false;
        const val: ImportTypeModel = this.form.getRawValue();
        val.configs.forEach((config: ImportTypeConfigModel) => {
            if (config.type !== this.STRING) {
                config.default_value = JSON.parse(config.default_value);
            }
        });
        if (this.usesDefaultOutput) {
            if (this.defaultOutput.sub_content_variables === null || this.defaultOutput.sub_content_variables.length !== 3) {
                console.error('invalid default output');
                return;
            }
            this.defaultOutput.sub_content_variables[2].sub_content_variables = this.dataSource.data;
            val.output = this.defaultOutput;
        } else {
            val.output = this.dataSource.data[0];
        }
        this.importTypesService.saveImportType(val)
            .subscribe(() => this.navigateToList(), (err: any) => {
                console.error(err);
                this.snackBar.open('Error saving: ' + err.error, 'OK', {duration: 3000});
                this.ready = true;
            });
    }

    navigateToList(): boolean {
        this.router.navigateByUrl('imports/types/list');
        return false;
    }

    addConfig(config: ImportTypeConfigModel | undefined) {
        const group = this.fb.group({
            name: '',
            description: '',
            type: '',
            default_value: '',
        });
        if (this.detailsMode) {
            group.disable();
        }
        if (config !== undefined) {
            group.patchValue({name: config.name, description: config.description, type: config.type});
            if (config.type !== this.STRING) {
                group.patchValue({default_value: JSON.stringify(config.default_value)});
            } else {
                group.patchValue({default_value: config.default_value});
            }
        }

        this.getConfigsFormArray().push(group);
    }


    getConfigsFormArray(): FormArray {
        return this.form.get('configs') as FormArray;
    }

    getConfigsFormArrayGroups(): FormGroup[] {
        return this.getConfigsFormArray().controls as FormGroup[];
    }

    deleteConfig(index: number) {
        this.getConfigsFormArray().controls.splice(index, 1);
    }

    editContentVariable(sub: ImportTypeContentVariableModel) {
        this.openDialog(sub).subscribe(val => {
            if (val !== undefined) {
                sub = val;
            }
        });
    }

    addSubContentVariable(sub: ImportTypeContentVariableModel) {
        this.openDialog(undefined).subscribe(val => {
            if (val !== undefined) {
                if (sub.sub_content_variables === null || sub.sub_content_variables === undefined) {
                    sub.sub_content_variables = [val];
                } else {
                    sub.sub_content_variables.push(val);
                }
                const data = this.dataSource.data;
                this.dataSource.data = [];
                this.dataSource.data = data; // forces redraw
            }
        });
    }

    addOutput() {
        this.openDialog(undefined).subscribe(val => {
            if (val !== undefined) {
                const data = this.dataSource.data;
                data.push(val);
                this.dataSource.data = data; // forces redraw
            }
        });
    }

    private openDialog(content: ImportTypeContentVariableModel | undefined, infoOnly = false): Observable<ImportTypeContentVariableModel | undefined> {
        const config: MatDialogConfig = {
            data: {
                characteristics: this.characteristics,
                content: content,
                infoOnly: infoOnly,
            },
            minHeight: '400px',
        };
        return this.dialog.open(ContentVariableDialogComponent, config).afterClosed();
    }

    deleteContentVariable(node: ImportTypeContentVariableModel) {
        this.dataSource.data.forEach((sub, i) => {
            if (sub === node) {
                this.dataSource.data.splice(i, 1);
            } else {
                this.findAndDeleteChild(sub, node);
            }
        });
        const data = this.dataSource.data;
        this.dataSource.data = [];
        this.dataSource.data = data; // forces redraw
    }

    private findAndDeleteChild(data: ImportTypeContentVariableModel, searchElement: ImportTypeContentVariableModel) {
        if (data.sub_content_variables === null || data.sub_content_variables === undefined) {
            return;
        }
        const i = data.sub_content_variables.indexOf(searchElement);
        if (i === -1) {
            data.sub_content_variables.forEach(sub => this.findAndDeleteChild(sub, searchElement));
        } else {
            data.sub_content_variables.splice(i, 1);
        }
    }

    viewContentVariable(node: ImportTypeContentVariableModel) {
        this.openDialog(node, true);
    }
}
