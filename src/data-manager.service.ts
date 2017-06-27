/**
 * Created by Christophe on 25/11/2016.
 */
import {Injectable} from '@angular/core';
import {Http, Response} from '@angular/http';
import {DataEntity} from './data-entity.class';
import {DataEntityCollection} from './data-entity-collection.class';
import {DrupalInterface} from './external-interface/drupal-interface.class';
import {LocalStorageInterface} from './external-interface/local-storage-interface.class';
import {ExternalInterface} from './external-interface/external-interface.interface';
import {Observable, Subject} from "rxjs/Rx";
import {ReplaySubject} from "rxjs/Rx";
import {ConfigProvider} from "./config.provider";
import {DataManagerConfig} from "./data-manager-config.interface";
import {NodeJsInterface} from "./external-interface/nodejs-interface.class";
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';


@Injectable()
export class DataManagerService {

    private interfaces:{[key:string]:ExternalInterface} = {};

    entitiesCollectionsCache:{[key:string]:DataEntityCollection} = {};
    entitiesCollectionsSubjects:{[key:string]:ReplaySubject<DataEntityCollection>} = {};
    pendingCollectionsSubjects:{[key:string]:ReplaySubject<DataEntityCollection>} = {};
    entitiesSubjects:{[key:number]:ReplaySubject<DataEntity>} = {};
    pendingEntitiesSubjects:{[key:number]:ReplaySubject<DataEntity>} = {};
    
    enabledEndPoints:{[key:string]:boolean} = {};

    constructor(
        public http:Http,
        public configProvider:ConfigProvider
    ) {
        this.entitiesCollectionsCache = {};
        this.createInterfaces(configProvider.config);
    }

    createInterfaceByKey(interfaceType:string, conf:any):ExternalInterface {

        switch (interfaceType) {
            case "drupal":
                return new DrupalInterface(this.http, this, conf);

            case "localstorage":
                return new LocalStorageInterface(this, conf);

            case "nodejs":
                return new NodeJsInterface(this, conf);

            default:
                console.warn("Unknown external interface type.");
                return null;
        }
    }


    createInterfaces(conf:DataManagerConfig) {

        if (conf.configuration) {
            for (var key in conf.configuration) {
                if (conf.configuration.hasOwnProperty(key)) {
                    this.interfaces[key] = this.createInterfaceByKey(key, conf.configuration[key]);
                }
            }
        }

        if (conf.declarations) {
            for (var key in conf.declarations) {
                if (conf.declarations.hasOwnProperty(key)) {
                    this.interfaces[key] = this.createInterfaceByKey(conf.declarations[key].interfaceType, conf.declarations[key].configuration);
                }
            }
        }
    }


    getInterface(endPointName:string):ExternalInterface {
        var interfaceId:string;

        if (this.configProvider.config.map[endPointName]) {
            interfaceId = this.configProvider.config.map[endPointName];
        } else {
            interfaceId = this.configProvider.config.defaultInterface;
        }

        return this.interfaces[interfaceId];
    }


    /**
     * Charge une collection d'entités
     * @param entityType Type d'entité à charger
     * @param forceLoading Force le chargement depuis provider de données (pas de cache front)
     * @param fields
     * @param params
     * @returns {Observable<DataEntityCollection>} L'observable de chargement
     */
    loadEntityCollection(entityType:string, forceLoading:boolean = false, fields:Array<string> = null, params:Object = null):Observable<DataEntityCollection> {

        var subject:ReplaySubject<DataEntityCollection>;
        var tSubject:ReplaySubject<DataEntityCollection> = new ReplaySubject<DataEntityCollection>(1);

        this.enabledEndPoints[entityType] = true;

        if (!this.entitiesCollectionsSubjects[entityType] || forceLoading) {

            subject = new ReplaySubject<DataEntityCollection>(1);
            this.registerEntityCollectionSubject(entityType, subject);
            this.pendingCollectionsSubjects[entityType] = subject;

            this.getInterface(entityType).loadEntityCollection(entityType, fields, params)
                .map(this.addTest, this)
                .subscribe((collection:DataEntityCollection) => {

                    this.entitiesCollectionsCache[entityType] = collection;
                    this.registerEntityCollection(collection, subject);
                    delete (this.pendingCollectionsSubjects[entityType]);
                    subject.next(collection);
                    tSubject.next(collection);
                });

        } else {

            subject = this.entitiesCollectionsSubjects[entityType];

            if (!this.entitiesCollectionsCache[entityType] && !this.pendingCollectionsSubjects[entityType]) {

                this.pendingCollectionsSubjects[entityType] = subject;

                this.getInterface(entityType).loadEntityCollection(entityType, fields, params)
                    .map(this.addTest, this)
                    .subscribe((collection:DataEntityCollection) => {
                        this.entitiesCollectionsCache[entityType] = collection;
                        this.registerEntityCollection(collection, subject);
                        delete (this.pendingCollectionsSubjects[entityType]);
                        subject.next(collection);
                        tSubject.next(collection);
                    });

            } else {
                return subject;
            }

        }
        
        return subject;
    }


    /**
     * Charge une entité de données
     * @param entityType Type d'entité
     * @param entityId Id de l'entité
     * @param forceLoading Force le chargement depuis le provider de données (pas de cache front)
     * @returns {Observable<DataEntity>} L'observable de chargement
     */
    loadEntity(entityType:string, entityId:any, forceLoading:boolean = false):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;
        var tSubject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        if (!this.entitiesSubjects[entityId] || forceLoading) {

            subject = new ReplaySubject<DataEntity>(1);
            this.pendingEntitiesSubjects[entityId] = subject;

            this.registerEntitySubject(entityId, subject);

            this.getInterface(entityType).loadEntity(entityType, entityId)
                .subscribe((entity:DataEntity) => {
                        subject.next(entity);
                        tSubject.next(entity);
                        delete this.pendingEntitiesSubjects[entityId];
                        this.registerEntity(entity, subject);

                    },
                    (error:Object) => {
                        //subject.error(error);
                        console.log(error);
                    });

        } else {
            subject = this.entitiesSubjects[entityId];

            if ((!this.entitiesCollectionsCache[entityType] || !this.entitiesCollectionsCache[entityType].hasEntity(entityId)) && !this.pendingEntitiesSubjects[entityId]) {

                this.pendingEntitiesSubjects[entityId] = subject;

                this.getInterface(entityType).loadEntity(entityType, entityId)
                    .subscribe((entity:DataEntity) => {
                            subject.next(entity);
                            tSubject.next(entity);
                            this.registerEntity(entity, subject);
                            delete this.pendingEntitiesSubjects[entityId];

                        },
                        (error:Object) => {
                            //subject.error(error);
                            console.log(error);
                        });

            } else {
                return subject;
            }
        }
        
        return tSubject;
    }

    getEntity(entityType:string, forceLoading:boolean = false):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;

        if (!this.entitiesSubjects[entityType] || forceLoading) {

            subject = new ReplaySubject<DataEntity>(1);

            this.getInterface(entityType).getEntity(entityType)
                .subscribe((entity:DataEntity) => {
                        subject.next(entity);
                        this.registerEntity(entity, subject);
                    },
                    (error:Object) => {
                        subject.error(error);
                    });
        } else {
            subject = this.entitiesSubjects[entityType];

            if (!this.entitiesCollectionsCache[entityType]) {

                this.getInterface(entityType).getEntity(entityType)
                    .subscribe((entity:DataEntity) => {
                            subject.next(entity);
                            this.registerEntity(entity, subject);

                        },
                        (error:Object) => {
                            subject.error(error);
                        });
            }
        }

        return subject;
    }


    addTest(collection:DataEntityCollection):DataEntityCollection {
        return collection;
    }

    /**
     * On propage les changements vers les observables des entités de même id
     * @param entity L'entité à propager
     */
    propagateEntityChange(entity:DataEntity) {
        if (this.entitiesSubjects[entity.id]) {
            this.entitiesSubjects[entity.id].next(entity);
        }
    }


    /**
     * Propage les modifications de la collection vers les autres collection de même type
     * @param collection La collection à propager
     */
    propagateCollectionChange(collection:DataEntityCollection) {
        if (this.entitiesCollectionsSubjects[collection.type]) {
            this.entitiesCollectionsSubjects[collection.type].next(collection);
        }
    }


    /**
     * Sauvegarde les donnnées d'une entitée vers le provider de données
     * @param entity L'entité à sauvegarder
     * @param propagateChanges
     * @returns {Observable<DataEntity>} L'observable de sauvegarde
     */
    saveEntity(entity:DataEntity, propagateChanges:boolean = true, raw:boolean = false, applyDiff:boolean = true):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;

        if (this.entitiesSubjects[entity.id]) {
            subject = this.entitiesSubjects[entity.id];
        } else {
            subject = new ReplaySubject<DataEntity>(1);
        }

        if(!raw) {
            if (entity.hasChanged() || !applyDiff) {
                this.getInterface(entity.type).saveEntity(entity, applyDiff).subscribe((entity:DataEntity) => {
                    if (propagateChanges) {
                        this.propagateEntityChange(entity);
                    }

                    subject.next(entity);
                });
            } else {
                subject.next(entity);
            }
        } else {
            this.getInterface(entity.type).saveRawEntity(entity).subscribe((entity: DataEntity) => {
                subject.next(entity);
            });
        }

        return subject;
    }


    checkAndRegisterEntity(entity:DataEntity):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity>;

        if (this.entitiesSubjects[entity.id]) {
            // case 1: entity already in cache

            let index:number = this.getEntityIndexInCollection(entity);

            subject = this.entitiesCollectionsCache[entity.type].entitiesObservables[index] as ReplaySubject<DataEntity>;
            subject.next(entity);

        } else {
            // case 2: new entity

            subject = new ReplaySubject<DataEntity>(1);

            this.registerEntity(entity, subject);
            subject.next(entity);

            if (this.entitiesCollectionsCache[entity.type]) {
                this.entitiesCollectionsCache[entity.type].dataEntities.push(entity);
                this.entitiesCollectionsCache[entity.type].entitiesObservables.push(subject);
            }

            this.nextOnCollection(entity.type);
        }


        return subject;
    }


    /**
     * Crée une nouvelle entité d'un type donné dans le provider de données
     * @param entityType Type de l'entité à créer
     * @param datas Données d'initialisation
     * @returns {Observable<DataEntity>} L'observable de création
     */
    createEntity(entityType:string, datas:Object, params:Object = null):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        this.getInterface(entityType).createEntity(entityType, datas, params)
            .subscribe((entity:DataEntity) => {
                    this.registerEntity(entity, subject);
                    subject.next(entity);

                    if (this.entitiesCollectionsCache[entityType]) {
                        this.entitiesCollectionsCache[entityType].dataEntities.push(entity);
                        this.entitiesCollectionsCache[entityType].entitiesObservables.push(subject);
                    }

                    this.nextOnCollection(entityType);
                },
                (error:Object) => {
                    subject.error(error);
                });

        return subject;
    }

    /**
     * Put entity
     * @param entityType
     * @param datas
     * @param params
     * @returns {ReplaySubject<DataEntity>}
     */
    putEntity(entityType:string, datas:Object, params:Object = null):Observable<DataEntity> {

        var subject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        this.getInterface(entityType).putEntity(entityType, datas, params)
            .subscribe((entity:DataEntity) => {
                    this.registerEntity(entity, subject);
                    subject.next(entity);

                    if (this.entitiesCollectionsCache[entityType]) {
                        this.entitiesCollectionsCache[entityType].dataEntities.push(entity);
                        this.entitiesCollectionsCache[entityType].entitiesObservables.push(subject);
                    }

                    this.nextOnCollection(entityType);
                },
                (error:Object) => {
                    subject.error(error);
                });

        return subject;
    }


    nextOnCollection(entityType) {
        if (this.entitiesCollectionsSubjects[entityType] && this.entitiesCollectionsCache[entityType]) {
            this.entitiesCollectionsSubjects[entityType].next(this.entitiesCollectionsCache[entityType]);
        }
    }


    /**
     * Supprime une entité dans le provider de données
     * @param entity Entité à supprimer
     * @param params
     * @returns {Observable<Response>} L'observable de suppression
     */
    deleteEntity(entity:DataEntity, params:Object = null):Observable<Response> {

        var subject:ReplaySubject<Response> = new ReplaySubject<Response>(1);

        var observable:Observable<Response> = this.getInterface(entity.type).deleteEntity(entity, params);
        observable.subscribe((response:Response) => {
            subject.next(response);
            this.unregisterEntity(entity);

            if (this.entitiesCollectionsCache[entity.type]) {
                let index:number = this.entitiesCollectionsCache[entity.type].dataEntities.indexOf(entity);

                if (index !== -1) {
                    this.entitiesCollectionsCache[entity.type].dataEntities.splice(index, 1);
                    this.entitiesCollectionsCache[entity.type].entitiesObservables.splice(index, 1);
                    this.nextOnCollection(entity.type);
                }
            }
        });

        return subject;
    }


    getEntityIndexInCollection(entity:DataEntity) {
        let entities:DataEntity[] = this.entitiesCollectionsCache[entity.type].dataEntities;

        let count:number = 0;

        for (let ent of entities) {

            if (ent.id === entity.id) {
                return count;
            }

            count++;
        }

        return -1;
    }


    deleteAction(entity:DataEntity) {
        if (this.entitiesCollectionsCache[entity.type]) {
            let index:number = this.getEntityIndexInCollection(entity);

            if (index !== -1) {
                this.entitiesCollectionsCache[entity.type].dataEntities.splice(index, 1);
                this.entitiesCollectionsCache[entity.type].entitiesObservables.splice(index, 1);
                this.nextOnCollection(entity.type);
            }
        }
    }


    /**
     * Duplique une entité dans le provider de données
     * @param entity L'entité à dupliquer
     * @returns {Observable<DataEntity>} L'observable de création de l'entité
     */
    duplicateEntity(entity:DataEntity):Observable<DataEntity> {
        var subject:ReplaySubject<DataEntity> = new ReplaySubject<DataEntity>(1);

        let entityType = entity.type;

        this.getInterface(entityType).duplicateEntity(entity)
            .subscribe((entity:DataEntity) => {
                    this.registerEntity(entity, subject);
                    subject.next(entity);

                    if (this.entitiesCollectionsCache[entityType]) {
                        this.entitiesCollectionsCache[entityType].dataEntities.push(entity);
                        this.entitiesCollectionsCache[entityType].entitiesObservables.push(subject);
                    }

                    this.nextOnCollection(entityType);
                },
                (error:Object) => {
                    subject.error(error);
                });

        return subject;
    }


    registerEntitySubject(entityId:number, subject:ReplaySubject<DataEntity>) {
        if (!this.entitiesSubjects[entityId]) {
            this.entitiesSubjects[entityId] = subject;
        }
    }


    /**
     * Enregistre un entité en cache
     * @param entity L'entité à mettre en cache
     * @param entityObservable L'observable de cette entité
     * @param observer L'observer de cette entité
     */
    registerEntity (entity:DataEntity, entityObservable:ReplaySubject<DataEntity>) {
        if (entity === undefined) return;

        if (!this.entitiesSubjects[entity.id]) {
            this.entitiesSubjects[entity.id] = entityObservable;
        }
    }


    /**
     * Supprime l'entité du cache
     * @param entity L'entité à supprimer du cache
     */
    unregisterEntity(entity:DataEntity) {
        if (this.entitiesSubjects[entity.id]) {
            delete this.entitiesSubjects[entity.id];

            let index:number = this.entitiesCollectionsCache[entity.type].dataEntities.indexOf(entity);
            this.entitiesCollectionsCache[entity.type].dataEntities.splice(index, 1);
            this.entitiesCollectionsCache[entity.type].entitiesObservables.splice(index, 1);
        }
    }


    registerEntityCollectionSubject(collectionType:string, subject:ReplaySubject<DataEntityCollection>) {
        console.log("register " + collectionType);
        if (!this.entitiesCollectionsSubjects[collectionType]) {
            this.entitiesCollectionsSubjects[collectionType] = subject;
        }
    }


    /**
     * Enregistre une collection d'entités dans le cache
     * @param collection La collection à enregistrer dans le cache
     * @param entityCollectionObservable L'observable de la collection
     */
    registerEntityCollection (collection:DataEntityCollection, entityCollectionObservable:ReplaySubject<DataEntityCollection>) {

        this.registerEntityCollectionSubject(collection.type, entityCollectionObservable);

        for (let entity of collection.dataEntities) {
            var subject:ReplaySubject<DataEntity>;

            subject = new ReplaySubject<DataEntity>(1);
            collection.pushObservable(subject);
            this.registerEntity(entity, subject);
            subject.next(entity);

        }
    }
}