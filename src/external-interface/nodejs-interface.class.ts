/**
 * Created by reunion on 19/05/2017.
 */

import {ExternalInterface} from "./external-interface.interface";
import {Observable} from "rxjs/Rx";
import {DataEntity} from "../data-entity.class";
import {DataEntityCollection} from "../data-entity-collection.class";
import {Response} from "@angular/http";
import {NodeJSInterfaceConfig} from "./nodejs-interface-config.interface";

export class NodeJsInterface implements ExternalInterface {

    constructor(
        private configuration:NodeJSInterfaceConfig
    ) {}

    getEntity(entityType:string):Observable<DataEntity> {
         return null;
    }

    loadEntity(entityType:string, entityId:any):Observable<DataEntity> {
        return null;
    }

    saveEntity(entity: DataEntity, applyDiff:boolean):Observable<DataEntity> {
        return null
    }

    saveRawEntity(entity:DataEntity):Observable<DataEntity> {
        return null;
    }

    loadEntityCollection(entityType:string,fields:Array<string>):Observable<DataEntityCollection> {
        return null;
    }

    createEntity(entityType: string, datas:Object):Observable<DataEntity> {
        return null;
    }

    putEntity(entityType:string, datas:Object):Observable<DataEntity> {
        return null;
    }

    deleteEntity(entity:DataEntity):Observable<Response> {
        return null;
    }

    duplicateEntity(entity:DataEntity):Observable<DataEntity> {
        return null;
    }
}