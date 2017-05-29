/**
 * Created by reunion on 21/11/2016.
 */
import {DataEntity} from "../data-entity.class"
import {DataEntityCollection} from "../data-entity-collection.class"
import {Observable} from "rxjs/Rx";
import {Response} from "@angular/http";

export interface ExternalInterface {

    getEntity(entityType: string): Observable<DataEntity>;

    loadEntity(entityType: string, entityId: any): Observable<DataEntity>;
    saveEntity(entity: DataEntity, applyDiff:boolean): Observable<DataEntity>;
    saveRawEntity(entity: DataEntity): Observable<DataEntity>;

    loadEntityCollection(entityType: string, fields:Array<string>, params:Object): Observable<DataEntityCollection>;

    // aucune utilité
    //saveEntityCollection(entityCollection: DataEntityCollection): Observable<DataEntityCollection>;

    createEntity(entityType: string, datas:Object): Observable<DataEntity>;
    putEntity(entityType: string, datas:Object): Observable<DataEntity>;
    deleteEntity(entity: DataEntity): Observable<Response>;
    duplicateEntity(entity: DataEntity): Observable<DataEntity>;
}