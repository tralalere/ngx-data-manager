/**
 * Created by reunion on 17/05/2017.
 */
import {ExternalInterface} from "./external-interface.interface";
import {DataManagerService} from "../data-manager.service";
import {Observable} from "rxjs/Rx";
import {DataEntity} from "../data-entity.class";
import {DataEntityCollection} from "../data-entity-collection.class";

export class LocalStorageInterface implements ExternalInterface {

    models:{[key:string]:Object};

    constructor(
        private manager:DataManagerService
    ) {
        this.loadFromStorage();
    }

    saveToStorage() {
        localStorage["local-data"] = JSON.stringify(this.models);
    }

    loadFromStorage() {
        if (localStorage["local-data"] === null || localStorage["local-data"] === "") {
            this.models = {};
        } else {
            this.models = JSON.parse(localStorage["local-data"]);
        }
    }

    getEntity(entityType: string): Observable<DataEntity> {
        return null;
    }

    loadEntity(entityType: string, entityId: any): Observable<DataEntity> {
        return null;
    }

    saveEntity(entity: DataEntity, applyDiff:boolean): Observable<DataEntity> {
        return null;
    }


    saveRawEntity(entity: DataEntity): Observable<DataEntity> {
        return null;
    }

    loadEntityCollection(entityType: string, fields:Array<string>): Observable<DataEntityCollection> {
        return null;
    }

    // aucune utilité
    //saveEntityCollection(entityCollection: DataEntityCollection): Observable<DataEntityCollection>;

    createEntity(entityType: string, datas:Object): Observable<DataEntity> {
        return null;
    }

    putEntity(entityType: string, datas:Object): Observable<DataEntity> {
        return null;
    }

    deleteEntity(entity: DataEntity): Observable<Response> {
        return null;
    }

    duplicateEntity(entity: DataEntity): Observable<DataEntity> {
        return null;
    }
}