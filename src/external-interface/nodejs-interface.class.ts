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
    messageSubject:ReplaySubject<NodeJsDataInterface[]>;
    wallSubject:ReplaySubject<NodeJsDataInterface[]>;

    constructor(
        private manager:DataManagerService,
        private configuration:NodeJSInterfaceConfig
    ) {
        this.init();
    }

    init() {
        this.messageSubject = new ReplaySubject<NodeJsDataInterface[]>(1);
        this.socket = io.connect(this.configuration.socketUrl);

        this.socket.on("message", (data:NodeJsDataInterface[]) => {
            console.log("MESSAGE DATA: ", data);
            this.messageSubject.next(data);
        });

        this.wallSubject = new ReplaySubject<NodeJsDataInterface[]>(1);

        this.socket.on("retrieveMur", (data:NodeJsDataInterface[]) => {
            console.log("WALL DATA", data);
            this.wallSubject.next(data);
        });
    }

    listenSocketEvents() {

    }

    getWallAndTypeFilteredObservable(entityType:string, wall:string):Observable<DataEntityCollection> {
        return this.wallSubject.map(this.filterCollectionData, { type: entityType, wall: wall, self: this });
    }
    
    getMappedEntitiesDatas():Observable<DataEntity[]> {
        return this.messageSubject.map(this.filterEntityData, this);
    }

    /*getUuidFilteredObservable(entityType:string, uid:string):Observable<NodeJsDataInterface[]> {
        return this.messageSubject.filter((data:NodeJsDataInterface[]) => {
            return data.type === entityType && data.uuid === uid;
        });
    }*/

    filterCollectionData(data:NodeJsDataInterface[]):DataEntityCollection {
        // filter on "mur" and "type"
        var filteredData:NodeJsDataInterface[] = [];

        data.forEach((itemData:NodeJsDataInterface) => {
            if (this["wall"] === itemData.mur && this["type"] === itemData.type) {
                filteredData.push(itemData);
            }
        });

        return this["self"].mapToCollection(this["type"], filteredData);
    }
    
    filterEntityData(data:NodeJsDataInterface[]):DataEntity[] {
        var entities:DataEntity[] = [];
        
        data.forEach((itemData:NodeJsDataInterface) => {
            entities.push(this.mapToEntity(itemData));
        });
        
        return entities;
    }

    mapToCollection(entityType:string, data:NodeJsDataInterface[]):DataEntityCollection {

        var mapData:Object[] = [];

        data.forEach((itemData:NodeJsDataInterface) => {
            mapData.push(itemData.data);
        });

        return new DataEntityCollection(mapData, entityType, this.manager);
    }
    
    mapToEntity(data:NodeJsDataInterface):DataEntity {
        return new DataEntity(data.data, data.type, this.manager);
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

    loadEntityCollection(entityType:string, fields:Array<string>):Observable<DataEntityCollection> {
        this.socket.emit('connexion', "test1");
        
        this.getMappedEntitiesDatas().subscribe((entities:DataEntity[]) => {
            entities.forEach((entity:DataEntity) => {
                this.manager.checkAndRegisterEntity(entity);
            });
        });

        return this.getWallAndTypeFilteredObservable(entityType, "test1");
    }

    createEntity(entityType:string, datas:Object):Observable<DataEntity> {
        return this.putEntity(entityType, datas);
    }

    generateTempId():number {
        return Math.floor(Math.random() * 100000);
    }

    putEntity(entityType:string, datas:Object):Observable<DataEntity> {

        if (!datas["id"]) {
            datas["id"] = this.generateTempId();
        }

        var uid:string = uuid.v4();

        var requestData:NodeJsDataInterface = {
            command: "put",
            data: datas,
            mur: "test1",
            type: entityType,
            uuid: uid
        };

        var newEntity:DataEntity = this.mapToEntity(requestData);
        this.socket.emit("message", requestData);
        return new BehaviorSubject<DataEntity>(newEntity);
    }

    deleteEntity(entity:DataEntity):Observable<Response> {
        return null;
    }

    duplicateEntity(entity:DataEntity):Observable<DataEntity> {
        return null;
    }
}