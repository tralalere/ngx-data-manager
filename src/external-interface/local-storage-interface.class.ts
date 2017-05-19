/**
 * Created by reunion on 17/05/2017.
 */
import {ExternalInterface} from "./external-interface.interface";
import {DataManagerService} from "../data-manager.service";
import {Observable, BehaviorSubject} from "rxjs/Rx";
import {DataEntity} from "../data-entity.class";
import {DataEntityCollection} from "../data-entity-collection.class";
import {Response} from "@angular/http";

export class LocalStorageInterface implements ExternalInterface {

    models:{[key:string]:Object};
    maxIndex:number = 1;

    constructor(
        private manager:DataManagerService
    ) {
        this.loadFromStorage();
        this.loadIndex();
    }

    saveIndex() {
        localStorage["max-index"] = String(this.maxIndex);
    }

    loadIndex() {
        if (localStorage["max-index"] && localStorage["max-index"] !== "") {
            this.maxIndex = +localStorage["max-index"];
        }
    }

    saveToStorage() {
        localStorage["local-data"] = JSON.stringify(this.models);
    }

    loadFromStorage() {
        if (!localStorage["local-data"] || localStorage["local-data"] === "") {
            this.models = {};
        } else {
            this.models = JSON.parse(localStorage["local-data"]);
        }
    }

    getEntity(entityType: string): Observable<DataEntity> {
        return null;
    }

    loadEntity(entityType: string, entityId: any): Observable<DataEntity> {
        var data:Object = this.models[entityType][String(entityId)];
        var entity:DataEntity = new DataEntity(data, entityType, this.manager);
        return new BehaviorSubject<DataEntity>(entity);
    }

    saveEntity(entity: DataEntity, applyDiff:boolean): Observable<DataEntity> {
        if (!this.models[entity.type]) {
            this.models[entity.type] = {};
        }
        
        this.models[entity.type][String(entity.id)] = entity.attributes;
        this.saveToStorage();
        
        return new BehaviorSubject(entity);
    }


    saveRawEntity(entity: DataEntity): Observable<DataEntity> {
        return this.saveEntity(entity, false);
    }

    loadEntityCollection(entityType: string, fields:string[]): Observable<DataEntityCollection> {
        if (!this.models[entityType]) {
            this.models[entityType] = {};
        }

        var collectionArray:Object[] = [];

        for (var key in this.models[entityType]) {
            if (this.models[entityType].hasOwnProperty(key)) {
                collectionArray.push(this.models[entityType][key]);
            }
        }

        var collection:DataEntityCollection = new DataEntityCollection(collectionArray, entityType, this.manager);
        return new BehaviorSubject<DataEntityCollection>(collection);
    }

    // aucune utilité
    //saveEntityCollection(entityCollection: DataEntityCollection): Observable<DataEntityCollection>;

    createEntity(entityType: string, datas:Object): Observable<DataEntity> {
        return this.putEntity(entityType, datas);
    }

    putEntity(entityType: string, datas:Object): Observable<DataEntity> {
        datas["id"] = this.maxIndex;
        this.maxIndex++;
        this.saveIndex();

        if (!this.models[entityType]) {
            this.models[entityType] = {};
        }

        this.models[entityType][String(datas["id"])] = datas;
        this.saveToStorage();

        var entity:DataEntity = new DataEntity(datas, entityType, this.manager);

        return new BehaviorSubject<DataEntity>(entity);
    }

    deleteEntity(entity: DataEntity): Observable<Response> {
        delete this.models[entity.type][String(entity.id)];
        return new BehaviorSubject<Response>(null);
    }

    duplicateEntity(entity: DataEntity): Observable<DataEntity> {
        return null;
    }
}