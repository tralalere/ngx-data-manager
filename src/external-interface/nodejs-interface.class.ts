/**
 * Created by reunion on 19/05/2017.
 */

import {ExternalInterface} from "./external-interface.interface";
import {Observable, BehaviorSubject, ReplaySubject} from "rxjs/Rx";
import {DataEntity} from "../data-entity.class";
import {DataEntityCollection} from "../data-entity-collection.class";
import {Response} from "@angular/http";
import {NodeJSInterfaceConfig} from "./nodejs-interface-config.interface";
import {DataManagerService} from "../data-manager.service";
import * as io from 'socket.io-client';
import * as uuid from "uuid";
import {NodeJsDataInterface} from "./nodejs-data.interface";

export class NodeJsInterface implements ExternalInterface {

    socket;
    messageSubject:ReplaySubject<Object>;

    constructor(
        private manager:DataManagerService,
        private configuration:NodeJSInterfaceConfig
    ) {
        this.init();
    }

    init() {
        this.messageSubject = new ReplaySubject<Object>(1);
        this.socket = io.connect(this.configuration.socketUrl);

        this.socket.on("message", (data) => {
            console.log("DATA: ", data);
            this.messageSubject.next(data);
        });
    }

    listenSocketEvents() {

    }

    getUuidFilteredObservable(entityType:string, uid:string):Observable<Object> {
        return this.messageSubject.filter((data:NodeJsDataInterface) => {
            return data.type === entityType && data.uuid === uid;
        });
    }

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
        this.socket.emit('connexion', "mur1");

        this.socket.on("retrieveMur", (data:NodeJsDataInterface) => {
            console.log("mur", data);
        });

        return new BehaviorSubject<DataEntityCollection>(new DataEntityCollection([], entityType, this.manager));
    }

    createEntity(entityType:string, datas:Object):Observable<DataEntity> {
        return this.putEntity(entityType, datas);
    }

    putEntity(entityType:string, datas:Object):Observable<DataEntity> {
        var uid:string = uuid.v4();

        var requestData:NodeJsDataInterface = {
            command: "put",
            data: datas,
            mur: entityType,
            type: entityType,
            uuid: uid
        };


        this.socket.emit("message", requestData);
        return new BehaviorSubject<DataEntity>(null);
    }

    deleteEntity(entity:DataEntity):Observable<Response> {
        return null;
    }

    duplicateEntity(entity:DataEntity):Observable<DataEntity> {
        return null;
    }
}