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

declare var require: any;
const MobileDetect = require("mobile-detect/mobile-detect");

export class NodeJsInterface implements ExternalInterface {

    socket;
    messageSubject:ReplaySubject<NodeJsDataInterface[]>;
    wallSubject:Map<String, ReplaySubject<NodeJsDataInterface[]>> = new Map();

    collectionSubscriptions:Subscription[];

    paramsByEndpoint:{[key:string]:Object} = {};

    messageEventType:string;
    wallEventType:string;

    currentWallId:string;

    socketHandlersParams:{[key:string]:any} = {};
    hasSuccess:boolean = false;
    initialized:boolean = false;
    socketTry:number = 0;

    constructor(
        private manager:DataManagerService,
        private configuration:NodeJSInterfaceConfig
    ) {
        this.messageEventType = configuration.messageEvent ? configuration.messageEvent : "message";
        this.wallEventType = configuration.wallEvent ? configuration.wallEvent : "retrieveMur";

        this.init("wall");

        var md = new MobileDetect(window.navigator.userAgent);
        var mobile:string = md.mobile();

        if (mobile) {
            window.addEventListener("focus", () => {
                if (this.initialized) {
                    this.initializeSocket();
                }
            });
        }
    }

    init(type) {
        this.messageSubject = new ReplaySubject<NodeJsDataInterface[]>(1);
    }

    connectionAndRetrieve(key:string, params:Object = null) {
        if (params !== null && params["mur"]) {
            this.socket.emit('connexion', key, params["mur"]);
        } else {
            this.socket.emit(key, params || {});
        }
        this.socket.on("retrieve"+key, (data:NodeJsDataInterface[]) => {
            this.wallSubject.get(key).next(data);
        });
    }

    initializeSocket() {

        let socketUrl:string;

        if (typeof this.configuration.socketUrl === "string") {
            socketUrl = this.configuration.socketUrl as string;
        } else if (this.configuration.socketUrl instanceof Array) {
            socketUrl = this.configuration.socketUrl[this.socketTry];
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket.close();
        }

        this.socket = io(socketUrl);
        this.socket.io.timeout(4000);

        this.socket.on(this.messageEventType, (data:NodeJsDataInterface[]) => {
            console.log("MESSAGE DATA: ", data);
            this.messageSubject.next(data);
        });

        this.socket.on('connect_failed', function(){
            console.log('Connection Failed');
        });

        this.socket.on('connect_error', () => {
            console.log('Connection Error');

            if (!this.hasSuccess) {
                if (typeof this.configuration.socketUrl === "string") {
                    this.setEndPointsValidityBooleans(false);
                } else if (this.configuration.socketUrl instanceof Array) {

                    this.socketTry++;

                    if (this.socketTry > this.configuration.socketUrl.length - 1) {
                        this.setEndPointsValidityBooleans(false);
                    } else {
                        this.initializeSocket();

                        for (let key in this.socketHandlersParams) {

                            if (this.socketHandlersParams.hasOwnProperty(key)) {
                                this.connectionAndRetrieve(key, this.socketHandlersParams[key]);
                            }
                        }
                    }
                }
            }
        });

        this.socket.on('error', function(){
            console.log('Error');
        });

        this.socket.on('connect', () => {
            console.log('Connected');
            this.onConnection();
        });

        this.socket.on('reconnecting', () => {
            console.log('reconnecting');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected');
            this.onDisconnection();
        });

        this.socket.on('error', function () {
            console.log('Disconnected !!!');
        });

        this.initialized = true;
    }

    onDisconnection() {
        this.setEndPointsValidityBooleans(false);
    }

    onConnection() {
        this.hasSuccess = true;
        this.setEndPointsValidityBooleans(true);

        for (let key in this.socketHandlersParams) {

            if (this.socketHandlersParams.hasOwnProperty(key)) {
                this.connectionAndRetrieve(key, this.socketHandlersParams[key]);
            }
        }
    }

    setEndPointsValidityBooleans(value:boolean) {
        for (let key in this.socketHandlersParams) {
            if (this.socketHandlersParams.hasOwnProperty(key)) {
                this.manager.enabledEndPoints[key] = value;
            }
        }
    }

    endpointFilterValidity(data:NodeJsDataInterface):boolean {
        if (this.paramsByEndpoint[data["type"]] === undefined) {
            return false;
        } else if (this.paramsByEndpoint[data["type"]] === null) {
            return true;
        } else {
            return this.paramsEquality(data, this.paramsByEndpoint[data["type"]]);
        }
    }

    initSubscriptions() {
        this.collectionSubscriptions = [];

        let putSubscription:Subscription = this.getMappedEntitiesDatas("put").subscribe((entities:DataEntity[]) => {
            entities.forEach((entity:DataEntity) => {
                this.manager.checkAndRegisterEntity(entity);
            });
        });

        this.collectionSubscriptions.push(putSubscription);

        let updateSubscription:Subscription = this.getMappedEntitiesDatas("update").subscribe((entities:DataEntity[]) => {
            entities.forEach((entity:DataEntity) => {
                //console.log("update", entity);
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

    getParamsAndTypeFilteredObservable(entityType:string, params:Object):Observable<DataEntityCollection> {
        return this.wallSubject.get(entityType).map(this.typeObjectFilterCollectionData, { type: entityType, params: params, self: this });
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

    paramsEquality(itemData:NodeJsDataInterface, params:Object):boolean {
        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                if (params[key] !== itemData.data[key]) {
                    return false;
                }
            }
        }

        return true;
    }

    paramsEntityEquality(data:DataEntity, params:Object):boolean {
        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                if (params[key] !== data.get(key)) {
                    return false;
                }
            }
        }

        return true;
    }

    typeObjectFilterCollectionData(data:NodeJsDataInterface[]):DataEntityCollection {

        function paramsEquality(itemData:NodeJsDataInterface, params:Object):boolean {
            for (let key in params) {
                if (params.hasOwnProperty(key)) {
                    if (params[key] !== itemData.data[key]) {
                        return false;
                    }
                }
            }

            return true;
        }

        var filteredData:NodeJsDataInterface[] = [];
        var params:Object = this["params"];

        data.forEach((itemData:NodeJsDataInterface) => {
            if (paramsEquality(itemData, params) && this["type"] === itemData.type) {
                filteredData.push(itemData);
            }
        });

        return this["self"].mapToCollection(this["type"], filteredData);
    }

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
            if (itemData.command === this["command"] && this["wall"] === itemData['mur'] && this["self"].endpointFilterValidity(itemData)) {
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
        if (this.endpointFilterValidity(data)) {
            var entity:DataEntity = new DataEntity(data.data, data.type, this.manager);
            return entity;
        } else {
            return null;
        }
    }

    getEntity(entityType:string):Observable<DataEntity> {
        return null;
    }

    loadEntity(entityType:string, entityId:any):Observable<DataEntity> {
        return this.loadEntityCollection(entityType, null, {
            id: entityId
        }).map((data:DataEntityCollection) => {
            return data.dataEntities[0];
        });
    }

    saveEntity(entity:DataEntity, applyDiff:boolean, exclusions:string[] = []):Observable<DataEntity> {

        var filteredData:Object = {};

        for (let key of Object.keys(entity.attributes)) {
            if (exclusions.indexOf(key) === -1) {
                filteredData[key] = entity.attributes[key];
            }
        }

        var requestData:NodeJsDataInterface = {
            command: "update",
            data: filteredData,
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

        this.paramsByEndpoint[entityType] = params;

        this.wallSubject.set(entityType, new ReplaySubject<NodeJsDataInterface[]>(1));

        if (!this.socket) {
            this.initializeSocket();
        }

        if (!this.socketHandlersParams[entityType]) {
            this.socket.on("retrieve"+entityType, (data:NodeJsDataInterface[]) => {
                this.wallSubject.get(entityType).next(data);
            });
        }

        this.socketHandlersParams[entityType] = params;

        if (params && params["mur"]) {
            this.socket.emit('connexion', entityType, params["mur"]);
            this.currentWallId = params["mur"];
        } else {
            this.socket.emit(entityType, params || {});
        }

        this.initSubscriptions();

        var obs:Observable<DataEntityCollection>;

        if (params && params["mur"]) {
            obs = this.getWallAndTypeFilteredObservable(entityType, params["mur"]);
        } else if (params) {
            obs = this.getParamsAndTypeFilteredObservable(entityType, params);
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

    createEntity(entityType:string, datas:Object, params:Object = null, exclusions:string[] = []):Observable<DataEntity> {

        var filteredData:Object = {};

        for (let key of Object.keys(datas)) {
            if (exclusions.indexOf(key) === -1) {
                filteredData[key] = datas[key];
            }
        }

        return this.putEntity(entityType, filteredData, params);
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

        if (params && params["mur"]) {
            wallid = params["mur"];
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

        if (params && params["mur"]) {
            wallid = params["mur"];
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

        return new BehaviorSubject<DataEntity>(this.mapToEntity(requestData));
    }

    release() {
        console.log("RELEASE");
        this.clearCollectionSubscriptions();
        this.clearSocket();
    }
}