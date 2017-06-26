/**
 * Created by reunion on 19/05/2017.
 */

import {ExternalInterface} from "./external-interface.interface";
import {Observable, BehaviorSubject, ReplaySubject, Subscription} from "rxjs/Rx";
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
    wallSubject:Map<String, ReplaySubject<NodeJsDataInterface[]>> = new Map();

    collectionSubscriptions:Subscription[];

    messageEventType:string;
    wallEventType:string;

    currentWallId:string;

    socketHandlers:{[key:string]:any} = {};

    constructor(
        private manager:DataManagerService,
        private configuration:NodeJSInterfaceConfig
    ) {
        this.messageEventType = configuration.messageEvent ? configuration.messageEvent : "message";
        this.wallEventType = configuration.wallEvent ? configuration.wallEvent : "retrieveMur";


        this.init("wall");
    }

    init(type) {
        this.messageSubject = new ReplaySubject<NodeJsDataInterface[]>(1);
    }

    initializeSocket(type) {

        this.socket = io.connect(this.configuration.socketUrl);

        this.socket.on(this.messageEventType, (data:NodeJsDataInterface[]) => {
            console.log("MESSAGE DATA: ", data);
            this.messageSubject.next(data);
        });

        this.collectionSubscriptions = [];

        let putSubscription:Subscription = this.getMappedEntitiesDatas("put").subscribe((entities:DataEntity[]) => {
            entities.forEach((entity:DataEntity) => {
                this.manager.checkAndRegisterEntity(entity);
            });
        });

        this.collectionSubscriptions.push(putSubscription);

        let updateSubscription:Subscription = this.getMappedEntitiesDatas("update").subscribe((entities:DataEntity[]) => {
            entities.forEach((entity:DataEntity) => {
                this.manager.checkAndRegisterEntity(entity);
            });
        });

        this.collectionSubscriptions.push(updateSubscription);

        let deleteSubscription:Subscription = this.getMappedEntitiesDatas("delete").subscribe((entities:DataEntity[]) => {
            entities.forEach((entity:DataEntity) => {
                this.manager.deleteAction(entity);
            });
        });

        this.collectionSubscriptions.push(deleteSubscription);
    }

    clearSocket() {
        if (this.socket) {
            this.socket.off(this.messageEventType);
            this.socket.off(this.wallEventType);

            this.socket.disconnect();

            this.socket = null;
        }
    }

    getWallAndTypeFilteredObservable(entityType:string, wall:string):Observable<DataEntityCollection> {
        return this.wallSubject.get(entityType).map(this.filterCollectionData, { type: entityType, wall: wall, self: this });
    }

    getTypeFilteredObservable(entityType:string):Observable<DataEntityCollection> {
        return this.wallSubject.get(entityType).map(this.typeFilterCollectionData, { type: entityType, self: this });
    }
    
    getMappedEntitiesDatas(command:string):Observable<DataEntity[]> {
        return this.messageSubject.map(this.filterEntityData, { self: this, command: command, wall: this.currentWallId });
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
            if (this["wall"] === itemData.data['mur'] && this["type"] === itemData.type) {
                filteredData.push(itemData);
            }
        });

        return this["self"].mapToCollection(this["type"], filteredData);
    }

    typeFilterCollectionData(data:NodeJsDataInterface[]):DataEntityCollection {
        // filter on "type"
        var filteredData:NodeJsDataInterface[] = [];


        data.forEach((itemData:NodeJsDataInterface) => {
            if (this["type"] === itemData.type) {
                filteredData.push(itemData);
            }
        });

        return this["self"].mapToCollection(this["type"], filteredData);
    }
    
    filterEntityData(data:NodeJsDataInterface[]):DataEntity[] {
        var entities:DataEntity[] = [];

        data.forEach((itemData:NodeJsDataInterface) => {
            // @TODO Replace occurences of wall to something like "filter[]"
            if (itemData.command === this["command"] && this["wall"] === itemData.data['mur']) {
                entities.push(this["self"].mapToEntity(itemData));
            }
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
        var entity:DataEntity = new DataEntity(data.data, data.type, this.manager);
        return entity;
    }

    getEntity(entityType:string):Observable<DataEntity> {
         return null;
    }

    loadEntity(entityType:string, entityId:any):Observable<DataEntity> {
        return null;
    }

    saveEntity(entity:DataEntity, applyDiff:boolean):Observable<DataEntity> {

        var requestData:NodeJsDataInterface = {
            command: "update",
            data: entity.attributes,
            mur: this.currentWallId,
            type: entity.type
        };

        console.log("SAVE", requestData);

        this.socket.emit("message", requestData);

        return new BehaviorSubject<DataEntity>(entity);
    }

    saveRawEntity(entity:DataEntity):Observable<DataEntity> {
        return null;
    }

    loadEntityCollection(entityType:string, fields:Array<string>, params:Object = null):Observable<DataEntityCollection> {
        this.wallSubject.set(entityType, new ReplaySubject<NodeJsDataInterface[]>(1));

        if (!this.socket) {
            this.initializeSocket(entityType);
        }

        if (!this.socketHandlers[entityType]) {
            this.socketHandlers[entityType] = this.socket.on("retrieve"+entityType, (data:NodeJsDataInterface[]) => {
                this.wallSubject.get(entityType).next(data);
            });
        }


        if (params && params["wallid"]) {
            this.socket.emit('connexion', entityType, params["wallid"]);
            this.currentWallId = params["wallid"];
        } else {
            this.socket.emit(entityType, params || {});
        }

        var obs:Observable<DataEntityCollection>;

        if (params && params["wallid"]) {
            obs = this.getWallAndTypeFilteredObservable(entityType, params["wallid"]);
        } else {
            obs = this.getTypeFilteredObservable(entityType);
        }

        return obs;
    }

    clearCollectionSubscriptions() {
        this.collectionSubscriptions.forEach((subscription:Subscription) => {
            subscription.unsubscribe();
        });

        this.collectionSubscriptions = [];
    }

    createEntity(entityType:string, datas:Object, params:Object = null):Observable<DataEntity> {
        return this.putEntity(entityType, datas, params);
    }

    generateTempId():number {
        return Math.floor(Math.random() * 100000000);
    }

    putEntity(entityType:string, datas:Object, params:Object = null):Observable<DataEntity> {

        if (!datas["id"]) {
            datas["id"] = this.generateTempId();
        }

        var uid:string = uuid.v4();
        
        let wallid:string;

        if (params && params["wallid"]) {
            wallid = params["wallid"];
        } else {
            wallid = "test1";
        }

        var requestData:NodeJsDataInterface = {
            command: "put",
            data: datas,
            mur: this.currentWallId,
            type: entityType,
            uuid: uid
        };

        this.socket.emit("message", requestData);
        var dt:DataEntity = new DataEntity(datas, entityType, this.manager);

        return new BehaviorSubject<DataEntity>(this.mapToEntity(requestData));
    }

    deleteEntity(entity:DataEntity, params:Object = null):Observable<Response> {

        // pour la suppression, ça ne devrait pas être utile de récupérer le wallid
        let wallid:string;

        if (params && params["wallid"]) {
            wallid = params["wallid"];
        } else {
            wallid = "test1";
        }

        let requestData:NodeJsDataInterface = {
            command: "delete",
            data: entity.attributes,
            mur: this.currentWallId,
            type: entity.type
        };

        this.socket.emit("message", requestData);

        this.manager.entitiesCollectionsCache[entity.type].propagateChanges();

        
        return new BehaviorSubject<Response>(null);
    }

    duplicateEntity(entity: DataEntity):Observable<DataEntity> {
        let data_id = this.generateTempId();

        var uid:string = uuid.v4();

        var requestData:NodeJsDataInterface = {
            command: "duplicate",
            data: {label: "Copie du mur : "+entity.attributes['label'], id: data_id, sourceId: entity.id},
            type: entity.type,
            mur: this.currentWallId,
            uuid: uid,
        };

        this.socket.emit("message", requestData);
        var dt:DataEntity = new DataEntity(requestData.data, requestData.type, this.manager);

        //this.manager.entitiesCollectionsCache[entityType].entitiesObservables.push(new BehaviorSubject<DataEntity>(dt));
        //this.manager.entitiesCollectionsCache[entityType].dataEntities.push(dt);

        return new BehaviorSubject<DataEntity>(this.mapToEntity(requestData));
    }

    release() {
        console.log("RELEASE");
        this.clearCollectionSubscriptions();
        this.clearSocket();
    }
}